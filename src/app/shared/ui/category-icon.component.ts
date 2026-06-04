import { Component, Input } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';

type Palette = 'amber' | 'green' | 'orange' | 'blue' | 'violet' | 'pink';

interface Rule {
  match: string[];
  icon: string;
  palette: Palette;
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

const FALLBACK: Palette[] = ['blue', 'violet', 'pink', 'amber', 'green', 'orange'];

@Component({
  selector: 'app-category-icon',
  template: `<span class="cat-icon" [style.background]="soft">
    <ion-icon [name]="icon" [style.color]="solid"></ion-icon>
  </span>`,
  imports: [IonIcon],
})
export class CategoryIconComponent {
  @Input() name = '';

  get icon(): string {
    return this.resolve().icon;
  }

  get solid(): string {
    return `var(--cat-${this.resolve().palette})`;
  }

  get soft(): string {
    return `var(--cat-${this.resolve().palette}-soft)`;
  }

  private resolve(): { icon: string; palette: Palette } {
    const lower = this.name.toLowerCase();
    const matched = RULES.find((rule) => rule.match.some((token) => lower.includes(token)));
    if (matched) {
      return { icon: matched.icon, palette: matched.palette };
    }
    return { icon: 'pricetag-outline', palette: this.hashPalette(lower) };
  }

  private hashPalette(value: string): Palette {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
    }
    return FALLBACK[hash % FALLBACK.length];
  }
}
