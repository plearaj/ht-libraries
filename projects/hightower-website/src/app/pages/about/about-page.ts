import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { SiteConfig } from '../../content/models';
import { SeoService } from '../../seo/seo.service';
import { CtaBand } from '../../shared/cta-band/cta-band';
import { SectionHeading } from '../../shared/section-heading/section-heading';

@Component({
  selector: 'hs-about-page',
  imports: [SectionHeading, CtaBand],
  templateUrl: './about-page.html',
  styleUrl: './about-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutPage {
  readonly site = input.required<SiteConfig>();

  constructor() {
    const seo = inject(SeoService);
    effect(() =>
      seo.apply(
        {
          title: 'About',
          description: `The story behind ${this.site().companyName}.`,
          path: '/about',
        },
        this.site(),
      ),
    );
  }
}
