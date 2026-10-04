import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PRODUCT_KIND_LABEL, STATUS_LABEL } from '../../content/labels';
import { SiteConfig } from '../../content/models';
import { ProductDetail } from '../../routing/content-resolvers';
import { SeoService } from '../../seo/seo.service';
import { CodeSnippet } from '../../shared/code-snippet/code-snippet';
import { CtaBand } from '../../shared/cta-band/cta-band';
import { HtmlContent } from '../../shared/html-content/html-content';

@Component({
  selector: 'hs-product-detail-page',
  imports: [RouterLink, HtmlContent, CodeSnippet, CtaBand],
  templateUrl: './product-detail-page.html',
  styleUrl: './product-detail-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailPage {
  readonly site = input.required<SiteConfig>();
  readonly detail = input.required<ProductDetail>();

  protected readonly product = computed(() => this.detail().product);
  protected readonly kindLabel = computed(() => PRODUCT_KIND_LABEL[this.product().kind]);
  protected readonly tagClass = computed(() => (this.product().kind === 'app' ? 'hs-tag--product' : 'hs-tag--library'));
  protected readonly statusLabel = computed(() => STATUS_LABEL[this.product().status]);
  protected readonly links = computed(() => {
    const p = this.product();
    return [
      p.repoUrl ? { label: 'Source code', url: p.repoUrl } : null,
      p.npmUrl ? { label: 'npm package', url: p.npmUrl } : null,
      p.docsUrl ? { label: 'Documentation', url: p.docsUrl } : null,
    ].filter((l): l is { label: string; url: string } => l !== null);
  });

  constructor() {
    const seo = inject(SeoService);
    effect(() => {
      const product = this.product();
      seo.apply(
        { title: product.name, description: product.summary, path: `/products/${product.slug}` },
        this.site(),
      );
    });
  }
}
