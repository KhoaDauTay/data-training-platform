---
id: index_design
title: "Chọn chỉ mục: cột nào, thứ tự nào"
title_en: "Choosing an index: which columns, in which order"
minutes: 25
figures: [{ name: sql-index-column-order, at: idea }]
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Xem các chỉ mục đang có của một bảng và cột của chúng.
    en: List a table's existing indexes and their columns.
  - vi: Đặt cột so bằng (`=`) trước, cột khoảng hay sắp xếp sau trong chỉ mục nhiều cột.
    en: Put equality (`=`) columns first and range or sort columns last in a multi-column index.
  - vi: Biết khi nào chỉ mục nhiều cột không giúp được, và cái giá của mỗi chỉ mục.
    en: Know when a multi-column index cannot help, and what each index costs.
syntax: |-
  CREATE INDEX [ name ] ON table_name (equality_col, range_or_sort_col [DESC]);

  -- what exists already
  SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'table_name';
options:
  - { code: "(a, b)", vi: "sắp theo `a`, rồi theo `b` trong mỗi giá trị `a`, như danh bạ sắp theo họ rồi tên", en: "sorted by `a`, then by `b` within each `a`, like a phone book sorted by family name then given name" }
  - { code: "WHERE a = … AND b >= …", vi: "dùng trọn chỉ mục `(a, b)`: một đoạn liền", en: "uses all of index `(a, b)`: one contiguous stretch" }
  - { code: "WHERE a = … ORDER BY b", vi: "đọc theo thứ tự chỉ mục, không cần bước Sort", en: "reads in index order, no Sort step needed" }
  - { code: "WHERE b = …", vi: "chỉ cột thứ hai: chỉ mục `(a, b)` gần như vô dụng", en: "only the second column: index `(a, b)` is nearly useless" }
  - { code: "pg_indexes", vi: "danh mục hệ thống liệt kê chỉ mục và câu tạo của chúng", en: "the system view listing indexes and their definitions" }
  - { code: "UNIQUE / PRIMARY KEY", vi: "cũng tạo chỉ mục; không cần tạo thêm cái trùng", en: "also create an index; do not add a duplicate one" }
examples:
  - title: { vi: "Bảng đang có chỉ mục nào", en: "Which indexes the table has" }
    sql: |-
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'app_events'
      ORDER BY indexname
    read:
      vi: "2 chỉ mục: khóa chính trên `id`, và `app_events_user_id_ts_idx` trên `(user_id, ts)`. Trước khi đề xuất chỉ mục mới, luôn xem cái đã có."
      en: "2 indexes: the primary key on `id`, and `app_events_user_id_ts_idx` on `(user_id, ts)`. Before proposing a new index, always check what already exists."
  - title: { vi: "So bằng rồi khoảng: dùng trọn chỉ mục", en: "Equality then range: the whole index is used" }
    sql: |-
      EXPLAIN
      SELECT event, ts
      FROM app_events
      WHERE user_id = 77 AND ts >= '2026-09-01' AND ts < '2026-10-01'
    read:
      vi: "`Index Cond` chứa cả `user_id = 77` lẫn hai mốc của `ts`: trong chỉ mục, các sự kiện của người dùng 77 nằm liền nhau và đã sắp theo thời gian, nên tháng 9 là một đoạn liền."
      en: "The `Index Cond` holds both `user_id = 77` and the two `ts` bounds: in the index, user 77's events sit together, already sorted by time, so September is one contiguous stretch."
  - title: { vi: "Sắp theo cột thứ hai mà không cần Sort", en: "Sorting by the second column with no Sort" }
    sql: |-
      EXPLAIN
      SELECT event, ts
      FROM app_events
      WHERE user_id = 120
      ORDER BY ts DESC
      LIMIT 1
    read:
      vi: "Index Scan Backward, không có nút Sort: chỉ mục đã sắp `ts` trong mỗi `user_id`, nên đọc ngược từ cuối đoạn của người dùng 120 và dừng sau một dòng."
      en: "Index Scan Backward, with no Sort node: the index already sorts `ts` within each `user_id`, so it reads backwards from the end of user 120's stretch and stops after one row."
  - title: { vi: "Cùng thiết kế trên bảng lớn", en: "The same design on a big table" }
    sql: |-
      EXPLAIN
      SELECT *
      FROM events_big
      WHERE customer_id = 42
      ORDER BY ts DESC
      LIMIT 5
    read:
      vi: "`events_big` có 25.000 dòng và chỉ mục `(customer_id, ts)`: 5 sự kiện mới nhất của khách 42 đến thẳng từ chỉ mục, đọc ngược. Đây là mẫu \"N bản ghi mới nhất của một đối tượng\"."
      en: "`events_big` has 25,000 rows and a `(customer_id, ts)` index: customer 42's 5 latest events come straight from the index, read backwards. This is the \"latest N records of one entity\" pattern."
