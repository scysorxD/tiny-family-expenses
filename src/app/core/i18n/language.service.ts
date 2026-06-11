import { Injectable, inject, signal } from '@angular/core';
import { Device } from '@capacitor/device';
import { TranslateService } from '@ngx-translate/core';
import { APP_LANGS, AppLang, DEFAULT_LANG } from './embedded-loader';

const LOCALE_BY_LANG: Record<AppLang, string> = {
  en: 'en-US',
  es: 'es',
  'pt-BR': 'pt-BR',
};

// Maps a BCP-47 device language tag to a supported app language.
export function mapTag(tag: string | null | undefined): AppLang {
  const lower = (tag ?? '').toLowerCase();
  if (lower === 'pt-br' || lower.startsWith('pt')) {
    return 'pt-BR';
  }
  if (lower.startsWith('es')) {
    return 'es';
  }
  return 'en';
}

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);
  private readonly _lang = signal<AppLang>(DEFAULT_LANG);

  readonly lang = this._lang.asReadonly();

  get locale(): string {
    return LOCALE_BY_LANG[this._lang()];
  }

  async init(): Promise<void> {
    this.translate.addLangs(APP_LANGS);
    this.translate.setFallbackLang(DEFAULT_LANG);
    const lang = await this.detect();
    this._lang.set(lang);
    this.translate.use(lang);
  }

  instant(key: string, params?: Record<string, unknown>): string {
    return this.translate.instant(key, params);
  }

  private async detect(): Promise<AppLang> {
    try {
      const { value } = await Device.getLanguageTag();
      return mapTag(value);
    } catch {
      const navLang = typeof navigator !== 'undefined' ? navigator.language : DEFAULT_LANG;
      return mapTag(navLang);
    }
  }
}
