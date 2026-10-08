/**
 * @description Unit tests for `AppSelectFieldComponent`.
 *
 * The component extends decaf's `CrudFieldComponent`, which pulls a deep
 * injection chain (NgxRouterService, translation, Ionic controllers). Following
 * the repo pattern (external-file-upload.component.spec.ts), the decaf module is
 * mocked so the component can be exercised in isolation against the repo jest
 * config. The cross-field behavior under test is driven by two triggers:
 *  - URL query params (productCode / batchNumber), read in `ngAfterViewInit`; or
 *  - window `ChangeEvent` broadcasts consumed in `handleEvent`.
 */
jest.mock('@decaf-ts/for-angular', () => {
  const { Component } = require('@angular/core');
  const { FormGroup } = require('@angular/forms');

  /**
   * Minimal stand-in for decaf's `CrudFieldComponent`: the template renders the
   * `@else` error branch (formControl is undefined) and the subclass logic is
   * exercised directly.
   */
  // decorated: the class declares Angular lifecycle hooks, and the language
  // service (and AOT) require an explicit decorator for that
  @Component({ template: '' })
  class MockCrudFieldComponent {
    name = 'productCode';
    value: unknown = '';
    operation = 'create';
    readonly = false;
    disabled = false;
    hidden = false;
    required = false;
    initialized = false;
    label = '';
    placeholder = '';
    uid = 'test-uid';
    className = '';
    type = 'select';
    HTML5InputTypes = { SELECT: 'select' };
    options: Array<{ text?: string; value?: unknown; disabled?: boolean }> = [];
    multiple = false;
    activeFormGroup = new FormGroup({});
    formControl: unknown = undefined;
    formGroup: { enable?: () => void; get?: (n: string) => unknown } | undefined;
    fill = 'outline';
    labelPlacement = 'stacked';
    interface = 'action-sheet';
    component: { nativeElement?: unknown } | undefined = undefined;
    model: unknown = undefined;
    routerService: { getQueryParamValue: jest.Mock } = { getQueryParamValue: jest.fn(() => undefined) };
    changeDetectorRef = { detectChanges: jest.fn(), markForCheck: jest.fn() };
    log = { for: () => ({ error: jest.fn(), debug: jest.fn(), info: jest.fn() }) };

    ngOnInit() {}
    ngAfterViewInit() {}
    onDestroy() {}
    initialize() {}
    getValue() {
      return this.value;
    }
    setValue(v: unknown) {
      this.value = v;
    }
    handleClearValue() {
      this.value = '';
    }
    getOptions() {
      return this.options;
    }
    handleModalChildChanges() {}
    openSelectOptions() {}
    trackItemFn(_i: number, key: unknown) {
      return key;
    }
  }

  const Dynamic = () => (target: unknown) => target;
  return {
    CrudFieldComponent: MockCrudFieldComponent,
    Dynamic,
    getModelAndRepository: jest.fn().mockReturnValue(undefined),
    windowEventEmitter: jest.fn(),
    setOnWindow: (key: string, value: unknown) => {
      (window as unknown as Record<string, unknown>)[key] = value;
    },
    getOnWindow: (key: string) => (window as unknown as Record<string, unknown>)[key],
    IconComponent: Component({ selector: 'ngx-decaf-icon', standalone: true, template: '<span></span>' })(
      class MockIconComponent {}
    ),
  };
});

jest.mock('@ngx-translate/core', () => {
  const { Pipe } = require('@angular/core');
  const TranslatePipe = Pipe({ name: 'translate', standalone: true })(class MockTranslatePipe {
    transform(value: unknown) {
      return value;
    }
  });
  return { TranslatePipe, TranslateService: class TranslateService {} };
});

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { ComponentEventNames } from '@decaf-ts/ui-decorators';
import { LeafletType, Product } from '@pharmaledgerassoc/ptp-toolkit/shared';

import * as decaf from '@decaf-ts/for-angular';
import { AppSelectFieldComponent } from './select-field.component';

