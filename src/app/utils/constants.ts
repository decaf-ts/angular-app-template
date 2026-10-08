import { OperationKeys } from '@decaf-ts/db-decorators';
import { IAccessControlRole, ITabItem } from './interfaces';

export const plaLongNames = ['pharmaledgerassoc', 'pharmaledgerassoc-oauth'];

export enum Namespaces {
  PTP = 'ptp',
  PLA = 'pla',
  EPI = 'epi',
}

export enum PTPRoles {
  ADMIN_ROLE = 'admin',
  WRITER_ROLE = 'writer',
  READER_ROLE = 'reader',
}

export enum CommonRoles {
  ADMIN_ROLE = 'admin',
  WRITER_ROLE = 'writer',
  READER_ROLE = 'reader',
}

export enum PLARoles {
  ADMIN_ROLE = `${Namespaces.PLA}-${PTPRoles.ADMIN_ROLE}`,
  WRITER_ROLE = `${Namespaces.PLA}-${PTPRoles.WRITER_ROLE}`,
  READER_ROLE = `${Namespaces.PLA}-${PTPRoles.READER_ROLE}`,
}

export enum EPIRoles {
  ADMIN_ROLE = `${Namespaces.EPI}-${PTPRoles.ADMIN_ROLE}`,
  WRITER_ROLE = `${Namespaces.EPI}-${PTPRoles.WRITER_ROLE}`,
  READER_ROLE = `${Namespaces.EPI}-${PTPRoles.READER_ROLE}`,
}

export const EPIDefaultWriterControlRole: IAccessControlRole = {
  namespaces: [Namespaces.EPI],
  roles: [EPIRoles.WRITER_ROLE],
  operation: OperationKeys.CREATE,
} as const;

export const EPIAdminRole: IAccessControlRole = {
  namespaces: [Namespaces.EPI],
  roles: [EPIRoles.ADMIN_ROLE],
  operation: OperationKeys.CREATE,
} as const;

export const PLADefaultWriterControlRole: IAccessControlRole = {
  namespaces: [Namespaces.PLA],
  roles: [PLARoles.WRITER_ROLE],
  operation: OperationKeys.CREATE,
} as const;

export const PLAAdminRole: IAccessControlRole = {
  namespaces: [Namespaces.PLA],
  roles: [PLARoles.ADMIN_ROLE],
  operation: OperationKeys.CREATE,
} as const;

export const AdminTableNames = {
  tasks: 'tasks',
  tasksEvents: 'task_event',
};

export const AdminAccountTypes = {
  admin: 'admin',
  organization: 'organization',
} as const;

export const AdminDefaultPages = {
  authToken: 'auth-token',
  logged: 'enrollments',
  enroll: 'enroll',
} as const;

export const SessionKeys = {
  account: 'account',
  token: 'token',
  enrollData: 'enrollData',
  roles: 'roles',
  accountType: 'accountType',
} as const;

export const EpiTabs: ITabItem[] = [
  {
    title: 'epiTabs.products',
    url: 'products',
  },
  {
    title: 'epiTabs.batches',
    url: 'batches',
  },
] as const;

export const LogTabs: ITabItem[] = [
  {
    title: 'logTabs.actions',
    value: 'actions',
    icon: 'assets/images/icons/lock.svg',
  },
  {
    title: 'logTabs.access',
    value: 'access',
    icon: 'assets/images/icons/users.svg',
  },
] as const;
