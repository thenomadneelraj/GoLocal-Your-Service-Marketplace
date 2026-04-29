export {
  DATA_ORIGIN,
  getEntityId,
  isMockEntity,
  isRealEntity,
  normalizeBooking,
  normalizeDataOrigin,
  normalizeEntity,
  normalizeTransaction,
  normalizeUser,
} from "@/shared/data/dataLayering";

const SOURCE_PRIORITY = {
  real: 0,
  mock: 1,
};

const DEFAULT_KEYS = [
  "latestActivityAt",
  "updatedAt",
  "createdAt",
  "bookingDate",
  "latestAt",
  "joinedAt",
  "verificationSubmittedAt",
  "payoutDate",
];

const toTimestamp = (value) => {
  if (!value) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  const date = new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? 0 : time;
};

export const resolveLatestActivityAt = (item = {}, keys = DEFAULT_KEYS) => {
  for (const key of keys) {
    const value = item?.[key];
    const timestamp = toTimestamp(value);
    if (timestamp) {
      return new Date(timestamp).toISOString();
    }
  }

  return "";
};

export const withDataOrigin = (item = {}, dataOrigin = "real", options = {}) => {
  const latestActivityAt =
    options.latestActivityAt ||
    resolveLatestActivityAt(item, options.timestampKeys);

  return {
    ...item,
    dataOrigin,
    type: item.type || dataOrigin,
    isMock: dataOrigin === "mock",
    latestActivityAt,
  };
};

const getLayeredKey = (item, getId) => {
  const resolvedId =
    typeof getId === "function" ? getId(item) : item?.id || item?._id || "";

  return String(resolvedId || "").trim();
};

export const sortLayeredItems = (items = [], getTimestamp) =>
  [...items].sort((left, right) => {
    const leftSource = SOURCE_PRIORITY[left?.dataOrigin] ?? SOURCE_PRIORITY.real;
    const rightSource = SOURCE_PRIORITY[right?.dataOrigin] ?? SOURCE_PRIORITY.real;

    if (leftSource !== rightSource) {
      return leftSource - rightSource;
    }

    const leftTime = toTimestamp(
      typeof getTimestamp === "function"
        ? getTimestamp(left)
        : left?.latestActivityAt || resolveLatestActivityAt(left)
    );
    const rightTime = toTimestamp(
      typeof getTimestamp === "function"
        ? getTimestamp(right)
        : right?.latestActivityAt || resolveLatestActivityAt(right)
    );

    if (leftTime !== rightTime) {
      return rightTime - leftTime;
    }

    return String(left?.id || left?._id || "").localeCompare(
      String(right?.id || right?._id || "")
    );
  });

export const mergeLayeredCollections = (
  realItems = [],
  mockItems = [],
  options = {}
) => {
  const layeredRealItems = realItems.map((item) =>
    withDataOrigin(item, "real", { timestampKeys: options.timestampKeys })
  );
  const layeredMockItems = mockItems.map((item) =>
    withDataOrigin(item, "mock", { timestampKeys: options.timestampKeys })
  );

  const seen = new Set();

  const uniqueItems = [...layeredRealItems, ...layeredMockItems].filter((item) => {
    const key = getLayeredKey(item, options.getId);
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return sortLayeredItems(uniqueItems, options.getTimestamp);
};

export const countLayeredItems = (items = []) =>
  items.reduce(
    (accumulator, item) => {
      if (item?.dataOrigin === "mock") {
        accumulator.mock += 1;
      } else {
        accumulator.real += 1;
      }

      return accumulator;
    },
    { real: 0, mock: 0 }
  );

export const hasMeaningfulValue = (value) => {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === "number") {
    return Number(value) > 0;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (value && typeof value === "object") {
    return Object.values(value).some((entry) => hasMeaningfulValue(entry));
  }

  return Boolean(value);
};

export const fallbackToMock = (realValue, mockValue) =>
  hasMeaningfulValue(realValue) ? realValue : mockValue;

export const summarizeLayering = (items = []) => {
  const counts = countLayeredItems(items);
  return {
    ...counts,
    hasReal: counts.real > 0,
    hasMock: counts.mock > 0,
    showMixedState: counts.real > 0 && counts.mock > 0,
  };
};
