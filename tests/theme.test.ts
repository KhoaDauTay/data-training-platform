import { describe, expect, it } from 'vitest';
import { loadDomain, loadTickets, loadTicketTemplates } from '../src/content';
import { peopleOf } from '../src/people';
import { CHAPTERS } from '../src/progress';
import { BTN_SUBMIT, CHAPTER_COLOR, chapterColor, cx, DEPT, deptColor, thanksKey } from '../src/theme';
import css from '../src/style.css?raw';

// Tailwind's palette (oklch), read from disk: Vitest turns other .css imports into '' and tsconfig has no Node types.
const nodeFs = 'node:fs';
const { readFileSync } = (await import(/* @vite-ignore */ nodeFs)) as { readFileSync(path: string, enc: 'utf8'): string };
const twTheme = readFileSync('node_modules/tailwindcss/theme.css', 'utf8');

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
  ['good', 'accent-soft'], // v21 U15: a learned skill link ✓ on the current chapter row
  ['sun-ink', 'sun'],
  // ui-ux-v7 T1 (L136): surface-2 (table head, kbd chip, inset) and the semantic soft backgrounds
  ['text', 'surface-2'], ['muted', 'surface-2'], ['accent', 'surface-2'], ['accent', 'accent-soft'],
  ...['good', 'bad', 'warn', 'info'].flatMap((k): [string, string][] => [['text', `${k}-soft`], ['muted', `${k}-soft`]]),
  ['good', 'good-soft'], ['bad', 'bad-soft'], ['warn', 'warn-soft'], ['accent', 'info-soft'], ['on-accent', 'bad'], ['on-accent', 'good'],
  ['info', 'panel'], ['info', 'bg'], ['info', 'info-soft'], ['info', 'surface-2'], // L238: --info (engine diagrams, recorded-result chips)
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

  it('ui-ux-v7 T1 (D-U8): src/ui không dùng lớp màu thô ngoài bảng màu (token hoặc theme.ts)', () => {
    const sources = import.meta.glob<string>('../src/ui/*.ts', { query: '?raw', import: 'default', eager: true });
    const ALLOW = new Set<string>([]); // avatar.ts draws with hex, not classes; add a file here only with a reason
    const bad = Object.entries(sources).filter(([f]) => !ALLOW.has(f.replace('../src/ui/', ''))).flatMap(([file, src]) => src.split('\n')
      .map((line, i) => `${file.replace('../src/', '')}:${i + 1}: ${line.trim()}`)
      .filter((line) => /\b(bg|text|ring|border|fill|stroke)-(emerald|rose|amber|slate|sky)-\d+/.test(line)));
    expect(Object.keys(sources).length).toBeGreaterThan(20);
    expect(bad).toEqual([]);
  });

  it('ui-ux-v7 T1: Nộp là nút chính --accent ở cả hai theme', () => {
    expect(BTN_SUBMIT.split(' ')).toContain('bg-accent');
    expect(BTN_SUBMIT).not.toMatch(/emerald/);
  });

  it('chữ trên nền ≥ 4,5:1 ở cả hai theme (WCAG AA, product-design-v6 §2.3)', () => {
    const light = tokens(':root');
    const dark = { ...light, ...tokens(':root[data-theme=dark]') };
    const bad = ([['light', light], ['dark', dark]] as const).flatMap(([name, tk]) => TEXT_PAIRS
      .filter(([fg, bg]) => !tk[fg] || !tk[bg] || ratio(tk[fg], tk[bg]) < 4.5)
      .map(([fg, bg]) => `${name} ${fg}/${bg} ${tk[fg] && tk[bg] ? ratio(tk[fg], tk[bg]).toFixed(2) : 'thiếu token'}`));
    expect(bad).toEqual([]);
  });

  it('L132: vòng cổ, đai và bóng giai đoạn sau ≥ 3:1 (đồ họa, WCAG 1.4.11) ở cả hai theme', () => {
    const light = tokens(':root');
    const dark = { ...light, ...tokens(':root[data-theme=dark]') };
    for (const [name, tk] of [['light', light], ['dark', dark]] as const) {
      for (const fg of ['lily-collar', 'lily-harness', ...[1, 2, 3, 4, 5, 6].map((n) => `lily-acc${n}`)]) { // L134 P3 palette
        for (const bg of ['lily-fur', 'bg', 'panel']) expect(ratio(tk[fg], tk[bg]), `${name} ${fg}/${bg}`).toBeGreaterThanOrEqual(3);
      }
    }
    // the silhouette is the figure in black (light) or white (dark) at the .lily-shadow-fig opacity, over --panel
    const mix = (fg: number, a: number, bg: string) => `#${[1, 3, 5].map((i) => Math.round(fg * a + parseInt(bg.slice(i, i + 2), 16) * (1 - a)).toString(16).padStart(2, '0')).join('')}`;
    const alpha = (sel: string) => Number(css.split(`${sel} { filter:`)[1]?.match(/opacity\(([\d.]+)\)/)?.[1]);
    expect(ratio(mix(0, alpha('.lily-shadow-fig'), light.panel), light.panel)).toBeGreaterThanOrEqual(3);
    expect(ratio(mix(255, alpha(':root[data-theme=dark] .lily-shadow-fig'), dark.panel), dark.panel)).toBeGreaterThanOrEqual(3);
  });

  it('ui-ux-v7 K1: theme tối dễ đọc: chữ thân ≥ 7:1 trên mọi bề mặt, chữ mờ ≥ 7:1, mã ≥ 7:1, viền điều khiển ≥ 3:1', () => {
    const dark = { ...tokens(':root'), ...tokens(':root[data-theme=dark]') };
    const SURFACES = ['bg', 'panel', 'code', 'surface-2', 'accent-soft', 'good-soft', 'bad-soft', 'warn-soft', 'info-soft', 'sea'];
    const need: [string, string, number][] = [
      ...SURFACES.flatMap((b): [string, string, number][] => [['text', b, 7], ['muted', b, 7]]),
      ['text', 'bg', 10], ['text', 'panel', 10], ['sun-ink', 'sun', 7], ['muted', 'sun', 4.5],
      ...['accent', 'good', 'bad', 'warn'].flatMap((f): [string, string, number][] => [[f, 'bg', 7], [f, 'panel', 7]]),
      ...['keyword', 'string', 'number', 'comment', 'operator', 'type', 'property', 'atom']
        .flatMap((k): [string, string, number][] => [[`syn-${k}`, 'panel', 7], [`syn-${k}`, 'code', 7]]),
      ['border-strong', 'bg', 3], ['border-strong', 'panel', 3],
    ];
    const bad = need.filter(([f, b, min]) => !dark[f] || !dark[b] || ratio(dark[f], dark[b]) < min)
      .map(([f, b, min]) => `${f}/${b} ${dark[f] && dark[b] ? ratio(dark[f], dark[b]).toFixed(2) : 'thiếu'} < ${min}`);
    expect(bad).toEqual([]);
  });

  it('v30.2 (L500): theme sáng tách vùng rõ và chữ phụ ≥ 7:1; chữ nhỏ nhất 13 px', () => {
    const light = tokens(':root');
    const need: [string, string, number][] = [
      ['muted', 'bg', 7], ['muted', 'panel', 7], ['muted', 'surface-2', 6], ['muted', 'code', 6],
      ['border', 'bg', 1.45], ['border', 'panel', 1.55], // card and row edges (ring-line) on the page and inside a card
      ['border-strong', 'bg', 2], ['border-strong', 'panel', 2.2],
      ['surface-2', 'panel', 1.15], ['code', 'panel', 1.18], ['code', 'bg', 1.1], // inset and code block inside a card / on the page
    ];
    const bad = need.filter(([f, b, min]) => ratio(light[f], light[b]) < min).map(([f, b, min]) => `${f}/${b} ${ratio(light[f], light[b]).toFixed(2)} < ${min}`);
    expect(bad).toEqual([]);
    const dark = { ...light, ...tokens(':root[data-theme=dark]') };
    expect(ratio(dark['surface-2'], dark.panel)).toBeGreaterThanOrEqual(1.18); // dark inset inside a card
    expect(css).toMatch(/--text-caption:\s*0\.8125rem;/);
    expect(css).toMatch(/pre\.sql \{[^}]*font-size: 14px/);
  });

  it('token ấm của v6 (L57) và bo góc 20/14', () => {
    expect(tokens(':root')).toMatchObject({ bg: '#fbf7f0', accent: '#0f766e', sun: '#ffe9bd', 'sun-ink': '#5c3d00' });
    expect(tokens(':root[data-theme=dark]')).toMatchObject({ bg: '#131110', accent: '#62dccb', sun: '#43350f' }); // K1 (L136)
    expect(css).toMatch(/--r-card:\s*20px;\s*--r-ctl:\s*14px;/);
  });
  it('A4 (v12.0): mọi nút cao tối thiểu 24 px (WCAG 2.5.8)', () => {
    expect(css).toMatch(/@layer base[\s\S]*button[^{]*\{[^}]*min-height:\s*1\.5rem/);
  });
});

