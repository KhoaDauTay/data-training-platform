---
id: e-ds-l5-06
engine: design
level: L5
module: internals
title: Thuật toán xử lý truy vấn - sắp ngoài, chọn, nối
title_en: Query processing algorithms - external sort, selection, joins
kind: concept
runtime: browser
minutes: 15
figures: [{ name: ds-external-sort, at: idea }]
objectives:
  - vi: Kể các bước xử lý một câu truy vấn và chỗ mỗi thuật toán xuất hiện trong EXPLAIN.
    en: List the steps of processing a query and where each algorithm shows up in EXPLAIN.
  - vi: Tính số run và số lượt trộn của sắp xếp ngoài, và chi phí đọc trang của nối vòng lồng.
    en: Work out the runs and merge passes of an external sort, and the page reads of a nested-loop join.
  - vi: Biết khi nào nối vòng lồng, nối băm, nối trộn thắng.
    en: Know when nested-loop, hash and merge joins win.
requires: [e-ds-l5-01]
sources:
  - { url: https://www.postgresql.org/docs/18/query-path.html, title_vi: "Đường đi của một truy vấn" }
  - { url: https://www.postgresql.org/docs/18/using-explain.html, title_vi: "Dùng EXPLAIN" }
  - { url: https://www.postgresql.org/docs/18/planner-optimizer.html, title_vi: "Planner và optimizer" }
lab:
  setup: |
    CREATE TABLE sales AS SELECT g AS id, (g * 7919) % 1000 AS amount FROM generate_series(1, 20000) g;
    ALTER TABLE sales ADD PRIMARY KEY (id);
    ANALYZE sales;
    CREATE TABLE nums (pos int PRIMARY KEY, v int NOT NULL);
    INSERT INTO nums VALUES (1, 42), (2, 7), (3, 19), (4, 3), (5, 88), (6, 15), (7, 61), (8, 2), (9, 30), (10, 9), (11, 77), (12, 50);
    CREATE TABLE rel (name text PRIMARY KEY, pages int NOT NULL, tuples int NOT NULL);
    INSERT INTO rel VALUES ('R', 1000, 100000), ('S', 500, 40000);
  steps:
    - task:
        vi: "Pha tạo run của sắp xếp ngoài: bộ nhớ chứa được 4 giá trị. Chia `nums` theo `pos` thành các nhóm 4 liên tiếp (run 0, 1, 2), mỗi run sắp tăng dần thành một mảng. Trả `run`, `sorted`, xếp theo `run`."
        en: "The run phase of an external sort: memory holds 4 values. Cut `nums` by `pos` into consecutive groups of 4 (run 0, 1, 2), each sorted ascending into an array. Return `run`, `sorted`, ordered by `run`."
      solution: SELECT (pos - 1) / 4 AS run, array_agg(v ORDER BY v) AS sorted FROM nums GROUP BY (pos - 1) / 4 ORDER BY run
      check: rows
      ordered: true
      hint:
        vi: "Số run là `(pos - 1) / 4` (chia nguyên); `array_agg(v ORDER BY v)` cho mảng đã sắp."
        en: "The run number is `(pos - 1) / 4` (integer division); `array_agg(v ORDER BY v)` gives the sorted array."
    - task:
        vi: "Sắp bảng `R` (cột `pages` trong `rel`) với 11 trang bộ nhớ: số run là `ceil(pages / 11.0)`, mỗi lượt trộn gộp 10 run. Trả `runs` và `merge_passes` = trần của log cơ số 10 của số run."
        en: "Sort table `R` (column `pages` in `rel`) with 11 memory pages: the run count is `ceil(pages / 11.0)`, and each merge pass combines 10 runs. Return `runs` and `merge_passes` = the ceiling of the base-10 log of the run count."
      solution: SELECT ceil(pages / 11.0) AS runs, ceil(ln(ceil(pages / 11.0)) / ln(10)) AS merge_passes FROM rel WHERE name = 'R'
      check: rows
      hint:
        vi: "Log cơ số 10 viết được là `ln(x) / ln(10)` hoặc `log(x)`; bọc ngoài bằng `ceil`."
        en: "A base-10 log can be written `ln(x) / ln(10)` or `log(x)`; wrap it in `ceil`."
    - task:
        vi: "Chi phí đọc trang khi `R` là vòng ngoài và `S` là vòng trong: vòng lồng theo bộ = `R.pages + R.tuples * S.pages`, vòng lồng theo khối = `R.pages + R.pages * S.pages`. Trả `tuple_nl`, `block_nl`."
        en: "Page reads with `R` outer and `S` inner: tuple nested loop = `R.pages + R.tuples * S.pages`, block nested loop = `R.pages + R.pages * S.pages`. Return `tuple_nl`, `block_nl`."
      solution: SELECT r.pages + r.tuples * s.pages AS tuple_nl, r.pages + r.pages * s.pages AS block_nl FROM rel r, rel s WHERE r.name = 'R' AND s.name = 'S'
      check: rows
      hint:
        vi: "Lấy hai dòng của `rel` bằng hai bí danh `r` và `s`, lọc theo `name`."
        en: "Take two rows of `rel` with two aliases `r` and `s`, filtered on `name`."
quiz:
  - q:
      vi: "Nối hai bảng lớn bằng điều kiện `=`, không có index, bộ nhớ đủ chứa bảng nhỏ hơn. Thuật toán nào thường rẻ nhất?"
      en: "Joining two big tables on `=`, no index, memory big enough for the smaller table. Which algorithm is usually cheapest?"
    options:
      - { vi: "Nối vòng lồng, vì đơn giản nhất", en: "Nested loop, because it is the simplest" }
      - { vi: "Nối băm: dựng bảng băm trên bảng nhỏ, quét bảng lớn một lần", en: "Hash join: build a hash table on the small table, scan the big one once" }
      - { vi: "Nối trộn, vì nó luôn nhanh nhất", en: "Merge join, because it is always fastest" }
    answer: 1
    trap: 0
    why:
      vi: "Vòng lồng đơn giản nhưng không có index thì nó đọc lại cả bảng trong cho mỗi dòng ngoài: với `R` và `S` của lab là 1.000 + 100.000 × 500 = 50.001.000 lượt đọc trang. Nối băm dựng bảng băm trên bảng nhỏ rồi quét bảng lớn một lần, khoảng 1.000 + 500 = 1.500 trang. Nối trộn không luôn nhanh nhất: hai bên chưa có thứ tự thì phải sắp cả hai trước, nên nó chỉ thắng khi dữ liệu đã có thứ tự sẵn."
      en: "A nested loop is simple, but without an index it rereads the whole inner table for each outer row: for the lab's `R` and `S` that is 1,000 + 100,000 × 500 = 50,001,000 page reads. A hash join builds a hash table on the small table and scans the big one once, about 1,000 + 500 = 1,500 pages. A merge join is not always fastest: unordered inputs must both be sorted first, so it wins only when the data is already ordered."
  - q:
      vi: "EXPLAIN ghi `Sort Method: external merge  Disk: 900kB`. Nghĩa là gì?"
      en: "EXPLAIN shows `Sort Method: external merge  Disk: 900kB`. What does it mean?"
    options:
      - { vi: "Ổ đĩa sắp hỏng", en: "The disk is about to fail" }
      - { vi: "Dữ liệu cần sắp lớn hơn `work_mem`, nên Postgres sắp từng run rồi trộn qua file tạm", en: "The data to sort is bigger than `work_mem`, so Postgres sorts runs and merges them through temp files" }
      - { vi: "Bảng được lưu sẵn theo thứ tự", en: "The table is stored in order already" }
    answer: 1
    trap: 2
    why:
      vi: "\"Merge\" không có nghĩa là bảng đã có thứ tự, và `Disk` không nói gì về ổ đĩa hỏng. Dòng này nghĩa là dữ liệu cần sắp lớn hơn `work_mem` (bộ nhớ mỗi phép sắp được dùng), nên Postgres làm sắp xếp ngoài: sắp từng phần vừa bộ nhớ thành một run, ghi 900 kB ra file tạm, rồi trộn các run lại. Tăng `work_mem` cho câu đó, hoặc dùng một index đã có thứ tự sẵn, sẽ bỏ được bước ghi đĩa."
      en: "\"Merge\" does not mean the table is stored in order, and `Disk` says nothing about a failing drive. The line means the data to sort is bigger than `work_mem` (the memory each sort may use), so Postgres does an external sort: it sorts pieces that fit in memory into runs, writes 900 kB to temp files, then merges the runs. Raising `work_mem` for that query, or using an index that is already ordered, removes the disk step."
---
## Mở bài

Cùng một câu SQL, database có thể chạy bằng nhiều thuật toán khác nhau, rẻ hay đắt hàng nghìn lần. Sách giáo khoa đo chi phí bằng số trang đọc từ đĩa. Bài này học các thuật toán đó và tìm chúng trong kế hoạch của PostgreSQL.

## Ý chính

Một câu đi qua bốn bước: phân tích cú pháp, viết lại (mở view, luật), lập kế hoạch, thực thi. Bộ lập kế hoạch chọn thuật toán cho từng phép của cây đại số dựa trên ước lượng số dòng và chi phí.

**Sắp xếp ngoài** khi dữ liệu lớn hơn bộ nhớ: đọc từng phần vừa bộ nhớ, sắp, ghi ra thành một **run**; rồi trộn nhiều run một lượt cho tới khi còn một. Với N trang và B trang bộ nhớ: khoảng ⌈N/B⌉ run, mỗi lượt trộn gộp B − 1 run. **Chọn** (`WHERE`): quét tuần tự đọc mọi trang; quét index đi thẳng tới dòng khớp, tốt khi khớp ít; quét bitmap gom các vị trí từ index rồi đọc trang theo thứ tự, ở giữa hai cách trên.

**Nối**: vòng lồng duyệt mỗi dòng ngoài và tìm dòng trong, rất tốt khi vòng ngoài ít dòng và bảng trong có index; bản theo khối đọc bảng trong một lần cho mỗi khối của bảng ngoài thay vì mỗi dòng. Nối băm dựng bảng băm trên bên nhỏ rồi quét bên lớn, chỉ dùng cho `=`. Nối trộn cần hai bên đã sắp theo khóa nối. **Chiếu bỏ trùng** và phép tập (`DISTINCT`, `UNION`, `EXCEPT`) dùng sắp xếp hoặc băm. Kế hoạch thật của Postgres và cách đọc chi phí có trong `e-pg-l4-04` và `e-pg-l3-14`.

Hình từng bước cuối mục này sắp `nums` với bộ nhớ 4 giá trị: ba run đã sắp, rồi một lượt trộn.

## Ví dụ

Chọn qua index: điều kiện khớp một dòng.

```sql
EXPLAIN (COSTS OFF) SELECT * FROM sales WHERE id = 42;
```

Chọn khớp nhiều dòng: planner bỏ index đơn dòng, quét bảng hoặc dùng bitmap.

```sql
EXPLAIN (COSTS OFF) SELECT * FROM sales WHERE amount < 5;
```

Sắp xếp ngoài: thu nhỏ `work_mem` cho tới khi dữ liệu không vừa bộ nhớ.

```sql
SET work_mem = '64kB';
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF) SELECT * FROM sales ORDER BY amount;
RESET work_mem;
```

Dòng `Sort Method: external merge` kèm số kB ghi ra đĩa.

Nối bằng `=` không có index phía `amount`: thường là nối băm.

```sql
EXPLAIN (COSTS OFF) SELECT count(*) FROM sales a JOIN sales b ON a.amount = b.id;
```

Phép hợp bỏ trùng bằng băm hoặc sắp.

```sql
EXPLAIN (COSTS OFF) SELECT amount FROM sales UNION SELECT id FROM sales;
```

## Lỗi hay gặp

`work_mem` có mức tối thiểu; giá trị nhỏ hơn bị từ chối.

```sql
-- ERROR 22023: 10 kB is outside the valid range for parameter "work_mem"
SET work_mem = '10kB';
```

Dùng `UNION ALL` khi ý là phép hợp tập: rẻ hơn vì bỏ qua bước băm hay sắp, nhưng giữ dòng trùng.

```sql
-- WRONG: UNION ALL skips the dedupe step and keeps both copies
SELECT count(*) AS n FROM (
  SELECT amount FROM sales WHERE id <= 10
  UNION ALL
  SELECT amount FROM sales WHERE id <= 10
) x;
```

```sql
-- FIX: UNION removes duplicates, as the set union does
SELECT count(*) AS n FROM (
  SELECT amount FROM sales WHERE id <= 10
  UNION
  SELECT amount FROM sales WHERE id <= 10
) x;
```

Ngược lại, nếu chắc hai vế không trùng, `UNION ALL` tránh được một lần sắp hoặc băm tốn kém.

## Tóm tắt

- Bốn bước: phân tích, viết lại, lập kế hoạch, thực thi.
- Sắp xếp ngoài: tạo run vừa bộ nhớ, rồi trộn B − 1 run mỗi lượt.
- Chọn: quét tuần tự, quét index, quét bitmap tùy số dòng khớp.
- Nối: vòng lồng (ít dòng ngoài, có index), băm (`=`, một bên vừa bộ nhớ), trộn (hai bên đã sắp).

# EN

## Opening

The same SQL query can run with several different algorithms, cheap or thousands of times more expensive. The textbook measures cost in pages read from disk. This lesson studies those algorithms and finds them in PostgreSQL's plans.

## Key idea

A query goes through four steps: parse, rewrite (expand views, rules), plan, execute. The planner picks an algorithm for each operator of the algebra tree, based on estimated rows and cost.

**External sorting** when data is bigger than memory: read a piece that fits in memory, sort it, write it out as a **run**; then merge several runs per pass until one is left. With N pages and B memory pages: about ⌈N/B⌉ runs, each merge pass combining B − 1 runs. **Selection** (`WHERE`): a sequential scan reads every page; an index scan goes straight to the matching rows, good when few match; a bitmap scan collects positions from the index and reads the pages in order, between the two.

**Joins**: a nested loop takes each outer row and looks up inner rows, very good when the outer side is small and the inner table has an index; the block version reads the inner table once per block of the outer table instead of once per row. A hash join builds a hash table on the small side and scans the big side, for `=` only. A merge join needs both sides sorted on the join key. **Duplicate-removing projection** and set operations (`DISTINCT`, `UNION`, `EXCEPT`) use sorting or hashing. Real Postgres plans and how to read their costs are in `e-pg-l4-04` and `e-pg-l3-14`.

The step-through figure at the end of this section sorts `nums` with memory for 4 values: three sorted runs, then one merge pass.

## Example

Selection through an index: the condition matches one row.

```sql
EXPLAIN (COSTS OFF) SELECT * FROM sales WHERE id = 42;
```

A selection that matches many rows: the planner drops the single-row index path and scans the table or uses a bitmap.

```sql
EXPLAIN (COSTS OFF) SELECT * FROM sales WHERE amount < 5;
```

External sort: shrink `work_mem` until the data does not fit in memory.

```sql
SET work_mem = '64kB';
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF) SELECT * FROM sales ORDER BY amount;
RESET work_mem;
```

The line `Sort Method: external merge` comes with the kB written to disk.

A join on `=` without an index on the `amount` side: usually a hash join.

```sql
EXPLAIN (COSTS OFF) SELECT count(*) FROM sales a JOIN sales b ON a.amount = b.id;
```

A union removes duplicates by hashing or sorting.

```sql
EXPLAIN (COSTS OFF) SELECT amount FROM sales UNION SELECT id FROM sales;
```

## Common mistakes

`work_mem` has a minimum; a smaller value is refused.

```sql
-- ERROR 22023: 10 kB is outside the valid range for parameter "work_mem"
SET work_mem = '10kB';
```

Using `UNION ALL` when you mean a set union: cheaper because it skips the hash or sort step, but it keeps duplicates.

```sql
-- WRONG: UNION ALL skips the dedupe step and keeps both copies
SELECT count(*) AS n FROM (
  SELECT amount FROM sales WHERE id <= 10
  UNION ALL
  SELECT amount FROM sales WHERE id <= 10
) x;
```

```sql
-- FIX: UNION removes duplicates, as the set union does
SELECT count(*) AS n FROM (
  SELECT amount FROM sales WHERE id <= 10
  UNION
  SELECT amount FROM sales WHERE id <= 10
) x;
```

The other way round, when you know the two sides never overlap, `UNION ALL` saves an expensive sort or hash.

## Recap

- Four steps: parse, rewrite, plan, execute.
- External sort: make runs that fit in memory, then merge B − 1 runs per pass.
- Selection: sequential, index or bitmap scan depending on how many rows match.
- Joins: nested loop (few outer rows, an index), hash (`=`, one side fits in memory), merge (both sides sorted).
