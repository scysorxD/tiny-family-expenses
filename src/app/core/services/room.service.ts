import { Injectable, inject } from '@angular/core';
import { Room, RoomRole } from '../models';
import { RoomMembership, RoomRow, mapRoom } from '../../data/remote/supabase.mappers';
import { AuthService } from '../auth/auth.service';
import { SupabaseService } from './supabase.service';

export interface RoomMember {
  id: string;
  userId: string;
  role: RoomRole;
  displayName: string;
  email: string;
  createdAt: string;
}

export interface RoomUpdate {
  name?: string;
  currency?: string;
  includeDetailInMessage?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class RoomService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);

  private get client() {
    return this.supabase.client;
  }

  async listMyRooms(): Promise<RoomMembership[]> {
    const userId = this.auth.userId;
    if (!userId) {
      return [];
    }

    const { data, error } = await this.client
      .from('room_users')
      .select('role, room:rooms(*)')
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as unknown as Array<{ role: RoomRole; room: RoomRow }>;
    return rows
      .map((row) => ({ role: row.role, room: mapRoom(row.room) }))
      .filter((membership) => !membership.room.archivedAt);
  }

  async createRoom(name: string, currency: string): Promise<Room> {
    const { data, error } = await this.client.rpc('create_room', {
      p_name: name,
      p_currency: currency,
    });

    if (error) {
      throw error;
    }

    const row = (Array.isArray(data) ? data[0] : data) as RoomRow;
    return mapRoom(row);
  }

  async getRoom(roomId: string): Promise<Room | null> {
    const { data, error } = await this.client
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapRoom(data as RoomRow) : null;
  }

  async getMyRole(roomId: string): Promise<RoomRole | null> {
    const userId = this.auth.userId;
    if (!userId) {
      return null;
    }

    const { data, error } = await this.client
      .from('room_users')
      .select('role')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return (data?.role as RoomRole | undefined) ?? null;
  }

  async updateRoom(roomId: string, patch: RoomUpdate): Promise<void> {
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.name !== undefined) {
      update['name'] = patch.name;
    }
    if (patch.currency !== undefined) {
      update['currency'] = patch.currency;
    }
    if (patch.includeDetailInMessage !== undefined) {
      update['include_detail_in_message'] = patch.includeDetailInMessage;
    }

    const { error } = await this.client.from('rooms').update(update).eq('id', roomId);
    if (error) {
      throw error;
    }
  }

  async archiveRoom(roomId: string): Promise<void> {
    const { error } = await this.client
      .from('rooms')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', roomId);
    if (error) {
      throw error;
    }
  }

  async listMembers(roomId: string): Promise<RoomMember[]> {
    const { data, error } = await this.client
      .from('room_users')
      .select('id, user_id, role, created_at, profile:profiles(display_name, email)')
      .eq('room_id', roomId);

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as unknown as Array<{
      id: string;
      user_id: string;
      role: RoomRole;
      created_at: string;
      profile: { display_name: string | null; email: string | null } | null;
    }>;

    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      role: row.role,
      displayName: row.profile?.display_name ?? row.profile?.email ?? 'Member',
      email: row.profile?.email ?? '',
      createdAt: row.created_at,
    }));
  }

  async removeMember(roomUserId: string): Promise<void> {
    const { error } = await this.client.from('room_users').delete().eq('id', roomUserId);
    if (error) {
      throw error;
    }
  }
}
