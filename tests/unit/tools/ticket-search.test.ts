import {
  isValidEmail,
  buildTicketFilters,
  filterByStatusId,
  resolveMaxPages,
} from '../../../src/tools/ticket-search';
import { Ticket } from '../../../src/types/common';

describe('ticket-search pure helpers', () => {
  describe('isValidEmail', () => {
    it('accepts well-formed emails of any domain', () => {
      expect(isValidEmail('agent@example.org')).toBe(true);
      expect(isValidEmail('a.b+c@sub.domain.io')).toBe(true);
    });

    it('rejects malformed values', () => {
      expect(isValidEmail('notanemail')).toBe(false);
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('foo@bar')).toBe(false);
    });
  });

  describe('buildTicketFilters', () => {
    it('builds one {Facet,Id} per id across agent/team/location (OR within, AND across)', () => {
      const filters = buildTicketFilters({
        agentIds: ['a1', 'a2'],
        teamIds: ['t1'],
        locationIds: ['l1'],
      });
      expect(filters).toEqual([
        { Facet: 'agent', Id: 'a1' },
        { Facet: 'agent', Id: 'a2' },
        { Facet: 'team', Id: 't1' },
        { Facet: 'location', Id: 'l1' },
      ]);
    });

    it('returns [] for empty input and never emits a status or priority facet', () => {
      expect(buildTicketFilters({})).toEqual([]);
      const filters = buildTicketFilters({ agentIds: ['a1'], teamIds: ['t1'], locationIds: ['l1'] });
      expect(filters.some((f) => f.Facet === 'status' || f.Facet === 'priority')).toBe(false);
    });
  });

  describe('filterByStatusId', () => {
    const tickets = [
      { TicketId: '1', TicketNumber: 1, Subject: 'A', Status: 'Open', StatusId: 's1' },
      { TicketId: '2', TicketNumber: 2, Subject: 'B', Status: 'Closed', StatusId: 's2' },
      { TicketId: '3', TicketNumber: 3, Subject: 'C', Status: 'Open', StatusId: 's1' },
    ] as Ticket[];

    it('keeps only items whose StatusId is in the wanted set', () => {
      const result = filterByStatusId(tickets, new Set(['s1']));
      expect(result.map((t) => t.TicketId)).toEqual(['1', '3']);
    });

    it('returns [] when no item matches', () => {
      expect(filterByStatusId(tickets, new Set(['s9']))).toEqual([]);
    });
  });

  describe('resolveMaxPages', () => {
    it('defaults to 5 for missing, non-numeric, zero, negative, or Infinity', () => {
      expect(resolveMaxPages(undefined)).toBe(5);
      expect(resolveMaxPages('0')).toBe(5);
      expect(resolveMaxPages('-1')).toBe(5);
      expect(resolveMaxPages('abc')).toBe(5);
      expect(resolveMaxPages('Infinity')).toBe(5);
    });

    it('clamps to 50 max and passes through valid in-range values', () => {
      expect(resolveMaxPages('1000000')).toBe(50);
      expect(resolveMaxPages('10')).toBe(10);
      expect(resolveMaxPages('1')).toBe(1);
    });
  });
});
