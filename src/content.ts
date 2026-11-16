import { byOrder, parseTicket, type Ticket } from './tickets';

const files = import.meta.glob<string>('../content/tickets/**/*.md', { query: '?raw', import: 'default', eager: true });

export function loadTickets(): Ticket[] {
  return Object.entries(files)
    .map(([path, source]) => parseTicket(source, path))
    .sort(byOrder);
}
