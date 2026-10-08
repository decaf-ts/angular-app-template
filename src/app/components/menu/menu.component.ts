import { Component, inject, Input, OnDestroy, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconComponent, IMenuItem, NgxPageDirective } from '@decaf-ts/for-angular';
import { IonItem, IonLabel, IonList, IonMenuToggle, IonRouterLink } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { takeUntil } from 'rxjs';
import { IAppMenuItem } from 'src/app/utils/interfaces';
import { MenuLike, RouteLike, UserRoles } from 'src/app/utils/types';
import { routes as AppRoutes } from '../../app.routes';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.scss'],
  standalone: true,
  imports: [
    TranslatePipe,
    RouterLink,
    RouterLinkActive,
    IonList,
    IonMenuToggle,
    IonItem,
    IonLabel,
    IonRouterLink,
    IconComponent,
  ],
})
export class AppMenuComponent extends NgxPageDirective implements OnInit, OnDestroy {
  @Input()
  collapsed: boolean = false;

  private authService: AuthService = inject(AuthService);

  override menu: (IMenuItem & IAppMenuItem)[] = [];
  userRoles!: UserRoles[];

  async ngOnInit(): Promise<void> {
    this.subscribeEvents();
    this.menu = await this.getItems();
    this.initialized = true;
    this.changeDetectorRef.detectChanges();
  }

  override async ngOnDestroy() {
    await super.ngOnDestroy();
  }

  subscribeEvents() {
    this.authService.roles$.pipe(takeUntil(this.destroySubscriptions$)).subscribe(async (roles) => {
      if (this.initialized) {
        this.userRoles = roles;
        this.menu = await this.getItems();
      }
    });

    this.authService.session$.pipe(takeUntil(this.destroySubscriptions$)).subscribe(async (logged: boolean) => {
      if (!logged) {
        this.userRoles = [];
        this.menu = [];
      }
    });

    // Debug only
    // this.authService.route$
    //   .pipe(takeUntil(this.destroySubscriptions$))
    //   .subscribe((route) => {
    //     console.log('Rota acessada:', route);
    //   });
  }


  isMenuActive(item: IMenuItem & { activeWhen: string[] }): boolean {
    const { url, activeWhen } = item;
    return !!(url?.length && (url === this.currentRoute || (activeWhen || []).includes(this.currentRoute as string)));
  }

  private async getItems(): Promise<MenuLike[]> {
    const routes = AppRoutes as RouteLike[];
    const items = [] as MenuLike[];

    const getHeader = (route: RouteLike, separator: boolean = false) => {
      const { path, menu } = route || {};
      return {
        ...menu,
        label: !path ? 'core' : `menu.${path}`,
        url: separator ? undefined : path || undefined,
      };
    };
    routes.filter((route) => route.path !== '**');
    for (const route of routes) {
      const { children, menu, path, roles, namespaces } = route;
      const isAllowed = await this.authService.isAllowed({ roles, namespaces });
      if (!children?.length) {
        if (menu) {
          items.push(getHeader(route));
        }
      } else {
        if (isAllowed) {
          items.push(getHeader(route, true));
          const parentPath = path;
          for (const child of children) {
            const { path, menu, roles, namespaces } = child;
            const isAllowed = await this.authService.isAllowed({ roles, namespaces });
            if (isAllowed) {
              if (menu) {
                const { label, title, url } = menu || {};
                const route = parentPath ? `${parentPath}/${path || url}` : `${path || url}`;
                items.push({
                  ...menu,
                  ...{
                    label: title || label || !parentPath ? `menu.${path}` : `menu.${parentPath}.${path}`,
                    url: route,
                  },
                });
              }
            }
          }
        }
      }
    }

    // .map((route) => {
    //   const { canActivateChild, children, menu, path, roles, namespaces } = route;
    //   const isAllowed = await this.authService.isAllowed({ roles, namespaces });
    //   if (!children?.length) {
    //     if (menu) {
    //       items.push(getHeader(route));
    //     }
    //   } else {
    //     if (isAllowed) {
    //       items.push(getHeader(route, true));
    //       const parentPath = path;
    //       children?.map((child: RouteLike) => {
    //         const { path, menu } = child;
    //         if (menu) {
    //           const { label, title, url } = menu || {};
    //           const route = parentPath ? `${parentPath}/${path || url}` : `${path || url}`;
    //           items.push({
    //             ...menu,
    //             ...{
    //               label: title || label || !parentPath ? `menu.${path}` : `menu.${parentPath}.${path}`,
    //               url: route,
    //             },
    //           });
    //         }
    //       });
    //     }
    //   }
    // });
    return items;
  }

  async logout(event: Event): Promise<void> {
    event.preventDefault();
    event.stopImmediatePropagation();
    await this.authService.logout(true);
  }
}
