import { describe, expect, it } from "vitest";

import { getInitialOriginalName, normalizePrice } from "./pricelist";

describe("normalizePrice", () => {
  it.each([
    ["a decimal string from the server", "12.50", 12.5],
    ["a whole number string", "8", 8],
    ["a number", 3.25, 3.25],
    ["zero", 0, 0],
    ["a zero string", "0.00", 0],
  ])("turns %s into a number", (_label, price, expected) => {
    expect(normalizePrice(price)).toBe(expected);
  });

  it.each([
    ["null", null],
    ["undefined", undefined],
    ["an empty string", ""],
    ["text", "abc"],
    ["a comma decimal", "12,50"],
  ])("treats %s as no price", (_label, price) => {
    expect(normalizePrice(price)).toBeNull();
  });
});

describe("getInitialOriginalName", () => {
  const navigated = { pricelist: { uuid: "pl-1", name: "From navigation" } };
  const stored = { uuid: "pl-1", name: "From store" };

  it("prefers the pricelist the user navigated in with", () => {
    expect(getInitialOriginalName("pl-1", navigated, stored)).toBe("From navigation");
  });

  it("falls back to the stored pricelist", () => {
    expect(getInitialOriginalName("pl-1", null, stored)).toBe("From store");
  });

  it("ignores a navigated or stored pricelist for a different uuid", () => {
    expect(getInitialOriginalName("pl-2", navigated, stored)).toBeNull();
  });

  it("returns null rather than undefined for a matching pricelist without a name", () => {
    expect(getInitialOriginalName("pl-1", { pricelist: { uuid: "pl-1" } }, null)).toBeNull();
    expect(getInitialOriginalName("pl-1", null, { uuid: "pl-1" })).toBeNull();
  });
});
