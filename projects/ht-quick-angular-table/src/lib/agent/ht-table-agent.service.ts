import { Injectable, signal, effect, EffectRef, inject } from '@angular/core';
import { Subject, Observable, from, EMPTY, firstValueFrom } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import {
  AgentConfig,
  AgentAction,
  AgentTrigger,
  AgentTableTrigger,
  AgentRunResult,
  AgentActionEvent,
  AgentFailureEvent,
  AgentBackendRunResponse,
} from './agent.types';
import { HtBackendService } from '../backend/ht-backend.service';

const MAX_CHAIN_DEPTH = 10;
const MAX_ACTIONS_PER_RUN = 1000;
const MIN_SCHEDULE_INTERVAL_MS = 1000;
const MAX_BACKEND_ROWS = 500;

@Injectable({ providedIn: 'root' })
export class HtTableAgentService<T = unknown> {
  private readonly backendService = inject(HtBackendService);

  // --- Observable event streams (replaces @Output EventEmitter) ---
  private readonly _actionCompleted$ = new Subject<AgentActionEvent<T>>();
  private readonly _actionFailed$ = new Subject<AgentFailureEvent<T>>();
  private readonly _runCompleted$ = new Subject<AgentRunResult>();
  private readonly _warning$ = new Subject<string>();

  /** Stream of completed action events. */
  readonly actionCompleted$: Observable<AgentActionEvent<T>> = this._actionCompleted$.asObservable();
  /** Stream of failed action events. */
  readonly actionFailed$: Observable<AgentFailureEvent<T>> = this._actionFailed$.asObservable();
  /** Emits when a full agent run completes. */
  readonly runCompleted$: Observable<AgentRunResult> = this._runCompleted$.asObservable();
  /** Stream of warning messages. */
  readonly warning$: Observable<string> = this._warning$.asObservable();

  // --- Backward-compatible aliases ---
  /** @deprecated Use actionCompleted$ instead. */
  get actionCompleted() { return this._actionCompleted$; }
  /** @deprecated Use actionFailed$ instead. */
  get actionFailed() { return this._actionFailed$; }
  /** @deprecated Use runCompleted$ instead. */
  get runCompleted() { return this._runCompleted$; }
  /** @deprecated Use warning$ instead. */
  get warning() { return this._warning$; }

  // --- Signal-based read-only state ---
  private readonly _isRunning = signal(false);
  readonly isRunning = this._isRunning.asReadonly();

  private readonly _lastRunResult = signal<AgentRunResult | null>(null);
  readonly lastRunResult = this._lastRunResult.asReadonly();

  private readonly _config = signal<AgentConfig<T> | null>(null);
  private _scheduleId: ReturnType<typeof setInterval> | null = null;
  private _effectRef: EffectRef | null = null;
  private _dataFn: (() => T[]) | null = null;
  private _currentRunPromise: Promise<AgentRunResult> | null = null;

  configure(config: AgentConfig<T>): void {
    if (config.actions.length === 0) {
      throw new Error('[ht-table-agent] configure() requires at least one action.');
    }
    if (config.triggers.length === 0) {
      throw new Error('[ht-table-agent] configure() requires at least one trigger.');
    }

    const actionNames = new Set(config.actions.map(a => a.name));
    const duplicates = config.actions.filter((a, i) => config.actions.findIndex(b => b.name === a.name) !== i);
    if (duplicates.length > 0) {
      throw new Error(`[ht-table-agent] Duplicate action names: ${duplicates.map(d => d.name).join(', ')}`);
    }

    for (const trigger of config.triggers) {
      if (!actionNames.has(trigger.actionName)) {
        throw new Error(`[ht-table-agent] Trigger references unknown action '${trigger.actionName}'.`);
      }
      if (trigger.next && !actionNames.has(trigger.next.actionName)) {
        throw new Error(`[ht-table-agent] Trigger next-step references unknown action '${trigger.next.actionName}'.`);
      }
    }

    if (config.runMode === 'scheduled') {
      if (!config.scheduleIntervalMs || config.scheduleIntervalMs <= 0) {
        throw new Error('[ht-table-agent] scheduleIntervalMs must be > 0 when runMode is "scheduled".');
      }
      if (config.scheduleIntervalMs < MIN_SCHEDULE_INTERVAL_MS) {
        throw new Error(`[ht-table-agent] scheduleIntervalMs must be >= ${MIN_SCHEDULE_INTERVAL_MS}ms to prevent excessive polling.`);
      }
    }

    this._config.set(config);
  }

  connectDataSource(fn: () => T[]): void {
    this._dataFn = fn;
    const config = this._config();
    if (!config) return;

    if (config.runMode === 'scheduled') {
      this.stop();
      this._scheduleId = setInterval(() => void this.run(), config.scheduleIntervalMs!);
    } else if (config.runMode === 'reactive') {
      this._effectRef?.destroy();
      this._effectRef = effect(() => {
        fn(); // read the signal to track reactivity
        void this.run();
      });
    }
  }

