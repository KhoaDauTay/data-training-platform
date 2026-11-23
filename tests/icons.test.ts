import { describe, expect, it } from 'vitest';
import iconMap from '../scripts/icon-map.json';
import iconCustom from '../scripts/icon-custom.json';
import { ICON_DATA } from '../src/ui/iconData';
import { ROUTE_SKILLS as SKILLS } from '../src/progress'; // v25 R1: + the General-only skills (skills-general.yml)
import { KPIS } from '../src/home';
import { DOMAINS } from '../src/domains';
import { ICON_NAMES, iconPaths, isIconName, NAV_ICON, SKILL_ICON, skillIconName } from '../src/ui/icons';

const uiSources = import.meta.glob('../src/ui/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

describe('icon kỹ năng và KPI (ui-ux-v3 §e, §c)', () => {
  it('mọi id trong skills.yml có icon riêng (không dùng fallback)', () => {
    expect(SKILLS.length).toBeGreaterThan(0);
    expect(SKILLS.filter((s) => !(s.id in SKILL_ICON)).map((s) => s.id)).toEqual([]);
    const names = SKILLS.map((s) => skillIconName(s.id));
    expect(names).not.toContain('puzzle');
    expect(new Set(names).size).toBe(names.length); // look-alike pairs (join / left_join / anti_join …) differ too
  });

  it('không hai icon kỹ năng nào cùng path data (L43: họ JOIN, GROUP BY/HAVING phải khác hẳn)', () => {
    const drawn = new Map<string, string>();
    const dupes = Object.entries(SKILL_ICON).flatMap(([id, name]) => {
      const key = JSON.stringify(iconPaths(name));
      const other = drawn.get(key);
      drawn.set(key, id);
      return other ? [`${other} = ${id}`] : [];
    });
    expect(dupes).toEqual([]);
  });

  it('id lạ → mảnh ghép; mọi icon trong bảng là tên có thật', () => {
    expect(skillIconName('no_such_skill')).toBe('puzzle');
    expect(Object.values(SKILL_ICON).filter((n) => !isIconName(n))).toEqual([]);
  });


  it('mọi ô KPI có icon riêng, là tên có thật (ui-ux-v3 §c)', () => {
    expect(KPIS.filter((k) => !k.icon || !isIconName(k.icon)).map((k) => k.id)).toEqual([]);
  });

  it('Plan 5 (mockup v6): 18 icon mới có thật, và không icon nào trùng path data với icon khác', () => {
    const added = ['table', 'lineChart', 'pin', 'unpin', 'refresh', 'code', 'up', 'down', 'x', 'alert', 'eye', 'eyeOff', 'route', 'fuel', 'calendar', 'info', 'chevronLeft', 'chevronRight'];
    expect(added.filter((n) => !isIconName(n))).toEqual([]);
    const seen = new Map<string, string>();
    const dupes = ICON_NAMES.flatMap((n) => {
      const key = JSON.stringify(iconPaths(n));
      const other = seen.get(key);
      seen.set(key, n);
      return other ? [`${other} = ${n}`] : [];
    });
    expect(dupes).toEqual([]);
  });
});

describe('U2 (v12.0): một icon = một đích', () => {
  it('mỗi mục điều hướng một icon riêng, không trùng icon lĩnh vực', () => {
    const used = Object.values(NAV_ICON);
    expect(new Set(used).size).toBe(used.length);
    expect(used.filter((n) => DOMAINS.some((d) => (d.icon as string) === n))).toEqual([]);
    expect(used.filter((n) => !isIconName(n))).toEqual([]);
  });
  it('registerNav chỉ lấy icon từ NAV_ICON', () => {
    const literal = Object.entries(uiSources).flatMap(([file, src]) =>
      [...src.matchAll(/registerNav\(\{[\s\S]*?\}\);/g)].filter((m) => /icon: '/.test(m[0])).map(() => file));
    expect(literal).toEqual([]);
  });
});

// Lazy glob: the keys say which files exist; only the mapped ones are read.
const phosphor = import.meta.glob('../node_modules/@phosphor-icons/core/assets/duotone/*.svg', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>;
const svgKey = (name: string): string => `../node_modules/@phosphor-icons/core/assets/duotone/${name}-duotone.svg`;
const map = iconMap.icons as Record<string, string[]>;

describe('I1 (ui-ux-v6): icon sinh từ Phosphor', () => {
  it('mọi tên trong icon-map.json có trong gói @phosphor-icons/core (duotone), kèm lý do', () => {
    expect(Object.keys(phosphor).length).toBeGreaterThan(1000);
    expect(Object.entries(map).filter(([, [ph]]) => !(svgKey(ph) in phosphor)).map(([n]) => n)).toEqual([]);
    expect(Object.entries(map).filter(([, [, why]]) => !why).map(([n]) => n)).toEqual([]);
  });

  it('iconData.ts khớp với gói và icon-custom.json (không ai sửa tay; chạy lại node scripts/icons.mjs)', async () => {
    const expected: Record<string, unknown> = { ...iconCustom.icons };
    for (const [n, [ph]] of Object.entries(map)) {
      const body = (await phosphor[svgKey(ph)]()).replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
      expected[n] = [...body.matchAll(/<path d="([^"]+)"(?: opacity="([\d.]+)")?\/>/g)].map(([, d, o]) => (o ? { d, o: Number(o) } : { d }));
    }
    expect(Object.keys(ICON_DATA).sort()).toEqual(Object.keys(expected).sort());
    expect(JSON.parse(JSON.stringify(ICON_DATA))).toEqual(expected);
  });

  it('mọi icon chỉ là đường vẽ (không chữ)', () => {
    for (const n of ICON_NAMES) for (const p of iconPaths(n)) expect(p.d).toMatch(/^M[\d\s.,MLHVCSQTAZmlhvcsqtaz-]+$/);
  });
});
