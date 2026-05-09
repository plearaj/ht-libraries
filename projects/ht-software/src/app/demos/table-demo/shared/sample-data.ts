export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  quantity: number;
  inStock: boolean;
  lastUpdated: string;
  supplier: { firstName: string; lastName: string; company: string };
  docUrl: string;
  description: string;
}

export const SAMPLE_PRODUCTS: Product[] = [
  { id: 1,  name: 'Wireless Mouse',     category: 'Electronics', price: 29.99,  quantity: 150, inStock: true,  lastUpdated: '2026-01-15', supplier: { firstName: 'Ada',    lastName: 'Lovelace', company: 'Analytical Supply' },   docUrl: 'wireless-mouse',     description: 'Ergonomic 2.4GHz wireless mouse with USB-C charging.' },
  { id: 2,  name: 'Mechanical Keyboard',category: 'Electronics', price: 89.99,  quantity: 75,  inStock: true,  lastUpdated: '2026-01-20', supplier: { firstName: 'Alan',   lastName: 'Turing',   company: 'Enigma Parts' },        docUrl: 'mechanical-keyboard',description: 'RGB mechanical keyboard with hot-swappable switches.' },
  { id: 3,  name: 'USB-C Hub',          category: 'Electronics', price: 45.00,  quantity: 200, inStock: true,  lastUpdated: '2026-02-01', supplier: { firstName: 'Grace',  lastName: 'Hopper',   company: 'Compiler Co.' },         docUrl: 'usb-c-hub',          description: '7-in-1 USB-C hub with HDMI, SD card, and PD pass-through.' },
  { id: 4,  name: 'Standing Desk',      category: 'Furniture',   price: 499.99, quantity: 12,  inStock: true,  lastUpdated: '2026-01-10', supplier: { firstName: 'Ray',    lastName: 'Tomlinson',company: 'ErgoDesk Works' },       docUrl: 'standing-desk',      description: 'Electric height-adjustable desk, 60"x30" bamboo top.' },
  { id: 5,  name: 'Ergonomic Chair',    category: 'Furniture',   price: 349.00, quantity: 8,   inStock: true,  lastUpdated: '2025-12-20', supplier: { firstName: 'Linus',  lastName: 'Torvalds', company: 'Kernel Seating' },       docUrl: 'ergonomic-chair',    description: 'Mesh-back office chair with lumbar support and 4D armrests.' },
  { id: 6,  name: 'Monitor Arm',        category: 'Furniture',   price: 79.99,  quantity: 45,  inStock: true,  lastUpdated: '2026-02-05', supplier: { firstName: 'Donald', lastName: 'Knuth',    company: 'Art of Mounts' },        docUrl: 'monitor-arm',        description: 'Heavy-duty single monitor arm supporting up to 32".' },
  { id: 7,  name: 'Notebook A5',        category: 'Stationery',  price: 4.99,   quantity: 500, inStock: true,  lastUpdated: '2026-02-10', supplier: { firstName: 'Edsger', lastName: 'Dijkstra', company: 'Graph Paper Ltd' },      docUrl: 'notebook-a5',        description: '160-page dotted A5 notebook, acid-free paper.' },
  { id: 8,  name: 'Gel Pen Pack',       category: 'Stationery',  price: 12.50,  quantity: 300, inStock: true,  lastUpdated: '2026-01-25', supplier: { firstName: 'Barbara',lastName: 'Liskov',   company: 'Substitution Inks' },    docUrl: 'gel-pen-pack',       description: 'Pack of 12 smooth-writing gel pens in assorted colours.' },
  { id: 9,  name: 'Desk Lamp',          category: 'Lighting',    price: 39.99,  quantity: 60,  inStock: true,  lastUpdated: '2026-01-18', supplier: { firstName: 'Thomas', lastName: 'Edison',   company: 'Bright Ideas' },         docUrl: 'desk-lamp',          description: 'Dimmable LED desk lamp with 5 color temperatures.' },
  { id: 10, name: 'Webcam HD',          category: 'Electronics', price: 59.99,  quantity: 0,   inStock: false, lastUpdated: '2025-11-30', supplier: { firstName: 'Grace',  lastName: 'Hopper',   company: 'Compiler Co.' },         docUrl: 'webcam-hd',          description: '1080p webcam with built-in microphone and privacy shutter.' },
  { id: 11, name: 'Laptop Stand',       category: 'Furniture',   price: 54.99,  quantity: 35,  inStock: true,  lastUpdated: '2026-02-12', supplier: { firstName: 'Ray',    lastName: 'Tomlinson',company: 'ErgoDesk Works' },       docUrl: 'laptop-stand',       description: 'Aluminum adjustable laptop stand, folds flat for travel.' },
  { id: 12, name: 'Cable Organizer',    category: 'Accessories', price: 9.99,   quantity: 400, inStock: true,  lastUpdated: '2026-02-15', supplier: { firstName: 'Margaret',lastName:'Hamilton',  company: 'Apollo Supplies' },      docUrl: 'cable-organizer',    description: 'Under-desk cable tray with silicone grommets.' },
  { id: 13, name: 'Wireless Charger',   category: 'Electronics', price: 24.99,  quantity: 0,   inStock: false, lastUpdated: '2025-12-01', supplier: { firstName: 'Nikola', lastName: 'Tesla',    company: 'Induction Ltd' },        docUrl: 'wireless-charger',   description: '15W Qi wireless charging pad with LED indicator.' },
  { id: 14, name: 'Whiteboard Markers', category: 'Stationery',  price: 8.99,   quantity: 250, inStock: true,  lastUpdated: '2026-02-20', supplier: { firstName: 'Barbara',lastName: 'Liskov',   company: 'Substitution Inks' },    docUrl: 'whiteboard-markers', description: 'Low-odor dry-erase markers, 8-color set.' },
  { id: 15, name: 'Desk Organizer',     category: 'Accessories', price: 19.99,  quantity: 80,  inStock: true,  lastUpdated: '2026-02-22', supplier: { firstName: 'Margaret',lastName:'Hamilton',  company: 'Apollo Supplies' },      docUrl: 'desk-organizer',     description: 'Multi-compartment mesh desk organizer with pen slots.' },
];
