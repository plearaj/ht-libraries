import { Component, ChangeDetectionStrategy, computed, input, inject, signal, effect, OnDestroy } from '@angular/core';
import { InsightsConfig, ColumnStatistics } from './insights.types';
import { HT_AI_PROVIDER } from '../ai/ai-provider.token';
import { createAiAdapter } from '../ai/ai-adapter.factory';

@Component({
  selector: 'ht-table-insights',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (data().length === 0) {
      <p>No data available.</p>
    } @else {
      @for (stat of statistics(); track stat.column) {
        <div class="ht-insight-stat">
          <strong>{{ stat.column }}</strong> — Count: {{ stat.count }}
          @if (stat.sum !== undefined) {
            &nbsp;| Sum: {{ stat.sum }} | Avg: {{ stat.avg }} | Min: {{ stat.min }} | Max: {{ stat.max }}
          }
        </div>
      }
      @if (config().enableAiSummary) {
        <div class="ht-ai-summary">
          @if (aiError()) {
            <p class="ht-ai-error">{{ aiError() }}</p>
          } @else if (aiSummary()) {
            <p>{{ aiSummary() }}</p>
          } @else {
            <p class="ht-ai-loading">Generating AI summary...</p>
          }
        </div>
      }
    }
  `,
})
export class HtTableInsightsComponent implements OnDestroy {
  config = input.required<InsightsConfig>();
  data = input.required<unknown[]>();

  private readonly aiProviderConfig = inject(HT_AI_PROVIDER, { optional: true });

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

  private async fetchAiSummary(rows: unknown[]): Promise<void> {
    if (!this.aiProviderConfig) {
      this._aiError.set('AI summary unavailable: HT_AI_PROVIDER is not registered.');
      return;
    }
    if (rows.length === 0) {
      this._aiSummary.set('');
      this._aiError.set('');
      return;
    }
    try {
      const adapter = createAiAdapter(this.aiProviderConfig);
      const stats = this.statistics();
      const prompt = `Summarize this dataset in 2-3 sentences. Rows: ${rows.length}. Statistics: ${JSON.stringify(stats)}. Sample (first 5 rows): ${JSON.stringify(rows.slice(0, 5))}`;
      const summary = await adapter.generate(prompt);
      this._aiSummary.set(summary);
      this._aiError.set('');
    } catch (err) {
      this._aiError.set(`AI summary failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  ngOnDestroy(): void {
    if (this.debounceTimer !== null) clearTimeout(this.debounceTimer);
  }
}
