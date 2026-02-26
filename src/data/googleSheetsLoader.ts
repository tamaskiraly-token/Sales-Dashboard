/**
 * Fetches sheet data from Google Sheets via "Publish to web" CSV export.
 * Sheet must be published (File → Share → Publish to web) for the URL to work.
 */

import {
  googleSheetsConfig,
  isGoogleSheetsConfigured,
} from './googleSheetsConfig';
import type {
  SalesKPIs,
  ForecastPoint,
  ForecastPointBySegment,
  PipelineStage,
  DealSegment,
  ARRByMonthPoint,
  ARRMonthDetail,
  PipelineDeal,
  ACVByMonth,
  ClientWinsPoint,
  ClientDeal,
  QuarterDeal,
} from './salesMockData';

const BASE =
  'https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/export?format=csv&gid=GID';

function buildUrl(spreadsheetId: string, gid: string): string {
  return BASE.replace('SPREADSHEET_ID', spreadsheetId).replace('GID', gid);
}

/** Normalize header for matching: lowercase, no spaces/underscores (e.g. "Deal Name" -> "dealname") */
function normalizeHeader(h: string): string {
  return h
    .trim()
    .replace(/^"|"$/g, '')
    .toLowerCase()
    .replace(/[\s_]+/g, '');
}

/** Parse one CSV line respecting quoted fields (handles commas inside "...") */
function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let i = 0;
  
  while (i <= line.length) {
    if (i >= line.length) {
      // End of line - add empty field if we're at the end
      if (out.length === 0 || line[line.length - 1] === ',') {
        out.push('');
      }
      break;
    }
    
    if (line[i] === '"') {
      // Quoted field
      let val = '';
      i += 1;
      while (i < line.length) {
        if (line[i] === '"') {
          i += 1;
          if (i < line.length && line[i] === '"') {
            // Escaped quote
            val += '"';
            i += 1;
          } else {
            // End of quoted field
            break;
          }
        } else {
          val += line[i];
          i += 1;
        }
      }
      out.push(val.trim());
      // Skip comma after quoted field
      if (i < line.length && line[i] === ',') {
        i += 1;
      }
    } else {
      // Unquoted field
      let val = '';
      while (i < line.length && line[i] !== ',') {
        val += line[i];
        i += 1;
      }
      out.push(val.trim().replace(/^"|"$/g, ''));
      // Skip comma
      if (i < line.length && line[i] === ',') {
        i += 1;
      }
    }
  }
  
  return out;
}

function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.trim().replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) return [];
  const rawHeaders = parseCSVLine(lines[0]);
  const headers = rawHeaders.map((h) => normalizeHeader(h.replace(/^\uFEFF/, '')) || h);
  const expectedColumnCount = headers.length;
  const rows: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    
    // Pad or truncate values to match expected column count
    // This ensures columns don't shift due to missing trailing commas or extra values
    const normalizedValues: string[] = [];
    for (let j = 0; j < expectedColumnCount; j++) {
      normalizedValues[j] = (values[j] ?? '').trim().replace(/^"|"$/g, '');
    }
    
    const row: Record<string, string> = {};
    headers.forEach((h, j) => {
      row[h] = normalizedValues[j] ?? '';
    });
    rows.push(row);
  }
  return rows;
}

function num(v: string): number {
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ''));
  return Number.isNaN(n) ? 0 : n;
}

function bool(v: string): boolean {
  const s = String(v).toLowerCase();
  return s === 'true' || s === '1' || s === 'yes' || s === 'x';
}

/** Read cell with flexible header matching (e.g. "Deal Name" or "dealName" -> dealName) */
function cell(row: Record<string, string>, key: string): string {
  const normalized = normalizeHeader(key);
  return row[normalized] ?? row[key] ?? '';
}

/** Month column names by quarter: Q1=Jan,Feb,Mar; Q2=Apr,May,Jun; Q3=Jul,Aug,Sep; Q4=Oct,Nov,Dec. Also try "month1"/"month2"/"month3". */
const QUARTER_MONTH_KEYS: Record<string, [string, string, string][]> = {
  '2026Q1': [['month1', 'jan', 'january'], ['month2', 'feb', 'february'], ['month3', 'mar', 'march']],
  '2026Q2': [['month1', 'apr', 'april'], ['month2', 'may'], ['month3', 'jun', 'june']],
  '2026Q3': [['month1', 'jul', 'july'], ['month2', 'aug', 'august'], ['month3', 'sep', 'september']],
  '2026Q4': [['month1', 'oct', 'october'], ['month2', 'nov', 'november'], ['month3', 'dec', 'december']],
};

function cellMonth(row: Record<string, string>, qRaw: string, monthIndex: 0 | 1 | 2): number {
  const keys = QUARTER_MONTH_KEYS[qRaw]?.[monthIndex];
  if (!keys) return num(cell(row, `month${monthIndex + 1}`) || (row as Record<string, string>)[`month${monthIndex + 1}`]);
  for (const k of keys) {
    const v = cell(row, k) || (row as Record<string, string>)[k];
    if (v !== undefined && v !== '' && v !== null) return num(v);
  }
  return 0;
}

