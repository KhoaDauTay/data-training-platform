/**
 * v28 LINK (L432): the "Đào sâu" chips: a General skill (or advanced node) → the Database Engine lessons that show what it does
 * inside the engine. General → Engine only (never the other way, L82). Lazy (chunk engineDeep), loaded by src/ui/engine.ts
 * when a skill page or a drill brief asks. Titles equal the lessons' own (tests/engineCompare.test.ts); research-engine-compare-v28 §3.2.
 */
export const DEEP: Record<string, string[]> = {select: ['e-pg-l1-01','e-dy-l1-05'], where: ['e-pg-l1-09','e-pg-l1-10','e-dy-l2-02'], order_by: ['e-pg-l1-11','e-pg-l3-14'], limit: ['e-pg-l1-11','e-dy-l1-10'], aggregate: ['e-pg-l1-08','e-dy-l2-14'], group_by: ['e-pg-l4-03','e-pg-l4-04'], join: ['e-pg-l4-04','e-dy-l3-08'], multi_join: ['e-pg-l4-05','e-dy-l3-07'], left_join: ['e-pg-l4-04','e-pg-l4-18'], anti_join: ['e-pg-l4-18'], exists: ['e-pg-l4-18'], in_subquery: ['e-pg-l4-18'], date_math: ['e-pg-l2-10'], date_bucket: ['e-pg-l2-08','e-pg-l4-07'], null_logic: ['e-pg-l1-05','e-dy-l3-06'], self_join: ['e-dy-l3-10'], string_fn: ['e-pg-l2-04'], pattern_match: ['e-pg-l2-13','e-pg-l2-12'], cast: ['e-pg-l1-01'], cte: ['e-pg-l4-19'], multi_cte: ['e-pg-l4-19'], window_rank: ['e-pg-l4-17'], window_lag: ['e-pg-l4-17'], window_agg: ['e-pg-l4-17'], explain_read: ['e-pg-l1-10','e-pg-l2-14','e-pg-l4-01'], sargable: ['e-pg-l2-04','e-pg-l1-10','e-dy-l2-02'], index_design: ['e-pg-l2-01','e-pg-l2-02','e-dy-l3-01'], a7: ['e-pg-l2-11','e-mg-l1-01'], a10: ['e-pg-l2-14','e-pg-l4-01','e-pg-l5-11'], c2: ['e-mg-l2-11','e-dy-l3-01']};
/** Lesson id → [VI title, EN title]. */
export const TITLES: Record<string, [string, string]> = {
  'e-dy-l1-05': ["GetItem: đọc một item theo khóa","GetItem: read one item by its key"],
  'e-dy-l1-10': ["Phân trang: Limit, LastEvaluatedKey, ExclusiveStartKey","Pagination: Limit, LastEvaluatedKey, ExclusiveStartKey"],
  'e-dy-l2-02': ["Điều kiện trên khóa hay trên bộ lọc","Condition on the key or in the filter"],
  'e-dy-l2-14': ["Đếm và cộng mà không Scan","Counting and summing without a Scan"],
  'e-dy-l3-01': ["Mẫu truy cập trước, khóa sau","Access patterns first, keys second"],
  'e-dy-l3-06': ["Sparse index: index chỉ chứa item đáng quan tâm","Sparse index: an index that holds only the items that matter"],
  'e-dy-l3-07': ["Thiết kế một bảng: nhiều loại item, một item collection","Single-table design: many item types, one item collection"],
  'e-dy-l3-08': ["Một Query thay cho JOIN","One Query instead of a JOIN"],
  'e-dy-l3-10': ["Adjacency list: quan hệ nhiều-nhiều và GSI đảo ngược","Adjacency list: many-to-many and the inverted GSI"],
  'e-mg-l1-01': ["Tài liệu, collection và kiểu BSON","Documents, collections and BSON types"],
  'e-mg-l2-11': ["Nhúng hay tham chiếu","Embed or reference"],
  'e-pg-l1-01': ["Chọn kiểu dữ liệu","Choosing data types"],
  'e-pg-l1-05': ["NULL không phải là một giá trị","NULL is not a value"],
  'e-pg-l1-08': ["View và materialized view","Views and materialized views"],
  'e-pg-l1-09': ["Index B-tree đầu tiên","Your first B-tree index"],
  'e-pg-l1-10': ["Có index, sao vẫn Seq Scan?","There is an index, so why a Seq Scan?"],
  'e-pg-l1-11': ["Index giúp cả ORDER BY ... LIMIT","An index also serves ORDER BY ... LIMIT"],
  'e-pg-l2-01': ["Index nhiều cột: luật cột đầu và skip scan","Multicolumn indexes: the leading-column rule and skip scan"],
  'e-pg-l2-02': ["INCLUDE, index-only scan và index cho lọc + sắp xếp","INCLUDE, index-only scans and an index for filter + sort"],
  'e-pg-l2-04': ["Index trên biểu thức","Indexes on expressions"],
  'e-pg-l2-08': ["BRIN cho dữ liệu ghi theo thời gian","BRIN for data written in time order"],
  'e-pg-l2-10': ["Khoảng thời gian, GiST và ràng buộc không chồng lịch","Time ranges, GiST and a no-double-booking constraint"],
  'e-pg-l2-11': ["jsonb và jsonb_path_ops","jsonb and jsonb_path_ops"],
  'e-pg-l2-12': ["Tìm kiếm toàn văn với tsvector và GIN","Full-text search with tsvector and GIN"],
  'e-pg-l2-13': ["pg_trgm: index cho LIKE '%...%'","pg_trgm: an index for LIKE '%...%'"],
  'e-pg-l2-14': ["Đọc EXPLAIN ANALYZE, và tạo index trên bảng đang chạy","Reading EXPLAIN ANALYZE, and indexing a live table"],
  'e-pg-l3-14': ["Lab: shared buffers, trang bẩn và sort tràn đĩa","Lab: shared buffers, dirty pages and sorts that spill to disk"],
  'e-pg-l4-01': ["Mô hình chi phí: chi phí của kế hoạch từ đâu ra","The cost model: where a plan's cost comes from"],
  'e-pg-l4-03': ["Thống kê mở rộng cho các cột tương quan","Extended statistics for correlated columns"],
  'e-pg-l4-04': ["Thuật toán nối: Nested Loop, Hash Join, Merge Join","Join algorithms: Nested Loop, Hash Join, Merge Join"],
  'e-pg-l4-05': ["Thứ tự nối, giới hạn gộp và GEQO","Join order, collapse limits and GEQO"],
  'e-pg-l4-07': ["Phân vùng khai báo và partition pruning","Declarative partitioning and partition pruning"],
  'e-pg-l4-17': ["Đoán trước: hàm cửa sổ cần dữ liệu đã sắp","Predict: window functions need sorted input"],
  'e-pg-l4-18': ["Đoán trước: ba cách viết \"không có\", ba kế hoạch","Predict: three ways to write \"has none\", three plans"],
  'e-pg-l4-19': ["Đoán trước: CTE được gộp vào câu ngoài hay tính riêng?","Predict: is a CTE folded into the outer query or computed apart?"],
  'e-pg-l5-11': ["Tìm câu tốn nhất: pg_stat_statements và pg_stat_*","Finding the costliest queries: pg_stat_statements and pg_stat_*"],
};
