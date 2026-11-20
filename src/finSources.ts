// Finance content, parsed at build time (V22-E) (Plan 11, like src/ecomSources.ts). Only src/content.ts imports this, with import(), so it is
// its own lazy chunk (budget group `fin`), fetched when the player first opens the domain.
// v20 (L185): chapters 1–4 only; chapters 5+ are src/finLateSources.ts (budget `finlate`), fetched in parallel by loadDomain().
import type { TicketSource } from './tickets';

export const ticketSources = import.meta.glob<TicketSource>('../content/domains/fin/tickets/ch[1-4]/*.md', { query: '?fm', import: 'default', eager: true });
export { default as chaptersSource } from '../content/domains/fin/chapters.yml';
export { default as peopleSource } from '../content/domains/fin/people.yml';
export { default as kpiSource } from '../content/domains/fin/kpis.yml';
