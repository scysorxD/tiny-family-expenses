import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonSpinner,
  IonTextarea,
  IonToggle,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Category, Expense, Period, Room } from '../../../../core/models';
import { LanguageService } from '../../../../core/i18n';
import { CategoryService } from '../../../../core/services/category.service';
import { ExpenseService } from '../../../../core/services/expense.service';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { PeriodService } from '../../../../core/services/period.service';
import { RoomService } from '../../../../core/services/room.service';
import { ShareService } from '../../../../core/services/share.service';
import { PageHeaderComponent } from '../../../../shared/components';
import {
  CategoryBreakdownItem,
  describeError,
  formatRoomAmount,
  generateCollectionMessage,
  monthLabel,
  toMonthKey,
} from '../../../../shared/utils';

@Component({
  selector: 'app-collection-message',
  template: `
    <app-page-header [title]="'collections.title' | translate" [defaultHref]="backHref"></app-page-header>
    <ion-content>
      @if (loading()) {
        <div class="center-pad"><ion-spinner></ion-spinner></div>
      } @else if (!period() || period()?.status === 'open') {
        <div class="page-pad">
          <div class="app-card text-muted">
            {{ 'collections.closeFirst' | translate }}
          </div>
        </div>
      } @else {
        <div class="page-pad">
          <div class="app-card">
            <p class="label-muted system">
              {{
                'collections.systemLine'
                  | translate
                    : {
                        total: format(period()?.systemTotal ?? 0),
                        count: period()?.payerCount,
                        each: format(period()?.systemAmountPerPayer ?? 0)
                      }
              }}
            </p>
          </div>

          <div class="app-card toggle-card">
            <ion-toggle [(ngModel)]="includeDetail" (ionChange)="regenerate()">{{ 'collections.includeDetail' | translate }}</ion-toggle>
          </div>

          <h2 class="field-label">{{ 'summary.message' | translate }}</h2>
          <ion-textarea
            fill="outline"
            [(ngModel)]="message"
            [autoGrow]="true"
            rows="10"
          ></ion-textarea>

          <span class="link-action regen" (click)="regenerate()">
            <ion-icon name="refresh"></ion-icon> {{ 'collections.regenerate' | translate }}
          </span>

          <div class="actions">
            <ion-button (click)="copy()">
              <ion-icon slot="start" name="copy-outline"></ion-icon> {{ 'common.copy' | translate }}
            </ion-button>
            <ion-button (click)="share()">
              <ion-icon slot="start" name="share-social-outline"></ion-icon> {{ 'common.share' | translate }}
            </ion-button>
            <ion-button fill="outline" (click)="saveDraft()">
              <ion-icon slot="start" name="save-outline"></ion-icon> {{ 'common.save' | translate }}
            </ion-button>
          </div>
        </div>
      }
    </ion-content>
  `,
  styles: [
    `
      .system {
        font-size: 0.85rem;
        margin: 0;
      }
      .toggle-card {
        display: flex;
      }
      .field-label {
        font-weight: 700;
        font-size: 1rem;
        margin: 18px 0 8px;
      }
      .regen {
        display: inline-flex;
        margin-top: 10px;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 16px;
      }
      .actions ion-button {
        flex: 1;
        min-width: 120px;
        margin: 0;
      }
    `,
  ],
  imports: [
    FormsModule,
    IonButton,
    IonContent,
    IonTextarea,
    IonToggle,
    IonIcon,
    IonSpinner,
    PageHeaderComponent,
    TranslatePipe,
  ],
})
export class CollectionMessagePage {
  private readonly route = inject(ActivatedRoute);
  private readonly roomService = inject(RoomService);
  private readonly periodService = inject(PeriodService);
  private readonly expenseService = inject(ExpenseService);
  private readonly categoryService = inject(CategoryService);
  private readonly shareService = inject(ShareService);
  private readonly feedback = inject(FeedbackService);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);

  readonly room = signal<Room | null>(null);
  readonly period = signal<Period | null>(null);
  readonly loading = signal(true);

  private breakdown: CategoryBreakdownItem[] = [];
  private monthKey = toMonthKey(new Date());

  message = '';
  includeDetail = true;

  private get roomId(): string {
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
      const [room, period, expenses, categories] = await Promise.all([
        this.roomService.getRoom(this.roomId),
        this.periodService.getPeriod(this.roomId, this.monthKey),
        this.expenseService.listByMonth(this.roomId, this.monthKey),
        this.categoryService.listCategories(this.roomId, true),
      ]);

      this.room.set(room);
      this.period.set(period);
      this.includeDetail = room?.includeDetailInMessage ?? true;
      this.breakdown = this.buildBreakdown(expenses, categories);

      if (period?.finalMessage) {
        this.message = period.finalMessage;
      } else if (period && period.status !== 'open') {
        this.regenerate();
      }
    } catch (error) {
      await this.feedback.error(describeError(error));
    } finally {
      this.loading.set(false);
    }
  }

  private buildBreakdown(expenses: Expense[], categories: Category[]): CategoryBreakdownItem[] {
    const names = new Map(categories.map((c) => [c.id, c.name]));
    const totals = new Map<string, number>();
    for (const expense of expenses) {
      totals.set(expense.categoryId, (totals.get(expense.categoryId) ?? 0) + expense.amount);
    }
    return [...totals.entries()]
      .map(([categoryId, amount]) => ({
        categoryName: names.get(categoryId) ?? this.translate.instant('common.category'),
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  format(amount: number): string {
    return formatRoomAmount(amount, this.room()?.currency ?? 'ARS');
  }

  regenerate(): void {
    const period = this.period();
    if (!period) {
      return;
    }
    this.message = generateCollectionMessage(
      {
        monthLabel: monthLabel(this.monthKey, this.language.locale),
        total: period.systemTotal ?? 0,
        payerCount: period.payerCount ?? 0,
        amountPerPayer: period.systemAmountPerPayer ?? 0,
        categoryBreakdown: this.breakdown,
        includeDetail: this.includeDetail,
        currency: this.room()?.currency ?? 'ARS',
      },
      (key, params) => this.translate.instant(key, params),
    );
  }

  private async persist(): Promise<void> {
    const period = this.period();
    if (period) {
      await this.periodService.saveFinalMessage(period.id, this.message);
    }
  }

  async copy(): Promise<void> {
    await this.shareService.copy(this.message);
    await this.persist();
    await this.feedback.success(this.translate.instant('collections.copiedSaved'));
  }

  async share(): Promise<void> {
    await this.persist();
    await this.shareService.share(this.message, this.translate.instant('collections.shareTitle'));
  }

  async saveDraft(): Promise<void> {
    await this.persist();
    await this.feedback.success(this.translate.instant('collections.saved'));
  }
}
