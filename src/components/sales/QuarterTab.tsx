import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
  Cell,
} from 'recharts';
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import { useSalesData } from '../../contexts/SalesDataContext';
import type { QuarterId, QuarterDeal } from '../../data/salesMockData';
import { SegmentMultiselect } from './SegmentMultiselect';
import { DealOwnerMultiselect } from './DealOwnerMultiselect';

const QUARTER_MONTH_LABELS: Record<QuarterId, [string, string, string]> = {
  '2026Q1': ['Jan', 'Feb', 'Mar'],
  '2026Q2': ['Apr', 'May', 'Jun'],
  '2026Q3': ['Jul', 'Aug', 'Sep'],
  '2026Q4': ['Oct', 'Nov', 'Dec'],
};

const QUARTER_MONTH_NUMS: Record<QuarterId, number[]> = {
  '2026Q1': [1, 2, 3],
  '2026Q2': [4, 5, 6],
  '2026Q3': [7, 8, 9],
  '2026Q4': [10, 11, 12],
};

type BarMetric = 'acv' | 'arrForecast' | 'annualizedTransactionForecast';

/** Metric for the quarterly projection waterfall: client wins (count), ACV signed, or in-year revenue */
type QuarterProjectionMetric = 'clientWins' | 'acv' | 'inYearRevenue';

const QUARTER_LABEL: Record<string, string> = {
  '2026Q1': '2026 Q1 (Jan–Mar)',
  '2026Q2': '2026 Q2 (Apr–Jun)',
  '2026Q3': '2026 Q3 (Jul–Sep)',
  '2026Q4': '2026 Q4 (Oct–Dec)',
};

const PREVIOUS_QUARTERS: Record<QuarterId, QuarterId[]> = {
  '2026Q1': [],
  '2026Q2': ['2026Q1'],
  '2026Q3': ['2026Q1', '2026Q2'],
  '2026Q4': ['2026Q1', '2026Q2', '2026Q3'],
};

function tabIdToQuarter(tabId: string): QuarterId {
  const map: Record<string, QuarterId> = {
    '2026q1': '2026Q1',
    '2026q2': '2026Q2',
    '2026q3': '2026Q3',
    '2026q4': '2026Q4',
  };
  return map[tabId] ?? '2026Q1';
}

