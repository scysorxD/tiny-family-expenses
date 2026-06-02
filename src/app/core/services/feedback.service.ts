import { Injectable, inject } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular/standalone';

type ToastColor = 'success' | 'danger' | 'warning' | 'medium';

@Injectable({
  providedIn: 'root',
})
export class FeedbackService {
  private readonly toastController = inject(ToastController);
  private readonly alertController = inject(AlertController);

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

  async confirm(header: string, message: string, confirmText = 'Confirm'): Promise<boolean> {
    return new Promise((resolve) => {
      void this.alertController
        .create({
          header,
          message,
          buttons: [
            { text: 'Cancel', role: 'cancel', handler: () => resolve(false) },
            { text: confirmText, role: 'confirm', handler: () => resolve(true) },
          ],
        })
        .then((alert) => alert.present());
    });
  }

  async prompt(header: string, initial = '', placeholder = ''): Promise<string | null> {
    return new Promise((resolve) => {
      void this.alertController
        .create({
          header,
          inputs: [{ name: 'value', type: 'text', value: initial, placeholder }],
          buttons: [
            { text: 'Cancel', role: 'cancel', handler: () => resolve(null) },
            {
              text: 'Save',
              role: 'confirm',
              handler: (data: { value?: string }) => resolve((data?.value ?? '').trim() || null),
            },
          ],
        })
        .then((alert) => alert.present());
    });
  }
}
