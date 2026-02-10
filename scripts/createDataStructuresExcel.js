/**
 * Creates an Excel file with the Sales Dashboard data structures and example rows.
 * Run: node scripts/createDataStructuresExcel.js
 * Output: Data_Structures_Reference.xlsx in project root
 */

import XLSX from 'xlsx';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const outPath = join(__dirname, '..', 'Data_Structures_Reference.xlsx');

const SEGMENT_OPTIONS = ['Bank & Bank Tech', 'Fintechs', 'Gateways', 'Large Merchants', 'HVHM'];

function addSheet(wb, name, data) {
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, name);
}

function addSheetFromRows(wb, name, rows) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, name);
}

const workbook = XLSX.utils.book_new();

// ---- Instructions (first sheet – for upload to Google Sheets) ----
const instructionsRows = [
  ['Sales Dashboard – Data template for Google Sheets'],
  [''],
  ['1. FILL IN YOUR DATA'],
  ['   Use the other sheets in this workbook. Row 1 must be the header row (column names).'],
  ['   Do not change the sheet tab names (e.g. SalesKPIs, ForecastPoint, PipelineDeal).'],
  [''],
  ['2. UPLOAD TO GOOGLE SHEETS'],
  ['   • Upload this file to Google Drive, then open with Google Sheets'],
  ['   • Or: In Google Sheets, File → Import → Upload and select this .xlsx file'],
  [''],
  ['3. PUBLISH TO WEB'],
  ['   • File → Share → Publish to web'],
  ['   • Choose "Entire document" or each sheet individually'],
  ['   • Format: Comma-separated values (.csv)'],
  ['   • Click Publish'],
  [''],
  ['4. GET YOUR IDs'],
  ['   • Spreadsheet ID: from the URL .../d/SPREADSHEET_ID/edit'],
  ['   • Sheet GID: click each sheet tab; URL ends with #gid=123456 (that number is the GID)'],
  [''],
  ['5. CONFIGURE THE DASHBOARD'],
  ['   • Set VITE_GOOGLE_SHEETS_ID in .env (or FALLBACK_SPREADSHEET_ID in src/data/googleSheetsConfig.ts)'],
  ['   • In googleSheetsConfig.ts set each sheetGids entry to that sheet\'s GID'],
  ['   • See GOOGLE_SHEETS_SETUP.md for full steps'],
  [''],
  ['Sheet names the dashboard expects (use exact names):'],
  ['SalesKPIs, ForecastPoint, ForecastPointBySegment, PipelineStage, DealSegment,'],
  ['ARRByMonthPoint, ARR_LicenseDetail, ARR_MinimumDetail, ARR_VolumeDetail,'],
  ['PipelineDeal, ACVByMonth, ClientWinsPoint, ClientDeal, QuarterDeal, QuarterTargets (optional), CumulativeChartData (optional)'],
  [''],
  ['Key sheets for Overview: SalesKPIs, ARRByMonthPoint, PipelineDeal, ClientWinsPoint.'],
  ['PipelineDeal.stage drives "Pipeline by deal stage"; segment drives "Deal distribution by segment".'],
  [''],
  ['TARGETS (optional):'],
  ['• SalesKPIs: add columns annualARRTarget, annualACVTarget, annualInYearRevenueTarget, annualClientWinsTarget'],
  ['  for the "Cumulative Actual/Forecast vs Target" chart (linear target). One row of KPIs.'],
  ['• QuarterTargets: optional sheet with columns quarter, clientWins, acv, inYearRevenue.'],
  ['  One row per quarter (e.g. 2026Q1–Q4). Used in Quarter tab waterfall.'],
  ['• CumulativeChartData: optional sheet. Columns: metric, type, Jan, Feb, … Dec.'],
  ['  Rows: one per metric × type (e.g. ACV Actual, ACV Forecast, ACV Target, In-year rev Actual, …).'],
  ['  Values = cumulative to end of that month. Lets you use a non-linear target ramp. Set GID to use.'],
  [''],
  ['QUARTER INPUT (optional – metric × status grid with carry-over from Q2):'],
  ['• QuarterMetricInput: quarter, metric (Client wins, ACV signed, In-year revenue), status (Forecasted, Signed, Target),'],
  ['  segment, deal_owner (for filters; leave blank for all), carry_over (0 for Q1; from Q2 use value from prior quarter(s)),'],
  ['  month1, month2, month3 (Jan–Mar for Q1; Apr–Jun for Q2; Jul–Sep for Q3; Oct–Dec for Q4), total_projected, quarter_target.'],
];
addSheetFromRows(workbook, 'Instructions', instructionsRows);

