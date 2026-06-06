import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonInput } from '@ionic/angular/standalone';
import { AuthService } from '../../../../core/auth/auth.service';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { AuthShellComponent, SubmitButtonComponent } from '../../../../shared/components';
import { describeError } from '../../../../shared/utils';

@Component({
  selector: 'app-register',
  template: `
    <app-auth-shell
      title="Create your account"
      subtitle="Start tracking shared expenses together"
      [configured]="configured"
    >
      <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form">
        <ion-input
          fill="outline"
          label="Display name"
          labelPlacement="stacked"
          formControlName="displayName"
        ></ion-input>
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
          autocomplete="new-password"
          formControlName="password"
        ></ion-input>
        <app-submit-button
          label="Create account"
          type="submit"
          [loading]="loading()"
          [disabled]="form.invalid || !configured"
        ></app-submit-button>
      </form>

      <ion-button expand="block" fill="clear" routerLink="/login">I already have an account</ion-button>
    </app-auth-shell>
  `,
  styles: [
    `
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
    IonInput,
    IonButton,
    AuthShellComponent,
    SubmitButtonComponent,
  ],
})
export class RegisterPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly feedback = inject(FeedbackService);
  private readonly supabase = inject(SupabaseService);

  readonly loading = signal(false);
  readonly configured = this.supabase.isConfigured;

  readonly form = this.formBuilder.nonNullable.group({
    displayName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) {
      return;
    }

    this.loading.set(true);
    try {
      const { email, password, displayName } = this.form.getRawValue();
      await this.auth.signUp(email, password, displayName);

      if (this.auth.isAuthenticated()) {
        await this.router.navigateByUrl('/rooms');
      } else {
        await this.feedback.success('Account created. Please confirm your email, then sign in.');
        await this.router.navigateByUrl('/login');
      }
    } catch (error) {
      await this.feedback.error(describeError(error));
    } finally {
      this.loading.set(false);
    }
  }
}
