import { describe, expect, it } from 'vitest';
import { loadTickets } from '../src/content';
import { CHAPTERS } from '../src/progress';
import { CHAPTER_COLOR, chapterColor, cx, DEPT, deptColor, thanksKey } from '../src/theme';
import css from '../src/style.css?raw';

/** WCAG 2.x relative luminance and contrast ratio. */
const lum = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string): number => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/** `--name: #rrggbb` pairs of one rule block of style.css. */
const tokens = (selector: string): Record<string, string> => {
  const body = css.split(`${selector} {`)[1]?.split('}')[0] ?? '';
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map((m) => [m[1], m[2]]));
};
/** Text colour on background, every pair the UI uses for words (v6 §2.3). --disabled is exempt (WCAG 1.4.3: inactive controls). */
const TEXT_PAIRS: [string, string][] = [
  ['text', 'panel'], ['text', 'bg'], ['text', 'code'], ['text', 'accent-soft'], ['text', 'sea'],
  ['muted', 'panel'], ['muted', 'bg'], ['muted', 'code'], ['muted', 'accent-soft'], ['muted', 'sea'],
  ['accent', 'panel'], ['accent', 'bg'], ['on-accent', 'accent'],
  ['good', 'panel'], ['bad', 'panel'], ['warn', 'panel'], ['good', 'bg'], ['bad', 'bg'], ['warn', 'bg'],
  ['sun-ink', 'sun'],
  ...['keyword', 'string', 'number', 'comment', 'operator', 'type', 'property', 'atom']
    .flatMap((s): [string, string][] => [[`syn-${s}`, 'panel'], [`syn-${s}`, 'code']]),
];

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
    expect(depts.filter((d) => !(d in DEPT))).toEqual([]);
    expect(deptColor('Legal')).toContain('bg-slate-100');
    expect(chapterColor(99).bar).toBe('bg-slate-500');
  });

  it('mỗi màu trang trí có biến thể dark:', () => {
    for (const c of Object.values(CHAPTER_COLOR)) expect(c.chip).toContain('dark:');
    for (const d of Object.values(DEPT)) expect(d.chip).toContain('dark:');
  });

  it('cx bỏ phần rỗng', () => {
    expect(cx('a', false, null, undefined, '', 'b')).toBe('a b');
  });

  it('src không ghép class bằng template literal hay mảnh tên (scanner Tailwind chỉ thấy tên nguyên vẹn)', () => {
    const sources = import.meta.glob<string>('../src/**/*.ts', { query: '?raw', import: 'default', eager: true });
    const bad = Object.entries(sources).flatMap(([file, src]) => src.split('\n')
      .map((line, i) => `${file.replace('../src/', '')}:${i + 1}: ${line.trim()}`)
      .filter((line) => /\bclass(Name)?\s*[:=]\s*`/.test(line) || /\b(bg|text|ring|border|from|via|to|fill|stroke)-\$\{/.test(line)));
    expect(Object.keys(sources).length).toBeGreaterThan(20);
    expect(bad).toEqual([]);
  });

  it('chữ trên nền ≥ 4,5:1 ở cả hai theme (WCAG AA, product-design-v6 §2.3)', () => {
    const light = tokens(':root');
    const dark = { ...light, ...tokens(':root[data-theme=dark]') };
    const bad = ([['light', light], ['dark', dark]] as const).flatMap(([name, tk]) => TEXT_PAIRS
      .filter(([fg, bg]) => !tk[fg] || !tk[bg] || ratio(tk[fg], tk[bg]) < 4.5)
      .map(([fg, bg]) => `${name} ${fg}/${bg} ${tk[fg] && tk[bg] ? ratio(tk[fg], tk[bg]).toFixed(2) : 'thiếu token'}`));
    expect(bad).toEqual([]);
  });

  it('token ấm của v6 (L57) và bo góc 20/14', () => {
    expect(tokens(':root')).toMatchObject({ bg: '#fbf7f0', accent: '#0f766e', sun: '#ffe9bd', 'sun-ink': '#5c3d00' });
    expect(tokens(':root[data-theme=dark]')).toMatchObject({ bg: '#1a1714', accent: '#5ed3c3', sun: '#4a3a17' });
    expect(css).toMatch(/--r-card:\s*20px;\s*--r-ctl:\s*14px;/);
  });
  it('A4 (v12.0): mọi nút cao tối thiểu 24 px (WCAG 2.5.8)', () => {
    expect(css).toMatch(/@layer base[\s\S]*button[^{]*\{[^}]*min-height:\s*1\.5rem/);
  });
});

describe('L1 (v12.0): lời cảm ơn', () => {
  it('mỗi phòng 4 câu khác nhau', () => {
    for (const [name, d] of Object.entries(DEPT)) expect(new Set(d.thanks).size, name).toBe(4);
  });
  it('cùng việc cùng câu; việc liền nhau khác câu, cả khi sang chương', () => {
    expect(thanksKey('Ops', 'ch3-02')).toBe(thanksKey('Ops', 'ch3-02'));
    for (let n = 1; n < 6; n++) expect(thanksKey('Ops', `ch3-0${n}`)).not.toBe(thanksKey('Ops', `ch3-0${n + 1}`));
    expect(thanksKey('Sales', 'ch3-05')).not.toBe(thanksKey('Sales', 'ch4-01'));
    expect(thanksKey('Sales', 'ch4-06')).not.toBe(thanksKey('Sales', 'ch5-01'));
    expect(thanksKey('Finance', 'ecom-ch2-03')).not.toBe(thanksKey('Finance', 'ecom-ch2-04'));
    expect(thanksKey('Finance', 'ecom-ch2-05')).not.toBe(thanksKey('Finance', 'ecom-ch3-01'));
    expect(thanksKey('Nobody', 'x')).toMatch(/^chat\.thanksOps/);
  });
});
