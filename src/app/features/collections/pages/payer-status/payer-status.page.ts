import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ModalController } from '@ionic/angular/standalone';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { Period, Room, RoomRole } from '../../../../core/models';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { PayerStatusView, PeriodService } from '../../../../core/services/period.service';
import { RoomService } from '../../../../core/services/room.service';
import { AddExpenseModalComponent } from '../../../expenses/components/add-expense-modal/add-expense-modal.component';
import { AppTabBarComponent, StatusPillComponent } from '../../../../shared/ui';
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
    <ion-content>
      @if (loading()) {
        <div class="center-pad"><ion-spinner></ion-spinner></div>
      } @else if (!period() || period()?.status === 'open') {
        <div class="page-pad fab-safe">
          <div class="app-card empty-card">
            <ion-icon name="lock-closed-outline"></ion-icon>
            <span>Close the month to track who has paid.</span>
          </div>
        </div>
      } @else {
        <div class="page-pad fab-safe">
          <div class="hero-card">
            <p class="label-muted">{{ label }}</p>
            <div class="amount-hero">{{ format(period()?.systemTotal ?? 0) }}</div>
            <p class="label-muted">
              {{ format(period()?.systemAmountPerPayer ?? 0) }} each · {{ period()?.payerCount }} payers
            </p>
          </div>

          <h2 class="section-title">Payers</h2>
          <div class="list-card">
            <ion-list>
              @for (payer of payers(); track payer.id) {
                <ion-item [button]="isAdmin()" detail="false" (click)="toggle(payer)">
                  <span slot="start" class="payer-icon"><ion-icon name="person-outline"></ion-icon></span>
                  <ion-label>
                    <h3 class="row-title">{{ payer.payerName }}</h3>
                    <p class="label-muted">{{ format(payer.amountDue) }}</p>
                  </ion-label>
                  <app-status-pill
                    slot="end"
                    [label]="payer.status"
                    [tone]="payer.status === 'paid' ? 'open' : 'muted'"
                    [icon]="payer.status === 'paid' ? 'checkmark-circle' : null"
                  ></app-status-pill>
                </ion-item>
              }
            </ion-list>
          </div>
          @if (!isAdmin()) {
            <p class="label-muted ion-margin-top">Only admins can mark payments.</p>
          }
        </div>
      }
    </ion-content>
    <app-tab-bar [roomId]="roomId" active="collections" (addExpense)="addExpense()"></app-tab-bar>
  `,
  styles: [
    `
      .empty-card {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .empty-card ion-icon {
        font-size: 1.4rem;
        color: var(--app-warning);
      }
      .payer-icon {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: var(--app-primary-soft);
        color: var(--app-primary);
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .payer-icon ion-icon {
        font-size: 1.2rem;
      }
      .row-title {
        font-weight: 700;
        margin: 0;
      }
      .app-status-pill,
      app-status-pill .status-pill {
        text-transform: capitalize;
      }
    `,
  ],
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
    IonIcon,
    IonSpinner,
    AppTabBarComponent,
    StatusPillComponent,
  ],
})
export class PayerStatusPage {
  private readonly route = inject(ActivatedRoute);
  private readonly roomService = inject(RoomService);
  private readonly periodService = inject(PeriodService);
  private readonly feedback = inject(FeedbackService);
  private readonly modalController = inject(ModalController);

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

  get roomId(): string {
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

  async addExpense(): Promise<void> {
    const modal = await this.modalController.create({
      component: AddExpenseModalComponent,
      componentProps: {
        roomId: this.roomId,
        isAdmin: this.isAdmin(),
        currency: this.room()?.currency ?? 'ARS',
      },
    });
    await modal.present();
    await modal.onDidDismiss();
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
