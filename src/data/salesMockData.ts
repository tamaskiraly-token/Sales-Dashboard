/**
 * Mock data for Sales Forecast / Commercial Performance dashboard.
 * Replace with HubSpot API data later.
 */

export interface ForecastPoint {
  month: string;
  forecast: number;
  target: number;
}

/** Forecast over time with segment dimension (for filtering before aggregation) */
export interface ForecastPointBySegment {
  month: string;
  segment: string;
  forecast: number;
  target: number;
}

export interface PipelineStage {
  name: string;
  value: number;
  count: number;
}

export interface DealSegment {
  name: string;
  value: number;
  fill: string;
}

export interface SalesKPIs {
  forecastARR: number;
  pipelineValue: number;
  closedWon: number;
  winRate: number;
  forecastARRDelta?: number;
  pipelineValueDelta?: number;
  closedWonDelta?: number;
  winRateDelta?: number;
  /** Annual targets from sheet (optional). Used in cumulative vs target charts. */
  annualARRTarget?: number;
  annualACVTarget?: number;
  annualInYearRevenueTarget?: number;
  annualClientWinsTarget?: number;
}

function randomInRange(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

export function getSalesKPIs(): SalesKPIs {
  return {
    forecastARR: 2840000,
    pipelineValue: 1920000,
    closedWon: 12,
    winRate: 34,
    forecastARRDelta: 4.2,
    pipelineValueDelta: -2.1,
    closedWonDelta: 1,
    winRateDelta: 2.5,
  };
}

const FORECAST_MONTHS = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

function buildForecastOverTimeBySegment(): ForecastPointBySegment[] {
  const segments = ['Bank & Bank Tech', 'Fintechs', 'Gateways', 'Large Merchants', 'HVHM'];
  const shareOfTotal = [0.28, 0.24, 0.18, 0.18, 0.12];
  const out: ForecastPointBySegment[] = [];
  let baseF = 2100000;
  let baseT = 2400000;
  for (let m = 0; m < FORECAST_MONTHS.length; m++) {
    baseF += randomInRange(80000, 180000);
    baseT = Math.round(baseT * (1 + (m % 3 === 0 ? 0.02 : 0)));
    const month = FORECAST_MONTHS[m];
    for (let s = 0; s < segments.length; s++) {
      const variance = 0.92 + (s * 17 % 100) / 500;
      out.push({
        month,
        segment: segments[s],
        forecast: Math.round(baseF * shareOfTotal[s] * variance),
        target: Math.round(baseT * shareOfTotal[s] * (1 + (s % 2 === 0 ? 0.01 : -0.01))),
      });
    }
  }
  return out;
}

const CACHED_FORECAST_BY_SEGMENT = buildForecastOverTimeBySegment();

/** Forecast over time per segment (for segment filter). Use getForecastOverTime() for aggregated chart data. */
export function getForecastOverTimeBySegment(): ForecastPointBySegment[] {
  return CACHED_FORECAST_BY_SEGMENT;
}

/** Aggregated forecast over time. Pass selectedSegments to filter by segment (empty = all). */
export function getForecastOverTime(selectedSegments?: string[]): ForecastPoint[] {
  const bySegment = getForecastOverTimeBySegment();
  const filter =
    selectedSegments && selectedSegments.length > 0
      ? (row: ForecastPointBySegment) => selectedSegments.includes(row.segment)
      : () => true;
  const filtered = bySegment.filter(filter);
  const byMonth = new Map<string, { forecast: number; target: number }>();
  for (const row of filtered) {
    const cur = byMonth.get(row.month) ?? { forecast: 0, target: 0 };
    cur.forecast += row.forecast;
    cur.target += row.target;
    byMonth.set(row.month, cur);
  }
  return FORECAST_MONTHS.map((month) => {
    const cur = byMonth.get(month) ?? { forecast: 0, target: 0 };
    return { month, forecast: cur.forecast, target: cur.target };
  });
}

/** ARR per month by category (for Forecast stacked column chart) */
export interface ARRByMonthPoint {
  month: string;
  license: number;
  minimum: number;
  volumeDriven: number;
}

/** Client-level detail for License revenue */
export interface ARRLicenseItem {
  clientName: string;
  amount: number;
  segment: string;
}

/** Client-level detail for Minimum revenue */
export interface ARRMinimumItem {
  clientName: string;
  amount: number;
  segment: string;
}

/** Client-level detail for Volume-driven revenue (transactions × price point) */
export interface ARRVolumeDrivenItem {
  clientName: string;
  transactions: number;
  pricePoint: number; // in USD
  amount: number;    // transactions * pricePoint
  segment: string;
}

export interface ARRMonthDetail {
  license: ARRLicenseItem[];
  minimum: ARRMinimumItem[];
  volumeDriven: ARRVolumeDrivenItem[];
}

const SAMPLE_CLIENTS = [
  'Acme Corp', 'Beta Inc', 'Gamma Ltd', 'Delta Solutions', 'Epsilon Group',
  'Zeta Industries', 'Eta Partners', 'Theta Systems', 'Iota Consulting', 'Kappa Finance',
];

function splitAmount(total: number, parts: number): number[] {
  if (parts <= 1) return [total];
  const out: number[] = [];
  let remaining = total;
  for (let i = 0; i < parts - 1; i++) {
    const max = Math.floor(remaining / (parts - i));
    const val = randomInRange(Math.floor(max * 0.3), Math.min(max, remaining));
    out.push(val);
    remaining -= val;
  }
  out.push(remaining);
  return out;
}

/** Returns chart data and per-month client detail (detail amounts sum to chart totals). Each item has segment for filtering in UI. */
export function getForecastARRWithDetails(): {
  chartData: ARRByMonthPoint[];
  detailsByMonth: Record<string, ARRMonthDetail>;
} {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const chartData: ARRByMonthPoint[] = [];
  const detailsByMonth: Record<string, ARRMonthDetail> = {};

  for (const month of months) {
    const license = randomInRange(80, 220) * 1000;
    const minimum = randomInRange(40, 120) * 1000;
    const volumeDriven = randomInRange(20, 100) * 1000;
    chartData.push({ month, license, minimum, volumeDriven });

    const licenseParts = splitAmount(license, randomInRange(2, 4));
    const minimumParts = splitAmount(minimum, randomInRange(2, 4));
    const volumeParts = randomInRange(2, 4);
    const volumeAmounts = splitAmount(volumeDriven, volumeParts);

    detailsByMonth[month] = {
      license: licenseParts.map((amount, i) => ({
        clientName: SAMPLE_CLIENTS[(months.indexOf(month) + i) % SAMPLE_CLIENTS.length],
        amount,
        segment: randomChoice([...SEGMENT_OPTIONS]),
      })),
      minimum: minimumParts.map((amount, i) => ({
        clientName: SAMPLE_CLIENTS[(months.indexOf(month) + i + 2) % SAMPLE_CLIENTS.length],
        amount,
        segment: randomChoice([...SEGMENT_OPTIONS]),
      })),
      volumeDriven: volumeAmounts.map((amount, i) => {
        const pricePoint = randomInRange(5, 50);
        const transactions = Math.max(1, Math.round(amount / pricePoint));
        const actualAmount = transactions * pricePoint;
        return {
          clientName: SAMPLE_CLIENTS[(months.indexOf(month) + i + 4) % SAMPLE_CLIENTS.length],
          transactions,
          pricePoint,
          amount: actualAmount,
          segment: randomChoice([...SEGMENT_OPTIONS]),
        };
      }),
    };
  }

  return { chartData, detailsByMonth };
}

/** @deprecated Use getForecastARRWithDetails() for chart + popup. Kept for backwards compat. */
export function getARRByMonth(): ARRByMonthPoint[] {
  return getForecastARRWithDetails().chartData;
}

export function getPipelineByStage(): PipelineStage[] {
  return [
    { name: 'Qualification', value: 420000, count: 18 },
    { name: 'Discovery', value: 380000, count: 12 },
    { name: 'Proposal', value: 520000, count: 8 },
    { name: 'Negotiation', value: 350000, count: 5 },
    { name: 'Closed Won', value: 250000, count: 4 },
  ];
}

const DEAL_COLORS = ['#1e1b4b', '#3730a3', '#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd'];

/** Segment options used across the dashboard (for filters and data) */
export const SEGMENT_OPTIONS = ['Bank & Bank Tech', 'Fintechs', 'Gateways', 'Large Merchants', 'HVHM'] as const;
export type SegmentOption = (typeof SEGMENT_OPTIONS)[number];

/** Random percentages that sum to 100 for the 5 segments */
function randomSegmentDistribution(): number[] {
  const raw = SEGMENT_OPTIONS.map(() => Math.random());
  const sum = raw.reduce((a, b) => a + b, 0);
  const scaled = raw.map((r) => Math.round((r / sum) * 100));
  const diff = 100 - scaled.reduce((a, b) => a + b, 0);
  if (diff !== 0) scaled[0] = Math.max(0, scaled[0] + diff);
  return scaled;
}

const CACHED_DISTRIBUTION = randomSegmentDistribution();

export function getDealDistribution(selectedSegments?: string[]): DealSegment[] {
  const segments = SEGMENT_OPTIONS.map((name, i) => ({ name, value: CACHED_DISTRIBUTION[i] }));
  const filtered =
    selectedSegments && selectedSegments.length > 0
      ? segments.filter((s) => selectedSegments.includes(s.name))
      : segments;
  const total = filtered.reduce((a, s) => a + s.value, 0);
  const normalized = total > 0 ? filtered.map((s) => ({ ...s, value: Math.round((s.value / total) * 100) })) : filtered;
  const sum = normalized.reduce((a, s) => a + s.value, 0);
  if (sum !== 100 && normalized.length > 0) normalized[0].value += 100 - sum;
  return normalized.map((s) => ({
    ...s,
    fill: DEAL_COLORS[SEGMENT_OPTIONS.indexOf(s.name as SegmentOption) % DEAL_COLORS.length],
  }));
}

/** Single deal with close date used for Pipeline ACV forecast */
export interface PipelineDeal {
  id: string;
  name: string;
  acv: number;
  closeDate: string; // YYYY-MM
  stage?: string;
  segment: string;
}

const DEAL_NAMES = [
  'Acme Corp – Platform',
  'Beta Inc – Enterprise',
  'Gamma Ltd – Standard',
  'Delta Solutions – Premium',
  'Epsilon Group – Platform',
  'Zeta Industries – Enterprise',
  'Eta Partners – Standard',
  'Theta Systems – Premium',
  'Iota Consulting – Platform',
  'Kappa Finance – Enterprise',
  'Lambda Tech – Standard',
  'Mu Industries – Premium',
  'Nu Ventures – Platform',
  'Xi Corp – Enterprise',
  'Omicron Ltd – Standard',
];

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Mock deals with close dates in 2026 (for Pipeline ACV by month) */
export function getPipelineDeals2026(): PipelineDeal[] {
  const deals: PipelineDeal[] = [];
  const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'];
  let id = 1;
  for (const closeDate of months) {
    const count = randomInRange(1, 4);
  for (let i = 0; i < count; i++) {
    const baseName = randomChoice(DEAL_NAMES);
    const name = count > 1 && i > 0 ? `${baseName} – ${closeDate}` : baseName;
    deals.push({
        id: `deal-${id++}`,
        name,
        acv: randomInRange(40000, 280000),
        closeDate,
        stage: randomChoice(['Proposal', 'Negotiation', 'Closed Won']),
        segment: randomChoice([...SEGMENT_OPTIONS]),
      });
    }
  }
  return deals;
}

export interface ACVByMonth {
  month: string;   // "Jan 2026"
  monthKey: string; // "2026-01"
  totalACV: number;
}

/** Aggregate ACV by month in 2026 for the Pipeline bar chart */
export function getACVByMonth2026(deals: PipelineDeal[]): ACVByMonth[] {
  const MONTH_LABELS: Record<string, string> = {
    '2026-01': 'Jan 2026', '2026-02': 'Feb 2026', '2026-03': 'Mar 2026', '2026-04': 'Apr 2026',
    '2026-05': 'May 2026', '2026-06': 'Jun 2026', '2026-07': 'Jul 2026', '2026-08': 'Aug 2026',
    '2026-09': 'Sep 2026', '2026-10': 'Oct 2026', '2026-11': 'Nov 2026', '2026-12': 'Dec 2026',
  };
  const byMonth = new Map<string, number>();
  for (const d of deals) {
    const current = byMonth.get(d.closeDate) ?? 0;
    byMonth.set(d.closeDate, current + d.acv);
  }
  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, totalACV]) => ({
      month: MONTH_LABELS[monthKey] ?? monthKey,
      monthKey,
      totalACV,
    }));
}

