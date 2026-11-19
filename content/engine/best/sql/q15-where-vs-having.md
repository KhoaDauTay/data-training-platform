---
id: e-bp-q15
engine: best
track: sql
level: L1
module: q
title: "Lọc dòng ở WHERE, lọc nhóm ở HAVING"
title_en: "WHERE for rows, HAVING for groups"
kind: quiz
minutes: 2
objectives:
  - vi: "Đặt điều kiện trên cột thường ở `WHERE`, chỉ để điều kiện trên hàm gộp ở `HAVING`."
    en: "Put conditions on plain columns in `WHERE`, and keep only conditions on aggregates in `HAVING`."
avoid:
  vi: "Gom nhóm cả bảng rồi mới bỏ phần lớn kết quả."
  en: "Grouping the whole table only to throw most groups away."
requires: []
skills: [having, group_by]
adv: []
sources:
  - https://www.postgresql.org/docs/18/tutorial-agg.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: lab
  check: same
  setup: null
  bad: |
    SELECT store_id, count(*) AS orders
    FROM orders
    GROUP BY store_id
    HAVING store_id = 3
  good: |
    SELECT store_id, count(*) AS orders
    FROM orders
    WHERE store_id = 3
    GROUP BY store_id
  expect: null
lint:
  rule: q15
  tip:
    vi: "Điều kiện này không dùng hàm gộp, nên đặt ở `WHERE` sẽ lọc sớm hơn và dễ đọc hơn."
    en: "This condition has no aggregate, so it belongs in `WHERE`, where it filters earlier."
quiz:
  - q:
      vi: "Điều kiện nào **phải** nằm trong `HAVING`?"
      en: "Which condition **must** go in `HAVING`?"
    options:
      - { vi: "`store_id = 3`", en: "`store_id = 3`" }
      - { vi: "`count(*) > 100`", en: "`count(*) > 100`" }
      - { vi: "`order_date >= DATE '2026-10-01'`", en: "`order_date >= DATE '2026-10-01'`" }
    answer: 1
    why:
      vi: "`count(*)` chỉ có sau khi gom nhóm, nên điều kiện trên nó phải ở `HAVING`. Hai điều kiện kia là trên cột của từng dòng: đặt ở `WHERE` để bỏ dòng trước khi gom."
      en: "`count(*)` exists only after grouping, so a condition on it must go in `HAVING`. The other two test columns of each row: put them in `WHERE` to drop rows before grouping."
---

## Ý chính

Điều kiện trên cột thường đặt ở `WHERE`. `HAVING` chỉ dành cho điều kiện trên hàm gộp (`count`, `sum`…).

## Vì sao

- `WHERE` chạy trước khi gom nhóm: ít dòng hơn được gom, và index trên cột lọc dùng được.
- Người đọc thấy ngay đâu là điều kiện trên nhóm.

## Ví dụ

Trên `lab`, hai câu cùng trả cửa hàng 3 với 484 đơn. Bản `HAVING` gom cả 5 cửa hàng rồi bỏ 4 nhóm; bản `WHERE` chỉ gom các đơn của cửa hàng 3.

# EN

## Key idea

Conditions on plain columns go in `WHERE`. `HAVING` is only for conditions on aggregates (`count`, `sum`…).

## Why

- `WHERE` runs before grouping: fewer rows are grouped, and an index on the filtered column can be used.
- Readers see at once which conditions apply to groups.

## Example

On `lab`, both queries return store 3 with 484 orders. The `HAVING` version groups all 5 stores and then drops 4 groups; the `WHERE` version groups only store 3's orders.
