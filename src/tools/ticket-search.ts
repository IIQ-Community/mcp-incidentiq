import { IIQFilter, Ticket } from '../types/common.js';

/** Returns true if value is a well-formed email address (any domain). */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

interface TicketFilterInput {
  keyword?: string;
  agentIds?: string[];
  teamIds?: string[];
  locationIds?: string[];
}

/** Builds server-side IIQ ticket Filters for keyword/agent/team/location (OR within a facet, AND across facets). Free text must go in the `keyword` facet: IIQ ignores a body SearchText. Status is intentionally excluded - the server status facet is unreliable, so status is filtered client-side. */
export function buildTicketFilters(input: TicketFilterInput): IIQFilter[] {
  const filters: IIQFilter[] = [];
  const keyword = input.keyword?.trim();
  if (keyword) filters.push({ Facet: 'keyword', Value: keyword });
  for (const id of input.agentIds ?? []) filters.push({ Facet: 'agent', Id: id });
  for (const id of input.teamIds ?? []) filters.push({ Facet: 'team', Id: id });
  for (const id of input.locationIds ?? []) filters.push({ Facet: 'location', Id: id });
  return filters;
}

/** Keeps only tickets whose WorkflowStep.StatusId is in wantedStatusIds. List items carry the status id on WorkflowStep (it matches `TicketStatusTypeId` from GET /tickets/statuses); the server-side status facet returns nothing, so status is filtered here. */
export function filterByStatusId(items: Ticket[], wantedStatusIds: Set<string>): Ticket[] {
  return items.filter((ticket) => {
    const statusId = ticket.WorkflowStep?.StatusId;
    return statusId !== undefined && wantedStatusIds.has(statusId);
  });
}

/** Display label for a list ticket's status, e.g. "Awaiting Agent (Open)". */
export function formatTicketStatus(ticket: Ticket): string {
  const step = ticket.WorkflowStep;
  if (step?.StepName && step.StatusName && step.StepName !== step.StatusName) return `${step.StepName} (${step.StatusName})`;
  return step?.StepName ?? step?.StatusName ?? ticket.StatusName ?? 'Unknown';
}

const DEFAULT_MAX_PAGES = 5;
const MAX_MAX_PAGES = 50;

/** Parses and clamps the status-scan page cap to [1, 50], defaulting to 5 on missing/invalid input. */
export function resolveMaxPages(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? '', 10);
  if (Number.isNaN(parsed) || parsed < 1) return DEFAULT_MAX_PAGES;
  return Math.min(parsed, MAX_MAX_PAGES);
}
