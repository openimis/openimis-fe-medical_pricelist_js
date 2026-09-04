export const normalizePrice = (price) => {
  if (price == null || price === "") return null;
  const num = Number(price);
  return Number.isNaN(num) ? null : num;
};

export function getInitialOriginalName(pricelistUuid, locationState, storedPricelist) {
  if (locationState?.pricelist?.uuid === pricelistUuid) {
    return locationState.pricelist.name ?? null;
  }
  if (storedPricelist?.uuid === pricelistUuid) {
    return storedPricelist.name ?? null;
  }
  return null;
}