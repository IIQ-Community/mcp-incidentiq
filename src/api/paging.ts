/**
 * Query-string paging for IIQ list/search requests: `$p` is the 0-based page index and `$s`
 * the page size (the HPS.IIQ PowerShell pattern). Pass as axios `params`.
 *
 * IIQ ignores a body `Paging` object on POST /tickets and POST /users (always page 0, 20 rows)
 * and ignores its PageIndex on POST /issues/types, so paging must travel in the query string.
 */
export function iiqPagingParams(pageIndex: number, pageSize: number): { $p: number; $s: number } {
  return { $p: normalizePageIndex(pageIndex), $s: normalizePageSize(pageSize) };
}

/** Whole-number page index >= 0; shared by requests and `formatListPage` so both name the same page. */
export function normalizePageIndex(pageIndex: unknown): number {
  return Math.max(0, Math.floor(Number(pageIndex)) || 0);
}

/** Whole-number page size >= 1; shared by requests and `formatListPage`. */
export function normalizePageSize(pageSize: unknown): number {
  return Math.max(1, Math.floor(Number(pageSize)) || 1);
}

interface PagedListResponse<T> {
  Items?: T[];
  ItemCount?: number;
  Paging?: { TotalRows?: number };
}

/** Minimal request surface used by `iiqListAll` (satisfied by IncidentIQClient). */
export interface IIQRequester {
  request<R>(config: { method: string; url: string; params?: Record<string, unknown>; data?: unknown }): Promise<R>;
}

/** Body IIQ POST list endpoints (e.g. /issues/types) require. */
export const IIQ_LIST_BODY = { OnlyShowDeleted: false, FilterByViewPermission: false } as const;

/**
 * Reads a whole IIQ GET list (e.g. /locations/all, /teams/all, /parts, /purchaseorders) by paging
 * `$p`/`$s` until `Paging.TotalRows` is reached. IIQ exposes no server-side search for these
 * resources (POST returns 400/405), so callers filter the result client-side.
 * SHORTCUT: stops after `maxPages` pages (default 10 x 1000 rows) and reports `truncated`; raise
 * the cap or add a server-side filter if a district's list outgrows it.
 */
export async function iiqListAll<T>(
  client: IIQRequester,
  url: string,
  { pageSize = 1000, maxPages = 10, body }: { pageSize?: number; maxPages?: number; body?: object } = {}
): Promise<{ items: T[]; total: number; truncated: boolean }> {
  const items: T[] = [];
  let total: number | undefined;
  for (let page = 0; page < maxPages; page++) {
    // `body` switches to a POST list (same $p/$s paging); IIQ ignores body paging there.
    const response = await client.request<PagedListResponse<T>>(
      body
        ? { method: 'POST', url, params: iiqPagingParams(page, pageSize), data: body }
        : { method: 'GET', url, params: iiqPagingParams(page, pageSize) }
    );
    const pageItems = response?.Items ?? [];
    items.push(...pageItems);
    // Only a real Paging.TotalRows proves completeness; ItemCount is just this page's count.
    total = response?.Paging?.TotalRows ?? total;
    if (pageItems.length < pageSize || (total !== undefined && items.length >= total)) {
      return { items, total: Math.max(total ?? 0, items.length), truncated: false };
    }
  }
  // The cap was reached with every page full, so more rows may exist.
  return { items, total: Math.max(total ?? 0, items.length), truncated: true };
}

/** Text appended to a tool result built from a list that `iiqListAll` truncated. */
export const TRUNCATION_NOTE = '\n\nNote: the full list was too large to read completely; results may be incomplete.';

/** Appends TRUNCATION_NOTE to an MCP text result when the underlying list was truncated. */
export function withTruncationNote<R extends { content: Array<{ text: string }> }>(truncated: boolean, result: R): R {
  if (truncated && result.content[0]) result.content[0].text += TRUNCATION_NOTE;
  return result;
}

