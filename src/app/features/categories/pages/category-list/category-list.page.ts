import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonIcon,
} from '@ionic/angular/standalone';
import { Category } from '../../../../core/models';
import { CategoryService } from '../../../../core/services/category.service';
import { FeedbackService } from '../../../../core/services/feedback.service';
import {
  ManagedListComponent,
  ManagedListItem,
  PageHeaderComponent,
} from '../../../../shared/components';
import { AppSkeletonComponent, EmptyStateComponent } from '../../../../shared/ui';
import { describeError } from '../../../../shared/utils';

@Component({
  selector: 'app-category-list',
  template: `
    <app-page-header title="Categories" [defaultHref]="backHref">
      <ion-buttons slot="end" end>
        <ion-button (click)="create()">
          <ion-icon slot="icon-only" name="add"></ion-icon>
        </ion-button>
      </ion-buttons>
    </app-page-header>
    <ion-content>
      @if (loading()) {
        <app-skeleton variant="list"></app-skeleton>
      } @else {
        <div class="page-pad">
          @if (categories().length === 0) {
            <app-empty-state
              icon="pricetag-outline"
              title="No categories yet"
              message="Add categories like Food, Transport or Medicine to organize expenses."
              actionLabel="Add category"
              (action)="create()"
            ></app-empty-state>
          } @else {
            <app-managed-list
              [items]="categories()"
              iconMode="category"
              (rename)="rename($event)"
              (toggleActive)="toggleActive($event)"
              (delete)="remove($event)"
            ></app-managed-list>
          }
        </div>
      }
    </ion-content>
  `,
  imports: [
    IonButtons,
    IonButton,
    IonContent,
    IonIcon,
    PageHeaderComponent,
    ManagedListComponent,
    AppSkeletonComponent,
    EmptyStateComponent,
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

  async rename(category: ManagedListItem): Promise<void> {
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

  async toggleActive(category: ManagedListItem): Promise<void> {
    try {
      await this.categoryService.setActive(category.id, !category.isActive);
      await this.load();
    } catch (error) {
      await this.feedback.error(describeError(error));
    }
  }

  async remove(category: ManagedListItem): Promise<void> {
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
