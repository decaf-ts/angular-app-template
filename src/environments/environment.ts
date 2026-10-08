// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.
import { LoggedEnvironment, LogLevel } from '@decaf-ts/logging';
import { EWConfig } from './types';
const env: EWConfig = ((globalThis.window as Record<string, any>) || {})['ENV'] || {};
const ewConfig: EWConfig = {
  app: env?.app || 'EW Frontend',
  env: env?.env || 'development',
  organization: env?.organization || '',
  ptp: {
    host: env?.ptp?.host || 'localhost:3000',
    protocol: env?.ptp?.protocol || 'http',
  },
  keycloak: {
    host: env?.keycloak?.host || '',
    realm: env?.keycloak?.realm || '',
    clientId: env?.keycloak?.clientId || '',
    refreshThreshold: env?.keycloak?.refreshThreshold || 60,
  },
  kibana: {
    enabled: true,
    realm: env?.kibana?.realm || '',
    dashboard: env?.kibana?.dashboard,
    delay: env?.kibana?.delay || false,
  },
  blobs: {
    maxSize: env?.blobs?.maxSize || 26214400,
  },
  level: LogLevel.debug,
} as EWConfig;

export const Environment = LoggedEnvironment.accumulate(ewConfig);

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
