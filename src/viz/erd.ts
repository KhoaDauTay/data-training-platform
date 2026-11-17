import type { QueryResult } from '../db/run';

const IDENT = /^[a-z_][a-z0-9_]*$/;

/** runSandboxed takes no bind parameters, so the schema name is validated before it is inlined. */
function schemaLiteral(schema: string): string {
  if (!IDENT.test(schema)) throw new Error(`invalid schema name: ${schema}`);
  return `'${schema}'`;
}

export const erColumnsSql = (schema: string): string => `SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns WHERE table_schema = ${schemaLiteral(schema)}
ORDER BY table_name, ordinal_position`;

// ponytail: kcu/ccu pair on constraint name only, so a multi-column FK would cross-pair columns; the game schema has none.
export const erConstraintsSql = (schema: string): string => `SELECT tc.table_name, kcu.column_name, tc.constraint_type, ccu.table_name AS ref_table, ccu.column_name AS ref_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_type = 'FOREIGN KEY' AND ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = ${schemaLiteral(schema)} AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY')`;

export interface ErColumn { table: string; name: string; type: string; nullable: boolean }
export interface ErConstraint { table: string; column: string; kind: 'PRIMARY KEY' | 'UNIQUE' | 'FOREIGN KEY'; refTable: string | null; refColumn: string | null }
export interface ErMetadata { cols: ErColumn[]; cons: ErConstraint[] }

export const toErColumns = (r: QueryResult): ErColumn[] =>
  r.rows.map(([table, name, type, nullable]) => ({ table: String(table), name: String(name), type: String(type), nullable: nullable === 'YES' }));

export const toErConstraints = (r: QueryResult): ErConstraint[] =>
  r.rows.map(([table, column, kind, ref, refCol]) => ({
    table: String(table), column: String(column), kind: kind as ErConstraint['kind'],
    refTable: ref === null ? null : String(ref), refColumn: refCol === null || refCol === undefined ? null : String(refCol),
  }));

/** Exact row count per table in one statement (reltuples is unreliable: the seed only ANALYZEs a few tables). */
export function erRowCountsSql(tables: string[]): string {
  for (const t of tables) if (!IDENT.test(t)) throw new Error(`invalid table name: ${t}`);
  return tables.map((t) => `SELECT '${t}' AS t, count(*)::int AS n FROM ${t}`).join(' UNION ALL ');
}

/** Text column types whose values the Columns tab and the Data page list (product-design-v4 §C.4-4, D-C7). */
export const TEXT_TYPES = new Set(['text', 'character varying', 'character']);
/** A column with more distinct values than this shows none. */
export const VALUES_MAX = 20;

/** Distinct values of `columns` of one table in one statement, sorted, at most VALUES_MAX + 1 each (so "too many" is known). */
export function distinctValuesSql(table: string, columns: string[]): string {
  for (const x of [table, ...columns]) if (!IDENT.test(x)) throw new Error(`invalid name: ${x}`);
  return columns.map((c) => `SELECT '${c}' AS c, ARRAY(SELECT DISTINCT ${c} FROM ${table} WHERE ${c} IS NOT NULL ORDER BY 1 LIMIT ${VALUES_MAX + 1}) AS v`)
    .join(' UNION ALL ');
}

/** column → its values, only for columns with at most VALUES_MAX of them. */
export function toDistinctValues(r: QueryResult): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [c, v] of r.rows) if (Array.isArray(v) && v.length <= VALUES_MAX) out[String(c)] = v.map(String);
  return out;
}

export interface Related { tables: string[]; dropped: string[] }

/**
 * Tables to show for a task (ui-ux-v4 §4): the task's unlocked tables, the shortest bridges that connect them,
 * then every parent reached child → parent through FKs (any depth, self-references skipped). Never parent → child:
 * `shipments` alone has about twelve children. Over `max`, parents referenced by the fewest shown tables go first
 * (then by name); core and bridges are never cut.
 */
