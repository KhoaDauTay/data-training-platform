// @vitest-environment jsdom
// v10 V10-C (L157): the printable cheat sheet (N7), the "Việc bạn từng vấp" card (N6) and the task bar's progress line (A8).
import { afterAll, describe, expect, it } from 'vitest';
import axe from 'axe-core';
import { loadTickets } from '../src/content';
import { setLang } from '../src/i18n';
import { ATTEMPTS_KEY } from '../src/insights';
import { SKILLS } from '../src/progress';
import { app } from '../src/state';
import { cheatSheet } from '../src/ui/notebook';
import { chapterLine } from '../src/ui/mapStrip';
import { stumbleCard } from '../src/ui/modes';

afterAll(() => setLang('vi'));

describe('thẻ tra cứu in được (N7)', () => {
  const learned = new Set(['select', 'where', 'group_by']);

  it('chỉ kỹ năng đã học, mỗi kỹ năng có nhãn, cú pháp, bẫy; ẩn trên màn hình, chỉ hiện khi in', async () => {
    for (const lang of ['vi', 'en'] as const) {
      await setLang(lang);
      const el = cheatSheet(lang, SKILLS, learned);
      const own = SKILLS.filter((s) => learned.has(s.id));
      expect(el.querySelectorAll('article')).toHaveLength(own.length);
      for (const s of own) {
        expect(el.textContent).toContain(s.label[lang]);
        expect(el.textContent).toContain(s.syntax);
        expect(el.textContent).toContain(s.trap[lang]);
      }
      const other = SKILLS.find((s) => !learned.has(s.id))!;
      expect(el.textContent).not.toContain(other.label[lang]);
      expect(el.className.split(' ')).toEqual(expect.arrayContaining(['hidden', 'print:block', 'text-black', 'bg-white']));
      expect(el.querySelector('h1')?.textContent).toBe(lang === 'vi' ? 'Thẻ tra cứu SQL · BoonData' : 'SQL cheat sheet · BoonData');
    }
  });

  it('mọi kỹ năng đã học: đủ 38 thẻ, cú pháp chỉ trên bảng lab (không bảng domain)', () => {
    const el = cheatSheet('vi', SKILLS, new Set(SKILLS.map((s) => s.id)));
    expect(el.querySelectorAll('article')).toHaveLength(SKILLS.length);
    expect(el.textContent).not.toMatch(/\b(shipments|ports|customers_ecom|loans)\b/);
  });
});

describe('đường tiến độ thanh việc (A8)', () => {
  const ch = loadTickets().filter((x) => x.chapter === 1);

  it('chưa xong gì: không có đường; xong việc k: tới nút kế; xong hết: tới nút cuối', () => {
    expect(chapterLine(ch, new Set())).toEqual({ n: ch.length, to: 0 });
    expect(chapterLine(ch, new Set([ch[0].id]))).toEqual({ n: ch.length, to: 1 });
    expect(chapterLine(ch, new Set(ch.slice(0, 3).map((x) => x.id)))).toEqual({ n: ch.length, to: 3 });
    expect(chapterLine(ch, new Set(ch.map((x) => x.id)))).toEqual({ n: ch.length, to: ch.length - 1 });
  });
});

describe('thẻ "Việc bạn từng vấp" (N6)', () => {
  it('trống khi không có việc vấp; có thì liệt kê, nút tên rõ, không lỗi axe', async () => {
    await setLang('vi');
    app.tickets = loadTickets();
    app.save.completed = app.tickets.slice(0, 5).map((x) => x.id); // ch1-01..ch1-04 + the review
    localStorage.removeItem(ATTEMPTS_KEY);
    expect(stumbleCard()).toBeNull();
    const [a, b, , , boss] = app.tickets;
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify({
      [a.id]: { runs: 3, submits: 5, passedOn: 5 }, [b.id]: { runs: 1, submits: 2, passedOn: 2 }, [boss.id]: { runs: 9, submits: 9, passedOn: 9 },
    }));
    const card = stumbleCard()!;
    expect(card).not.toBeNull();
    const buttons = card.querySelectorAll('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0].getAttribute('aria-label')).toBe(`Làm lại: ${a.title} (nộp sai 4 lần trước khi đạt)`);
    document.body.replaceChildren(h1(), card);
    const r = await axe.run(document.body, { rules: { 'color-contrast': { enabled: false } } });
    expect(r.violations.map((v) => v.id)).toEqual([]);
  });
});

function h1(): HTMLElement {
  const main = document.createElement('main');
  main.append(Object.assign(document.createElement('h1'), { textContent: 'Luyện SQL' }));
  return main;
}
