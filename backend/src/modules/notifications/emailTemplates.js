/**
 * HTML + plain-text bodies for transactional mail. Table-based layout for email client compatibility.
 * Palette (strict): #1E73D8 #0B3C5D #8BBCEB #F4D35E #25D366 #FFFFFF #F5F5F5
 */

const { renderIlCredentialsEmail } = require("./ilCredentialsEmailTemplates");

const C = {
  primary: "#1E73D8",
  dark: "#0B3C5D",
  light: "#8BBCEB",
  gold: "#F4D35E",
  green: "#25D366",
  white: "#FFFFFF",
  grey: "#F5F5F5",
};

const escapeHtml = (value) => {
  if (value === undefined || value === null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

const font = "'Poppins','Segoe UI',Tahoma,Arial,sans-serif";

const brandInitials = (name) => {
  const s = String(name || "MR").trim();
  if (s.length < 2) return `${s}·`.slice(0, 2).toUpperCase();
  return s.slice(0, 2).toUpperCase();
};

const statusPill = (label, tone = "primary") => {
  const bg =
    tone === "warn" ? "#FFF9E6" : tone === "danger" ? C.grey : "#E8F4FC";
  const border =
    tone === "warn" ? C.gold : tone === "danger" ? C.light : C.primary;
  return `
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 22px;">
  <tr>
    <td style="padding:11px 20px;border-radius:999px;background:${bg};border:1px solid ${border};font-family:${font};font-size:10px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:${C.dark};">
      ${escapeHtml(label)}
    </td>
  </tr>
</table>`;
};

/** Standard info row */
const detailRow = (label, valueHtml) => `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 14px;">
  <tr>
    <td style="padding:0 0 0 4px;border-left:3px solid ${C.primary};">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.white};border-radius:14px;border:1px solid ${C.light};box-shadow:0 4px 14px rgba(11,60,93,0.07);">
        <tr>
          <td style="padding:20px 22px;">
            <p style="margin:0 0 10px;font-size:10px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:${C.primary};font-family:${font};">${label}</p>
            <div style="margin:0;font-size:17px;font-weight:700;color:${C.dark};font-family:${font};line-height:1.45;">${valueHtml}</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

/** Email field — reads as actionable */
const detailRowEmail = (label, email) =>
  detailRow(
    label,
    `<a href="mailto:${escapeHtml(email)}" style="color:${C.primary};font-weight:700;text-decoration:none;border-bottom:2px solid ${C.light};">${escapeHtml(email)}</a>`,
  );

const primaryButton = (href, label) => `
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 10px;">
  <tr>
    <td style="border-radius:16px;background:${C.primary};border:2px solid ${C.dark};box-shadow:0 14px 32px -12px rgba(30,115,216,0.65);">
      <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:17px 40px;font-family:${font};font-size:15px;font-weight:800;color:${C.white};text-decoration:none;letter-spacing:0.04em;">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>
<p style="margin:0;font-size:12px;color:${C.light};font-family:${font};line-height:1.55;">Opens Google Meet in your default browser.</p>`;

const istHint = `<span style="font-weight:800;color:${C.primary};font-size:11px;letter-spacing:0.08em;">IST</span>`;

/**
 * Wraps main HTML in a soft panel (depth + scanability).
 */
const bodyPanel = (html) => `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0;">
  <tr>
    <td style="padding:28px 24px;background:${C.grey};border-radius:18px;border:1px solid ${C.light};">
      ${html}
    </td>
  </tr>
</table>`;

/**
 * @param {object} opts
 * @param {boolean} [opts.useBodyPanel] - wrap inner content in grey panel
 */
const layout = ({
  brandName,
  logoUrl,
  preheader,
  title,
  innerHtml,
  gradient,
  footerHtml,
  accentStripe = C.gold,
  useBodyPanel = false,
}) => {
  const [g0, g1] = gradient;
  const initials = brandInitials(brandName);

  const logoBlock = logoUrl
    ? `<table role="presentation" align="center" cellspacing="0" cellpadding="0" style="margin:0 auto 26px;">
  <tr>
    <td style="padding:4px;background:linear-gradient(135deg, ${C.gold} 0%, ${C.white} 50%, ${C.light} 100%);border-radius:22px;">
      <table role="presentation" align="center" cellspacing="0" cellpadding="0" style="background:${C.white};border-radius:18px;padding:22px 32px;">
        <tr>
          <td>
            <img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(brandName)}" width="200" height="auto" style="display:block;margin:0 auto;max-width:200px;width:100%;height:auto;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;" />
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`
    : `<table role="presentation" align="center" cellspacing="0" cellpadding="0" style="margin:0 auto 24px;">
  <tr>
    <td style="width:64px;height:64px;border-radius:20px;background:${C.white};text-align:center;vertical-align:middle;font-family:${font};font-size:22px;font-weight:800;color:${C.dark};letter-spacing:0.06em;box-shadow:0 12px 36px rgba(11,60,93,0.28);border:3px solid ${C.gold};">
      ${escapeHtml(initials)}
    </td>
  </tr>
</table>`;

  const bodyContent = useBodyPanel ? bodyPanel(innerHtml) : innerHtml;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:${C.grey};">
<div style="display:none;font-size:1px;color:${C.grey};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${C.grey};padding:44px 18px;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:${C.white};border-radius:22px;overflow:hidden;box-shadow:0 24px 60px -28px rgba(11,60,93,0.32);border:1px solid ${C.light};">
        <tr>
          <td style="height:6px;background:${C.gold};font-size:6px;line-height:6px;">&nbsp;</td>
        </tr>
        <tr>
          <td bgcolor="${C.dark}" style="background:linear-gradient(165deg, ${g0} 0%, ${g1} 42%, ${C.primary} 92%);padding:44px 36px 40px;text-align:center;border-bottom:6px solid ${accentStripe};">
            ${logoBlock}
            <h1 style="margin:0;font-family:${font};font-size:26px;font-weight:800;color:${C.white};line-height:1.2;letter-spacing:-0.03em;text-shadow:0 2px 12px rgba(0,0,0,0.15);">${escapeHtml(title)}</h1>
            <p style="margin:14px 0 0;font-family:${font};font-size:14px;color:rgba(255,255,255,0.94);line-height:1.6;font-weight:500;">${escapeHtml(brandName)} <span style="color:${C.gold};font-weight:800;">·</span> Secure scheduling</p>
          </td>
        </tr>
        <tr>
          <td style="padding:${useBodyPanel ? "32px 28px 28px" : "40px 36px 16px"};font-family:${font};font-size:15px;line-height:1.75;color:${C.dark};">
            ${bodyContent}
          </td>
        </tr>
        <tr>
          <td style="padding:0 36px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="height:1px;background:${C.light};font-size:1px;line-height:1px;">&nbsp;</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 36px 36px;font-family:${font};font-size:13px;line-height:1.7;color:${C.light};background:${C.grey};">
            ${
              logoUrl
                ? `<table role="presentation" align="center" cellspacing="0" cellpadding="0" style="margin:0 auto 20px;"><tr><td style="padding:12px 16px;background:${C.white};border-radius:14px;border:1px solid ${C.light};box-shadow:0 6px 16px rgba(11,60,93,0.06);"><img src="${escapeHtml(logoUrl)}" alt="" width="76" height="auto" style="display:block;margin:0 auto;max-width:76px;height:auto;border:0;" /></td></tr></table>`
                : ""
            }
            <div style="text-align:center;color:${C.dark};">${footerHtml}</div>
          </td>
        </tr>
      </table>
      <p style="margin:24px auto 0;font-family:${font};font-size:11px;color:${C.light};max-width:480px;line-height:1.65;text-align:center;">Automated message &mdash; please contact your administrator if you did not expect this email.</p>
    </td>
  </tr>
</table>
</body>
</html>`;
};

