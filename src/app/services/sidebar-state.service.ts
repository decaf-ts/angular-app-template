import { Injectable, signal } from '@angular/core';

/**
 * @description Single source of truth for the application sidebar (navigation rail) state.
 * @summary Holds the collapsed/fixed/viewport-width state of the sidebar as readonly signals
 * and exposes explicit, deterministic transition intents. Every writer (debounced hover,
 * window resize, router navigation, the pin/collapse button and content-area clicks) funnels
 * through these intents, so concurrent events can no longer fight over duplicated boolean
 * copies kept in separate components.
 *
 * Transition rules (identical to the pre-refactor AppComponent behavior):
 * - Viewports below {@link SidebarStateService.DESKTOP_MIN_WIDTH} always show the rail
 *   expanded and unpinned (Ionic split-pane handles the mobile overlay).
 * - On desktop, an expanded rail that is not pinned (fixed) collapses on navigation,
 *   on content-area clicks, after the debounced mouseleave, and when the window crosses
 *   the {@link SidebarStateService.DESKTOP_MIN_WIDTH} threshold from below.
 * - A pinned (fixed) rail is never auto-collapsed; unpinning it collapses it.
 * - A mouseleave only collapses when the pointer moved to another element within the
 *   document (`relatedTarget` defined) — leaving the window entirely keeps the rail open.
 *
 * @class SidebarStateService
 */
@Injectable({
  providedIn: 'root',
})
export class SidebarStateService {
  /**
   * @description Minimum viewport width (in px) where the collapsible desktop rail applies.
   * @summary Below this width the rail is always expanded and unpinned; above it the
   * hover debounce, pin/collapse button and auto-collapse behaviors take effect.
   * @type {number}
   */
  static readonly DESKTOP_MIN_WIDTH: number = 1200;

  /**
   * @description Debounce delay (in ms) before a mouseenter expands the rail.
   * @type {number}
   */
  static readonly HOVER_OPEN_DELAY: number = 200;

  /**
   * @description Debounce delay (in ms) before a mouseleave collapses the rail.
   * @type {number}
   */
  static readonly HOVER_CLOSE_DELAY: number = 1000;

  private readonly windowWidth = signal(window.innerWidth);

  private readonly collapsed = signal(false);

  private readonly fixed = signal(true);

  /**
   * @description Whether the rail is currently collapsed to the icon-only strip.
   * @returns {import('@angular/core').Signal<boolean>} Readonly collapsed state.
   */
  readonly isCollapsed = this.collapsed.asReadonly();

  /**
   * @description Whether the rail is pinned (fixed) open on the desktop layout.
   * @returns {import('@angular/core').Signal<boolean>} Readonly pinned state.
   */
  readonly isFixed = this.fixed.asReadonly();

  /**
   * @description Whether the current behavior applies to the desktop (>= 1200px) layout.
   * @summary Mirrors the viewport width tracked by {@link applyResize}; consumers should
   * read this instead of keeping their own window-width copies.
   * @return {boolean} True when the viewport is at least {@link SidebarStateService.DESKTOP_MIN_WIDTH} wide.
   */
  isDesktop(): boolean {
    return this.windowWidth() >= SidebarStateService.DESKTOP_MIN_WIDTH;
  }

  /**
   * @description Applies a debounced hover transition to the rail.
   * @summary On sub-desktop widths any hover event forces the expanded, unpinned state.
   * On desktop, an unpinned rail expands after the mouseenter debounce and collapses after
   * the mouseleave debounce, but only when the pointer is still inside the document
   * (`target` defined). A pinned (fixed) rail is never affected by hover.
   * @param {'open' | 'close'} action - Debounced pointer intent.
   * @param {HTMLElement} [target] - `event.relatedTarget` of the pointer event, when defined.
   * @return {void}
   */
  applyHover(action: 'open' | 'close', target?: HTMLElement): void {
    if (!this.isDesktop()) {
      this.collapsed.set(false);
      this.fixed.set(false);
      return;
    }
    if (!this.fixed()) {
      this.collapsed.set(action === 'close' && target !== undefined);
    }
  }

  /**
   * @description Applies the window-resize transition to the rail.
   * @summary Tracks the current viewport width, then enforces the threshold semantics:
   * below {@link SidebarStateService.DESKTOP_MIN_WIDTH} the rail becomes expanded and
   * unpinned; crossing above collapses an expanded rail that is not pinned.
   * @param {number} width - New window inner width in px.
   * @return {boolean} True when the collapsed/fixed state changed as a result.
   */
  applyResize(width: number): boolean {
    let changed = false;
    this.windowWidth.set(width);
    if (width < SidebarStateService.DESKTOP_MIN_WIDTH) {
      if (this.collapsed() || this.fixed()) {
        this.collapsed.set(false);
        // this.fixed.set(false);
        changed = true;
      }
    } else if (!this.fixed() && !this.collapsed()) {
      this.collapsed.set(true);
      changed = true;
    }
    return changed;
  }

  /**
   * @description Runs the 3-state cycle of the pin/collapse button.
   * @summary On desktop widths only: an expanded rail becomes pinned (fixed), a pinned rail
   * collapses, and a collapsed rail expands unpinned — i.e.
   * expanded-unpinned → pinned → collapsed → expanded-unpinned.
   * @return {void}
   */
  togglePinCollapse(): void {
    if (!this.isDesktop()) {
      return;
    }
    if (!this.collapsed()) {
      this.fixed.update((value) => !value);
      if (!this.fixed()) {
        this.collapsed.set(true);
      }
    } else {
      this.collapsed.set(false);
      this.fixed.set(false);
    }
  }

  /**
   * @description Collapses an unpinned rail on desktop widths.
   * @summary Used for the router NavigationEnd auto-collapse and the content-area click
   * collapse. A pinned (fixed) rail is never collapsed by this transition, and sub-desktop
   * widths are ignored entirely.
   * @return {void}
   */
  collapse(): void {
    if (!this.isDesktop()) {
      return;
    }
    if (!this.fixed()) {
      this.collapsed.set(true);
    }
  }

  /**
   * @description Forcibly expands the rail.
   * @summary Used at startup when the application is configured without a collapse button,
   * where the rail must never start collapsed.
   * @return {void}
   */
  expand(): void {
    this.collapsed.set(false);
  }
}
