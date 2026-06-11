import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonButton, IonContent, IonInput } from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../../core/auth/auth.service';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { PreferencesService } from '../../../../core/services/preferences.service';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { AuthShellComponent, SubmitButtonComponent } from '../../../../shared/components';
import { describeError } from '../../../../shared/utils';

@Component({
  selector: 'app-verify-email',
  template: `
    <ion-content fullscreen="true">
      <app-auth-shell
        [title]="'auth.verify.title' | translate"
        [subtitle]="'auth.verify.subtitle' | translate"
        [configured]="configured"
        icon="mail-outline"
      >
        <p class="verify-email-label">{{ email }}</p>

        <div class="verify-form">
          <ion-input
            fill="outline"
            [label]="'auth.verify.codeLabel' | translate"
            labelPlacement="stacked"
            type="text"
            inputmode="numeric"
            autocomplete="one-time-code"
            [(ngModel)]="code"
            maxlength="6"
          ></ion-input>

          <app-submit-button
            [label]="'auth.verify.submit' | translate"
            [loading]="verifying()"
            [disabled]="!code || code.length < 4 || !configured"
            (action)="verify()"
          ></app-submit-button>
        </div>

        @if (errorMessage()) {
          <p class="error-text">{{ errorMessage() }}</p>
        }

        <ion-button expand="block" fill="clear" [disabled]="resending()" (click)="resend()">
          @if (resending()) {
            {{ 'auth.verify.resending' | translate }}
          } @else {
            {{ 'auth.verify.resend' | translate }}
          }
        </ion-button>

        <ion-button expand="block" fill="clear" routerLink="/login">
          {{ 'auth.verify.backToLogin' | translate }}
        </ion-button>
      </app-auth-shell>
    </ion-content>
  `,
  styles: [
    `
      .verify-email-label {
        text-align: center;
        font-weight: 600;
        margin: 0 0 16px;
        color: var(--app-primary);
      }
      .verify-form {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .error-text {
        color: var(--app-danger-ink, var(--ion-color-danger));
        font-size: 0.85rem;
        margin: 8px 0 0;
      }
    `,
  ],
  imports: [
    FormsModule,
    IonContent,
    IonInput,
    IonButton,
    AuthShellComponent,
    SubmitButtonComponent,
    TranslatePipe,
  ],
})
export class VerifyEmailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly feedback = inject(FeedbackService);
  private readonly preferences = inject(PreferencesService);
  private readonly supabase = inject(SupabaseService);
  private readonly translate = inject(TranslateService);

  readonly configured = this.supabase.isConfigured;
  readonly verifying = signal(false);
  readonly resending = signal(false);
  readonly errorMessage = signal<string | null>(null);

  code = '';

  get email(): string {
    return (
      this.route.snapshot.queryParamMap.get('email') ??
      this.auth.currentUser()?.email ??
      ''
    );
  }

  async verify(): Promise<void> {
    this.errorMessage.set(null);
    const trimmed = this.code.trim();
    if (!trimmed) return;

    this.verifying.set(true);
    try {
      await this.auth.verifyEmailOtp(this.email, trimmed);
      const lastRoom = await this.preferences.getLastRoomId();
      await this.router.navigateByUrl(lastRoom ? `/rooms/${lastRoom}` : '/rooms');
    } catch (error) {
      this.errorMessage.set(describeError(error));
    } finally {
      this.verifying.set(false);
    }
  }

  async resend(): Promise<void> {
    this.resending.set(true);
    this.errorMessage.set(null);
    try {
      await this.auth.resendVerification(this.email);
      await this.feedback.success(this.translate.instant('auth.verify.resent'));
    } catch (error) {
      this.errorMessage.set(describeError(error));
    } finally {
      this.resending.set(false);
    }
  }
}
