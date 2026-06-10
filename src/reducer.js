import { formatServerError, formatGraphQLError, parseData, pageInfo } from "@openimis/fe-core";
import { SERVICES_PRICELIST_TYPE, ITEMS_PRICELIST_TYPE } from "./constants";
import { normalizePrice } from "./helpers/pricelist";

function arrayToMap(arr) {
  return arr.reduce((map, a) => {
    map[a.id] = a.p;
    return map;
  }, {});
}

function reducer(
  state = {
    fetchingPrice: null,
    fetchingPricelist: false,
    fetchedPricelist: false,
    servicesPricelists: {},
    itemsPricelists: {},
    errorPricelist: null,
    summaries: {
      items: {
        isFetching: false,
        isFetched: false,
        pageInfo: { totalCount: 0 },
        items: [],
        error: null,
      },
      services: {
        isFetching: false,
        isFetched: false,
        pageInfo: { totalCount: 0 },
        items: [],
        error: null,
      },
    },
    pricelists: {
      services: {
        isFetching: false,
        fetchedPricelist: false,
        items: {},
        item: {},
        error: null,
      },
      items: {
        isFetching: false,
        fetchedPricelist: false,
        items: {},
        item: {},
        error: null,
      },
    },
    items: {
      isFetching: false,
      error: null,
      pageInfo: { totalCount: 0 },
      items: [],
    },
    services: {
      isFetching: false,
      error: null,
      pageInfo: { totalCount: 0 },
      items: [],
    },
  },
  action
) {
  switch (action.type) {
    case "MEDICAL_PRICELIST_SERVICES_REQ":
      return {
        ...state,
        services: {
          ...state.services,
          isFetching: true,
          error: null,
        },
        items: {
          ...state.items,
          type: null,
        },
      };
    case "MEDICAL_PRICELIST_SERVICES_RESP":
      const formatService = (service) => {
        const isActive = !!service.pricelistDetails?.edges?.length;
        const d = {
          ...service,
          isActive,
          price: normalizePrice(service.price),
          priceOverrule: isActive ? normalizePrice(service.pricelistDetails.edges[0].node.priceOverrule) : undefined,
        };
        delete d.pricelistDetails;
        return d;
      };
      return {
        ...state,
        services: {
          ...state.services,
          isFetching: false,
          items: parseData(action.payload.data.medicalServices).map(formatService),
          pageInfo: pageInfo(action.payload.data.medicalServices),
          type: SERVICES_PRICELIST_TYPE,
        },
      };
    case "MEDICAL_PRICELIST_SERVICES_ERR":
      return {
        ...state,
        services: {
          ...state.services,
          isFetching: false,
          error: formatServerError(action.payload),
        },
      };

    case "MEDICAL_PRICELIST_ITEMS_REQ":
      return {
        ...state,
        items: {
          ...state.items,
          isFetching: true,
          error: null,
        },
        services: {
          ...state.services,
          type: null,
        },
      };
    case "MEDICAL_PRICELIST_ITEMS_RESP":
      const formatItem = (item) => {
        const isActive = !!item.pricelistDetails?.edges?.length;
        const d = {
          ...item,
          isActive,
          price: normalizePrice(item.price),
          priceOverrule: isActive ? normalizePrice(item.pricelistDetails.edges[0].node.priceOverrule) : undefined,
        };
        delete d.pricelistDetails;
        return d;
      };
      return {
        ...state,
        items: {
          ...state.items,
          isFetching: false,
          items: parseData(action.payload.data.medicalItems).map(formatItem),
          pageInfo: pageInfo(action.payload.data.medicalItems),
          type: ITEMS_PRICELIST_TYPE,
        },
      };
    case "MEDICAL_PRICELIST_ITEMS_ERR":
      return {
        ...state,
        items: {
          ...state.items,
          isFetching: false,
          error: formatServerError(action.payload),
        },
      };

    case "MEDICAL_PRICELIST_PRICELIST_REQ":
      return {
        ...state,
        pricelists: {
          ...state.pricelists,
          [action.meta.pricelistType]: {
            ...state.pricelists[action.meta.pricelistType],
            isFetching: true,
            fetchedPricelist: false,
            error: null,
          },
        },
      };
    case "MEDICAL_PRICELIST_PRICELIST_RESP": {
      const payloadField =
        action.meta.pricelistType === SERVICES_PRICELIST_TYPE ? "servicesPricelists" : "itemsPricelists";
      const pricelist = parseData(action.payload.data[payloadField])?.[0] ?? null;
      const cacheKey = pricelist?.uuid ?? action.meta.pricelistUuid;
      return {
        ...state,
        pricelists: {
          ...state.pricelists,
          [action.meta.pricelistType]: {
            ...state.pricelists[action.meta.pricelistType],
            isFetching: false,
            fetchedPricelist: true,
            items: pricelist && cacheKey
              ? {
                  ...state.pricelists[action.meta.pricelistType].items,
                  [cacheKey]: pricelist,
                }
              : state.pricelists[action.meta.pricelistType].items,
            item: pricelist ?? {},
          },
        },
      };
    }
    case "MEDICAL_PRICELIST_PRICELIST_ERR":
      return {
        ...state,
        pricelists: {
          ...state.pricelists,
          [action.meta.pricelistType]: {
            ...state.pricelists[action.meta.pricelistType],
            isFetching: false,
            error: formatServerError(action.payload),
          },
        },
      };
    case "MEDICAL_PRICELIST_PRICELIST_CLEAR":
      return {
        ...state,
        pricelists: {
          ...state.pricelists,
          services: {
            ...state.pricelists.services,
            item: {},
          },
          items: {
            ...state.pricelists.items,
            item: {},
          },
        },
      };

    case "MEDICAL_PRICELIST_SUMMARIES_REQ":
      return {
        ...state,
        summaries: {
          ...state.summaries,
          [action.meta.pricelistType]: {
            ...state.summaries[action.meta.pricelistType],
            isFetching: true,
            error: null,
          },
        },
      };
    case "MEDICAL_PRICELIST_SUMMARIES_RESP":
      const payloadField =
        action.meta.pricelistType === SERVICES_PRICELIST_TYPE ? "servicesPricelists" : "itemsPricelists";
      return {
        ...state,
        summaries: {
          ...state.summaries,
          [action.meta.pricelistType]: {
            ...state.summaries[action.meta.pricelistType],
            isFetching: false,
            isFetched: true,
            items: parseData(action.payload.data[payloadField]),
            pageInfo: pageInfo(action.payload.data[payloadField]),
          },
        },
      };

    case "MEDICAL_PRICELIST_SUMMARIES_ERR":
      return {
        ...state,
        summaries: {
          ...state.summaries,
          [action.meta.pricelistType]: {
            ...state.summaries[action.meta.pricelistType],
            isFetching: false,
            error: formatServerError(action.payload),
          },
        },
      };
    case "CLAIM_EDIT_HEALTH_FACILITY_SET":
      return {
        ...state,
        fetchingPrice: action.payload,
        fetchingPricelist: false,
        fetchedPricelist: false,
        pricelist: {},
        errorPricelist: null,
      };
    case "MEDICAL_PRICELIST_LOAD_REQ":
      return {
        ...state,
        fetchingPricelist: true,
        fetchedPricelist: false,
        pricelist: {},
        errorPricelist: null,
      };
    case "MEDICAL_PRICELIST_LOAD_RESP":
      let itemsPricelists = { ...state.itemsPricelists };
      if (!!action.meta.itemsPricelist) {
        itemsPricelists[action.meta.itemsPricelist] = arrayToMap(action.payload.data.pricelists.items);
      }
      let servicesPricelists = { ...state.servicesPricelists };
      if (!!action.meta.servicesPricelist) {
        servicesPricelists[action.meta.servicesPricelist] = arrayToMap(action.payload.data.pricelists.services);
      }
      return {
        ...state,
        fetchingPricelist: false,
        fetchedPricelist: true,
        itemsPricelists,
        servicesPricelists,
        errorPricelist: formatGraphQLError(action.payload),
      };
    case "MEDICAL_PRICELIST_LOAD_ERR":
      return {
        ...state,
        fetchingPricelist: false,
        errorPricelist: formatServerError(action.payload),
      };
    case "PRICELIST_SERVICES_FIELDS_VALIDATION_REQ":
      return {
        ...state,
        validationFields: {
          ...state.validationFields,
          medicalServices: {
            isValidating: true,
            isValid: false,
            validationError: null,
          },
        },
      };
    case "PRICELIST_SERVICES_FIELDS_VALIDATION_RESP":
      return {
        ...state,
        validationFields: {
          ...state.validationFields,
          medicalServices: {
            isValidating: false,
            isValid: action.payload?.data.isValid,
            validationError: formatGraphQLError(action.payload),
          },
        },
      };
    case "PRICELIST_SERVICES_FIELDS_VALIDATION_ERR":
      return {
        ...state,
        validationFields: {
          ...state.validationFields,
          medicalServices: {
            isValidating: false,
            isValid: false,
            validationError: formatServerError(action.payload),
          },
        },
      };
    case "PRICELIST_SERVICES_FIELDS_VALIDATION_CLEAR":
      return {
        ...state,
        validationFields: {
          ...state.validationFields,
          medicalServices: {
            isValidating: true,
            isValid: false,
            validationError: null,
          },
        },
      };
    case "PRICELIST_SERVICES_FIELDS_VALIDATION_SET_VALID":
      return {
        ...state,
        validationFields: {
          ...state.validationFields,
          medicalServices: {
            isValidating: false,
            isValid: true,
            validationError: null,
          },
        },
      };
    case "PRICELIST_ITEMS_FIELDS_VALIDATION_REQ":
      return {
        ...state,
        validationFields: {
          ...state.validationFields,
          medicalItems: {
            isValidating: true,
            isValid: false,
            validationError: null,
          },
        },
      };
    case "PRICELIST_ITEMS_FIELDS_VALIDATION_RESP":
      return {
        ...state,
        validationFields: {
          ...state.validationFields,
          medicalItems: {
            isValidating: false,
            isValid: action.payload?.data.isValid,
            validationError: formatGraphQLError(action.payload),
          },
        },
      };
    case "PRICELIST_ITEMS_FIELDS_VALIDATION_ERR":
      return {
        ...state,
        validationFields: {
          ...state.validationFields,
          medicalItems: {
            isValidating: false,
            isValid: false,
            validationError: formatServerError(action.payload),
          },
        },
      };
    case "PRICELIST_ITEMS_FIELDS_VALIDATION_CLEAR":
      return {
        ...state,
        validationFields: {
          ...state.validationFields,
          medicalItems: {
            isValidating: true,
            isValid: false,
            validationError: null,
          },
        },
      };
    case "PRICELIST_ITEMS_FIELDS_VALIDATION_SET_VALID":
      return {
        ...state,
        validationFields: {
          ...state.validationFields,
          medicalItems: {
            isValidating: false,
            isValid: true,
            validationError: null,
          },
        },
      };
    default:
      return state;
  }
}

export default reducer;
