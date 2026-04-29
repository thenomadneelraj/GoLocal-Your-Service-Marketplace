export const DATA_ORIGIN = {
  REAL: "real",
  MOCK: "mock",
  HYBRID: "hybrid",
};

export const normalizeDataOrigin = (value = DATA_ORIGIN.REAL) => {
  const normalized = String(value || "").trim().toLowerCase();
  return Object.values(DATA_ORIGIN).includes(normalized)
    ? normalized
    : DATA_ORIGIN.REAL;
};

export const getEntityId = (entity = {}) =>
  String(entity?._id || entity?.id || "").trim();

export const withDataOrigin = (entity = {}, dataOrigin = DATA_ORIGIN.REAL) => {
  const origin = normalizeDataOrigin(dataOrigin);
  return {
    ...entity,
    _id: entity?._id || entity?.id,
    id: entity?.id || entity?._id,
    isMock: origin === DATA_ORIGIN.MOCK || Boolean(entity?.isMock),
    dataOrigin: origin,
  };
};

export const isMockEntity = (entity = {}) =>
  normalizeDataOrigin(entity?.dataOrigin) === DATA_ORIGIN.MOCK ||
  Boolean(entity?.isMock);

export const isRealEntity = (entity = {}) => !isMockEntity(entity);