describe('AppSelectFieldComponent', () => {
  let component: AppSelectFieldComponent;
  let fixture: ComponentFixture<AppSelectFieldComponent>;
  const getModelAndRepository = decaf.getModelAndRepository as unknown as jest.Mock;
  const windowEventEmitter = decaf.windowEventEmitter as unknown as jest.Mock;

  const batch = (batchNumber: string, productCode = 'P001') =>
    ({ batchNumber, productCode, id: `${productCode}:${batchNumber}` }) as unknown as Product;

  const changeEvent = (source: string, value: unknown, bubbles = false): CustomEvent =>
    ({ detail: { source, value, bubbles } }) as unknown as CustomEvent;

  /** Runs the init sequence manually so query params can be staged per test. */
  const init = async (): Promise<void> => {
    await component.ngOnInit();
    await component.ngAfterViewInit();
  };

  const setField = (name: string): void => {
    (component as unknown as { name: string }).name = name;
  };

  const setOperation = (operation: string): void => {
    (component as unknown as { operation: string }).operation = operation;
  };

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [AppSelectFieldComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AppSelectFieldComponent);
    component = fixture.componentInstance;
    windowEventEmitter.mockClear();
    getModelAndRepository.mockClear().mockReturnValue(undefined);
    jest.clearAllMocks();
    delete (window as unknown as Record<string, unknown>)['_lastProduct'];
  }));

  describe('creation and defaults', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });
  });

  describe('ngOnInit', () => {
    it('locks productCode to readonly outside create operations', async () => {
      setField('productCode');
      setOperation('update');
      await component.ngOnInit();
      expect(component.readonly).toBe(true);
    });

    it('keeps productCode editable on create', async () => {
      setField('productCode');
      setOperation('create');
      await component.ngOnInit();
      expect(component.readonly).toBe(false);
    });

    it('does not lock other fields', async () => {
      setField('epiMarket');
      setOperation('read');
      await component.ngOnInit();
      expect(component.readonly).toBe(false);
    });
  });

  describe('URL query param reactions (ngAfterViewInit, create)', () => {
    beforeEach(() => {
      setOperation('create');
      (component as unknown as { initialized: boolean }).initialized = true;
    });

    it('emits nothing when no params and no value are present', async () => {
      setField('productCode');
      await init();
      expect(windowEventEmitter).not.toHaveBeenCalled();
    });

    it('sets readonly + value from a productCode param and broadcasts it once', async () => {
      setField('productCode');
      (component.routerService.getQueryParamValue as jest.Mock).mockImplementation(
        (key: string) => (key === 'productCode' ? 'P001' : undefined)
      );
      await init();

      expect(component.value).toBe('P001');
      expect(component.readonly).toBe(true);
      expect(windowEventEmitter).toHaveBeenCalledTimes(1);
      expect(windowEventEmitter).toHaveBeenCalledWith(ComponentEventNames.Change, {
        source: 'productCode',
        value: 'P001',
      });
    });

    it('does not broadcast when productCode has no param and no value', async () => {
      setField('productCode');
      component.value = '';
      await init();
      expect(windowEventEmitter).not.toHaveBeenCalled();
    });

    it('loads a batch by id from a batchNumber param and unlocks the field', async () => {
      setField('batchNumber');
      (component.routerService.getQueryParamValue as jest.Mock).mockImplementation(
        (key: string) => (key === 'batchNumber' ? 'B001' : undefined)
      );
      const readBatchById = jest
        .spyOn(component as unknown as { readBatchById: (uid: string) => Promise<void> }, 'readBatchById')
        .mockResolvedValue(undefined);
      await init();

      expect(readBatchById).toHaveBeenCalledWith('B001');
      expect(component.readonly).toBe(true);
      expect(component.disabled).toBe(false);
      readBatchById.mockRestore();
    });

    it('broadcasts the batchNumber value after the initial load', async () => {
      setField('batchNumber');
      (component.routerService.getQueryParamValue as jest.Mock).mockImplementation(
        (key: string) => (key === 'batchNumber' ? 'B001' : undefined)
      );
      getModelAndRepository.mockReturnValue({
        repository: { read: jest.fn().mockResolvedValue(batch('B001')) },
      });
      await init();

      expect(component.value).toBe('B001');
      expect(windowEventEmitter).toHaveBeenCalledWith(ComponentEventNames.Change, {
        source: 'batchNumber',
        value: 'B001',
      });
    });

    it('marks productCode readonly when a batchNumber param scopes the form', async () => {
      setField('productCode');
      (component.routerService.getQueryParamValue as jest.Mock).mockImplementation(
        (key: string) => (key === 'batchNumber' ? 'B001' : undefined)
      );
      await init();

      expect(component.readonly).toBe(true);
    });

    it('marks leafletType readonly when a batchNumber param scopes the form', async () => {
      setField('leafletType');
      (component.routerService.getQueryParamValue as jest.Mock).mockImplementation(
        (key: string) => (key === 'batchNumber' ? 'B001' : undefined)
      );
      await init();

      expect(component.readonly).toBe(true);
    });

    it('hydrates epiMarket from the sibling form control when it has no value', async () => {
      setField('epiMarket');
      component.value = '';
      const controlValue = 'us';
      (component as unknown as { formGroup: unknown }).formGroup = new FormGroup({
        epiMarket: new FormControl(controlValue),
      });
      await init();

      expect(component.value).toBe(controlValue);
    });

    it('skips the whole param wiring on read operations', async () => {
      setField('productCode');
      setOperation('read');
      (component.routerService.getQueryParamValue as jest.Mock).mockImplementation(
        (key: string) => (key === 'productCode' ? 'P001' : undefined)
      );
      await init();

      expect(component.value).toBe('');
      expect(windowEventEmitter).not.toHaveBeenCalled();
    });

    it('does not consume URL params on update operations', async () => {
      setField('productCode');
      setOperation('update');
      (component.routerService.getQueryParamValue as jest.Mock).mockImplementation(
        (key: string) => (key === 'productCode' ? 'P001' : undefined)
      );
      await init();

      expect(component.value).toBe('');
    });
  });

  describe('handleChange broadcasts', () => {
    it('broadcasts the selected value with the field as source', () => {
      setField('productCode');
      component.handleChange({ detail: { value: 'P001' } } as never);

      expect(component.value).toBe('P001');
      // the component forwards detail.bubbles verbatim (undefined when absent)
      expect(windowEventEmitter).toHaveBeenCalledWith(ComponentEventNames.Change, {
        source: 'productCode',
        bubbles: undefined,
        value: 'P001',
      });
    });

    it('spreads nested detail values instead of wrapping them', () => {
      setField('productCode');
      const nested = { value: { code: 'us' } };
      component.handleChange({ detail: nested } as never);

      expect(windowEventEmitter).toHaveBeenCalledWith(ComponentEventNames.Change, {
        source: 'productCode',
        bubbles: undefined,
        value: { code: 'us' },
      });
    });

    it('propagates the bubbles flag', () => {
      setField('productCode');
      component.handleChange({ detail: { value: 'P001', bubbles: true } } as never);

      expect(windowEventEmitter).toHaveBeenCalledWith(ComponentEventNames.Change, {
        source: 'productCode',
        bubbles: true,
        value: 'P001',
      });
    });
  });

  describe('handleEvent cross-field matrix', () => {
    it('ignores events from its own source', async () => {
      setField('productCode');
      component.value = 'P001';
      const readBatchSpy = jest
        .spyOn(component as unknown as { readBatchByProductCode: (uid: string) => Promise<void> }, 'readBatchByProductCode')
        .mockResolvedValue(undefined);
      await component.handleEvent(changeEvent('productCode', 'P001'));

      expect(component.value).not.toBe('');
      readBatchSpy.mockRestore();
    });

    it('resets and reloads batchNumber when productCode changes', async () => {
      setField('batchNumber');
      component.value = 'B-OLD';
      const readBatchSpy = jest
        .spyOn(component as unknown as { readBatchByProductCode: (uid: string) => Promise<void> }, 'readBatchByProductCode')
        .mockResolvedValue(undefined);
      await component.handleEvent(changeEvent('productCode', 'P001'));

      expect(component.value).toBe('');
      expect(readBatchSpy).toHaveBeenCalledWith('P001');
      readBatchSpy.mockRestore();
    });

    it('fills inventedName from the product behind the new productCode', async () => {
      setField('inventedName');
      const product = { productCode: 'P001', inventedName: 'Aspirin' } as unknown as Product;
      getModelAndRepository.mockReturnValue({
        repository: { read: jest.fn().mockResolvedValue(product) },
      });
      await component.handleEvent(changeEvent('productCode', 'P001'));

      expect(component.value).toBe('Aspirin');
    });

    it('forces leafletType to the leaflet type when productCode changes', async () => {
      setField('leafletType');
      await component.handleEvent(changeEvent('productCode', 'P001'));

      expect(component.value).toBe(LeafletType.leaflet);
    });

    it('switches leafletType options to batch mode when a batchNumber arrives', async () => {
      setField('leafletType');
      const optionsSpy = jest
        .spyOn(component as unknown as { getLeafletTypeOptions: (type: string) => Promise<void> }, 'getLeafletTypeOptions')
        .mockResolvedValue(undefined);
      await component.handleEvent(changeEvent('batchNumber', 'B001'));

      expect(optionsSpy).toHaveBeenCalledWith('batch');
      optionsSpy.mockRestore();
    });

    it('clears and hides epiMarket when a batchNumber arrives', async () => {
      setField('epiMarket');
      component.value = 'us';
      await component.handleEvent(changeEvent('batchNumber', 'B001'));

      expect(component.value).toBe('');
      expect(component.hidden).toBe(true);
    });

    it('keeps epiMarket visible when batchNumber is cleared', async () => {
      setField('epiMarket');
      component.hidden = true;
      await component.handleEvent(changeEvent('batchNumber', ''));

      expect(component.hidden).toBe(false);
    });

    it('reverse-syncs productCode from a batchNumber change', async () => {
      setField('productCode');
      component.value = 'P-OLD';
      (component as unknown as { lastProduct: unknown }).lastProduct = { productCode: 'P001' };
      const setProductSpy = jest
        .spyOn(component as unknown as { setProductValue: (uid: string, bubbles?: boolean) => Promise<void> }, 'setProductValue')
        .mockResolvedValue(undefined);
      await component.handleEvent(changeEvent('batchNumber', 'B001'));

      expect(setProductSpy).toHaveBeenCalledWith('B001', false);
      setProductSpy.mockRestore();
    });

    it('re-applies the cached product when the batch sync is not bubbling', async () => {
      setField('productCode');
      component.value = '';
      (component as unknown as { lastProduct: unknown }).lastProduct = { productCode: 'P001' };
      await component.handleEvent(changeEvent('batchNumber', 'B001'));

      expect(component.value).toBe('P001');
    });
  });

  describe('repository-backed helpers', () => {
    it('loads batch options and unlocks the field when batches exist', async () => {
      const formGroup = new FormGroup({ batchNumber: new FormControl() });
      jest.spyOn(formGroup, 'enable');
      (component as unknown as { formGroup: unknown }).formGroup = formGroup;
      getModelAndRepository.mockReturnValue({
        repository: { query: jest.fn().mockResolvedValue([batch('B001'), batch('B002')]) },
      });
      await component.readBatchByProductCode('P001');

      expect(component.options).toHaveLength(2);
      expect(component.disabled).toBe(false);
      expect(formGroup.enable).toHaveBeenCalled();
    });

    it('disables batchNumber when the product has no batches', async () => {
      getModelAndRepository.mockReturnValue({
        repository: { query: jest.fn().mockResolvedValue([]) },
      });
      await component.readBatchByProductCode('P001');

      expect(component.options).toHaveLength(0);
      expect(component.disabled).toBe(true);
    });

    it('caches the product and skips the read when it is already loaded', async () => {
      const product = { productCode: 'P001', inventedName: 'Aspirin' } as unknown as Product;
      const read = jest.fn().mockResolvedValue(product);
      getModelAndRepository.mockReturnValue({ repository: { read } });
      const first = await component.readProduct('P001');
      const second = await component.readProduct('P001');

      expect(first).toMatchObject({ productCode: 'P001', inventedName: 'Aspirin' });
      expect(second).toMatchObject({ productCode: 'P001', inventedName: 'Aspirin' });
      expect(read).toHaveBeenCalledTimes(1);
    });

    it('clears the current value when a different product is read', async () => {
      const product = { productCode: 'P001', inventedName: 'Aspirin' } as unknown as Product;
      getModelAndRepository.mockReturnValue({
        repository: { read: jest.fn().mockResolvedValue(product) },
      });
      component.value = 'stale';
      await component.readProduct('P999');

      expect(component.value).toBe('');
    });

    it('hydrates the field from a batch read by id', async () => {
      getModelAndRepository.mockReturnValue({
        repository: { read: jest.fn().mockResolvedValue(batch('B001')) },
      });
      await component.readBatchById('B001');

      expect(component.value).toBe('B001');
      expect((component as unknown as { lastProduct: unknown }).lastProduct).toMatchObject({ productCode: 'P001' });
    });

    it('reverse-resolves the productCode from a selected batchNumber', async () => {
      getModelAndRepository.mockReturnValue({
        repository: {
          select: jest.fn(() => ({
            where: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue([batch('B001')]),
          })),
        },
      });
      await component.setProductValue('B001');

      expect(component.value).toBe('P001');
    });

    it('clears the productCode when the batch lookup returns nothing', async () => {
      getModelAndRepository.mockReturnValue({
        repository: {
          select: jest.fn(() => ({
            where: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue([]),
          })),
        },
      });
      component.value = 'P-OLD';
      await component.setProductValue('B-UNKNOWN');

      expect(component.value).toBe('');
    });
  });

  describe('auxiliary behaviors', () => {
    it('clears its value and broadcasts on handleClearValue', () => {
      setField('productCode');
      component.value = 'P001';
      component.handleClearValue(new Event('click'));

      expect(component.value).toBe('');
      expect(windowEventEmitter).toHaveBeenCalledWith(ComponentEventNames.Change, {
        source: 'productCode',
        value: '',
      });
    });

    it('loads the document options for the requested leaflet type scope', async () => {
      await component.getLeafletTypeOptions('batch');
      expect(component.options.length).toBeGreaterThan(0);
    });

    it('emits the ionChange event on the native element when present', async () => {
      const emit = jest.fn();
      (component as unknown as { component: unknown }).component = {
        nativeElement: { ionChange: { emit } },
      };
      await component.getLeafletTypeOptions('product');
      expect(emit).toHaveBeenCalledWith({ value: LeafletType.leaflet });
    });

    it('merges the cached product fields when the same productCode is set again', () => {
      setField('productCode');
      (component as unknown as { lastProduct: unknown }).lastProduct = { productCode: 'P001', inventedName: 'Aspirin' };
      (component as unknown as { lastProduct: unknown }).lastProduct = { productCode: 'P001' } as Product;

      expect((component as unknown as { lastProduct: unknown }).lastProduct).toMatchObject({
        productCode: 'P001',
        inventedName: 'Aspirin',
      });
    });

    it('replaces the cached product when a different productCode arrives', () => {
      (component as unknown as { lastProduct: unknown }).lastProduct = { productCode: 'P001', inventedName: 'A' };
      (component as unknown as { lastProduct: unknown }).lastProduct = { productCode: 'P002', inventedName: 'B' } as Product;

      expect((component as unknown as { lastProduct: unknown }).lastProduct).toMatchObject({ productCode: 'P002' });
    });

    it('clears its value on destroy', async () => {
      component.value = 'P001';
      await component.onDestroy();
      expect(component.value).toBeUndefined();
    });
  });
});
