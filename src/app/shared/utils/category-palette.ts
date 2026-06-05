export type CategoryPalette = 'amber' | 'green' | 'orange' | 'blue' | 'violet' | 'pink';

interface Rule {
  match: string[];
  icon: string;
  palette: CategoryPalette;
}

const RULES: Rule[] = [
  {
    match: ['taxi', 'uber', 'transport', 'transporte', 'viaje', 'auto', 'nafta', 'combustible', 'fuel'],
    icon: 'car-outline',
    palette: 'amber',
  },
  {
    match: ['farmacia', 'pharmacy', 'salud', 'health', 'medic', 'remedio', 'doctor'],
    icon: 'medkit-outline',
    palette: 'green',
  },
  {
    match: ['comida', 'food', 'restaurant', 'resto', 'almuerzo', 'cena', 'dinner', 'lunch'],
    icon: 'restaurant-outline',
    palette: 'orange',
  },
  {
    match: ['super', 'mercado', 'market', 'grocery', 'almacen', 'compras', 'shop'],
    icon: 'cart-outline',
    palette: 'blue',
  },
];

const FALLBACK: CategoryPalette[] = ['blue', 'violet', 'pink', 'amber', 'green', 'orange'];

function hashPalette(value: string): CategoryPalette {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return FALLBACK[hash % FALLBACK.length];
}

export function resolveCategory(name: string): { icon: string; palette: CategoryPalette } {
  const lower = (name ?? '').toLowerCase();
  const matched = RULES.find((rule) => rule.match.some((token) => lower.includes(token)));
  if (matched) {
    return { icon: matched.icon, palette: matched.palette };
  }
  return { icon: 'pricetag-outline', palette: hashPalette(lower) };
}

export function categoryIcon(name: string): string {
  return resolveCategory(name).icon;
}

export function categoryPalette(name: string): CategoryPalette {
  return resolveCategory(name).palette;
}

export function categoryColor(name: string): string {
  return `var(--cat-${categoryPalette(name)})`;
}

export function categorySoftColor(name: string): string {
  return `var(--cat-${categoryPalette(name)}-soft)`;
}
