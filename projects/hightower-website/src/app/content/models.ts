export type ProjectKind = 'lab' | 'product' | 'client';
export type ProductKind = 'library' | 'app';
export type Status = 'live' | 'in-progress' | 'concept';

export interface Link {
  label: string;
  url: string;
}

export interface Image {
  src: string;
  alt: string;
}

export interface VideoSource {
  src: string;
  type: string; // e.g. 'video/webm', 'video/mp4'
}

export interface HeroConfig {
  headline: string;
  lead: string;
  poster: Image;
  videoSources: VideoSource[]; // empty → poster only
}

export interface Project {
  slug: string;
  kind: ProjectKind;
  name: string;
  tagline: string;
  summary: string; // one line, for cards
  descriptionHtml: string; // generated from markdown at build time
  client?: string; // client name, for kind === 'client'
  status: Status;
  tech: string[];
  links: Link[];
  images: Image[]; // images[0] is the card/hero image
  featured: boolean; // shown on Home
  productSlug?: string; // kind === 'product' → its canonical page under /products
}

export interface Product {
  slug: string;
  kind: ProductKind;
  name: string;
  summary: string;
  descriptionHtml: string;
  install?: string; // only set once the package is published to npm
  repoUrl?: string;
  npmUrl?: string; // only set once published
  docsUrl?: string;
  producedBy?: string; // slug of the lab project that produced it
  status: Status;
}

export interface Service {
  slug: string; // also used as the contact-form topic value
  name: string;
  summary: string;
  descriptionHtml: string;
  order: number;
}

export interface SiteConfig {
  companyName: string;
  siteUrl: string; // absolute origin, no trailing slash
  tagline: string;
  email: string;
  location: string;
  socials: Link[];
  defaultOgImage: string; // site-relative path
  responseTime: string;
  footerVerse?: { text: string; reference: string };
  hero: HeroConfig;
}
