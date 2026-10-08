import path from 'path';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { expect, type Page } from '@playwright/test';
import {
  PerformanceRunner,
  type HandlerPayload,
  type HandlerResult,
  type PerformanceHandler,
  type PerformanceScenario,
  type Phase,
  type PhaseConfig,
  type PhaseResult,
} from '@decaf-ts/utils';

/**
 * Default timeout for individual browser operations. Playwright Test leaves action
 * timeouts unbounded by default, so a selector that never resolves would hang the
 * run instead of failing the scenario; every storyboard operation is bounded.
 */
const OPERATION_TIMEOUT_MS = 15000;

/**
 * Desktop/web viewport used by every scenario unless it overrides `viewport`.
 * The user guide documents the web application, so mobile-portrait captures are no
 * longer produced.
 */
const DEFAULT_VIEWPORT = { width: 1440, height: 900 } as const;

/**
 * Standard highlight look shared by every screenshot. Scenarios cannot override
 * these values, so all captures use one consistent annotation style.
 */
const HIGHLIGHT_BORDER_PX = 2;
const HIGHLIGHT_COLOR = '#e11d48';
const HIGHLIGHT_RADIUS = 8;
const HIGHLIGHT_PADDING = 4;
const BADGE_SIZE = 22;

/**
 * Selectors of the transient UI the application shows while it is still loading
 * (spinners, skeletons, list placeholders, overlays). The pre-capture settle
 * waits for every one of them to disappear so secondary queries (lists, audit
 * trails, embedded dashboards) have finished before the screenshot is taken.
 */
const DEFAULT_LOADING_SELECTORS = [
  'ion-spinner',
  'ion-skeleton-text',
  '.dcf-spinner',
  '.dcf-skeleton',
  '.dcf-loading',
  '.dcf-loading-overlay',
  '[class*="skeleton"]',
  '[class*="loading"]',
];

/** Default settle time, in ms, after the page reports itself fully loaded. */
const DEFAULT_SETTLE_MS = 350;

/**
 * Decorative indicators force-hidden before every capture. These are permanent
 * spinners the application never removes on its own, so waiting for them would
 * always time out; hiding them keeps the guide free of loading artifacts.
 */
const DEFAULT_HIDE_SELECTORS = ['.loader'];

/**
 * Waits for an embedded frame (for example an analytics dashboard rendered in an
 * `iframe`) to finish loading before the screenshot is taken.
 *
 * The wait mirrors the established dashboard UI e2e approach
 * (`waitKibanaFullLoad`) and covers the whole render chain, not just the frame
 * element: the frame must be attached, its own document must have finished
 * loading, every loading indicator inside it must be gone (a zero count, not merely
 * a hidden first match), at least one ready marker must be visible, and every
 * ready marker must have rendered. Only then is the capture allowed.
 */
export interface StoryboardFrameWait {
  /** Selector of the frame element on the host page (for example `iframe`). */
  selector: string;
  /** Selectors that must be visible inside the frame before capturing. */
  ready?: string[];
  /** Selectors that must not be visible inside the frame before capturing. */
  loading?: string[];
  /** Timeout, in ms, applied to each frame wait. Defaults to `60000`. */
  timeout?: number;
  /** Extra settle time, in ms, after the frame is ready and before capturing. */
  settleMs?: number;
  /**
   * When `true`, wait for the embedded frame's network to go idle after the
   * ready markers appear, so data-driven dashboard panels finish loading. Defaults
   * to `false`.
   */
  waitForNetworkIdle?: boolean;
}

/**
 * A single user action a storyboard scenario performs before its screenshot is taken.
 *
 * Every action type is intentionally generic: it only uses Playwright locators and
 * page primitives, so any UI project can drive its own flows without touching the
 * test runner.
 */
export type StoryboardAction =
  | { type: 'click'; selector: string; text?: string | RegExp; nth?: number; timeout?: number }
  | { type: 'fill'; selector: string; value: string; nth?: number; timeout?: number }
  | { type: 'press'; key: string; selector?: string }
  | { type: 'select'; selector: string; value?: string; label?: string; nth?: number }
  | { type: 'check'; selector: string; nth?: number }
  | { type: 'scrollIntoView'; selector: string }
  | { type: 'wait'; ms: number }
  | { type: 'waitForSelector'; selector: string; state?: 'attached' | 'detached' | 'visible' | 'hidden'; timeout?: number }
  | { type: 'waitForUrl'; pattern: string }
  | { type: 'setViewport'; width: number; height: number };

/**
 * A component the scenario wants to call out in the generated screenshot.
 *
 * Numbering and labels are resolved per scenario:
 * - `numbering` defaults to `true` when more than one component is highlighted.
 * - `labels` defaults to `false`; a label is only rendered when `label` is set.
 */
export interface StoryboardHighlight {
  /** Playwright selector (pierces shadow DOM) resolving to the highlighted element. */
  selector: string;
  /** Optional short callout text. Only rendered when the scenario enables labels. */
  label?: string;
  /** Force the number badge on/off for this element, overriding the scenario default. */
  number?: boolean;
}

/**
 * One screenshot entry of the storyboard. The scenario file carries all content
 * that ends up in the generated Markdown guide.
 */
