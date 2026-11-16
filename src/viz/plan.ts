import type { Lang } from '../i18n';

export type PlanDetail = {
  kind: 'index' | 'indexCond' | 'hashCond' | 'joinFilter' | 'filter' | 'groupKey' | 'sortKey';
  /** Raw Postgres text (expression, index name). Translated labels are added by the view. */
  text: string;
  removed?: number;
};

export interface PlanNode {
  id: number;
  depth: number;
  parent: number | null;
  type: string;
  label: string;
  relation?: string;
  /** Actual rows × loops: rows this node handed to its parent. */
  rows: number;
  /** rows + rows removed by filter: rows the node actually looked at. */
  scanned: number;
  estRows: number;
  ms: number;
  detail: PlanDetail[];
}

export interface Plan {
  nodes: PlanNode[];
  executionMs: number;
}

interface RawNode {
  'Node Type': string;
  Strategy?: string;
  'Join Type'?: string;
  'Relation Name'?: string;
  Alias?: string;
  'Index Name'?: string;
  'Actual Rows'?: number;
  'Actual Loops'?: number;
  'Plan Rows'?: number;
  'Actual Total Time'?: number;
  Filter?: string;
  'Rows Removed by Filter'?: number;
  'Hash Cond'?: string;
  'Index Cond'?: string;
  'Join Filter'?: string;
  'Sort Key'?: string[];
  'Group Key'?: string[];
  Plans?: RawNode[];
}

const AGG: Record<string, string> = { Hashed: 'HashAggregate', Sorted: 'GroupAggregate', Mixed: 'MixedAggregate' };

function label(n: RawNode): string {
  const base = n['Node Type'] === 'Aggregate' ? (AGG[n.Strategy ?? ''] ?? 'Aggregate') : n['Node Type'];
  const join = n['Join Type'] && n['Join Type'] !== 'Inner' ? ` (${n['Join Type']})` : '';
  const rel = n['Relation Name'];
  const alias = n.Alias && n.Alias !== rel ? ` ${n.Alias}` : '';
  return `${base}${join}${rel ? ` ${rel}${alias}` : ''}`;
}

function detail(n: RawNode): PlanDetail[] {
  const out: PlanDetail[] = [];
  if (n['Index Name']) out.push({ kind: 'index', text: n['Index Name'] });
  if (n['Index Cond']) out.push({ kind: 'indexCond', text: n['Index Cond'] });
  if (n['Hash Cond']) out.push({ kind: 'hashCond', text: n['Hash Cond'] });
  if (n['Join Filter']) out.push({ kind: 'joinFilter', text: n['Join Filter'] });
  if (n.Filter) {
    const removed = n['Rows Removed by Filter'];
    out.push(removed ? { kind: 'filter', text: n.Filter, removed } : { kind: 'filter', text: n.Filter });
  }
  if (n['Group Key']) out.push({ kind: 'groupKey', text: n['Group Key'].join(', ') });
  if (n['Sort Key']) out.push({ kind: 'sortKey', text: n['Sort Key'].join(', ') });
  return out;
}

export function flattenPlan(json: unknown): Plan {
  const root = (json as { Plan: RawNode; 'Execution Time'?: number }[])[0];
  const nodes: PlanNode[] = [];
  const walk = (n: RawNode, depth: number, parent: number | null) => {
    const id = nodes.length;
    const rows = (n['Actual Rows'] ?? 0) * (n['Actual Loops'] ?? 1);
    nodes.push({
      id, depth, parent,
      type: n['Node Type'],
      label: label(n),
      relation: n['Relation Name'],
      rows,
      scanned: rows + (n['Rows Removed by Filter'] ?? 0) * (n['Actual Loops'] ?? 1),
      estRows: n['Plan Rows'] ?? 0,
      ms: n['Actual Total Time'] ?? 0,
      detail: detail(n),
    });
    for (const child of n.Plans ?? []) walk(child, depth + 1, id);
  };
  walk(root.Plan, 0, null);
  return { nodes, executionMs: root['Execution Time'] ?? 0 };
}

