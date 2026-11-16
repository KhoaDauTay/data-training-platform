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

const KEY_TAG: Record<ErConstraint['kind'], string> = { 'PRIMARY KEY': 'PK', 'FOREIGN KEY': 'FK', UNIQUE: 'UK' };

/** Mermaid erDiagram (crow's foot): parent ||--o{ child, or |o--o{ when the FK column is nullable. */
export function erDefinition(cols: ErColumn[], cons: ErConstraint[], tables: string[], highlight: Set<string>): string {
  const shown = new Set(tables);
  const lines = ['erDiagram', '  direction LR']; // the bottom panel is wide and short
  for (const c of cons) {
    if (c.kind !== 'FOREIGN KEY' || !c.refTable || !shown.has(c.table) || !shown.has(c.refTable)) continue;
    const nullable = cols.find((x) => x.table === c.table && x.name === c.column)?.nullable;
    lines.push(`  ${c.refTable} ${nullable ? '|o' : '||'}--o{ ${c.table} : "${c.column}"`);
  }
  for (const t of tables) {
    const tableCols = cols.filter((c) => c.table === t);
    if (tableCols.length === 0) continue;
    lines.push(`  ${t} {`);
    for (const c of tableCols) {
      const keys = [...new Set(cons.filter((k) => k.table === t && k.column === c.name).map((k) => KEY_TAG[k.kind]))];
      lines.push(`    ${c.type.replace(/\W+/g, '_')} ${c.name}${keys.length ? ` ${keys.join(', ')}` : ''}`);
    }
    lines.push('  }');
  }
  for (const t of tables) if (highlight.has(t)) lines.push(`  style ${t} stroke-width:3px`);
  return lines.join('\n');
}

export function tablesInQuery(sql: string, known: string[]): Set<string> {
  const words = new Set(sql.replace(/'(?:[^']|'')*'/g, ' ').toLowerCase().match(/[a-z_][a-z0-9_]*/g) ?? []);
  return new Set(known.filter((t) => words.has(t)));
}
