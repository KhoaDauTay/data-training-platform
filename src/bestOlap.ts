// v48 BP-C (L1152): the olap track's full cards (budget `bpolap`), lazy from src/bestSources.ts.
import type { CardSource } from './engine/best';

export const cards = import.meta.glob<CardSource>('../content/engine/best/olap/*.md', { query: '?fm', import: 'default', eager: true });
