import { useState, useMemo } from 'react';
import { useSalesData } from '../../contexts/SalesDataContext';
import { SEGMENT_OPTIONS } from '../../data/salesMockData';
import type { DealSegment } from '../../data/salesMockData';
import type { PipelineDeal } from '../../data/salesMockData';
import { OverviewKPICards, type OverviewKPIData } from './OverviewKPICards';
import { CumulativeActualForecastChart } from './CumulativeActualForecastChart';
import { PipelineByStageChart } from './PipelineByStageChart';
import { DealDonutChart } from './DealDonutChart';
import { SegmentMultiselect } from './SegmentMultiselect';

const MONTHS_2026 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const FORECAST_YEAR_END_CLIENTS_WON_TARGET = 52;

const SEGMENT_COLORS = ['#1e1b4b', '#3730a3', '#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd'];

function dealDistributionByCount(deals: PipelineDeal[]): DealSegment[] {
  const countBySegment = new Map<string, number>();
  for (const d of deals) {
    const seg = d.segment?.trim() || 'Other';
    countBySegment.set(seg, (countBySegment.get(seg) ?? 0) + 1);
  }
  const total = deals.length;
  const segmentOrder = [
    ...SEGMENT_OPTIONS.filter((s) => countBySegment.has(s)),
    ...[...countBySegment.keys()].filter((s) => !(SEGMENT_OPTIONS as readonly string[]).includes(s)).sort(),
  ];
  const rows: (DealSegment & { count?: number })[] = segmentOrder.map((name, i) => {
    const count = countBySegment.get(name) ?? 0;
    const value = total > 0 ? Math.round((count / total) * 100) : 0;
    return {
      name,
      value,
      fill: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
      count,
    };
  });
  const sum = rows.reduce((a, r) => a + r.value, 0);
  if (sum !== 100 && rows.length > 0) {
    rows[0].value = Math.max(0, rows[0].value + (100 - sum));
  }
  return rows;
}

function getAsOfMonth(): number {
  const d = new Date();
  return d.getFullYear() === 2026 ? d.getMonth() + 1 : 2;
}

export function OverviewTab() {
  const { loading, error, getKPIs, getForecastARR, getPipelineDeals } = useSalesData();
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);

  const asOfMonth = useMemo(() => getAsOfMonth(), []);
  const kpis = useMemo(() => getKPIs(), [getKPIs]);
  const { chartData: arrByMonth } = useMemo(() => getForecastARR(), [getForecastARR]);
  const allDeals = useMemo(() => getPipelineDeals(), [getPipelineDeals]);
  const pipelineDeals = useMemo(() => {
    if (selectedSegments.length === 0) return allDeals;
    return allDeals.filter((d) => selectedSegments.includes(d.segment));
  }, [allDeals, selectedSegments]);
  const dealDistributionData = useMemo(
    () => dealDistributionByCount(pipelineDeals),
    [pipelineDeals]
  );

  const overviewKpiData = useMemo((): OverviewKPIData => {
    const monthIndex: Record<string, number> = {};
    MONTHS_2026.forEach((name, i) => (monthIndex[name] = i));

    let currentARR = 0;
    let previousMonthARR = 0;
    let ytdInYearRevenue = 0;

    for (const row of arrByMonth) {
      const i = monthIndex[row.month] ?? 0;
      const monthNum = i + 1;
      const value = row.license + row.minimum + row.volumeDriven;
      if (monthNum <= asOfMonth) {
        ytdInYearRevenue += value;
      }
      if (monthNum === asOfMonth) {
        currentARR = value;
      } else if (monthNum === asOfMonth - 1) {
        previousMonthARR = value;
      } else if (asOfMonth === 1 && monthNum === 12) {
        previousMonthARR = value;
      }
    }

    let currentARRDelta: number | undefined;
    if (previousMonthARR > 0) {
      currentARRDelta = ((currentARR - previousMonthARR) / previousMonthARR) * 100;
    }

    const prevMonthLabel =
      asOfMonth >= 2
        ? `${MONTH_NAMES_FULL[asOfMonth - 2]} 2026`
        : asOfMonth === 1
          ? 'December 2025'
          : '—';

    const currentMonthLabel = `${MONTH_NAMES_FULL[asOfMonth - 1]} 2026`;

    return {
      currentARR,
      currentARRMonthLabel: currentMonthLabel,
      currentARRCompareMonth: prevMonthLabel,
      currentARRDelta,
      forecastYearEndARR: kpis.forecastARR,
      closedWonClients: kpis.closedWon,
      forecastYearEndClientsWon: FORECAST_YEAR_END_CLIENTS_WON_TARGET,
      ytdInYearRevenue,
      currentPipelineValue: kpis.pipelineValue,
    };
  }, [arrByMonth, asOfMonth, kpis.forecastARR, kpis.closedWon, kpis.pipelineValue]);

  if (loading) {
    return (
      <div className="sales-overview">
        <p className="sales-page-subtitle">Loading data from Google Sheets…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="sales-overview">
        <p className="sales-page-subtitle" style={{ color: 'var(--sales-accent)' }}>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="sales-overview">
      <header className="sales-page-header">
        <h1 className="sales-page-title">Overview</h1>
        <p className="sales-page-subtitle">Sales performance and pipeline at a glance</p>
        <p className="sales-overview-wip">Work in progress</p>
      </header>

      <div className="sales-accounts-filters sales-chart-card">
        <div className="sales-accounts-filters-row">
          <SegmentMultiselect selectedSegments={selectedSegments} onChange={setSelectedSegments} />
        </div>
      </div>

      <OverviewKPICards data={overviewKpiData} />

      <div className="sales-charts-row">
        <div className="sales-chart-wrap sales-chart-wrap-wide">
          <CumulativeActualForecastChart />
        </div>
      </div>

      <div className="sales-charts-row sales-charts-row-half">
        <div className="sales-chart-wrap">
          <PipelineByStageChart deals={pipelineDeals} />
        </div>
        <div className="sales-chart-wrap">
          <DealDonutChart key={selectedSegments.slice().sort().join(',')} data={dealDistributionData} deals={pipelineDeals} />
        </div>
      </div>
    </div>
  );
}
