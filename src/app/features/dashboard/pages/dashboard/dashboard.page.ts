import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { Period, Room } from '../../../../core/models';
import {
  CategoryTotal,
  DashboardService,
  MonthlyTotal,
} from '../../../../core/services/dashboard.service';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { PeriodService } from '../../../../core/services/period.service';
import { RealtimeService } from '../../../../core/services/realtime.service';
import { RoomService } from '../../../../core/services/room.service';
import {
  AppSkeletonComponent,
  BarDatum,
  BarTrendComponent,
  DonutChartComponent,
  DonutDatum,
  StatusPillComponent,
} from '../../../../shared/ui';
import {
  describeError,
  formatRoomAmount,
  monthLabel,
  shortMonthLabel,
  toMonthKey,
} from '../../../../shared/utils';

@Component({
  selector: 'app-dashboard',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button [defaultHref]="backHref"></ion-back-button>
        </ion-buttons>
        <ion-title>Dashboard</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($any($event))">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      @if (loading()) {
        <app-skeleton variant="summary"></app-skeleton>
      } @else {
        <div class="page-pad">
          <div class="hero-card">
            <p class="label-muted">{{ currentLabel }}</p>
            <div class="amount-hero">{{ format(currentTotal()) }}</div>
            <p class="label-muted">Monthly average: {{ format(average()) }}</p>
          </div>

          @if (trend().length > 1) {
            <h2 class="section-title">Spending trend</h2>
            <div class="app-card">
              <app-bar-trend [data]="trend()"></app-bar-trend>
            </div>
          }

          @if (categoryChart().length > 0) {
            <h2 class="section-title">{{ currentLabel }} by category</h2>
            <div class="app-card">
              <app-donut-chart [data]="categoryChart()" [centerLabel]="shortTotal()"></app-donut-chart>
            </div>
          }

          <h2 class="section-title">Pending collection</h2>
          @if (pending().length === 0) {
            <div class="app-card text-muted">Nothing pending. All closed months are fully paid.</div>
          } @else {
            <div class="list-card">
              <ion-list>
                @for (period of pending(); track period.id) {
                  <ion-item button detail="false" (click)="openCollections(period.monthKey)">
                    <ion-label>{{ label(period.monthKey) }}</ion-label>
                    <app-status-pill
                      slot="end"
                      [label]="statusLabel(period)"
                      [tone]="period.status === 'partially_paid' ? 'warning' : 'muted'"
                    ></app-status-pill>
                  </ion-item>
                }
              </ion-list>
            </div>
          }

          <h2 class="section-title">Recent months</h2>
          @if (totals().length === 0) {
            <div class="app-card text-muted">No expenses recorded yet.</div>
          } @else {
            <div class="list-card">
              <ion-list>
                @for (item of totals(); track item.monthKey) {
                  <ion-item>
                    <ion-label>{{ label(item.monthKey) }}</ion-label>
                    <span slot="end" class="row-amount">{{ format(item.total) }}</span>
                  </ion-item>
                }
              </ion-list>
            </div>
          }
        </div>
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
    IonRefresher,
    IonRefresherContent,
    AppSkeletonComponent,
    BarTrendComponent,
    DonutChartComponent,
    StatusPillComponent,
  ],
})
export class DashboardPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly roomService = inject(RoomService);
  private readonly dashboardService = inject(DashboardService);
  private readonly periodService = inject(PeriodService);
  private readonly feedback = inject(FeedbackService);
  private readonly realtime = inject(RealtimeService);

  private realtimeOff?: () => void;

  readonly room = signal<Room | null>(null);
  readonly totals = signal<MonthlyTotal[]>([]);
  readonly breakdown = signal<CategoryTotal[]>([]);
  readonly pending = signal<Period[]>([]);
  readonly currentTotal = signal(0);
  readonly average = signal(0);
  readonly loading = signal(true);

  private readonly currentMonthKey = toMonthKey(new Date());

  readonly trend = computed<BarDatum[]>(() =>
    this.totals()
      .slice(0, 6)
      .reverse()
      .map((item) => ({ label: shortMonthLabel(item.monthKey), value: item.total })),
  );

  readonly categoryChart = computed<DonutDatum[]>(() =>
    this.breakdown().map((item) => ({ label: item.label, value: item.total })),
  );

  get currentLabel(): string {
    return monthLabel(this.currentMonthKey);
  }

  private get roomId(): string {
    return this.route.snapshot.paramMap.get('roomId') ?? '';
  }

  get backHref(): string {
    return `/rooms/${this.roomId}`;
  }

  async ionViewWillEnter(): Promise<void> {
    await this.load();
    this.realtimeOff = this.realtime.onRoomChanges(this.roomId, ['expenses', 'periods'], () =>
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
      const [room, totals, periods, breakdown] = await Promise.all([
        this.roomService.getRoom(this.roomId),
        this.dashboardService.monthlyTotals(this.roomId),
        this.periodService.listPeriods(this.roomId),
        this.dashboardService.categoryBreakdown(this.roomId, this.currentMonthKey),
      ]);
      this.room.set(room);
      this.totals.set(totals);
      this.breakdown.set(breakdown);
      this.average.set(this.dashboardService.monthlyAverage(totals));
      this.currentTotal.set(totals.find((t) => t.monthKey === this.currentMonthKey)?.total ?? 0);
      this.pending.set(
        periods.filter((p) => p.status === 'closed' || p.status === 'partially_paid'),
      );
    } catch (error) {
      await this.feedback.error(describeError(error));
    } finally {
      this.loading.set(false);
    }
  }

  format(amount: number): string {
    return formatRoomAmount(amount, this.room()?.currency ?? 'ARS');
  }

  shortTotal(): string {
    const value = this.currentTotal();
    return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(Math.round(value));
  }

  label(monthKey: string): string {
    return monthLabel(monthKey);
  }

  statusLabel(period: Period): string {
    return period.status.replace('_', ' ');
  }

  openCollections(monthKey: string): void {
    void this.router.navigate(['/rooms', this.roomId, 'collections'], {
      queryParams: { month: monthKey },
    });
  }
}
