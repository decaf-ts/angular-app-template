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
import { NgxEwBasePage } from '../utils/NgxEwBasePage';
import { getNgxLoadingComponent, NgxLoadingComponent } from '../utils/NgxLoadingComponent';

interface IComparisonLike<T> {
  other: keyof T | undefined;
  current: keyof T | undefined;
}

type ParsedDiff<M> = Record<string, IComparisonLike<M>>;

export class BaseHandler extends NgxEventHandler {
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

}
