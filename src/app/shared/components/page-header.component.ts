import { Component, Input } from '@angular/core';
import {
  IonBackButton,
  IonButtons,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-page-header',
  template: `
    <ion-header>
      <ion-toolbar>
        @if (defaultHref) {
          <ion-buttons slot="start">
            <ion-back-button [defaultHref]="defaultHref"></ion-back-button>
          </ion-buttons>
        }
        <ion-title>{{ title }}</ion-title>
        <ng-content select="[end]"></ng-content>
      </ion-toolbar>
    </ion-header>
  `,
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton],
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() defaultHref: string | null = null;
}
