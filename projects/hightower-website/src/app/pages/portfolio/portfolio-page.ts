import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { Project, ProjectKind, SiteConfig } from '../../content/models';
import { SeoService } from '../../seo/seo.service';
import { CtaBand } from '../../shared/cta-band/cta-band';
import { ProjectCard } from '../../shared/project-card/project-card';
import { SectionHeading } from '../../shared/section-heading/section-heading';

const GROUPS: { kind: ProjectKind; heading: string }[] = [
  { kind: 'lab', heading: 'The lab' },
  { kind: 'product', heading: 'Products' },
  { kind: 'client', heading: 'Client work' },
];

@Component({
  selector: 'hs-portfolio-page',
  imports: [SectionHeading, ProjectCard, CtaBand],
  templateUrl: './portfolio-page.html',
  styleUrl: './portfolio-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioPage {
  readonly site = input.required<SiteConfig>();
  readonly projects = input.required<Project[]>();

  protected readonly groups = computed(() =>
    GROUPS.map((g) => ({ ...g, projects: this.projects().filter((p) => p.kind === g.kind) })).filter(
      (g) => g.projects.length > 0,
    ),
  );

  constructor() {
    const seo = inject(SeoService);
    effect(() =>
      seo.apply(
        {
          title: 'Portfolio',
          description: `Lab experiments, products and client apps from ${this.site().companyName}.`,
          path: '/portfolio',
        },
        this.site(),
      ),
    );
  }
}
