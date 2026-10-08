/**
 * @module ew-frontend/zone-flags
 * @description This module sets Zone.js flags for Angular.
 * @summary It disables Zone.js patching for custom elements to prevent conflicts with Angular change detection.
 * @category Configuration
 */

/**
 * Prevents Angular change detection from
 * running with certain Web Component callbacks
 */
// eslint-disable-next-line no-underscore-dangle
(window as any).__Zone_disable_customElements = true;
