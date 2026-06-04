import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  ActionSheetController,
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
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { Category } from '../../../../core/models';
import { CategoryService } from '../../../../core/services/category.service';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { CategoryIconComponent } from '../../../../shared/ui';
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
    <ion-content>
      @if (loading()) {
        <div class="center-pad"><ion-spinner></ion-spinner></div>
      } @else {
        <div class="page-pad">
          @if (categories().length === 0) {
            <div class="app-card text-muted">No categories yet. Tap + to add one.</div>
          } @else {
            <div class="list-card">
              <ion-list>
                @for (category of categories(); track category.id) {
                  <ion-item button detail="false" (click)="openActions(category)">
                    <app-category-icon slot="start" [name]="category.name"></app-category-icon>
                    <ion-label [class.inactive]="!category.isActive">{{ category.name }}</ion-label>
                    @if (!category.isActive) {
                      <ion-badge slot="end" color="medium">inactive</ion-badge>
                    }
                    <ion-icon slot="end" name="ellipsis-vertical" class="row-more"></ion-icon>
                  </ion-item>
                }
              </ion-list>
            </div>
          }
        </div>
      }
    </ion-content>
  `,
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
    IonIcon,
    IonSpinner,
    CategoryIconComponent,
  ],
})
export class CategoryListPage {
  private readonly route = inject(ActivatedRoute);
  private readonly categoryService = inject(CategoryService);
  private readonly feedback = inject(FeedbackService);
  private readonly actionSheet = inject(ActionSheetController);

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

  async openActions(category: Category): Promise<void> {
    const sheet = await this.actionSheet.create({
      header: category.name,
      buttons: [
        { text: 'Rename', icon: 'create-outline', handler: () => void this.rename(category) },
        {
          text: category.isActive ? 'Deactivate' : 'Activate',
          icon: category.isActive ? 'close-outline' : 'checkmark-circle-outline',
          handler: () => void this.toggleActive(category),
        },
        { text: 'Delete', role: 'destructive', icon: 'trash-outline', handler: () => void this.remove(category) },
        { text: 'Cancel', role: 'cancel' },
      ],
    });
    await sheet.present();
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
