// E-commerce content (Plan 9), parsed at build time (V22-E, L201). Only src/content.ts imports this, with import(), so it is
// its own lazy chunk (budget group `ecom`), fetched when the player first opens the domain (D9-7), never at boot.
// V22-E: chapters 1–4 only; chapters 5+ are src/ecomLateSources.ts (budget `ecomLate`), fetched in parallel by loadDomain().
import type { TicketSource } from './tickets';

export const ticketSources = import.meta.glob<TicketSource>('../content/domains/ecom/tickets/ch[1-4]/*.md', { query: '?fm', import: 'default', eager: true });
export { default as chaptersSource } from '../content/domains/ecom/chapters.yml';
export { default as peopleSource } from '../content/domains/ecom/people.yml';
export { default as kpiSource } from '../content/domains/ecom/kpis.yml';
