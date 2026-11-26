/**
 * v45 R1 (L740–L759): a dbt-style compiler for the Data stack track (engine `stack`). Pure, no eval, no template engine: it
 * understands `{{ ref('m') }}`, `{{ source('s','t') }}`, `{{ config(materialized='…', unique_key='…') }}`, `{{ this }}` and
 * `{% if is_incremental() %} … {% endif %}`; anything else is a coded error with its line and column (the lab shows it like a
 * Postgres error: string `code`, `message`, 1-based `position`). Mapping: `ref('m')` → `<layer>.m` (the layer a lab step's
 * `model:` declares, or the setup's `CREATE VIEW|TABLE <layer>.m`), `source('s','t')` → `raw_s.t`. This is not dbt.
 */
export const LAYERS = ['staging', 'intermediate', 'marts'] as const;
export type Layer = (typeof LAYERS)[number];
export const MATERIALIZED = ['view', 'table', 'incremental'] as const;
export type Materialized = (typeof MATERIALIZED)[number];
export interface ModelSpec { name: string; layer: Layer; materialized?: Materialized }
export type DbtCode = 'jinja-unsupported' | 'ref-missing' | 'ref-cycle' | 'config-invalid' | 'this-outside-model';

export class DbtError extends Error {
  constructor(readonly code: DbtCode, message: string, readonly line = 1, readonly col = 1, readonly position?: number) {
    super(message);
    this.name = 'DbtError';
  }
}

const NAME = /^[a-z_][a-z0-9_]*$/;
const STR = `\\s*(?:'([a-z_][a-z0-9_]*)'|"([a-z_][a-z0-9_]*)")\\s*`;
const REF = new RegExp(`^ref\\(${STR}\\)$`);
const SOURCE = new RegExp(`^source\\(${STR},${STR}\\)$`);

