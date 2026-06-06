import { Component, Input } from '@angular/core';
import { IonSkeletonText } from '@ionic/angular/standalone';

export type SkeletonVariant = 'home' | 'summary' | 'list';

@Component({
  selector: 'app-skeleton',
  template: `
    <div class="sk page-pad">
      @if (variant === 'home' || variant === 'summary') {
        <div class="sk-hero">
          <ion-skeleton-text [animated]="true" class="sk-line w40"></ion-skeleton-text>
          <ion-skeleton-text [animated]="true" class="sk-amount"></ion-skeleton-text>
          <ion-skeleton-text [animated]="true" class="sk-line w30"></ion-skeleton-text>
        </div>
      }
      @if (variant === 'home') {
        <div class="sk-actions">
          @for (cell of [1, 2, 3, 4]; track cell) {
            <ion-skeleton-text [animated]="true" class="sk-action"></ion-skeleton-text>
          }
        </div>
      }
      <div class="sk-card">
        @for (row of rowList; track row) {
          <div class="sk-row">
            <ion-skeleton-text [animated]="true" class="sk-avatar"></ion-skeleton-text>
            <div class="sk-row-text">
              <ion-skeleton-text [animated]="true" class="sk-line w60"></ion-skeleton-text>
              <ion-skeleton-text [animated]="true" class="sk-line w30"></ion-skeleton-text>
            </div>
            <ion-skeleton-text [animated]="true" class="sk-line w15"></ion-skeleton-text>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .sk-hero {
        background: var(--app-surface);
        border-radius: var(--app-radius-lg);
        box-shadow: var(--app-shadow);
        padding: 20px;
        margin-bottom: 16px;
      }
      .sk-amount {
        height: 34px;
        width: 55%;
        border-radius: 8px;
        margin: 10px 0;
      }
      .sk-actions {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        margin-bottom: 18px;
      }
      .sk-action {
        height: 64px;
        border-radius: var(--app-radius-md);
        margin: 0;
      }
      .sk-card {
        background: var(--app-surface);
        border-radius: var(--app-radius-lg);
        box-shadow: var(--app-shadow);
        padding: 6px 14px;
      }
      .sk-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 0;
      }
      .sk-avatar {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        margin: 0;
        flex: none;
      }
      .sk-row-text {
        flex: 1;
      }
      .sk-line {
        height: 12px;
        border-radius: 6px;
        margin: 4px 0;
      }
      .w15 {
        width: 15%;
      }
      .w30 {
        width: 30%;
      }
      .w40 {
        width: 40%;
      }
      .w60 {
        width: 60%;
      }
    `,
  ],
  imports: [IonSkeletonText],
})
export class AppSkeletonComponent {
  @Input() variant: SkeletonVariant = 'list';
  @Input() rows = 5;

  get rowList(): number[] {
    return Array.from({ length: Math.max(1, this.rows) }, (_, index) => index);
  }
}
