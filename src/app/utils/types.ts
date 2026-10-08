import { Route } from '@angular/router';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { IMenuItem, KeyValue } from '@decaf-ts/for-angular';
import { EPIRoles, PLARoles, PTPRoles } from './constants';
import { IAppMenuItem } from './interfaces';

export type LeafletFileItem = File & { source: string };

export type StorageEntry = string | number | KeyValue | boolean | null;

export type AccessWhen = 'feature' | 'role' | 'module';

export type MenuLike = IAppMenuItem & IMenuItem;

export type UserRoles = PTPRoles | PLARoles | EPIRoles;

export type RouteLike = Route & {
  roles?: UserRoles[];
  namespaces?: string[];
  menu?: IAppMenuItem;
  children?: RouteLike[];
  blockOperations?: OperationKeys[];
};
