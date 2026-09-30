import { describe, expect, it, vi } from "vitest";

// fe-core's barrel imports itself, so the real helpers come from their defining modules.
vi.mock("@openimis/fe-core", async () => vi.importActual("@openimis/fe-core/helpers/api"));

const { default: reducer } = await import("./reducer");
const { ITEMS_PRICELIST_TYPE, SERVICES_PRICELIST_TYPE } = await import("./constants");
const { graphqlErrors, relayPage, serverError } = await import("@openimis/fe-core/testing");

const initial = () => reducer(undefined, { type: "@@INIT" });
const dispatch = (state, type, { payload, meta } = {}) => reducer(state, { type, payload, meta });
const respond = (state, type, data, meta) => dispatch(state, `${type}_RESP`, { payload: { data }, meta });
const fail = (state, type, meta) =>
  dispatch(state, `${type}_ERR`, {
    payload: serverError(500, "Internal Server Error", "boom"),
    meta,
  });

const SERVER_ERROR = { code: 500, message: "Internal Server Error", detail: "boom" };

describe("medical pricelist reducer", () => {
  describe("initialisation", () => {
    it("starts with nothing loaded and nothing in flight", () => {
      const state = initial();

      expect(state.fetchingPrice).toBeNull();
      expect(state.servicesPricelists).toEqual({});
      expect(state.itemsPricelists).toEqual({});
      expect(state.summaries.items).toMatchObject({ isFetching: false, items: [], pageInfo: { totalCount: 0 } });
      expect(state.summaries.services).toMatchObject({ isFetching: false, items: [], pageInfo: { totalCount: 0 } });
      expect(state.pricelists.items).toMatchObject({ items: {}, item: {} });
      expect(state.pricelists.services).toMatchObject({ items: {}, item: {} });
    });

    it("returns the same state object for an unrelated action", () => {
      const state = initial();

      expect(reducer(state, { type: "SOMETHING_ELSE" })).toBe(state);
    });
  });

  describe("pricelist details", () => {
    const DETAILS = [
      ["services", "MEDICAL_PRICELIST_SERVICES", "medicalServices", "services", "items", SERVICES_PRICELIST_TYPE],
      ["items", "MEDICAL_PRICELIST_ITEMS", "medicalItems", "items", "services", ITEMS_PRICELIST_TYPE],
    ];

    it.each(DETAILS)(
      "marks the %s in flight and forgets which list the other slice was showing",
      (_label, type, _entity, field, other) => {
        const shown = { ...initial(), [other]: { ...initial()[other], type: "whatever" } };
        const state = dispatch(shown, `${type}_REQ`);

        expect(state[field]).toMatchObject({ isFetching: true, error: null });
        expect(state[other].type).toBeNull();
      }
    );

    it.each(DETAILS)(
      "numbers the %s prices and takes the overrule from the pricelist detail",
      (_label, type, entity, field, _other, pricelistType) => {
        const state = respond(initial(), type, {
          [entity]: relayPage(
            [
              { uuid: "in-list", price: "12.50", pricelistDetails: { edges: [{ node: { priceOverrule: "10.00" } }] } },
              {
                uuid: "in-list-no-overrule",
                price: "8",
                pricelistDetails: { edges: [{ node: { priceOverrule: null } }] },
              },
              { uuid: "not-in-list", price: "3.25", pricelistDetails: { edges: [] } },
              { uuid: "not-asked", price: "" },
            ],
            { totalCount: 4 }
          ),
        });

        expect(state[field].items).toEqual([
          { uuid: "in-list", price: 12.5, isActive: true, priceOverrule: 10 },
          { uuid: "in-list-no-overrule", price: 8, isActive: true, priceOverrule: null },
          { uuid: "not-in-list", price: 3.25, isActive: false, priceOverrule: undefined },
          { uuid: "not-asked", price: null, isActive: false, priceOverrule: undefined },
        ]);
        expect(state[field].pageInfo).toMatchObject({ totalCount: 4 });
        expect(state[field].type).toBe(pricelistType);
        expect(state[field].isFetching).toBe(false);
      }
    );

    it.each(DETAILS)("formats a transport failure of the %s", (_label, type, _entity, field) => {
      expect(fail(initial(), type)[field]).toMatchObject({ isFetching: false, error: SERVER_ERROR });
    });
  });

  describe("single pricelist", () => {
    const TYPES = [
      ["services", SERVICES_PRICELIST_TYPE, "servicesPricelists"],
      ["items", ITEMS_PRICELIST_TYPE, "itemsPricelists"],
    ];

    it.each(TYPES)("marks the %s pricelist in flight without touching the other type", (_label, pricelistType) => {
      const state = dispatch(initial(), "MEDICAL_PRICELIST_PRICELIST_REQ", { meta: { pricelistType } });
      const other = pricelistType === SERVICES_PRICELIST_TYPE ? ITEMS_PRICELIST_TYPE : SERVICES_PRICELIST_TYPE;

      expect(state.pricelists[pricelistType]).toMatchObject({ isFetching: true, fetchedPricelist: false, error: null });
      expect(state.pricelists[other]).toEqual(initial().pricelists[other]);
    });

    it.each(TYPES)("caches the loaded %s pricelist by its uuid and opens it", (_label, pricelistType, entity) => {
      const cached = { uuid: "pl-0", name: "Older" };
      const before = {
        ...initial(),
        pricelists: {
          ...initial().pricelists,
          [pricelistType]: { ...initial().pricelists[pricelistType], items: { "pl-0": cached } },
        },
      };
      const state = respond(
        before,
        "MEDICAL_PRICELIST_PRICELIST",
        {
          [entity]: relayPage([{ id: "x", uuid: "pl-1", name: "District 1" }]),
        },
        { pricelistType, pricelistUuid: "requested" }
      );

      expect(state.pricelists[pricelistType]).toMatchObject({
        isFetching: false,
        fetchedPricelist: true,
        item: { uuid: "pl-1", name: "District 1" },
        items: { "pl-0": cached, "pl-1": { id: "x", uuid: "pl-1", name: "District 1" } },
      });
    });

    it("falls back to the requested uuid when the pricelist does not project one", () => {
      const state = respond(
        initial(),
        "MEDICAL_PRICELIST_PRICELIST",
        {
          servicesPricelists: relayPage([{ name: "No uuid" }]),
        },
        { pricelistType: SERVICES_PRICELIST_TYPE, pricelistUuid: "requested" }
      );

      expect(state.pricelists.services.items).toEqual({ requested: { name: "No uuid" } });
    });

    it("opens an empty pricelist and keeps the cache when nothing matched", () => {
      const before = {
        ...initial(),
        pricelists: {
          ...initial().pricelists,
          items: { ...initial().pricelists.items, items: { "pl-0": { uuid: "pl-0" } } },
        },
      };
      const state = respond(
        before,
        "MEDICAL_PRICELIST_PRICELIST",
        {
          itemsPricelists: relayPage([]),
        },
        { pricelistType: ITEMS_PRICELIST_TYPE, pricelistUuid: "gone" }
      );

      expect(state.pricelists.items.item).toEqual({});
      expect(state.pricelists.items.items).toEqual({ "pl-0": { uuid: "pl-0" } });
      expect(state.pricelists.items.fetchedPricelist).toBe(true);
    });

    it.each(TYPES)("formats a transport failure of the %s pricelist", (_label, pricelistType) => {
      expect(fail(initial(), "MEDICAL_PRICELIST_PRICELIST", { pricelistType }).pricelists[pricelistType]).toMatchObject(
        { isFetching: false, error: SERVER_ERROR }
      );
    });

    it("closes both open pricelists on clear but keeps the caches", () => {
      const open = {
        ...initial(),
        pricelists: {
          services: { ...initial().pricelists.services, item: { uuid: "s-1" }, items: { "s-1": { uuid: "s-1" } } },
          items: { ...initial().pricelists.items, item: { uuid: "i-1" }, items: { "i-1": { uuid: "i-1" } } },
        },
      };
      const state = dispatch(open, "MEDICAL_PRICELIST_PRICELIST_CLEAR");

      expect(state.pricelists.services).toMatchObject({ item: {}, items: { "s-1": { uuid: "s-1" } } });
      expect(state.pricelists.items).toMatchObject({ item: {}, items: { "i-1": { uuid: "i-1" } } });
    });
  });

  describe("pricelist summaries", () => {
    it.each([
      ["services", SERVICES_PRICELIST_TYPE, "servicesPricelists"],
      ["items", ITEMS_PRICELIST_TYPE, "itemsPricelists"],
    ])("reads the %s summaries from their own field", (_label, pricelistType, entity) => {
      const requested = dispatch(initial(), "MEDICAL_PRICELIST_SUMMARIES_REQ", { meta: { pricelistType } });
      expect(requested.summaries[pricelistType].isFetching).toBe(true);

      const state = respond(
        requested,
        "MEDICAL_PRICELIST_SUMMARIES",
        {
          [entity]: relayPage([{ uuid: "pl-1" }], { totalCount: 21, pageInfo: { hasNextPage: true } }),
        },
        { pricelistType }
      );

      expect(state.summaries[pricelistType]).toMatchObject({
        isFetching: false,
        isFetched: true,
        items: [{ uuid: "pl-1" }],
        pageInfo: { totalCount: 21, hasNextPage: true },
      });
    });

    it("formats a transport failure", () => {
      expect(
        fail(initial(), "MEDICAL_PRICELIST_SUMMARIES", { pricelistType: ITEMS_PRICELIST_TYPE }).summaries.items
      ).toMatchObject({ isFetching: false, error: SERVER_ERROR });
    });
  });

  describe("claim price lookup", () => {
    it("remembers which health facility pricelists a claim needs", () => {
      const facility = { servicesPricelist: { id: "s-1" }, itemsPricelist: { id: "i-1" } };
      const state = dispatch(initial(), "CLAIM_EDIT_HEALTH_FACILITY_SET", { payload: facility });

      expect(state.fetchingPrice).toBe(facility);
      expect(state.fetchedPricelist).toBe(false);
    });

    it("marks the lookup in flight", () => {
      expect(dispatch(initial(), "MEDICAL_PRICELIST_LOAD_REQ")).toMatchObject({
        fetchingPricelist: true,
        fetchedPricelist: false,
        errorPricelist: null,
      });
    });

    it("maps each loaded price by its id, per pricelist", () => {
      const state = respond(
        initial(),
        "MEDICAL_PRICELIST_LOAD",
        {
          pricelists: {
            services: [
              { id: 1, p: "10.00" },
              { id: 2, p: "4.50" },
            ],
            items: [{ id: 7, p: "1.25" }],
          },
        },
        { servicesPricelist: "s-1", itemsPricelist: "i-1" }
      );

      expect(state.servicesPricelists).toEqual({ "s-1": { 1: "10.00", 2: "4.50" } });
      expect(state.itemsPricelists).toEqual({ "i-1": { 7: "1.25" } });
      expect(state.fetchedPricelist).toBe(true);
      expect(state.errorPricelist).toBeNull();
    });

    it("keeps the pricelists it already had and only fills the ones it asked for", () => {
      const known = { ...initial(), servicesPricelists: { "s-0": { 1: "9" } }, itemsPricelists: { "i-0": { 2: "3" } } };
      const state = respond(
        known,
        "MEDICAL_PRICELIST_LOAD",
        {
          pricelists: { services: [{ id: 1, p: "10" }] },
        },
        { servicesPricelist: "s-1", itemsPricelist: false }
      );

      expect(state.servicesPricelists).toEqual({ "s-0": { 1: "9" }, "s-1": { 1: "10" } });
      expect(state.itemsPricelists).toEqual({ "i-0": { 2: "3" } });
    });

    it("surfaces a data error", () => {
      const state = dispatch(initial(), "MEDICAL_PRICELIST_LOAD_RESP", {
        payload: { data: { pricelists: { services: [], items: [] } }, ...graphqlErrors("no such pricelist") },
        meta: {},
      });

      expect(state.errorPricelist).toMatchObject({ detail: "no such pricelist" });
    });

    it("formats a transport failure", () => {
      expect(fail(initial(), "MEDICAL_PRICELIST_LOAD")).toMatchObject({
        fetchingPricelist: false,
        errorPricelist: SERVER_ERROR,
      });
    });
  });

  describe("pricelist name validation", () => {
    const FIELDS = [
      ["services", "PRICELIST_SERVICES_FIELDS_VALIDATION", "medicalServices"],
      ["items", "PRICELIST_ITEMS_FIELDS_VALIDATION", "medicalItems"],
    ];

    it.each(FIELDS)("marks the %s name as being checked", (_label, type, field) => {
      expect(dispatch(initial(), `${type}_REQ`).validationFields[field]).toEqual({
        isValidating: true,
        isValid: false,
        validationError: null,
      });
    });

    it.each(FIELDS)("reports the %s name check result", (_label, type, field) => {
      expect(respond(initial(), type, { isValid: true }).validationFields[field]).toEqual({
        isValidating: false,
        isValid: true,
        validationError: null,
      });
      expect(respond(initial(), type, { isValid: false }).validationFields[field].isValid).toBe(false);
    });

    it.each(FIELDS)("treats a transport failure of the %s check as invalid", (_label, type, field) => {
      expect(fail(initial(), type).validationFields[field]).toEqual({
        isValidating: false,
        isValid: false,
        validationError: SERVER_ERROR,
      });
    });

    it.each(FIELDS)("accepts the %s name without a check when told it is valid", (_label, type, field) => {
      expect(dispatch(initial(), `${type}_SET_VALID`).validationFields[field]).toEqual({
        isValidating: false,
        isValid: true,
        validationError: null,
      });
    });

    it.each(FIELDS)("forgets the %s result on clear", (_label, type, field) => {
      const checked = respond(initial(), type, { isValid: true });

      expect(dispatch(checked, `${type}_CLEAR`).validationFields[field]).toMatchObject({
        isValid: false,
        validationError: null,
      });
    });

    // Currently fails: the CLEAR cases set isValidating to true, the same as a request, so
    // after the name field unmounts the store claims a check is still running.
    it.fails.each(FIELDS)("stops validating the %s name on clear", (_label, type, field) => {
      const checking = dispatch(initial(), `${type}_REQ`);

      expect(dispatch(checking, `${type}_CLEAR`).validationFields[field].isValidating).toBe(false);
    });

    it("keeps the services check when the items name is checked", () => {
      const services = respond(initial(), "PRICELIST_SERVICES_FIELDS_VALIDATION", { isValid: true });
      const state = dispatch(services, "PRICELIST_ITEMS_FIELDS_VALIDATION_REQ");

      expect(state.validationFields.medicalServices.isValid).toBe(true);
      expect(state.validationFields.medicalItems.isValidating).toBe(true);
    });
  });

  describe("immutability", () => {
    it("does not mutate the state it was given", () => {
      const state = initial();
      const snapshot = JSON.stringify(state);

      respond(
        state,
        "MEDICAL_PRICELIST_LOAD",
        {
          pricelists: { services: [{ id: 1, p: "10" }], items: [] },
        },
        { servicesPricelist: "s-1" }
      );
      respond(
        state,
        "MEDICAL_PRICELIST_PRICELIST",
        {
          servicesPricelists: relayPage([{ uuid: "pl-1" }]),
        },
        { pricelistType: SERVICES_PRICELIST_TYPE }
      );

      expect(JSON.stringify(state)).toBe(snapshot);
    });
  });
});
