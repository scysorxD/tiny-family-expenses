import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Beneficiary } from '../models';
import { NamedActiveRow, mapBeneficiary } from '../../data/remote/supabase.mappers';
import { LocalStore } from '../../data/local/local-store.service';
import { newId } from '../../shared/utils';
import { ConnectivityService } from './connectivity.service';
import { SupabaseService } from './supabase.service';
import { SyncQueueService } from './sync-queue.service';

@Injectable({
  providedIn: 'root',
})
export class BeneficiaryService {
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

  async list(roomId: string, includeInactive = false): Promise<Beneficiary[]> {
    if (this.native && !(await this.connectivity.isOnline())) {
      return this.store.listBeneficiaries(roomId, includeInactive);
    }

    const beneficiaries = await this.fetchRemote(roomId, includeInactive);
    if (this.native) {
      await this.store.cacheBeneficiaries(beneficiaries);
    }
    return beneficiaries;
  }

  private async fetchRemote(roomId: string, includeInactive: boolean): Promise<Beneficiary[]> {
    let query = this.client.from('beneficiaries').select('*').eq('room_id', roomId).order('name');
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return ((data ?? []) as NamedActiveRow[]).map(mapBeneficiary);
  }

  async create(roomId: string, name: string): Promise<Beneficiary> {
    const trimmed = name.trim();

    if (this.native) {
      const beneficiary: Beneficiary = { id: newId(), roomId, name: trimmed, isActive: true };
      await this.store.upsertBeneficiaryLocal(beneficiary);
      await this.syncQueue.enqueueWrite('beneficiary', 'create', `beneficiary:${beneficiary.id}:create`, {
        id: beneficiary.id,
        roomId,
        name: trimmed,
      });
      void this.syncQueue.process('ref-write');
      return beneficiary;
    }

    const { data, error } = await this.client
      .from('beneficiaries')
      .insert({ room_id: roomId, name: trimmed })
      .select('*')
      .single();
    if (error) {
      throw error;
    }
    return mapBeneficiary(data as NamedActiveRow);
  }

  async rename(id: string, name: string): Promise<void> {
    const trimmed = name.trim();

    if (this.native) {
      await this.store.updateBeneficiaryLocal(id, { name: trimmed });
      await this.syncQueue.enqueueWrite('beneficiary', 'update', `beneficiary:${id}:rename`, {
        id,
        name: trimmed,
      });
      void this.syncQueue.process('ref-write');
      return;
    }

    const { error } = await this.client
      .from('beneficiaries')
      .update({ name: trimmed, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      throw error;
    }
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    if (this.native) {
      await this.store.updateBeneficiaryLocal(id, { isActive });
      await this.syncQueue.enqueueWrite('beneficiary', 'update', `beneficiary:${id}:active`, {
        id,
        isActive,
      });
      void this.syncQueue.process('ref-write');
      return;
    }

    const { error } = await this.client
      .from('beneficiaries')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    if (this.native) {
      await this.store.deleteBeneficiaryLocal(id);
      await this.syncQueue.enqueueWrite('beneficiary', 'delete', `beneficiary:${id}:delete`, { id });
      void this.syncQueue.process('ref-write');
      return;
    }

    const { error } = await this.client.from('beneficiaries').delete().eq('id', id);
    if (error) {
      throw error;
    }
  }
}
