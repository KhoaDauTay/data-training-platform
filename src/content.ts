import { byOrder, parseTicket, type Ticket } from './tickets';
import { applyVariant } from './variants';

const files = import.meta.glob<string>('../content/tickets/**/*.md', { query: '?raw', import: 'default', eager: true });

let templates: Ticket[] | undefined;

/** Raw tickets with their {{x}} templates, parsed once and shared (Practice and the review queue read these). Do not mutate. */
export function loadTicketTemplates(): Ticket[] {
  return (templates ??= Object.entries(files)
    .map(([path, source]) => parseTicket(source, path))
    .sort(byOrder));
}

/** Story mode always plays variants[0]. */
export function loadTickets(): Ticket[] {
  return loadTicketTemplates().map((t) => applyVariant(t, 0));
}
