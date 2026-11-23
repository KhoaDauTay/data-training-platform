import type { EngineId, Level } from './content';

/**
 * v27 (L410): the Database Engine glossary (content/engine/glossary.yml), pure: parsing, search, and the first-mention marker
 * the lesson viewer uses (one button per term, the first time the lesson's prose names it). No DOM, no text of its own.
 */
export interface Term {
  id: string; term: string; engines: EngineId[]; level: Level; keepEn: boolean; viTerm: string;
  match?: string[]; avoid: string; vi: string; en: string; doc: string;
}

/** A term's id: its `term` without diacritics, lower case, runs of anything else as one `-` (every id in the YAML is this). */
export const termSlug = (s: string): string => fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
/** Search form: no diacritics (đ → d), lower case. */
export const fold = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();

const ENG = new Set<string>(['postgres', 'mongodb', 'dynamodb']);
const str = (x: unknown, what: string): string => {
  if (typeof x !== 'string' || !x.trim()) throw new Error(`glossary: ${what}`);
  return x;
};
/** The YAML as terms; throws on a broken entry (the page shows its load failure, the lesson draws without buttons). */
export function parseGlossary(raw: unknown): Term[] {
  if (!Array.isArray(raw)) throw new Error('glossary: not a list');
  return raw.map((x: Record<string, unknown>, i) => {
    const id = str(x?.id, `#${i} id`);
    const engines = x.engines;
    if (!Array.isArray(engines) || !engines.length || !engines.every((e) => ENG.has(e))) throw new Error(`glossary: ${id} engines`);
    if (!/^L[1-5]$/.test(String(x.level))) throw new Error(`glossary: ${id} level`);
    const match = x.match === undefined ? undefined : x.match;
    if (match !== undefined && (!Array.isArray(match) || !match.every((m) => typeof m === 'string' && m))) throw new Error(`glossary: ${id} match`);
    return {
      id, term: str(x.term, `${id} term`), engines: engines as EngineId[], level: x.level as Level, keepEn: x.keep_en === true,
      viTerm: str(x.vi_term, `${id} vi_term`), ...(match ? { match: match as string[] } : {}), avoid: typeof x.avoid === 'string' ? x.avoid : '',
      vi: str(x.vi, `${id} vi`), en: str(x.en, `${id} en`), doc: str(x.doc, `${id} doc`),
    };
  });
}

/**
 * The words that name a term in a lesson: its `match` list, else `term` and `vi_term` without a trailing "(…)" note,
 * split on " / " ("simple / composite primary key" → both halves), backticks dropped.
 */
export function aliasesOf(t: Term): string[] {
  if (t.match) return t.match;
  const base = (s: string): string[] => s.replace(/`/g, '').replace(/\s*\([^)]*\)\s*$/, '').split(' / ').map((x) => x.trim()).filter(Boolean);
  return [...new Set([...base(t.term), ...base(t.viTerm)])];
}

/** Search: every word of `q` in the term, its VI word or its aliases (no diacritics, any case); filters by engine and level. */
export function searchTerms(all: readonly Term[], q: string, engines: ReadonlySet<EngineId>, levels: ReadonlySet<Level>): Term[] {
  const words = fold(q).split(/\s+/).filter(Boolean);
  return all.filter((t) => t.engines.some((e) => engines.has(e)) && levels.has(t.level)
    && words.every((w) => fold([t.term, t.viTerm, ...(t.match ?? [])].join(' ')).includes(w)));
}

const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const edge = (a: string): string => `(?<![\\p{L}\\p{N}_$])${esc(a)}(?![\\p{L}\\p{N}_])`;
/** A piece of marked text: plain, or the words that name `term` (`button` = draw it as the term's button). */
export type Piece = string | { term: Term; text: string; button: boolean };
export interface Marker {
  /** Splits one plain-text run (never a code span: the caller keeps those apart). */
  mark(text: string): Piece[];
  /** Every term the lesson named so far, any level, in order of first mention (the "Terms in this lesson" list). */
  seen: Term[];
}
/** Buttons per lesson (design-v27 §4.3: ≤ 15). */
export const MAX_BUTTONS = 15;

/**
 * One marker per lesson draw: terms of the lesson's engine. Only the first mention of a term whose level is at or above the
 * lesson's becomes a button (lower ones count as learned: design-v27 Q2); later mentions stay text; at most `max` buttons.
 * An alias with a capital letter matches its exact case ("Scan", "GIN"); an all-lower-case one any case.
 */
export function marker(all: readonly Term[], engine: EngineId, level: Level, max = MAX_BUTTONS): Marker {
  const terms = all.filter((t) => t.engines.includes(engine));
  const byAlias = new Map<string, Term>();
  for (const t of terms) for (const a of aliasesOf(t)) {
    const k = /[A-Z]/.test(a) ? a : a.toLowerCase();
    if (!byAlias.has(k)) byAlias.set(k, t);
  }
  const keys = [...byAlias.keys()].sort((a, b) => b.length - a.length);
  const exact = keys.filter((k) => /[A-Z]/.test(k));
  const loose = keys.filter((k) => !/[A-Z]/.test(k));
  const res = [exact.length ? new RegExp(exact.map(edge).join('|'), 'gu') : null, loose.length ? new RegExp(loose.map(edge).join('|'), 'giu') : null]
    .filter((r): r is RegExp => !!r);
  const seen: Term[] = [];
  const marked = new Set<string>();
  let buttons = 0;
  return {
    seen,
    mark(text: string): Piece[] {
      const hits: { at: number; end: number; term: Term }[] = [];
      for (const re of res) for (const m of text.matchAll(re)) {
        const term = byAlias.get(re.flags.includes('i') ? m[0].toLowerCase() : m[0]);
        if (term) hits.push({ at: m.index, end: m.index + m[0].length, term });
      }
      hits.sort((a, b) => a.at - b.at || b.end - a.end);
      const out: Piece[] = [];
      let pos = 0;
      let used = 0; // end of the last match taken, button or not: a shorter term inside a longer one is not a mention
      for (const x of hits) {
        if (x.at < used) continue;
        used = x.end;
        const t = x.term;
        if (!seen.includes(t)) seen.push(t);
        const button = !marked.has(t.id) && t.level >= level && buttons < max;
        if (!button) continue;
        marked.add(t.id);
        buttons++;
        if (x.at > pos) out.push(text.slice(pos, x.at));
        out.push({ term: t, text: text.slice(x.at, x.end), button });
        pos = x.end;
      }
      if (pos < text.length) out.push(text.slice(pos));
      return out;
    },
  };
}