export interface StoryboardScenario {
  /** Stable id; also the screenshot file name (`<id>.png`). */
  id: string;
  /** Guide section this scenario belongs to. */
  section: string;
  /** Scenario heading shown in the guide. */
  title: string;
  /** Markdown paragraph(s) describing the screen/flow. */
  description?: string;
  /** Optional Markdown bullet notes (conditions, resolution, tips). */
  notes?: string[];
  /** Image alt text; defaults to `title`. */
  alt?: string;
  /** Route appended to the configured base URL. */
  route: string;
  /** User actions performed, in order, before the screenshot is taken. */
  actions?: StoryboardAction[];
  /** Components to highlight on the screenshot. */
  highlights?: StoryboardHighlight[];
  /** Number the highlighted components; defaults to `true` when more than one highlight. */
  numbering?: boolean;
  /** Render per-component labels; defaults to `false`. Labels never obscure the element. */
  labels?: boolean;
  /** Capture the full page instead of the viewport. Defaults to `false`. */
  fullPage?: boolean;
  /** Navigation lifecycle to wait for; defaults to `networkidle`. */
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
  /** Extra settle time, in ms, after the page reports itself loaded and before capturing. */
  settleMs?: number;
  /**
   * Selectors that must not be visible before capturing (loading spinners,
   * skeletons). Merged with the runner's defaults.
   */
  waitForHidden?: string[];
  /**
   * Selectors force-hidden (CSS `display:none`) before capturing. Use only for
   * purely decorative indicators that the application never hides on its own
   * (for example a permanent splash spinner); content spinners belong in
   * `waitForHidden` instead.
   */
  hideSelectors?: string[];
  /** Wait for the network to be idle again after actions; defaults to `true`. */
  waitForNetworkIdle?: boolean;
  /** Per-scenario override of the runner's scenario timeout, in ms. */
  scenarioTimeoutMs?: number;
  /** Selector to scroll into view before capturing. Defaults to the first highlight. */
  scrollTo?: string;
  /**
   * Embedded frame to wait for before capturing (for example an analytics
   * dashboard rendered inside an `iframe`).
   */
  waitForFrame?: StoryboardFrameWait;
  /** Per-scenario viewport override. */
  viewport?: { width: number; height: number };
  /** Project-specific navigation/mocking hooks. */
  setup?: (page: Page, config: StoryboardConfig) => Promise<void> | void;
  /** Project-specific cleanup, always called even when the scenario fails. */
  teardown?: (page: Page, config: StoryboardConfig) => Promise<void> | void;
}

/**
 * A guide section. Sections can carry explanatory Markdown that is not tied to a
 * screenshot (`intro`), so a generated guide can keep the prose a hand-written
 * manual would have (about the app, supported languages, accessibility, ...).
 *
 * Declaring sections also fixes their order in the guide, independent of the order
 * the scenarios appear in. Sections without scenarios are allowed; they render as
 * explanatory-only blocks.
 */
export interface StoryboardSection {
  /** Section heading, rendered as an H1. Matches `StoryboardScenario.section`. */
  title: string;
  /** Optional Markdown placed right after the heading and before its scenarios. */
  intro?: string;
  /**
   * How the section's scenarios are laid out in the guide.
   *
   * `stack` (default) renders one heading, image and description per scenario.
   * `alternating` renders the section's screenshots in a two-column table, two
   * scenarios per row, alternating the side that holds the image so sequential
   * screenshots of the same user story read as a single flow.
   */
  layout?: 'stack' | 'alternating';
}

/**
 * Top level storyboard definition consumed by {@link StoryboardRunner}. A project
 * only changes this file to reuse the tool.
 */
export interface StoryboardConfig {
  /** Guide title. */
  title: string;
  /** Optional Markdown intro placed right after the title. */
  intro?: string;
  /**
   * Ordered guide sections with optional explanatory Markdown. Scenarios are grouped
   * under the section whose `title` matches their `section`; scenario sections not
   * listed here are appended in first-seen order.
   */
  sections?: StoryboardSection[];
  /** Base URL for every scenario. Defaults to the Playwright `baseURL`. */
  baseUrl?: string;
  /** Guide Markdown file, relative to the project root. */
  guideFile: string;
  /** Screenshot output directory, relative to the project root. */
  screenshotsDir: string;
  /** Default viewport for scenarios without their own. */
  viewport?: { width: number; height: number };
  /**
   * Default guide layout for sections that do not declare their own. Defaults to
   * `stack`.
   */
  layout?: 'stack' | 'alternating';
  /**
   * When `true` (the default), a scenario whose effective viewport is not a
   * desktop layout (portrait, or narrower than `1024px`) fails the run instead of
   * silently producing a mobile-format screenshot.
   */
  requireDesktop?: boolean;
  /**
   * Default extra settle time, in ms, applied after the page reports itself
   * fully loaded and before the screenshot is taken. Defaults to `350`.
   */
  settleMs?: number;
  /**
   * Default selectors that must not be visible before capturing (loading
   * spinners, skeletons). Merged with the runner's built-in defaults.
   */
  waitForHidden?: string[];
  /**
   * Selectors force-hidden (CSS `display:none`) before capturing, for decorative
   * indicators the application never hides on its own. Merged with the runner's
   * built-in defaults.
   */
  hideSelectors?: string[];
  /** Wait for the network to be idle again after actions; defaults to `true`. */
  waitForNetworkIdle?: boolean;
  /**
   * Upper bound, in ms, for a single scenario. A scenario that exceeds it is
   * failed with the step it was executing instead of hanging the whole run.
   * Defaults to `120000`.
   */
  scenarioTimeoutMs?: number;
  /** Scenarios, in guide order. */
  scenarios: StoryboardScenario[];
}

