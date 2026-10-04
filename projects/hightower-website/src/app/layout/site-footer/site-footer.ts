import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteConfig } from '../../content/models';
import { NAV_LINKS } from '../nav-links';

@Component({
  selector: 'hs-site-footer',
  imports: [RouterLink],
  templateUrl: './site-footer.html',
  styleUrl: './site-footer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteFooter {
  readonly site = input.required<SiteConfig>();
  protected readonly links = [...NAV_LINKS, { label: 'Contact', path: '/contact' }];
  protected readonly year = new Date().getFullYear();
}
