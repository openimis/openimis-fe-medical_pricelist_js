import { describe, expect, it } from "vitest";

import { isItemActive } from "./selection";

describe("isItemActive", () => {
  const inPricelist = { uuid: "svc-1", isActive: true };
  const notInPricelist = { uuid: "svc-2", isActive: false };

  it.each([
    ["kept in the pricelist", {}, inPricelist, true],
    ["left out of the pricelist", {}, notInPricelist, false],
    ["added in this edit", { addedDetails: ["svc-2"] }, notInPricelist, true],
    ["removed in this edit", { removedDetails: ["svc-1"] }, inPricelist, false],
    ["removed from another row", { removedDetails: ["svc-9"] }, inPricelist, true],
  ])("reports an item %s", (_label, edited, item, expected) => {
    expect(Boolean(isItemActive(edited, item))).toBe(expected);
  });
});