const footerBlock = ({ brandName, supportEmail, publicUrl }) => {
  const parts = [
    `<span style="display:inline-block;margin-bottom:6px;"><strong style="color:${C.dark};font-weight:800;font-size:14px;">${escapeHtml(brandName)}</strong></span>`,
    `<span style="display:block;color:${C.light};font-size:12px;margin-bottom:8px;">Meeting coordination</span>`,
  ];
  const links = [];
  if (supportEmail) {
    links.push(
      `<a href="mailto:${escapeHtml(supportEmail)}" style="color:${C.primary};font-weight:700;text-decoration:none;border-bottom:1px solid ${C.light};">${escapeHtml(supportEmail)}</a>`,
    );
  }
  if (publicUrl) {
    links.push(
      `<a href="${escapeHtml(publicUrl)}" style="color:${C.primary};font-weight:800;text-decoration:none;">Visit portal</a>`,
    );
  }
  if (links.length) {
    parts.push(
      `<span style="font-size:12px;color:${C.light};">${links.join(` <span style="color:${C.gold};">·</span> `)}</span>`,
    );
  }
  return parts.join("");
};

const bookingConfirmation = ({
  brandName,
  logoUrl,
  supportEmail,
  publicUrl,
  readableDate,
  readableStart,
  readableEnd,
  meetingLink,
  calendarInviteExpected,
}) => {
  const meet =
    meetingLink && String(meetingLink).trim() !== ""
      ? escapeHtml(meetingLink)
      : "Use the link in your Google Calendar invite if you received one.";

  const inner = `
${statusPill("Confirmed", "primary")}
<p style="margin:0 0 26px;color:${C.dark};font-family:${font};font-size:15px;line-height:1.75;">Your session is <strong style="color:${C.primary};">confirmed</strong>. All times are <strong>India Standard Time</strong> ${istHint}.</p>
${detailRow(`Date · ${istHint}`, escapeHtml(readableDate))}
${detailRow(`Time · ${istHint}`, `${escapeHtml(readableStart)} &ndash; ${escapeHtml(readableEnd)}`)}
${detailRow(
  "Video session",
  meet.includes("http")
    ? `<a href="${escapeHtml(meetingLink)}" style="color:${C.primary};font-weight:700;text-decoration:none;word-break:break-all;border-bottom:2px solid ${C.light};">${escapeHtml(meetingLink)}</a>`
    : meet,
)}
${
  meetingLink && String(meetingLink).trim() !== ""
    ? primaryButton(meetingLink, "Join Google Meet")
    : ""
}
${
  calendarInviteExpected
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:26px 0 0;"><tr><td style="padding:20px 22px;background:${C.white};border-radius:14px;border:1px solid ${C.light};border-left:5px solid ${C.gold};box-shadow:0 4px 14px rgba(11,60,93,0.06);">
<p style="margin:0;font-size:13px;line-height:1.65;color:${C.dark};font-family:${font};">You may also receive a <strong style="color:${C.primary};">Google Calendar</strong> invitation (Accept / Decline). That message is sent by Google, not ${escapeHtml(brandName)}.</p>
</td></tr></table>`
    : ""
}`;

  const text = [
    `${brandName} — Meeting confirmed`,
    "",
    "Your session is confirmed. All times below are India Standard Time (IST, UTC+5:30).",
    `Date: ${readableDate}`,
    `Time: ${readableStart} - ${readableEnd}`,
    meetingLink && String(meetingLink).trim() !== ""
      ? `Google Meet: ${meetingLink}`
      : "Video: check Google Calendar if the event was created.",
    calendarInviteExpected
      ? "You may also get a separate Google Calendar invite."
      : "",
    "",
    footerBlock({ brandName, supportEmail, publicUrl }).replace(/<[^>]+>/g, " "),
  ]
    .filter(Boolean)
    .join("\n");

  const html = layout({
    brandName,
    logoUrl,
    preheader: `Confirmed: ${readableDate} ${readableStart}–${readableEnd} IST`,
    title: "Your meeting is confirmed",
    innerHtml: inner,
    gradient: [C.dark, C.primary],
    footerHtml: footerBlock({ brandName, supportEmail, publicUrl }),
    accentStripe: C.gold,
    useBodyPanel: true,
  });

  return { html, text };
};

const bookingCancellation = ({
  brandName,
  logoUrl,
  supportEmail,
  publicUrl,
  readableDate,
  readableStart,
  readableEnd,
  reasonLine,
}) => {
  const inner = `