/** Runtime context shared with every phase handler. */
export interface StoryboardContext {
  page: Page;
  baseUrl: string;
  screenshotsDir: string;
  config: StoryboardConfig;
}

/** Serializable metadata attached to each generated screenshot. */
export interface StoryboardMeta {
  scenarioId: string;
  section: string;
  title: string;
  description: string;
  notes: string[];
  alt: string;
  screenshot: string;
  numbering: boolean;
  labels: boolean;
  highlighted: number;
  requested: number;
  warnings: string[];
}

const OVERLAY_ID = '__storyboard_overlay__';

const applyAction = async (page: Page, action: StoryboardAction): Promise<void> => {
  switch (action.type) {
    case 'click': {
      let locator = page.locator(action.selector);
      if (action.text !== undefined) locator = locator.filter({ hasText: action.text });
      const target = typeof action.nth === 'number' ? locator.nth(action.nth) : locator.first();
      await target.click({ timeout: action.timeout ?? 15000 });
      return;
    }
    case 'fill': {
      const locator = typeof action.nth === 'number' ? page.locator(action.selector).nth(action.nth) : page.locator(action.selector).first();
      await locator.fill(action.value, { timeout: action.timeout ?? 15000 });
      return;
    }
    case 'press': {
      if (action.selector) {
        await page.locator(action.selector).first().press(action.key);
      } else {
        await page.keyboard.press(action.key);
      }
      return;
    }
    case 'select': {
      const locator = typeof action.nth === 'number' ? page.locator(action.selector).nth(action.nth) : page.locator(action.selector).first();
      if (action.value !== undefined) await locator.selectOption(action.value);
      else if (action.label !== undefined) await locator.selectOption({ label: action.label });
      return;
    }
    case 'check': {
      const locator = typeof action.nth === 'number' ? page.locator(action.selector).nth(action.nth) : page.locator(action.selector).first();
      await locator.check();
      return;
    }
    case 'scrollIntoView': {
      await page.locator(action.selector).first().scrollIntoViewIfNeeded({ timeout: OPERATION_TIMEOUT_MS });
      return;
    }
    case 'wait': {
      await page.waitForTimeout(action.ms);
      return;
    }
    case 'waitForSelector': {
      await page
        .locator(action.selector)
        .first()
        .waitFor({ state: action.state ?? 'visible', timeout: action.timeout ?? 15000 });
      return;
    }
    case 'waitForUrl': {
      await page.waitForURL(new RegExp(action.pattern), { timeout: OPERATION_TIMEOUT_MS });
      return;
    }
    case 'setViewport': {
      await page.setViewportSize({ width: action.width, height: action.height });
      return;
    }
    default: {
      const exhaustive: never = action;
      throw new Error(`Unsupported storyboard action: ${JSON.stringify(exhaustive)}`);
    }
  }
};

/**
 * Waits for an embedded frame to finish loading before the screenshot is taken.
 *
 * Mirrors the established dashboard UI e2e wait (`waitKibanaFullLoad`), extended
 * to the full render chain so the storyboard does not race the frame's own render
 * cycle: the frame element must be attached, the embedded document must have
 * loaded, every loading indicator must be gone, and every ready marker (dashboard
 * panels/widgets) must be rendered before the capture. When requested, the frame's
 * network is then awaited to idle so data-driven panels have finished loading.
 */
const waitForFrame = async (page: Page, frameWait: StoryboardFrameWait): Promise<void> => {
  const timeout = frameWait.timeout ?? 60000;
  const frameElement = page.locator(frameWait.selector).first();

  // The frame element itself must exist on the host page before its content can
  // be awaited; an unattached frame would otherwise fail with a confusing
  // "frame not found" instead of a clear wait.
  await frameElement.waitFor({ state: 'attached', timeout });

  // Wait for the embedded document's own load event. `frameLocator` only
  // resolves once the frame exists; this makes the wait cover the frame
  // navigation, which is the point that used to be missed.
  const handle = await frameElement.elementHandle({ timeout }).catch(() => null);
  const contentFrame = handle ? await handle.contentFrame().catch(() => null) : null;
  if (contentFrame) {
    await contentFrame.waitForLoadState('domcontentloaded', { timeout }).catch(() => undefined);
  }

  const frame = page.frameLocator(frameWait.selector);

  // Loading indicators must be gone entirely (zero matches), not merely hidden on
  // the first match. This is the check the dashboard e2e helper performs.
  if (frameWait.loading?.length) {
    await expect(frame.locator(frameWait.loading.join(', '))).toHaveCount(0, { timeout });
  }

  // At least one ready marker must exist and every ready marker must be visible,
  // so a dashboard that has not rendered its panels yet is not captured.
  for (const selector of frameWait.ready ?? []) {
    const ready = frame.locator(selector);
    const count = await ready.count();
    if (!count) {
      throw new Error(
        `embedded frame is not ready: no "${selector}" inside ${frameWait.selector}`
      );
    }
    for (let index = 0; index < count; index += 1) {
      await expect(ready.nth(index)).toBeVisible({ timeout });
    }
  }

  if (frameWait.waitForNetworkIdle && contentFrame) {
    await contentFrame.waitForLoadState('networkidle', { timeout }).catch(() => undefined);
  }

  const settleMs = frameWait.settleMs ?? 0;
  if (settleMs > 0) await page.waitForTimeout(settleMs);
};

