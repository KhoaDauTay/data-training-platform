import type { Lang, Params } from './index';

/**
 * v33 (L537): the text under an Engine lab or example result (the engine numbers and the pageinspect "Inside" table), moved
 * out of src/i18n/engine.ts with its UI into the lazy `engineResult` chunk (src/ui/engineResult.ts), so `engineui` has room.
 * Same rules as ENGINE_DICT (tests/i18n.test.ts).
 */
const vi = {
  'inside.title': 'Bên trong',
  'inside.missing': 'Thêm cột {cols} để vẽ trang.',
  'inside.caption': '{n} line pointer: {dead} chết hoặc chuyển hướng, {hot} cập nhật HOT.',
  'meta.title': 'Số liệu của engine',
  'meta.table': 'Bảng',
  'meta.scannedCount': 'Đã quét',
  'meta.count': 'Trả về',
  'meta.overread': 'Đã quét {s} để trả về {n}: đọc nhiều hơn số trả về, và trả phí cho mọi thứ đã đọc.',
  'meta.stages': 'Các stage',
  'meta.keysExamined': 'Khóa đã xét',
  'meta.docsExamined': 'Tài liệu đã xét',
  'meta.planBefore': 'Kế hoạch trước',
  'meta.planAfter': 'Kế hoạch sau',
  'meta.catalog': 'Dòng catalog',
};
type ResultKey = keyof typeof vi;
const en: Record<ResultKey, string> = {
  'inside.title': 'Inside',
  'inside.missing': 'Add the columns {cols} to draw the page.',
  'inside.caption': '{n} line pointers: {dead} dead or redirected, {hot} HOT updates.',
  'meta.title': 'Engine numbers',
  'meta.table': 'Table',
  'meta.scannedCount': 'Scanned',
  'meta.count': 'Returned',
  'meta.overread': 'Scanned {s} to return {n}: it read more than it returned, and pays for everything it read.',
  'meta.stages': 'Stages',
  'meta.keysExamined': 'Keys examined',
  'meta.docsExamined': 'Documents examined',
  'meta.planBefore': 'Plan before',
  'meta.planAfter': 'Plan after',
  'meta.catalog': 'Catalog rows',
};
export type { ResultKey };
export const RESULT_DICT = { vi: vi as Record<ResultKey, string>, en };

export function resultText(lang: Lang, locale: string, key: ResultKey, params: Params = {}): string {
  return RESULT_DICT[lang][key].replace(/\{(\w+)\}/g, (m, name: string) => {
    const v = params[name];
    return v === undefined ? m : typeof v === 'number' ? v.toLocaleString(locale) : v;
  });
}
