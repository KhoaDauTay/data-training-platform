// V22-E: E-commerce tickets of chapters 5+ (like src/finLateSources.ts, L185), its own lazy chunk (budget `ecomLate`).
// Only src/content.ts imports it, beside src/ecomSources.ts.
import type { TicketSource } from './tickets';

export const ticketSources = import.meta.glob<TicketSource>('../content/domains/ecom/tickets/ch[5-9]/*.md', { query: '?fm', import: 'default', eager: true });
