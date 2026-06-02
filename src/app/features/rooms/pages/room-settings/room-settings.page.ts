import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonBackButton,
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
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { RoomService } from '../../../../core/services/room.service';
import { describeError } from '../../../../shared/utils';

@Component({
  selector: 'app-room-settings',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button [defaultHref]="backHref"></ion-back-button>
        </ion-buttons>
        <ion-title>Room settings</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      @if (loading()) {
        <div class="ion-text-center ion-padding"><ion-spinner></ion-spinner></div>
      } @else if (!isAdmin()) {
        <ion-note color="danger" class="ion-padding">
          Only admins can change room settings.
        </ion-note>
      } @else {
        <ion-list>
          <ion-item>
            <ion-input label="Room name" labelPlacement="stacked" [(ngModel)]="name"></ion-input>
          </ion-item>
          <ion-item>
            <ion-select label="Currency" labelPlacement="stacked" [(ngModel)]="currency">
              <ion-select-option value="ARS">ARS</ion-select-option>
              <ion-select-option value="USD">USD</ion-select-option>
              <ion-select-option value="EUR">EUR</ion-select-option>
              <ion-select-option value="BRL">BRL</ion-select-option>
              <ion-select-option value="CLP">CLP</ion-select-option>
              <ion-select-option value="MXN">MXN</ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item>
            <ion-toggle [(ngModel)]="includeDetail">Include detail in collection message</ion-toggle>
          </ion-item>
        </ion-list>
        <ion-button class="ion-margin-top" expand="block" (click)="save()" [disabled]="saving()">
          @if (saving()) {
            <ion-spinner name="dots"></ion-spinner>
          } @else {
            Save settings
          }
        </ion-button>

        <ion-list class="ion-margin-top">
          <ion-item button (click)="go('beneficiaries')">
            <ion-icon slot="start" name="people-outline"></ion-icon>
            <ion-label>Beneficiaries</ion-label>
          </ion-item>
          <ion-item button (click)="go('payers')">
            <ion-icon slot="start" name="cash-outline"></ion-icon>
            <ion-label>Payers</ion-label>
          </ion-item>
          <ion-item button (click)="go('members')">
            <ion-icon slot="start" name="people-outline"></ion-icon>
            <ion-label>Members &amp; invitations</ion-label>
          </ion-item>
        </ion-list>

        <ion-button
          class="ion-margin-top"
          expand="block"
          color="danger"
          fill="outline"
          (click)="archive()"
        >
          Archive room
        </ion-button>
        <ion-text color="medium">
          <p class="hint">Archiving hides the room and blocks new changes.</p>
        </ion-text>
      }
    </ion-content>
  `,
  styles: [`.hint { font-size: 0.85rem; }`],
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
    IonSelect,
    IonSelectOption,
    IonToggle,
    IonNote,
    IonText,
    IonIcon,
    IonSpinner,
  ],
})
export class RoomSettingsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly roomService = inject(RoomService);
  private readonly feedback = inject(FeedbackService);

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
      await this.feedback.success('Settings saved');
    } catch (error) {
      await this.feedback.error(describeError(error));
    } finally {
      this.saving.set(false);
    }
  }

  async archive(): Promise<void> {
    const confirmed = await this.feedback.confirm(
      'Archive room',
      'Archive this room? It will be hidden and locked for changes.',
      'Archive',
    );
    if (!confirmed) {
      return;
    }
    try {
      await this.roomService.archiveRoom(this.roomId);
      await this.feedback.success('Room archived');
      await this.router.navigateByUrl('/rooms');
    } catch (error) {
      await this.feedback.error(describeError(error));
    }
  }

  go(section: string): void {
    void this.router.navigate(['/rooms', this.roomId, section]);
  }
}
