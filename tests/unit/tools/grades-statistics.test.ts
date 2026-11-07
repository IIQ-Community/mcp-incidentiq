import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { http, HttpResponse, delay } from 'msw';
import { server } from '../../mocks/server';
import { handleEnhancedUserTool, enhancedUserTools } from '../../../src/tools/users';

/**
 * Grades: IIQ filters by `{ Facet: 'grade', Value }` with the SIS code ('01'-'12', 'KG', 'PK');
 * an `Id` grade filter matches only students with no grade (verified 2026-11-07). Statistics: both
 * /users/statistics/* endpoints return 404, so counts come from $s=1 filtered POST /users requests.
 */
const BASE = 'https://test.incidentiq.com/api/v1.0';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

type Handler = (name: string, args: object) => Promise<{ content: Array<{ text: string }> }>;
const run = async (name: string, args: object) => (await (handleEnhancedUserTool as Handler)(name, args)).content[0].text;

/** Synthetic district: [role, grade, locationId] per user; the mock counts matches for the filters. */
const USERS: Array<[string, string | undefined, string]> = [
  ...Array.from({ length: 3 }, () => ['role-student', '09', 'loc-a'] as [string, string, string]),
  ...Array.from({ length: 2 }, () => ['role-student', 'KG', 'loc-b'] as [string, string, string]),
  ['role-student', undefined, 'loc-a'],
  ['role-staff', undefined, 'loc-a'],
  ['role-staff', undefined, 'loc-b'],
];
const bodies: any[] = [];
let inFlight = 0;
let maxInFlight = 0;

beforeEach(() => {
  bodies.length = 0;
  inFlight = maxInFlight = 0;
  server.use(
    http.post(`${BASE}/users`, async ({ request }) => {
      const body = (await request.json()) as any;
      bodies.push(body);
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await delay(5);
      inFlight--;
      const filters: any[] = body?.Filters ?? [];
      const roles = filters.filter((f) => f.Facet === 'role').map((f) => f.Id);
      const grade = filters.find((f) => f.Facet === 'grade')?.Value;
      const location = filters.find((f) => f.Facet.toLowerCase() === 'location')?.Id;
      const total = USERS.filter(([r, g, l]) =>
        (roles.length === 0 || roles.includes(r)) && (grade === undefined || g === grade) && (location === undefined || l === location)
      ).length;
      return HttpResponse.json({ Items: [], ItemCount: 0, Paging: { TotalRows: total } });
    }),
    http.get(`${BASE}/locations/all`, () => HttpResponse.json({
      Items: [{ LocationId: 'loc-a', Name: 'Central High' }, { LocationId: 'loc-b', Name: 'North Elementary' }, { LocationId: 'loc-c', Name: 'Annex' }],
      ItemCount: 3, Paging: { TotalRows: 3 },
    })),
  );
});

const gradeFilter = () => bodies[0].Filters.find((f: any) => f.Facet === 'grade');

describe('grade filter', () => {
  it.each([
    ['8', '08'], ['08', '08'], ['12', '12'], ['k', 'KG'], ['Kindergarten', 'KG'], ['Pre-K', 'PK'], ['pk', 'PK'], ['Grade 9', '09'], ['Ungraded', 'Ungraded'],
  ])('user_search_advanced sends grade %s as the IIQ code %s', async (input, code) => {
    await run('user_search_advanced', { grade: input });
    expect(gradeFilter()).toEqual({ Facet: 'grade', Value: code });
  });

  it('user_get_students filters by the normalised grade', async () => {
    await run('user_get_students', { grade: 'k' });
    expect(gradeFilter()).toEqual({ Facet: 'grade', Value: 'KG' });
  });
});

describe('homeroom', () => {
  it('user_search_advanced no longer offers the unusable homeroom argument', () => {
    const schema = enhancedUserTools.find((t) => t.name === 'user_search_advanced')!.inputSchema.properties as Record<string, unknown>;
    expect(schema).not.toHaveProperty('homeroom');
  });

  it('user_get_students rows do not print homeroom (the search response never includes it)', async () => {
    server.use(http.post(`${BASE}/users`, () => HttpResponse.json({
      Items: [{ UserId: 'k1', Name: 'Kid 1', Grade: '09', Homeroom: '204' }], ItemCount: 1, Paging: { TotalRows: 1 },
    })));
    expect(await run('user_get_students', {})).toBe('Found 1 students (showing 1):\n\nGrade 09 (1):\n  • Kid 1\n\nPage 1 of 1');
  });

  it('user_get_details still shows homeroom when IIQ has one', async () => {
    server.use(http.get(`${BASE}/users/:id`, () => HttpResponse.json({ UserId: 'k1', Name: 'Kid 1', Homeroom: '204' })));
    expect(await run('user_get_details', { userId: 'k1' })).toContain('\nHomeroom: 204\n');
  });
});

describe('user_statistics_grades', () => {
  it('counts students per grade with filtered requests, plus students with no listed grade', async () => {
    expect(await run('user_statistics_grades', {})).toBe(
      'Student Distribution by Grade:\n\n  Grade KG: 2 students\n  Grade 09: 3 students\n  Other/none: 1 students\n\nTotal Students: 6'
    );
    expect(bodies.every((b) => b.Filters[0].Facet === 'role' && b.Filters[0].Id === 'role-student')).toBe(true);
    expect(bodies).toHaveLength(15); // total + PK, KG, 01-12
  });

  it('applies the optional building filter to every count', async () => {
    expect(await run('user_statistics_grades', { locationId: 'loc-b' })).toBe(
      'Student Distribution by Grade:\n\n  Grade KG: 2 students\n\nTotal Students: 2'
    );
    expect(bodies.every((b) => b.Filters.some((f: any) => f.Facet === 'location' && f.Id === 'loc-b'))).toBe(true);
  });

  it('says so when there are no students', async () => {
    expect(await run('user_statistics_grades', { locationId: 'loc-c' })).toBe('No grade statistics available.');
  });

  it('runs at most 4 count requests at once', async () => {
    await run('user_statistics_grades', {});
    expect(maxInFlight).toBeLessThanOrEqual(4);
  });
});

describe('user_statistics_locations', () => {
  it('counts users per location, listing only locations with users', async () => {
    expect(await run('user_statistics_locations', {})).toBe(
      'User Distribution by Location:\n\n  Central High: 5 users\n  North Elementary: 3 users\n\nTotal Users: 8'
    );
    expect(maxInFlight).toBeLessThanOrEqual(4);
  });

  it('applies the userType filter as a role', async () => {
    expect(await run('user_statistics_locations', { userType: 'staff' })).toBe(
      'User Distribution by Location:\n\n  Central High: 1 users\n  North Elementary: 1 users\n\nTotal Users: 2'
    );
    expect(bodies.every((b) => b.Filters.some((f: any) => f.Facet === 'role' && f.Id === 'role-staff'))).toBe(true);
  });
});
