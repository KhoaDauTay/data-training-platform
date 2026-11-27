---
id: e-pg-ext-11
engine: postgres
level: EXT
module: ext-analysis
title: "Bộ đồ nghề quan sát: pg_stat_statements và bạn bè"
title_en: "The observability kit: pg_stat_statements and friends"
kind: lab
runtime: browser
minutes: 14
verified: { version: "PostgreSQL 18.x (PGlite 0.5.16)", date: "2026-11-26" }
figures:
  - { name: pg-ext-pgss-normalize, at: idea }
objectives:
  - vi: Đọc cách PostgreSQL 18 gộp câu trong `pg_stat_statements`, kể cả danh sách `IN` dài ngắn khác nhau.
    en: Read how PostgreSQL 18 folds queries in `pg_stat_statements`, including `IN` lists of different lengths.
  - vi: Dùng `pg_stat_statements_info`, xóa thống kê của đúng một câu, và xem bảng nào đang nằm trong bộ nhớ bằng `pg_buffercache`.
    en: Use `pg_stat_statements_info`, reset the statistics of exactly one query, and see which tables sit in memory with `pg_buffercache`.
  - vi: Biết `auto_explain` là bước tiếp theo, và vì sao lab một phiên không cho thấy tranh chấp.
    en: Know `auto_explain` is the next tool, and why a one-session lab shows no contention.
