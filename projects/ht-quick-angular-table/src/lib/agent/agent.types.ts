export interface AgentActionContext<T> {
  row: T | null;
  rows: T[];
  previousResult: unknown;
}

export interface AgentAction<T> {
  name: string;
  handler: (context: AgentActionContext<T>) => Promise<unknown>;
}

export interface AgentNextStep {
  actionName: string;
  condition: (result: unknown) => boolean;
}

export type AgentRunMode = 'on-demand' | 'scheduled' | 'reactive';

export interface AgentTrigger<T> {
  actionName: string;
  next?: AgentNextStep;
  scope: 'row';
  condition: (row: T) => boolean;
}

export interface AgentTableTrigger<T> {
  actionName: string;
  next?: AgentNextStep;
  scope: 'table';
  condition: (rows: T[]) => boolean;
}

export interface AgentConfig<T> {
  actions: AgentAction<T>[];
  triggers: (AgentTrigger<T> | AgentTableTrigger<T>)[];
  runMode: AgentRunMode;
  scheduleIntervalMs?: number;
  timeoutMs?: number;
}

export interface AgentRunResult {
  actionsInvoked: number;
  failures: number;
  durationMs: number;
}

export interface AgentActionEvent<T> {
  actionName: string;
  row: T | null;
  result: unknown;
}

export interface AgentFailureEvent<T> {
  actionName: string;
  row: T | null;
  reason: string;
}
