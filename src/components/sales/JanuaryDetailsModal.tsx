/** Row shape for the month details pop-up: Deal Name (Q1 Pipeline), Forecasted Month, Segment, Deal Owner, Status, Weighted ACV, FY26 ARR. */
export type MonthDealRow = {
  dealName: string;
  forecastedMonth: string;
  segment: string;
  dealOwner: string;
  status: string;
  weightedAcv: number;
  fy26Arr: number;
};

type MonthKey = 'Jan' | 'Feb' | 'Mar' | 'Apr' | 'May' | 'Jun';

interface MonthDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  rows: MonthDealRow[];
  month: MonthKey;
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return `$${value}`;
}

/** Pop-up when clicking a month bar: shows deals for that month with Deal Name, Forecasted Month, Segment, Deal Owner, Weighted ACV, FY26 ARR. Respects segment and deal owner filters. */
export function MonthDetailsModal({
  isOpen,
  onClose,
  rows,
  month,
}: MonthDetailsModalProps) {
  if (!isOpen) return null;

  const monthLabels: Record<MonthKey, string> = {
    Jan: 'January', Feb: 'February', Mar: 'March',
    Apr: 'April', May: 'May', Jun: 'June',
  };
  const monthLabel = monthLabels[month];
  const totalWeightedAcv = rows.reduce((s, r) => s + r.weightedAcv, 0);
  const totalFy26Arr = rows.reduce((s, r) => s + r.fy26Arr, 0);

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
              {monthLabel} – Deals
            </h2>
            <p
              style={{
                margin: '8px 0 0',
                fontSize: '14px',
                color: 'var(--sales-text-secondary)',
              }}
            >
              Showing {rows.length} deal{rows.length !== 1 ? 's' : ''} (filtered by current Segment / Deal Owner)
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
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
          {rows.length === 0 ? (
            <div
              style={{
                padding: '40px',
                color: 'var(--sales-text-secondary)',
                textAlign: 'center',
              }}
            >
              No deals for {monthLabel} with the current filters.
            </div>
          ) : (
            <div className="sales-accounts-table-scroll">
              <table className="sales-accounts-table">
                <thead>
                  <tr>
                    <th>Deal Name</th>
                    <th>Forecasted Month</th>
                    <th>Segment</th>
                    <th>Deal Owner</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Weighted ACV</th>
                    <th style={{ textAlign: 'right' }}>FY26 ARR</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i}>
                      <td>{row.dealName || '—'}</td>
                      <td>{row.forecastedMonth || '—'}</td>
                      <td>{row.segment || '—'}</td>
                      <td>{row.dealOwner || '—'}</td>
                      <td>{row.status || '—'}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(row.weightedAcv)}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(row.fy26Arr)}</td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 700, backgroundColor: 'var(--sales-accent-soft)' }}>
                    <td colSpan={5} style={{ textAlign: 'right' }}>Total</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(totalWeightedAcv)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(totalFy26Arr)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