interface Tag { kind: '{{' | '{%'; body: string; at: number; end: number }
/** Every `{{ }}` / `{% %}` tag in order; `{#` and an unclosed tag are errors. */
function tagsOf(src: string): Tag[] {
  const out: Tag[] = [];
  const re = /\{\{|\{%|\{#/g;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    if (m[0] === '{#') throw err(src, m.index, 'jinja-unsupported', 'comment {# #}');
    const close = m[0] === '{{' ? '}}' : '%}';
    const end = src.indexOf(close, m.index + 2);
    if (end === -1) throw err(src, m.index, 'jinja-unsupported', `unclosed ${m[0]}`);
    out.push({ kind: m[0] as Tag['kind'], body: src.slice(m.index + 2, end).replace(/^-|-$/g, '').trim(), at: m.index, end: end + 2 });
    re.lastIndex = end + 2;
  }
  return out;
}

function err(src: string, at: number, code: DbtCode, what: string): DbtError {
  const before = src.slice(0, at).split('\n');
  const line = before.length, col = before[before.length - 1].length + 1;
  return new DbtError(code, `${code} at ${line}:${col}: ${what}`, line, col, at + 1);
}

export interface Config { materialized?: Materialized; unique_key?: string }
function configOf(src: string, t: Tag): Config {
  const inner = /^config\((.*)\)$/s.exec(t.body)?.[1] ?? '';
  const out: Config = {};
  for (const part of inner.split(',').map((p) => p.trim()).filter(Boolean)) {
    const m = /^([a-z_]+)\s*=\s*(?:'([^']*)'|"([^"]*)")$/.exec(part);
    const [k, v] = m ? [m[1], m[2] ?? m[3]] : [];
    if (k === 'materialized' && (MATERIALIZED as readonly string[]).includes(v!)) out.materialized = v as Materialized;
    else if (k === 'unique_key' && NAME.test(v!)) out.unique_key = v;
    else throw err(src, t.at, 'config-invalid', part);
  }
  return out;
}

export interface Ctx {
  /** model name → layer, every model the step may ref (setup + earlier steps + this one). */
  models: Record<string, Layer>;
  /** the model this file builds (a model step); `this` and config need it. */
  self?: ModelSpec;
  /** the model already exists (an earlier step built it): `is_incremental()` is true for an incremental model. */
  exists?: boolean;
}
export interface Compiled { sql: string; refs: string[]; sources: [string, string][]; config: Config }

/** Jinja SELECT → plain SQL (the SELECT only). */
export function compile(src: string, ctx: Ctx): Compiled {
  const tags = tagsOf(src);
  const refs: string[] = [], sources: [string, string][] = [];
  let config: Config = {};
  // config first: it decides is_incremental()
  for (const t of tags) if (t.kind === '{{' && /^config\(/.test(t.body)) {
    if (!ctx.self) throw err(src, t.at, 'this-outside-model', 'config() outside a model');
    config = { ...config, ...configOf(src, t) };
  }
  const mat = config.materialized ?? ctx.self?.materialized ?? 'view';
  const incremental = mat === 'incremental' && !!ctx.exists;
  let sql = '', pos = 0, skip = false, open: Tag | undefined;
  for (const t of tags) {
    if (!skip) sql += src.slice(pos, t.at);
    pos = t.end;
    if (t.kind === '{%') {
      if (/^if\s+is_incremental\(\s*\)$/.test(t.body) && !open) { open = t; skip = !incremental; continue; }
      if (t.body === 'endif' && open) { open = undefined; skip = false; continue; }
      throw err(src, t.at, 'jinja-unsupported', `{% ${t.body} %}`);
    }
    if (skip) continue;
    const r = REF.exec(t.body), s = SOURCE.exec(t.body);
    if (r) {
      const name = r[1] ?? r[2];
      if (ctx.self && name === ctx.self.name) throw err(src, t.at, 'ref-cycle', `${name} refs itself (use {{ this }})`);
      const layer = ctx.models[name];
      if (!layer) throw err(src, t.at, 'ref-missing', `no model ${name}`);
      refs.push(name);
      sql += `${layer}.${name}`;
    } else if (s) {
      const [sn, tn] = [s[1] ?? s[2], s[3] ?? s[4]];
      sources.push([sn, tn]);
      sql += `raw_${sn}.${tn}`;
    } else if (t.body === 'this') {
      if (!ctx.self) throw err(src, t.at, 'this-outside-model', 'this outside a model');
      sql += `${ctx.self.layer}.${ctx.self.name}`;
    } else if (!/^config\(/.test(t.body)) throw err(src, t.at, 'jinja-unsupported', `{{ ${t.body} }}`);
  }
  if (open) throw err(src, open.at, 'jinja-unsupported', 'if without endif');
  sql += src.slice(pos);
  return { sql: sql.trim().replace(/;\s*$/, ''), refs, sources, config };
}

/** A model file → the statements that build it (view, table, or an incremental run: create, or insert with delete by key). */
export function buildModel(src: string, ctx: Ctx & { self: ModelSpec }): string[] {
  const c = compile(src, ctx);
  const rel = `${ctx.self.layer}.${ctx.self.name}`;
  const mat = c.config.materialized ?? ctx.self.materialized ?? 'view';
  const schema = `CREATE SCHEMA IF NOT EXISTS ${ctx.self.layer}`;
  if (mat === 'view') return [schema, `CREATE OR REPLACE VIEW ${rel} AS\n${c.sql}`];
  if (mat === 'table' || !ctx.exists) return [schema, ...(ctx.exists ? [`DROP TABLE IF EXISTS ${rel}`] : []), `CREATE TABLE ${rel} AS\n${c.sql}`];
  const key = c.config.unique_key;
  // ponytail: delete+insert by unique_key in one statement (dbt's Postgres adapter does it in two)
  return key
    ? [`WITH s AS (\n${c.sql}\n), d AS (DELETE FROM ${rel} t USING s WHERE t.${key} = s.${key})\nINSERT INTO ${rel} SELECT * FROM s`]
    : [`INSERT INTO ${rel}\n${c.sql}`];
}

/** Models a setup script created (`CREATE [OR REPLACE] VIEW|TABLE <layer>.<name>`), so steps may ref them. */
export function modelsOf(setup?: string): Record<string, Layer> {
  const out: Record<string, Layer> = {};
  for (const m of (setup ?? '').matchAll(/\bCREATE\s+(?:OR\s+REPLACE\s+)?(?:VIEW|TABLE)\s+(staging|intermediate|marts)\.([a-z_][a-z0-9_]*)/gi))
    out[m[2].toLowerCase()] = m[1].toLowerCase() as Layer;
  return out;
}

/** The refs of a model file (no resolution). */
export const refsOf = (src: string): string[] => tagsOf(src).flatMap((t) => { const r = REF.exec(t.body); return r ? [r[1] ?? r[2]] : []; });

/** Build order of a set of model files (refs first; ties keep the given order). A ref outside the set or a cycle is an error. */
export function dagOrder(files: Record<string, string>): string[] {
  const deps = new Map(Object.entries(files).map(([n, s]) => [n, refsOf(s)]));
  for (const [n, rs] of deps) for (const r of rs) if (!deps.has(r)) throw new DbtError('ref-missing', `ref-missing: ${n} → ${r}`);
  const out: string[] = [], state = new Map<string, 'busy' | 'done'>();
  const visit = (n: string, path: string[]): void => {
    if (state.get(n) === 'done') return;
    if (state.get(n) === 'busy') throw new DbtError('ref-cycle', `ref-cycle: ${[...path.slice(path.indexOf(n)), n].join(' → ')}`);
    state.set(n, 'busy');
    for (const r of deps.get(n)!) visit(r, [...path, n]);
    state.set(n, 'done');
    out.push(n);
  };
  for (const n of deps.keys()) visit(n, []);
  return out;
}

/** dbt's four generic tests, compiled the way dbt does: a query returning the failing rows (0 rows = pass). */
export type GenericTest =
  | { test: 'not_null' | 'unique'; model: string; column: string }
  | { test: 'accepted_values'; model: string; column: string; values: string[] }
  | { test: 'relationships'; model: string; column: string; to: string; field: string };
export function testSql(t: GenericTest, models: Record<string, Layer>): string {
  const rel = (m: string): string => {
    if (!NAME.test(m) || !models[m]) throw new DbtError('ref-missing', `ref-missing: ${m}`);
    return `${models[m]}.${m}`;
  };
  for (const c of [t.column, ...(t.test === 'relationships' ? [t.field] : [])]) if (!NAME.test(c)) throw new DbtError('config-invalid', `config-invalid: column ${c}`);
  const c = t.column;
  switch (t.test) {
    case 'not_null': return `SELECT * FROM ${rel(t.model)}\nWHERE ${c} IS NULL`;
    case 'unique': return `SELECT ${c}, count(*) AS n\nFROM ${rel(t.model)}\nWHERE ${c} IS NOT NULL\nGROUP BY ${c}\nHAVING count(*) > 1`;
    case 'accepted_values': return `SELECT ${c}, count(*) AS n\nFROM ${rel(t.model)}\nWHERE ${c} NOT IN (${t.values.map((v) => `'${v.replace(/'/g, "''")}'`).join(', ')})\nGROUP BY ${c}`;
    case 'relationships': return `SELECT c.${c}\nFROM ${rel(t.model)} c\nLEFT JOIN ${rel(t.to)} p ON p.${t.field} = c.${c}\nWHERE c.${c} IS NOT NULL\n  AND p.${t.field} IS NULL`;
  }
}

/** A lab whose Solutions use dbt (a `model:` step, or a ref/source): only then is anything compiled (`'{{1,2}}'` stays SQL elsewhere). */
interface StepLike { solution: string; model?: ModelSpec }
export const isDbtLab = (steps: readonly StepLike[]): boolean =>
  steps.some((s) => s.model || /\{\{\s*(ref|source)\s*\(/.test(s.solution));

/**
 * Step `i` of a dbt lab with `code` → the statements to run: a model step builds its model (it exists when the setup or an
 * earlier step built it, so an incremental model's second build takes the `is_incremental()` branch); any other step is
 * compiled as a plain statement (a singular test, a read of a mart).
 */
export function compileStep(setup: string | undefined, steps: readonly StepLike[], i: number, code: string): string[] {
  const models = modelsOf(setup);
  const exists = new Set(Object.keys(models));
  for (const s of steps.slice(0, i)) if (s.model) { models[s.model.name] = s.model.layer; exists.add(s.model.name); }
  const self = steps[i]?.model;
  if (!self) return [compile(code, { models }).sql];
  return buildModel(code, { models: { ...models, [self.name]: self.layer }, self, exists: exists.has(self.name) });
}
