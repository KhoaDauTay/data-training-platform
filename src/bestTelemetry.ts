// v48 BP-C (L1152): the telemetry track's full cards (budget `bptelemetry`), lazy from src/bestSources.ts.
import type { CardSource } from './engine/best';

export const cards = import.meta.glob<CardSource>('../content/engine/best/telemetry/*.md', { query: '?fm', import: 'default', eager: true });
