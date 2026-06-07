import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateLoader, provideTranslateService } from '@ngx-translate/core';
import { AppComponent } from './app.component';
import { EmbeddedTranslateLoader } from './core/i18n';
import { LocalDatabaseService } from './data/local/local-database.service';

describe('AppComponent', () => {
  it('should create the app', async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        provideTranslateService({
          fallbackLang: 'en',
          loader: { provide: TranslateLoader, useClass: EmbeddedTranslateLoader },
        }),
        {
          provide: LocalDatabaseService,
          useValue: {
            initialize: () => Promise.resolve(),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});
