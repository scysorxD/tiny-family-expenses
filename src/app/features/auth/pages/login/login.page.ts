import { AfterViewInit, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonInput } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../../../core/auth/auth.service';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { PreferencesService } from '../../../../core/services/preferences.service';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { AuthShellComponent, SubmitButtonComponent } from '../../../../shared/components';
import { describeError } from '../../../../shared/utils';

@Component({
  selector: 'app-login',
  template: `
    <div
      style="background:red;color:white;font-size:24px;z-index:999999;position:fixed;top:80px;left:16px;padding:8px"
    >
      LOGIN PAGE VISIBLE
    </div>
    <app-auth-shell
      [title]="'auth.login.title' | translate"
      [subtitle]="'auth.login.subtitle' | translate"
      [configured]="configured"
    >
      <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form">
        <ion-input
          fill="outline"
          [label]="'auth.email' | translate"
          labelPlacement="stacked"
          type="email"
          autocomplete="email"
          formControlName="email"
        ></ion-input>
        <ion-input
          fill="outline"
          [label]="'auth.password' | translate"
          labelPlacement="stacked"
          type="password"
          autocomplete="current-password"
          formControlName="password"
        ></ion-input>
        <app-submit-button
          [label]="'auth.login.signIn' | translate"
          type="submit"
          [loading]="loading()"
          [disabled]="form.invalid || !configured"
        ></app-submit-button>
      </form>

      <ion-button expand="block" fill="clear" routerLink="/register">{{ 'auth.login.createAccount' | translate }}</ion-button>
      <ion-button expand="block" fill="clear" routerLink="/forgot-password">{{ 'auth.login.forgot' | translate }}</ion-button>
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
    TranslatePipe,
  ],
})
export class LoginPage implements OnInit, AfterViewInit {
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

  ngOnInit(): void {
    console.log('[LoginPage] initialized');
  }

  ngAfterViewInit(): void {
    console.log('[LoginPage] ngAfterViewInit');
    this.dumpDebug('afterViewInit');
    setTimeout(() => this.dumpDebug('afterViewInit+1500ms'), 1500);
  }

  ionViewWillEnter(): void {
    console.log('[LoginPage] ionViewWillEnter');
  }

  ionViewDidEnter(): void {
    console.log('[LoginPage] ionViewDidEnter');
    this.dumpDebug('ionViewDidEnter');
  }

  private dumpDebug(tag: string): void {
    try {
      const count = (sel: string): number => document.querySelectorAll(sel).length;
      console.log(`[Debug ${tag}] url=${location.href}`);
      console.log(`[Debug ${tag}] body.innerHTML length=${document.body.innerHTML.length}`);
      console.log(
        `[Debug ${tag}] counts ion-app=${count('ion-app')} ion-router-outlet=${count(
          'ion-router-outlet',
        )} ion-content=${count('ion-content')} app-login=${count('app-login')} app-auth-shell=${count(
          'app-auth-shell',
        )}`,
      );
      const dump = (sel: string): void => {
        const el = document.querySelector(sel) as HTMLElement | null;
        if (!el) {
          console.log(`[Debug ${tag}] ${sel} = NOT FOUND`);
          return;
        }
        const cs = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        console.log(
          `[Debug ${tag}] ${sel} class="${el.className}" display=${cs.display} visibility=${cs.visibility} opacity=${cs.opacity} height=${cs.height} width=${cs.width} rect=${Math.round(
            rect.width,
          )}x${Math.round(rect.height)} bg=${cs.backgroundColor} color=${cs.color} zIndex=${cs.zIndex}`,
        );
      };
      dump('ion-app');
      dump('ion-router-outlet');
      dump('app-login');
      dump('app-auth-shell');
      dump('ion-content');
    } catch (err) {
      console.error(`[Debug ${tag}] failed`, err);
    }
  }

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
