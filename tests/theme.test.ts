import { describe, expect, it } from 'vitest';
import { loadTickets } from '../src/content';
import { CHAPTERS } from '../src/progress';
import { CHAPTER_COLOR, chapterColor, cx, DEPT_COLOR, deptColor, initials } from '../src/theme';

describe('theme', () => {
  it('mỗi chương trong chapters.yml có một màu riêng', () => {
    const bars = CHAPTERS.map((c) => CHAPTER_COLOR[c.chapter]?.bar);
    expect(bars.every(Boolean)).toBe(true);
    expect(new Set(bars).size).toBe(CHAPTERS.length);
  });

  it('đủ 12 màu chương (curriculum §7.2), fill/stroke SVG khác nhau từng chương', () => {
    expect(Object.keys(CHAPTER_COLOR).map(Number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const all = Object.values(CHAPTER_COLOR);
    expect(new Set(all.map((c) => c.fill)).size).toBe(12);
    expect(new Set(all.map((c) => c.stroke)).size).toBe(12);
    expect(CHAPTER_COLOR[8].bar).toBe('bg-teal-500');
    expect(CHAPTER_COLOR[12].bar).toBe('bg-pink-500');
  });

  it('mọi phòng ban gửi ticket có màu nhãn; phòng/chương lạ dùng màu trung tính', () => {
    const depts = [...new Set(loadTickets().map((t) => t.from.dept))];
    expect(depts.filter((d) => !(d in DEPT_COLOR))).toEqual([]);
    expect(deptColor('Legal')).toContain('bg-slate-100');
    expect(chapterColor(99).bar).toBe('bg-slate-500');
  });

  it('mỗi màu trang trí có biến thể dark:', () => {
    for (const c of Object.values(CHAPTER_COLOR)) expect(c.chip).toContain('dark:');
    for (const d of Object.values(DEPT_COLOR)) expect(d).toContain('dark:');
  });

  it('cx bỏ phần rỗng', () => {
    expect(cx('a', false, null, undefined, '', 'b')).toBe('a b');
  });

  it('initials: chữ cái đầu của từ đầu và từ cuối', () => {
    expect(initials('Lê Bình')).toBe('LB');
    expect(initials('Nguyễn Văn Quang')).toBe('NQ');
    expect(initials('an')).toBe('A');
    expect(initials('   ')).toBe('');
  });

  it('src không ghép class bằng template literal hay mảnh tên (scanner Tailwind chỉ thấy tên nguyên vẹn)', () => {
    const sources = import.meta.glob<string>('../src/**/*.ts', { query: '?raw', import: 'default', eager: true });
    const bad = Object.entries(sources).flatMap(([file, src]) => src.split('\n')
      .map((line, i) => `${file.replace('../src/', '')}:${i + 1}: ${line.trim()}`)
      .filter((line) => /\bclass(Name)?\s*[:=]\s*`/.test(line) || /\b(bg|text|ring|border|from|via|to|fill|stroke)-\$\{/.test(line)));
    expect(Object.keys(sources).length).toBeGreaterThan(20);
    expect(bad).toEqual([]);
  });
});
