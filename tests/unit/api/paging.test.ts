import { describe, it, expect } from 'vitest';
import { iiqListAll, iiqPage, withTruncationNote, TRUNCATION_NOTE, type IIQRequester } from '../../../src/api/paging';

/** In-memory IIQ GET list: pages via $p/$s; `withTotal: false` omits Paging.TotalRows. */
function fakeList(rowCount: number, { withTotal = true } = {}) {
  const rows = Array.from({ length: rowCount }, (_, i) => ({ id: i }));
  const pagesRequested: number[] = [];
  const client: IIQRequester = {
    async request<R>({ params }: { params?: Record<string, unknown> }): Promise<R> {
      const p = Number(params?.$p ?? 0);
      const s = Number(params?.$s ?? 20);
      pagesRequested.push(p);
      const items = rows.slice(p * s, p * s + s);
      return { Items: items, ItemCount: items.length, ...(withTotal ? { Paging: { TotalRows: rows.length } } : {}) } as R;
    },
  };
  return { client, pagesRequested };
}

describe('iiqListAll', () => {
  it('concatenates every page and stops at TotalRows', async () => {
    const { client, pagesRequested } = fakeList(25);
    const result = await iiqListAll<{ id: number }>(client, '/x', { pageSize: 10 });
    expect(result.items.map((r) => r.id)).toEqual(Array.from({ length: 25 }, (_, i) => i));
    expect(result).toMatchObject({ total: 25, truncated: false });
    expect(pagesRequested).toEqual([0, 1, 2]);
  });

  it('stops on an exactly-full last page when TotalRows says the list is complete', async () => {
    const { client, pagesRequested } = fakeList(20);
    const result = await iiqListAll(client, '/x', { pageSize: 10 });
    expect(result).toMatchObject({ total: 20, truncated: false });
    expect(pagesRequested).toEqual([0, 1]);
  });

  it('reports truncated when the page cap is reached before the end of the list', async () => {
    const { client, pagesRequested } = fakeList(35);
    const result = await iiqListAll(client, '/x', { pageSize: 10, maxPages: 2 });
    expect(result.items).toHaveLength(20);
    expect(result).toMatchObject({ total: 35, truncated: true });
    expect(pagesRequested).toEqual([0, 1]);
  });

  it('keeps paging past a full page when the response has no TotalRows (ItemCount is only the page count)', async () => {
    const { client } = fakeList(25, { withTotal: false });
    const result = await iiqListAll(client, '/x', { pageSize: 10 });
    expect(result.items).toHaveLength(25);
    expect(result).toMatchObject({ total: 25, truncated: false });
  });

  it('reports truncated when the cap is hit without TotalRows and every page was full', async () => {
    const { client } = fakeList(25, { withTotal: false });
    const result = await iiqListAll(client, '/x', { pageSize: 10, maxPages: 2 });
    expect(result.items).toHaveLength(20);
    expect(result.truncated).toBe(true);
  });
});

describe('truncation disclosure', () => {
  it('iiqPage flags a truncated source list and omits the flag otherwise', () => {
    expect(iiqPage([1, 2, 3], 0, 2, true)).toMatchObject({ Truncated: true, Paging: { TotalRows: 3 } });
    expect(iiqPage([1, 2, 3], 0, 2)).not.toHaveProperty('Truncated');
  });

  it('withTruncationNote appends the note only when truncated', () => {
    const make = () => ({ content: [{ type: 'text', text: 'Found 2 parts' }] });
    expect(withTruncationNote(true, make()).content[0].text).toBe(`Found 2 parts${TRUNCATION_NOTE}`);
    expect(withTruncationNote(false, make()).content[0].text).toBe('Found 2 parts');
  });
});
