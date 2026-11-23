import type { Lang, Params } from './index';

/**
 * v25 (MongoDB đủ): text of the lazy `engineNosql` chunk (src/ui/engineNosql.ts): the NoSQL labs' "collections/tables used"
 * panel (moved out of engineView, L370), the MongoDB step extras ("Pipeline từng bước", "So với SQL", the rule bar and
 * "mong lỗi" notes). Its own chunk so `engineui` stays under its budget. Same rules as ENGINE_DICT (tests/i18n.test.ts).
 */
const vi = {
  'tables.colls': 'Collection dùng',
  'tables.dynamo': 'Bảng dùng',
  'tables.sampleDoc': 'Tài liệu đầu tiên',
  'tables.sampleItem': 'Item đầu tiên',
  'tables.keys': 'Khóa: {keys}',
  'tables.docs': '{n} tài liệu',
  'tables.items': '{n} item',
  'rule.esr': 'Thanh quy tắc: index theo ESR',
  'rule.covered': 'Thanh quy tắc: truy vấn được phủ',
  'rule.match-first': 'Thanh quy tắc: `$match` trước',
  'rule.note': 'Chấm theo quy tắc trong tài liệu MongoDB, không đo trên MongoDB thật: kết quả đúng mà sai quy tắc vẫn chưa đạt.',
  'error.note': 'Bước này đạt khi MongoDB từ chối lệnh với lỗi `{code}`.',
  'pipe.title': 'Pipeline từng bước',
  'pipe.sub': 'Mỗi dòng là kết quả của các stage tính tới đó, chạy lại bằng mingo trên dữ liệu của lab.',
  'pipe.stage': 'Stage (bước)',
  'pipe.sql': 'Giống trong SQL',
  'pipe.n': 'Tài liệu ra',
  'pipe.head': 'Xem {n} tài liệu đầu sau stage {i}',
  'cmp.title': 'So với SQL',
  'cmp.traps': 'Chỗ khác SQL trong pipeline này',
  'cmp.sql': 'Câu SQL tương đương (chỉ để so, không chạy)',
  'cmp.after': 'Câu SQL tương đương hiện sau khi bước đạt.',
  'trap.$match': '`{ f: null }` khớp cả tài liệu thiếu trường `f`, và `$ne` giữ cả tài liệu thiếu trường; `WHERE f IS NULL` của SQL không có trường thiếu.',
  'trap.$group': '`$sum` bỏ qua im lặng mọi giá trị không phải số (chuỗi `"300"` thành 0), không báo lỗi như SQL.',
  'trap.$count': 'Đầu vào rỗng thì `$count` không trả tài liệu nào, còn `COUNT(*)` của SQL luôn trả một dòng là 0.',
  'trap.$lookup': '`$lookup` không nhân dòng như JOIN: các tài liệu khớp nằm chung trong một mảng (như LEFT JOIN rồi gom lại).',
  'trap.$unwind': '`$unwind` bỏ tài liệu có mảng rỗng hoặc thiếu, giống INNER JOIN, trừ khi có `preserveNullAndEmptyArrays: true`.',
  'trap.$sort': 'Trường thiếu được xếp như `null`, trước số và chuỗi; không có `NULLS LAST`.',
  'trap.$limit': '`$limit` đặt trước `$sort` thì cắt trước rồi mới sắp, khác `ORDER BY … LIMIT`.',
  'trap.$project': '`_id` luôn có trong kết quả trừ khi ghi `_id: 0`.',
};
export type NosqlKey = keyof typeof vi;

const en: Record<NosqlKey, string> = {
  'tables.colls': 'Collections used',
  'tables.dynamo': 'Tables used',
  'tables.sampleDoc': 'First document',
  'tables.sampleItem': 'First item',
  'tables.keys': 'Keys: {keys}',
  'tables.docs': '{n} documents',
  'tables.items': '{n} items',
  'rule.esr': 'Rule bar: an ESR index',
  'rule.covered': 'Rule bar: a covered query',
  'rule.match-first': 'Rule bar: `$match` first',
  'rule.note': 'Graded by a rule from the MongoDB docs, not measured on a real MongoDB: a right result that breaks the rule does not pass.',
  'error.note': 'This step passes when MongoDB refuses the command with the error `{code}`.',
  'pipe.title': 'Pipeline step by step',
  'pipe.sub': 'Each row is the result of the stages up to that point, run again on mingo with the lab data.',
  'pipe.stage': 'Stage',
  'pipe.sql': 'Like in SQL',
  'pipe.n': 'Documents out',
  'pipe.head': 'See the first {n} documents after stage {i}',
  'cmp.title': 'Compared with SQL',
  'cmp.traps': 'Where this pipeline differs from SQL',
  'cmp.sql': 'The equivalent SQL (for comparison only, not run)',
  'cmp.after': 'The equivalent SQL shows once the step passes.',
  'trap.$match': '`{ f: null }` also matches documents without the field `f`, and `$ne` keeps documents without the field; in SQL `WHERE f IS NULL` has no missing fields.',
  'trap.$group': '`$sum` silently skips every non-numeric value (the string `"300"` counts as 0), with no error as SQL would give.',
  'trap.$count': 'On an empty input `$count` returns no document, while SQL `COUNT(*)` always returns one row of 0.',
  'trap.$lookup': '`$lookup` does not multiply rows like a JOIN: the matches sit together in one array (like a LEFT JOIN, then gathered).',
  'trap.$unwind': '`$unwind` drops documents whose array is empty or missing, like an INNER JOIN, unless `preserveNullAndEmptyArrays: true` is set.',
  'trap.$sort': 'A missing field sorts like `null`, before numbers and strings; there is no `NULLS LAST`.',
  'trap.$limit': '`$limit` before `$sort` cuts first and sorts afterwards, unlike `ORDER BY … LIMIT`.',
  'trap.$project': '`_id` is always in the result unless you write `_id: 0`.',
};
export const NOSQL_DICT = { vi: vi as Record<NosqlKey, string>, en };

export function nosqlText(lang: Lang, locale: string, key: NosqlKey, params: Params = {}): string {
  return NOSQL_DICT[lang][key].replace(/\{(\w+)\}/g, (m, name: string) => {
    const v = params[name];
    return v === undefined ? m : typeof v === 'number' ? v.toLocaleString(locale) : v;
  });
}
