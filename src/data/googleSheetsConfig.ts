/**
 * Google Sheets data source config.
 *
 * You can set the Spreadsheet ID via environment variable:
 *   VITE_GOOGLE_SHEETS_ID=your_spreadsheet_id
 * (in .env). Otherwise set spreadsheetId below.
 *
 * Full steps: see GOOGLE_SHEETS_SETUP.md and the "Instructions" sheet in Data_Structures_Reference.xlsx.
 */

/** Spreadsheet ID: from env VITE_GOOGLE_SHEETS_ID or set fallback below */
const FALLBACK_SPREADSHEET_ID = '1rXYAc7vlTTaaJmnRVhSDEjGmWRBzyLaYJtDibbv94yA';

function getSpreadsheetId(): string {
  const env = typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_SHEETS_ID;
  const fromEnv = env && typeof env === 'string' ? env.trim() : '';
  return fromEnv || FALLBACK_SPREADSHEET_ID;
}

export const googleSheetsConfig = {
  /** From the sheet URL: .../d/THIS_PART/edit. Or set VITE_GOOGLE_SHEETS_ID in .env */
  get spreadsheetId(): string {
    return getSpreadsheetId();
  },

  /** Sheet tab name (in the Excel/Google doc) → GID (number as string). Get GID from URL when you click the tab. */
  sheetGids: {
    SalesKPIs: '2109596373',
    ForecastPoint: '2061591889',
    ForecastPointBySegment: '524556140',
    PipelineStage: '114361560',
    DealSegment: '1425347438',
    ARRByMonthPoint: '261112563',
    ARR_LicenseDetail: '1269584713',
    ARR_MinimumDetail: '714933824',
    ARR_VolumeDetail: '275905580',
    PipelineDeal: '878347444',
    ACVByMonth: '365794913',
    ClientWinsPoint: '503746360',
    ClientDeal: '740156013',
    QuarterDeal: '399575525',
    /** Optional: quarter targets (columns: quarter, clientWins, acv, inYearRevenue). Set GID to use. */
    QuarterTargets: '',
    /** Optional: cumulative chart (columns: metric, type, Jan..Dec). Rows: ACV/In-year rev/ARR/Client wins × Actual/Forecast/Target. */
    CumulativeChartData: '1352982034',
    /** Optional: quarter metric × status input (quarter, metric, status, segment, deal_owner, carry_over, month1–3, total_projected, quarter_target). */
    QuarterMetricInput: '1253132527',
  } as Record<string, string>,
};

export function isGoogleSheetsConfigured(): boolean {
  return Boolean(
    googleSheetsConfig.spreadsheetId &&
      Object.values(googleSheetsConfig.sheetGids).some((gid) => Boolean(gid))
  );
}
