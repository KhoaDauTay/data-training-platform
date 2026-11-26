---
id: e-pg-l2-14
engine: postgres
level: L2
module: explain-analyze
title: "Đọc EXPLAIN ANALYZE, và tạo index trên bảng đang chạy"
title_en: "Reading EXPLAIN ANALYZE, and indexing a live table"
kind: concept
runtime: browser
minutes: 14
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
viz: pg-lock-matrix
objectives:
  - vi: So số dòng ước lượng với số dòng thật, đọc `Buffers:` và `Rows Removed by Filter` để tìm nút đắt.
    en: Compare estimated and actual rows, and read `Buffers:` and `Rows Removed by Filter` to find the expensive node.
  - vi: Chạy `EXPLAIN ANALYZE` an toàn trên câu ghi, bằng `BEGIN ... ROLLBACK`.
    en: Run `EXPLAIN ANALYZE` safely on a write, with `BEGIN ... ROLLBACK`.
  - vi: Biết `CREATE INDEX` thường chặn ghi, còn `CONCURRENTLY` thì không nhưng chậm hơn và có bẫy.
    en: Know that a plain `CREATE INDEX` blocks writes while `CONCURRENTLY` does not, but is slower and has traps.
requires: [e-pg-l2-13]
sources:
  - https://www.postgresql.org/docs/18/using-explain.html
  - https://www.postgresql.org/docs/18/sql-explain.html
  - https://www.postgresql.org/docs/18/sql-createindex.html
  - https://www.postgresql.org/docs/18/explicit-locking.html
lab:
  setup: |
    CREATE TABLE orders (id int PRIMARY KEY, status text NOT NULL);
    INSERT INTO orders SELECT g, 'done' FROM generate_series(1, 10000) AS g;
    ANALYZE orders;
    INSERT INTO orders SELECT g, 'new' FROM generate_series(10001, 13000) AS g;
  steps:
    - task:
        vi: "`ANALYZE` đã chạy trước khi 3000 đơn `new` được thêm. Thống kê đang nghĩ gì? Trả về `most_common_vals::text` và `most_common_freqs::text` của cột `status` trong `pg_stats`."
        en: "`ANALYZE` ran before 3000 `new` orders were added. What do the statistics believe? Return `most_common_vals::text` and `most_common_freqs::text` of column `status` from `pg_stats`."
      solution: SELECT most_common_vals::text, most_common_freqs::text FROM pg_stats WHERE tablename = 'orders' AND attname = 'status'
      check: rows
      hint:
        vi: "Lọc `pg_stats` bằng `tablename` và `attname`."
        en: "Filter `pg_stats` on `tablename` and `attname`."
      fact:
        vi: "Chỉ có `{done}` với tần suất `{1}`: thống kê không biết `new` tồn tại, nên kế hoạch cho `status = 'new'` ước lượng rất ít dòng trong khi thật có 3000."
        en: "Only `{done}` with frequency `{1}`: the statistics do not know `new` exists, so a plan for `status = 'new'` estimates very few rows while 3000 are real."
        probe: SELECT most_common_vals::text, most_common_freqs::text FROM pg_stats WHERE tablename = 'orders' AND attname = 'status'
        expect: [["{done}", "{1}"]]
    - task:
        vi: "Đếm số đơn `new` thật, để so với số dòng ước lượng ở câu đoán."
        en: "Count the real `new` orders, to compare with the estimate in the prediction."
      solution: SELECT count(*) FROM orders WHERE status = 'new'
      check: rows
      hint:
        vi: "`count(*)` với `WHERE status = 'new'`."
        en: "`count(*)` with `WHERE status = 'new'`."
      fact:
        vi: "3000 dòng thật. Đây là cặp số `rows=` (ước lượng) và `actual rows=` mà `EXPLAIN ANALYZE` đặt cạnh nhau; lệch xa như vậy thì chạy `ANALYZE orders`."
        en: "3000 real rows. These are the two numbers `EXPLAIN ANALYZE` puts side by side, `rows=` (estimate) and `actual rows=`; when they are this far apart, run `ANALYZE orders`."
        probe: SELECT count(*) FROM orders WHERE status = 'new'
        expect: [[3000]]
