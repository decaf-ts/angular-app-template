import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, NavigationStart } from '@angular/router';

import { IconComponent, IWindowResizeEvent } from '@decaf-ts/for-angular';
import { IonApp, IonContent, IonMenu, IonRouterOutlet, IonSplitPane } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import {
  BehaviorSubject,
  combineLatest,
  debounce,
  distinctUntilChanged,
  filter,
  fromEvent,
  map,
  merge,
  Subscription,
  switchMap,
  timer,
} from 'rxjs';
import { AppName } from './app.config';
import { AppMenuComponent } from './components/menu/menu.component';
import { SidebarStateService } from './services/sidebar-state.service';
import { NgxEwBasePage } from './utils/NgxEwBasePage';

/**
 * @description Root component of the Decaf-ts for Angular application
 * @summary This component serves as the main entry point for the application.
 * It sets up the navigation menu, handles routing events, and initializes
 * the application state. It also manages the application title and menu visibility.
 * @class
 * @param {Platform} platform - Ionic Platform service
 * @param {Router} router - Angular Router service
 * @param {MenuController} menuController - Ionic MenuController service
 * @param {Title} titleService - Angular Title service
 * @example
 * <app-root></app-root>
 * @mermaid
 * sequenceDiagram
 *   participant App as AppComponent
 *   participant Router
 *   participant MenuController
 *   participant TitleService
 *   participant Repository
 *   App->>App: constructor()
 *   App->>App: ngOnInit()
 *   App->>Router: Subscribe to events
 *   Router-->>App: Navigation events
 *   App->>MenuController: Enable/Disable menu
 *   App->>TitleService: Set page title
 *   App->>App: initializeApp()
 *   alt isDevelopmentMode
 *     App->>Repository: Initialize repositories
 *   end
 */
@Component({
  standalone: true,
  selector: 'app-root',
  imports: [
    IonApp,
    IonSplitPane,
    IonMenu,
    IonContent,
    IonRouterOutlet,
    TranslateModule,
    IconComponent,
    AppMenuComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  schemas: [],
  providers: [],
})
export class AppComponent extends NgxEwBasePage implements OnInit {
  /**
   * @description Single source of truth for the sidebar (navigation rail) state.
   * @summary Owns the collapsed/fixed/viewport-width state consumed by this shell, the
   * header and the menu. All transitions go through its explicit intents.
   */
  readonly sidebar = inject(SidebarStateService);
  disableMenu = false;
  menuCollapsed: boolean = true;
  menuFixed: boolean = false;
  showCollapseButton: boolean = true;

  appDescription: string = 'Angular Template';

  loggedIn: boolean = false;

  private awaiter$ = new BehaviorSubject<number>(0);

  private readonly destroyRef = inject(DestroyRef);
  private hoverSubscription?: Subscription;

  constructor() {
    super('');
    this.appName = AppName;
  }

  /**
   * @description Lifecycle hook that is called after data-bound properties of a directive are initialized
   * @summary Sets up router event subscriptions and initializes the application
   * @return {Promise<void>}
   */
  async ngOnInit(): Promise<void> {
    this.hasMenu.set(true);
    this.title = 'Angular Template';
    this.appName = AppName;
    await this.initialize();
  }

  /**
   * @description Initializes the application
   * @summary Sets the initialized flag and sets up repositories if in development mode
   * @return {Promise<void>}
   */
  override async initialize(): Promise<void> {
    if (!this.showCollapseButton) {
      this.sidebar.expand();
    }
    this.router.events
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        filter((event) => event instanceof NavigationStart)
      )
      .subscribe((event: NavigationStart) => {
        const { url } = event || '';

        if (['login', ''].includes(url.replace('/', ''))) {
          this.awaiter$.next(6000);
        } else {
          this.awaiter$.next(0);
        }
      });

    this.router.events
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        filter((event) => event instanceof NavigationEnd)
      )
      .subscribe(() => {
        if (this.showCollapseButton && !this.sidebar.isFixed() && !this.sidebar.isCollapsed()) {
          this.handleCollapseMenu('collapse');
        }
      });

    // Await for login subscription to emit before setting loggedIn and hasMenu to ensure the correct state is set after login/logout
    combineLatest([this.authService.session$, this.awaiter$])
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap(([logged, awaiter]) => timer(awaiter).pipe(map(() => logged)))
      )
      .subscribe((logged) => {
        this.loggedIn = logged;
        this.hasMenu.set(logged);
        if (logged) {
          this.handleDebounceHover();
        } else {
          this.hoverSubscription?.unsubscribe();
          this.hoverSubscription = undefined;
        }
        this.changeDetectorRef.detectChanges();
      });
    await super.initialize();

    if (this.showCollapseButton) {
      this.mediaService
        .windowResizeObserver()
        .pipe(
          distinctUntilChanged((prev, curr) => prev.width === curr.width),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe((size: IWindowResizeEvent) => {
          if (this.sidebar.applyResize(size.width)) {
            this.changeDetectorRef.detectChanges();
          }
        });
    }

    this.initialized = true;
  }

  private handleDebounceHover(): void {
    if (this.hoverSubscription) {
      return;
    }
    const element = this.component?.nativeElement;
    if (element) {
      const toggleState$ = (eventName: string = 'mouseenter') =>
        fromEvent<MouseEvent>(element, eventName).pipe(
          map((event) => ({
            action: eventName === 'mouseenter' ? ('open' as const) : ('close' as const),
            target: (event.relatedTarget as HTMLElement) ?? undefined,
          }))
        );

      this.hoverSubscription = merge(toggleState$(), toggleState$('mouseleave'))
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          debounce(({ action }) =>
            timer(
              action === 'open'
                ? SidebarStateService.HOVER_OPEN_DELAY
                : SidebarStateService.HOVER_CLOSE_DELAY
            )
          )
        )
        .subscribe(({ action, target }) => {
          this.sidebar.applyHover(action, target);
          this.changeDetectorRef.detectChanges();
        });
    }
  }

  /**
   * @description Handles the pin/collapse button and collapse requests for the sidebar rail.
   * @summary Without a state it runs the button's 3-state cycle (expanded-unpinned → pinned →
   * collapsed → expanded-unpinned); with `'collapse'` it collapses an unpinned rail (used by
   * the NavigationEnd auto-collapse and content-area clicks). Transitions only apply on
   * desktop widths and are delegated to the {@link SidebarStateService}.
   * @param {string} [state] - Optional request; `'collapse'` collapses an unpinned rail.
   * @return {void}
   */
  handleCollapseMenu(state?: string) {
    if (!this.sidebar.isDesktop()) {
      return;
    }
    if (state) {
      this.sidebar.collapse();
    } else {
      this.sidebar.togglePinCollapse();
    }
    this.changeDetectorRef.detectChanges();
  }
}
