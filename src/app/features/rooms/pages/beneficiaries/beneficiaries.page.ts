import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonIcon,
} from '@ionic/angular/standalone';
import { Beneficiary } from '../../../../core/models';
import { BeneficiaryService } from '../../../../core/services/beneficiary.service';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { RoomService } from '../../../../core/services/room.service';
import {
  ManagedListComponent,
  ManagedListItem,
  PageHeaderComponent,
} from '../../../../shared/components';
import { AppSkeletonComponent, EmptyStateComponent } from '../../../../shared/ui';
import { describeError } from '../../../../shared/utils';

@Component({
  selector: 'app-beneficiaries',
  template: `
    <app-page-header title="Beneficiaries" [defaultHref]="backHref">
      <ion-buttons slot="end" end>
        <ion-button (click)="create()" [disabled]="!isAdmin()">
          <ion-icon slot="icon-only" name="add"></ion-icon>
        </ion-button>
      </ion-buttons>
    </app-page-header>
    <ion-content>
      @if (loading()) {
        <app-skeleton variant="list"></app-skeleton>
      } @else {
        <div class="page-pad">
          @if (!isAdmin()) {
            <div class="app-card text-muted">Only admins can manage beneficiaries.</div>
          } @else if (items().length === 0) {
            <app-empty-state
              icon="person-outline"
              title="No beneficiaries yet"
              message="Add who expenses are for, e.g. Mom or Dad."
              actionLabel="Add beneficiary"
              (action)="create()"
            ></app-empty-state>
          } @else {
            <app-managed-list
              [items]="items()"
              leadingIcon="person-outline"
              (rename)="rename($event)"
              (toggleActive)="toggle($event)"
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
export class BeneficiariesPage {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(BeneficiaryService);
  private readonly roomService = inject(RoomService);
  private readonly feedback = inject(FeedbackService);

  readonly items = signal<Beneficiary[]>([]);
  readonly loading = signal(true);
  readonly isAdmin = signal(false);

  private get roomId(): string {
    return this.route.snapshot.paramMap.get('roomId') ?? '';
  }

  get backHref(): string {
    return `/rooms/${this.roomId}/settings`;
  }

  async ionViewWillEnter(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const [role, beneficiaries] = await Promise.all([
        this.roomService.getMyRole(this.roomId),
        this.service.list(this.roomId, true),
      ]);
      this.isAdmin.set(role === 'admin');
      this.items.set(beneficiaries);
    } catch (error) {
      await this.feedback.error(describeError(error));
    } finally {
      this.loading.set(false);
    }
  }

  async create(): Promise<void> {
    const name = await this.feedback.prompt('New beneficiary', '', 'e.g. Mom');
    if (!name) {
      return;
    }
    try {
      await this.service.create(this.roomId, name);
      await this.load();
    } catch (error) {
      await this.feedback.error(describeError(error));
    }
  }

  async rename(item: ManagedListItem): Promise<void> {
    const name = await this.feedback.prompt('Rename beneficiary', item.name);
    if (!name || name === item.name) {
      return;
    }
    try {
      await this.service.rename(item.id, name);
      await this.load();
    } catch (error) {
      await this.feedback.error(describeError(error));
    }
  }

  async toggle(item: ManagedListItem): Promise<void> {
    try {
      await this.service.setActive(item.id, !item.isActive);
      await this.load();
    } catch (error) {
      await this.feedback.error(describeError(error));
    }
  }

  async remove(item: ManagedListItem): Promise<void> {
    const confirmed = await this.feedback.confirm(
      'Delete beneficiary',
      `Delete "${item.name}"? Beneficiaries with expenses cannot be deleted.`,
      'Delete',
    );
    if (!confirmed) {
      return;
    }

    try {
      await this.service.delete(item.id);
      await this.feedback.success('Beneficiary deleted');
      await this.load();
    } catch (error) {
      await this.feedback.error(describeError(error));
    }
  }
}
