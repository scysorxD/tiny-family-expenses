import { TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';
import { Expense, SyncQueueItem } from '../models';
import { LocalStore } from '../../data/local/local-store.service';
import { ConnectivityService } from './connectivity.service';
import { FeedbackService } from './feedback.service';
import { SupabaseService } from './supabase.service';
import { SyncQueueService } from './sync-queue.service';

function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'exp-1',
    roomId: 'room-1',
    categoryId: 'cat-1',
    amount: 1500,
    description: 'Pharmacy',
    expenseDate: '2026-05-10',
    monthKey: '2026-05',
    beneficiaryIds: ['ben-1', 'ben-2'],
    createdBy: 'user-1',
    createdAt: '2026-05-10T12:00:00.000Z',
    syncStatus: 'pending_sync',
    ...overrides,
  };
}

describe('SyncQueueService', () => {
  let store: jasmine.SpyObj<LocalStore>;
  let client: { from: jasmine.Spy };

  beforeEach(() => {
    store = jasmine.createSpyObj<LocalStore>('LocalStore', [
      'enqueue',
      'listQueue',
      'listQueueAll',
      'pendingCount',
      'conflictCount',
      'setQueueStatus',
      'resetQueueItem',
      'removeQueueItem',
      'setExpenseSyncStatus',
      'deleteExpenseLocal',
      'setCategorySyncStatus',
    ]);
    store.enqueue.and.resolveTo();
    store.listQueue.and.resolveTo([]);
    store.listQueueAll.and.resolveTo([]);
    store.pendingCount.and.resolveTo(0);
    store.conflictCount.and.resolveTo(0);
    store.resetQueueItem.and.resolveTo();
    store.removeQueueItem.and.resolveTo();
    store.setExpenseSyncStatus.and.resolveTo();
    store.deleteExpenseLocal.and.resolveTo();
    store.setCategorySyncStatus.and.resolveTo();

    client = { from: jasmine.createSpy('from') };

    TestBed.configureTestingModule({
      providers: [
        SyncQueueService,
        { provide: LocalStore, useValue: store },
        { provide: SupabaseService, useValue: { isConfigured: true, client } },
        {
          provide: ConnectivityService,
          useValue: { isOnline: () => Promise.resolve(true), onReconnect: () => () => undefined },
        },
        { provide: FeedbackService, useValue: { toast: () => Promise.resolve() } },
      ],
    });
  });

  it('enqueues a create operation with the expense id as local id', async () => {
    const service = TestBed.inject(SyncQueueService);
    await service.enqueueCreate(makeExpense());

    expect(store.enqueue).toHaveBeenCalledTimes(1);
    const item = store.enqueue.calls.mostRecent().args[0];
    expect(item.entityType).toBe('expense');
    expect(item.operation).toBe('create');
    expect(item.localId).toBe('exp-1');
    expect(item.status).toBe('pending_sync');
    expect((item.payload as { beneficiaryIds: string[] }).beneficiaryIds).toEqual(['ben-1', 'ben-2']);
  });

  it('enqueues update and delete operations with distinct local ids', async () => {
    const service = TestBed.inject(SyncQueueService);

    await service.enqueueUpdate({
      id: 'exp-1',
      categoryId: 'cat-2',
      amount: 200,
      expenseDate: '2026-05-11',
      beneficiaryIds: ['ben-1'],
      updatedBy: 'user-1',
    });
    await service.enqueueDelete('exp-1', 'user-1', '2026-05-12T00:00:00.000Z');

    const localIds = store.enqueue.calls.all().map((call) => call.args[0].localId);
    expect(localIds).toEqual(['exp-1:update', 'exp-1:delete']);
  });

  it('does not touch the network when running on a non-native platform', async () => {
    const service = TestBed.inject(SyncQueueService);
    await service.process('test');

    // On web, the queue is disabled, so it must not read the queue or call Supabase.
    expect(store.listQueue).not.toHaveBeenCalled();
    expect(client.from).not.toHaveBeenCalled();
    expect(service.syncing()).toBeFalse();
  });

  it('discards a pending create by deleting the local expense', async () => {
    const service = TestBed.inject(SyncQueueService);
    const item: SyncQueueItem = {
      localId: 'exp-1',
      entityType: 'expense',
      operation: 'create',
      payload: { id: 'exp-1' },
      attemptCount: 0,
      status: 'conflict',
    };

    await service.discard(item);

    expect(store.deleteExpenseLocal).toHaveBeenCalledOnceWith('exp-1');
    expect(store.setExpenseSyncStatus).not.toHaveBeenCalled();
    expect(store.removeQueueItem).toHaveBeenCalledOnceWith('exp-1');
  });

  it('discards a pending update by marking the local expense synced', async () => {
    const service = TestBed.inject(SyncQueueService);
    const item: SyncQueueItem = {
      localId: 'exp-1:update',
      entityType: 'expense',
      operation: 'update',
      payload: { id: 'exp-1' },
      attemptCount: 0,
      status: 'conflict',
    };

    await service.discard(item);

    expect(store.deleteExpenseLocal).not.toHaveBeenCalled();
    expect(store.setExpenseSyncStatus).toHaveBeenCalledOnceWith('exp-1', 'synced');
    expect(store.removeQueueItem).toHaveBeenCalledOnceWith('exp-1:update');
  });

  it('resets the queue row and the expense status when retrying', async () => {
    const service = TestBed.inject(SyncQueueService);
    const item: SyncQueueItem = {
      localId: 'exp-1',
      entityType: 'expense',
      operation: 'create',
      payload: { id: 'exp-1' },
      attemptCount: 3,
      status: 'sync_failed',
    };

    await service.retry(item);

    expect(store.resetQueueItem).toHaveBeenCalledOnceWith('exp-1');
    expect(store.setExpenseSyncStatus).toHaveBeenCalledOnceWith('exp-1', 'pending_sync');
  });

  it('routes a queued category create to the categories table on replay', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    const upsert = jasmine.createSpy('upsert').and.resolveTo({ error: null });
    client.from.and.returnValue({ upsert });
    store.listQueue.and.resolveTo([
      {
        localId: 'category:cat-9:create',
        entityType: 'category',
        operation: 'create',
        payload: { id: 'cat-9', roomId: 'room-1', name: 'Food', createdBy: 'user-1', createdAt: 'now' },
        attemptCount: 0,
        status: 'pending_sync',
      },
    ]);

    const service = TestBed.inject(SyncQueueService);
    await service.process('test');

    expect(client.from).toHaveBeenCalledWith('categories');
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(store.setCategorySyncStatus).toHaveBeenCalledOnceWith('cat-9', 'synced');
    expect(store.removeQueueItem).toHaveBeenCalledOnceWith('category:cat-9:create');
  });
});
