import { AxiosHttpAdapter } from '@decaf-ts/for-http';
import { DecafAxiosHttpAdapter } from './overrides';

/**
 * Every server-sent event reaches `DecafAxiosHttpAdapter.updateObservers`, which
 * throttles before handing it to the observers (repositories -> tables). The
 * throttling may coalesce repeats of the same event, but must never drop a
 * distinct one: a table only refreshes if its own event gets through.
 */
describe('DecafAxiosHttpAdapter SSE event delivery', () => {
  let adapter: DecafAxiosHttpAdapter;
  let delivered: jest.SpyInstance;

  const settle = () => new Promise((resolve) => setTimeout(resolve, 400));
  const keysOf = (spy: jest.SpyInstance) => spy.mock.calls.map(([table, event, id]) => `${table}:${event}:${id}`);

  beforeAll(() => {
    adapter = new DecafAxiosHttpAdapter({ protocol: 'http', host: 'localhost:0', events: true });
  });

  beforeEach(() => {
    delivered = jest.spyOn(AxiosHttpAdapter.prototype, 'updateObservers').mockResolvedValue(undefined);
  });

  afterEach(() => {
    delivered.mockRestore();
  });

  it('delivers every distinct event of a burst across tables', async () => {
    const burst = [
      ['Product', 'create', 'p-1'],
      ['Audit', 'create', 'a-1'],
      ['TaskEventModel', 'update', 't-1'],
      ['Batch', 'update', 'b-1'],
      ['Product', 'delete', 'p-2'],
    ] as const;

    for (const [table, event, id] of burst) {
      await adapter.updateObservers(table, event, id, { id });
    }
    await settle();

    expect(keysOf(delivered)).toEqual(burst.map(([table, event, id]) => `${table}:${event}:${id}`));
  });

  it('keeps create, update and delete of the same record, in order', async () => {
    await adapter.updateObservers('Product', 'create', 'p-9', { id: 'p-9', v: 0 });
    await adapter.updateObservers('Product', 'update', 'p-9', { id: 'p-9', v: 1 });
    await adapter.updateObservers('Product', 'delete', 'p-9', { id: 'p-9', v: 1 });
    await settle();

    expect(keysOf(delivered)).toEqual(['Product:create:p-9', 'Product:update:p-9', 'Product:delete:p-9']);
  });

  it('coalesces a burst of repeats of the same event into one refresh with the latest payload', async () => {
    for (let step = 0; step < 10; step++) {
      await adapter.updateObservers('TaskEventModel', 'update', 't-7', { id: 't-7', step });
    }
    await settle();

    expect(keysOf(delivered)).toEqual(['TaskEventModel:update:t-7']);
    expect(delivered.mock.calls[0][3]).toEqual({ id: 't-7', step: 9 });
  });

  it('still delivers an event repeated after the burst window', async () => {
    await adapter.updateObservers('Product', 'update', 'p-3', { id: 'p-3' });
    await settle();
    await adapter.updateObservers('Product', 'update', 'p-3', { id: 'p-3' });
    await settle();

    expect(keysOf(delivered)).toEqual(['Product:update:p-3', 'Product:update:p-3']);
  });

  describe('getEventHeaders (SSE stream and subscribe/unsubscribe headers)', () => {
    afterEach(() => {
      DecafAxiosHttpAdapter.token = undefined;
    });

    it('is empty without a token', () => {
      DecafAxiosHttpAdapter.token = undefined;
      expect(DecafAxiosHttpAdapter.getEventHeaders()).toEqual({});
    });

    it('returns a flat bearer header, even when invoked detached or bound to another object', () => {
      DecafAxiosHttpAdapter.token = 'jwt-token';
      const resolver = DecafAxiosHttpAdapter.getEventHeaders;
      const expected = { authorization: 'Bearer jwt-token' };
      expect(resolver()).toEqual(expected);
      expect(resolver.call({ protocol: 'http', host: 'x' })).toEqual(expected);
    });
  });
});
