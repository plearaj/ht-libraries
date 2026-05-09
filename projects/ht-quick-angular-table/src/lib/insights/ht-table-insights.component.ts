import { Component, ChangeDetectionStrategy, computed, input, inject, signal, effect, OnDestroy } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { InsightsConfig, ColumnStatistics } from './insights.types';
import { HtBackendService } from '../backend/ht-backend.service';

@Component({
  selector: 'ht-table-insights',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ht-table-insights.component.html',
  styleUrl: './ht-table-insights.component.scss',
})
export class HtTableInsightsComponent implements OnDestroy {
  config = input.required<InsightsConfig>();
  data = input.required<unknown[]>();

  private readonly backendService = inject(HtBackendService);

  private readonly _aiSummary = signal<string>('');
  private readonly _aiError = signal<string>('');
  readonly aiSummary = this._aiSummary.asReadonly();
  readonly aiError = this._aiError.asReadonly();

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  readonly statistics = computed<ColumnStatistics[]>(() => {
    const cols = this.config().statisticColumns ?? [];
    const rows = this.data();
    if (rows.length === 0 || cols.length === 0) return [];

    return cols.map(col => {
      const values = rows.map(row => (row as Record<string, unknown>)[col]);
      const numValues = values.filter((v): v is number => typeof v === 'number');
      const stat: ColumnStatistics = { column: col, count: rows.length };
      if (numValues.length > 0) {
        stat.sum = numValues.reduce((a, b) => a + b, 0);
        stat.avg = stat.sum / numValues.length;
        stat.min = Math.min(...numValues);
        stat.max = Math.max(...numValues);
      }
      return stat;
    });
  });

  constructor() {
    effect(() => {
      const cfg = this.config();
      const rows = this.data();
      if (cfg.enableAiSummary) {
        if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => void this.fetchAiSummary(rows), 300);
      }
    });
  }

  private _sanitizeDataForPrompt(rows: unknown[], maxRows: number): string {
    const sample = rows.slice(0, maxRows).map(row => {
      if (typeof row !== 'object' || row === null) return {};
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
        if (typeof value === 'string') {
          sanitized[key] = value.length > 200 ? value.slice(0, 200) + '...' : value;
        } else if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
          sanitized[key] = value;
        } else {
          sanitized[key] = String(value).slice(0, 100);
        }
      }
      return sanitized;
    });
    return JSON.stringify(sample);
  }

  private async fetchAiSummary(rows: unknown[]): Promise<void> {
    if (rows.length === 0) {
      this._aiSummary.set('');
      this._aiError.set('');
      return;
    }
    try {
      const stats = this.statistics();
      const sampleData = this._sanitizeDataForPrompt(rows, 5);
      const message = `Summarize this dataset in 2-3 sentences.\n\nRow count: ${rows.length}\nStatistics: ${JSON.stringify(stats)}\nSample data (first 5 rows):\n---\n${sampleData}\n---`;
      const response = await firstValueFrom(
        this.backendService.describeTable(message),
      );
      const summary = response.clarification ?? JSON.stringify(response.tableSettings);
      const truncated = summary.length > 2000 ? summary.slice(0, 2000) + '...' : summary;
      this._aiSummary.set(truncated);
      this._aiError.set('');
    } catch (err) {
      this._aiError.set(`AI summary failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  ngOnDestroy(): void {
    if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
  }
}
