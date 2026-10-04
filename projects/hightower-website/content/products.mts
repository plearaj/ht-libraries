import type { ProductSource } from './source-types';

const REPO = 'https://github.com/plearaj/ht-libraries'; // confirm the repo is public before launch

export const products: ProductSource[] = [
  {
    slug: 'logos',
    kind: 'app',
    name: 'Logos',
    summary: '[One-line description of what Logos does and who it is for.]',
    description: `
## [What Logos is]

[Paragraph describing Logos.]
`,
    producedBy: 'red-sea',
    status: 'in-progress', // [STATUS]
  },
  {
    slug: 'ht-quick-angular-table',
    kind: 'library',
    name: 'ht-quick-angular-table',
    summary:
      'A declarative Angular Material data table — filtering, pagination, selection, inline editing and drag-and-drop from one settings object, with an optional AI layer.',
    description: `
Declarative Angular Material data table driven by a single \`TableSettings\` instance plus a stream of rows. Add filtering, pagination, selection, action columns, inline add/save/delete, and drag-and-drop without writing a custom table component.

An optional Python backend unlocks data-ingestion skills (Excel, API, SQL), an AI table builder, chart and insights widgets, and an agent that runs actions over your rows.
`,
    repoUrl: `${REPO}/tree/HEAD/projects/ht-quick-angular-table`,
    status: 'in-progress',
  },
  {
    slug: 'ht-quick-ngxfire',
    kind: 'library',
    name: 'ht-quick-ngxfire',
    summary:
      'Firebase auth, Firestore and Storage for Angular as signals and guards — with a simulation mode that runs with zero Firebase config.',
    description: `
Opinionated Angular 21 wrapper around \`@angular/fire\`: signal-based auth, a thin Firestore wrapper, a Storage wrapper, a drop-in login component, route guards for auth and roles, and a simulation mode that lets the same code run with zero Firebase config in development.
`,
    repoUrl: `${REPO}/tree/HEAD/projects/ht-quick-ngxfire`,
    status: 'in-progress',
  },
  {
    slug: 'ht-camera-upload',
    kind: 'library',
    name: 'ht-camera-upload',
    summary:
      'One component for capturing images from browser camera, native Capacitor camera, file picker or gallery — handed to your own uploader.',
    description: `
Capture an image from the browser camera, the native Capacitor camera, a file picker or the photo gallery, and hand it to an uploader you supply. Every source is normalized to one \`CapturedImage\` shape, with optional resize and compression on the browser path.
`,
    repoUrl: `${REPO}/tree/HEAD/projects/ht-camera-upload`,
    status: 'in-progress',
  },
];
