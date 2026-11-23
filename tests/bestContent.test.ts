// BP-T (v24, L345): Best Practice cards (product-design-best-practice §4.3). Every card parses (all 130: the hidden MongoDB and
// DynamoDB tracks too); every released card's pair runs on real PGlite and shows what its `check` claims, through the same
// judge() the page uses. `lab` pairs run on the seeded `lab` schema in BEGIN … ROLLBACK; `engine`/`engine-hb` pairs run each
// side as its own script on a fresh database (runLabScript), so P05 (CREATE INDEX CONCURRENTLY) and S04 (inserts) start clean.
import { describe, expect, it } from 'vitest';
import { parse as yaml } from 'yaml';
import { generalNow } from '../src/content';
import { SKILLS } from '../src/progress';
import {
  cardProblems, explainOf, judge, needsPlan, parseBestCard, parseHabits, parseTracks, planScan, RELEASED, sideOf, sideScript,
  type BpCard, type Pair, type Side,
} from '../src/engine/best';
import { codeOf } from '../src/engine/content';
import { codeOf as bpCodeOf } from '../src/engine/best';
import { runLabScript, splitSql } from '../src/engine/pglab/session';
import { sqlErrorInfo } from '../src/db/run';
import { labRun } from './generalRules';
import * as sources from '../src/bestSources';

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

describe('thẻ Best Practice: cấu trúc (130 thẻ, cả track chưa phát hành)', () => {
  it('130 thẻ, id duy nhất; v24 phát hành đúng 60 (SQL 30 + PostgreSQL 30)', () => {
    expect(cards).toHaveLength(130);
    expect(new Set(cards.map((c) => c.id)).size).toBe(130);
    expect(released.filter((c) => c.track === 'sql')).toHaveLength(30);
    expect(released.filter((c) => c.track === 'postgres')).toHaveLength(30);
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
    expect(shown.map((t) => t.id)).toEqual(['sql', 'postgres']);
    const ids = new Set(released.map((c) => c.id));
    for (const t of shown) for (const g of t.gallery) expect([t.id, g, ids.has(g)]).toEqual([t.id, g, true]);
    expect(shown[0].gallery.length).toBeGreaterThanOrEqual(8);
  });

  it('index (bpindex) chỉ chứa thẻ đã phát hành; thẻ MongoDB/DynamoDB không vào bundle', () => {
    const paths = Object.keys(sources.meta);
    expect(paths).toHaveLength(60);
    expect(paths.every((p) => /\/best\/(sql|postgres)\//.test(p))).toBe(true);
    expect(sources.full.mongodb).toBeUndefined();
    expect(sources.full.dynamodb).toBeUndefined();
    for (const [p, s] of Object.entries(sources.meta)) expect(parseBestCard(s, p)).toEqual(expect.objectContaining({ id: expect.stringMatching(/^e-bp-[qasipx]\d\d$/) }));
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

describe('thẻ Best Practice: cặp Không nên / Nên chạy thật (60 thẻ phát hành)', () => {
  const runnable = released.filter((c) => c.pair.runtime !== 'none');
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