interface ResolvedHighlight {
  left: number;
  top: number;
  width: number;
  height: number;
  label?: string;
  number?: number;
  placeAbove: boolean;
  /** Rects of the text rendered inside the highlighted component. */
  textRects: Rect[];
  /** Resolved badge position, chosen to avoid overlapping other badges/boxes. */
  badgeLeft: number;
  badgeTop: number;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const intersects = (a: Rect, b: Rect, margin = 2): boolean =>
  a.x < b.x + b.width + margin &&
  b.x < a.x + a.width + margin &&
  a.y < b.y + b.height + margin &&
  b.y < a.y + a.height + margin;

/**
 * Resolves the badge position for a highlight box.
 *
 * The badge is drawn at the top-left corner of the box by default. When that
 * position would overlap the component's own text (its label or placeholder),
 * another highlight box, or an already-placed badge, the badge is moved to the next
 * corner, then inside the box, so the numbering stays legible on every screenshot.
 */
const resolveBadgePosition = (
  box: Rect,
  ownTextRects: Rect[],
  obstacles: Rect[],
  placed: Rect[]
): { left: number; top: number } => {
  const candidates = [
    { left: box.x - 13, top: box.y - 13 },
    { left: box.x + box.width - 9, top: box.y - 13 },
    { left: box.x - 13, top: box.y + box.height - 9 },
    { left: box.x + box.width - 9, top: box.y + box.height - 9 },
    { left: box.x + 2, top: box.y + 2 },
  ];
  let fallback: { left: number; top: number } | undefined;
  for (const candidate of candidates) {
    const left = Math.max(0, candidate.left);
    const top = Math.max(0, candidate.top);
    const badge: Rect = { x: left, y: top, width: BADGE_SIZE, height: BADGE_SIZE };
    fallback = fallback ?? { left, top };
    const clashes =
      ownTextRects.some((text) => intersects(badge, text, 0)) ||
      obstacles.some((obstacle) => intersects(badge, obstacle)) ||
      placed.some((other) => intersects(badge, other));
    if (!clashes) return { left, top };
  }
  return fallback ?? { left: Math.max(0, box.x + 2), top: Math.max(0, box.y + 2) };
};

/**
 * Returns the page-coordinate rectangles of the text rendered inside `selector`,
 * piercing shadow roots (Ionic form controls render their labels in shadow DOM). The
 * badge placement uses them to avoid covering the component's own label.
 */
const collectTextRects = async (page: Page, selector: string): Promise<Rect[]> => {
  const handle = await page.locator(selector).first().elementHandle().catch(() => null);
  if (!handle) return [];
  return handle.evaluate((host) => {
    const rects: { x: number; y: number; width: number; height: number }[] = [];
    const range = document.createRange();
    const visit = (root: Element | ShadowRoot): void => {
      const elements: Element[] = [];
      if (root instanceof Element) elements.push(root);
      elements.push(...Array.from(root.querySelectorAll('*')));
      for (const element of elements) {
        const shadow = (element as Element & { shadowRoot?: ShadowRoot | null }).shadowRoot;
        if (shadow) visit(shadow);
        for (const child of Array.from(element.childNodes)) {
          if (child.nodeType !== Node.TEXT_NODE) continue;
          if (!(child.textContent ?? '').trim()) continue;
          try {
            range.selectNodeContents(child);
            for (const rect of Array.from(range.getClientRects())) {
              if (rect.width > 0 && rect.height > 0) {
                rects.push({
                  x: rect.x + window.scrollX,
                  y: rect.y + window.scrollY,
                  width: rect.width,
                  height: rect.height,
                });
              }
            }
          } catch {
            /* detached text node — ignored intentionally */
          }
        }
      }
    };
    visit(host);
    return rects;
  });
};

const resolveHighlights = async (
  page: Page,
  highlights: StoryboardHighlight[],
  numbering: boolean
): Promise<{ boxes: ResolvedHighlight[]; warnings: string[] }> => {
  const boxes: ResolvedHighlight[] = [];
  const warnings: string[] = [];
  let number = 0;

  for (const highlight of highlights) {
    const locator = page.locator(highlight.selector).first();
    const count = await locator.count();
    if (!count) {
      warnings.push(`highlight selector not found: ${highlight.selector}`);
      continue;
    }
    await locator.scrollIntoViewIfNeeded({ timeout: OPERATION_TIMEOUT_MS }).catch(() => undefined);
    const box = await locator.boundingBox({ timeout: OPERATION_TIMEOUT_MS });
    if (!box) {
      warnings.push(`highlight selector has no box: ${highlight.selector}`);
      continue;
    }
    const offset = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
    const textRects = await collectTextRects(page, highlight.selector);
    number += 1;
    boxes.push({
      left: box.x + offset.x,
      top: box.y + offset.y,
      width: box.width,
      height: box.height,
      label: highlight.label,
      number: (highlight.number ?? numbering) ? number : undefined,
      placeAbove: box.y > 72,
      textRects,
      badgeLeft: 0,
      badgeTop: 0,
    });
  }

  const pad = HIGHLIGHT_PADDING;
  const obstacles: Rect[] = boxes.map((box) => ({
    x: box.left - pad,
    y: box.top - pad,
    width: box.width + pad * 2,
    height: box.height + pad * 2,
  }));
  const placed: Rect[] = [];
  boxes.forEach((box, index) => {
    const otherBoxes = obstacles.filter((_, i) => i !== index);
    const { left, top } = resolveBadgePosition(
      { x: box.left, y: box.top, width: box.width, height: box.height },
      box.textRects,
      otherBoxes,
      placed
    );
    box.badgeLeft = left;
    box.badgeTop = top;
    placed.push({ x: left, y: top, width: BADGE_SIZE, height: BADGE_SIZE });
  });

  return { boxes, warnings };
};

const drawHighlights = async (
  page: Page,
  boxes: ResolvedHighlight[],
  labels: boolean
): Promise<void> => {
  const payload = boxes.map((box) => ({
    left: box.left,
    top: box.top,
    width: box.width,
    height: box.height,
    label: labels ? box.label : undefined,
    number: box.number,
    badgeLeft: box.badgeLeft,
    badgeTop: box.badgeTop,
    padding: HIGHLIGHT_PADDING,
    radius: HIGHLIGHT_RADIUS,
    color: HIGHLIGHT_COLOR,
    borderPx: HIGHLIGHT_BORDER_PX,
    placeAbove: box.placeAbove,
  }));

  await page.evaluate(
    ({ items, overlayId }) => {
      const existing = document.getElementById(overlayId);
      if (existing) existing.remove();
      const overlay = document.createElement('div');
      overlay.id = overlayId;
      overlay.setAttribute('aria-hidden', 'true');
      Object.assign(overlay.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '0',
        height: '0',
        zIndex: '2147483647',
        pointerEvents: 'none',
      } as CSSStyleDeclaration);

      for (const item of items) {
        const pad = item.padding;
        const box = document.createElement('div');
        Object.assign(box.style, {
          position: 'absolute',
          left: `${item.left - pad}px`,
          top: `${item.top - pad}px`,
          width: `${item.width + pad * 2}px`,
          height: `${item.height + pad * 2}px`,
          border: `${item.borderPx}px solid ${item.color}`,
          borderRadius: `${item.radius}px`,
          boxSizing: 'border-box',
          boxShadow: `0 0 0 1px rgba(255,255,255,0.65), 0 4px 14px rgba(0,0,0,0.18)`,
        } as CSSStyleDeclaration);
        overlay.appendChild(box);

        if (item.number !== undefined) {
          const badge = document.createElement('div');
          badge.textContent = String(item.number);
          Object.assign(badge.style, {
            position: 'absolute',
            left: `${item.badgeLeft}px`,
            top: `${item.badgeTop}px`,
            minWidth: '22px',
            height: '22px',
            padding: '0 4px',
            borderRadius: '11px',
            background: item.color,
            color: '#ffffff',
            font: "600 12px/22px 'Segoe UI', system-ui, sans-serif",
            textAlign: 'center',
            boxSizing: 'border-box',
            boxShadow: '0 1px 4px rgba(0,0,0,0.35)',
          } as CSSStyleDeclaration);
          overlay.appendChild(badge);
        }

        if (item.label) {
          const callout = document.createElement('div');
          callout.textContent = item.label;
          const gap = 10;
          const calloutTop = item.placeAbove ? item.top - pad - gap : item.top + item.height + pad + gap;
          Object.assign(callout.style, {
            position: 'absolute',
            left: `${item.left - pad}px`,
            top: `${calloutTop}px`,
            transform: item.placeAbove ? 'translateY(-100%)' : 'none',
            maxWidth: '240px',
            padding: '4px 10px',
            borderRadius: '6px',
            background: '#0f172a',
            color: '#f8fafc',
            font: "500 12px/1.35 'Segoe UI', system-ui, sans-serif",
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            boxShadow: '0 4px 12px rgba(0,0,0,0.28)',
            border: '1px solid rgba(248,250,252,0.35)',
          } as CSSStyleDeclaration);
          overlay.appendChild(callout);

          const connector = document.createElement('div');
          Object.assign(connector.style, {
            position: 'absolute',
            left: `${item.left + Math.min(item.width / 2, 60)}px`,
            top: item.placeAbove ? `${calloutTop + 4}px` : `${calloutTop - 4}px`,
            width: '1px',
            height: `${gap}px`,
            background: 'rgba(15,23,42,0.55)',
            transform: item.placeAbove ? 'none' : 'none',
          } as CSSStyleDeclaration);
          overlay.appendChild(connector);
        }
      }

      document.body.appendChild(overlay);
    },
    { items: payload, overlayId: OVERLAY_ID }
  );
};

