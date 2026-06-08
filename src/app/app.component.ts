import { AfterViewInit, Component, inject } from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
} from '@angular/router';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  add,
  addCircleOutline,
  alertCircleOutline,
  arrowBack,
  calendarOutline,
  carOutline,
  cartOutline,
  cashOutline,
  checkmarkCircle,
  checkmarkCircleOutline,
  chevronBack,
  chevronDownOutline,
  chevronForward,
  cloudDoneOutline,
  cloudOfflineOutline,
  closeOutline,
  copyOutline,
  createOutline,
  ellipsisHorizontal,
  ellipsisVertical,
  gridOutline,
  home,
  homeOutline,
  keyOutline,
  listOutline,
  lockClosedOutline,
  mailOutline,
  medkitOutline,
  peopleOutline,
  personCircleOutline,
  personOutline,
  pieChartOutline,
  pricetagOutline,
  pricetagsOutline,
  receiptOutline,
  refresh,
  refreshOutline,
  restaurantOutline,
  saveOutline,
  settingsOutline,
  shareSocialOutline,
  sparklesOutline,
  statsChartOutline,
  syncOutline,
  timeOutline,
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
export class AppComponent implements AfterViewInit {
  private readonly localDatabase = inject(LocalDatabaseService);
  private readonly auth = inject(AuthService);
  private readonly syncQueue = inject(SyncQueueService);
  private readonly router = inject(Router);

  constructor() {
    console.log('[App] AppComponent initialized');
    this.logNavigationEvents();
    addIcons({
      add,
      addCircleOutline,
      alertCircleOutline,
      arrowBack,
      calendarOutline,
      carOutline,
      cartOutline,
      cashOutline,
      checkmarkCircle,
      checkmarkCircleOutline,
      chevronBack,
      chevronDownOutline,
      chevronForward,
      cloudDoneOutline,
      cloudOfflineOutline,
      closeOutline,
      copyOutline,
      createOutline,
      ellipsisHorizontal,
      ellipsisVertical,
      gridOutline,
      home,
      homeOutline,
      keyOutline,
      listOutline,
      lockClosedOutline,
      mailOutline,
      medkitOutline,
      peopleOutline,
      personCircleOutline,
      personOutline,
      pieChartOutline,
      pricetagOutline,
      pricetagsOutline,
      receiptOutline,
      refresh,
      refreshOutline,
      restaurantOutline,
      saveOutline,
      settingsOutline,
      shareSocialOutline,
      sparklesOutline,
      statsChartOutline,
      syncOutline,
      timeOutline,
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

  ngAfterViewInit(): void {
    console.log('[Layout] ion-router-outlet rendered');
    console.log(`[Router] initial url ${this.router.url}`);
  }

  private logNavigationEvents(): void {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        console.log(`[Router] NavigationStart ${event.url}`);
      } else if (event instanceof NavigationEnd) {
        console.log(`[Router] NavigationEnd ${event.urlAfterRedirects}`);
      } else if (event instanceof NavigationCancel) {
        console.warn(`[Router] NavigationCancel ${event.url} reason=${event.reason}`);
      } else if (event instanceof NavigationError) {
        console.error(`[Router] NavigationError ${event.url}`, event.error);
      }
    });
  }

  private async initNative(): Promise<void> {
    await this.localDatabase.initialize();
    this.syncQueue.start();
    await App.addListener('resume', () => void this.syncQueue.process('resume'));
  }
}
