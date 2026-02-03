import { VolumeDataRow } from '../data/processVolumeData';

interface VolumeSummaryProps {
  data: VolumeDataRow[];
}

export const VolumeSummary = ({ data }: VolumeSummaryProps) => {
  const totalVolume = data.reduce((sum, row) => sum + row.totalVolume, 0);
  const totalTransactions = data.length;
  const averageVolume = totalTransactions > 0 ? totalVolume / totalTransactions : 0;
  
  // Get unique date range
  const dates = data
    .map(row => row.transactionDate)
    .filter(date => date)
    .sort();
  const dateRange = dates.length > 0 ? `${dates[0]} - ${dates[dates.length - 1]}` : 'N/A';

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="kpiGrid">
      <div className="kpi">
        <div className="kpiLabel">Total volume</div>
        <div className="kpiValue">{formatNumber(totalVolume)}</div>
      </div>
      <div className="kpi">
        <div className="kpiLabel">Transactions</div>
        <div className="kpiValue">{formatNumber(totalTransactions)}</div>
      </div>
      <div className="kpi">
        <div className="kpiLabel">Avg volume / txn</div>
        <div className="kpiValue">{formatNumber(averageVolume)}</div>
      </div>
      <div className="kpi">
        <div className="kpiLabel">Date range</div>
        <div className="kpiValue" style={{ fontSize: 16 }}>{dateRange}</div>
      </div>
    </div>
  );
};