/** Returns YYYY-MM-DD for today (as-of date for signed vs forecasted split) */
function getAsOfDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getMetricFromDeal(d: QuarterDeal, metric: QuarterProjectionMetric): number {
  if (metric === 'clientWins') return 1;
  if (metric === 'acv') return d.acv;
  return d.arrForecast; // inYearRevenue
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d}/${months[parseInt(m!, 10) - 1]}/${y}`;
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toLocaleString();
}

interface QuarterTabProps {
  tabId: string;
}

/** True waterfall: baseline + signed + forecasted (stacked). Optional target for Target column. */
type WaterfallRow = {
  name: string;
  baseline: number;
  signed: number;
  forecasted: number;
  target?: number;
  isTotal?: boolean;
  isTarget?: boolean;
};

export function QuarterTab({ tabId }: QuarterTabProps) {
  const { getQuarterDeals, getQuarterTargets, getQuarterMetricInput } = useSalesData();
  const quarter = tabIdToQuarter(tabId);
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const [projectionMetric, setProjectionMetric] = useState<QuarterProjectionMetric>('acv');
  const [barMetric, setBarMetric] = useState<BarMetric>('acv');

  const allDeals = useMemo(() => getQuarterDeals(quarter), [quarter, getQuarterDeals]);
  const dealOwners = useMemo(() => {
    const set = new Set(allDeals.map((d) => d.dealOwner));
    return Array.from(set).sort();
  }, [allDeals]);

  const deals = useMemo(() => {
    let list = allDeals;
    if (selectedSegments.length > 0) {
      list = list.filter((d) => selectedSegments.includes(d.segment));
    }
    if (selectedOwners.length > 0) {
      list = list.filter((d) => selectedOwners.includes(d.dealOwner));
    }
    return list;
  }, [allDeals, selectedSegments, selectedOwners]);

  const asOfDate = useMemo(() => getAsOfDateString(), []);

  const previousQuarterDeals = useMemo(() => {
    const prev = PREVIOUS_QUARTERS[quarter];
    if (prev.length === 0) return [];
    let list: QuarterDeal[] = [];
    for (const q of prev) {
      list = list.concat(getQuarterDeals(q));
    }
    if (selectedSegments.length > 0) list = list.filter((d) => selectedSegments.includes(d.segment));
    if (selectedOwners.length > 0) list = list.filter((d) => selectedOwners.includes(d.dealOwner));
    return list;
  }, [quarter, getQuarterDeals, selectedSegments, selectedOwners]);

  const carryOver = useMemo(() => {
    return previousQuarterDeals
      .filter((d) => d.closeDate <= asOfDate)
      .reduce((s, d) => s + getMetricFromDeal(d, projectionMetric), 0);
  }, [previousQuarterDeals, asOfDate, projectionMetric]);

  const waterfallData = useMemo((): WaterfallRow[] => {
    const labels = QUARTER_MONTH_LABELS[quarter];
    const quarterMetricInput = getQuarterMetricInput(quarter, projectionMetric);

    let monthSigned: number[];
    let monthForecasted: number[];
    let targetValue: number;
    let effectiveCarryOver: number;

    if (quarterMetricInput) {
      monthSigned = quarterMetricInput.monthSigned;
      monthForecasted = quarterMetricInput.monthForecasted;
      effectiveCarryOver = quarterMetricInput.carryOver ?? 0;
      targetValue =
        quarterMetricInput.quarterTarget > 0
          ? projectionMetric === 'clientWins'
            ? Math.round(quarterMetricInput.quarterTarget)
            : Math.round(quarterMetricInput.quarterTarget / 1000) * 1000
          : (() => {
              const targets = getQuarterTargets(quarter);
              return projectionMetric === 'clientWins'
                ? targets.clientWins
                : projectionMetric === 'acv'
                  ? targets.acv
                  : targets.inYearRevenue;
            })();
    } else {
      effectiveCarryOver = carryOver;
      const monthNums = QUARTER_MONTH_NUMS[quarter];
      const year = 2026;
      monthSigned = [];
      monthForecasted = [];

      for (let i = 0; i < 3; i++) {
        const monthNum = monthNums[i];
        const monthPrefix = `${year}-${String(monthNum).padStart(2, '0')}`;
        const dealsInMonth = deals.filter((d) => d.closeDate.startsWith(monthPrefix));
        let signed = 0;
        let forecasted = 0;
        for (const d of dealsInMonth) {
          const v = getMetricFromDeal(d, projectionMetric);
          if (d.closeDate <= asOfDate) signed += v;
          else forecasted += v;
        }
        monthSigned.push(signed);
        monthForecasted.push(forecasted);
      }

      const quarterTotalProjected =
        monthSigned[0] + monthSigned[1] + monthSigned[2] + monthForecasted[0] + monthForecasted[1] + monthForecasted[2];
      const allDealsQuarterTotal = allDeals.reduce(
        (s, d) => s + getMetricFromDeal(d, projectionMetric),
        0
      );
      const targets = getQuarterTargets(quarter);
      const fullTarget =
        projectionMetric === 'clientWins'
          ? targets.clientWins
          : projectionMetric === 'acv'
            ? targets.acv
            : targets.inYearRevenue;
      targetValue =
        allDealsQuarterTotal > 0 && (selectedSegments.length > 0 || selectedOwners.length > 0)
          ? fullTarget * (quarterTotalProjected / allDealsQuarterTotal)
          : fullTarget;
      if (projectionMetric === 'clientWins') {
        targetValue = Math.round(targetValue);
      } else {
        targetValue = Math.round(targetValue / 1000) * 1000;
      }
    }

    const totalSigned = monthSigned[0] + monthSigned[1] + monthSigned[2];
    const totalForecasted = monthForecasted[0] + monthForecasted[1] + monthForecasted[2];
    const targetLabel = quarter === '2026Q1' ? 'Q1 Target' : `${quarter} Target`;

    const rows: WaterfallRow[] = [];
    let running = 0;

    if (quarter !== '2026Q1') {
      rows.push({ name: 'Carry-over', baseline: 0, signed: effectiveCarryOver, forecasted: 0, isTotal: false });
      running = effectiveCarryOver;
    }

    for (let i = 0; i < 3; i++) {
      const signed = monthSigned[i] ?? 0;
      const forecasted = monthForecasted[i] ?? 0;
      rows.push({ name: labels[i], baseline: running, signed, forecasted, isTotal: false });
      running += signed + forecasted;
    }

    rows.push({
      name: 'Total Projected',
      baseline: 0,
      signed: totalSigned,
      forecasted: totalForecasted,
      isTotal: true,
    });

    rows.push({
      name: targetLabel,
      baseline: 0,
      signed: 0,
      forecasted: 0,
      target: targetValue,
      isTarget: true,
    });

    return rows;
  }, [
    quarter,
    deals,
    allDeals,
    selectedSegments.length,
    selectedOwners.length,
    projectionMetric,
    asOfDate,
    carryOver,
    getQuarterMetricInput,
    getQuarterTargets,
  ]);

  const chartData = useMemo(() => {
    const byClient = new Map<string, { acv: number; arrForecast: number; annualizedTransactionForecast: number }>();
    for (const d of deals) {
      const cur = byClient.get(d.clientName) ?? { acv: 0, arrForecast: 0, annualizedTransactionForecast: 0 };
      cur.acv += d.acv;
      cur.arrForecast += d.arrForecast;
      cur.annualizedTransactionForecast += d.annualizedTransactionForecast;
      byClient.set(d.clientName, cur);
    }
    return Array.from(byClient.entries())
      .map(([clientName, vals]) => ({ clientName, ...vals }))
      .sort((a, b) => (b[barMetric] as number) - (a[barMetric] as number));
  }, [deals, barMetric]);

  const dataKey = barMetric;
  const formatTooltip = (value: number) =>
    barMetric === 'annualizedTransactionForecast' ? formatNumber(value) : formatCurrency(value);
  const formatAxis = (value: number) =>
    barMetric === 'annualizedTransactionForecast' ? formatNumber(value) : formatCurrency(value);

  const metricLabel =
    barMetric === 'acv'
      ? 'ACV'
      : barMetric === 'arrForecast'
        ? 'ARR forecast'
        : 'Annualized transaction forecast';

  const totalSum = useMemo(
    () => chartData.reduce((s, row) => s + (row[barMetric] as number), 0),
    [chartData, barMetric]
  );
  const totalSumFormatted =
    barMetric === 'annualizedTransactionForecast' ? formatNumber(totalSum) : formatCurrency(totalSum);

  const formatProjectionValue = (value: number) =>
    projectionMetric === 'clientWins' ? String(Math.round(value)) : formatCurrency(value);
  const formatProjectionAxis = (value: number) =>
    projectionMetric === 'clientWins' ? String(Math.round(value)) : formatCurrency(value);

  const getWaterfallRowValue = (row: WaterfallRow) =>
    row.isTarget && row.target != null ? row.target : row.signed + row.forecasted;

  const waterfallYMax = useMemo(() => {
    let max = 0;
    for (const row of waterfallData) {
      const total =
        row.baseline + row.signed + row.forecasted + (row.target != null ? row.target : 0);
      if (total > max) max = total;
    }
    return max > 0 ? max : 1;
  }, [waterfallData]);

  /** Show label on Forecasted bar – only when forecasted > 0 so label sits on top of stack; when forecasted is 0 the label is shown on the Signed bar instead. */
  const renderWaterfallLabel = (props: {
    x?: number;
    y?: number;
    width?: number;
    value?: number;
    index?: number;
    payload?: WaterfallRow;
  }) => {
    const { x = 0, y = 0, width = 0, index = 0, payload } = props;
    const row = payload ?? waterfallData[index];
    if (row?.isTarget) return null;
    if (row && row.forecasted === 0) return null;
    const total = row ? getWaterfallRowValue(row) : 0;
    const displayValue = row ? formatProjectionValue(total) : '';
    if (!row || total === 0) return null;
    return (
      <text
        x={(x ?? 0) + (width ?? 0) / 2}
        y={(y ?? 0) - 6}
        textAnchor="middle"
        fill="var(--sales-text)"
        fontSize={12}
        fontWeight={700}
      >
        {displayValue}
      </text>
    );
  };

  /** Show label on Signed bar only when forecasted is 0 (e.g. Carry-over) so label is visible for zero-height forecasted segment. */
  const renderWaterfallLabelSignedOnly = (props: {
    x?: number;
    y?: number;
    width?: number;
    value?: number;
    index?: number;
    payload?: WaterfallRow;
  }) => {
    const { payload } = props;
    const row = payload;
    if (!row || row.isTarget || (row.signed === 0 || row.forecasted !== 0)) return null;
    const total = row.signed + row.forecasted;
    if (total === 0) return null;
    return renderWaterfallLabel(props);
  };

  const renderTargetLabel = (props: {
    x?: number;
    y?: number;
    width?: number;
    value?: number;
    index?: number;
    payload?: WaterfallRow;
  }) => {
    const { x = 0, y = 0, width = 0, index = 0, payload } = props;
    const row = payload ?? waterfallData[index];
    const val = row?.target ?? 0;
    if (val === 0) return null;
    return (
      <text
        x={(x ?? 0) + (width ?? 0) / 2}
        y={(y ?? 0) - 6}
        textAnchor="middle"
        fill="var(--sales-text)"
        fontSize={12}
        fontWeight={700}
      >
        {formatProjectionValue(val)}
      </text>
    );
  };

  return (
    <div className="sales-overview">
      <header className="sales-page-header">
        <h1 className="sales-page-title">{QUARTER_LABEL[quarter]}</h1>
        <p className="sales-page-subtitle">
          Deals anticipated to close in this quarter. Filter below, then quarterly waterfall, per-client bar chart and deal table.
        </p>
      </header>

      <div className="sales-accounts-filters sales-chart-card">
        <div className="sales-accounts-filters-row">
          <SegmentMultiselect selectedSegments={selectedSegments} onChange={setSelectedSegments} />
          <DealOwnerMultiselect
            owners={dealOwners}
            selectedOwners={selectedOwners}
            onChange={setSelectedOwners}
          />
        </div>
      </div>

      <div className="sales-chart-card sales-quarter-waterfall">
        <div className="sales-chart-header sales-chart-header-with-switch">
          <div>
            <h3 className="sales-chart-title">Quarterly projection (waterfall)</h3>
            <p className="sales-chart-sub">
              Signed (closed by {asOfDate}) vs Forecasted. Month-by-month adds up; Total = quarter total.
            </p>
          </div>
          <div className="sales-view-switch">
            <span className="sales-view-switch-label">Metric:</span>
            <button
              type="button"
              className={`sales-view-switch-btn ${projectionMetric === 'clientWins' ? 'active' : ''}`}
              onClick={() => setProjectionMetric('clientWins')}
            >
              Client wins
            </button>
            <button
              type="button"
              className={`sales-view-switch-btn ${projectionMetric === 'acv' ? 'active' : ''}`}
              onClick={() => setProjectionMetric('acv')}
            >
              ACV signed
            </button>
            <button
              type="button"
              className={`sales-view-switch-btn ${projectionMetric === 'inYearRevenue' ? 'active' : ''}`}
              onClick={() => setProjectionMetric('inYearRevenue')}
            >
              In-year revenue
            </button>
          </div>
        </div>
        <div className="sales-chart-body">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={waterfallData} margin={{ top: 32, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--sales-border)" />
              <XAxis
                dataKey="name"
                tick={{ fill: 'var(--sales-text-secondary)', fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                domain={[0, waterfallYMax]}
                tickFormatter={formatProjectionAxis}
                tick={{ fill: 'var(--sales-text-secondary)', fontSize: 11 }}
                allowDecimals={false}
              />
              <Tooltip
                formatter={(value: ValueType | undefined, name?: NameType) => {
                  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : 0;
                  const label = String(name ?? '').toLowerCase();
                  if (label === 'baseline') return null;
                  if (label === 'target' && (n === 0 || !Number.isFinite(n))) return null;
                  const display = Number.isFinite(n) ? formatProjectionValue(n) : '—';
                  if (label === 'signed') return [display, 'Signed'];
                  if (label === 'forecasted') return [display, 'Forecasted'];
                  if (label === 'target') return [display, 'Target'];
                  return [display, String(name ?? '')];
                }}
                contentStyle={{
                  background: 'var(--sales-surface)',
                  border: '1px solid var(--sales-border)',
                  borderRadius: 12,
                }}
                labelStyle={{ color: 'var(--sales-text)' }}
                labelFormatter={(label) => String(label ?? '')}
              />
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                formatter={(value) => (
                  <span style={{ color: 'var(--sales-text)' }}>
                    {value === 'signed'
                      ? 'Signed'
                      : value === 'forecasted'
                        ? 'Forecasted'
                        : value === 'Target'
                          ? 'Target'
                          : String(value)}
                  </span>
                )}
              />
              <Bar dataKey="baseline" name="baseline" stackId="wf" fill="transparent" radius={[0, 0, 0, 0]} legendType="none" />
              <Bar dataKey="signed" name="Signed" stackId="wf" fill="var(--sales-chart-1)" radius={[0, 0, 0, 0]}>
                <LabelList content={renderWaterfallLabelSignedOnly as any} position="top" />
              </Bar>
              <Bar dataKey="forecasted" name="Forecasted" stackId="wf" fill="var(--sales-chart-3)" radius={[4, 4, 0, 0]}>
                <LabelList content={renderWaterfallLabel as any} position="top" />
              </Bar>
              <Bar
                dataKey="target"
                name="Target"
                stackId="wf"
                fill="var(--sales-waterfall-target)"
                radius={[4, 4, 4, 4]}
              >
                {waterfallData.map((entry, index) => (
                  <Cell
                    key={`target-${index}`}
                    fill={
                      entry.target != null && entry.target > 0
                        ? 'var(--sales-waterfall-target)'
                        : 'transparent'
                    }
                  />
                ))}
                <LabelList content={renderTargetLabel as any} position="top" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="sales-chart-card sales-quarter-chart">
        <div className="sales-chart-header sales-chart-header-with-switch">
          <div>
            <h3 className="sales-chart-title">Per client</h3>
            <p className="sales-chart-sub">Horizontal bar chart: {metricLabel}</p>
          </div>
          <div className="sales-quarter-sum-kpi">
            <span className="sales-quarter-sum-label">Total {metricLabel}</span>
            <span className="sales-quarter-sum-value">{totalSumFormatted}</span>
          </div>
          <div className="sales-view-switch">
            <span className="sales-view-switch-label">Show:</span>
            <button
              type="button"
              className={`sales-view-switch-btn ${barMetric === 'acv' ? 'active' : ''}`}
              onClick={() => setBarMetric('acv')}
            >
              ACV
            </button>
            <button
              type="button"
              className={`sales-view-switch-btn ${barMetric === 'arrForecast' ? 'active' : ''}`}
              onClick={() => setBarMetric('arrForecast')}
            >
              ARR forecast
            </button>
            <button
              type="button"
              className={`sales-view-switch-btn ${barMetric === 'annualizedTransactionForecast' ? 'active' : ''}`}
              onClick={() => setBarMetric('annualizedTransactionForecast')}
            >
              Ann. txn forecast
            </button>
          </div>
        </div>
        <div className="sales-chart-body">
          <ResponsiveContainer width="100%" height={Math.max(240, chartData.length * 36)}>
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 8, right: 24, left: 100, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--sales-border)" horizontal={false} />
              <XAxis type="number" tickFormatter={formatAxis} tick={{ fill: 'var(--sales-text-secondary)', fontSize: 11 }} />
              <YAxis type="category" dataKey="clientName" width={96} tick={{ fill: 'var(--sales-text-secondary)', fontSize: 11 }} />
              <Tooltip
                formatter={(value: ValueType | undefined, name?: NameType) => {
                  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : 0;
                  return [Number.isFinite(n) ? formatTooltip(n) : '—', String(name ?? metricLabel)];
                }}
                contentStyle={{
                  background: 'var(--sales-surface)',
                  border: '1px solid var(--sales-border)',
                  borderRadius: 12,
                }}
                labelStyle={{ color: 'var(--sales-text)' }}
              />
              <Bar dataKey={dataKey} name={metricLabel} fill="var(--sales-primary)" radius={[0, 4, 4, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="sales-accounts-table-wrap sales-chart-card">
        <div className="sales-accounts-table-meta">
          {deals.length} deal{deals.length !== 1 ? 's' : ''} closing in this quarter
        </div>
        <div className="sales-accounts-table-scroll">
          <table className="sales-accounts-table">
            <thead>
              <tr>
                <th>Deal name</th>
                <th>Confidence of quarter close</th>
                <th>Close date</th>
                <th>Segment</th>
                <th>ACV</th>
                <th>ARR forecast</th>
                <th>Ann. txn forecast</th>
                <th>Target account</th>
                <th>Latest / Next steps</th>
                <th>Deal owner</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => (
                <tr key={d.id}>
                  <td className="sales-accounts-cell-name">{d.dealName}</td>
                  <td>{d.confidenceQuarterClose}%</td>
                  <td>{formatDate(d.closeDate)}</td>
                  <td>{d.segment}</td>
                  <td className="sales-accounts-cell-acv">{formatCurrency(d.acv)}</td>
                  <td>{formatCurrency(d.arrForecast)}</td>
                  <td>{formatNumber(d.annualizedTransactionForecast)}</td>
                  <td>{d.targetAccount ? 'Yes' : 'No'}</td>
                  <td className="sales-accounts-cell-steps">{d.latestNextSteps}</td>
                  <td>{d.dealOwner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
