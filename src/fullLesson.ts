/**
 * v24 R0 (product-route-v24 §2.2, L337): a General skill's full lesson, `content/general/lessons/<skill>.md`, one lazy chunk
 * per file (src/generalLessonSources.ts, budget `generalLesson` per file). Pure: no DOM, no value import of a main module
 * (the learnui chunk parses it). Eight sections, in this order:
 *   1 open (body `## Mở bài` + `objectives`), 2 idea (body `## Ý chính`, ≤ 150 words), 3 syntax (`syntax` + `options`,
 *   body `## Cú pháp` optional), 4 examples (≥ 3, run on `lab`), 5 pitfalls (≥ 2: the wrong query really runs, then the fix),
 *   6 practice (not in the file: the quick lesson's "Thử ngay" in content/lessons.yml + the skill's 4 drills),
 *   7 quiz (≥ 2; `trap` = the option a believer of the misconception picks), 8 recap (`recap` 3–5 + `sources`).
 * Body: VI sections, then `# EN` with the same headings in English (## Opening, ## Key idea, ## Syntax). SQL lives once, in
 * the frontmatter; prose may use `code` spans and paragraphs only.
 */
export interface Bi { vi: string; en: string }
export interface RunExample { title: Bi; sql: string; read: Bi }
export interface Pitfall { title: Bi; wrong: string; fix: string; why: Bi }
export interface LessonQuestion { q: Bi; options: Bi[]; answer: number; why: Bi; trap?: number }
export interface SyntaxOption { code: string; text: Bi }
export interface FullLesson {
  id: string;
  title: Bi;
  minutes: number;
  objectives: Bi[];
  open: Bi;
  idea: Bi;
  syntax: { sql: string; text?: Bi; options: SyntaxOption[] };
  examples: RunExample[];
  pitfalls: Pitfall[];
  quiz: LessonQuestion[];
  recap: Bi[];
  sources: string[];
}
/** What the `?fm` import gives (scripts/contentJson.mjs mdData). */
export interface LessonSource { fm: Record<string, unknown>; body: string }

/** The eight sections, in page order (ids are stable: the TOC, the anatomy test and the page's `data-sec` use them). */
export const LESSON_SECTIONS = ['open', 'idea', 'syntax', 'examples', 'pitfalls', 'practice', 'quiz', 'recap'] as const;
export type LessonSection = (typeof LESSON_SECTIONS)[number];
/** Body headings per language, by section (only the three prose sections live in the body). */
const HEADS: Record<'vi' | 'en', Record<'open' | 'idea' | 'syntax', string>> = {
  vi: { open: 'Mở bài', idea: 'Ý chính', syntax: 'Cú pháp' },
  en: { open: 'Opening', idea: 'Key idea', syntax: 'Syntax' },
};

const fail = (origin: string, msg: string): never => {
  throw new Error(`${origin}: ${msg}`);
};
const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
function bi(v: unknown, origin: string, what: string): Bi {
  const o = v as Partial<Record<'vi' | 'en', unknown>> | null;
  const b = { vi: str(o?.vi), en: str(o?.en) };
  return b.vi && b.en ? b : fail(origin, `${what} cần vi và en`);
}
const arr = (v: unknown, origin: string, what: string): unknown[] => (Array.isArray(v) ? v : fail(origin, `${what} phải là danh sách`));
const sql = (v: unknown, origin: string, what: string): string => str(v) || fail(origin, `${what} thiếu SQL`);

/** `## Heading` sections of one language's body, by heading text. */
function sectionsOf(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const part of text.split(/^## /m).slice(1)) {
    const nl = part.indexOf('\n');
    out.set((nl < 0 ? part : part.slice(0, nl)).trim(), (nl < 0 ? '' : part.slice(nl + 1)).trim());
  }
  return out;
}

