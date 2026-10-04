import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Service, SiteConfig } from '../../content/models';
import { SeoService } from '../../seo/seo.service';
import { CtaBand } from '../../shared/cta-band/cta-band';
import { HtmlContent } from '../../shared/html-content/html-content';
import { SectionHeading } from '../../shared/section-heading/section-heading';

@Component({
  selector: 'hs-services-page',
  imports: [RouterLink, SectionHeading, HtmlContent, CtaBand],
  templateUrl: './services-page.html',
  styleUrl: './services-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicesPage {
  readonly site = input.required<SiteConfig>();
  readonly services = input.required<Service[]>();

  constructor() {
    const seo = inject(SeoService);
    effect(() =>
      seo.apply(
        {
          title: 'Services',
          description: this.services().map((s) => s.name).join(', ') + ` from ${this.site().companyName}.`,
          path: '/services',
        },
        this.site(),
      ),
    );
  }
}
