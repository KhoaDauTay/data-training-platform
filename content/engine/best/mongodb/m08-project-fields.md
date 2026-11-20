---
id: e-bp-m08
engine: best
track: mongodb
level: L1
module: m
title: "Chỉ lấy trường cần dùng"
title_en: "Project only what you need"
kind: quiz
minutes: 3
objectives:
  - vi: "Luôn truyền projection cho `find` và `aggregate`, liệt kê đúng các trường màn hình cần, và bỏ `_id` khi không dùng."
    en: "Always pass a projection to `find` and `aggregate`, list exactly the fields the screen needs, and drop `_id` when it is not used."
avoid:
  vi: "Kéo cả mảng dòng hàng và mọi trường khác qua mạng chỉ để hiện ngày và tổng tiền."
  en: "Pulling the whole line array and every other field over the network just to show a date and a total."
requires: [e-mg-l1-03, e-mg-l3-03]
skills: [select]
adv: []
sources:
  - https://www.mongodb.com/docs/manual/core/query-optimization/
  - https://www.mongodb.com/docs/manual/tutorial/project-fields-from-query-results/
verified: { version: "mingo 7.2.6", date: "2026-11-20" }
pair:
  runtime: mingo
  check: diff
  setup: |
    {"collections": {"orders": [
      {"_id": 1, "customerId": 10, "status": "PAID", "total": 120, "createdAt": {"$date": "2026-10-01T00:00:00Z"}, "items": [{"sku": "A", "qty": 1, "price": 100}, {"sku": "B", "qty": 2, "price": 10}]},
      {"_id": 2, "customerId": 11, "status": "PAID", "total": 50, "createdAt": {"$date": "2026-10-03T00:00:00Z"}, "items": [{"sku": "B", "qty": 5, "price": 10}]},
      {"_id": 5, "customerId": 11, "status": "PAID", "total": 75, "createdAt": {"$date": "2026-10-28T00:00:00Z"}, "items": [{"sku": "C", "qty": 2, "price": 30}, {"sku": "B", "qty": 1, "price": 15}]}
    ]}}
  bad: |
    db.orders.find({ customerId: 11 })
  good: |
    db.orders.find({ customerId: 11 }, { _id: 0, createdAt: 1, total: 1 })
  expect: null
quiz:
  - q:
      vi: "Có index `{ customerId: 1, createdAt: 1, total: 1 }`. Truy vấn nào có thể là covered query (trả kết quả chỉ từ index)?"
      en: "There is an index `{ customerId: 1, createdAt: 1, total: 1 }`. Which query can be a covered query (answered from the index alone)?"
    options:
      - { vi: "`find({ customerId: 11 })`", en: "`find({ customerId: 11 })`" }
      - { vi: "`find({ customerId: 11 }, { createdAt: 1, total: 1 })`", en: "`find({ customerId: 11 }, { createdAt: 1, total: 1 })`" }
      - { vi: "`find({ customerId: 11 }, { _id: 0, createdAt: 1, total: 1 })`", en: "`find({ customerId: 11 }, { _id: 0, createdAt: 1, total: 1 })`" }
    answer: 2
    why:
      vi: "Covered query cần mọi trường lọc và mọi trường trả về nằm trong index. Không chiếu thì phải đọc cả tài liệu; chiếu mà giữ `_id` thì `_id` không có trong index này, nên vẫn phải đọc tài liệu."
      en: "A covered query needs every filtered field and every returned field to be in the index. With no projection the whole document is read; a projection that keeps `_id` still reads the document, because `_id` is not in this index."
---

## Ý chính

`find` và `aggregate` luôn có projection: chỉ những trường màn hình hay báo cáo cần, và bỏ `_id` nếu không dùng.

## Vì sao

- Ít trường hơn là ít dữ liệu qua mạng và ít bộ nhớ ở phía ứng dụng.
- Khi index chứa đủ trường lọc và trường trả về, truy vấn thành covered query: MongoDB trả kết quả từ index, không đọc tài liệu.
- `_id` luôn được trả trừ khi bạn ghi `_id: 0`.

# EN

## Key idea

`find` and `aggregate` always carry a projection: only the fields the screen or report needs, and drop `_id` when it is not used.

## Why

- Fewer fields means less data over the network and less memory in the application.
- When an index holds every filtered and returned field, the query becomes a covered query: MongoDB answers from the index without reading documents.
- `_id` is always returned unless you write `_id: 0`.
