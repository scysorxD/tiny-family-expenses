import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { InvitationStatus, RoomInvitation, RoomRole } from '../../../../core/models';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { InvitationService } from '../../../../core/services/invitation.service';
import { RoomMember, RoomService } from '../../../../core/services/room.service';
import { PageHeaderComponent, SubmitButtonComponent } from '../../../../shared/components';
import { StatusPillComponent } from '../../../../shared/ui';
import { describeError } from '../../../../shared/utils';

@Component({
  selector: 'app-room-members',
  template: `
    <app-page-header [title]="'nav.members' | translate" [defaultHref]="backHref"></app-page-header>
    <ion-content>
      @if (loading()) {
        <div class="center-pad"><ion-spinner></ion-spinner></div>
      } @else {
        <div class="page-pad">
          <h2 class="section-title">{{ 'rooms.members.inviteSomeone' | translate }}</h2>
          <div class="form-stack">
            <ion-input
              fill="outline"
              [label]="'rooms.members.email' | translate"
              labelPlacement="stacked"
              type="email"
              [(ngModel)]="inviteEmail"
            ></ion-input>
            <ion-segment [(ngModel)]="inviteRole">
              <ion-segment-button value="guest"><ion-label>{{ 'role.guest' | translate }}</ion-label></ion-segment-button>
              <ion-segment-button value="admin"><ion-label>{{ 'role.admin' | translate }}</ion-label></ion-segment-button>
            </ion-segment>
            <app-submit-button
              [label]="'rooms.members.sendInvitation' | translate"
              [loading]="sending()"
              (action)="sendInvitation()"
            ></app-submit-button>
          </div>

          <h2 class="section-title">{{ 'rooms.members.currentMembers' | translate }}</h2>
          <div class="list-card">
            <ion-list>
              @for (member of members(); track member.id) {
                <ion-item>
                  <span slot="start" class="lead-icon"><ion-icon name="person-outline"></ion-icon></span>
                  <ion-label>
                    <h3 class="row-title">{{ member.displayName }}</h3>
                    <p class="label-muted">{{ member.email }}</p>
                  </ion-label>
                  <app-status-pill
                    slot="end"
                    class="member-role"
                    [label]="'role.' + member.role | translate"
                    [tone]="member.role === 'admin' ? 'paid' : 'muted'"
                  ></app-status-pill>
                  <ion-button fill="clear" color="danger" slot="end" (click)="remove(member)">
                    <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
                  </ion-button>
                </ion-item>
              }
            </ion-list>
          </div>

          @if (invitations().length > 0) {
            <h2 class="section-title">{{ 'rooms.members.pendingInvitations' | translate }}</h2>
            <div class="list-card">
              <ion-list>
                @for (inv of invitations(); track inv.id) {
                  <ion-item>
                    <span slot="start" class="lead-icon"><ion-icon name="mail-outline"></ion-icon></span>
                    <ion-label>
                      <h3 class="row-title">{{ inv.email }}</h3>
                      <p class="label-muted">{{ 'role.' + inv.role | translate }}</p>
                    </ion-label>
                    <app-status-pill
                      slot="end"
                      [label]="'rooms.invitations.status.' + inv.status | translate"
                      [tone]="inv.status === 'pending' ? 'muted' : inv.status === 'accepted' ? 'paid' : 'danger'"
                    ></app-status-pill>
                    @if (inv.status === 'pending') {
                      <ion-button fill="clear" color="danger" slot="end" (click)="cancelInvitation(inv)">
                        <ion-icon slot="icon-only" name="close-outline"></ion-icon>
                      </ion-button>
                    }
                  </ion-item>
                }
              </ion-list>
            </div>
          }
        </div>
      }
    </ion-content>
  `,
  styles: [
    `
      .form-stack {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .member-role {
        text-transform: capitalize;
      }
    `,
  ],
  imports: [
    FormsModule,
    IonButton,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonSegment,
    IonSegmentButton,
    IonIcon,
    IonSpinner,
    PageHeaderComponent,
    SubmitButtonComponent,
    StatusPillComponent,
    TranslatePipe,
  ],
})
export class RoomMembersPage {
  private readonly route = inject(ActivatedRoute);
  private readonly roomService = inject(RoomService);
  private readonly invitationService = inject(InvitationService);
  private readonly feedback = inject(FeedbackService);
  private readonly translate = inject(TranslateService);

  readonly members = signal<RoomMember[]>([]);
  readonly invitations = signal<RoomInvitation[]>([]);
  readonly loading = signal(true);
  readonly sending = signal(false);

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
      const [members, invitations] = await Promise.all([
        this.roomService.listMembers(this.roomId),
        this.invitationService.listRoomInvitations(this.roomId),
      ]);
      this.members.set(members);
      this.invitations.set(invitations);
    } catch (error) {
      await this.feedback.error(describeError(error));
    } finally {
      this.loading.set(false);
    }
  }

  async sendInvitation(): Promise<void> {
    const email = this.inviteEmail.trim();
    if (!email) {
      await this.feedback.error(this.translate.instant('rooms.members.enterEmail'));
      return;
    }

    this.sending.set(true);
    try {
      await this.invitationService.createInvitation(this.roomId, email, this.inviteRole);
      this.inviteEmail = '';
      await this.feedback.success(this.translate.instant('rooms.members.invitationSent'));
      await this.load();
    } catch (error) {
      await this.feedback.error(describeError(error));
    } finally {
      this.sending.set(false);
    }
  }

  async cancelInvitation(inv: RoomInvitation): Promise<void> {
    try {
      await this.invitationService.deleteInvitation(inv.id);
      await this.feedback.success(this.translate.instant('rooms.members.invitationCancelled'));
      await this.load();
    } catch (error) {
      await this.feedback.error(describeError(error));
    }
  }

  async remove(member: RoomMember): Promise<void> {
    const confirmed = await this.feedback.confirm(
      this.translate.instant('rooms.members.removeTitle'),
      this.translate.instant('rooms.members.removeMessage', { name: member.displayName }),
      this.translate.instant('rooms.members.removeButton'),
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
