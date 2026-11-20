---
id: e-bp-a12
engine: best
track: sql
level: L2
module: a
title: "Kiểm dữ liệu bằng truy vấn phải trả 0 lỗi"
title_en: "Data tests are queries that must find zero failures"
kind: quiz
minutes: 4
objectives:
  - vi: "Viết mỗi giả định của báo cáo thành một truy vấn tìm dòng vi phạm, gom bằng `UNION ALL`, mỗi dòng một tên test và số lỗi."
    en: "Write each assumption of a report as a query that finds the violating rows, stacked with `UNION ALL`, one row per test with its failure count."
avoid:
  vi: "Gửi một con số dựa trên dữ liệu có khoản trả mồ côi mà không ai biết."
  en: "Sending a figure built on data with orphan payments that nobody noticed."
requires: []
skills: [anti_join, having, union]
adv: [c1]
sources:
  - https://www.postgresql.org/docs/18/functions-subquery.html
  - https://www.postgresql.org/docs/18/queries-union.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: lab
  check: runs
  setup: null
  bad: |
    SELECT count(*) AS payments
    FROM payments
  good: |
    SELECT 'orphan_payment' AS test, count(*) AS failures
    FROM payments AS p
    WHERE NOT EXISTS (SELECT 1 FROM orders AS o WHERE o.id = p.order_id)
    UNION ALL
    SELECT 'duplicate_order_line', count(*)
    FROM (
      SELECT order_id, line_no
      FROM order_items
      GROUP BY order_id, line_no
      HAVING count(*) > 1
    ) AS d
    UNION ALL
    SELECT 'non_positive_qty', count(*)
    FROM order_items
    WHERE qty <= 0
  expect: null
quiz:
  - q:
      vi: "Bạn muốn biết bảng `payments` có khoản trả nào trỏ tới đơn không tồn tại. Truy vấn nào trả lời được?"
      en: "You want to know whether `payments` holds payments pointing to an order that does not exist. Which query answers that?"
    options:
      - { vi: "`SELECT count(*) FROM payments`", en: "`SELECT count(*) FROM payments`" }
      - { vi: "Một truy vấn đếm dòng của `payments` mà `NOT EXISTS` đơn tương ứng trong `orders`", en: "A query counting rows of `payments` where `NOT EXISTS` a matching order in `orders`" }
      - { vi: "`SELECT count(*) FROM orders`", en: "`SELECT count(*) FROM orders`" }
    answer: 1
    why:
      vi: "Tổng số dòng \"trông ổn\" không chứng minh gì. Chỉ truy vấn tìm đúng dòng vi phạm mới cho biết giả định có đúng không; 0 là đạt."
      en: "A row count that \"looks fine\" proves nothing. Only a query that finds the violating rows tells you whether the assumption holds; 0 is a pass."
---

## Ý chính

Mỗi giả định của báo cáo (khóa không trùng, không có bản ghi mồ côi, số lượng dương) viết thành một truy vấn tìm **dòng vi phạm**. Gom các test bằng `UNION ALL`, mỗi dòng một tên test và số lỗi. Test đạt khi số lỗi là 0. Chạy trước mỗi lần gửi số.

## Vì sao

- Một `count(*)` "trông ổn" không chứng minh gì.
- Truy vấn trả ra chính dòng sai vừa là cảnh báo vừa là chỗ bắt đầu sửa.
- Lưu các test lại thì lần sau chạy lại được ngay khi dữ liệu đổi.

# EN

## Key idea

Write each assumption of a report (no duplicate keys, no orphan records, positive quantities) as a query that finds the **violating rows**. Stack the tests with `UNION ALL`, one row per test with its failure count. A test passes when the count is 0. Run them before you send any figure.

## Why

- A `count(*)` that "looks fine" proves nothing.
- A query that returns the bad rows is both the alarm and the place to start fixing.
- Saved tests can be rerun the moment the data changes.
