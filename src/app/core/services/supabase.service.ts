import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

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

      // Only the public anon key is used in the client. Never embed a service-role key here.
      this.cachedClient = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      });
    }

    return this.cachedClient;
  }
}
