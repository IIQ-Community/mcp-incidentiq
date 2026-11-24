/**
 * Refuses IncidentIQ requests that are known to be wrong before they are sent (verified live 2026-11-24):
 * - An explicit `FilterByProduct: false` in a request body widens a search to every IIQ product. Omitting the
 *   field keeps the API key's product; `FilterByProduct: true` with a `ProductId` is also safe.
 * - IIQ's `/services/*` browser API returns 405/HTML to API clients. Only `/api/v1.0/*` is supported.
 */

/**
 * Throws if a request body carries `FilterByProduct: false` (boolean or the string "false", any case).
 * Reads plain objects, JSON text (string, Buffer, typed array, ArrayBuffer) and key-value bodies
 * (FormData, URLSearchParams). Streams and Blobs cannot be read synchronously and are not inspected;
 * nothing in this server sends them.
 */
export function assertNoProductWidening(data: unknown): void {
  if (isForbidden(filterByProductOf(data))) {
    throw new Error(
      'Refusing IncidentIQ request: "FilterByProduct": false widens results to every IncidentIQ product. ' +
        'Omit FilterByProduct (the API key\'s product) or send FilterByProduct: true with a ProductId.'
    );
  }
}

/**
 * Throws if the resolved request URL is under `/services` (IIQ's unsupported browser API): its FIRST path
 * segment, decoded, is `services`. Deeper segments are tool input (an asset tag or search term of "services").
 */
export function assertNotServicesPath(resolvedUrl: string): void {
  let pathname: string;
  try {
    pathname = new URL(resolvedUrl).pathname;
  } catch {
    pathname = resolvedUrl;
  }
  const firstSegment = pathname.split('/').find((segment) => segment !== '') ?? '';
  if (decodeSegment(firstSegment).toLowerCase() === 'services') {
    throw new Error(
      'Refusing IncidentIQ request to /services: that browser API is not available to API clients. ' +
        'Use the /api/v1.0 API (set IIQ_API_BASE_URL to https://<district>.incidentiq.com/api/v1.0).'
    );
  }
}

function filterByProductOf(data: unknown): unknown {
  if (data === null || data === undefined) return undefined;
  if (typeof data === 'string') return filterByProductOf(parseJsonObject(data));
  if (data instanceof ArrayBuffer) return filterByProductOf(new TextDecoder().decode(data));
  if (ArrayBuffer.isView(data)) {
    // axios sends a Buffer as its own bytes, but any other view as its WHOLE backing buffer; check what is sent.
    const viewed = filterByProductOf(new TextDecoder().decode(new Uint8Array(data.buffer, data.byteOffset, data.byteLength)));
    if (isForbidden(viewed) || Buffer.isBuffer(data)) return viewed;
    return filterByProductOf(data.buffer);
  }
  if (data instanceof FormData || data instanceof URLSearchParams) return data.get('FilterByProduct') ?? undefined;
  if (typeof data === 'object' && !Array.isArray(data)) return (data as Record<string, unknown>).FilterByProduct;
  return undefined;
}

function isForbidden(value: unknown): boolean {
  return value === false || (typeof value === 'string' && value.trim().toLowerCase() === 'false');
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function parseJsonObject(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
