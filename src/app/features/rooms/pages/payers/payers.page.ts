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
import { Payer } from '../../../../core/models';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { PayerService } from '../../../../core/services/payer.service';
import { describeError } from '../../../../shared/utils';

@Component({
  selector: 'app-payers',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button [defaultHref]="backHref"></ion-back-button>
        </ion-buttons>
        <ion-title>Payers</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="create()"><ion-icon slot="icon-only" name="add"></ion-icon></ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      @if (loading()) {
        <div class="ion-text-center ion-padding"><ion-spinner></ion-spinner></div>
      } @else if (items().length === 0) {
        <ion-note class="ion-padding">No payers yet. Add who splits the bill (e.g. Sibling 1).</ion-note>
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
export class PayersPage {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(PayerService);
  private readonly feedback = inject(FeedbackService);

  readonly items = signal<Payer[]>([]);
  readonly loading = signal(true);

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
      this.items.set(await this.service.list(this.roomId, true));
    } catch (error) {
      await this.feedback.error(describeError(error));
    } finally {
      this.loading.set(false);
    }
  }

  async create(): Promise<void> {
    const name = await this.feedback.prompt('New payer', '', 'e.g. Sibling 1');
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

  async rename(item: Payer): Promise<void> {
    const name = await this.feedback.prompt('Rename payer', item.name);
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

  async toggle(item: Payer): Promise<void> {
    try {
      await this.service.setActive(item.id, !item.isActive);
      await this.load();
    } catch (error) {
      await this.feedback.error(describeError(error));
    }
  }
}
