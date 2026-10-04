import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { SiteConfig } from '../content/models';

export interface PageSeo {
  title: string;
  description: string;
  path: string; // site-relative, e.g. '/about'
  image?: string; // site-relative or absolute
  noindex?: boolean;
}

export function absoluteUrl(siteUrl: string, path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const origin = siteUrl.replace(/\/+$/, '');
  const trimmed = path.replace(/\/+$/, '');
  if (trimmed === '') return `${origin}/`;
  return `${origin}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  apply(page: PageSeo, site: SiteConfig): void {
    const fullTitle =
      page.path === '/' ? `${site.companyName} | ${page.title}` : `${page.title} | ${site.companyName}`;
    const url = absoluteUrl(site.siteUrl, page.path);
    const image = absoluteUrl(site.siteUrl, page.image ?? site.defaultOgImage);

    this.title.setTitle(fullTitle);
    this.meta.updateTag({ name: 'description', content: page.description });
    this.setProperty('og:type', 'website');
    this.setProperty('og:site_name', site.companyName);
    this.setProperty('og:title', fullTitle);
    this.setProperty('og:description', page.description);
    this.setProperty('og:url', url);
    this.setProperty('og:image', image);
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });

    if (page.noindex) {
      this.meta.updateTag({ name: 'robots', content: 'noindex' });
    } else {
      this.meta.removeTag('name="robots"');
    }
    this.setCanonical(url);
  }

  private setProperty(property: string, content: string): void {
    this.meta.updateTag({ property, content }, `property="${property}"`);
  }

  private setCanonical(href: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }
}
