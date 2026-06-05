import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ActionSheetButton, ActionSheetController } from '@ionic/angular/standalone';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { Room, RoomRole, SyncQueueItem } from '../../../../core/models';
import { FeedbackService } from '../../../../core/services/feedback.service';
import { PeriodService } from '../../../../core/services/period.service';
import { RoomService } from '../../../../core/services/room.service';
import { SyncQueueService } from '../../../../core/services/sync-queue.service';
import {
  AppSkeletonComponent,
  EmptyStateComponent,
  StatusPillComponent,
  StatusTone,
} from '../../../../shared/ui';
import {
  describeError,
  formatRoomAmount,
  monthKeyFromDateString,
  monthLabel,
} from '../../../../shared/utils';

interface QueueRow {
  item: SyncQueueItem;
  title: string;
  subtitle: string;
  monthKey?: string;
  tone: StatusTone;
  statusLabel: string;
}

@Component({
  selector: 'app-sync-status',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button [defaultHref]="backHref"></ion-back-button>
        </ion-buttons>
        <ion-title>Sync status</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="syncAll()" [disabled]="sync.syncing()">
            <ion-icon slot="icon-only" name="sync-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      @if (loading()) {
        <app-skeleton variant="list"></app-skeleton>
      } @else if (rows().length === 0) {
        <app-empty-state
          icon="cloud-done-outline"
          title="Everything is synced"
          message="There are no pending changes or conflicts."
        ></app-empty-state>
      } @else {
        <div class="page-pad">
          @if (conflicts().length > 0) {
            <h2 class="section-title">Conflicts</h2>
            <div class="list-card">
              <ion-list>
                @for (row of conflicts(); track row.item.localId) {
                  <ion-item button detail="false" (click)="openActions(row)">
                    <span slot="start" class="lead-icon danger"><ion-icon name="warning-outline"></ion-icon></span>
                    <ion-label>
                      <h3 class="row-title">{{ row.title }}</h3>
                      <p class="label-muted">{{ row.subtitle }}</p>
                    </ion-label>
                    <app-status-pill slot="end" [label]="row.statusLabel" [tone]="row.tone"></app-status-pill>
                  </ion-item>
                }
              </ion-list>
            </div>
          }

          @if (others().length > 0) {
            <h2 class="section-title">Pending changes</h2>
            <div class="list-card">
              <ion-list>
                @for (row of others(); track row.item.localId) {
                  <ion-item button detail="false" (click)="openActions(row)">
                    <span slot="start" class="lead-icon"><ion-icon name="time-outline"></ion-icon></span>
                    <ion-label>
                      <h3 class="row-title">{{ row.title }}</h3>
                      <p class="label-muted">{{ row.subtitle }}</p>
                    </ion-label>
                    <app-status-pill slot="end" [label]="row.statusLabel" [tone]="row.tone"></app-status-pill>
                  </ion-item>
                }
              </ion-list>
            </div>
          }
        </div>
      }
    </ion-content>
  `,
  styles: [
    `
      .row-title {
        font-weight: 700;
        margin: 0;
      }
      .lead-icon.danger {
        background: var(--app-danger-soft);
        color: var(--app-danger-ink);
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
    IonIcon,
    AppSkeletonComponent,
    EmptyStateComponent,
    StatusPillComponent,
  ],
})
export class SyncStatusPage {
  private readonly route = inject(ActivatedRoute);
  private readonly roomService = inject(RoomService);
  private readonly periodService = inject(PeriodService);
  private readonly feedback = inject(FeedbackService);
  private readonly actionSheet = inject(ActionSheetController);
  readonly sync = inject(SyncQueueService);

  readonly room = signal<Room | null>(null);
  readonly role = signal<RoomRole | null>(null);
  readonly rows = signal<QueueRow[]>([]);
  readonly loading = signal(true);

  readonly conflicts = computed(() => this.rows().filter((row) => row.item.status === 'conflict'));
  readonly others = computed(() => this.rows().filter((row) => row.item.status !== 'conflict'));

