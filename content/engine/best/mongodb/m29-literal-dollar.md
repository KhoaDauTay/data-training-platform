---
id: e-bp-m29
engine: best
track: mongodb
level: L2
module: m
title: "Chuỗi bắt đầu bằng $ trong pipeline: bọc $literal"
title_en: "Wrap $-strings in $literal"
kind: quiz
minutes: 3
objectives:
  - vi: "Bọc mọi giá trị chữ có thể bắt đầu bằng `$` (mã giảm giá, chữ người dùng nhập) trong `{ $literal: … }` khi đưa vào aggregation pipeline hay update bằng pipeline."
    en: "Wrap every text value that may start with `$` (a promo code, text a user typed) in `{ $literal: … }` when it goes into an aggregation pipeline or a pipeline update."
avoid:
  vi: "Mã khuyến mãi `'$5 off'` biến mất khỏi kết quả mà không có lỗi nào."
  en: "The promo text `'$5 off'` vanishing from the result without any error."
requires: [e-mg-l2-03]
skills: []
adv: []
sources:
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/literal/
verified: { version: "mingo 7.2.6", date: "2026-11-20" }
pair:
  runtime: mingo
  check: diff
  setup: |
    {"collections": {"products": [
      {"_id": 1, "name": "Tea", "price": 30000},
      {"_id": 2, "name": "Cake", "price": 45000},
      {"_id": 3, "name": "Gift box", "price": 450000}
    ]}}
  bad: |
    db.products.aggregate([{ $match: { _id: 1 } }, { $set: { promo: '$5 off' } }, { $project: { _id: 0, name: 1, promo: 1 } }])
  good: |
    db.products.aggregate([{ $match: { _id: 1 } }, { $set: { promo: { $literal: '$5 off' } } }, { $project: { _id: 0, name: 1, promo: 1 } }])
  expect: null
quiz:
  - q:
      vi: "Trong stage `$set`, `{ promo: '$5 off' }` được MongoDB hiểu là gì?"
      en: "Inside a `$set` stage, how does MongoDB read `{ promo: '$5 off' }`?"
    options:
      - { vi: "Chuỗi chữ `$5 off`", en: "The text `$5 off`" }
      - { vi: "Giá trị của trường tên `5 off` trong tài liệu", en: "The value of a field named `5 off` in the document" }
      - { vi: "Một lỗi cú pháp", en: "A syntax error" }
    answer: 1
    why:
      vi: "Trong biểu thức, chuỗi bắt đầu bằng `$` là đường dẫn trường. Tài liệu không có trường `5 off`, nên `promo` không được gán và biến khỏi kết quả. `$literal` trả giá trị nguyên văn, không phân tích."
      en: "In an expression, a string that starts with `$` is a field path. The document has no `5 off` field, so `promo` gets no value and disappears from the result. `$literal` returns the value as it is, without parsing it."
---

## Ý chính

Trong aggregation pipeline (kể cả update bằng pipeline), giá trị chữ có thể bắt đầu bằng `$` phải bọc trong `{ $literal: … }`. Nhất là chữ đến từ người dùng.

## Vì sao

- Trong biểu thức, dấu `$` ở đầu chuỗi nghĩa là "đọc trường này".
- Trường không tồn tại thì giá trị là thiếu, và `$set` không ghi gì: dữ liệu mất âm thầm.
- `$literal` trả giá trị mà không phân tích nó như một biểu thức.

# EN

## Key idea

In an aggregation pipeline (pipeline updates included), a text value that may start with `$` must be wrapped in `{ $literal: … }`. Text that comes from users above all.

## Why

- In an expression, a leading `$` in a string means "read this field".
- A field that does not exist yields a missing value, and `$set` writes nothing: the data is lost silently.
- `$literal` returns its value without parsing it as an expression.
