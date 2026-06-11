import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonSpinner,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../../core/auth/auth.service';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { describeError } from '../../../../shared/utils';

@Component({
  selector: 'app-reset-password',
  template: `
    <ion-content>
      <div class="auth-wrap">
        @if (checking()) {
          <div class="center-pad"><ion-spinner></ion-spinner></div>
        } @else if (ready()) {
          <div class="brand">
            <span class="brand-icon"><ion-icon name="key-outline"></ion-icon></span>
            <h1 class="brand-title">{{ 'auth.reset.title' | translate }}</h1>
            <p class="label-muted">{{ 'auth.reset.subtitle' | translate }}</p>
          </div>

          <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form">
            <ion-input
              fill="outline"
              [label]="'auth.reset.newPassword' | translate"
              labelPlacement="stacked"
              type="password"
              autocomplete="new-password"
              formControlName="password"
            ></ion-input>
            <ion-input
              fill="outline"
              [label]="'auth.reset.confirmPassword' | translate"
              labelPlacement="stacked"
              type="password"
              autocomplete="new-password"
              formControlName="confirm"
            ></ion-input>
            <ion-button expand="block" type="submit" [disabled]="loading() || form.invalid">
              @if (loading()) {
                <ion-spinner name="dots"></ion-spinner>
              } @else {
                {{ 'auth.reset.submit' | translate }}
              }
            </ion-button>
          </form>
        } @else {
          <div class="brand">
            <span class="brand-icon warn-icon"><ion-icon name="warning-outline"></ion-icon></span>
            <h1 class="brand-title">{{ 'auth.reset.invalidTitle' | translate }}</h1>
            <p class="label-muted">{{ errorMessage() }}</p>
          </div>
          <ion-button expand="block" fill="outline" routerLink="/forgot-password">
            {{ 'auth.reset.requestNew' | translate }}
          </ion-button>
        }
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
      .warn-icon {
        background: var(--app-danger-soft);
        color: var(--app-danger-ink);
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
    TranslatePipe,
  ],
})
export class ResetPasswordPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly feedback = inject(FeedbackService);
  private readonly supabase = inject(SupabaseService);
  private readonly translate = inject(TranslateService);

  readonly checking = signal(true);
  readonly ready = signal(false);
  readonly loading = signal(false);
  readonly errorMessage = signal('');

  readonly form = this.formBuilder.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirm: ['', [Validators.required, Validators.minLength(6)]],
  });

  async ngOnInit(): Promise<void> {
    this.errorMessage.set(this.translate.instant('auth.reset.invalidDefault'));

    if (!this.supabase.isConfigured) {
      this.errorMessage.set(this.translate.instant('auth.reset.notConfigured'));
      this.checking.set(false);
      return;
    }

    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const type = params.get('type');
    const errorDescription = params.get('error_description');

    if (errorDescription) {
      this.errorMessage.set(errorDescription);
      this.checking.set(false);
      return;
    }

    if (accessToken && refreshToken && type === 'recovery') {
      try {
        await this.auth.setSessionFromTokens(accessToken, refreshToken);
        this.ready.set(true);
      } catch (error) {
        this.errorMessage.set(describeError(error));
      } finally {
        this.checking.set(false);
      }
      return;
    }

    if (this.auth.isAuthenticated()) {
      this.ready.set(true);
    }
    this.checking.set(false);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      return;
    }

    const { password, confirm } = this.form.getRawValue();
    if (password !== confirm) {
      await this.feedback.error(this.translate.instant('auth.reset.passwordsNoMatch'));
      return;
    }

    this.loading.set(true);
    try {
      await this.auth.updatePassword(password);
      await this.feedback.success(this.translate.instant('auth.reset.updated'));
      await this.router.navigateByUrl('/rooms');
    } catch (error) {
      await this.feedback.error(describeError(error));
    } finally {
      this.loading.set(false);
    }
  }
}
