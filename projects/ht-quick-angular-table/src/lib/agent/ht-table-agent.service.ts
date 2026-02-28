import { Injectable, signal, effect, EffectRef, EventEmitter, Output } from '@angular/core';
import { from, EMPTY, Observable } from 'rxjs';
import { filter, concatMap, catchError, timeout } from 'rxjs/operators';
import {
  AgentConfig,
  AgentAction,
  AgentTrigger,
  AgentTableTrigger,
  AgentRunResult,
  AgentActionEvent,
  AgentFailureEvent,
} from './agent.types';

@Injectable({ providedIn: 'root' })
export class HtTableAgentService<T = unknown> {
  @Output() readonly actionCompleted = new EventEmitter<AgentActionEvent<T>>();
  @Output() readonly actionFailed = new EventEmitter<AgentFailureEvent<T>>();
  @Output() readonly runCompleted = new EventEmitter<AgentRunResult>();
  @Output() readonly warning = new EventEmitter<string>();

  private readonly _config = signal<AgentConfig<T> | null>(null);
  private readonly _isRunning = signal(false);
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

    if (config.runMode === 'scheduled' && (!config.scheduleIntervalMs || config.scheduleIntervalMs <= 0)) {
      throw new Error('[ht-table-agent] scheduleIntervalMs must be > 0 when runMode is "scheduled".');
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

  async run(): Promise<AgentRunResult> {
    if (this._isRunning()) {
      this.warning.emit('Agent run already in progress');
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

  private async _doRun(start: number): Promise<AgentRunResult> {
    const config = this._config();
    if (!config) {
      const result: AgentRunResult = { actionsInvoked: 0, failures: 0, durationMs: 0 };
      this.runCompleted.emit(result);
      return result;
    }

    const rows = this._dataFn ? this._dataFn() : [];
    let actionsInvoked = 0;
    let failures = 0;

    for (const trigger of config.triggers) {
      if (trigger.scope === 'row') {
        const rowTrigger = trigger as AgentTrigger<T>;
        const matchingRows = rows.filter(row => rowTrigger.condition(row));
        for (const row of matchingRows) {
          const { invoked, failed } = await this._executeChain(config, trigger.actionName, row, rows, null);
          actionsInvoked += invoked;
          failures += failed;
        }
      } else {
        const tableTrigger = trigger as AgentTableTrigger<T>;
        if (tableTrigger.condition(rows)) {
          const { invoked, failed } = await this._executeChain(config, trigger.actionName, null, rows, null);
          actionsInvoked += invoked;
          failures += failed;
        }
      }
    }

    const result: AgentRunResult = { actionsInvoked, failures, durationMs: Date.now() - start };
    this.runCompleted.emit(result);
    return result;
  }

  private async _executeChain(
    config: AgentConfig<T>,
    actionName: string,
    row: T | null,
    rows: T[],
    previousResult: unknown,
  ): Promise<{ invoked: number; failed: number }> {
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
            this.actionFailed.emit({ actionName, row, reason });
            failed = true;
            return EMPTY;
          }),
        )
        .subscribe({
          next: (val: unknown) => { result = val; },
          complete: () => {
            if (!failed) {
              this.actionCompleted.emit({ actionName, row, result });
            }
            resolve();
          },
        });
    });

    if (failed) return { invoked: 0, failed: 1 };

    // Check next step
    const trigger = config.triggers.find(t => t.actionName === actionName);
    if (trigger?.next && trigger.next.condition(result)) {
      const next = await this._executeChain(config, trigger.next.actionName, row, rows, result);
      return { invoked: 1 + next.invoked, failed: next.failed };
    }

    return { invoked: 1, failed: 0 };
  }
}
