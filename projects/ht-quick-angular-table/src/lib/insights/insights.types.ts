export interface InsightsConfig {
  statisticColumns?: string[];
  enableAiSummary?: boolean;
}

export interface ColumnStatistics {
  column: string;
  count: number;
  sum?: number;
  avg?: number;
  min?: number;
  max?: number;
}
