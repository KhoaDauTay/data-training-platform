import { parse as parseYaml } from 'yaml';
import { parseLessonBody, type Lesson } from './lessons';
import { bilingualOf, type Bilingual } from './progress';
import { BLANK, type Ticket, type Wrong } from './tickets';

/**
 * General area (Plan 8a): drills per skill (content/general/sql.yml) and the advanced DA track (content/general/adv.yml).
 * Both run on the `lab` schema. Pure parsers; the YAML is a lazy chunk (src/generalSources.ts, loadGeneral()).
 */

/** Drill ids go into save.completed as they are (D8a-9); the prefix keeps them apart from ticket ids. */
export const DRILL_ID = /^g-[a-z0-9-]+$/;
export type DrillKind = 'faded' | 'open' | 'trap' | 'challenge';
const KINDS: DrillKind[] = ['faded', 'open', 'trap', 'challenge'];
export interface Drill {
  id: string;
  /** Skill id (sql.yml) or node id (adv.yml): exactly one is set. */
  skill?: string;
  node?: string;
  kind: DrillKind;
  task: Bilingual;
  starter?: string;
  solution: string;
  ordered: boolean;
  hint: Bilingual;
  wrong: Wrong[];
  plan?: { index: string };
}
export type NodeStatus = 'in' | 'partial' | 'external';
const STATUSES: NodeStatus[] = ['in', 'partial', 'external'];
const GROUPS = ['A', 'B', 'C', 'D'] as const;
export interface AdvNode {
  id: string;
  group: 'A' | 'B' | 'C' | 'D';
  status: NodeStatus;
  title: Bilingual;
  why: Bilingual;
  /** Skill ids or node ids. */
  needs: string[];
  applies?: Bilingual;
  /** Runs on `lab` (lesson.node is set). */
  lesson?: Lesson;
  drills: Drill[];
  links: { title: Bilingual; url: string }[];
}
export interface General { drills: Drill[]; nodes: AdvNode[]; bySkill: Map<string, Drill[]>; byId: Map<string, Drill> }

type Raw = Record<string, unknown>;
const list = (src: string, origin: string): Raw[] => {
  const data = parseYaml(src) as unknown;
  if (!Array.isArray(data)) throw new Error(`${origin}: cần một danh sách`);
  return data.map((x) => (x ?? {}) as Raw);
};

function parseDrill(o: Raw, origin: string, owner: { skill?: string; node?: string }): Drill {
  const fail = (what: string): never => {
    throw new Error(`${origin}: drill ${String(o.id)} ${what}`);
  };
  const id = typeof o.id === 'string' && DRILL_ID.test(o.id) ? o.id : fail(`id phải khớp ${DRILL_ID}`);
  const kind = KINDS.includes(o.kind as DrillKind) ? (o.kind as DrillKind) : fail(`kind lạ: ${String(o.kind)}`);
  const text = (v: unknown, what: string): string => (typeof v === 'string' && v.trim() ? v.trim() : fail(`thiếu ${what}`));
  const both = (v: unknown, what: string): Bilingual => bilingualOf(v) ?? fail(`${what} cần { vi, en }`);
  const starter = o.starter === undefined ? undefined : text(o.starter, 'starter');
  if (kind === 'faded' && !starter?.includes(BLANK)) fail(`faded cần starter có ${BLANK}`);
  const wrong = (Array.isArray(o.wrong) ? o.wrong : o.wrong === undefined ? [] : fail('wrong cần một danh sách')) as Raw[];
  if (kind === 'trap' && wrong.length === 0) fail('trap cần wrong');
  const plan = o.plan as Raw | undefined;
  return {
    id,
    ...owner,
    kind,
    task: both(o.task, 'task'),
    ...(starter !== undefined ? { starter } : {}),
    solution: text(o.solution, 'solution'),
    ordered: o.ordered === true,
    hint: both(o.hint, 'hint'),
    wrong: wrong.map((w) => ({ sql: text(w.sql, 'wrong.sql'), why: both(w, 'wrong') })),
    ...(plan ? { plan: { index: text(plan.index, 'plan.index') } } : {}),
  };
}

const unique = (drills: Drill[], origin: string): Drill[] => {
  const seen = new Set<string>();
  for (const d of drills) {
    if (seen.has(d.id)) throw new Error(`${origin}: trùng id ${d.id}`);
    seen.add(d.id);
  }
  return drills;
};

