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
