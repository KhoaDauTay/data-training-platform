---
id: e-bp-m15
engine: best
track: mongodb
level: L2
module: m
title: "Nhiều điều kiện trên cùng một phần tử mảng: $elemMatch"
title_en: "Many conditions on one array element: $elemMatch"
kind: quiz
minutes: 3
objectives:
  - vi: "Dùng `$elemMatch` khi mọi điều kiện phải đúng trên **cùng một** phần tử của mảng tài liệu con."
    en: "Use `$elemMatch` when every condition must hold on the **same** element of an array of subdocuments."
avoid:
  vi: "Kết quả thừa vì mỗi điều kiện được một phần tử khác nhau thỏa."
  en: "Extra results because each condition is met by a different element."
requires: [e-mg-l1-08]
skills: [where]
adv: []
sources:
  - https://www.mongodb.com/docs/manual/tutorial/query-array-of-documents/
verified: { version: "mingo 7.2.6", date: "2026-11-20" }
pair:
  runtime: mingo
  check: diff
  setup: |
    {"collections": {"orders": [
      {"_id": 1, "status": "PAID", "items": [{"sku": "A", "qty": 1, "price": 100}, {"sku": "B", "qty": 2, "price": 10}]},
      {"_id": 2, "status": "PAID", "items": [{"sku": "B", "qty": 5, "price": 10}]},
      {"_id": 3, "status": "CANCELLED", "items": [{"sku": "C", "qty": 1, "price": 30}]},
      {"_id": 4, "status": "PAID", "items": [{"sku": "A", "qty": 3, "price": 100}]},
      {"_id": 5, "status": "PAID", "items": [{"sku": "C", "qty": 2, "price": 30}, {"sku": "B", "qty": 1, "price": 15}]}
    ]}}
  bad: |
    db.orders.find({ 'items.sku': 'A', 'items.qty': { $gte: 2 } }, { _id: 1 })
  good: |
    db.orders.find({ items: { $elemMatch: { sku: 'A', qty: { $gte: 2 } } } }, { _id: 1 })
  expect: null
quiz:
  - q:
      vi: "Đơn 1 có hai dòng: `{ sku: 'A', qty: 1 }` và `{ sku: 'B', qty: 2 }`. `find({ 'items.sku': 'A', 'items.qty': { $gte: 2 } })` có trả đơn 1 không?"
      en: "Order 1 has two lines: `{ sku: 'A', qty: 1 }` and `{ sku: 'B', qty: 2 }`. Does `find({ 'items.sku': 'A', 'items.qty': { $gte: 2 } })` return order 1?"
    options:
      - { vi: "Không, vì dòng A chỉ có qty 1", en: "No, because line A has qty 1 only" }
      - { vi: "Có: dòng A thỏa điều kiện SKU, dòng B thỏa điều kiện qty", en: "Yes: line A meets the SKU condition and line B meets the qty condition" }
      - { vi: "Báo lỗi vì hai điều kiện cùng một mảng", en: "An error, because both conditions target one array" }
    answer: 1
    why:
      vi: "Với dot notation, mỗi điều kiện được kiểm riêng trên cả mảng, nên hai phần tử khác nhau có thể cùng làm tài liệu khớp. `$elemMatch` bắt mọi điều kiện đúng trên cùng một phần tử."
      en: "With dot notation, each condition is checked on the array separately, so two different elements can make the document match together. `$elemMatch` requires every condition to hold on one element."
---

## Ý chính

Khi các điều kiện phải đúng trên **cùng một** phần tử của mảng tài liệu (document) con (cùng một dòng hàng có `sku = 'A'` **và** `qty ≥ 2`), dùng `$elemMatch`.

## Vì sao

- Viết bằng dot notation (`'items.sku'`, `'items.qty'`), mỗi điều kiện có thể được một phần tử khác nhau thỏa.
- Docs MongoDB gọi đó là "any combination of elements": kết quả thừa mà không báo lỗi.
- Đây giống điều kiện trên cùng một dòng con trong SQL, không phải hai dòng bất kỳ.

# EN

## Key idea

When the conditions must hold on the **same** element of an array of subdocuments (one line with `sku = 'A'` **and** `qty ≥ 2`), use `$elemMatch`.

## Why

- Written with dot notation (`'items.sku'`, `'items.qty'`), each condition can be met by a different element.
- The MongoDB docs call this "any combination of elements": extra results, with no error.
- It is like a condition on one child row in SQL, not on any two rows.

