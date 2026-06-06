import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonIcon,
} from '@ionic/angular/standalone';
import { Payer } from '../../../../core/models';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { PayerService } from '../../../../core/services/payer.service';
import { RoomService } from '../../../../core/services/room.service';
import {
  ManagedListComponent,
  ManagedListItem,
  PageHeaderComponent,
} from '../../../../shared/components';
import { AppSkeletonComponent, EmptyStateComponent } from '../../../../shared/ui';
import { describeError } from '../../../../shared/utils';

@Component({
  selector: 'app-payers',
  template: `
    <app-page-header title="Payers" [defaultHref]="backHref">
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
            <div class="app-card text-muted">Only admins can manage payers.</div>
          } @else if (items().length === 0) {
            <app-empty-state
              icon="wallet-outline"
              title="No payers yet"
              message="Add who splits the bill, e.g. Sibling 1."
              actionLabel="Add payer"
              (action)="create()"
            ></app-empty-state>
          } @else {
            <app-managed-list
              [items]="items()"
              leadingIcon="wallet-outline"
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
export class PayersPage {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(PayerService);
  private readonly roomService = inject(RoomService);
  private readonly feedback = inject(FeedbackService);

  readonly items = signal<Payer[]>([]);
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
      const [role, payers] = await Promise.all([
        this.roomService.getMyRole(this.roomId),
        this.service.list(this.roomId, true),
      ]);
      this.isAdmin.set(role === 'admin');
      this.items.set(payers);
    } catch (error) {
      await this.feedback.error(describeError(error));
    } finally {
      this.loading.set(false);
    }
  }

  async create(): Promise<void> {
    const name = await this.feedback.prompt('New payer', '', 'e.g. Sibling 1');
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
    const name = await this.feedback.prompt('Rename payer', item.name);
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
      'Delete payer',
      `Delete "${item.name}"? Payers with closed-period payment history cannot be deleted.`,
      'Delete',
    );
    if (!confirmed) {
      return;
    }

    try {
      await this.service.delete(item.id);
      await this.feedback.success('Payer deleted');
      await this.load();
    } catch (error) {
      await this.feedback.error(describeError(error));
    }
  }
}