${statusPill("Cancelled", "warn")}
<p style="margin:0 0 18px;color:${C.dark};font-family:${font};font-size:15px;line-height:1.75;"><strong style="color:${C.primary};">Notice</strong> &mdash; ${escapeHtml(reasonLine)}</p>
<p style="margin:0 0 26px;color:${C.dark};font-family:${font};font-size:14px;line-height:1.7;">This session will <strong>not</strong> take place. Remove or decline it in your calendar if it appears there.</p>
${detailRow("Was scheduled · date", escapeHtml(readableDate))}
${detailRow("Was scheduled · time", `${escapeHtml(readableStart)} &ndash; ${escapeHtml(readableEnd)}`)}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0 0;"><tr><td style="padding:18px 20px;border-radius:14px;background:${C.white};border:1px dashed ${C.light};">
<p style="margin:0;font-size:12px;line-height:1.6;color:${C.light};font-family:${font};">Google Calendar may send a separate cancellation to attendees.</p>
</td></tr></table>`;

  const text = [
    `${brandName} — Meeting cancelled`,
    "",
    reasonLine,
    "",
    `Date (IST): ${readableDate}`,
    `Time (IST): ${readableStart} - ${readableEnd}`,
    "",
    footerBlock({ brandName, supportEmail, publicUrl }).replace(/<[^>]+>/g, " "),
  ].join("\n");

  const html = layout({
    brandName,
    logoUrl,
    preheader: `Cancelled: ${readableDate} ${readableStart}–${readableEnd} IST`,
    title: "Meeting cancelled",
    innerHtml: inner,
    gradient: [C.primary, C.dark],
    footerHtml: footerBlock({ brandName, supportEmail, publicUrl }),
    accentStripe: C.light,
    useBodyPanel: true,
  });

  return { html, text };
};

const bookingReschedule = ({
  brandName,
  logoUrl,
  supportEmail,
  publicUrl,
  prevReadableDate,
  prevReadableStart,
  prevReadableEnd,
  newReadableDate,
  newReadableStart,
  newReadableEnd,
  meetingLink,
  calendarInviteExpected,
}) => {
  const meet =
    meetingLink && String(meetingLink).trim() !== ""
      ? escapeHtml(meetingLink)
      : "Use the link in your Google Calendar invite if you received one.";

  const inner = `
