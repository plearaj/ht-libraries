import {
  Component,
  ChangeDetectionStrategy,
  inject,
  input,
  output,
  signal,
  OnDestroy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HtTableAgentService } from './ht-table-agent.service';
import { AgentBackendRunResponse } from './agent.types';

@Component({
  selector: 'ht-table-agent',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ht-table-agent.component.html',
  styleUrl: './ht-table-agent.component.scss',
})
export class HtTableAgentComponent implements OnDestroy {
  readonly agentService = inject(HtTableAgentService);

  /** Placeholder text for the task input field. */
  readonly placeholder = input<string>('Describe a task for the agent...');

  /** Emits the full backend response when a task completes. */
  readonly taskCompleted = output<AgentBackendRunResponse>();

  /** Emits when a task fails with an error message. */
  readonly taskFailed = output<string>();

  taskInput = '';
  readonly lastResponse = signal<AgentBackendRunResponse | null>(null);
  readonly error = signal<string>('');

  private runSub: Subscription | null = null;

  submitTask(): void {
    const task = this.taskInput.trim();
    if (!task || this.agentService.isRunning()) return;

    this.error.set('');
    this.lastResponse.set(null);

    this.agentService.runBackend(task).then(
      (response) => {
        this.lastResponse.set(response);
        this.taskCompleted.emit(response);
        this.taskInput = '';
      },
      (err) => {
        const message = err instanceof Error ? err.message : 'Agent task failed';
        this.error.set(message);
        this.taskFailed.emit(message);
      },
    );
  }

  ngOnDestroy(): void {
    this.runSub?.unsubscribe();
  }
}
