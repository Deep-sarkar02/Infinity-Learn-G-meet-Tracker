/**
 * Infinity Learn credential emails — polished, production-style look.
 * Table layout + inline styles for broad email client support.
 */

const escapeHtml = (value) => {
  if (value === undefined || value === null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

const IL = {
  pageBg: "#F7F9FB",
  cardBg: "#FFFFFF",
  cardBorder: "#E7ECF5",
  text: "#191C1E",
  textMuted: "#424654",
  primary: "#0040A1",
  primarySoft: "#EAF2FF",
  heroA: "#0065FF",
  heroB: "#FFFFFF",
  heroC: "#FFE170",
  heroSub: "#25324A",
  warningBg: "#FFF9E8",
  warningBorder: "#F0D772",
  warningText: "#544600",
  rowBg: "#F8FAFE",
  rowBorder: "#E8EEF8",
  stripOverlay: "rgba(0,64,161,0.62)",
  font: "'Poppins','Segoe UI',Tahoma,Arial,sans-serif",
};

const logoBlock = (brandName, logoUrl) => {
  if (logoUrl && String(logoUrl).trim() !== "") {
    return `<table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="padding:10px;background:#FFFFFF;border-radius:12px;"><img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(brandName)}" width="112" style="display:block;width:112px;max-width:112px;height:auto;border:0;" /></td></tr></table>`;
  }
  return `<table role="presentation" cellspacing="0" cellpadding="0"><tr><td width="112" height="112" align="center" valign="middle" style="width:112px;height:112px;border-radius:12px;background:#FFFFFF;font-family:${IL.font};font-weight:700;font-size:28px;color:${IL.primary};">IL</td></tr></table>`;
};

const iconBadge = (text) =>
  `<table role="presentation" cellspacing="0" cellpadding="0"><tr><td width="40" height="40" align="center" valign="middle" style="width:40px;height:40px;border-radius:10px;background:${IL.primarySoft};font-family:${IL.font};font-size:11px;font-weight:700;letter-spacing:0.04em;color:${IL.primary};">${text}</td></tr></table>`;

const infoRow = (label, valueHtml, token, withDivider = true) => `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0;">
  <tr>
    <td style="padding:14px 0;${withDivider ? `border-bottom:1px solid ${IL.rowBorder};` : ""}">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td width="52" valign="top" style="padding-right:12px;">${iconBadge(token)}</td>
          <td valign="top">
            <p style="margin:0 0 4px;font-family:${IL.font};font-size:11px;font-weight:700;line-height:16px;letter-spacing:0.12em;text-transform:uppercase;color:${IL.textMuted};">${label}</p>
            <div style="margin:0;font-family:${IL.font};font-size:19px;font-weight:700;line-height:24px;color:${IL.primary};">${valueHtml}</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

const twoColRow = (leftLabel, leftValue, leftToken, rightLabel, rightValue, rightToken) => `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0;">
  <tr>
    <td width="50%" valign="top" style="padding:14px 6px 14px 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${IL.rowBg};border:1px solid ${IL.rowBorder};border-radius:12px;">
        <tr><td style="padding:12px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td width="50" valign="top" style="padding-right:10px;">${iconBadge(leftToken)}</td>
              <td valign="top">
                <p style="margin:0 0 4px;font-family:${IL.font};font-size:11px;font-weight:700;line-height:16px;letter-spacing:0.12em;text-transform:uppercase;color:${IL.textMuted};">${leftLabel}</p>
                <p style="margin:0;font-family:${IL.font};font-size:18px;font-weight:700;line-height:24px;color:${IL.primary};">${leftValue}</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </td>
    <td width="50%" valign="top" style="padding:14px 0 14px 6px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${IL.rowBg};border:1px solid ${IL.rowBorder};border-radius:12px;">
        <tr><td style="padding:12px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td width="50" valign="top" style="padding-right:10px;">${iconBadge(rightToken)}</td>
              <td valign="top">
                <p style="margin:0 0 4px;font-family:${IL.font};font-size:11px;font-weight:700;line-height:16px;letter-spacing:0.12em;text-transform:uppercase;color:${IL.textMuted};">${rightLabel}</p>
                <p style="margin:0;font-family:${IL.font};font-size:18px;font-weight:700;line-height:24px;color:${IL.primary};">${rightValue}</p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </td>
  </tr>
</table>`;

const alertBar = (text) => `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0 0;">
  <tr>
    <td style="padding:14px 16px;border-radius:12px;background:${IL.warningBg};border:1px solid ${IL.warningBorder};">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td width="24" valign="top" style="padding-right:10px;">
            <table role="presentation" cellspacing="0" cellpadding="0"><tr><td width="18" height="18" align="center" valign="middle" style="width:18px;height:18px;border-radius:50%;background:#F5D76E;font-family:${IL.font};font-size:12px;font-weight:700;color:${IL.warningText};">!</td></tr></table>
          </td>
          <td valign="top" style="font-family:${IL.font};font-size:14px;font-weight:600;line-height:21px;color:${IL.warningText};">${text}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;

const strip = (text, imageUrl) => {
  const bgStyle =
    imageUrl && String(imageUrl).trim() !== ""
      ? `background-image:url('${escapeHtml(imageUrl)}');background-size:cover;background-position:center;`
      : `background:linear-gradient(90deg, ${IL.heroA} 0%, ${IL.heroC} 100%);`;
  return `
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0 0;border-radius:14px;overflow:hidden;">
  <tr>
    <td style="${bgStyle}" height="94" valign="middle">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          <td style="padding:14px 16px;background:linear-gradient(90deg,${IL.stripOverlay} 0%,rgba(0,64,161,0.2) 72%,rgba(0,64,161,0.05) 100%);">
            <p style="margin:0;font-family:${IL.font};font-size:32px;font-weight:700;line-height:32px;color:#FFFFFF;max-width:320px;">${escapeHtml(text)}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
};

const footer = (brandName, supportEmail) => `
<p style="margin:18px 0 0;text-align:center;font-family:${IL.font};font-size:14px;color:${IL.textMuted};line-height:22px;">
  <strong style="color:${IL.primary};font-weight:700;">${escapeHtml(brandName)}</strong>
  &nbsp;|&nbsp; Meeting possibilities
</p>
${supportEmail ? `<p style="margin:8px 0 0;text-align:center;font-family:${IL.font};font-size:14px;color:${IL.primary};"><a href="mailto:${escapeHtml(supportEmail)}" style="color:${IL.primary};text-decoration:none;font-weight:600;">${escapeHtml(supportEmail)}</a></p>` : ""}
<p style="margin:10px 0 0;text-align:center;font-family:${IL.font};font-size:12px;color:${IL.textMuted};line-height:18px;">This message was sent automatically. Please do not reply to this email.<br/>© ${new Date().getFullYear()} ${escapeHtml(brandName)}. All rights reserved.</p>
`;

/**
 * @param {"welcome"|"update"} variant
 */
const renderIlCredentialsEmail = ({
  variant,
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
}) => {
  const isUpdate = variant === "update";
  const heroTitle = isUpdate ? "Password updated" : "Account ready";
  const heroSub = isUpdate
    ? "Your administrator issued a new sign-in password. Use the same email as before."
    : "Your teacher account is now active. Use the credentials below to sign in.";
  const sectionTag = isUpdate ? "Security update" : "Credentials";
  const intro = isUpdate
    ? "Your password was reset by an administrator. Use the new password below on your next sign-in."
    : "Use the credentials below to access your workspace.";
  const warning = isUpdate
    ? "If you did not request a password reset, contact your administrator right away and delete older credential emails."
    : "Keep these credentials private and update your password after first login.";
  const stripText = isUpdate
    ? `Secure access with ${brandName}`
    : `Welcome to ${brandName}`;

  const emailValue = `<a href="mailto:${escapeHtml(teacherEmail)}" style="color:${IL.primary};text-decoration:none;font-weight:700;">${escapeHtml(teacherEmail)}</a>`;
  const passwordValue = `<span style="font-family:${IL.font};letter-spacing:0.08em;color:${IL.text};">${escapeHtml(plainPassword)}</span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet">
<title>${escapeHtml(heroTitle)}</title>
</head>
<body style="margin:0;padding:0;background:${IL.pageBg};">
<div style="display:none;font-size:1px;color:${IL.pageBg};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${IL.pageBg};">
  <tr>
    <td align="center" style="padding:18px 10px;">
      <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="max-width:640px;width:100%;background:${IL.cardBg};border:1px solid ${IL.cardBorder};border-radius:16px;overflow:hidden;">
        <tr>
          <td style="padding:14px;background:linear-gradient(96deg, ${IL.heroA} 0%, ${IL.heroB} 56%, ${IL.heroC} 100%);">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td width="162" valign="middle" style="padding-right:16px;border-right:1px solid rgba(0,64,161,0.2);">
                  ${logoBlock(brandName, logoUrl)}
                </td>
                <td valign="middle" style="padding-left:16px;">
                  <h1 style="margin:0;font-family:${IL.font};font-size:36px;font-weight:700;line-height:40px;color:${IL.primary};letter-spacing:-0.02em;">${escapeHtml(heroTitle)}</h1>
                  <p style="margin:10px 0 0;font-family:${IL.font};font-size:16px;font-weight:500;line-height:24px;color:${IL.heroSub};max-width:360px;">${escapeHtml(heroSub)}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 20px 8px;">
            <p style="margin:0 0 14px;font-family:${IL.font};font-size:11px;font-weight:700;line-height:16px;letter-spacing:0.12em;text-transform:uppercase;color:${IL.primary};">${escapeHtml(sectionTag)}</p>
            <p style="margin:0;font-family:${IL.font};font-size:34px;font-weight:700;line-height:38px;color:${IL.text};">Dear ${escapeHtml(teacherName)},</p>
            <p style="margin:12px 0 0;font-family:${IL.font};font-size:16px;line-height:25px;color:${IL.text};">${escapeHtml(intro)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 20px 0;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${IL.cardBg};border:1px solid ${IL.cardBorder};border-radius:14px;">
              <tr>
                <td style="padding:4px 16px 12px;">
                  ${infoRow("Sign-in email", emailValue, "ID")}
                  ${infoRow("Temporary password", passwordValue, "PW")}
                  ${twoColRow("Grade", escapeHtml(String(grade)), "GR", "Batch ID", escapeHtml(String(batchId)), "BI")}
                  ${infoRow("Batch name", escapeHtml(String(batchName)), "BN", false)}
                </td>
              </tr>
            </table>
            ${alertBar(escapeHtml(warning))}
            ${strip(stripText, credentialsBannerUrl)}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 20px 22px;">
            ${footer(brandName, supportEmail)}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
};

module.exports = {
  renderIlCredentialsEmail,
  escapeHtml,
};