predict:
  sql: SELECT * FROM orders WHERE status = 'new'
  expect: { node: Seq Scan, table: orders, rows: 1 }
  q:
    vi: "`ANALYZE` chạy khi bảng chỉ có 10.000 đơn `done`; sau đó 3000 đơn `new` được thêm. `EXPLAIN` của câu này ước lượng bao nhiêu dòng (`rows=`)?"
    en: "`ANALYZE` ran while the table held only 10,000 `done` orders; then 3000 `new` orders were added. What does `EXPLAIN` estimate for this query (`rows=`)?"
  options:
    - { vi: "3000: planner đếm lại trước khi chạy", en: "3000: the planner counts again before running" }
    - { vi: "1: thống kê chưa biết `new`, nên planner ước gần như không có dòng nào", en: "1: the statistics do not know `new`, so the planner guesses almost no rows" }
    - { vi: "13.000: cả bảng", en: "13,000: the whole table" }
  answer: 1
  trap: 0
  why:
    vi: "Nghe hợp lý vì 3000 là số thật, nhưng planner không đếm: nó đọc `pg_stats`, nơi `status` chỉ có `{done}` với tần suất 1. Giá trị ngoài danh sách được ước lượng gần 0, làm tròn lên 1 dòng. `EXPLAIN ANALYZE` in `rows=1` cạnh `actual rows=3000.00`: lệch như vậy là dấu hiệu chạy `ANALYZE`."
    en: "It sounds right because 3000 is the real count, but the planner does not count: it reads `pg_stats`, where `status` has only `{done}` with frequency 1. A value outside that list is estimated near 0, rounded up to 1 row. `EXPLAIN ANALYZE` prints `rows=1` next to `actual rows=3000.00`: a gap like that says run `ANALYZE`."