const clearHighlights = async (page: Page): Promise<void> => {
  await page
    .evaluate((overlayId) => {
      document.getElementById(overlayId)?.remove();
    }, OVERLAY_ID)
    .catch(() => undefined);
};

const renderGuide = (
  config: StoryboardConfig,
  results: PhaseResult<StoryboardContext>[]
): string => {
  const entries: StoryboardMeta[] = [];
  for (const result of results) {
    for (const metric of result.iterationMetrics) {
      const meta = metric.meta as unknown as StoryboardMeta | undefined;
      if (meta?.scenarioId) entries.push(meta);
    }
  }

  const guideDir = path.dirname(path.resolve(process.cwd(), config.guideFile));
  const screenshotRoot = path.resolve(process.cwd(), config.screenshotsDir);
  const imageRoot = path.posix.join(
    ...path.relative(guideDir, screenshotRoot).split(path.sep)
  );

  const sectionIntros = new Map<string, string>();
  const sectionLayouts = new Map<string, 'stack' | 'alternating'>();
  const orderedSections: string[] = [];
  for (const section of config.sections ?? []) {
    if (!orderedSections.includes(section.title)) orderedSections.push(section.title);
    if (section.intro) sectionIntros.set(section.title, section.intro);
    if (section.layout) sectionLayouts.set(section.title, section.layout);
  }
  for (const entry of entries) {
    if (!orderedSections.includes(entry.section)) orderedSections.push(entry.section);
  }

  const toc = orderedSections.map((title) => `- [${title}](#${slug(title)})`);

  const lines: string[] = [];
  lines.push(`# ${config.title}`, '');
  if (config.intro) lines.push(config.intro.trimEnd(), '');
  if (toc.length) lines.push('## Table of Contents', ...toc, '');

  const sections: string[] = [];
  for (const sectionTitle of orderedSections) {
    const sectionEntries = entries.filter((entry) => entry.section === sectionTitle);
    const intro = sectionIntros.get(sectionTitle);
    if (!sectionEntries.length && !intro) continue;
    sections.push(`# ${sectionTitle}`, '');
    if (intro) sections.push(intro.trimEnd(), '');
    const layout = sectionLayouts.get(sectionTitle) ?? config.layout ?? 'stack';
    if (layout === 'alternating' && sectionEntries.length) {
      sections.push(renderAlternatingTable(sectionEntries, imageRoot), '');
      continue;
    }
    for (const entry of sectionEntries) {
      sections.push(`## ${entry.title}`, '');
      sections.push(`![${entry.alt}](./${path.posix.join(imageRoot, `${entry.scenarioId}.png`)})`, '');
      if (entry.description) sections.push(entry.description.trimEnd(), '');
      if (entry.notes.length) {
        sections.push('**Notes**', '', ...entry.notes.map((note) => `- ${note}`), '');
      }
    }
  }

  return [...lines, ...sections].join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
};

