import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Category } from '../models';
import { CategoryRow, mapCategory } from '../../data/remote/supabase.mappers';
import { LocalStore } from '../../data/local/local-store.service';
import { AuthService } from '../auth/auth.service';
import { ConnectivityService } from './connectivity.service';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);
  private readonly store = inject(LocalStore);
  private readonly connectivity = inject(ConnectivityService);

  private get client() {
    return this.supabase.client;
  }

  private get native(): boolean {
    return Capacitor.isNativePlatform();
  }

  async listCategories(roomId: string, includeInactive = false): Promise<Category[]> {
    if (this.native && !(await this.connectivity.isOnline())) {
      return this.store.listCategories(roomId, includeInactive);
    }

    const categories = await this.fetchRemoteCategories(roomId, includeInactive);
    if (this.native) {
      await this.store.cacheCategories(categories);
    }
    return categories;
  }

  private async fetchRemoteCategories(
    roomId: string,
    includeInactive: boolean,
  ): Promise<Category[]> {
    let query = this.client.from('categories').select('*').eq('room_id', roomId).order('name');
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return ((data ?? []) as CategoryRow[]).map(mapCategory);
  }

  async getSuggested(roomId: string, limit = 5): Promise<Category[]> {
    const { data, error } = await this.client.rpc('get_suggested_categories', {
      p_room_id: roomId,
      p_limit: limit,
    });

    if (error) {
      throw error;
    }

    return ((data ?? []) as CategoryRow[]).map(mapCategory);
  }

  async createCategory(roomId: string, name: string): Promise<Category> {
    const userId = this.auth.userId;
    if (!userId) {
      throw new Error('NOT_AUTHENTICATED');
    }

    const { data, error } = await this.client
      .from('categories')
      .insert({ room_id: roomId, name: name.trim(), created_by: userId })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return mapCategory(data as CategoryRow);
  }

  async renameCategory(categoryId: string, name: string): Promise<void> {
    const { error } = await this.client
      .from('categories')
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq('id', categoryId);
    if (error) {
      throw error;
    }
  }

  async setActive(categoryId: string, isActive: boolean): Promise<void> {
    const { error } = await this.client
      .from('categories')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', categoryId);
    if (error) {
      throw error;
    }
  }

  async deleteCategory(categoryId: string): Promise<void> {
    const { error } = await this.client.from('categories').delete().eq('id', categoryId);
    if (error) {
      throw error;
    }
  }
}
