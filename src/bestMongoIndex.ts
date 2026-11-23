// v25 BP-MG (L374): list fields of the 38 MongoDB cards (budget `bpindexMg`). Its own chunk, fetched beside src/bestSources.ts
// (src/ui/engine.ts merges the two `meta` maps), because the SQL + PostgreSQL index alone sits near its 14 KB budget.
import type { CardSource } from './engine/best';

export const meta = import.meta.glob<CardSource>('../content/engine/best/mongodb/*.md', { query: '?fm&meta=id,engine,track,level,module,title,title_en,avoid,lint,skills', import: 'default', eager: true });
