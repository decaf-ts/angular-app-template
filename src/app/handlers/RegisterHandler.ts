import { Router } from '@angular/router';
import { ICrudFormEvent, KeyValue } from '@decaf-ts/for-angular';
import { AuthService } from '../services/auth.service';
import { BaseHandler } from './baseHandler';

export class RegisterHandler extends BaseHandler {
  /**
   * @description Handles the register event
   * @summary This method extracts the username and password from the event data
   * and checks if both are truthy values. It returns true if both username and
   * password are present, false otherwise.
   * @param {ICrudFormEvent} event - The event object containing login data
   * @return {Promise<boolean>} A promise that resolves to true if login is valid, false otherwise
   */
  override async handle(event: ICrudFormEvent): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { email, password, role } = (event.data as any) as KeyValue;
    const success = !!email && !!password;

    if (success) {
      setTimeout(async () => {
        await (this.router as Router).navigate(['/']);
      }, 50);
    }
    // const toast = await getNgxToastComponent().show({
    //   message: success ? "Login successful!" : "Invalid username or password.",
    //   duration: 3000,
    //   color: success ? "dark" : "danger",
    //   position: "top",
    // });
    // await toast.present();
  }
}
