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
import { RoomRole } from '../../../../core/models';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { InvitationService } from '../../../../core/services/invitation.service';
import { RoomMember, RoomService } from '../../../../core/services/room.service';
import { ShareService } from '../../../../core/services/share.service';
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
              [label]="'rooms.members.generateLink' | translate"
              [loading]="generating()"
              (action)="generate()"
            ></app-submit-button>
          </div>

          @if (link()) {
            <div class="app-card link-card">
              <p class="link">{{ link() }}</p>
              <div class="link-actions">
                <ion-button fill="outline" size="small" (click)="copy()">
                  <ion-icon slot="start" name="copy-outline"></ion-icon> {{ 'common.copy' | translate }}
                </ion-button>
                <ion-button fill="outline" size="small" (click)="shareLink()">
                  <ion-icon slot="start" name="share-social-outline"></ion-icon> {{ 'common.share' | translate }}
                </ion-button>
              </div>
              <p class="label-muted">{{ 'rooms.members.linkHint' | translate }}</p>
            </div>
          }

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
      .link-card {
        margin-top: 16px;
      }
      .link {
        font-size: 0.8rem;
        word-break: break-all;
        white-space: normal;
        margin: 0 0 10px;
      }
      .link-actions {
        display: flex;
        gap: 8px;
        margin-bottom: 8px;
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
  private readonly shareService = inject(ShareService);
  private readonly feedback = inject(FeedbackService);
  private readonly translate = inject(TranslateService);

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
      await this.feedback.error(this.translate.instant('rooms.members.enterEmail'));
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
    await this.feedback.success(this.translate.instant('rooms.members.linkCopied'));
  }

  async shareLink(): Promise<void> {
    const link = this.link();
    if (!link) {
      return;
    }
    await this.shareService.share(link, this.translate.instant('rooms.members.shareTitle'));
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
