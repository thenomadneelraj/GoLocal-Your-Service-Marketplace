import featureFlags from "@/shared/config/featureFlags";
import { mergeLayeredCollections } from "@/shared/data/mergeCollections";

export const unwrapApiData = (response) => response?.data?.data ?? response?.data;

export const getResponseSource = (response) =>
  response?.data?.meta?.source || response?.meta?.source || "real";

export const buildHybridCollection = ({
  realItems = [],
  mockItems = [],
  normalize,
  getId,
}) => {
  if (!featureFlags.useHybridData) {
    return realItems;
  }

  if (!featureFlags.useMockFallback) {
    return realItems;
  }

  return mergeLayeredCollections(realItems, mockItems, { normalize, getId });
};