export function relatedTables(core: string[], unlocked: string[], cons: ErConstraint[], max = 10): Related {
  const u = new Set(unlocked);
  const fks = cons.filter((c) => c.kind === 'FOREIGN KEY' && c.refTable && c.refTable !== c.table && u.has(c.table) && u.has(c.refTable));
  const parentsOf = new Map<string, Set<string>>();
  const adj = new Map<string, Set<string>>();
  const add = (m: Map<string, Set<string>>, a: string, b: string) => void (m.get(a) ?? m.set(a, new Set()).get(a)!).add(b);
  for (const c of fks) {
    add(parentsOf, c.table, c.refTable!);
    add(adj, c.table, c.refTable!);
    add(adj, c.refTable!, c.table);
  }
  const near = (t: string): string[] => [...(adj.get(t) ?? [])].sort(); // sorted: the same bridge every time

  const base = [...new Set(core.filter((t) => u.has(t)))];
  const keep = new Set(base);
  const bridges: string[] = [];
  /** Component of `from` inside the tables kept so far. */
  const component = (from: string): Set<string> => {
    const seen = new Set([from]);
    for (const q = [from]; q.length;) for (const n of near(q.shift()!)) if (keep.has(n) && !seen.has(n)) { seen.add(n); q.push(n); }
    return seen;
  };
  for (const t of base.slice(1)) {
    const joined = component(base[0]);
    if (joined.has(t)) continue;
    // Shortest undirected path from t to the joined part, through any unlocked table.
    const prev = new Map<string, string>([[t, '']]);
    let hit = '';
    for (const q = [t]; q.length && !hit;) {
      const x = q.shift()!;
      for (const n of near(x)) {
        if (prev.has(n)) continue;
        prev.set(n, x);
        if (joined.has(n)) { hit = n; break; }
        q.push(n);
      }
    }
    for (let x = prev.get(hit); x && x !== t; x = prev.get(x)) if (!keep.has(x)) { keep.add(x); bridges.push(x); }
  }

  const parents = new Set<string>();
  for (const stack = [...keep]; stack.length;) {
    for (const p of parentsOf.get(stack.pop()!) ?? []) if (!keep.has(p) && !parents.has(p)) { parents.add(p); stack.push(p); }
  }
  const all = new Set([...keep, ...parents]);
  const refs = (p: string): number => [...all].filter((x) => parentsOf.get(x)?.has(p)).length;
  const order = [...parents].sort((a, b) => refs(a) - refs(b) || a.localeCompare(b)); // ranked once, on the uncut set
  const dropped = order.slice(0, Math.max(0, all.size - Math.max(max, keep.size)));
  const kept = [...parents].filter((p) => !dropped.includes(p)).sort();
  return { tables: [...base, ...bridges, ...kept], dropped };
}

export async function loadErMetadata(run: (sql: string) => Promise<QueryResult>, schema: string): Promise<ErMetadata> {
  return { cols: toErColumns(await run(erColumnsSql(schema))), cons: toErConstraints(await run(erConstraintsSql(schema))) };
}

/** Latin letters with diacritics (Vietnamese headers) are kept: Mermaid's name token accepts U+00C0 and up. */
const UNSAFE = /[^A-Za-z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g;
/** Mermaid lexes these before names (a following accented letter does not end its \b), so `class` or `toán` would not parse. */
const RESERVED = /^(style|classdef|class|subgraph|end|one|many|to|erdiagram|pk|fk|uk)(?![A-Za-z0-9_])/i;

/**
 * Every name written into the Mermaid text goes through this: a safe identifier passes unchanged,
 * anything else (CSV headers in `sandbox`) has each other character replaced by `_`, so a name can never
 * add Mermaid syntax (quotes, braces, newlines, `style`/`click` lines).
 */
// ponytail: two names that differ only in unsafe characters collide; add a numeric suffix if imports hit it.
export function mermaidName(name: string): string {
  const safe = name.replace(UNSAFE, '_');
  return /^[0-9]/.test(safe) || safe === '' || RESERVED.test(safe) ? `_${safe}` : safe;
}

const HEX = /^#[0-9a-f]{3,8}$/i;

const KEY_TAG: Record<ErConstraint['kind'], string> = { 'PRIMARY KEY': 'PK', 'FOREIGN KEY': 'FK', UNIQUE: 'UK' };

/**
 * Mermaid erDiagram (crow's foot): parent ||--o{ child, or |o--o{ when the FK column is nullable.
 * Tables in `highlight` get a bold border in `color` (the open ticket's chapter colour, hex; L36).
 * `detail`: only these tables get a column block; the others are name-only boxes (default: every table).
 */
export function erDefinition(cols: ErColumn[], cons: ErConstraint[], tables: string[], highlight: Set<string>, color?: string, detail?: Set<string>): string {
  const m = mermaidName;
  const shown = new Set(tables);
  const lines = ['erDiagram', '  direction LR']; // the bottom panel is wide and short
  for (const c of cons) {
    if (c.kind !== 'FOREIGN KEY' || !c.refTable || !shown.has(c.table) || !shown.has(c.refTable)) continue;
    const nullable = cols.find((x) => x.table === c.table && x.name === c.column)?.nullable;
    lines.push(`  ${m(c.refTable)} ${nullable ? '|o' : '||'}--o{ ${m(c.table)} : "${m(c.column)}"`);
  }
  for (const t of tables) {
    if (detail && !detail.has(t)) {
      lines.push(`  ${m(t)}`); // a bare entity: kept even without a relationship, so its style line never dangles
      continue;
    }
    const tableCols = cols.filter((c) => c.table === t);
    if (tableCols.length === 0) continue;
    lines.push(`  ${m(t)} {`);
    for (const c of tableCols) {
      const keys = [...new Set(cons.filter((k) => k.table === t && k.column === c.name).map((k) => KEY_TAG[k.kind]))];
      lines.push(`    ${m(c.type)} ${m(c.name)}${keys.length ? ` ${keys.join(', ')}` : ''}`);
    }
    lines.push('  }');
  }
  const stroke = color && HEX.test(color) ? `,stroke:${color}` : '';
  for (const t of tables) if (highlight.has(t)) lines.push(`  style ${m(t)} stroke-width:3px${stroke}`);
  return lines.join('\n');
}

export function tablesInQuery(sql: string, known: string[]): Set<string> {
  const words = new Set(sql.replace(/'(?:[^']|'')*'/g, ' ').toLowerCase().match(/[a-z_][a-z0-9_]*/g) ?? []);
  return new Set(known.filter((t) => words.has(t)));
}
