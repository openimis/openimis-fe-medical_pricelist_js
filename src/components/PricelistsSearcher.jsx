import React, { useCallback, useState } from "react";

import { Tooltip, Button } from "@mui/material";
import { styled } from "@mui/material/styles";
import { GetIconComponent } from "@openimis/fe-core";
const TabIcon = GetIconComponent("Tab");
const DeleteIcon = GetIconComponent("Delete");

import { combine, useTranslations, ConfirmDialog, Searcher, withModulesManager } from "@openimis/fe-core";
import PricelistsFilters from "./PricelistsFilters";
import { buildServicesPricelistFilters, buildPaginationParams } from "../utils/filtersUtils";

const isRowDisabled = (_, row) => Boolean(row.validityTo);
const isRowLocked = () => false;

const formatLocation = (location) => {
  return location ? `${location.code} - ${location.name}` : "";
};

const StyledPricelistsSearcher = styled("div")(({ theme }) => ({
  "& .horizontalButtonContainer": theme.buttonContainer?.horizontal ?? {},
}));

const PricelistsSearcher = (props) => {
  const {
    pageInfo,
    items,
    isFetching,
    isFetched,
    cacheFiltersKey,
    canDelete,
    onDelete,
    modulesManager,
    onDoubleClick,
    onFiltersChange,
  } = props;
  const [confirmPricelistToDelete, setPricelistToDelete] = useState(null);
  const [resetKey, setResetKey] = useState();
  const { formatMessage, formatMessageWithValues, formatDateFromISO } = useTranslations(
    "medical_pricelist",
    modulesManager
  );

  const onDeleteConfirm = (isConfirmed) => {
    if (isConfirmed) {
      onDelete(confirmPricelistToDelete);
      setResetKey(Date.now());
    }
    setPricelistToDelete(null);
  };

  const headers = (filters) => [
    "medical_pricelist.name",
    "medical_pricelist.pricelist_date",
    "medical_pricelist.region",
    "medical_pricelist.district",
    filters?.showHistory?.value ? "medical_pricelist.valid_from" : null,
    filters?.showHistory?.value ? "medical_pricelist.valid_to" : null,
    "",
  ];

  const getAligns = () => headers().map((_, i) => i === headers().length - 1 && "right");

  const itemFormatters = useCallback((filters) => {
    return [
      (pricelist) => pricelist.name,
      (pricelist) => formatDateFromISO(pricelist.pricelistDate),
      (pricelist) => formatLocation(pricelist.location?.parent || pricelist.location),
      (pricelist) => formatLocation(pricelist.location?.parent ? pricelist.location : null),
      (pricelist) => (filters?.showHistory?.value ? formatDateFromISO(pricelist.validityFrom) : null),
      (pricelist) => (filters?.showHistory?.value ? formatDateFromISO(pricelist.validityTo) : null),
      (pricelist) => (
        <div className="horizontalButtonContainer">
          <Tooltip title={formatMessage("openNewTab")}>
            <Button startIcon={<TabIcon />} onClick={() => onDoubleClick(pricelist, true)}>
              {formatMessage("openNewTabButton.buttonText")}
            </Button>
          </Tooltip>
          {canDelete(pricelist) && (
            <Tooltip title={formatMessage("deletePricelistTooltip")}>
              <Button startIcon={<DeleteIcon />} onClick={() => setPricelistToDelete(pricelist)}>
                {formatMessage("deletePricelistButton.buttonText")}
              </Button>
            </Tooltip>
          )}
        </div>
      ),
    ];
  }, []);

  const filtersToQueryParams = useCallback((state) => {
    const locationFilters = buildServicesPricelistFilters(state);
    const paginationParams = buildPaginationParams(state);
    
    return [...locationFilters, ...paginationParams];
  }, []);

  return (
    <StyledPricelistsSearcher>
      {confirmPricelistToDelete && (
        <ConfirmDialog
          confirm={{
            title: formatMessage("deletePricelistDialog.title"),
            message: formatMessageWithValues("deletePricelistDialog.message", { name: confirmPricelistToDelete.name }),
          }}
          onConfirm={onDeleteConfirm}
        />
      )}
      <Searcher
        key={resetKey}
        module="medical_pricelist"
        FilterPane={PricelistsFilters}
        cacheFiltersKey={cacheFiltersKey}
        items={items}
        itemsPageInfo={pageInfo}
        fetchingItems={isFetching}
        fetchedItems={isFetched}
        errorItems={null}
        tableTitle={formatMessageWithValues("pricelistsSearcher.table.title", {
          count: pageInfo.totalCount ?? 0,
        })}
        fetch={onFiltersChange}
        rowDisabled={isRowDisabled}
        rowLocked={isRowLocked}
        headers={headers}
        aligns={getAligns}
        itemFormatters={itemFormatters}
        rowIdentifier={(r) => r.uuid}
        filtersToQueryParams={filtersToQueryParams}
        onDoubleClick={onDoubleClick}
      />
    </StyledPricelistsSearcher>
  );
};

const enhance = combine(withModulesManager);

export { isRowDisabled };
export default enhance(PricelistsSearcher);