pitfalls:
  - title: { vi: "Chỉ lọc cột thứ hai", en: "Filtering only the second column" }
    wrong: "EXPLAIN SELECT event, ts FROM app_events WHERE ts >= '2026-09-05' AND ts < '2026-09-06'"
    fix: "EXPLAIN SELECT event, ts FROM app_events WHERE user_id = 77 AND ts >= '2026-09-05' AND ts < '2026-09-06'"
    why:
      vi: "Chỉ mục `(user_id, ts)` sắp theo người dùng trước; một ngày của **mọi** người dùng nằm rải khắp chỉ mục, nên Postgres đọc cả bảng (Seq Scan). Câu hỏi theo ngày cho mọi người cần một chỉ mục bắt đầu bằng `ts`."
      en: "The `(user_id, ts)` index is sorted by user first; one day of **every** user is spread all over the index, so Postgres reads the whole table (Seq Scan). A by-day question for everyone needs an index that starts with `ts`."
  - title: { vi: "Mới nhất của cả bảng, không có cột đầu", en: "The latest of the whole table, without the first column" }
    wrong: "EXPLAIN SELECT event, ts FROM app_events ORDER BY ts DESC LIMIT 1"
    fix: "EXPLAIN SELECT event, ts FROM app_events WHERE user_id = 120 ORDER BY ts DESC LIMIT 1"
    why:
      vi: "Không có `user_id`, thứ tự `ts` trong chỉ mục chỉ đúng trong từng người dùng, không đúng cho cả bảng: kế hoạch thành Seq Scan rồi Sort gần 2.000 dòng để lấy một dòng."
      en: "Without `user_id`, the index's `ts` order only holds within each user, not across the table: the plan becomes a Seq Scan plus a Sort of nearly 2,000 rows to get one row."
quiz:
  - q:
      vi: "Câu hay chạy nhất là `WHERE store_id = ? AND order_date >= ?`. Chỉ mục nào tốt hơn?"
      en: "The most frequent query is `WHERE store_id = ? AND order_date >= ?`. Which index is better?"
    options:
      - { vi: "`(order_date, store_id)`: cột chọn lọc nhất đứng trước", en: "`(order_date, store_id)`: the most selective column first" }
      - { vi: "`(store_id, order_date)`: cột so bằng trước, cột khoảng sau", en: "`(store_id, order_date)`: the equality column first, the range column last" }
      - { vi: "Hai chỉ mục như nhau", en: "Both indexes are the same" }
    answer: 1
    trap: 0
    why:
      vi: "\"Cột chọn lọc nhất trước\" là lời khuyên hay gặp nhưng không đủ. Với `(store_id, order_date)`, mỗi cửa hàng là một đoạn đã sắp theo ngày, nên khoảng ngày là một đoạn liền. Với `(order_date, store_id)`, khoảng ngày đi qua mọi cửa hàng và phải lọc `store_id` rải rác."
      en: "\"Most selective column first\" is common advice but not enough. With `(store_id, order_date)`, each store is a stretch sorted by date, so the date range is one contiguous piece. With `(order_date, store_id)`, the date range runs through every store and `store_id` must be filtered piecemeal."
  - q:
      vi: "Vì sao không thêm chỉ mục cho mọi cột?"
      en: "Why not add an index on every column?"
    options:
      - { vi: "Vì Postgres chỉ cho tối đa một chỉ mục mỗi bảng", en: "Because Postgres allows at most one index per table" }
      - { vi: "Mỗi chỉ mục chiếm chỗ và phải được cập nhật ở mỗi lần thêm, sửa, xóa, nên làm chậm việc ghi", en: "Every index takes space and must be updated on every insert, update and delete, so it slows writes down" }
      - { vi: "Vì chỉ mục làm câu đọc chậm đi", en: "Because indexes make reads slower" }
    answer: 1
    trap: 2
    why:
      vi: "Chỉ mục không làm câu đọc chậm đi (planner bỏ qua cái không có lợi), nhưng mỗi câu ghi phải sửa mọi chỉ mục của bảng. Chỉ thêm chỉ mục cho câu hỏi thật sự hay chạy, và xóa cái không ai dùng."
      en: "Indexes do not slow reads down (the planner ignores those that do not help), but every write must update every index on the table. Add an index only for queries that really run often, and drop the ones nobody uses."
