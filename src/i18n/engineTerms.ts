import type { Lang, Params } from './index';

/**
 * v27 (L410): text of the lazy `engineTerms` chunk (src/ui/engineTerms.ts): the glossary page #/engine/terms, the term
 * buttons and popovers in Engine lessons. Same rules as ENGINE_DICT (tests/i18n.test.ts): code spans VI = EN, EN without
 * diacritics. The page is a reference, not a test: nothing is scored.
 */
const vi = {
  'title': 'Thuật ngữ',
  'intro': 'Các từ dùng trong khu Cơ sở dữ liệu, mỗi từ một giải thích ngắn và một trang docs chính thức. Trong bài, lần đầu một từ xuất hiện thì có nút mở giải thích này.',
  'search': 'Tìm thuật ngữ',
  'search.hint': 'Tìm theo tên tiếng Anh hoặc tiếng Việt, có dấu hay không đều được.',
  'engines': 'Theo CSDL',
  'levels': 'Theo cấp',
  'hide': 'Che giải thích (tự kiểm)',
  'count': '{n} thuật ngữ',
  'group': 'Cấp {lv}',
  'show': 'Xem giải thích',
  'avoid': 'Tránh dịch: {x}',
  'docs': 'Docs chính thức',
  'newTab': 'mở trong tab mới',
  'none': 'Không có thuật ngữ nào khớp.',
  'clear': 'Bỏ lọc',
  'jump': 'Tới cấp',
  'top': 'Về đầu trang',
  'open': 'Xem trang thuật ngữ',
  'inLesson': 'Thuật ngữ trong bài ({n})',
  'pop.close': 'Đóng',
};
export type TermsKey = keyof typeof vi;

const en: Record<TermsKey, string> = {
  'title': 'Terms',
  'intro': 'The words used in the Databases area, each with a short explanation and an official docs page. In a lesson, the first time a word appears it has a button that opens this explanation.',
  'search': 'Search terms',
  'search.hint': 'Search by the English or the Vietnamese name, with or without accents.',
  'engines': 'By database',
  'levels': 'By level',
  'hide': 'Hide explanations (self-check)',
  'count': '{n} terms',
  'group': 'Level {lv}',
  'show': 'Show the explanation',
  'avoid': 'Do not translate as: {x}',
  'docs': 'Official docs',
  'newTab': 'opens in a new tab',
  'none': 'No term matches.',
  'clear': 'Clear filters',
  'jump': 'Go to level',
  'top': 'Back to top',
  'open': 'Open the terms page',
  'inLesson': 'Terms in this lesson ({n})',
  'pop.close': 'Close',
};
export const TERMS_DICT = { vi: vi as Record<TermsKey, string>, en };

export function termsText(lang: Lang, locale: string, key: TermsKey, params: Params = {}): string {
  return TERMS_DICT[lang][key].replace(/\{(\w+)\}/g, (m, name: string) => {
    const v = params[name];
    return v === undefined ? m : typeof v === 'number' ? v.toLocaleString(locale) : v;
  });
}
