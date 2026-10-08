/**
 * @module ew-frontend/app-config
 * @description This module provides the application configuration for the ew-frontend.
 * @summary It configures the application's providers, including the router, database adapter, and internationalization.
 * @category Application
 */

import {
  isDevMode as angularDevMode,
  ApplicationConfig,
  InjectionToken,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter, RouteReuseStrategy, withComponentInputBinding } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import {
  getLogger,
  I18nResourceConfigType,
  provideDecafDbAdapter,
  provideDecafDynamicComponents,
  provideDecafI18nConfig,
  provideDecafPageTransition,
} from '@decaf-ts/for-angular';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { RootTranslateServiceConfig } from '@ngx-translate/core';

import { routes } from './app.routes';

import { Model } from '@decaf-ts/decorator-validation';
import { AxiosFlavour } from '@decaf-ts/for-http';
import { Environment } from 'src/environments/environment';
import pkg from '../../package.json';
import { AppSelectFieldComponent } from './components/select-field/select-field.component';
import { DecafAxiosHttpAdapter } from './utils/overrides';

export const isLocalDevelopmentMode = angularDevMode() || Environment.ptp.host.includes('ptp.internal');
export const DbAdapterFlavour = AxiosFlavour;
export const AppModels = [] as Model[];
export const AppName = pkg.description;
export const APP_MODEL_TOKENS = new InjectionToken<Model[]>('AppLoadedModels', {
  providedIn: 'root',
  factory: () => AppModels,
});
getLogger('').setConfig({ style: false });

export const AppConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    // provide locale components for decaf rendering engine
    // provideKeycloakAngular(),
    provideDecafDynamicComponents(
      AppSelectFieldComponent,
    ),
    provideDecafPageTransition(),

    provideDecafDbAdapter(
      DecafAxiosHttpAdapter,
      {
        protocol: Environment.ptp.protocol,
        host: Environment.ptp.host,
        events: true,
      },
      DbAdapterFlavour
    ),
    provideIonicAngular(),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideRouter(routes, withComponentInputBinding()),
    // provide dark theme
    // provideDecafDarkMode(),
    provideDecafI18nConfig(
      {
        fallbackLang: 'en',
        lang: 'en',
      } as RootTranslateServiceConfig,
      // optionally provide I18nLoader configuration, otherwise it will use default (same as setted below)
      {
        prefix: './assets/i18n/',
        suffix: '.json',
      } as I18nResourceConfigType
    ),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isLocalDevelopmentMode,
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
