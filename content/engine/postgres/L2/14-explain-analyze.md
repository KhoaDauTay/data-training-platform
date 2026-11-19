---
id: e-pg-l2-14
engine: postgres
level: L2
module: explain-analyze
title: "Đọc EXPLAIN ANALYZE, và tạo index trên bảng đang chạy"
title_en: "Reading EXPLAIN ANALYZE, and indexing a live table"
kind: concept
runtime: docs
minutes: 12
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
viz: pg-plan-tree
objectives:
  - vi: So số dòng ước lượng với số dòng thật, đọc `Buffers:` và `Rows Removed by Filter` để tìm nút đắt.
    en: Compare estimated and actual rows, and read `Buffers:` and `Rows Removed by Filter` to find the expensive node.
  - vi: Biết `CREATE INDEX` thường chặn ghi, còn `CONCURRENTLY` thì không nhưng chậm hơn và có bẫy.
    en: Know that a plain `CREATE INDEX` blocks writes while `CONCURRENTLY` does not, but is slower and has traps.
requires: [e-pg-l2-13]
sources:
  - https://www.postgresql.org/docs/18/using-explain.html
  - https://www.postgresql.org/docs/18/sql-explain.html
  - https://www.postgresql.org/docs/18/sql-createindex.html
  - https://www.postgresql.org/docs/18/explicit-locking.html
quiz:
  - q:
      vi: "Một nút ghi `rows=5` (ước lượng) nhưng `actual rows=4800`. Điều đó cho biết gì?"
      en: "A node says `rows=5` (estimate) but `actual rows=4800`. What does that tell you?"
    options:
      - { vi: "Câu chạy nhanh hơn dự kiến, không cần làm gì", en: "The query ran faster than expected, nothing to do" }
      - { vi: "Thống kê sai hoặc cũ; planner có thể đã chọn sai kế hoạch, nên chạy `ANALYZE` hoặc xem `pg_stats`", en: "Statistics are wrong or stale; the planner may have picked the wrong plan, so run `ANALYZE` or check `pg_stats`" }
      - { vi: "Index bị hỏng", en: "The index is corrupt" }
    answer: 1
    why:
      vi: "Planner chọn kế hoạch dựa trên số dòng ước lượng. Lệch gần 1000 lần thì lựa chọn nested loop, index hay thứ tự join có thể sai hết. Việc đầu tiên là kiểm thống kê."
      en: "The planner chooses plans from estimated row counts. Off by nearly 1000x, its choice of nested loop, index or join order may all be wrong. Check the statistics first."
  - q:
      vi: "Bạn cần thêm index cho bảng đơn hàng đang nhận ghi liên tục. Lệnh nào không chặn `INSERT` trong lúc tạo?"
      en: "You must add an index to an orders table that takes writes all the time. Which command does not block `INSERT` while it builds?"
    options:
      - { vi: "`CREATE INDEX`", en: "`CREATE INDEX`" }
      - { vi: "`CREATE INDEX CONCURRENTLY`", en: "`CREATE INDEX CONCURRENTLY`" }
      - { vi: "`CREATE INDEX` trong một `BEGIN ... COMMIT`", en: "`CREATE INDEX` inside a `BEGIN ... COMMIT`" }
    answer: 1
    why:
      vi: "`CREATE INDEX` lấy khóa SHARE, chặn mọi ghi tới khi xong. `CONCURRENTLY` lấy SHARE UPDATE EXCLUSIVE, cho ghi tiếp, đổi lại phải quét bảng hai lần, chờ các transaction đang chạy, không chạy được trong `BEGIN`, và nếu lỗi thì để lại một index INVALID phải xóa."
      en: "`CREATE INDEX` takes a SHARE lock and blocks all writes until it finishes. `CONCURRENTLY` takes SHARE UPDATE EXCLUSIVE and lets writes continue; in exchange it scans the table twice, waits for running transactions, cannot run inside `BEGIN`, and on failure leaves an INVALID index you must drop."
  - q:
      vi: "\"Thêm index thì câu nào cũng nhanh hơn, nên cứ thêm nhiều index.\" Điều gì sai?"
      en: "\"An index makes every query faster, so add plenty of them.\" What is wrong?"
    options:
      - { vi: "Không sai gì", en: "Nothing is wrong" }
      - { vi: "Mỗi index phải được sửa ở mỗi lần ghi, và planner vẫn bỏ qua index khi câu lấy phần lớn bảng", en: "Every index must be updated on every write, and the planner still skips an index when a query reads most of the table" }
      - { vi: "Postgres chỉ cho tối đa 3 index mỗi bảng", en: "Postgres allows at most 3 indexes per table" }
    answer: 1
    why:
      vi: "Một `INSERT` vào bảng có 6 index là 1 lần ghi heap cộng 6 lần ghi index. Còn với câu lấy 90% bảng, Seq Scan rẻ hơn mọi index (bài L1 \"Có index, sao vẫn Seq Scan?\")."
      en: "One `INSERT` into a table with 6 indexes is 1 heap write plus 6 index writes. And for a query reading 90% of the table, a Seq Scan beats any index (L1 lesson \"There is an index, so why a Seq Scan?\")."
