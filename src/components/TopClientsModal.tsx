import { useEffect } from 'react';

export type TopClientRow = {
  client: string;
  monthVolume: number;
  monthPct: number; // 0..1
  overallVolume: number;
  overallPct: number; // 0..1
};

export type OverallTopClientRow = {
  client: string;
  volume: number;
  pct: number; // 0..1
};

interface TopClientsModalProps {
  isOpen: boolean;
  month: string | null;
  monthTotalVolume: number;
  overallTotalVolume: number;
  monthTopClients: TopClientRow[];
  overallTopClients: OverallTopClientRow[];
  onClose: () => void;
}

const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);

const formatPct = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 }).format(value);

export const TopClientsModal = ({
  isOpen,
  month,
  monthTotalVolume,
  overallTotalVolume,
  monthTopClients,
  overallTopClients,
  onClose,
}: TopClientsModalProps) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !month) return null;

  return (
    <div
      onClick={onClose}
      className="modalBackdrop"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="modal"
      >
        <div className="modalHeader">
          <div>
            <h2 className="modalTitle">Top clients for {month}</h2>
            <div className="modalMeta">
              Month total: <strong>{formatNumber(monthTotalVolume)}</strong> · Overall total: <strong>{formatNumber(overallTotalVolume)}</strong>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn"
          >
            Close
          </button>
        </div>

        <div style={{ marginTop: 14 }}>
          <h3 className="sectionTitle">Top 10 for this month</h3>

          {monthTopClients.length === 0 ? (
            <div className="emptyState">
              No data for this month with the current filters.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Client</th>
                    <th>Month volume</th>
                    <th>% of month</th>
                    <th>Overall volume</th>
                    <th>% of overall</th>
                  </tr>
                </thead>
                <tbody>
                  {monthTopClients.map((row, idx) => (
                    <tr key={`${row.client}-${idx}`}>
                      <td className="tableMuted">{idx + 1}</td>
                      <td className="tableStrong">{row.client}</td>
                      <td>{formatNumber(row.monthVolume)}</td>
                      <td>{formatPct(row.monthPct)}</td>
                      <td>{formatNumber(row.overallVolume)}</td>
                      <td>{formatPct(row.overallPct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <h3 className="sectionTitle">Top 10 overall (with current filters)</h3>

          {overallTopClients.length === 0 ? (
            <div className="emptyState">
              No overall data with the current filters.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Client</th>
                    <th>Overall volume</th>
                    <th>% of overall</th>
                  </tr>
                </thead>
                <tbody>
                  {overallTopClients.map((row, idx) => (
                    <tr key={`${row.client}-${idx}`}>
                      <td className="tableMuted">{idx + 1}</td>
                      <td className="tableStrong">{row.client}</td>
                      <td>{formatNumber(row.volume)}</td>
                      <td>{formatPct(row.pct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--muted)' }}>
          Tip: click outside the dialog (or press Escape) to close.
        </div>
      </div>
    </div>
  );
};

