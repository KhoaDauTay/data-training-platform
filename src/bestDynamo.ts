// v26 BP-DY (L383): the DynamoDB track's full cards (budget `bpdynamo`), lazy from src/bestSources.ts.
import type { CardSource } from './engine/best';

export const cards = import.meta.glob<CardSource>('../content/engine/best/dynamodb/*.md', { query: '?fm', import: 'default', eager: true });
