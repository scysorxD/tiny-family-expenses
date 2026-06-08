import { Injectable, inject, signal } from '@angular/core';
import type { User } from '@supabase/supabase-js';
import { SupabaseService } from '../services/supabase.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly supabase = inject(SupabaseService);

  readonly currentUser = signal<User | null>(null);
  readonly initialized = signal(false);

  private initializePromise?: Promise<void>;

  ensureInitialized(): Promise<void> {
    if (!this.initializePromise) {
      this.initializePromise = this.restoreSession();
    }
    return this.initializePromise;
  }

  private async restoreSession(): Promise<void> {
    if (!this.supabase.isConfigured) {
      console.warn('[Auth] Supabase not configured; skipping session restore');
      this.initialized.set(true);
      return;
    }

    console.log('[Auth] Restoring session...');
    try {
      const { data, error } = await this.supabase.client.auth.getSession();
      if (error) {
        console.error('[Auth] getSession returned an error', error);
      }
      this.currentUser.set(data.session?.user ?? null);
      console.log(`[Auth] Session restored (authenticated=${Boolean(data.session)})`);

      this.supabase.client.auth.onAuthStateChange((event, session) => {
        console.log(`[Auth] onAuthStateChange: ${event} (authenticated=${Boolean(session)})`);
        this.currentUser.set(session?.user ?? null);
      });
    } catch (err) {
      // Never let an auth-init failure reject ensureInitialized(): the route guards
      // await it, so a thrown error here would leave the app stuck with no active route.
      console.error('[Auth] Failed to restore session', err);
      this.currentUser.set(null);
    } finally {
      this.initialized.set(true);
      console.log('[Auth] Initialization complete');
    }
  }

  get userId(): string | null {
    return this.currentUser()?.id ?? null;
  }

  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }

  async signUp(email: string, password: string, displayName?: string): Promise<void> {
    const { data, error } = await this.supabase.client.auth.signUp({
      email,
      password,
      options: displayName ? { data: { display_name: displayName } } : undefined,
    });

    if (error) {
      throw error;
    }

    this.currentUser.set(data.session?.user ?? data.user ?? null);
  }

  async signIn(email: string, password: string): Promise<void> {
    const { data, error } = await this.supabase.client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    this.currentUser.set(data.session?.user ?? null);
  }

  async signOut(): Promise<void> {
    await this.supabase.client.auth.signOut();
    this.currentUser.set(null);
  }

  async requestPasswordReset(email: string): Promise<void> {
    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined;
    const { error } = await this.supabase.client.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      throw error;
    }
  }

  async setSessionFromTokens(accessToken: string, refreshToken: string): Promise<void> {
    const { data, error } = await this.supabase.client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      throw error;
    }
    this.currentUser.set(data.session?.user ?? null);
  }

  async updatePassword(newPassword: string): Promise<void> {
    const { data, error } = await this.supabase.client.auth.updateUser({ password: newPassword });
    if (error) {
      throw error;
    }
    this.currentUser.set(data.user ?? null);
  }
}
