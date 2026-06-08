import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

// Supabase's default auth lock relies on the Web Locks API (navigator.locks),
// which is unreliable inside the Android WebView and throws
// "Acquiring an exclusive Navigator LockManager lock ... immediately failed".
// This in-memory lock serializes auth operations per name without that API.
// auth-js guards re-entrancy internally, so plain FIFO queuing is safe here.
const lockChains = new Map<string, Promise<unknown>>();

function inMemoryLock<R>(name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> {
  const previous = lockChains.get(name) ?? Promise.resolve();
  const result = previous.then(
    () => fn(),
    () => fn(),
  );
  lockChains.set(
    name,
    result.then(
      () => undefined,
      () => undefined,
    ),
  );
  return result;
}

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private cachedClient?: SupabaseClient;

  get isConfigured(): boolean {
    return Boolean(environment.supabaseUrl) && Boolean(environment.supabaseAnonKey);
  }

  get client(): SupabaseClient {
    if (!this.cachedClient) {
      if (!this.isConfigured) {
        throw new Error(
          'Supabase is not configured. Set supabaseUrl and supabaseAnonKey in src/environments/environment.ts.',
        );
      }

      const isNative = Capacitor.isNativePlatform();

      // Only the public anon key is used in the client. Never embed a service-role key here.
      this.cachedClient = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          // Replace navigator.locks with an in-memory lock inside the native WebView.
          ...(isNative ? { lock: inMemoryLock } : {}),
        },
      });
    }

    return this.cachedClient;
  }
}