  get roomId(): string {
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
      const [room, role, items] = await Promise.all([
        this.roomService.getRoom(this.roomId),
        this.roomService.getMyRole(this.roomId),
        this.sync.listItems(),
      ]);
      this.room.set(room);
      this.role.set(role);
      this.rows.set(items.map((item) => this.toRow(item)));
    } catch (error) {
      await this.feedback.error(describeError(error));
    } finally {
      this.loading.set(false);
    }
  }

  private toRow(item: SyncQueueItem): QueueRow {
    const payload = item.payload as { amount?: number; expenseDate?: string };
    const title = this.titleFor(item);
    const parts: string[] = [];
    if (typeof payload.amount === 'number') {
      parts.push(this.format(payload.amount));
    }
    if (payload.expenseDate) {
      parts.push(payload.expenseDate);
    }
    if (item.errorMessage) {
      parts.push(item.errorMessage);
    }
    let monthKey: string | undefined;
    if (payload.expenseDate) {
      try {
        monthKey = monthKeyFromDateString(payload.expenseDate);
      } catch {
        monthKey = undefined;
      }
    }
    return {
      item,
      title,
      subtitle: parts.join(' · ') || 'Waiting to sync',
      monthKey,
      tone: item.status === 'conflict' ? 'danger' : item.status === 'sync_failed' ? 'warning' : 'muted',
      statusLabel: item.status === 'sync_failed' ? 'failed' : item.status.replace('_sync', ''),
    };
  }

  private titleFor(item: SyncQueueItem): string {
    const noun = item.entityType.charAt(0).toUpperCase() + item.entityType.slice(1);
    switch (item.operation) {
      case 'create':
        return `New ${item.entityType}`;
      case 'update':
        return `Edited ${item.entityType}`;
      case 'delete':
        return `Deleted ${item.entityType}`;
      default:
        return noun;
    }
  }

  format(amount: number): string {
    return formatRoomAmount(amount, this.room()?.currency ?? 'ARS');
  }

  async openActions(row: QueueRow): Promise<void> {
    const buttons: ActionSheetButton[] = [
      { text: 'Retry now', icon: 'refresh-outline', handler: () => void this.retry(row) },
    ];
    if (this.role() === 'admin' && row.monthKey && row.item.status === 'conflict') {
      buttons.push({
        text: `Reopen ${monthLabel(row.monthKey)} & retry`,
        icon: 'lock-closed-outline',
        handler: () => void this.reopenAndRetry(row),
      });
    }
    buttons.push({
      text: 'Discard change',
      role: 'destructive',
      icon: 'trash-outline',
      handler: () => void this.discard(row),
    });
    buttons.push({ text: 'Cancel', role: 'cancel' });

    const sheet = await this.actionSheet.create({ header: row.title, buttons });
    await sheet.present();
  }

  private async retry(row: QueueRow): Promise<void> {
    try {
      await this.sync.retry(row.item);
    } catch (error) {
      await this.feedback.error(describeError(error));
    }
    await this.load();
  }

  private async reopenAndRetry(row: QueueRow): Promise<void> {
    if (!row.monthKey) {
      return;
    }
    try {
      await this.periodService.reopenPeriod(this.roomId, row.monthKey);
      await this.sync.retry(row.item);
      await this.feedback.success('Month reopened and change re-synced');
    } catch (error) {
      await this.feedback.error(describeError(error));
    }
    await this.load();
  }

  private async discard(row: QueueRow): Promise<void> {
    const confirmed = await this.feedback.confirm(
      'Discard change',
      'This pending change will be removed and not synced. Continue?',
      'Discard',
    );
    if (!confirmed) {
      return;
    }
    try {
      await this.sync.discard(row.item);
    } catch (error) {
      await this.feedback.error(describeError(error));
    }
    await this.load();
  }

  async syncAll(): Promise<void> {
    await this.sync.process('manual');
    await this.load();
  }
}
