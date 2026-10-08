import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { CardComponent, KeyValue, NgxPageDirective } from '@decaf-ts/for-angular';
import { IonContent } from '@ionic/angular/standalone';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { AuthService } from 'src/app/services/auth.service';
import { ContainerComponent } from '../../components/container/container.component';

@Component({
  selector: 'app-account',
  templateUrl: './account.page.html',
  styleUrls: ['./account.page.scss'],
  standalone: true,
  imports: [CommonModule, HeaderComponent, IonContent, ContainerComponent, CardComponent],
})
export class AccountPage extends NgxPageDirective implements OnInit {
  account!: KeyValue;
  authService = inject(AuthService);
  constructor() {
    super('Account', false);
  }

  async ngOnInit(): Promise<void> {
    await super.initialize();
    this.account = JSON.stringify(await this.authService.getUserAccount(), null, 2) as unknown as KeyValue;
  }
}
