import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
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
import { Beneficiary } from '../../../../core/models';
import { BeneficiaryService } from '../../../../core/services/beneficiary.service';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { RoomService } from '../../../../core/services/room.service';
import { describeError } from '../../../../shared/utils';

@Component({
  selector: 'app-beneficiaries',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button [defaultHref]="backHref"></ion-back-button>
        </ion-buttons>
        <ion-title>Beneficiaries</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="create()" [disabled]="!isAdmin()">
            <ion-icon slot="icon-only" name="add"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      @if (loading()) {
        <div class="ion-text-center ion-padding"><ion-spinner></ion-spinner></div>
      } @else if (!isAdmin()) {
        <ion-note color="danger" class="ion-padding">
          Only admins can manage beneficiaries.
        </ion-note>
      } @else if (items().length === 0) {
        <ion-note class="ion-padding">No beneficiaries yet. Add who expenses are for (e.g. Mom, Dad).</ion-note>
      } @else {
        <ion-list>
          @for (item of items(); track item.id) {
            <ion-item>
              <ion-label [class.inactive]="!item.isActive">{{ item.name }}</ion-label>
              @if (!item.isActive) {
                <ion-badge slot="end" color="medium">inactive</ion-badge>
              }
              <ion-button fill="clear" slot="end" (click)="rename(item)">
                <ion-icon slot="icon-only" name="create-outline"></ion-icon>
              </ion-button>
              <ion-button fill="clear" slot="end" (click)="toggle(item)">
                {{ item.isActive ? 'Deactivate' : 'Activate' }}
              </ion-button>
              <ion-button fill="clear" color="danger" slot="end" (click)="remove(item)">
                <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
              </ion-button>
            </ion-item>
          }
        </ion-list>
      }
    </ion-content>
  `,
  styles: [`.inactive { text-decoration: line-through; opacity: 0.6; }`],
  imports: [
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
    IonBadge,
    IonNote,
    IonIcon,
    IonSpinner,
  ],
})
export class BeneficiariesPage {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(BeneficiaryService);
  private readonly roomService = inject(RoomService);
  private readonly feedback = inject(FeedbackService);

  readonly items = signal<Beneficiary[]>([]);
  readonly loading = signal(true);
  readonly isAdmin = signal(false);

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
      const [role, beneficiaries] = await Promise.all([
        this.roomService.getMyRole(this.roomId),
        this.service.list(this.roomId, true),
      ]);
      this.isAdmin.set(role === 'admin');
      this.items.set(beneficiaries);
    } catch (error) {
      await this.feedback.error(describeError(error));
    } finally {
      this.loading.set(false);
    }
  }

  async create(): Promise<void> {
    const name = await this.feedback.prompt('New beneficiary', '', 'e.g. Mom');
    if (!name) {
      return;
    }
    try {
      await this.service.create(this.roomId, name);
      await this.load();
    } catch (error) {
      await this.feedback.error(describeError(error));
    }
  }

  async rename(item: Beneficiary): Promise<void> {
    const name = await this.feedback.prompt('Rename beneficiary', item.name);
    if (!name || name === item.name) {
      return;
    }
    try {
      await this.service.rename(item.id, name);
      await this.load();
    } catch (error) {
      await this.feedback.error(describeError(error));
    }
  }

  async toggle(item: Beneficiary): Promise<void> {
    try {
      await this.service.setActive(item.id, !item.isActive);
      await this.load();
    } catch (error) {
      await this.feedback.error(describeError(error));
    }
  }

  async remove(item: Beneficiary): Promise<void> {
    const confirmed = await this.feedback.confirm(
      'Delete beneficiary',
      `Delete "${item.name}"? Beneficiaries with expenses cannot be deleted.`,
      'Delete',
    );
    if (!confirmed) {
      return;
    }

    try {
      await this.service.delete(item.id);
      await this.feedback.success('Beneficiary deleted');
      await this.load();
    } catch (error) {
      await this.feedback.error(describeError(error));
    }
  }
}
