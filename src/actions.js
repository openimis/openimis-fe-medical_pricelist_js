import {
  graphql,
  formatQuery,
  formatPageQueryWithCount,
  formatPageQuery,
  decodeId,
  formatGQLString,
  graphqlMutation,
  graphqlWithVariables,
} from "@openimis/fe-core";
import { ITEMS_PRICELIST_TYPE, SERVICES_PRICELIST_TYPE } from "./constants";
import { normalizePrice } from "./helpers/pricelist";

export function fetchPriceLists(servicesPricelist, itemsPricelist) {
  let filters = [];
  let projections = [];
  if (!servicesPricelist && !itemsPricelist) {
    // nothing to do
    return () => {};
  }
  if (!!servicesPricelist) {
    filters.push(`servicesPricelistId: ${decodeId(servicesPricelist.id)}`);
    projections.push("services{id,p}");
  }
  if (!!itemsPricelist) {
    filters.push(`itemsPricelistId: ${decodeId(itemsPricelist.id)}`);
    projections.push("items{id,p}");
  }
  let payload = formatQuery("pricelists", filters, projections);
  return graphql(payload, "MEDICAL_PRICELIST_LOAD", {
    servicesPricelist: !!servicesPricelist && servicesPricelist.id,
    itemsPricelist: !!itemsPricelist && itemsPricelist.id,
  });
}

const PRICELIST_PROJECTIONS = [
  "id",
  "uuid",
  "name",
  "validityFrom",
  "validityTo",
  "pricelistDate",
  "detailsCount:details{totalCount}",
  "location{id,name,uuid,code,type,parent{id,uuid,code,name,type}}",
];

export function fetchServicesPricelistByUuid(mm, pricelistUuid) {
  const query = formatPageQuery(
    "servicesPricelists",
    [`uuid: "${formatGQLString(pricelistUuid)}"`],
    PRICELIST_PROJECTIONS
  );
  return graphql(query, "MEDICAL_PRICELIST_PRICELIST", { pricelistType: SERVICES_PRICELIST_TYPE, pricelistUuid });
}

export function fetchItemsPricelistByUuid(mm, pricelistUuid) {
  const query = formatPageQuery(
    "itemsPricelists",
    [`uuid: "${formatGQLString(pricelistUuid)}"`],
    PRICELIST_PROJECTIONS
  );
  return graphql(query, "MEDICAL_PRICELIST_PRICELIST", { pricelistType: ITEMS_PRICELIST_TYPE, pricelistUuid });
}

export function fetchServicesPriceLists(location) {
  let filters = null;
  if (!!location) {
    filters = [`locationUuid:"${location.uuid}"`];
  }
  let projections = ["id", "uuid", "name"];
  let payload = formatPageQuery("servicesPricelists", filters, projections);
  return graphql(payload, "MEDICAL_LOCATION_SERVICES_PRICELIST", { location });
}

export function fetchItemsPriceLists(location) {
  let filters = null;
  if (!!location) {
    filters = [`locationUuid:"${location.uuid}"`];
  }
  let projections = ["id", "uuid", "name"];
  let payload = formatPageQuery("itemsPricelists", filters, projections);
  return graphql(payload, "MEDICAL_LOCATION_ITEMS_PRICELIST", { location });
}

export function fetchItemsPricelistsSummaries(_, filters = []) {
  return fetchPricelistsSummaries(_, filters, ITEMS_PRICELIST_TYPE);
}

export function fetchServicesPricelistsSummaries(_, filters = []) {
  return fetchPricelistsSummaries(_, filters, SERVICES_PRICELIST_TYPE);
}

function fetchPricelistsSummaries(_, filters = [], pricelistType) {
  const projections = [
    "id",
    "uuid",
    "name",
    "validityFrom",
    "validityTo",
    "pricelistDate",
    "location{id,name,uuid,code,type,parent{id,uuid,code,name,type}}",
  ];
  const nodeName = pricelistType === ITEMS_PRICELIST_TYPE ? "itemsPricelists" : "servicesPricelists";
  const payload = formatPageQueryWithCount(nodeName, filters, projections);
  return graphql(payload, "MEDICAL_PRICELIST_SUMMARIES", { pricelistType });
}

export function fetchItemsPricelistDetails(_, filters = [], pricelistId) {
  const projections = [
    "id",
    "uuid",
    "code",
    "name",
    "type",
    "price",
    pricelistId && `pricelistDetails(itemsPricelist: "${pricelistId}") {edges {node {priceOverrule}}}`,
  ].filter(Boolean);
  const query = formatPageQueryWithCount("medicalItems", filters, projections);
  return graphql(query, "MEDICAL_PRICELIST_ITEMS");
}

