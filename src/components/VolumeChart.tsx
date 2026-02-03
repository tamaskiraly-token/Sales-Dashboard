import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface VolumeChartProps {
  data: { date: string; volume: number }[];
  onPointClick?: (date: string) => void;
}

type DotPayload = { date: string; volume: number };

type DotProps = {
  cx?: number;
  cy?: number;
  r?: number;
  payload?: DotPayload;
};

export const VolumeChart = ({ data, onPointClick }: VolumeChartProps) => {
  const formatNumber = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  const ClickableDot = ({ cx, cy, payload }: DotProps) => {
    if (cx == null || cy == null || !payload) return null;

    const handleActivate = () => {
      if (onPointClick) onPointClick(payload.date);
    };

    return (
      <g>
        {/* Larger invisible hit-area so clicking is easier */}
        <circle
          cx={cx}
          cy={cy}
          r={12}
          fill="transparent"
          style={{ cursor: onPointClick ? 'pointer' : 'default' }}
          onClick={handleActivate}
          onMouseDown={handleActivate}
        />
        <circle
          cx={cx}
          cy={cy}
          r={4}
          fill="#00b67a"
          stroke="#ffffff"
          strokeWidth={1.5}
          style={{ cursor: onPointClick ? 'pointer' : 'default' }}
          onClick={handleActivate}
          onMouseDown={handleActivate}
        />
      </g>
    );
  };

  return (
    <div>
      <div className="chartHeaderRow">
        <h2 className="chartTitle">Total volume over time</h2>
        <span className="pill">Click a point for top clients</span>
      </div>
      <div className="chartSub">A filled trend view (Wise-like). Hover for values.</div>
      <div className="chartBody">
        <ResponsiveContainer width="100%" height={420}>
          <AreaChart data={data} margin={{ top: 10, right: 24, left: 10, bottom: 10 }}>
            <defs>
              <linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00b67a" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#00b67a" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(15, 23, 42, 0.10)" />
          <XAxis 
            dataKey="date" 
            stroke="rgba(11, 18, 32, 0.55)"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="rgba(11, 18, 32, 0.55)"
            style={{ fontSize: '12px' }}
            tickFormatter={formatNumber}
          />
          <Tooltip 
            formatter={(value) => [formatNumber(Number(value ?? 0)), 'Volume']}
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid rgba(15, 23, 42, 0.10)',
              borderRadius: '12px',
              padding: '10px',
              boxShadow: '0 12px 36px rgba(15, 23, 42, 0.12)',
            }}
          />
          <Legend 
            wrapperStyle={{ fontSize: '14px' }}
          />
          <Area
            type="monotone" 
            dataKey="volume" 
            stroke="#00b67a"
            strokeWidth={2}
            fill="url(#volumeFill)"
            dot={<ClickableDot />}
            activeDot={<ClickableDot />}
            name="Total Volume"
          />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
