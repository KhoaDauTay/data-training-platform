---
id: explain_read
title: "Đọc kế hoạch thực thi: EXPLAIN"
title_en: "Reading an execution plan: EXPLAIN"
minutes: 25
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Xem kế hoạch của một câu bằng `EXPLAIN` và đọc cây từ trong ra ngoài.
    en: See a query's plan with `EXPLAIN` and read the tree from the inside out.
  - vi: Nhận ra Seq Scan, Index Scan, Bitmap Index Scan và hiểu vì sao bảng nhỏ vẫn đọc tuần tự.
    en: Recognise Seq Scan, Index Scan, Bitmap Index Scan and understand why a small table is still read sequentially.
  - vi: So ước lượng với số thật bằng `EXPLAIN ANALYZE`, và biết nó chạy thật câu lệnh.
    en: Compare estimates with real numbers using `EXPLAIN ANALYZE`, and know that it really runs the statement.
syntax: |-
  EXPLAIN [ ( option [, ...] ) ] statement

  -- options: ANALYZE, COSTS, BUFFERS, TIMING, SUMMARY, FORMAT { TEXT | JSON }
  EXPLAIN SELECT ... ;
  EXPLAIN (ANALYZE, COSTS OFF) SELECT ... ;
options:
  - { code: "EXPLAIN", vi: "chỉ lập kế hoạch, không chạy: chi phí và số dòng là ước lượng", en: "plans without running: costs and row counts are estimates" }
  - { code: "ANALYZE", vi: "chạy thật câu lệnh rồi in thêm số dòng thật và thời gian", en: "really runs the statement and also prints real row counts and times" }
  - { code: "cost=a..b", vi: "chi phí khởi động .. chi phí tổng, theo đơn vị riêng của bộ lập kế hoạch (planner), không phải mili giây", en: "startup cost .. total cost, in the planner's own units (not milliseconds)" }
  - { code: "rows=", vi: "số dòng planner ước lượng nút này trả ra", en: "the number of rows the planner expects this node to return" }
  - { code: "Seq Scan", vi: "đọc cả bảng, từng trang", en: "reads the whole table, page by page" }
  - { code: "Index Scan / Bitmap Index Scan", vi: "tìm dòng qua chỉ mục, chỉ đọc phần cần", en: "finds rows through an index, reading only what is needed" }
  - { code: "COSTS OFF, TIMING OFF", vi: "bỏ bớt số để kế hoạch dễ đọc và ổn định", en: "drops some numbers so the plan is easier to read and stable" }
examples:
  - title: { vi: "Bảng nhỏ: đọc tuần tự dù có khóa chính", en: "A small table: a sequential read despite the primary key" }
    sql: |-
      EXPLAIN
      SELECT name, price_vnd
      FROM products
      WHERE id = 7
    read:
      vi: "`products` chỉ có 30 dòng nằm gọn một trang, nên planner chọn Seq Scan rồi lọc `id = 7`: đọc một trang rẻ hơn đi qua chỉ mục. Có chỉ mục không có nghĩa là luôn dùng chỉ mục."
      en: "`products` has only 30 rows on a single page, so the planner picks a Seq Scan and filters `id = 7`: reading one page is cheaper than going through the index. Having an index does not mean always using it."
  - title: { vi: "Tìm qua chỉ mục", en: "Looking rows up through an index" }
    sql: |-
      EXPLAIN
      SELECT id, order_date
      FROM orders
      WHERE customer_id = 42
    read:
      vi: "Hai nút: bên trong, Bitmap Index Scan trên `orders_customer_id_idx` tìm vị trí 4 dòng; bên ngoài, Bitmap Heap Scan đọc đúng các trang đó. Đọc từ nút thụt sâu nhất ra ngoài."
      en: "Two nodes: inside, a Bitmap Index Scan on `orders_customer_id_idx` finds where the 4 rows are; outside, a Bitmap Heap Scan reads just those pages. Read from the most indented node outwards."
  - title: { vi: "Một cây nhiều tầng", en: "A tree with several levels" }
    sql: |-
      EXPLAIN
      SELECT s.name, count(*)
      FROM orders o
      JOIN stores s ON s.id = o.store_id
      WHERE o.order_date >= '2026-10-01'
      GROUP BY s.name
    read:
      vi: "Từ trong ra: chỉ mục ngày lấy đơn tháng 10, `stores` được đọc tuần tự rồi dựng bảng băm (Hash), Hash Join nối hai bên, cuối cùng HashAggregate đếm theo tên cửa hàng. Mỗi mệnh đề của câu có một nút tương ứng."
      en: "From the inside out: the date index fetches October's orders, `stores` is read sequentially into a hash table (Hash), a Hash Join pairs the two sides, and finally a HashAggregate counts by store name. Each clause of the query has a matching node."
  - title: { vi: "Ước lượng so với thực tế", en: "Estimate against reality" }
    sql: |-
      EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)
      SELECT id, order_date
      FROM orders
      WHERE customer_id = 42
    read:
      vi: "`ANALYZE` chạy thật câu và in `actual rows`: 4 dòng, khớp với ước lượng ở ví dụ trước. Khi số thật lệch xa số ước lượng, planner có thể đã chọn kế hoạch dở; đó là chỗ đầu tiên cần nhìn."
      en: "`ANALYZE` really runs the query and prints `actual rows`: 4 rows, matching the estimate of the previous example. When real numbers are far from the guesses, the planner may have picked a poor plan; that is the first place to look."
