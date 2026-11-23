// v24 performance gate helpers (schema-perf-v24.md §4): table facts for overBudget/nonSargable in src/planCheck.ts.
import type { TableFacts } from '../src/planCheck';

/**
 * Two statements: tables in the namespaces `where` names ([name, pages, exact count]; a never-analysed table has relpages 0,
 * so its size comes from the file and the count is exact) and their index definitions.
 */
export const factsSql = (where: string): [string, string] => [
  `SELECT c.relname::text, (pg_relation_size(c.oid) / 8192)::int,
     (xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM %I.%I', n.nspname, c.relname), false, true, '')))[1]::text::bigint
   FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE ${where} AND c.relkind = 'r'`,
  `SELECT tablename::text, indexdef FROM pg_indexes i WHERE ${where.replace(/n\.nspname/g, 'i.schemaname')}`,
];

export function factsOf(tables: unknown[][], indexes: unknown[][]): TableFacts {
  const out: TableFacts = {};
  for (const [name, pages, n] of tables as [string, number, string][]) out[name] = { rows: Number(n), seqCost: pages + Number(n) * 0.01, lead: [] };
  for (const [table, def] of indexes as [string, string][]) {
    const lead = /\(([^,)]+)/.exec(def)?.[1].trim().replace(/"/g, '');
    if (lead && out[table]) out[table].lead.push(lead);
  }
  return out;
}

/** A Solution that is itself an EXPLAIN (a10's example, some Engine steps) is gated on the statement it explains. */
export const READ = /^\s*(EXPLAIN\b(\s*\([^)]*\))?\s*(ANALYZE\s+)?(VERBOSE\s+)?)?((SELECT|WITH|TABLE|VALUES)\b[\s\S]*)$/i;
export const readOf = (sql: string): string | undefined => {
  const m = READ.exec(sql.trim().replace(/;\s*$/, ''));
  return m && !m[5].includes(';') ? m[5] : undefined;
};
