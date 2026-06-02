import { Injectable, signal } from '@angular/core';
import { Network } from '@capacitor/network';

@Injectable({
  providedIn: 'root',
})
export class ConnectivityService {
  private readonly _online = signal(true);
  readonly online = this._online.asReadonly();

  private readonly listeners = new Set<(online: boolean) => void>();

  constructor() {
    void this.init();
  }

  private async init(): Promise<void> {
    try {
      const status = await Network.getStatus();
      this.update(status.connected);
      await Network.addListener('networkStatusChange', (status) => this.update(status.connected));
    } catch {
      const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
      this.update(online);
      if (typeof window !== 'undefined') {
        window.addEventListener('online', () => this.update(true));
        window.addEventListener('offline', () => this.update(false));
      }
    }
  }

  private update(online: boolean): void {
    const previous = this._online();
    this._online.set(online);
    if (online && !previous) {
      for (const listener of this.listeners) {
        listener(true);
      }
    }
  }

  async isOnline(): Promise<boolean> {
    try {
      return (await Network.getStatus()).connected;
    } catch {
      return typeof navigator !== 'undefined' ? navigator.onLine : true;
    }
  }

  onReconnect(listener: () => void): () => void {
    const wrapped = (online: boolean): void => {
      if (online) {
        listener();
      }
    };
    this.listeners.add(wrapped);
    return () => this.listeners.delete(wrapped);
  }
}
