import React from "react";
import {
  combine,
  ControlledField,
  PublishedComponent,
  TextInput,
  useTranslations,
  withModulesManager,
  useDebounceCb,
  GRID_RESPONSIVE_STANDARD,
  GRID_RESPONSIVE_SMALL,
} from "@openimis/fe-core";
import { FormControlLabel, Grid, Checkbox, FormHelperText } from "@mui/material";
import { styled } from "@mui/material/styles";
import { 
  buildLocationFilter, 
  shouldDisableRegion, 
  getRegionHelperText,
  validateLocationFilters 
} from "../utils/filtersUtils";

const StyledPricelistsFilter = styled("section")(({ theme }) => ({
  padding: "0 0 10px 0",
  width: "100%",
  "& .item": {
    padding: theme.spacing(1),
  },
}));

const PricelistsFilter = (props) => {
  const { filters, onChangeFilters, modulesManager } = props;
  const { formatMessage } = useTranslations("medical_pricelist", modulesManager);

  /**
   * Handle the change of region with priority logic
   * If a district is selected, the region is ignored
   */
  const onRegionChange = (value) => {
    // If a district is already selected, do not allow the region change
    if (shouldDisableRegion(filters)) {
      return;
    }
    
    onChangeFilters([
      { id: "region", value, filter: value ? `location_Uuid: "${value.uuid}"` : null },
      { id: "district", value: null, filter: null }, // Reset the district
    ]);
  };

  /**
   * Handle the change of district with absolute priority
   * The district always overrides the region
   */
  const onDistrictChange = (value) => {
    const updates = [
      { id: "district", value, filter: value ? `location_Uuid: "${value.uuid}"` : null }
    ];
    
    // If a district is selected, reset the region
    if (value && value.uuid) {
      updates.push({ id: "region", value: null, filter: null });
    }
    
    onChangeFilters(updates);
  };

  const onNameChange = (value) => {
    onChangeFilters([{ id: "name", value, filter: `name_Icontains: "${value}"` }]);
  };

  const triggerDebounceName = useDebounceCb(onNameChange, modulesManager.getConf("fe-admin", "debounceTime", 500));

  // UX states
  const isRegionDisabled = shouldDisableRegion(filters);
  const regionHelperText = getRegionHelperText(filters);
  const locationValidation = validateLocationFilters(filters);

  return (
    <StyledPricelistsFilter>
      <Grid container>
        <ControlledField
          module="medical_pricelist"
          id="medicalPricelistsFilter.name"
          field={
            <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
              <TextInput
                module="medical_pricelist"
                name="name"
                label="medical_pricelist.name"
                value={filters?.name?.value}
                onChange={triggerDebounceName}
              />
            </Grid>
          }
        />
        <ControlledField
          module="medical_pricelist"
          id="medicalPricelistsFilter.region"
          field={
            <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
              <PublishedComponent
                pubRef="location.RegionPicker"
                value={filters?.region?.value}
                withNull={true}
                onChange={onRegionChange}
                disabled={isRegionDisabled}
              />
              {regionHelperText && (
                <FormHelperText style={{ marginTop: 4 }}>
                  {regionHelperText}
                </FormHelperText>
              )}
            </Grid>
          }
        />
        <ControlledField
          module="medical_pricelist"
          id="medicalPricelistsFilter.district"
          field={
            <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
              <PublishedComponent
                pubRef="location.DistrictPicker"
                value={filters?.district?.value}
                region={filters?.region?.value}
                withNull={true}
                key={filters?.region?.value}
                onChange={onDistrictChange}
              />
              {isRegionDisabled && (
                <FormHelperText style={{ marginTop: 4, color: '#666' }}>
                  Prioritaire sur la région
                </FormHelperText>
              )}
            </Grid>
          }
        />
        <ControlledField
          module="medical_pricelist"
          id="medicalPricelistsFilter.date"
          field={
            <Grid size={GRID_RESPONSIVE_STANDARD} className="item">
              <PublishedComponent
                pubRef="core.DatePicker"
                value={filters?.date?.value}
                module="medical_pricelist"
                label="medical_pricelist.pricelist_date"
                onChange={(d) =>
                  onChangeFilters([
                    {
                      id: "date",
                      value: d,
                      filter: d ? `pricelistDate: "${d}"` : null,
                    },
                  ])
                }
              />
            </Grid>
          }
        />
        <ControlledField
          module="medical_pricelist"
          id="medicalPricelistsFilter.showHistory"
          field={
            <Grid size={GRID_RESPONSIVE_SMALL} className="item">
              <FormControlLabel
                control={
                  <Checkbox
                    color="primary"
                    checked={filters?.showHistory?.value}
                    onChange={() =>
                      onChangeFilters([
                        {
                          id: "showHistory",
                          value: !filters?.showHistory?.value,
                          filter: `showHistory: ${!filters?.showHistory?.value}`,
                        },
                      ])
                    }
                  />
                }
                label={formatMessage("medical_pricelist.showHistory")}
              />
            </Grid>
          }
        />
      </Grid>
      {/* Display validation error if necessary */}
      {!locationValidation.isValid && (
        <Grid item xs={12} style={{ color: 'red', marginTop: 8 }}>
          {locationValidation.error}
        </Grid>
      )}
    </StyledPricelistsFilter>
  );
};

const enhance = combine(withModulesManager);

export { StyledPricelistsFilter };
export default enhance(PricelistsFilter);
