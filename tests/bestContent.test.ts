// BP-T (v24, L345): Best Practice cards (product-design-best-practice §4.3). Every card parses (all 131: the hidden MongoDB and
// DynamoDB tracks too); every released card's pair runs on real PGlite and shows what its `check` claims, through the same
// judge() the page uses. `lab` pairs run on the seeded `lab` schema in BEGIN … ROLLBACK; `engine`/`engine-hb` pairs run each
// side as its own script on a fresh database (runLabScript), so P05 (CREATE INDEX CONCURRENTLY) and S04 (inserts) start clean.
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { parse as yaml } from 'yaml';
import { generalNow } from '../src/content';
import { SKILLS } from '../src/progress';
import {
  BP_META, byName, cardProblems, explainOf, judge, needsPlan, parseBestCard, parseHabits, parseTracks, planScan, RELEASED, sideOf, sideScript,
  type BpCard, type Pair, type Side,
} from '../src/engine/best';
import { codeOf } from '../src/engine/content';
import { codeOf as bpCodeOf } from '../src/engine/best';
import { runLabScript, splitSql } from '../src/engine/pglab/session';
import { sqlErrorInfo } from '../src/db/run';
import { labRun } from './generalRules';
import * as sources from '../src/bestSources';
import * as mongoIndex from '../src/bestMongoIndex';
import * as dynamoIndex from '../src/bestDynamoIndex';
import { loadDataset, runMongo } from '../src/engine/mongo/engineMongo';
import { mongoRunner } from '../src/engine/mongo/runner';
import { DynamoEngine } from '../src/engine/dynamo/engine';
import { dynamoRunner, labOf } from '../src/engine/dynamo/runner';
import type { DynamoRequest } from '../src/engine/dynamo/types';

const raw = import.meta.glob<string>('../content/engine/best/*/*.md', { query: '?raw', import: 'default', eager: true });
const lessonIds = new Set(Object.values(import.meta.glob<string>('../content/engine/*/L*/*.md', { query: '?raw', import: 'default', eager: true }))
  .map((t) => /^id:\s*(\S+)/m.exec(t)?.[1]));
const FM = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
const cards = Object.entries(raw).map(([path, text]) => {
  const m = FM.exec(text.replace(/\r\n/g, '\n'))!;
  return parseBestCard({ fm: yaml(m[1]), body: m[2] }, path) as BpCard;
});
const released = cards.filter((c) => RELEASED.includes(c.track));
const DIACRITIC = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

