import { useState, useMemo } from 'react';
import { 
  processVolumeData, 
  getUniqueValues, 
  aggregateVolumeByDate,
  aggregateVolumeByClient,
  getTopClientsByVolume,
  sumTotalVolume,
  ClientVolume,
  VolumeDataRow 
} from './data/processVolumeData';
import { VolumeChart } from './components/VolumeChart';
import { VolumeFilters, FilterState } from './components/VolumeFilters';
import { VolumeSummary } from './components/VolumeSummary';
import { TopClientsModal, OverallTopClientRow, TopClientRow } from './components/TopClientsModal';

function VolumeApp() {
  // Load and process data
  const allData = useMemo(() => processVolumeData(), []);
  
  // Initialize filters
  const [filters, setFilters] = useState<FilterState>({
    client: [],
    regulatoryType: [],
    transactionType: [],
    merchant: [],
    merchantJurisdiction: [],
    merchantIndustry: [],
    useCase: [],
    tpp: [],
    currency: [],
    sourceBankJurisdiction: [],
    transactionCategory: [],
    transactionSubType: [],
  });

  // Get unique values for all filter fields
  const uniqueValues = useMemo(() => ({
    client: getUniqueValues(allData, 'client'),
    regulatoryType: getUniqueValues(allData, 'regulatoryType'),
    transactionType: getUniqueValues(allData, 'transactionType'),
    merchant: getUniqueValues(allData, 'merchant'),
    merchantJurisdiction: getUniqueValues(allData, 'merchantJurisdiction'),
    merchantIndustry: getUniqueValues(allData, 'merchantIndustry'),
    useCase: getUniqueValues(allData, 'useCase'),
    tpp: getUniqueValues(allData, 'tpp'),
    currency: getUniqueValues(allData, 'currency'),
    sourceBankJurisdiction: getUniqueValues(allData, 'sourceBankJurisdiction'),
    transactionCategory: getUniqueValues(allData, 'transactionCategory'),
    transactionSubType: getUniqueValues(allData, 'transactionSubType'),
  }), [allData]);

  // Apply filters to data
  const filteredData = useMemo(() => {
    return allData.filter(row => {
      // Check each filter
      for (const [key, values] of Object.entries(filters)) {
        if (values.length > 0) {
          const fieldValue = String(row[key as keyof VolumeDataRow] || '');
          if (!values.includes(fieldValue)) {
            return false;
          }
        }
      }
      return true;
    });
  }, [allData, filters]);

  // Aggregate data for chart
  const chartData = useMemo(() => {
    return aggregateVolumeByDate(filteredData);
  }, [filteredData]);

  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [isTopClientsOpen, setIsTopClientsOpen] = useState(false);

  const overallTotalVolume = useMemo(() => sumTotalVolume(filteredData), [filteredData]);
  const overallVolumeByClient = useMemo(() => aggregateVolumeByClient(filteredData), [filteredData]);
  const overallTopClients = useMemo<OverallTopClientRow[]>(() => {
    const top = getTopClientsByVolume(filteredData, 10);
    const denom = overallTotalVolume || 1;
    return top.map((t) => ({
      client: t.client,
      volume: t.volume,
      pct: t.volume / denom,
    }));
  }, [filteredData, overallTotalVolume]);

  const monthData = useMemo(() => {
    if (!selectedMonth) return [];
    return filteredData.filter((r) => r.transactionDate === selectedMonth);
  }, [filteredData, selectedMonth]);

  const monthTotalVolume = useMemo(() => sumTotalVolume(monthData), [monthData]);

  const monthTopClients = useMemo<TopClientRow[]>(() => {
    if (!selectedMonth) return [];
    const top: ClientVolume[] = getTopClientsByVolume(monthData, 10);

    const monthDenom = monthTotalVolume || 1;
    const overallDenom = overallTotalVolume || 1;

    return top.map((t) => {
      const overallVol = overallVolumeByClient.get(t.client) ?? 0;
      return {
        client: t.client,
        monthVolume: t.volume,
        monthPct: t.volume / monthDenom,
        overallVolume: overallVol,
        overallPct: overallVol / overallDenom,
      };
    });
  }, [monthData, monthTotalVolume, overallTotalVolume, overallVolumeByClient, selectedMonth]);

  const handleFilterChange = (filterKey: keyof FilterState, values: string[]) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: values,
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      client: [],
      regulatoryType: [],
      transactionType: [],
      merchant: [],
      merchantJurisdiction: [],
      merchantIndustry: [],
      useCase: [],
      tpp: [],
      currency: [],
      sourceBankJurisdiction: [],
      transactionCategory: [],
      transactionSubType: [],
    });
  };

  const handleChartPointClick = (date: string) => {
    setSelectedMonth(date);
    setIsTopClientsOpen(true);
  };

  return (
    <div>
      <div className="topbar">
        <div className="topbarInner">
          <div className="brand">
            <div className="brandMark" />
            <div style={{ minWidth: 0 }}>
              <div className="brandTitle">Total volume</div>
              <div className="brandSubtitle">Wise-inspired dashboard · click chart points for insights</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span className="pill">
              Rows: <span className="pillStrong">{allData.length.toLocaleString()}</span>
            </span>
            <span className="pill">
              Showing: <span className="pillStrong">{filteredData.length.toLocaleString()}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="layout">
          <div>
            <VolumeFilters
              filters={filters}
              uniqueValues={uniqueValues}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
            />
          </div>

          <div style={{ display: 'grid', gap: 20 }}>
            <div className="card">
              <div className="cardHeader">
                <h2 className="cardTitle">Overview</h2>
                <p className="cardSub">A quick snapshot of the currently filtered dataset.</p>
              </div>
              <div className="cardBody">
                <VolumeSummary data={filteredData} />
              </div>
            </div>

            <div className="card">
              <VolumeChart data={chartData} onPointClick={handleChartPointClick} />
            </div>

            <div className="footerNote">
              Showing <strong>{filteredData.length.toLocaleString()}</strong> of <strong>{allData.length.toLocaleString()}</strong> rows.
            </div>
          </div>
        </div>

        <TopClientsModal
          isOpen={isTopClientsOpen}
          month={selectedMonth}
          monthTotalVolume={monthTotalVolume}
          overallTotalVolume={overallTotalVolume}
          monthTopClients={monthTopClients}
          overallTopClients={overallTopClients}
          onClose={() => setIsTopClientsOpen(false)}
        />
      </div>
    </div>
  );
}

export default VolumeApp;