${statusPill("Rescheduled", "primary")}
<p style="margin:0 0 18px;color:${C.dark};font-family:${font};font-size:15px;line-height:1.75;">Your teacher <strong style="color:${C.primary};">moved this session</strong> to a new time. All times are <strong>India Standard Time</strong> ${istHint}.</p>
<p style="margin:0 0 14px;font-size:12px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${C.primary};">Previous</p>
${detailRow(`Date · ${istHint}`, escapeHtml(prevReadableDate))}
${detailRow(`Time · ${istHint}`, `${escapeHtml(prevReadableStart)} &ndash; ${escapeHtml(prevReadableEnd)}`)}
<p style="margin:18px 0 14px;font-size:12px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${C.primary};">New time</p>
${detailRow(`Date · ${istHint}`, escapeHtml(newReadableDate))}
${detailRow(`Time · ${istHint}`, `${escapeHtml(newReadableStart)} &ndash; ${escapeHtml(newReadableEnd)}`)}
${detailRow(
  "Video session",
  meet.includes("http")
    ? `<a href="${escapeHtml(meetingLink)}" style="color:${C.primary};font-weight:700;text-decoration:none;word-break:break-all;border-bottom:2px solid ${C.light};">${escapeHtml(meetingLink)}</a>`
    : meet,
)}
${
  meetingLink && String(meetingLink).trim() !== ""
    ? primaryButton(meetingLink, "Join Google Meet")
    : ""
}
${
  calendarInviteExpected
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:26px 0 0;"><tr><td style="padding:20px 22px;background:${C.white};border-radius:14px;border:1px solid ${C.light};border-left:5px solid ${C.gold};box-shadow:0 4px 14px rgba(11,60,93,0.06);">
<p style="margin:0;font-size:13px;line-height:1.65;color:${C.dark};font-family:${font};">You may also receive a <strong style="color:${C.primary};">Google Calendar</strong> update (reschedule) from Google.</p>
</td></tr></table>`
    : ""
}`;

  const text = [
    `${brandName} — Meeting rescheduled`,
    "",
    "Your teacher moved this session. All times are India Standard Time (IST, UTC+5:30).",
    "",
    "Previous:",
    `Date: ${prevReadableDate}`,
    `Time: ${prevReadableStart} - ${prevReadableEnd}`,
    "",
    "New time:",
    `Date: ${newReadableDate}`,
    `Time: ${newReadableStart} - ${newReadableEnd}`,
    meetingLink && String(meetingLink).trim() !== ""
      ? `Google Meet: ${meetingLink}`
      : "Video: check Google Calendar for the updated event.",
    calendarInviteExpected ? "You may also get a Calendar reschedule notification from Google." : "",
    "",
    footerBlock({ brandName, supportEmail, publicUrl }).replace(/<[^>]+>/g, " "),
  ]
    .filter(Boolean)
    .join("\n");

  const html = layout({
    brandName,
    logoUrl,
    preheader: `Rescheduled: ${newReadableDate} ${newReadableStart}–${newReadableEnd} IST`,
    title: "Meeting rescheduled",
    innerHtml: inner,
    gradient: [C.dark, C.primary],
    footerHtml: footerBlock({ brandName, supportEmail, publicUrl }),
    accentStripe: C.gold,
    useBodyPanel: true,
  });

  return { html, text };
};

