import { Injectable, inject } from '@angular/core';
import { Payer } from '../models';
import { NamedActiveRow, mapPayer } from '../../data/remote/supabase.mappers';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class PayerService {
  private readonly supabase = inject(SupabaseService);

  private get client() {
    return this.supabase.client;
  }

  async list(roomId: string, includeInactive = false): Promise<Payer[]> {
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
}
