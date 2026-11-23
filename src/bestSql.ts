// BP-T (v24): the SQL track's full cards (budget `bpsql`), lazy from src/bestSources.ts.
import type { CardSource } from './engine/best';

export const cards = import.meta.glob<CardSource>('../content/engine/best/sql/*.md', { query: '?fm', import: 'default', eager: true });
