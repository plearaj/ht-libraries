import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PROJECT_KIND_LABEL, STATUS_LABEL } from '../../content/labels';
import { SiteConfig } from '../../content/models';
import { ProjectDetail } from '../../routing/content-resolvers';
import { SeoService } from '../../seo/seo.service';
import { CtaBand } from '../../shared/cta-band/cta-band';
import { HtmlContent } from '../../shared/html-content/html-content';
import { ProductCard } from '../../shared/product-card/product-card';
import { SectionHeading } from '../../shared/section-heading/section-heading';

@Component({
  selector: 'hs-project-detail-page',
  imports: [RouterLink, HtmlContent, ProductCard, SectionHeading, CtaBand],
  templateUrl: './project-detail-page.html',
  styleUrl: './project-detail-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectDetailPage {
  readonly site = input.required<SiteConfig>();
  readonly detail = input.required<ProjectDetail>();

  protected readonly project = computed(() => this.detail().project);
  protected readonly kindLabel = computed(() => PROJECT_KIND_LABEL[this.project().kind]);
  protected readonly statusLabel = computed(() => STATUS_LABEL[this.project().status]);

  constructor() {
    const seo = inject(SeoService);
    effect(() => {
      const project = this.project();
      seo.apply(
        {
          title: project.name,
          description: project.summary,
          path: `/portfolio/${project.slug}`,
          image: project.images[0]?.src,
        },
        this.site(),
      );
    });
  }
}
