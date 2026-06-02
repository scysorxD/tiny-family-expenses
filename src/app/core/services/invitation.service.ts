import { Injectable, inject } from '@angular/core';
import { RoomRole } from '../models';
import { AuthService } from '../auth/auth.service';
import { SupabaseService } from './supabase.service';

export interface InvitationPreview {
  roomId: string;
  roomName: string;
  inviter: string;
  role: RoomRole;
  expired: boolean;
  accepted: boolean;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable({
  providedIn: 'root',
})
export class InvitationService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);

  private get client() {
    return this.supabase.client;
  }

  async createInvitation(roomId: string, email: string, role: RoomRole): Promise<string> {
    const userId = this.auth.userId;
    if (!userId) {
      throw new Error('NOT_AUTHENTICATED');
    }

    const { data, error } = await this.client
      .from('room_invitations')
      .insert({
        room_id: roomId,
        email: email.trim(),
        role,
        invited_by: userId,
        expires_at: new Date(Date.now() + SEVEN_DAYS_MS).toISOString(),
      })
      .select('token')
      .single();

    if (error) {
      throw error;
    }

    return (data as { token: string }).token;
  }

  async getPreview(token: string): Promise<InvitationPreview | null> {
    const { data, error } = await this.client.rpc('get_invitation_preview', { p_token: token });
    if (error) {
      throw error;
    }

    const row = (Array.isArray(data) ? data[0] : data) as
      | {
          room_id: string;
          room_name: string;
          inviter: string;
          role: RoomRole;
          expired: boolean;
          accepted: boolean;
        }
      | undefined;

    if (!row) {
      return null;
    }

    return {
      roomId: row.room_id,
      roomName: row.room_name,
      inviter: row.inviter,
      role: row.role,
      expired: row.expired,
      accepted: row.accepted,
    };
  }

  async accept(token: string): Promise<string> {
    const { data, error } = await this.client.rpc('accept_invitation', { p_token: token });
    if (error) {
      throw error;
    }
    return data as string;
  }

  buildInviteLink(token: string): string {
    const origin =
      typeof window !== 'undefined' && window.location ? window.location.origin : 'https://app';
    return `${origin}/invite?token=${token}`;
  }
}
