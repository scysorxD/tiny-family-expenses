import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  ActionSheetController,
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';
import { AuthService } from '../../../../core/auth/auth.service';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { PreferencesService } from '../../../../core/services/preferences.service';
import { RoomService } from '../../../../core/services/room.service';
import { RoomMembership } from '../../../../data/remote/supabase.mappers';
import { AppTabBarComponent } from '../../../../shared/ui';
import { describeError, monthLabel, toMonthKey } from '../../../../shared/utils';

@Component({
  selector: 'app-room-list',
  template: `
    <ion-content>
      <div class="home-wrap fab-safe">
        <div class="greeting-row">
          <div class="greeting-text">
            <h1 class="greeting">{{ greeting() }}, {{ firstName() }}</h1>
            <p class="label-muted">Manage your shared expense rooms</p>
          </div>
          <div class="greeting-actions">
            <span class="avatar"><ion-icon name="person-circle-outline"></ion-icon></span>
            <ion-button fill="clear" class="round-btn" (click)="openMenu()">
              <ion-icon slot="icon-only" name="ellipsis-vertical"></ion-icon>
            </ion-button>
          </div>
        </div>

        @if (loading()) {
          <div class="center-pad"><ion-spinner></ion-spinner></div>
        } @else {
          <h2 class="section-title">My rooms</h2>
          @if (rooms().length === 0) {
            <div class="app-card text-muted">You have no rooms yet. Create your first one.</div>
          } @else {
            <div class="rooms">
              @for (membership of rooms(); track membership.room.id) {
                <button class="room-card app-card" (click)="open(membership.room.id)">
                  <span class="room-icon"><ion-icon name="home-outline"></ion-icon></span>
                  <span class="room-info">
                    <span class="room-name">{{ membership.room.name }}</span>
                    <span class="label-muted">{{ membership.room.currency }} · {{ currentMonth }}</span>
                    <span
                      class="status-pill"
                      [class.is-paid]="membership.role === 'admin'"
                      [class.is-muted]="membership.role !== 'admin'"
                      >{{ membership.role }}</span
                    >
                  </span>
                  <ion-icon class="chev" name="chevron-forward"></ion-icon>
                </button>
              }
            </div>
          }

          <div class="promo-card">
            <span class="promo-icon"><ion-icon name="home-outline"></ion-icon></span>
            <div>
              <h3 class="promo-title">Keep expenses organized</h3>
              <p class="label-muted">
                Create rooms for your home, trips, events, or any shared expenses.
              </p>
            </div>
          </div>
        }
      </div>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button (click)="create()">
          <ion-icon name="add"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
    @if (!loading() && rooms().length > 0) {
      <app-tab-bar [roomId]="tabRoomId()" active="home" (addExpense)="quickAdd()"></app-tab-bar>
    }
  `,
  styles: [
    `
      .home-wrap {
        padding: calc(var(--ion-safe-area-top, 0px) + 12px) 16px 16px;
      }
      .greeting-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }
      .greeting {
        font-size: 1.5rem;
        font-weight: 800;
        margin: 0 0 2px;
      }
      .greeting-actions {
        display: flex;
        align-items: center;
        gap: 2px;
        flex-shrink: 0;
      }
      .avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: var(--app-primary-soft);
        color: var(--app-primary);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .avatar ion-icon {
        font-size: 1.9rem;
      }
      .rooms {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .room-card {
        display: flex;
        align-items: center;
        gap: 14px;
        width: 100%;
        border: 0;
        cursor: pointer;
        text-align: left;
      }
      .room-icon {
        width: 52px;
        height: 52px;
        border-radius: 14px;
        background: var(--app-primary-soft);
        color: var(--app-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .room-icon ion-icon {
        font-size: 1.6rem;
      }
      .room-info {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1;
        min-width: 0;
      }
      .room-name {
        font-weight: 700;
        font-size: 1.05rem;
      }
      .room-info .status-pill {
        align-self: flex-start;
        text-transform: capitalize;
      }
      .chev {
        color: var(--app-text-muted);
        font-size: 1.2rem;
        flex-shrink: 0;
      }
      .promo-card {
        margin-top: 18px;
      }
      .promo-icon {
        width: 56px;
        height: 56px;
        border-radius: 14px;
        background: #fff;
        color: var(--app-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .promo-icon ion-icon {
        font-size: 1.8rem;
      }
      .promo-title {
        margin: 0 0 4px;
        font-weight: 700;
      }
    `,
  ],
  imports: [
    IonContent,
    IonButton,
    IonIcon,
    IonSpinner,
    IonFab,
    IonFabButton,
    AppTabBarComponent,
  ],
})
export class RoomListPage {
  private readonly roomService = inject(RoomService);
  private readonly auth = inject(AuthService);
  private readonly preferences = inject(PreferencesService);
  private readonly feedback = inject(FeedbackService);
  private readonly actionSheet = inject(ActionSheetController);
  private readonly router = inject(Router);

  readonly rooms = signal<RoomMembership[]>([]);
  readonly loading = signal(true);
  readonly lastRoomId = signal<string | null>(null);

  readonly currentMonth = monthLabel(toMonthKey(new Date()));
  readonly tabRoomId = computed(() => this.lastRoomId() ?? this.rooms()[0]?.room.id ?? null);

  greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) {
      return 'Good morning';
    }
    if (hour < 18) {
      return 'Good afternoon';
    }
    return 'Good evening';
  }

  firstName(): string {
    const user = this.auth.currentUser();
    const metadata = user?.user_metadata as { display_name?: string } | undefined;
    const name = metadata?.display_name?.trim();
    if (name) {
      return name.split(' ')[0];
    }
    const email = user?.email ?? '';
    return email ? email.split('@')[0] : 'there';
  }

  async ionViewWillEnter(): Promise<void> {
    this.lastRoomId.set(await this.preferences.getLastRoomId());
    await this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.rooms.set(await this.roomService.listMyRooms());
    } catch (error) {
      await this.feedback.error(describeError(error));
    } finally {
      this.loading.set(false);
    }
  }

  async open(roomId: string): Promise<void> {
    await this.preferences.setLastRoomId(roomId);
    await this.router.navigate(['/rooms', roomId]);
  }

  create(): void {
    void this.router.navigateByUrl('/rooms/new');
  }

  quickAdd(): void {
    const roomId = this.tabRoomId();
    void this.router.navigateByUrl(roomId ? `/rooms/${roomId}` : '/rooms/new');
  }

  async openMenu(): Promise<void> {
    const sheet = await this.actionSheet.create({
      buttons: [
        {
          text: 'Sign out',
          role: 'destructive',
          icon: 'lock-closed-outline',
          handler: () => void this.signOut(),
        },
        { text: 'Cancel', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  private async signOut(): Promise<void> {
    await this.preferences.clearLastRoomId();
    await this.auth.signOut();
    await this.router.navigateByUrl('/login');
  }
}
