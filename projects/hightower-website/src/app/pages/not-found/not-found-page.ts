import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteConfig } from '../../content/models';
import { SeoService } from '../../seo/seo.service';

@Component({
  selector: 'hs-not-found-page',
  imports: [RouterLink],
  templateUrl: './not-found-page.html',
  styleUrl: './not-found-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {
  readonly site = input.required<SiteConfig>();

  constructor() {
    const seo = inject(SeoService);
    effect(() =>
      seo.apply(
        { title: 'Page not found', description: 'This page does not exist.', path: '/not-found', noindex: true },
        this.site(),
      ),
    );
  }
}
