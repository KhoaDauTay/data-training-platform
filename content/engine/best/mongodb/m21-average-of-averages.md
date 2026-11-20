---
id: e-bp-m21
engine: best
track: mongodb
level: L2
module: m
title: "Trung bình của trung bình không phải trung bình"
title_en: "An average of averages is not the average"
kind: quiz
minutes: 3
objectives:
  - vi: "Tính giá trị đơn trung bình bằng một `$avg` trên từng đơn; khi buộc phải gộp từ nhóm, giữ `sum` và `count` của từng nhóm rồi chia ở cuối."
    en: "Compute the average order value with one `$avg` over individual orders; when you must combine groups, keep each group's `sum` and `count` and divide at the end."
avoid:
  vi: "Một khách có một đơn lớn kéo \"đơn trung bình\" lên ngang với khách có hàng chục đơn."
  en: "One customer with one large order weighing as much in the \"average order\" as a customer with dozens of orders."
requires: [e-mg-l2-06]
skills: [aggregate, group_by]
adv: []
sources:
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/avg/
verified: { version: "mingo 7.2.6", date: "2026-11-20" }
pair:
  runtime: mingo
  check: diff
  setup: |
    {"collections": {"orders": [
      {"_id": 1, "customerId": 10, "status": "PAID", "total": 120},
      {"_id": 2, "customerId": 11, "status": "PAID", "total": 50},
      {"_id": 3, "customerId": 10, "status": "CANCELLED", "total": 30},
      {"_id": 4, "customerId": 12, "status": "PAID", "total": 300},
      {"_id": 5, "customerId": 11, "status": "PAID", "total": 75}
    ]}}
  bad: |
    db.orders.aggregate([
      { $match: { status: 'PAID' } },
      { $group: { _id: '$customerId', avgTotal: { $avg: '$total' } } },
      { $group: { _id: null, avgOrder: { $avg: '$avgTotal' } } }
    ])
  good: |
    db.orders.aggregate([
      { $match: { status: 'PAID' } },
      { $group: { _id: null, avgOrder: { $avg: '$total' } } }
    ])
  expect: null
quiz:
  - q:
      vi: "Khách X có 1 đơn 300; khách Y có 2 đơn 50 và 70. Lấy `$avg` của trung bình từng khách thì được bao nhiêu, và trung bình đơn thật là bao nhiêu?"
      en: "Customer X has 1 order of 300; customer Y has 2 orders of 50 and 70. What is the `$avg` of the per-customer averages, and what is the true average order?"
    options:
      - { vi: "180 và 140", en: "180 and 140" }
      - { vi: "140 và 140", en: "140 and 140" }
      - { vi: "180 và 180", en: "180 and 180" }
    answer: 0
    why:
      vi: "Trung bình từng khách là 300 và 60, trung bình của hai số đó là 180. Ba đơn cộng lại 420, chia 3 là 140. Bước gộp thứ hai cho mỗi khách cùng trọng số, bất kể khách có bao nhiêu đơn."
      en: "The per-customer averages are 300 and 60, and their average is 180. The three orders add up to 420, divided by 3 is 140. The second grouping gives every customer the same weight, whatever their number of orders."
---

## Ý chính

Giá trị đơn trung bình là một `$avg` trên từng đơn, tính một lần. Nếu buộc phải gộp từ các nhóm đã tính sẵn, giữ `sum` và `count` của từng nhóm, cộng lại rồi mới chia.

## Vì sao

- `$avg` trên các trung bình nhóm cho mỗi nhóm trọng số như nhau, dù nhóm có 1 hay 100 đơn.
- Kết quả trông hợp lý nên khó phát hiện.
- Cùng bẫy với trung bình của trung bình trong SQL; `$group` chỉ là cách viết khác của `GROUP BY`.

# EN

## Key idea

Average order value is one `$avg` over individual orders, computed once. When you must combine groups that were already summarised, keep each group's `sum` and `count`, add them up, then divide.

## Why

- `$avg` over group averages gives every group the same weight, whether it holds 1 order or 100.
- The result looks plausible, so the mistake is hard to spot.
- It is the same trap as averaging averages in SQL; `$group` is just another way to write `GROUP BY`.
