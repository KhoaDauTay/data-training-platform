// BP-T (v24): the PostgreSQL track's full cards (budget `bppg`), lazy from src/bestSources.ts.
import type { CardSource } from './engine/best';

export const cards = import.meta.glob<CardSource>('../content/engine/best/postgres/*.md', { query: '?fm', import: 'default', eager: true });