  stop(): void {
    if (this._scheduleId !== null) {
      clearInterval(this._scheduleId);
      this._scheduleId = null;
    }
    if (this._effectRef !== null) {
      this._effectRef.destroy();
      this._effectRef = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Client-side execution
  // ---------------------------------------------------------------------------

  async run(): Promise<AgentRunResult> {
    if (this._isRunning()) {
      this._warning$.next('Agent run already in progress');
      return this._currentRunPromise!;
    }
    this._isRunning.set(true);
    const start = Date.now();
    this._currentRunPromise = this._doRun(start);
    const result = await this._currentRunPromise;
    this._isRunning.set(false);
    this._currentRunPromise = null;
    return result;
  }

  // ---------------------------------------------------------------------------
  // Backend-delegated execution
  // ---------------------------------------------------------------------------

  /**
   * Run an AI-powered agent task via the Python backend.
   * Sends current table data and a task description to POST /agent/run.
   */
  async runBackend(task: string, context?: Record<string, unknown>): Promise<AgentBackendRunResponse> {
    if (this._isRunning()) {
      this._warning$.next('Agent run already in progress');
      throw new Error('Agent run already in progress');
    }

    this._isRunning.set(true);
    const start = Date.now();

    try {
      const rows = this._dataFn ? this._dataFn() : [];

      // Sample rows for backend (cap at MAX_BACKEND_ROWS)
      const sampleRows = rows.slice(0, MAX_BACKEND_ROWS).map(row => {
        const record: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
          if (typeof value === 'string' && value.length > 500) {
            record[key] = value.slice(0, 500) + '...';
          } else {
            record[key] = value;
          }
        }
        return record;
      });

      // Derive column info from first row
      const columns = rows.length > 0
        ? Object.entries(rows[0] as Record<string, unknown>).map(([key, val]) => ({
            name: key,
            dataName: key,
            dataType: typeof val === 'number' ? 'number' : typeof val === 'boolean' ? 'boolean' : 'string',
          }))
        : [];

      const response = await firstValueFrom(
        this.backendService.runAgent({ task, rows: sampleRows, columns, context })
      );

      // Emit individual action events for UI consumption
      for (const action of response.actions) {
        if (action.status === 'success') {
          this._actionCompleted$.next({
            actionName: action.actionName,
            row: action.rowIndex !== null && action.rowIndex < rows.length ? rows[action.rowIndex] : null,
            result: action.result,
          });
        } else {
          this._actionFailed$.next({
            actionName: action.actionName,
            row: action.rowIndex !== null && action.rowIndex < rows.length ? rows[action.rowIndex] : null,
            reason: action.reason ?? 'Unknown error',
          });
        }
      }

      const runResult: AgentRunResult = {
        actionsInvoked: response.actions.filter(a => a.status === 'success').length,
        failures: response.actions.filter(a => a.status === 'error').length,
        durationMs: Date.now() - start,
      };

      this._lastRunResult.set(runResult);
      this._runCompleted$.next(runResult);
      return response;
    } finally {
      this._isRunning.set(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Private — client-side execution internals
  // ---------------------------------------------------------------------------

  private async _doRun(start: number): Promise<AgentRunResult> {
    const config = this._config();
    if (!config) {
      const result: AgentRunResult = { actionsInvoked: 0, failures: 0, durationMs: 0 };
      this._runCompleted$.next(result);
      this._lastRunResult.set(result);
      return result;
    }

    const rows = this._dataFn ? this._dataFn() : [];
    let actionsInvoked = 0;
    let failures = 0;

    for (const trigger of config.triggers) {
      if (actionsInvoked >= MAX_ACTIONS_PER_RUN) {
        this._warning$.next(`Agent run capped at ${MAX_ACTIONS_PER_RUN} actions to prevent runaway execution.`);
        break;
      }

      if (trigger.scope === 'row') {
        const rowTrigger = trigger as AgentTrigger<T>;
        const matchingRows = rows.filter(row => rowTrigger.condition(row));
        for (const row of matchingRows) {
          if (actionsInvoked >= MAX_ACTIONS_PER_RUN) break;
          const { invoked, failed } = await this._executeChain(config, trigger.actionName, row, rows, null, 0);
          actionsInvoked += invoked;
          failures += failed;
        }
      } else {
        const tableTrigger = trigger as AgentTableTrigger<T>;
        if (tableTrigger.condition(rows)) {
          const { invoked, failed } = await this._executeChain(config, trigger.actionName, null, rows, null, 0);
          actionsInvoked += invoked;
          failures += failed;
        }
      }
    }

    const result: AgentRunResult = { actionsInvoked, failures, durationMs: Date.now() - start };
    this._runCompleted$.next(result);
    this._lastRunResult.set(result);
    return result;
  }

  private async _executeChain(
    config: AgentConfig<T>,
    actionName: string,
    row: T | null,
    rows: T[],
    previousResult: unknown,
    depth: number,
  ): Promise<{ invoked: number; failed: number }> {
    if (depth >= MAX_CHAIN_DEPTH) {
      this._warning$.next(`Action chain depth exceeded maximum of ${MAX_CHAIN_DEPTH} for action '${actionName}'. Halting chain.`);
      return { invoked: 0, failed: 0 };
    }

    const action = config.actions.find((a: AgentAction<T>) => a.name === actionName);
    if (!action) return { invoked: 0, failed: 0 };

    const timeoutMs = config.timeoutMs ?? 30_000;
    let result: unknown = null;
    let failed = false;

    await new Promise<void>(resolve => {
      (from(action.handler({ row, rows, previousResult })) as Observable<unknown>)
        .pipe(
          timeout(timeoutMs),
          catchError((err: unknown) => {
            const reason = err instanceof Error ? err.message : String(err);
            this._actionFailed$.next({ actionName, row, reason });
            failed = true;
            return EMPTY;
          }),
        )
        .subscribe({
          next: (val: unknown) => { result = val; },
          complete: () => {
            if (!failed) {
              this._actionCompleted$.next({ actionName, row, result });
            }
            resolve();
          },
        });
    });

    if (failed) return { invoked: 0, failed: 1 };

    // Check next step
    const trigger = config.triggers.find(t => t.actionName === actionName);
    if (trigger?.next && trigger.next.condition(result)) {
      const next = await this._executeChain(config, trigger.next.actionName, row, rows, result, depth + 1);
      return { invoked: 1 + next.invoked, failed: next.failed };
    }

    return { invoked: 1, failed: 0 };
  }
}