// ---- Reference sheet: type name, where used, fields ----
const referenceRows = [
  ['Data Type', 'Used In', 'Field Names / Notes'],
  ['SalesKPIs', 'Overview – KPI cards + optional annual targets for cumulative chart', 'forecastARR, pipelineValue, closedWon, winRate, forecastARRDelta?, pipelineValueDelta?, closedWonDelta?, winRateDelta?, annualARRTarget?, annualACVTarget?, annualInYearRevenueTarget?, annualClientWinsTarget?'],
  ['ForecastPoint', 'Optional – aggregated forecast over time', 'month, forecast, target'],
  ['ForecastPointBySegment', 'Optional – forecast by segment (for segment filter)', 'month, segment, forecast, target'],
  ['PipelineStage', 'Optional – pipeline totals by stage (name, value, count)', 'name, value, count'],
  ['DealSegment', 'Optional – segment share % and color (or use PipelineDeal; Overview donut uses deal count from PipelineDeal)', 'name, value (%), fill (color)'],
  ['ARRByMonthPoint', 'Overview cumulative chart + Forecast tab + YTD / Current ARR KPIs', 'month, license, minimum, volumeDriven'],
  ['ARR_LicenseDetail', 'Forecast tab – modal detail per month', 'month, clientName, amount, segment'],
  ['ARR_MinimumDetail', 'Forecast tab – modal detail per month', 'month, clientName, amount, segment'],
  ['ARR_VolumeDetail', 'Forecast tab – modal detail per month', 'month, clientName, transactions, pricePoint, amount, segment'],
  ['PipelineDeal', 'Overview (Pipeline by stage, Deal donut by count) + Pipeline tab', 'id, name, acv, closeDate (YYYY-MM), stage?, segment'],
  ['ACVByMonth', 'Optional – pre-aggregated ACV by month (or derived from PipelineDeal)', 'month, monthKey (YYYY-MM), totalACV'],
  ['ClientWinsPoint', 'Overview cumulative chart (Client wins metric) + Pipeline tab', 'period (e.g. Jan 2026), wins'],
  ['ClientDeal', 'Accounts tab – table', 'id, dealName, closeDate (YYYY-MM-DD), segment, acv, estimatedTransactionsPerMonth, dealOwner'],
  ['QuarterDeal', 'Quarter tabs – table & chart', 'id, clientName, dealName, closeDate, segment, acv, arrForecast, annualizedTransactionForecast, dealOwner, targetAccount (true/false), latestNextSteps, confidenceQuarterClose (0-100)'],
  ['QuarterTargets', 'Optional – Quarter tab waterfall target bar', 'quarter (2026Q1, 2026Q2, 2026Q3, 2026Q4), clientWins (count), acv ($), inYearRevenue ($)'],
  ['CumulativeChartData', 'Optional – Cumulative Actual/Forecast vs Target chart (non-linear target)', 'metric (ACV, In-year rev, ARR, Client wins), type (Actual, Forecast, Target), Jan, Feb, … Dec (cumulative values)'],
  ['QuarterMetricInput', 'Optional – Quarter tab input: metric × status grid; use segment & deal_owner to filter', 'quarter, metric (Client wins, ACV signed, In-year revenue), status (Forecasted, Signed, Target), segment?, deal_owner?, carry_over (0 for Q1), month1, month2, month3, total_projected, quarter_target'],
  ['', '', ''],
  ['Segment values (for segment field):', '', SEGMENT_OPTIONS.join(' | ')],
  ['Stage values (for PipelineDeal.stage):', '', 'Qualification, Discovery, Proposal, Negotiation, Closed Won'],
];
addSheetFromRows(workbook, 'Reference', referenceRows);

