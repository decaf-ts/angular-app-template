import {
  AllOperationKeys,
  Context,
  ContextOf,
  ContextualArgs,
  DirectionLimitOffset,
  EventIds,
  PersistenceKeys,
  PreparedStatementKeys,
  Repo,
} from '@decaf-ts/core';
import { BaseError, PrimaryKeyType } from '@decaf-ts/db-decorators';
import { Constructor } from '@decaf-ts/decoration';
import { Model, ModelKeys } from '@decaf-ts/decorator-validation';
import { AxiosFlags, AxiosFlavour, AxiosHttpAdapter, HttpConfig } from '@decaf-ts/for-http';
import { AxiosRequestConfig } from 'axios';
import { auditTime, buffer, concatMap, Subject } from 'rxjs';

interface ObservableEvent {
  table: Constructor<Model> | string;
  event: AllOperationKeys;
  id: EventIds;
  args: ContextualArgs<ContextOf<Repo<Model>>>;
}

/**
 * Keeps one event per (table, event, id) — the latest — ordered by its last
 * occurrence, so repeats collapse while distinct events are all kept.
 */
function coalesceEvents(batch: ObservableEvent[]): ObservableEvent[] {
  const latest = new Map<string, ObservableEvent>();
  for (const item of batch) {
    const table = typeof item.table === 'string' ? item.table : item.table?.name;
    const id = Array.isArray(item.id) ? item.id.join(',') : String(item.id);
    const key = `${table}|${item.event}|${id}`;
    latest.delete(key);
    latest.set(key, item);
  }
  return [...latest.values()];
}

export class DecafAxiosHttpAdapter extends AxiosHttpAdapter {
  bookmark: Record<string, DirectionLimitOffset[]> = {};

  static disableEvents = false;
  static token?: string;

  /** window used to coalesce bursts of server events */
  static eventCoalesceMs = 100;

  private updateObservers$ = new Subject<ObservableEvent>();

  constructor(config: HttpConfig & { events?: boolean }, alias: string = AxiosFlavour) {
    super(
      { eventHeaderResolver: DecafAxiosHttpAdapter.getEventHeaders, eventsListenerPath: '/events', ...config },
      AxiosFlavour
    );
    if (config?.events === false) {
      DecafAxiosHttpAdapter.disableEvents = true;
    } else {
      // Collect each burst and flush it once, coalesced per (table, event, id).
      // A plain auditTime here keeps only the last event of the window, for any
      // table, so tables whose event was followed by another one never refreshed.
      this.updateObservers$
        .pipe(
          buffer(this.updateObservers$.pipe(auditTime(DecafAxiosHttpAdapter.eventCoalesceMs))),
          concatMap(async (batch) => {
            for (const { table, event, id, args } of coalesceEvents(batch)) {
              try {
                await super.updateObservers(table, event, id, ...args);
              } catch (error: unknown) {
                const name = typeof table === 'string' ? table : table?.name;
                console.error(`Failed to notify observers of ${event} on ${name}`, error);
              }
            }
          })
        )
        .subscribe();
    }
  }

  /**
   * Headers for the SSE stream and its subscribe/unsubscribe calls: a flat
   * header map, resolved on every (re)connection so a refreshed token is used.
   * Reads the static token explicitly: for-http invokes the resolver detached
   * from this class.
   */
  static getEventHeaders(): Record<string, string> {
    const token = DecafAxiosHttpAdapter.token;
    return !token || DecafAxiosHttpAdapter.disableEvents ? {} : { authorization: `Bearer ${token}` };
  }

  getAllRawQueryParams(url: string): Record<string, string> {
    const query = new URL(url).search.slice(1); // remove o '?'
    if (!query) return {};

    const params: Record<string, string> = {};

    for (const pair of query.split('&')) {
      const [key, value = ''] = pair.split('=');
      params[key] = value;
    }

    return params;
  }

