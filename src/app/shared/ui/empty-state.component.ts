import { Component, EventEmitter, Input, Output } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular/standalone';

@Component({
  selector: 'app-empty-state',
  template: `
    <div class="empty">
      <span class="empty-icon"><ion-icon [name]="icon"></ion-icon></span>
      <h3 class="empty-title">{{ title }}</h3>
      @if (message) {
        <p class="label-muted empty-msg">{{ message }}</p>
      }
      @if (actionLabel) {
        <ion-button class="empty-cta" (click)="action.emit()">{{ actionLabel }}</ion-button>
      }
    </div>
  `,
  styles: [
    `
      .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 28px 18px;
      }
      .empty-icon {
        width: 64px;
        height: 64px;
        border-radius: 20px;
        background: var(--app-primary-soft);
        color: var(--app-primary);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 14px;
      }
      .empty-icon ion-icon {
        font-size: 2rem;
      }
      .empty-title {
        font-size: 1.05rem;
        font-weight: 700;
        margin: 0 0 4px;
      }
      .empty-msg {
        margin: 0;
        max-width: 280px;
      }
      .empty-cta {
        margin-top: 16px;
      }
    `,
  ],
  imports: [IonButton, IonIcon],
})
export class EmptyStateComponent {
  @Input() icon = 'sparkles-outline';
  @Input() title = '';
  @Input() message = '';
  @Input() actionLabel = '';
  @Output() action = new EventEmitter<void>();
}
