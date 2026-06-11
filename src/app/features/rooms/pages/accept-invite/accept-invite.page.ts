import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { InvitationPreview, InvitationService } from '../../../../core/services/invitation.service';
import { PreferencesService } from '../../../../core/services/preferences.service';
import { PageHeaderComponent } from '../../../../shared/components';
import { describeError } from '../../../../shared/utils';

@Component({
  selector: 'app-accept-invite',
  template: `
    <app-page-header [title]="'rooms.invite.title' | translate"></app-page-header>
    <ion-content>
      <div class="page-pad">
        @if (loading()) {
          <div class="center-pad"><ion-spinner></ion-spinner></div>
        } @else if (!preview()) {
          <div class="app-card text-muted">{{ 'rooms.invite.invalid' | translate }}</div>
          <ion-button class="spaced" expand="block" fill="clear" (click)="goRooms()">{{ 'rooms.invite.goToRooms' | translate }}</ion-button>
        } @else {
          <div class="app-card invite-card">
            <span class="invite-icon"><ion-icon name="home-outline"></ion-icon></span>
            <h2 class="invite-title">{{ preview()?.roomName }}</h2>
            <p class="label-muted">
              {{
                'rooms.invite.invitedAs'
                  | translate: { inviter: preview()?.inviter, role: 'role.' + (preview()?.role ?? 'guest') | translate }
              }}
            </p>

            @if (preview()?.expired) {
              <span class="status-pill is-danger expiry">{{ 'rooms.invite.expired' | translate }}</span>
            } @else if (preview()?.accepted) {
              <span class="status-pill is-warning expiry">{{ 'rooms.invite.alreadyUsed' | translate }}</span>
            }
          </div>

          @if (!preview()?.expired && !preview()?.accepted) {
            <ion-button class="spaced" expand="block" (click)="accept()" [disabled]="accepting()">
              @if (accepting()) {
                <ion-spinner name="dots"></ion-spinner>
              } @else {
                {{ 'rooms.invite.accept' | translate }}
              }
            </ion-button>
          }
          <ion-button expand="block" fill="clear" (click)="goRooms()">{{ 'rooms.invite.maybeLater' | translate }}</ion-button>
        }
      </div>
    </ion-content>
  `,
  styles: [
    `
      .invite-card {
        text-align: center;
      }
      .invite-icon {
        width: 56px;
        height: 56px;
        border-radius: 16px;
        background: var(--app-primary-soft);
        color: var(--app-primary);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 12px;
      }
      .invite-icon ion-icon {
        font-size: 1.8rem;
      }
      .invite-title {
        font-size: 1.3rem;
        font-weight: 800;
        margin: 0 0 4px;
      }
      .expiry {
        margin-top: 12px;
      }
      .spaced {
        margin-top: 18px;
      }
    `,
  ],
  imports: [IonContent, IonButton, IonIcon, IonSpinner, PageHeaderComponent, TranslatePipe],
})
export class AcceptInvitePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly invitationService = inject(InvitationService);
  private readonly preferences = inject(PreferencesService);
  private readonly feedback = inject(FeedbackService);
  private readonly translate = inject(TranslateService);

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
      await this.feedback.success(this.translate.instant('rooms.invite.joined'));
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
