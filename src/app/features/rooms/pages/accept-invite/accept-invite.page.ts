import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonNote,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { InvitationPreview, InvitationService } from '../../../../core/services/invitation.service';
import { PreferencesService } from '../../../../core/services/preferences.service';
import { describeError } from '../../../../shared/utils';

@Component({
  selector: 'app-accept-invite',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Join room</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      @if (loading()) {
        <div class="ion-text-center ion-padding"><ion-spinner></ion-spinner></div>
      } @else if (!preview()) {
        <ion-note color="danger">This invitation link is invalid.</ion-note>
        <ion-button expand="block" fill="clear" (click)="goRooms()">Go to my rooms</ion-button>
      } @else {
        <ion-text>
          <h2>{{ preview()?.roomName }}</h2>
          <p>{{ preview()?.inviter }} invited you as {{ preview()?.role }}.</p>
        </ion-text>
        @if (preview()?.expired) {
          <ion-note color="danger">This invitation has expired.</ion-note>
        } @else if (preview()?.accepted) {
          <ion-note color="warning">This invitation was already used.</ion-note>
        } @else {
          <ion-button expand="block" (click)="accept()" [disabled]="accepting()">
            @if (accepting()) {
              <ion-spinner name="dots"></ion-spinner>
            } @else {
              Accept invitation
            }
          </ion-button>
        }
        <ion-button expand="block" fill="clear" (click)="goRooms()">Maybe later</ion-button>
      }
    </ion-content>
  `,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonText, IonNote, IonButton, IonSpinner],
})
export class AcceptInvitePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly invitationService = inject(InvitationService);
  private readonly preferences = inject(PreferencesService);
  private readonly feedback = inject(FeedbackService);

  readonly preview = signal<InvitationPreview | null>(null);
  readonly loading = signal(true);
  readonly accepting = signal(false);

  private get token(): string {
    return this.route.snapshot.queryParamMap.get('token') ?? '';
  }

  async ngOnInit(): Promise<void> {
    if (!this.token) {
      this.loading.set(false);
      return;
    }
    try {
      this.preview.set(await this.invitationService.getPreview(this.token));
    } catch (error) {
      await this.feedback.error(describeError(error));
    } finally {
      this.loading.set(false);
    }
  }

  async accept(): Promise<void> {
    this.accepting.set(true);
    try {
      const roomId = await this.invitationService.accept(this.token);
      await this.preferences.setLastRoomId(roomId);
      await this.feedback.success('You joined the room');
      await this.router.navigate(['/rooms', roomId]);
    } catch (error) {
      await this.feedback.error(describeError(error));
    } finally {
      this.accepting.set(false);
    }
  }

  goRooms(): void {
    void this.router.navigateByUrl('/rooms');
  }
}
