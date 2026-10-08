import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { CrudOperations, OperationKeys } from '@decaf-ts/db-decorators';
import { DB_ADAPTER_PROVIDER_TOKEN, DecafRepositoryAdapter, NgxRouterService } from '@decaf-ts/for-angular';
import { LoggedClass } from '@decaf-ts/logging';
import { BehaviorSubject, Subject } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { Environment } from 'src/environments/environment';
import { Namespaces, plaLongNames, SessionKeys } from '../utils/constants';
import { IAccessControlRole, IKeycloakIdToken } from '../utils/interfaces';
import { DecafAxiosHttpAdapter } from '../utils/overrides';
import { RouteLike, UserRoles } from '../utils/types';
import { SessionService } from './session.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService extends LoggedClass {
  private sessionService = inject(SessionService);

  private axiosAdapter = inject(DB_ADAPTER_PROVIDER_TOKEN) as DecafRepositoryAdapter & DecafAxiosHttpAdapter;

  private router = inject(Router);

  private rolesSubject = new BehaviorSubject<UserRoles[]>([]);

  roles$ = this.rolesSubject.asObservable().pipe(shareReplay({ bufferSize: 1, refCount: true }));

  private routeSubject = new Subject<string>();

  route$ = this.routeSubject.asObservable().pipe(shareReplay({ bufferSize: 1, refCount: true }));

  private sessionSubject = new Subject<boolean>();

  session$ = this.sessionSubject.asObservable().pipe(shareReplay({ bufferSize: 1, refCount: true }));

  private userRoles: UserRoles[] = [];

  private userNameSpaces: string[] = [];

  private publicRoutes: string[] = ['token', 'enroll'];

  private routeService: NgxRouterService = inject(NgxRouterService);

  private tryTimes = 0;

  private operations: CrudOperations[] = [
    OperationKeys.CREATE,
    OperationKeys.READ,
    OperationKeys.UPDATE,
    OperationKeys.DELETE,
  ];

  // get axios(): DecafAxiosHttpAdapter {
  //   return this.axiosAdapter;
  // }

  get currentRouteConfig(): ActivatedRouteSnapshot | null {
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return route;
  }

  private async emitRoles(roles: UserRoles[]) {
    this.rolesSubject.next(roles);
    await this.sessionService.set(SessionKeys.roles, roles);
  }

  private async emitRoute(route: string) {
    this.routeSubject.next(route);
  }

  private async emitSession(logged: boolean = true, roles: UserRoles[] = []) {
    this.sessionSubject.next(logged);
    if (logged && roles.length) {
      await this.emitRoles(roles);
    }
  }

  private decodeTokenPayload(token: string): IKeycloakIdToken | null {
    try {
      const base64Array = token.split('.')[1];
      if (!base64Array) {
        return null;
      }
      const base64 = base64Array.replace(/-/g, '+').replace(/_/g, '/');
      const payload = decodeURIComponent(
        window
          .atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(payload) as IKeycloakIdToken;
    } catch {
      return null;
    }
  }

  private isTokenExpiring(token: string, thresholdSeconds: number = Environment.keycloak.refreshThreshold): boolean {
    const payload = this.decodeTokenPayload(token);
    if (!payload?.exp) {
      return true;
    }
    return payload.exp * 1000 - 1000 * thresholdSeconds <= Date.now();
  }

  private extractTokenFromResponse(data: unknown): string {
    if (!data) {
      return '';
    }
    let payload = data;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch {
        return '';
      }
    }
    if (typeof payload === 'object' && payload !== null) {
      const token = (payload as { token?: string | string[] }).token;
      if (Array.isArray(token)) {
        return token[0] || '';
      }
      return token || '';
    }
    return '';
  }

  private async requestBackendToken(): Promise<string> {
    const { ptp } = Environment;

    try {
      const response = await fetch(`${ptp.protocol}://${ptp.host}/auth/login`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });
      if (!response.ok) {
        return '';
      }
      const data = await response.text();
      await this.emitSession(true);
      return this.extractTokenFromResponse(data);
    } catch (error: unknown) {
      this.log
        .for(this.requestBackendToken)
        .error(`Unable to retrieve backend token. ${(error as Error)?.message || error}`);
      return '';
    }
  }

  private async ensureToken(): Promise<{ token: string; refreshed: boolean }> {
    let refreshed = false;
    const currentURL = this.routeService?.getCurrentUrl() as string;
    if (this.publicRoutes.includes(currentURL)) {
      return { token: '', refreshed: false };
    }
    let token = DecafAxiosHttpAdapter.token || '';
    if (!token || this.isTokenExpiring(token)) {
      const fallbackToken = await this.requestBackendToken();
      if (fallbackToken) {
        await this.storeToken(fallbackToken);
        token = fallbackToken;
        refreshed = true;
      }
    }

    return { token, refreshed };
  }

  async hasNameSpace(namespaces: string[] | string = []): Promise<boolean> {
    if (typeof namespaces === 'string') {
      namespaces = [namespaces];
    }
    if (!namespaces.length) {
      return true;
    }
    const userNamespaces = await this.getNameSpaces();
    return namespaces.some((n) => userNamespaces.includes(n));
  }

  private async hasRole(roles: UserRoles[] = []): Promise<boolean> {
    if (!roles.length) {
      return true;
    }
    const userRoles = await this.getUserRoles();
    return roles.some((role) => {
      const roleArray = role.split(/[:-]/g);
      if (roleArray.length > 1) {
        return userRoles.includes(role);
      }
      return userRoles.some((ur) => ur.includes(role));
    });
  }

  async isAdmin(namespaces?: string[], adminRoles?: UserRoles[]): Promise<boolean> {
    if (!adminRoles) {
      adminRoles = this.userRoles;
    }
    adminRoles = adminRoles.filter((role) => role.toLowerCase().includes('admin'));
    if (!namespaces?.length) {
      namespaces = await this.extractNameSpaces(adminRoles);
    }
    if (!adminRoles.length || !namespaces.length) {
      return false;
    }
    const isAdmin = namespaces.every((namespace) => this.userRoles.includes((namespace + '-admin') as UserRoles));
    return !!isAdmin;
  }

  async isAllowed({ roles, namespaces }: IAccessControlRole, operation?: OperationKeys): Promise<boolean> {
    let allowedByRole = await this.hasRole(roles);
    if (!operation) {
      const allowedByNamespace = await this.hasNameSpace(namespaces);
      if (!allowedByRole || !allowedByNamespace) {
        return false;
      }
    } else {
      const isAdmin = await this.isAdmin(namespaces);
      if (!isAdmin) {
        roles = roles?.filter((role) =>
          role.toLowerCase().includes(operation !== OperationKeys.READ ? '-writer' : '-reader')
        );

        if (!roles?.length) {
          return false;
        }
        allowedByRole = await this.hasRole(roles);
      }
    }
    return allowedByRole;
  }

  async getAllowedRouteOperations(blockedOperations: OperationKeys[]): Promise<CrudOperations[]> {
    const route = this.currentRouteConfig;
    const { roles, namespaces } = (route?.routeConfig as RouteLike) || {};
    const operations: CrudOperations[] = [];
    for (const operation of this.operations) {
      if (!blockedOperations.includes(operation)) {
        const isAllowed = await this.isAllowed({ roles, namespaces }, operation);
        if (isAllowed) {
          operations.push(operation as CrudOperations);
        }
      }
    }
    return operations;
  }

  async getNameSpaces(): Promise<string[]> {
    if (!this.userNameSpaces.length) {
      const env = Environment;
      // const orgName = env.organization as string;
      const orgName = env.organization?.length ? env.organization : env.keycloak.realm;
      // Mock namespaces here and comment if above to simulate access
      // this.userNameSpaces = [Namespaces.PLA, Namespaces.EPI];
      if ([...plaLongNames, Namespaces.PLA].includes(orgName)) {
        this.userNameSpaces = [Namespaces.PLA];
      } else {
        this.userNameSpaces = [Namespaces.EPI];
      }
      // const roles = await this.getUserRoles();'
      // this.userNameSpaces = await this.extractNameSpaces(roles);
    }
    return this.userNameSpaces;
  }

  async extractNameSpaces(roles: UserRoles[]): Promise<string[]> {
    return [...new Set(roles.map((role) => role.split(/[:-]/g)[0]))];
  }

  async getUserRoles(emitEvent: boolean = false): Promise<UserRoles[]> {
    const env = Environment;
    // Mock roles here and comment if above to simulate access
    // this.userRoles = ['epi-reader', 'pla-writer', 'pla-admin', 'pla-reader'] as UserRoles[];
    if (!this.userRoles.length) {
      const account = (await this.getUserAccount()) as IKeycloakIdToken;
      const keycloakClientId = env.keycloak?.clientId;
      this.userRoles = (account?.resource_access?.[keycloakClientId]?.roles || []) as UserRoles[];
    }
    if (emitEvent) {
      await this.emitRoles(this.userRoles);
    }
    return this.userRoles;
  }

  async getUserAccount(key?: keyof IKeycloakIdToken): Promise<IKeycloakIdToken | unknown> {
    const account = (await this.getToken(true)) as IKeycloakIdToken;
    if (!key) {
      return account;
    }
    return account[key];
    //TODO: request account info from backend
    // const { data } = await this.axios.client.request({
    //   url: 'account/info',
    //   method: 'GET',
    //   withCredentials: true,
    // });
    // return data;
  }

  async isLoggedIn(redirect: boolean = false): Promise<boolean> {
    try {
      // const token = (await this.getToken(false, true)) as string;
      // if (!token) {
      //   return false;
      // }

      if (redirect) {
        if (this.routeService.getCurrentUrl().includes('tabs')) await this.router.navigateByUrl('/tabs');
        else await this.router.navigateByUrl('/dashboard');
      }
      return true;
    } catch (error: unknown) {
      this.log.for(this.isLoggedIn).error(`Error checking login status. ${(error as Error)?.message || error} `);
      return false;
    }
  }

  async storeToken(token: string): Promise<void> {
    if (token.includes('Bearer ')) {
      token = token.split('Bearer ')[1];
    }
    if (DecafAxiosHttpAdapter.token === token) {
      return;
    }
    DecafAxiosHttpAdapter.token = token;
    this.userRoles = [];
    this.userNameSpaces = [];
    // await this.sessionService.set(SessionKeys.token, token);
  }

  async getToken(decoded: boolean = false, emitSessionOnRefresh: boolean = false): Promise<string | IKeycloakIdToken> {
    const { token, refreshed } = await this.ensureToken();
    if (!token) {
      return '';
    }

    if (emitSessionOnRefresh && refreshed) {
      const roles = await this.getUserRoles();
      await this.getNameSpaces();
      await this.emitSession(true, roles);
    }

    if (decoded) {
      const payload = this.decodeTokenPayload(token);
      if (!payload) {
        this.log.for(this.getToken).warn('Invalid token');
        return '';
      }
      return payload;
    }
    return token;
  }

  async openSsoLogin(): Promise<void> {
    const loginUrl = `${Environment.ptp.protocol}://${Environment.ptp.host}/auth/login`;
    const ssoWindow = window.open(loginUrl);
    if (!ssoWindow) {
      alert('Allow pop-ups for this site to enable SSO login.');
    } else {
      ssoWindow.focus();
      const monitor = setInterval(() => {
        if (ssoWindow.closed) {
          clearInterval(monitor);
          window.location.reload();
        }
        // if (ssoWindow.document.hasFocus() && !focus) {
        //   clearInterval(monitor); // Stop monitoring when the new window gains focus
        //   focus = true;
        // }
      }, 500);
    }
  }

  async keycloakAuth(): Promise<void> {
    const { keycloak, ptp } = Environment;
    const { host, realm, clientId } = keycloak;
    const oauthUrl = `${ptp.protocol}://${ptp.host.replace('ew-backend', 'auth')}/oauth2`;
    const returnUri = `${oauthUrl}/sign_in?rd=${encodeURIComponent(`${window.location.origin}/?logged=true`)}`;
    const keycloakUrl = `${ptp.protocol}://${host}/realms/${realm}/protocol/openid-connect/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(returnUri)}&response_type=code&scope=openid`;
    window.location.href = `${oauthUrl}/sign_in?rd=${encodeURIComponent(keycloakUrl)}`;
  }

  async logout(redirect: boolean = false): Promise<void> {
    const { keycloak, ptp } = Environment;
    const { host, realm, clientId } = keycloak;
    await this.emitSession(false);
    await this.sessionService.delete();
    const token = await this.getToken();
    if (token && redirect) {
      const { keycloak, ptp } = Environment;
      const { host, realm, clientId } = keycloak;
      const oauthUrl = `${ptp.protocol}://${ptp.host.replace('ew-backend', 'auth')}/oauth2`;
      const keycloakUrl = `${ptp.protocol}://${host}/realms/${realm}/protocol/openid-connect/logout?id_token_hint=${token}&client_id=${clientId}&post_logout_redirect_uri=${oauthUrl}/sign_in?rd=${encodeURIComponent(window.location.origin)}`;
      window.location.href = `${oauthUrl}/sign_out?rd=${encodeURIComponent(keycloakUrl)}`;
    }
    DecafAxiosHttpAdapter.token = undefined;
  }
}
