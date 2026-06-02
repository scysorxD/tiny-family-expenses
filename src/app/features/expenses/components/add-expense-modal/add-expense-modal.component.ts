import { Component, Input, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalController } from '@ionic/angular/standalone';
import {
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { Beneficiary, Category, Expense } from '../../../../core/models';
import { BeneficiaryService } from '../../../../core/services/beneficiary.service';
import { CategoryService } from '../../../../core/services/category.service';
import { ExpenseService } from '../../../../core/services/expense.service';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { PeriodService } from '../../../../core/services/period.service';
import { describeError, monthKeyFromDateString, todayDateString } from '../../../../shared/utils';

const BOTH = 'both';

@Component({
  selector: 'app-add-expense-modal',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="cancel()">Cancel</ion-button>
        </ion-buttons>
        <ion-title>{{ isEdit ? 'Edit expense' : 'New expense' }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      @if (loading()) {
        <div class="ion-text-center ion-padding"><ion-spinner></ion-spinner></div>
      } @else {
        <ion-label class="field-label">Category</ion-label>
        @if (suggested().length > 0) {
          <div class="chips">
            @for (cat of suggested(); track cat.id) {
              <ion-chip
                [color]="selectedCategoryId() === cat.id ? 'primary' : undefined"
                (click)="selectCategory(cat.id)"
              >
                {{ cat.name }}
              </ion-chip>
            }
          </div>
        }
        <ion-list>
          <ion-item>
            <ion-select
              label="All categories"
              labelPlacement="stacked"
              [value]="selectedCategoryId()"
              (ionChange)="selectCategory($any($event).detail.value)"
            >
              @for (cat of categories(); track cat.id) {
                <ion-select-option [value]="cat.id">{{ cat.name }}</ion-select-option>
              }
            </ion-select>
          </ion-item>
        </ion-list>

        @if (creatingCategory()) {
          <ion-item>
            <ion-input
              label="New category"
              labelPlacement="stacked"
              [(ngModel)]="newCategoryName"
              placeholder="e.g. Pharmacy"
            ></ion-input>
            <ion-button slot="end" fill="clear" (click)="createCategory()">Add</ion-button>
          </ion-item>
        } @else {
          <ion-button size="small" fill="clear" (click)="creatingCategory.set(true)">
            + Create new category
          </ion-button>
        }

        <ion-list>
          <ion-item>
            <ion-input
              #amountInput
              label="Amount"
              labelPlacement="stacked"
              type="number"
              inputmode="decimal"
              min="0"
              placeholder="0"
              [(ngModel)]="amount"
            ></ion-input>
          </ion-item>
        </ion-list>

        @if (beneficiaryMode() === 'two') {
          <ion-label class="field-label">Applies to</ion-label>
          <ion-segment [value]="twoSegmentValue()" (ionChange)="onTwoSegment($any($event).detail.value)">
            <ion-segment-button [value]="bothValue">
              <ion-label>Both</ion-label>
            </ion-segment-button>
            @for (ben of beneficiaries(); track ben.id) {
              <ion-segment-button [value]="ben.id">
                <ion-label>{{ ben.name }}</ion-label>
              </ion-segment-button>
            }
          </ion-segment>
        } @else if (beneficiaryMode() === 'multi') {
          <ion-label class="field-label">Applies to</ion-label>
          <div class="chips">
            @for (ben of beneficiaries(); track ben.id) {
              <ion-chip
                [color]="isBeneficiarySelected(ben.id) ? 'primary' : undefined"
                (click)="toggleBeneficiary(ben.id)"
              >
                {{ ben.name }}
              </ion-chip>
            }
          </div>
        }

        <ion-list>
          <ion-item>
            <ion-input
              label="Date"
              labelPlacement="stacked"
              type="date"
              [(ngModel)]="expenseDate"
            ></ion-input>
          </ion-item>
          <ion-item>
            <ion-textarea
              label="Description (optional)"
              labelPlacement="stacked"
              [(ngModel)]="description"
              autoGrow="true"
            ></ion-textarea>
          </ion-item>
        </ion-list>

        @if (beneficiaries().length === 0) {
          <ion-note color="danger">This room has no active beneficiaries. Add one in settings.</ion-note>
        }

        <ion-button class="ion-margin-top" expand="block" (click)="save()" [disabled]="saving()">
          @if (saving()) {
            <ion-spinner name="dots"></ion-spinner>
          } @else {
            Save
          }
        </ion-button>
        @if (!isEdit) {
          <ion-button expand="block" fill="outline" (click)="saveAndAddAnother()" [disabled]="saving()">
            Save and add another
          </ion-button>
        }
      }
    </ion-content>
  `,
  styles: [
    `
      .field-label {
        display: block;
        margin: 14px 4px 6px;
        font-weight: 600;
      }
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
    `,
  ],
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonList,
    IonItem,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonChip,
    IonLabel,
    IonSegment,
    IonSegmentButton,
    IonTextarea,
    IonSpinner,
    IonNote,
  ],
})
export class AddExpenseModalComponent implements OnInit {
  @Input() roomId!: string;
  @Input() isAdmin = false;
  @Input() expense?: Expense;

  private readonly categoryService = inject(CategoryService);
  private readonly beneficiaryService = inject(BeneficiaryService);
  private readonly expenseService = inject(ExpenseService);
  private readonly periodService = inject(PeriodService);
  private readonly feedback = inject(FeedbackService);
  private readonly modalController = inject(ModalController);

  readonly categories = signal<Category[]>([]);
  readonly suggested = signal<Category[]>([]);
  readonly beneficiaries = signal<Beneficiary[]>([]);
  readonly selectedCategoryId = signal<string | null>(null);
  readonly selectedBeneficiaryIds = signal<string[]>([]);
  readonly creatingCategory = signal(false);
  readonly loading = signal(true);
  readonly saving = signal(false);

  readonly bothValue = BOTH;

  @ViewChild('amountInput') private amountInput?: IonInput;

  amount: number | null = null;
  description = '';
  expenseDate = todayDateString();
  newCategoryName = '';

  get isEdit(): boolean {
    return Boolean(this.expense);
  }

  async ngOnInit(): Promise<void> {
    try {
      const [categories, beneficiaries, suggested] = await Promise.all([
        this.categoryService.listCategories(this.roomId),
        this.beneficiaryService.list(this.roomId),
        this.categoryService.getSuggested(this.roomId, 5),
      ]);
      this.categories.set(categories);
      this.beneficiaries.set(beneficiaries);
      this.suggested.set(suggested);

      if (this.expense) {
        this.selectedCategoryId.set(this.expense.categoryId);
        this.amount = this.expense.amount;
        this.description = this.expense.description ?? '';
        this.expenseDate = this.expense.expenseDate;
        this.selectedBeneficiaryIds.set([...this.expense.beneficiaryIds]);
      } else {
        // Default beneficiary selection is "all active".
        this.selectedBeneficiaryIds.set(beneficiaries.map((ben) => ben.id));
      }
    } catch (error) {
      await this.feedback.error(describeError(error));
    } finally {
      this.loading.set(false);
      if (!this.expense) {
        this.focusAmount();
      }
    }
  }

  beneficiaryMode(): 'hidden' | 'two' | 'multi' {
    const count = this.beneficiaries().length;
    if (count <= 1) {
      return 'hidden';
    }
    return count === 2 ? 'two' : 'multi';
  }

  twoSegmentValue(): string {
    const selected = this.selectedBeneficiaryIds();
    if (selected.length >= 2) {
      return BOTH;
    }
    return selected[0] ?? BOTH;
  }

  onTwoSegment(value: string): void {
    if (value === BOTH) {
      this.selectedBeneficiaryIds.set(this.beneficiaries().map((ben) => ben.id));
    } else {
      this.selectedBeneficiaryIds.set([value]);
    }
  }

  isBeneficiarySelected(id: string): boolean {
    return this.selectedBeneficiaryIds().includes(id);
  }

  toggleBeneficiary(id: string): void {
    const current = this.selectedBeneficiaryIds();
    this.selectedBeneficiaryIds.set(
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  selectCategory(id: string): void {
    this.selectedCategoryId.set(id);
  }

  async createCategory(): Promise<void> {
    const name = this.newCategoryName.trim();
    if (!name) {
      return;
    }

    try {
      const category = await this.categoryService.createCategory(this.roomId, name);
      this.categories.set([...this.categories(), category].sort((a, b) => a.name.localeCompare(b.name)));
      this.selectedCategoryId.set(category.id);
      this.newCategoryName = '';
      this.creatingCategory.set(false);
    } catch (error) {
      await this.feedback.error(describeError(error));
    }
  }

  cancel(): void {
    void this.modalController.dismiss(null, 'cancel');
  }

  async save(): Promise<void> {
    const saved = await this.persist();
    if (saved) {
      await this.modalController.dismiss({ saved: true }, 'saved');
    }
  }

  async saveAndAddAnother(): Promise<void> {
    const saved = await this.persist();
    if (saved) {
      this.resetForNext();
    }
  }

  private async persist(): Promise<boolean> {
    const categoryId = this.selectedCategoryId();
    const amount = Number(this.amount);

    if (!categoryId) {
      await this.feedback.error('Select a category.');
      return false;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      await this.feedback.error('Enter an amount greater than zero.');
      return false;
    }
    if (this.selectedBeneficiaryIds().length === 0) {
      await this.feedback.error('Select who the expense applies to.');
      return false;
    }

    this.saving.set(true);
    try {
      const monthKey = monthKeyFromDateString(this.expenseDate);
      const period = await this.periodService.getPeriod(this.roomId, monthKey);

      if (period && period.status !== 'open') {
        const handled = await this.handleClosedMonth(monthKey);
        if (!handled) {
          return false;
        }
      }

      if (this.expense) {
        await this.expenseService.update(this.expense.id, {
          categoryId,
          amount,
          description: this.description,
          expenseDate: this.expenseDate,
          beneficiaryIds: this.selectedBeneficiaryIds(),
        });
      } else {
        await this.expenseService.create({
          roomId: this.roomId,
          categoryId,
          amount,
          description: this.description,
          expenseDate: this.expenseDate,
          beneficiaryIds: this.selectedBeneficiaryIds(),
        });
      }

      await this.feedback.success(this.isEdit ? 'Expense updated' : 'Expense saved');
      return true;
    } catch (error) {
      await this.feedback.error(describeError(error));
      return false;
    } finally {
      this.saving.set(false);
    }
  }

  private resetForNext(): void {
    this.amount = null;
    this.description = '';
    this.creatingCategory.set(false);
    void this.focusAmount();
  }

  private focusAmount(): void {
    setTimeout(() => {
      void this.amountInput?.setFocus();
    }, 120);
  }

  private async handleClosedMonth(monthKey: string): Promise<boolean> {
    if (!this.isAdmin) {
      await this.feedback.error('This month is already closed. You cannot add expenses.');
      return false;
    }

    const reopen = await this.feedback.confirm(
      'Month closed',
      'That month is closed. Reopen it to save this expense?',
      'Reopen',
    );
    if (!reopen) {
      return false;
    }

    await this.periodService.reopenPeriod(this.roomId, monthKey);
    return true;
  }
}
