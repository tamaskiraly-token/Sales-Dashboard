import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';
import { useSalesData } from '../../contexts/SalesDataContext';

const MONTHS_2026 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

type CumulativeMetric = 'acv' | 'inYearRevenue' | 'arrTarget' | 'clientWins';

function getAsOfMonth(): number {
  const d = new Date();
  return d.getFullYear() === 2026 ? d.getMonth() + 1 : 2;
}

function formatAxisValue(value: number, isCurrency: boolean): string {
  if (!isCurrency) return String(Math.round(value));
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

export function CumulativeActualForecastChart() {
  const { getPipelineDeals, getForecastARR, getClientWins, getAnnualTargets, getCumulativeChartData } = useSalesData();
  const [metric, setMetric] = useState<CumulativeMetric>('acv');

  const asOfMonth = useMemo(() => getAsOfMonth(), []);
  const annualTargets = useMemo(() => getAnnualTargets(), [getAnnualTargets]);
  const sheetData = useMemo(() => getCumulativeChartData(metric), [getCumulativeChartData, metric]);

  const chartData = useMemo(() => {
    const rows: {
      month: string;
      monthIndex: number;
      targetCumulative: number;
      actualCumulative: number | null;
      forecastCumulative: number | null;
    }[] = [];

    if (sheetData) {
      for (let i = 0; i < 12; i++) {
        const isActualPeriod = i + 1 <= asOfMonth;
        rows.push({
          month: MONTHS_2026[i],
          monthIndex: i + 1,
          targetCumulative: sheetData.target[i] ?? 0,
          actualCumulative: isActualPeriod ? (sheetData.actual[i] ?? null) : null,
          forecastCumulative: i + 1 >= asOfMonth ? (sheetData.forecast[i] ?? null) : null,
        });
      }
      return rows;
    }

    const pipelineDeals = getPipelineDeals();
    const { chartData: arrByMonth } = getForecastARR();
    const clientWinsPoints = getClientWins();
    const year = 2026;
    const annualTarget = annualTargets[metric];

    const targetCumulativeByMonth: number[] = [];
    for (let m = 1; m <= 12; m++) {
      targetCumulativeByMonth.push((annualTarget * m) / 12);
    }

    const actualByMonth: number[] = new Array(12).fill(0);
    const forecastByMonth: number[] = new Array(12).fill(0);

    if (metric === 'acv') {
      for (const d of pipelineDeals) {
        const monthNum = parseInt(d.closeDate.slice(5, 7), 10);
        if (monthNum >= 1 && monthNum <= 12) {
          if (d.closeDate <= `${year}-${String(asOfMonth).padStart(2, '0')}-31`) {
            actualByMonth[monthNum - 1] += d.acv;
          } else {
            forecastByMonth[monthNum - 1] += d.acv;
          }
        }
      }
    } else if (metric === 'clientWins') {
      const monthIndex: Record<string, number> = {};
      MONTHS_2026.forEach((name, i) => (monthIndex[name] = i));
      for (const point of clientWinsPoints) {
        const monthStr = point.period.replace(/\s*\d{4}$/, '');
        const i = monthIndex[monthStr] ?? 0;
        if (i >= 0 && i < 12) {
          if (i + 1 <= asOfMonth) {
            actualByMonth[i] += point.wins;
          } else {
            forecastByMonth[i] += point.wins;
          }
        }
      }
    } else {
      const monthIndex: Record<string, number> = {};
      MONTHS_2026.forEach((name, i) => (monthIndex[name] = i));
      for (const row of arrByMonth) {
        const i = monthIndex[row.month] ?? 0;
        const value = row.license + row.minimum + row.volumeDriven;
        if (i + 1 <= asOfMonth) {
          actualByMonth[i] += value;
        } else {
          forecastByMonth[i] += value;
        }
      }
    }

    let actualCum = 0;
    let forecastCum = 0;

    for (let i = 0; i < 12; i++) {
      const isActualPeriod = i + 1 <= asOfMonth;
      if (isActualPeriod) {
        actualCum += actualByMonth[i] + forecastByMonth[i];
        forecastCum = actualCum;
      } else {
        forecastCum += forecastByMonth[i];
      }
      rows.push({
        month: MONTHS_2026[i],
        monthIndex: i + 1,
        targetCumulative: targetCumulativeByMonth[i],
        actualCumulative: isActualPeriod ? actualCum : null,
        forecastCumulative: i + 1 >= asOfMonth ? forecastCum : null,
      });
    }

    return rows;
  }, [sheetData, metric, asOfMonth, getPipelineDeals, getForecastARR, getClientWins, getAnnualTargets, annualTargets]);

  const isCurrency = metric !== 'clientWins';
  const formatAxis = (v: number) => formatAxisValue(v, isCurrency);

  const metricLabel =
    metric === 'acv'
      ? 'ACV'
      : metric === 'inYearRevenue'
        ? 'In-year revenue'
        : metric === 'arrTarget'
          ? 'ARR target'
          : 'Client wins';

  return (
    <div className="sales-chart-card">
      <div className="sales-chart-header sales-chart-header-with-switch">
        <div>
          <h3 className="sales-chart-title">Cumulative {metricLabel} vs target</h3>
          <p className="sales-chart-sub">
            {sheetData
              ? 'Data from CumulativeChartData sheet. Target can be non-linear. Actual (solid) to latest period; Forecast (dashed) to Dec.'
              : 'Target line = cumulative annual target. Actual (solid) to latest period; Forecast (dashed) to Dec.'}
          </p>
          <p className="sales-overview-wip">Work in progress</p>
        </div>
        <div className="sales-view-switch">
          <span className="sales-view-switch-label">Metric:</span>
          <button
            type="button"
            className={`sales-view-switch-btn ${metric === 'acv' ? 'active' : ''}`}
            onClick={() => setMetric('acv')}
          >
            ACV
          </button>
          <button
            type="button"
            className={`sales-view-switch-btn ${metric === 'inYearRevenue' ? 'active' : ''}`}
            onClick={() => setMetric('inYearRevenue')}
          >
            In-year revenue
          </button>
          <button
            type="button"
            className={`sales-view-switch-btn ${metric === 'arrTarget' ? 'active' : ''}`}
            onClick={() => setMetric('arrTarget')}
          >
            ARR target
          </button>
          <button
            type="button"
            className={`sales-view-switch-btn ${metric === 'clientWins' ? 'active' : ''}`}
            onClick={() => setMetric('clientWins')}
          >
            Client wins
          </button>
        </div>
      </div>
      <div className="sales-chart-body">
        <ResponsiveContainer width="100%" height={360}>
          <LineChart data={chartData} margin={{ top: 16, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--sales-border)" />
            <XAxis
              dataKey="month"
              tick={{ fill: 'var(--sales-text-secondary)', fontSize: 12 }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => formatAxis(v)}
              tick={{ fill: 'var(--sales-text-secondary)', fontSize: 11 }}
            />
            <Tooltip
              formatter={(value: ValueType | undefined, name?: NameType) => {
                const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : 0;
                return [Number.isFinite(n) ? formatAxisValue(n, isCurrency) : '—', String(name ?? '')];
              }}
              labelFormatter={(label) => String(label ?? '')}
              contentStyle={{
                background: 'var(--sales-surface)',
                border: '1px solid var(--sales-border)',
                borderRadius: 12,
              }}
              labelStyle={{ color: 'var(--sales-text)' }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              formatter={(value) => (
                <span style={{ color: 'var(--sales-text)' }}>{String(value ?? '')}</span>
              )}
            />
            {chartData.some((d) => d.monthIndex === asOfMonth) && (
              <ReferenceLine
                x={MONTHS_2026[asOfMonth - 1]}
                stroke="var(--sales-muted)"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
            )}
            <Line
              type="monotone"
              dataKey="targetCumulative"
              name="Target (cumulative)"
              stroke="var(--sales-target-line)"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={{ fill: 'var(--sales-target-line)', r: 3 }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="actualCumulative"
              name="Actual"
              stroke="var(--sales-chart-1)"
              strokeWidth={2.5}
              dot={{ fill: 'var(--sales-chart-1)', r: 4 }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="forecastCumulative"
              name="Forecast"
              stroke="var(--sales-chart-3)"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={{ fill: 'var(--sales-chart-3)', r: 3 }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
        <p className="sales-chart-legend-note" style={{ marginTop: 8, fontSize: 12, color: 'var(--sales-muted)' }}>
          Vertical line: latest actual period ({MONTHS_2026[asOfMonth - 1]}). Actuals to the left; forecast to the right.
        </p>
      </div>
    </div>
  );
}
