import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { handleEnhancedCustomFieldTool, enhancedCustomFieldTools } from '../../../src/tools/customfields';

/**
 * #98 sweep, custom fields (C1-C7). Live IIQ (verified 2026-11-07): GET /custom-fields/{id} and
 * /custom-fields/types/{id} return { Item }; GET /custom-fields/types pages 100 of 128 by default
 * (Name, EditorType number, Scope, Options string); values come from
 * /custom-fields/values/for/{ticket|asset|user}/{id} as Items { CustomFieldTypeId, Value, IsHidden }.
 */
const BASE = 'https://test.incidentiq.com/api/v1.0';
const TICKET = '888891ac-91aa-e711-80c2-100dffa00001';
const ASSET = '888891ac-91aa-e711-80c2-100dffa00003';
const USER = '888891ac-91aa-e711-80c2-100dffa00004';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

type Handler = (name: string, args: object) => Promise<{ content: Array<{ text: string }> }>;
const run = async (name: string, args: object = {}) => (await (handleEnhancedCustomFieldTool as Handler)(name, args)).content[0].text;
const bullets = (text: string) => text.split('\n').filter((line) => line.trimStart().startsWith('• '));
const schemaOf = (name: string) => enhancedCustomFieldTools.find((t) => t.name === name)?.inputSchema.properties as Record<string, unknown>;

let seen: URL[] = [];
const paged = (rows: object[], defaultSize = 100) => ({ request }: { request: Request }) => {
  const url = new URL(request.url);
  seen.push(url);
  const p = Number(url.searchParams.get('$p') ?? 0);
  const s = Number(url.searchParams.get('$s') ?? defaultSize);
  const items = rows.slice(p * s, p * s + s);
  return HttpResponse.json({ Items: items, ItemCount: items.length, Paging: { TotalRows: rows.length } });
};
const fieldType = (i: number, extra: object = {}) => ({
  CustomFieldTypeId: `ct${i}`, Name: `Type ${i}`, EditorType: 3, Scope: i < 12 ? 'Global' : 'Site', IsRequired: false, Options: null, ...extra,
});
const types = Array.from({ length: 128 }, (_, i) => fieldType(i));
const useTypes = (rows: object[] = types) => { seen = []; server.use(http.get(`${BASE}/custom-fields/types`, paged(rows))); };
const field = (id: string, entity: string, name: string, typeId = `ct-${id}`) => ({
  CustomFieldId: id, CustomFieldTypeId: typeId, EntityTypeId: entity, IsRequired: false, IsHidden: false, IsReadOnly: false,
  IsSystemField: false, CustomFieldType: { Name: name },
});

describe('C1 customfield_get_details / customfield_get_type_details', () => {
  it('customfield_get_details renders GET /custom-fields/{id} Item', async () => {
    server.use(http.get(`${BASE}/custom-fields/:id`, ({ params }) =>
      HttpResponse.json({ Item: { ...field(String(params.id), ASSET, 'Reimage Complete', 'ct5'), IsRequired: true } })));
    expect(await run('customfield_get_details', { fieldId: 'f9' })).toBe(
      'Custom Field Details:\nName: Reimage Complete\nEntity Type: Asset\nRequired: Yes\nHidden: No\nRead-only: No\nSystem field: No\nType ID: ct5\nID: f9'
    );
  });

  it('customfield_get_type_details renders GET /custom-fields/types/{id} Item', async () => {
    server.use(http.get(`${BASE}/custom-fields/types/:id`, () =>
      HttpResponse.json({ Item: fieldType(4, { Description: 'Where it lives', Options: 'A\nB' }) })));
    expect(await run('customfield_get_type_details', { typeId: 'ct4' })).toBe(
      'Custom Field Type Details:\nName: Type 4\nDescription: Where it lives\nEditor type: 3\nScope: Global\nRequired: No\nHas options: Yes\nID: ct4'
    );
  });
});

describe('C1/C5 values tools', () => {
  const values = [
    { AssetId: 'a1', CustomFieldTypeId: 'ct1', IsHidden: false, Value: 'Yes' },
    { AssetId: 'a1', CustomFieldTypeId: 'ct2', IsHidden: false, Value: null },
    { AssetId: 'a1', CustomFieldTypeId: 'ct3', IsHidden: false, Value: '' },
    { AssetId: 'a1', CustomFieldTypeId: 'zz', IsHidden: false, Value: '42' },
  ];
  const useValues = (entity: string) => server.use(http.get(`${BASE}/custom-fields/values/for/${entity}/:id`, () => HttpResponse.json({ Items: values })));

  it.each([
    ['customfield_get_asset_values', 'asset', { assetId: 'a1' }, 'Asset'],
    ['customfield_get_user_values', 'user', { userId: 'u1' }, 'User'],
    ['customfield_get_ticket_values', 'ticket', { ticketId: 't1' }, 'Ticket'],
  ])('%s shows the field type name and hides empty values by default', async (tool, entity, args, label) => {
    useTypes();
    useValues(entity);
    expect(await run(tool, args)).toBe(`${label} Custom Field Values:\n\n• Type 1: Yes\n• zz: 42`);
  });

  it('includeEmpty shows empty values too', async () => {
    useTypes();
    useValues('asset');
    expect(await run('customfield_get_asset_values', { assetId: 'a1', includeEmpty: true })).toBe(
      'Asset Custom Field Values:\n\n• Type 1: Yes\n• Type 2: (empty)\n• Type 3: (empty)\n• zz: 42'
    );
  });

  it('says when every value is empty', async () => {
    useTypes();
    server.use(http.get(`${BASE}/custom-fields/values/for/user/:id`, () => HttpResponse.json({ Items: [values[1]] })));
    expect(await run('customfield_get_user_values', { userId: 'u1' })).toBe('No custom field values for this user.');
  });
});

