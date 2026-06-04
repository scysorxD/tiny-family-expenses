import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';

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
      <div class="page-pad">
        <div class="app-card info-card">
          <span class="info-icon"><ion-icon name="lock-closed-outline"></ion-icon></span>
          <h2 class="info-title">Password recovery is coming soon</h2>
          <p class="label-muted">
            For now, please contact support to reset your password.
          </p>
        </div>
        <ion-button class="back-btn" expand="block" fill="outline" routerLink="/login">
          Back to sign in
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [
    `
      .info-card {
        text-align: center;
      }
      .info-icon {
        width: 56px;
        height: 56px;
        border-radius: 16px;
        background: var(--app-primary-soft);
        color: var(--app-primary);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 12px;
      }
      .info-icon ion-icon {
        font-size: 1.8rem;
      }
      .info-title {
        font-size: 1.15rem;
        font-weight: 700;
        margin: 0 0 6px;
      }
      .back-btn {
        margin-top: 18px;
      }
    `,
  ],
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonButtons,
    IonBackButton,
    IonIcon,
  ],
})
export class ForgotPasswordPage {}
