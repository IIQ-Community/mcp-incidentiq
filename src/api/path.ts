/**
 * One user-supplied value as a single URL path segment. `encodeURIComponent` stops `/`, `?` and
 * `#` from changing the requested resource, but leaves `.` and `..` alone, and URL normalisation
 * treats even `%2E%2E` as a dot segment. So empty and dot-only values are rejected outright.
 */
export function pathSegment(value: unknown): string {
  const text = String(value ?? '').trim();
  if (text === '' || text === '.' || text === '..') {
    throw new Error(`"${text}" must be an ID or value, not empty or "." / ".." (path segment)`);
  }
  return encodeURIComponent(text);
}
