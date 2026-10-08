import { OperationKeys } from '@decaf-ts/db-decorators';
import { date, model, ModelArg, required, type } from '@decaf-ts/decorator-validation';
import { CrudFieldComponent, NgxComponentDirective } from '@decaf-ts/for-angular';
import { hideOn, uielement, UIKeys, uilistmodel, uimodel, uionclick, uitablecol } from '@decaf-ts/ui-decorators';
import { AccountType, Token } from '@pharmaledgerassoc/ptp-toolkit/shared';
import { OrganizationEnrollHandler } from '../handlers/admin/OrganizationEnrollHandler';

async function readonlyMode(instance: CrudFieldComponent) {
  if (instance.operation === OperationKeys.UPDATE && (instance.model as TokenModel).claimed) {
    return true;
  }
}

@uilistmodel('app-token-item', { icon: 'ti-circle-key' })
@model()
@uimodel('ngx-decaf-crud-form', { empty: { showButton: false } })
export class TokenModel extends Token {
  @uielement('ngx-decaf-crud-field', {
    label: 'admin.token.id.label',
  })
  @hideOn(OperationKeys.CREATE)
  override id!: string;

  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'admin.token.mspid.label',
    placeholder: 'admin.token.mspid.placeholder',
    propsMapperFn: {
      readonly: async (instance: CrudFieldComponent) => {
        return readonlyMode(instance);
      },
    },
  })
  @uitablecol(UIKeys.FIRST)
  override mspid!: string;

  @type(String)
  @uielement('ngx-decaf-crud-field', {
    label: 'admin.token.classification.label',
    placeholder: 'admin.token.classification.placeholder',
    readonly: true,
    options: [{ label: 'account.classification.options.mah', value: AccountType.MAH }],
  })
  @uitablecol(UIKeys.FIRST)
  override classification: AccountType = AccountType.MAH;

  @date('dd/MM/yyyy HH:mm:ss:S')
  @uielement('ngx-decaf-crud-field', {
    label: 'admin.token.expiredAt.label',
    placeholder: 'admin.token.expiredAt.placeholder',
    // readonly: true,
    propsMapperFn: {
      value: async (instance: CrudFieldComponent) => {
        if (instance.value) {
          return `${instance.value}`.split(' ')[0];
        } else {
          instance.setValue(new Date());
        }
      },
    },
  })
  @uitablecol(UIKeys.LAST, async (instance: NgxComponentDirective, prop: string, value: string) => {
    return value.split(' ')[0];
  })
  override expiredAt!: Date;

  @uielement('ngx-decaf-crud-field', {
    label: 'admin.token.claimed.label',
    readonly: true,
  })
  @uitablecol(UIKeys.FIRST, async (instance: NgxComponentDirective, prop: string, value: boolean) => {
    const phrase = value === true ? 'yes' : 'no';
    return await instance.translate(`admin.token.claimed.options.${phrase}`);
  })
  override claimed: boolean = false;

  // @required()
  // @uielement('ngx-decaf-crud-field', {
  //   label: 'admin.token.claimed.label',
  //   readonly: true,
  // })
  // @uitablecol(UIKeys.FIRST, async (instance: NgxComponentDirective, prop: string, value: boolean) => {
  //   const phrase = value === true ? 'yes' : 'no';
  //   return await instance.translate(`admin.token.claimed.options.${phrase}`);
  // })
  // @hideOn(OperationKeys.CREATE, OperationKeys.UPDATE)
  // override claimed: boolean = false;

  @uielement('ngx-decaf-crud-field', {
    label: 'admin.token.claimed.label',
    readonly: true,
  })
  @uionclick(() => OrganizationEnrollHandler)
  @uitablecol(UIKeys.LAST, async (instance: CrudFieldComponent, prop: string, value: boolean, model: TokenModel) => {
    const { active, claimed } = model;
    return `<a class="dcf-button-toggle ${active ? ' dcf-active ' : ''} ${claimed ? ' locked ' : ''}"><span></span></a> `;
  })
  override active: boolean = true;

  @uitablecol(UIKeys.LAST, async (instance: NgxComponentDirective, prop: string, value: string) => {
    return value.split(' ')[0];
  })
  override createdAt!: Date;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(args?: ModelArg<TokenModel>) {
    super(args);
  }
}