const SESSION_OUTCOME_UI = {
  completed: {
    pill: "Completed",
    subject: "Session marked complete",
    leadPlain:
      "Your teacher recorded this session as completed. Thank you for using our scheduling portal.",
    lead:
      "Your teacher recorded this session as <strong style=\"color:#1E73D8;\">completed</strong>. Thank you for using our scheduling portal.",
  },
  student_did_not_join: {
    pill: "Student did not join",
    subject: "Session outcome: Student did not join",
    leadPlain: "Your teacher recorded that the student did not join this scheduled session.",
    lead:
      "Your teacher recorded that the <strong style=\"color:#1E73D8;\">student did not join</strong> this scheduled session.",
  },
  teacher_did_not_join: {
    pill: "Teacher did not join",
    subject: "Session outcome: Teacher did not join",
    leadPlain: "Your teacher recorded that they did not join this scheduled session.",
    lead:
      "Your teacher recorded that they <strong style=\"color:#1E73D8;\">did not join</strong> this scheduled session.",
  },
};

const bookingSessionOutcome = ({
  brandName,
  logoUrl,
  supportEmail,
  publicUrl,
  outcome,
  readableDate,
  readableStart,
  readableEnd,
}) => {
  const ui = SESSION_OUTCOME_UI[outcome] || SESSION_OUTCOME_UI.completed;
  const inner = `
${statusPill(ui.pill, outcome === "completed" ? "primary" : "warn")}
<p style="margin:0 0 18px;color:${C.dark};font-family:${font};font-size:15px;line-height:1.75;">${ui.lead}</p>
<p style="margin:0 0 26px;color:${C.dark};font-family:${font};font-size:14px;line-height:1.7;">Scheduled session (India Standard Time ${istHint}).</p>
${detailRow(`Date · ${istHint}`, escapeHtml(readableDate))}
${detailRow(`Time · ${istHint}`, `${escapeHtml(readableStart)} &ndash; ${escapeHtml(readableEnd)}`)}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0 0;"><tr><td style="padding:18px 20px;border-radius:14px;background:${C.white};border:1px dashed ${C.light};">
<p style="margin:0;font-size:12px;line-height:1.6;color:${C.light};font-family:${font};">If this does not match what happened, contact your coordinator with the date and time above.</p>
</td></tr></table>`;

  const text = [
    `${brandName} — ${ui.subject}`,
    "",
    ui.leadPlain,
    "",
    `Date (IST): ${readableDate}`,
    `Time (IST): ${readableStart} - ${readableEnd}`,
    "",
    footerBlock({ brandName, supportEmail, publicUrl }).replace(/<[^>]+>/g, " "),
  ].join("\n");

  const html = layout({
    brandName,
    logoUrl,
    preheader: `${ui.subject}: ${readableDate} ${readableStart}–${readableEnd} IST`,
    title: ui.subject,
    innerHtml: inner,
    gradient: [C.dark, C.primary],
    footerHtml: footerBlock({ brandName, supportEmail, publicUrl }),
    accentStripe: C.gold,
    useBodyPanel: true,
  });

  return { html, text, subjectSuffix: ui.subject };
};

