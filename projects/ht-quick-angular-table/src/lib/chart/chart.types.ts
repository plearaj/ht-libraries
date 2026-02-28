export type ChartType = 'bar' | 'line' | 'pie';

export interface ChartConfig {
  type: ChartType;
  xColumn: string;
  yColumns: string[];
  label?: string;
}
