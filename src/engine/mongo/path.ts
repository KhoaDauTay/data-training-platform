// Integration (L247): the MongoDB path ("Lộ trình NoSQL", content/engine/mongodb/path/): its shapes and the two rule
// graders the path uses besides result comparison (Equality → Sort → Range for a createIndex, covered queries).
// Pure: the shell parser only, no mingo; the UI chunk and tests/mongoPath.test.ts import it.
import { parseShell } from './parse';
import type { MongoDoc } from './types';

export interface Bi { vi: string; en: string }
export interface PathSkill { id: string; part: number; label: Bi; syntax?: string; when?: Bi; trap?: Bi }
export interface PathDrill {
  id: string; skill: string; kind: string; task: Bi; hint: Bi; solution?: string; starter?: string; ordered?: boolean;
  /** `choice`: read `shown` and pick an option. */
  format?: 'choice'; shown?: string; options?: Bi[]; answer?: number; why?: Bi;
  /** `esr`: the answer is a createIndex judged on `query`; `covered`: rows (with `_id`) + the covered rule on `index`. */
  grade?: 'esr' | 'covered'; query?: string; index?: string;
  wrong?: ({ query?: string; option?: number } & Bi)[];
}
export interface PathLesson {
  id: string; concept?: Bi; example?: string; explain?: Bi; mistake?: { query?: string } & Partial<Bi>;
  try?: Partial<PathDrill> & { task: Bi };
}
export interface PathManifest { dataset: string; files: { parts: [number, number]; skills: string; lessons: string; drills: string }[]; parts: { n: number; title: Bi }[] }
export interface PathContent { manifest: PathManifest; skills: PathSkill[]; lessons: PathLesson[]; drills: PathDrill[] }

/** `content/engine/mongodb/path/*.yml` (already parsed) by file name → one path, in manifest order. */
export function pathContent(files: Record<string, unknown>): PathContent {
  const get = (f: string): unknown => {
    if (!Object.hasOwn(files, f)) throw new Error(`index.yml names an unknown file: ${f}`);
    return files[f];
  };
  const manifest = get('index.yml') as PathManifest;
  return {
    manifest,
    skills: manifest.files.flatMap((f) => get(f.skills) as PathSkill[]),
    lessons: manifest.files.flatMap((f) => get(f.lessons) as PathLesson[]),
    drills: manifest.files.flatMap((f) => get(f.drills) as PathDrill[]),
  };
}

const isObj = (v: unknown): v is MongoDoc => !!v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) && !(v instanceof RegExp);

/** Equality → Sort → Range order of a find's filter and sort (equality: plain value or $eq). */
export function esrOrder(query: string): { e: string[]; s: string[]; r: string[] } {
  const c = parseShell(query);
  const filter = (c.method.args[0] ?? {}) as MongoDoc;
  const sort = (c.chain.find((x) => x.name === 'sort')?.args[0] ?? {}) as MongoDoc;
  const e: string[] = [];
  const r: string[] = [];
  for (const [k, v] of Object.entries(filter)) {
    const ops = isObj(v) ? Object.keys(v) : [];
    (ops.some((o) => o.startsWith('$') && o !== '$eq') ? r : e).push(k);
  }
  return { e, s: Object.keys(sort), r: r.filter((k) => !Object.hasOwn(sort, k)) };
}
const indexKeys = (src: string): string[] => Object.keys(parseShell(src).method.args[0] as MongoDoc);
/** The createIndex's keys are the query's equality fields, then its sort fields, then its range fields (any order inside a group). */
export function followsEsr(query: string, createIndex: string): boolean {
  const { e, s, r } = esrOrder(query);
  let keys: string[];
  try {
    const c = parseShell(createIndex);
    if (c.method.name !== 'createIndex') return false;
    keys = indexKeys(createIndex);
  } catch {
    return false;
  }
  let i = 0;
  for (const group of [e, s, r]) {
    const part = keys.slice(i, i + group.length);
    if (part.length !== group.length || !group.every((k) => part.includes(k))) return false;
    i += group.length;
  }
  return i === keys.length;
}

/** A find that an index on `index` (`{ a: 1, b: 1 }`) covers: filter and returned fields all in the index, `_id` dropped unless indexed. */
export function isCovered(find: string, index: string): boolean {
  const c = parseShell(find);
  if (c.method.name !== 'find') return false;
  const idx = indexKeys(`db.x.createIndex(${index})`);
  const filter = (c.method.args[0] ?? {}) as MongoDoc;
  const proj = c.method.args[1];
  if (!isObj(proj)) return false; // no projection: whole documents
  if (Object.keys(filter).some((k) => !idx.includes(k))) return false;
  if (proj._id !== 0 && !idx.includes('_id')) return false;
  const kept = Object.entries(proj).filter(([, v]) => v !== 0 && v !== false).map(([k]) => k);
  return kept.length > 0 && kept.every((k) => idx.includes(k));
}
