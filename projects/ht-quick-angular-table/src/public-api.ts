/*
 * Public API Surface of ht-quick-angular-table
 */

export * from './lib/ht-quick-angular-table.service';
export * from './lib/ht-quick-angular-table.component';
export * from './lib/model/index';
export * from './lib/ht-quick-angular-table.providers';
export { HtBackendService } from './lib/backend/ht-backend.service';
export { provideHtBackend } from './lib/backend/ht-backend.providers';
export type { BackendConfig } from './lib/backend/ht-backend.config';
export { HT_BACKEND_CONFIG } from './lib/backend/ht-backend.config';
export type {
  Skill,
  SkillConfig,
  ExcelUploadConfig,
  ApiPullConfig,
  DatabaseConfig,
  SkillExecution,
  SkillExecutionStatus,
  SkillError,
  DataResult,
  ColumnDefinition,
  ResultMetadata,
} from './lib/skills/skill.types';
export { SkillRegistryService } from './lib/skills/skill-registry.service';
export { HtSkillMenuComponent } from './lib/skills/skill-menu.component';
export { HtExcelInputComponent } from './lib/skills/inputs/excel-input.component';
export { HtApiInputComponent } from './lib/skills/inputs/api-input.component';
export { HtDatabaseInputComponent } from './lib/skills/inputs/database-input.component';
export { HtSheetSelectDialogComponent } from './lib/skills/sheet-select-dialog.component';
export type { SheetSelectDialogData } from './lib/skills/sheet-select-dialog.component';
export { HtTableChartComponent } from './lib/chart/ht-table-chart.component';
export type { ChartConfig, ChartType } from './lib/chart/chart.types';
export { HtTableInsightsComponent } from './lib/insights/ht-table-insights.component';
export type { InsightsConfig, ColumnStatistics } from './lib/insights/insights.types';
export { HtTableBuilderService } from './lib/builder/ht-table-builder.service';
export type { BuilderMessage, BuilderResult } from './lib/builder/builder.types';
export { HtTableAgentService } from './lib/agent/ht-table-agent.service';
export { HtTableAgentComponent } from './lib/agent/ht-table-agent.component';
export type {
  AgentConfig,
  AgentAction,
  AgentTrigger,
  AgentNextStep,
  AgentRunMode,
  AgentRunResult,
  AgentActionEvent,
  AgentFailureEvent,
  AgentActionContext,
  AgentBackendActionResult,
  AgentBackendRunResponse,
  AgentRunRequest,
} from './lib/agent/agent.types';
