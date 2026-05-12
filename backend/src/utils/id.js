const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (value) => UUID_RE.test(String(value || "").trim());

const idOrLegacyWhere = (value) => {
  const key = String(value || "").trim();
  if (!key) return null;
  if (isUuid(key)) {
    return {
      OR: [{ id: key }, { legacyMongoId: key }],
    };
  }
  return { legacyMongoId: key };
};

module.exports = {
  isUuid,
  idOrLegacyWhere,
};
