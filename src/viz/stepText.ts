import type { Lang } from '../i18n';

export type StepKey = 'from' | 'where' | 'group' | 'having' | 'select' | 'distinct' | 'order' | 'limit';
export type StepsFailure = 'syntax' | 'multi' | 'notSelect' | 'withUnion' | 'window';

const SQL_LABELS: Record<StepKey, string> = {
  from: 'FROM + JOIN', where: 'WHERE', group: 'GROUP BY', having: 'HAVING',
  select: 'SELECT', distinct: 'DISTINCT', order: 'ORDER BY', limit: 'LIMIT',
};

/** Clause names are SQL keywords, the same in both languages. */
export const STEP_LABELS: Record<Lang, Record<StepKey, string>> = { vi: SQL_LABELS, en: SQL_LABELS };

export const STEP_HELP: Record<Lang, Record<StepKey, string>> = {
  vi: {
    from: 'Lấy dữ liệu từ các bảng và ghép chúng theo điều kiện JOIN. Đây là bước chạy đầu tiên.',
    where: 'Giữ lại từng dòng thỏa điều kiện. Chạy trước khi gom nhóm nên chưa dùng được hàm gộp hay alias của SELECT.',
    group: 'Gom các dòng có cùng giá trị khóa thành một nhóm (cột row_count = số dòng trong nhóm).',
    having: 'Lọc các nhóm theo kết quả hàm gộp, ví dụ SUM(...) > 900.',
    select: 'Tính các cột đầu ra và đặt alias. Viết đầu tiên nhưng chạy sau GROUP BY / HAVING.',
    distinct: 'Bỏ các dòng trùng nhau trong kết quả.',
    order: 'Sắp xếp kết quả. Chạy sau SELECT nên dùng được alias.',
    limit: 'Chỉ giữ số dòng đầu tiên theo LIMIT / OFFSET. Chạy cuối cùng.',
  },
  en: {
    from: 'Reads the tables and joins them on the JOIN conditions. This step runs first.',
    where: 'Keeps each row that matches the condition. It runs before grouping, so aggregates and SELECT aliases are not available yet.',
    group: 'Collects rows with the same key values into one group (column row_count = rows in the group).',
    having: 'Filters groups on an aggregate result, for example SUM(...) > 900.',
    select: 'Computes the output columns and their aliases. Written first, but runs after GROUP BY / HAVING.',
    distinct: 'Removes duplicate rows from the result.',
    order: 'Sorts the result. It runs after SELECT, so aliases work here.',
    limit: 'Keeps only the first rows per LIMIT / OFFSET. Runs last.',
  },
};
