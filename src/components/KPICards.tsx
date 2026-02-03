import { useMemo } from 'react';
import { PipelineData } from '../types';

interface KPICardsProps {
  data: PipelineData[];
  selectedSalesPerson: string | null;
}

export function KPICards({ data, selectedSalesPerson }: KPICardsProps) {
  const kpis = useMemo(() => {
    const filteredData = selectedSalesPerson
      ? data.filter(d => d.salesPerson === selectedSalesPerson)
      : data;

    const totalPipeline = filteredData.reduce((sum, d) => sum + d.pipelineSize, 0);
    const avgPipeline = totalPipeline / filteredData.length;
    const totalNewDeals = filteredData.reduce((sum, d) => sum + d.newDeals, 0);
    const totalClosedDeals = filteredData.reduce((sum, d) => sum + d.closedDeals, 0);
    const totalLostDeals = filteredData.reduce((sum, d) => sum + d.lostDeals, 0);
    const winRate = totalClosedDeals + totalLostDeals > 0
      ? (totalClosedDeals / (totalClosedDeals + totalLostDeals)) * 100
      : 0;

    return {
      avgPipeline,
      totalNewDeals,
      totalClosedDeals,
      winRate,
    };
  }, [data, selectedSalesPerson]);

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    flex: 1,
    minWidth: '200px',
  };

  const valueStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: '10px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
      marginBottom: '20px',
    }}>
      <div style={cardStyle}>
        <div style={labelStyle}>Average Pipeline Size</div>
        <div style={valueStyle}>${(kpis.avgPipeline / 1000).toFixed(0)}K</div>
      </div>
      <div style={cardStyle}>
        <div style={labelStyle}>New Deals</div>
        <div style={valueStyle}>{kpis.totalNewDeals}</div>
      </div>
      <div style={cardStyle}>
        <div style={labelStyle}>Closed Deals</div>
        <div style={valueStyle}>{kpis.totalClosedDeals}</div>
      </div>
      <div style={cardStyle}>
        <div style={labelStyle}>Win Rate</div>
        <div style={valueStyle}>{kpis.winRate.toFixed(1)}%</div>
      </div>
    </div>
  );
}
