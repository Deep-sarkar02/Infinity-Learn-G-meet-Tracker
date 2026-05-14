const fs = require("fs");
const path = require("path");
const { SESv2Client, SendEmailCommand } = require("@aws-sdk/client-sesv2");
const env = require("../../config/env");
const logger = require("../../config/logger");

const envFlagTrue = (v) => {
  const s = String(v ?? "")
    .trim()
    .replace(/^\uFEFF/, "")
    .toLowerCase();
  return s === "true" || s === "1" || s === "yes";
};

/** Strip accidental quotes from .env values. */
const stripEnvQuotes = (s) => String(s ?? "").trim().replace(/^["']|["']$/g, "");

const configuredTeacherMailLogoUrl = () => {
  const explicit = stripEnvQuotes(env.email.logoUrl || "");
  if (explicit) return explicit;
  const pub = env.email.publicUrl ? `${String(env.email.publicUrl).replace(/\/+$/, "")}/il-logo.png` : "";
  return stripEnvQuotes(pub);
};

/**
 * SES template `{{logo_url}}` must be a normal **https** URL for Gmail / Outlook — they do not render
 * `data:image/...;base64,...` in `<img src>`.
 *
 * Default: return configured HTTPS URL only (`EMAIL_LOGO_URL`, else `APP_PUBLIC_URL/il-logo.png`, else "").
 * Opt-in `SES_LOGO_TEMPLATE_DATA_URI=true` to fetch and embed a data URI (mostly for non-Gmail tests).
 */
const resolveLogoForSesTemplateAsync = async () => {
  const url = configuredTeacherMailLogoUrl();
  const useDataUri = envFlagTrue(process.env.SES_LOGO_TEMPLATE_DATA_URI);

  if (!useDataUri) {
    return url;
  }

  if (url && /^https?:\/\//i.test(url)) {
    try {
      const r = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(15000),
        headers: { "User-Agent": "Mozilla/5.0 (compatible; InfinityLearn-MeetTracker/1.0)" },
      });
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer());
        if (buf.length >= 32 && buf.length <= 900_000) {
          let ct = (r.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
          if (!ct.startsWith("image/")) ct = "image/png";
          const data = `data:${ct};base64,${buf.toString("base64")}`;
          logger.info(`SES teacher mail: inlined remote logo (${buf.length} bytes, data URI — may not show in Gmail)`);
          return data;
        }
      }
    } catch (e) {
      logger.warn(`SES teacher mail: remote logo fetch failed (${e.message}); trying local asset`);
    }
  }

  try {
    const p = path.join(__dirname, "../../../assets/il-logo.png");
    if (fs.existsSync(p)) {
      const buf = fs.readFileSync(p);
      if (buf.length >= 32) {
        logger.info("SES teacher mail: bundled il-logo.png as data URI (may not show in Gmail)");
        return `data:image/png;base64,${buf.toString("base64")}`;
      }
    }
  } catch {
    /* ignore */
  }

  return url;
};

let sesClient = null;

const getSesClient = () => {
  if (sesClient) return sesClient;
  const { region, accessKeyId, secretAccessKey } = env.ses;
  if (!String(region || "").trim()) return null;
  const credentials =
    accessKeyId && secretAccessKey
      ? { accessKeyId: String(accessKeyId).trim(), secretAccessKey: String(secretAccessKey).trim() }
      : undefined;
  sesClient = new SESv2Client({ region: String(region).trim(), credentials });
  return sesClient;
};

/** True when SES env is complete enough to attempt teacher credential mail. */
const isTeacherCredentialEmailConfigured = () => {
  const r = env.ses;
  if (!String(r.region || "").trim() || !String(r.from || "").trim() || !String(r.templateName || "").trim()) {
    return false;
  }
  if (envFlagTrue(process.env.SES_USE_DEFAULT_CREDENTIAL_CHAIN)) {
    return true;
  }
  return Boolean(String(r.accessKeyId || "").trim() && String(r.secretAccessKey || "").trim());
};

