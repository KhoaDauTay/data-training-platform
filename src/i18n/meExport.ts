import type { Lang, Msg, Params } from './index';

/**
 * v33 (L536): the text of the #/me exports (portfolio file, take-home file, dashboard card file and pictures), moved out of
 * src/i18n/me.ts with the export code into the lazy `meExport` chunk (src/ui/meExport.ts, src/meExport.ts).
 * Same rules as the main dictionary (tests/i18n.test.ts): placeholders match, EN differs from VI.
 */
const vi = {
  'pf.anon': 'Người học BoonData',
  'co.logistics': 'công ty giao nhận Cargo Query Logistics',
  'co.ecommerce': 'sàn Chợ Lồng Đèn',
  'co.finance': 'công ty Tín dụng Hũ Bạc',
  'pf.h1': 'Portfolio SQL: {domain}',
  'pf.by': 'Người làm: {name} · Ngày {date} · {company}',
  'pf.note': 'Dữ liệu và công ty là hư cấu (trò chơi học SQL BoonData). Tự tạo tại máy, không xác minh bởi bên thứ ba. Mỗi câu SQL dưới đây đã đạt bộ chấm của BoonData.',
  'pf.question': 'Câu hỏi',
  'pf.sql': 'SQL đã đạt',
  'pf.step': 'Bước {i}: {title}',
  'pf.conclusion': 'Kết luận',
  'pf.cards': 'Bảng điều hành',
  'pf.cardsNote': 'Ảnh thẻ nằm trong thư mục cards/, chụp lúc xuất; thẻ chưa từng chạy trên máy này hoặc chạy quá lâu chỉ có SQL. Thẻ dùng dữ liệu bạn tự nhập không có ở đây.',
  'dash.exported': 'Đã xuất {n} thẻ.',
  'dash.dropped': '{n} thẻ dùng dữ liệu bạn tự nhập nên không xuất.',
  'dash.nothing': 'Không có thẻ nào để xuất.',
  'dash.imported': 'Đã nhập {n} thẻ. Thẻ nhập chưa chạy: đọc SQL rồi bấm Chạy trên từng thẻ.',
  'dash.full': '{n} thẻ không nhập vì Bảng điều hành đã đủ {max} thẻ.',
  'dash.badFile': 'File này không phải file thẻ Bảng điều hành của BoonData.',
  'dash.otherDomain': 'File này là thẻ của {domain}. Mở Bảng điều hành của {domain} để nhập.',
  'dash.pngSandbox': 'Thẻ này dùng dữ liệu bạn tự nhập nên không tải ảnh.',
  'dash.pngWait': 'Thẻ chưa có kết quả để chụp. Chạy thẻ trước.',
  'dash.pngDone': 'Đã tải ảnh thẻ {title}.',
  'png.footer': 'BoonData · dữ liệu hư cấu',
  'pf.shooting': 'Đang chụp ảnh thẻ {i}/{n}…',
  'pf.saved': 'Đã tải portfolio: {n} việc, {p} ảnh thẻ.',
  'pf.th.saved': 'Đã tải portfolio take-home: {n} bài.',
  'pf.levels': 'Mức kỹ năng hiện tại (tự đo, không xác minh)',
  'pf.skill': 'Kỹ năng',
  'pf.level': 'Mức',
  'pf.badges': 'Huy hiệu đang có',
};

const en: Record<ExportKey, Msg> = {
  'pf.anon': 'BoonData learner',
  'co.logistics': 'the freight forwarder Cargo Query Logistics',
  'co.ecommerce': 'the Lantern Market marketplace',
  'co.finance': 'Silver Jar Credit',
  'pf.h1': 'SQL portfolio: {domain}',
  'pf.by': 'By {name} · {date} · {company}',
  'pf.note': 'The data and the company are fictional (BoonData, a game for learning SQL). Self-generated on your device, not verified by any third party. Every query below passed the BoonData grader.',
  'pf.question': 'Question',
  'pf.sql': 'Passed SQL',
  'pf.step': 'Step {i}: {title}',
  'pf.conclusion': 'Conclusion',
  'pf.cards': 'Dashboard',
  'pf.cardsNote': 'Card pictures are in the cards/ folder, taken at export; a card never run on this device or too slow has its SQL only. Cards on data you imported are left out.',
  'dash.exported': 'Exported {n} cards.',
  'dash.dropped': '{n} cards use data you imported, so they were not exported.',
  'dash.nothing': 'No card to export.',
  'dash.imported': 'Imported {n} cards. Imported cards have not run: read the SQL, then press Run on each card.',
  'dash.full': '{n} cards were not imported: the dashboard already holds {max}.',
  'dash.badFile': 'This is not a BoonData dashboard card file.',
  'dash.otherDomain': 'This file holds {domain} cards. Open the {domain} dashboard to import it.',
  'dash.pngSandbox': 'This card uses data you imported, so it cannot be saved as a picture.',
  'dash.pngWait': 'The card has no result to capture yet. Run it first.',
  'dash.pngDone': 'Saved the picture of {title}.',
  'png.footer': 'BoonData · fictional data',
  'pf.shooting': 'Taking card picture {i}/{n}…',
  'pf.saved': 'Portfolio saved: {n} tasks, {p} card pictures.',
  'pf.th.saved': 'Take-home portfolio saved: {n} take-homes.',
  'pf.levels': 'Current skill levels (self-measured, not verified)',
  'pf.skill': 'Skill',
  'pf.level': 'Level',
  'pf.badges': 'Badges held',
};

export type ExportKey = keyof typeof vi;
export const EXPORT_DICT = { vi: vi as Record<ExportKey, Msg>, en };

export function exportText(lang: Lang, key: ExportKey, params: Params = {}): string {
  const locale = lang === 'en' ? 'en-US' : 'vi-VN';
  const msg = EXPORT_DICT[lang][key];
  if (typeof msg === 'function') return msg(params);
  return msg.replace(/\{(\w+)\}/g, (m, name: string) => {
    const v = params[name];
    return v === undefined ? m : typeof v === 'number' ? v.toLocaleString(locale) : v;
  });
}
