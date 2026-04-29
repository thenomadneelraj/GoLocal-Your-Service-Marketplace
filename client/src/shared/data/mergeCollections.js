import { DATA_ORIGIN, getEntityId, withDataOrigin } from "./dataOrigin";

const sourceRank = {
  [DATA_ORIGIN.REAL]: 0,
  [DATA_ORIGIN.HYBRID]: 1,
  [DATA_ORIGIN.MOCK]: 2,
};

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

export const mergeLayeredCollections = (
  realItems = [],
  mockItems = [],
  config = {},
) => {
  const getId = config.getId || getEntityId;
  const normalize = config.normalize || ((item) => item);
  const realLayer = (Array.isArray(realItems) ? realItems : []).map((item) =>
    withDataOrigin(normalize(item, DATA_ORIGIN.REAL), DATA_ORIGIN.REAL),
  );
  const mockLayer = (Array.isArray(mockItems) ? mockItems : []).map((item) =>
    withDataOrigin(normalize(item, DATA_ORIGIN.MOCK), DATA_ORIGIN.MOCK),
  );

  const byId = new Map();
  const unkeyed = [];

  mockLayer.forEach((item) => {
    const key = String(getId(item) || "").trim();
    if (key) byId.set(key, item);
    else unkeyed.push(item);
  });

  realLayer.forEach((item) => {
    const key = String(getId(item) || "").trim();
    if (!key) {
      unkeyed.push(item);
      return;
    }

    const existing = byId.get(key);
    byId.set(key, existing ? mergeHybridEntity(item, existing) : item);
  });

  return [...byId.values(), ...unkeyed].sort((left, right) => {
    const sourceDiff =
      (sourceRank[left.dataOrigin] ?? 0) - (sourceRank[right.dataOrigin] ?? 0);
    if (sourceDiff) return sourceDiff;
    return String(getId(left)).localeCompare(String(getId(right)));
  });
};

export default mergeLayeredCollections;
