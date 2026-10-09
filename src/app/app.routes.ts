import { canActivate, canActivateChild } from './guards/auth.guard';
import { RouteLike } from './utils/types';

const useTabs = true;

export const routes: RouteLike[] = [
  {
    path: '',
    [useTabs ? `loadChildren` : `loadComponent`]: useTabs
      ? () => import('./tabs/tabs.routes').then((m) => m.routes)
      : () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'tabs',
    canActivate: [canActivate],
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
    menu: {
      icon: 'ti-layout-grid',
    },
  },
  {
    path: 'dashboard',
    canActivate: [canActivate],
    loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
    menu: {
      icon: 'ti-layout-dashboard',
    },
  },
  {
    path: '',
    canActivateChild: [canActivateChild],
    namespaces: [],
    children: [
      {
        path: 'account',
        loadComponent: () => import('./pages/account/account.page').then((m) => m.AccountPage),
        roles: [],
        menu: {
          icon: 'ti-user',
        },
      },
    ],
  },
  {
    path: 'error',
    loadComponent: () => import('./pages/error/error.page').then((m) => m.ErrorPage),
  },
  {
    path: 'logout',
    data: { loggedOut: true },
    menu: {
      icon: 'ti-logout-2',
      color: 'danger',
    },
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
