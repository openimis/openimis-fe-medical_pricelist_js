import React, { useEffect } from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";

import { GetIconComponent, withHistory, withModulesManager, Form } from "@openimis/fe-core";
import { clearMedicalPricelists } from "../actions";
import { SERVICES_PRICELIST_TYPE, ITEMS_PRICELIST_TYPE } from "../constants";
import PricelistGeneralPanel from "./PricelistGeneralPanel";
import PricelistDetailsPanel from "./PricelistDetailsPanel";
const ReplayIcon = GetIconComponent("Replay");

const PricelistForm = (props) => {
  const {
    readOnly,
    onBack,
    onSave,
    onReset,
    pricelist,
    onChange,
    fetchDetails,
    details,
    detailsRefreshKey,
    isValid,
    clearMedicalPricelists,
    reset,
    pricelistType,
    originalName,
  } = props;

  const canSave = () => pricelist.name && pricelist.pricelistDate && !pricelist.validityTo && isValid === true;

  useEffect(() => {
    return () => {
      clearMedicalPricelists();
    };
  }, []);

  return (
    <>
      <Form
        module="medical_pricelist"
        title={pricelist.uuid ? "medical_pricelist.pricelistForm.title" : "medical_pricelist.pricelistForm.emptyTitle"}
        titleParams={{ label: pricelist.name ?? "" }}
        readOnly={readOnly || pricelist.validityTo}
        edited={pricelist}
        edited_id={pricelist.uuid}
        HeadPanel={PricelistGeneralPanel}
        Panels={[PricelistDetailsPanel]}
        save={onSave}
        back={onBack}
        canSave={canSave}
        onEditedChanged={onChange}
        details={details}
        fetchDetails={fetchDetails}
        detailsRefreshKey={detailsRefreshKey}
        reset={reset}
        pricelistType={pricelistType}
        originalName={originalName}
        openDirty={!pricelist?.uuid}
        actions={[
          {
            doIt: onReset,
            icon: <ReplayIcon />,
            onlyIfDirty: !readOnly,
          },
        ]}
      />
    </>
  );
};

const mapStateToProps = (state, ownProps) => {
  const validationFields = state.medical_pricelist.validationFields;
  const isValid =
    ownProps.pricelistType === SERVICES_PRICELIST_TYPE
      ? !!validationFields?.medicalServices?.isValid
      : ownProps.pricelistType === ITEMS_PRICELIST_TYPE
        ? !!validationFields?.medicalItems?.isValid
        : !!validationFields?.medicalServices?.isValid || !!validationFields?.medicalItems?.isValid;

  return { isValid };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({ clearMedicalPricelists }, dispatch);
};

export { PricelistForm };
export default withHistory(withModulesManager(connect(mapStateToProps, mapDispatchToProps)(PricelistForm)));
