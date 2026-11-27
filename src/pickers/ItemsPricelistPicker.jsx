import React, { Component } from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { injectIntl } from "@openimis/fe-core";
import { fetchItemsPriceLists } from "../actions";
import PricelistPicker from "./PricelistPicker";

class ItemsPricelistPicker extends Component {
  render() {
    const { name, value, onChange, readOnly, region, district, reload } = this.props;
    return (
      <PricelistPicker
        label="itemsPricelist"
        fetchPriceLists={this.props.fetchItemsPriceLists}
        parseKey="itemsPricelists"
        name={name}
        value={value}
        readOnly={readOnly}
        onChange={onChange}
        region={region}
        district={district}
        reload={reload}
      />
    );
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({ fetchItemsPriceLists }, dispatch);
};

export { ItemsPricelistPicker };
export default injectIntl(connect(null, mapDispatchToProps)(ItemsPricelistPicker));
