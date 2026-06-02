import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { RoomRole } from '../../../../core/models';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { InvitationService } from '../../../../core/services/invitation.service';
import { RoomMember, RoomService } from '../../../../core/services/room.service';
import { ShareService } from '../../../../core/services/share.service';
import { describeError } from '../../../../shared/utils';

@Component({
  selector: 'app-room-members',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button [defaultHref]="backHref"></ion-back-button>
        </ion-buttons>
        <ion-title>Members</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      @if (loading()) {
        <div class="ion-text-center ion-padding"><ion-spinner></ion-spinner></div>
      } @else {
        <div class="invite">
          <ion-text><h3>Invite someone</h3></ion-text>
          <ion-item>
            <ion-input
              label="Email"
              labelPlacement="stacked"
              type="email"
              [(ngModel)]="inviteEmail"
            ></ion-input>
          </ion-item>
          <ion-segment [(ngModel)]="inviteRole">
            <ion-segment-button value="guest"><ion-label>Guest</ion-label></ion-segment-button>
            <ion-segment-button value="admin"><ion-label>Admin</ion-label></ion-segment-button>
          </ion-segment>
          <ion-button expand="block" class="ion-margin-top" (click)="generate()" [disabled]="generating()">
            @if (generating()) {
              <ion-spinner name="dots"></ion-spinner>
            } @else {
              Generate invite link
            }
          </ion-button>

          @if (link()) {
            <ion-item>
              <ion-label class="link">{{ link() }}</ion-label>
            </ion-item>
            <div class="link-actions">
              <ion-button fill="outline" (click)="copy()">
                <ion-icon slot="start" name="copy-outline"></ion-icon> Copy
              </ion-button>
              <ion-button fill="outline" (click)="shareLink()">
                <ion-icon slot="start" name="share-social-outline"></ion-icon> Share
              </ion-button>
            </div>
            <ion-note>Share this link; it expires in 7 days.</ion-note>
          }
        </div>

        <ion-text><h3 class="ion-margin-top">Current members</h3></ion-text>
        <ion-list>
          @for (member of members(); track member.id) {
            <ion-item>
              <ion-label>
                <h3>{{ member.displayName }}</h3>
                <p>{{ member.email }}</p>
              </ion-label>
              <ion-badge slot="end" [color]="member.role === 'admin' ? 'primary' : 'medium'">
                {{ member.role }}
              </ion-badge>
              <ion-button fill="clear" color="danger" slot="end" (click)="remove(member)">
                <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
              </ion-button>
            </ion-item>
          }
        </ion-list>
      }
    </ion-content>
  `,
  styles: [
    `
      .link {
        font-size: 0.8rem;
        word-break: break-all;
        white-space: normal;
      }
      .link-actions {
        display: flex;
        gap: 8px;
        margin: 8px 0;
      }
    `,
  ],
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonBackButton,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonSegment,
    IonSegmentButton,
    IonBadge,
    IonNote,
    IonText,
    IonIcon,
    IonSpinner,
  ],
})
export class RoomMembersPage {
  private readonly route = inject(ActivatedRoute);
  private readonly roomService = inject(RoomService);
  private readonly invitationService = inject(InvitationService);
  private readonly shareService = inject(ShareService);
  private readonly feedback = inject(FeedbackService);

  readonly members = signal<RoomMember[]>([]);
  readonly loading = signal(true);
  readonly generating = signal(false);
  readonly link = signal<string | null>(null);

  inviteEmail = '';
  inviteRole: RoomRole = 'guest';

  private get roomId(): string {
    return this.route.snapshot.paramMap.get('roomId') ?? '';
  }

  get backHref(): string {
    return `/rooms/${this.roomId}/settings`;
  }

  async ionViewWillEnter(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.members.set(await this.roomService.listMembers(this.roomId));
    } catch (error) {
      await this.feedback.error(describeError(error));
    } finally {
      this.loading.set(false);
    }
  }

  async generate(): Promise<void> {
    const email = this.inviteEmail.trim();
    if (!email) {
      await this.feedback.error('Enter an email for the invitation record.');
      return;
    }

    this.generating.set(true);
    try {
      const token = await this.invitationService.createInvitation(this.roomId, email, this.inviteRole);
      this.link.set(this.invitationService.buildInviteLink(token));
      this.inviteEmail = '';
    } catch (error) {
      await this.feedback.error(describeError(error));
    } finally {
      this.generating.set(false);
    }
  }

  async copy(): Promise<void> {
    const link = this.link();
    if (!link) {
      return;
    }
    await this.shareService.copy(link);
    await this.feedback.success('Link copied');
  }

  async shareLink(): Promise<void> {
    const link = this.link();
    if (!link) {
      return;
    }
    await this.shareService.share(link, 'Room invitation');
  }

  async remove(member: RoomMember): Promise<void> {
    const confirmed = await this.feedback.confirm(
      'Remove member',
      `Remove ${member.displayName} from this room?`,
      'Remove',
    );
    if (!confirmed) {
      return;
    }
    try {
      await this.roomService.removeMember(member.id);
      await this.load();
    } catch (error) {
      await this.feedback.error(describeError(error));
    }
  }
}
