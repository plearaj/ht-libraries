import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { Product, SiteConfig } from '../../content/models';
import { SeoService } from '../../seo/seo.service';
import { CtaBand } from '../../shared/cta-band/cta-band';
import { ProductCard } from '../../shared/product-card/product-card';
import { SectionHeading } from '../../shared/section-heading/section-heading';

@Component({
  selector: 'hs-products-page',
  imports: [SectionHeading, ProductCard, CtaBand],
  templateUrl: './products-page.html',
  styleUrl: './products-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductsPage {
  readonly site = input.required<SiteConfig>();
  readonly products = input.required<Product[]>();

  protected readonly groups = computed(() =>
    [
      { heading: 'Apps', products: this.products().filter((p) => p.kind === 'app') },
      { heading: 'Libraries', products: this.products().filter((p) => p.kind === 'library') },
    ].filter((g) => g.products.length > 0),
  );

  constructor() {
    const seo = inject(SeoService);
    effect(() =>
      seo.apply(
        {
          title: 'Products',
          description: `Apps and open Angular libraries from ${this.site().companyName}.`,
          path: '/products',
        },
        this.site(),
      ),
    );
  }
}
