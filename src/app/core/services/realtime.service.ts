import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

const DEBOUNCE_MS = 400;

@Injectable({
  providedIn: 'root',
})
export class RealtimeService {
  private readonly supabase = inject(SupabaseService);

  /**
   * Subscribes to Postgres changes for the given tables scoped to a room and
   * invokes a debounced callback whenever a change is streamed. Returns an
   * unsubscribe function. No-ops when Supabase is not configured.
   */
  onRoomChanges(roomId: string, tables: string[], callback: () => void): () => void {
    if (!this.supabase.isConfigured || !roomId) {
      return () => undefined;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const trigger = (): void => {
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => callback(), DEBOUNCE_MS);
    };

    const suffix = Math.random().toString(36).slice(2, 8);
    const channel = this.supabase.client.channel(`room:${roomId}:${suffix}`);

    for (const table of tables) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `room_id=eq.${roomId}` },
        () => trigger(),
      );
    }

    channel.subscribe();

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
      void this.supabase.client.removeChannel(channel);
    };
  }
}
