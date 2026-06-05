import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Payer } from '../models';
import { NamedActiveRow, mapPayer } from '../../data/remote/supabase.mappers';
import { LocalStore } from '../../data/local/local-store.service';
import { newId } from '../../shared/utils';
import { ConnectivityService } from './connectivity.service';
import { SupabaseService } from './supabase.service';
import { SyncQueueService } from './sync-queue.service';

@Injectable({
  providedIn: 'root',
})
export class PayerService {
  private readonly supabase = inject(SupabaseService);
  private readonly store = inject(LocalStore);
  private readonly connectivity = inject(ConnectivityService);
  private readonly syncQueue = inject(SyncQueueService);

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
    const trimmed = name.trim();

    if (this.native) {
      const payer: Payer = { id: newId(), roomId, name: trimmed, isActive: true };
      await this.store.upsertPayerLocal(payer);
      await this.syncQueue.enqueueWrite('payer', 'create', `payer:${payer.id}:create`, {
        id: payer.id,
        roomId,
        name: trimmed,
      });
      void this.syncQueue.process('ref-write');
      return payer;
    }

    const { data, error } = await this.client
      .from('payers')
      .insert({ room_id: roomId, name: trimmed })
      .select('*')
      .single();
    if (error) {
      throw error;
    }
    return mapPayer(data as NamedActiveRow);
  }

  async rename(id: string, name: string): Promise<void> {
    const trimmed = name.trim();

    if (this.native) {
      await this.store.updatePayerLocal(id, { name: trimmed });
      await this.syncQueue.enqueueWrite('payer', 'update', `payer:${id}:rename`, {
        id,
        name: trimmed,
      });
      void this.syncQueue.process('ref-write');
      return;
    }

    const { error } = await this.client
      .from('payers')
      .update({ name: trimmed, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      throw error;
    }
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    if (this.native) {
      await this.store.updatePayerLocal(id, { isActive });
      await this.syncQueue.enqueueWrite('payer', 'update', `payer:${id}:active`, { id, isActive });
      void this.syncQueue.process('ref-write');
      return;
    }

    const { error } = await this.client
      .from('payers')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    if (this.native) {
      await this.store.deletePayerLocal(id);
      await this.syncQueue.enqueueWrite('payer', 'delete', `payer:${id}:delete`, { id });
      void this.syncQueue.process('ref-write');
      return;
    }

    const { error } = await this.client.from('payers').delete().eq('id', id);
    if (error) {
      throw error;
    }
  }
}
