import { PGlite, type Extension } from '@electric-sql/pglite';
import { amcheck } from '@electric-sql/pglite/contrib/amcheck';
import { bloom } from '@electric-sql/pglite/contrib/bloom';
import { btree_gin } from '@electric-sql/pglite/contrib/btree_gin';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { ltree } from '@electric-sql/pglite/contrib/ltree';
import { pageinspect } from '@electric-sql/pglite/contrib/pageinspect';
import { pg_buffercache } from '@electric-sql/pglite/contrib/pg_buffercache';
import { pg_freespacemap } from '@electric-sql/pglite/contrib/pg_freespacemap';
import { pg_stat_statements } from '@electric-sql/pglite/contrib/pg_stat_statements';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { pg_visibility } from '@electric-sql/pglite/contrib/pg_visibility';
import { pg_walinspect } from '@electric-sql/pglite/contrib/pg_walinspect';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { sqlErrorInfo } from '../../db/run';
import type { ScriptResult, LabScript, PgExtension, StepResult } from './script';
import { runCheck } from './check';

/**
 * ENG-PGLAB (L230): the lab runtime, run inside src/engine/pglab/pglabWorker.ts (Node tests call it directly). Never the
 * game DB: its own in-memory PGlite per lab, booted from a template cluster dumped once (initdb ~2.7 s once, then a fresh
 * database in ~0.5 s with identical xids and LSNs every time). A contrib's tarball is fetched only when a lab names it.
 */
export const EXTENSIONS: Record<PgExtension, Extension> = {
  pageinspect, pg_visibility, amcheck, pg_walinspect, pg_buffercache, pg_freespacemap,
  bloom, btree_gin, btree_gist, pg_trgm, pg_stat_statements, ltree, pgcrypto,
};

/** Rows kept per step; lab output is catalog-sized, the UI shows less. */
export const MAX_LAB_ROWS = 1000;

let template: Promise<Blob> | undefined;

/** The empty cluster every lab starts from (gzip, ~4.5 MB in memory). A failed boot is dropped so the next call retries. */
export function labTemplate(): Promise<Blob> {
  template ??= (async () => {
    const db = await PGlite.create();
    try {
      return await db.dumpDataDir('gzip');
    } finally {
      await db.close();
    }
  })();
  template.catch(() => (template = undefined));
  return template;
}

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

const blank = (sql: string): StepResult => ({ sql, status: 'skipped', columns: [], types: [], rows: [], notices: [], ms: 0 });

/** Runs `script` on a fresh database and closes it. Throws only when the runtime cannot start (unknown extension, boot). */
export async function runLabScript(script: LabScript): Promise<ScriptResult> {
  const t0 = performance.now();
  const names = [...new Set(script.extensions ?? [])];
  const bad = names.find((n) => !Object.hasOwn(EXTENSIONS, n));
  if (bad) throw new Error(`unknown extension ${bad}`);
  const db = await PGlite.create({ loadDataDir: await labTemplate(), extensions: Object.fromEntries(names.map((n) => [n, EXTENSIONS[n]])) });
  try {
    for (const n of names) await db.exec(`CREATE EXTENSION ${n}`); // n is a key of EXTENSIONS, never player text
    const bootMs = Math.round(performance.now() - t0);
    const steps = script.steps.map((st) => blank(typeof st === 'string' ? st : st.sql));
    const done = (more: Partial<ScriptResult>): ScriptResult => {
      const checks = (script.checks ?? []).map((c) => runCheck(c, steps));
      const ok = more.failedStep === undefined && !more.setupError && checks.every((c) => c.ok);
      return { steps, checks, ok, ...more, bootMs, ms: Math.round(performance.now() - t0) };
    };
    for (const sql of splitSql(script.setup ?? '')) {
      const ext = /^CREATE\s+EXTENSION\s+(?:IF\s+NOT\s+EXISTS\s+)?"?(\w+)"?\s*$/i.exec(sql)?.[1];
      if (ext && (names as string[]).includes(ext)) continue;
      try {
        await db.exec(sql);
      } catch (e) {
        return done({ setupError: { sql, ...(sqlErrorInfo(e) ?? { message: e instanceof Error ? e.message : String(e) }) } });
      }
    }
    let failedStep: number | undefined;
    for (const [i, st] of script.steps.entries()) {
      const expect = typeof st === 'string' ? undefined : st.expectError;
      const out = steps[i];
      const t = performance.now();
      try {
        const r = await db.query<unknown[]>(out.sql, [], {
          rowMode: 'array',
          onNotice: (n) => out.notices.push({ severity: n.severity ?? '', message: n.message ?? '', code: n.code }),
        });
        Object.assign(out, {
          status: 'ok', columns: r.fields.map((f) => f.name), types: r.fields.map((f) => f.dataTypeID),
          rows: r.rows.slice(0, MAX_LAB_ROWS), command: (r as { command?: string }).command,
          ...(r.rows.length > MAX_LAB_ROWS ? { truncated: true } : {}),
        });
      } catch (e) {
        out.status = 'error';
        out.error = sqlErrorInfo(e) ?? { message: e instanceof Error ? e.message : String(e) };
      }
      out.ms = Math.round(performance.now() - t);
      if ((out.status === 'error') !== (expect !== undefined) || (expect !== undefined && out.error?.code !== expect)) {
        failedStep = i;
        break;
      }
    }
    return done(failedStep !== undefined ? { failedStep } : {});
  } finally {
    await db.close();
  }
}
