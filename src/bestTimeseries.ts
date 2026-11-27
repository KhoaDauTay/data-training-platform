// v48 BP-C (L1152): the timeseries track's full cards (budget `bptimeseries`), lazy from src/bestSources.ts.
import type { CardSource } from './engine/best';

export const cards = import.meta.glob<CardSource>('../content/engine/best/timeseries/*.md', { query: '?fm', import: 'default', eager: true });
