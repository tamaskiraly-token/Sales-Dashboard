export interface FilterState {
  client: string[];
  regulatoryType: string[];
  transactionType: string[];
  merchant: string[];
  merchantJurisdiction: string[];
  merchantIndustry: string[];
  useCase: string[];
  tpp: string[];
  currency: string[];
  sourceBankJurisdiction: string[];
  transactionCategory: string[];
  transactionSubType: string[];
}

interface VolumeFiltersProps {
  filters: FilterState;
  uniqueValues: {
    [K in keyof FilterState]: string[];
  };
  onFilterChange: (filterKey: keyof FilterState, values: string[]) => void;
  onClearFilters: () => void;
}

export const VolumeFilters = ({ filters, uniqueValues, onFilterChange, onClearFilters }: VolumeFiltersProps) => {
  const filterConfig: { key: keyof FilterState; label: string }[] = [
    { key: 'client', label: 'Client' },
    { key: 'regulatoryType', label: 'Regulatory Type' },
    { key: 'transactionType', label: 'Transaction Type' },
    { key: 'merchant', label: 'Merchant' },
    { key: 'merchantJurisdiction', label: 'Merchant Jurisdiction' },
    { key: 'merchantIndustry', label: 'Merchant Industry' },
    { key: 'useCase', label: 'Use Case' },
    { key: 'tpp', label: 'TPP' },
    { key: 'currency', label: 'Currency' },
    { key: 'sourceBankJurisdiction', label: 'Source Bank Jurisdiction' },
    { key: 'transactionCategory', label: 'Transaction Category' },
    { key: 'transactionSubType', label: 'Transaction Sub Type' },
  ];

  const activeFilterCount = Object.values(filters).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="card">
      <div className="filtersTopRow">
        <div>
          <h3 className="filtersTitle">Filters</h3>
          <div className="cardSub">
            {activeFilterCount > 0 ? (
              <span className="pill">
                Active selections: <span className="pillStrong">{activeFilterCount}</span>
              </span>
            ) : (
              <span className="pill">No filters applied</span>
            )}
          </div>
        </div>
        {activeFilterCount > 0 && (
          <button className="btn btnDanger" onClick={onClearFilters}>
            Clear
          </button>
        )}
      </div>

      <div className="filtersGrid">
        {filterConfig.map(({ key, label }) => (
          <div key={key}>
            <div className="filterLabel">{label}</div>
            <select
              className="select"
              multiple
              value={filters[key]}
              onChange={(e) => {
                const options = Array.from(e.target.options);
                const selectedValues = options.filter(option => option.selected).map(option => option.value);
                onFilterChange(key, selectedValues);
              }}
            >
              {uniqueValues[key]?.map(value => (
                <option key={value} value={value}>
                  {value || '(empty)'}
                </option>
              ))}
            </select>
            {filters[key].length > 0 && (
              <div className="cardSub" style={{ marginTop: 6 }}>
                {filters[key].length} selected
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="hintBox">
        <strong>Tip:</strong> Hold Ctrl (Windows) or Cmd (Mac) to select multiple values.
      </div>
    </div>
  );
};
