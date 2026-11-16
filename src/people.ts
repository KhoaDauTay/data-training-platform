import { parse as parseYaml } from 'yaml';
import source from '../content/people.yml?raw';
import { bilingualOf, type Bilingual } from './progress';

/** Allowed portrait parameters (src/ui/avatar.ts draws each one). */
export const LOOK = {
  skin: ['light', 'medium', 'tan', 'deep'],
  hair: ['black', 'brown', 'grey'],
  style: ['short', 'long', 'bun', 'side'],
  accessory: ['none', 'helmet', 'glasses', 'headset', 'tie', 'scarf', 'lanyard'],
} as const;
export type Look = { [K in keyof typeof LOOK]: (typeof LOOK)[K][number] };

/**
 * A colleague who sends tickets (L18): a real forwarder role. `employee` = id in the seed's employees table, null = not in
 * the seed. `tables` = the tables they own (names from schema.sql, never translated).
 */
export interface Person { name: string; dept: string; employee: number | null; role: Bilingual; bio: Bilingual; tables: string[]; look: Look }

function bilingual(v: unknown, where: string): Bilingual {
  const b = bilingualOf(v);
  if (!b) throw new Error(`${where}: cần { vi, en } khác rỗng`);
  return b;
}

/** Throws on any structural problem: the content test runs this on the real file. */
export function parsePeople(src: string, origin = 'people.yml'): Person[] {
  const data = parseYaml(src) as unknown;
  if (!Array.isArray(data)) throw new Error(`${origin}: cần một danh sách`);
  const seen = new Set<string>();
  return data.map((raw: unknown, i) => {
    const p = (raw ?? {}) as Record<string, unknown>;
    const where = `${origin}: mục ${i}`;
    if (typeof p.name !== 'string' || typeof p.dept !== 'string') throw new Error(`${where}: thiếu name/dept`);
    if (seen.has(p.name)) throw new Error(`${origin}: trùng tên "${p.name}"`);
    seen.add(p.name);
    if (p.employee !== null && typeof p.employee !== 'number') throw new Error(`${where}: employee là id trong employees hoặc null`);
    if (!Array.isArray(p.tables) || !p.tables.every((x) => typeof x === 'string')) throw new Error(`${where}: tables là danh sách tên bảng`);
    const look = (p.look ?? {}) as Record<string, unknown>;
    for (const [k, allowed] of Object.entries(LOOK)) {
      if (!(allowed as readonly unknown[]).includes(look[k])) throw new Error(`${where}: look.${k} phải là một trong ${allowed.join(', ')}`);
    }
    return {
      name: p.name, dept: p.dept, employee: p.employee as number | null,
      role: bilingual(p.role, `${where} role`), bio: bilingual(p.bio, `${where} bio`), tables: p.tables as string[], look: look as Look,
    };
  });
}

export const PEOPLE: Person[] = parsePeople(source);
export const personOf = (name: string): Person | undefined => PEOPLE.find((p) => p.name === name);

/** The line under a sender's name: role, then the tables they own that the player can already see (`visible`). '' = unknown sender. */
export function roleLine(name: string, lang: keyof Bilingual, visible: readonly string[] = []): string {
  const p = personOf(name);
  if (!p) return '';
  const owned = p.tables.filter((x) => visible.includes(x));
  return owned.length ? `${p.role[lang]} · ${owned.join(', ')}` : p.role[lang];
}
