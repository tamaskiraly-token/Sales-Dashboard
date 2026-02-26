import type { SalesTabId } from './Sidebar';

const LABELS: Record<SalesTabId, string> = {
  overview: 'Overview',
  forecast: 'Forecast',
  pipeline: 'Pipeline',
  accounts: 'Accounts',
  lostdeals: 'Lost Deals',
  '2026q1': '2026 Q1',
  '2026q2': '2026 Q2',
  '2026q3': '2026 Q3',
  '2026q4': '2026 Q4',
};

interface PlaceholderTabProps {
  tab: SalesTabId;
}

export function PlaceholderTab({ tab }: PlaceholderTabProps) {
  const title = LABELS[tab];
  return (
    <div className="sales-overview">
      <header className="sales-page-header">
        <h1 className="sales-page-title">{title}</h1>
        <p className="sales-page-subtitle">This view will show {title.toLowerCase()} data. Connect HubSpot to populate.</p>
      </header>
      <div className="sales-placeholder-card">
        <p className="sales-placeholder-text">Coming soon: {title} charts and tables will appear here.</p>
      </div>
    </div>
  );
}