export function fetchServicesPricelistDetails(_, filters = [], pricelistId) {
  const projections = [
    "id",
    "uuid",
    "code",
    "name",
    "type",
    "price",
    pricelistId && `pricelistDetails(servicesPricelist: "${pricelistId}") {edges {node {priceOverrule}}}`,
  ].filter(Boolean);
  const query = formatPageQueryWithCount("medicalServices", filters, projections);
  return graphql(query, "MEDICAL_PRICELIST_SERVICES");
}

function prepareInput(pricelist) {
  return {
    uuid: pricelist.uuid,
    name: pricelist.name,
    pricelistDate: pricelist.pricelistDate,
    locationId: pricelist.location?.uuid,
    addedDetails: pricelist.addedDetails,
    removedDetails: pricelist.removedDetails,
    priceOverrules: pricelist.priceOverrules
      ? Object.entries(pricelist.priceOverrules).map(([uuid, price]) => ({
          uuid,
          price: normalizePrice(price),
        }))
      : undefined,
  };
}

export function createServicesPricelist(mm, pricelist, clientMutationLabel) {
  const input = prepareInput(pricelist);
  input.clientMutationLabel = clientMutationLabel;

  return graphqlMutation(
    `
    mutation ($input: CreateServicesPricelistMutationInput!) {
      createServicesPricelist(input: $input) {
        internalId
        clientMutationId
      }
    }
  `,
    { input }
  );
}
export function createItemsPricelist(mm, pricelist, clientMutationLabel) {
  const input = prepareInput(pricelist);
  input.clientMutationLabel = clientMutationLabel;

  return graphqlMutation(
    `
    mutation ($input: CreateItemsPricelistMutationInput!) {
      createItemsPricelist(input: $input) {
        internalId
        clientMutationId
      }
    }
  `,
    { input }
  );
}

export function updateServicesPricelist(mm, pricelist, clientMutationLabel) {
  const input = prepareInput(pricelist);
  input.clientMutationLabel = clientMutationLabel;

  return graphqlMutation(
    `
    mutation ($input: UpdateServicesPricelistMutationInput!) {
      updateServicesPricelist(input: $input) {
        internalId
        clientMutationId
      }
    }
  `,
    { input }
  );
}
export function updateItemsPricelist(mm, pricelist, clientMutationLabel) {
  const input = prepareInput(pricelist);
  input.clientMutationLabel = clientMutationLabel;

  return graphqlMutation(
    `
    mutation ($input: UpdateItemsPricelistMutationInput!) {
      updateItemsPricelist(input: $input) {
        internalId
        clientMutationId
      }
    }
  `,
    { input }
  );
}

export function deleteServicesPricelist(mm, uuid, clientMutationLabel) {
  return graphqlMutation(
    `
    mutation ($input: DeleteServicesPricelistMutationInput!) {
      deleteServicesPricelist(input: $input) {
        internalId
        clientMutationId
      }
    }
  `,
    { input: { uuids: [uuid], clientMutationLabel } }
  );
}
export function deleteItemsPricelist(mm, uuid, clientMutationLabel) {
  return graphqlMutation(
    `
    mutation ($input: DeleteItemsPricelistMutationInput!) {
      deleteItemsPricelist(input: $input) {
        internalId
        clientMutationId
      }
    }
  `,
    { input: { uuids: [uuid], clientMutationLabel } }
  );
}

export function medicalServicesValidationCheck(mm, variables) {
  return graphqlWithVariables(
    `
    query ($servicesPricelistName: String!) {
      isValid: validateServicesPricelistName(servicesPricelistName: $servicesPricelistName)
    }
    `,
    variables,
    `PRICELIST_SERVICES_FIELDS_VALIDATION`
  );
}

export function medicalServicesSetValid() {
  return (dispatch) => {
    dispatch({ type: `PRICELIST_SERVICES_FIELDS_VALIDATION_SET_VALID` });
  };
}

export function medicalServicesValidationClear() {
  return (dispatch) => {
    dispatch({ type: `PRICELIST_SERVICES_FIELDS_VALIDATION_CLEAR` });
  };
}

export function medicalItemsValidationCheck(mm, variables) {
  return graphqlWithVariables(
    `
    query ($itemsPricelistName: String!) {
      isValid: validateItemsPricelistName(itemsPricelistName: $itemsPricelistName)
    }
    `,
    variables,
    `PRICELIST_ITEMS_FIELDS_VALIDATION`
  );
}

export function medicalItemsValidationClear() {
  return (dispatch) => {
    dispatch({ type: `PRICELIST_ITEMS_FIELDS_VALIDATION_CLEAR` });
  };
}

export function medicalItemsSetValid() {
  return (dispatch) => {
    dispatch({ type: `PRICELIST_ITEMS_FIELDS_VALIDATION_SET_VALID` });
  };
}

export function clearMedicalPricelists() {
  return (dispatch) => {
    dispatch({ type: "MEDICAL_PRICELIST_PRICELIST_CLEAR" });
  };
}
