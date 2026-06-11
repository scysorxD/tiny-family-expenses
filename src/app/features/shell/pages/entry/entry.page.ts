import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonSpinner } from '@ionic/angular/standalone';
import { AuthService } from '../../../../core/auth/auth.service';
import { PreferencesService } from '../../../../core/services/preferences.service';

@Component({
  selector: 'app-entry',
  template: `
    <ion-content class="ion-padding ion-text-center">
      <ion-spinner class="entry-spinner"></ion-spinner>
    </ion-content>
  `,
  styles: [
    `
      .entry-spinner {
        margin-top: 45vh;
      }
    `,
  ],
  imports: [IonContent, IonSpinner],
})
export class EntryPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly preferences = inject(PreferencesService);
  private readonly router = inject(Router);

  async ngOnInit(): Promise<void> {
    // The entryRedirectGuard normally resolves the destination before this page
    // mounts; this remains as a defensive fallback so we never stay on a spinner.
    try {
      await this.auth.ensureInitialized();

      if (!this.auth.isAuthenticated()) {
        await this.router.navigateByUrl('/login');
        return;
      }

      const lastRoom = await this.preferences.getLastRoomId();
      await this.router.navigateByUrl(lastRoom ? `/rooms/${lastRoom}` : '/rooms');
    } catch (err) {
      console.error('Entry redirect failed', err);
      await this.router.navigateByUrl('/login');
    }
  }
}
