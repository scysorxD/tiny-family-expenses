import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonSpinner,
  IonToggle,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { RoomService } from '../../../../core/services/room.service';
import {
  CurrencySelectComponent,
  PageHeaderComponent,
  SubmitButtonComponent,
} from '../../../../shared/components';
import { describeError } from '../../../../shared/utils';

@Component({
  selector: 'app-room-settings',
  template: `
    <app-page-header [title]="'rooms.settings.title' | translate" [defaultHref]="backHref"></app-page-header>
    <ion-content>
      @if (loading()) {
        <div class="center-pad"><ion-spinner></ion-spinner></div>
      } @else if (!isAdmin()) {
        <div class="page-pad">
          <div class="app-card text-muted">{{ 'rooms.settings.adminOnly' | translate }}</div>
        </div>
      } @else {
        <div class="page-pad">
          <h2 class="section-title">{{ 'rooms.settings.general' | translate }}</h2>
          <div class="form-stack">
            <ion-input
              fill="outline"
              [label]="'rooms.create.name' | translate"
              labelPlacement="stacked"
              [(ngModel)]="name"
            ></ion-input>
            <app-currency-select [label]="'common.currency' | translate" [(ngModel)]="currency"></app-currency-select>
            <div class="app-card toggle-card">
              <ion-toggle [(ngModel)]="includeDetail">{{ 'rooms.settings.includeDetail' | translate }}</ion-toggle>
            </div>
            <app-submit-button
              [label]="'rooms.settings.save' | translate"
              [loading]="saving()"
              (action)="save()"
            ></app-submit-button>
          </div>

          <h2 class="section-title">{{ 'rooms.settings.people' | translate }}</h2>
          <div class="list-card">
            <ion-list>
              <ion-item button detail="true" (click)="go('beneficiaries')">
                <span slot="start" class="lead-icon"><ion-icon name="person-outline"></ion-icon></span>
                <ion-label>{{ 'nav.beneficiaries' | translate }}</ion-label>
              </ion-item>
              <ion-item button detail="true" (click)="go('payers')">
                <span slot="start" class="lead-icon"><ion-icon name="wallet-outline"></ion-icon></span>
                <ion-label>{{ 'nav.payers' | translate }}</ion-label>
              </ion-item>
              <ion-item button detail="true" (click)="go('members')">
                <span slot="start" class="lead-icon"><ion-icon name="people-outline"></ion-icon></span>
                <ion-label>{{ 'rooms.settings.membersInvites' | translate }}</ion-label>
              </ion-item>
            </ion-list>
          </div>

          <div class="danger-zone">
            <h2 class="section-title">{{ 'rooms.settings.dangerZone' | translate }}</h2>
            <ion-button expand="block" color="danger" fill="outline" (click)="archive()">
              {{ 'rooms.settings.archive' | translate }}
            </ion-button>
            <p class="label-muted hint">{{ 'rooms.settings.archiveHint' | translate }}</p>
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
      .toggle-card {
        display: flex;
      }
      .hint {
        margin: 10px 2px 0;
        font-size: 0.85rem;
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
    IonToggle,
    IonIcon,
    IonSpinner,
    PageHeaderComponent,
    CurrencySelectComponent,
    SubmitButtonComponent,
    TranslatePipe,
  ],
})
export class RoomSettingsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly roomService = inject(RoomService);
  private readonly feedback = inject(FeedbackService);
  private readonly translate = inject(TranslateService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly isAdmin = signal(false);

  name = '';
  currency = 'ARS';
  includeDetail = true;

  private get roomId(): string {
    return this.route.snapshot.paramMap.get('roomId') ?? '';
  }

  get backHref(): string {
    return `/rooms/${this.roomId}`;
  }

  async ionViewWillEnter(): Promise<void> {
    this.loading.set(true);
    try {
      const [room, role] = await Promise.all([
        this.roomService.getRoom(this.roomId),
        this.roomService.getMyRole(this.roomId),
      ]);
      this.isAdmin.set(role === 'admin');
      if (room) {
        this.name = room.name;
        this.currency = room.currency;
        this.includeDetail = room.includeDetailInMessage;
      }
    } catch (error) {
      await this.feedback.error(describeError(error));
    } finally {
      this.loading.set(false);
    }
  }

  async save(): Promise<void> {
    this.saving.set(true);
    try {
      await this.roomService.updateRoom(this.roomId, {
        name: this.name.trim(),
        currency: this.currency,
        includeDetailInMessage: this.includeDetail,
      });
      await this.feedback.success(this.translate.instant('rooms.settings.saved'));
    } catch (error) {
      await this.feedback.error(describeError(error));
    } finally {
      this.saving.set(false);
    }
  }

  async archive(): Promise<void> {
    const confirmed = await this.feedback.confirm(
      this.translate.instant('rooms.settings.archive'),
      this.translate.instant('rooms.settings.archiveConfirmMessage'),
      this.translate.instant('rooms.settings.archiveConfirmButton'),
    );
    if (!confirmed) {
      return;
    }
    try {
      await this.roomService.archiveRoom(this.roomId);
      await this.feedback.success(this.translate.instant('rooms.settings.archived'));
      await this.router.navigateByUrl('/rooms');
    } catch (error) {
      await this.feedback.error(describeError(error));
    }
  }

  go(section: string): void {
    void this.router.navigate(['/rooms', this.roomId, section]);
  }
}
