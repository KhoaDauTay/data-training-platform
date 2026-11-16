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

export const erConstraintsSql = (schema: string): string => `SELECT tc.table_name, kcu.column_name, tc.constraint_type, ccu.table_name AS ref_table
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
LEFT JOIN information_schema.constraint_column_usage ccu
  ON tc.constraint_type = 'FOREIGN KEY' AND ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = ${schemaLiteral(schema)} AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY')`;

export interface ErColumn { table: string; name: string; type: string; nullable: boolean }
export interface ErConstraint { table: string; column: string; kind: 'PRIMARY KEY' | 'UNIQUE' | 'FOREIGN KEY'; refTable: string | null }
export interface ErMetadata { cols: ErColumn[]; cons: ErConstraint[] }

export const toErColumns = (r: QueryResult): ErColumn[] =>
  r.rows.map(([table, name, type, nullable]) => ({ table: String(table), name: String(name), type: String(type), nullable: nullable === 'YES' }));

export const toErConstraints = (r: QueryResult): ErConstraint[] =>
  r.rows.map(([table, column, kind, ref]) => ({ table: String(table), column: String(column), kind: kind as ErConstraint['kind'], refTable: ref === null ? null : String(ref) }));

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
 */
export function erDefinition(cols: ErColumn[], cons: ErConstraint[], tables: string[], highlight: Set<string>, color?: string): string {
  const m = mermaidName;
  const shown = new Set(tables);
  const lines = ['erDiagram', '  direction LR']; // the bottom panel is wide and short
  for (const c of cons) {
    if (c.kind !== 'FOREIGN KEY' || !c.refTable || !shown.has(c.table) || !shown.has(c.refTable)) continue;
    const nullable = cols.find((x) => x.table === c.table && x.name === c.column)?.nullable;
    lines.push(`  ${m(c.refTable)} ${nullable ? '|o' : '||'}--o{ ${m(c.table)} : "${m(c.column)}"`);
  }
  for (const t of tables) {
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
