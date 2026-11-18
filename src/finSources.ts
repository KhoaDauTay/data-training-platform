// Finance content as raw text (Plan 11, like src/ecomSources.ts). Only src/content.ts imports this, with import(), so it is
// its own lazy chunk (budget group `fin`), fetched when the player first opens the domain.
export const ticketSources = import.meta.glob<string>('../content/domains/fin/tickets/**/*.md', { query: '?raw', import: 'default', eager: true });
export { default as chaptersSource } from '../content/domains/fin/chapters.yml?raw';
export { default as peopleSource } from '../content/domains/fin/people.yml?raw';
export { default as kpiSource } from '../content/domains/fin/kpis.yml?raw';
