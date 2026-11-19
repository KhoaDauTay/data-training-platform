// Finance content as raw text (Plan 11, like src/ecomSources.ts). Only src/content.ts imports this, with import(), so it is
// its own lazy chunk (budget group `fin`), fetched when the player first opens the domain.
// v20 (L185): chapters 1–4 only; chapters 5+ are src/finLateSources.ts (budget `finlate`), fetched in parallel by loadDomain().
export const ticketSources = import.meta.glob<string>('../content/domains/fin/tickets/ch[1-4]/*.md', { query: '?raw', import: 'default', eager: true });
export { default as chaptersSource } from '../content/domains/fin/chapters.yml?raw';
export { default as peopleSource } from '../content/domains/fin/people.yml?raw';
export { default as kpiSource } from '../content/domains/fin/kpis.yml?raw';
