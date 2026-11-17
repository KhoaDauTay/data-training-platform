import type { Lang, Params } from './index';

/**
 * UI text of the General area (Plan 8a D8a-13). It lives in the lazy General UI chunk, not in vi.ts/en.ts (main bundle).
 * Same rules as the main dictionary: placeholders match, EN differs from VI (tests/i18n.test.ts, SAME_OK there).
 * No value import from main modules (Plan 6 U3): the caller passes the language and locale.
 */
const vi = {
  'drill.title': 'Drill · {what} · {i}/{n}',
  'drill.challenge': 'Thử thách · {what}',
  'drill.kind.faded': 'Làm theo khung',
  'drill.kind.open': 'Tự làm',
  'drill.kind.trap': 'Bẫy hay gặp',
  'drill.kind.challenge': 'Thử thách',
  'drill.loading': 'Đang chuẩn bị dữ liệu luyện tập…',
  'drill.data': 'Dữ liệu: chuỗi cửa hàng (schema lab). Bảng Logistics không có ở đây.',
  'drill.lesson': 'Bài học nhanh: {name}',
  'drill.openLesson': 'Mở bài học',
  'drill.passed': 'Đạt · +{xp} XP',
  'drill.passedAgain': 'Đạt lại · 0 XP (XP chỉ tính lần đầu)',
  'drill.done': 'Đã đạt drill này. Nộp lại vẫn được chấm, không cộng XP.',
  'drill.recap': 'Câu bạn đã nộp',
  'drill.next': 'Drill tiếp',
  'drill.back': 'Về Lộ trình',
  'drill.applies': 'Áp dụng ở Logistics, chương: {list}',
  'drill.exit': 'Thoát drill',
  'drill.solved': 'Drill đạt, +{xp} XP.',
  'hub.title': 'Drill trên dữ liệu cửa hàng',
  'hub.empty': 'Bạn chưa học kỹ năng nào. Bắt đầu từ Module 1: đọc bài học nhanh rồi làm 3 drill.',
  'hub.start': 'Bắt đầu từ Module 1',
  'hub.weakest': 'Kỹ năng yếu nhất: {skill} (hộp {box})',
  'hub.continue': 'Drill đang làm dở: {what}',
  'hub.resume': 'Làm tiếp',
} as const;

export type LearnKey = keyof typeof vi;

const en: Record<LearnKey, string> = {
  'drill.title': 'Drill · {what} · {i}/{n}',
  'drill.challenge': 'Challenge · {what}',
  'drill.kind.faded': 'Fill in the frame',
  'drill.kind.open': 'On your own',
  'drill.kind.trap': 'Common trap',
  'drill.kind.challenge': 'Challenge',
  'drill.loading': 'Preparing the practice data…',
  'drill.data': 'Data: a chain of shops (schema lab). The Logistics tables are not here.',
  'drill.lesson': 'Quick lesson: {name}',
  'drill.openLesson': 'Open the lesson',
  'drill.passed': 'Passed · +{xp} XP',
  'drill.passedAgain': 'Passed again · 0 XP (XP counts only the first time)',
  'drill.done': 'You passed this drill. Submitting again is still graded, with no XP.',
  'drill.recap': 'What you submitted',
  'drill.next': 'Next drill',
  'drill.back': 'Back to the learning path',
  'drill.applies': 'Used in Logistics, chapters: {list}',
  'drill.exit': 'Leave the drill',
  'drill.solved': 'Drill passed, +{xp} XP.',
  'hub.title': 'Drills on the shop data',
  'hub.empty': 'You have not learned a skill yet. Start with Module 1: read the quick lesson, then do 3 drills.',
  'hub.start': 'Start with Module 1',
  'hub.weakest': 'Weakest skill: {skill} (box {box})',
  'hub.continue': 'Drill left half-done: {what}',
  'hub.resume': 'Continue',
};

export const LEARN_DICT = { vi: vi as Record<LearnKey, string>, en };

export function learnText(lang: Lang, locale: string, key: LearnKey, params: Params = {}): string {
  return LEARN_DICT[lang][key].replace(/\{(\w+)\}/g, (m, name: string) => {
    const v = params[name];
    return v === undefined ? m : typeof v === 'number' ? v.toLocaleString(locale) : v;
  });
}
