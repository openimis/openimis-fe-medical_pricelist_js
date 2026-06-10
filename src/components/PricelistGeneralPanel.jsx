import React from "react";
import { connect } from "react-redux";

import { styled } from "@mui/material/styles";
import { Grid } from "@mui/material";
import _debounce from "lodash/debounce";

import {
  FormPanel,
  withHistory,
  withModulesManager,
  PublishedComponent,
  ValidatedTextInput,
  TextInput,
  useDebounceCb,
  GRID_RESPONSIVE_STANDARD,
} from "@openimis/fe-core";
import * as pricelistActions from "../actions";
import { SERVICES_PRICELIST_TYPE, ITEMS_PRICELIST_TYPE } from "../constants";

const PRICELIST_VALIDATION_ACTIONS = {
  [SERVICES_PRICELIST_TYPE]: {
    check: pricelistActions.medicalServicesValidationCheck,
    clear: pricelistActions.medicalServicesValidationClear,
    setValid: pricelistActions.medicalServicesSetValid,
  },
  [ITEMS_PRICELIST_TYPE]: {
    check: pricelistActions.medicalItemsValidationCheck,
    clear: pricelistActions.medicalItemsValidationClear,
    setValid: pricelistActions.medicalItemsSetValid,
  },
};

const StyledPricelistGeneralPanel = styled("div")(({ theme }) => ({
  "& .item": theme.paper?.item ?? {},
}));

class PricelistGeneralPanel extends FormPanel {
  constructor(props) {
    super(props);
    const debounceTime = props.modulesManager.getConf("fe-medical_pricelist", "debounceTime", 500);
    this.triggerDebounceName = _debounce(this.onNameChange, debounceTime);
    this.triggerDebounceCode = _debounce(this.onCodeChange, debounceTime);
  }
  onRegionChange = (value) => {
    this.updateAttribute("location", value);
  };

  onDistrictChange = (value) => {
    this.updateAttribute("location", value ?? this.props.edited.location?.parent);
  };

  shouldValidate = (inputValue) => {
    const { originalName, savedServiceName, savedItemName, edited } = this.props;
    const baselineName = originalName || savedServiceName || savedItemName;

    if (!edited?.uuid) {
      return true;
    }

    if (!baselineName) {
      return false;
    }

    return inputValue !== baselineName;
  };
  onCodeChange = (value) => {
    let filters = [`code_Icontains: "${value}"`, `first: 20`];
    this.props.fetchDetails(filters);
  };
  onNameChange = (value) => {
    let filters = [`name_Icontains: "${value}"`, `first: 20`];
    this.props.fetchDetails(filters);
  };

  render() {
    const {
      readOnly,
      edited,
      isMedicalServiceValid,
      isMedicalServiceValidating,
      medicalServiceValidationError,
      isMedicalItemValid,
      isMedicalItemValidating,
      medicalItemValidationError,
      activeType,
      pricelistType,
      originalName,
    } = this.props;
    const region = edited.location?.parent ?? edited.location;
    const district = edited.location?.parent ? edited.location : null;
    const resolvedType = pricelistType || activeType;
    const validationActions =
      PRICELIST_VALIDATION_ACTIONS[resolvedType] ?? PRICELIST_VALIDATION_ACTIONS[SERVICES_PRICELIST_TYPE];
    const isServicesPricelist = resolvedType === SERVICES_PRICELIST_TYPE;
    const validationKey = `${edited?.uuid || "new"}-${originalName || "pending"}-${resolvedType || "unknown"}`;
    return (
      <StyledPricelistGeneralPanel>
        <Grid container>
          <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
            <ValidatedTextInput
              key={validationKey}
              action={validationActions.check}
              clearAction={validationActions.clear}
              setValidAction={validationActions.setValid}
              itemQueryIdentifier={isServicesPricelist ? "servicesPricelistName" : "itemsPricelistName"}
              isValid={isServicesPricelist ? isMedicalServiceValid : isMedicalItemValid}
              isValidating={isServicesPricelist ? isMedicalServiceValidating : isMedicalItemValidating}
              validationError={isServicesPricelist ? medicalServiceValidationError : medicalItemValidationError}
              shouldValidate={this.shouldValidate}
              module="medical_pricelist"
              label="medical_pricelist.name"
              codeTakenLabel="medical_pricelist.nameTaken"
              onChange={(name) => this.updateAttribute("name", name)}
              required={true}
              readOnly={readOnly}
              value={edited?.name ?? ""}
            />
          </Grid>
          <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
            <PublishedComponent
              pubRef="location.RegionPicker"
              value={region}
              readOnly={readOnly}
              withNull={false}
              onChange={this.onRegionChange}
            />
          </Grid>
          <Grid className="item" xs={GRID_RESPONSIVE_STANDARD}>
            <TextInput
              module="medical"
              label={`medical_pricelist.table.code`}
              value={edited.code}
              onChange={this.triggerDebounceCode}
            />
          </Grid>
          <Grid className="item" xs={GRID_RESPONSIVE_STANDARD}>
            <TextInput
              module="medical_pricelist"
              label={
                resolvedType === ITEMS_PRICELIST_TYPE
                  ? `medical_pricelist.table.medicalItemName`
                  : `medical_pricelist.table.medicalServiceName`
              }
              value={edited?.serviceOrItemName ?? ""}
              onChange={this.triggerDebounceName}
              readOnly={readOnly}
            />
          </Grid>
          <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
            <PublishedComponent
              region={region}
              value={district}
              pubRef="location.DistrictPicker"
              withNull={false}
              readOnly={readOnly}
              onChange={this.onDistrictChange}
            />
          </Grid>
          <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
            <PublishedComponent
              pubRef="core.DatePicker"
              value={edited?.pricelistDate}
              required
              readOnly={readOnly}
              module="medical_pricelist"
              label="medical_pricelist.pricelist_date"
              onChange={(v) => this.updateAttribute("pricelistDate", v)}
            />
          </Grid>
        </Grid>
      </StyledPricelistGeneralPanel>
    );
  }
}

const mapStateToProps = (state, props) => {
  const editedUuid = props?.edited?.uuid;
  const servicesState = state.medical_pricelist?.pricelists?.services;
  const itemsState = state.medical_pricelist?.pricelists?.items;

  return {
    isMedicalServiceValid: state.medical_pricelist.validationFields?.medicalServices?.isValid,
    isMedicalServiceValidating: state.medical_pricelist.validationFields?.medicalServices?.isValidating,
    medicalServiceValidationError: state.medical_pricelist.validationFields?.medicalServices?.validationError,
    savedServiceName:
      servicesState?.item?.uuid === editedUuid
        ? servicesState.item.name
        : editedUuid
          ? servicesState?.items?.[editedUuid]?.name
          : undefined,
    isMedicalItemValid: state.medical_pricelist.validationFields?.medicalItems?.isValid,
    isMedicalItemValidating: state.medical_pricelist.validationFields?.medicalItems?.isValidating,
    medicalItemValidationError: state.medical_pricelist.validationFields?.medicalItems?.validationError,
    savedItemName:
      itemsState?.item?.uuid === editedUuid
        ? itemsState.item.name
        : editedUuid
          ? itemsState?.items?.[editedUuid]?.name
          : undefined,
    activeType: state.medical_pricelist?.services?.type || state.medical_pricelist?.items?.type,
    pricelistType: props?.pricelistType,
    originalName: props?.originalName,
  };
};

export { StyledPricelistGeneralPanel };
export default withHistory(withModulesManager(connect(mapStateToProps)(PricelistGeneralPanel)));
