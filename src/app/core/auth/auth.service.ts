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

    try {
      const { data, error } = await this.supabase.client.auth.getSession();
      if (error) {
        console.error('Failed to get Supabase session', error);
      }
      this.currentUser.set(data.session?.user ?? null);

      this.supabase.client.auth.onAuthStateChange((_event, session) => {
        this.currentUser.set(session?.user ?? null);
      });
    } catch (err) {
      console.error('Failed to restore session', err);
      this.currentUser.set(null);
    } finally {
      this.initialized.set(true);
    }
  }

  get userId(): string | null {
    return this.currentUser()?.id ?? null;
  }

  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }

  isEmailVerified(): boolean {
    const user = this.currentUser();
    if (!user) return false;
    return user.email_confirmed_at != null;
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

    // After signup with "Confirm email" enabled, there is no session yet.
    // The user must verify their email via OTP before getting a session.
    this.currentUser.set(data.session?.user ?? data.user ?? null);
  }

  async verifyEmailOtp(email: string, token: string): Promise<void> {
    const { data, error } = await this.supabase.client.auth.verifyOtp({
      email,
      token,
      type: 'signup',
    });

    if (error) {
      throw error;
    }

    this.currentUser.set(data.session?.user ?? data.user ?? null);
  }

  async resendVerification(email: string): Promise<void> {
    const { error } = await this.supabase.client.auth.resend({
      type: 'signup',
      email,
    });

    if (error) {
      throw error;
    }
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