describe('C1 customfield_get_options', () => {
  const useOptions = (options: unknown) => server.use(
    http.get(`${BASE}/custom-fields/:id`, () => HttpResponse.json({ Item: field('f1', TICKET, 'Building', 'ct7') })),
    http.get(`${BASE}/custom-fields/types/:id`, ({ params }) =>
      HttpResponse.json({ Item: fieldType(7, { CustomFieldTypeId: params.id, Options: options }) })),
  );

  it('lists a JSON array of strings', async () => {
    useOptions('["North", "South"]');
    expect(await run('customfield_get_options', { fieldId: 'f1' })).toBe('Options for Building (2):\n\n• North\n• South');
  });

  it('lists a JSON array of objects by Name/Label/Value', async () => {
    useOptions(JSON.stringify([{ Name: 'One' }, { Label: 'Two' }, { Value: 'Three' }]));
    expect(bullets(await run('customfield_get_options', { fieldId: 'f1' }))).toEqual(['• One', '• Two', '• Three']);
  });

  it('splits a plain string on newlines', async () => {
    useOptions('Red\r\nGreen\n\n Blue ');
    expect(await run('customfield_get_options', { fieldId: 'f1' })).toBe('Options for Building (3):\n\n• Red\n• Green\n• Blue');
  });

  it('says when the field type has no options', async () => {
    useOptions(null);
    expect(await run('customfield_get_options', { fieldId: 'f1' })).toBe('Custom field Building has no options (its type Type 7 defines none).');
  });
});

describe('C2 customfield_get_all entityType', () => {
  it('filters client-side by entity (IIQ ignores EntityType)', async () => {
    const all = [field('f1', TICKET, 'Room Number'), field('f2', ASSET, 'Reimage Complete'), field('f3', USER, 'Graduation Year')];
    server.use(http.get(`${BASE}/custom-fields`, () => HttpResponse.json({ Items: all, ItemCount: all.length })));
    const text = await run('customfield_get_all', { entityType: 'Asset' });
    expect(text).toBe('Found 1 custom fields (showing 1):\n\nAsset (1 on this page):\n  • Reimage Complete\n\nPage 1 of 1');
  });
});

describe('C3 customfield_search', () => {
  it('no longer offers isActive', () => {
    expect(schemaOf('customfield_search')).not.toHaveProperty('isActive');
  });
});

describe('C4 customfield_get_types', () => {
  it('reads every type and pages 25 by default with real fields', async () => {
    useTypes();
    const text = await run('customfield_get_types', { pageIndex: 5 });
    expect(text).toBe(
      'Found 128 custom field types (showing 3):\n\n' +
      '• Type 125\n  Editor type: 3 | Scope: Site | ID: ct125\n\n' +
      '• Type 126\n  Editor type: 3 | Scope: Site | ID: ct126\n\n' +
      '• Type 127\n  Editor type: 3 | Scope: Site | ID: ct127\n\n' +
      'Page 6 of 6'
    );
    expect(seen.every((url) => url.searchParams.has('$s'))).toBe(true);
  });

  it('no longer offers supportedEntity', () => {
    expect(schemaOf('customfield_get_types')).not.toHaveProperty('supportedEntity');
    expect(schemaOf('customfield_get_types')).toHaveProperty('pageSize');
  });
});

