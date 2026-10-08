import { TaskStatus } from '@decaf-ts/core';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { Terminal } from '@xterm/xterm';
import { Subscription } from 'rxjs';
import { UserRoles } from './types';
export interface IProductCodeWatcher {
  control: object;
  productCode?: string;
  subscription: Subscription;
}
export interface ITaskTerminalStep {
  name: string;
  terminal: Terminal | undefined;
  step: number;
  initialized: boolean;
  finished: boolean;
  error: boolean;
  hidden: boolean;
}
export interface ITaskEventItem {
  msg?: string;
  classification: string;
  status: TaskStatus;
  currentStep?: number;
  totalSteps?: number;
}
export interface IAppMenuItem {
  label?: string;
  title?: string;
  url?: string;
  icon?: string;
  hidden?: boolean;
  color?: string;
  activeWhen?: string[];
  // roles?: UserRoles[];
  // namespaces?: string[];
}

export interface ITabItem {
  title?: string;
  description?: string;
  url?: string;
  value?: string;
  icon?: string;
}

interface IKeycloakResourceAccess {
  roles: UserRoles[];
}

export interface IKeycloakIdToken {
  exp: number;
  iat: number;
  auth_time: number;
  jti: string;
  iss: string;
  aud: string;
  sub: string;
  typ: string;
  azp: string;
  sid: string;
  at_hash: string;
  acr: string;
  resource_access: {
    account?: IKeycloakResourceAccess;
    [resource: string]: IKeycloakResourceAccess | undefined;
  };
  email_verified: boolean;
  name: string;
  preferred_username: string;
  given_name: string;
  family_name: string;
  email: string;
}

export interface IAccessControlRole {
  roles?: UserRoles[];
  namespaces?: string[];
  operation?: OperationKeys.CREATE;
}
