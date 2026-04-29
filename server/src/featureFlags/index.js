const readFlag = (name, defaultValue = false) => {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
};

const featureFlags = {
  useMockFallback: readFlag("USE_MOCK_FALLBACK", true),
  useHybridData: readFlag("USE_HYBRID_DATA", true),
  includeDataOrigin: readFlag("INCLUDE_DATA_ORIGIN", true),
  seedMockDataOnStart: readFlag("SEED_MOCK_DATA_ON_START", false),
};

const isFeatureEnabled = (flagName) => Boolean(featureFlags[flagName]);

module.exports = {
  featureFlags,
  isFeatureEnabled,
};
