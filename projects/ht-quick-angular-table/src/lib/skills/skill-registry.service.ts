import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, EMPTY, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Skill, SkillExecution, SkillExecutionStatus, SkillConfig, DataResult, SkillError } from './skill.types';
import { HtBackendService } from '../backend/ht-backend.service';

@Injectable({ providedIn: 'root' })
export class SkillRegistryService {
  private readonly backendService = inject(HtBackendService);

  // Signal-based state
  private readonly _registeredSkills = signal<Skill[]>([]);
  private readonly _currentExecution = signal<SkillExecution | null>(null);

  readonly registeredSkills = this._registeredSkills.asReadonly();
  readonly currentExecution = this._currentExecution.asReadonly();
  readonly isExecuting = computed(() => this._currentExecution()?.status === 'running');

  registerSkill(skill: Skill): void {
    // Prevent duplicate IDs
    const existing = this._registeredSkills();
    if (existing.some(s => s.id === skill.id)) return;
    this._registeredSkills.update(skills => [...skills, skill]);
  }

  unregisterSkill(id: string): void {
    this._registeredSkills.update(skills => skills.filter(s => s.id !== id));
  }

  getRegisteredSkills(): Skill[] {
    return this._registeredSkills();
  }

  configureSkill(id: string, config: SkillConfig): void {
    this._registeredSkills.update(skills =>
      skills.map(s => s.id === id ? { ...s, configSchema: config } : s)
    );
  }

  /**
   * Execute a skill. Prevents concurrent executions (FR-026).
   * Returns an Observable that emits the DataResult on success.
   */
  executeSkill(id: string, params?: unknown): Observable<DataResult> {
    if (this.isExecuting()) {
      return EMPTY; // Prevent concurrent execution
    }

    const skill = this._registeredSkills().find(s => s.id === id);
    if (!skill) {
      return EMPTY;
    }

    const execution: SkillExecution = {
      id: crypto.randomUUID(),
      skillId: id,
      status: 'running',
      startedAt: new Date(),
    };
    this._currentExecution.set(execution);

    return this._dispatchSkill(skill, params).pipe(
      tap(result => {
        this._currentExecution.update(ex => ex ? {
          ...ex,
          status: 'completed' as SkillExecutionStatus,
          completedAt: new Date(),
          result,
        } : null);
      }),
      catchError(err => {
        const error: SkillError = {
          code: err?.code ?? 'execution-failed',
          message: err?.message ?? 'Skill execution failed',
        };
        this._currentExecution.update(ex => ex ? {
          ...ex,
          status: 'failed' as SkillExecutionStatus,
          completedAt: new Date(),
          error,
        } : null);
        throw err;
      }),
    );
  }

  private _dispatchSkill(skill: Skill, params?: unknown): Observable<DataResult> {
    switch (skill.configSchema.type) {
      case 'excel-upload': {
        const p = params as { file: File; sheet?: string } | undefined;
        if (!p?.file) return EMPTY;
        const cfg = skill.configSchema;
        const ext = '.' + (p.file.name.split('.').pop()?.toLowerCase() ?? '');
        if (!cfg.allowedFormats.includes(ext)) {
          return throwError(() => ({ code: 'invalid-format', message: `Invalid file type. Allowed: ${cfg.allowedFormats.join(', ')}` }));
        }
        if (p.file.size > cfg.maxFileSizeMb * 1024 * 1024) {
          return throwError(() => ({ code: 'file-too-large', message: `File exceeds ${cfg.maxFileSizeMb} MB limit` }));
        }
        return this.backendService.uploadExcel(p.file, p.sheet);
      }
      case 'api-pull': {
        const config = skill.configSchema;
        return this.backendService.pullApiData({
          url: config.url,
          method: config.method,
          headers: config.headers,
          body: config.body,
          jsonPath: config.jsonPath,
        });
      }
      case 'database': {
        const config = skill.configSchema;
        return this.backendService.queryDatabase({
          dbType: config.dbType,
          connectionString: config.connectionString,
          query: config.query,
          rowLimit: config.rowLimit,
          timeoutSeconds: config.timeoutSeconds,
        });
      }
    }
  }
}
