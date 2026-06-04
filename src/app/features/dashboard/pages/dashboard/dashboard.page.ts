import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { Period, Room } from '../../../../core/models';
import { DashboardService, MonthlyTotal } from '../../../../core/services/dashboard.service';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { PeriodService } from '../../../../core/services/period.service';
import { RoomService } from '../../../../core/services/room.service';
import { StatusPillComponent } from '../../../../shared/ui';
import { describeError, formatRoomAmount, monthLabel, toMonthKey } from '../../../../shared/utils';

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
      @if (loading()) {
        <div class="center-pad"><ion-spinner></ion-spinner></div>
      } @else {
        <div class="page-pad">
          <div class="hero-card">
            <p class="label-muted">{{ currentLabel }}</p>
            <div class="amount-hero">{{ format(currentTotal()) }}</div>
            <p class="label-muted">Monthly average: {{ format(average()) }}</p>
          </div>

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
    IonSpinner,
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

  readonly room = signal<Room | null>(null);
  readonly totals = signal<MonthlyTotal[]>([]);
  readonly pending = signal<Period[]>([]);
  readonly currentTotal = signal(0);
  readonly average = signal(0);
  readonly loading = signal(true);

  private readonly currentMonthKey = toMonthKey(new Date());

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
    this.loading.set(true);
    try {
      const [room, totals, periods] = await Promise.all([
        this.roomService.getRoom(this.roomId),
        this.dashboardService.monthlyTotals(this.roomId),
        this.periodService.listPeriods(this.roomId),
      ]);
      this.room.set(room);
      this.totals.set(totals);
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
