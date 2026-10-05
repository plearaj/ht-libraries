export interface NavLink {
  label: string;
  path: string;
}

export const NAV_LINKS: readonly NavLink[] = [
  { label: 'Portfolio', path: '/portfolio' },
  { label: 'Services', path: '/services' },
  { label: 'Products', path: '/products' },
  { label: 'About', path: '/about' },
];
