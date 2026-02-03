import { PipelineData, SalesPerson, DashboardData } from '../types';

const salesPeople: SalesPerson[] = [
  { id: 'sp1', name: 'Sarah Johnson' },
  { id: 'sp2', name: 'Michael Chen' },
  { id: 'sp3', name: 'Emily Rodriguez' },
  { id: 'sp4', name: 'David Thompson' },
  { id: 'sp5', name: 'Lisa Anderson' },
];

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateDateRange(startDate: Date, days: number): string[] {
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
}

export function generateMockData(): DashboardData {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90); // Last 90 days
  const dates = generateDateRange(startDate, 90);
  
  const pipelineData: PipelineData[] = [];
  
  dates.forEach((date) => {
    salesPeople.forEach((salesPerson) => {
      // Simulate realistic pipeline growth
      const basePipeline = randomBetween(500000, 2000000);
      const newDeals = randomBetween(2, 8);
      const closedDeals = randomBetween(1, 5);
      const lostDeals = randomBetween(0, 3);
      const dealValue = randomBetween(50000, 500000);
      
      pipelineData.push({
        date,
        salesPerson: salesPerson.name,
        pipelineSize: basePipeline + (newDeals * dealValue) - (closedDeals * dealValue * 0.8) - (lostDeals * dealValue * 0.3),
        newDeals,
        closedDeals,
        lostDeals,
        dealValue,
      });
    });
  });
  
  return {
    pipelineData,
    salesPeople,
  };
}
