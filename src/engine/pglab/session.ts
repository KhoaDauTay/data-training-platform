import { PGlite, type Extension } from '@electric-sql/pglite';
import { amcheck } from '@electric-sql/pglite/contrib/amcheck';
import { bloom } from '@electric-sql/pglite/contrib/bloom';
import { btree_gin } from '@electric-sql/pglite/contrib/btree_gin';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { cube } from '@electric-sql/pglite/contrib/cube';
import { earthdistance } from '@electric-sql/pglite/contrib/earthdistance';
import { ltree } from '@electric-sql/pglite/contrib/ltree';
import { pageinspect } from '@electric-sql/pglite/contrib/pageinspect';
import { pg_buffercache } from '@electric-sql/pglite/contrib/pg_buffercache';
import { pg_freespacemap } from '@electric-sql/pglite/contrib/pg_freespacemap';
import { pg_stat_statements } from '@electric-sql/pglite/contrib/pg_stat_statements';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { pg_visibility } from '@electric-sql/pglite/contrib/pg_visibility';
import { pg_walinspect } from '@electric-sql/pglite/contrib/pg_walinspect';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { citext } from '@electric-sql/pglite/contrib/citext';
import { fuzzystrmatch } from '@electric-sql/pglite/contrib/fuzzystrmatch';
import { hstore } from '@electric-sql/pglite/contrib/hstore';
import { tablefunc } from '@electric-sql/pglite/contrib/tablefunc';
import { unaccent } from '@electric-sql/pglite/contrib/unaccent';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { postgis } from '@electric-sql/pglite-postgis';
import { vector } from '@electric-sql/pglite-pgvector';
import { sqlErrorInfo } from '../../db/run';
import type { ScriptResult, LabScript, PgExtension, StepResult } from './script';
import { runCheck } from './check';
import { createdIn, splitSql } from './split';

/**
 * ENG-PGLAB (L230): the lab runtime, run inside src/engine/pglab/pglabWorker.ts (Node tests call it directly). Never the
 * game DB: its own in-memory PGlite per lab, booted from a template cluster dumped once (initdb ~2.7 s once, then a fresh
 * database in ~0.5 s with identical xids and LSNs every time). A contrib's tarball is fetched only when a lab names it.
 */
export const EXTENSIONS: Record<PgExtension, Extension> = {
  pageinspect, pg_visibility, amcheck, pg_walinspect, pg_buffercache, pg_freespacemap,
  bloom, btree_gin, btree_gist, pg_trgm, pg_stat_statements, ltree, pgcrypto, cube, earthdistance,
  // L711: PostGIS (@electric-sql/pglite-postgis 0.2.16, pinned to PGlite 0.5.16). Its ~20 MB tarball is fetched only by a
  // lab that names it and is never precached.
  postgis,
  // v43 (L723–L724): the Extensions shelf. Each tarball is fetched only by a lab that names it, never precached.
  citext, fuzzystrmatch, unaccent, 'uuid-ossp': uuid_ossp, hstore, tablefunc, vector,
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
 * v43 spike (L726): `CREATE EXTENSION postgis` takes 4–5 s (Node) and ran on every Run, ~9 s a run in all. A second template
 * with PostGIS already created is dumped once per worker (~6 MB gzip), so a later run only boots it and loads the library:
 * ~1.8 s. Only for extensions whose CREATE is that slow; the others are created per run as before (≤ 0.2 s each).
 */
const PREINSTALLED: readonly PgExtension[] = ['postgis'];
const withExt = new Map<string, Promise<Blob>>();
function templateWith(pre: readonly PgExtension[]): Promise<Blob> {
  if (!pre.length) return labTemplate();
  const key = pre.join(',');
  let t = withExt.get(key);
  if (!t) {
    t = (async () => {
      const db = await PGlite.create({ loadDataDir: await labTemplate(), extensions: Object.fromEntries(pre.map((n) => [n, EXTENSIONS[n]])) });
      try {
        for (const n of pre) await db.exec(`CREATE EXTENSION "${n}"`);
        return await db.dumpDataDir('gzip');
      } finally {
        await db.close();
      }
    })();
    withExt.set(key, t);
    t.catch(() => withExt.delete(key)); // a failed build (offline, no tarball) is retried by the next run
  }
  return t;
}

export { splitSql } from './split';

const blank = (sql: string): StepResult => ({ sql, status: 'skipped', columns: [], types: [], rows: [], notices: [], ms: 0 });

/** Runs `script` on a fresh database and closes it. Throws only when the runtime cannot start (unknown extension, boot). */
export async function runLabScript(script: LabScript): Promise<ScriptResult> {
  const t0 = performance.now();
  const names = [...new Set(script.extensions ?? [])];
  const bad = names.find((n) => !Object.hasOwn(EXTENSIONS, n));
  if (bad) throw new Error(`unknown extension ${bad}`);
  // v43 (L725): an extension a step creates itself (plain `CREATE EXTENSION x`, the Extensions shelf's install step) and the
  // setup never names is only loaded, so that step does not fail with 42710. A lab passes `loadOnly` from its Solutions, so a
  // player who skips the install step does not get it for free.
  const late = script.loadOnly ? new Set<string>(script.loadOnly) : createdIn(script.steps.map((st) => (typeof st === 'string' ? st : st.sql)).join('\n'), true);
  const inSetup = createdIn(script.setup ?? '', false);
  const create = names.filter((n) => !late.has(n) || inSetup.has(n));
  const pre = PREINSTALLED.filter((n) => create.includes(n));
  const db = await PGlite.create({ loadDataDir: await templateWith(pre), extensions: Object.fromEntries(names.map((n) => [n, EXTENSIONS[n]])) });
  try {
    for (const n of create) if (!pre.includes(n)) await db.exec(`CREATE EXTENSION "${n}"`); // n is a key of EXTENSIONS, never player text
    const bootMs = Math.round(performance.now() - t0);
    const steps = script.steps.map((st) => blank(typeof st === 'string' ? st : st.sql));
    const done = (more: Partial<ScriptResult>): ScriptResult => {
      const checks = (script.checks ?? []).map((c) => runCheck(c, steps));
      const ok = more.failedStep === undefined && !more.setupError && checks.every((c) => c.ok);
      return { steps, checks, ok, ...more, bootMs, ms: Math.round(performance.now() - t0) };
    };
    for (const sql of splitSql(script.setup ?? '')) {
      const ext = /^CREATE\s+EXTENSION\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([\w-]+)"?\s*$/i.exec(sql)?.[1];
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
