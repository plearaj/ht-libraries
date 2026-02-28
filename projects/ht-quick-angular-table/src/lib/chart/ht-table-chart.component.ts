import { Component, ChangeDetectionStrategy, computed, input, Signal } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, registerables, ChartData, ChartOptions } from 'chart.js';
import { ChartConfig } from './chart.types';

Chart.register(...registerables);

@Component({
  selector: 'ht-table-chart',
  standalone: true,
  imports: [BaseChartDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (data().length === 0) {
      <p class="ht-chart-empty">No data available.</p>
    } @else if (state().error) {
      <p class="ht-chart-error">{{ state().error }}</p>
    } @else {
      <canvas baseChart
        [type]="config().type"
        [data]="state().chartData"
        [options]="chartOptions()">
      </canvas>
    }
  `,
})
export class HtTableChartComponent {
  config = input.required<ChartConfig>();
  data = input.required<unknown[]>();

  readonly state = computed<{ error: string | null; chartData: ChartData }>(() => {
    const cfg = this.config();
    const rows = this.data();
    const empty: ChartData = { labels: [], datasets: [] };

    if (rows.length === 0) return { error: null, chartData: empty };

    const firstRow = rows[0] as Record<string, unknown>;

    if (!(cfg.xColumn in firstRow)) {
      return { error: `Column '${cfg.xColumn}' not found in data.`, chartData: empty };
    }
    for (const yCol of cfg.yColumns) {
      if (!(yCol in firstRow)) {
        return { error: `Column '${yCol}' not found in data.`, chartData: empty };
      }
    }

    const labels = rows.map(row => String((row as Record<string, unknown>)[cfg.xColumn]));
    const datasets =
      cfg.type === 'pie'
        ? [{ label: cfg.label ?? cfg.yColumns[0], data: rows.map(row => Number((row as Record<string, unknown>)[cfg.yColumns[0]])) }]
        : cfg.yColumns.map(yCol => ({
            label: yCol,
            data: rows.map(row => Number((row as Record<string, unknown>)[yCol])),
          }));

    return { error: null, chartData: { labels, datasets } as ChartData };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly chartOptions: Signal<any> = computed(() => ({
    responsive: true,
    plugins: {
      legend: { display: true },
      title: { display: !!this.config().label, text: this.config().label },
    },
  } as ChartOptions));
}
