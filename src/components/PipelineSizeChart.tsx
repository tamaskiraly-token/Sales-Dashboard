import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { PipelineData } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface PipelineSizeChartProps {
  data: PipelineData[];
  selectedSalesPerson: string | null;
}

export function PipelineSizeChart({ data, selectedSalesPerson }: PipelineSizeChartProps) {
  const chartData = useMemo(() => {
    const filteredData = selectedSalesPerson
      ? data.filter(d => d.salesPerson === selectedSalesPerson)
      : data;

    // Aggregate by sales person
    const personMap = new Map<string, { total: number; count: number }>();
    
    filteredData.forEach(item => {
      const existing = personMap.get(item.salesPerson) || { total: 0, count: 0 };
      personMap.set(item.salesPerson, {
        total: existing.total + item.pipelineSize,
        count: existing.count + 1,
      });
    });

    const salesPeople = Array.from(personMap.keys());
    const avgPipelineSizes = salesPeople.map(person => {
      const value = personMap.get(person)!;
      return value.total / value.count;
    });

    // Sort by pipeline size descending
    const sorted = salesPeople
      .map((person, idx) => ({ person, size: avgPipelineSizes[idx] }))
      .sort((a, b) => b.size - a.size);

    return {
      labels: sorted.map(s => s.person),
      datasets: [
        {
          label: 'Average Pipeline Size',
          data: sorted.map(s => s.size),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 1,
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
        text: 'Pipeline Size by Sales Person',
        font: {
          size: 18,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `Pipeline Size: $${context.parsed.y.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
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
        title: {
          display: true,
          text: 'Sales Person',
        },
      },
    },
  };

  return (
    <div style={{ height: '400px', padding: '20px' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
}