describe('v14 T3: phòng Risk và Collections (Finance)', () => {
  // Tailwind v4 sRGB fallbacks of the chip colours (light: -100 bg / -800 text; dark: -950 bg / -200 text).
  const HEX: Record<string, string> = {
    'red-100': '#ffe2e2', 'red-800': '#9f0712', 'red-950': '#460809', 'red-200': '#ffc9c9',
    'indigo-100': '#e0e7ff', 'indigo-800': '#372aac', 'indigo-950': '#1e1a4d', 'indigo-200': '#c6d2ff',
  };
  it.each(['Risk', 'Collections'])('%s: nhãn có màu riêng, chữ ≥ 4,5:1 ở cả hai theme', (name) => {
    const chip = DEPT[name]?.chip ?? '';
    const [bg, text, darkBg, darkText] = [...chip.matchAll(/(?:bg|text)-(\w+-\d+)/g)].map((m) => HEX[m[1]]);
    expect([bg, text, darkBg, darkText].every(Boolean), chip).toBe(true);
    expect(ratio(text, bg)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(darkText, darkBg)).toBeGreaterThanOrEqual(4.5);
  });
  it('mọi phòng gửi việc hay có người ở Finance và E-com có màu nhãn', async () => {
    await Promise.all([loadDomain('finance'), loadDomain('ecommerce')]);
    const depts = (['finance', 'ecommerce'] as const).flatMap((d) => [...loadTicketTemplates(d).map((t) => t.from.dept), ...peopleOf(d).map((p) => p.dept)]);
    expect(depts.filter((d) => !(d in DEPT))).toEqual([]);
    expect(depts).toContain('Risk');
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

describe('FIX-1 (L147, ui-ux-v7 P1 leftovers): type steps, shadow tokens, chip/avatar/scene contrast', () => {
  const sources = import.meta.glob<string>(['../src/**/*.ts', '../index.html'], { query: '?raw', import: 'default', eager: true });

  it('no text-lg…3xl (named steps by role: title / heading / display) and no Tailwind shadow sizes (--shadow-1 / --shadow-2)', () => {
    const bad = Object.entries(sources).flatMap(([file, src]) => src.split('\n')
      .map((line, i) => `${file.replace('../', '')}:${i + 1}: ${line.trim()}`)
      .filter((line) => /(?<=[\s'"`:])(text-(lg|xl|2xl|3xl)|shadow-(sm|md|lg|xl|2xl))(?=[\s'"`])/.test(line)));
    expect(bad).toEqual([]);
  });

  /** Tailwind v4's palette is oklch: converted to sRGB hex (clipped), so every chip pair is checked, not a hand-typed table. */
  function oklchHex(L: number, C: number, h: number): string {
    const a = C * Math.cos((h * Math.PI) / 180);
    const b = C * Math.sin((h * Math.PI) / 180);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const lin = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
    return `#${lin.map((c) => Math.min(1, Math.max(0, c))).map((c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055))
      .map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('')}`;
  }
  const PALETTE: Record<string, string> = Object.fromEntries([...twTheme
    .matchAll(/--color-([a-z]+-\d+):\s*oklch\(([\d.]+)%\s+([\d.]+)\s+([\d.]+)\)/g)]
    .map((m) => [m[1], oklchHex(Number(m[2]) / 100, Number(m[3]), Number(m[4]))]));
  const pick = (cls: string, re: RegExp): string => PALETTE[cls.match(re)?.[1] ?? ''];
  const LIGHT_TEXT = /(?<!dark:)\btext-(\w+-\d+)/;
  const DARK_TEXT = /dark:text-(\w+-\d+)/;
  const light = tokens(':root');
  const dark = { ...light, ...tokens(':root[data-theme=dark]') };

  it("the oklch converter matches Tailwind's own sRGB values (±3 per channel)", () => {
    const KNOWN = { 'red-100': '#ffe2e2', 'red-800': '#9f0712', 'red-950': '#460809', 'indigo-800': '#372aac', 'indigo-200': '#c6d2ff', 'indigo-950': '#1e1a4d' };
    for (const [k, hex] of Object.entries(KNOWN)) {
      for (const i of [1, 3, 5]) expect(Math.abs(parseInt(PALETTE[k].slice(i, i + 2), 16) - parseInt(hex.slice(i, i + 2), 16)), `${k} ${PALETTE[k]} vs ${hex}`).toBeLessThanOrEqual(3);
    }
  });

  it('every chapter and department chip (and the neutral ones) ≥ 4.5:1 in both themes; chapter text colour on bg/panel too', () => {
    const chips = [...Object.entries(CHAPTER_COLOR).map(([n, c]) => [`chapter ${n}`, c.chip]), ['chapter ?', chapterColor(99).chip],
      ...Object.entries(DEPT).map(([n, d]) => [n, d.chip]), ['dept ?', deptColor('nobody')]];
    const bad: string[] = [];
    for (const [name, chip] of chips) {
      const pairs = { light: [pick(chip, LIGHT_TEXT), pick(chip, /(?<!dark:)\bbg-(\w+-\d+)/)], dark: [pick(chip, DARK_TEXT), pick(chip, /dark:bg-(\w+-\d+)/)] };
      for (const [th, [fg, bg]] of Object.entries(pairs)) if (!fg || !bg || ratio(fg, bg) < 4.5) bad.push(`${name} ${th} ${fg}/${bg}`);
    }
    for (const [n, c] of Object.entries(CHAPTER_COLOR)) {
      for (const bg of ['bg', 'panel']) {
        if (ratio(pick(c.text, LIGHT_TEXT), light[bg]) < 4.5) bad.push(`chapter ${n} text light on ${bg}`);
        if (ratio(pick(c.text, DARK_TEXT), dark[bg]) < 4.5) bad.push(`chapter ${n} text dark on ${bg}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('colleague portraits (X1, L164): shirt vs backdrop ≥ 3:1 (WCAG 1.4.11 graphics); eyes, outline and black hair vs every skin token ≥ 3:1 in both themes', () => {
    const src = sources['../src/ui/avatar.ts'];
    const ink = src.match(/const INK = '(#[0-9a-f]{6})'/)![1];
    const skinKeys = [...src.match(/const SKIN[^{]*\{([^}]*)\}/)![1].matchAll(/var\(--(pp-skin-\w+)\)/g)].map((m) => m[1]);
    expect(skinKeys).toHaveLength(4);
    const bad = Object.entries(DEPT).filter(([, d]) => ratio(d.shirt, d.backdrop) < 3).map(([n, d]) => `${n} shirt ${d.shirt}/${d.backdrop} ${ratio(d.shirt, d.backdrop).toFixed(2)}`);
    for (const [theme, tk] of [['light', light], ['dark', dark]] as const) {
      for (const k of skinKeys) {
        expect(tk[k], `${theme} ${k}`).toMatch(/^#/);
        if (ratio(ink, tk[k]) < 3) bad.push(`${theme} eyes ${ink} on ${k} ${tk[k]} ${ratio(ink, tk[k]).toFixed(2)}`);
      }
      // the face outline reads against the lightest skin, and the outline against every backdrop
      if (ratio(tk['pp-line'], tk['pp-skin-light']) < 3) bad.push(`${theme} pp-line on pp-skin-light`);
      for (const [n, d] of Object.entries(DEPT)) if (ratio(tk['pp-line'], d.backdrop) < 3) bad.push(`${theme} pp-line on ${n} backdrop`);
    }
    expect(bad).toEqual([]);
  });

  it('scene text: map labels (open, locked, head office) ≥ 4.5:1 on their halo or map background, read from the art sources', () => {
    const bad: string[] = [];
    for (const f of ['logistics', 'finance', 'ecommerce']) {
      const src = sources[`../src/art/${f}.ts`];
      const labels = [...src.matchAll(/'(fill-\w+-\d+ dark:fill-\w+-\d+)'/g)].map((m) => m[1])
        .filter((cls, i, all) => all.indexOf(cls) === i && src.split('\n').some((line) => line.includes(cls) && /s\('text'|_TEXT =/.test(line)));
      expect(labels.length, f).toBeGreaterThan(0);
      // behind a label: the halo (Logistics, Finance) or the E-com map's sea rect and coast (it has no halo)
      const behind = f === 'ecommerce'
        ? [...src.matchAll(/class: '(fill-\w+-\d+) (dark:fill-\w+-\d+)' \}\)/g)].slice(0, 2).map((m) => [PALETTE[m[1].slice(5)], PALETTE[m[2].slice(10)]])
        : [[light['map-halo'], dark['map-halo']]];
      for (const cls of labels) {
        const [, l, d] = cls.match(/fill-(\w+-\d+) dark:fill-(\w+-\d+)/)!;
        for (const [bgL, bgD] of behind) {
          if (ratio(PALETTE[l], bgL) < 4.5) bad.push(`${f} ${cls} light on ${bgL} ${ratio(PALETTE[l], bgL).toFixed(2)}`);
          if (ratio(PALETTE[d], bgD) < 4.5) bad.push(`${f} ${cls} dark on ${bgD} ${ratio(PALETTE[d], bgD).toFixed(2)}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
