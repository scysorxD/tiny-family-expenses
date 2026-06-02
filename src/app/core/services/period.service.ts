import { Injectable, inject } from '@angular/core';
import { Period } from '../models';
import {
  PeriodPayerStatusRow,
  PeriodRow,
  mapPeriod,
  mapPeriodPayerStatus,
} from '../../data/remote/supabase.mappers';
import { SupabaseService } from './supabase.service';

export interface PayerStatusView {
  id: string;
  payerId: string;
  payerName: string;
  amountDue: number;
  status: 'pending' | 'paid';
  paidAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PeriodService {
  private readonly supabase = inject(SupabaseService);

  private get client() {
    return this.supabase.client;
  }

  async getPeriod(roomId: string, monthKey: string): Promise<Period | null> {
    const { data, error } = await this.client
      .from('periods')
      .select('*')
      .eq('room_id', roomId)
      .eq('month_key', monthKey)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapPeriod(data as PeriodRow) : null;
  }

  async listPeriods(roomId: string): Promise<Period[]> {
    const { data, error } = await this.client
      .from('periods')
      .select('*')
      .eq('room_id', roomId)
      .order('month_key', { ascending: false });

    if (error) {
      throw error;
    }

    return ((data ?? []) as PeriodRow[]).map(mapPeriod);
  }

  async closePeriod(roomId: string, monthKey: string, includeDetail: boolean): Promise<Period> {
    const { data, error } = await this.client.rpc('close_period', {
      p_room_id: roomId,
      p_month_key: monthKey,
      p_include_detail: includeDetail,
    });

    if (error) {
      throw error;
    }

    const row = (Array.isArray(data) ? data[0] : data) as PeriodRow;
    return mapPeriod(row);
  }

  async reopenPeriod(roomId: string, monthKey: string): Promise<Period> {
    const { data, error } = await this.client.rpc('reopen_period', {
      p_room_id: roomId,
      p_month_key: monthKey,
    });

    if (error) {
      throw error;
    }

    const row = (Array.isArray(data) ? data[0] : data) as PeriodRow;
    return mapPeriod(row);
  }

  async markPayerPaid(periodId: string, payerId: string, paid: boolean): Promise<Period> {
    const { data, error } = await this.client.rpc('mark_payer_paid', {
      p_period_id: periodId,
      p_payer_id: payerId,
      p_paid: paid,
    });

    if (error) {
      throw error;
    }

    const row = (Array.isArray(data) ? data[0] : data) as PeriodRow;
    return mapPeriod(row);
  }

  async listPayerStatus(periodId: string): Promise<PayerStatusView[]> {
    const { data, error } = await this.client
      .from('period_payer_status')
      .select('*, payer:payers(name)')
      .eq('period_id', periodId);

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as unknown as Array<
      PeriodPayerStatusRow & { payer: { name: string } | null }
    >;
    return rows
      .map((row) => {
        const status = mapPeriodPayerStatus(row);
        return {
          id: status.id,
          payerId: status.payerId,
          payerName: row.payer?.name ?? 'Payer',
          amountDue: status.amountDue,
          status: status.status,
          paidAt: status.paidAt,
        };
      })
      .sort((a, b) => a.payerName.localeCompare(b.payerName));
  }

  async saveFinalMessage(periodId: string, message: string): Promise<void> {
    const { error } = await this.client
      .from('periods')
      .update({ final_message: message, message_updated_at: new Date().toISOString() })
      .eq('id', periodId);

    if (error) {
      throw error;
    }
  }
}
