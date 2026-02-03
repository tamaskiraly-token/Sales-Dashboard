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
} from 'chart.js';
import { PipelineData } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface DealActivityChartProps {
  data: PipelineData[];
  selectedSalesPerson: string | null;
}

export function DealActivityChart({ data, selectedSalesPerson }: DealActivityChartProps) {
  const chartData = useMemo(() => {
    const filteredData = selectedSalesPerson
      ? data.filter(d => d.salesPerson === selectedSalesPerson)
      : data;

    // Group by date and aggregate
    const dateMap = new Map<string, { new: number; closed: number; lost: number }>();
    
    filteredData.forEach(item => {
      const existing = dateMap.get(item.date) || { new: 0, closed: 0, lost: 0 };
      dateMap.set(item.date, {
        new: existing.new + item.newDeals,
        closed: existing.closed + item.closedDeals,
        lost: existing.lost + item.lostDeals,
      });
    });

    const sortedDates = Array.from(dateMap.keys()).sort();
    const newDeals = sortedDates.map(date => dateMap.get(date)!.new);
    const closedDeals = sortedDates.map(date => dateMap.get(date)!.closed);
    const lostDeals = sortedDates.map(date => dateMap.get(date)!.lost);

    return {
      labels: sortedDates.map(date => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      datasets: [
        {
          label: 'New Deals',
          data: newDeals,
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.4,
        },
        {
          label: 'Closed Deals',
          data: closedDeals,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
        },
        {
          label: 'Lost Deals',
          data: lostDeals,
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4,
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
        text: 'Deal Activity Over Time',
        font: {
          size: 18,
          weight: 'bold' as const,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Number of Deals',
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
