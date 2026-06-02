import { TestBed } from '@angular/core/testing';
import { ConnectivityService } from './connectivity.service';

describe('ConnectivityService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('reports a boolean online status', async () => {
    const service = TestBed.inject(ConnectivityService);
    const online = await service.isOnline();
    expect(typeof online).toBe('boolean');
  });

  it('exposes an online signal', () => {
    const service = TestBed.inject(ConnectivityService);
    expect(typeof service.online()).toBe('boolean');
  });

  it('returns an unsubscribe handle from onReconnect', () => {
    const service = TestBed.inject(ConnectivityService);
    const off = service.onReconnect(() => undefined);
    expect(typeof off).toBe('function');
    expect(() => off()).not.toThrow();
  });
});
