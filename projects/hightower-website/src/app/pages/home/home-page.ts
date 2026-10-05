import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SiteConfig } from '../../content/models';
import { HomeData } from '../../routing/content-resolvers';
import { SeoService } from '../../seo/seo.service';
import { CtaBand } from '../../shared/cta-band/cta-band';
import { HeroVideo } from '../../shared/hero-video/hero-video';
import { ProductCard } from '../../shared/product-card/product-card';
import { ProjectCard } from '../../shared/project-card/project-card';
import { SectionHeading } from '../../shared/section-heading/section-heading';

@Component({
  selector: 'hs-home-page',
  imports: [RouterLink, HeroVideo, SectionHeading, ProjectCard, ProductCard, CtaBand],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  readonly site = input.required<SiteConfig>();
  readonly home = input.required<HomeData>();

  protected readonly lab = computed(() => this.home().featured.find((p) => p.kind === 'lab'));
  protected readonly labProducts = computed(() => this.home().featured.filter((p) => p.kind === 'product'));
  protected readonly clients = computed(() => this.home().featured.filter((p) => p.kind === 'client'));
  protected readonly labHeading = computed(() => {
    const lab = this.lab();
    const product = this.labProducts()[0];
    if (!lab) return 'From the lab';
    return product
      ? `${lab.name} is where we experiment. ${product.name} is what it produced.`
      : `${lab.name} is where we experiment.`;
  });

  constructor() {
    const seo = inject(SeoService);
    effect(() => {
      const site = this.site();
      seo.apply({ title: site.tagline, description: site.hero.lead, path: '/' }, site);
    });
  }
}
