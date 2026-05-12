const fs = require("fs");
const path = require("path");
const env = require("../../config/env");

/** Nodemailer CIDs — referenced in HTML as src="cid:..." */
const LOGO_CID = "il-logo@infinitylearn";
const CREDENTIALS_BANNER_CID = "il-credentials-banner@infinitylearn";

/**
 * Prefer embedding `backend/assets/il-logo.png` so the logo shows without a public HTTPS host.
 * Falls back to EMAIL_LOGO_URL / APP_PUBLIC_URL when the file is missing.
 */
const resolveLogoForEmail = () => {
  const explicitPath = (process.env.EMAIL_LOGO_PATH || "").trim();
  const defaultPath = path.join(__dirname, "../../../assets/il-logo.png");
  const filePath = explicitPath ? path.resolve(explicitPath) : defaultPath;

  if (fs.existsSync(filePath)) {
    return {
      logoUrl: `cid:${LOGO_CID}`,
      attachments: [
        {
          filename: "il-logo.png",
          path: filePath,
          cid: LOGO_CID,
        },
      ],
    };
  }

  if (env.email.logoUrl) {
    return { logoUrl: env.email.logoUrl, attachments: [] };
  }

  return { logoUrl: "", attachments: [] };
};

/**
 * Optional credentials-banner image used in teacher credential mails.
 * Preferred local file: backend/assets/il-credentials-banner.png
 * Optional env overrides:
 * - EMAIL_CREDENTIAL_BANNER_PATH
 * - EMAIL_CREDENTIAL_BANNER_URL
 */
const resolveCredentialsBannerForEmail = () => {
  const explicitPath = (process.env.EMAIL_CREDENTIAL_BANNER_PATH || "").trim();
  const defaultPath = path.join(__dirname, "../../../assets/il-credentials-banner.png");
  const filePath = explicitPath ? path.resolve(explicitPath) : defaultPath;

  if (fs.existsSync(filePath)) {
    return {
      credentialsBannerUrl: `cid:${CREDENTIALS_BANNER_CID}`,
      attachments: [
        {
          filename: "il-credentials-banner.png",
          path: filePath,
          cid: CREDENTIALS_BANNER_CID,
        },
      ],
    };
  }

  const bannerUrl = (process.env.EMAIL_CREDENTIAL_BANNER_URL || "").trim();
  if (bannerUrl) {
    return { credentialsBannerUrl: bannerUrl, attachments: [] };
  }

  return { credentialsBannerUrl: "", attachments: [] };
};

const brandTemplateOpts = () => {
  const logo = resolveLogoForEmail();
  const banner = resolveCredentialsBannerForEmail();
  return {
    brandName: env.email.brandName,
    logoUrl: logo.logoUrl,
    credentialsBannerUrl: banner.credentialsBannerUrl,
    supportEmail: env.email.supportEmail,
    publicUrl: env.email.publicUrl,
    attachments: [...logo.attachments, ...banner.attachments],
  };
};

module.exports = {
  resolveLogoForEmail,
  resolveCredentialsBannerForEmail,
  brandTemplateOpts,
  LOGO_CID,
  CREDENTIALS_BANNER_CID,
};
