import { Injectable, inject } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular/standalone';
import { TranslateService } from '@ngx-translate/core';

type ToastColor = 'success' | 'danger' | 'warning' | 'medium';

@Injectable({
  providedIn: 'root',
})
export class FeedbackService {
  private readonly toastController = inject(ToastController);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  async toast(message: string, color: ToastColor = 'medium'): Promise<void> {
    const toast = await this.toastController.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
    });
    await toast.present();
  }

  success(message: string): Promise<void> {
    return this.toast(message, 'success');
  }

  error(message: string): Promise<void> {
    return this.toast(message, 'danger');
  }

  async confirm(header: string, message: string, confirmText?: string): Promise<boolean> {
    const confirmLabel = confirmText ?? this.translate.instant('common.confirm');
    const cancelLabel = this.translate.instant('common.cancel');
    return new Promise((resolve) => {
      void this.alertController
        .create({
          header,
          message,
          buttons: [
            { text: cancelLabel, role: 'cancel', handler: () => resolve(false) },
            { text: confirmLabel, role: 'confirm', handler: () => resolve(true) },
          ],
        })
        .then((alert) => alert.present());
    });
  }

  async prompt(header: string, initial = '', placeholder = ''): Promise<string | null> {
    const cancelLabel = this.translate.instant('common.cancel');
    const saveLabel = this.translate.instant('common.save');
    return new Promise((resolve) => {
      void this.alertController
        .create({
          header,
          inputs: [{ name: 'value', type: 'text', value: initial, placeholder }],
          buttons: [
            { text: cancelLabel, role: 'cancel', handler: () => resolve(null) },
            {
              text: saveLabel,
              role: 'confirm',
              handler: (data: { value?: string }) => resolve((data?.value ?? '').trim() || null),
            },
          ],
        })
        .then((alert) => alert.present());
    });
  }
}
