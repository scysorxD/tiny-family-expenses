import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonList,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { AuthService } from '../../../../core/auth/auth.service';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { describeError } from '../../../../shared/utils';

@Component({
  selector: 'app-register',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Create account</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      @if (!configured) {
        <ion-text color="danger">
          <p>Supabase is not configured yet. Add your project URL and anon key in environment.ts.</p>
        </ion-text>
      }
      <form [formGroup]="form" (ngSubmit)="submit()">
        <ion-list>
          <ion-item>
            <ion-input
              label="Display name"
              labelPlacement="stacked"
              formControlName="displayName"
            ></ion-input>
          </ion-item>
          <ion-item>
            <ion-input
              label="Email"
              labelPlacement="stacked"
              type="email"
              autocomplete="email"
              formControlName="email"
            ></ion-input>
          </ion-item>
          <ion-item>
            <ion-input
              label="Password"
              labelPlacement="stacked"
              type="password"
              autocomplete="new-password"
              formControlName="password"
            ></ion-input>
          </ion-item>
        </ion-list>
        <ion-button
          class="ion-margin-top"
          expand="block"
          type="submit"
          [disabled]="loading() || form.invalid || !configured"
        >
          @if (loading()) {
            <ion-spinner name="dots"></ion-spinner>
          } @else {
            Create account
          }
        </ion-button>
      </form>
      <ion-button expand="block" fill="clear" routerLink="/login">I already have an account</ion-button>
    </ion-content>
  `,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonInput,
    IonButton,
    IonText,
    IonSpinner,
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
