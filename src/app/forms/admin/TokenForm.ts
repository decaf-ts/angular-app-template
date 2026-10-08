import { table } from '@decaf-ts/core';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { Model, ModelArg, required } from '@decaf-ts/decorator-validation';
import { HTML5InputTypes, uielement, uihandlers, uimodel } from '@decaf-ts/ui-decorators';
import { OrganizationEnrollHandler } from 'src/app/handlers/admin/OrganizationEnrollHandler';

@uimodel('ngx-decaf-crud-form', { operation: OperationKeys.CREATE })
@uihandlers({
  validate: OrganizationEnrollHandler,
})
@table('token')
export class TokenForm extends Model {
  @required()
  @uielement('ngx-decaf-crud-field', {
    label: 'admin.token.id.label',
    placeholder: 'admin.token.id.placeholder',
    type: HTML5InputTypes.TEXTAREA,
    // readonly: true,
  })
  token!: string;
  constructor(args: ModelArg<TokenForm> = {}) {
    super(args);
  }
}

// @uimodel('ngx-decaf-crud-form')
// @uihandlers({
//   validate: OrganizationTokenHandler,
// })
// @model()
// export class TokenForm extends Model {
//   @required()
//   @uielement('ngx-decaf-crud-field', {
//     label: 'admin.token.mspid.label',
//     placeholder: 'admin.token.mspid.placeholder',
//     type: HTML5InputTypes.TEXTAREA,
//     // readonly: true,
//   })
//   mspid!: string;

//   @uielement('ngx-decaf-crud-field', {
//     label: 'admin.token.classification.label',
//     placeholder: 'admin.token.classification.placeholder',
//     disabled: true,
//     // readonly: true,
//     options: [{ label: 'account.classification.mah', value: AccountType.MAH }],
//   })
//   classification: AccountType = AccountType.MAH;
//   constructor(args: ModelArg<TokenForm> = {}) {
//     super(args);
//   }
// }
