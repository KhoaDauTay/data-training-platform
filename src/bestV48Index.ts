// v48 BP-C (L1152): list fields of the cards of the seven v47 tracks (Redis, time-series, OLAP, search, telemetry, streaming,
// graph; budget `bpindexV48`), fetched beside src/bestSources.ts like the MongoDB and DynamoDB indexes (src/ui/engine.ts merges
// the `meta` maps). Each track's full cards are their own chunk (src/best<Track>.ts), fetched when a card of that track opens.
import type { CardSource } from './engine/best';

export const meta = import.meta.glob<CardSource>('../content/engine/best/{redis,timeseries,olap,search,telemetry,stream,graph}/*.md', { query: '?fm&meta=id,engine,track,level,module,title,title_en,avoid,lint,skills', import: 'default', eager: true });