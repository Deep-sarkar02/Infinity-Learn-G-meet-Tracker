const dotenv = require("dotenv");
const dotenvPath = require("./dotenvPath");

// Always load repo-root .env (not cwd-relative).
dotenv.config({ path: dotenvPath });

/** Env truthy for flags like LSQ_PROSPECT_ACTIVITY_CLIENT_DEBUG (handles BOM/case). */
const envFlagTrue = (v) => {
  const s = String(v ?? "")
    .trim()
    .replace(/^\uFEFF/, "")
    .toLowerCase();
  return s === "true" || s === "1" || s === "yes";
};
const envFlagFalse = (v) => {
  const s = String(v ?? "")
    .trim()
    .replace(/^\uFEFF/, "")
    .toLowerCase();
  return s === "false" || s === "0" || s === "no";
};

/** Comma-separated list of allowed browser origins (used for CORS in production). */
const corsOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim().replace(/\/+$/, ""))
  .filter(Boolean);

/** No trailing slash — used to build default email logo URL. */
const appPublicUrl = (process.env.APP_PUBLIC_URL || "").trim().replace(/\/+$/, "");
const explicitEmailLogo = (process.env.EMAIL_LOGO_URL || "").trim();
/** HTML emails: use a normal https image URL in `<img src>` (Gmail blocks data: URIs). Default: app origin + /il-logo.png. */
const resolvedEmailLogoUrl =
  explicitEmailLogo || (appPublicUrl ? `${appPublicUrl}/il-logo.png` : "");

