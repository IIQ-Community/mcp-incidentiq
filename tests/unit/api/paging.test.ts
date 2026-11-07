import { describe, it, expect } from 'vitest';
import { formatListPage, iiqListAll, iiqPage, withTruncationNote, TRUNCATION_NOTE, type IIQRequester } from '../../../src/api/paging';

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

describe('formatListPage', () => {
  const base = { pageSize: 2, noun: 'widgets', emptyText: 'No widgets found.', render: (n: number) => `• w${n}` };
  const text = (opts: Partial<Parameters<typeof formatListPage<number>>[0]> & { rows: number[] }) =>
    formatListPage<number>({ ...base, ...opts }).content[0].text;

  it('renders the header, every row on the page and the footer', () => {
    expect(text({ rows: [1, 2, 3] })).toBe('Found 3 widgets (showing 2):\n\n• w1\n\n• w2\n\nPage 1 of 2');
    expect(text({ rows: [1, 2, 3], pageIndex: 1 })).toBe('Found 3 widgets (showing 1):\n\n• w3\n\nPage 2 of 2');
  });

  it('uses emptyText only when nothing matched, on any page', () => {
    expect(text({ rows: [] })).toBe('No widgets found.');
    expect(text({ rows: [], pageIndex: 4 })).toBe('No widgets found.');
  });

  it('reports a page past the end with the match and page counts', () => {
    expect(text({ rows: [1], pageIndex: 1 })).toBe('Page 2 is past the end: 1 widgets match (1 page).');
    expect(text({ rows: [1, 2, 3], pageIndex: 7 })).toBe('Page 8 is past the end: 3 widgets match (2 pages).');
  });

  it('normalises out-of-range paging input', () => {
    expect(text({ rows: [1, 2, 3], pageIndex: -1 })).toBe(text({ rows: [1, 2, 3], pageIndex: 0 }));
    expect(text({ rows: [1, 2, 3], pageIndex: 1.7 })).toBe(text({ rows: [1, 2, 3], pageIndex: 1 }));
    expect(text({ rows: [1, 2, 3], pageIndex: Number.NaN })).toBe(text({ rows: [1, 2, 3], pageIndex: 0 }));
    expect(text({ rows: [1, 2, 3], pageSize: 0 })).toBe('Found 3 widgets (showing 1):\n\n• w1\n\nPage 1 of 3');
    expect(text({ rows: [1, 2, 3], pageSize: -5 })).toBe('Found 3 widgets (showing 1):\n\n• w1\n\nPage 1 of 3');
  });

  it('appends the truncation note to every outcome when the source list was truncated', () => {
    expect(text({ rows: [1], truncated: true })).toBe(`Found 1 widgets (showing 1):\n\n• w1\n\nPage 1 of 1${TRUNCATION_NOTE}`);
    expect(text({ rows: [], truncated: true })).toBe(`No widgets found.${TRUNCATION_NOTE}`);
    expect(text({ rows: [1], pageIndex: 3, truncated: true })).toBe(`Page 4 is past the end: 1 widgets match (1 page).${TRUNCATION_NOTE}`);
  });
});
