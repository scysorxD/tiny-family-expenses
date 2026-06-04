import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Beneficiary } from '../models';
import { NamedActiveRow, mapBeneficiary } from '../../data/remote/supabase.mappers';
import { LocalStore } from '../../data/local/local-store.service';
import { ConnectivityService } from './connectivity.service';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class BeneficiaryService {
  private readonly supabase = inject(SupabaseService);
  private readonly store = inject(LocalStore);
  private readonly connectivity = inject(ConnectivityService);

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
    const { data, error } = await this.client
      .from('beneficiaries')
      .insert({ room_id: roomId, name: name.trim() })
      .select('*')
      .single();
    if (error) {
      throw error;
    }
    return mapBeneficiary(data as NamedActiveRow);
  }

  async rename(id: string, name: string): Promise<void> {
    const { error } = await this.client
      .from('beneficiaries')
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      throw error;
    }
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await this.client
      .from('beneficiaries')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client.from('beneficiaries').delete().eq('id', id);
    if (error) {
      throw error;
    }
  }
}
