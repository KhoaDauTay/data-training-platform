import { describe, expect, it } from 'vitest';
import { generalNow, loadDomain, loadLessons, loadTicketTemplates } from '../src/content';
import { DOMAINS } from '../src/domains';
import { plainText, sentence } from '../src/ui/sqlWordsView';
import { applyVariant, variantsOf } from '../src/variants';
import { buildSteps, clauseRanges, runSteps } from '../src/viz/steps';
import { WORDS_ONLY } from '../src/viz/stepText';
import type { WordPart } from '../src/viz/sqlWords';

/** Every Solution of every domain (each variant, each review step) and every General drill and lesson answer. */
async function allSolutions(): Promise<[string, string][]> {
  const out: [string, string][] = [];
  for (const { id: d } of DOMAINS) {
    await loadDomain(d);
    for (const tk of loadTicketTemplates(d)) {
      const n = Math.max(1, variantsOf(tk).length);
      for (let v = 0; v < n; v++) applyVariant(tk, v).steps.forEach((s, i) => out.push([`${tk.id}#${i}/v${v}`, s.solution]));
    }
  }
  for (const dr of generalNow()!.drills) out.push([dr.id, dr.solution]);
  for (const [id, l] of loadLessons()) out.push([`lesson:${id}`, l.try.solution], [`lesson-ex:${id}`, l.example]);
  return out;
}

const DIACRITIC = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

describe('SQL bằng lời (V19-A, L162)', () => {
  it('mọi Solution: không ném, mỗi mệnh đề có trong SQL có đúng một đoạn trong câu, ca không hỗ trợ trả mã', async () => {
    const all = await allSolutions();
    expect(all.length).toBeGreaterThan(400);
    const problems: string[] = [];
    let described = 0;
    for (const [id, sql] of all) {
      const r = await buildSteps(sql);
      if (!r.ok) {
        // v26 R2: a write (Part 9 drills, their quick lessons) is not a SELECT; the line says it cannot be read in words
        if (r.reason !== 'withUnion' && r.reason !== 'window' && !(r.reason === 'notSelect' && /^\s*(INSERT|UPDATE|DELETE|MERGE|CREATE)\b/i.test(sql))) problems.push(`${id}: ${r.reason}`);
        continue;
      }
      described++;
      // Oracle: Postgres' scanner (clause keywords at depth 0), not the tree the words were built from.
      const keys = Object.keys(await clauseRanges(sql)).sort();
      const words = r.words.map((p) => p.k);
      if (words.join() !== [...new Set(words)].join()) problems.push(`${id}: clause twice ${words}`);
      if ([...words].sort().join() !== keys.join()) problems.push(`${id}: words ${words} ≠ clauses ${keys}`);
      for (const lang of ['vi', 'en'] as const) {
        const s = sentence(r.words, lang);
        const text = plainText(s);
        if (s.length !== r.words.length || /undefined|NaN|\[object/.test(text)) problems.push(`${id} ${lang}: ${text}`);
        if (lang === 'en' && DIACRITIC.test(text.replace(/'[^']*'/g, ''))) problems.push(`${id} en has VI words: ${text}`);
      }
    }
    expect(problems).toEqual([]);
    expect(described / all.length).toBeGreaterThan(0.65); // not a vacuous pass: 73 % read at L162 (the rest use WITH or a window)
  });

  it('một câu đầy đủ đọc đúng thứ tự (VI và EN)', async () => {
    const r = await buildSteps(`SELECT p.country, count(*) AS n FROM ports p LEFT JOIN shipments s ON s.pol_id = p.id
      WHERE p.country <> 'VN' AND s.status IN ('A', 'B') AND s.eta IS NOT NULL
      GROUP BY p.country HAVING count(*) > 5 ORDER BY n DESC, 1 LIMIT 10 OFFSET 5`);
    if (!r.ok) throw new Error(r.reason);
    expect(plainText(sentence(r.words, 'vi'))).toBe("lấy 2 cột (có tính đếm) từ ports p, nối thêm shipments s (giữ cả dòng không khớp), giữ dòng có p.country khác 'VN' và s.status thuộc một danh sách và s.eta có giá trị, nhóm theo p.country, chỉ giữ nhóm có count(…) lớn hơn 5, sắp theo n giảm dần, rồi p.country tăng dần, bỏ 5 dòng đầu rồi lấy 10 dòng");
    expect(plainText(sentence(r.words, 'en'))).toBe("takes 2 columns (computing a count) from ports p, left-joins shipments s (keeping rows with no match), keeps rows where p.country is not 'VN' and s.status is in a list and s.eta has a value, groups by p.country, keeps only groups where count(…) is above 5, sorts by n descending, then p.country ascending, skips 5 rows and takes 10");
  });

  it('WITH/UNION/window: mã lỗi, không có words', async () => {
    for (const q of ['WITH x AS (SELECT 1) SELECT * FROM x', 'SELECT 1 UNION SELECT 2', 'SELECT rank() OVER (ORDER BY code) FROM ports']) {
      const r = await buildSteps(q);
      expect(r.ok).toBe(false);
    }
  });

  it('NOT a = b đọc như a <> b; DISTINCT, BETWEEN, NOT LIKE, EXISTS', async () => {
    const r = await buildSteps(`SELECT DISTINCT name FROM ports WHERE NOT code = 'X' AND id BETWEEN 1 AND 9 AND name NOT LIKE 'A%' AND NOT EXISTS (SELECT 1 FROM ports q WHERE q.id = 0)`);
    if (!r.ok) throw new Error(r.reason);
    const where = r.words.find((p): p is WordPart & { k: 'where' } => p.k === 'where')!;
    expect(where.conds.map((c) => [c.op, 'not' in c && !!c.not])).toEqual([['ne', false], ['between', false], ['like', true], ['exists', true]]);
    expect(r.words.map((p) => p.k)).toEqual(['select', 'from', 'where', 'distinct']);
  });
});

describe('request chỉ-parse của dòng bằng lời', () => {
  it('WORDS_ONLY: không chạy truy vấn con nào (db rỗng vẫn trả words)', async () => {
    const noDb = {} as Parameters<typeof runSteps>[0]; // any query would throw
    const r = await runSteps(noDb, `${WORDS_ONLY}SELECT c.id FROM containers c, container_events e WHERE e.container_id = c.id LIMIT 5`);
    if (!r.ok) throw new Error(r.reason);
    expect(r.steps).toEqual([]);
    expect(r.words?.map((p) => p.k)).toEqual(['select', 'from', 'where', 'limit']);
    expect((await runSteps(noDb, `${WORDS_ONLY}WITH x AS (SELECT 1) SELECT * FROM x`)).ok).toBe(false);
  });

  it('`*` cùng cột khác: không đếm `*` như một cột', async () => {
    const r = await buildSteps('SELECT s.*, p.name FROM shipments s JOIN ports p ON p.code = s.pol');
    if (!r.ok) throw new Error(r.reason);
    expect(plainText(sentence(r.words, 'vi'))).toBe('lấy mọi cột (*) và thêm 1 cột từ shipments s, nối với ports p');
    const one = await buildSteps('SELECT * FROM ports');
    if (!one.ok) throw new Error(one.reason);
    expect(plainText(sentence(one.words, 'en'))).toBe('takes every column from ports');
  });
});
