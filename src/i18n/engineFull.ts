import type { Lang, Params } from './index';

/**
 * v30.1 (F01, L480): UI text of an Engine lesson's full-lesson layout (the "In this lesson" contents and the runnable
 * example and pitfall blocks). It lives in the lazy `engineFull` chunk with its UI (src/ui/engineFull.ts), not in
 * src/i18n/engine.ts, so `engineui` stays under its budget. Same rules as ENGINE_DICT (tests/i18n.test.ts).
 */
const vi = {
  'toc.title': 'Trong bài này',
  'toc.count': 'Trong bài này · {n} mục',
  'toc.body': 'Mục lục bài',
  'toc.lab': 'Thực hành',
  'toc.predict': 'Đoán trước',
  'toc.quiz': 'Câu hỏi kiểm tra',
  'run.run': 'Chạy',
  'run.wrong': 'Chạy câu sai',
  'run.fix': 'Chạy câu sửa',
  'run.busy': 'Đang chạy…',
  'run.rows': '{n} {u} trong {ms} ms',
  'run.rowsWrong': '{n} {u} trong {ms} ms · chạy được, nhưng là cách sai: so với khối Sửa',
  'run.caption': 'Kết quả: {n} {u}',
  'run.shownOnly': 'Chỉ để đọc, không chạy ở đây',
  // v38 (R2 E17): what one result row is called on each engine
  'unit.postgres': 'dòng',
  'unit.design': 'dòng',
  'unit.stack': 'dòng',
  'unit.mongodb': 'tài liệu',
  'unit.dynamodb': 'item',
  'unit.redis': 'dòng',
  'run.chipError': 'Lỗi mong đợi · {code}',
  'run.chipWrong': 'Sai',
  'run.chipFix': 'Sửa',
  'run.expected': 'Lỗi đúng như bài nói · {code} ({rt})',
  'run.unexpected': 'Bài nói sẽ lỗi {code}, nhưng lệnh đã chạy được.',
  'run.note': 'Chạy thật trên {rt}, ngay trong trình duyệt. Chỉ để xem: không tính điểm, không lưu gì.',
  'run.noteSim': 'Chạy trên trình mô phỏng Redis của BoonData (một tập lệnh), ngay trong trình duyệt. Chỉ để xem: không tính điểm, không lưu gì.',
  'run.ran': '{k}/{n} đã chạy trong phiên này',
  'run.timeout': 'Quá {s} giây nên đã dừng. Bấm Chạy để thử lại.',
  'run.failed': 'Không khởi động được runtime trong trình duyệt: {d}',
};
type FullKey = keyof typeof vi;
const en: Record<FullKey, string> = {
  'toc.title': 'In this lesson',
  'toc.count': 'In this lesson · {n} sections',
  'toc.body': 'Lesson contents',
  'toc.lab': 'Practice',
  'toc.predict': 'Predict first',
  'toc.quiz': 'Check questions',
  'run.run': 'Run',
  'run.wrong': 'Run the wrong one',
  'run.fix': 'Run the fix',
  'run.busy': 'Running…',
  'run.rows': '{n} {u} in {ms} ms',
  'run.rowsWrong': '{n} {u} in {ms} ms · it runs, but it is the wrong way: compare with the Fix',
  'run.caption': 'Result: {n} {u}',
  'run.shownOnly': 'Shown only, not run here',
  'unit.postgres': 'rows',
  'unit.design': 'rows',
  'unit.stack': 'rows',
  'unit.mongodb': 'documents',
  'unit.dynamodb': 'items',
  'unit.redis': 'lines',
  'run.chipError': 'Expected error · {code}',
  'run.chipWrong': 'Wrong',
  'run.chipFix': 'Fix',
  'run.expected': 'The error the lesson describes · {code} ({rt})',
  'run.unexpected': 'The lesson says this fails with {code}, but it ran.',
  'run.note': 'Runs for real on {rt}, right in your browser. Only to look at: no score, nothing saved.',
  'run.noteSim': 'Runs on BoonData\'s Redis simulator (a command subset), right in your browser. Only to look at: no score, nothing saved.',
  'run.ran': '{k}/{n} run in this session',
  'run.timeout': 'Stopped after {s} seconds. Press Run to try again.',
  'run.failed': 'The in-browser runtime could not start: {d}',
};
export type { FullKey };
export const FULL_DICT = { vi: vi as Record<FullKey, string>, en };

export function fullText(lang: Lang, locale: string, key: FullKey, params: Params = {}): string {
  return FULL_DICT[lang][key].replace(/\{(\w+)\}/g, (m, name: string) => {
    const v = params[name];
    return v === undefined ? m : typeof v === 'number' ? v.toLocaleString(locale) : v;
  });
}
