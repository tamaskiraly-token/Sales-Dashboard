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
import { MonthDetailsModal } from './JanuaryDetailsModal';
import { NextStepsModal } from './NextStepsModal';

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

/** Metric for the quarterly projection waterfall: client wins (count), ACV signed, or in-year revenue */
export type QuarterProjectionMetric = 'clientWins' | 'acv' | 'inYearRevenue';

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

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
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
  const { getQuarterDeals, getQuarterTargets, getQuarterTargetForSegments, getQuarterTargetForDealOwners, getQuarterTargetSegmentNames, getQuarterDealOwnersFromSheet, getQuarterMetricInput, getQuarterMetricInputForSegments, getQuarterMetricInputForDealOwners, getQ1DetailsTable, getJanuaryDetailsTable, getFebruaryDetailsTable, getMarchDetailsTable } = useSalesData();
  const quarter = tabIdToQuarter(tabId);
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const [projectionMetric, setProjectionMetric] = useState<QuarterProjectionMetric>('acv');
  const [isJanuaryModalOpen, setIsJanuaryModalOpen] = useState(false);
  const [isFebruaryModalOpen, setIsFebruaryModalOpen] = useState(false);
  const [isMarchModalOpen, setIsMarchModalOpen] = useState(false);
  const [nextStepsModalContent, setNextStepsModalContent] = useState<string | null>(null);

  const allDeals = useMemo(() => getQuarterDeals(quarter), [quarter, getQuarterDeals]);
  const dealOwners = useMemo(() => {
    const fromSheet = getQuarterDealOwnersFromSheet(quarter);
    if (fromSheet.length > 0) return fromSheet;
    const fromDeals = Array.from(new Set(allDeals.map((d) => d.dealOwner))).sort();
    return fromDeals;
  }, [quarter, getQuarterDealOwnersFromSheet, allDeals]);
  const q1DetailsTable = useMemo(() => getQ1DetailsTable(), [getQ1DetailsTable]);
  const januaryDetailsTable = useMemo(() => getJanuaryDetailsTable(), [getJanuaryDetailsTable]);
  const februaryDetailsTable = useMemo(() => getFebruaryDetailsTable(), [getFebruaryDetailsTable]);
  const marchDetailsTable = useMemo(() => getMarchDetailsTable(), [getMarchDetailsTable]);

  const normalizeHeaderKey = (key: string): string => key.toLowerCase().replace(/[^a-z0-9]+/g, '');

  // Use exact, spaced labels for known columns (so acronyms like ACV / FY26 stay intact)
  const HEADER_LABEL_OVERRIDES: Record<string, string> = {
    q1pipeline: 'Q1 Pipeline',
    acv: 'ACV',
    fy26arrforecast: 'FY26 ARR Forecast',
    confidenceq1close: 'Confidence Q1 Close',
    weightedacv: 'Weighted ACV',
    status: 'Status',
    dealowner: 'Deal Owner',
    segment: 'Segment',
    monthclose: 'Month close',
  };

  const formatHeaderName = (key: string): string => {
    const override = HEADER_LABEL_OVERRIDES[normalizeHeaderKey(key)];
    if (override) return override;

    return key
      .replace(/_/g, ' ')
      .replace(/\//g, ' / ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
      .split(' ')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const q1DetailsView = useMemo(() => {
    if (quarter !== '2026Q1') return null;
    if (!q1DetailsTable || q1DetailsTable.length === 0) return null;

    // Check if column is "Latest / Next Steps" (various sheet naming conventions)
    const isLatestNextStepsColumn = (key: string): boolean => {
      const n = key.toLowerCase().replace(/[\s_\/]+/g, '');
      return (n.includes('latest') && (n.includes('nextstep') || n.includes('nextsteps'))) || n === 'latestnextsteps';
    };

    // Check if a value is numeric
    const isNumeric = (value: string): boolean => {
      if (!value || value.trim() === '') return false;
      const cleaned = value.replace(/[,$%]/g, '').trim();
      return !isNaN(Number(cleaned)) && cleaned !== '';
    };

    const allColumns = Object.keys(q1DetailsTable[0]);

    // Find segment column (e.g. "segment", "Segment")
    const segmentCol = allColumns.find((col) => normalizeHeaderKey(col) === 'segment');

    // Find deal owner column (e.g. "deal owner", "deal_owner", "dealowner")
    const dealOwnerCol = allColumns.find((col) => {
      const n = normalizeHeaderKey(col);
      return n === 'dealowner' || (n.includes('deal') && n.includes('owner'));
    });

    const latestNextStepsCol = allColumns.find((col) => isLatestNextStepsColumn(col));
    const displayColumns = allColumns.filter((col) => !isLatestNextStepsColumn(col));

    const monthCloseCol = allColumns.find((col) => normalizeHeaderKey(col) === 'monthclose');
    const statusCol = allColumns.find((col) => normalizeHeaderKey(col) === 'status');
    const acvCol = allColumns.find((col) => normalizeHeaderKey(col) === 'acv');
    const weightedAcvCol = allColumns.find((col) => normalizeHeaderKey(col) === 'weightedacv');
    const fy26ArrForecastCol = allColumns.find((col) => normalizeHeaderKey(col) === 'fy26arrforecast');
    const confidenceCol = allColumns.find((col) => normalizeHeaderKey(col) === 'confidenceq1close');

    // Find the FY26ARRFORECAST column index for validation (among display columns)
    const arrForecastColIndex = displayColumns.findIndex((col) => {
      const n = normalizeHeaderKey(col);
      return n.includes('fy26arrforecast') || n.includes('arrforecast') || n.includes('fy26arr');
    });

    // Filter out rows that look like headers or sub-headers
    const subHeaderPatterns = ['y/n', 'yes/no', 'latest', 'next steps', 'steps', 'header', 'sub-header', 'subheader'];

    const filteredRows = q1DetailsTable.filter((row) => {
      const matchingColumns = allColumns.filter((col) => {
        const rowValue = (row[col] ?? '').toLowerCase().trim();
        const colName = col.toLowerCase().trim();
        return rowValue === colName || rowValue === formatHeaderName(col).toLowerCase().trim();
      });

      if (matchingColumns.length > allColumns.length * 0.5) {
        return false;
      }

      const rowValues = allColumns.map((col) => (row[col] ?? '').toLowerCase().trim()).join(' ');
      const hasSubHeaderPattern = subHeaderPatterns.some((pattern) => rowValues.includes(pattern));

      if (hasSubHeaderPattern) {
        const numericValues = allColumns.filter((col) => isNumeric(row[col] ?? ''));
        if (numericValues.length < allColumns.length * 0.2) {
          return false;
        }
      }

      return true;
    });

    // Apply segment and deal owner filters (same as waterfall)
    let rowsToShow = filteredRows;
    if (segmentCol && selectedSegments.length > 0) {
      rowsToShow = rowsToShow.filter((row) => selectedSegments.includes((row[segmentCol] ?? '').trim()));
    }
    if (dealOwnerCol && selectedOwners.length > 0) {
      rowsToShow = rowsToShow.filter((row) => selectedOwners.includes((row[dealOwnerCol] ?? '').trim()));
    }

    return {
      allColumns,
      displayColumns,
      latestNextStepsCol,
      segmentCol,
      dealOwnerCol,
      monthCloseCol,
      statusCol,
      acvCol,
      weightedAcvCol,
      fy26ArrForecastCol,
      confidenceCol,
      arrForecastColIndex,
      rowsToShow,
    };
  }, [quarter, q1DetailsTable, selectedSegments, selectedOwners]);

  const segmentOptions = useMemo(() => {
    const fromDeals = Array.from(new Set(allDeals.map((d) => d.segment).filter(Boolean)));
    const fromTargets = getQuarterTargetSegmentNames(quarter);
    const combined = Array.from(new Set([...fromDeals, ...fromTargets])).sort();
    return combined.length > 0 ? combined : ['Bank & Bank Tech', 'Fintechs', 'Gateways', 'Large Merchants', 'HVHM'];
  }, [allDeals, quarter, getQuarterTargetSegmentNames]);

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
    const filtersActive = selectedSegments.length > 0 || selectedOwners.length > 0;

    // When no filters: use aggregated QuarterMetricInput
    const quarterMetricInput = !filtersActive ? getQuarterMetricInput(quarter, projectionMetric) : null;

    // When filters active: try segment/deal-owner filtered QuarterMetricInput first (has Signed/Forecasted by segment)
    const filteredMetricInputRaw =
      filtersActive && selectedOwners.length > 0
        ? getQuarterMetricInputForDealOwners(quarter, projectionMetric, selectedOwners)
        : filtersActive && selectedSegments.length > 0
          ? getQuarterMetricInputForSegments(quarter, projectionMetric, selectedSegments)
          : null;

    // If the sheet-based filtered metric exists but sums to all zeros (e.g. missing key),
    // fall back to deal-based logic (and for Q1, to the Q1 details table).
    const filteredMetricInput =
      filteredMetricInputRaw &&
      (filteredMetricInputRaw.monthSigned.some((v) => v !== 0) ||
        filteredMetricInputRaw.monthForecasted.some((v) => v !== 0) ||
        (filteredMetricInputRaw.carryOver ?? 0) !== 0)
        ? filteredMetricInputRaw
        : null;

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
    } else if (filteredMetricInput) {
      monthSigned = filteredMetricInput.monthSigned;
      monthForecasted = filteredMetricInput.monthForecasted;
      effectiveCarryOver = filteredMetricInput.carryOver ?? 0;
      if (selectedOwners.length > 0) {
        targetValue = getQuarterTargetForDealOwners(quarter, projectionMetric, selectedOwners);
      } else {
        targetValue = getQuarterTargetForSegments(quarter, projectionMetric, selectedSegments);
      }
      if (projectionMetric === 'clientWins') targetValue = Math.round(targetValue);
      else targetValue = Math.round(targetValue / 1000) * 1000;
    } else {
      effectiveCarryOver = carryOver;
      const monthNums = QUARTER_MONTH_NUMS[quarter];
      const year = 2026;
      monthSigned = [];
      monthForecasted = [];

      const parseCompactNumber = (raw: string): number => {
        const s = String(raw ?? '').trim();
        if (!s) return 0;
        const cleaned = s.replace(/[$,]/g, '').replace(/\s+/g, '').trim();
        const m = cleaned.match(/^(-?\d+(?:\.\d+)?)([kKmM])?$/);
        if (m) {
          const base = Number(m[1]);
          const suffix = (m[2] ?? '').toLowerCase();
          if (!Number.isFinite(base)) return 0;
          if (suffix === 'k') return base * 1_000;
          if (suffix === 'm') return base * 1_000_000;
          return base;
        }
        // fallback: strip anything non-numeric-ish
        const fallback = Number(cleaned.replace(/[^0-9.\-]/g, ''));
        return Number.isFinite(fallback) ? fallback : 0;
      };

      const parseMonthIndex = (raw: string): number | null => {
        const s = String(raw ?? '').trim().toLowerCase();
        if (!s) return null;
        if (s.startsWith('jan')) return 0;
        if (s.startsWith('feb')) return 1;
        if (s.startsWith('mar')) return 2;
        // numeric month (1/2/3) or YYYY-MM-...
        const dateLike = s.match(/^(\d{4})-(\d{2})/);
        if (dateLike) {
          const mm = parseInt(dateLike[2], 10);
          if (mm === 1) return 0;
          if (mm === 2) return 1;
          if (mm === 3) return 2;
          return null;
        }
        const n = parseInt(s, 10);
        if (n === 1) return 0;
        if (n === 2) return 1;
        if (n === 3) return 2;
        return null;
      };

      const isSignedStatus = (raw: string): boolean => {
        const s = String(raw ?? '').toLowerCase().replace(/\s+/g, '');
        if (!s) return false;
        return s.includes('signed') || s.includes('closedwon') || (s.includes('closed') && s.includes('won')) || s === 'won';
      };

      const useQ1DetailsFallback =
        quarter === '2026Q1' &&
        deals.length === 0 &&
        q1DetailsView?.rowsToShow &&
        q1DetailsView.rowsToShow.length > 0;

      if (useQ1DetailsFallback) {
        const signedAcc = [0, 0, 0];
        const forecastAcc = [0, 0, 0];

        for (const row of q1DetailsView.rowsToShow) {
          const monthRaw = q1DetailsView.monthCloseCol ? (row[q1DetailsView.monthCloseCol] ?? '') : '';
          const monthIdx = parseMonthIndex(String(monthRaw));
          if (monthIdx == null) continue;

          let value = 0;
          if (projectionMetric === 'clientWins') {
            value = 1;
          } else if (projectionMetric === 'acv') {
            const acvRaw = q1DetailsView.acvCol ? (row[q1DetailsView.acvCol] ?? '') : '';
            const weightedRaw = q1DetailsView.weightedAcvCol ? (row[q1DetailsView.weightedAcvCol] ?? '') : '';
            value = parseCompactNumber(String(acvRaw)) || parseCompactNumber(String(weightedRaw));
          } else {
            const arrRaw = q1DetailsView.fy26ArrForecastCol ? (row[q1DetailsView.fy26ArrForecastCol] ?? '') : '';
            value = parseCompactNumber(String(arrRaw));
          }

          if (!value) continue;
          const statusRaw = q1DetailsView.statusCol ? (row[q1DetailsView.statusCol] ?? '') : '';
          if (isSignedStatus(String(statusRaw))) signedAcc[monthIdx] += value;
          else forecastAcc[monthIdx] += value;
        }

        monthSigned = signedAcc;
        monthForecasted = forecastAcc;
      } else {
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
      }

      if (selectedOwners.length > 0) {
        targetValue = getQuarterTargetForDealOwners(quarter, projectionMetric, selectedOwners);
      } else if (selectedSegments.length > 0) {
        targetValue = getQuarterTargetForSegments(quarter, projectionMetric, selectedSegments);
      } else {
        const targets = getQuarterTargets(quarter);
        const fullTarget =
          projectionMetric === 'clientWins'
            ? targets.clientWins
            : projectionMetric === 'acv'
              ? targets.acv
              : targets.inYearRevenue;
        targetValue = fullTarget;
      }
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
    selectedSegments,
    selectedOwners,
    projectionMetric,
    asOfDate,
    carryOver,
    getQuarterMetricInput,
    getQuarterMetricInputForSegments,
    getQuarterMetricInputForDealOwners,
    getQuarterTargets,
    getQuarterTargetForSegments,
    getQuarterTargetForDealOwners,
    q1DetailsView,
  ]);

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

  /** Show total (signed + forecasted) for each month column. Use on Forecasted bar when forecasted > 0. */
  const renderMonthTotalLabelOnForecasted = (props: {
    x?: number;
    y?: number;
    width?: number;
    index?: number;
    payload?: WaterfallRow;
  }) => {
    const { x = 0, y = 0, width = 0, index = 0, payload } = props;
    const row = payload ?? waterfallData[index];
    if (!row || row.isTarget || row.isTotal || row.forecasted === 0) return null;
    const labels = QUARTER_MONTH_LABELS[quarter];
    if (!labels.includes(row.name)) return null;
    const total = getWaterfallRowValue(row);
    const displayValue = formatProjectionValue(total);
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

  /** Show total for month column when only Signed (no forecasted) – on Signed bar so label is at top. */
  const renderMonthTotalLabelOnSigned = (props: {
    x?: number;
    y?: number;
    width?: number;
    index?: number;
    payload?: WaterfallRow;
  }) => {
    const { x = 0, y = 0, width = 0, index = 0, payload } = props;
    const row = payload ?? waterfallData[index];
    if (!row || row.isTarget || row.isTotal || row.forecasted !== 0) return null;
    const labels = QUARTER_MONTH_LABELS[quarter];
    if (!labels.includes(row.name)) return null;
    const total = getWaterfallRowValue(row);
    if (total === 0) return null;
    const displayValue = formatProjectionValue(total);
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

  /** Show label on Forecasted bar for non-month rows; month row totals are shown by renderMonthTotalLabel. */
  const renderWaterfallLabel = (props: {
    x?: number;
    y?: number;
    width?: number;
    value?: number;
    index?: number;
    payload?: WaterfallRow;
  }) => {
    const { index = 0, payload } = props;
    const row = payload ?? waterfallData[index];
    if (row?.isTarget) return null;
    const labels = QUARTER_MONTH_LABELS[quarter];
    if (row && labels.includes(row.name)) return null; // month total shown by renderMonthTotalLabel
    if (row && row.forecasted === 0) return null;
    const total = row ? getWaterfallRowValue(row) : 0;
    const displayValue = row ? formatProjectionValue(total) : '';
    if (!row || total === 0) return null;
    const { x = 0, y = 0, width = 0 } = props;
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
          Deals anticipated to close in this quarter. Filter below, then view the quarterly waterfall.
        </p>
      </header>

      <div className="sales-accounts-filters sales-chart-card">
        <div className="sales-accounts-filters-row">
          <SegmentMultiselect
            selectedSegments={selectedSegments}
            onChange={setSelectedSegments}
            segmentOptions={segmentOptions}
          />
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
                {waterfallData.map((entry, index) => {
                  const isClickable = quarter === '2026Q1' && (entry.name === 'Jan' || entry.name === 'Feb' || entry.name === 'Mar');
                  return (
                    <Cell
                      key={`signed-${index}`}
                      style={{
                        cursor: isClickable ? 'pointer' : 'default',
                      }}
                      onClick={() => {
                        if (quarter === '2026Q1') {
                          if (entry.name === 'Jan') setIsJanuaryModalOpen(true);
                          else if (entry.name === 'Feb') setIsFebruaryModalOpen(true);
                          else if (entry.name === 'Mar') setIsMarchModalOpen(true);
                        }
                      }}
                    />
                  );
                })}
                <LabelList content={renderWaterfallLabelSignedOnly as any} position="top" />
                <LabelList content={renderMonthTotalLabelOnSigned as any} position="top" />
              </Bar>
              <Bar dataKey="forecasted" name="Forecasted" stackId="wf" fill="var(--sales-chart-3)" radius={[4, 4, 0, 0]}>
                {waterfallData.map((entry, index) => {
                  const isClickable = quarter === '2026Q1' && (entry.name === 'Jan' || entry.name === 'Feb' || entry.name === 'Mar');
                  return (
                    <Cell
                      key={`forecasted-${index}`}
                      style={{
                        cursor: isClickable ? 'pointer' : 'default',
                      }}
                      onClick={() => {
                        if (quarter === '2026Q1') {
                          if (entry.name === 'Jan') setIsJanuaryModalOpen(true);
                          else if (entry.name === 'Feb') setIsFebruaryModalOpen(true);
                          else if (entry.name === 'Mar') setIsMarchModalOpen(true);
                        }
                      }}
                    />
                  );
                })}
                <LabelList content={renderWaterfallLabel as any} position="top" />
                <LabelList content={renderMonthTotalLabelOnForecasted as any} position="top" />
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

      {quarter === '2026Q1' && q1DetailsView && q1DetailsView.rowsToShow.length > 0 && (() => {
        const { displayColumns, latestNextStepsCol, allColumns, rowsToShow, arrForecastColIndex } = q1DetailsView;

        // Check if a value is numeric
        const isNumeric = (value: string): boolean => {
          if (!value || value.trim() === '') return false;
          const cleaned = value.replace(/[,$%]/g, '').trim();
          return !isNaN(Number(cleaned)) && cleaned !== '';
        };

        // Format number with thousands separator
        const formatNumber = (value: string): string => {
          if (!value || value.trim() === '') return '';
          const num = parseFloat(value.replace(/[,$]/g, ''));
          if (isNaN(num)) return value;
          return num.toLocaleString('en-US');
        };

        return (
          <div className="sales-accounts-table-wrap sales-chart-card">
            <div className="sales-accounts-table-meta">Q1 details (click a row to view Latest / Next Steps)</div>
            <div className="sales-accounts-table-scroll sales-q1-table-scroll">
              <table className="sales-accounts-table sales-q1-details-table">
                <thead>
                  <tr>
                    {displayColumns.map((key) => (
                      <th key={key} className="sales-q1-details-th">
                        {formatHeaderName(key)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rowsToShow.map((row, i) => {
                    const nextStepsValue = latestNextStepsCol ? (row[latestNextStepsCol] ?? '').toString().trim() : '';
                    const hasAllColumns = allColumns.every(col => col in row);
                    if (!hasAllColumns) {
                      console.warn(`[Q1DetailsTable] Row ${i} missing columns:`,
                        allColumns.filter(col => !(col in row))
                      );
                    }

                    if (arrForecastColIndex >= 0 && i < 3) {
                      const arrForecastKey = displayColumns[arrForecastColIndex];
                      const arrForecastValue = row[arrForecastKey];
                      const nextColValue = displayColumns[arrForecastColIndex + 1] ? row[displayColumns[arrForecastColIndex + 1]] : null;
                      if (arrForecastValue && !isNumeric(arrForecastValue) && nextColValue && isNumeric(nextColValue)) {
                        console.warn(`[Q1DetailsTable] Row ${i}: Possible misalignment detected.`);
                      }
                    }

                    return (
                      <tr
                        key={i}
                        className="sales-q1-details-row"
                        onClick={() => setNextStepsModalContent(nextStepsValue)}
                        style={{ cursor: 'pointer' }}
                        title="Click to view Latest / Next Steps"
                      >
                        {displayColumns.map((key, colIndex) => {
                          const value = (row[key] ?? '').toString().trim();
                          const formattedValue = isNumeric(value) && !value.includes('%')
                            ? formatNumber(value)
                            : value;
                          const isArrForecastCol = colIndex === arrForecastColIndex;
                          const mightBeMisaligned = isArrForecastCol && value && !isNumeric(value) && value.length > 0;

                          return (
                            <td
                              key={key}
                              className="sales-q1-details-td"
                              style={{
                                textAlign: 'center',
                                backgroundColor: mightBeMisaligned ? 'rgba(255, 200, 0, 0.1)' : 'transparent',
                              }}
                              title={mightBeMisaligned ? 'This value might be misaligned' : undefined}
                            >
                              {formattedValue}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {(() => {
                    const numericColumns = displayColumns.filter(key =>
                      rowsToShow.some(row => {
                        const value = (row[key] ?? '').toString().trim();
                        return isNumeric(value) && !value.includes('%');
                      })
                    );

                    if (numericColumns.length === 0) return null;

                    return (
                      <tr style={{ fontWeight: 700, backgroundColor: 'var(--sales-accent-soft)' }}>
                        {displayColumns.map((key, colIndex) => {
                          const isNumericCol = numericColumns.includes(key);
                          if (isNumericCol) {
                            const total = rowsToShow.reduce((sum, row) => {
                              const val = (row[key] ?? '').toString().trim();
                              if (isNumeric(val) && !val.includes('%')) {
                                return sum + parseFloat(val.replace(/[,$]/g, ''));
                              }
                              return sum;
                            }, 0);
                            return (
                              <td key={key} className="sales-q1-details-td" style={{ fontWeight: 700, textAlign: 'center' }}>
                                {formatNumber(total.toString())}
                              </td>
                            );
                          }
                          const isFirstColumn = colIndex === 0;
                          return (
                            <td key={key} className="sales-q1-details-td" style={{ fontWeight: 700, textAlign: 'center' }}>
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
          </div>
        );
      })()}

      {quarter === '2026Q1' && (
        <>
          <NextStepsModal
            isOpen={nextStepsModalContent !== null}
            onClose={() => setNextStepsModalContent(null)}
            content={nextStepsModalContent ?? ''}
          />
          <MonthDetailsModal
            isOpen={isJanuaryModalOpen}
            onClose={() => setIsJanuaryModalOpen(false)}
            data={januaryDetailsTable}
            month="Jan"
          />
          <MonthDetailsModal
            isOpen={isFebruaryModalOpen}
            onClose={() => setIsFebruaryModalOpen(false)}
            data={februaryDetailsTable}
            month="Feb"
          />
          <MonthDetailsModal
            isOpen={isMarchModalOpen}
            onClose={() => setIsMarchModalOpen(false)}
            data={marchDetailsTable}
            month="Mar"
          />
        </>
      )}
    </div>
  );
}
