import type { Ticket } from './tickets';

/** Same shape as tickets.ts `Variant`; values were validated by parseTicket. */
export type VariantVars = Record<string, string>;

const VAR_RE = /\{\{(\w+)\}\}/g;

export const variantsOf = (t: Ticket): VariantVars[] => t.variants ?? [];

export function renderTemplate(s: string, vars: VariantVars): string {
  return s.replace(VAR_RE, (m, k: string) => (Object.hasOwn(vars, k) ? vars[k] : m));
}

/** Ids, people and metadata: never templated (a stray {{x}} there must not change who sent a ticket or what it unlocks). */
const SKIP = new Set(['id', 'from', 'variants', 'tables', 'requires', 'grants', 'beat', 'scene']);

/** Applies `f` to every player-text / SQL string in a ticket, including fields added later (EN block, columns, starter...). */
function mapStrings<T>(v: T, f: (s: string) => string): T {
  if (typeof v === 'string') return f(v) as T;
  if (Array.isArray(v)) return v.map((x) => mapStrings(x, f)) as T;
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, SKIP.has(k) ? x : mapStrings(x, f)])) as T;
  }
  return v;
}

export function applyVariant(t: Ticket, index: number): Ticket {
  const vars = variantsOf(t)[index];
  return vars ? mapStrings(t, (s) => renderTemplate(s, vars)) : t;
}

export function templateVars(t: Ticket): string[] {
  const names = new Set<string>();
  mapStrings(t, (s) => {
    for (const m of s.matchAll(VAR_RE)) names.add(m[1]);
    return s;
  });
  return [...names].sort();
}
