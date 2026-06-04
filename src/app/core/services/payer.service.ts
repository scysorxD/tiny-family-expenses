import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Payer } from '../models';
import { NamedActiveRow, mapPayer } from '../../data/remote/supabase.mappers';
import { LocalStore } from '../../data/local/local-store.service';
import { ConnectivityService } from './connectivity.service';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class PayerService {
  private readonly supabase = inject(SupabaseService);
  private readonly store = inject(LocalStore);
  private readonly connectivity = inject(ConnectivityService);

  private get client() {
    return this.supabase.client;
  }

  private get native(): boolean {
    return Capacitor.isNativePlatform();
  }

  async list(roomId: string, includeInactive = false): Promise<Payer[]> {
    if (this.native && !(await this.connectivity.isOnline())) {
      return this.store.listPayers(roomId, includeInactive);
    }

    const payers = await this.fetchRemote(roomId, includeInactive);
    if (this.native) {
      await this.store.cachePayers(payers);
    }
    return payers;
  }

  private async fetchRemote(roomId: string, includeInactive: boolean): Promise<Payer[]> {
    let query = this.client.from('payers').select('*').eq('room_id', roomId).order('name');
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return ((data ?? []) as NamedActiveRow[]).map(mapPayer);
  }

  async create(roomId: string, name: string): Promise<Payer> {
    const { data, error } = await this.client
      .from('payers')
      .insert({ room_id: roomId, name: name.trim() })
      .select('*')
      .single();
    if (error) {
      throw error;
    }
    return mapPayer(data as NamedActiveRow);
  }

  async rename(id: string, name: string): Promise<void> {
    const { error } = await this.client
      .from('payers')
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      throw error;
    }
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await this.client
      .from('payers')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client.from('payers').delete().eq('id', id);
    if (error) {
      throw error;
    }
  }
}
