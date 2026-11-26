import { bilingualOf, type Bilingual } from './progress';
import { localStore, readJson, writeJson, type KV } from './storage';
import type { SchemaId } from './domains';
import type { FigRef } from './engine/viz/figure';

/**
 * "Bài học nhanh" (product-design-v4 §C, L54): one card per skill, shown before the first task that grants it.
 * Lives in content/lessons.yml, its own lazy chunk (src/lessonSources.ts, read by src/content.ts loadLessons()), never in the main bundle.
 */
export interface Lesson {
  /** Skill id (content/skills.yml). */
  id: string;
  /** Business phrases that signal the skill in a request; "…" marks a gap. */
  cues: { vi: string[]; en: string[] };
  concept: Bilingual;
  /** Runs on the neutral `lab` schema (L82/L84), like the drills; tests/lessons.test.ts checks it there. */
  example: string;
  /** ①②… notes on the example, with `code spans`. */
  explain: Bilingual;
  /** A common mistake: it errors, or gives a result other than the example's. */
  mistake: { sql: string; why: Bilingual };
  /** "Thử ngay": graded by compareResults against `solution` on `lab`, 0 XP; the box previews its tables and expected result (L84). */
  try: { task: Bilingual; starter: string; solution: string; ordered: boolean };
  /** PostgreSQL docs page. */
  docs: string;
  /** Set on an advanced node's lesson (content/general/adv.yml): it runs on `lab` (Plan 8a D8a-8). */
  node?: string;
  /** v46 (L860): one figure (a content/figures spec, usually the matching full lesson's), drawn at the end of the concept part. */
  figure?: FigRef;
}

/** v46 (L860): `figure: { name, variant?, step? }`; `at` is always the concept part. Type-only import: the builder stays lazy. */
export function parseLessonFigure(v: unknown, fail: (what: string) => never): FigRef | undefined {
  if (v === undefined) return undefined;
  const f = (v && typeof v === 'object' && !Array.isArray(v) ? v : fail('figure cần { name, variant?, step? }')) as Record<string, unknown>;
  const name = typeof f.name === 'string' && /^[a-z0-9-]+$/.test(f.name) ? f.name : fail('figure.name phải là [a-z0-9-]+');
  if (f.variant !== undefined && typeof f.variant !== 'string') fail('figure.variant phải là chuỗi');
  if (f.step !== undefined && !(Number.isInteger(f.step) && (f.step as number) >= 0)) fail('figure.step phải là số nguyên ≥ 0');
  return { name, at: 'concept', ...(typeof f.variant === 'string' ? { variant: f.variant } : {}), ...(typeof f.step === 'number' ? { step: f.step } : {}) };
}

/** Every lesson runs on `lab` (L84): skill lessons and advanced-node lessons alike, never on a domain's tables. */
export const lessonSchema = (_l: Lesson): SchemaId => 'lab';

const DOCS = 'https://www.postgresql.org/docs/';

/** The fields every lesson has (skill lessons add id and cues; advanced-node lessons in adv.yml, Plan 8a, have neither). */
export type LessonBody = Omit<Lesson, 'id' | 'cues' | 'node'>;

/** Checks and reads a lesson's body; `fail` throws with the caller's location. */
export function parseLessonBody(o: Record<string, unknown>, fail: (what: string) => never): LessonBody {
  const sql = (v: unknown, what: string): string => (typeof v === 'string' && v.trim() ? v.trim() : fail(`thiếu ${what}`));
  const both = (v: unknown, what: string): Bilingual => bilingualOf(v) ?? fail(`${what} cần { vi, en }`);
  const mistake = (o.mistake ?? {}) as Record<string, unknown>;
  const tr = (o.try ?? {}) as Record<string, unknown>;
  const docs = typeof o.docs === 'string' && o.docs.startsWith(DOCS) ? o.docs : fail(`docs phải là một trang ${DOCS}`);
  return {
    concept: both(o.concept, 'concept'),
    example: sql(o.example, 'example'),
    explain: both(o.explain, 'explain'),
    mistake: { sql: sql(mistake.sql, 'mistake.sql'), why: both(mistake, 'mistake') },
    try: { task: both(tr.task, 'try.task'), starter: sql(tr.starter, 'try.starter'), solution: sql(tr.solution, 'try.solution'), ordered: tr.ordered === true },
    docs,
  };
}

/** Throws on a broken entry, like parseSkills: the content tests load the real file. */
export function parseLessons(data: unknown, origin = 'lessons.yml'): Lesson[] {
  if (!Array.isArray(data)) throw new Error(`${origin}: cần một danh sách`);
  const seen = new Set<string>();
  return data.map((raw, i) => {
    const o = (raw ?? {}) as Record<string, unknown>;
    const fail = (what: string): never => {
      throw new Error(`${origin}: mục ${i} (${String(o.id)}) ${what}`);
    };
    const id = typeof o.id === 'string' && o.id ? o.id : fail('thiếu id');
    if (seen.has(id)) fail('trùng id');
    seen.add(id);
    const cues = (o.cues ?? {}) as Record<string, unknown>;
    const list = (v: unknown) => (Array.isArray(v) && v.every((x) => typeof x === 'string' && x.trim()) ? (v as string[]) : fail('cues cần { vi: [...], en: [...] }'));
    // Same order as before the split: cues are checked before the body.
    const parsedCues = { vi: list(cues.vi), en: list(cues.en) };
    const figure = parseLessonFigure(o.figure, fail);
    return { id, cues: parsedCues, ...parseLessonBody(o, fail), ...(figure ? { figure } : {}) };
  });
}

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The cue's parts between "…" appear in order inside one sentence of `text` (case-insensitive). */
export function cueIn(cue: string, text: string): boolean {
  const parts = cue.split('…').map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 && new RegExp(parts.map(escape).join('[^.!?\\n]*?'), 'iu').test(text);
}

/** Device preference (product-design-v4 §F.3, D-F1): lessons the player closed ("Đã hiểu") or passed "Thử ngay". Not progress. */
export const LESSONS_KEY = 'cargo-query/lessons';
export interface LessonPrefs { seen: string[]; tried: string[] }

const ids = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/** Anything unreadable becomes empty lists: the cards just open again, nothing else is lost. */
export function loadLessonPrefs(storage: KV | undefined = localStore()): LessonPrefs {
  const o = readJson<unknown>(LESSONS_KEY, storage);
  const p = o && typeof o === 'object' && !Array.isArray(o) ? (o as Record<string, unknown>) : {};
  return { seen: ids(p.seen), tried: ids(p.tried) };
}

/** Adds `id` to `seen` (and to `tried` when `tried`); a failed write is ignored (the lesson card also remembers it for the session). */
export function markLesson(id: string, tried = false, storage: KV | undefined = localStore()): LessonPrefs {
  const p = loadLessonPrefs(storage);
  const add = (xs: string[]) => (xs.includes(id) ? xs : [...xs, id]);
  const next = { seen: add(p.seen), tried: tried ? add(p.tried) : p.tried };
  writeJson(LESSONS_KEY, next, storage);
  return next;
}
