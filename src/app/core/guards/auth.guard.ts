import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { PreferencesService } from '../services/preferences.service';

export const authGuard: CanActivateFn = async (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ensureInitialized();
  const authenticated = auth.isAuthenticated();

  if (authenticated) {
    console.log(`[AuthGuard] /${route.routeConfig?.path ?? ''} authenticated=true decision=allow`);
    return true;
  }

  console.log(
    `[AuthGuard] /${route.routeConfig?.path ?? ''} authenticated=false decision=redirect -> /login`,
  );
  return router.createUrlTree(['/login']);
};

export const publicOnlyGuard: CanActivateFn = async (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  await auth.ensureInitialized();
  const authenticated = auth.isAuthenticated();

  if (!authenticated) {
    console.log(`[AuthGuard] /${route.routeConfig?.path ?? ''} authenticated=false decision=allow`);
    return true;
  }

  console.log(
    `[AuthGuard] /${route.routeConfig?.path ?? ''} authenticated=true decision=redirect -> /rooms`,
  );
  return router.createUrlTree(['/rooms']);
};

// Resolves the landing destination as a UrlTree so ion-router-outlet mounts the
// final page directly (login or rooms) instead of mounting EntryPage and then
// redirecting in ngOnInit, which can leave the native outlet blank.
export const entryRedirectGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const preferences = inject(PreferencesService);
  const router = inject(Router);

  console.log('[Loading] set true (entry redirect resolving)');
  await auth.ensureInitialized();

  if (!auth.isAuthenticated()) {
    console.log('[AuthGuard] entry authenticated=false decision=redirect -> /login');
    console.log('[Loading] set false');
    return router.createUrlTree(['/login']);
  }

  let lastRoom: string | null = null;
  try {
    lastRoom = await preferences.getLastRoomId();
  } catch (err) {
    console.error('[AuthGuard] entry failed to read last room', err);
  }

  const tree = lastRoom ? router.createUrlTree(['/rooms', lastRoom]) : router.createUrlTree(['/rooms']);
  console.log(
    `[AuthGuard] entry authenticated=true decision=redirect -> ${lastRoom ? `/rooms/${lastRoom}` : '/rooms'}`,
  );
  console.log('[Loading] set false');
  return tree;
};