  getBookmarkEntryKey(url: string): string | undefined {
    const parts = url.split('/'); // transforma em array
    const index = parts.indexOf(PersistenceKeys.STATEMENT);
    if (index > 0) {
      return parts[index - 1];
    }
    return undefined;
  }

  setOnBookmark(url: string): void {
    const key = this.getBookmarkEntryKey(url);
    if (key) {
      if (!this.bookmark[key]) {
        this.bookmark[key] = [];
      }
      const params = this.getAllRawQueryParams(url);
      const offset = Number(params['offset']);
      const existingIndex = this.bookmark[key].findIndex((item) => Number(item.offset) === offset);
      if (existingIndex >= 0) {
        this.bookmark[key][existingIndex] = params;
      } else {
        this.bookmark[key].push(params);
      }
    }
  }

  setQueryParam(url: string, param: string, value: string | undefined): string {
    const parsed = new URL(url);
    if (typeof value === 'undefined') {
      parsed.searchParams.delete(param);
    } else {
      parsed.searchParams.set(param, value);
    }
    return parsed.toString();
  }

  parseBookmarkURL(url: string): string {
    const offset = Number(this.getOnQueryParams(url, 'offset'));
    const cached = this.getFromBookmark(url);
    const bookmark = this.getOnQueryParams(url, 'bookmark');
    if (offset < 2) {
      return bookmark ? this.setQueryParam(url, 'bookmark', undefined) : url;
    }

    if (!bookmark) {
      return cached?.bookmark ? this.setQueryParam(url, 'bookmark', String(cached.bookmark)) : url;
    }
    if (cached?.bookmark && bookmark !== cached.bookmark) {
      return this.setQueryParam(url, 'bookmark', String(cached.bookmark));
    }
    this.setOnBookmark(url);
    return url;
  }

  getFromBookmark(url: string): DirectionLimitOffset | undefined {
    const key = this.getBookmarkEntryKey(url);
    if (!key) return undefined;
    const offset = Number(this.getOnQueryParams(url, 'offset'));
    if (offset < 2) {
      this.bookmark[key] = [];
      return undefined;
    }
    return this.bookmark[key]?.find((item) => Number(item.offset) === offset);
  }

  getOnQueryParams(url: string, param: string): string {
    return new URL(url).searchParams.get(param) || '';
  }

  hasQueryParam(url: string, param: string): boolean {
    return new URLSearchParams(url).has(param);
  }

  parseStatementURL(url: string): string {
    const urlArray = url.split('/');
    if (urlArray.includes(PersistenceKeys.STATEMENT)) {
      if (!urlArray.includes(PreparedStatementKeys.PAGE_BY)) {
        if (urlArray.includes(PreparedStatementKeys.FIND)) {
          // force subs in find value to ensure string does not hav must then 11 characters
          const direction = urlArray.pop();
          const findValue = urlArray[urlArray.length - 1];
          urlArray[urlArray.length - 1] = findValue.substring(0, 11);
          url = urlArray.filter((part) => part !== PersistenceKeys.STATEMENT).join('/');
          url = `${url}?direction=${direction}`;
        } else {
          return urlArray.filter((part) => part !== PersistenceKeys.STATEMENT).join('/');
        }
      } else {
        const hasBookmark = this.hasQueryParam(url, 'bookmark');
        if (hasBookmark) {
          url = this.parseBookmarkURL(url);
        }
      }
    }
    return url;
  }

  override async request<V>(details: AxiosRequestConfig, ...args: ContextualArgs<Context<AxiosFlags>>): Promise<V> {
    let overrides = {};
    try {
      const { ctx } = this.logCtx(args, this.request);
      overrides = this.toRequest(ctx);
    } catch (err: unknown) {
      // do nothing
    }

    if (DecafAxiosHttpAdapter.token) {
      overrides = {
        withCredentials: true,
        headers: {
          authorization: `Bearer ${DecafAxiosHttpAdapter.token}`,
          // 'access-control-allow-origin': '*',
        },
      };
    }
    const { method } = details || undefined;
    switch (method) {
      case 'PUT':
      case 'POST':
      case 'PATCH': {
        const headers = (overrides as AxiosRequestConfig)?.headers || {};

        overrides = {
          ...overrides,
          headers: {
            ...headers,
            'Content-Type': 'application/json; charset=utf-8',
          },
        };
        break;
      }
    }

    return (await this.client.request(
      Object.assign({}, details, { url: this.parseStatementURL(details.url || '') }, overrides)
    )) as V;
  }

