import { inject, provideAppInitializer } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { TranslateLoader, provideTranslateService } from '@ngx-translate/core';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { EmbeddedTranslateLoader, LanguageService } from './app/core/i18n';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    provideTranslateService({
      fallbackLang: 'en',
      lang: 'en',
      loader: { provide: TranslateLoader, useClass: EmbeddedTranslateLoader },
    }),
    provideAppInitializer(() => inject(LanguageService).init()),
  ],
});
