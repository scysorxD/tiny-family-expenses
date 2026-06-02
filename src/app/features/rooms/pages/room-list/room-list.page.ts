import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { AuthService } from '../../../../core/auth/auth.service';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { PreferencesService } from '../../../../core/services/preferences.service';
import { RoomService } from '../../../../core/services/room.service';
import { RoomMembership } from '../../../../data/remote/supabase.mappers';
import { describeError } from '../../../../shared/utils';

@Component({
  selector: 'app-room-list',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>My rooms</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="signOut()">Sign out</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      @if (loading()) {
        <div class="ion-text-center ion-padding">
          <ion-spinner></ion-spinner>
        </div>
      } @else if (rooms().length === 0) {
        <ion-note class="ion-padding">You have no rooms yet. Create your first one.</ion-note>
      } @else {
        <ion-list>
          @for (membership of rooms(); track membership.room.id) {
            <ion-item button (click)="open(membership.room.id)">
              <ion-label>
                <h2>{{ membership.room.name }}</h2>
                <p>{{ membership.room.currency }}</p>
              </ion-label>
              <ion-badge slot="end" [color]="membership.role === 'admin' ? 'primary' : 'medium'">
                {{ membership.role }}
              </ion-badge>
            </ion-item>
          }
        </ion-list>
      }
      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button (click)="create()">
          <ion-icon name="add"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  `,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonNote,
    IonSpinner,
    IonFab,
    IonFabButton,
    IonIcon,
  ],
})
export class RoomListPage {
  private readonly roomService = inject(RoomService);
  private readonly auth = inject(AuthService);
  private readonly preferences = inject(PreferencesService);
  private readonly feedback = inject(FeedbackService);
  private readonly router = inject(Router);

  readonly rooms = signal<RoomMembership[]>([]);
  readonly loading = signal(true);

  async ionViewWillEnter(): Promise<void> {
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

  async signOut(): Promise<void> {
    await this.preferences.clearLastRoomId();
    await this.auth.signOut();
    await this.router.navigateByUrl('/login');
  }
}