pitfalls:
  - title: { vi: "EXPLAIN ANALYZE trên câu ghi", en: "EXPLAIN ANALYZE on a write" }
    wrong: "EXPLAIN ANALYZE DELETE FROM raw_signups WHERE signup_date > '2026-10-31'"
    fix: "EXPLAIN DELETE FROM raw_signups WHERE signup_date > '2026-10-31'"
    why:
      vi: "`ANALYZE` chạy thật câu lệnh: trên một cơ sở dữ liệu thật, 4 dòng đã bị xóa chỉ vì bạn muốn xem kế hoạch. Ở đây mọi câu được hoàn tác nên an toàn; ở nơi khác hãy dùng `EXPLAIN` không `ANALYZE`, hoặc bọc trong `BEGIN … ROLLBACK`."
      en: "`ANALYZE` really runs the statement: on a real database, 4 rows were just deleted because you wanted to see a plan. Here every statement is rolled back, so it is safe; elsewhere use `EXPLAIN` without `ANALYZE`, or wrap it in `BEGIN … ROLLBACK`."
  - title: { vi: "OR làm mất chỉ mục", en: "OR loses the index" }
    wrong: "EXPLAIN SELECT id FROM orders WHERE customer_id = 42 OR status = 'PAID'"
    fix: "EXPLAIN SELECT id FROM orders WHERE customer_id = 42 AND status = 'PAID'"
    why:
      vi: "Với `OR`, một dòng chỉ cần thỏa vế `status` cũng được lấy, mà không chỉ mục nào trả lời vế đó: kế hoạch thành Seq Scan với gần 1.300 dòng. Với `AND`, chỉ mục `customer_id` thu hẹp trước, `status` chỉ lọc thêm. Kế hoạch cho bạn thấy ngay điều kiện viết sai."
      en: "With `OR`, a row that only meets the `status` side is also taken, and no index answers that side: the plan becomes a Seq Scan with nearly 1,300 rows. With `AND`, the `customer_id` index narrows things first and `status` only filters further. The plan shows you the badly written condition at once."
quiz:
  - q:
      vi: "Một nút ghi `cost=4.31..14.54`. Con số 14.54 là gì?"
      en: "A node says `cost=4.31..14.54`. What is 14.54?"
    options:
      - { vi: "Thời gian chạy, 14,54 mili giây", en: "The run time, 14.54 milliseconds" }
      - { vi: "Chi phí ước lượng để nút trả hết dòng, theo đơn vị riêng của planner", en: "The estimated cost for the node to return all its rows, in the planner's own units" }
      - { vi: "Số trang đọc từ đĩa", en: "The number of pages read from disk" }
    answer: 1
    trap: 0
    why:
      vi: "Chi phí trông giống thời gian, nhưng là đơn vị tương đối (đọc một trang tuần tự = 1). Nó chỉ dùng để so các kế hoạch của cùng một câu. Thời gian thật chỉ có khi dùng `ANALYZE`, và nó dao động giữa các lần chạy."
      en: "The cost looks like a time, but it is a relative unit (reading one page sequentially = 1). It is only for comparing plans of the same query. Real time appears only with `ANALYZE`, and it varies from run to run."
  - q:
      vi: "Kế hoạch có nhiều nút lồng nhau. Nút nào chạy trước?"
      en: "A plan has several nested nodes. Which node runs first?"
    options:
      - { vi: "Nút ở dòng đầu tiên", en: "The node on the first line" }
      - { vi: "Các nút thụt sâu nhất: chúng đọc bảng, rồi đưa dòng lên nút cha", en: "The most indented nodes: they read the tables, then pass rows up to their parent" }
      - { vi: "Thứ tự của các mệnh đề trong câu SQL", en: "The order of the clauses in the SQL text" }
    answer: 1
    trap: 0
    why:
      vi: "Dòng đầu là nút gốc, trả kết quả cuối cùng, nên trông như \"bước đầu\". Thật ra nó chờ dữ liệu từ các nút con; dữ liệu đi từ nút lá (đọc bảng) lên gốc."
      en: "The first line is the root node, which returns the final result, so it looks like \"step one\". In fact it waits for data from its children; data flows from the leaf nodes (table reads) up to the root."
