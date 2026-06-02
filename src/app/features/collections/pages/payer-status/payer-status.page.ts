import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  IonBackButton,
  IonBadge,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { Period, Room, RoomRole } from '../../../../core/models';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { PayerStatusView, PeriodService } from '../../../../core/services/period.service';
import { RoomService } from '../../../../core/services/room.service';
import { describeError, formatRoomAmount, monthLabel, toMonthKey } from '../../../../shared/utils';

@Component({
  selector: 'app-payer-status',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button [defaultHref]="backHref"></ion-back-button>
        </ion-buttons>
        <ion-title>Collections</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      @if (loading()) {
        <div class="ion-text-center ion-padding"><ion-spinner></ion-spinner></div>
      } @else if (!period() || period()?.status === 'open') {
        <ion-note color="warning">Close the month to track who has paid.</ion-note>
      } @else {
        <ion-text><strong>{{ label }}</strong></ion-text>
        <ion-text color="primary"><h2>{{ format(period()?.systemTotal ?? 0) }}</h2></ion-text>
        <ion-note>{{ format(period()?.systemAmountPerPayer ?? 0) }} each</ion-note>

        <ion-list class="ion-margin-top">
          @for (payer of payers(); track payer.id) {
            <ion-item [button]="isAdmin()" (click)="toggle(payer)">
              <ion-label>
                <h3>{{ payer.payerName }}</h3>
                <p>{{ format(payer.amountDue) }}</p>
              </ion-label>
              <ion-badge slot="end" [color]="payer.status === 'paid' ? 'success' : 'medium'">
                {{ payer.status }}
              </ion-badge>
            </ion-item>
          }
        </ion-list>
        @if (!isAdmin()) {
          <ion-note>Only admins can mark payments.</ion-note>
        }
      }
    </ion-content>
  `,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonNote,
    IonText,
    IonSpinner,
  ],
})
export class PayerStatusPage {
  private readonly route = inject(ActivatedRoute);
  private readonly roomService = inject(RoomService);
  private readonly periodService = inject(PeriodService);
  private readonly feedback = inject(FeedbackService);

  readonly room = signal<Room | null>(null);
  readonly role = signal<RoomRole | null>(null);
  readonly period = signal<Period | null>(null);
  readonly payers = signal<PayerStatusView[]>([]);
  readonly loading = signal(true);

  readonly isAdmin = computed(() => this.role() === 'admin');

  private monthKey = toMonthKey(new Date());

  get label(): string {
    return monthLabel(this.monthKey);
  }

  private get roomId(): string {
    return this.route.snapshot.paramMap.get('roomId') ?? '';
  }

  get backHref(): string {
    return `/rooms/${this.roomId}/summary`;
  }

  async ionViewWillEnter(): Promise<void> {
    this.monthKey = this.route.snapshot.queryParamMap.get('month') ?? toMonthKey(new Date());
    await this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [room, role, period] = await Promise.all([
        this.roomService.getRoom(this.roomId),
        this.roomService.getMyRole(this.roomId),
        this.periodService.getPeriod(this.roomId, this.monthKey),
      ]);
      this.room.set(room);
      this.role.set(role);
      this.period.set(period);
      if (period) {
        this.payers.set(await this.periodService.listPayerStatus(period.id));
      } else {
        this.payers.set([]);
      }
    } catch (error) {
      await this.feedback.error(describeError(error));
    } finally {
      this.loading.set(false);
    }
  }

  format(amount: number): string {
    return formatRoomAmount(amount, this.room()?.currency ?? 'ARS');
  }

  async toggle(payer: PayerStatusView): Promise<void> {
    if (!this.isAdmin()) {
      return;
    }
    const period = this.period();
    if (!period) {
      return;
    }
    try {
      const updated = await this.periodService.markPayerPaid(
        period.id,
        payer.payerId,
        payer.status !== 'paid',
      );
      this.period.set(updated);
      this.payers.set(await this.periodService.listPayerStatus(period.id));
    } catch (error) {
      await this.feedback.error(describeError(error));
    }
  }
}
