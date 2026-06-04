import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonSpinner,
} from '@ionic/angular/standalone';
import { AuthService } from '../../../../core/auth/auth.service';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { PreferencesService } from '../../../../core/services/preferences.service';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { describeError } from '../../../../shared/utils';

@Component({
  selector: 'app-login',
  template: `
    <ion-content>
      <div class="auth-wrap">
        <div class="brand">
          <span class="brand-icon"><ion-icon name="wallet-outline"></ion-icon></span>
          <h1 class="brand-title">Welcome back</h1>
          <p class="label-muted">Sign in to manage your shared expenses</p>
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
          <ion-input
            fill="outline"
            label="Password"
            labelPlacement="stacked"
            type="password"
            autocomplete="current-password"
            formControlName="password"
          ></ion-input>
          <ion-button expand="block" type="submit" [disabled]="loading() || form.invalid || !configured">
            @if (loading()) {
              <ion-spinner name="dots"></ion-spinner>
            } @else {
              Sign in
            }
          </ion-button>
        </form>

        <ion-button expand="block" fill="clear" routerLink="/register">Create an account</ion-button>
        <ion-button expand="block" fill="clear" routerLink="/forgot-password">Forgot password?</ion-button>
      </div>
    </ion-content>
  `,
  styles: [
    `
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
      .auth-form {
        display: flex;
        flex-direction: column;
        gap: 14px;
        margin-top: 8px;
      }
      .auth-form ion-button {
        margin-top: 6px;
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
    IonInput,
    IonButton,
    IonIcon,
    IonSpinner,
  ],
})
export class LoginPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly preferences = inject(PreferencesService);
  private readonly feedback = inject(FeedbackService);
  private readonly supabase = inject(SupabaseService);

  readonly loading = signal(false);
  readonly configured = this.supabase.isConfigured;

  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) {
      return;
    }

    this.loading.set(true);
    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.signIn(email, password);
      const lastRoom = await this.preferences.getLastRoomId();
      await this.router.navigateByUrl(lastRoom ? `/rooms/${lastRoom}` : '/rooms');
    } catch (error) {
      await this.feedback.error(describeError(error));
    } finally {
      this.loading.set(false);
    }
  }
}