/**
 * Normalizes a table cell to a single Markdown source line.
 *
 * Markdown tables are line-oriented: a row must be one physical source line. Any
 * newline that reaches a cell -- from a wrapped description or a multi-line note --
 * splits the row and breaks the table. Newlines are therefore collapsed to a
 * single space (they are source wrapping, not intended line breaks), backslashes and
 * pipes are escaped, and the result is trimmed so it cannot introduce a stray row.
 */
const normalizeTableCell = (value: string): string =>
  value
    .replace(/\r\n?/g, '\n')
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/\s*\n\s*/g, ' ')
    .trim();

/**
 * Renders a scenario's title, description and notes as a single table cell. The
 * cell is guaranteed to be one physical source line so the surrounding table stays
 * structurally valid Markdown.
 */
const renderScenarioCell = (entry: StoryboardMeta): string => {
  const parts = [`**${normalizeTableCell(entry.title)}**`];
  if (entry.description) parts.push(normalizeTableCell(entry.description));
  if (entry.notes.length) {
    parts.push(entry.notes.map((note) => `- ${normalizeTableCell(note)}`).join('<br>'));
  }
  return parts.join('<br><br>');
};

/**
 * Renders a section's scenarios as a two-column table, one scenario per row, with
 * the image alternating between the left and right column. Sequential screenshots
 * of the same user story therefore read as a single zig-zag flow.
 */
const renderAlternatingTable = (entries: StoryboardMeta[], imageRoot: string): string => {
  const rows = ['| | |', '| :---: | :--- |'];
  entries.forEach((entry, index) => {
    const image = `![${entry.alt}](./${path.posix.join(imageRoot, `${entry.scenarioId}.png`)})`;
    const text = renderScenarioCell(entry);
    rows.push(index % 2 === 0 ? `| ${image} | ${text} |` : `| ${text} | ${image} |`);
  });
  return rows.join('\n');
};

const slug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

/**
 * Reads the leading YAML frontmatter block (`---` ... `---`) from an existing
 * guide file so it can be preserved verbatim when the guide is regenerated. This
 * keeps publishing annotations already present in the target document intact.
 * Returns `null` when the file does not exist or does not start with frontmatter.
 */
const readExistingFrontmatter = async (filePath: string): Promise<string | null> => {
  let content: string;
  try {
    content = await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---(?=\r?\n|$)/);
  return match ? match[0] : null;
};

