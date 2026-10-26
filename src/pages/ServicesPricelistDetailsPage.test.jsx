import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderWithProviders, makeStore, screen, fireEvent, act } from "@openimis/fe-core/testing";

import reducer from "../reducer";
import { SERVICES_PRICELIST_TYPE } from "../constants";
import ServicesPricelistDetailsPage from "./ServicesPricelistDetailsPage";

// The real form pulls in pickers and the details table; the page logic under
// test only needs the edited pricelist and the onChange/onReset callbacks.
vi.mock("../components/PricelistForm", () => ({
  default: ({ pricelist, onChange, onReset }) => (
    <div>
      <input
        aria-label="name"
        value={pricelist.name ?? ""}
        onChange={(e) => onChange({ ...pricelist, name: e.target.value })}
      />
      <button
        type="button"
        onClick={() => onChange({ ...pricelist, addedDetails: [...(pricelist.addedDetails ?? []), "detail-1"] })}
      >
        add detail
      </button>
      <button type="button" onClick={onReset}>
        reset
      </button>
      <span data-testid="added-details">{(pricelist.addedDetails ?? []).join(",")}</span>
    </div>
  ),
}));

vi.mock("../actions", () => ({
  createServicesPricelist: () => ({ type: "TEST_CREATE" }),
  updateServicesPricelist: () => ({ type: "TEST_UPDATE" }),
  fetchServicesPricelistByUuid: () => ({ type: "TEST_FETCH_PRICELIST" }),
  fetchServicesPricelistDetails: () => ({ type: "TEST_FETCH_DETAILS" }),
  medicalServicesSetValid: () => ({ type: "TEST_SET_VALID" }),
}));

// The fe-core barrel imports UserPicker before withModulesManager is initialized,
// so loading it from a test throws. Stub only the exports the page and reducer reach.
vi.mock("@openimis/fe-core", async () => {
  const router = await import("react-router-dom");
  const identity = (Component) => Component;
  return {
    combine:
      (...hocs) =>
      (Component) =>
        hocs.reduceRight((acc, hoc) => hoc(acc), Component),
    withHistory: identity,
    withModulesManager: identity,
    historyPush: () => {},
    useParams: router.useParams,
    useLocation: router.useLocation,
    useTranslations: () => ({ formatMessageWithValues: (id) => id }),
    ProgressOrError: () => null,
    ErrorBoundary: ({ children }) => children,
    parseData: (data) => data.edges.map((edge) => edge.node),
    pageInfo: () => ({}),
    formatServerError: (error) => error,
    formatGraphQLError: (error) => error,
  };
});

const UUID = "11111111-1111-1111-1111-111111111111";
const LIST_ROW = { id: "1", uuid: UUID, name: "Old name", pricelistDate: "2026-01-01" };

const renderPage = () =>
  renderWithProviders(<ServicesPricelistDetailsPage />, {
    route: { pathname: `/medical/pricelists/services/${UUID}`, state: { pricelist: LIST_ROW } },
    store: makeStore({ reducers: { medical_pricelist: reducer } }),
  });

const fetchResponse = (pricelist) => ({
  type: "MEDICAL_PRICELIST_PRICELIST_RESP",
  payload: { data: { servicesPricelists: { edges: [{ node: pricelist }] } } },
  meta: { pricelistType: SERVICES_PRICELIST_TYPE, pricelistUuid: UUID },
});

describe("ServicesPricelistDetailsPage", () => {
  it("keeps the name the user typed when the pricelist fetch returns afterwards", () => {
    const { store } = renderPage();

    fireEvent.change(screen.getByLabelText("name"), { target: { value: "New name" } });
    act(() => store.dispatch(fetchResponse(LIST_ROW)));

    expect(screen.getByLabelText("name")).toHaveValue("New name");
  });

  it("keeps the detail selection when the pricelist fetch returns afterwards", () => {
    const { store } = renderPage();

    fireEvent.click(screen.getByText("add detail"));
    act(() => store.dispatch(fetchResponse(LIST_ROW)));

    expect(screen.getByTestId("added-details")).toHaveTextContent("detail-1");
  });

  it("shows the fetched pricelist when the user has not edited yet", () => {
    const { store } = renderPage();

    act(() => store.dispatch(fetchResponse({ ...LIST_ROW, name: "Fetched name" })));

    expect(screen.getByLabelText("name")).toHaveValue("Fetched name");
  });

  it("discards the edits on reset and shows the refetched pricelist", () => {
    const { store } = renderPage();

    fireEvent.change(screen.getByLabelText("name"), { target: { value: "New name" } });
    fireEvent.click(screen.getByText("reset"));
    act(() => store.dispatch(fetchResponse({ ...LIST_ROW, name: "Fetched name" })));

    expect(screen.getByLabelText("name")).toHaveValue("Fetched name");
  });
});
