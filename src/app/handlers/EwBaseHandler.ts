import { Condition } from '@decaf-ts/core';
import { IRepository, PrimaryKeyType } from '@decaf-ts/db-decorators';
import { formatDate, Model, Primitives } from '@decaf-ts/decorator-validation';
import {
  ActionRoles,
  DecafRepository,
  getModelAndRepository,
  getNgxModalComponent,
  getWindow,
  KeyValue,
  NgxComponentDirective,
  NgxEventHandler,
} from '@decaf-ts/for-angular';
import { UIKeys, uitablecol } from '@decaf-ts/ui-decorators';
import { Product, toDiffs } from '@pharmaledgerassoc/ptp-toolkit/shared';
import { NgxEwBasePage } from '../utils/NgxEwBasePage';
import { getNgxLoadingComponent, NgxLoadingComponent } from '../utils/NgxLoadingComponent';

interface IComparisonLike<T> {
  other: keyof T | undefined;
  current: keyof T | undefined;
}

type ParsedDiff<M> = Record<string, IComparisonLike<M>>;

export class EwBaseHandler extends NgxEventHandler {
  static pk: string;

  static loading: NgxLoadingComponent = getNgxLoadingComponent();

  static instance?: NgxComponentDirective;

  static skip = ['owner', 'id', 'uuid', 'updatedAt', 'updatedBy', 'createdBy', 'createdAt'] as string[];

  static data: Record<string, Record<string, { repository: DecafRepository<Model>; data?: Model[] }>> | undefined;

  static model: Model;

  static loadingMessage: string = 'operations.processing';

  static async beforeRender(instance: NgxEwBasePage, model: unknown): Promise<void> {
    const isPla = await instance.isPlaUser();
    if (isPla) {
      uitablecol(UIKeys.LAST)(model, 'owner');
    }
  }

  static async showLoading(message?: string): Promise<void> {
    await this.loading.show(message || this.loadingMessage);
  }

  static async showModalDiffs<M extends Model>(
    data: M,
    repository: IRepository<M>,
    modelId: PrimaryKeyType
  ): Promise<boolean | M> {
    const modelName = data?.constructor?.name || repository?.class?.name;
    const loading = this.loading;
    this.skip = [this.pk, ...this.skip] as string[];
    const diffs = await this.getDiffs<M>(Model.build(Object.assign({}, data), modelName), repository, modelId);
    if (diffs) {
      if (loading.isVisible()) {
        await loading.remove();
      }
      const locale = modelName.toLowerCase();
      const modal = await getNgxModalComponent({
        tag: 'app-modal-diffs',
        expandable: true,
        title: `${locale}.diffs.title`,
        className: 'dcf-modal-diffs',
        //  headerTransparent: true,
        globals: {
          diffs,
          locale,
        },
      });
      await modal.present();
      const { role } = await modal.onDidDismiss();
      if (role === ActionRoles.cancel) {
        return false;
      }
      await this.showLoading();
    }
    return data;
  }

