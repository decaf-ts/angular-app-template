import {
  email,
  eq,
  minlength,
  model,
  Model,
  ModelArg,
  password,
  required,
} from "@decaf-ts/decorator-validation";
import { uielement, uihandlers, uimodel } from "@decaf-ts/ui-decorators";
import { pk } from "@decaf-ts/core";
import { RegisterHandler } from "../handlers/RegisterHandler";

@uimodel("ngx-decaf-crud-form")
@uihandlers({
  register: RegisterHandler,
})
@model()
export class RegisterForm extends Model {
  @pk()
  id!: number;

  @required()
  @minlength(2)
  @uielement("ngx-decaf-crud-field", {
    label: "register.name.label",
    placeholder: "register.name.placeholder",
  })
  name!: string;

  @required()
  @minlength(4)
  @uielement("ngx-decaf-crud-field", {
    label: "register.email.label",
    placeholder: "register.email.placeholder",
  })
  @email()
  email!: string;

  @uielement("ngx-decaf-crud-field", {
    label: "cellPhone.email.label",
    placeholder: "cellPhone.email.placeholder",
  })
  cellPhone!: Date | string;

  @uielement("ngx-decaf-crud-field", {
    label: "register.password.label",
    placeholder: "register.password.placeholder",
  })
  @password()
  @required()
  password!: string;

  @uielement("ngx-decaf-crud-field", {
    label: "register.password.label",
    placeholder: "register.password.placeholder",
  })
  @password()
  @required()
  @eq("password")
  confirmPassword!: string;

  constructor(args: ModelArg<RegisterForm> = {}) {
    super(args);
  }
}
