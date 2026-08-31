import React, { useState, useEffect } from "react";
import { styled } from "@mui/material/styles";
import {
  Table,
  withModulesManager,
  combine,
  useTranslations,
  ErrorBoundary,
  ControlledField,
  TextInput,
} from "@openimis/fe-core";
import { Paper, Grid, Typography, Checkbox, Button } from "@mui/material";
import PriceOverruleDialog from "./PriceOverruleDialog";
import SelectAllButton from "./PricelistSelectAllButton";

const StyledPricelistDetailsPanel = styled("div")(({ theme }) => ({
  "& .paper": theme.paper?.paper ?? {},
  "& .item": theme.paper?.item ?? {},
  "& .tableTitle": theme.table?.title ?? {},
  "& .checkbox": {
    padding: theme.spacing(0),
  },
  "& .editDetailBtn": {
    padding: 0,
  },
  "& .filtersContainer": {
    padding: theme.spacing(2),
    paddingBottom: 0,
    alignItems: "center",
  },
  "& .filterField": {
    maxWidth: 400,
  },
}));

const HEADERS = [
  "",
  "medical_pricelist.table.code",
  "medical_pricelist.table.name",
  "medical_pricelist.table.type",
  "medical_pricelist.table.price",
  "medical_pricelist.table.overrule",
  "",
];

const isItemActive = (edited, item) => {
  return edited.addedDetails?.includes(item.uuid) || (item.isActive && !edited.removedDetails?.includes(item.uuid));
};

