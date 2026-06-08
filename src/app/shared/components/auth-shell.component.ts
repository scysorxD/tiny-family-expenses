import { Component, Input } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-auth-shell',
  // Presentational wrapper only — the host page supplies <ion-content>. Wrapping
  // ion-content inside this component made it a non-flex child of the page and
  // collapsed it to zero height on Android WebView.
  template: `
    <div class="auth-wrap">
      <div class="brand">
        <span class="brand-icon"><ion-icon [name]="icon"></ion-icon></span>
        <h1 class="brand-title">{{ title }}</h1>
        <p class="label-muted">{{ subtitle }}</p>
      </div>

      @if (!configured) {
        <div class="app-card warn">{{ 'auth.notConfigured' | translate }}</div>
      }

      <ng-content></ng-content>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .auth-wrap {
        padding: calc(var(--ion-safe-area-top, 0px) + 8vh) 20px 24px;
        max-width: 460px;
        margin: 0 auto;
      }
      .brand {
        text-align: center;
        margin-bottom: 24px;
      }
      .brand-icon {
        width: 64px;
        height: 64px;
        border-radius: 18px;
        background: var(--app-primary-soft);
        color: var(--app-primary);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 12px;
      }
      .brand-icon ion-icon {
        font-size: 2rem;
      }
      .brand-title {
        font-size: 1.6rem;
        font-weight: 800;
        margin: 0 0 4px;
      }
      .warn {
        color: var(--app-danger-ink);
        background: var(--app-danger-soft);
        margin-bottom: 16px;
      }
    `,
  ],
  imports: [IonIcon, TranslatePipe],
})
export class AuthShellComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() icon = 'wallet-outline';
  @Input() configured = true;
}