quiz:
  - q:
      vi: "Một nút ghi `rows=5` (ước lượng) nhưng `actual rows=4800.00`. Điều đó cho biết gì?"
      en: "A node says `rows=5` (estimate) but `actual rows=4800.00`. What does that tell you?"
    options:
      - { vi: "Câu vẫn ra đúng kết quả, nên không cần làm gì", en: "The query still returns the right result, so there is nothing to do" }
      - { vi: "Thống kê sai hoặc cũ; planner có thể đã chọn sai kế hoạch, nên chạy `ANALYZE` hoặc xem `pg_stats`", en: "Statistics are wrong or stale; the planner may have picked the wrong plan, so run `ANALYZE` or check `pg_stats`" }
      - { vi: "Index bị hỏng", en: "The index is corrupt" }
    answer: 1
    trap: 0
    why:
      vi: "Kết quả đúng chưa đủ: planner chọn kế hoạch theo số dòng ước lượng, không theo số thật. Ở đây lệch 4800 ÷ 5 = 960 lần, nên lựa chọn nested loop, index hay thứ tự join đều có thể sai cho 4800 dòng. Index hỏng thì câu báo lỗi hoặc trả sai dòng, không làm lệch ước lượng. Việc đầu tiên là chạy `ANALYZE` rồi xem lại `pg_stats`."
      en: "A correct result is not enough: the planner chooses a plan from estimated row counts, not real ones. Here the gap is 4800 ÷ 5 = 960x, so its choice of nested loop, index or join order may all be wrong for 4800 rows. A corrupt index raises errors or returns wrong rows; it does not skew the estimate. First run `ANALYZE`, then check `pg_stats` again."
  - q:
      vi: "Bạn cần thêm index cho bảng đơn hàng đang nhận ghi liên tục. Lệnh nào không chặn `INSERT` trong lúc tạo?"
      en: "You must add an index to an orders table that takes writes all the time. Which command does not block `INSERT` while it builds?"
    options:
      - { vi: "`CREATE INDEX`", en: "`CREATE INDEX`" }
      - { vi: "`CREATE INDEX CONCURRENTLY`", en: "`CREATE INDEX CONCURRENTLY`" }
      - { vi: "`CREATE INDEX` trong một `BEGIN ... COMMIT`", en: "`CREATE INDEX` inside a `BEGIN ... COMMIT`" }
    answer: 1
    trap: 2
    why:
      vi: "Nghe hợp lý vì transaction có vẻ che chắn cho các phiên khác, nhưng nó không đổi loại lock: `CREATE INDEX` vẫn giữ lock SHARE, chặn mọi ghi tới khi xong. `CONCURRENTLY` giữ SHARE UPDATE EXCLUSIVE, cho ghi tiếp; đổi lại nó quét bảng hai lần, chờ các transaction đang chạy, không chạy được trong `BEGIN`, và nếu lỗi thì để lại một index INVALID phải xóa."
      en: "It sounds right because a transaction seems to shield other sessions, but it does not change the lock: `CREATE INDEX` still takes a SHARE lock and blocks all writes until it finishes. `CONCURRENTLY` takes SHARE UPDATE EXCLUSIVE and lets writes continue; in exchange it scans the table twice, waits for running transactions, cannot run inside `BEGIN`, and on failure leaves an INVALID index you must drop."
  - q:
      vi: "\"Thêm index thì câu nào cũng nhanh hơn, nên cứ thêm nhiều index.\" Điều gì sai?"
      en: "\"An index makes every query faster, so add plenty of them.\" What is wrong?"
    options:
      - { vi: "Không sai gì", en: "Nothing is wrong" }
      - { vi: "Mỗi index phải được sửa ở mỗi lần ghi, và planner vẫn bỏ qua index khi câu lấy phần lớn bảng", en: "Every index must be updated on every write, and the planner still skips an index when a query reads most of the table" }
      - { vi: "Postgres chỉ cho tối đa 3 index mỗi bảng", en: "Postgres allows at most 3 indexes per table" }
    answer: 1
    trap: 0
    why:
      vi: "Mỗi index đúng là làm vài câu đọc nhanh hơn, nhưng mỗi lần ghi phải trả giá: một `INSERT` vào bảng có 6 index là 1 lần ghi vào heap (phần chứa dòng của bảng) cộng 6 lần ghi index. Và khi câu lấy phần lớn bảng, planner vẫn chọn Seq Scan vì đọc tuần tự rẻ hơn nhảy qua index cho từng dòng. Postgres không giới hạn 3 index mỗi bảng."
      en: "Each index does speed up some reads, but every write pays for it: one `INSERT` into a table with 6 indexes is 1 write to the heap (where the table's rows live) plus 6 index writes. And when a query reads most of the table, the planner still picks a Seq Scan, because reading in order is cheaper than jumping through the index for each row. Postgres has no 3-index limit per table."
---
## Mở bài

Trang báo cáo đơn mới chạy chậm, và `EXPLAIN` nói planner chỉ chờ 1 dòng. Con số đó là đoán hay là thật? Bài này cho bạn đặt cái đoán cạnh cái thật để tìm ra chỗ sai.

## Ý chính

`EXPLAIN` chỉ in kế hoạch planner định làm, kèm chi phí và số dòng ước lượng. `EXPLAIN ANALYZE` chạy thật câu đó rồi in thêm số liệu đo được cho từng nút. Đọc từ nút trong cùng ra ngoài: nút lá đọc bảng, các nút cha lọc, nối, gom, sắp xếp kết quả của nút con.

Những dòng đáng đọc nhất:

