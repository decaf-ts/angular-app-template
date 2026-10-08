import { Component } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { ExploreContainerComponent } from '../pages/explore-container/explore-container.component';
import { DashboardPage } from '../pages/dashboard/dashboard.page';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, DashboardPage],
})
export class Tab1Page {
  constructor() {}
}
