import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { AuthService } from '../../../../core/auth/auth.service';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { describeError } from '../../../../shared/utils';

@Component({
  selector: 'app-forgot-password',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/login"></ion-back-button>
        </ion-buttons>
        <ion-title>Reset password</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="auth-wrap">
        @if (sent()) {
          <div class="brand">
            <span class="brand-icon"><ion-icon name="mail-outline"></ion-icon></span>
            <h1 class="brand-title">Check your inbox</h1>
            <p class="label-muted">
              If an account exists for {{ sentTo() }}, we've sent a link to reset your password.
            </p>
          </div>
          <ion-button expand="block" fill="outline" routerLink="/login">Back to sign in</ion-button>
        } @else {
          <div class="brand">
            <span class="brand-icon"><ion-icon name="lock-closed-outline"></ion-icon></span>
            <h1 class="brand-title">Forgot password?</h1>
            <p class="label-muted">Enter your email and we'll send you a reset link.</p>
          </div>

          @if (!configured) {
            <div class="app-card warn">
              Supabase is not configured yet. Add your project URL and anon key in environment.ts.
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form">
            <ion-input
              fill="outline"
              label="Email"
              labelPlacement="stacked"
              type="email"
              autocomplete="email"
              formControlName="email"
            ></ion-input>
            <ion-button
              expand="block"
              type="submit"
              [disabled]="loading() || form.invalid || !configured"
            >
              @if (loading()) {
                <ion-spinner name="dots"></ion-spinner>
              } @else {
                Send reset link
              }
            </ion-button>
          </form>

          <ion-button expand="block" fill="clear" routerLink="/login">Back to sign in</ion-button>
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
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonButtons,
    IonBackButton,
    IonIcon,
    IonInput,
    IonSpinner,
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
