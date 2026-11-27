// v48 BP-C (L1152): the search track's full cards (budget `bpsearch`), lazy from src/bestSources.ts.
import type { CardSource } from './engine/best';

export const cards = import.meta.glob<CardSource>('../content/engine/best/search/*.md', { query: '?fm', import: 'default', eager: true });
