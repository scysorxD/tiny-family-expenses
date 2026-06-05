import { Component, Input } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { resolveCategory } from '../utils';

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
    return resolveCategory(this.name).icon;
  }

  get solid(): string {
    return `var(--cat-${resolveCategory(this.name).palette})`;
  }

  get soft(): string {
    return `var(--cat-${resolveCategory(this.name).palette}-soft)`;
  }
}
