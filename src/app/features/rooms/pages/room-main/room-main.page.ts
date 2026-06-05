import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ActionSheetButton,
  ActionSheetController,
  ModalController,
} from '@ionic/angular/standalone';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { Beneficiary, Category, Expense, PeriodStatus, Room, RoomRole } from '../../../../core/models';
import { BeneficiaryService } from '../../../../core/services/beneficiary.service';
import { CategoryService } from '../../../../core/services/category.service';
import { ExpenseService } from '../../../../core/services/expense.service';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { PeriodService } from '../../../../core/services/period.service';
import { PreferencesService } from '../../../../core/services/preferences.service';
import { RoomService } from '../../../../core/services/room.service';
import { SyncQueueService } from '../../../../core/services/sync-queue.service';
import { AddExpenseModalComponent } from '../../../expenses/components/add-expense-modal/add-expense-modal.component';
import { AppTabBarComponent, CategoryIconComponent, StatusPillComponent, StatusTone } from '../../../../shared/ui';
import { describeError, formatRoomAmount, monthLabel, toMonthKey } from '../../../../shared/utils';

@Component({
  selector: 'app-room-main',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/rooms"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ room()?.name ?? 'Room' }}</ion-title>
        <ion-buttons slot="end">
          @if (sync.syncing() || sync.pending() > 0) {
            <ion-button (click)="syncNow()">
              <ion-icon
                slot="icon-only"
                [name]="sync.syncing() ? 'sync-outline' : 'cloud-offline-outline'"
              ></ion-icon>
            </ion-button>
          }
          @if (role() === 'admin') {
            <ion-button (click)="go('settings')">
              <ion-icon slot="icon-only" name="settings-outline"></ion-icon>
            </ion-button>
          }
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      @if (loading()) {
        <div class="center-pad"><ion-spinner></ion-spinner></div>
      } @else {
        <div class="page-pad fab-safe">
          <div class="month-row">
            <span>{{ label() }}</span>
            <ion-icon name="chevron-down-outline"></ion-icon>
          </div>

          <div class="hero-card">
            <p class="label-muted">Total paid</p>
            <div class="amount-hero">{{ format(total()) }}</div>
            <div class="hero-pills">
              <app-status-pill
                [label]="statusLabel()"
                [tone]="statusTone()"
                [icon]="statusIcon()"
              ></app-status-pill>
              @if (sync.pending() > 0) {
                <app-status-pill
                  [label]="sync.pending() + ' to sync'"
                  tone="warning"
                  icon="cloud-offline-outline"
                ></app-status-pill>
              }
              @if (sync.conflicts() > 0) {
                <app-status-pill
                  [label]="sync.conflicts() + ' conflict'"
                  tone="danger"
                  icon="warning-outline"
                ></app-status-pill>
              }
            </div>
          </div>

          <div class="quick-actions">
            <button type="button" class="quick-action" (click)="go('summary')">
              <ion-icon name="pie-chart-outline"></ion-icon>Summary
            </button>
            <button type="button" class="quick-action" (click)="go('collections')">
              <ion-icon name="people-outline"></ion-icon>Collections
            </button>
            <button type="button" class="quick-action" (click)="go('categories')">
              <ion-icon name="pricetag-outline"></ion-icon>Categories
            </button>
            <button type="button" class="quick-action" (click)="openMore()">
              <ion-icon name="grid-outline"></ion-icon>More
            </button>
          </div>

          <div class="section-head">
            <span class="section-title">Latest expenses</span>
            @if (expenses().length > 0) {
              <span class="link-action" (click)="go('summary')">
                View all <ion-icon name="chevron-forward"></ion-icon>
              </span>
            }
          </div>

          @if (expenses().length === 0) {
            <div class="app-card text-muted">No expenses yet. Tap + to add the first one.</div>
          } @else {
            <div class="list-card">
              <ion-list>
                @for (expense of expenses(); track expense.id) {
                  <ion-item button detail="false" (click)="edit(expense)">
                    <app-category-icon
                      slot="start"
                      [name]="categoryName(expense.categoryId)"
                    ></app-category-icon>
                    <ion-label>
                      <h3 class="row-title">{{ categoryName(expense.categoryId) }}</h3>
                      <p class="label-muted">{{ beneficiaryNames(expense) }} · {{ expense.expenseDate }}</p>
                    </ion-label>
                    <div slot="end" class="row-end">
                      @if (expenseBadge(expense); as badge) {
                        <app-status-pill [label]="badge.label" [tone]="badge.tone"></app-status-pill>
                      }
                      <span class="row-amount">{{ format(expense.amount) }}</span>
                      <ion-icon name="chevron-forward" class="chev"></ion-icon>
                    </div>
                  </ion-item>
                }
              </ion-list>
            </div>
          }
        </div>
      }
      <!-- <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button (click)="addExpense()" [disabled]="loading()">
          <ion-icon name="add"></ion-icon>
        </ion-fab-button>
      </ion-fab> -->
    </ion-content>
    <app-tab-bar [roomId]="roomId" active="home" (addExpense)="addExpense()"></app-tab-bar>
  `,
  styles: [
    `
      .month-row {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 4px 0 14px;
        font-weight: 700;
        font-size: 1.05rem;
      }
      .month-row ion-icon {
        color: var(--app-text-muted);
      }
      .hero-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 10px;
      }
      .row-title {
        font-weight: 700;
        margin: 0;
      }
      .row-end {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .row-amount {
        font-weight: 700;
      }
      .row-end .chev {
        color: var(--app-text-muted);
        font-size: 1.1rem;
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
    AppTabBarComponent,
    CategoryIconComponent,
    StatusPillComponent,
  ],
})
export class RoomMainPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly roomService = inject(RoomService);
  private readonly expenseService = inject(ExpenseService);
  private readonly categoryService = inject(CategoryService);
  private readonly beneficiaryService = inject(BeneficiaryService);
  private readonly periodService = inject(PeriodService);
  private readonly preferences = inject(PreferencesService);
  private readonly feedback = inject(FeedbackService);
  private readonly modalController = inject(ModalController);
  private readonly actionSheet = inject(ActionSheetController);
  readonly sync = inject(SyncQueueService);

  private readonly categoryMap = signal<Map<string, string>>(new Map());
  private readonly beneficiaryMap = signal<Map<string, string>>(new Map());

  readonly room = signal<Room | null>(null);
  readonly role = signal<RoomRole | null>(null);
  readonly expenses = signal<Expense[]>([]);
  readonly status = signal<PeriodStatus>('open');
  readonly loading = signal(true);

  readonly monthKey = toMonthKey(new Date());
  readonly label = computed(() => monthLabel(this.monthKey));
  readonly total = computed(() =>
    this.expenses().reduce((sum, expense) => sum + expense.amount, 0),
  );

  get roomId(): string {
    return this.route.snapshot.paramMap.get('roomId') ?? '';
  }

  async ionViewWillEnter(): Promise<void> {
    await this.preferences.setLastRoomId(this.roomId);
    void this.sync.process('room-enter');
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
        this.periodService.getPeriod(this.roomId, this.monthKey),
        this.expenseService.listByMonth(this.roomId, this.monthKey),
      ]);

      this.room.set(room);
      this.role.set(role);
      this.categoryMap.set(new Map(categories.map((c: Category) => [c.id, c.name])));
      this.beneficiaryMap.set(new Map(beneficiaries.map((b: Beneficiary) => [b.id, b.name])));
      this.status.set(period?.status ?? 'open');
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

  beneficiaryNames(expense: Expense): string {
    const map = this.beneficiaryMap();
    const names = expense.beneficiaryIds.map((id) => map.get(id) ?? '').filter(Boolean);
    return names.length > 0 ? names.join(', ') : '—';
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

  async addExpense(): Promise<void> {
    const modal = await this.modalController.create({
      component: AddExpenseModalComponent,
      componentProps: {
        roomId: this.roomId,
        isAdmin: this.role() === 'admin',
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
        isAdmin: this.role() === 'admin',
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

  expenseBadge(expense: Expense): { label: string; tone: StatusTone } | null {
    switch (expense.syncStatus) {
      case 'pending_sync':
      case 'syncing':
        return { label: 'pending', tone: 'muted' };
      case 'sync_failed':
        return { label: 'retry', tone: 'warning' };
      case 'conflict':
        return { label: 'conflict', tone: 'danger' };
      default:
        return null;
    }
  }

  async openMore(): Promise<void> {
    const buttons: ActionSheetButton[] = [
      { text: 'Dashboard', icon: 'stats-chart-outline', handler: () => this.go('dashboard') },
      { text: 'Members', icon: 'people-outline', handler: () => this.go('members') },
      { text: 'Beneficiaries', icon: 'person-outline', handler: () => this.go('beneficiaries') },
      { text: 'Payers', icon: 'wallet-outline', handler: () => this.go('payers') },
    ];
    if (this.role() === 'admin') {
      buttons.push({ text: 'Room settings', icon: 'settings-outline', handler: () => this.go('settings') });
    }
    buttons.push({ text: 'Cancel', role: 'cancel' });
    const sheet = await this.actionSheet.create({ header: 'More', buttons });
    await sheet.present();
  }

  async syncNow(): Promise<void> {
    await this.sync.process('manual');
    await this.load();
  }

  go(section: string): void {
    void this.router.navigate(['/rooms', this.roomId, section]);
  }
}
