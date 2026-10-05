import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'hs-section-heading',
  templateUrl: './section-heading.html',
  styleUrl: './section-heading.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionHeading {
  readonly eyebrow = input.required<string>();
  readonly heading = input.required<string>();
  readonly level = input<1 | 2>(2);
}