/** Read deal_owner from a row; CSV headers can be "deal owner", "deal_owner", or have BOM. */
function cellDealOwner(row: Record<string, string>): string {
  const v =
    cell(row, 'deal_owner') ||
    cell(row, 'deal owner') ||
    (row as Record<string, string>)['dealowner'] ||
    (row as Record<string, string>)['deal_owner'] ||
    '';
  if (v) return String(v).trim();
  for (const k of Object.keys(row)) {
    if (/dealowner|deal_owner|deal\s*owner/.test(k.replace(/\s/g, '').toLowerCase())) return String(row[k] ?? '').trim();
  }
  return '';
}

function buildDetailsByMonth(
  lic: Record<string, string>[],
  min: Record<string, string>[],
  vol: Record<string, string>[]
): Record<string, import('./salesMockData').ARRMonthDetail> {
  const monthVal = (r: Record<string, string>) => String((cell(r, 'month') || r.month) ?? '');
  const months = new Set<string>([
    ...lic.map(monthVal),
    ...min.map(monthVal),
    ...vol.map(monthVal),
  ].filter(Boolean));
  const out: Record<string, import('./salesMockData').ARRMonthDetail> = {};
  for (const month of months) {
    out[month] = {
      license: lic.filter((r) => monthVal(r) === month).map((r) => ({
        clientName: String((cell(r, 'clientName') || r.clientName) ?? ''),
        amount: num(cell(r, 'amount') || r.amount),
        segment: String((cell(r, 'segment') || r.segment) ?? ''),
      })),
      minimum: min.filter((r) => monthVal(r) === month).map((r) => ({
        clientName: String((cell(r, 'clientName') || r.clientName) ?? ''),
        amount: num(cell(r, 'amount') || r.amount),
        segment: String((cell(r, 'segment') || r.segment) ?? ''),
      })),
      volumeDriven: vol.filter((r) => monthVal(r) === month).map((r) => ({
        clientName: String((cell(r, 'clientName') || r.clientName) ?? ''),
        transactions: num(cell(r, 'transactions') || r.transactions),
        pricePoint: num(cell(r, 'pricePoint') || r.pricePoint),
        amount: num(cell(r, 'amount') || r.amount),
        segment: String((cell(r, 'segment') || r.segment) ?? ''),
      })),
    };
  }
  return out;
}

