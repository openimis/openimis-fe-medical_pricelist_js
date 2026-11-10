import { describe, expect, it } from "vitest";

import { getPricelistUuid } from "./routing";

describe("getPricelistUuid", () => {
  it.each([
    ["the uuid route parameter", { price_list_uuid: "pl-1" }, "/anything", "pl-1"],
    ["the legacy id route parameter", { price_list_id: "pl-2" }, "/anything", "pl-2"],
    ["a services path", {}, "/medical/pricelists/services/pl-3", "pl-3"],
    ["an items path with a trailing segment", {}, "/front/medical/pricelists/items/pl-4/details", "pl-4"],
  ])("reads %s", (_label, params, pathname, expected) => {
    expect(getPricelistUuid(params, pathname)).toBe(expected);
  });

  it("prefers the route parameter over the path", () => {
    expect(getPricelistUuid({ price_list_uuid: "pl-1" }, "/medical/pricelists/items/pl-9")).toBe("pl-1");
  });

  it.each([
    ["a new pricelist parameter", { price_list_uuid: "new" }, ""],
    ["a new pricelist path", {}, "/medical/pricelists/services/new"],
    ["an unrelated path", {}, "/claim/claims"],
    ["no arguments at all", undefined, undefined],
  ])("returns null for %s", (_label, params, pathname) => {
    expect(getPricelistUuid(params, pathname)).toBeNull();
  });

  it("falls through a new pricelist parameter to the path", () => {
    expect(getPricelistUuid({ price_list_uuid: "new" }, "/medical/pricelists/services/pl-5")).toBe("pl-5");
  });
});
