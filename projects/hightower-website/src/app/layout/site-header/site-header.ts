import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NAV_LINKS } from '../nav-links';

@Component({
  selector: 'hs-site-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './site-header.html',
  styleUrl: './site-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteHeader {
  readonly companyName = input.required<string>();
  readonly menuExpanded = input(false);
  readonly drawerId = input('mobile-menu');
  readonly menuOpen = output<void>();
  protected readonly links = NAV_LINKS;
}
