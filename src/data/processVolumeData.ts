import rawData from './volumeData.json';

export interface VolumeDataRow {
  client?: string;
  regulatoryType: string;
  transactionType: string;
  merchant: string;
  merchantJurisdiction: string;
  merchantIndustry: string;
  useCase: string;
  tpp: string;
  currency: string;
  sourceBankJurisdiction: string;
  transactionCategory: string;
  transactionSubType: string;
  totalVolume: number;
  transactionDate: string;
}

export interface ClientVolume {
  client: string;
  volume: number;
}

export function processVolumeData(): VolumeDataRow[] {
  // Skip the first row (header row) and map the data
  const dataRows = rawData.slice(1);
  
  return dataRows.map((row: any) => ({
    client: row['Applied filters:\r\nDates is on or after 2025-01-01 and is before 2026-03-01\r\nSelector - Detail (summary) is Client, Regulatory type, Transaction Type, Merchant, Merchant jurisdiction, Merchant industry, Use case, Tpp, Currency, Source Bank Jurisdiction, Transaction category, or Transaction Sub Type\r\nSummary Data Selector is Total volume (billable)'] || '',
    regulatoryType: row['__EMPTY'] || '',
    transactionType: row['__EMPTY_1'] || '',
    merchant: row['__EMPTY_2'] || '',
    merchantJurisdiction: row['__EMPTY_3'] || '',
    merchantIndustry: row['__EMPTY_4'] || '',
    useCase: row['__EMPTY_5'] || '',
    tpp: row['__EMPTY_6'] || '',
    currency: row['__EMPTY_7'] || '',
    sourceBankJurisdiction: row['__EMPTY_8'] || '',
    transactionCategory: row['__EMPTY_9'] || '',
    transactionSubType: row['__EMPTY_10'] || '',
    totalVolume: Number(row['__EMPTY_11']) || 0,
    transactionDate: row['__EMPTY_12'] || '',
  }));
}

export function getUniqueValues(data: VolumeDataRow[], field: keyof VolumeDataRow): string[] {
  const values = new Set<string>();
  data.forEach(row => {
    const value = row[field];
    if (value && value !== '') {
      values.add(String(value));
    }
  });
  return Array.from(values).sort();
}

export function aggregateVolumeByDate(data: VolumeDataRow[]): { date: string; volume: number }[] {
  const volumeByDate = new Map<string, number>();
  
  data.forEach(row => {
    if (row.transactionDate && row.totalVolume) {
      const existing = volumeByDate.get(row.transactionDate) || 0;
      volumeByDate.set(row.transactionDate, existing + row.totalVolume);
    }
  });
  
  return Array.from(volumeByDate.entries())
    .map(([date, volume]) => ({ date, volume }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function sumTotalVolume(data: VolumeDataRow[]): number {
  return data.reduce((sum, row) => sum + (Number.isFinite(row.totalVolume) ? row.totalVolume : 0), 0);
}

export function aggregateVolumeByClient(data: VolumeDataRow[]): Map<string, number> {
  const volumeByClient = new Map<string, number>();

  for (const row of data) {
    const rawClient = (row.client ?? '').trim();
    const client = rawClient.length > 0 ? rawClient : '(Unknown)';

    const existing = volumeByClient.get(client) ?? 0;
    volumeByClient.set(client, existing + row.totalVolume);
  }

  return volumeByClient;
}

export function getTopClientsByVolume(data: VolumeDataRow[], limit: number = 10): ClientVolume[] {
  const volumeByClient = aggregateVolumeByClient(data);

  return Array.from(volumeByClient.entries())
    .map(([client, volume]) => ({ client, volume }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, limit);
}
