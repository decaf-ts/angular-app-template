import {
  email,
  minlength,
  model,
  Model,
  ModelArg,
  password,
  required,
} from "@decaf-ts/decorator-validation";
import { uielement, uihandlers, uimodel } from "@decaf-ts/ui-decorators";
import { LoginHandler } from "../handlers/LoginHandler";
import { pk } from "@decaf-ts/core";

@uimodel("ngx-decaf-crud-form")
@uihandlers({
  login: LoginHandler,
})
@model()
export class LoginForm extends Model {
  @pk()
  id!: number;

  @required()
  @minlength(4)
  @uielement("ngx-decaf-crud-field", {
    label: "login.email.label",
    placeholder: "login.email.placeholder",
  })
  @email()
  email!: string;

  @uielement("ngx-decaf-crud-field", {
    label: "login.password.label",
    placeholder: "login.password.placeholder",
  })
  @password()
  @required()
  password!: string;

  constructor(args: ModelArg<LoginForm> = {}) {
    super(args);
  }
}
