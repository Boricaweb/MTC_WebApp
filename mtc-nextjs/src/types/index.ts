export interface Repair {
  id?: number;
  order: string;
  reporter: string;
  department: string;
  channel: string;
  subject: string;
  floor: string;
  type: string;
  dateReported: string;
  location: string;
  status: string;
  dateFixed: string;
  photos: string[];
}

export interface SummaryData {
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  transferred: number;
  statusCounts: Record<string, number>;
  typeCounts: Record<string, number>;
}

export interface WeeklyData {
  month: string;
  weeks: {
    week: number;
    reported: number;
    completed: number;
    remaining: number;
    cumulativeReported?: number;
    cumulativeCompleted?: number;
  }[];
  cumulative: {
    reported: number;
    completed: number;
    remaining: number;
  };
}

export interface AnalysisData {
  month: string;
  departments: {
    name: string;
    count: number;
    percentage: number;
    types: Record<string, number>;
  }[];
  repairTypes?: {
    type: string;
    count: number;
  }[];
  totals?: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    transferred: number;
  };
}
