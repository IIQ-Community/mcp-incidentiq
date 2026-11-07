import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { handleEnhancedCustomFieldTool } from '../../../src/tools/customfields';

const BASE = 'https://test.incidentiq.com/api/v1.0';
const TICKET = '888891ac-91aa-e711-80c2-100dffa00001';
const ASSET = '888891ac-91aa-e711-80c2-100dffa00003';
const USER = '888891ac-91aa-e711-80c2-100dffa00004';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Live POST /custom-fields items carry their name on CustomFieldType (no top-level Name).
const field = (id: string, entity: string, name: string, isRequired = false) => ({
  CustomFieldId: id,
  CustomFieldTypeId: `type-${id}`,
  EntityTypeId: entity,
  IsRequired: isRequired,
  CustomFieldType: { Name: name },
});
const fields = [
  field('f1', TICKET, 'Additional Notes', true),
  field('f2', TICKET, 'Room Number'),
  field('f3', ASSET, 'Reimage Complete'),
  field('f4', ASSET, 'Connection Type', true),
  field('f5', USER, 'Graduation Year'),
  field('f6', USER, 'IEP Contact', true),
];

/**
 * Live POST /custom-fields (verified 2026-11-06): returns every field, ignores body SearchText
 * and the IsRequired facet, and returns NOTHING for an EntityType facet.
 */
beforeEach(() => {
  server.use(
    http.post(`${BASE}/custom-fields`, async ({ request }) => {
      const body = (await request.json()) as { Filters?: Array<{ Facet: string }> };
      const hasEntityFacet = (body.Filters ?? []).some((f) => f.Facet === 'EntityType');
      return HttpResponse.json({ Items: hasEntityFacet ? [] : fields, ItemCount: hasEntityFacet ? 0 : fields.length });
    })
  );
});

const textOf = async (name: string, args: object) =>
  (await handleEnhancedCustomFieldTool(name, args)).content[0].text as string;

describe('customfield_search', () => {
  it('filters by field name client-side (the server ignores SearchText)', async () => {
    const text = await textOf('customfield_search', { searchText: 'reimage' });
    expect(text).toContain('Found 1 custom fields');
    expect(text).toContain('Reimage Complete');
    expect(text).not.toContain('Connection Type');
  });

  it('filters by entity type name and required flag', async () => {
    const text = await textOf('customfield_search', { entityType: 'Asset', isRequired: true });
    expect(text).toContain('Found 1 custom fields');
    expect(text).toContain('Connection Type (Required)');
    expect(text).toContain('Entity: Asset');
  });

  it('filters by fieldType (CustomFieldTypeId), case-insensitively', async () => {
    const text = await textOf('customfield_search', { fieldType: 'TYPE-F5' });
    expect(text).toContain('Found 1 custom fields');
    expect(text).toContain('Graduation Year');
  });
});

describe('customfield shortcuts', () => {
  it('customfield_get_required lists the required fields of one entity type', async () => {
    const text = await textOf('customfield_get_required', { entityType: 'Ticket' });
    expect(text).toContain('Required Fields for Ticket (1)');
    expect(text).toContain('Additional Notes');
    expect(text).not.toContain('Connection Type');
  });

  it('customfield_find_by_name finds a field by its type name', async () => {
    const text = await textOf('customfield_find_by_name', { fieldName: 'connection type', exactMatch: true });
    expect(text).toContain('Name: Connection Type');
    expect(text).toContain('ID: f4');
    expect(text).toContain('Entity Type: Asset');
  });

  it('customfield_get_student_fields lists user-entity student fields', async () => {
    const text = await textOf('customfield_get_student_fields', {});
    expect(text).toContain('Graduation Year');
    expect(text).toContain('IEP Contact');
    expect(text).not.toContain('Room Number');
  });
});