requires: [e-pg-l5-11]
sources:
  - { url: https://www.postgresql.org/docs/18/pgstatstatements.html, title_vi: "pg_stat_statements" }
  - { url: https://www.postgresql.org/docs/18/pgbuffercache.html, title_vi: "pg_buffercache" }
  - { url: https://www.postgresql.org/docs/18/auto-explain.html, title_vi: "auto_explain" }
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
    CREATE EXTENSION IF NOT EXISTS pg_buffercache;
    CREATE TABLE shipments (
      id int PRIMARY KEY,
      port text NOT NULL,
      status text NOT NULL
    );
    INSERT INTO shipments
    SELECT g, (ARRAY['VNDAD', 'VNSGN', 'VNHPH'])[g % 3 + 1], (ARRAY['booked', 'sailed', 'arrived'])[g % 3 + 1]
    FROM generate_series(1, 3000) AS g;
    SELECT pg_stat_statements_reset();
    SELECT status FROM shipments WHERE id = 1;
    SELECT status FROM shipments WHERE id = 2;
    SELECT status FROM shipments WHERE id = 3;
    SELECT count(*) FROM shipments WHERE id IN (1, 2);
    SELECT count(*) FROM shipments WHERE id IN (4, 5, 6, 7);
    SELECT count(*) FROM shipments WHERE status = 'sailed';
    SELECT count(*) FROM shipments WHERE status = 'booked';
    SELECT pg_stat_force_next_flush();
  steps:
    - task:
        vi: "Phần dựng đã chạy một ít câu trên `shipments` của Cargo Query. Liệt kê các câu có `FROM shipments` trong `pg_stat_statements`: `query`, `calls`, sắp theo `calls` giảm dần rồi theo `query`."
        en: "The setup ran a small workload on Cargo Query's `shipments`. List the statements containing `FROM shipments` in `pg_stat_statements`: `query`, `calls`, ordered by `calls` descending, then by `query`."
      solution: SELECT query, calls FROM pg_stat_statements WHERE query LIKE '%FROM shipments%' ORDER BY calls DESC, query
      check: rows
      ordered: true
      hint:
        vi: "`WHERE query LIKE '%FROM shipments%'`; hai câu `IN` với số phần tử khác nhau chỉ là một dòng."
        en: "`WHERE query LIKE '%FROM shipments%'`; the two `IN` queries with different lengths are a single row."
    - task:
        vi: "Đọc `pg_stat_statements_info`: số lần phải bỏ câu ít dùng vì hết chỗ (`dealloc`) và cột `was_reset` cho biết thống kê đã từng bị xóa chưa."
        en: "Read `pg_stat_statements_info`: how many times rarely used entries were evicted for lack of room (`dealloc`) and a column `was_reset` telling whether the statistics were ever reset."
      solution: SELECT dealloc, stats_reset IS NOT NULL AS was_reset FROM pg_stat_statements_info
      check: rows
      hint:
        vi: "`stats_reset` là thời điểm xóa gần nhất; so với `IS NOT NULL`."
        en: "`stats_reset` is the time of the last reset; compare with `IS NOT NULL`."
    - task:
        vi: "Trong `pg_buffercache`, bảng `shipments` có trang nào đang nằm trong bộ nhớ chia sẻ không? Trả một cột `cached` (true/false)."
        en: "In `pg_buffercache`, does table `shipments` have any page in shared memory? Return one column `cached` (true/false)."
      solution: SELECT count(*) > 0 AS cached FROM pg_buffercache WHERE relfilenode = pg_relation_filenode('shipments')
      check: rows
      hint:
        vi: "So `relfilenode` với `pg_relation_filenode('shipments')`."
        en: "Compare `relfilenode` with `pg_relation_filenode('shipments')`."
    - task:
        vi: "Xóa thống kê của riêng câu lọc theo `status`, giữ các câu khác: gọi `pg_stat_statements_reset(0, 0, queryid)` cho đúng dòng đó."
        en: "Reset the statistics of the `status` query only, keeping the others: call `pg_stat_statements_reset(0, 0, queryid)` for that one row."
      solution: SELECT pg_stat_statements_reset(0, 0, queryid) FROM pg_stat_statements WHERE query LIKE '%FROM shipments WHERE status%'
      after: SELECT count(*) FILTER (WHERE query LIKE '%WHERE status%') AS status_rows, count(*) FILTER (WHERE query LIKE '%WHERE id%') AS id_rows FROM pg_stat_statements
      check: rows
      hint:
        vi: "`0, 0` nghĩa là mọi người dùng, mọi database; tham số thứ ba là `queryid` lấy từ chính `pg_stat_statements`."
        en: "`0, 0` means every user, every database; the third argument is the `queryid` taken from `pg_stat_statements` itself."
quiz:
  - q:
      vi: "Trên PostgreSQL 18, ứng dụng gửi `WHERE id IN (...)` với 2, rồi 40, rồi 400 phần tử. `pg_stat_statements` có mấy dòng cho câu đó?"
      en: "On PostgreSQL 18, the app sends `WHERE id IN (...)` with 2, then 40, then 400 elements. How many `pg_stat_statements` rows does that query get?"
    options:
      - { vi: "Ba dòng, vì mỗi độ dài danh sách là một khung câu riêng", en: "Three rows, since each list length is its own query shape" }
      - { vi: "Một dòng `IN ($1 /*, ... */)` với `calls` là 3", en: "One row, `IN ($1 /*, ... */)`, with `calls` 3" }
      - { vi: "Không dòng nào: câu có danh sách hằng không được ghi lại", en: "No row: queries with constant lists are not recorded" }
    answer: 1
    trap: 0
    why:
      vi: "Ba dòng là đúng ở các bản trước 18, và nhiều bài viết cũ vẫn nói vậy. Từ 18, danh sách hằng chỉ khác độ dài được gộp và ghi bằng chú thích `/*, ... */`, nên một câu không còn chiếm hàng trăm dòng."
      en: "Three rows was right before 18, and many older posts still say so. Since 18, constant lists that differ only in length are folded and written with a `/*, ... */` comment, so one query no longer takes hundreds of rows."
  - q:
      vi: "Bạn chạy 20 câu trong lab này và thấy không có chờ khóa, không tranh chấp. Kết luận nào đúng cho server thật?"
      en: "You ran 20 queries in this lab and saw no lock waits and no contention. Which conclusion holds for a real server?"
    options:
      - { vi: "Không kết luận được: lab chỉ có một phiên nên không thể có tranh chấp", en: "None can be drawn: the lab has one session, so contention cannot occur" }
      - { vi: "Server thật cũng không tranh chấp, vì cùng câu và cùng dữ liệu", en: "The real server has none either, since queries and data are the same" }
      - { vi: "Server thật tranh chấp ít hơn, vì nó có nhiều CPU hơn trình duyệt", en: "The real server has less, since it has more CPUs than the browser" }
    answer: 0
    trap: 1
    why:
      vi: "Nghe hợp lý vì câu và dữ liệu giống nhau, nhưng tranh chấp chỉ xảy ra khi nhiều phiên chạy cùng lúc. Lab trong trình duyệt có một phiên. Trên server, `pg_stat_activity` (cột `wait_event`) và `pg_locks` mới cho thấy ai chờ ai."
      en: "It sounds right because the queries and data match, but contention only happens when several sessions run at once. The browser lab has one session. On a server, `pg_stat_activity` (column `wait_event`) and `pg_locks` show who waits for whom."
---
## Mở bài

Bài `e-pg-l5-11` đã dạy đọc `pg_stat_statements` để tìm câu tốn nhất. Bài này là phần còn lại của bộ đồ nghề: cách PostgreSQL 18 gộp câu, cách xóa thống kê từng câu, và cách nhìn vào bộ nhớ đệm.

## Ý chính

`pg_stat_statements` gộp câu theo khung: hằng số thành `$1`. Từ PostgreSQL 18, danh sách hằng chỉ khác độ dài cũng gộp: `IN (1, 2)` và `IN (4, 5, 6, 7)` thành một dòng `IN ($1 /*, ... */)`. Nhiều người nghĩ mỗi độ dài danh sách vẫn là một dòng riêng. Đó là cách các bản trước 18 làm, và với ứng dụng gửi danh sách dài ngắn tùy lúc, bảng thống kê từng đầy những dòng gần như trùng nhau.

Bảng có giới hạn `pg_stat_statements.max` (mặc định 5000). Khi đầy, câu ít dùng bị bỏ; `pg_stat_statements_info.dealloc` đếm số lần đó, `stats_reset` là lần xóa cuối. `pg_stat_statements_reset(userid, dbid, queryid)` xóa đúng phần bạn chọn, ví dụ một câu vừa sửa, để đo lại nó mà không mất số liệu của các câu khác.

`pg_buffercache` cho xem từng trang trong bộ nhớ đệm chia sẻ: bảng nào đang nằm trong RAM, bao nhiêu trang. `auto_explain` ghi kế hoạch của câu chậm vào log mà không cần ai gõ `EXPLAIN`; nó là thư viện nạp lúc chạy, không phải extension, và không có trong PGlite. Lab trong trình duyệt chỉ có một phiên, nên không thấy được chờ khóa hay tranh chấp.

## Cú pháp

```sql
SELECT query, calls
FROM pg_stat_statements
ORDER BY calls DESC;
SELECT dealloc, stats_reset
FROM pg_stat_statements_info;
SELECT pg_stat_statements_reset(
  0, 0, queryid)
FROM pg_stat_statements
WHERE query LIKE '...';
SELECT count(*)
FROM pg_buffercache
WHERE relfilenode =
  pg_relation_filenode('t');
```

- `pg_stat_statements_reset(userid, dbid, queryid)`: `0` nghĩa là mọi giá trị.
- `pg_stat_statements_info`: một dòng, `dealloc` và `stats_reset`.
- `pg_buffercache`: một dòng cho mỗi trang trong bộ nhớ đệm.

## Ví dụ

Hai danh sách `IN` khác độ dài, một dòng thống kê:

```sql
SELECT count(*) FROM shipments
WHERE id IN (8, 9);
SELECT count(*) FROM shipments
WHERE id IN (10, 11, 12);
SELECT query, calls
FROM pg_stat_statements
WHERE query LIKE '%IN (%';
```

Một dòng `IN ($1 /*, ... */)`, `calls` = 4.

Bảng và index nào đang nằm trong bộ nhớ đệm:

```sql
SELECT c.relname,
       count(*) AS buffers
FROM pg_buffercache b
JOIN pg_class c ON b.relfilenode
  = pg_relation_filenode(c.oid)
WHERE c.relname IN
  ('shipments', 'shipments_pkey')
GROUP BY c.relname
ORDER BY c.relname;
```

Cả bảng và index khóa chính đều có trang trong bộ nhớ, vì phần dựng vừa đọc chúng.

Cấu hình đang dùng của extension:

```sql
SELECT name, setting
FROM pg_settings
WHERE name LIKE 'pg_stat_statements.%'
ORDER BY name;
```

`max` là 5000, `track` là `top`: chỉ câu cấp ngoài cùng được đếm, câu bên trong hàm thì không.

`auto_explain` trên server (chỉ để đọc):

```text
LOAD 'auto_explain';
SET auto_explain.log_min_duration
  = '500ms';
SET auto_explain.log_analyze = on;
```

## Lỗi hay gặp

Tìm đúng danh sách đã gửi:

```sql
-- WRONG: the list was folded
SELECT query, calls
FROM pg_stat_statements
WHERE query LIKE '%IN (1, 2)%';
```

```sql
-- FIX: search the folded shape
SELECT query, calls
FROM pg_stat_statements
WHERE query LIKE '%IN ($1 /*%';
```

Câu sai không ra dòng nào: danh sách đã thành `$1 /*, ... */`.

Xóa tất cả khi chỉ muốn đo lại một câu:

```sql
-- WRONG: every statement is cleared
SELECT pg_stat_statements_reset();
SELECT count(*) AS kept
FROM pg_stat_statements
WHERE query LIKE '%WHERE id%';
```

```sql
-- FIX: reset one queryid only
SELECT status FROM shipments
WHERE id = 4;
SELECT pg_stat_statements_reset(
  0, 0, queryid)
FROM pg_stat_statements
WHERE query LIKE '%WHERE status%';
SELECT count(*) AS kept
FROM pg_stat_statements
WHERE query LIKE '%WHERE id%';
```

Câu sai còn 0 dòng tra theo id; câu đúng giữ chúng và chỉ bỏ câu lọc theo `status`.

## Thực hành

Bốn bước: đọc các câu trên `shipments` đã gộp, đọc `pg_stat_statements_info`, hỏi `pg_buffercache` xem bảng có trong bộ nhớ không, rồi xóa thống kê của đúng một câu. Sau lab là hai câu hỏi.

## Tóm tắt

- PostgreSQL 18 gộp cả danh sách `IN` dài ngắn khác nhau thành một dòng `IN ($1 /*, ... */)`.
- `pg_stat_statements_info.dealloc` > 0 nghĩa là `max` quá nhỏ và câu ít dùng đang bị bỏ.
- `pg_stat_statements_reset(0, 0, queryid)` đo lại một câu mà không mất các câu khác.
- `pg_buffercache` cho thấy cái gì nằm trong RAM; `auto_explain` ghi kế hoạch câu chậm trên server.

# EN

## Opening

Lesson `e-pg-l5-11` taught reading `pg_stat_statements` to find the costliest queries. This lesson is the rest of the kit: how PostgreSQL 18 folds queries, how to reset the statistics of one query, and how to look into the buffer cache.

## Key idea

`pg_stat_statements` groups queries by shape: constants become `$1`. Since PostgreSQL 18, constant lists that differ only in length fold too: `IN (1, 2)` and `IN (4, 5, 6, 7)` become one row `IN ($1 /*, ... */)`. Many people think each list length is still its own row. That is what versions before 18 did, and with an app that sends lists of varying length, the statistics used to fill up with near-duplicate rows.

The view has a limit, `pg_stat_statements.max` (default 5000). When it is full, rarely used queries are evicted; `pg_stat_statements_info.dealloc` counts how often, `stats_reset` is the last reset. `pg_stat_statements_reset(userid, dbid, queryid)` clears exactly the part you choose, for example one query you just changed, to measure it again without losing the other queries' numbers.

`pg_buffercache` shows each page in the shared buffer cache: which tables sit in RAM, and how many pages. `auto_explain` logs the plans of slow queries without anyone typing `EXPLAIN`; it is a library loaded at run time, not an extension, and it is not in PGlite. The browser lab has a single session, so lock waits and contention cannot be seen.

## Syntax

```sql
SELECT query, calls
FROM pg_stat_statements
ORDER BY calls DESC;
SELECT dealloc, stats_reset
FROM pg_stat_statements_info;
SELECT pg_stat_statements_reset(
  0, 0, queryid)
FROM pg_stat_statements
WHERE query LIKE '...';
SELECT count(*)
FROM pg_buffercache
WHERE relfilenode =
  pg_relation_filenode('t');
```

- `pg_stat_statements_reset(userid, dbid, queryid)`: `0` means any value.
- `pg_stat_statements_info`: one row, `dealloc` and `stats_reset`.
- `pg_buffercache`: one row per page in the buffer cache.

## Example

Two `IN` lists of different lengths, one statistics row:

```sql
SELECT count(*) FROM shipments
WHERE id IN (8, 9);
SELECT count(*) FROM shipments
WHERE id IN (10, 11, 12);
SELECT query, calls
FROM pg_stat_statements
WHERE query LIKE '%IN (%';
```

One row `IN ($1 /*, ... */)`, `calls` = 4.

Which table and index sit in the buffer cache:

```sql
SELECT c.relname,
       count(*) AS buffers
FROM pg_buffercache b
JOIN pg_class c ON b.relfilenode
  = pg_relation_filenode(c.oid)
WHERE c.relname IN
  ('shipments', 'shipments_pkey')
GROUP BY c.relname
ORDER BY c.relname;
```

Both the table and its primary key index have pages in memory, because the setup just read them.

The extension's current settings:

```sql
SELECT name, setting
FROM pg_settings
WHERE name LIKE 'pg_stat_statements.%'
ORDER BY name;
```

`max` is 5000, `track` is `top`: only top-level statements are counted, not the ones inside functions.

`auto_explain` on a server (to read only):

```text
LOAD 'auto_explain';
SET auto_explain.log_min_duration
  = '500ms';
SET auto_explain.log_analyze = on;
```

## Common mistakes

Searching for the exact list that was sent:

```sql
-- WRONG: the list was folded
SELECT query, calls
FROM pg_stat_statements
WHERE query LIKE '%IN (1, 2)%';
```

```sql
-- FIX: search the folded shape
SELECT query, calls
FROM pg_stat_statements
WHERE query LIKE '%IN ($1 /*%';
```

The wrong query returns no row: the list became `$1 /*, ... */`.

Resetting everything when you only want to measure one query again:

```sql
-- WRONG: every statement is cleared
SELECT pg_stat_statements_reset();
SELECT count(*) AS kept
FROM pg_stat_statements
WHERE query LIKE '%WHERE id%';
```

```sql
-- FIX: reset one queryid only
SELECT status FROM shipments
WHERE id = 4;
SELECT pg_stat_statements_reset(
  0, 0, queryid)
FROM pg_stat_statements
WHERE query LIKE '%WHERE status%';
SELECT count(*) AS kept
FROM pg_stat_statements
WHERE query LIKE '%WHERE id%';
```

The wrong query keeps 0 lookup-by-id rows; the right one keeps them and drops only the `status` query.

## Practice

Four steps: read the folded queries on `shipments`, read `pg_stat_statements_info`, ask `pg_buffercache` whether the table is in memory, then reset the statistics of exactly one query. Two questions follow the lab.

## Recap

- PostgreSQL 18 folds even `IN` lists of different lengths into one row `IN ($1 /*, ... */)`.
- `pg_stat_statements_info.dealloc` > 0 means `max` is too small and rarely used queries are being evicted.
- `pg_stat_statements_reset(0, 0, queryid)` measures one query again without losing the others.
- `pg_buffercache` shows what sits in RAM; `auto_explain` logs slow plans on a server.