/** Group deals by close month for the popup */
export function getDealsByMonth2026(deals: PipelineDeal[]): Record<string, PipelineDeal[]> {
  const byMonth: Record<string, PipelineDeal[]> = {};
  for (const d of deals) {
    if (!byMonth[d.closeDate]) byMonth[d.closeDate] = [];
    byMonth[d.closeDate].push(d);
  }
  for (const arr of Object.values(byMonth)) arr.sort((a, b) => b.acv - a.acv);
  return byMonth;
}

/** Client wins per period (for Pipeline line chart) */
export interface ClientWinsPoint {
  period: string;
  wins: number;
}

/** Mock client wins per month (e.g. closed-won count per month) */
export function getClientWinsOverTime(): ClientWinsPoint[] {
  const months = [
    'Jan 2026', 'Feb 2026', 'Mar 2026', 'Apr 2026', 'May 2026', 'Jun 2026',
    'Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026', 'Nov 2026', 'Dec 2026',
  ];
  return months.map((period) => ({
    period,
    wins: randomInRange(1, 8),
  }));
}

/** Client deal row for Accounts tabular view */
export interface ClientDeal {
  id: string;
  dealName: string;
  closeDate: string; // YYYY-MM-DD
  segment: string;
  acv: number;
  estimatedTransactionsPerMonth: number;
  dealOwner: string;
}