/**
 * Storyboard screenshot/user-guide runner.
 *
 * Reuses the `@decaf-ts/utils` `PerformanceRunner` scenario/phase machinery as
 * its execution engine: every storyboard scenario is compiled into a one-iteration
 * phase, and the inherited runner drives them sequentially. The subclass adds the
 * Playwright capture pipeline (navigate, act, highlight, screenshot) and renders
 * the Markdown user guide from the scenario metadata.
 */
export class StoryboardRunner extends PerformanceRunner<StoryboardContext> {
  private readonly performanceScenario: PerformanceScenario<StoryboardContext>;

  constructor(protected readonly config: StoryboardConfig) {
    const performanceScenario: PerformanceScenario<StoryboardContext> = {
      name: config.title,
      failOnError: true,
      enableCanvas: false,
      baseContext: {
        page: undefined as unknown as Page,
        baseUrl: config.baseUrl ?? '',
        screenshotsDir: config.screenshotsDir,
        config,
      },
      phases: config.scenarios.map((scenario, index) => ({
        name: scenario.title,
        config: {
          iterations: 1,
          mode: 'sequential',
          metadata: { scenarioIndex: index },
        } satisfies PhaseConfig<StoryboardContext>,
      })) as Phase<StoryboardContext>[],
      handler: async (payload: HandlerPayload<StoryboardContext>): Promise<HandlerResult> => {
        const index = Number(payload.config.metadata?.['scenarioIndex'] ?? 0);
        const scenario = payload.context.config.scenarios[index];
        const page = payload.context.page;
        const viewport = scenario.viewport ?? payload.context.config.viewport ?? DEFAULT_VIEWPORT;
        const requireDesktop = payload.context.config.requireDesktop ?? true;
        if (requireDesktop && (viewport.width < 1024 || viewport.width < viewport.height)) {
          throw new Error(
            `scenario "${scenario.id}" resolves to a non-desktop viewport ${viewport.width}x${viewport.height}; the user guide only accepts desktop captures`
          );
        }
        await page.setViewportSize(viewport);

        const warnings: string[] = [];
        const numbering = scenario.numbering ?? true;
        const labels = scenario.labels ?? false;
        const timeoutMs =
          scenario.scenarioTimeoutMs ?? payload.context.config.scenarioTimeoutMs ?? 120000;
        let step = 'viewport';

        const run = async (): Promise<HandlerResult> => {
          step = 'storage reset';
          await resetStorage(page);
          step = 'setup';
          if (scenario.setup) await scenario.setup(page, payload.context.config);
          const baseUrl = payload.context.baseUrl;
          const target = /^https?:\/\//.test(scenario.route) ? scenario.route : `${baseUrl}${scenario.route}`;
          step = `navigate to ${target}`;
          await page.goto(target, { waitUntil: scenario.waitUntil ?? 'networkidle', timeout: OPERATION_TIMEOUT_MS });
          step = 'actions';
          for (const action of scenario.actions ?? []) await applyAction(page, action);
          step = 'settle';
          await settlePage(page, {
            settleMs: scenario.settleMs ?? payload.context.config.settleMs ?? DEFAULT_SETTLE_MS,
            selectors: [
              ...DEFAULT_LOADING_SELECTORS,
              ...(payload.context.config.waitForHidden ?? []),
              ...(scenario.waitForHidden ?? []),
            ],
            networkIdle:
              scenario.waitForNetworkIdle ??
              payload.context.config.waitForNetworkIdle ??
              true,
          });

          if (scenario.waitForFrame) {
            step = `wait for frame ${scenario.waitForFrame.selector}`;
            await waitForFrame(page, scenario.waitForFrame);
          }

          const highlights = scenario.highlights ?? [];
          const scrollTarget = scenario.scrollTo ?? highlights[0]?.selector;
          step = 'scroll to capture target';
          if (scrollTarget) await page.locator(scrollTarget).first().scrollIntoViewIfNeeded({ timeout: OPERATION_TIMEOUT_MS }).catch(() => undefined);
          step = 'hide decorative indicators';
          await hideElements(page, [
            ...DEFAULT_HIDE_SELECTORS,
            ...(payload.context.config.hideSelectors ?? []),
            ...(scenario.hideSelectors ?? []),
          ]);
          if (highlights.length) {
            step = 'resolve highlights';
            const resolved = await resolveHighlights(page, highlights, numbering);
            warnings.push(...resolved.warnings);
            step = 'draw highlights';
            await drawHighlights(page, resolved.boxes, labels);
          }

          step = 'capture screenshot';
          const screenshotDir = path.resolve(process.cwd(), payload.context.screenshotsDir);
          await mkdir(screenshotDir, { recursive: true });
          const screenshot = path.join(screenshotDir, `${scenario.id}.png`);
          await page.screenshot({ path: screenshot, fullPage: scenario.fullPage ?? false, timeout: OPERATION_TIMEOUT_MS });
          await clearHighlights(page);

          const meta: StoryboardMeta = {
            scenarioId: scenario.id,
            section: scenario.section,
            title: scenario.title,
            description: scenario.description ?? '',
            notes: scenario.notes ?? [],
            alt: scenario.alt ?? scenario.title,
            screenshot,
            numbering,
            labels,
            highlighted: highlights.length - warnings.length,
            requested: highlights.length,
            warnings,
          };
          return { success: true, meta: meta as unknown as Record<string, unknown> };
        };

        try {
          return await withTimeout(
            run(),
            timeoutMs,
            () => `scenario "${scenario.id}" timed out after ${timeoutMs}ms during "${step}"`
          );
        } finally {
          await clearHighlights(page);
          if (scenario.teardown) await scenario.teardown(page, payload.context.config);
        }
      },
    };
    super(performanceScenario);
    this.performanceScenario = performanceScenario;
  }

