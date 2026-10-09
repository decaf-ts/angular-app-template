import { Directive, inject, Inject, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { OperationKeys } from '@decaf-ts/db-decorators';
import { Model, ModelKeys } from '@decaf-ts/decorator-validation';
import { CPTKN, getWindow, NgxModelPageDirective, NgxRouterService } from '@decaf-ts/for-angular';
import { shareReplay, takeUntil, timer } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { EPIDefaultWriterControlRole, Namespaces } from './constants';
import { IAccessControlRole } from './interfaces';
import { DecafAxiosHttpAdapter } from './overrides';

@Directive({
  standalone: true,
})
export class NgxEwBasePage extends NgxModelPageDirective implements OnChanges, OnDestroy {
  _initialized: boolean = false;

  routeService: NgxRouterService = inject(NgxRouterService);

  protected authService = inject(AuthService);

  hasWriterAccess: boolean = false;

  override limit: number = 10;

  constructor(
    // eslint-disable-next-line @angular-eslint/prefer-inject
    @Inject(CPTKN) localeRoot: string = 'NgxPageDirective',
    // eslint-disable-next-line @angular-eslint/prefer-inject
    protected disableCrudOperations: OperationKeys[] = [OperationKeys.DELETE],
    // eslint-disable-next-line @angular-eslint/prefer-inject
    public createAccessControlRole: IAccessControlRole = EPIDefaultWriterControlRole
  ) {
    super(localeRoot);
    this.disableCrudOperations = disableCrudOperations ?? [];
  }

  override async initialize() {
    this.hasWriterAccess = await this.authService.isAllowed(this.createAccessControlRole);
    if (!this.hasWriterAccess) {
      this.disableCrudOperations = [OperationKeys.CREATE, OperationKeys.UPDATE, OperationKeys.DELETE];
    }

    this.enableCrudOperations(this.disableCrudOperations);

    if (this.operation) {
      this.title = `${this.locale}.${this.operation}`;
    } else {
      this.title = `${this.locale}.title`;
    }
    await super.initialize();
    this._initialized = true;
    this.changeDetectorRef.detectChanges();
  }

  async isPlaUser(): Promise<boolean> {
    return await this.authService.hasNameSpace(Namespaces.PLA);
  }

  override async ngOnChanges(changes: SimpleChanges): Promise<void> {
    await super.ngOnChanges(changes);
    if (changes[ModelKeys.MODEL]) {
      const { currentValue } = changes[ModelKeys.MODEL];
      if (currentValue) {
        await this.initialize();
      }
    }
  }

  // override async ngOnDestroy(): Promise<void> {
  //   await super.ngOnDestroy();
  //   this._initialized = false;
  // }

  override async ionViewWillEnter() {
    await super.ionViewWillEnter();

    // to ensure data load when back button is used and model is already set
    if (this.operation === OperationKeys.READ) {
      if (!this.model) {
        this.initialized = false;
        this.model = Model.build({ [this.name]: this._data }, this.repository.class.name);
        this.initialized = this._initialized = true;
        this.changeDetectorRef.detectChanges();
      }
    }
  }

  async ionViewDidEnter(): Promise<void> {
    // await this.handleRefresh();
  }

  async handleRefresh(): Promise<void> {
    if (DecafAxiosHttpAdapter.disableEvents && !this.operation) {
      const win = getWindow();
      const forceRefresh = this.routeService.hasQueryParam('refresh') || win['forceRefresh'];
      if (forceRefresh) {
        this.log.for(this.handleRefresh).info(`Events are disabled in config, forcing refresh...`);
        this.initialized = this._initialized = false;
        timer(2)
          .pipe(takeUntil(this.destroySubscriptions$), shareReplay({ bufferSize: 1, refCount: true }))
          .subscribe(() => {
            this.initialized = this._initialized = true;
            win['forceRefresh'] = false;
          });
      }
    }
  }
}