export function parseFullLesson(src: LessonSource, origin = 'lesson'): FullLesson {
  const fm = src.fm;
  const id = str(fm.id) || fail(origin, 'thiếu id');
  const [viBody, enBody = ''] = src.body.replace(/\r\n/g, '\n').split(/^# EN[ \t]*$/m);
  const vi = sectionsOf(viBody);
  const en = sectionsOf(enBody);
  const prose = (k: 'open' | 'idea' | 'syntax', required: boolean): Bi | undefined => {
    const b = { vi: vi.get(HEADS.vi[k]) ?? '', en: en.get(HEADS.en[k]) ?? '' };
    if (b.vi && b.en) return b;
    if (required || b.vi || b.en) fail(origin, `thiếu mục "## ${HEADS.vi[k]}" / "## ${HEADS.en[k]}"`);
    return undefined;
  };
  const minutes = typeof fm.minutes === 'number' && fm.minutes > 0 ? fm.minutes : fail(origin, 'minutes phải là số dương');
  const trapOf = (v: unknown): number | undefined => (typeof v === 'number' ? v : undefined);
  return {
    id,
    title: bi({ vi: fm.title, en: fm.title_en }, origin, 'title/title_en'),
    minutes,
    objectives: arr(fm.objectives, origin, 'objectives').map((o, i) => bi(o, origin, `objectives[${i}]`)),
    open: prose('open', true)!,
    idea: prose('idea', true)!,
    syntax: {
      sql: sql(fm.syntax, origin, 'syntax'),
      text: prose('syntax', false),
      options: (Array.isArray(fm.options) ? fm.options : []).map((o, i) => {
        const x = o as Record<string, unknown>;
        return { code: str(x.code) || fail(origin, `options[${i}] thiếu code`), text: bi(x, origin, `options[${i}]`) };
      }),
    },
    examples: arr(fm.examples, origin, 'examples').map((e, i) => {
      const x = e as Record<string, unknown>;
      return { title: bi(x.title, origin, `examples[${i}].title`), sql: sql(x.sql, origin, `examples[${i}]`), read: bi(x.read, origin, `examples[${i}].read`) };
    }),
    pitfalls: arr(fm.pitfalls, origin, 'pitfalls').map((p, i) => {
      const x = p as Record<string, unknown>;
      return { title: bi(x.title, origin, `pitfalls[${i}].title`), wrong: sql(x.wrong, origin, `pitfalls[${i}].wrong`), fix: sql(x.fix, origin, `pitfalls[${i}].fix`), why: bi(x.why, origin, `pitfalls[${i}].why`) };
    }),
    quiz: arr(fm.quiz, origin, 'quiz').map((q, i) => {
      const x = q as Record<string, unknown>;
      const options = arr(x.options, origin, `quiz[${i}].options`).map((o, j) => bi(o, origin, `quiz[${i}].options[${j}]`));
      const answer = typeof x.answer === 'number' && x.answer >= 0 && x.answer < options.length ? x.answer : fail(origin, `quiz[${i}].answer ngoài khoảng`);
      const trap = trapOf(x.trap);
      if (trap !== undefined && (trap === answer || trap < 0 || trap >= options.length)) fail(origin, `quiz[${i}].trap phải là một lựa chọn sai`);
      return { q: bi(x.q, origin, `quiz[${i}].q`), options, answer, why: bi(x.why, origin, `quiz[${i}].why`), trap };
    }),
    recap: arr(fm.recap, origin, 'recap').map((r, i) => bi(r, origin, `recap[${i}]`)),
    sources: arr(fm.sources, origin, 'sources').map((u) => (typeof u === 'string' && /^https:\/\//.test(u) ? u : fail(origin, 'sources: chỉ link https'))),
  };
}

/** Words of running prose (code spans count as one word each); the "≤ 150 words per block" rule of §2.2. */
export const wordCount = (text: string): number => text.replace(/`[^`]*`/g, 'x').split(/\s+/).filter(Boolean).length;
