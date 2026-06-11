import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  ActionSheetController,
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../../../core/auth/auth.service';
import { LanguageService } from '../../../../core/i18n';
import { PendingInvitation } from '../../../../core/models';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { InvitationService } from '../../../../core/services/invitation.service';
import { PreferencesService } from '../../../../core/services/preferences.service';
import { RoomService } from '../../../../core/services/room.service';
import { RoomMembership } from '../../../../data/remote/supabase.mappers';
import { AppSkeletonComponent, EmptyStateComponent, StatusPillComponent } from '../../../../shared/ui';
import { describeError, monthLabel, toMonthKey } from '../../../../shared/utils';

@Component({
  selector: 'app-room-list',
  template: `
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($any($event))">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      <div class="home-wrap fab-safe">
        <div class="greeting-row">
          <div class="greeting-text">
            <h1 class="greeting">{{ greeting() }}, {{ firstName() }}</h1>
            <p class="label-muted">{{ 'rooms.list.subtitle' | translate }}</p>
          </div>
          <div class="greeting-actions">
            <span class="avatar"><ion-icon name="person-circle-outline"></ion-icon></span>
            <ion-button fill="clear" class="round-btn" (click)="openMenu()">
              <ion-icon slot="icon-only" name="ellipsis-vertical"></ion-icon>
            </ion-button>
          </div>
        </div>

        @if (loading()) {
          <app-skeleton variant="list" [rows]="3"></app-skeleton>
        } @else {
          @if (pendingInvitations().length > 0) {
            <h2 class="section-title">{{ 'rooms.invitations.pendingTitle' | translate }}</h2>
            <div class="invitations">
              @for (inv of pendingInvitations(); track inv.id) {
                <div class="invite-banner app-card">
                  <span class="invite-icon"><ion-icon name="mail-outline"></ion-icon></span>
                  <span class="invite-info">
                    <span class="invite-room">{{ inv.roomName }}</span>
                    <span class="label-muted">{{ 'rooms.invitations.invitedAs' | translate: { inviter: inv.invitedByName, role: 'role.' + inv.role | translate } }}</span>
                  </span>
                  <div class="invite-actions">
                    @if (accepting() === inv.id) {
                      <ion-spinner name="dots" class="inline-spinner"></ion-spinner>
                    } @else {
                      <ion-button fill="solid" size="small" color="primary" (click)="acceptInvite(inv)">
                        {{ 'rooms.invitations.accept' | translate }}
                      </ion-button>
                    }
                    @if (rejecting() === inv.id) {
                      <ion-spinner name="dots" class="inline-spinner"></ion-spinner>
                    } @else {
                      <ion-button fill="outline" size="small" color="medium" (click)="rejectInvite(inv)">
                        {{ 'rooms.invitations.reject' | translate }}
                      </ion-button>
                    }
                  </div>
                </div>
              }
            </div>
          }

          <h2 class="section-title">{{ 'rooms.list.myRooms' | translate }}</h2>
          @if (rooms().length === 0) {
            <app-empty-state
              icon="home-outline"
              [title]="pendingInvitations().length > 0 ? ('rooms.invitations.noRoomsYet' | translate) : ('rooms.list.emptyTitle' | translate)"
              [message]="pendingInvitations().length > 0 ? ('rooms.invitations.acceptAbove' | translate) : ('rooms.list.emptyMessage' | translate)"
              [actionLabel]="pendingInvitations().length > 0 ? '' : ('rooms.list.createRoom' | translate)"
              (action)="create()"
            ></app-empty-state>
          } @else {
            <div class="rooms">
              @for (membership of rooms(); track membership.room.id) {
                <button class="room-card app-card" (click)="open(membership.room.id)">
                  <span class="room-icon"><ion-icon name="home-outline"></ion-icon></span>
                  <span class="room-info">
                    <span class="room-name">{{ membership.room.name }}</span>
                    <span class="label-muted">{{ membership.room.currency }} · {{ currentMonth }}</span>
                    <app-status-pill
                      [label]="'role.' + membership.role | translate"
                      [tone]="membership.role === 'admin' ? 'paid' : 'muted'"
                    ></app-status-pill>
                  </span>
                  <ion-icon class="chev" name="chevron-forward"></ion-icon>
                </button>
              }
            </div>
          }

          <div class="promo-card">
            <span class="promo-icon"><ion-icon name="home-outline"></ion-icon></span>
            <div>
              <h3 class="promo-title">{{ 'rooms.list.promoTitle' | translate }}</h3>
              <p class="label-muted">{{ 'rooms.list.promoMessage' | translate }}</p>
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
      <!-- <app-tab-bar [roomId]="tabRoomId()" active="home" (addExpense)="quickAdd()"></app-tab-bar> -->
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
      .invitations {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 8px;
      }
      .invite-banner {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 12px;
      }
      .invite-icon {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        background: var(--app-primary-soft);
        color: var(--app-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .invite-icon ion-icon {
        font-size: 1.4rem;
      }
      .invite-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1;
        min-width: 0;
      }
      .invite-room {
        font-weight: 700;
        font-size: 1rem;
      }
      .invite-actions {
        display: flex;
        gap: 8px;
        align-items: center;
        width: 100%;
        margin-top: 4px;
      }
      .inline-spinner {
        width: 20px;
        height: 20px;
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
      .room-info app-status-pill {
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
    IonFab,
    IonFabButton,
    IonRefresher,
    IonRefresherContent,
    IonSpinner,
    AppSkeletonComponent,
    EmptyStateComponent,
    StatusPillComponent,
    TranslatePipe,
  ],
})
export class RoomListPage {
  private readonly roomService = inject(RoomService);
  private readonly invitationService = inject(InvitationService);
  private readonly auth = inject(AuthService);
  private readonly preferences = inject(PreferencesService);
  private readonly feedback = inject(FeedbackService);
  private readonly actionSheet = inject(ActionSheetController);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);

  readonly rooms = signal<RoomMembership[]>([]);
  readonly pendingInvitations = signal<PendingInvitation[]>([]);
  readonly loading = signal(true);
  readonly lastRoomId = signal<string | null>(null);
  readonly accepting = signal<string | null>(null);
  readonly rejecting = signal<string | null>(null);

  readonly currentMonth = monthLabel(toMonthKey(new Date()), this.language.locale);
  readonly tabRoomId = computed(() => this.lastRoomId() ?? this.rooms()[0]?.room.id ?? null);

  greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) {
      return this.translate.instant('rooms.list.greetingMorning');
    }
    if (hour < 18) {
      return this.translate.instant('rooms.list.greetingAfternoon');
    }
    return this.translate.instant('rooms.list.greetingEvening');
  }

  firstName(): string {
    const user = this.auth.currentUser();
    const metadata = user?.user_metadata as { display_name?: string } | undefined;
    const name = metadata?.display_name?.trim();
    if (name) {
      return name.split(' ')[0];
    }
    const email = user?.email ?? '';
    return email ? email.split('@')[0] : this.translate.instant('rooms.list.greetingFallback');
  }

  async ionViewWillEnter(): Promise<void> {
    this.lastRoomId.set(await this.preferences.getLastRoomId());
    await this.load();
  }

  private async load(showLoader = true): Promise<void> {
    if (showLoader) {
      this.loading.set(true);
    }
    try {
      const [rooms, invitations] = await Promise.all([
        this.roomService.listMyRooms(),
        this.invitationService.listMyPendingInvitations(),
      ]);
      this.rooms.set(rooms);
      this.pendingInvitations.set(invitations);
    } catch (error) {
      await this.feedback.error(describeError(error));
    } finally {
      this.loading.set(false);
    }
  }

  async handleRefresh(event: CustomEvent): Promise<void> {
    await this.load(false);
    (event.target as HTMLIonRefresherElement | null)?.complete();
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

  async acceptInvite(inv: PendingInvitation): Promise<void> {
    this.accepting.set(inv.id);
    try {
      const roomId = await this.invitationService.acceptInvitation(inv.id);
      await this.preferences.setLastRoomId(roomId);
      await this.feedback.success(this.translate.instant('rooms.invitations.accepted'));
      await this.load(false);
    } catch (error) {
      await this.feedback.error(describeError(error));
    } finally {
      this.accepting.set(null);
    }
  }

  async rejectInvite(inv: PendingInvitation): Promise<void> {
    this.rejecting.set(inv.id);
    try {
      await this.invitationService.rejectInvitation(inv.id);
      await this.feedback.success(this.translate.instant('rooms.invitations.rejected'));
      await this.load(false);
    } catch (error) {
      await this.feedback.error(describeError(error));
    } finally {
      this.rejecting.set(null);
    }
  }

  async openMenu(): Promise<void> {
    const sheet = await this.actionSheet.create({
      buttons: [
        {
          text: this.translate.instant('nav.signOut'),
          role: 'destructive',
          icon: 'lock-closed-outline',
          handler: () => void this.signOut(),
        },
        { text: this.translate.instant('common.cancel'), role: 'cancel' },
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
