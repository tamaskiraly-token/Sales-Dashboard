import { useMemo } from 'react';

interface MonthDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: Record<string, string>[];
  month: 'Jan' | 'Feb' | 'Mar';
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

/** Columns are shown as-is from the sheet; no filtering by metric */

export function MonthDetailsModal({
  isOpen,
  onClose,
  data,
  month,
}: MonthDetailsModalProps) {
  const tableData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data;
  }, [data]);

  if (!isOpen) return null;

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
              {month === 'Jan' ? 'January' : month === 'Feb' ? 'February' : 'March'} Details
            </h2>
            <p
              style={{
                margin: '8px 0 0',
                fontSize: '14px',
                color: 'var(--sales-text-secondary)',
              }}
            >
              Showing {tableData.length} row{tableData.length !== 1 ? 's' : ''}
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
          {tableData.length === 0 ? (
            <div
              style={{
                padding: '40px',
                color: 'var(--sales-text-secondary)',
                textAlign: 'center',
              }}
            >
              No data available for {month === 'Jan' ? 'January' : month === 'Feb' ? 'February' : 'March'}
            </div>
          ) : (
            <div className="sales-accounts-table-scroll">
              <table className="sales-accounts-table">
                <thead>
                  <tr>
                    {Object.keys(tableData[0]).map((key) => (
                      <th key={key}>{getColumnDisplayName(key)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, i) => (
                    <tr key={i}>
                      {Object.keys(tableData[0]).map((key) => {
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
                    const columns = Object.keys(tableData[0]);
                    const numericColumns = columns.filter(key => {
                      return tableData.some(row => isNumeric(row[key] ?? ''));
                    });

                    if (numericColumns.length === 0) return null;

                    return (
                      <tr style={{ fontWeight: 700, backgroundColor: 'var(--sales-accent-soft)' }}>
                        {columns.map((key) => {
                          const isNumericCol = numericColumns.includes(key);
                          if (isNumericCol) {
                            const total = tableData.reduce((sum, row) => {
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
                          const isFirstColumn = columns.indexOf(key) === 0;
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
