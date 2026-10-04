import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'hs-cta-band',
  imports: [RouterLink],
  templateUrl: './cta-band.html',
  styleUrl: './cta-band.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CtaBand {
  readonly heading = input.required<string>();
}
