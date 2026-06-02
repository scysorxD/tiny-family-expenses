import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

const LAST_ROOM_KEY = 'last_room_id';

@Injectable({
  providedIn: 'root',
})
export class PreferencesService {
  async getLastRoomId(): Promise<string | null> {
    const { value } = await Preferences.get({ key: LAST_ROOM_KEY });
    return value ?? null;
  }

  async setLastRoomId(roomId: string): Promise<void> {
    await Preferences.set({ key: LAST_ROOM_KEY, value: roomId });
  }

  async clearLastRoomId(): Promise<void> {
    await Preferences.remove({ key: LAST_ROOM_KEY });
  }
}
