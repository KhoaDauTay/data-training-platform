import { describe, expect, it } from 'vitest';
import { generalNow, loadDomain, loadLessons, loadTickets } from '../src/content';
import { DOMAINS, DOMAIN_SCHEMA } from '../src/domains';
import { en } from '../src/i18n/en';
import { vi } from '../src/i18n/vi';
import { chaptersOf } from '../src/progress';
import { LEARN_DICT } from '../src/i18n/learn';
import { appliesIn } from '../src/learn';
import { SKILLS } from '../src/progress';
import { learnAdvOf, learnModuleOf, learnSkillOf, parseRoute } from '../src/route';

/** Plan 8a Task 12 (D8a-15): every General path leads to content, and nothing on it says "later". */
const g = generalNow()!;
const tickets = loadTickets();
const sources = import.meta.glob('../src/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

describe('không ngõ cụt trên phần Chung', () => {
  it('mọi kỹ năng (38): bài học, 4 drill, ít nhất một chương "Áp dụng ở"', () => {
    expect(SKILLS).toHaveLength(38);
    for (const s of SKILLS) {
      expect([s.id, loadLessons().has(s.id)]).toEqual([s.id, true]);
      expect([s.id, g.bySkill.get(s.id)?.length]).toEqual([s.id, 4]);
      expect([s.id, appliesIn(tickets, s.id).length > 0]).toEqual([s.id, true]);
    }
  });

  it('mọi nút in|partial: bài học, ≥ 3 drill, đúng 1 thử thách; mọi nút có nhóm A–D (hiện ở #/learn) và needs có thật', () => {
    const ids = new Set([...SKILLS.map((s) => s.id), ...g.nodes.map((n) => n.id)]);
    for (const n of g.nodes) {
      expect(['A', 'B', 'C', 'D']).toContain(n.group);
      for (const x of n.needs) expect([n.id, x, ids.has(x)]).toEqual([n.id, x, true]);
      if (n.status === 'external') {
        expect(n.links.length).toBeGreaterThan(0);
        continue;
      }
      expect([n.id, !!n.lesson]).toEqual([n.id, true]);
      expect(n.drills.length).toBeGreaterThanOrEqual(3);
      expect(n.drills.filter((d) => d.kind === 'challenge')).toHaveLength(1);
    }
  });

  it('mọi route trang Chung ra đúng trang (không rơi về #/)', () => {
    for (let n = 1; n <= 12; n++) {
      expect(parseRoute(`#/learn/sql/${n}`)).toBe('learn');
      expect(learnModuleOf(`#/learn/sql/${n}`)).toBe(n);
    }
    for (const s of SKILLS) {
      expect(parseRoute(`#/learn/skill/${s.id}`)).toBe('learn');
      expect(learnSkillOf(`#/learn/skill/${s.id}`)).toBe(s.id);
    }
    expect(g.nodes).toHaveLength(28);
    for (const n of g.nodes) {
      expect(parseRoute(`#/learn/adv/${n.id}`)).toBe('learn');
      expect(learnAdvOf(`#/learn/adv/${n.id}`)).toBe(n.id);
    }
    expect(parseRoute('#/learn/interview')).toBe('learn'); // v17 I5 (L144)
  });

  it('không "đợt sau"/"sắp có"/"coming soon"/"later batch" trên đường Chung; khóa advSoon không còn', () => {
    const banned = /đợt sau|sắp có|coming soon|later batch/i;
    for (const lang of ['vi', 'en'] as const) for (const [k, v] of Object.entries(LEARN_DICT[lang])) expect([k, v]).not.toEqual([k, expect.stringMatching(banned)]);
    for (const f of ['../src/ui/learnView.ts', '../src/ui/drillBrief.ts', '../src/i18n/learn.ts', '../src/ui/interviewView.ts', '../src/i18n/interview.ts']) {
      expect(sources[f]).toBeTypeOf('string');
      expect([f, banned.test(sources[f])]).toEqual([f, false]);
    }
    expect(Object.keys(sources).length).toBeGreaterThan(50);
    for (const [f, src] of Object.entries(sources)) expect([f, src.includes('advSoon')]).toEqual([f, false]);
  });
});

describe('v14 T5: không còn trang "Sắp có"', () => {
  it('mọi domain sống, có schema riêng và mọi chương có việc', async () => {
    for (const d of DOMAINS) {
      expect([d.id, d.live]).toEqual([d.id, true]);
      expect(DOMAIN_SCHEMA[d.id]).toBeTruthy();
      await loadDomain(d.id);
      const own = loadTickets(d.id);
      const chapters = d.id === 'logistics' ? [] : chaptersOf(d.id); // Logistics: chapters with no tickets show "Sắp có" by design (home.status.soon)
      for (const c of chapters) expect([d.id, c.chapter, own.some((x) => x.chapter === c.chapter)]).toEqual([d.id, c.chapter, true]);
    }
  });
  it('khóa soon.* và financeSoon() đã gỡ; mô tả Finance không nói "đang thiết kế"', () => {
    for (const dict of [vi, en] as Record<string, unknown>[]) expect(Object.keys(dict).filter((k) => k.startsWith('soon.'))).toEqual([]);
    for (const [f, src] of Object.entries(sources)) expect([f, /financeSoon|soonDomainOf/.test(src)]).toEqual([f, false]);
    expect(vi['domain.financeDesc']).not.toMatch(/đang thiết kế|sắp có/i);
    expect(en['domain.financeDesc']).not.toMatch(/in design|coming soon/i);
  });
});

describe('General tách domain (L82)', () => {
  it('chữ của trang General không nhắc domain hay chương', () => {
    const bad = /logistics|e-?commerce|finance|chương|chapter|chợ lồng đèn|lantern|cargo/i;
    for (const lang of ['vi', 'en'] as const)
      for (const [k, v] of Object.entries(LEARN_DICT[lang])) expect([k, bad.test(v)]).toEqual([k, false]);
  });
});

it('nút nâng cao không nhắc domain (L82)', () => {
  const bad = /logistics|e-?commerce|finance|domain|chương \d|chapter \d/i;
  for (const n of generalNow()!.nodes)
    for (const lang of ['vi', 'en'] as const) expect([n.id, bad.test(`${n.applies?.[lang] ?? ''} ${n.why?.[lang] ?? ''}`)]).toEqual([n.id, false]);
});
