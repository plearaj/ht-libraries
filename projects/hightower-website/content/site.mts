import type { SiteConfig } from '../src/app/content/models';

export const site: SiteConfig = {
  companyName: 'Hightower Software Technologies',
  siteUrl: 'https://example.com', // [DOMAIN]: replace before launch (spec §9)
  tagline: 'Expert software development & consulting',
  email: 'hello@example.com', // [EMAIL ADDRESS]
  location: '[CITY, STATE]',
  responseTime: '[RESPONSE TIME]',
  socials: [
    { label: 'GitHub', url: 'https://github.com/plearaj' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/' }, // [LINKEDIN URL]
  ],
  defaultOgImage: '/images/og-default.png',
  footerVerse: {
    text: 'The name of the LORD is a strong tower: the righteous runneth into it, and is safe.',
    reference: 'Proverbs 18:10',
  },
  hero: {
    headline: 'Software built on solid ground.',
    lead: 'We design and develop custom applications for clients, run Project Red Sea as our research lab, and ship the products and open libraries that come out of it.',
    poster: {
      src: '/images/hightower-hero.webp',
      alt: 'Illustration of a tall stone tower rising into a starry night sky',
    },
    videoSources: [
      // Add when the owner supplies the video (spec §6):
      // { src: '/media/hero.webm', type: 'video/webm' },
      // { src: '/media/hero.mp4', type: 'video/mp4' },
    ],
  },
};
