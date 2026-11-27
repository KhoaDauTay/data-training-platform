// v48 BP-C (L1152): the graph track's full cards (budget `bpgraph`), lazy from src/bestSources.ts.
import type { CardSource } from './engine/best';

export const cards = import.meta.glob<CardSource>('../content/engine/best/graph/*.md', { query: '?fm', import: 'default', eager: true });
