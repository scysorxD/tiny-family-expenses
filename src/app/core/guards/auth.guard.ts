import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { PreferencesService } from '../services/preferences.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ensureInitialized();
  return auth.isAuthenticated() ? true : router.createUrlTree(['/login']);
};

export const verifiedGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ensureInitialized();
  if (!auth.isAuthenticated()) return router.createUrlTree(['/login']);
  if (!auth.isEmailVerified()) return router.createUrlTree(['/verify-email']);
  return true;
};

export const publicOnlyGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ensureInitialized();
  if (!auth.isAuthenticated()) return true;
  if (!auth.isEmailVerified()) return router.createUrlTree(['/verify-email']);
  return router.createUrlTree(['/rooms']);
};

export const entryRedirectGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const preferences = inject(PreferencesService);
  const router = inject(Router);

  await auth.ensureInitialized();

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  if (!auth.isEmailVerified()) {
    return router.createUrlTree(['/verify-email']);
  }

  let lastRoom: string | null = null;
  try {
    lastRoom = await preferences.getLastRoomId();
  } catch (err) {
    console.error('Failed to read last room id', err);
  }

  return lastRoom ? router.createUrlTree(['/rooms', lastRoom]) : router.createUrlTree(['/rooms']);
};
