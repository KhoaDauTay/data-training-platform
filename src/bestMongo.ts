// v25 BP-MG (L374): the MongoDB track's full cards (budget `bpmongo`), lazy from src/bestSources.ts.
import type { CardSource } from './engine/best';

export const cards = import.meta.glob<CardSource>('../content/engine/best/mongodb/*.md', { query: '?fm', import: 'default', eager: true });
