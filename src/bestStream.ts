// v48 BP-C (L1152): the stream track's full cards (budget `bpstream`), lazy from src/bestSources.ts.
import type { CardSource } from './engine/best';

export const cards = import.meta.glob<CardSource>('../content/engine/best/stream/*.md', { query: '?fm', import: 'default', eager: true });