async function fetchSheet(name: string): Promise<Record<string, string>[]> {
  const gid = googleSheetsConfig.sheetGids[name];
  if (!gid || !googleSheetsConfig.spreadsheetId) return [];
  const url = buildUrl(googleSheetsConfig.spreadsheetId, gid);
  const cacheBust = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
  const res = await fetch(cacheBust, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch ${name}: ${res.status}`);
  const text = await res.text();
  return parseCSV(text);
}

/** Fetch a sheet but return [] on failure (for optional sheets like QuarterTargets) */
async function fetchSheetOptional(name: string): Promise<Record<string, string>[]> {
  try {
    return await fetchSheet(name);
  } catch {
    return [];
  }
}

/** Per-quarter targets (client wins count, ACV, in-year revenue). Keys e.g. 2026Q1 */
export type LoadedQuarterTargets = Record<string, { clientWins: number; acv: number; inYearRevenue: number; arrTarget: number }>;

/** Metric keys for the cumulative chart (matches CumulativeActualForecastChart) */
export type CumulativeChartMetricKey = 'acv' | 'inYearRevenue' | 'arrTarget' | 'clientWins';

/** Per-month (Jan..Dec) cumulative values for Actual, Forecast, Target. From optional CumulativeChartData sheet. */
export type LoadedCumulativeChartData = Partial<
  Record<CumulativeChartMetricKey, { actual: number[]; forecast: number[]; target: number[] }>
>;

/** Metric keys for quarter waterfall (Client wins, ACV, In-year revenue). */
export type QuarterProjectionMetricKey = 'clientWins' | 'acv' | 'inYearRevenue' | 'arrTarget';

/** Per-quarter, per-metric: Signed/Forecasted from QuarterMetricInput sheet (month1–3, quarter_target, carry_over). */
export type LoadedQuarterMetricInput = Record<
  string,
  Partial<Record<QuarterProjectionMetricKey, { monthSigned: number[]; monthForecasted: number[]; quarterTarget: number; carryOver: number }>>
>;

export interface LoadedSalesData {
  salesKPIs: SalesKPIs | null;
  forecastPoint: ForecastPoint[];
  forecastPointBySegment: ForecastPointBySegment[];
  pipelineStage: PipelineStage[];
  dealSegment: DealSegment[];
  arrByMonthPoint: ARRByMonthPoint[];
  detailsByMonth: Record<string, ARRMonthDetail>;
  pipelineDeal: PipelineDeal[];
  acvByMonth: ACVByMonth[];
  clientWinsPoint: ClientWinsPoint[];
  clientDeal: ClientDeal[];
  quarterDeal: QuarterDeal[];
  /** From optional QuarterTargets sheet; empty if not configured. API may omit. */
  quarterTargets?: LoadedQuarterTargets;
  /** From optional CumulativeChartData sheet (rows: metric, type, Jan..Dec). API may omit. */
  cumulativeChartData?: LoadedCumulativeChartData;
  /** From optional QuarterMetricInput sheet (quarter, metric, status, month1–3, total_projected, quarter_target). API may omit. */
  quarterMetricInput?: LoadedQuarterMetricInput;
  /** Per-segment quarter targets from QuarterMetricInput Target rows (quarter -> metric -> segment -> target). Used when segment filter is active. */
  quarterTargetBySegment?: Record<string, Record<string, Record<string, number>>>;
  /** Unique deal_owner values per quarter from QuarterMetricInput sheet (for Quarter tab filter). */
  quarterDealOwners?: Record<string, string[]>;
  /** Per–deal-owner quarter targets from QuarterMetricInput Target rows (quarter -> metric -> dealOwner -> target). */
  quarterTargetByDealOwner?: Record<string, Record<string, Record<string, number>>>;
  /** Per-segment month Signed/Forecasted from QuarterMetricInput (for waterfall when segment filter active). */
  quarterMetricInputBySegment?: Record<string, Record<string, Record<string, { monthSigned: number[]; monthForecasted: number[]; carryOver: number }>>>;
  /** Per-deal-owner month Signed/Forecasted from QuarterMetricInput (for waterfall when deal owner filter active). */
  quarterMetricInputByDealOwner?: Record<string, Record<string, Record<string, { monthSigned: number[]; monthForecasted: number[]; carryOver: number }>>>;
  /** Table data from Q1details sheet (array of rows, keys = normalized column headers). Shown below waterfall on Q1 tab. */
  q1DetailsTable?: Record<string, string>[];
  /** Table data from Q2details sheet (array of rows, keys = normalized column headers). Shown below waterfall on Q2 tab. */
  q2DetailsTable?: Record<string, string>[];
  /** Table data from JanuaryDetails sheet (array of rows, keys = normalized column headers). Used for pop-up when clicking January bars. */
  januaryDetailsTable?: Record<string, string>[];
  /** Table data from Febdetails sheet (array of rows, keys = normalized column headers). Used for pop-up when clicking February bars. */
  februaryDetailsTable?: Record<string, string>[];
  /** Table data from Mardetails sheet (array of rows, keys = normalized column headers). Used for pop-up when clicking March bars. */
  marchDetailsTable?: Record<string, string>[];
}

export async function loadGoogleSheetsData(): Promise<LoadedSalesData> {
  const id = googleSheetsConfig.spreadsheetId;
  if (!id) throw new Error('Google Sheets spreadsheetId not configured');

  const sheet = async (name: string) => {
    try {
      return await fetchSheet(name);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[Google Sheets] Failed to load sheet "${name}":`, msg);
      throw new Error(`Could not load sheet "${name}". ${msg} Make sure the sheet is shared (Anyone with the link can view) and the spreadsheet ID / sheet GID match your workbook.`);
    }
  };

  const [salesKPIsRows, forecastPointRows, forecastBySegRows, pipelineStageRows, dealSegRows, arrByMonthRows, arrLicRows, arrMinRows, arrVolRows, pipelineDealRows, acvRows, clientWinsRows, clientDealRows, quarterDealRows, quarterTargetsRows, quarterTargetsByDealOwnerRows, cumulativeChartRows, quarterMetricInputRows, q1DetailsRows, q2DetailsRows, januaryDetailsRows, februaryDetailsRows, marchDetailsRows] = await Promise.all([
    sheet('SalesKPIs'),
    sheet('ForecastPoint'),
    sheet('ForecastPointBySegment'),
    sheet('PipelineStage'),
    sheet('DealSegment'),
    sheet('ARRByMonthPoint'),
    sheet('ARR_LicenseDetail'),
    sheet('ARR_MinimumDetail'),
    sheet('ARR_VolumeDetail'),
    sheet('PipelineDeal'),
    sheet('ACVByMonth'),
    sheet('ClientWinsPoint'),
    sheet('ClientDeal'),
    sheet('QuarterDeal'),
    googleSheetsConfig.sheetGids['QuarterTargets']
      ? fetchSheetOptional('QuarterTargets')
      : Promise.resolve([]),
    googleSheetsConfig.sheetGids['QuarterTargetsByDealOwner']
      ? fetchSheetOptional('QuarterTargetsByDealOwner')
      : Promise.resolve([]),
    googleSheetsConfig.sheetGids['CumulativeChartData']
      ? fetchSheetOptional('CumulativeChartData')
      : Promise.resolve([]),
    googleSheetsConfig.sheetGids['QuarterMetricInput']
      ? fetchSheetOptional('QuarterMetricInput')
      : Promise.resolve([]),
    googleSheetsConfig.sheetGids['Q1details']
      ? fetchSheetOptional('Q1details')
      : Promise.resolve([]),
    googleSheetsConfig.sheetGids['Q2details']
      ? fetchSheetOptional('Q2details')
      : Promise.resolve([]),
    googleSheetsConfig.sheetGids['JanuaryDetails']
      ? fetchSheetOptional('JanuaryDetails')
      : Promise.resolve([]),
    googleSheetsConfig.sheetGids['Febdetails']
      ? fetchSheetOptional('Febdetails')
      : Promise.resolve([]),
    googleSheetsConfig.sheetGids['Mardetails']
      ? fetchSheetOptional('Mardetails')
      : Promise.resolve([]),
  ]);

  const salesKPIs: SalesKPIs | null =
    salesKPIsRows.length > 0
      ? (() => {
          const r = salesKPIsRows[0];
          const arrTarget = num(cell(r, 'annualARRTarget'));
          const acvTarget = num(cell(r, 'annualACVTarget'));
          const inYearTarget = num(cell(r, 'annualInYearRevenueTarget'));
          const winsTarget = num(cell(r, 'annualClientWinsTarget'));
          return {
            forecastARR: num(cell(r, 'forecastARR')),
            pipelineValue: num(cell(r, 'pipelineValue')),
            closedWon: num(cell(r, 'closedWon')),
            winRate: num(cell(r, 'winRate')),
            forecastARRDelta: cell(r, 'forecastARRDelta') ? num(cell(r, 'forecastARRDelta')) : undefined,
            pipelineValueDelta: cell(r, 'pipelineValueDelta') ? num(cell(r, 'pipelineValueDelta')) : undefined,
            closedWonDelta: cell(r, 'closedWonDelta') ? num(cell(r, 'closedWonDelta')) : undefined,
            winRateDelta: cell(r, 'winRateDelta') ? num(cell(r, 'winRateDelta')) : undefined,
            annualARRTarget: arrTarget > 0 ? arrTarget : undefined,
            annualACVTarget: acvTarget > 0 ? acvTarget : undefined,
            annualInYearRevenueTarget: inYearTarget > 0 ? inYearTarget : undefined,
            annualClientWinsTarget: winsTarget > 0 ? winsTarget : undefined,
          };
        })()
      : null;

  return {
    salesKPIs,
    forecastPoint: forecastPointRows.map((r) => ({
      month: String((cell(r, 'month') || r.month) ?? ''),
      forecast: num(cell(r, 'forecast') || r.forecast),
      target: num(cell(r, 'target') || r.target),
    })),
    forecastPointBySegment: forecastBySegRows.map((r) => ({
      month: String((cell(r, 'month') || r.month) ?? ''),
      segment: String((cell(r, 'segment') || r.segment) ?? ''),
      forecast: num(cell(r, 'forecast') || r.forecast),
      target: num(cell(r, 'target') || r.target),
    })),
    pipelineStage: pipelineStageRows.map((r) => ({
      name: String((cell(r, 'name') || r.name) ?? ''),
      value: num(cell(r, 'value') || r.value),
      count: num(cell(r, 'count') || r.count),
    })),
    dealSegment: dealSegRows.map((r) => ({
      name: String((cell(r, 'name') || r.name) ?? ''),
      value: num(cell(r, 'value') || r.value),
      fill: String((cell(r, 'fill') || r.fill) ?? '#1e1b4b'),
    })),
    arrByMonthPoint: arrByMonthRows.map((r) => ({
      month: String((cell(r, 'month') || r.month) ?? ''),
      license: num(cell(r, 'license') || r.license),
      minimum: num(cell(r, 'minimum') || r.minimum),
      volumeDriven: num(cell(r, 'volumeDriven') || r.volumeDriven),
    })),
    detailsByMonth: buildDetailsByMonth(arrLicRows, arrMinRows, arrVolRows),
    pipelineDeal: pipelineDealRows.map((r) => ({
      id: String((cell(r, 'id') || r.id) ?? ''),
      name: String((cell(r, 'name') || r.name) ?? ''),
      acv: num(cell(r, 'acv') || r.acv),
      closeDate: String((cell(r, 'closeDate') || r.closeDate) ?? ''),
      stage: (cell(r, 'stage') || r.stage) ? String(cell(r, 'stage') || r.stage) : undefined,
      segment: String((cell(r, 'segment') || r.segment) ?? ''),
    })),
    acvByMonth: acvRows.map((r) => ({
      month: String((cell(r, 'month') || r.month) ?? ''),
      monthKey: String((cell(r, 'monthKey') || r.monthKey) ?? ''),
      totalACV: num(cell(r, 'totalACV') || r.totalACV),
    })),
    clientWinsPoint: clientWinsRows.map((r) => ({
      period: String((cell(r, 'period') || r.period) ?? ''),
      wins: num(cell(r, 'wins') || r.wins),
    })),
    clientDeal: clientDealRows.map((r) => ({
      id: String((cell(r, 'id') || r.id) ?? ''),
      dealName: String((cell(r, 'dealName') || r.dealName) ?? ''),
      closeDate: String((cell(r, 'closeDate') || r.closeDate) ?? ''),
      segment: String((cell(r, 'segment') || r.segment) ?? ''),
      acv: num(cell(r, 'acv') || r.acv),
      estimatedTransactionsPerMonth: num(cell(r, 'estimatedTransactionsPerMonth') || r.estimatedTransactionsPerMonth),
      dealOwner: String((cell(r, 'dealOwner') || r.dealOwner) ?? ''),
    })),
    quarterDeal: quarterDealRows.map((r) => ({
      id: String((cell(r, 'id') || r.id) ?? ''),
      clientName: String((cell(r, 'clientName') || r.clientName) ?? ''),
      dealName: String((cell(r, 'dealName') || r.dealName) ?? ''),
      closeDate: String((cell(r, 'closeDate') || r.closeDate) ?? ''),
      segment: String((cell(r, 'segment') || r.segment) ?? ''),
      acv: num(cell(r, 'acv') || r.acv),
      arrForecast: num(cell(r, 'arrForecast') || cell(r, 'fy26ArrForecast') || cell(r, 'fy26 arr forecast') || (r as Record<string, string>).fy26arrforecast || (r as Record<string, string>).arrforecast),
      annualizedTransactionForecast: num(cell(r, 'annualizedTransactionForecast') || r.annualizedTransactionForecast),
      dealOwner: String((cell(r, 'dealOwner') || r.dealOwner) ?? ''),
      targetAccount: bool(cell(r, 'targetAccount') || r.targetAccount),
      latestNextSteps: String((cell(r, 'latestNextSteps') || r.latestNextSteps) ?? ''),
      confidenceQuarterClose: num(cell(r, 'confidenceQuarterClose') || r.confidenceQuarterClose),
    })),
    quarterTargets: (() => {
      const map: LoadedQuarterTargets = {};
      for (const r of quarterTargetsRows) {
        const q = String(((cell(r, 'quarter') || r.quarter) ?? '').trim()).toUpperCase();
        if (!q) continue;
        map[q] = {
          clientWins: num(cell(r, 'clientWins') || r.clientWins),
          acv: num(cell(r, 'acv') || r.acv),
          inYearRevenue: num(cell(r, 'inYearRevenue') || r.inYearRevenue),
          arrTarget: num(cell(r, 'arrTarget') || cell(r, 'arr target') || cell(r, 'yearendarrtarget') || (r as Record<string, string>).arrtarget || (r as Record<string, string>).yearendarrtarget),
        };
      }
      return map;
    })(),
    cumulativeChartData: (() => {
      const MONTH_COLS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const metricNorm: Record<string, CumulativeChartMetricKey> = {
        acv: 'acv',
        'inyearrev': 'inYearRevenue',
        'inyearrevenue': 'inYearRevenue',
        arr: 'arrTarget',
        'arrtarget': 'arrTarget',
        clientwins: 'clientWins',
      };
      const typeNorm: Record<string, 'actual' | 'forecast' | 'target'> = {
        actual: 'actual',
        forecast: 'forecast',
        target: 'target',
      };
      const out: LoadedCumulativeChartData = {};
      for (const r of cumulativeChartRows) {
        const metricRaw = String(((cell(r, 'metric') || r.metric) ?? '').trim()).toLowerCase().replace(/\s+/g, '');
        const typeRaw = String(((cell(r, 'type') || r.type) ?? '').trim()).toLowerCase();
        const metricKey = metricNorm[metricRaw] ?? (metricRaw === 'acv' ? 'acv' : null);
        const typeKey = typeNorm[typeRaw];
        if (!metricKey || !typeKey) continue;
        const values = MONTH_COLS.map((col) => num(cell(r, col) || (r as Record<string, string>)[col]));
        if (!out[metricKey]) {
          out[metricKey] = { actual: new Array(12).fill(0), forecast: new Array(12).fill(0), target: new Array(12).fill(0) };
        }
        out[metricKey]![typeKey] = values;
      }
      return Object.keys(out).length > 0 ? out : undefined;
    })(),
    quarterMetricInput: (() => {
      const metricNorm: Record<string, QuarterProjectionMetricKey> = {
        'clientwins': 'clientWins',
        'client wins': 'clientWins',
        acv: 'acv',
        'acv signed': 'acv',
        'inyearrevenue': 'inYearRevenue',
        'in-year revenue': 'inYearRevenue',
        'in year revenue': 'inYearRevenue',
        'arrtarget': 'arrTarget',
        'arr target': 'arrTarget',
      };
      const out: LoadedQuarterMetricInput = {};
      for (const r of quarterMetricInputRows) {
        const qRaw = String(((cell(r, 'quarter') || r.quarter) ?? '').trim()).toUpperCase().replace(/\s+/g, '');
        if (!qRaw || !/^20\d{2}Q[1-4]$/.test(qRaw)) continue;
        const metricRaw = String(((cell(r, 'metric') || r.metric) ?? '').trim()).toLowerCase();
        const metricKey = metricNorm[metricRaw] ?? metricNorm[metricRaw.replace(/-/g, ' ')];
        if (!metricKey) continue;
        if (!out[qRaw]) out[qRaw] = {};
        if (!out[qRaw][metricKey]) {
          out[qRaw][metricKey] = { monthSigned: [0, 0, 0], monthForecasted: [0, 0, 0], quarterTarget: 0, carryOver: 0 };
        }
        const m1 = cellMonth(r, qRaw, 0);
        const m2 = cellMonth(r, qRaw, 1);
        const m3 = cellMonth(r, qRaw, 2);
        const qt = num(
          cell(r, 'quarter_target') ||
            (r as Record<string, string>)['quartertarget'] ||
            (r as Record<string, string>)['quartertar'] ||
            (r as Record<string, string>)['quarter_target'] ||
            ''
        );
        const co = num(cell(r, 'carry_over') || r.carry_over);
        const statusRaw = String((cell(r, 'status') || r.status) ?? '').trim().toLowerCase().replace(/\s+/g, '');
        const status: 'signed' | 'forecasted' | 'target' | string =
          statusRaw === 'target' || statusRaw.includes('target')
            ? 'target'
            : statusRaw.includes('signed') || statusRaw.includes('closedwon') || (statusRaw.includes('closed') && statusRaw.includes('won')) || statusRaw === 'won'
              ? 'signed'
              : statusRaw.includes('forecast') || statusRaw.includes('pipeline') || statusRaw === 'forecasted'
                ? 'forecasted'
                : statusRaw;
        if (status === 'signed') {
          out[qRaw][metricKey]!.monthSigned[0] += m1;
          out[qRaw][metricKey]!.monthSigned[1] += m2;
          out[qRaw][metricKey]!.monthSigned[2] += m3;
        } else if (status === 'forecasted') {
          out[qRaw][metricKey]!.monthForecasted[0] += m1;
          out[qRaw][metricKey]!.monthForecasted[1] += m2;
          out[qRaw][metricKey]!.monthForecasted[2] += m3;
        } else if (status === 'target' && qt > 0) {
          out[qRaw][metricKey]!.quarterTarget += qt;
        }
        if (co > 0) out[qRaw][metricKey]!.carryOver = co;
      }
      return Object.keys(out).length > 0 ? out : undefined;
    })(),
    quarterTargetBySegment: (() => {
      const bySegment: Record<string, Record<string, Record<string, number>>> = {};
      for (const r of quarterMetricInputRows) {
        const status = String((cell(r, 'status') || r.status) ?? '').trim().toLowerCase();
        if (status !== 'target') continue;
        const qRaw = String(((cell(r, 'quarter') || r.quarter) ?? '').trim()).toUpperCase().replace(/\s+/g, '');
        if (!qRaw || !/^20\d{2}Q[1-4]$/.test(qRaw)) continue;
        const metricRaw = String(((cell(r, 'metric') || r.metric) ?? '').trim()).toLowerCase();
        const metricNorm: Record<string, QuarterProjectionMetricKey> = {
          'clientwins': 'clientWins',
          'client wins': 'clientWins',
          acv: 'acv',
          'acv signed': 'acv',
          'inyearrevenue': 'inYearRevenue',
          'in-year revenue': 'inYearRevenue',
          'in year revenue': 'inYearRevenue',
          'arrtarget': 'arrTarget',
          'arr target': 'arrTarget',
        };
        const metricKey = metricNorm[metricRaw] ?? metricNorm[metricRaw.replace(/-/g, ' ')];
        if (!metricKey) continue;
        const segmentRaw = String((cell(r, 'segment') || r.segment) ?? '').trim();
        if (!segmentRaw) continue;
        const qt = num(
          cell(r, 'quarter_target') ||
            (r as Record<string, string>)['quartertarget'] ||
            (r as Record<string, string>)['quartertar'] ||
            (r as Record<string, string>)['quarter_target'] ||
            ''
        );
        if (qt <= 0) continue;
        if (!bySegment[qRaw]) bySegment[qRaw] = {};
        if (!bySegment[qRaw][metricKey]) bySegment[qRaw][metricKey] = {};
        bySegment[qRaw][metricKey][segmentRaw] = (bySegment[qRaw][metricKey][segmentRaw] ?? 0) + qt;
      }
      return Object.keys(bySegment).length > 0 ? bySegment : undefined;
    })(),
    quarterDealOwners: (() => {
      const byQuarter: Record<string, Set<string>> = {};
      for (const r of quarterMetricInputRows) {
        const qRaw = String(((cell(r, 'quarter') || r.quarter) ?? '').trim()).toUpperCase().replace(/\s+/g, '');
        if (!qRaw || !/^20\d{2}Q[1-4]$/.test(qRaw)) continue;
        const ownerRaw = cellDealOwner(r);
        if (!ownerRaw) continue;
        if (!byQuarter[qRaw]) byQuarter[qRaw] = new Set();
        byQuarter[qRaw].add(ownerRaw);
      }
      for (const r of quarterTargetsByDealOwnerRows) {
        const qRaw = String(((cell(r, 'quarter') || r.quarter) ?? '').trim()).toUpperCase().replace(/\s+/g, '');
        if (!qRaw || !/^20\d{2}Q[1-4]$/.test(qRaw)) continue;
        const ownerRaw = cellDealOwner(r);
        if (!ownerRaw) continue;
        if (!byQuarter[qRaw]) byQuarter[qRaw] = new Set();
        byQuarter[qRaw].add(ownerRaw);
      }
      const out: Record<string, string[]> = {};
      for (const [q, set] of Object.entries(byQuarter)) {
        out[q] = Array.from(set).sort();
      }
      return Object.keys(out).length > 0 ? out : undefined;
    })(),
    quarterTargetByDealOwner: (() => {
      const fromDealOwnerSheet: Record<string, Record<string, Record<string, number>>> = {};
      const metricNorm: Record<string, QuarterProjectionMetricKey> = {
        'clientwins': 'clientWins',
        'client wins': 'clientWins',
        acv: 'acv',
        'acv signed': 'acv',
        'inyearrevenue': 'inYearRevenue',
        'in-year revenue': 'inYearRevenue',
        'in-year reven': 'inYearRevenue',
        'in year revenue': 'inYearRevenue',
        'arrtarget': 'arrTarget',
        'arr target': 'arrTarget',
        'year-end arr target': 'arrTarget',
        'year end arr target': 'arrTarget',
        'yearendarrtarget': 'arrTarget',
        'year-end arr': 'arrTarget',
        'year end arr': 'arrTarget',
      };

      // Format 1: Wide layout (Metric | Deal Owner | Q1 | Q2 | Q3 | Q4) – one row per metric per owner
      const quarters: [string, string][] = [['2026Q1', 'q1'], ['2026Q2', 'q2'], ['2026Q3', 'q3'], ['2026Q4', 'q4']];
      for (const r of quarterTargetsByDealOwnerRows) {
        const metricRaw = String(((cell(r, 'metric') || (r as Record<string, string>).metric) ?? '').trim()).toLowerCase().replace(/\s+/g, ' ');
        let metricKey = metricNorm[metricRaw] ?? metricNorm[metricRaw.replace(/-/g, ' ')];
        if (!metricKey && /year\s*[-]?\s*end\s*arr|arr\s*target/.test(metricRaw)) metricKey = 'arrTarget';
        if (!metricKey) continue;
        const ownerRaw = cellDealOwner(r);
        if (!ownerRaw) continue;
        for (const [qId, col] of quarters) {
          const val = num(cell(r, col) || (r as Record<string, string>)[col] || '');
          if (val <= 0) continue;
          if (!fromDealOwnerSheet[qId]) fromDealOwnerSheet[qId] = { clientWins: {}, acv: {}, inYearRevenue: {}, arrTarget: {} };
          fromDealOwnerSheet[qId][metricKey][ownerRaw] = (fromDealOwnerSheet[qId][metricKey][ownerRaw] ?? 0) + val;
        }
      }
      if (Object.keys(fromDealOwnerSheet).length > 0) return fromDealOwnerSheet;

      // Format 2: Long layout (quarter | deal_owner | clientWins | acv | inYearRevenue) – one row per quarter per owner
      for (const r of quarterTargetsByDealOwnerRows) {
        const qRaw = String(((cell(r, 'quarter') || r.quarter) ?? '').trim()).toUpperCase().replace(/\s+/g, '');
        if (!qRaw || !/^20\d{2}Q[1-4]$/.test(qRaw)) continue;
        const ownerRaw = cellDealOwner(r);
        if (!ownerRaw) continue;
        const cw = num(cell(r, 'clientWins') || cell(r, 'client wins') || '');
        const acvVal = num(cell(r, 'acv') || cell(r, 'acv signed') || '');
        const iyr = num(cell(r, 'inYearRevenue') || cell(r, 'in-year revenue') || cell(r, 'inyearrevenue') || '');
        const arrT = num(cell(r, 'arrTarget') || cell(r, 'arr target') || '');
        if (cw === 0 && acvVal === 0 && iyr === 0 && arrT === 0) continue;
        if (!fromDealOwnerSheet[qRaw]) fromDealOwnerSheet[qRaw] = { clientWins: {}, acv: {}, inYearRevenue: {}, arrTarget: {} };
        if (cw > 0) fromDealOwnerSheet[qRaw].clientWins[ownerRaw] = (fromDealOwnerSheet[qRaw].clientWins[ownerRaw] ?? 0) + cw;
        if (acvVal > 0) fromDealOwnerSheet[qRaw].acv[ownerRaw] = (fromDealOwnerSheet[qRaw].acv[ownerRaw] ?? 0) + acvVal;
        if (iyr > 0) fromDealOwnerSheet[qRaw].inYearRevenue[ownerRaw] = (fromDealOwnerSheet[qRaw].inYearRevenue[ownerRaw] ?? 0) + iyr;
        if (arrT > 0) fromDealOwnerSheet[qRaw].arrTarget[ownerRaw] = (fromDealOwnerSheet[qRaw].arrTarget[ownerRaw] ?? 0) + arrT;
      }
      if (Object.keys(fromDealOwnerSheet).length > 0) return fromDealOwnerSheet;

      // Fallback: from QuarterMetricInput Target rows
      const byOwner: Record<string, Record<string, Record<string, number>>> = {};
      for (const r of quarterMetricInputRows) {
        const status = String((cell(r, 'status') || r.status) ?? '').trim().toLowerCase();
        if (status !== 'target') continue;
        const qRaw = String(((cell(r, 'quarter') || r.quarter) ?? '').trim()).toUpperCase().replace(/\s+/g, '');
        if (!qRaw || !/^20\d{2}Q[1-4]$/.test(qRaw)) continue;
        const metricRaw = String(((cell(r, 'metric') || r.metric) ?? '').trim()).toLowerCase();
        const metricNorm: Record<string, QuarterProjectionMetricKey> = {
          'clientwins': 'clientWins',
          'client wins': 'clientWins',
          acv: 'acv',
          'acv signed': 'acv',
          'inyearrevenue': 'inYearRevenue',
          'in-year revenue': 'inYearRevenue',
          'in year revenue': 'inYearRevenue',
          'arrtarget': 'arrTarget',
          'arr target': 'arrTarget',
        };
        const metricKey = metricNorm[metricRaw] ?? metricNorm[metricRaw.replace(/-/g, ' ')];
        if (!metricKey) continue;
        const ownerRaw = cellDealOwner(r);
        if (!ownerRaw) continue;
        const qt = num(
          cell(r, 'quarter_target') ||
            (r as Record<string, string>)['quartertarget'] ||
            (r as Record<string, string>)['quartertar'] ||
            (r as Record<string, string>)['quarter_target'] ||
            ''
        );
        if (qt <= 0) continue;
        if (!byOwner[qRaw]) byOwner[qRaw] = {};
        if (!byOwner[qRaw][metricKey]) byOwner[qRaw][metricKey] = {};
        byOwner[qRaw][metricKey][ownerRaw] = (byOwner[qRaw][metricKey][ownerRaw] ?? 0) + qt;
      }
      return Object.keys(byOwner).length > 0 ? byOwner : undefined;
    })(),
    quarterMetricInputBySegment: (() => {
      const bySegment: Record<string, Record<string, Record<string, { monthSigned: number[]; monthForecasted: number[]; carryOver: number }>>> = {};
      for (const r of quarterMetricInputRows) {
        const status = String((cell(r, 'status') || r.status) ?? '').trim().toLowerCase();
        if (status !== 'signed' && status !== 'forecasted') continue;
        const qRaw = String(((cell(r, 'quarter') || r.quarter) ?? '').trim()).toUpperCase().replace(/\s+/g, '');
        if (!qRaw || !/^20\d{2}Q[1-4]$/.test(qRaw)) continue;
        const metricRaw = String(((cell(r, 'metric') || r.metric) ?? '').trim()).toLowerCase();
        const metricNorm: Record<string, QuarterProjectionMetricKey> = {
          'clientwins': 'clientWins', 'client wins': 'clientWins', acv: 'acv', 'acv signed': 'acv',
          'inyearrevenue': 'inYearRevenue', 'in-year revenue': 'inYearRevenue', 'in year revenue': 'inYearRevenue',
          'arrtarget': 'arrTarget', 'arr target': 'arrTarget',
        };
        const metricKey = metricNorm[metricRaw] ?? metricNorm[metricRaw.replace(/-/g, ' ')];
        if (!metricKey) continue;
        const segmentRaw = String((cell(r, 'segment') || r.segment) ?? '').trim();
        if (!segmentRaw) continue;
        const m1 = cellMonth(r, qRaw, 0);
        const m2 = cellMonth(r, qRaw, 1);
        const m3 = cellMonth(r, qRaw, 2);
        const co = num(cell(r, 'carry_over') || r.carry_over);
        if (!bySegment[qRaw]) bySegment[qRaw] = {};
        if (!bySegment[qRaw][metricKey]) bySegment[qRaw][metricKey] = {};
        if (!bySegment[qRaw][metricKey][segmentRaw]) {
          bySegment[qRaw][metricKey][segmentRaw] = { monthSigned: [0, 0, 0], monthForecasted: [0, 0, 0], carryOver: 0 };
        }
        const entry = bySegment[qRaw][metricKey][segmentRaw]!;
        if (status === 'signed') {
          entry.monthSigned[0] += m1;
          entry.monthSigned[1] += m2;
          entry.monthSigned[2] += m3;
        } else {
          entry.monthForecasted[0] += m1;
          entry.monthForecasted[1] += m2;
          entry.monthForecasted[2] += m3;
        }
        if (co > 0) entry.carryOver += co;
      }
      return Object.keys(bySegment).length > 0 ? bySegment : undefined;
    })(),
    quarterMetricInputByDealOwner: (() => {
      const byOwner: Record<string, Record<string, Record<string, { monthSigned: number[]; monthForecasted: number[]; carryOver: number }>>> = {};
      for (const r of quarterMetricInputRows) {
        const status = String((cell(r, 'status') || r.status) ?? '').trim().toLowerCase();
        if (status !== 'signed' && status !== 'forecasted') continue;
        const qRaw = String(((cell(r, 'quarter') || r.quarter) ?? '').trim()).toUpperCase().replace(/\s+/g, '');
        if (!qRaw || !/^20\d{2}Q[1-4]$/.test(qRaw)) continue;
        const metricRaw = String(((cell(r, 'metric') || r.metric) ?? '').trim()).toLowerCase();
        const metricNorm: Record<string, QuarterProjectionMetricKey> = {
          'clientwins': 'clientWins', 'client wins': 'clientWins', acv: 'acv', 'acv signed': 'acv',
          'inyearrevenue': 'inYearRevenue', 'in-year revenue': 'inYearRevenue', 'in year revenue': 'inYearRevenue',
          'arrtarget': 'arrTarget', 'arr target': 'arrTarget',
        };
        const metricKey = metricNorm[metricRaw] ?? metricNorm[metricRaw.replace(/-/g, ' ')];
        if (!metricKey) continue;
        const ownerRaw = cellDealOwner(r);
        if (!ownerRaw) continue;
        const m1 = cellMonth(r, qRaw, 0);
        const m2 = cellMonth(r, qRaw, 1);
        const m3 = cellMonth(r, qRaw, 2);
        const co = num(cell(r, 'carry_over') || r.carry_over);
        if (!byOwner[qRaw]) byOwner[qRaw] = {};
        if (!byOwner[qRaw][metricKey]) byOwner[qRaw][metricKey] = {};
        if (!byOwner[qRaw][metricKey][ownerRaw]) {
          byOwner[qRaw][metricKey][ownerRaw] = { monthSigned: [0, 0, 0], monthForecasted: [0, 0, 0], carryOver: 0 };
        }
        const entry = byOwner[qRaw][metricKey][ownerRaw]!;
        if (status === 'signed') {
          entry.monthSigned[0] += m1;
          entry.monthSigned[1] += m2;
          entry.monthSigned[2] += m3;
        } else {
          entry.monthForecasted[0] += m1;
          entry.monthForecasted[1] += m2;
          entry.monthForecasted[2] += m3;
        }
        if (co > 0) entry.carryOver += co;
      }
      return Object.keys(byOwner).length > 0 ? byOwner : undefined;
    })(),
    q1DetailsTable: (q1DetailsRows?.length ?? 0) > 0 ? q1DetailsRows : undefined,
    q2DetailsTable: (q2DetailsRows?.length ?? 0) > 0 ? q2DetailsRows : undefined,
    januaryDetailsTable: (januaryDetailsRows?.length ?? 0) > 0 ? januaryDetailsRows : undefined,
    februaryDetailsTable: (februaryDetailsRows?.length ?? 0) > 0 ? februaryDetailsRows : undefined,
    marchDetailsTable: (marchDetailsRows?.length ?? 0) > 0 ? marchDetailsRows : undefined,
  };
}

export { isGoogleSheetsConfigured };
