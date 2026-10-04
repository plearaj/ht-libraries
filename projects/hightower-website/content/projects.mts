import type { ProjectSource } from './source-types';

export const projects: ProjectSource[] = [
  {
    slug: 'red-sea',
    kind: 'lab',
    name: 'Project Red Sea',
    tagline: '[Tagline: what the lab is for, in one sentence.]',
    summary: '[One-line description of what Red Sea explores.]',
    description: `
## [Section heading]

[Paragraph: what Red Sea is, the problems it explores, and how experiments graduate into products.]

[Paragraph: how you work in the lab: tools, approach, cadence.]

### [Subheading]

- [Point]
- [Point]
- [Point]
`,
    status: 'in-progress',
    tech: ['[Tech]', '[Tech]', '[Tech]'],
    links: [],
    images: [],
    featured: true,
  },
  {
    slug: 'logos',
    kind: 'product',
    name: 'Logos',
    tagline: 'The pattern of reason',
    summary: '[One-line description of what Logos does and who it is for.]',
    description: '[Logos description: the canonical page is /products/logos.]',
    status: 'in-progress', // [STATUS]
    tech: [],
    links: [],
    images: [{ src: '/images/logos.webp', alt: 'Golden-veined mountains beneath a spiral galaxy' }],
    featured: true,
    productSlug: 'logos',
  },
  {
    slug: 'kree-house-of-beauty',
    kind: 'client',
    name: 'Kree House of Beauty',
    tagline: '[Tagline]',
    summary: '[One-line description: what the app does for the business and its customers.]',
    description: '[Project write-up: the problem, what was built, and the outcome.]',
    client: 'Kree House of Beauty',
    status: 'live', // [STATUS]
    tech: [],
    links: [],
    images: [],
    featured: true,
  },
  {
    slug: 'lalas-anime-world',
    kind: 'client',
    name: "Lala's Anime World",
    tagline: '[Tagline]',
    summary: '[One-line description: what the app does for the business and its customers.]',
    description: '[Project write-up: the problem, what was built, and the outcome.]',
    client: "Lala's Anime World",
    status: 'live', // [STATUS]
    tech: [],
    links: [],
    images: [],
    featured: true,
  },
];