recap:
  - vi: "Chỉ mục nhiều cột: cột so bằng trước, cột khoảng hay sắp xếp sau."
    en: "Multi-column index: equality columns first, range or sort columns last."
  - vi: "Chỉ mục `(a, b)` giúp lọc `a`, hay `a` rồi `b`; lọc riêng `b` thì không."
    en: "An `(a, b)` index helps filters on `a`, or `a` then `b`; not on `b` alone."
  - vi: "Xem `pg_indexes` trước khi thêm; mỗi chỉ mục làm việc ghi chậm hơn."
    en: "Check `pg_indexes` before adding; every index makes writes slower."
sources:
  - https://www.postgresql.org/docs/current/indexes-multicolumn.html
  - https://www.postgresql.org/docs/current/indexes-ordering.html
  - https://www.postgresql.org/docs/current/sql-createindex.html
  - https://www.postgresql.org/docs/current/view-pg-indexes.html
---
## Mở bài

Ứng dụng hỏi đi hỏi lại một câu: "các sự kiện của người dùng X trong khoảng thời gian Y". Một chỉ mục đúng làm câu đó đọc vài dòng; một chỉ mục sai thứ tự làm nó đọc cả bảng, dù trên giấy cả hai đều "có chỉ mục".

## Ý chính

Chọn chỉ mục từ các câu hỏi thật sự hay chạy. Trong chỉ mục nhiều cột, dữ liệu được sắp theo cột đầu, rồi theo cột hai trong mỗi giá trị của cột đầu. Vì vậy: cột so bằng (`=`) đứng trước, cột khoảng (`>=`, `<`) hay cột sắp xếp (`ORDER BY`) đứng sau.

Nhiều người nghĩ **chỉ mục `(user_id, ts)` giúp mọi câu có `ts`**. Thật ra nó chỉ giúp khi cột đầu `user_id` cũng được lọc: thiếu cột đầu, các giá trị `ts` nằm rải khắp chỉ mục. Và chỉ mục không miễn phí: mỗi câu thêm, sửa, xóa phải cập nhật nó.

Hình từng bước ở cuối mục này mở một đoạn của chỉ mục `(user_id, ts)` trên `app_events`.

## Cú pháp

Ở bài này bạn đọc kế hoạch của các chỉ mục có sẵn; tự tạo chỉ mục bằng `CREATE INDEX` rồi so kế hoạch trước và sau thì có ở khu Engine, phần PostgreSQL.

# EN

## Opening

The app asks one question over and over: "user X's events in time range Y". The right index makes that query read a few rows; an index with the wrong column order makes it read the whole table, even though on paper both "have an index".

## Key idea

Choose indexes from the queries that really run often. In a multi-column index the data is sorted by the first column, then by the second within each value of the first. So: equality (`=`) columns come first, range (`>=`, `<`) or sort (`ORDER BY`) columns come last.

Many people think **an `(user_id, ts)` index helps every query on `ts`**. In fact it only helps when the first column `user_id` is filtered too: without it, the `ts` values are spread all over the index. And an index is not free: every insert, update and delete has to update it.

The step-through figure at the end of this section opens a stretch of the index `(user_id, ts)` on `app_events`.

## Syntax

In this lesson you read the plans of the existing indexes; creating your own with `CREATE INDEX` and comparing the plan before and after is in the Engine area, under PostgreSQL.
