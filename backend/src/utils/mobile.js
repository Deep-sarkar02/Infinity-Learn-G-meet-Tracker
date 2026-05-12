const normalizeMobile = (raw) => {
  if (raw === undefined || raw === null) return "";
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length >= 12 && digits.startsWith("91")) {
    return digits.slice(-10);
  }
  if (digits.length > 10) {
    return digits.slice(-10);
  }
  return digits;
};

module.exports = { normalizeMobile };