/** content/general/sql.yml: one drill per entry, `skill` required. */
export function parseDrills(src: string, origin: string): Drill[] {
  return unique(list(src, origin).map((o) => {
    if (typeof o.skill !== 'string' || !o.skill) throw new Error(`${origin}: drill ${String(o.id)} thiếu skill`);
    return parseDrill(o, origin, { skill: o.skill });
  }), origin);
}

/** content/general/adv.yml: nodes; `in|partial` need a lesson and a challenge, `external` needs links. */
export function parseAdv(src: string, origin: string): AdvNode[] {
  const seen = new Set<string>();
  const nodes = list(src, origin).map((o, i): AdvNode => {
    const fail = (what: string): never => {
      throw new Error(`${origin}: nút ${i} (${String(o.id)}) ${what}`);
    };
    const id = typeof o.id === 'string' && /^[a-z][a-z0-9]*$/.test(o.id) ? o.id : fail('thiếu id');
    if (seen.has(id)) fail('trùng id');
    seen.add(id);
    const both = (v: unknown, what: string): Bilingual => bilingualOf(v) ?? fail(`${what} cần { vi, en }`);
    const group = GROUPS.includes(o.group as AdvNode['group']) ? (o.group as AdvNode['group']) : fail(`group lạ: ${String(o.group)}`);
    const status = STATUSES.includes(o.status as NodeStatus) ? (o.status as NodeStatus) : fail(`status lạ: ${String(o.status)}`);
    const needs = Array.isArray(o.needs) && o.needs.every((x) => typeof x === 'string') ? (o.needs as string[]) : fail('needs cần một danh sách id');
    const links = (Array.isArray(o.links) ? o.links : []).map((l: Raw) => {
      const url = typeof l.url === 'string' && l.url.startsWith('https://') ? l.url : fail('link cần url https://');
      return { title: both(l.title, 'link.title'), url };
    });
    const drills = (Array.isArray(o.drills) ? o.drills : []).map((d: Raw) => parseDrill(d, origin, { node: id }));
    let lesson: Lesson | undefined;
    if (status !== 'external') {
      if (!o.lesson || typeof o.lesson !== 'object') fail('thiếu lesson');
      lesson = { id, cues: { vi: [], en: [] }, node: id, ...parseLessonBody(o.lesson as Raw, (what) => fail(`lesson: ${what}`)) };
      if (drills.filter((d) => d.kind === 'challenge').length !== 1) fail('cần đúng một drill challenge');
    } else if (links.length === 0) fail('external cần links');
    return {
      id, group, status, title: both(o.title, 'title'), why: both(o.why, 'why'), needs,
      ...(o.applies !== undefined ? { applies: both(o.applies, 'applies') } : {}),
      ...(lesson ? { lesson } : {}),
      drills, links,
    };
  });
  unique(nodes.flatMap((n) => n.drills), origin);
  return nodes;
}

/** Both files, indexed; a drill id used in both files throws. */
export function buildGeneral(sqlSrc: string, advSrc: string): General {
  const skillDrills = parseDrills(sqlSrc, 'general/sql.yml');
  const nodes = parseAdv(advSrc, 'general/adv.yml');
  const drills = unique([...skillDrills, ...nodes.flatMap((n) => n.drills)], 'general/sql.yml + adv.yml');
  const bySkill = new Map<string, Drill[]>();
  for (const d of skillDrills) bySkill.set(d.skill!, [...(bySkill.get(d.skill!) ?? []), d]);
  return { drills, nodes, bySkill, byId: new Map(drills.map((d) => [d.id, d])) };
}

/**
 * A drill as a Ticket, so work.ts, the grader, wrongTipper and the ___ guard handle it like a real task (D8a-5).
 * chapter 0, no tables (drills run on `lab`), no sender, one step.
 */
export function drillTicket(d: Drill): Ticket {
  return {
    id: d.id,
    chapter: 0,
    title: '',
    from: { name: '', dept: '' },
    difficulty: 1,
    beat: 'develop',
    requires: d.skill ? [d.skill] : [],
    grants: [],
    tables: [],
    ordered: d.ordered,
    body: '',
    task: d.task.vi,
    hints: [d.hint.vi],
    steps: [{ title: '', prompt: '', solution: d.solution, ...(d.plan ? { plan: d.plan } : {}) }],
    ...(d.starter !== undefined ? { starter: d.starter } : {}),
    format: d.kind === 'faded' ? 'faded' : 'open',
    wrong: d.wrong,
    en: { title: '', body: '', task: d.task.en, hints: [d.hint.en], steps: [{ title: '', prompt: '' }] },
  };
}
