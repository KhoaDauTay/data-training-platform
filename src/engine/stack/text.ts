/**
 * v45 S-03/S-04 (stack-eye): the dbt-style lab's own sentences, VI/EN, used by the Postgres lab runner (src/engine/pglab/runner.ts,
 * the `pglab` chunk) so the `engineui` chunk does not grow. Codes and SQL stay as they are; only the explanation is translated.
 */
import type { DbtCode } from './dbt';

type Lang = 'vi' | 'en';
type Params = Record<string, string | number>;
const T = {
  vi: {
    'jinja-unsupported': 'BoonData chỉ hiểu {{ source() }}, {{ ref() }}, {{ config() }}, {{ this }} và {% if is_incremental() %} … {% endif %}. Bỏ phần không thuộc danh sách này: {what}.',
    'ref-missing': 'Chưa có model tên "{name}". Các model bước này đọc được: {list}.',
    'source-missing': 'Không có nguồn "{name}". Các nguồn của lab: {list}.',
    'ref-cycle': 'Model không ref() chính nó được; muốn đọc bảng của chính model thì dùng {{ this }}.',
    'config-invalid': 'config() không hợp lệ ở đây: {what}. Bước này dựng model kiểu {want}.',
    'this-outside-model': '{{ this }} và config() chỉ dùng trong một bước dựng model.',
    at: 'dòng {line}, cột {col}',
    needRef: 'Đúng kết quả, nhưng hãy đọc model bằng {{ ref(\'{name}\') }} thay vì gõ tên schema: ref() là thứ ghi lại phụ thuộc.',
    needSource: 'Đúng kết quả, nhưng hãy đọc bảng raw bằng {{ source(\'{s}\', \'{t}\') }} thay vì gõ tên schema: source() là thứ ghi lại phụ thuộc.',
    needFilter: 'Model chưa có bộ lọc incremental: thêm khối {% if is_incremental() %} … {% endif %} đọc mức lớn nhất từ {{ this }}. Không có nó, lần chạy sau xử lý lại cả bảng.',
    afterMissing: 'Model {model} dựng được, nhưng câu kiểm tra đọc lại nó báo lỗi: {err}. Model của bạn có các cột: {cols}. Câu kiểm tra: {sql}',
    afterNoModel: 'Câu của bạn chạy được, nhưng câu kiểm tra không đọc được {model}: {err}. Câu kiểm tra: {sql}',
  },
  en: {
    'jinja-unsupported': 'BoonData understands only {{ source() }}, {{ ref() }}, {{ config() }}, {{ this }} and {% if is_incremental() %} … {% endif %}. Remove what is not on that list: {what}.',
    'ref-missing': 'There is no model called "{name}". The models this step can read: {list}.',
    'source-missing': 'There is no source "{name}". The lab\'s sources: {list}.',
    'ref-cycle': 'A model cannot ref() itself; to read the model\'s own table, use {{ this }}.',
    'config-invalid': 'config() is not valid here: {what}. This step builds a {want} model.',
    'this-outside-model': '{{ this }} and config() only work in a step that builds a model.',
    at: 'line {line}, column {col}',
    needRef: 'The result is right, but read the model with {{ ref(\'{name}\') }} instead of typing the schema: ref() is what records the dependency.',
    needSource: 'The result is right, but read the raw table with {{ source(\'{s}\', \'{t}\') }} instead of typing the schema: source() is what records the dependency.',
    needFilter: 'The model has no incremental filter yet: add an {% if is_incremental() %} … {% endif %} block that reads the largest value from {{ this }}. Without it, a later run reprocesses the whole table.',
    afterMissing: 'Model {model} was built, but the check that reads it back failed: {err}. Your model has the columns: {cols}. The check: {sql}',
    afterNoModel: 'Your statement ran, but the check could not read {model}: {err}. The check: {sql}',
  },
} as const;
export type StackKey = keyof (typeof T)['vi'];
export const stackText = (lang: Lang, key: StackKey | DbtCode, p: Params = {}): string =>
  (T[lang][key as StackKey] ?? key).replace(/\{(\w+)\}/g, (m, k: string) => (k in p ? String(p[k]) : m));