const gupshupTemplates = require("./gupshupTemplates.config");

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5000,
  corsOrigins,
  /** Swagger / OpenAPI docs at /api/v1/docs. Enabled by default; set SWAGGER_ENABLED=false to hide. */
  docs: {
    enabled: String(process.env.SWAGGER_ENABLED ?? "true").trim().toLowerCase() !== "false",
    /** Optional HTTP Basic auth on the docs UI (both must be set to activate). */
    basicAuthUser: (process.env.SWAGGER_USER || "").trim(),
    basicAuthPassword: (process.env.SWAGGER_PASSWORD || "").trim(),
  },
  databaseUrl: (process.env.DATABASE_URL || "").trim(),
  jwtSecret: process.env.JWT_SECRET || "unsafe-dev-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  jwtRememberExpiresIn: process.env.JWT_REMEMBER_EXPIRES_IN || "10d",
  bookingWindowDays: Number(process.env.BOOKING_WINDOW_DAYS) || 7,
  /**
   * Teacher credential emails: Amazon SES v2 **SendEmail** + **Template** only (no Nodemailer/SMTP).
   * Set SES_USE_DEFAULT_CREDENTIAL_CHAIN=true on ECS/EC2 with a task/instance role and omit static keys.
   */
  ses: {
    region: (process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "").trim(),
    /** Standard AWS names, or AWS_NOTIF_* if your platform injects notification IAM keys separately. */
    accessKeyId: (process.env.AWS_ACCESS_KEY_ID || process.env.AWS_NOTIF_ACCESS_KEY || "").trim(),
    secretAccessKey: (process.env.AWS_SECRET_ACCESS_KEY || process.env.AWS_NOTIF_SECRET_KEY || "").trim(),
    from: (process.env.SES_FROM_EMAIL_ADDRESS || process.env.EMAIL_FROM || "").trim(),
    templateName: (process.env.SES_TEACHER_CREDENTIALS_TEMPLATE_NAME || "INFINITY_LEARN_TEACHER_CREDENTIALS")
      .trim(),
  },
  /** Branding for HTML notification emails (logo must be HTTPS for most mail clients). */
  email: {
    brandName: process.env.EMAIL_BRAND_NAME || "Infinity Learn",
    logoUrl: resolvedEmailLogoUrl,
    supportEmail: (process.env.EMAIL_SUPPORT_EMAIL || "").trim(),
    publicUrl: appPublicUrl,
  },
  google: {
    authMode: (process.env.GOOGLE_AUTH_MODE || "oauth").trim().toLowerCase(),
    calendarId: (process.env.GOOGLE_CALENDAR_ID || "primary").trim() || "primary",
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirectUri: process.env.GOOGLE_REDIRECT_URI || "",
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN || "",
    serviceAccountJson: (process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "").trim(),
    serviceAccountKeyPath: (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || "").trim(),
    impersonateUser: (process.env.GOOGLE_IMPERSONATE_USER || "").trim(),
  },
  lsq: {
    /** Default on; set LSQ_SYNC_ENABLED=false to disable the background poller. */
    syncEnabled:
      String(process.env.LSQ_SYNC_ENABLED ?? "true").trim().toLowerCase() !== "false",
    baseUrl:
      (process.env.LSQ_BASE_URL || "https://lsqservice.infinitylearn.com")
        .trim()
        .replace(/\/+$/, ""),
    serviceEmail:
      (process.env.LSQ_SERVICE_EMAIL || "infinitylearn.cs@wizklub.com").trim().toLowerCase(),
    apiSecretHeader:
      (process.env.LSQ_API_SECRET_HEADER || "X-Api-Secret").trim() || "X-Api-Secret",
    apiSecret: (process.env.LSQ_API_SECRET || "").trim(),
    /** Global poll interval while backend is up (default 30 minutes). */
    pollMs: Number(process.env.LSQ_SYNC_POLL_MS) || 30 * 60 * 1000,
    /** First LSQ fetch only after endTime + this many minutes (default 1). */
    delayAfterMeetingMinutes:
      Number(process.env.LSQ_SYNC_DELAY_MINUTES_AFTER_END) || 1,
    /** Same booking may be fetched again after this many minutes (default 1). */
    retryEveryMinutes:
      Number(process.env.LSQ_SYNC_RETRY_MINUTES) || 1,
    maxPerRun: Number(process.env.LSQ_SYNC_MAX_PER_RUN) || 40,
    requestTimeoutMs: Number(process.env.LSQ_SYNC_REQUEST_TIMEOUT_MS) || 20000,
    /** Hours after session end before we mark recording+transcript as permanently not available (stops retries). */
    artifactsUnavailableAfterHours:
      Number(process.env.LSQ_ARTIFACTS_UNAVAILABLE_AFTER_HOURS) > 0
        ? Number(process.env.LSQ_ARTIFACTS_UNAVAILABLE_AFTER_HOURS)
        : 24,
  },
  /** LeadSquared ProspectActivity CreateCustom — roster/open booking only (not logged-in student bookSlot). */
  lsqProspectActivity: {
    enabled: String(process.env.LSQ_PROSPECT_ACTIVITY_ENABLED || "")
      .trim()
      .toLowerCase() === "true",
    baseUrl: (() => {
      let u = (process.env.LSQ_PROSPECT_ACTIVITY_BASE_URL || "").trim().replace(/\/+$/, "");
      u = u.replace(/\/ProspectActivity\.svc\/CreateCustom$/i, "");
      u = u.replace(/\/ProspectActivity\.svc$/i, "");
      return u.replace(/\/+$/, "");
    })(),
    accessKey: (process.env.LSQ_PROSPECT_ACTIVITY_ACCESS_KEY || "").trim(),
    secretKey: (process.env.LSQ_PROSPECT_ACTIVITY_SECRET_KEY || "").trim(),
    eventId: Number(process.env.LSQ_PROSPECT_ACTIVITY_EVENT_ID) || 223,
    timeoutMs: Number(process.env.LSQ_PROSPECT_ACTIVITY_TIMEOUT_MS) || 15000,
    /**
     * Include LSQ payload + notifyResult on POST /public/bookings.
     * Default ON when NODE_ENV is not production (unless explicitly disabled).
     * In production, only when LSQ_PROSPECT_ACTIVITY_CLIENT_DEBUG=true (etc.).
     */
    clientDebug:
      envFlagTrue(process.env.LSQ_PROSPECT_ACTIVITY_CLIENT_DEBUG) ||
      ((process.env.NODE_ENV || "development") !== "production" &&
        !envFlagFalse(process.env.LSQ_PROSPECT_ACTIVITY_CLIENT_DEBUG)),
    /** When true, server logs the CreateCustom JSON body at info level (no secrets in body). */
    serverLogPayload:
      String(process.env.LSQ_PROSPECT_ACTIVITY_SERVER_LOG_PAYLOAD || "")
        .trim()
        .toLowerCase() === "true",
    /** Digits only, no +. If set (e.g. 91) and mobile is 10 digits, LeadDetails.Phone becomes prefix+mobile. */
    phonePrefix: (process.env.LSQ_PROSPECT_ACTIVITY_PHONE_PREFIX || "").trim().replace(/\D/g, ""),
    /**
     * When true, ActivityDateTime uses session start **capped to now** (UTC string) so LSQ never sees a future time.
     * Session wall date/time remain in mx_Custom_5 / 6 / 10 (IST). Default uses "now" UTC.
     */
    useSessionStartForActivityDateTime: envFlagTrue(
      process.env.LSQ_PROSPECT_ACTIVITY_USE_SESSION_START_FOR_ACTIVITY_DATETIME,
    ),
  },
  /** Gupshup WhatsApp (template API) — optional booking confirmations to parent mobile (roster). */
  gupshup: {
    enabled: String(process.env.GUPSHUP_ENABLED || "").trim().toLowerCase() === "true",
    apiKey: (process.env.GUPSHUP_API_KEY || "").trim(),
    waSource: (process.env.GUPSHUP_WA_SOURCE || "").trim(),
    /** Booking confirmation template id — `src/config/gupshupTemplates.config.js` / GUPSHUP_TEMPLATE_NAME */
    templateName: gupshupTemplates.templateBookingConfirmed,
    /** WhatsApp app name in Gupshup (form field `src.name`) — required for template sends. */
    srcName: (process.env.GUPSHUP_SRC_NAME || "").trim(),
    templateLang: (process.env.GUPSHUP_TEMPLATE_LANG || "en").trim(),
    /** POST body template sends — must be /wa/api/v1/template/msg (not /msg, which treats JSON as plain text). */
    apiUrl: (process.env.GUPSHUP_API_URL || "https://api.gupshup.io/wa/api/v1/template/msg").trim(),
  },
};

module.exports = env;
