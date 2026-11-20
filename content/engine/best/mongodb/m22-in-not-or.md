---
id: e-bp-m22
engine: best
track: mongodb
level: L1
module: m
title: "Nhiều giá trị của cùng một trường: $in, không $or"
title_en: "$in instead of $or on one field"
kind: quiz
minutes: 2
objectives:
  - vi: "So bằng nhiều giá trị của **một** trường bằng `{ field: { $in: [...] } }`; giữ `$or` cho điều kiện trên các trường khác nhau."
    en: "Match several values of **one** field with `{ field: { $in: [...] } }`; keep `$or` for conditions on different fields."
avoid:
  vi: "Một chuỗi `$or` dài lặp lại cùng tên trường, khó đọc và khó sửa."
  en: "A long `$or` chain repeating the same field name, hard to read and hard to change."
requires: [e-mg-l1-07]
skills: [where, in_subquery]
adv: []
sources:
  - https://www.mongodb.com/docs/manual/reference/operator/query/or/
verified: { version: "mingo 7.2.6", date: "2026-11-20" }
pair:
  runtime: mingo
  check: same
  setup: |
    {"collections": {"orders": [
      {"_id": 1, "status": "PAID"}, {"_id": 2, "status": "PAID"}, {"_id": 3, "status": "CANCELLED"},
      {"_id": 4, "status": "PAID"}, {"_id": 5, "status": "PAID"}, {"_id": 6, "status": "PENDING"}
    ]}}
  bad: |
    db.orders.find({ $or: [{ status: 'PAID' }, { status: 'CANCELLED' }] }, { _id: 1 })
  good: |
    db.orders.find({ status: { $in: ['PAID', 'CANCELLED'] } }, { _id: 1 })
  expect: null
quiz:
  - q:
      vi: "Câu nào cần `$or`, không thay được bằng `$in`?"
      en: "Which condition needs `$or` and cannot be written with `$in`?"
    options:
      - { vi: "Trạng thái là `PAID` hoặc `CANCELLED`", en: "Status is `PAID` or `CANCELLED`" }
      - { vi: "Trạng thái là `PENDING` hoặc tổng tiền trên 200", en: "Status is `PENDING` or the total is over 200" }
      - { vi: "Thành phố là `Hue` hoặc `Da Nang`", en: "City is `Hue` or `Da Nang`" }
    answer: 1
    why:
      vi: "`$in` chỉ so một trường với một danh sách giá trị. Điều kiện trên hai trường khác nhau (`status` và tổng tiền) mới cần `$or`."
      en: "`$in` compares one field with a list of values. Only conditions on two different fields (`status` and the total) need `$or`."
---

## Ý chính

So bằng nhiều giá trị của **cùng một** trường thì viết `{ field: { $in: [...] } }`. `$or` dành cho điều kiện trên các trường khác nhau.

## Vì sao

- Trang `$or` của docs khuyên dùng `$in` thay `$or` khi mọi nhánh là phép so bằng trên cùng một trường.
- Câu ngắn hơn, thêm một giá trị chỉ là thêm một phần tử mảng.
- Hai cách cho cùng kết quả; mingo không có index nên thẻ này chỉ đo được điều đó, không đo được cách dùng index.

# EN

## Key idea

To match several values of **the same** field, write `{ field: { $in: [...] } }`. `$or` is for conditions on different fields.

## Why

- The docs page for `$or` recommends `$in` over `$or` when every branch is an equality check on the same field.
- The query is shorter, and adding a value means adding one array element.
- Both forms return the same documents; mingo has no indexes, so this card can show that much and not how an index is used.
