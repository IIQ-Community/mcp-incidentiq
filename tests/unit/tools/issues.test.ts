import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { handleEnhancedIssuesTool } from '../../../src/tools/issues';

const BASE = 'https://test.incidentiq.com/api/v1.0';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const issueTypes = [
  { IssueTypeId: 'i1', Name: 'Projector not displaying', Scope: 'Tickets' },
  { IssueTypeId: 'i2', Name: 'Chromebook cracked screen', Scope: 'Tickets' },
  { IssueTypeId: 'i3', Name: 'Interactive board calibration', Scope: 'Tickets' },
  { IssueTypeId: 'i4', Name: 'Password reset', Scope: 'Users' },
  { IssueTypeId: 'i5', Name: 'iPad will not charge', Scope: 'Assets' },
  { IssueTypeId: 'i6', Name: 'Classroom speaker static', Scope: 'Tickets' },
];

/**
 * Live POST /issues/types (verified 2026-11-06): ignores body SearchText, the keyword facet and
 * body PageIndex; pages only via $p/$s and reports Paging.TotalRows.
 */
let seen: URL[] = [];
beforeEach(() => {
  seen = [];
  server.use(
    http.post(`${BASE}/issues/types`, ({ request }) => {
      const url = new URL(request.url);
      seen.push(url);
      const p = Number(url.searchParams.get('$p') ?? 0);
      const s = Number(url.searchParams.get('$s') ?? 20);
      const items = issueTypes.slice(p * s, p * s + s);
      return HttpResponse.json({ Items: items, ItemCount: items.length, Paging: { PageIndex: p, PageSize: s, TotalRows: issueTypes.length } });
    })
  );
});

const textOf = async (name: string, args: object) => (await handleEnhancedIssuesTool(name, args)).content[0].text as string;

describe('issues_search_types', () => {
  it('filters issue types by name client-side (the server ignores SearchText)', async () => {
    const text = await textOf('issues_search_types', { searchText: 'chromebook' });
    expect(text).toContain('Found 1 issue types');
    expect(text).toContain('Chromebook cracked screen');
    expect(text).not.toContain('Password reset');
  });

  it('filters by scope', async () => {
    const text = await textOf('issues_search_types', { scope: 'Users' });
    expect(text).toContain('Password reset');
    expect(text).not.toContain('Projector');
  });

  it('pages the filtered list and reports the total', async () => {
    const text = await textOf('issues_search_types', { pageSize: 4, pageIndex: 1 });
    expect(text).toContain('Found 6 issue types (showing 2)');
    expect(text).toContain('iPad will not charge');
    expect(text).toContain('Page 2 of 2');
    expect(seen.every((url) => url.searchParams.has('$s'))).toBe(true);
  });
});

describe('issue type shortcuts', () => {
  it('issues_get_classroom_tech lists only classroom-tech issue types', async () => {
    const text = await textOf('issues_get_classroom_tech', {});
    expect(text).toContain('Projector not displaying');
    expect(text).toContain('Interactive board calibration');
    expect(text).toContain('Classroom speaker static');
    expect(text).not.toContain('Password reset');
    expect(text).not.toContain('Chromebook cracked screen');
  });

  it('issues_get_classroom_tech groups speaker/microphone issue types under audio', async () => {
    const text = await textOf('issues_get_classroom_tech', {});
    const audio = text.slice(text.indexOf('Audio System Issues:'));
    expect(text).toContain('Audio System Issues:');
    expect(audio).toContain('Classroom speaker static');
    expect(text).not.toContain('Other Classroom Issues:');
  });

  it('issues_get_student_devices lists only device issue types', async () => {
    const text = await textOf('issues_get_student_devices', { deviceType: 'Chromebook' });
    expect(text).toContain('Chromebook cracked screen');
    expect(text).not.toContain('iPad will not charge');
    expect(text).not.toContain('Password reset');
  });
});