- `actual rows=... loops=...`: số dòng thật trung bình mỗi lần lặp và số lần lặp. Từ bản 18 con số này in hai chữ số thập phân, ví dụ `actual rows=3000.00`. Đặt cạnh `rows=` ước lượng: lệch nhiều lần là dấu hiệu thống kê sai hoặc cũ.
- `Rows Removed by Filter`: số dòng đọc lên rồi bỏ. Lớn nghĩa là đọc thừa, thường là thiếu index hợp với điều kiện.
- `Buffers: shared hit=... read=...`: số trang 8 KB lấy từ bộ đệm (`hit`) hay phải đọc (`read`). Từ bản 18, `EXPLAIN ANALYZE` tự kèm phần này. Số trang ổn định giữa các lần chạy hơn thời gian.
- `Index Searches` (mới ở 18): số lần tra index của một nút quét index.

Thời gian (`actual time`) thay đổi theo máy, bộ đệm, tải lúc chạy. Hãy dùng nó để biết nút nào chiếm phần lớn, đừng so mili giây giữa hai máy. Tùy chọn `TIMING OFF` bỏ phần đo giờ khi bạn chỉ cần số dòng.

Nhiều người nghĩ `EXPLAIN ANALYZE` chỉ "giả lập" câu lệnh. Thật ra nó chạy thật: một `DELETE` dưới `EXPLAIN ANALYZE` xóa dòng thật. Với `INSERT`, `UPDATE`, `DELETE`, hãy bọc trong `BEGIN ... ROLLBACK`.

Phần thứ hai là tạo index trên bảng đang nhận ghi. `CREATE INDEX` thường giữ lock SHARE: mọi `INSERT`, `UPDATE`, `DELETE` phải chờ tới khi index xong, trên bảng lớn có thể là nhiều phút. `CREATE INDEX CONCURRENTLY` giữ lock nhẹ hơn nên ghi vẫn chạy, đổi lại nó quét bảng hai lần, phải chờ các transaction cũ kết thúc, không chạy được trong một khối `BEGIN`, và nếu thất bại thì để lại một index đánh dấu INVALID mà bạn phải tự xóa. PGlite trong trình duyệt chỉ có một phiên, nên phần chờ lock chỉ xem được qua sơ đồ.

## Cú pháp

```sql
EXPLAIN [ ( ANALYZE [, BUFFERS { ON | OFF } ] [, TIMING { ON | OFF } ] [, COSTS { ON | OFF } ]
          [, SUMMARY { ON | OFF } ] [, FORMAT { TEXT | JSON } ] ) ] statement;
CREATE INDEX [ CONCURRENTLY ] index_name ON table_name ( column [, ...] );
```

- `ANALYZE`: chạy thật câu lệnh và in số liệu đo được.
- `BUFFERS`: số trang đọc; bật sẵn cùng `ANALYZE` từ bản 18.
- `TIMING OFF`, `COSTS OFF`, `SUMMARY OFF`: bỏ phần đo giờ, chi phí, dòng tổng kết.
- `CONCURRENTLY`: tạo index mà không chặn ghi, ngoài mọi transaction.

## Ví dụ

Đặt ước lượng cạnh số thật:

```sql
EXPLAIN (ANALYZE, TIMING OFF, SUMMARY OFF) SELECT * FROM orders WHERE status = 'new';
```

Nút `Seq Scan` ghi `rows=1` nhưng `actual rows=3000.00`, và `Rows Removed by Filter: 10000`. Thống kê cũ là thủ phạm.

Cập nhật thống kê rồi hỏi lại:

```sql
ANALYZE orders;
EXPLAIN SELECT * FROM orders WHERE status = 'new';
```

Giờ planner ước lượng `rows=3000`, đúng bằng số thật.

Một bảng không có index trên cột lọc:

```sql
CREATE TABLE t AS SELECT g AS id, g % 100 AS k FROM generate_series(1, 20000) AS g;
ANALYZE t;
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF) SELECT count(*) FROM t WHERE k = 7;
```

Kế hoạch có `Seq Scan on t`, `Rows Removed by Filter: 19800` và dòng `Buffers:`: đọc 20.000 dòng để giữ 200.