/** Slices a client-side-filtered list into the IIQ paginated response shape. */
export function iiqPage<T>(rows: T[], pageIndex = 0, pageSize = 20, truncated = false) {
  const items = rows.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize);
  return {
    Items: items,
    ItemCount: items.length,
    Paging: { PageIndex: pageIndex, PageSize: pageSize, PageCount: Math.ceil(rows.length / pageSize), TotalRows: rows.length },
    // Set only when the source list was truncated, so TotalRows may undercount.
    ...(truncated ? { Truncated: true } : {}),
  };
}

/**
 * Builds the MCP text result for one page of a client-side-filtered list: a "Found N <noun>
 * (showing M):" header, every row on the page, and a "Page X of Y" footer. A page past the end
 * says so (rather than claiming nothing matched); `emptyText` is used only when no row matched.
 * Out-of-range paging input is normalised: pageIndex to a whole number >= 0, pageSize to >= 1.
 *
 * With `total` (a server-paged list), `rows` is already the requested page and `total` is the
 * server's match count (`Paging.TotalRows`): rows are not sliced again, and an empty page with a
 * non-zero total is past the end. `renderPage` replaces the default one-row-per-paragraph body.
 */
export function formatListPage<T>({ rows, pageIndex = 0, pageSize, noun, emptyText, render, renderPage, truncated = false, total }: {
  rows: T[];
  pageIndex?: number;
  pageSize: number;
  noun: string;
  emptyText: string;
  render: (row: T) => string;
  renderPage?: (page: T[]) => string;
  truncated?: boolean;
  total?: number;
}): { content: Array<{ type: 'text'; text: string }> } {
  const size = normalizePageSize(pageSize);
  const index = normalizePageIndex(pageIndex);
  const matched = total ?? rows.length;
  const pageCount = Math.max(1, Math.ceil(matched / size));
  const page = total === undefined ? rows.slice(index * size, index * size + size) : rows;
  let text: string;
  if (matched === 0) {
    text = emptyText;
  } else if (index >= pageCount || page.length === 0) {
    text = `Page ${index + 1} is past the end: ${matched} ${noun} match (${pageCount} page${pageCount === 1 ? '' : 's'}).`;
  } else {
    const body = renderPage ? renderPage(page) : page.map(render).join('\n\n');
    text = `Found ${matched} ${noun} (showing ${page.length}):\n\n${body}\n\nPage ${index + 1} of ${pageCount}`;
  }
  return withTruncationNote(truncated, { content: [{ type: 'text', text }] });
}

/** Case-insensitive "any field contains the term" match; an empty term matches everything. */
export function matchesText(term: string | undefined, ...fields: Array<string | null | undefined>): boolean {
  const needle = term?.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((field) => field?.toLowerCase().includes(needle));
}

/** Maps `items` through `fn` with at most `limit` calls in flight, keeping input order. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

type PagedResponse ={ Items?: unknown[]; ItemCount?: number; Paging?: { TotalRows?: number } } | null | undefined;

/**
 * Total matches for a server-paged IIQ list. IIQ usually reports `TotalRows: 0` for an empty page
 * past the end (verified 2026-11-07), which reads the same as "nothing matched", so an empty page
 * after the first re-reads page 0 for the real total.
 */
export async function iiqServerTotal(
  response: PagedResponse,
  pageIndex: number,
  readPage: (pageIndex: number) => Promise<PagedResponse>
): Promise<number> {
  const total = iiqTotalRows(response);
  if (total > 0 || (response?.Items?.length ?? 0) > 0 || !(pageIndex > 0)) return total;
  return iiqTotalRows(await readPage(0));
}

/** Total matching rows for a paginated IIQ response: `Paging.TotalRows`, else `ItemCount`, else the page length. `ItemCount` alone is only the current page's count. */
export function iiqTotalRows(response: { Items?: unknown[]; ItemCount?: number; Paging?: { TotalRows?: number } } | null | undefined): number {
  return response?.Paging?.TotalRows ?? response?.ItemCount ?? response?.Items?.length ?? 0;
}