const PricelistDetailsPanel = (props) => {
  const { modulesManager, pageSize = 20, edited, edited_id, readOnly, details, fetchDetails, onEditedChanged } = props;
  const { formatMessage } = useTranslations("medical_pricelist", modulesManager);
  const [pagination, setPagination] = useState({ page: 0, afterCursor: null, beforeCursor: null });
  const [editedDetail, setEditedDetail] = useState(null);
  const [filters, setFilters] = useState({ code: "", name: "" });
  // Debounced filter values
  const [debouncedFilters, setDebouncedFilters] = useState({ code: "", name: "" });

  const ButtonHeader = (_) => {
    return SelectAllButton(details, props, edited, onEditedChanged);
  };

  HEADERS[0] = ButtonHeader;

  // Debounce logic
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilters({
        code: filters.code.trim(),
        name: filters.name.trim(),
      });
    }, modulesManager.getConf("fe-admin", "debounceTime", 500));

    return () => clearTimeout(timer);
  }, [filters.code, filters.name]);

  // Reset pagination when filters change
  useEffect(() => {
    setPagination({ page: 0, afterCursor: null, beforeCursor: null });
  }, [debouncedFilters]);

  useEffect(() => {
    const filterParams = [];

    // Add pagination parameters
    if (pagination.afterCursor) {
      filterParams.push(`first: ${pageSize}`, `after: "${pagination.afterCursor}"`);
    } else if (pagination.beforeCursor) {
      filterParams.push(`last: ${pageSize}`, `before: "${pagination.beforeCursor}"`);
    } else {
      filterParams.push(`first: ${pageSize}`);
    }

    // Add code filter if present
    if (debouncedFilters.code) {
      filterParams.push(`code_Icontains: "${debouncedFilters.code}"`);
    }

    // Add name filter if present
    if (debouncedFilters.name) {
      filterParams.push(`name_Icontains: "${debouncedFilters.name}"`);
    }

    fetchDetails(filterParams);
  }, [pagination.page, edited_id, debouncedFilters]);

  const onDetailChange = (event, item) => {
    if (event.target.checked) {
      onEditedChanged({
        ...edited,
        // It's useless to add the to the list of added items if it is already marked as active
        addedDetails: !item.isActive ? (edited.addedDetails ?? []).concat(item.uuid) : edited.addedDetails,
        removedDetails: edited.removedDetails && edited.removedDetails.filter((x) => x !== item.uuid),
      });
    } else {
      onEditedChanged({
        ...edited,
        addedDetails: edited.addedDetails && edited.addedDetails.filter((x) => x !== item.uuid),
        removedDetails: item.isActive ? (edited.removedDetails ?? []).concat([item.uuid]) : edited.removedDetails,
      });
    }
  };

  const onPriceChange = (price) => {
    editedDetail.priceOverrule = price;
    onEditedChanged({
      ...edited,
      priceOverrules: {
        ...edited.priceOverrules,
        [editedDetail.uuid]: price,
      },
    });
    setEditedDetail(null);
  };

  const handleFilterChange = (field) => (value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <StyledPricelistDetailsPanel>
      {editedDetail && (
        <ErrorBoundary>
          <PriceOverruleDialog
            open
            defaultPrice={
              (edited.priceOverrules && edited.priceOverrules[editedDetail.uuid]) ||
              editedDetail.priceOverrule ||
              editedDetail.price
            }
            onConfirm={onPriceChange}
            onCancel={() => setEditedDetail(null)}
          />
        </ErrorBoundary>
      )}
      <Grid size={12}>
        <Paper className="paper">
          <Grid container className="tableTitle" justifyContent="space-between" alignItems="center">
            <Grid>
              <Typography variant="h6">{formatMessage("pricelistForm.table.title")}</Typography>
            </Grid>
          </Grid>
          <Grid container>
            {/* Filters - same line */}
            <Grid size={12}>
              <Grid container spacing={2} className="filtersContainer">
                <Grid size={{ xs: 12, sm: 6, md: 4 }} className="filterField">
                  <ControlledField
                    module="medical_pricelist"
                    id="medicalPricelistsFilter.details.code"
                    field={
                      <TextInput
                        module="medical_pricelist"
                        name="code"
                        label={formatMessage("medical_pricelist.detailsFilter.code.label")}
                        value={filters.code}
                        onChange={handleFilterChange("code")}
                        placeholder={formatMessage("medical_pricelist.detailsFilter.code.placeholder")}
                      />
                    }
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 4 }} className="filterField">
                  <ControlledField
                    module="medical_pricelist"
                    id="medicalPricelistsFilter.details.name"
                    field={
                      <TextInput
                        module="medical_pricelist"
                        name="name"
                        label={formatMessage("medical_pricelist.detailsFilter.name.label")}
                        value={filters.name}
                        onChange={handleFilterChange("name")}
                        placeholder={formatMessage("medical_pricelist.detailsFilter.name.placeholder")}
                      />
                    }
                  />
                </Grid>
              </Grid>
            </Grid>
            <Grid size={12} className="item">
              <Table
                error={details.error}
                fetching={details.isFetching}
                headers={HEADERS}
                itemFormatters={[
                  (s) => (
                    <Checkbox
                      disabled={readOnly}
                      className="checkbox"
                      color="primary"
                      onChange={(event) => onDetailChange(event, s)}
                      checked={isItemActive(edited, s)}
                    />
                  ),
                  (s) => s.code,
                  (s) => s.name,
                  (s) => formatMessage(`medical_pricelist.table.type.${s.type.toLowerCase()}`),
                  (s) => s.price,
                  (s) => s.priceOverrule,
                  (s) =>
                    isItemActive(edited, s) &&
                    !readOnly && (
                      <Button
                        size="small"
                        variant="text"
                        color="primary"
                        className="editDetailBtn"
                        onClick={() => setEditedDetail(s)}
                      >
                        {formatMessage("medical_pricelist.table.editOverruleButton")}
                      </Button>
                    ),
                ]}
                aligns={HEADERS.map((_, i) => (i === HEADERS.length - 1 ? "right" : null))}
                items={details.items}
                withPagination
                page={pagination.page}
                onChangePage={(_, page) =>
                  setPagination({
                    afterCursor: page > pagination.page ? details.pageInfo.endCursor : null, // We'll load the next page
                    beforeCursor: page < pagination.page ? details.pageInfo.startCursor : null, // We'll load the previous page
                    page,
                  })
                }
                count={details.pageInfo.totalCount}
                rowsPerPage={pageSize}
                rowsPerPageOptions={[pageSize]}
              ></Table>
            </Grid>
          </Grid>
        </Paper>
      </Grid>
    </StyledPricelistDetailsPanel>
  );
};

const enhance = combine(withModulesManager);

export { StyledPricelistDetailsPanel };
export default enhance(PricelistDetailsPanel);
