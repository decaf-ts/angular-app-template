import { model, Model, ModelArg, required } from '@decaf-ts/decorator-validation';
import { uielement, uilayoutprop, uimodel } from '@decaf-ts/ui-decorators';

@uimodel('ngx-decaf-crud-form', { multiple: false })
@model()
export class KeycloakClientRole extends Model {
  // @pk()
  @uielement('ngx-decaf-crud-field', {
    label: 'admin.enroll.keyCloack.roleName.label',
    placeholder: 'admin.enroll.keyCloack.roleName.placeholder',
  })
  @required()
  @uilayoutprop(1)
  roleName!: string;

  @uielement('ngx-decaf-crud-field', {
    label: 'admin.enroll.keyCloack.claimValue.label',
    placeholder: 'admin.enroll.keyCloack.claimValue.placeholder',
  })
  @required()
  @uilayoutprop(1)
  claimValue!: string;

  // @uielement('ngx-decaf-crud-field', {
  //   label: 'keyCloack.description.label',
  //   placeholder: 'keyCloack.description.placeholder',
  // })
  // @required()
  // @uilayoutprop(1)
  // description!: string;

  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(model?: ModelArg<KeycloakClientRole>) {
    super(model);
  }
}
