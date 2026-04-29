const {
  DATA_ORIGIN,
  getEntityId,
  withDataOrigin,
} = require("../responseNormalizers/dataOrigin");

const hasValue = (value) => {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "number") return Number.isFinite(value) && value !== 0;
  if (typeof value === "string") return value.trim().length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return Boolean(value);
};

const mergeHybridEntity = (realEntity, mockEntity) => {
  const merged = { ...mockEntity, ...realEntity };
  Object.entries(mockEntity || {}).forEach(([key, value]) => {
    if (!hasValue(merged[key]) && hasValue(value)) {
      merged[key] = value;
    }
  });
  return withDataOrigin(merged, DATA_ORIGIN.HYBRID);
};

const mergeLayeredCollections = (realItems = [], mockItems = [], config = {}) => {
  const getId = config.getId || getEntityId;
  const normalize = config.normalize || ((item) => item);
  const byId = new Map();
  const unkeyed = [];

  (Array.isArray(mockItems) ? mockItems : []).forEach((item) => {
    const normalized = withDataOrigin(
      normalize(item, DATA_ORIGIN.MOCK),
      DATA_ORIGIN.MOCK,
    );
    const key = String(getId(normalized) || "").trim();
    if (key) byId.set(key, normalized);
    else unkeyed.push(normalized);
  });

  (Array.isArray(realItems) ? realItems : []).forEach((item) => {
    const normalized = withDataOrigin(
      normalize(item, DATA_ORIGIN.REAL),
      DATA_ORIGIN.REAL,
    );
    const key = String(getId(normalized) || "").trim();
    if (!key) {
      unkeyed.push(normalized);
      return;
    }
    const existing = byId.get(key);
    byId.set(key, existing ? mergeHybridEntity(normalized, existing) : normalized);
  });

  return [...byId.values(), ...unkeyed];
};

module.exports = {
  mergeLayeredCollections,
};
