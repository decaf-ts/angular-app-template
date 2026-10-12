import { Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonButton, IonCard, IonCardHeader, IonCardSubtitle, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ModelRendererComponent, NgxPageDirective } from '@decaf-ts/for-angular';
import { timer } from 'rxjs';
import { AppName } from 'src/app/app.config';
import { LogoComponent } from 'src/app/components/logo/logo.component';

import { AuthService } from 'src/app/services/auth.service';
import { RegisterForm } from 'src/app/forms/RegisterForm';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [IonContent, LogoComponent, ModelRendererComponent, RouterLink, IonCard, IonCardHeader, IonCardSubtitle],
})
export class RegisterPage extends NgxPageDirective implements OnInit {
  authService = inject(AuthService);

  @Input()
  loggedOut: boolean = false;

  AppName: string = AppName;

  image: string = 'assets/images/app-mark.svg';

  error: boolean = false;

  authenticated: boolean = false;

  constructor() {
    super('RegisterPage', false);
  }

  async ngOnInit(): Promise<void> {
    this.model = new RegisterForm();
    AuthService.setloggedIn(false);
    await super.initialize();
  }
}