// ---- SalesKPIs (single row; optional annual target columns for cumulative chart) ----
addSheet(workbook, 'SalesKPIs', [
  {
    forecastARR: 2840000,
    pipelineValue: 1920000,
    closedWon: 12,
    winRate: 34,
    forecastARRDelta: 4.2,
    pipelineValueDelta: -2.1,
    closedWonDelta: 1,
    winRateDelta: 2.5,
    annualARRTarget: 2900000,
    annualACVTarget: 3200000,
    annualInYearRevenueTarget: 2800000,
    annualClientWinsTarget: 52,
  },
]);

// ---- ForecastPoint ----
addSheet(workbook, 'ForecastPoint', [
  { month: 'Jul', forecast: 2100000, target: 2400000 },
  { month: 'Aug', forecast: 2210000, target: 2448000 },
  { month: 'Sep', forecast: 2350000, target: 2496960 },
  { month: 'Oct', forecast: 2480000, target: 2546760 },
]);

// ---- ForecastPointBySegment ----
addSheet(workbook, 'ForecastPointBySegment', [
  { month: 'Jul', segment: 'Bank & Bank Tech', forecast: 588000, target: 672000 },
  { month: 'Jul', segment: 'Fintechs', forecast: 504000, target: 576000 },
  { month: 'Aug', segment: 'Bank & Bank Tech', forecast: 619000, target: 685000 },
  { month: 'Aug', segment: 'Fintechs', forecast: 531000, target: 588000 },
]);

// ---- PipelineStage ----
addSheet(workbook, 'PipelineStage', [
  { name: 'Qualification', value: 420000, count: 18 },
  { name: 'Discovery', value: 380000, count: 12 },
  { name: 'Proposal', value: 520000, count: 8 },
  { name: 'Negotiation', value: 350000, count: 5 },
  { name: 'Closed Won', value: 250000, count: 4 },
]);

// ---- DealSegment ----
addSheet(workbook, 'DealSegment', [
  { name: 'Bank & Bank Tech', value: 28, fill: '#1e1b4b' },
  { name: 'Fintechs', value: 24, fill: '#3730a3' },
  { name: 'Gateways', value: 18, fill: '#0ea5e9' },
  { name: 'Large Merchants', value: 18, fill: '#38bdf8' },
  { name: 'HVHM', value: 12, fill: '#7dd3fc' },
]);

// ---- ARRByMonthPoint ----
addSheet(workbook, 'ARRByMonthPoint', [
  { month: 'Jan', license: 180000, minimum: 80000, volumeDriven: 45000 },
  { month: 'Feb', license: 195000, minimum: 72000, volumeDriven: 52000 },
  { month: 'Mar', license: 210000, minimum: 95000, volumeDriven: 38000 },
]);

// ---- ARR detail (License) ----
addSheet(workbook, 'ARR_LicenseDetail', [
  { month: 'Jan', clientName: 'Acme Corp', amount: 90000, segment: 'Bank & Bank Tech' },
  { month: 'Jan', clientName: 'Beta Inc', amount: 90000, segment: 'Fintechs' },
  { month: 'Feb', clientName: 'Acme Corp', amount: 100000, segment: 'Bank & Bank Tech' },
  { month: 'Feb', clientName: 'Gamma Ltd', amount: 95000, segment: 'Gateways' },
]);

// ---- ARR detail (Minimum) ----
addSheet(workbook, 'ARR_MinimumDetail', [
  { month: 'Jan', clientName: 'Gamma Ltd', amount: 40000, segment: 'Gateways' },
  { month: 'Jan', clientName: 'Delta Solutions', amount: 40000, segment: 'Large Merchants' },
  { month: 'Feb', clientName: 'Epsilon Group', amount: 36000, segment: 'HVHM' },
  { month: 'Feb', clientName: 'Zeta Industries', amount: 36000, segment: 'Fintechs' },
]);

