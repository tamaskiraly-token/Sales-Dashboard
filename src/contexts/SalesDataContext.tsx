import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { loadGoogleSheetsData, isGoogleSheetsConfigured } from '../data/googleSheetsLoader';
import type {
  LoadedSalesData,
  CumulativeChartMetricKey,
  QuarterProjectionMetricKey,
} from '../data/googleSheetsLoader';
import { loadApiData, isApiConfigured } from '../data/apiLoader';
import {
  getSalesKPIs,
  getForecastOverTime,
  getPipelineByStage,
  getDealDistribution,
  getForecastARRWithDetails,
  getPipelineDeals2026,
  getACVByMonth2026,
  getDealsByMonth2026,
  getClientWinsOverTime,
  getClientDeals,
  getDealsByQuarter,
} from '../data/salesMockData';
import type { QuarterId } from '../data/salesMockData';

/** Annual targets for cumulative vs target chart. Used when not provided by sheet. */
const DEFAULT_ANNUAL_TARGETS = {
  acv: 3_200_000,
  inYearRevenue: 2_800_000,
  arrTarget: 2_900_000,
  clientWins: 52,
} as const;

/** Quarter targets for quarter waterfall. Used when QuarterTargets sheet not provided. */
const DEFAULT_QUARTER_TARGETS: Record<QuarterId, { clientWins: number; acv: number; inYearRevenue: number; arrTarget: number }> = {
  '2026Q1': { clientWins: 10, acv: 600000, inYearRevenue: 550000, arrTarget: 0 },
  '2026Q2': { clientWins: 12, acv: 720000, inYearRevenue: 660000, arrTarget: 0 },
  '2026Q3': { clientWins: 14, acv: 840000, inYearRevenue: 770000, arrTarget: 0 },
  '2026Q4': { clientWins: 16, acv: 960000, inYearRevenue: 880000, arrTarget: 0 },
};

export type AnnualTargets = { acv: number; inYearRevenue: number; arrTarget: number; clientWins: number };

type SalesDataContextValue = {
  /** When true, SQL API is configured and we're loading or using it */
  useApi: boolean;
  /** When true, Google Sheets is configured (only used if API is not) */
  useGoogleSheets: boolean;
  /** Loaded data from API or Google (null until loaded or when using mock) */
  googleData: LoadedSalesData | null;
  loading: boolean;
  error: string | null;
  /** Reload data from API or Google Sheets (no-op when using mock) */
  refetch: () => void;
  /** Use these getters; they return Google data when available, else mock */
  getKPIs: () => ReturnType<typeof getSalesKPIs>;
  getForecastLine: (selectedSegments?: string[]) => ReturnType<typeof getForecastOverTime>;
  getPipelineStages: () => ReturnType<typeof getPipelineByStage>;
  getDealDist: (selectedSegments?: string[]) => ReturnType<typeof getDealDistribution>;
  getForecastARR: () => ReturnType<typeof getForecastARRWithDetails>;
  getPipelineDeals: () => ReturnType<typeof getPipelineDeals2026>;
  getACVByMonth: (deals: ReturnType<typeof getPipelineDeals2026>) => ReturnType<typeof getACVByMonth2026>;
  getDealsByMonth: (deals: ReturnType<typeof getPipelineDeals2026>) => ReturnType<typeof getDealsByMonth2026>;
  getClientWins: () => ReturnType<typeof getClientWinsOverTime>;
  getClientDealsList: () => ReturnType<typeof getClientDeals>;
  getQuarterDeals: (quarter: QuarterId) => ReturnType<typeof getDealsByQuarter>;
  /** Annual targets for cumulative chart (from SalesKPIs sheet or defaults) */
  getAnnualTargets: () => AnnualTargets;
  /** Quarter targets for quarter tab waterfall (from QuarterTargets sheet or defaults) */
  getQuarterTargets: (quarter: QuarterId) => { clientWins: number; acv: number; inYearRevenue: number; arrTarget: number };
  /** Quarter target for selected segments only (from QuarterMetricInput Target rows). Use when segment filter is active. */
  getQuarterTargetForSegments: (quarter: QuarterId, metric: QuarterProjectionMetricKey, segments: string[]) => number;
  /** Quarter target for selected deal owners only (from QuarterMetricInput Target rows). Use when deal owner filter is active. */
  getQuarterTargetForDealOwners: (quarter: QuarterId, metric: QuarterProjectionMetricKey, owners: string[]) => number;
  /** Segment names that have a quarter target in QuarterMetricInput (so filter dropdown can show all 5 segments). */
  getQuarterTargetSegmentNames: (quarter: QuarterId) => string[];
  /** Deal owner names from QuarterMetricInput sheet for the Quarter tab filter (not from deals). */
  getQuarterDealOwnersFromSheet: (quarter: QuarterId) => string[];
  /** Cumulative chart: Actual/Forecast/Target per month from CumulativeChartData sheet, or null to use computed + linear target */
  getCumulativeChartData: (metric: CumulativeChartMetricKey) => { actual: number[]; forecast: number[]; target: number[] } | null;
  /** Quarter waterfall: Signed/Forecasted per month from QuarterMetricInput sheet, or null to use deal-based logic */
  getQuarterMetricInput: (quarter: QuarterId, metric: QuarterProjectionMetricKey) => { monthSigned: number[]; monthForecasted: number[]; quarterTarget: number; carryOver: number } | null;
  /** Quarter waterfall by segment: for use when segment filter is active */
  getQuarterMetricInputForSegments: (quarter: QuarterId, metric: QuarterProjectionMetricKey, segments: string[]) => { monthSigned: number[]; monthForecasted: number[]; carryOver: number } | null;
  /** Quarter waterfall by deal owner: for use when deal owner filter is active */
  getQuarterMetricInputForDealOwners: (quarter: QuarterId, metric: QuarterProjectionMetricKey, owners: string[]) => { monthSigned: number[]; monthForecasted: number[]; carryOver: number } | null;
  /** Q1 details table from Q1details sheet (for Q1 tab below waterfall). */
  getQ1DetailsTable: () => Record<string, string>[];
  /** Q2 details table from Q2details sheet (for Q2 tab below waterfall). */
  getQ2DetailsTable: () => Record<string, string>[];
  /** January details table from JanuaryDetails sheet (for pop-up when clicking January bars). */
  getJanuaryDetailsTable: () => Record<string, string>[];
  /** February details table from Febdetails sheet (for pop-up when clicking February bars). */
  getFebruaryDetailsTable: () => Record<string, string>[];
  /** March details table from Mardetails sheet (for pop-up when clicking March bars). */
  getMarchDetailsTable: () => Record<string, string>[];
};