const DEAL_OWNERS = ['Alex Morgan', 'Jordan Smith', 'Sam Taylor', 'Casey Lee', 'Riley Brown'];
const DEAL_NAME_PREFIXES = ['Acme Corp', 'Beta Inc', 'Gamma Ltd', 'Delta Solutions', 'Epsilon Group', 'Zeta Industries', 'Eta Partners', 'Theta Systems', 'Iota Consulting', 'Kappa Finance', 'Lambda Tech', 'Mu Industries'];

export function getClientDeals(): ClientDeal[] {
  const deals: ClientDeal[] = [];
  let id = 1;
  for (let i = 0; i < 48; i++) {
    const prefix = DEAL_NAME_PREFIXES[i % DEAL_NAME_PREFIXES.length];
    const suffix = i > 11 ? ` – ${['Platform', 'Enterprise', 'Standard', 'Premium'][i % 4]}` : '';
    const day = 1 + (i % 28);
    const month = (i % 12) + 1;
    const year = 2025 + (i >= 24 ? 1 : 0);
    const closeDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    deals.push({
      id: `client-deal-${id++}`,
      dealName: `${prefix}${suffix}`,
      closeDate,
      segment: randomChoice([...SEGMENT_OPTIONS]),
      acv: randomInRange(30, 350) * 1000,
      estimatedTransactionsPerMonth: randomInRange(500, 50000),
      dealOwner: DEAL_OWNERS[i % DEAL_OWNERS.length],
    });
  }
  return deals.sort((a, b) => a.closeDate.localeCompare(b.closeDate));
}

