import { Routes } from '@angular/router';
import { authGuard, entryRedirectGuard, publicOnlyGuard, verifiedGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [entryRedirectGuard],
    loadComponent: () => import('./features/shell/pages/entry/entry.page').then((m) => m.EntryPage),
  },
  {
    path: 'login',
    canActivate: [publicOnlyGuard],
    loadComponent: () =>
      import('./features/auth/pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    canActivate: [publicOnlyGuard],
    loadComponent: () =>
      import('./features/auth/pages/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'verify-email',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/pages/verify-email/verify-email.page').then(
        (m) => m.VerifyEmailPage,
      ),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/pages/forgot-password/forgot-password.page').then(
        (m) => m.ForgotPasswordPage,
      ),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/pages/reset-password/reset-password.page').then(
        (m) => m.ResetPasswordPage,
      ),
  },
  {
    path: 'rooms',
    canActivate: [verifiedGuard],
    loadComponent: () =>
      import('./features/rooms/pages/room-list/room-list.page').then((m) => m.RoomListPage),
  },
  {
    path: 'rooms/new',
    canActivate: [verifiedGuard],
    loadComponent: () =>
      import('./features/rooms/pages/room-create/room-create.page').then((m) => m.RoomCreatePage),
  },
  {
    path: 'rooms/:roomId',
    canActivate: [verifiedGuard],
    loadComponent: () =>
      import('./features/rooms/pages/room-main/room-main.page').then((m) => m.RoomMainPage),
  },
  {
    path: 'rooms/:roomId/summary',
    canActivate: [verifiedGuard],
    loadComponent: () =>
      import('./features/periods/pages/period-summary/period-summary.page').then(
        (m) => m.PeriodSummaryPage,
      ),
  },
  {
    path: 'rooms/:roomId/categories',
    canActivate: [verifiedGuard],
    loadComponent: () =>
      import('./features/categories/pages/category-list/category-list.page').then(
        (m) => m.CategoryListPage,
      ),
  },
  {
    path: 'rooms/:roomId/settings',
    canActivate: [verifiedGuard],
    loadComponent: () =>
      import('./features/rooms/pages/room-settings/room-settings.page').then(
        (m) => m.RoomSettingsPage,
      ),
  },
  {
    path: 'rooms/:roomId/members',
    canActivate: [verifiedGuard],
    loadComponent: () =>
      import('./features/rooms/pages/room-members/room-members.page').then(
        (m) => m.RoomMembersPage,
      ),
  },
  {
    path: 'rooms/:roomId/beneficiaries',
    canActivate: [verifiedGuard],
    loadComponent: () =>
      import('./features/rooms/pages/beneficiaries/beneficiaries.page').then(
        (m) => m.BeneficiariesPage,
      ),
  },
  {
    path: 'rooms/:roomId/payers',
    canActivate: [verifiedGuard],
    loadComponent: () =>
      import('./features/rooms/pages/payers/payers.page').then((m) => m.PayersPage),
  },
  {
    path: 'rooms/:roomId/collections',
    canActivate: [verifiedGuard],
    loadComponent: () =>
      import('./features/collections/pages/payer-status/payer-status.page').then(
        (m) => m.PayerStatusPage,
      ),
  },
  {
    path: 'rooms/:roomId/message',
    canActivate: [verifiedGuard],
    loadComponent: () =>
      import('./features/collections/pages/collection-message/collection-message.page').then(
        (m) => m.CollectionMessagePage,
      ),
  },
  {
    path: 'rooms/:roomId/dashboard',
    canActivate: [verifiedGuard],
    loadComponent: () =>
      import('./features/dashboard/pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'rooms/:roomId/sync',
    canActivate: [verifiedGuard],
    loadComponent: () =>
      import('./features/sync/pages/sync-status/sync-status.page').then((m) => m.SyncStatusPage),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