const SalesDataContext = createContext<SalesDataContextValue | null>(null);

export function SalesDataProvider({ children }: { children: ReactNode }) {
  const [googleData, setGoogleData] = useState<LoadedSalesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* Prefer Google Sheets when configured; use API only when Sheets is not configured */
  const useGoogleSheets = isGoogleSheetsConfigured();
  const useApi = !useGoogleSheets && isApiConfigured();

  const loadData = useCallback(() => {
    if (useApi) {
      setLoading(true);
      setError(null);
      loadApiData()
        .then(setGoogleData)
        .catch((e) => setError(e instanceof Error ? e.message : String(e)))
        .finally(() => setLoading(false));
      return;
    }
    if (useGoogleSheets) {
      setLoading(true);
      setError(null);
      loadGoogleSheetsData()
        .then(setGoogleData)
        .catch((e) => setError(e instanceof Error ? e.message : String(e)))
        .finally(() => setLoading(false));
    }
  }, [useApi, useGoogleSheets]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getKPIs = useCallback(() => {
    if (googleData?.salesKPIs) return googleData.salesKPIs;
    return getSalesKPIs();
  }, [googleData]);

  const getForecastLine = useCallback(
    (selectedSegments?: string[]) => {
      if (googleData && selectedSegments?.length) {
        const filtered = googleData.forecastPointBySegment.filter((r) =>
          selectedSegments.includes(r.segment)
        );
        const byMonth = new Map<string, { forecast: number; target: number }>();
        for (const r of filtered) {
          const cur = byMonth.get(r.month) ?? { forecast: 0, target: 0 };
          cur.forecast += r.forecast;
          cur.target += r.target;
          byMonth.set(r.month, cur);
        }
        return Array.from(byMonth.entries()).map(([month, cur]) => ({
          month,
          forecast: cur.forecast,
          target: cur.target,
        }));
      }
      if (googleData) return googleData.forecastPoint;
      return getForecastOverTime(selectedSegments);
    },
    [googleData]
  );

  const getPipelineStages = useCallback(() => {
    if (googleData) return googleData.pipelineStage;
    return getPipelineByStage();
  }, [googleData]);

  const getDealDist = useCallback(
    (selectedSegments?: string[]) => {
      if (googleData) {
        const segs = selectedSegments;
        const list =
          segs && segs.length > 0
            ? googleData.dealSegment.filter((s) => segs.includes(s.name))
            : googleData.dealSegment;
        const total = list.reduce((a, s) => a + s.value, 0);
        const normalized =
          total > 0 ? list.map((s) => ({ ...s, value: Math.round((s.value / total) * 100) })) : list;
        return normalized;
      }
      return getDealDistribution(selectedSegments);
    },
    [googleData]
  );

  const getForecastARR = useCallback(() => {
    if (googleData) {
      return {
        chartData: googleData.arrByMonthPoint,
        detailsByMonth: googleData.detailsByMonth ?? {},
      };
    }
    return getForecastARRWithDetails();
  }, [googleData]);

  const getPipelineDeals = useCallback(() => {
    if (googleData) return googleData.pipelineDeal;
    return getPipelineDeals2026();
  }, [googleData]);

  const getACVByMonth = useCallback(
    (deals: ReturnType<typeof getPipelineDeals2026>) => {
      if (googleData) return googleData.acvByMonth;
      return getACVByMonth2026(deals);
    },
    [googleData]
  );

  const getDealsByMonth = useCallback(
    (deals: ReturnType<typeof getPipelineDeals2026>) => getDealsByMonth2026(deals),
    []
  );

  const getClientWins = useCallback(() => {
    if (googleData) return googleData.clientWinsPoint;
    return getClientWinsOverTime();
  }, [googleData]);

  const getClientDealsList = useCallback(() => {
    if (googleData) return googleData.clientDeal;
    return getClientDeals();
  }, [googleData]);

  const getQuarterDeals = useCallback(
    (quarter: QuarterId) => {
      if (googleData) {
        const quarterMonths: Record<QuarterId, number[]> = {
          '2026Q1': [1, 2, 3],
          '2026Q2': [4, 5, 6],
          '2026Q3': [7, 8, 9],
          '2026Q4': [10, 11, 12],
        };
        const months = quarterMonths[quarter];
        return googleData.quarterDeal.filter((d) => {
          const m = parseInt(d.closeDate.slice(5, 7), 10);
          return months.includes(m);
        });
      }
      return getDealsByQuarter(quarter);
    },
    [googleData]
  );

  const getAnnualTargets = useCallback((): AnnualTargets => {
    const kpis = googleData?.salesKPIs;
    return {
      acv: (kpis?.annualACVTarget && kpis.annualACVTarget > 0) ? kpis.annualACVTarget : DEFAULT_ANNUAL_TARGETS.acv,
      inYearRevenue: (kpis?.annualInYearRevenueTarget && kpis.annualInYearRevenueTarget > 0) ? kpis.annualInYearRevenueTarget : DEFAULT_ANNUAL_TARGETS.inYearRevenue,
      arrTarget: (kpis?.annualARRTarget && kpis.annualARRTarget > 0) ? kpis.annualARRTarget : DEFAULT_ANNUAL_TARGETS.arrTarget,
      clientWins: (kpis?.annualClientWinsTarget && kpis.annualClientWinsTarget > 0) ? kpis.annualClientWinsTarget : DEFAULT_ANNUAL_TARGETS.clientWins,
    };
  }, [googleData]);

  const getQuarterTargets = useCallback(
    (quarter: QuarterId): { clientWins: number; acv: number; inYearRevenue: number; arrTarget: number } => {
      const fromSheet = googleData?.quarterTargets?.[quarter];
      const byOwner = googleData?.quarterTargetByDealOwner?.[quarter];
      const sumFromByOwner = (metric: 'clientWins' | 'acv' | 'inYearRevenue' | 'arrTarget') =>
        byOwner ? Object.values(byOwner[metric] ?? {}).reduce((a, v) => a + v, 0) : 0;

      if (fromSheet && (fromSheet.clientWins > 0 || fromSheet.acv > 0 || fromSheet.inYearRevenue > 0 || (fromSheet as { arrTarget?: number }).arrTarget > 0)) {
        const sheetArrTarget = (fromSheet as { arrTarget?: number }).arrTarget ?? 0;
        return {
          clientWins: fromSheet.clientWins,
          acv: fromSheet.acv,
          inYearRevenue: fromSheet.inYearRevenue,
          arrTarget: sheetArrTarget > 0 ? sheetArrTarget : sumFromByOwner('arrTarget'),
        };
      }
      if (byOwner) {
        const clientWins = sumFromByOwner('clientWins');
        const acv = sumFromByOwner('acv');
        const inYearRevenue = sumFromByOwner('inYearRevenue');
        const arrTarget = sumFromByOwner('arrTarget');
        if (clientWins > 0 || acv > 0 || inYearRevenue > 0 || arrTarget > 0) {
          return { clientWins, acv, inYearRevenue, arrTarget };
        }
      }
      return DEFAULT_QUARTER_TARGETS[quarter];
    },
    [googleData]
  );

  const getQuarterTargetForSegments = useCallback(
    (quarter: QuarterId, metric: QuarterProjectionMetricKey, segments: string[]): number => {
      const tFromQuarter = () => {
        const t = getQuarterTargets(quarter);
        return metric === 'clientWins' ? t.clientWins : metric === 'acv' ? t.acv : metric === 'arrTarget' ? t.arrTarget : t.inYearRevenue;
      };
      if (segments.length === 0) return tFromQuarter();
      const bySegment = googleData?.quarterTargetBySegment?.[quarter]?.[metric];
      if (!bySegment) return tFromQuarter();
      let sum = 0;
      for (const seg of segments) {
        const trimmed = seg.trim();
        if (bySegment[trimmed] != null) sum += bySegment[trimmed];
        else if (bySegment[seg] != null) sum += bySegment[seg];
      }
      return sum;
    },
    [googleData, getQuarterTargets]
  );

  const getQuarterTargetForDealOwners = useCallback(
    (quarter: QuarterId, metric: QuarterProjectionMetricKey, owners: string[]): number => {
      const tFromQuarter = () => {
        const t = getQuarterTargets(quarter);
        return metric === 'clientWins' ? t.clientWins : metric === 'acv' ? t.acv : metric === 'arrTarget' ? t.arrTarget : t.inYearRevenue;
      };
      if (owners.length === 0) return tFromQuarter();
      const byOwner = googleData?.quarterTargetByDealOwner?.[quarter]?.[metric];
      if (!byOwner) return tFromQuarter();
      let sum = 0;
      for (const owner of owners) {
        const trimmed = owner.trim();
        if (byOwner[trimmed] != null) sum += byOwner[trimmed];
        else if (byOwner[owner] != null) sum += byOwner[owner];
      }
      return sum;
    },
    [googleData, getQuarterTargets]
  );

  const getQuarterTargetSegmentNames = useCallback(
    (quarter: QuarterId): string[] => {
      const byQuarter = googleData?.quarterTargetBySegment?.[quarter];
      if (!byQuarter) return [];
      const set = new Set<string>();
      for (const bySegment of Object.values(byQuarter)) {
        for (const seg of Object.keys(bySegment)) {
          if (seg) set.add(seg);
        }
      }
      return Array.from(set).sort();
    },
    [googleData]
  );

  const getQuarterDealOwnersFromSheet = useCallback(
    (quarter: QuarterId): string[] => {
      return googleData?.quarterDealOwners?.[quarter] ?? [];
    },
    [googleData]
  );

  const getCumulativeChartData = useCallback(
    (metric: CumulativeChartMetricKey): { actual: number[]; forecast: number[]; target: number[] } | null => {
      const data = googleData?.cumulativeChartData?.[metric];
      if (!data || !data.actual?.length) return null;
      return {
        actual: data.actual.length >= 12 ? data.actual.slice(0, 12) : [...data.actual, ...new Array(12 - data.actual.length).fill(0)],
        forecast: data.forecast?.length >= 12 ? data.forecast.slice(0, 12) : (data.forecast ? [...data.forecast, ...new Array(12 - data.forecast.length).fill(0)] : new Array(12).fill(0)),
        target: data.target?.length >= 12 ? data.target.slice(0, 12) : (data.target ? [...data.target, ...new Array(12 - data.target.length).fill(0)] : new Array(12).fill(0)),
      };
    },
    [googleData]
  );

  const getQuarterMetricInput = useCallback(
    (quarter: QuarterId, metric: QuarterProjectionMetricKey): { monthSigned: number[]; monthForecasted: number[]; quarterTarget: number; carryOver: number } | null => {
      const byQuarter = googleData?.quarterMetricInput?.[quarter];
      const byMetric = byQuarter?.[metric];
      if (!byMetric) return null;
      return {
        monthSigned: byMetric.monthSigned.slice(0, 3),
        monthForecasted: byMetric.monthForecasted.slice(0, 3),
        quarterTarget: byMetric.quarterTarget,
        carryOver: byMetric.carryOver ?? 0,
      };
    },
    [googleData]
  );

  const getQuarterMetricInputForSegments = useCallback(
    (quarter: QuarterId, metric: QuarterProjectionMetricKey, segments: string[]): { monthSigned: number[]; monthForecasted: number[]; carryOver: number } | null => {
      if (segments.length === 0) return null;
      const bySegment = googleData?.quarterMetricInputBySegment?.[quarter]?.[metric];
      if (!bySegment) return null;
      const monthSigned = [0, 0, 0];
      const monthForecasted = [0, 0, 0];
      let carryOver = 0;
      for (const seg of segments) {
        const trimmed = seg.trim();
        const entry = bySegment[trimmed] ?? bySegment[seg];
        if (!entry) continue;
        monthSigned[0] += entry.monthSigned[0] ?? 0;
        monthSigned[1] += entry.monthSigned[1] ?? 0;
        monthSigned[2] += entry.monthSigned[2] ?? 0;
        monthForecasted[0] += entry.monthForecasted[0] ?? 0;
        monthForecasted[1] += entry.monthForecasted[1] ?? 0;
        monthForecasted[2] += entry.monthForecasted[2] ?? 0;
        carryOver += entry.carryOver ?? 0;
      }
      return { monthSigned, monthForecasted, carryOver };
    },
    [googleData]
  );

  const getQuarterMetricInputForDealOwners = useCallback(
    (quarter: QuarterId, metric: QuarterProjectionMetricKey, owners: string[]): { monthSigned: number[]; monthForecasted: number[]; carryOver: number } | null => {
      if (owners.length === 0) return null;
      const byOwner = googleData?.quarterMetricInputByDealOwner?.[quarter]?.[metric];
      if (!byOwner) return null;
      const monthSigned = [0, 0, 0];
      const monthForecasted = [0, 0, 0];
      let carryOver = 0;
      for (const owner of owners) {
        const trimmed = owner.trim();
        const entry = byOwner[trimmed] ?? byOwner[owner];
        if (!entry) continue;
        monthSigned[0] += entry.monthSigned[0] ?? 0;
        monthSigned[1] += entry.monthSigned[1] ?? 0;
        monthSigned[2] += entry.monthSigned[2] ?? 0;
        monthForecasted[0] += entry.monthForecasted[0] ?? 0;
        monthForecasted[1] += entry.monthForecasted[1] ?? 0;
        monthForecasted[2] += entry.monthForecasted[2] ?? 0;
        carryOver += entry.carryOver ?? 0;
      }
      return { monthSigned, monthForecasted, carryOver };
    },
    [googleData]
  );

  const getQ1DetailsTable = useCallback((): Record<string, string>[] => {
    return googleData?.q1DetailsTable ?? [];
  }, [googleData]);

  const getQ2DetailsTable = useCallback((): Record<string, string>[] => {
    return googleData?.q2DetailsTable ?? [];
  }, [googleData]);

  const getJanuaryDetailsTable = useCallback((): Record<string, string>[] => {
    return googleData?.januaryDetailsTable ?? [];
  }, [googleData]);

  const getFebruaryDetailsTable = useCallback((): Record<string, string>[] => {
    return googleData?.februaryDetailsTable ?? [];
  }, [googleData]);

  const getMarchDetailsTable = useCallback((): Record<string, string>[] => {
    return googleData?.marchDetailsTable ?? [];
  }, [googleData]);

  const value: SalesDataContextValue = {
    useApi,
    useGoogleSheets,
    googleData,
    loading,
    error,
    refetch: loadData,
    getKPIs,
    getForecastLine,
    getPipelineStages,
    getDealDist,
    getForecastARR,
    getPipelineDeals,
    getACVByMonth,
    getDealsByMonth,
    getClientWins,
    getClientDealsList,
    getQuarterDeals,
    getAnnualTargets,
    getQuarterTargets,
    getQuarterTargetForSegments,
    getQuarterTargetForDealOwners,
    getQuarterTargetSegmentNames,
    getQuarterDealOwnersFromSheet,
    getCumulativeChartData,
    getQuarterMetricInput,
    getQuarterMetricInputForSegments,
    getQuarterMetricInputForDealOwners,
    getQ1DetailsTable,
    getQ2DetailsTable,
    getJanuaryDetailsTable,
    getFebruaryDetailsTable,
    getMarchDetailsTable,
  };

  return (
    <SalesDataContext.Provider value={value}>{children}</SalesDataContext.Provider>
  );
}

export function useSalesData(): SalesDataContextValue {
  const ctx = useContext(SalesDataContext);
  if (!ctx) throw new Error('useSalesData must be used within SalesDataProvider');
  return ctx;
}