/** Deal with forecast fields for quarter views (2026 Q1–Q4) */
export type QuarterId = '2026Q1' | '2026Q2' | '2026Q3' | '2026Q4';

export interface QuarterDeal {
  id: string;
  clientName: string;
  dealName: string;
  closeDate: string;
  segment: string;
  acv: number;
  arrForecast: number;
  annualizedTransactionForecast: number;
  dealOwner: string;
  targetAccount: boolean;
  latestNextSteps: string;
  confidenceQuarterClose: number; // 0-100
}

const LATEST_NEXT_STEPS_SAMPLES = [
  'Follow-up call scheduled for next week. Awaiting legal review of MSA.',
  'Demo completed. Sending pricing proposal and scheduling QBR.',
  'Contract sent for signature. Chasing procurement for approval.',
  'Discovery call done. Preparing ROI deck and technical deep-dive.',
  'Waiting on budget confirmation. Next: intro to technical lead.',
  'Proposal under review. Follow-up in 5 days if no response.',
  'Kick-off meeting booked. Pending security questionnaire.',
  'Renewal discussion scheduled. Preparing usage report.',
  'POC extended by 2 weeks. Success criteria agreed.',
  'Final negotiation. Discussing volume discounts and payment terms.',
  'Stakeholder alignment meeting next Tuesday. Draft SOW shared.',
  'Champion left company. Re-engaging with new decision maker.',
];

