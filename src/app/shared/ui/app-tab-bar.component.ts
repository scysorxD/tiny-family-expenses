import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  ActionSheetButton,
  ActionSheetController,
  IonFooter,
  IonIcon,
} from '@ionic/angular/standalone';
import { AuthService } from '../../core/auth/auth.service';
import { PreferencesService } from '../../core/services/preferences.service';

export type TabKey = 'home' | 'summary' | 'collections' | 'more';

@Component({
  selector: 'app-tab-bar',
  template: `
    <ion-footer class="tab-footer">
      <div class="tab-bar">
        <button type="button" class="tab" [class.active]="active === 'home'" (click)="go('')">
          <ion-icon [name]="active === 'home' ? 'home' : 'home-outline'"></ion-icon>
          <span>Home</span>
        </button>
        <button type="button" class="tab" [class.active]="active === 'summary'" (click)="go('summary')">
          <ion-icon name="pie-chart-outline"></ion-icon>
          <span>Summary</span>
        </button>
        <div class="tab-fab-slot">
          <button type="button" class="tab-fab" (click)="addExpense.emit()">
            <ion-icon name="add"></ion-icon>
          </button>
        </div>
        <button
          type="button"
          class="tab"
          [class.active]="active === 'collections'"
          (click)="go('collections')"
        >
          <ion-icon name="people-outline"></ion-icon>
          <span>Collections</span>
        </button>
        <button type="button" class="tab" [class.active]="active === 'more'" (click)="openMore()">
          <ion-icon name="ellipsis-horizontal"></ion-icon>
          <span>More</span>
        </button>
      </div>
    </ion-footer>
  `,
  styles: [
    `
      .tab-footer {
        box-shadow: none;
      }
      .tab-footer::before {
        display: none;
      }
      .tab-bar {
        display: flex;
        align-items: center;
        justify-content: space-around;
        padding: 8px 4px calc(8px + var(--ion-safe-area-bottom, 0px));
        background: var(--app-surface);
        border-top: 1px solid var(--app-border);
      }
      .tab {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        padding: 4px 0;
        background: transparent;
        border: 0;
        font-size: 0.7rem;
        font-weight: 600;
        color: var(--app-text-muted);
      }
      .tab ion-icon {
        font-size: 1.4rem;
      }
      .tab.active {
        color: var(--app-primary);
      }
      .tab-fab-slot {
        flex: 1;
        display: flex;
        justify-content: center;
      }
      .tab-fab {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: var(--app-primary);
        color: #fff;
        border: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 8px 18px rgba(37, 99, 235, 0.4);
        transform: translateY(-18px);
      }
      .tab-fab ion-icon {
        font-size: 1.7rem;
      }
    `,
  ],
  imports: [IonFooter, IonIcon],
})
export class AppTabBarComponent {
  @Input() roomId: string | null = null;
  @Input() active: TabKey = 'home';
  @Output() addExpense = new EventEmitter<void>();

  private readonly router = inject(Router);
  private readonly actionSheet = inject(ActionSheetController);
  private readonly auth = inject(AuthService);
  private readonly preferences = inject(PreferencesService);

  go(section: string): void {
    if (!this.roomId) {
      void this.router.navigateByUrl('/rooms');
      return;
    }
    void this.router.navigate(section ? ['/rooms', this.roomId, section] : ['/rooms', this.roomId]);
  }

  async openMore(): Promise<void> {
    const buttons: ActionSheetButton[] = [];
    const roomId = this.roomId;
    if (roomId) {
      buttons.push(
        { text: 'Dashboard', icon: 'stats-chart-outline', handler: () => this.nav(roomId, 'dashboard') },
        { text: 'Categories', icon: 'pricetag-outline', handler: () => this.nav(roomId, 'categories') },
        { text: 'Members', icon: 'people-outline', handler: () => this.nav(roomId, 'members') },
        { text: 'Beneficiaries', icon: 'person-outline', handler: () => this.nav(roomId, 'beneficiaries') },
        { text: 'Payers', icon: 'wallet-outline', handler: () => this.nav(roomId, 'payers') },
        { text: 'Room settings', icon: 'settings-outline', handler: () => this.nav(roomId, 'settings') },
      );
    }
    buttons.push(
      { text: 'Switch room', icon: 'home-outline', handler: () => void this.router.navigateByUrl('/rooms') },
      { text: 'Sign out', role: 'destructive', icon: 'lock-closed-outline', handler: () => void this.signOut() },
      { text: 'Cancel', role: 'cancel' },
    );
    const sheet = await this.actionSheet.create({ header: 'More', buttons });
    await sheet.present();
  }

  private nav(roomId: string, section: string): void {
    void this.router.navigate(['/rooms', roomId, section]);
  }

  private async signOut(): Promise<void> {
    await this.preferences.clearLastRoomId();
    await this.auth.signOut();
    await this.router.navigateByUrl('/login');
  }
}