Thêm index rồi đo lại:

```sql
CREATE INDEX t_k_idx ON t (k);
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF) SELECT count(*) FROM t WHERE k = 7;
```

Giờ là `Bitmap Index Scan on t_k_idx` với `Index Searches: 1`; con số 19.800 dòng bỏ đi đã biến mất.

## Lỗi hay gặp

Chạy `CONCURRENTLY` trong một transaction:

```sql
BEGIN;
-- ERROR 25001: CREATE INDEX CONCURRENTLY cannot run inside a transaction block
CREATE INDEX CONCURRENTLY t_id_idx ON t (id);
```

Lệnh này tự quản lý nhiều transaction bên trong, nên phải chạy một mình. Kết thúc khối hỏng bằng `ROLLBACK` rồi chạy lại ngoài `BEGIN`.

Đo một câu `DELETE` mà quên nó chạy thật:

```sql
-- WRONG: EXPLAIN ANALYZE really deletes the rows
ROLLBACK;
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF) DELETE FROM t WHERE k = 7;
SELECT count(*) AS left_after FROM t WHERE k = 7;
```

```sql
-- FIX: measure inside a transaction and roll it back
BEGIN;
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF) DELETE FROM t WHERE k = 8;
ROLLBACK;
SELECT count(*) AS left_after FROM t WHERE k = 8;
```

Câu sai để lại 0 dòng `k = 7`; câu đúng vẫn còn đủ 200 dòng `k = 8`.

## Tóm tắt

- `EXPLAIN` đoán, `EXPLAIN ANALYZE` chạy thật và đặt `actual rows` cạnh `rows=`.
- Lệch lớn giữa ước lượng và thực tế thì kiểm `pg_stats` và chạy `ANALYZE`.
- `Rows Removed by Filter` lớn và `Buffers:` cao chỉ ra nút đọc thừa; đừng so mili giây giữa các máy.
- Đo câu ghi trong `BEGIN ... ROLLBACK`.
- `CREATE INDEX` chặn ghi; `CONCURRENTLY` không chặn nhưng chạy ngoài transaction và có thể để lại index INVALID.

# EN

## Opening

The new-orders report runs slowly, and `EXPLAIN` says the planner expects 1 row. Is that number a guess or the truth? This lesson puts the guess next to the truth so you can find what is wrong.

## Key idea

`EXPLAIN` only prints the plan the planner intends to run, with its costs and estimated rows. `EXPLAIN ANALYZE` actually runs the query and adds the measured figures to each node. Read from the innermost node outwards: leaf nodes read tables, and parent nodes filter, join, aggregate and sort what their children return.

The lines most worth reading:

- `actual rows=... loops=...`: the real rows on average per loop and how many loops ran. Since version 18 this prints two decimals, for example `actual rows=3000.00`. Put it next to the estimated `rows=`: a gap of many times signals wrong or stale statistics.
- `Rows Removed by Filter`: rows read and then thrown away. A large number means wasted reading, usually a missing index for the condition.
- `Buffers: shared hit=... read=...`: how many 8 KB pages came from cache (`hit`) or had to be read (`read`). Since version 18, `EXPLAIN ANALYZE` includes it by default. Page counts are steadier between runs than time.
- `Index Searches` (new in 18): how many times an index scan node searched the index.

Time (`actual time`) varies with the machine, the cache and the load at that moment. Use it to see which node takes most of the work, never to compare milliseconds between two machines. The `TIMING OFF` option drops the clock when you only need row counts.

Many people think `EXPLAIN ANALYZE` only "simulates" the statement. In fact it really runs it: a `DELETE` under `EXPLAIN ANALYZE` deletes real rows. For `INSERT`, `UPDATE` and `DELETE`, wrap it in `BEGIN ... ROLLBACK`.

