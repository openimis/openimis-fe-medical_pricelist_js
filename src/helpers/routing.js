const PRICELIST_UUID_PATH = /\/medical\/pricelists\/(?:services|items)\/([^/]+)/;

export function getPricelistUuid(params = {}, pathname = "") {
  const routeUuid = params.price_list_uuid ?? params.price_list_id;
  if (routeUuid && routeUuid !== "new") {
    return routeUuid;
  }

  const match = pathname.match(PRICELIST_UUID_PATH);
  const pathUuid = match?.[1];
  return pathUuid && pathUuid !== "new" ? pathUuid : null;
}