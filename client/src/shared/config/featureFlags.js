const readFlag = (name, defaultValue = false) => {
  const value = import.meta.env?.[name];
  if (value === undefined) return defaultValue;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
};

export const featureFlags = {
  useMockFallback: readFlag("VITE_USE_MOCK_FALLBACK", true),
  useHybridData: readFlag("VITE_USE_HYBRID_DATA", true),
  showDataOriginBadges: readFlag("VITE_SHOW_DATA_ORIGIN_BADGES", true),
  simulateRealtime: readFlag("VITE_SIMULATE_REALTIME", false),
};

export const isFeatureEnabled = (flagName) => Boolean(featureFlags[flagName]);

export default featureFlags;
