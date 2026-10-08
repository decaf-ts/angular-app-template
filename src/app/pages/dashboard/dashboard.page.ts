import { Component, inject, Input, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { NgxPageDirective } from '@decaf-ts/for-angular';
import { IonContent, IonSpinner } from '@ionic/angular/standalone';
import { take, timer } from 'rxjs';
import { HeaderComponent } from 'src/app/components/header/header.component';
import { AuthService } from 'src/app/services/auth.service';
import { Environment } from 'src/environments/environment';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [HeaderComponent, IonContent, IonSpinner],
})
export class DashboardPage extends NgxPageDirective implements OnInit, OnDestroy {
  startTime = 'now-15d';

  endTime = 'now';

  height: string = '100%';

  safeUrl: SafeUrl | string = '';

  sanitizer: DomSanitizer = inject(DomSanitizer);

  private authService = inject(AuthService);

  @Input()
  visible = false;

  delay: number | string = Environment.kibana.delay;

  private _kibanaRefreshTimeout: ReturnType<typeof setTimeout> | null = null;

  private _kibanaRefreshInterval: ReturnType<typeof setInterval> | null = null;

  private readonly _kibanaKeepAliveMs = 60 * 1000;

  constructor() {
    super('Dashboard', true);
  }

  async ngOnInit(): Promise<void> {
    const delay = this.parseDelay(this.delay);
    if (delay > 0) {
      this.initialize().then((_) => this.log.info('dashboard initialized'));
      return;
    }
    return this.initialize();
  }

  override async ngOnDestroy(): Promise<void> {
    if (this._kibanaRefreshTimeout) {
      clearTimeout(this._kibanaRefreshTimeout);
      this._kibanaRefreshTimeout = null;
    }
    if (this._kibanaRefreshInterval) {
      clearInterval(this._kibanaRefreshInterval);
      this._kibanaRefreshInterval = null;
    }
    await super.ngOnDestroy();
  }

  private scheduleKibanaRefresh(token: string): void {
    try {
      const b64 = token.split('.')[1];
      const { exp } = JSON.parse(atob(b64.replace(/-/g, '+').replace(/_/g, '/')));
      const msUntilRefresh = (exp as number) * 1000 - Date.now() - 180_000;
      const delay = msUntilRefresh > 0 ? msUntilRefresh : 15_000;
      if (this._kibanaRefreshTimeout) {
        clearTimeout(this._kibanaRefreshTimeout);
      }
      this._kibanaRefreshTimeout = setTimeout(() => this.refreshKibanaAuth(), delay);
    } catch {
      /* ignore — token not decodable or no exp */
    }
  }

  private async refreshKibanaAuth(): Promise<void> {
    const { ptp } = Environment;
    await this.authService.isLoggedIn(false);
    const token = (await this.authService.getToken()) as string;
    if (!token) return;
    await fetch(`${ptp.protocol}://${ptp.host}/kibana/auth`, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: 'include',
    });
    this.scheduleKibanaRefresh(token);
    this.startKibanaKeepAlive();
  }

  private parseDelay(delay: string | number): number {
    if (typeof delay === 'string') {
      try {
        return parseInt(delay, 10) || -1;
      } catch (e: unknown) {
        return -1;
      }
    }
    return delay;
  }

  override async initialize(): Promise<void> {
    this.hasMenu.set(true);

    const { ptp, kibana } = Environment;
    if (!kibana.enabled) return;
    const dl = this.parseDelay(kibana.delay ?? 2000);
    if (dl && dl > 0) await new Promise((resolve) => setTimeout(resolve, dl));
    // Exchange the Bearer token for a session cookie on the backend.
    // The cookie is scoped to /kibana and will be sent automatically by the
    // browser for every request the iframe makes, so Kibana's internal API
    // calls are authenticated without needing Authorization headers.
    const token = (await this.authService.getToken()) as string;
    if (token) {
      await fetch(`${ptp.protocol}://${ptp.host}/kibana/auth`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      }).catch(() => {
        // best-effort — iframe will show a 401 if this fails
      });
      this.scheduleKibanaRefresh(token);
      this.startKibanaKeepAlive();
    }

    const baseUrl = `${ptp.protocol}://${ptp.host}/kibana/s/${kibana.realm}/app/dashboards#/view/${kibana.dashboard}?embed=true&show-time-filter=true&show-query-input=true&_g=(time:(from:${this.startTime},to:${this.endTime}))`;

    // const baseUrl = `${ptp.protocol}://${ptp.host}/kibana/s/${kibana.realm}/app/dashboards?embed=true&show-time-filter=true&show-query-input=true&_g=(time:(from:${this.startTime},to:${this.endTime}))#/view/${kibana.dashboard}`;
    this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(baseUrl);
    timer(2000)
      .pipe(take(1))
      .subscribe(() => {
        this.visible = true;
        this.changeDetectorRef.detectChanges();
      });
  }

  private startKibanaKeepAlive(): void {
    if (this._kibanaRefreshInterval) {
      clearInterval(this._kibanaRefreshInterval);
    }
    this._kibanaRefreshInterval = setInterval(() => {
      void this.refreshKibanaAuth();
    }, this._kibanaKeepAliveMs);
  }
}
