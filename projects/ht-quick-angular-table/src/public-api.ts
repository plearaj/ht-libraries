/*
 * Public API Surface of ht-quick-angular-table
 */

export * from './lib/ht-quick-angular-table.service';
export * from './lib/ht-quick-angular-table.component';
export * from './lib/model/index';
export * from './lib/ht-quick-angular-table.providers';
export type { AiModelAdapter } from './lib/ai/ai-model-adapter.interface';
export type { AiProviderConfig } from './lib/ai/ai-provider.token';
export { HT_AI_PROVIDER } from './lib/ai/ai-provider.token';
export { provideHtAi } from './lib/ai/ai-provider.helpers';
export { HtTableChartComponent } from './lib/chart/ht-table-chart.component';
export type { ChartConfig, ChartType } from './lib/chart/chart.types';
export { HtTableInsightsComponent } from './lib/insights/ht-table-insights.component';
export type { InsightsConfig, ColumnStatistics } from './lib/insights/insights.types';
