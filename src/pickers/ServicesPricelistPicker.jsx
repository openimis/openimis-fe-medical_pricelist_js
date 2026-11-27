import React from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { injectIntl } from "@openimis/fe-core";
import { fetchServicesPriceLists } from "../actions";
import PricelistPicker from "./PricelistPicker";

const ServicesPricelistPicker = (props) => {
  const { fetchServicesPriceLists, name, value, onChange, readOnly, region, district, reload } = props;
  return (
    <PricelistPicker
      label="servicesPricelist"
      fetchPriceLists={fetchServicesPriceLists}
      parseKey="servicesPricelists"
      name={name}
      value={value}
      readOnly={readOnly}
      onChange={onChange}
      region={region}
      district={district}
      reload={reload}
    />
  );
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({ fetchServicesPriceLists }, dispatch);
};

export { ServicesPricelistPicker };
export default injectIntl(connect(null, mapDispatchToProps)(ServicesPricelistPicker));
