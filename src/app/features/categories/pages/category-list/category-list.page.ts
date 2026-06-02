import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { Category } from '../../../../core/models';
import { CategoryService } from '../../../../core/services/category.service';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { describeError } from '../../../../shared/utils';

@Component({
  selector: 'app-category-list',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button [defaultHref]="backHref"></ion-back-button>
        </ion-buttons>
        <ion-title>Categories</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="create()">
            <ion-icon slot="icon-only" name="add"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      @if (loading()) {
        <div class="ion-text-center ion-padding"><ion-spinner></ion-spinner></div>
      } @else if (categories().length === 0) {
        <ion-note class="ion-padding">No categories yet. Tap + to add one.</ion-note>
      } @else {
        <ion-list>
          @for (category of categories(); track category.id) {
            <ion-item>
              <ion-label [class.inactive]="!category.isActive">{{ category.name }}</ion-label>
              @if (!category.isActive) {
                <ion-badge slot="end" color="medium">inactive</ion-badge>
              }
              <ion-button fill="clear" slot="end" (click)="rename(category)">
                <ion-icon slot="icon-only" name="create-outline"></ion-icon>
              </ion-button>
              <ion-button fill="clear" slot="end" (click)="toggleActive(category)">
                {{ category.isActive ? 'Deactivate' : 'Activate' }}
              </ion-button>
              <ion-button fill="clear" color="danger" slot="end" (click)="remove(category)">
                <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
              </ion-button>
            </ion-item>
          }
        </ion-list>
      }
    </ion-content>
  `,
  styles: [
    `
      .inactive {
        text-decoration: line-through;
        opacity: 0.6;
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
    IonIcon,
    IonSpinner,
  ],
})
export class CategoryListPage {
  private readonly route = inject(ActivatedRoute);
  private readonly categoryService = inject(CategoryService);
  private readonly feedback = inject(FeedbackService);

  readonly categories = signal<Category[]>([]);
  readonly loading = signal(true);

  private get roomId(): string {
    return this.route.snapshot.paramMap.get('roomId') ?? '';
  }

  get backHref(): string {
    return `/rooms/${this.roomId}`;
  }

  async ionViewWillEnter(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.categories.set(await this.categoryService.listCategories(this.roomId, true));
    } catch (error) {
      await this.feedback.error(describeError(error));
    } finally {
      this.loading.set(false);
    }
  }

  async create(): Promise<void> {
    const name = await this.feedback.prompt('New category', '', 'e.g. Medicine');
    if (!name) {
      return;
    }
    try {
      await this.categoryService.createCategory(this.roomId, name);
      await this.load();
    } catch (error) {
      await this.feedback.error(describeError(error));
    }
  }

  async rename(category: Category): Promise<void> {
    const name = await this.feedback.prompt('Rename category', category.name);
    if (!name || name === category.name) {
      return;
    }
    try {
      await this.categoryService.renameCategory(category.id, name);
      await this.load();
    } catch (error) {
      await this.feedback.error(describeError(error));
    }
  }

  async toggleActive(category: Category): Promise<void> {
    try {
      await this.categoryService.setActive(category.id, !category.isActive);
      await this.load();
    } catch (error) {
      await this.feedback.error(describeError(error));
    }
  }

  async remove(category: Category): Promise<void> {
    const confirmed = await this.feedback.confirm(
      'Delete category',
      `Delete "${category.name}"? Categories with expenses cannot be deleted.`,
      'Delete',
    );
    if (!confirmed) {
      return;
    }
    try {
      await this.categoryService.deleteCategory(category.id);
      await this.feedback.success('Category deleted');
      await this.load();
    } catch (error) {
      await this.feedback.error(describeError(error));
    }
  }
}
