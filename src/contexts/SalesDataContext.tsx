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
const DEFAULT_QUARTER_TARGETS: Record<QuarterId, { clientWins: number; acv: number; inYearRevenue: number }> = {
  '2026Q1': { clientWins: 10, acv: 600000, inYearRevenue: 550000 },
  '2026Q2': { clientWins: 12, acv: 720000, inYearRevenue: 660000 },
  '2026Q3': { clientWins: 14, acv: 840000, inYearRevenue: 770000 },
  '2026Q4': { clientWins: 16, acv: 960000, inYearRevenue: 880000 },
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
  getQuarterTargets: (quarter: QuarterId) => { clientWins: number; acv: number; inYearRevenue: number };
  /** Cumulative chart: Actual/Forecast/Target per month from CumulativeChartData sheet, or null to use computed + linear target */
  getCumulativeChartData: (metric: CumulativeChartMetricKey) => { actual: number[]; forecast: number[]; target: number[] } | null;
  /** Quarter waterfall: Signed/Forecasted per month from QuarterMetricInput sheet, or null to use deal-based logic */
  getQuarterMetricInput: (quarter: QuarterId, metric: QuarterProjectionMetricKey) => { monthSigned: number[]; monthForecasted: number[]; quarterTarget: number; carryOver: number } | null;
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
    (quarter: QuarterId): { clientWins: number; acv: number; inYearRevenue: number } => {
      const fromSheet = googleData?.quarterTargets?.[quarter];
      if (fromSheet && (fromSheet.clientWins > 0 || fromSheet.acv > 0 || fromSheet.inYearRevenue > 0)) {
        return fromSheet;
      }
      return DEFAULT_QUARTER_TARGETS[quarter];
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
    getCumulativeChartData,
    getQuarterMetricInput,
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
