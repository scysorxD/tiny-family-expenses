import { Injectable } from '@angular/core';
import { TranslateLoader, TranslationObject } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { en } from './locales/en';
import { es } from './locales/es';
import { ptBR } from './locales/pt-BR';

export type AppLang = 'en' | 'es' | 'pt-BR';

export const APP_LANGS: AppLang[] = ['en', 'es', 'pt-BR'];
export const DEFAULT_LANG: AppLang = 'en';

const TRANSLATIONS: Record<AppLang, TranslationObject> = {
  en,
  es,
  'pt-BR': ptBR,
};

// Translations are bundled with the app, so the loader resolves synchronously
// (no HTTP, works fully offline and avoids an untranslated first render).
@Injectable()
export class EmbeddedTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<TranslationObject> {
    return of(TRANSLATIONS[lang as AppLang] ?? en);
  }
}
