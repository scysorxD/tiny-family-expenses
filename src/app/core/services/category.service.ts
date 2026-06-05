import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Category } from '../models';
import { CategoryRow, mapCategory } from '../../data/remote/supabase.mappers';
import { LocalStore } from '../../data/local/local-store.service';
import { newId, nowIso } from '../../shared/utils';
import { AuthService } from '../auth/auth.service';
import { ConnectivityService } from './connectivity.service';
import { SupabaseService } from './supabase.service';
import { SyncQueueService } from './sync-queue.service';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);
  private readonly store = inject(LocalStore);
  private readonly connectivity = inject(ConnectivityService);
  private readonly syncQueue = inject(SyncQueueService);

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

    const trimmed = name.trim();

    if (this.native) {
      const category: Category = {
        id: newId(),
        roomId,
        name: trimmed,
        isActive: true,
        createdBy: userId,
        createdAt: nowIso(),
        syncStatus: 'pending_sync',
      };
      await this.store.upsertCategoryLocal(category, 'pending_sync');
      await this.syncQueue.enqueueWrite('category', 'create', `category:${category.id}:create`, {
        id: category.id,
        roomId,
        name: trimmed,
        createdBy: userId,
        createdAt: category.createdAt,
      });
      void this.syncQueue.process('ref-write');
      return category;
    }

    const { data, error } = await this.client
      .from('categories')
      .insert({ room_id: roomId, name: trimmed, created_by: userId })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return mapCategory(data as CategoryRow);
  }

  async renameCategory(categoryId: string, name: string): Promise<void> {
    const trimmed = name.trim();

    if (this.native) {
      await this.store.updateCategoryLocal(categoryId, { name: trimmed }, 'pending_sync');
      await this.syncQueue.enqueueWrite('category', 'update', `category:${categoryId}:rename`, {
        id: categoryId,
        name: trimmed,
      });
      void this.syncQueue.process('ref-write');
      return;
    }

    const { error } = await this.client
      .from('categories')
      .update({ name: trimmed, updated_at: new Date().toISOString() })
      .eq('id', categoryId);
    if (error) {
      throw error;
    }
  }

  async setActive(categoryId: string, isActive: boolean): Promise<void> {
    if (this.native) {
      await this.store.updateCategoryLocal(categoryId, { isActive }, 'pending_sync');
      await this.syncQueue.enqueueWrite('category', 'update', `category:${categoryId}:active`, {
        id: categoryId,
        isActive,
      });
      void this.syncQueue.process('ref-write');
      return;
    }

    const { error } = await this.client
      .from('categories')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', categoryId);
    if (error) {
      throw error;
    }
  }

  async deleteCategory(categoryId: string): Promise<void> {
    if (this.native) {
      await this.store.deleteCategoryLocal(categoryId);
      await this.syncQueue.enqueueWrite('category', 'delete', `category:${categoryId}:delete`, {
        id: categoryId,
      });
      void this.syncQueue.process('ref-write');
      return;
    }

    const { error } = await this.client.from('categories').delete().eq('id', categoryId);
    if (error) {
      throw error;
    }
  }
}
