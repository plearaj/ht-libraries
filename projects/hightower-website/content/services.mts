import type { ServiceSource } from './source-types';

// The third service is added once the owner supplies it (spec §9). Adding a service
// also requires adding its slug to the topic list in firestore.rules. build-content enforces this.
export const services: ServiceSource[] = [
  {
    slug: 'custom-development',
    name: 'Custom Development',
    summary:
      'Web and mobile applications built end to end — from first sketch to production — on Angular, Firebase and Capacitor.',
    description: `
[Paragraph: how a custom build works, from discovery to launch and support.]

- [What you get]
- [What you get]
- [What you get]
`,
    order: 1,
  },
  {
    slug: 'consulting',
    name: 'Consulting',
    summary:
      'Architecture reviews, modernization plans and hands-on guidance for teams that need a senior engineer in the room.',
    description: `
[Paragraph: how consulting engagements work.]

- [Engagement type]
- [Engagement type]
`,
    order: 2,
  },
];
