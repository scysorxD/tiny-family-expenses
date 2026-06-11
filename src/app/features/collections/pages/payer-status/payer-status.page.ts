import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ModalController } from '@ionic/angular/standalone';
import {
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Period, Room, RoomRole } from '../../../../core/models';
import { LanguageService } from '../../../../core/i18n';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { PayerStatusView, PeriodService } from '../../../../core/services/period.service';
import { RealtimeService } from '../../../../core/services/realtime.service';
import { RoomService } from '../../../../core/services/room.service';
import { AddExpenseModalComponent } from '../../../expenses/components/add-expense-modal/add-expense-modal.component';
import { MonthNavComponent, PageHeaderComponent } from '../../../../shared/components';
import {
  AppSkeletonComponent,
  AppTabBarComponent,
  EmptyStateComponent,
  StatusPillComponent,
} from '../../../../shared/ui';
import {
  describeError,
  formatRoomAmount,
  monthLabel,
  shiftMonthKey,
  toMonthKey,
} from '../../../../shared/utils';

@Component({
  selector: 'app-payer-status',
  template: `
    <app-page-header [title]="'tabs.collections' | translate" [defaultHref]="backHref"></app-page-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($any($event))">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      @if (loading()) {
        <app-skeleton variant="summary"></app-skeleton>
      } @else {
        <div class="page-pad fab-safe">
          <app-month-nav [label]="label" (shift)="shift($event)"></app-month-nav>

          @if (!period() || period()?.status === 'open') {
            <app-empty-state
              icon="lock-closed-outline"
              [title]="'collections.payerStatus.monthOpenTitle' | translate"
              [message]="'collections.payerStatus.monthOpenMessage' | translate"
            ></app-empty-state>
          } @else {
            <div class="hero-card">
              <p class="label-muted">{{ label }}</p>
              <div class="amount-hero">{{ format(period()?.systemTotal ?? 0) }}</div>
              <p class="label-muted">
                {{
                  'collections.payerStatus.eachLine'
                    | translate: { each: format(period()?.systemAmountPerPayer ?? 0), count: period()?.payerCount }
                }}
              </p>
            </div>

            <h2 class="section-title">{{ 'nav.payers' | translate }}</h2>
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
                      [label]="'collections.payerStatus.status.' + payer.status | translate"
                      [tone]="payer.status === 'paid' ? 'open' : 'muted'"
                      [icon]="payer.status === 'paid' ? 'checkmark-circle' : null"
                    ></app-status-pill>
                  </ion-item>
                }
              </ion-list>
            </div>
            @if (!isAdmin()) {
              <p class="label-muted ion-margin-top">{{ 'collections.payerStatus.adminOnly' | translate }}</p>
            }
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
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
    PageHeaderComponent,
    MonthNavComponent,
    AppSkeletonComponent,
    AppTabBarComponent,
    EmptyStateComponent,
    StatusPillComponent,
    TranslatePipe,
  ],
})
export class PayerStatusPage {
  private readonly route = inject(ActivatedRoute);
  private readonly roomService = inject(RoomService);
  private readonly periodService = inject(PeriodService);
  private readonly feedback = inject(FeedbackService);
  private readonly modalController = inject(ModalController);
  private readonly realtime = inject(RealtimeService);
  private readonly language = inject(LanguageService);

  private realtimeOff?: () => void;

  readonly room = signal<Room | null>(null);
  readonly role = signal<RoomRole | null>(null);
  readonly period = signal<Period | null>(null);
  readonly payers = signal<PayerStatusView[]>([]);
  readonly loading = signal(true);

  readonly isAdmin = computed(() => this.role() === 'admin');

  private monthKey = toMonthKey(new Date());

  get label(): string {
    return monthLabel(this.monthKey, this.language.locale);
  }

  get roomId(): string {
    return this.route.snapshot.paramMap.get('roomId') ?? '';
  }

  get backHref(): string {
    return `/rooms/${this.roomId}/summary?month=${this.monthKey}`;
  }

  async ionViewWillEnter(): Promise<void> {
    this.monthKey = this.route.snapshot.queryParamMap.get('month') ?? toMonthKey(new Date());
    await this.load();
    this.realtimeOff = this.realtime.onRoomChanges(this.roomId, ['periods'], () =>
      void this.load(false),
    );
  }

  ionViewWillLeave(): void {
    this.realtimeOff?.();
    this.realtimeOff = undefined;
  }

  async handleRefresh(event: CustomEvent): Promise<void> {
    await this.load(false);
    (event.target as HTMLIonRefresherElement | null)?.complete();
  }

  private async load(showLoader = true): Promise<void> {
    if (showLoader) {
      this.loading.set(true);
    }
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

  async shift(delta: number): Promise<void> {
    this.monthKey = shiftMonthKey(this.monthKey, delta);
    await this.load();
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