describe('thẻ Best Practice: cấu trúc (132 thẻ, cả track chưa phát hành)', () => {
  it('132 thẻ, id duy nhất; phát hành cả 132 (SQL 30 + PostgreSQL 31 + MongoDB 39 + DynamoDB 32, v26 L383; v35 + X08; v36 + M39)', () => {
    expect(cards).toHaveLength(132);
    expect(new Set(cards.map((c) => c.id)).size).toBe(132);
    expect(released.filter((c) => c.track === 'sql')).toHaveLength(30);
    expect(released.filter((c) => c.track === 'postgres')).toHaveLength(31);
    expect(released.filter((c) => c.track === 'mongodb')).toHaveLength(39);
    expect(released.filter((c) => c.track === 'dynamodb')).toHaveLength(32);
  });

  it('v38 (L582): `{ url, title }` sources keep the URL in `sources` and the title beside it', () => {
    const x08 = cards.find((c) => c.id === 'e-bp-x08')!;
    expect(x08.sources).toEqual(['https://www.postgresql.org/docs/18/sql-createview.html', 'https://www.postgresql.org/docs/18/ddl-rowsecurity.html']);
    expect(x08.sourceTitles).toEqual({ 'https://www.postgresql.org/docs/18/sql-createview.html': 'CREATE VIEW', 'https://www.postgresql.org/docs/18/ddl-rowsecurity.html': 'Row Security Policies' });
  });

  it.each(cards.map((c) => [c.id, c]))('%s: luật nội dung §4.3', (_id, c) => {
    expect(cardProblems(c)).toEqual([]);
    const ids = new Set(SKILLS.map((s) => s.id));
    for (const s of c.skills) expect([c.id, s, ids.has(s)]).toEqual([c.id, s, true]);
    const nodes = new Set(generalNow()!.nodes.map((n) => n.id));
    for (const a of c.adv) expect([c.id, a, nodes.has(a)]).toEqual([c.id, a, true]);
    for (const r of c.requires) expect([c.id, r, lessonIds.has(r)]).toEqual([c.id, r, true]);
  });

  it('tracks.yml: area của mỗi thẻ thuộc track; gallery chỉ là thẻ đã phát hành; chỉ track phát hành có tab', () => {
    const all = parseTracks(yaml(sourcesTracks()), true);
    for (const c of cards) expect([c.id, all.find((t) => t.id === c.track)?.areas.includes(c.module)]).toEqual([c.id, true]);
    const shown = parseTracks(sources.tracks);
    expect(shown.map((t) => t.id)).toEqual(['sql', 'postgres', 'mongodb', 'dynamodb']);
    const ids = new Set(released.map((c) => c.id));
    for (const t of shown) for (const g of t.gallery) expect([t.id, g, ids.has(g)]).toEqual([t.id, g, true]);
    expect(shown[0].gallery.length).toBeGreaterThanOrEqual(8);
  });

  it('index (bpindex + bpindexMg + bpindexDy) chỉ chứa thẻ đã phát hành, mỗi track một chunk', () => {
    const paths = Object.keys(sources.meta);
    expect(paths).toHaveLength(61);
    expect(paths.every((p) => /\/best\/(sql|postgres)\//.test(p))).toBe(true);
    const mg = Object.keys(mongoIndex.meta);
    expect(mg).toHaveLength(39);
    expect(mg.every((p) => /\/best\/mongodb\//.test(p))).toBe(true);
    expect(typeof sources.full.mongodb).toBe('function');
    const dy = Object.keys(dynamoIndex.meta);
    expect(dy).toHaveLength(32);
    expect(dy.every((p) => /\/best\/dynamodb\//.test(p))).toBe(true);
    expect(typeof sources.full.dynamodb).toBe('function');
    for (const [p, s] of Object.entries({ ...sources.meta, ...mongoIndex.meta, ...dynamoIndex.meta })) expect(parseBestCard(s, p)).toEqual(expect.objectContaining({ id: expect.stringMatching(/^e-bp-[qasipxmd]\d\d$/) }));
  });

  it('habits.yml: 8 thói quen, mã VI = EN, EN không dấu, mỗi thói quen có ≥ 1 thẻ đã phát hành', () => {
    const h = parseHabits(sources.habits);
    expect(h.habits).toHaveLength(8);
    const ids = new Set(released.map((c) => c.id));
    for (const x of [h.title, h.intro, h.after, ...h.habits.flatMap((y) => [y.text, ...y.points])]) {
      expect(codeOf(x.vi)).toEqual(codeOf(x.en));
      expect([x.en, DIACRITIC.test(x.en.replace(/`[^`]+`/g, ''))]).toEqual([x.en, false]);
    }
    for (const [i, y] of h.habits.entries()) if (i > 0) expect([i, y.cards.some((c) => ids.has(c))]).toEqual([i, true]);
  });

  it('parser: lỗi rõ ràng; expect.fails: good chỉ cho runtime có trạng thái', () => {
    const c = released.find((x) => x.id === 'e-bp-s04')!;
    const fm = (pair: Partial<Pair>) => ({ ...yaml(FM.exec(raw['../content/engine/best/postgres/s04-identity-not-serial.md'].replace(/\r\n/g, '\n'))![1]), pair: { ...c.pair, ...pair } });
    const body = FM.exec(raw['../content/engine/best/postgres/s04-identity-not-serial.md'].replace(/\r\n/g, '\n'))![2];
    const path = 'content/engine/best/postgres/s04-identity-not-serial.md';
    expect(() => parseBestCard({ fm: fm({ runtime: 'none' }), body }, path)).toThrow(/syntax/);
    expect(() => parseBestCard({ fm: fm({ runtime: 'lab', setup: undefined, expect: { code: '23505', fails: 'good' } }), body }, path)).toThrow(/fails: good/);
    expect(() => parseBestCard({ fm: { ...fm({}), id: 'e-bp-s05' }, body }, path)).toThrow(/id phải là e-bp-s04/);
    expect(() => parseBestCard({ fm: fm({}), body }, 'content/engine/best/sql/x.md')).toThrow(/đường dẫn/);
  });

  it('v44 B4 (L812): figures: trên thẻ đầy đủ, mục phải có trong thẻ; index (BP_META) không mang figures', () => {
    const p = '../content/engine/best/postgres/s04-identity-not-serial.md';
    const [, f, body] = FM.exec(raw[p].replace(/\r\n/g, '\n'))!;
    const card = (figures: unknown) => parseBestCard({ fm: { ...yaml(f), figures }, body }, p.slice(3)) as BpCard;
    expect(card([{ name: 'pg-x', at: 'idea' }, { name: 'pg-y', at: 'why', variant: 'v', step: 1 }]).figures)
      .toEqual([{ name: 'pg-x', at: 'idea' }, { name: 'pg-y', at: 'why', variant: 'v', step: 1 }]);
    expect(() => card([{ name: 'pg-x', at: 'recap' }])).toThrow(/at "recap"/);
    expect(() => card({ name: 'pg-x' })).toThrow(/danh sách/);
    expect(() => card([{ name: 'pg-x', at: 'example' }])).toThrow(/không có mục "example"/); // s04 has no ## Ví dụ
    expect('figures' in parseBestCard({ fm: { ...yaml(f), figures: [{ name: 'pg-x', at: 'idea' }] } }, p.slice(3))).toBe(false);
    expect(BP_META).not.toContain('figures');
    expect(cards.filter((c) => c.figures).map((c) => c.id).sort()).toEqual(['e-bp-a01', 'e-bp-p13', 'e-bp-q07']);
  });
});

/** The released tracks.yml text (parsed with `all` above to read the hidden tracks' areas too). */
function sourcesTracks(): string {
  return Object.values(import.meta.glob<string>('../content/engine/best/tracks.yml', { query: '?raw', import: 'default', eager: true }))[0];
}

/** Node twin of the page's lab runner: one statement on `lab` (rolled back); an error is a result, like the page shows it. */
async function labSide(p: Pair, sql: string): Promise<Side> {
  const run = await labRun();
  try {
    const r = await run(sql);
    const plan = needsPlan(p) ? planScan((await run(explainOf(sql))).rows[0]?.[0], p.expect?.table) : {};
    return { columns: r.columns, rows: r.rows, ...plan };
  } catch (e) {
    const info = sqlErrorInfo(e);
    return { columns: [], rows: [], error: { code: info?.code, message: info?.message ?? String(e) } };
  }
}

describe('thẻ Best Practice: cặp Không nên / Nên chạy thật (132 thẻ phát hành)', () => {
  const runnable = released.filter((c) => c.pair.runtime !== 'none' && c.pair.runtime !== 'mingo' && c.pair.runtime !== 'dynoxide');
  it('mỗi thẻ "none" là check syntax; mọi thẻ chạy được là một câu mỗi bên (trang không có splitSql, nó nằm cạnh PGlite)', () => {
    for (const c of released) if (c.pair.runtime === 'none') expect([c.id, c.pair.check]).toEqual([c.id, 'syntax']);
    for (const c of released) {
      const text = c.sections.map((x) => x.text.vi).join(' ');
      expect(bpCodeOf(text)).toEqual(codeOf(text));
    }
    for (const c of runnable) expect([c.id, splitSql(c.pair.bad).length, splitSql(c.pair.good).length]).toEqual([c.id, 1, 1]);
  });

  it.each(runnable.map((c) => [c.id, c]))('%s: check của thẻ đúng trên PGlite, mỗi câu < 300 ms', async (_id, c) => {
    const p = c.pair;
    const timed = async (f: () => Promise<Side>): Promise<[Side, number]> => {
      const t0 = performance.now();
      const s = await f();
      return [s, performance.now() - t0];
    };
    let bad: Side;
    let good: Side;
    if (p.runtime === 'lab') {
      [bad] = await timed(() => labSide(p, p.bad));
      [good] = await timed(() => labSide(p, p.good));
    } else {
      // A fresh database per side, every run (P05/S04: the Nên side never sees the Không nên side's writes).
      const rb = await runLabScript(sideScript(p, p.bad, splitSql));
      const rg = await runLabScript(sideScript(p, p.good, splitSql));
      expect([c.id, rb.setupError, rg.setupError]).toEqual([c.id, undefined, undefined]);
      for (const s of [...rb.steps, ...rg.steps]) expect([c.id, s.sql.slice(0, 40), s.ms < 300]).toEqual([c.id, s.sql.slice(0, 40), true]);
      bad = sideOf(p, rb);
      good = sideOf(p, rg);
    }
    const v = judge(p, bad, good);
    expect([c.id, v, bad.error, good.error]).toEqual([c.id, expect.objectContaining({ ok: true }), ...(p.check === 'error'
      ? (p.expect?.fails === 'good' ? [undefined, expect.anything()] : [expect.anything(), undefined]) : [undefined, undefined])]);
  });

  it('chạy lại cùng thẻ engine cho cùng số đo (database mới mỗi lần, P05 và S04)', async () => {
    for (const id of ['e-bp-p05', 'e-bp-s04']) {
      const c = released.find((x) => x.id === id)!;
      const twice = [];
      for (let i = 0; i < 2; i++) twice.push(judge(c.pair, sideOf(c.pair, await runLabScript(sideScript(c.pair, c.pair.bad, splitSql))), sideOf(c.pair, await runLabScript(sideScript(c.pair, c.pair.good, splitSql)))));
      expect([id, twice[0].ok, twice[1]]).toEqual([id, true, twice[0]]);
    }
  });

  it('expect.fails: good (catalogue §17.3): bản Nên báo lỗi, bản Không nên ghi được', async () => {
    const p: Pair = {
      runtime: 'engine', check: 'error', expect: { code: '23514', fails: 'good' },
      setup: 'CREATE TABLE stock (sku int PRIMARY KEY, qty int NOT NULL); CREATE TABLE stock_checked (sku int PRIMARY KEY, qty int NOT NULL CHECK (qty >= 0)); INSERT INTO stock VALUES (1, 2); INSERT INTO stock_checked VALUES (1, 2)',
      bad: 'UPDATE stock SET qty = qty - 5 WHERE sku = 1 RETURNING qty',
      good: 'UPDATE stock_checked SET qty = qty - 5 WHERE sku = 1 RETURNING qty',
    };
    const bad = sideOf(p, await runLabScript(sideScript(p, p.bad, splitSql)));
    const good = sideOf(p, await runLabScript(sideScript(p, p.good, splitSql)));
    expect(judge(p, bad, good)).toEqual({ kind: 'error', side: 'good', code: '23514', ok: true });
    expect(judge({ ...p, expect: { code: '23514' } }, bad, good).ok).toBe(false); // the default side (bad) did not fail
  });
});

// v25 BP-MG (L374): the MongoDB track's `mingo` pairs run through the same runner the card page uses (mongoRunner.run on the
// card's inline `setup`), each side on the pristine data, and show what their `check` claims through judge().
describe('thẻ Best Practice MongoDB: cặp chạy thật trên mingo', () => {
  const r = mongoRunner({ lang: () => 'en' }, { exec: async (src: string, ds: string, stages?: boolean) => runMongo(await loadDataset(ds), src, { stages }) });
  const side = async (p: Pair, code: string): Promise<Side> => {
    try {
      const out = await r.run({ setup: p.setup, steps: [] }, code.trim());
      return { columns: out.columns, rows: out.rows };
    } catch (e) {
      const x = e as { code?: unknown; message?: string };
      return { columns: [], rows: [], error: { code: typeof x.code === 'string' ? x.code : undefined, message: x.message ?? String(e) } };
    }
  };
  const mg = released.filter((c) => c.pair.runtime === 'mingo');
  it('16 thẻ mingo, mọi thẻ MongoDB khác là cú pháp', () => {
    expect(mg).toHaveLength(16);
    for (const c of released.filter((x) => x.track === 'mongodb' && x.pair.runtime !== 'mingo')) expect([c.id, c.pair.runtime, c.pair.check]).toEqual([c.id, 'none', 'syntax']);
  });
  it.each(mg.map((c) => [c.id, c]))('%s: check của thẻ đúng trên mingo', async (_id, c) => {
    const p = c.pair;
    const [bad, good] = [await side(p, p.bad), await side(p, p.good)];
    expect([c.id, judge(p, bad, good)]).toEqual([c.id, expect.objectContaining({ ok: true })]);
  });
});

// v26 BP-DY (L383): the DynamoDB track's `dynoxide` pairs run through the runner the card page uses (dynamoRunner.run on the
// card's `setup`), on the real dynoxide wasm in Node; capacity is the engine's ConsumedCapacity, errors carry the exception name.
const node = (globalThis as unknown as { process: { getBuiltinModule(id: string): unknown } }).process;
const { readFile } = node.getBuiltinModule('fs/promises') as { readFile(p: string): Promise<Uint8Array<ArrayBuffer>> };
const { fileURLToPath } = node.getBuiltinModule('url') as { fileURLToPath(u: string): string };
describe('thẻ Best Practice DynamoDB: cặp chạy thật trên dynoxide', () => {
  let eng: DynamoEngine;
  beforeAll(async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    (globalThis as Record<string, unknown>).self ??= globalThis;
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      if (!url.startsWith('file:')) return realFetch(input, init);
      return new Response(await readFile(fileURLToPath(url)), { headers: { 'content-type': 'application/wasm' } });
    };
    eng = await DynamoEngine.open(() => import('@dynoxide/wasm-engine/worker'));
  }, 60_000);
  const client = { request: async (req: DynamoRequest, o: { dataset: string; after?: DynamoRequest }) => { await eng.setup(o.dataset, labOf(o.dataset)); return eng.run(req, o.after); } };
  const side = async (p: Pair, code: string): Promise<Side> => {
    try {
      const out = await dynamoRunner({ lang: () => 'en' }, client as never).run({ setup: p.setup, steps: [] }, code.trim());
      return { ...byName(out.columns, out.rows), ...(out.meta?.consumedCapacity !== undefined ? { cap: out.meta.consumedCapacity } : {}) };
    } catch (e) {
      const x = e as { type?: unknown; message?: string };
      return { columns: [], rows: [], error: { code: typeof x.type === 'string' ? x.type : undefined, message: x.message ?? String(e) } };
    }
  };
  const dy = released.filter((c) => c.pair.runtime === 'dynoxide');
  it('19 thẻ dynoxide, mọi thẻ DynamoDB khác là cú pháp', () => {
    expect(dy).toHaveLength(19);
    for (const c of released.filter((x) => x.track === 'dynamodb' && x.pair.runtime !== 'dynoxide')) expect([c.id, c.pair.runtime, c.pair.check]).toEqual([c.id, 'none', 'syntax']);
  });
  it.each(dy.map((c) => [c.id, c]))('%s: check của thẻ đúng trên dynoxide', async (_id, c) => {
    const p = c.pair;
    const [bad, good] = [await side(p, p.bad), await side(p, p.good)];
    expect([c.id, judge(p, bad, good)]).toEqual([c.id, expect.objectContaining({ ok: true })]);
  }, 60_000);
});
