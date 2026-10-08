/**
 * @module ew-frontend/polyfills
 * @description This module provides polyfills for the application.
 * @summary It imports `zone.js` and sets up global variables for browser compatibility.
 * @category Application
 */

/**
 * This file includes polyfills needed by Angular and is loaded before the app.
 * You can add your own extra polyfills to this file.
 *
 * This file is divided into 2 sections:
 *   1. Browser polyfills. These are applied before loading ZoneJS and are sorted by browsers.
 *   2. Application imports. Files imported after ZoneJS that should be loaded before your main
 *      file.
 *
 * The current setup is for so-called "evergreen" browsers; the last versions of browsers that
 * automatically update themselves. This includes recent versions of Safari, Chrome (including
 * Opera), Edge on the desktop, and iOS and Chrome on mobile.
 *
 * Learn more in https://angular.io/guide/browser-support
 */

/***************************************************************************************************
 * BROWSER POLYFILLS
 */

/**
 * By default, zone.js will patch all possible macroTask and DomEvents
 * user can disable parts of macroTask/DomEvents patch by setting following flags
 * because those flags need to be set before `zone.js` being loaded, and webpack
 * will put import in the top of bundle, so user need to create a separate file
 * in this directory (for example: zone-flags.ts), and put the following flags
 * into that file, and then add the following code before importing zone.js.
 * import './zone-flags';
 *
 * The flags allowed in zone-flags.ts are listed here.
 *
 * The following flags will work for all browsers.
 *
 * (window as any).__Zone_disable_requestAnimationFrame = true; // disable patch requestAnimationFrame
 * (window as any).__Zone_disable_on_property = true; // disable patch onProperty such as onclick
 * (window as any).__zone_symbol__UNPATCHED_EVENTS = ['scroll', 'mousemove']; // disable patch specified eventNames
 *
 *  in IE/Edge developer tools, the addEventListener will also be wrapped by zone.js
 *  with the following flag, it will bypass `zone.js` patch for IE/Edge
 *
 *  (window as any).__Zone_enable_cross_context_check = true;
 *
 */
// import '@decaf-ts/decoration';
// import '@decaf-ts/logging';
// import { Logging } from '@decaf-ts/logging';

// import { Environment } from './environments/environment';
// Logging.setConfig(Environment);
// const log = Logging.for('boot');

// import '@decaf-ts/decorator-validation';
// import '@decaf-ts/injectable-decorators';
// import '@decaf-ts/db-decorators';
// import '@decaf-ts/transactional-decorators';
// import '@decaf-ts/core';
// import '@decaf-ts/ui-decorators';
// import '@decaf-ts/for-http';
// import { AxiosHttpAdapter } from '@decaf-ts/for-http';
// log.debug(`loaded ${AxiosHttpAdapter.name} adapter`);
// import '@decaf-ts/for-angular';
// import '@pharmaledgerassoc/ptp-toolkit/shared';

// // import '@pharmaledgerassoc/ptp-xml';
// import { Metadata } from '@decaf-ts/decoration';

// console.log(Metadata.libraries());

// import { RamAdapter, RamFlavour } from '@decaf-ts/core/ram';
// RamAdapter.decoration();
// Adapter.setCurrent(RamFlavour);
import './zone-flags';

/***************************************************************************************************
 * Zone JS is required by default for Angular itself.
 */
import 'zone.js'; // Included with Angular CLI.

/***************************************************************************************************
 * APPLICATION IMPORTS
 */

((globalThis as any).window as any).global = (globalThis as any).window;
(globalThis as any).global = (globalThis as any).global || globalThis.window;
(globalThis as any).Buffer = (globalThis as any).Buffer || [];
(globalThis as any).process = (globalThis as any).process || {
  env: { DEBUG: undefined },
  version: '',
};
