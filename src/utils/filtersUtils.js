/**
 * Utilities for building GraphQL filters for medical price lists
 * 
 * Problem solved: Avoid duplicate location_Uuid in GraphQL queries
 * Business rule: District > Region (district is more precise and prioritary)
 */

/**
 * Build the filters GraphQL for price lists respecting the district > region priority
 * @param {Object} state - Current filters state
 * @returns {Array} - Array of validated GraphQL filters
 */
export const buildServicesPricelistFilters = (state) => {
  if (!state || !state.filters) {
    return [];
  }

  const { filters } = state;
  const result = [];
  
  const locationFilter = buildLocationFilter(filters);
  if (locationFilter) {
    result.push(locationFilter);
  }

  Object.keys(filters).forEach(key => {
    if (key !== 'region' && key !== 'district' && filters[key]?.filter) {
      result.push(filters[key].filter);
    }
  });

  return result;
};

/**
 * Build the location filter respecting the district > region priority
 * @param {Object} filters - Object of filters
 * @returns {string|null} - GraphQL filter for location_Uuid or null
 */
export const buildLocationFilter = (filters) => {
  if (filters.district?.value?.uuid) {
    return `location_Uuid: "${filters.district.value.uuid}"`;
   }
  
  if (filters.region?.value?.uuid) {
    return `location_Uuid: "${filters.region.value.uuid}"`;
  }
  
  return null;
};

/**
 * Determine if the region should be disabled based on the selected district
 * @param {Object} filters - Current filters state
 * @returns {boolean} - true if the region should be disabled
 */
export const shouldDisableRegion = (filters) => {
  return !!(filters.district?.value?.uuid);
};

/**
 * Generate the helper text for the region field
 * @param {Object} filters - Current filters state
 * @returns {string} - Helper text explanation
 */
export const getRegionHelperText = (filters) => {
  if (filters.district?.value?.uuid) {
    return `Region automatically determined by district: ${filters.district.value.name || filters.district.value.code}`;
  }
  return '';
};

/**
 * Build the pagination parameters for GraphQL
 * @param {Object} state - Pagination state
 * @returns {Array} - Pagination parameters for GraphQL
 */
export const buildPaginationParams = (state) => {
  const params = [];
  
  if (!state.beforeCursor && !state.afterCursor) {
    params.push(`first: ${state.pageSize}`);
  }
  
  if (state.afterCursor) {
    params.push(`after: "${state.afterCursor}"`);
    params.push(`first: ${state.pageSize}`);
  }
  
  if (state.beforeCursor) {
    params.push(`before: "${state.beforeCursor}"`);
    params.push(`last: ${state.pageSize}`);
  }
  
  return params;
};

/**
 * Validate that filters do not contain location conflicts
 * @param {Object} filters - Filters to validate
 * @returns {Object} - { isValid: boolean, error: string|null }
 */
export const validateLocationFilters = (filters) => {
  const hasRegion = !!(filters.region?.value?.uuid);
  const hasDistrict = !!(filters.district?.value?.uuid);
  
  if (hasRegion && hasDistrict) {
    return {
      isValid: false,
      error: 'A district and a region cannot be selected simultaneously. The district takes priority.'
    };
  }
  
  return { isValid: true, error: null };
};
