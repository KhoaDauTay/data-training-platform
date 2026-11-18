/**
 * v13 (product-design-v8 §2.1): Boon's guides in the General area, the pure part. Lazy-only (learnui chunk, through
 * src/ui/guide.ts): no value import from main modules (Plan 6 U3); the caller reads and writes the pref.
 */

/** Device pref, never in Save or Export (like cargo-query/tour). */
export const GUIDES_KEY = 'cargo-query/guides';
export const GUIDES_MAX = 64;
const GUIDE_ID = /^[a-z0-9:-]+$/;
export interface GuidesPref { seen: string[]; off: boolean }

/** Stored data is user-editable: a non-object is "no pref"; bad ids and duplicates are dropped, only `true` turns guides off. */
export function parseGuides(v: unknown): GuidesPref | undefined {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;
  const o = v as Record<string, unknown>;
  const ids = Array.isArray(o.seen) ? o.seen.filter((s): s is string => typeof s === 'string' && GUIDE_ID.test(s)) : [];
  return { seen: [...new Set(ids)].slice(-GUIDES_MAX), off: o.off === true };
}

/** The pref after guide `id` was finished, skipped or closed: `id` moves to the end, the oldest fall off past 64. */
export const withSeen = (p: GuidesPref | undefined, id: string): GuidesPref =>
  ({ seen: [...(p?.seen ?? []).filter((s) => s !== id), id].slice(-GUIDES_MAX), off: p?.off ?? false });

export interface GuideCtx {
  /** Guides the open page or block offers, first = most important (empty outside the General area). */
  offered: readonly string[];
  /** The welcome screen's "I already know SQL" (D-G1: no guide shows by itself; "Boon chỉ mình" still does). */
  knows: boolean;
  /** A tour mark is up: never two Boon marks at once (v8 §2.2). */
  tour: boolean;
}
/** The guide to show by itself now, at most one. `coach-done` (tour skipped) does not matter here (D-G2). */
export function guideFor(ctx: GuideCtx, pref: GuidesPref | undefined): string | undefined {
  if (ctx.tour || ctx.knows || pref?.off) return undefined;
  return ctx.offered.find((id) => !pref?.seen.includes(id));
}

/** Where a guide slot sits, in the words of boonRegion()'s callers (brief.ts, work.ts, lessonCard.ts): one Boon per region. */
export type GuideRegion = 'brief' | 'work' | 'dialog' | 'page';
export const guideRegion = (slot: string): GuideRegion =>
  slot === 'drill-brief' ? 'brief' : slot === 'work' || slot === 'diff' ? 'work' : slot.startsWith('lesson-') ? 'dialog' : 'page';
