import { Injectable, inject } from '@angular/core';
import { InvitationStatus, PendingInvitation, RoomInvitation, RoomRole } from '../models';
import { AuthService } from '../auth/auth.service';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class InvitationService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);

  private get client() {
    return this.supabase.client;
  }

  async createInvitation(roomId: string, email: string, role: RoomRole): Promise<void> {
    const userId = this.auth.userId;
    if (!userId) {
      throw new Error('NOT_AUTHENTICATED');
    }

    const { error } = await this.client.from('room_invitations').insert({
      room_id: roomId,
      email: email.trim(),
      role,
      invited_by: userId,
      status: 'pending',
    });

    if (error) {
      throw error;
    }
  }

  async listMyPendingInvitations(): Promise<PendingInvitation[]> {
    const { data, error } = await this.client.rpc('list_my_pending_invitations');

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as Array<{
      id: string;
      room_id: string;
      room_name: string;
      role: RoomRole;
      invited_by_name: string;
      status: InvitationStatus;
      created_at: string;
    }>;

    return rows.map((row) => ({
      id: row.id,
      roomId: row.room_id,
      roomName: row.room_name,
      role: row.role,
      invitedByName: row.invited_by_name,
      status: row.status,
      createdAt: row.created_at,
    }));
  }

  async acceptInvitation(invitationId: string): Promise<string> {
    const { data, error } = await this.client.rpc('accept_pending_invitation', {
      p_invitation_id: invitationId,
    });
    if (error) {
      throw error;
    }
    return data as string;
  }

  async rejectInvitation(invitationId: string): Promise<void> {
    const { error } = await this.client.rpc('reject_pending_invitation', {
      p_invitation_id: invitationId,
    });
    if (error) {
      throw error;
    }
  }

  async listRoomInvitations(roomId: string): Promise<RoomInvitation[]> {
    const { data, error } = await this.client.rpc('list_room_invitations', {
      p_room_id: roomId,
    });

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as Array<{
      id: string;
      email: string;
      role: RoomRole;
      status: InvitationStatus;
      invited_by: string;
      accepted_by: string | null;
      created_at: string;
      accepted_at: string | null;
    }>;

    return rows.map((row) => ({
      id: row.id,
      roomId,
      email: row.email,
      role: row.role,
      status: row.status,
      invitedBy: row.invited_by,
      acceptedBy: row.accepted_by ?? undefined,
      acceptedAt: row.accepted_at ?? undefined,
      createdAt: row.created_at,
    }));
  }

  async deleteInvitation(invitationId: string): Promise<void> {
    const { error } = await this.client
      .from('room_invitations')
      .delete()
      .eq('id', invitationId);

    if (error) {
      throw error;
    }
  }
}
