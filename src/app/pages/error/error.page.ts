import { Component, inject, Input, OnInit } from '@angular/core';
import { CardComponent, IconComponent, NgxModelPageDirective, NgxRouterService } from '@decaf-ts/for-angular';
import { IonButton, IonContent } from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';
import { take, timer } from 'rxjs';
import { ContainerComponent } from 'src/app/components/container/container.component';

@Component({
  selector: 'app-error',
  templateUrl: './error.page.html',
  styleUrls: ['./error.page.scss'],
  standalone: true,
  imports: [IonContent, IonButton, IconComponent, CardComponent, IconComponent, TranslatePipe, ContainerComponent],
})
export class ErrorPage extends NgxModelPageDirective implements OnInit {
  @Input()
  message: string | undefined;

  icon: string = 'ti-exclamation-circle';

  private routeService: NgxRouterService = inject(NgxRouterService);

  constructor() {
    super('error', false);
  }

  async ngOnInit(): Promise<void> {
    await super.initialize();
    if (!this.message) {
      this.message = this.routeService.getQueryParamValue('message') || 'generic';
    }
    if (this.message === 'notFound') {
      this.icon = 'ti-error-404';
    }
    if (!this.message.includes('error.')) {
      this.message = `error.${this.message}`;
    }
    this.message = (await this.translate(this.message)) as string;

    const menuSubsctiption = timer(1200)
      .pipe(take(1))
      .subscribe(async () => {
        await this.menuController.enable(false);
        menuSubsctiption.unsubscribe();
      });
  }
  async handleBack() {
    const redirect = this.routeService.getQueryParamValue('redirect');
    const lastUrl = redirect || this.routeService.getPreviousUrl() || 'dashboard';
    await this.router.navigateByUrl(lastUrl, {
      replaceUrl: true,
      onSameUrlNavigation: 'reload',
    });
  }
}
