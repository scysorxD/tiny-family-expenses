import { Component, inject } from '@angular/core';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  add,
  alertCircleOutline,
  arrowBack,
  calendarOutline,
  cashOutline,
  checkmarkCircle,
  chevronBack,
  chevronForward,
  cloudDoneOutline,
  cloudOfflineOutline,
  closeOutline,
  copyOutline,
  createOutline,
  ellipsisVertical,
  listOutline,
  lockClosedOutline,
  peopleOutline,
  pricetagsOutline,
  receiptOutline,
  refresh,
  saveOutline,
  settingsOutline,
  shareSocialOutline,
  statsChartOutline,
  syncOutline,
  trashOutline,
  walletOutline,
  warningOutline,
} from 'ionicons/icons';
import { AuthService } from './core/auth/auth.service';
import { SyncQueueService } from './core/services/sync-queue.service';
import { LocalDatabaseService } from './data/local/local-database.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  private readonly localDatabase = inject(LocalDatabaseService);
  private readonly auth = inject(AuthService);
  private readonly syncQueue = inject(SyncQueueService);

  constructor() {
    addIcons({
      add,
      alertCircleOutline,
      arrowBack,
      calendarOutline,
      cashOutline,
      checkmarkCircle,
      chevronBack,
      chevronForward,
      cloudDoneOutline,
      cloudOfflineOutline,
      closeOutline,
      copyOutline,
      createOutline,
      ellipsisVertical,
      listOutline,
      lockClosedOutline,
      peopleOutline,
      pricetagsOutline,
      receiptOutline,
      refresh,
      saveOutline,
      settingsOutline,
      shareSocialOutline,
      statsChartOutline,
      syncOutline,
      trashOutline,
      walletOutline,
      warningOutline,
    });

    void this.auth.ensureInitialized();

    // SQLite and the sync queue are only available on native platforms; web/dev uses the online path.
    if (Capacitor.isNativePlatform()) {
      void this.initNative();
    }
  }

  private async initNative(): Promise<void> {
    await this.localDatabase.initialize();
    this.syncQueue.start();
    await App.addListener('resume', () => void this.syncQueue.process('resume'));
  }
}