recap:
  - vi: "`EXPLAIN` cho kế hoạch dự kiến; đọc từ nút thụt sâu nhất ra ngoài."
    en: "`EXPLAIN` gives the expected plan; read from the most indented node outwards."
  - vi: "Seq Scan đọc cả bảng; Index Scan và Bitmap Index Scan đi qua chỉ mục; bảng nhỏ thường đọc tuần tự."
    en: "Seq Scan reads the whole table; Index Scan and Bitmap Index Scan go through an index; small tables are usually read sequentially."
  - vi: "Chi phí không phải mili giây; `EXPLAIN ANALYZE` chạy thật câu lệnh."
    en: "Cost is not milliseconds; `EXPLAIN ANALYZE` really runs the statement."
  - vi: "Bài luyện Phần 11 chấm cả kế hoạch: đúng kết quả mà chậm (mất chỉ mục, hay đắt hơn lời giải 1,5 lần) là chưa đạt."
    en: "Part 11 drills grade the plan too: a right result that is slow (the index lost, or 1.5 times the answer's cost) does not pass."
sources:
  - https://www.postgresql.org/docs/current/using-explain.html
  - https://www.postgresql.org/docs/current/sql-explain.html
  - https://www.postgresql.org/docs/current/planner-stats.html
---
## Mở bài

Hai câu cho cùng kết quả, một câu xong ngay, câu kia đọc cả bảng. Nhìn SQL thì không thấy khác biệt; nhìn **kế hoạch** của Postgres thì thấy rõ. Bài này dạy đọc kế hoạch đó.

## Ý chính

Trước khi chạy, Postgres lập một kế hoạch: đọc bảng nào, đọc thế nào (cả bảng hay qua chỉ mục), nối và gộp ra sao. `EXPLAIN` in kế hoạch đó thành một cây; mỗi nút có chi phí ước lượng và số dòng dự kiến. Đọc từ nút thụt sâu nhất ra ngoài: đó là thứ tự dữ liệu chảy.

Nhiều người nghĩ **có chỉ mục là Postgres sẽ dùng nó**. Thật ra bộ lập kế hoạch (planner) so chi phí: với bảng nhỏ, hay với điều kiện lấy phần lớn bảng, đọc tuần tự rẻ hơn. Chỉ mục giúp khi điều kiện chọn ra ít dòng trên một bảng lớn. `EXPLAIN ANALYZE` cho thêm số thật, nhưng nó chạy thật câu lệnh.

## Cú pháp

BoonData không bao giờ chấm theo mili giây (thời gian dao động); bài Phần 11 so chi phí và loại nút trong `EXPLAIN`, trên cùng dữ liệu với lời giải.

# EN

## Opening

Two queries give the same result; one finishes at once, the other reads the whole table. The SQL does not show the difference; Postgres's **plan** does. This lesson teaches you to read that plan.

## Key idea

Before running a query, Postgres makes a plan: which tables to read, how (the whole table or through an index), and how to join and group. `EXPLAIN` prints that plan as a tree; each node has an estimated cost and an expected row count. Read from the most indented node outwards: that is the order in which data flows.

Many people think **an index means Postgres will use it**. In fact the planner compares costs: for a small table, or a condition that takes most of the table, a sequential read is cheaper. An index helps when the condition picks few rows from a big table. `EXPLAIN ANALYZE` adds real numbers, but it really runs the statement.

## Syntax

BoonData never grades by milliseconds (times vary); Part 11 drills compare the cost and node types in `EXPLAIN`, on the same data as the answer.
