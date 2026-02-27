export class DynamicMatTableFilterOptions {
  constructor(readonly filterType: 'simple' | 'column' = 'simple', readonly filterOnDataChange: boolean = false, readonly keepFilters: boolean = false) {
  }
}
export class DynamicMatTableFilter {
  readonly filterType: 'simple' | 'column' = 'simple';
  readonly filterOnDataChange: boolean = false;
  readonly keepFilters: boolean = false;

  constructor(showFilter: true, filterOptions: DynamicMatTableFilterOptions)
  constructor(showFilter: false)
  constructor(readonly showFilter: boolean, filterOptions?: DynamicMatTableFilterOptions) {
    this.showFilter = showFilter;
    if (filterOptions) {
      this.filterType = filterOptions.filterType;
      this.filterOnDataChange = filterOptions.filterOnDataChange;
      this.keepFilters = filterOptions.keepFilters;
    }
  }
}
