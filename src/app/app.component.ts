import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { LocalDatabaseService } from './data/local/local-database.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  private readonly localDatabase = inject(LocalDatabaseService);

  constructor() {
    void this.localDatabase.initialize();
  }
}
