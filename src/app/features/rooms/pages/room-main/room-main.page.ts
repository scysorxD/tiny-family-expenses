import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ActionSheetButton,
  ActionSheetController,
  ModalController,
} from '@ionic/angular/standalone';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Beneficiary, Category, Expense, PeriodStatus, Room, RoomRole } from '../../../../core/models';
import { BeneficiaryService } from '../../../../core/services/beneficiary.service';
import { CategoryService } from '../../../../core/services/category.service';
import { ExpenseService } from '../../../../core/services/expense.service';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { PeriodService } from '../../../../core/services/period.service';
import { PreferencesService } from '../../../../core/services/preferences.service';
import { RealtimeService } from '../../../../core/services/realtime.service';
import { RoomService } from '../../../../core/services/room.service';
import { SyncQueueService } from '../../../../core/services/sync-queue.service';
import { AddExpenseModalComponent } from '../../../expenses/components/add-expense-modal/add-expense-modal.component';
import { PageHeaderComponent } from '../../../../shared/components';
import {
  AppSkeletonComponent,
  AppTabBarComponent,
  CategoryIconComponent,
  EmptyStateComponent,
  StatusPillComponent,
  StatusTone,
} from '../../../../shared/ui';
import { LanguageService } from '../../../../core/i18n';
import { describeError, formatRoomAmount, monthLabel, toMonthKey } from '../../../../shared/utils';

@Component({
  selector: 'app-room-main',
  template: `
    <app-page-header [title]="room()?.name ?? ('common.room' | translate)" defaultHref="/rooms">
      <ion-buttons slot="end" end>
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
    </app-page-header>
    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($any($event))">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>
      @if (loading()) {
        <app-skeleton variant="home"></app-skeleton>
      } @else {
        <div class="page-pad fab-safe">
          <div class="month-row">{{ label() }}</div>

          <div class="hero-card">
            <p class="label-muted">{{ 'rooms.main.totalPaid' | translate }}</p>
            <div class="amount-hero">{{ format(total()) }}</div>
            <div class="hero-pills">
              <app-status-pill
                [label]="statusLabel()"
                [tone]="statusTone()"
                [icon]="statusIcon()"
              ></app-status-pill>
              @if (sync.pending() > 0) {
                <app-status-pill
                  class="pill-link"
                  (click)="go('sync')"
                  [label]="'rooms.main.toSync' | translate: { count: sync.pending() }"
                  tone="warning"
                  icon="cloud-offline-outline"
                ></app-status-pill>
              }
              @if (sync.conflicts() > 0) {
                <app-status-pill
                  class="pill-link"
                  (click)="go('sync')"
                  [label]="'rooms.main.conflict' | translate: { count: sync.conflicts() }"
                  tone="danger"
                  icon="warning-outline"
                ></app-status-pill>
              }
            </div>
          </div>

          <!-- <div class="quick-actions">
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
          </div> -->

          <div class="section-head">
            <span class="section-title">{{ 'common.latestExpenses' | translate }}</span>
            @if (expenses().length > 0) {
              <span class="link-action" (click)="go('summary')">
                {{ 'common.viewAll' | translate }} <ion-icon name="chevron-forward"></ion-icon>
              </span>
            }
          </div>

          @if (expenses().length === 0) {
            <app-empty-state
              icon="receipt-outline"
              [title]="'rooms.main.emptyTitle' | translate"
              [message]="'rooms.main.emptyMessage' | translate"
              [actionLabel]="'common.addExpense' | translate"
              (action)="addExpense()"
            ></app-empty-state>
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
    </ion-content>
    <app-tab-bar [roomId]="roomId" active="home" (addExpense)="addExpense()"></app-tab-bar>
  `,
  styles: [
    `
      .month-row {
        margin: 4px 0 14px;
        font-weight: 700;
        font-size: 1.05rem;
      }
      .hero-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 10px;
      }
      .pill-link {
        cursor: pointer;
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
    IonButton,
    IonButtons,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
    PageHeaderComponent,
    AppSkeletonComponent,
    AppTabBarComponent,
    CategoryIconComponent,
    EmptyStateComponent,
    StatusPillComponent,
    TranslatePipe,
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
  private readonly realtime = inject(RealtimeService);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);
  readonly sync = inject(SyncQueueService);

  private realtimeOff?: () => void;

  private readonly categoryMap = signal<Map<string, string>>(new Map());
  private readonly beneficiaryMap = signal<Map<string, string>>(new Map());

  readonly room = signal<Room | null>(null);
  readonly role = signal<RoomRole | null>(null);
  readonly expenses = signal<Expense[]>([]);
  readonly status = signal<PeriodStatus>('open');
  readonly loading = signal(true);

  readonly monthKey = signal(toMonthKey(new Date()));
  readonly label = computed(() => monthLabel(this.monthKey(), this.language.locale));
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
    this.realtimeOff = this.realtime.onRoomChanges(this.roomId, ['expenses', 'periods'], () =>
      void this.load(false),
    );
  }

  ionViewWillLeave(): void {
    this.realtimeOff?.();
    this.realtimeOff = undefined;
  }

  private async load(showLoader = true): Promise<void> {
    if (showLoader) {
      this.loading.set(true);
    }
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
    return this.categoryMap().get(categoryId) ?? this.translate.instant('common.category');
  }

  beneficiaryNames(expense: Expense): string {
    const map = this.beneficiaryMap();
    const names = expense.beneficiaryIds.map((id) => map.get(id) ?? '').filter(Boolean);
    return names.length > 0 ? names.join(', ') : '—';
  }

  statusLabel(): string {
    return this.translate.instant('status.' + this.status());
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
      await this.feedback.error(this.translate.instant('rooms.main.monthClosedEdit'));
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
        return { label: this.translate.instant('rooms.main.badgePending'), tone: 'muted' };
      case 'sync_failed':
        return { label: this.translate.instant('rooms.main.badgeRetry'), tone: 'warning' };
      case 'conflict':
        return { label: this.translate.instant('rooms.main.badgeConflict'), tone: 'danger' };
      default:
        return null;
    }
  }

  async openMore(): Promise<void> {
    const t = (key: string): string => this.translate.instant(key);
    const buttons: ActionSheetButton[] = [
      { text: t('nav.dashboard'), icon: 'stats-chart-outline', handler: () => this.go('dashboard') },
      { text: t('nav.syncStatus'), icon: 'sync-outline', handler: () => this.go('sync') },
      { text: t('nav.members'), icon: 'people-outline', handler: () => this.go('members') },
      { text: t('nav.beneficiaries'), icon: 'person-outline', handler: () => this.go('beneficiaries') },
      { text: t('nav.payers'), icon: 'wallet-outline', handler: () => this.go('payers') },
    ];
    if (this.role() === 'admin') {
      buttons.push({ text: t('nav.settings'), icon: 'settings-outline', handler: () => this.go('settings') });
    }
    buttons.push({ text: t('common.cancel'), role: 'cancel' });
    const sheet = await this.actionSheet.create({ header: t('tabs.more'), buttons });
    await sheet.present();
  }

  async syncNow(): Promise<void> {
    await this.sync.process('manual');
    await this.load();
  }

  async handleRefresh(event: CustomEvent): Promise<void> {
    await this.sync.process('manual');
    await this.load(false);
    (event.target as HTMLIonRefresherElement | null)?.complete();
  }

  go(section: string): void {
    void this.router.navigate(['/rooms', this.roomId, section]);
  }
}
