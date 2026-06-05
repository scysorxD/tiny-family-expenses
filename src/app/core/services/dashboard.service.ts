import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface MonthlyTotal {
  monthKey: string;
  total: number;
}

export interface CategoryTotal {
  label: string;
  total: number;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly supabase = inject(SupabaseService);

  private get client() {
    return this.supabase.client;
  }

  async monthlyTotals(roomId: string): Promise<MonthlyTotal[]> {
    const { data, error } = await this.client
      .from('expenses')
      .select('month_key, amount')
      .eq('room_id', roomId)
      .is('deleted_at', null);

    if (error) {
      throw error;
    }

    const totals = new Map<string, number>();
    for (const row of (data ?? []) as { month_key: string; amount: number | string }[]) {
      totals.set(row.month_key, (totals.get(row.month_key) ?? 0) + Number(row.amount));
    }

    return [...totals.entries()]
      .map(([monthKey, total]) => ({ monthKey, total }))
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }

  monthlyAverage(totals: MonthlyTotal[]): number {
    if (totals.length === 0) {
      return 0;
    }
    const sum = totals.reduce((acc, item) => acc + item.total, 0);
    return sum / totals.length;
  }

  async categoryBreakdown(roomId: string, monthKey: string): Promise<CategoryTotal[]> {
    const { data, error } = await this.client
      .from('expenses')
      .select('amount, category:categories(name)')
      .eq('room_id', roomId)
      .eq('month_key', monthKey)
      .is('deleted_at', null);

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as unknown as Array<{
      amount: number | string;
      category: { name: string } | null;
    }>;

    const totals = new Map<string, number>();
    for (const row of rows) {
      const label = row.category?.name ?? 'Category';
      totals.set(label, (totals.get(label) ?? 0) + Number(row.amount));
    }

    return [...totals.entries()]
      .map(([label, total]) => ({ label, total }))
      .sort((a, b) => b.total - a.total);
  }
}
