const crypto = require("crypto");
const env = require("../config/env");

const ALGO = "aes-256-gcm";
const KEY_SALT = "il-teacher-credential-v1";

const getKey = () => crypto.scryptSync(env.jwtSecret, KEY_SALT, 32);

const encryptCredential = (plaintext) => {
  const value = String(plaintext || "").trim();
  if (!value) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
};

const decryptCredential = (encoded) => {
  if (!encoded) return null;
  try {
    const buf = Buffer.from(encoded, "base64");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
};

module.exports = {
  encryptCredential,
  decryptCredential,
};