describe('C6 customfield_get_student_fields toggles', () => {
  const all = [field('f1', USER, 'Graduation Year'), field('f2', USER, 'IEP Contact'), field('f3', USER, 'Guardian Phone'), field('f4', USER, 'Student Number')];
  const use = () => server.use(http.post(`${BASE}/custom-fields`, () => HttpResponse.json({ Items: all, ItemCount: all.length })));

  it('shows every group by default', async () => {
    use();
    const text = await run('customfield_get_student_fields');
    for (const name of ['Graduation Year', 'IEP Contact', 'Guardian Phone', 'Student Number']) expect(text).toContain(name);
  });

  it.each([
    ['includeGrade', 'Graduation Year', 'Academic:'],
    ['includeGuardian', 'Guardian Phone', 'Parent/Guardian:'],
    ['includeIEP', 'IEP Contact', 'Special Education:'],
  ])('%s: false drops that group', async (flag, name, heading) => {
    use();
    const text = await run('customfield_get_student_fields', { [flag]: false });
    expect(text).not.toContain(name);
    expect(text).not.toContain(heading);
    expect(text).toContain('Student Number');
  });

  it('a disabled group excludes its fields even when they also match id/number/student', async () => {
    const overlap = [field('g1', USER, 'Guardian ID'), field('g2', USER, 'Student IEP Number'), field('g3', USER, 'Student Number')];
    server.use(http.post(`${BASE}/custom-fields`, () => HttpResponse.json({ Items: overlap, ItemCount: overlap.length })));
    const text = await run('customfield_get_student_fields', { includeGuardian: false, includeIEP: false });
    expect(text).toBe('Student Custom Fields:\n\nIdentification:\n  • Student Number\n');
  });

  it('matches section words at word starts, not inside other words', async () => {
    const tricky = [field('w1', USER, 'Student Upgraded Device ID'), field('w2', USER, 'Residence Hall'), field('w3', USER, 'Grade Level')];
    server.use(http.post(`${BASE}/custom-fields`, () => HttpResponse.json({ Items: tricky, ItemCount: tricky.length })));
    expect(await run('customfield_get_student_fields', { includeGrade: false })).toBe(
      'Student Custom Fields:\n\nIdentification:\n  • Student Upgraded Device ID\n'
    );
  });

  it('shows every selected field exactly once, with uncategorised matches under General', async () => {
    const mixed = [field('m1', USER, 'Student Enrollment'), field('m2', USER, 'Guardian ID'), field('m3', USER, 'Student Number'), field('m4', USER, 'Graduation Year')];
    server.use(http.post(`${BASE}/custom-fields`, () => HttpResponse.json({ Items: mixed, ItemCount: mixed.length })));
    expect(await run('customfield_get_student_fields')).toBe(
      'Student Custom Fields:\n' +
      '\nIdentification:\n  • Student Number\n' +
      '\nAcademic:\n  • Graduation Year\n' +
      '\nParent/Guardian:\n  • Guardian ID\n' +
      '\nGeneral:\n  • Student Enrollment\n'
    );
  });
});

describe('C7 removed custom field tools', () => {
  it('no longer advertises tools IIQ cannot back', () => {
    const names = enhancedCustomFieldTools.map((t) => t.name);
    const removed = ['customfield_get_location_values', 'customfield_get_device_fields', 'customfield_get_compliance_fields',
      'customfield_validate_value', 'customfield_get_by_entity', 'customfield_search_values'];
    expect(removed.filter((name) => names.includes(name))).toEqual([]);
  });
});

describe('X3 customfield_get_all paging', () => {
  const many = Array.from({ length: 30 }, (_, i) => field(`f${i}`, i < 20 ? TICKET : ASSET, `Field ${i}`));
  const use = () => server.use(http.get(`${BASE}/custom-fields`, () => HttpResponse.json({ Items: many, ItemCount: many.length })));

  it('pages 25 by default with no per-entity cap, grouped by entity on the page', async () => {
    use();
    const text = await run('customfield_get_all');
    expect(text).toBe(
      'Found 30 custom fields (showing 25):\n\n' +
      'Ticket (20 on this page):\n' + Array.from({ length: 20 }, (_, i) => `  • Field ${i}`).join('\n') + '\n\n' +
      'Asset (5 on this page):\n' + Array.from({ length: 5 }, (_, i) => `  • Field ${20 + i}`).join('\n') +
      '\n\nPage 1 of 2'
    );
    expect(text).not.toContain('more');
  });

  it('honours pageSize/pageIndex', async () => {
    use();
    expect(await run('customfield_get_all', { pageSize: 4, pageIndex: 7 })).toBe(
      'Found 30 custom fields (showing 2):\n\nAsset (2 on this page):\n  • Field 28\n  • Field 29\n\nPage 8 of 8'
    );
    expect(schemaOf('customfield_get_all')).toHaveProperty('pageSize');
    expect(schemaOf('customfield_get_all')).toHaveProperty('pageIndex');
  });
});

describe('X4 customfield ghosts', () => {
  it('customfield_find_by_name has no Active line (custom fields have no IsActive)', async () => {
    server.use(http.post(`${BASE}/custom-fields`, () => HttpResponse.json({ Items: [{ ...field('f1', ASSET, 'Connection Type'), IsRequired: true }] })));
    expect(await run('customfield_find_by_name', { fieldName: 'connection type' })).toBe(
      'Custom Field Found:\nName: Connection Type\nID: f1\nEntity Type: Asset\nRequired: Yes'
    );
  });

  it('customfield_search includeDeleted says it shows only deleted fields', () => {
    expect(schemaOf('customfield_search').includeDeleted).toMatchObject({
      description: 'Show only deleted fields (sent as OnlyShowDeleted; default: false)',
    });
  });
});