const QUARTER_MONTHS: Record<QuarterId, number[]> = {
  '2026Q1': [1, 2, 3],
  '2026Q2': [4, 5, 6],
  '2026Q3': [7, 8, 9],
  '2026Q4': [10, 11, 12],
};

export function getDealsByQuarter(quarter: QuarterId): QuarterDeal[] {
  const months = QUARTER_MONTHS[quarter];
  const deals: QuarterDeal[] = [];
  const clients = ['Acme Corp', 'Beta Inc', 'Gamma Ltd', 'Delta Solutions', 'Epsilon Group', 'Zeta Industries', 'Eta Partners', 'Theta Systems', 'Iota Consulting', 'Kappa Finance', 'Lambda Tech', 'Mu Industries'];
  let id = 1;
  const count = randomInRange(6, 14);
  for (let i = 0; i < count; i++) {
    const clientName = clients[i % clients.length];
    const month = months[randomInRange(0, months.length - 1)];
    const day = randomInRange(1, 28);
    const closeDate = `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const acv = randomInRange(40, 320) * 1000;
    const arrForecast = Math.round(acv * (0.85 + Math.random() * 0.3));
    const annualizedTransactionForecast = randomInRange(6000, 480000);
    deals.push({
      id: `quarter-deal-${quarter}-${id++}`,
      clientName,
      dealName: `${clientName} – ${['Platform', 'Enterprise', 'Standard', 'Premium'][i % 4]}`,
      closeDate,
      segment: randomChoice([...SEGMENT_OPTIONS]),
      acv,
      arrForecast,
      annualizedTransactionForecast,
      dealOwner: DEAL_OWNERS[i % DEAL_OWNERS.length],
      targetAccount: Math.random() > 0.4,
      latestNextSteps: LATEST_NEXT_STEPS_SAMPLES[i % LATEST_NEXT_STEPS_SAMPLES.length],
      confidenceQuarterClose: randomInRange(25, 95),
    });
  }
  return deals.sort((a, b) => a.closeDate.localeCompare(b.closeDate));
}
