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

export const publicOnlyGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ensureInitialized();
  return auth.isAuthenticated() ? router.createUrlTree(['/rooms']) : true;
};

// Resolves the landing destination as a UrlTree so ion-router-outlet mounts the
// final page directly (login or rooms) instead of mounting EntryPage and then
// redirecting in ngOnInit, which can leave the native outlet blank.
export const entryRedirectGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const preferences = inject(PreferencesService);
  const router = inject(Router);

  await auth.ensureInitialized();

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  let lastRoom: string | null = null;
  try {
    lastRoom = await preferences.getLastRoomId();
  } catch (err) {
    console.error('Failed to read last room id', err);
  }

  return lastRoom ? router.createUrlTree(['/rooms', lastRoom]) : router.createUrlTree(['/rooms']);
};