---
## Ý chính

`EXPLAIN` chỉ in kế hoạch. `EXPLAIN ANALYZE` chạy thật câu đó và in thêm số liệu thật cho mỗi nút:

- `actual rows=... loops=...`: số dòng thật (trung bình mỗi lần lặp) và số lần nút chạy. So với `rows=` ước lượng: lệch nhiều lần là dấu hiệu thống kê sai.
- `Rows Removed by Filter`: số dòng đọc lên rồi bỏ. Lớn nghĩa là đọc thừa, thường là thiếu index phù hợp.
- `Buffers: shared hit=... read=...`: số trang 8 KB lấy từ bộ đệm (hit) hay phải đọc (read). Từ Postgres 18, `EXPLAIN ANALYZE` tự kèm `BUFFERS`. Số trang là thước đo ổn định hơn thời gian.
- `Heap Fetches`, `Index Searches` (mới ở 18): số lần về bảng và số lần tra index.

Cẩn thận: `EXPLAIN ANALYZE` thực sự chạy câu. Với `UPDATE`/`DELETE`, bọc trong `BEGIN ... ROLLBACK`.

Tạo index trên bảng đang chạy: `CREATE INDEX` thường chặn mọi lệnh ghi tới khi xong. `CREATE INDEX CONCURRENTLY` không chặn ghi nhưng cần nhiều phiên đồng thời để quan sát, nên ở đây chỉ có sơ đồ: PGlite trong trình duyệt chỉ có một phiên.

## Ví dụ

```sql
CREATE TABLE t AS SELECT g AS id, g % 100 AS k FROM generate_series(1, 20000) AS g;
ANALYZE t;
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF) SELECT count(*) FROM t WHERE k = 7;
```

Kế hoạch có `Seq Scan on t`, `Rows Removed by Filter: 19800`, và dòng `Buffers:`. Thêm index trên `k` sẽ xóa con số 19800 đó.

## Thực hành

Bấm qua sơ đồ khóa (ai chặn ai khi tạo index), rồi trả lời ba câu hỏi.

# EN

## Key idea

`EXPLAIN` only prints the plan. `EXPLAIN ANALYZE` actually runs the query and adds real figures to each node:

- `actual rows=... loops=...`: the real row count (average per loop) and how many times the node ran. Compare with the estimated `rows=`: a large gap signals wrong statistics.
- `Rows Removed by Filter`: rows read and then thrown away. A large number means wasted reading, usually a missing index.
- `Buffers: shared hit=... read=...`: how many 8 KB pages came from cache (hit) or had to be read (read). Since Postgres 18, `EXPLAIN ANALYZE` includes `BUFFERS` by default. Page counts are a steadier measure than time.
- `Heap Fetches`, `Index Searches` (new in 18): trips to the table and index lookups.

Careful: `EXPLAIN ANALYZE` really runs the query. For `UPDATE`/`DELETE`, wrap it in `BEGIN ... ROLLBACK`.

Indexing a live table: a plain `CREATE INDEX` blocks every write until it finishes. `CREATE INDEX CONCURRENTLY` does not block writes, but observing it needs several concurrent sessions, so here it is a diagram only: PGlite in the browser has a single session.

## Example

```sql
CREATE TABLE t AS SELECT g AS id, g % 100 AS k FROM generate_series(1, 20000) AS g;
ANALYZE t;
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF) SELECT count(*) FROM t WHERE k = 7;
```

The plan shows `Seq Scan on t`, `Rows Removed by Filter: 19800`, and a `Buffers:` line. An index on `k` would remove that 19800.

## Practice

Step through the lock diagram (who blocks whom while an index builds), then answer the three questions.
