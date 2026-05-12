const nodemailer = require("nodemailer");
const env = require("../../config/env");
const logger = require("../../config/logger");
const { teacherCredentials } = require("./emailTemplates");
const { brandTemplateOpts } = require("./emailLogo");

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;
  if (!env.smtp.host || !env.smtp.user || !env.smtp.pass) {
    return null;
  }
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass,
    },
  });
  return transporter;
};

/**
 * Nodemailer is used only for teacher credential emails (welcome / password reset).
 * Booking confirmations, cancellations, reschedules, and session outcomes do not send SMTP mail.
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
  const mailer = getTransporter();
  if (!mailer) {
    logger.warn("SMTP not configured, skipping teacher credential email");
    return false;
  }

  const { attachments, ...brand } = brandTemplateOpts();
  const { html, text } = teacherCredentials({
    ...brand,
    teacherName,
    teacherEmail,
    plainPassword,
    batchId,
    batchName,
    grade,
    variant,
  });

  const subject =
    variant === "update"
      ? `${env.email.brandName} — Your password was reset`
      : `${env.email.brandName} — Your teacher account`;

  try {
    await mailer.sendMail({
      from: env.smtp.from,
      to: teacherEmail,
      subject,
      text,
      html,
      attachments,
    });
    return true;
  } catch (err) {
    const smtpLine =
      err.response != null ? String(err.response).replace(/\s+/g, " ").trim().slice(0, 400) : "";
    logger.error(
      `Teacher credential email failed (to=${teacherEmail}): ${err.message}${smtpLine ? ` | ${smtpLine}` : ""}`,
    );
    return false;
  }
};

module.exports = {
  sendTeacherCredentials,
};
