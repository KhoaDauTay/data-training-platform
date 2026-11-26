import type { DomainId } from './domains';
import type { TakeHome, TakeHomeStep } from './interview';
import type { Bilingual } from './progress';

/**
 * v47 D1/D2 (L930–L939): domain case studies and "Hỏi lại cho rõ" asks (content/cases/cases.yml). Each one is played as an
 * interview take-home (takeHomeTicket, session mode `interview`, pref cargo-query/interview): 0 XP, nothing in the Save, never
 * in chapter progress. Ids `cs-…` do not match DRILL_ID, so schemaOf() runs the steps on the open domain's schema.
 * Pure parser in the lazy chunk src/caseSources.ts; it imports only types (Plan 6 U3: no value import from a main module).
 */
export const CASE_ID = /^cs-(lg|ec|fn)-[a-z0-9]+$/;
const DOMAIN_OF = { lg: 'logistics', ec: 'ecommerce', fn: 'finance' } as const;
export type CaseKind = 'case' | 'ask';
/** An ask's clarifying choice: the precise task shows only once `answer` is picked; every option explains itself. */
export interface Clarify { q: Bilingual; options: (Bilingual & { why: Bilingual })[]; answer: number }
export interface CaseStudy extends TakeHome { domain: DomainId; kind: CaseKind; after: number; clarify?: Clarify }

type Raw = Record<string, unknown>;

export function parseCases(data: unknown, origin = 'cases/cases.yml'): CaseStudy[] {
  if (!Array.isArray(data)) throw new Error(`${origin}: cần một danh sách`);
  const seen = new Set<string>();
  return data.map((x): CaseStudy => {
    const o = (x ?? {}) as Raw;
    const fail = (what: string): never => {
      throw new Error(`${origin}: ${String(o.id)} ${what}`);
    };
    const both = (v: unknown, what: string): Bilingual => {
      const b = (v ?? {}) as Raw;
      return typeof b.vi === 'string' && b.vi.trim() && typeof b.en === 'string' && b.en.trim() ? { vi: b.vi.trim(), en: b.en.trim() } : fail(`${what} cần { vi, en }`);
    };
    const text = (v: unknown, what: string): string => (typeof v === 'string' && v.trim() ? v.trim() : fail(`thiếu ${what}`));
    const list = (v: unknown, what: string): Raw[] => (Array.isArray(v) ? v.map((y) => (y ?? {}) as Raw) : fail(`${what} cần một danh sách`));
    const id = typeof o.id === 'string' && CASE_ID.test(o.id) && !seen.has(o.id) ? o.id : fail(`id lạ hoặc trùng (${CASE_ID})`);
    seen.add(id);
    const domain = DOMAIN_OF[id.split('-')[1] as keyof typeof DOMAIN_OF];
    if (o.domain !== domain) fail(`domain phải là ${domain}`);
    const kind = o.kind === 'case' || o.kind === 'ask' ? o.kind : fail('kind phải là case | ask');
    const after = Number.isInteger(o.after) && (o.after as number) > 0 ? (o.after as number) : fail('after cần số chương');
    const steps = list(o.steps, 'steps').map((s, i): TakeHomeStep => ({
      id: `${id}-${i + 1}`, kind: 'open', title: both(s.title, `bước ${i + 1}.title`), task: both(s.task, `bước ${i + 1}.task`),
      solution: text(s.solution, `bước ${i + 1}.solution`), ordered: s.ordered === true, hint: both(s.hint, `bước ${i + 1}.hint`), wrong: [],
    }));
    const [lo, hi] = kind === 'case' ? [4, 5] : [1, 1];
    if (steps.length < lo || steps.length > hi) fail(`${kind} cần ${lo}–${hi} bước`);
    let clarify: Clarify | undefined;
    if (kind === 'ask') {
      const c = (o.clarify ?? fail('ask cần clarify')) as Raw;
      const options = list(c.options, 'clarify.options').map((op, i) => ({ ...both(op, `option ${i}`), why: both(op.why, `option ${i}.why`) }));
      if (options.length < 2 || options.length > 4) fail('clarify cần 2–4 lựa chọn');
      const answer = Number.isInteger(c.answer) && (c.answer as number) >= 0 && (c.answer as number) < options.length ? (c.answer as number) : fail('clarify.answer lạ');
      clarify = { q: both(c.q, 'clarify.q'), options, answer };
    } else if (o.clarify !== undefined) fail('chỉ ask có clarify');
    const rubric = list(o.rubric, 'rubric').map((r, i) => both(r, `rubric[${i}]`));
    if (rubric.length < 3) fail('rubric cần ít nhất 3 tiêu chí');
    return {
      id, domain, kind, after, modules: [], title: both(o.title, 'title'), brief: both(o.brief, 'brief'), steps,
      conclusion: both(o.conclusion, 'conclusion'), rubric, ...(clarify ? { clarify } : {}),
    };
  });
}
