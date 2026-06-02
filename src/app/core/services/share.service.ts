import { Injectable } from '@angular/core';
import { Clipboard } from '@capacitor/clipboard';
import { Share } from '@capacitor/share';

@Injectable({
  providedIn: 'root',
})
export class ShareService {
  async copy(text: string): Promise<void> {
    await Clipboard.write({ string: text });
  }

  async share(text: string, title = 'Share'): Promise<void> {
    try {
      await Share.share({ text, title, dialogTitle: title });
    } catch {
      // The user dismissed the share sheet, or sharing is unavailable on this platform.
    }
  }
}
