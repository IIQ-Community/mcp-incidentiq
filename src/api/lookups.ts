import type { IIQRequester } from './paging.js';

/**
 * Name -> id lookups for IIQ filters that only accept ids. IIQ silently ignores a facet it does
 * not understand (a `UserType` facet, a `Status` facet, an asset-type name), returning every
 * row, so a name must be resolved to the id the working facet takes (verified 2026-11-07).
 */
export interface NamedList {
  url: string;
  idKey: string;
  label: string;
}

export const ROLES: NamedList = { url: '/sites/roles', idKey: 'RoleId', label: 'role' };
export const ASSET_TYPES: NamedList = { url: '/assets/types', idKey: 'AssetTypeId', label: 'asset type' };
export const ASSET_STATUSES: NamedList = { url: '/assets/status/types', idKey: 'AssetStatusTypeId', label: 'asset status' };

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolves each name to its id: a GUID passes through; otherwise a case-insensitive exact name
 * match, then the one name that starts with it as a word ("Parent" -> "Parent / Guardian"). A
 * prefix matching several names throws rather than guessing. An unknown name throws, listing the
 * district's names, unless `skipMissing` drops it; a result with no ids always throws.
 */
export async function resolveIds(
  client: IIQRequester,
  list: NamedList,
  names: string[],
  { skipMissing = false }: { skipMissing?: boolean } = {}
): Promise<string[]> {
  if (names.every((name) => GUID.test(name))) return names;
  const response = await client.request<unknown>({ method: 'GET', url: list.url });
  const entries = (Array.isArray(response) ? response : (response as { Items?: unknown[] })?.Items ?? []) as Array<Record<string, string>>;
  const unknown = (name: string) =>
    new Error(`Unknown ${list.label} "${name}". Available: ${entries.map((entry) => entry.Name).join(', ')}`);
  const ids: string[] = [];
  for (const name of names) {
    if (GUID.test(name)) {
      ids.push(name);
      continue;
    }
    const wanted = name.trim().toLowerCase();
    const prefixed = entries.filter((entry) => entry.Name?.toLowerCase().startsWith(`${wanted} `));
    const match = entries.find((entry) => entry.Name?.toLowerCase() === wanted)
      ?? (prefixed.length === 1 ? prefixed[0] : undefined);
    if (!match && prefixed.length > 1) {
      throw new Error(`Ambiguous ${list.label} "${name}" matches: ${prefixed.map((entry) => entry.Name).join(', ')}`);
    }
    if (match) ids.push(match[list.idKey]);
    else if (!skipMissing) throw unknown(name);
  }
  if (ids.length === 0) throw unknown(names.join(' / '));
  return ids;
}