  static async getDiffs<M extends Model>(
    data: M,
    repository: IRepository<M>,
    modelId: PrimaryKeyType
  ): Promise<ParsedDiff<M> | undefined> {
    const model = Model.build(Object.assign({}, data), data?.constructor?.name || repository.class.name) as M;
    const result: ParsedDiff<M> = {};
    const oldData = (await repository.read(modelId)) as M;
    const modelDiffs = toDiffs(model.compare(oldData, ...(this.skip as (keyof M)[]))) as KeyValue;

    this.skip.forEach((prop) => {
      if (prop in modelDiffs) {
        delete modelDiffs[prop];
      }
    });

    // filter skipped props on nested props
    const filterSkippedProps = (item: keyof M) => {
      if (!item || typeof item !== 'object') {
        return item;
      }
      return Object.entries(item).reduce(
        (acc, [k, v]) => {
          if (k === 'version' && !v) {
            v = '1';
          }
          if (!this.skip.includes(k as string) && v !== undefined) {
            acc[k] = v;
          }
          return acc;
        },
        {} as Record<string, unknown>
      );
    };

    const parseArrayDiff = (data: Record<keyof M, IComparisonLike<M>>): IComparisonLike<M> | undefined => {
      const diff = { other: {} as Record<keyof M, unknown>, current: {} as Record<keyof M, unknown> };
      for (const key in data) {
        if (this.skip.includes(key)) continue;
        if (key in data) {
          const item = data[key];
          if (item.other !== undefined) {
            diff.other[key] = filterSkippedProps(item.other);
          }
          if (item.current !== undefined) {
            diff.current[key] = filterSkippedProps(item.current);
          }
        }
      }
      const { other, current } = diff;
      if (!Object.keys(other).length && !Object.keys(current).length) {
        return undefined;
      }
      return diff as IComparisonLike<M>;
    };

    // console.log(modelDiffs);
    for (const [key, value] of Object.entries(modelDiffs || {})) {
      if (Array.isArray(value)) {
        if (value.length) {
          value.map((item, index) => {
            const diffs = parseArrayDiff(item);
            if (diffs) {
              result[key] = diffs;
              // result[`${key}_${index + 1}`] = diffs;
            }
          });
        }
        continue;
      }
      const diff = value;
      let other = diff?.other || diff?.old || undefined;
      let current = diff?.current || diff?.new || undefined;
      if (Array.isArray(other)) {
        other = other.map((item) => filterSkippedProps(item));
      }
      if (Array.isArray(current)) {
        current = current.map((item) => filterSkippedProps(item));
      }
      if (current !== undefined && current !== other) {
        if (key === 'expiryDate') {
          const formattedOld = formatDate(current as Date, 'yyyy-MM-dd');
          const formattedNew = formatDate(other as Date, 'yyyy-MM-dd');
          if (formattedOld === formattedNew) {
            continue;
          }
        }
        if (key === 'manufacturerAddress') {
          if (!current?.length && !other?.length) {
            continue;
          }
        }
        if (typeof current === 'string' && typeof other === 'string') {
          if (current.trim() === other.trim()) {
            continue;
          }
        }
        result[key] = { other, current };
      }
    }
    return Object.keys(result)?.length ? result : undefined;
  }

  static async queryModelData<M extends Model>(
    modelName: string,
    relation?: string,
    modelId?: Primitives
  ): Promise<M[]> {
    const repo = getModelAndRepository(modelName);
    if (repo) {
      const { repository } = repo;
      if (!relation || !modelId) {
        return (await repository.select().execute()) as M[];
      }
      return await (repository as DecafRepository<M>).query(
        Condition.attribute<M>(relation as keyof M).eq(modelId),
        relation as keyof M
      );
    }
    return [];
  }

  static async handleRedirect(instance: NgxComponentDirective, route: string): Promise<void> {
    if (instance) {
      const win = getWindow();
      win['forceRefresh'] = true;
      await instance.router.navigateByUrl(`/${route}`, {
        replaceUrl: true,
        onSameUrlNavigation: 'reload',
      });
    }
  }

  static async handleError(instance: NgxComponentDirective, route: string, error: Error | string): Promise<void> {
    if (error instanceof Error) {
      error = error.message;
    }
    const messageArray = !error
      ? ['unknown', 'error']
      : error
          .split(' ')
          .slice(1)
          .map((p) => p.toLowerCase());
    const isNetworkError = messageArray.includes('network') || messageArray.includes('failed');
    if (this.loading.isVisible()) {
      await this.loading.remove();
    }
    if (isNetworkError) {
      await this.handleRedirect(instance, route);
    }
  }

  static async paginateProducts(limit: number = 10): Promise<Product[]> {
    const { repository } = getModelAndRepository(Product.name) || {};
    const orderBy = 'updatedAt' as keyof Model; //TODO: Ajustar aqui
    // const orderBy = 'productCode' as keyof Model;
    if (repository) {
      const result = await repository
        .select()
        .orderBy(orderBy, 'desc')
        .paginate(limit)
        .then(async (response) => {
          const data = (await response.page()) || undefined;
          return (data ?? []) as Product[];
        });

      return result;
    }
    return [];
  }
}
