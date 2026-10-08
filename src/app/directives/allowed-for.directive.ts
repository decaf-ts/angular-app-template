import { Directive, ElementRef, inject, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LoggedClass } from '@decaf-ts/logging';
import { AuthService } from '../services/auth.service';
import { IAccessControlRole } from '../utils/interfaces';

@Directive({
  selector: '[appAllowedFor]',
})
export class AppAllowedForDirective extends LoggedClass implements OnInit {
  @Input()
  role!: IAccessControlRole;

  element: ElementRef = inject(ElementRef);

  authService = inject(AuthService);

  private route = inject(ActivatedRoute);
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor() {
    super();
  }

  async ngOnInit(): Promise<void> {
    // TODO: get roles from app.routes
    // await this.getRoleRoute();

    const route = this.route.snapshot;
    const { namespaces, roles, operation } = this.role || {};
    const isAllowed = await this.authService.isAllowed({ namespaces, roles, operation });
    if (!isAllowed) {
      this.log
        .for(this.ngOnInit)
        .debug(
          `Element ${this.element.nativeElement.tagName} removed by AppAllowedForDirective, required role: ${JSON.stringify(this.role)} on page ${route.url.join('/')}`
        );
      this.element.nativeElement.remove();
    }
  }

  // async getRoleRoute(route: ActivatedRoute): Promise<any> {
  // const operation = this.route.snapshot.paramMap.get('operation');
  // const { routeConfig } = route;
  // const { menu } = (routeConfig || {}) as RouteLike;
  // const { roles, namespaces } = (menu ? menu : (route as RouteLike)) || {};
  // }
}
