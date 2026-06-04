import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController } from '@ionic/angular/standalone';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
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
import { AppTabBarComponent, CategoryIconComponent, StatusPillComponent, StatusTone } from '../../../../shared/ui';
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
    <ion-content>
      @if (loading()) {
        <div class="center-pad"><ion-spinner></ion-spinner></div>
      } @else {
        <div class="page-pad fab-safe">
          <div class="month-nav">
            <ion-button fill="clear" class="nav-btn" (click)="shift(-1)">
              <ion-icon slot="icon-only" name="chevron-back"></ion-icon>
            </ion-button>
            <span class="month-label">{{ label() }}</span>
            <ion-button fill="clear" class="nav-btn" (click)="shift(1)">
              <ion-icon slot="icon-only" name="chevron-forward"></ion-icon>
            </ion-button>
          </div>

          <div class="hero-card">
            <p class="label-muted">Total expenses</p>
            <div class="amount-hero">{{ format(total()) }}</div>
            <div class="hero-pills">
              <app-status-pill
                [label]="statusLabel()"
                [tone]="statusTone()"
                [icon]="statusIcon()"
              ></app-status-pill>
            </div>
            <div class="hero-actions">
              @if (isAdmin()) {
                @if (status() === 'open') {
                  <ion-button (click)="closeMonth()">Close month</ion-button>
                } @else {
                  <ion-button fill="outline" (click)="reopenMonth()">Reopen month</ion-button>
                }
              }
              <ion-button fill="outline" (click)="go('collections')">
                <ion-icon slot="start" name="people-outline"></ion-icon>Collections
              </ion-button>
              @if (status() !== 'open') {
                <ion-button fill="outline" (click)="go('message')">
                  <ion-icon slot="start" name="share-social-outline"></ion-icon>Message
                </ion-button>
              }
            </div>
          </div>

          <ion-segment class="view-segment" [value]="view()" (ionChange)="setView($any($event).detail.value)">
            <ion-segment-button value="summary"><ion-label>Summary</ion-label></ion-segment-button>
            <ion-segment-button value="expenses"><ion-label>Expenses</ion-label></ion-segment-button>
          </ion-segment>

          @if (view() === 'summary') {
            <h2 class="section-title">Breakdown</h2>
            <div class="breakdown">
              <div class="app-card">
                <div class="bd-head"><span>By category</span><ion-icon name="pie-chart-outline"></ion-icon></div>
                @if (byCategory().length === 0) {
                  <p class="label-muted">No expenses.</p>
                }
                @for (group of byCategoryTop(); track group.label) {
                  <div class="bd-row">
                    <span class="bd-label">{{ group.label }}</span>
                    <span class="bd-amount">{{ format(group.total) }}</span>
                  </div>
                }
                @if (byCategory().length > 3) {
                  <span class="link-action" (click)="setView('expenses')">
                    View all <ion-icon name="chevron-forward"></ion-icon>
                  </span>
                }
              </div>
              <div class="app-card">
                <div class="bd-head"><span>By beneficiary</span><ion-icon name="people-outline"></ion-icon></div>
                @if (byBeneficiary().length === 0) {
                  <p class="label-muted">No expenses.</p>
                }
                @for (group of byBeneficiaryTop(); track group.label) {
                  <div class="bd-row">
                    <span class="bd-label">{{ group.label }}</span>
                    <span class="bd-amount">{{ format(group.total) }}</span>
                  </div>
                }
                @if (byBeneficiary().length > 3) {
                  <span class="link-action" (click)="setView('expenses')">
                    View all <ion-icon name="chevron-forward"></ion-icon>
                  </span>
                }
              </div>
            </div>

            <div class="section-head">
              <span class="section-title">Latest expenses</span>
              @if (expenses().length > 3) {
                <span class="link-action" (click)="setView('expenses')">
                  View all <ion-icon name="chevron-forward"></ion-icon>
                </span>
              }
            </div>
            @if (expenses().length === 0) {
              <div class="app-card text-muted">No expenses this month.</div>
            } @else {
              <div class="list-card">
                <ion-list>
                  @for (expense of latest(); track expense.id) {
                    <ion-item button detail="false" (click)="edit(expense)">
                      <app-category-icon slot="start" [name]="categoryName(expense.categoryId)"></app-category-icon>
                      <ion-label>
                        <h3 class="row-title">{{ categoryName(expense.categoryId) }}</h3>
                        <p class="label-muted">{{ expense.expenseDate }}</p>
                      </ion-label>
                      <span slot="end" class="row-amount">{{ format(expense.amount) }}</span>
                    </ion-item>
                  }
                </ion-list>
              </div>
            }
          } @else {
            @if (expenses().length === 0) {
              <div class="app-card text-muted">No expenses this month.</div>
            } @else {
              <div class="list-card">
                <ion-list>
                  @for (expense of expenses(); track expense.id) {
                    <ion-item button detail="false" (click)="edit(expense)">
                      <app-category-icon slot="start" [name]="categoryName(expense.categoryId)"></app-category-icon>
                      <ion-label>
                        <h3 class="row-title">{{ categoryName(expense.categoryId) }}</h3>
                        <p class="label-muted">
                          {{ expense.expenseDate }}{{ expense.description ? ' · ' + expense.description : '' }}
                        </p>
                      </ion-label>
                      <div slot="end" class="row-end">
                        <span class="row-amount">{{ format(expense.amount) }}</span>
                        @if (status() === 'open') {
                          <ion-button fill="clear" color="danger" (click)="remove(expense, $event)">
                            <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
                          </ion-button>
                        }
                      </div>
                    </ion-item>
                  }
                </ion-list>
              </div>
            }
          }
        </div>
      }
    </ion-content>
    <app-tab-bar [roomId]="roomId" active="summary" (addExpense)="addExpense()"></app-tab-bar>
  `,
  styles: [
    `
      .month-nav {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 18px;
        margin: 4px 0 14px;
      }
      .month-nav .month-label {
        font-weight: 700;
        font-size: 1.05rem;
      }
      .nav-btn {
        border: 1px solid var(--app-border);
        border-radius: 50%;
      }
      .hero-pills {
        display: flex;
        gap: 8px;
        margin-top: 10px;
      }
      .hero-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 16px;
      }
      .hero-actions ion-button {
        flex: 1;
        min-width: 132px;
        margin: 0;
      }
      .view-segment {
        margin: 16px 0;
      }
      .breakdown {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .bd-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-weight: 700;
        margin-bottom: 10px;
      }
      .bd-head ion-icon {
        color: var(--app-primary);
      }
      .bd-row {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 8px;
        font-size: 0.9rem;
      }
      .bd-label {
        color: var(--app-text-muted);
      }
      .bd-amount {
        font-weight: 700;
      }
      .row-title {
        font-weight: 700;
        margin: 0;
      }
      .row-amount {
        font-weight: 700;
      }
      .row-end {
        display: flex;
        align-items: center;
        gap: 2px;
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
    IonIcon,
    IonSpinner,
    IonSegment,
    IonSegmentButton,
    AppTabBarComponent,
    CategoryIconComponent,
    StatusPillComponent,
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
  readonly view = signal<'summary' | 'expenses'>('summary');

  readonly label = computed(() => monthLabel(this.monthKey()));
  readonly total = computed(() => this.expenses().reduce((sum, e) => sum + e.amount, 0));
  readonly status = computed(() => this.period()?.status ?? 'open');
  readonly isAdmin = computed(() => this.role() === 'admin');
  readonly latest = computed(() => this.expenses().slice(0, 5));

  readonly byCategory = computed<Group[]>(() => {
    const totals = new Map<string, number>();
    for (const expense of this.expenses()) {
      totals.set(expense.categoryId, (totals.get(expense.categoryId) ?? 0) + expense.amount);
    }
    return [...totals.entries()]
      .map(([categoryId, total]) => ({ label: this.categoryName(categoryId), total }))
      .sort((a, b) => b.total - a.total);
  });

  readonly byCategoryTop = computed(() => this.byCategory().slice(0, 3));

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

  readonly byBeneficiaryTop = computed(() => this.byBeneficiary().slice(0, 3));

  get roomId(): string {
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

  setView(value: 'summary' | 'expenses'): void {
    this.view.set(value);
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

  statusTone(): StatusTone {
    switch (this.status()) {
      case 'open':
        return 'open';
      case 'paid':
        return 'paid';
      case 'partially_paid':
        return 'warning';
      default:
        return 'muted';
    }
  }

  statusIcon(): string | null {
    return this.status() === 'paid' ? 'checkmark-circle' : null;
  }

  async shift(delta: number): Promise<void> {
    this.monthKey.set(shiftMonthKey(this.monthKey(), delta));
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
    const { role } = await modal.onDidDismiss();
    if (role === 'saved') {
      await this.load();
    }
  }

  async edit(expense: Expense): Promise<void> {
    if (this.status() !== 'open') {
      await this.feedback.error('This month is closed. Expenses cannot be edited.');
      return;
    }
    const modal = await this.modalController.create({
      component: AddExpenseModalComponent,
      componentProps: {
        roomId: this.roomId,
        isAdmin: this.isAdmin(),
        currency: this.room()?.currency ?? 'ARS',
        expense,
      },
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
