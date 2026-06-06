import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular/standalone';

@Component({
  selector: 'app-month-nav',
  template: `
    <div class="month-nav">
      <ion-button fill="clear" class="nav-btn" (click)="shift.emit(-1)">
        <ion-icon slot="icon-only" name="chevron-back"></ion-icon>
      </ion-button>
      <span class="month-label">{{ label }}</span>
      <ion-button fill="clear" class="nav-btn" (click)="shift.emit(1)">
        <ion-icon slot="icon-only" name="chevron-forward"></ion-icon>
      </ion-button>
    </div>
  `,
  styles: [
    `
      .month-nav {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 18px;
        margin: 4px 0 14px;
      }
      .month-nav .month-label {
        font-weight: 700;
        font-size: 1.05rem;
      }
      .nav-btn {
        border: 1px solid var(--app-border);
        border-radius: 50%;
      }
    `,
  ],
  imports: [IonButton, IonIcon],
})
export class MonthNavComponent {
  @Input() label = '';
  @Output() shift = new EventEmitter<number>();
}
