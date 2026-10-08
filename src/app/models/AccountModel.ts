import { OperationKeys } from '@decaf-ts/db-decorators';
import { model, ModelArg, required } from '@decaf-ts/decorator-validation';
import { CrudFieldComponent, NgxComponentDirective } from '@decaf-ts/for-angular';
import {
  ComponentEventNames,
  hidden,
  hideOn,
  HTML5InputTypes,
  uichild,
  uielement,
  uihandlers,
  UIKeys,
  uilayout,
  uionclick,
  uiorder,
  uitablecol,
} from '@decaf-ts/ui-decorators';
import { Account, AccountType } from '@pharmaledgerassoc/ptp-toolkit/shared';
import { OrganizationEnrollHandler } from 'src/app/handlers/admin/OrganizationEnrollHandler';
import { KeycloakClientRole } from '../forms/admin/KeycloakClientRole';
import { OrganizationDeploy } from '../handlers/admin/OrganizationDeploy';

const commonProps = {
  borders: false,
  required: true,
  ordenable: false,
  editable: false,
  multiple: false,
};

// @table(TableNames.Account)
@uilayout('ngx-decaf-crud-form', true, 1, { empty: { showButton: false } })
@uihandlers({
  [ComponentEventNames.Submit]: OrganizationEnrollHandler,
})
@model()
export class AccountModel extends Account {
  @hidden()
  @uielement('ngx-decaf-crud-field', {
    label: 'admin.accounts.id.label',
    readonly: true,
  })
  @hideOn(OperationKeys.CREATE)
  override id!: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'admin.accounts.deployed.label',
    readonly: true,
  })
  @uionclick(() => OrganizationDeploy)
  @uitablecol(UIKeys.FIRST, async (instance: CrudFieldComponent, prop: string, value: boolean) => {
    const account = instance.model as AccountModel;
    const phrase = await instance.translate(`admin.accounts.deployed.options.${value === true ? 'yes' : 'no'}`);
    return `<a class="dcf-button-toggle ${value ? 'dcf-active ' : ''}" title="${phrase}"><span></span></a> `;
  })
  @hideOn(OperationKeys.CREATE)
  override deployed: boolean = true;

  @uielement('ngx-decaf-crud-field', {
    label: 'admin.accounts.token.label',
    placeholder: 'admin.accounts.token.placeholder',
    readonly: true,
  })
  @uiorder(UIKeys.FIRST)
  @hideOn(OperationKeys.CREATE)
  override token!: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'admin.accounts.legalName.label',
    placeholder: 'admin.accounts.legalName.placeholder',
    // readonly: true,
  })
  @uitablecol(0)
  @uitablecol(UIKeys.FIRST)
  override legalName!: string;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'admin.accounts.orgName.label',
    placeholder: 'admin.accounts.orgName.placeholder',
    readonly: true,
  })
  @uitablecol(1)
  @uitablecol(UIKeys.FIRST)
  override orgName!: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'admin.enroll.onPrem.label',
    placeholder: 'admin.enroll.onPrem.placeholder',
    type: HTML5InputTypes.CHECKBOX,
    // readonly: true,
  })
  @uitablecol(3, async (instance: NgxComponentDirective) => {
    const account = instance.model as AccountModel;
    if (account) {
      return await instance.translateService.instant(
        `${instance.locale}.onPrem.options.${account.onPrem ? 'yes' : 'no'}`
      );
    }
  })
  @uiorder(UIKeys.FIRST)
  override onPrem: boolean = false;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'admin.accounts.mspId.label',
    placeholder: 'admin.accounts.mspId.placeholder',
    type: HTML5InputTypes.TEXTAREA,
    readonly: true,
  })
  @uitablecol(2)
  @hideOn(OperationKeys.CREATE)
  override mspId!: string;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'admin.accounts.endpoint.label',
    placeholder: 'admin.accounts.endpoint.placeholder',
  })
  @uitablecol(4)
  override endpoint!: string;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'admin.accounts.backendEndpoint.label',
    placeholder: 'admin.accounts.backendEndpoint.placeholder',
  })
  @uitablecol(5)
  override backendEndpoint!: string;

  // TODO: pensar em como relacionar num modelo,
  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'admin.enroll.modules.label',
    placeholder: 'admin.enroll.modules.placeholder',
    options: () => {
      return ['Epi'].map((s) => ({
        text: `admin.enroll.modules.options.${s.toLowerCase()}`,
        value: s,
        checked: true,
      }));
    },
    multiple: true,
    type: HTML5InputTypes.CHECKBOX,
  })
  modules!: string[]; // epi

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'admin.enroll.features.epi.label',
    placeholder: 'admin.enroll.features.epi.placeholder',
    options: () => {
      return ['recall', 'expiry'].map((s) => ({
        text: `admin.enroll.features.epi.options.${s.toLowerCase()}`,
        value: s,
      }));
    },
    multiple: true,
    type: HTML5InputTypes.CHECKBOX,
  })
  features!: string[]; // epi

  @uichild(
    KeycloakClientRole.name,
    'ngx-decaf-fieldset',
    {
      title: 'admin.enroll.epiAdmin.label',
      showTitle: false,
      ...commonProps,
      name: 'epiAdmin',
    },
    false
  )
  epiAdmin?: KeycloakClientRole;

  @uichild(
    KeycloakClientRole.name,
    'ngx-decaf-fieldset',
    {
      title: 'admin.enroll.epiWriter.label',
      showTitle: false,
      ...commonProps,
      name: 'epiWriter',
    },
    false
  )
  epiWriter?: KeycloakClientRole;

  @uichild(
    KeycloakClientRole.name,
    'ngx-decaf-fieldset',
    {
      title: 'admin.enroll.epiReader.label',
      showTitle: false,
      ...commonProps,
      name: 'epiReader',
    },
    false
  )
  epiReader?: KeycloakClientRole;

  @uielement('ngx-decaf-crud-field', {
    label: 'admin.enroll.classification.label',
    placeholder: 'admin.enroll.classification.placeholder',
    readonly: true,
  })
  @uiorder(UIKeys.LAST)
  @hideOn(OperationKeys.CREATE, OperationKeys.UPDATE)
  override classification: AccountType = AccountType.MAH;

  @uitablecol(7)
  override createdAt!: Date;

  constructor(args: ModelArg<AccountModel> = {}) {
    super(args);
  }
}
