// v48 BP-C (L1152): the redis track's full cards (budget `bpredis`), lazy from src/bestSources.ts.
import type { CardSource } from './engine/best';

export const cards = import.meta.glob<CardSource>('../content/engine/best/redis/*.md', { query: '?fm', import: 'default', eager: true });