/** @param {"welcome"|"update"} [opts.variant] — HTML follows Figma IL credentials (see ilCredentialsEmailTemplates.js) */
const teacherCredentials = ({
  brandName,
  logoUrl,
  credentialsBannerUrl,
  supportEmail,
  publicUrl,
  teacherName,
  teacherEmail,
  plainPassword,
  batchId,
  batchName,
  grade,
  variant = "welcome",
}) => {
  const isUpdate = variant === "update";

  const textWelcome = [
    `${brandName} — Your teacher account`,
    "",
    `Dear ${teacherName},`,
    "",
    "Your teacher account was created.",
    `Email: ${teacherEmail}`,
    `Temporary password: ${plainPassword}`,
    `Grade: ${grade}`,
    `Batch ID: ${batchId}`,
    `Batch name: ${batchName}`,
    "",
    "Sign in and change your password as soon as possible.",
    "",
    footerBlock({ brandName, supportEmail, publicUrl }).replace(/<[^>]+>/g, " "),
  ].join("\n");

  const textUpdate = [
    `${brandName} — Password reset`,
    "",
    `Dear ${teacherName},`,
    "",
    "A new temporary password was set for your teacher account.",
    `Email (unchanged): ${teacherEmail}`,
    `New temporary password: ${plainPassword}`,
    `Grade: ${grade}`,
    `Batch ID: ${batchId}`,
    `Batch name: ${batchName}`,
    "",
    "If you did not request this, contact your administrator.",
    "",
    footerBlock({ brandName, supportEmail, publicUrl }).replace(/<[^>]+>/g, " "),
  ].join("\n");

  const text = isUpdate ? textUpdate : textWelcome;

  const preheader = isUpdate
    ? `New password for ${teacherName}`
    : `Teacher account ready for ${teacherName}`;

  const html = renderIlCredentialsEmail({
    variant: isUpdate ? "update" : "welcome",
    brandName,
    logoUrl,
    credentialsBannerUrl,
    teacherName,
    teacherEmail,
    plainPassword,
    grade,
    batchId,
    batchName,
    preheader,
    supportEmail,
    publicUrl,
  });

  return { html, text };
};

module.exports = {
  escapeHtml,
  bookingConfirmation,
  bookingCancellation,
  bookingReschedule,
  bookingSessionOutcome,
  teacherCredentials,
};
