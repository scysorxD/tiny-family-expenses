import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController } from '@ionic/angular/standalone';
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
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { Beneficiary, Category, Expense, Period, Room, RoomRole } from '../../../../core/models';
import { BeneficiaryService } from '../../../../core/services/beneficiary.service';
import { CategoryService } from '../../../../core/services/category.service';
import { ExpenseService } from '../../../../core/services/expense.service';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { PeriodService } from '../../../../core/services/period.service';
import { RoomService } from '../../../../core/services/room.service';
import { AddExpenseModalComponent } from '../../../expenses/components/add-expense-modal/add-expense-modal.component';
import {
  describeError,
  formatRoomAmount,
  monthLabel,
  shiftMonthKey,
  toMonthKey,
} from '../../../../shared/utils';

interface Group {
  label: string;
  total: number;
}

@Component({
  selector: 'app-period-summary',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button [defaultHref]="backHref"></ion-back-button>
        </ion-buttons>
        <ion-title>Summary</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div class="nav">
        <ion-button fill="clear" (click)="shift(-1)">
          <ion-icon slot="icon-only" name="chevron-back"></ion-icon>
        </ion-button>
        <ion-text><strong>{{ label() }}</strong></ion-text>
        <ion-button fill="clear" (click)="shift(1)">
          <ion-icon slot="icon-only" name="chevron-forward"></ion-icon>
        </ion-button>
      </div>

      @if (loading()) {
        <div class="ion-text-center ion-padding"><ion-spinner></ion-spinner></div>
      } @else {
        <ion-text color="primary"><h1 class="total">{{ format(total()) }}</h1></ion-text>
        <ion-badge [color]="statusColor()">{{ statusLabel() }}</ion-badge>

        <div class="actions">
          @if (isAdmin()) {
            @if (status() === 'open') {
              <ion-button size="small" (click)="closeMonth()">Close month</ion-button>
            } @else {
              <ion-button size="small" fill="outline" (click)="reopenMonth()">Reopen month</ion-button>
            }
          }
          @if (status() !== 'open') {
            <ion-button size="small" fill="outline" (click)="go('message')">Message</ion-button>
            <ion-button size="small" fill="outline" (click)="go('collections')">Collections</ion-button>
          }
        </div>

        <ion-text><h3>By category</h3></ion-text>
        @if (byCategory().length === 0) {
          <ion-note>No expenses this month.</ion-note>
        } @else {
          <ion-list>
            @for (group of byCategory(); track group.label) {
              <ion-item>
                <ion-label>{{ group.label }}</ion-label>
                <ion-text slot="end">{{ format(group.total) }}</ion-text>
              </ion-item>
            }
          </ion-list>
        }

        <ion-text><h3>By beneficiary</h3></ion-text>
        <ion-list>
          @for (group of byBeneficiary(); track group.label) {
            <ion-item>
              <ion-label>{{ group.label }}</ion-label>
              <ion-text slot="end">{{ format(group.total) }}</ion-text>
            </ion-item>
          }
        </ion-list>

        <ion-text><h3>Expenses</h3></ion-text>
        <ion-list>
          @for (expense of expenses(); track expense.id) {
            <ion-item button (click)="edit(expense)">
              <ion-label>
                <h3>{{ categoryName(expense.categoryId) }}</h3>
                <p>{{ expense.expenseDate }}{{ expense.description ? ' · ' + expense.description : '' }}</p>
              </ion-label>
              <ion-text slot="end">{{ format(expense.amount) }}</ion-text>
              @if (status() === 'open') {
                <ion-button fill="clear" color="danger" slot="end" (click)="remove(expense, $event)">
                  <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
                </ion-button>
              }
            </ion-item>
          }
        </ion-list>
      }
    </ion-content>
  `,
  styles: [
    `
      .nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .total {
        margin: 6px 0;
        font-size: 2rem;
        font-weight: 700;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin: 12px 0;
      }
    `,
  ],
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
    IonText,
    IonIcon,
    IonSpinner,
  ],
})
export class PeriodSummaryPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly roomService = inject(RoomService);
  private readonly expenseService = inject(ExpenseService);
  private readonly categoryService = inject(CategoryService);
  private readonly beneficiaryService = inject(BeneficiaryService);
  private readonly periodService = inject(PeriodService);
  private readonly feedback = inject(FeedbackService);
  private readonly modalController = inject(ModalController);

  private readonly categoryMap = signal<Map<string, string>>(new Map());
  private readonly beneficiaryMap = signal<Map<string, string>>(new Map());

  readonly room = signal<Room | null>(null);
  readonly role = signal<RoomRole | null>(null);
  readonly period = signal<Period | null>(null);
  readonly expenses = signal<Expense[]>([]);
  readonly monthKey = signal(toMonthKey(new Date()));
  readonly loading = signal(true);

  readonly label = computed(() => monthLabel(this.monthKey()));
  readonly total = computed(() => this.expenses().reduce((sum, e) => sum + e.amount, 0));
  readonly status = computed(() => this.period()?.status ?? 'open');
  readonly isAdmin = computed(() => this.role() === 'admin');

  readonly byCategory = computed<Group[]>(() => {
    const totals = new Map<string, number>();
    for (const expense of this.expenses()) {
      totals.set(expense.categoryId, (totals.get(expense.categoryId) ?? 0) + expense.amount);
    }
    return [...totals.entries()]
      .map(([categoryId, total]) => ({ label: this.categoryName(categoryId), total }))
      .sort((a, b) => b.total - a.total);
  });

  readonly byBeneficiary = computed<Group[]>(() => {
    const totals = new Map<string, number>();
    for (const expense of this.expenses()) {
      const key =
        expense.beneficiaryIds.length > 1
          ? 'Both'
          : (this.beneficiaryMap().get(expense.beneficiaryIds[0] ?? '') ?? '—');
      totals.set(key, (totals.get(key) ?? 0) + expense.amount);
    }
    return [...totals.entries()]
      .map(([label, total]) => ({ label, total }))
      .sort((a, b) => b.total - a.total);
  });

  private get roomId(): string {
    return this.route.snapshot.paramMap.get('roomId') ?? '';
  }

  get backHref(): string {
    return `/rooms/${this.roomId}`;
  }

  async ionViewWillEnter(): Promise<void> {
    const month = this.route.snapshot.queryParamMap.get('month');
    if (month) {
      this.monthKey.set(month);
    }
    await this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [room, role, categories, beneficiaries, period, expenses] = await Promise.all([
        this.roomService.getRoom(this.roomId),
        this.roomService.getMyRole(this.roomId),
        this.categoryService.listCategories(this.roomId, true),
        this.beneficiaryService.list(this.roomId, true),
        this.periodService.getPeriod(this.roomId, this.monthKey()),
        this.expenseService.listByMonth(this.roomId, this.monthKey()),
      ]);
      this.room.set(room);
      this.role.set(role);
      this.categoryMap.set(new Map(categories.map((c: Category) => [c.id, c.name])));
      this.beneficiaryMap.set(new Map(beneficiaries.map((b: Beneficiary) => [b.id, b.name])));
      this.period.set(period);
      this.expenses.set(expenses);
    } catch (error) {
      await this.feedback.error(describeError(error));
    } finally {
      this.loading.set(false);
    }
  }

  format(amount: number): string {
    return formatRoomAmount(amount, this.room()?.currency ?? 'ARS');
  }

  categoryName(categoryId: string): string {
    return this.categoryMap().get(categoryId) ?? 'Category';
  }

  statusLabel(): string {
    return this.status().replace('_', ' ');
  }

  statusColor(): string {
    switch (this.status()) {
      case 'open':
        return 'success';
      case 'paid':
        return 'primary';
      case 'partially_paid':
        return 'warning';
      default:
        return 'medium';
    }
  }

  async shift(delta: number): Promise<void> {
    this.monthKey.set(shiftMonthKey(this.monthKey(), delta));
    await this.load();
  }

  async edit(expense: Expense): Promise<void> {
    if (this.status() !== 'open') {
      await this.feedback.error('This month is closed. Expenses cannot be edited.');
      return;
    }
    const modal = await this.modalController.create({
      component: AddExpenseModalComponent,
      componentProps: { roomId: this.roomId, isAdmin: this.isAdmin(), expense },
    });
    await modal.present();
    const { role } = await modal.onDidDismiss();
    if (role === 'saved') {
      await this.load();
    }
  }

  async remove(expense: Expense, event: Event): Promise<void> {
    event.stopPropagation();
    const confirmed = await this.feedback.confirm('Delete expense', 'Delete this expense?', 'Delete');
    if (!confirmed) {
      return;
    }
    try {
      await this.expenseService.softDelete(expense.id);
      await this.load();
    } catch (error) {
      await this.feedback.error(describeError(error));
    }
  }

  async closeMonth(): Promise<void> {
    const hasExpenses = this.expenses().length > 0;
    if (!hasExpenses) {
      const proceed = await this.feedback.confirm(
        'No expenses',
        'This month has no expenses. Close it anyway?',
        'Close',
      );
      if (!proceed) {
        return;
      }
    }

    try {
      await this.periodService.closePeriod(
        this.roomId,
        this.monthKey(),
        this.room()?.includeDetailInMessage ?? true,
      );
      await this.feedback.success('Month closed');
      await this.router.navigate(['/rooms', this.roomId, 'message'], {
        queryParams: { month: this.monthKey() },
      });
    } catch (error) {
      await this.feedback.error(describeError(error));
    }
  }

  async reopenMonth(): Promise<void> {
    try {
      await this.periodService.reopenPeriod(this.roomId, this.monthKey());
      await this.feedback.success('Month reopened');
      await this.load();
    } catch (error) {
      await this.feedback.error(describeError(error));
    }
  }

  go(section: string): void {
    void this.router.navigate(['/rooms', this.roomId, section], {
      queryParams: { month: this.monthKey() },
    });
  }
}
