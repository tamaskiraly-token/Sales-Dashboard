import { useMemo } from 'react';
import type { QuarterProjectionMetric } from './QuarterTab';

interface MonthDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: Record<string, string>[];
  selectedMetric: QuarterProjectionMetric;
  month: 'Jan' | 'Feb' | 'Mar';
}

/** Map metric to Type column values in the Google Sheet - returns possible variations */
function getMetricTypeFilters(metric: QuarterProjectionMetric): string[] {
  switch (metric) {
    case 'clientWins':
      return ['Client Wins', 'Client wins', 'client wins', 'CLIENT WINS'];
    case 'acv':
      return ['ACV Signed', 'ACV signed', 'acv signed', 'ACV SIGNED'];
    case 'inYearRevenue':
      return ['In-Year Revenue', 'In-year revenue', 'in-year revenue', 'In-Year revenue', 'IN-YEAR REVENUE'];
    default:
      return [];
  }
}

/** Format header name with proper spacing (e.g., "CLIENTNAME" -> "Client Name", "ACV($)" -> "ACV ($)") */
function formatHeaderName(key: string): string {
  // Handle special cases first
  if (key.toLowerCase().includes('acv')) {
    // Preserve ACV as uppercase
    return key
      .replace(/_/g, ' ')
      .replace(/acv/gi, 'ACV')
      .replace(/([A-Z])([A-Z]+)/g, '$1 $2') // Split consecutive capitals
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space before capital after lowercase
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => {
        if (word.toUpperCase() === 'ACV') return 'ACV';
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  }
  
  // General case: split on capitals and underscores
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space before capital after lowercase
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2') // Split consecutive capitals followed by lowercase
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/** Check if a value is numeric */
function isNumeric(value: string): boolean {
  if (!value || value.trim() === '') return false;
  // Remove common formatting characters and check if it's a number
  const cleaned = value.replace(/[,$]/g, '').trim();
  return !isNaN(Number(cleaned)) && cleaned !== '';
}

/** Format number with thousands separator */
function formatNumber(value: string): string {
  if (!value || value.trim() === '') return '';
  const num = parseFloat(value.replace(/[,$]/g, ''));
  if (isNaN(num)) return value;
  return num.toLocaleString('en-US');
}

/** Get custom display name for a column */
function getColumnDisplayName(key: string): string {
  const normalized = key.toLowerCase().replace(/[\s_]+/g, '').replace(/[()$]/g, '');
  const originalKey = key.toLowerCase();
  
  // Custom mappings for specific columns
  if (normalized.includes('acv') && !normalized.includes('inyear')) {
    return 'ACV ($)';
  }
  if (normalized.includes('expected') && (normalized.includes('month') || normalized.includes('transaction'))) {
    return 'Expected monthly transactions';
  }
  if (normalized.includes('inyear') || normalized.includes('in-year') || normalized.includes('inyearrevenue')) {
    return 'In-year revenue ($)';
  }
  // Check for Commitment Status with various formats
  const hasCommitment = normalized.includes('commitment') || normalized.includes('commit') || originalKey.includes('commitment') || originalKey.includes('commit');
  const hasStatus = normalized.includes('status') || normalized.includes('stat') || originalKey.includes('status') || originalKey.includes('stat');
  if (hasCommitment && hasStatus) {
    return 'Commitment Status';
  }
  
  // Default formatting for other columns
  return formatHeaderName(key);
}

/** Check if a column should be excluded from display */
function shouldExcludeColumn(key: string, selectedMetric: QuarterProjectionMetric): boolean {
  const normalized = key.toLowerCase().replace(/[\s_]+/g, '').replace(/[()$]/g, '');
  const originalKey = key.toLowerCase();
  
  // Always exclude Type column
  if (normalized === 'type') return true;
  
  // Always include Commitment Status column (show in all metric views)
  // Check for various possible column name formats: "commitmentstatus", "commitment_status", "commitment status", etc.
  // Match if it contains both "commitment" (or "commit") and "status" (or "stat")
  const hasCommitment = normalized.includes('commitment') || normalized.includes('commit') || originalKey.includes('commitment') || originalKey.includes('commit');
  const hasStatus = normalized.includes('status') || normalized.includes('stat') || originalKey.includes('status') || originalKey.includes('stat');
  
  if (hasCommitment && hasStatus) {
    return false; // Always show Commitment Status
  }
  
  // Hide In-year revenue column when Client Wins or ACV Signed is selected
  if (selectedMetric === 'clientWins' || selectedMetric === 'acv') {
    if (normalized.includes('inyear') || normalized.includes('in-year') || normalized.includes('inyearrevenue')) {
      return true;
    }
  }
  
  // Hide ACV and Expected monthly transactions columns when In-Year Revenue is selected
  if (selectedMetric === 'inYearRevenue') {
    if (normalized.includes('acv') && !normalized.includes('inyear')) {
      return true;
    }
    if (normalized.includes('expected') && (normalized.includes('month') || normalized.includes('transaction'))) {
      return true;
    }
  }
  
  return false;
}

export function MonthDetailsModal({
  isOpen,
  onClose,
  data,
  selectedMetric,
  month,
}: MonthDetailsModalProps) {
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Debug: log available columns
    if (data.length > 0) {
      console.log(`[MonthDetailsModal-${month}] Available columns:`, Object.keys(data[0]));
    }
    
    const typeFilters = getMetricTypeFilters(selectedMetric);
    if (typeFilters.length === 0) return data;
    
    // Find the Type column - CSV parser normalizes headers to lowercase, removes spaces
    // "Type" becomes "type"
    const typeColumnKey = Object.keys(data[0] || {}).find(
      key => key.toLowerCase().replace(/[\s_]+/g, '') === 'type'
    ) || 'type';
    
    // Filter rows where the "Type" column matches the selected metric
    return data.filter((row) => {
      const typeValue = (row[typeColumnKey] || '').trim();
      if (!typeValue) return false;
      
      // Case-insensitive comparison against all possible filter variations
      return typeFilters.some(filter => 
        typeValue.toLowerCase() === filter.toLowerCase()
      );
    });
  }, [data, selectedMetric, month]);

  if (!isOpen) return null;

  const metricLabel =
    selectedMetric === 'clientWins'
      ? 'Client Wins'
      : selectedMetric === 'acv'
        ? 'ACV Signed'
        : 'In-Year Revenue';

  return (
    <div
      className="sales-modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(30, 27, 75, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
    >
      <div
        className="sales-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--sales-surface)',
          borderRadius: 'var(--sales-radius)',
          boxShadow: 'var(--sales-shadow-hover)',
          maxWidth: '90vw',
          maxHeight: '90vh',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '24px',
            borderBottom: '1px solid var(--sales-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: 700,
                color: 'var(--sales-text)',
              }}
            >
              {month === 'Jan' ? 'January' : month === 'Feb' ? 'February' : 'March'} Details - {metricLabel}
            </h2>
            <p
              style={{
                margin: '8px 0 0',
                fontSize: '14px',
                color: 'var(--sales-text-secondary)',
              }}
            >
              Showing {filteredData.length} row{filteredData.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              color: 'var(--sales-text-secondary)',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 'var(--sales-radius-sm)',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--sales-accent-soft)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            ×
          </button>
        </div>
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '24px',
          }}
        >
          {filteredData.length === 0 ? (
            <div
              style={{
                padding: '40px',
                color: 'var(--sales-text-secondary)',
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                No filtered data available for {month === 'Jan' ? 'January' : month === 'Feb' ? 'February' : 'March'} {metricLabel}
              </div>
              {data.length > 0 && (
                <div style={{ marginTop: '20px' }}>
                  <p style={{ fontWeight: 600, marginBottom: '10px' }}>Debug: Showing all data ({data.length} rows):</p>
                  <div className="sales-accounts-table-scroll">
                    <table className="sales-accounts-table">
                      <thead>
                        <tr>
                          {Object.keys(data[0])
                            .filter(key => !shouldExcludeColumn(key, selectedMetric))
                            .map((key) => (
                              <th key={key}>{getColumnDisplayName(key)}</th>
                            ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.slice(0, 5).map((row, i) => (
                          <tr key={i}>
                            {Object.keys(data[0])
                              .filter(key => !shouldExcludeColumn(key, selectedMetric))
                              .map((key) => {
                                const value = row[key] ?? '';
                                return (
                                  <td key={key}>
                                    {isNumeric(value) ? formatNumber(value) : value}
                                  </td>
                                );
                              })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {data.length > 5 && <p style={{ marginTop: '10px', fontSize: '12px' }}>... showing first 5 of {data.length} rows</p>}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="sales-accounts-table-scroll">
              <table className="sales-accounts-table">
                <thead>
                  <tr>
                    {(() => {
                      const visibleColumns = Object.keys(filteredData[0])
                        .filter(key => !shouldExcludeColumn(key, selectedMetric));
                      console.log(`[MonthDetailsModal-${month}] Visible columns:`, visibleColumns);
                      console.log(`[MonthDetailsModal-${month}] All columns:`, Object.keys(filteredData[0]));
                      return visibleColumns.map((key) => (
                        <th key={key}>{getColumnDisplayName(key)}</th>
                      ));
                    })()}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((row, i) => (
                    <tr key={i}>
                      {Object.keys(filteredData[0])
                        .filter(key => !shouldExcludeColumn(key, selectedMetric))
                        .map((key) => {
                          const value = row[key] ?? '';
                          return (
                            <td key={key}>
                              {isNumeric(value) ? formatNumber(value) : value}
                            </td>
                          );
                        })}
                    </tr>
                  ))}
                  {(() => {
                    // Calculate totals for numeric columns
                    const visibleColumns = Object.keys(filteredData[0]).filter(key => !shouldExcludeColumn(key, selectedMetric));
                    const numericColumns = visibleColumns.filter(key => {
                      return filteredData.some(row => isNumeric(row[key] ?? ''));
                    });

                    if (numericColumns.length === 0) return null;

                    return (
                      <tr style={{ fontWeight: 700, backgroundColor: 'var(--sales-accent-soft)' }}>
                        {visibleColumns.map((key) => {
                          const isNumericCol = numericColumns.includes(key);
                          if (isNumericCol) {
                            const total = filteredData.reduce((sum, row) => {
                              const val = row[key] ?? '';
                              if (isNumeric(val)) {
                                return sum + parseFloat(val.replace(/[,$]/g, ''));
                              }
                              return sum;
                            }, 0);
                            return (
                              <td key={key} style={{ fontWeight: 700 }}>
                                {formatNumber(total.toString())}
                              </td>
                            );
                          }
                          // For non-numeric columns, show "Total" in first column, empty for others
                          const isFirstColumn = visibleColumns.indexOf(key) === 0;
                          return (
                            <td key={key} style={{ fontWeight: 700, textAlign: isFirstColumn ? 'right' : 'left' }}>
                              {isFirstColumn ? 'Total' : ''}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
