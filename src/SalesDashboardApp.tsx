import { useState } from 'react';
import { useSalesData } from './contexts/SalesDataContext';
import { Sidebar, type SalesTabId } from './components/sales/Sidebar';
import { OverviewTab } from './components/sales/OverviewTab';
import { ForecastTab } from './components/sales/ForecastTab';
import { PipelineTab } from './components/sales/PipelineTab';
import { AccountsTab } from './components/sales/AccountsTab';
import { QuarterTab } from './components/sales/QuarterTab';

function SalesDashboardApp() {
  const [activeTab, setActiveTab] = useState<SalesTabId>('overview');
  const { refetch, loading, useApi, useGoogleSheets } = useSalesData();
  const showRefresh = useApi || useGoogleSheets;

  return (
    <div className="sales-app">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="sales-main">
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'forecast' && <ForecastTab />}
        {activeTab === 'pipeline' && <PipelineTab />}
        {activeTab === 'accounts' && <AccountsTab />}
        {activeTab === '2026q1' && <QuarterTab tabId="2026q1" />}
        {activeTab === '2026q2' && <QuarterTab tabId="2026q2" />}
        {activeTab === '2026q3' && <QuarterTab tabId="2026q3" />}
        {activeTab === '2026q4' && <QuarterTab tabId="2026q4" />}
      </main>
      {showRefresh && (
        <button
          type="button"
          className="sales-refresh-data-btn"
          onClick={() => refetch()}
          disabled={loading}
          title="Reload data from Google Sheets"
        >
          {loading ? 'Loading…' : 'Refresh data'}
        </button>
      )}
    </div>
  );
}

export default SalesDashboardApp;
