import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';

/** Renders build-time-generated markdown HTML. Angular's default [innerHTML] sanitizer applies. */
@Component({
  selector: 'hs-html-content',
  template: '<div class="prose" [innerHTML]="html()"></div>',
  styleUrl: './html-content.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HtmlContent {
  readonly html = input.required<string>();
}