  /** Runs the storyboard with the given page and writes the Markdown guide. */
  async runWithPage(page: Page, baseUrl?: string): Promise<PhaseResult<StoryboardContext>[]> {
    this.performanceScenario.baseContext = {
      ...(this.performanceScenario.baseContext ?? {}),
      page,
      baseUrl: this.config.baseUrl ?? baseUrl ?? '',
    } as StoryboardContext;
    return await this.run();
  }

  /** Renders the Markdown guide from the scenario results. */
  buildGuide(results: PhaseResult<StoryboardContext>[]): string {
    return renderGuide(this.config, results);
  }

  protected override shouldRenderCanvas(): boolean {
    return false;
  }

  protected override async logSummary(results: PhaseResult<StoryboardContext>[]): Promise<void> {
    const guide = this.buildGuide(results);
    const guideFile = path.resolve(process.cwd(), this.config.guideFile);
    await mkdir(path.dirname(guideFile), { recursive: true });
    const frontmatter = await readExistingFrontmatter(guideFile);
    await writeFile(guideFile, frontmatter ? `${frontmatter}\n\n${guide}` : guide, 'utf8');
    const captured = results.reduce((acc, result) => acc + result.aggregated.successCount, 0);
    const failures = results.reduce((acc, result) => acc + result.aggregated.failureCount, 0);
    console.log(
      `[Storyboard] ${captured} screenshot(s) captured, ${failures} failed. Guide written to ${guideFile}`
    );
    if (failures) {
      console.log('[Storyboard] Failed scenarios:');
      for (const result of results) {
        for (const metric of result.iterationMetrics) {
          if (metric.success) continue;
          const error = (metric.meta as { error?: string } | undefined)?.error ?? 'unknown error';
          console.log(`  - ${result.phase.name}: ${error}`);
        }
      }
    }
    for (const result of results) {
      for (const metric of result.iterationMetrics) {
        const meta = metric.meta as unknown as StoryboardMeta | undefined;
        if (!meta?.warnings?.length) continue;
        console.log(`[Storyboard] ${result.phase.name} — unresolved highlights:`);
        for (const warning of meta.warnings) console.log(`  - ${warning}`);
      }
    }
  }
}

interface SettleOptions {
  settleMs: number;
  selectors: string[];
  networkIdle: boolean;
}

/**
 * Waits until the page has fully settled before a screenshot is taken.
 *
 * Order matters: the network is awaited first (so a slow secondary query that
 * has not started yet is still caught), then every loading spinner/skeleton is
 * awaited out, and only then the small settle time is applied. Every wait is
 * best-effort with a bounded timeout, so a page that legitimately keeps a
 * connection open (for example an event stream) cannot hang the run.
 */
async function settlePage(page: Page, options: SettleOptions): Promise<void> {
  if (options.networkIdle) {
    await page.waitForLoadState('networkidle', { timeout: OPERATION_TIMEOUT_MS }).catch(() => undefined);
  }
  for (const selector of options.selectors) {
    await page
      .locator(selector)
      .first()
      .waitFor({ state: 'hidden', timeout: 5000 })
      .catch(() => undefined);
  }
  // A secondary query (list, audit trail, embedded dashboard) may only start once
  // the first one resolved; re-await the network before the settle time.
  if (options.networkIdle) {
    await page.waitForLoadState('networkidle', { timeout: OPERATION_TIMEOUT_MS }).catch(() => undefined);
  }
  if (options.settleMs > 0) {
    await page.waitForTimeout(options.settleMs);
  }
}

/**
 * Force-hides decorative selectors (`display:none`) before a screenshot. The
 * injected stylesheet is scoped to the current document and disappears on the
 * next navigation, so it never leaks into a later scenario.
 */
async function hideElements(page: Page, selectors: string[]): Promise<void> {
  const css = selectors
    .filter((selector) => selector.trim().length)
    .map((selector) => `${selector}{display:none !important;}`)
    .join('\n');
  if (!css) return;
  await page.addStyleTag({ content: css }).catch(() => undefined);
}

/**
 * Clears browser storage so every scenario starts from the same application
 * state. Without this, flows that persist acceptance (e.g. terms) leak into the
 * scenarios that run after them.
 */
async function resetStorage(page: Page): Promise<void> {
  await page
    .context()
    .addInitScript(() => {
      try {
        window.localStorage.clear();
        window.sessionStorage.clear();
      } catch {
        // storage may be unavailable on about:blank; ignored intentionally
      }
    })
    .catch(() => undefined);
}

/**
 * Rejects with the message from `onTimeout` when `promise` does not settle in
 * `timeoutMs`. Keeps a stuck browser operation from hanging the whole run.
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  onTimeout: () => string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(onTimeout())), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
