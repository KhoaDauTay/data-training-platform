// E-commerce content as raw text (Plan 9). Only src/content.ts imports this, with import(), so it is its own lazy chunk
// (budget group `ecom`), fetched when the player first opens the domain (D9-7), never at boot.
export const ticketSources = import.meta.glob<string>('../content/domains/ecom/tickets/**/*.md', { query: '?raw', import: 'default', eager: true });
export { default as chaptersSource } from '../content/domains/ecom/chapters.yml?raw';
export { default as peopleSource } from '../content/domains/ecom/people.yml?raw';
export { default as kpiSource } from '../content/domains/ecom/kpis.yml?raw';
