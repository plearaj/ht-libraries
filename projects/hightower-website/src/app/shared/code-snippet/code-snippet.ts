import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

@Component({
  selector: 'hs-code-snippet',
  templateUrl: './code-snippet.html',
  styleUrl: './code-snippet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeSnippet {
  readonly code = input.required<string>();
  readonly language = input('bash');
  protected readonly copied = signal(false);

  protected copy(): void {
    navigator.clipboard?.writeText(this.code()).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    });
  }
}
