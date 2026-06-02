import { TestBed } from '@angular/core/testing';
import { AuthService } from '../auth/auth.service';
import { LocalStore } from '../../data/local/local-store.service';
import { ConnectivityService } from './connectivity.service';
import { ExpenseService } from './expense.service';
import { SupabaseService } from './supabase.service';
import { SyncQueueService } from './sync-queue.service';

interface QueryResult {
  data: unknown;
  error: unknown;
}

function makeBuilder(result: QueryResult): Record<string, unknown> {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'insert', 'update', 'delete', 'eq', 'is', 'order', 'single', 'upsert']) {
    builder[method] = () => builder;
  }
  builder['then'] = (onFulfilled: (value: QueryResult) => unknown, onRejected?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled, onRejected);
  return builder;
}

describe('ExpenseService (web/online path)', () => {
  let from: jasmine.Spy;

  function configure(result: QueryResult): void {
    from = jasmine.createSpy('from').and.returnValue(makeBuilder(result));
    TestBed.configureTestingModule({
      providers: [
        ExpenseService,
        { provide: SupabaseService, useValue: { isConfigured: true, client: { from } } },
        { provide: AuthService, useValue: { userId: 'user-1' } },
        { provide: LocalStore, useValue: {} },
        { provide: SyncQueueService, useValue: {} },
        { provide: ConnectivityService, useValue: { isOnline: () => Promise.resolve(true) } },
      ],
    });
  }

  it('maps remote rows (including beneficiaries) into Expense models', async () => {
    configure({
      data: [
        {
          id: 'exp-1',
          room_id: 'room-1',
          category_id: 'cat-1',
          amount: '1500.5',
          description: 'Pharmacy',
          expense_date: '2026-05-10',
          month_key: '2026-05',
          created_by: 'user-1',
          updated_by: null,
          deleted_by: null,
          created_at: '2026-05-10T12:00:00.000Z',
          updated_at: null,
          deleted_at: null,
          expense_beneficiaries: [{ beneficiary_id: 'ben-1' }, { beneficiary_id: 'ben-2' }],
        },
      ],
      error: null,
    });

    const service = TestBed.inject(ExpenseService);
    const expenses = await service.listByMonth('room-1', '2026-05');

    expect(from).toHaveBeenCalledWith('expenses');
    expect(expenses.length).toBe(1);
    expect(expenses[0].amount).toBe(1500.5);
    expect(expenses[0].beneficiaryIds).toEqual(['ben-1', 'ben-2']);
    expect(expenses[0].monthKey).toBe('2026-05');
  });

  it('sums the month total from remote amounts', async () => {
    configure({ data: [{ amount: 100 }, { amount: '50.25' }], error: null });

    const service = TestBed.inject(ExpenseService);
    const total = await service.getMonthTotal('room-1', '2026-05');

    expect(total).toBe(150.25);
  });

  it('throws when the remote query returns an error', async () => {
    configure({ data: null, error: { message: 'boom' } });

    const service = TestBed.inject(ExpenseService);
    await expectAsync(service.listByMonth('room-1', '2026-05')).toBeRejected();
  });
});
