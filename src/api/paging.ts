/**
 * Query-string paging for IIQ list/search requests: `$p` is the 0-based page index and `$s`
 * the page size (the HPS.IIQ PowerShell pattern). Pass as axios `params`.
 *
 * IIQ ignores a body `Paging` object on POST /tickets and POST /users (always page 0, 20 rows)
 * and ignores its PageIndex on POST /issues/types, so paging must travel in the query string.
 */
export function iiqPagingParams(pageIndex: number, pageSize: number): { $p: number; $s: number } {
  return { $p: pageIndex, $s: pageSize };
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
 */
export function formatListPage<T>({ rows, pageIndex = 0, pageSize, noun, emptyText, render, truncated = false }: {
  rows: T[];
  pageIndex?: number;
  pageSize: number;
  noun: string;
  emptyText: string;
  render: (row: T) => string;
  truncated?: boolean;
}): { content: Array<{ type: 'text'; text: string }> } {
  const size = Math.max(1, Math.floor(pageSize) || 1);
  const index = Math.max(0, Math.floor(pageIndex) || 0);
  const pageCount = Math.max(1, Math.ceil(rows.length / size));
  let text: string;
  if (rows.length === 0) {
    text = emptyText;
  } else if (index >= pageCount) {
    text = `Page ${index + 1} is past the end: ${rows.length} ${noun} match (${pageCount} page${pageCount === 1 ? '' : 's'}).`;
  } else {
    const page = rows.slice(index * size, index * size + size);
    text = `Found ${rows.length} ${noun} (showing ${page.length}):\n\n${page.map(render).join('\n\n')}\n\nPage ${index + 1} of ${pageCount}`;
  }
  return withTruncationNote(truncated, { content: [{ type: 'text', text }] });
}

/** Case-insensitive "any field contains the term" match; an empty term matches everything. */
export function matchesText(term: string | undefined, ...fields: Array<string | null | undefined>): boolean {
  const needle = term?.trim().toLowerCase();
  if (!needle) return true;
  return fields.some((field) => field?.toLowerCase().includes(needle));
}

/** Total matching rows for a paginated IIQ response: `Paging.TotalRows`, else `ItemCount`, else the page length. `ItemCount` alone is only the current page's count. */
export function iiqTotalRows(response: { Items?: unknown[]; ItemCount?: number; Paging?: { TotalRows?: number } } | null | undefined): number {
  return response?.Paging?.TotalRows ?? response?.ItemCount ?? response?.Items?.length ?? 0;
}
