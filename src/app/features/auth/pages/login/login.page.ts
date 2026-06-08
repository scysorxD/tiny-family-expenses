import { AfterViewInit, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonInput } from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
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
    <!-- TEMP DIAGNOSTIC TEMPLATE: minimal static Ionic page to isolate ion-content rendering. -->
    <ion-content>
      <div style="padding: 32px; color: #111; background: #fff; min-height: 100vh">
        <h1>Login</h1>
        <p>This is the real login page content.</p>
        <input placeholder="Email" style="display:block; margin:16px 0; padding:12px; width:100%" />
        <button style="padding:12px 16px">Continue</button>
      </div>
    </ion-content>
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
    IonContent,
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
  private readonly translate = inject(TranslateService);

  readonly loading = signal(false);
  readonly configured = this.supabase.isConfigured;

  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  ngOnInit(): void {
    console.log('[LoginPage] initialized');
    console.log(`[LoginPage] form initialized status=${this.form.status} valid=${this.form.valid}`);
    console.log(`[LoginPage] loading=${this.loading()} configured=${this.configured}`);
    console.log(
      `[LoginPage] translations lang=${this.translate.currentLang} title="${this.translate.instant(
        'auth.login.title',
      )}"`,
    );
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
