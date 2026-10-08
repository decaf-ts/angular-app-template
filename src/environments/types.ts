import { LoggingConfig } from '@decaf-ts/logging';

export type EWConfig = LoggingConfig & {
  app: string;
  organization: string;
  env: string;
  ptp: {
    host: string;
    protocol: string;
  };
  keycloak: {
    host: string;
    realm: string;
    clientId: string;
    refreshThreshold: number;
  };
  kibana: {
    enabled: boolean;
    host: string;
    realm: string;
    dashboard: string;
    delay: number;
  };
  blobs: {
    maxSize: number;
  };
};
