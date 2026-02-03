export interface PipelineData {
  date: string;
  salesPerson: string;
  pipelineSize: number;
  newDeals: number;
  closedDeals: number;
  lostDeals: number;
  dealValue: number;
}

export interface SalesPerson {
  id: string;
  name: string;
}

export interface DashboardData {
  pipelineData: PipelineData[];
  salesPeople: SalesPerson[];
}
