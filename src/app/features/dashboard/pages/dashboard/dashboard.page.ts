import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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
import { Period, Room } from '../../../../core/models';
import { DashboardService, MonthlyTotal } from '../../../../core/services/dashboard.service';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { PeriodService } from '../../../../core/services/period.service';
import { RoomService } from '../../../../core/services/room.service';
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
    <ion-content class="ion-padding">
      @if (loading()) {
        <div class="ion-text-center ion-padding"><ion-spinner></ion-spinner></div>
      } @else {
        <ion-text color="medium"><p>{{ currentLabel }}</p></ion-text>
        <ion-text color="primary"><h1 class="total">{{ format(currentTotal()) }}</h1></ion-text>
        <ion-note>Monthly average: {{ format(average()) }}</ion-note>

        <ion-text><h3 class="ion-margin-top">Pending collection</h3></ion-text>
        @if (pending().length === 0) {
          <ion-note>Nothing pending. All closed months are fully paid.</ion-note>
        } @else {
          <ion-list>
            @for (period of pending(); track period.id) {
              <ion-item button (click)="openCollections(period.monthKey)">
                <ion-label>{{ label(period.monthKey) }}</ion-label>
                <ion-badge slot="end" [color]="period.status === 'partially_paid' ? 'warning' : 'medium'">
                  {{ statusLabel(period) }}
                </ion-badge>
              </ion-item>
            }
          </ion-list>
        }

        <ion-text><h3 class="ion-margin-top">Recent months</h3></ion-text>
        @if (totals().length === 0) {
          <ion-note>No expenses recorded yet.</ion-note>
        } @else {
          <ion-list>
            @for (item of totals(); track item.monthKey) {
              <ion-item>
                <ion-label>{{ label(item.monthKey) }}</ion-label>
                <ion-text slot="end">{{ format(item.total) }}</ion-text>
              </ion-item>
            }
          </ion-list>
        }
      }
    </ion-content>
  `,
  styles: [`.total { margin: 4px 0; font-size: 2rem; font-weight: 700; }`],
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
