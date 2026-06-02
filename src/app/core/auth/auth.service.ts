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
      this.initialized.set(true);
      return;
    }

    const { data } = await this.supabase.client.auth.getSession();
    this.currentUser.set(data.session?.user ?? null);

    this.supabase.client.auth.onAuthStateChange((_event, session) => {
      this.currentUser.set(session?.user ?? null);
    });

    this.initialized.set(true);
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
}