  override async create<M extends Model>(
    tableName: Constructor<M>,
    id: PrimaryKeyType,
    model: M,
    ...args: ContextualArgs<Context<AxiosFlags>>
  ): Promise<Record<string, unknown>> {
    const { log, ctx } = this.logCtx(args, this.create);
    try {
      const url = this.url(tableName);
      const cfg = this.toRequest(ctx);
      log.debug(`POSTing to ${url} with ${JSON.stringify(model)} and cfg ${JSON.stringify(cfg)} and primary key ${id}`);
      const result = await this.request<Record<string, unknown>>(
        {
          url,
          method: 'POST',
          data: JSON.stringify(
            Object.assign({}, model, {
              [ModelKeys.ANCHOR]: tableName.name,
            })
          ),
          ...cfg,
        },
        ctx
      );
      return result;
    } catch (error: unknown) {
      throw this.parseError(error as BaseError);
    }
  }

  override async updateObservers<M extends Model>(
    table: Constructor<M> | string,
    event: AllOperationKeys,
    id: EventIds,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...args: ContextualArgs<ContextOf<any>>
  ) {
    if (!DecafAxiosHttpAdapter.disableEvents) {
      const [model] = args;
      if (!id) {
        const pk = Model.pk(Model.get(table as string));
        if (pk && pk in model) {
          id = model[pk] as EventIds;
        }
      }
      // repeats are coalesced per burst in the constructor pipeline
      this.updateObservers$.next({ table, event, id, args });
    }
  }
  // override async parseResponse<M extends Model>(
  //   clazz: Constructor<M>,
  //   method: OperationKeys | string,
  //   res: (AxiosResponse & { body: unknown; error: Error | AxiosError }) | any
  // ) {
  //   if (method === PreparedStatementKeys.FIND_BY && res === '') {

  //   }
  //   return await super.parseResponse(clazz, method, res);
  // }

  // override async parseResponse<M extends Model>(
  //   clazz: Constructor<M>,
  //   method: OperationKeys | string,
  //   res: AxiosResponse & { body: unknown; error: Error | AxiosError }
  // ) {
  //   if (!res.status && method !== PersistenceKeys.STATEMENT) throw new InternalError('this should be impossible');
  //   if (res.status >= 400) {
  //     throw this.parseError(
  //       res?.request?.response ? JSON.parse(res.request.response)?.error : res.error || `${res.status}`
  //     );
  //   }
  //   if (!res.body && res.data) {
  //     res.body = { data: JSON.parse(res.data) };
  //   }

  // res = await super.parseResponse(clazz, method, res);
  //   switch (method) {
  //     case BulkCrudOperationKeys.CREATE_ALL:
  //     case BulkCrudOperationKeys.READ_ALL:
  //     case BulkCrudOperationKeys.UPDATE_ALL:
  //     case BulkCrudOperationKeys.DELETE_ALL:
  //     case OperationKeys.CREATE:
  //     case OperationKeys.READ:
  //     case OperationKeys.UPDATE:
  //     case OperationKeys.DELETE:
  //       return res?.data || res?.body || undefined;
  //     case PreparedStatementKeys.FIND_BY:
  //     case PreparedStatementKeys.LIST_BY:
  //     case PreparedStatementKeys.PAGE_BY:
  //     case PreparedStatementKeys.FIND_ONE_BY:
  //     case PersistenceKeys.STATEMENT:
  //       return !res || typeof res === 'string' ? [] : res?.data || res;
  //     default:
  //       return res?.data || res?.body || undefined;
  //   }
  // }
}
