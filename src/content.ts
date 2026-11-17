import { byOrder, parseTicket, type Ticket } from './tickets';
import { applyVariant } from './variants';

let templates: Ticket[] | undefined;
let loading: Promise<void> | undefined;

/**
 * Ticket markdown is a lazy chunk (Plan 3, L41: src/ticketSources.ts), so new chapters never grow the main bundle.
 * Everything is fetched at once: progression, the inbox, Home and the review queue need every ticket.
 * main.ts and tests/setup.ts await this before anything reads tickets. A failed load can be retried.
 */
export function loadContent(): Promise<void> {
  return (loading ??= import('./ticketSources')
    .then(({ sources }) => {
      templates = Object.entries(sources).map(([path, source]) => parseTicket(source, path)).sort(byOrder);
    })
    .catch((e: unknown) => {
      loading = undefined;
      throw e;
    }));
}

/** Raw tickets with their {{x}} templates, parsed once and shared (Practice and the review queue read these). Do not mutate. */
export function loadTicketTemplates(): Ticket[] {
  if (!templates) throw new Error('loadContent() has not finished');
  return templates;
}

/** Story mode always plays variants[0]. */
export function loadTickets(): Ticket[] {
  return loadTicketTemplates().map((t) => applyVariant(t, 0));
}
