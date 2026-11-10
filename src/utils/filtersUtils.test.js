import { describe, expect, it } from "vitest";

import {
  buildLocationFilter,
  buildPaginationParams,
  buildServicesPricelistFilters,
  getRegionHelperText,
  shouldDisableRegion,
  validateLocationFilters,
} from "./filtersUtils";

const region = { value: { uuid: "region-1", code: "R1", name: "Region" }, filter: 'location_Uuid: "region-1"' };
const district = { value: { uuid: "district-1", code: "D1", name: "District" }, filter: 'location_Uuid: "district-1"' };

describe("buildLocationFilter", () => {
  it.each([
    ["the district over the region", { region, district }, 'location_Uuid: "district-1"'],
    ["the region alone", { region }, 'location_Uuid: "region-1"'],
    ["the district alone", { district }, 'location_Uuid: "district-1"'],
    ["nothing without a location", {}, null],
    ["nothing for a cleared district", { district: { value: null } }, null],
  ])("filters by %s", (_label, filters, expected) => {
    expect(buildLocationFilter(filters)).toBe(expected);
  });
});

describe("buildServicesPricelistFilters", () => {
  it("sends one location filter even when both levels are chosen", () => {
    const state = { filters: { region, district, name: { value: "Dis", filter: 'name_Icontains: "Dis"' } } };

    expect(buildServicesPricelistFilters(state)).toEqual(['location_Uuid: "district-1"', 'name_Icontains: "Dis"']);
  });

  it("skips filters that carry no query fragment", () => {
    const state = { filters: { showHistory: { value: false, filter: null }, name: { value: "" } } };

    expect(buildServicesPricelistFilters(state)).toEqual([]);
  });

  it.each([
    ["no state", undefined],
    ["no filters", {}],
  ])("returns nothing for %s", (_label, state) => {
    expect(buildServicesPricelistFilters(state)).toEqual([]);
  });
});

describe("buildPaginationParams", () => {
  it.each([
    ["the first page", { pageSize: 10 }, ["first: 10"]],
    ["the page after a cursor", { pageSize: 10, afterCursor: "c-2" }, ['after: "c-2"', "first: 10"]],
    ["the page before a cursor", { pageSize: 20, beforeCursor: "c-1" }, ['before: "c-1"', "last: 20"]],
  ])("asks for %s", (_label, state, expected) => {
    expect(buildPaginationParams(state)).toEqual(expected);
  });
});

describe("region field helpers", () => {
  it("disables the region once a district is chosen", () => {
    expect(shouldDisableRegion({ region, district })).toBe(true);
    expect(shouldDisableRegion({ region })).toBe(false);
  });

  it("explains the region by the district name, falling back to its code", () => {
    expect(getRegionHelperText({ district })).toContain("District");
    expect(getRegionHelperText({ district: { value: { uuid: "d", code: "D9" } } })).toContain("D9");
    expect(getRegionHelperText({ region })).toBe("");
  });

  it("flags a region and a district chosen together", () => {
    expect(validateLocationFilters({ region, district })).toEqual({ isValid: false, error: expect.any(String) });
  });

  it.each([
    ["a region", { region }],
    ["a district", { district }],
    ["no location", {}],
  ])("accepts %s on its own", (_label, filters) => {
    expect(validateLocationFilters(filters)).toEqual({ isValid: true, error: null });
  });
});