// ---- ARR detail (Volume-driven) ----
addSheet(workbook, 'ARR_VolumeDetail', [
  { month: 'Jan', clientName: 'Epsilon Group', transactions: 1200, pricePoint: 25, amount: 30000, segment: 'HVHM' },
  { month: 'Jan', clientName: 'Zeta Industries', transactions: 500, pricePoint: 30, amount: 15000, segment: 'Bank & Bank Tech' },
  { month: 'Feb', clientName: 'Eta Partners', transactions: 2000, pricePoint: 26, amount: 52000, segment: 'Fintechs' },
]);

// ---- PipelineDeal ----
addSheet(workbook, 'PipelineDeal', [
  { id: 'deal-1', name: 'Acme Corp – Platform', acv: 120000, closeDate: '2026-01', stage: 'Negotiation', segment: 'Bank & Bank Tech' },
  { id: 'deal-2', name: 'Beta Inc – Enterprise', acv: 85000, closeDate: '2026-02', stage: 'Proposal', segment: 'Fintechs' },
  { id: 'deal-3', name: 'Gamma Ltd – Standard', acv: 200000, closeDate: '2026-01', stage: 'Closed Won', segment: 'Gateways' },
  { id: 'deal-4', name: 'Delta Solutions – Premium', acv: 95000, closeDate: '2026-03', segment: 'Large Merchants' },
]);

// ---- ACVByMonth ----
addSheet(workbook, 'ACVByMonth', [
  { month: 'Jan 2026', monthKey: '2026-01', totalACV: 320000 },
  { month: 'Feb 2026', monthKey: '2026-02', totalACV: 185000 },
  { month: 'Mar 2026', monthKey: '2026-03', totalACV: 95000 },
]);

// ---- ClientWinsPoint ----
addSheet(workbook, 'ClientWinsPoint', [
  { period: 'Jan 2026', wins: 3 },
  { period: 'Feb 2026', wins: 5 },
  { period: 'Mar 2026', wins: 2 },
  { period: 'Apr 2026', wins: 4 },
]);

// ---- ClientDeal ----
addSheet(workbook, 'ClientDeal', [
  { id: 'client-deal-1', dealName: 'Acme Corp – Platform', closeDate: '2025-03-15', segment: 'Bank & Bank Tech', acv: 120000, estimatedTransactionsPerMonth: 15000, dealOwner: 'Alex Morgan' },
  { id: 'client-deal-2', dealName: 'Beta Inc – Enterprise', closeDate: '2025-06-22', segment: 'Fintechs', acv: 85000, estimatedTransactionsPerMonth: 22000, dealOwner: 'Jordan Smith' },
  { id: 'client-deal-3', dealName: 'Gamma Ltd – Standard', closeDate: '2026-01-10', segment: 'Gateways', acv: 200000, estimatedTransactionsPerMonth: 45000, dealOwner: 'Sam Taylor' },
]);

// ---- QuarterDeal ----
addSheet(workbook, 'QuarterDeal', [
  { id: 'q1-1', clientName: 'Acme Corp', dealName: 'Acme Corp – Platform', closeDate: '2026-02-14', segment: 'Fintechs', acv: 180000, arrForecast: 165000, annualizedTransactionForecast: 120000, dealOwner: 'Jordan Smith', targetAccount: true, latestNextSteps: 'Follow-up call scheduled.', confidenceQuarterClose: 85 },
  { id: 'q1-2', clientName: 'Beta Inc', dealName: 'Beta Inc – Enterprise', closeDate: '2026-03-05', segment: 'Bank & Bank Tech', acv: 95000, arrForecast: 88000, annualizedTransactionForecast: 80000, dealOwner: 'Alex Morgan', targetAccount: false, latestNextSteps: 'Demo completed. Sending proposal.', confidenceQuarterClose: 70 },
]);

