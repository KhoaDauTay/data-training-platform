// Pure (no PGlite): shared by the lab worker's session and the Engine lesson page's runnable examples (src/engine/demo.ts).
/**
 * Content SQL → statements, split on `;` outside '…', "…", $tag$…$tag$, -- and (nested) block comments. Setup runs one
 * statement at a time because a multi-statement string is one implicit transaction, where VACUUM fails (25001).
 */
export function splitSql(sql: string): string[] {
  const out: string[] = [];
  let start = 0;
  for (let i = 0; i < sql.length;) {
    const c = sql[i];
    if (sql.startsWith('--', i)) i = sql.indexOf('\n', i) < 0 ? sql.length : sql.indexOf('\n', i);
    else if (sql.startsWith('/*', i)) {
      let depth = 0;
      do {
        if (sql.startsWith('/*', i)) { depth++; i += 2; } else if (sql.startsWith('*/', i)) { depth--; i += 2; } else i++;
      } while (depth > 0 && i < sql.length);
    } else if (c === "'" || c === '"') {
      i++;
      while (i < sql.length && !(sql[i] === c && sql[i + 1] !== c)) i += sql[i] === c ? 2 : 1;
      i++;
    } else if (c === '$' && /^\$(?:[A-Za-z_][\w]*)?\$/.test(sql.slice(i, i + 64)) && !/[\w$]/.test(sql[i - 1] ?? '')) {
      const tag = /^\$(?:[A-Za-z_][\w]*)?\$/.exec(sql.slice(i, i + 64))![0];
      const end = sql.indexOf(tag, i + tag.length);
      i = end < 0 ? sql.length : end + tag.length;
    } else if (c === ';') {
      out.push(sql.slice(start, i));
      start = ++i;
    } else i++;
  }
  out.push(sql.slice(start));
  return out.map((s) => s.trim()).filter((s) => s && !/^(--[^\n]*\n?\s*)+$/.test(s + '\n'));
}

/** v43 (L725): extension names a script creates (`plainOnly`: without IF NOT EXISTS), lower case; `uuid-ossp` keeps its hyphen. */
export function createdIn(sql: string, plainOnly: boolean): Set<string> {
  const re = plainOnly ? /\bCREATE\s+EXTENSION\s+(?!IF\b)"?([\w-]+)"?/gi : /\bCREATE\s+EXTENSION\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([\w-]+)"?/gi;
  return new Set([...sql.matchAll(re)].map((m) => m[1].toLowerCase()));
}