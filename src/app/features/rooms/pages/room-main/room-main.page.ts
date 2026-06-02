import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ModalController } from '@ionic/angular/standalone';
import {
  IonBackButton,
  IonBadge,
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
  IonNote,
  IonSpinner,
  IonText,
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
          <ion-button (click)="go('settings')" [disabled]="role() !== 'admin'">
            <ion-icon slot="icon-only" name="settings-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      @if (loading()) {
        <div class="ion-text-center ion-padding"><ion-spinner></ion-spinner></div>
      } @else {
        <ion-text>
          <h2 class="month">{{ label() }}</h2>
        </ion-text>
        <ion-text color="primary">
          <h1 class="total">{{ format(total()) }}</h1>
        </ion-text>
        <ion-badge [color]="statusColor()">{{ statusLabel() }}</ion-badge>
        @if (sync.pending() > 0) {
          <ion-note class="sync-note">
            <ion-icon name="cloud-offline-outline"></ion-icon> {{ sync.pending() }} waiting to sync
          </ion-note>
        }
        @if (sync.conflicts() > 0) {
          <ion-note class="sync-note" color="danger">
            <ion-icon name="warning-outline"></ion-icon> {{ sync.conflicts() }} sync conflict(s)
          </ion-note>
        }

        <div class="shortcuts">
          <ion-button size="small" fill="outline" (click)="go('summary')">Summary</ion-button>
          <ion-button size="small" fill="outline" (click)="go('collections')">Collections</ion-button>
          <ion-button size="small" fill="outline" (click)="go('categories')">Categories</ion-button>
          <ion-button size="small" fill="outline" (click)="go('dashboard')">Dashboard</ion-button>
        </div>

        <div class="latest">Latest expenses</div>
        <ion-list>
          @if (expenses().length === 0) {
            <ion-note class="ion-padding">No expenses yet. Tap + to add the first one.</ion-note>
          } @else {
            @for (expense of expenses(); track expense.id) {
              <ion-item button (click)="edit(expense)">
                <ion-label>
                  <h3>{{ categoryName(expense.categoryId) }}</h3>
                  <p>{{ beneficiaryNames(expense) }} · {{ expense.expenseDate }}</p>
                </ion-label>
                @if (expenseBadge(expense); as badge) {
                  <ion-badge slot="end" [color]="badge.color">{{ badge.label }}</ion-badge>
                }
                <ion-text slot="end">{{ format(expense.amount) }}</ion-text>
              </ion-item>
            }
          }
        </ion-list>
      }
      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button (click)="addExpense()" [disabled]="loading()">
          <ion-icon name="add"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  `,
  styles: [
    `
      .month {
        margin: 0;
        color: var(--ion-color-medium);
        font-size: 1rem;
      }
      .total {
        margin: 2px 0 6px;
        font-size: 2.2rem;
        font-weight: 700;
      }
      .shortcuts {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin: 14px 0;
      }
      .latest {
        display: block;
        font-weight: 600;
        padding: 8px 0;
      }
      .sync-note {
        display: block;
        margin-top: 6px;
        font-size: 0.8rem;
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
    IonNote,
    IonBadge,
    IonText,
    IonIcon,
    IonFab,
    IonFabButton,
    IonSpinner,
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

  private get roomId(): string {
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

  async addExpense(): Promise<void> {
    const modal = await this.modalController.create({
      component: AddExpenseModalComponent,
      componentProps: { roomId: this.roomId, isAdmin: this.role() === 'admin' },
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
      componentProps: { roomId: this.roomId, isAdmin: this.role() === 'admin', expense },
    });
    await modal.present();
    const { role } = await modal.onDidDismiss();
    if (role === 'saved') {
      await this.load();
    }
  }

  expenseBadge(expense: Expense): { label: string; color: string } | null {
    switch (expense.syncStatus) {
      case 'pending_sync':
      case 'syncing':
        return { label: 'pending', color: 'medium' };
      case 'sync_failed':
        return { label: 'retry', color: 'warning' };
      case 'conflict':
        return { label: 'conflict', color: 'danger' };
      default:
        return null;
    }
  }

  async syncNow(): Promise<void> {
    await this.sync.process('manual');
    await this.load();
  }

  go(section: string): void {
    void this.router.navigate(['/rooms', this.roomId, section]);
  }
}