/**
 * Maps admin teacher flows to SES template `INFINITY_LEARN_TEACHER_CREDENTIALS` (see backend/templates/).
 */
const buildTeacherCredentialTemplateData = ({
  variant,
  teacherName,
  teacherEmail,
  plainPassword,
  batchId,
  batchName,
  grade,
  /** @type {string|undefined} Pre-resolved (e.g. data URI) logo for {{logo_url}} */
  logoUrlOverride,
}) => {
  const brandName = env.email.brandName;
  const isUpdate = variant === "update";
  const email_subject = isUpdate ? "Your password was reset" : "Your teacher account";
  const hero_kicker = isUpdate ? "Security update" : "Teacher workspace";
  const hero_title = isUpdate ? "Password updated" : "Account ready";
  const hero_lead = isUpdate
    ? "Your administrator issued a new password. Use the same email as before."
    : "Your teacher account is now active. Use the credentials below to sign in.";
  const badge_label = isUpdate ? "Password reset" : "New account";
  const body_intro = isUpdate
    ? "Use the new password below on your next sign-in."
    : "Use the credentials below to access your workspace.";
  const alert_message = isUpdate
    ? "If you did not request a password reset, contact your administrator right away."
    : "Keep these credentials private and update your password after first login.";
  const footer_legal = `This is an automated message from ${brandName}. Please do not reply to this email.`;
  const support = String(env.email.supportEmail || "").trim();
  const support_text = support ? `Support: ${support}` : "For help, contact your administrator.";
  const logo_url =
    logoUrlOverride !== undefined ? String(logoUrlOverride || "") : configuredTeacherMailLogoUrl();

  return {
    brand_name: brandName,
    email_subject,
    hero_kicker,
    hero_title,
    hero_lead,
    badge_label,
    teacher_name: String(teacherName || "").trim(),
    body_intro,
    teacher_email: String(teacherEmail || "").trim(),
    temporary_password: String(plainPassword || ""),
    grade: String(grade ?? ""),
    batch_id: String(batchId ?? ""),
    batch_name: String(batchName ?? ""),
    alert_message,
    footer_legal,
    support_text,
    logo_url,
  };
};

/**
 * Teacher welcome / password-reset email via **Amazon SES** templated send only (no SMTP).
 */
const sendTeacherCredentials = async ({
  teacherName,
  teacherEmail,
  plainPassword,
  batchId,
  batchName,
  grade,
  /** @type {"welcome"|"update"} */ variant = "welcome",
}) => {
  const client = getSesClient();
  if (!client || !isTeacherCredentialEmailConfigured()) {
    logger.warn("SES not configured (AWS_REGION, SES/EMAIL from, template, keys or SES_USE_DEFAULT_CREDENTIAL_CHAIN); skipping teacher credential email");
    return false;
  }

  const logoUrlResolved = await resolveLogoForSesTemplateAsync();
  if (!String(logoUrlResolved || "").trim()) {
    logger.warn(
      "SES teacher mail: logo_url is empty — header image will be missing in clients. Set APP_PUBLIC_URL (serves /il-logo.png on the app host), EMAIL_LOGO_URL, or e.g. https://<api-host>/public/il-logo.png",
    );
  }
  const templateData = buildTeacherCredentialTemplateData({
    variant,
    teacherName,
    teacherEmail,
    plainPassword,
    batchId,
    batchName,
    grade,
    logoUrlOverride: logoUrlResolved,
  });

  try {
    await client.send(
      new SendEmailCommand({
        FromEmailAddress: env.ses.from,
        Destination: { ToAddresses: [String(teacherEmail || "").trim()] },
        Content: {
          Template: {
            TemplateName: env.ses.templateName,
            TemplateData: JSON.stringify(templateData),
          },
        },
      }),
    );
    return true;
  } catch (err) {
    const detail = err?.name === "MessageRejected" || err?.message ? String(err.message) : String(err);
    logger.error(`Teacher credential SES email failed (to=${teacherEmail}): ${detail}`);
    return false;
  }
};

module.exports = {
  sendTeacherCredentials,
  isTeacherCredentialEmailConfigured,
};