The second part is indexing a table that takes writes. A plain `CREATE INDEX` takes a SHARE lock: every `INSERT`, `UPDATE` and `DELETE` waits until the index is done, which on a big table can be minutes. `CREATE INDEX CONCURRENTLY` takes a lighter lock so writes keep flowing; in exchange it scans the table twice, must wait for older transactions to finish, cannot run inside a `BEGIN` block, and if it fails it leaves an index marked INVALID that you must drop yourself. PGlite in the browser has a single session, so the lock waits are shown only in the diagram.

## Syntax

```sql
EXPLAIN [ ( ANALYZE [, BUFFERS { ON | OFF } ] [, TIMING { ON | OFF } ] [, COSTS { ON | OFF } ]
          [, SUMMARY { ON | OFF } ] [, FORMAT { TEXT | JSON } ] ) ] statement;
CREATE INDEX [ CONCURRENTLY ] index_name ON table_name ( column [, ...] );
```

- `ANALYZE`: really run the statement and print measured figures.
- `BUFFERS`: pages read; on by default with `ANALYZE` since version 18.
- `TIMING OFF`, `COSTS OFF`, `SUMMARY OFF`: drop timing, costs, the summary lines.
- `CONCURRENTLY`: build the index without blocking writes, outside any transaction.

## Example

Put the estimate next to the real count:

```sql
EXPLAIN (ANALYZE, TIMING OFF, SUMMARY OFF) SELECT * FROM orders WHERE status = 'new';
```

The `Seq Scan` node says `rows=1` but `actual rows=3000.00`, and `Rows Removed by Filter: 10000`. Stale statistics are to blame.

Refresh the statistics and ask again:

```sql
ANALYZE orders;
EXPLAIN SELECT * FROM orders WHERE status = 'new';
```

Now the planner estimates `rows=3000`, exactly the real count.

A table with no index on the filtered column:

```sql
CREATE TABLE t AS SELECT g AS id, g % 100 AS k FROM generate_series(1, 20000) AS g;
ANALYZE t;
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF) SELECT count(*) FROM t WHERE k = 7;
```

The plan shows `Seq Scan on t`, `Rows Removed by Filter: 19800` and a `Buffers:` line: 20,000 rows read to keep 200.

Add an index and measure again:

```sql
CREATE INDEX t_k_idx ON t (k);
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF) SELECT count(*) FROM t WHERE k = 7;
```

Now it is a `Bitmap Index Scan on t_k_idx` with `Index Searches: 1`; the 19,800 thrown-away rows are gone.

## Common mistakes

Running `CONCURRENTLY` inside a transaction:

```sql
BEGIN;
-- ERROR 25001: CREATE INDEX CONCURRENTLY cannot run inside a transaction block
CREATE INDEX CONCURRENTLY t_id_idx ON t (id);
```

The command manages several transactions of its own, so it must run alone. End the broken block with `ROLLBACK` and run it again outside `BEGIN`.

Measuring a `DELETE` and forgetting that it really runs:

```sql
-- WRONG: EXPLAIN ANALYZE really deletes the rows
ROLLBACK;
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF) DELETE FROM t WHERE k = 7;
SELECT count(*) AS left_after FROM t WHERE k = 7;
```

```sql
-- FIX: measure inside a transaction and roll it back
BEGIN;
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF) DELETE FROM t WHERE k = 8;
ROLLBACK;
SELECT count(*) AS left_after FROM t WHERE k = 8;
```

The wrong version leaves 0 rows with `k = 7`; the right one still has all 200 rows with `k = 8`.

## Recap

- `EXPLAIN` guesses, `EXPLAIN ANALYZE` really runs and puts `actual rows` next to `rows=`.
- A big gap between estimate and reality: check `pg_stats` and run `ANALYZE`.
- A large `Rows Removed by Filter` and high `Buffers:` point at the node that reads too much; never compare milliseconds across machines.
- Measure writes inside `BEGIN ... ROLLBACK`.
- `CREATE INDEX` blocks writes; `CONCURRENTLY` does not, but runs outside a transaction and can leave an INVALID index.
