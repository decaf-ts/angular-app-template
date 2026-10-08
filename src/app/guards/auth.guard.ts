import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, RouterStateSnapshot } from '@angular/router';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { NgxRouterService } from '@decaf-ts/for-angular';
import { LoggedClass } from '@decaf-ts/logging';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';
import { getNgxToastComponent, Namespaces, SessionKeys } from '../utils';
import { RouteLike } from '../utils/types';

type GuardedRouteSnapshot = ActivatedRouteSnapshot & { readonly routeConfig: RouteLike | null };

@Injectable({
  providedIn: 'root',
})
export class GuardClass extends LoggedClass {
  // private keycloak = inject(Keycloak);
  private authService = inject(AuthService);
  private sessionService = inject(SessionService);
  private toast = getNgxToastComponent();
  private translateService = inject(TranslateService);
  private routerService: NgxRouterService = inject(NgxRouterService);
  private blockedOperations: OperationKeys[] = [];
  private operation: OperationKeys | null = null;

  async canActivate(route: GuardedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean> {
    const blockOperations = route.routeConfig?.blockOperations || [OperationKeys.DELETE];
    this.operation = route.paramMap.get('operation') as OperationKeys;
    this.blockedOperations = blockOperations;
    if (this.blockedOperations.includes(this.operation)) {
      return false;
    }
    return await this.isAllowed(route, state.url.replace('/', ''));
  }

  async canActivateChild(
    route: GuardedRouteSnapshot & { readonly routeConfig: RouteLike | null },
    state: RouterStateSnapshot
  ): Promise<boolean> {
    let isAllowed = await this.canActivate(route, state);
    if (!isAllowed) {
      return await this.handleDeny('error.login');
    }
    const { roles, namespaces } = route.routeConfig || {};

    if (!roles?.length && !namespaces?.length) {
      return true;
    }
    const isAdmin = await this.authService.isAdmin(namespaces, roles);
    if (isAdmin) {
      return true;
    }
    const operation = route.paramMap.get('operation') as OperationKeys;
    isAllowed = await this.authService.isAllowed({ roles, namespaces }, operation);
    if (!isAllowed) {
      await this.handleDeny('error.permission', false, 'dashboard');
    }
    return isAllowed;
  }

  async isAllowed(route: GuardedRouteSnapshot, url: string): Promise<boolean> {
    if (['', 'login'].includes(url)) {
      return true;
    }

    const isLoggedIn = await this.authService.isLoggedIn();
    if (!isLoggedIn) {
      return false;
    }
    return true;
  }

  async handleDeny(message: string, logout = true, redirectTo?: string): Promise<boolean> {
    if (this.operation && this.blockedOperations.includes(this.operation)) {
      await this.handleNotFound();
    } else {
      if (logout) {
        await this.authService.logout();
      } else if (redirectTo) {
        await this.routerService.navigate(redirectTo);
      }
      if (logout) {
        await this.routerService.navigate('login');
      }
      await this.toast.error(await firstValueFrom(this.translateService.get(message)));
    }
    return false;
  }

  async handleNotFound(redirectTo?: string): Promise<void> {
    await this.routerService.navigate(`/error?message=notFound${redirectTo ? `&redirect=${redirectTo}` : ''}`);
  }
}

// const canActivateAuthRole = async (
//   route: ActivatedRouteSnapshot,
//   _: RouterStateSnapshot,
//   authData: AuthGuardData
// ): Promise<boolean> => {
//   const { authenticated, grantedRoles } = authData;
//   return authenticated;
// };

export const canActivate: CanActivateFn = async (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Promise<boolean> => {
  return await inject(GuardClass).canActivate(route, state);
};

export const canActivateChild: CanActivateFn = async (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Promise<boolean> => {
  return await inject(GuardClass).canActivateChild(route, state);
};