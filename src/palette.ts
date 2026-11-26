/**
 * F12 (L490): the search palette's index and matching (pure; only the lazy `palette` chunk and tests import it). Three kinds:
 * General skills (their full lesson page), Database Engine lessons and glossary terms. Hashes come from the caller (main's
 * route builders), so this file imports no main module.
 */
export type PaletteKind = 'skill' | 'lesson' | 'term' | 'page';
export interface PaletteItem { kind: PaletteKind; title: string; alt?: string; sub?: string; href: string }

interface Bi { vi: string; en: string }
interface LessonMeta { id?: unknown; engine?: unknown; level?: unknown; title?: unknown; title_en?: unknown }
interface TermRaw { id?: unknown; term?: unknown; vi_term?: unknown }
export interface PaletteSources {
  skills: readonly { id: string; label: Bi }[];
  /** src/engineSources.ts `meta`: the `?fm` list fields of each lesson file. */
  lessons: Record<string, { fm?: unknown }>;
  terms: unknown;
}
export interface PaletteHashes { skill: (id: string) => string; lesson: (engine: string, level: string, id: string) => string; term: (id: string) => string; interview?: (tab: 'sql' | 'pg' | 'mg' | 'dy') => string }

const str = (x: unknown): string => (typeof x === 'string' ? x : '');
const ENGINE_NAME: Record<string, string> = { postgres: 'PostgreSQL', mongodb: 'MongoDB', dynamodb: 'DynamoDB', redis: 'Redis', olap: 'OLAP & ClickHouse', search: 'Elasticsearch', telemetry: 'Telemetry & Observability' };

/** [VI title, EN title, hash, extra search words]: a page result each (v47, L1092). */
const PAGES: readonly (readonly [string, string, string, string])[] = [
  ['Cơ sở dữ liệu', 'Databases', '#/engine', 'csdl engine'],
  ['Best Practice', 'Best Practice', '#/engine/best', 'thực hành tốt good practice'],
  ['8 thói quen tốt', '8 good habits', '#/engine/best/habits', 'best practice'],
  ['Kệ Extension', 'Extensions shelf', '#/engine/postgres/ext', 'postgresql postgis pgvector'],
  ['Lộ trình NoSQL', 'NoSQL path', '#/engine/mongodb/path', 'mongodb'],
  ['Thuật ngữ CSDL', 'Database terms', '#/engine/terms', 'glossary từ điển'],
  ['Chọn CSDL nào?', 'Which database?', '#/engine/compare', 'so sánh compare engine'],
  ['Luyện SQL', 'Practise SQL', '#/practice', 'practice ôn tập review'],
  ['Luyện SQL · Sửa câu lỗi', 'Practise SQL · Fix the query', '#/practice', 'practice'],
  ['Luyện SQL · Giải thích câu này', 'Practise SQL · Explain this query', '#/practice', 'practice'],
  ['Luyện SQL · Đề trộn theo Phần', 'Practise SQL · Mixed review per Part', '#/practice', 'practice'],
];

export function paletteItems(src: PaletteSources, lang: 'vi' | 'en', hash: PaletteHashes, designName = 'Design', stackName = 'Data stack', roomName = 'Interview room', tsName = 'Time-series'): PaletteItem[] {
  const skills = src.skills.map((s): PaletteItem => ({ kind: 'skill', title: s.label[lang], alt: s.id, href: hash.skill(s.id) }));
  const lessons = Object.values(src.lessons).flatMap((x): PaletteItem[] => {
    const l = (x.fm ?? {}) as LessonMeta;
    const [id, engine, level] = [str(l.id), str(l.engine), str(l.level)];
    const title = (lang === 'en' && str(l.title_en)) || str(l.title);
    return id && engine && level && title
      ? [{ kind: 'lesson', title, sub: `${engine === 'design' ? designName : engine === 'stack' ? stackName : engine === 'timeseries' ? tsName : ENGINE_NAME[engine] ?? engine} · ${level === 'EXT' ? 'Extensions' : level}`, href: hash.lesson(engine, level, id) }] : [];
  }).sort((a, b) => a.href.localeCompare(b.href));
  const terms = (Array.isArray(src.terms) ? (src.terms as TermRaw[]) : []).flatMap((t): PaletteItem[] => {
    const [id, term, vi] = [str(t.id), str(t.term), str(t.vi_term).replace(/`/g, '')];
    return id && term ? [{ kind: 'term', title: term, alt: vi && vi !== term ? vi : undefined, href: hash.term(id) }] : [];
  });
  // v47 S4 (L984): the one interview room, one result per tab (searchable as "interview" or "phong van" in both languages)
  const rooms = hash.interview ? ([['sql', 'SQL'], ['pg', 'PostgreSQL'], ['mg', 'MongoDB'], ['dy', 'DynamoDB']] as const)
    .map(([tab, name]): PaletteItem => ({ kind: 'page', title: `${roomName} · ${name}`, alt: 'interview phỏng vấn', href: hash.interview!(tab) })) : [];
  // L1092 (eye E-01): the pages a newcomer names (hub rows, Practise sections); the hashes are kept forever (canonicalHash)
  const pages = PAGES.map(([vi, en, href, alt]): PaletteItem => ({ kind: 'page', title: lang === 'en' ? en : vi, alt: `${lang === 'en' ? vi : en} ${alt}`, href }));
  return [...skills, ...rooms, ...pages, ...lessons, ...terms]; // pages before the ~300 lessons and terms: the 30 cap never hides them

}

/** Lower case, no Vietnamese marks: "Lọc dòng" matches "loc dong". */
export const fold = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

/** Every word of the query in the title (or its other name); titles that start with the query first, then index order. */
export function search(items: readonly PaletteItem[], q: string, max = 30): PaletteItem[] {
  const words = fold(q).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const first = fold(q.trim());
  return items.map((it, i) => ({ it, i, text: fold(`${it.title} ${it.alt ?? ''}`) }))
    .filter((x) => words.every((w) => x.text.includes(w)))
    .sort((a, b) => Number(!a.text.startsWith(first)) - Number(!b.text.startsWith(first)) || a.i - b.i)
    .slice(0, max).map((x) => x.it);
}
