import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PRODUCT_KIND_LABEL, STATUS_LABEL } from '../../content/labels';
import { Product } from '../../content/models';

@Component({
  selector: 'hs-product-card',
  imports: [RouterLink],
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCard {
  readonly product = input.required<Product>();
  protected readonly kindLabel = computed(() => PRODUCT_KIND_LABEL[this.product().kind]);
  protected readonly tagClass = computed(() => (this.product().kind === 'app' ? 'hs-tag--product' : 'hs-tag--library'));
  protected readonly statusLabel = computed(() => STATUS_LABEL[this.product().status]);
}
