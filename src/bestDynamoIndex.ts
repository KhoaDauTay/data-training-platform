// v26 BP-DY (L383): list fields of the 32 DynamoDB cards (budget `bpindexDy`), fetched beside src/bestSources.ts like the
// MongoDB index (src/ui/engine.ts merges the `meta` maps).
import type { CardSource } from './engine/best';

export const meta = import.meta.glob<CardSource>('../content/engine/best/dynamodb/*.md', { query: '?fm&meta=id,engine,track,level,module,title,title_en,avoid,lint,skills', import: 'default', eager: true });
