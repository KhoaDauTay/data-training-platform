import { describe, expect, it } from 'vitest';
import * as src from '../src/engineSources';
import { ENGINES, parseEngineLesson, treeOf, type EngineLesson } from '../src/engine/content';
import { afterLesson, DIVE, levelNext, minutesOf, PRACTICE, PREREQS, relatedLesson, termLesson } from '../src/engine/tracks';
import { parseGlossary, aliasesOf } from '../src/engine/glossary';
import { ROUTE_SKILLS, PARTS } from '../src/progress';
import { engineRouteOf, engineHash } from '../src/route';
import glossary from '../content/engine/glossary.yml';

/** v47 S2 (L940–L949): track data and the "next" rules of src/engine/tracks.ts. */
const lessons: EngineLesson[] = Object.entries(src.meta).map(([p, s]) => parseEngineLesson(s, p));
const flat = (e: (typeof ENGINES)[number]): EngineLesson[] => treeOf(e, lessons).levels.flatMap((l) => l.modules.flatMap((m) => m.lessons));
const ids = new Set(lessons.map((l) => l.id));

describe('bảng khóa học (I4)', () => {
  it('mỗi khóa có dòng điều kiện; Phần SQL có thật; khóa/cấp tiên quyết có bài', () => {
    for (const e of ENGINES) expect(PREREQS).toHaveProperty([e]);
    for (const p of Object.values(PREREQS).flat()) {
      if ('sql' in p) for (const n of p.sql) expect(PARTS.some((x) => x.n === n)).toBe(true);
      else expect(flat(p.engine).some((l) => l.level === p.to)).toBe(true);
    }
  });
  it('tổng thời gian = tổng minutes', () => {
    expect(minutesOf(flat('postgres'))).toBe(flat('postgres').reduce((a, l) => a + l.minutes, 0));
    expect(minutesOf(flat('postgres'))).toBeGreaterThan(60);
  });
});

describe('bước tiếp theo (I7)', () => {
  const pg = flat('postgres');
  const L1 = pg.filter((l) => l.level === 'L1');
  const cap = L1.find((l) => l.kind === 'capstone')!;
  it('bài kế chưa xong trong cấp', () => {
    expect(afterLesson(pg, L1[0], new Set())!.id).toBe(L1[1].id);
    expect(afterLesson(pg, L1[0], new Set([L1[1].id]))!.id).toBe(L1[2].id);
  });
  it('hết bài sau trong cấp → capstone chưa xong của cấp, rồi bài còn lại của cấp', () => {
    const last = L1[L1.length - 1];
    const okExceptCap = new Set(L1.filter((l) => l !== cap && l !== L1[0]).map((l) => l.id));
    expect(afterLesson(pg, last, okExceptCap)!.id).toBe(cap.id);
    okExceptCap.add(cap.id);
    expect(afterLesson(pg, last, okExceptCap)!.id).toBe(L1[0].id);
  });
  it('cấp xong → bài đầu cấp sau; khóa xong → undefined', () => {
    const ok = new Set(L1.map((l) => l.id));
    expect(afterLesson(pg, L1[L1.length - 1], ok)!.level).toBe('L2');
    expect(afterLesson(pg, pg[pg.length - 1], new Set(pg.map((l) => l.id)))).toBeUndefined();
  });
  it('trang cấp: bài đầu chưa xong của cấp, rồi cấp sau', () => {
    expect(levelNext(pg, 'L3', new Set())!.id).toBe(pg.find((l) => l.level === 'L3')!.id);
    expect(levelNext(pg, 'L1', new Set(L1.map((l) => l.id)))!.level).toBe('L2');
    expect(levelNext(pg, 'L5', new Set(pg.map((l) => l.id)))).toBeUndefined();
  });
  it('thẻ Best Practice: bài liên quan đầu tiên chưa xong', () => {
    expect(relatedLesson(['a', 'b'], new Set(['a']))).toBe('b');
    expect(relatedLesson(['a', 'b'], new Set(['a', 'b']))).toBe('a');
    expect(relatedLesson([], new Set())).toBeUndefined();
  });
  it('thuật ngữ → bài cùng engine và cấp có tên nhắc tới nó', () => {
    const terms = parseGlossary(glossary);
    const hits = terms.map((t) => termLesson([t.term, ...aliasesOf(t)], t.engines, t.level, lessons));
    for (const [i, l] of hits.entries()) if (l) {
      expect(terms[i].engines).toContain(l.engine);
      expect(l.level).toBe(terms[i].level);
      expect(engineRouteOf(engineHash(l.engine, l.level, l.id)).lesson).toBe(l.id);
    }
    expect(hits.filter(Boolean).length).toBeGreaterThan(20);
    expect(termLesson(['MVCC'], ['postgres'], 'L3', lessons)?.id).toBe('e-pg-l3-04');
  });
});

describe('liên kết chéo (I8)', () => {
  const skills = new Set(ROUTE_SKILLS.map((s) => s.id));
  it('Luyện thêm: id bài có thật, kỹ năng thuộc lộ trình SQL, nút a7/a10/c2 bị bỏ', () => {
    for (const [id, ss] of Object.entries(PRACTICE)) {
      expect(ids).toContain(id);
      for (const s of ss) expect([id, skills.has(s)]).toEqual([id, true]);
    }
    expect(PRACTICE['e-pg-l1-16']).toContain('upsert');
    expect(PRACTICE['e-pg-l4-17']).toEqual(expect.arrayContaining(['window_rank', 'window_lag', 'window_agg']));
  });
  it('Đào sâu: chỉ từ Thiết kế CSDL / Công cụ dữ liệu tới bài PostgreSQL có thật', () => {
    for (const [from, to] of Object.entries(DIVE)) {
      expect(ids).toContain(from);
      expect(from).toMatch(/^e-(ds|st|sm)-/);
      for (const id of to) { expect(ids).toContain(id); expect(id).toMatch(/^e-pg-l[1-5]-/); }
    }
  });
});
