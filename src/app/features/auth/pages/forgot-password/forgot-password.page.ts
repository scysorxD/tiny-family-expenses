import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../../core/auth/auth.service';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { PageHeaderComponent, SubmitButtonComponent } from '../../../../shared/components';
import { describeError } from '../../../../shared/utils';

@Component({
  selector: 'app-forgot-password',
  template: `
    <app-page-header [title]="'auth.forgot.headerTitle' | translate" defaultHref="/login"></app-page-header>
    <ion-content>
      <div class="auth-wrap">
        @if (sent()) {
          <div class="brand">
            <span class="brand-icon"><ion-icon name="mail-outline"></ion-icon></span>
            <h1 class="brand-title">{{ 'auth.forgot.checkInboxTitle' | translate }}</h1>
            <p class="label-muted">
              {{ 'auth.forgot.checkInboxText' | translate: { email: sentTo() } }}
            </p>
          </div>
          <ion-button expand="block" fill="outline" routerLink="/login">{{ 'auth.forgot.backToSignIn' | translate }}</ion-button>
        } @else {
          <div class="brand">
            <span class="brand-icon"><ion-icon name="lock-closed-outline"></ion-icon></span>
            <h1 class="brand-title">{{ 'auth.forgot.title' | translate }}</h1>
            <p class="label-muted">{{ 'auth.forgot.subtitle' | translate }}</p>
          </div>

          @if (!configured) {
            <div class="app-card warn">{{ 'auth.notConfigured' | translate }}</div>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form">
            <ion-input
              fill="outline"
              [label]="'auth.email' | translate"
              labelPlacement="stacked"
              type="email"
              autocomplete="email"
              formControlName="email"
            ></ion-input>
            <app-submit-button
              [label]="'auth.forgot.sendLink' | translate"
              type="submit"
              [loading]="loading()"
              [disabled]="form.invalid || !configured"
            ></app-submit-button>
          </form>

          <ion-button expand="block" fill="clear" routerLink="/login">{{ 'auth.forgot.backToSignIn' | translate }}</ion-button>
        }
      </div>
    </ion-content>
  `,
  styles: [
    `
      .auth-wrap {
        padding: calc(var(--ion-safe-area-top, 0px) + 4vh) 20px 24px;
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
      .auth-form {
        display: flex;
        flex-direction: column;
        gap: 14px;
        margin-top: 8px;
      }
      .warn {
        color: var(--app-danger-ink);
        background: var(--app-danger-soft);
        margin-bottom: 16px;
      }
    `,
  ],
  imports: [
    ReactiveFormsModule,
    RouterLink,
    IonContent,
    IonButton,
    IonIcon,
    IonInput,
    PageHeaderComponent,
    SubmitButtonComponent,
    TranslatePipe,
  ],
})
export class ForgotPasswordPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly feedback = inject(FeedbackService);
  private readonly supabase = inject(SupabaseService);

  readonly loading = signal(false);
  readonly sent = signal(false);
  readonly sentTo = signal('');
  readonly configured = this.supabase.isConfigured;

  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) {
      return;
    }

    this.loading.set(true);
    try {
      const { email } = this.form.getRawValue();
      await this.auth.requestPasswordReset(email);
      this.sentTo.set(email);
      this.sent.set(true);
    } catch (error) {
      await this.feedback.error(describeError(error));
    } finally {
      this.loading.set(false);
    }
  }
}
