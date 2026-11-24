import type { EngineLesson, LabStep } from '../engine/content';
import type { LabOutput } from '../engine/labs';
import { nosqlText, type NosqlKey } from '../i18n/engineNosql';
import type { EngineDeps } from './engineView';

/**
 * v25 (MongoDB đủ, L370–L373): the NoSQL parts of a lab, a lazy chunk (`engineNosql`, its own budget) loaded by engineView
 * before a MongoDB or DynamoDB lab is drawn. Like every engine chunk it imports only types from main modules and gets main
 * values through EngineDeps.
 * - `tablesPanel`: the collections or tables in `lab.setup`, each with its first document or item (moved from engineView).
 * - `stepTop`: a MongoDB step's rule bar ("Chấm theo quy tắc", route R5) or its "mong lỗi" note.
 * - `stepEnd`: under a run, "Pipeline từng bước" (each prefix's document count, computed on mingo by the runner: LabMeta
 *   `pipeline`) and "So với SQL" (the SQL clause each stage plays, the traps where it differs, and the step's `sql:` once
 *   the step has passed, so the pipeline is never given away; shown, never run).
 */
let d: EngineDeps;
const nt = (k: NosqlKey, p?: Record<string, string | number>): string => nosqlText(d.getLang(), d.locale(), k, p);
/** Inline `code` spans of a sentence (the chunk's own text only, never content). */
const inline = (s: string): (Node | string)[] => s.split(/`([^`]+)`/).map((x, i) => (i % 2 ? d.h('code', {}, x) : x));

const box = (name: string, line: string, body: Node): HTMLElement =>
  d.h('details', { class: 'rounded-(--r-inset) bg-canvas px-2 py-1 ring-1 ring-line' },
    d.h('summary', { class: 'cursor-pointer text-body-sm' }, d.h('code', {}, name), ` · ${line}`), body);
const json = (x: unknown): HTMLElement => d.h('pre', { tabindex: '0', class: 'sql my-1 overflow-x-auto', lang: 'en' }, JSON.stringify(x, null, 2));

export function tablesPanel(deps: EngineDeps, l: EngineLesson): HTMLElement | null {
  d = deps;
  const { h } = d;
  let j: { collections?: Record<string, unknown[]>; tables?: { TableName?: string; KeySchema?: { AttributeName: string; KeyType: string }[] }[]; items?: Record<string, unknown[]> };
  try {
    j = JSON.parse(l.lab?.setup ?? '') as typeof j;
  } catch {
    return null; // no inline data (the shared shop dataset) or not JSON: nothing to list
  }
  const boxes = j.collections
    ? Object.entries(j.collections).map(([n, docs]) => box(n, nt('tables.docs', { n: docs.length }),
      h('div', {}, h('p', { class: 'my-1 text-body-sm text-muted' }, nt('tables.sampleDoc')), json(docs[0]))))
    : (j.tables ?? []).map((x) => {
      const n = x.TableName ?? '?';
      const items = j.items?.[n] ?? [];
      return box(n, nt('tables.items', { n: items.length }), h('div', {},
        h('p', { class: 'my-1 text-body-sm text-muted' }, nt('tables.keys', { keys: (x.KeySchema ?? []).map((k) => `${k.AttributeName} (${k.KeyType})`).join(', ') })),
        items[0] ? h('p', { class: 'my-1 text-body-sm text-muted' }, nt('tables.sampleItem')) : null, items[0] ? json(items[0]) : null));
    });
  return boxes.length ? h('div', { class: 'flex flex-col gap-1.5' }, h('h3', { class: 'm-0 text-body-sm font-bold' }, nt(l.engine === 'mongodb' ? 'tables.colls' : 'tables.dynamo')), ...boxes) : null;
}

/** Above the editor: what grades this step besides its result (route R5's rule bar, or an expected error). */
export function stepTop(deps: EngineDeps, s: LabStep): HTMLElement | null {
  d = deps;
  const { h, cls } = d;
  // v26: a DynamoDB step's `perf` is the measured cost bar (route R5); its `error` names an exception (`…Exception`).
  const cost = !s.rule && !!s.perf;
  if (!s.rule && !s.error && !cost) return null;
  return h('p', { class: 'm-0 flex flex-wrap items-center gap-2 text-body-sm', 'data-rule': s.rule ?? (cost ? 'cost' : 'error') },
    h('span', { class: cls.cx(cls.PILL, 'bg-sun text-sun-ink font-bold') }, ...inline(s.rule ? nt(`rule.${s.rule}`) : cost ? nt('rule.cost')
      : nt(/Exception$/.test(s.error!) ? 'error.noteDy' : 'error.note', { code: s.error! }))),
    s.rule || cost ? h('span', { class: 'text-muted' }, ...inline(nt(cost ? 'rule.costNote' : 'rule.note'))) : null);
}

/** v26 (L380): the "Partition / Chi phí" panel lives in its own lazy chunk (engineDynamo), fetched on the first DynamoDB run. */
let dy: typeof import('./engineDynamo') | 'loading' | 'failed' | undefined;

/** The SQL clause a stage plays: `$match` after a `$group` is HAVING (position decides the meaning, research §4.1). */
const SQL_OF: Record<string, string> = {
  $match: 'WHERE', $project: 'SELECT', $set: 'SELECT …, expr', $addFields: 'SELECT …, expr', $unset: 'SELECT', $group: 'GROUP BY',
  $sort: 'ORDER BY', $limit: 'LIMIT', $skip: 'OFFSET', $lookup: 'LEFT JOIN', $unwind: 'JOIN / unnest', $count: 'COUNT(*)',
  $sortByCount: 'GROUP BY … ORDER BY count DESC', $unionWith: 'UNION ALL', $setWindowFields: 'OVER (…)', $bucket: 'CASE … GROUP BY',
  $facet: '—', $out: 'CREATE TABLE … AS', $merge: 'MERGE',
};
const sqlOf = (stage: string, k: number, stages: string[]): string =>
  stage === '$match' && stages.slice(0, k).includes('$group') ? 'HAVING' : SQL_OF[stage] ?? '—';
const TRAPS = ['$match', '$group', '$count', '$lookup', '$unwind', '$sort', '$limit', '$project'] as const;

/** Under a run of a MongoDB step: the pipeline by stage and the comparison with SQL. Nothing for a run with no pipeline and no `sql`. */
export function stepEnd(deps: EngineDeps, s: LabStep, r: LabOutput | undefined, passed: boolean, key: string): HTMLElement | null {
  d = deps;
  const { h } = d;
  if (r?.meta?.dynamo) {
    if (dy === undefined) {
      dy = 'loading';
      import('./engineDynamo').then((m) => { dy = m; }, () => { dy = 'failed'; }).finally(() => d.rerender());
    }
    return typeof dy === 'object' ? dy.costPanel(d, r, key) : null; // the panel is extra: a failed chunk only leaves it out
  }
  const pipe = r?.meta?.pipeline;
  if (!pipe?.length && !s.sql) return null;
  const names = (pipe ?? []).map((x) => x.stage);
  const traps = TRAPS.filter((t) => names.includes(t));
  const th = (k: NosqlKey): HTMLElement => h('th', { scope: 'col', class: 'px-2 py-1 text-left' }, nt(k));
  return h('div', { class: 'flex flex-col gap-3', 'data-nosql': key },
    pipe?.length ? h('section', { class: 'flex flex-col gap-2', 'aria-labelledby': `${key}-pipe`, 'data-pipeline': '' },
      h('h4', { id: `${key}-pipe`, class: 'm-0 text-body-sm font-bold' }, nt('pipe.title')),
      h('p', { class: 'm-0 text-caption text-muted' }, nt('pipe.sub')),
      h('div', { class: 'overflow-x-auto', tabindex: '0' }, h('table', { class: 'text-body-sm' },
        h('thead', {}, h('tr', {}, h('th', { scope: 'col', class: 'px-2 py-1 text-left' }, '#'), th('pipe.stage'), th('pipe.sql'), th('pipe.n'))),
        h('tbody', {}, ...pipe.map((x, k) => h('tr', {},
          h('td', { class: 'px-2 py-1 tabular-nums' }, String(k + 1)),
          h('td', { class: 'px-2 py-1', lang: 'en' }, h('code', {}, x.stage)),
          h('td', { class: 'px-2 py-1 font-mono', lang: 'en' }, sqlOf(x.stage, k, names)),
          h('td', { class: 'px-2 py-1 text-right font-bold tabular-nums' }, x.n.toLocaleString(d.locale()))))))),
      ...pipe.map((x, k) => (x.head.length ? h('details', {}, h('summary', { class: 'cursor-pointer text-caption' }, nt('pipe.head', { n: x.head.length, i: k + 1 })), json(x.head)) : null))) : null,
    traps.length || s.sql ? h('section', { class: 'flex flex-col gap-2 rounded-(--r-inset) bg-surface-2 p-3', 'aria-labelledby': `${key}-cmp`, 'data-compare': '' },
      h('h4', { id: `${key}-cmp`, class: 'm-0 text-body-sm font-bold' }, nt('cmp.title')),
      traps.length ? h('p', { class: 'm-0 text-caption font-bold text-muted' }, nt('cmp.traps')) : null,
      traps.length ? h('ul', { class: 'm-0 list-disc space-y-1 pl-5 text-body-sm' }, ...traps.map((t) => h('li', {}, ...inline(nt(`trap.${t}`))))) : null,
      s.sql ? (passed
        ? h('div', {}, h('p', { class: 'm-0 text-caption font-bold text-muted' }, nt('cmp.sql')), h('pre', { tabindex: '0', class: 'sql m-0 overflow-x-auto', lang: 'en', 'data-sql-compare': '' }, s.sql))
        : h('p', { class: 'm-0 text-caption text-muted' }, nt('cmp.after'))) : null) : null);
}
