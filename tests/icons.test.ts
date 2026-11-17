import { describe, expect, it } from 'vitest';
import { SKILLS } from '../src/progress';
import { KPIS } from '../src/home';
import { iconPaths, isIconName, SKILL_ICON, skillIconName } from '../src/ui/icons';

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
});
