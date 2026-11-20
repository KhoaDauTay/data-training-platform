---
id: e-bp-m20
engine: best
track: mongodb
level: L2
module: m
title: "Sửa mọi phần tử khớp: $[<id>] + arrayFilters, không $"
title_en: "Update every matching element with filtered positional, not $"
kind: quiz
minutes: 3
objectives:
  - vi: "Sửa mọi phần tử mảng thỏa điều kiện bằng `$[<identifier>]` kèm `arrayFilters`; giữ `$` cho trường hợp chỉ cần phần tử khớp đầu tiên."
    en: "Update every array element that meets a condition with `$[<identifier>]` plus `arrayFilters`; keep `$` for when only the first matching element should change."
avoid:
  vi: "Giảm giá \"mọi dòng dưới 50\" nhưng chỉ một dòng đổi giá, phần còn lại giữ giá cũ mà không báo lỗi."
  en: "Discounting \"every line under 50\" while only one line changes and the rest keep the old price, with no error."
requires: [e-mg-l2-01]
skills: []
adv: []
sources:
  - https://www.mongodb.com/docs/manual/reference/operator/update/positional/
  - https://www.mongodb.com/docs/manual/reference/operator/update/positional-filtered/
verified: { version: "mingo 7.2.6", date: "2026-11-20" }
pair:
  runtime: mingo
  check: diff
  setup: |
    {"collections": {"orders": [
      {"_id": 5, "customerId": 11, "status": "PAID", "items": [{"sku": "C", "qty": 2, "price": 30}, {"sku": "B", "qty": 1, "price": 15}, {"sku": "A", "qty": 1, "price": 100}]}
    ]}}
  bad: |
    db.orders.updateOne({ _id: 5, 'items.price': { $lt: 50 } }, { $mul: { 'items.$.price': 0.5 } })
  good: |
    db.orders.updateOne({ _id: 5 }, { $mul: { 'items.$[cheap].price': 0.5 } }, { arrayFilters: [{ 'cheap.price': { $lt: 50 } }] })
  expect: null
quiz:
  - q:
      vi: "Đơn có ba dòng giá 30, 15 và 100. Lệnh `updateOne({ _id: 5, 'items.price': { $lt: 50 } }, { $mul: { 'items.$.price': 0.5 } })` đổi giá của mấy dòng?"
      en: "An order has three lines priced 30, 15 and 100. How many lines does `updateOne({ _id: 5, 'items.price': { $lt: 50 } }, { $mul: { 'items.$.price': 0.5 } })` reprice?"
    options:
      - { vi: "1 dòng", en: "1 line" }
      - { vi: "2 dòng", en: "2 lines" }
      - { vi: "3 dòng", en: "3 lines" }
    answer: 0
    why:
      vi: "`$` chỉ trỏ tới phần tử khớp **đầu tiên** (dòng giá 30). Dòng giá 15 cũng dưới 50 nhưng giữ nguyên. Muốn sửa cả hai thì dùng `$[cheap]` với `arrayFilters`."
      en: "`$` points only at the **first** matching element (the line priced 30). The line priced 15 is also under 50 but stays as it was. To change both, use `$[cheap]` with `arrayFilters`."
---

## Ý chính

Cần sửa **mọi** phần tử mảng thỏa một điều kiện thì dùng toán tử vị trí có lọc `$[<identifier>]` cùng `arrayFilters`. Toán tử `$` chỉ sửa phần tử khớp đầu tiên.

## Vì sao

- Docs gọi `$` là chỗ giữ cho phần tử **đầu tiên** khớp điều kiện của truy vấn.
- Lệnh vẫn báo `modifiedCount: 1` như thành công, nên lỗi không lộ ra.
- `$[<identifier>]` áp cho mọi phần tử mà `arrayFilters` chọn, và điều kiện lọc nằm ngay cạnh tên biến, dễ đọc lại.

# EN

## Key idea

To change **every** array element that meets a condition, use the filtered positional operator `$[<identifier>]` with `arrayFilters`. The `$` operator changes only the first matching element.

## Why

- The docs describe `$` as a placeholder for the **first** element that matches the query.
- The command still reports `modifiedCount: 1` like a success, so the mistake stays hidden.
- `$[<identifier>]` applies to every element `arrayFilters` selects, and the filter sits right next to the variable name, so it reads back clearly.
