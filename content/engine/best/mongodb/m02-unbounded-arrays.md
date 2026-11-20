---
id: e-bp-m02
engine: best
track: mongodb
level: L2
module: m
title: "Tránh mảng tăng không giới hạn"
title_en: "Avoid unbounded arrays"
kind: quiz
minutes: 3
objectives:
  - vi: "Không `$push` mãi vào một mảng; giữ một tập con mới nhất bằng `$push` với `$each` + `$slice`, và để toàn bộ lịch sử ở collection riêng."
    en: "Never `$push` into an array forever; keep a newest subset with `$push` plus `$each` + `$slice`, and keep the full history in a separate collection."
avoid:
  vi: "Tài liệu khách hàng phình theo từng lượt xem cho tới khi chạm giới hạn 16 MB."
  en: "A customer document growing with every page view until it hits the 16 MB limit."
requires: [e-mg-l1-06, e-mg-l4-05]
skills: []
adv: []
sources:
  - https://www.mongodb.com/docs/manual/data-modeling/design-antipatterns/unbounded-arrays/
  - https://www.mongodb.com/docs/manual/reference/limits/
  - https://www.mongodb.com/docs/manual/data-modeling/design-patterns/group-data/subset-pattern/
  - https://www.mongodb.com/docs/manual/reference/operator/update/push/
verified: { version: "mingo 7.2.6", date: "2026-11-20" }
pair:
  runtime: mingo
  check: diff
  setup: |
    {"collections": {"customers": [
      {"_id": 10, "name": "An", "recentEvents": [
        {"type": "view", "at": {"$date": "2026-10-01T08:00:00Z"}},
        {"type": "cart", "at": {"$date": "2026-10-02T08:00:00Z"}},
        {"type": "view", "at": {"$date": "2026-10-03T08:00:00Z"}}
      ]}
    ]}}
  bad: |
    db.customers.updateOne({ _id: 10 }, { $push: { recentEvents: { type: 'view', at: ISODate('2026-10-04T08:00:00Z') } } })
  good: |
    db.customers.updateOne({ _id: 10 }, { $push: { recentEvents: { $each: [{ type: 'view', at: ISODate('2026-10-04T08:00:00Z') }], $slice: -3 } } })
  expect: null
quiz:
  - q:
      vi: "Mảng `recentEvents` có 3 phần tử. Sau `$push` với `$each: [e]` và `$slice: -3`, mảng còn gì?"
      en: "The `recentEvents` array holds 3 elements. After `$push` with `$each: [e]` and `$slice: -3`, what is left in the array?"
    options:
      - { vi: "4 phần tử, `$slice` chỉ áp khi đọc", en: "4 elements, `$slice` only applies when reading" }
      - { vi: "3 phần tử mới nhất: hai phần tử cuối cũ và `e`", en: "The 3 newest: the last two old elements and `e`" }
      - { vi: "3 phần tử cũ, `e` bị bỏ", en: "The 3 old elements, `e` is dropped" }
    answer: 1
    why:
      vi: "`$slice` âm giữ N phần tử ở cuối mảng sau khi đã thêm, nên phần tử cũ nhất bị đẩy ra. `$slice` trong `$push` cần đi cùng `$each`."
      en: "A negative `$slice` keeps the last N elements after the push, so the oldest one is dropped. `$slice` inside `$push` needs `$each`."
---

## Ý chính

Không `$push` mãi vào một mảng trong tài liệu (lượt xem, bình luận, log của một khách). Toàn bộ lịch sử để ở collection riêng có `customerId`; tài liệu chính chỉ giữ một tập con mới nhất (subset pattern) bằng `$push` với `$each` và `$slice`.

## Vì sao

- Tài liệu BSON tối đa 16 MB; mảng không giới hạn sớm muộn chạm trần đó.
- Trước khi chạm trần, mảng lớn đã làm mỗi lần đọc và ghi tốn băng thông, bộ nhớ, và làm index trên mảng chậm đi.
- Subset pattern giữ phần hay đọc trong working set (dữ liệu hay dùng nằm trong RAM).
- mingo chỉ cho thấy cơ chế cắt mảng; giới hạn 16 MB thì không đo được ở đây.

# EN

## Key idea

Never `$push` into an array in a document forever (one customer's page views, comments, log). Keep the full history in a separate collection with a `customerId`; the main document keeps only a newest subset (the subset pattern) through `$push` with `$each` and `$slice`.

## Why

- A BSON document is at most 16 MB; an unbounded array eventually reaches that ceiling.
- Before it does, a large array already makes every read and write cost bandwidth and memory, and slows indexes on the array.
- The subset pattern keeps the part that is read often in the working set (frequently used data held in RAM).
- mingo only shows how the array is trimmed; the 16 MB limit cannot be measured here.
