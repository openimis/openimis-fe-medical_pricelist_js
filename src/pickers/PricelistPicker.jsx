import React, { Component } from "react";
import _ from "lodash";
import { parseData, formatMessage, SelectInput, ProgressOrError, injectIntl } from "@openimis/fe-core";

class PricelistPicker extends Component {
  state = {
    loading: true,
    baseOptions: [],
    nationalOptions: [],
    regionOptions: [],
    districtOptions: [],
  };

  _nullOption = {
    value: null,
    label: formatMessage(this.props.intl, "medical_pricelist", this.props.nullLabel || "empty"),
  };

  formatOption = (o) => {
    return { value: o, label: o.name };
  };

  componentDidMount() {
    this._isMounted = true;
    this.props.fetchPriceLists(null).then(
      (r) =>
        this._isMounted &&
        this.setState((state, props) => ({
          loading: false,
          nationalOptions: parseData(r.payload.data[props.parseKey]).map(this.formatOption),
        }))
    );
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (prevProps.withNull !== this.props.withNull) {
      this.setState((state, props) => ({ baseOptions: props.withNull ? [this._nullOption] : [] }));
    }
    const propsToCheck = [
      "region",
      "district",
      "reload",
    ];
    
    const hasChanged = propsToCheck.some(
      (key) => !_.isEqual(prevProps[key], this.props[key])
    );
    
    if (hasChanged) {
      if (!this.props.region) {
        this.setState({ regionOptions: [] });
      } else {
        this.setState({ loading: true }, () => {
          this.props.fetchPriceLists(this.props.region).then((r) => {
            if (this._isMounted) {
              this.setState((state, props) => ({
                loading: false,
                regionOptions: parseData(r.payload.data[props.parseKey]).map(this.formatOption),
              }));
            }
          });
        });
      }
    }
    
    if (hasChanged) {
      if (!this.props.district) {
        this.setState({ districtOptions: [] });
      } else {
        this.setState({ loading: true }, (e) =>
          this.props.fetchPriceLists(this.props.district).then(
            (r) =>
              this._isMounted &&
              this.setState((sate, props) => ({
                loading: false,
                districtOptions: parseData(r.payload.data[props.parseKey]).map(this.formatOption),
              }))
          )
        );
      }
    }
  }

  filterOptions(options) {
    if (this.props.hasOwnProperty('region') && this.props.hasOwnProperty('district')) {
      if (this.props.region && this.props.district) return this.state.districtOptions;
      if (this.props.region) return this.state.regionOptions;
      return this.state.nationalOptions;
    }
    return options;
  }

  render() {
    const { name, label, value, onChange, readOnly } = this.props;
    let options = [
      ...this.state.baseOptions,
      ...this.state.nationalOptions,
      ...this.state.regionOptions,
      ...this.state.districtOptions,
    ];
    if (this.state.loading) return <ProgressOrError progress={this.state.loading} />;
    return (
      <SelectInput
        module="medical_pricelist"
        label={label}
        options={this.filterOptions(options)}
        name={name}
        value={value}
        readOnly={readOnly}
        onChange={onChange}
      />
    );
  }
}

export { PricelistPicker };
export default injectIntl(PricelistPicker);
