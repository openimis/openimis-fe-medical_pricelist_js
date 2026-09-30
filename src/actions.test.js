import { describe, expect, it, vi } from "vitest";

// Only fe-core's dispatchers are stubbed; the formatters are real, imported from
// their defining modules because fe-core's barrel imports itself.
const core = vi.hoisted(() => ({
  graphql: vi.fn((payload, type, meta) => ({ payload, type, meta })),
  graphqlWithVariables: vi.fn((operation, variables, type, meta) => ({ operation, variables, type, meta })),
  graphqlMutation: vi.fn((operation, variables) => ({ operation, variables })),
}));

vi.mock("@openimis/fe-core", async () => ({
  ...(await vi.importActual("@openimis/fe-core/helpers/api")),
  ...(await vi.importActual("@openimis/fe-core/actions")),
  ...core,
}));

const actions = await import("./actions");
const { ITEMS_PRICELIST_TYPE, SERVICES_PRICELIST_TYPE } = await import("./constants");
const { globalId } = await import("@openimis/fe-core/testing");

const query = (result) => result.payload.replace(/\s+/g, " ");
const operation = (result) => result.operation.replace(/\s+/g, " ");

describe("medical pricelist actions", () => {
  describe("claim price lookup", () => {
    const services = { id: globalId("ServicesPricelistGQLType", "11") };
    const items = { id: globalId("ItemsPricelistGQLType", "22") };

    it("asks for both price maps by decoded id and keys the result by the ids it was given", () => {
      const result = actions.fetchPriceLists(services, items);

      expect(result.type).toBe("MEDICAL_PRICELIST_LOAD");
      expect(query(result)).toContain(
        "pricelists(servicesPricelistId: 11,itemsPricelistId: 22) { services{id,p},items{id,p} }"
      );
      expect(result.meta).toEqual({ servicesPricelist: services.id, itemsPricelist: items.id });
    });

    it.each([
      ["services", services, null, "servicesPricelistId: 11", "services{id,p}", "items"],
      ["items", null, items, "itemsPricelistId: 22", "items{id,p}", "services"],
    ])("asks only for the %s prices when only that pricelist is needed", (_label, s, i, filter, projection, other) => {
      const result = actions.fetchPriceLists(s, i);

      expect(query(result)).toContain(`pricelists(${filter}) { ${projection} }`);
      expect(query(result)).not.toContain(`${other}{`);
      expect(result.meta[`${other}Pricelist`]).toBe(false);
    });

    it("does nothing when neither pricelist is needed", () => {
      core.graphql.mockClear();

      expect(actions.fetchPriceLists(null, null)).toBeTypeOf("function");
      expect(core.graphql).not.toHaveBeenCalled();
    });
  });

  describe("single pricelist", () => {
    it.each([
      ["fetchServicesPricelistByUuid", "servicesPricelists", SERVICES_PRICELIST_TYPE],
      ["fetchItemsPricelistByUuid", "itemsPricelists", ITEMS_PRICELIST_TYPE],
    ])("%s asks for the pricelist and tags the request with its type", (creator, entity, pricelistType) => {
      const result = actions[creator]({}, "pl-1");

      expect(result.type).toBe("MEDICAL_PRICELIST_PRICELIST");
      expect(result.meta).toEqual({ pricelistType, pricelistUuid: "pl-1" });
      expect(query(result)).toContain(`${entity}(uuid: "pl-1")`);
      expect(query(result)).toContain("detailsCount:details{totalCount}");
    });
  });

  describe("location pricelists", () => {
    it.each([
      ["fetchServicesPriceLists", "servicesPricelists", "MEDICAL_LOCATION_SERVICES_PRICELIST"],
      ["fetchItemsPriceLists", "itemsPricelists", "MEDICAL_LOCATION_ITEMS_PRICELIST"],
    ])("%s filters by the location when given one", (creator, entity, type) => {
      const location = { uuid: "loc-1" };
      const result = actions[creator](location);

      expect(result.type).toBe(type);
      expect(result.meta).toEqual({ location });
      expect(query(result)).toContain(`${entity}(locationUuid:"loc-1")`);
    });

    it.each([
      ["fetchServicesPriceLists", "servicesPricelists"],
      ["fetchItemsPriceLists", "itemsPricelists"],
    ])("%s asks for every pricelist without a location", (creator, entity) => {
      expect(query(actions[creator](null))).toContain(`${entity} { pageInfo`);
    });
  });

  describe("summaries", () => {
    it.each([
      ["fetchServicesPricelistsSummaries", "servicesPricelists", SERVICES_PRICELIST_TYPE],
      ["fetchItemsPricelistsSummaries", "itemsPricelists", ITEMS_PRICELIST_TYPE],
    ])("%s asks for a counted page of its own entity", (creator, entity, pricelistType) => {
      const result = actions[creator]({}, ["first: 10"]);

      expect(result.type).toBe("MEDICAL_PRICELIST_SUMMARIES");
      expect(result.meta).toEqual({ pricelistType });
      expect(query(result)).toContain(`${entity}(first: 10) { totalCount`);
    });
  });

  describe("pricelist details", () => {
    it.each([
      ["fetchServicesPricelistDetails", "medicalServices", "servicesPricelist", "MEDICAL_PRICELIST_SERVICES"],
      ["fetchItemsPricelistDetails", "medicalItems", "itemsPricelist", "MEDICAL_PRICELIST_ITEMS"],
    ])("%s asks for the overrule held by the open pricelist", (creator, entity, argument, type) => {
      const result = actions[creator]({}, ["first: 10"], "pl-1");

      expect(result.type).toBe(type);
      expect(query(result)).toContain(`${entity}(first: 10) { totalCount`);
      expect(query(result)).toContain(`pricelistDetails(${argument}: "pl-1") {edges {node {priceOverrule}}}`);
    });

    it.each([["fetchServicesPricelistDetails"], ["fetchItemsPricelistDetails"]])(
      "%s leaves the overrule out for a pricelist not yet saved",
      (creator) => {
        const sent = query(actions[creator]({}, [], undefined));

        expect(sent).not.toContain("pricelistDetails");
        expect(sent).toContain("id,uuid,code,name,type,price");
      }
    );
  });

  describe("mutations", () => {
    const pricelist = {
      uuid: "pl-1",
      name: "District 1",
      pricelistDate: "2026-01-01",
      location: { uuid: "loc-1", name: "District 1" },
      addedDetails: ["svc-1"],
      removedDetails: ["svc-2"],
      priceOverrules: { "svc-1": "12.50", "svc-3": "", "svc-4": null },
    };

    it.each([
      ["createServicesPricelist", "CreateServicesPricelistMutationInput", "createServicesPricelist"],
      ["createItemsPricelist", "CreateItemsPricelistMutationInput", "createItemsPricelist"],
      ["updateServicesPricelist", "UpdateServicesPricelistMutationInput", "updateServicesPricelist"],
      ["updateItemsPricelist", "UpdateItemsPricelistMutationInput", "updateItemsPricelist"],
    ])("%s sends the pricelist through the matching input type", (creator, inputType, field) => {
      const result = actions[creator]({}, pricelist, "Save pricelist");

      expect(operation(result)).toContain(`mutation ($input: ${inputType}!) { ${field}(input: $input)`);
      expect(result.variables.input.clientMutationLabel).toBe("Save pricelist");
    });

    it("sends the location by uuid, the detail changes, and every overrule as a number or null", () => {
      const { input } = actions.updateServicesPricelist({}, pricelist, "Save").variables;

      expect(input).toEqual({
        uuid: "pl-1",
        name: "District 1",
        pricelistDate: "2026-01-01",
        locationId: "loc-1",
        addedDetails: ["svc-1"],
        removedDetails: ["svc-2"],
        priceOverrules: [
          { uuid: "svc-1", price: 12.5 },
          { uuid: "svc-3", price: null },
          { uuid: "svc-4", price: null },
        ],
        clientMutationLabel: "Save",
      });
    });

    it("sends no overrules when none were edited", () => {
      const { input } = actions.createItemsPricelist({}, { name: "New" }, "Create").variables;

      expect(input.priceOverrules).toBeUndefined();
      expect(input.locationId).toBeUndefined();
    });

    it("does not write into the pricelist it was given", () => {
      const given = structuredClone(pricelist);

      actions.updateItemsPricelist({}, given, "Save");

      expect(given).toEqual(pricelist);
    });

    it.each([
      ["deleteServicesPricelist", "DeleteServicesPricelistMutationInput"],
      ["deleteItemsPricelist", "DeleteItemsPricelistMutationInput"],
    ])("%s addresses the pricelist by a list of uuids", (creator, inputType) => {
      const result = actions[creator]({}, "pl-1", "Delete");

      expect(operation(result)).toContain(`mutation ($input: ${inputType}!)`);
      expect(result.variables).toEqual({ input: { uuids: ["pl-1"], clientMutationLabel: "Delete" } });
    });
  });

  describe("name validation", () => {
    it.each([
      [
        "medicalServicesValidationCheck",
        "validateServicesPricelistName",
        "servicesPricelistName",
        "PRICELIST_SERVICES",
      ],
      ["medicalItemsValidationCheck", "validateItemsPricelistName", "itemsPricelistName", "PRICELIST_ITEMS"],
    ])("%s checks the name through a variable", (creator, field, variable, prefix) => {
      const result = actions[creator]({}, { [variable]: 'A "quoted" name' });

      expect(result.type).toBe(`${prefix}_FIELDS_VALIDATION`);
      expect(operation(result)).toContain(`isValid: ${field}(${variable}: $${variable})`);
      expect(result.variables).toEqual({ [variable]: 'A "quoted" name' });
    });

    it.each([
      ["medicalServicesSetValid", "PRICELIST_SERVICES_FIELDS_VALIDATION_SET_VALID"],
      ["medicalServicesValidationClear", "PRICELIST_SERVICES_FIELDS_VALIDATION_CLEAR"],
      ["medicalItemsSetValid", "PRICELIST_ITEMS_FIELDS_VALIDATION_SET_VALID"],
      ["medicalItemsValidationClear", "PRICELIST_ITEMS_FIELDS_VALIDATION_CLEAR"],
      ["clearMedicalPricelists", "MEDICAL_PRICELIST_PRICELIST_CLEAR"],
    ])("%s dispatches %s", (creator, type) => {
      const dispatch = vi.fn();

      actions[creator]()(dispatch);

      expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type });
    });
  });
});