export const NODE_HELP: Record<Lang, Record<string, string>> = {
  vi: {
    'Seq Scan': 'Đọc toàn bộ bảng từ đầu đến cuối và kiểm tra từng dòng. Chậm khi bảng lớn mà chỉ cần ít dòng.',
    'Index Scan': 'Dùng index để nhảy thẳng tới các dòng cần, rồi đọc các dòng đó trong bảng.',
    'Index Only Scan': 'Lấy dữ liệu ngay trong index, không cần đọc bảng.',
    'Bitmap Index Scan': 'Dùng index để đánh dấu các trang dữ liệu có dòng phù hợp.',
    'Bitmap Heap Scan': 'Đọc các trang bảng đã được đánh dấu bởi Bitmap Index Scan.',
    'Hash Join': 'Dựng bảng băm từ một phía (node Hash) rồi dò từng dòng của phía còn lại vào bảng băm.',
    Hash: 'Xây bảng băm trong bộ nhớ từ các dòng bên dưới để Hash Join dò tìm.',
    'Nested Loop': 'Với mỗi dòng phía ngoài, tìm các dòng khớp phía trong. Nhanh khi phía ngoài có ít dòng.',
    'Merge Join': 'Ghép hai đầu vào đã được sắp xếp theo khóa join, đi song song từ trên xuống.',
    Sort: 'Sắp xếp các dòng (cho ORDER BY, hoặc chuẩn bị cho Merge Join / GroupAggregate).',
    'Incremental Sort': 'Sắp xếp tiếp phần còn thiếu trên dữ liệu đã được sắp theo một phần khóa.',
    Aggregate: 'Gộp nhiều dòng thành giá trị tổng hợp (COUNT, SUM, AVG…), theo nhóm nếu có GROUP BY.',
    Limit: 'Dừng ngay khi đã đủ số dòng của LIMIT.',
    Unique: 'Bỏ các dòng trùng nhau liền kề (DISTINCT trên dữ liệu đã sắp xếp).',
    Materialize: 'Lưu tạm kết quả bên dưới để đọc lại nhiều lần.',
    Memoize: 'Ghi nhớ kết quả theo khóa để không tính lại cho cùng giá trị.',
    'Subquery Scan': 'Đọc kết quả của một truy vấn con như một bảng.',
    'CTE Scan': 'Đọc kết quả của một mệnh đề WITH.',
    WindowAgg: 'Tính hàm cửa sổ (RANK, LAG, SUM OVER…) trên từng dòng mà không gộp dòng.',
    Append: 'Nối kết quả của nhiều nhánh (UNION ALL, bảng phân vùng).',
    SetOp: 'Thực hiện INTERSECT / EXCEPT.',
    Result: 'Tính biểu thức không cần đọc bảng.',
    Gather: 'Gom kết quả từ các tiến trình chạy song song.',
  },
  en: {
    'Seq Scan': 'Reads the whole table from start to end and checks every row. Slow when the table is large but only a few rows are needed.',
    'Index Scan': 'Uses an index to jump straight to the matching rows, then reads those rows from the table.',
    'Index Only Scan': 'Gets the data from the index itself without reading the table.',
    'Bitmap Index Scan': 'Uses an index to mark the data pages that contain matching rows.',
    'Bitmap Heap Scan': 'Reads the table pages marked by the Bitmap Index Scan.',
    'Hash Join': 'Builds a hash table from one side (the Hash node), then probes it with every row from the other side.',
    Hash: 'Builds an in-memory hash table from the rows below so the Hash Join can probe it.',
    'Nested Loop': 'For each outer row, looks up the matching inner rows. Fast when the outer side has few rows.',
    'Merge Join': 'Joins two inputs that are already sorted on the join key, walking both from top to bottom.',
    Sort: 'Sorts the rows (for ORDER BY, or to prepare a Merge Join / GroupAggregate).',
    'Incremental Sort': 'Finishes sorting data that is already sorted on part of the key.',
    Aggregate: 'Collapses many rows into summary values (COUNT, SUM, AVG…), per group when there is a GROUP BY.',
    Limit: 'Stops as soon as it has the number of rows in LIMIT.',
    Unique: 'Removes adjacent duplicate rows (DISTINCT on sorted data).',
    Materialize: 'Keeps the rows below in memory so they can be read again.',
    Memoize: 'Remembers results per key so the same value is not computed twice.',
    'Subquery Scan': 'Reads the result of a subquery as if it were a table.',
    'CTE Scan': 'Reads the result of a WITH clause.',
    WindowAgg: 'Computes window functions (RANK, LAG, SUM OVER…) for each row without collapsing rows.',
    Append: 'Concatenates the results of several branches (UNION ALL, partitioned tables).',
    SetOp: 'Performs INTERSECT / EXCEPT.',
    Result: 'Computes expressions without reading a table.',
    Gather: 'Collects results from parallel worker processes.',
  },
};

const NODE_FALLBACK: Record<Lang, string> = {
  vi: 'Một bước trong kế hoạch thực thi của Postgres.',
  en: "A step in Postgres' execution plan.",
};

export function nodeExplanation(type: string, lang: Lang): string {
  return NODE_HELP[lang][type] ?? NODE_FALLBACK[lang];
}

export function isHeavyScan(n: PlanNode): boolean {
  return n.type === 'Seq Scan' && n.scanned >= 10_000;
}
