import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import {
  ActionSheetController,
  IonBadge,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
} from '@ionic/angular/standalone';
import { CategoryIconComponent } from '../ui';

export interface ManagedListItem {
  id: string;
  name: string;
  isActive: boolean;
}

@Component({
  selector: 'app-managed-list',
  template: `
    <div class="list-card">
      <ion-list>
        @for (item of items; track item.id) {
          <ion-item button detail="false" (click)="openActions(item)">
            @if (iconMode === 'category') {
              <app-category-icon slot="start" [name]="item.name"></app-category-icon>
            } @else {
              <span slot="start" class="lead-icon"><ion-icon [name]="leadingIcon"></ion-icon></span>
            }
            <ion-label [class.inactive]="!item.isActive">{{ item.name }}</ion-label>
            @if (!item.isActive) {
              <ion-badge slot="end" color="medium">inactive</ion-badge>
            }
            <ion-icon slot="end" name="ellipsis-vertical" class="row-more"></ion-icon>
          </ion-item>
        }
      </ion-list>
    </div>
  `,
  imports: [IonList, IonItem, IonLabel, IonBadge, IonIcon, CategoryIconComponent],
})
export class ManagedListComponent {
  @Input() items: ManagedListItem[] = [];
  @Input() iconMode: 'fixed' | 'category' = 'fixed';
  @Input() leadingIcon = 'pricetag-outline';

  @Output() rename = new EventEmitter<ManagedListItem>();
  @Output() toggleActive = new EventEmitter<ManagedListItem>();
  @Output() delete = new EventEmitter<ManagedListItem>();

  private readonly actionSheet = inject(ActionSheetController);

  async openActions(item: ManagedListItem): Promise<void> {
    const sheet = await this.actionSheet.create({
      header: item.name,
      buttons: [
        { text: 'Rename', icon: 'create-outline', handler: () => this.rename.emit(item) },
        {
          text: item.isActive ? 'Deactivate' : 'Activate',
          icon: item.isActive ? 'close-outline' : 'checkmark-circle-outline',
          handler: () => this.toggleActive.emit(item),
        },
        { text: 'Delete', role: 'destructive', icon: 'trash-outline', handler: () => this.delete.emit(item) },
        { text: 'Cancel', role: 'cancel' },
      ],
    });
    await sheet.present();
  }
}
