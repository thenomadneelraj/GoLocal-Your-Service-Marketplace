const { featureFlags } = require("../featureFlags");
const { DATA_ORIGIN } = require("../responseNormalizers/dataOrigin");
const { mergeLayeredCollections } = require("./mergeCollections");

const resolveHybridCollection = ({ realItems = [], mockItems = [], normalize, getId }) => {
  if (!featureFlags.useHybridData) {
    return {
      items: realItems,
      source: DATA_ORIGIN.REAL,
    };
  }

  if (!realItems.length && featureFlags.useMockFallback) {
    return {
      items: mergeLayeredCollections([], mockItems, { normalize, getId }),
      source: DATA_ORIGIN.MOCK,
    };
  }

  if (mockItems.length && featureFlags.useMockFallback) {
    return {
      items: mergeLayeredCollections(realItems, mockItems, { normalize, getId }),
      source: DATA_ORIGIN.HYBRID,
    };
  }

  return {
    items: realItems,
    source: DATA_ORIGIN.REAL,
  };
};

module.exports = {
  resolveHybridCollection,
};
