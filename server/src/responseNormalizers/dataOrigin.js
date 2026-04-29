const DATA_ORIGIN = {
  REAL: "real",
  MOCK: "mock",
  HYBRID: "hybrid",
};

const normalizeDataOrigin = (value = DATA_ORIGIN.REAL) => {
  const normalized = String(value || "").trim().toLowerCase();
  return Object.values(DATA_ORIGIN).includes(normalized)
    ? normalized
    : DATA_ORIGIN.REAL;
};

const getEntityId = (entity = {}) =>
  String(entity?._id || entity?.id || "").trim();

const withDataOrigin = (entity = {}, dataOrigin = DATA_ORIGIN.REAL) => {
  const origin = normalizeDataOrigin(dataOrigin);
  return {
    ...entity,
    _id: entity?._id || entity?.id,
    isMock: origin === DATA_ORIGIN.MOCK || Boolean(entity?.isMock),
    dataOrigin: origin,
  };
};

module.exports = {
  DATA_ORIGIN,
  getEntityId,
  normalizeDataOrigin,
  withDataOrigin,
};
