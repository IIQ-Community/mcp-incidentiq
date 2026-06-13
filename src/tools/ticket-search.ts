import { IIQFilter, Ticket } from '../types/common.js';

/** Returns true if value is a well-formed email address (any domain). */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

interface TicketFilterInput {
  agentIds?: string[];
  teamIds?: string[];
  locationIds?: string[];
}

/** Builds server-side IIQ ticket Filters for agent/team/location (OR within a facet, AND across facets). Status is intentionally excluded - the server status facet is unreliable, so status is filtered client-side. */
export function buildTicketFilters(input: TicketFilterInput): IIQFilter[] {
  const filters: IIQFilter[] = [];
  for (const id of input.agentIds ?? []) filters.push({ Facet: 'agent', Id: id });
  for (const id of input.teamIds ?? []) filters.push({ Facet: 'team', Id: id });
  for (const id of input.locationIds ?? []) filters.push({ Facet: 'location', Id: id });
  return filters;
}

/** Keeps only tickets whose StatusId is in wantedStatusIds. List items carry StatusId, so matching by id avoids name resolution and the unreliable server-side status facet. */
export function filterByStatusId(items: Ticket[], wantedStatusIds: Set<string>): Ticket[] {
  return items.filter((ticket) => ticket.StatusId !== undefined && wantedStatusIds.has(ticket.StatusId));
}

const DEFAULT_MAX_PAGES = 5;
const MAX_MAX_PAGES = 50;

/** Parses and clamps the status-scan page cap to [1, 50], defaulting to 5 on missing/invalid input. */
export function resolveMaxPages(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? '', 10);
  if (Number.isNaN(parsed) || parsed < 1) return DEFAULT_MAX_PAGES;
  return Math.min(parsed, MAX_MAX_PAGES);
}