// ---- QuarterTargets (optional – target bar in Quarter tab waterfall) ----
addSheet(workbook, 'QuarterTargets', [
  { quarter: '2026Q1', clientWins: 10, acv: 600000, inYearRevenue: 550000 },
  { quarter: '2026Q2', clientWins: 12, acv: 720000, inYearRevenue: 660000 },
  { quarter: '2026Q3', clientWins: 14, acv: 840000, inYearRevenue: 770000 },
  { quarter: '2026Q4', clientWins: 16, acv: 960000, inYearRevenue: 880000 },
]);

// ---- CumulativeChartData (optional – cumulative chart with non-linear target; columns: metric, type, Jan..Dec) ----
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function cumRow(metric, type, values) {
  const row = { metric, type };
  months.forEach((m, i) => { row[m] = values[i] ?? 0; });
  return row;
}
addSheet(workbook, 'CumulativeChartData', [
  cumRow('ACV', 'Actual', [100000, 250000, 400000, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
  cumRow('ACV', 'Forecast', [100000, 250000, 400000, 550000, 720000, 900000, 1100000, 1320000, 1560000, 1820000, 2100000, 2400000]),
  cumRow('ACV', 'Target', [200000, 450000, 750000, 1100000, 1500000, 1950000, 2450000, 2780000, 2980000, 3100000, 3170000, 3200000]),
  cumRow('In-year rev', 'Actual', [80000, 200000, 320000, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
  cumRow('In-year rev', 'Forecast', [80000, 200000, 320000, 450000, 600000, 760000, 940000, 1140000, 1360000, 1600000, 1860000, 2150000]),
  cumRow('In-year rev', 'Target', [180000, 380000, 600000, 840000, 1100000, 1380000, 1680000, 2000000, 2340000, 2600000, 2720000, 2800000]),
  cumRow('ARR', 'Actual', [220000, 450000, 680000, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
  cumRow('ARR', 'Forecast', [220000, 450000, 680000, 920000, 1180000, 1450000, 1750000, 2080000, 2420000, 2620000, 2760000, 2900000]),
  cumRow('ARR', 'Target', [220000, 460000, 720000, 1000000, 1300000, 1620000, 1960000, 2320000, 2580000, 2720000, 2820000, 2900000]),
  cumRow('Client wins', 'Actual', [3, 8, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
  cumRow('Client wins', 'Forecast', [3, 8, 12, 18, 25, 33, 42, 46, 49, 51, 52, 52]),
  cumRow('Client wins', 'Target', [4, 10, 18, 28, 36, 42, 46, 49, 50, 51, 52, 52]),
]);

// ---- QuarterMetricInput (optional – quarterly metric × status input; Q1 no carry-over, Q2+ has carry_over; segment & deal_owner for filters) ----
// Columns: quarter, metric, status, segment, deal_owner, carry_over, month1, month2, month3, total_projected, quarter_target
// Leave segment and deal_owner blank for rollup (all); fill them to filter by segment and/or deal owner in the dashboard.
// Q1: month1=Jan, month2=Feb, month3=Mar. Q2: month1=Apr, month2=May, month3=Jun. Q3: Jul,Aug,Sep. Q4: Oct,Nov,Dec.
addSheet(workbook, 'QuarterMetricInput', [
  { quarter: '2026Q1', metric: 'Client wins', status: 'Forecasted', segment: '', deal_owner: '', carry_over: 0, month1: 2, month2: 3, month3: 4, total_projected: 9, quarter_target: 10 },
  { quarter: '2026Q1', metric: 'Client wins', status: 'Signed', segment: '', deal_owner: '', carry_over: 0, month1: 1, month2: 2, month3: 1, total_projected: 4, quarter_target: 10 },
  { quarter: '2026Q1', metric: 'Client wins', status: 'Target', segment: '', deal_owner: '', carry_over: 0, month1: 0, month2: 0, month3: 0, total_projected: 0, quarter_target: 10 },
  { quarter: '2026Q1', metric: 'ACV signed', status: 'Forecasted', segment: '', deal_owner: '', carry_over: 0, month1: 120000, month2: 180000, month3: 95000, total_projected: 395000, quarter_target: 600000 },
  { quarter: '2026Q1', metric: 'ACV signed', status: 'Signed', segment: '', deal_owner: '', carry_over: 0, month1: 80000, month2: 100000, month3: 50000, total_projected: 230000, quarter_target: 600000 },
  { quarter: '2026Q1', metric: 'ACV signed', status: 'Target', segment: '', deal_owner: '', carry_over: 0, month1: 0, month2: 0, month3: 0, total_projected: 0, quarter_target: 600000 },
  { quarter: '2026Q1', metric: 'In-year revenue', status: 'Forecasted', segment: '', deal_owner: '', carry_over: 0, month1: 110000, month2: 165000, month3: 88000, total_projected: 363000, quarter_target: 550000 },
  { quarter: '2026Q1', metric: 'In-year revenue', status: 'Signed', segment: '', deal_owner: '', carry_over: 0, month1: 70000, month2: 95000, month3: 45000, total_projected: 210000, quarter_target: 550000 },
  { quarter: '2026Q1', metric: 'In-year revenue', status: 'Target', segment: '', deal_owner: '', carry_over: 0, month1: 0, month2: 0, month3: 0, total_projected: 0, quarter_target: 550000 },
  { quarter: '2026Q2', metric: 'Client wins', status: 'Forecasted', segment: '', deal_owner: '', carry_over: 4, month1: 3, month2: 2, month3: 3, total_projected: 12, quarter_target: 12 },
  { quarter: '2026Q2', metric: 'Client wins', status: 'Signed', segment: '', deal_owner: '', carry_over: 0, month1: 0, month2: 1, month3: 2, total_projected: 3, quarter_target: 12 },
  { quarter: '2026Q2', metric: 'Client wins', status: 'Target', segment: '', deal_owner: '', carry_over: 0, month1: 0, month2: 0, month3: 0, total_projected: 0, quarter_target: 12 },
  { quarter: '2026Q2', metric: 'ACV signed', status: 'Forecasted', segment: '', deal_owner: '', carry_over: 230000, month1: 150000, month2: 200000, month3: 170000, total_projected: 750000, quarter_target: 720000 },
  { quarter: '2026Q2', metric: 'ACV signed', status: 'Signed', segment: '', deal_owner: '', carry_over: 0, month1: 0, month2: 80000, month3: 120000, total_projected: 200000, quarter_target: 720000 },
  { quarter: '2026Q2', metric: 'ACV signed', status: 'Target', segment: '', deal_owner: '', carry_over: 0, month1: 0, month2: 0, month3: 0, total_projected: 0, quarter_target: 720000 },
  { quarter: '2026Q2', metric: 'In-year revenue', status: 'Forecasted', segment: '', deal_owner: '', carry_over: 210000, month1: 140000, month2: 180000, month3: 130000, total_projected: 660000, quarter_target: 660000 },
  { quarter: '2026Q2', metric: 'In-year revenue', status: 'Signed', segment: '', deal_owner: '', carry_over: 0, month1: 0, month2: 70000, month3: 105000, total_projected: 175000, quarter_target: 660000 },
  { quarter: '2026Q1', metric: 'ACV signed', status: 'Signed', segment: 'Bank & Bank Tech', deal_owner: 'Alex Morgan', carry_over: 0, month1: 50000, month2: 50000, month3: 25000, total_projected: 125000, quarter_target: 600000 },
  { quarter: '2026Q3', metric: 'Client wins', status: 'Forecasted', segment: '', deal_owner: '', carry_over: 7, month1: 3, month2: 4, month3: 3, total_projected: 17, quarter_target: 14 },
  { quarter: '2026Q3', metric: 'Client wins', status: 'Signed', segment: '', deal_owner: '', carry_over: 0, month1: 0, month2: 2, month3: 2, total_projected: 4, quarter_target: 14 },
  { quarter: '2026Q3', metric: 'Client wins', status: 'Target', segment: '', deal_owner: '', carry_over: 0, month1: 0, month2: 0, month3: 0, total_projected: 0, quarter_target: 14 },
  { quarter: '2026Q3', metric: 'ACV signed', status: 'Forecasted', segment: '', deal_owner: '', carry_over: 430000, month1: 180000, month2: 220000, month3: 200000, total_projected: 1030000, quarter_target: 840000 },
  { quarter: '2026Q3', metric: 'ACV signed', status: 'Signed', segment: '', deal_owner: '', carry_over: 0, month1: 0, month2: 100000, month3: 150000, total_projected: 250000, quarter_target: 840000 },
  { quarter: '2026Q3', metric: 'ACV signed', status: 'Target', segment: '', deal_owner: '', carry_over: 0, month1: 0, month2: 0, month3: 0, total_projected: 0, quarter_target: 840000 },
  { quarter: '2026Q3', metric: 'In-year revenue', status: 'Forecasted', segment: '', deal_owner: '', carry_over: 385000, month1: 160000, month2: 200000, month3: 185000, total_projected: 930000, quarter_target: 770000 },
  { quarter: '2026Q3', metric: 'In-year revenue', status: 'Signed', segment: '', deal_owner: '', carry_over: 0, month1: 0, month2: 90000, month3: 120000, total_projected: 210000, quarter_target: 770000 },
  { quarter: '2026Q3', metric: 'In-year revenue', status: 'Target', segment: '', deal_owner: '', carry_over: 0, month1: 0, month2: 0, month3: 0, total_projected: 0, quarter_target: 770000 },
  { quarter: '2026Q4', metric: 'Client wins', status: 'Forecasted', segment: '', deal_owner: '', carry_over: 11, month1: 4, month2: 4, month3: 5, total_projected: 24, quarter_target: 16 },
  { quarter: '2026Q4', metric: 'Client wins', status: 'Signed', segment: '', deal_owner: '', carry_over: 0, month1: 0, month2: 1, month3: 3, total_projected: 4, quarter_target: 16 },
  { quarter: '2026Q4', metric: 'Client wins', status: 'Target', segment: '', deal_owner: '', carry_over: 0, month1: 0, month2: 0, month3: 0, total_projected: 0, quarter_target: 16 },
  { quarter: '2026Q4', metric: 'ACV signed', status: 'Forecasted', segment: '', deal_owner: '', carry_over: 680000, month1: 220000, month2: 260000, month3: 280000, total_projected: 1440000, quarter_target: 960000 },
  { quarter: '2026Q4', metric: 'ACV signed', status: 'Signed', segment: '', deal_owner: '', carry_over: 0, month1: 0, month2: 120000, month3: 180000, total_projected: 300000, quarter_target: 960000 },
  { quarter: '2026Q4', metric: 'ACV signed', status: 'Target', segment: '', deal_owner: '', carry_over: 0, month1: 0, month2: 0, month3: 0, total_projected: 0, quarter_target: 960000 },
  { quarter: '2026Q4', metric: 'In-year revenue', status: 'Forecasted', segment: '', deal_owner: '', carry_over: 595000, month1: 200000, month2: 240000, month3: 265000, total_projected: 1300000, quarter_target: 880000 },
  { quarter: '2026Q4', metric: 'In-year revenue', status: 'Signed', segment: '', deal_owner: '', carry_over: 0, month1: 0, month2: 110000, month3: 140000, total_projected: 250000, quarter_target: 880000 },
  { quarter: '2026Q4', metric: 'In-year revenue', status: 'Target', segment: '', deal_owner: '', carry_over: 0, month1: 0, month2: 0, month3: 0, total_projected: 0, quarter_target: 880000 },
]);

try {
  XLSX.writeFile(workbook, outPath);
  console.log('Created:', outPath);
} catch (err) {
  if (err && err.code === 'EBUSY') {
    const fallback = join(__dirname, '..', 'Data_Structures_Reference_new.xlsx');
    XLSX.writeFile(workbook, fallback);
    console.log('Original file is in use. Created:', fallback);
    console.log('Close Data_Structures_Reference.xlsx and run again to overwrite, or rename the _new file.');
  } else {
    throw err;
  }
}
