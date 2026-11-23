// BP-T (v24, L345): the Best Practice index (budget `bpindex`): list fields of every released card (BP_META, frontmatter as JSON,
// scripts/contentJson.mjs), tracks.yml and the "8 habits" page. Each track's full cards are their own lazy chunk (bestSql →
// `bpsql`, bestPg → `bppg`), fetched when a card of that track opens. Only released folders are globbed (src/engine/best.ts
// RELEASED): v25 adds `mongodb` here, v26 `dynamodb`. src/ui/engine.ts imports this with import().
import type { CardSource, TrackId } from './engine/best';

export const meta = import.meta.glob<CardSource>('../content/engine/best/{sql,postgres}/*.md', { query: '?fm&meta=id,engine,track,level,module,title,title_en,avoid,lint,skills', import: 'default', eager: true });
export { default as tracks } from '../content/engine/best/tracks.yml';
export { default as habits } from '../content/engine/best/habits.yml';
export const full: Partial<Record<TrackId, () => Promise<{ cards: Record<string, CardSource> }>>> = {
  sql: () => import('./bestSql'),
  postgres: () => import('./bestPg'),
};
