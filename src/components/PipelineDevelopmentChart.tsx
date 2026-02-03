import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { PipelineData } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface PipelineDevelopmentChartProps {
  data: PipelineData[];
  selectedSalesPerson: string | null;
}

export function PipelineDevelopmentChart({ data, selectedSalesPerson }: PipelineDevelopmentChartProps) {
  const chartData = useMemo(() => {
    const filteredData = selectedSalesPerson
      ? data.filter(d => d.salesPerson === selectedSalesPerson)
      : data;

    // Group by date and aggregate
    const dateMap = new Map<string, { total: number; count: number }>();
    
    filteredData.forEach(item => {
      const existing = dateMap.get(item.date) || { total: 0, count: 0 };
      dateMap.set(item.date, {
        total: existing.total + item.pipelineSize,
        count: existing.count + 1,
      });
    });

    const sortedDates = Array.from(dateMap.keys()).sort();
    const pipelineSizes = sortedDates.map(date => {
      const value = dateMap.get(date)!;
      return value.total / value.count; // Average pipeline size per day
    });

    return {
      labels: sortedDates.map(date => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [
        {
          label: 'Pipeline Size (Average)',
          data: pipelineSizes,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
    };
  }, [data, selectedSalesPerson]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Pipeline Development Over Time',
        font: {
          size: 18,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: function(context: any) {
            return `Pipeline Size: $${context.parsed.y.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: function(value: any) {
            return '$' + (value / 1000).toFixed(0) + 'K';
          },
        },
        title: {
          display: true,
          text: 'Pipeline Size ($)',
        },
      },
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 45,
        },
      },
    },
  };

  return (
    <div style={{ height: '400px', padding: '20px' }}>
      <Line data={chartData} options={options} />
    </div>
  );
}
