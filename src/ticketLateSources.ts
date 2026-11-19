// V22-E (L201, like L185 for Finance): Logistics tickets of chapters 9–12, their own lazy chunk (budget `ticketLate`), fetched
// in parallel with src/ticketSources.ts by loadContent(). The roadmap said 7–12; 9–12 is the split that fits the 50 KB cap.
// tests/contentJson.test.ts checks that the two globs together cover every ticket file.
import type { TicketSource } from './tickets';

export const sources = import.meta.glob<TicketSource>(['../content/tickets/ch9/*.md', '../content/tickets/ch1[0-9]/*.md'], { query: '?fm', import: 'default', eager: true });
