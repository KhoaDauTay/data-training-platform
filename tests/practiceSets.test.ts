import { describe, expect, it } from 'vitest';
import { generalNow } from '../src/content';
import { FIX_ID, type Drill } from '../src/general';
import { compareResults } from '../src/grader';
import { MIX_MAX, MIX_MIN, mixedSet, pickRound } from '../src/learn';
import { PARTS } from '../src/progress';
import { DRILL_ID } from '../src/save';
import { learnText } from '../src/i18n/learn';
import { ANSWER_WORDS, codeSpans, drillRules, labRun, prose, VI_DIACRITIC } from './generalRules';

/** v47 P2/P3/P6 (L920–L929): Fix the broken query, Mixed review per Part, Explain this query. */
const g = generalNow()!;
const bilingual = (b: { vi: string; en: string }): void => {
  expect(codeSpans(b.en)).toEqual(codeSpans(b.vi));
  expect(prose(b.en)).not.toMatch(VI_DIACRITIC);
};

describe('Sửa câu lỗi (fix.yml)', () => {
  it('24 mục, id g-fix-NN (chạy trên lab như drill), ≥ 15 loại lỗi khác nhau, không lẫn vào drills/bySkill', () => {
    expect(g.fix).toHaveLength(24);
    for (const d of g.fix) {
      expect(d.id).toMatch(FIX_ID);
      expect(d.id).toMatch(DRILL_ID);
      expect(g.byId.get(d.id)).toBe(d);
      expect(d.kind).toBe('fix');
    }
    expect(new Set(g.fix.map((d) => d.bug)).size).toBeGreaterThanOrEqual(15);
    expect(g.drills.some((d) => FIX_ID.test(d.id))).toBe(false);
  });

  it.each(g.fix)('$id: đề không nói từ khóa SQL ngoài backtick; đề, gợi ý, why: code span VI = EN, EN không dấu', (d) => {
    for (const l of ['vi', 'en'] as const) expect(prose(d.task[l])).not.toMatch(ANSWER_WORDS);
    for (const b of [d.task, d.hint, d.why!]) bilingual(b);
  });

  // Solution chạy (1–500 dòng), starter (câu lỗi) báo lỗi hoặc ra kết quả khác Solution, không CURRENT_DATE/now()
  drillRules(g.fix);
});

describe('Giải thích câu này (explain.yml)', () => {
  it('16 mục, đúng 4 phương án, đáp án 0–3, đáp án trải đều; phương án đúng không dài nhất', () => {
    expect(g.explain).toHaveLength(16);
    const at = [0, 0, 0, 0];
    for (const x of g.explain) {
      expect(x.options).toHaveLength(4);
      at[x.answer]++;
      for (const l of ['vi', 'en'] as const) {
        const len = x.options.map((o) => o.text[l].length);
        expect(len[x.answer], `${x.id} ${l}`).toBeLessThan(Math.max(...len.filter((_, i) => i !== x.answer)));
      }
    }
    for (const n of at) expect(n).toBeGreaterThanOrEqual(3);
  });

  it.each(g.explain)('$id: câu hỏi, phương án, why: code span VI = EN, EN không dấu; không CURRENT_DATE', (x) => {
    for (const b of [x.q, ...x.options.flatMap((o) => [o.text, o.why])]) bilingual(b);
    for (const sql of [x.sql, ...x.options.map((o) => o.sql)]) expect(sql).not.toMatch(/CURRENT_DATE|now\(\)/i);
  });

  it.each(g.explain)('$id: chạy trên lab: phương án đúng ra cùng kết quả, mỗi phương án sai ra kết quả khác', async (x) => {
    const run = await labRun();
    const shown = await run(x.sql);
    expect(shown.rows.length).toBeGreaterThanOrEqual(1);
    expect(shown.rows.length).toBeLessThanOrEqual(500);
    for (const [i, o] of x.options.entries()) {
      const r = await run(o.sql);
      expect(compareResults(shown, r, x.ordered).ok, `${x.id} option ${i}`).toBe(i === x.answer);
    }
  });
});

describe('Đề trộn theo Phần (mixedSet)', () => {
  const rnds = [0.1, 0.5, 0.9].map((seed) => {
    let s = seed;
    return () => (s = (s * 9301 + 49297) % 233280 / 233280);
  });
  it.each(PARTS.map((p) => [p.n, p] as const))('Phần %i: 6–8 bài, mọi kỹ năng có mặt, không trùng, hai bài kề nhau khác kỹ năng', (_, p) => {
    for (const rnd of rnds) {
      const set = mixedSet(p.skills, g.bySkill, rnd);
      expect(set.length).toBeGreaterThanOrEqual(MIX_MIN);
      expect(set.length).toBeLessThanOrEqual(MIX_MAX);
      expect(new Set(set.map((i) => i.ticketId)).size).toBe(set.length);
      expect(new Set(set.flatMap((i) => i.skills))).toEqual(new Set(p.skills));
      for (const [k, it2] of set.entries()) {
        const d = g.byId.get(it2.ticketId) as Drill;
        expect(d.skill).toBe(it2.skills[0]);
        if (k > 0) expect(it2.skills[0]).not.toBe(set[k - 1].skills[0]);
      }
    }
  });

  it('pickRound: chưa gặp trước, đủ n, không trùng', () => {
    const items = ['a', 'b', 'c', 'd'].map((id) => ({ id }));
    const r = pickRound(items, 3, new Set(['a', 'b']), rnds[0]);
    expect(r.slice(0, 2).map((x) => x.id).sort()).toEqual(['c', 'd']);
    expect(new Set(r.map((x) => x.id)).size).toBe(3);
  });
});

describe('chữ giao diện (learn.ts)', () => {
  it('các khóa mới có ở VI và EN', () => {
    for (const k of ['sets.fixTitle', 'sets.mixTitle', 'sets.explainTitle', 'drill.kind.fix', 'sets.why'] as const) {
      expect(learnText('vi', 'vi-VN', k)).not.toBe(k);
      expect(learnText('en', 'en-GB', k)).not.toBe(k);
    }
  });
});
