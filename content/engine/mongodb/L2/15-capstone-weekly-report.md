---
id: e-mg-l2-15
engine: mongodb
level: L2
module: aggregation
title: "Bài cuối L2: Báo cáo tuần cho cửa hàng"
title_en: "L2 capstone: The shop's weekly report"
kind: capstone
runtime: browser
minutes: 25
objectives:
  - vi: Dựng báo cáo doanh thu theo tuần bằng một pipeline, kèm so sánh với tuần trước và tổng cộng dồn.
    en: Build a weekly revenue report with one pipeline, with a comparison to the previous week and a running total.
  - vi: Kết hợp `$unwind` và `$lookup` để chia doanh thu theo nhóm sản phẩm.
    en: Combine `$unwind` and `$lookup` to split revenue by product category.
requires: [e-mg-l2-07, e-mg-l2-08, e-mg-l2-10]
sources:
  - { url: https://www.mongodb.com/docs/manual/reference/operator/aggregation/datetrunc/, title_vi: "$dateTrunc" }
  - { url: https://www.mongodb.com/docs/manual/reference/operator/aggregation/setwindowfields/, title_vi: "$setWindowFields" }
  - { url: https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/, title_vi: "$lookup" }
lab:
  setup: |
    {"collections": {
      "products": [
        {"_id": "p1", "name": "Green tea", "category": "drink", "price": 25000},
        {"_id": "p2", "name": "Coffee beans", "category": "drink", "price": 120000},
        {"_id": "p3", "name": "Rice cracker", "category": "snack", "price": 15000},
        {"_id": "p4", "name": "Dried mango", "category": "snack", "price": 45000},
        {"_id": "p5", "name": "Tea set", "category": "gift", "price": 350000},
        {"_id": "p6", "name": "Lotus tea", "category": "drink", "price": 60000}
      ],
      "orders": [
        {"_id": 1, "customer": "c1", "store": "S1", "status": "paid", "createdAt": {"$date": "2026-10-05T09:00:00Z"}, "total": 95000, "lines": [{"sku": "p1", "qty": 2, "price": 25000}, {"sku": "p4", "qty": 1, "price": 45000}]},
        {"_id": 2, "customer": "c2", "store": "S2", "status": "shipped", "createdAt": {"$date": "2026-10-06T10:30:00Z"}, "total": 120000, "lines": [{"sku": "p2", "qty": 1, "price": 120000}]},
        {"_id": 3, "customer": "c1", "store": "S1", "status": "shipped", "createdAt": {"$date": "2026-10-12T08:15:00Z"}, "total": 450000, "lines": [{"sku": "p5", "qty": 1, "price": 350000}, {"sku": "p1", "qty": 4, "price": 25000}]},
        {"_id": 4, "customer": "c3", "store": "S1", "status": "cancelled", "createdAt": {"$date": "2026-10-13T14:00:00Z"}, "total": 150000, "lines": [{"sku": "p3", "qty": 10, "price": 15000}]},
        {"_id": 5, "customer": "c4", "store": "S2", "status": "paid", "createdAt": {"$date": "2026-10-14T11:45:00Z"}, "total": 210000, "lines": [{"sku": "p6", "qty": 2, "price": 60000}, {"sku": "p4", "qty": 2, "price": 45000}]},
        {"_id": 6, "customer": "c2", "store": "S2", "status": "paid", "createdAt": {"$date": "2026-10-20T16:20:00Z"}, "total": 25000, "lines": [{"sku": "p1", "qty": 1, "price": 25000}]},
        {"_id": 7, "customer": "c5", "store": "S1", "status": "shipped", "createdAt": {"$date": "2026-10-21T09:10:00Z"}, "total": 285000, "lines": [{"sku": "p2", "qty": 2, "price": 120000}, {"sku": "p3", "qty": 3, "price": 15000}]},
        {"_id": 8, "customer": "c1", "store": "S2", "status": "paid", "createdAt": {"$date": "2026-10-27T13:05:00Z"}, "total": 60000, "lines": [{"sku": "p6", "qty": 1, "price": 60000}]}
      ]
    }}
  steps:
    - task:
        vi: 'Doanh thu theo tuần (tuần bắt đầu thứ Hai, theo UTC), bỏ đơn `"cancelled"`: `_id` là ngày đầu tuần, `revenue` là tổng `total`, `orders` là số đơn. Xếp theo `_id` tăng dần.'
        en: 'Revenue per week (weeks start on Monday, UTC), leaving out `"cancelled"` orders: `_id` is the first day of the week, `revenue` the sum of `total`, `orders` the number of orders. Sort by `_id` ascending.'
      solution: 'db.orders.aggregate([{ $match: { status: { $ne: "cancelled" } } }, { $group: { _id: { $dateTrunc: { date: "$createdAt", unit: "week", startOfWeek: "monday" } }, revenue: { $sum: "$total" }, orders: { $sum: 1 } } }, { $sort: { _id: 1 } }])'
      check: doc
      ordered: true
      hint:
        vi: '`$dateTrunc` với `unit: "week"` và `startOfWeek: "monday"` đưa mọi ngày về thứ Hai của tuần đó.'
        en: '`$dateTrunc` with `unit: "week"` and `startOfWeek: "monday"` maps every date to the Monday of its week.'
    - task:
        vi: 'Thêm so sánh với tuần trước: mỗi tuần trả `_id`, `revenue`, `prevRevenue` (doanh thu tuần liền trước, `null` ở tuần đầu) và `change` bằng `revenue` trừ `prevRevenue` (`null` ở tuần đầu). Xếp theo `_id` tăng dần.'
        en: 'Add a comparison with the previous week: each week returns `_id`, `revenue`, `prevRevenue` (the revenue of the week before, `null` for the first week) and `change`, equal to `revenue` minus `prevRevenue` (`null` for the first week). Sort by `_id` ascending.'
      solution: 'db.orders.aggregate([{ $match: { status: { $ne: "cancelled" } } }, { $group: { _id: { $dateTrunc: { date: "$createdAt", unit: "week", startOfWeek: "monday" } }, revenue: { $sum: "$total" } } }, { $setWindowFields: { sortBy: { _id: 1 }, output: { prevRevenue: { $shift: { output: "$revenue", by: -1, default: null } } } } }, { $set: { change: { $subtract: ["$revenue", "$prevRevenue"] } } }, { $sort: { _id: 1 } }])'
      check: doc
      ordered: true
      hint:
        vi: 'Sau `$group` theo tuần, `$setWindowFields` với `$shift` (`by: -1`) lấy doanh thu tuần trước; `$subtract` với `null` cho `null`.'
        en: 'After the weekly `$group`, `$setWindowFields` with `$shift` (`by: -1`) takes the previous week''s revenue; `$subtract` with `null` gives `null`.'
    - task:
        vi: 'Doanh thu cộng dồn từ đầu tháng: mỗi tuần trả `_id`, `revenue` và `toDate` là tổng `revenue` từ tuần đầu tới tuần đó. Xếp theo `_id` tăng dần.'
        en: 'Revenue to date since the start of the month: each week returns `_id`, `revenue` and `toDate`, the sum of `revenue` from the first week up to that week. Sort by `_id` ascending.'
      solution: 'db.orders.aggregate([{ $match: { status: { $ne: "cancelled" } } }, { $group: { _id: { $dateTrunc: { date: "$createdAt", unit: "week", startOfWeek: "monday" } }, revenue: { $sum: "$total" } } }, { $setWindowFields: { sortBy: { _id: 1 }, output: { toDate: { $sum: "$revenue", window: { documents: ["unbounded", "current"] } } } } }, { $sort: { _id: 1 } }])'
      check: doc
      ordered: true
      hint:
        vi: '`$sum` với `window: { documents: ["unbounded", "current"] }`.'
        en: '`$sum` with `window: { documents: ["unbounded", "current"] }`.'
    - task:
        vi: 'Doanh thu cả tháng theo nhóm sản phẩm, bỏ đơn `"cancelled"`: `_id` là `category` của sản phẩm, `revenue` là tổng `qty` × `price` của các dòng hàng. Xếp theo `_id` từ A tới Z.'
        en: 'Revenue for the whole month per product category, leaving out `"cancelled"` orders: `_id` is the product `category`, `revenue` the sum of `qty` × `price` over the lines. Sort by `_id` from A to Z.'
      solution: 'db.orders.aggregate([{ $match: { status: { $ne: "cancelled" } } }, { $unwind: "$lines" }, { $lookup: { from: "products", localField: "lines.sku", foreignField: "_id", as: "product" } }, { $unwind: "$product" }, { $group: { _id: "$product.category", revenue: { $sum: { $multiply: ["$lines.qty", "$lines.price"] } } } }, { $sort: { _id: 1 } }])'
      check: doc
      ordered: true
      rule: match-first
      slow: 'db.orders.aggregate([{ $unwind: "$lines" }, { $lookup: { from: "products", localField: "lines.sku", foreignField: "_id", as: "product" } }, { $unwind: "$product" }, { $match: { status: { $ne: "cancelled" } } }, { $group: { _id: "$product.category", revenue: { $sum: { $multiply: ["$lines.qty", "$lines.price"] } } } }, { $sort: { _id: 1 } }])'
      sql: "SELECT p.category AS _id, SUM(l.qty * l.price) AS revenue FROM orders o JOIN order_lines l ON l.order_id = o.id JOIN products p ON p.id = l.sku WHERE o.status <> 'cancelled' GROUP BY p.category ORDER BY p.category;"
      hint:
        vi: '`$unwind` dòng hàng, `$lookup` sản phẩm theo `"lines.sku"`, `$unwind` sản phẩm, rồi `$group` theo `"$product.category"`.'
        en: '`$unwind` the lines, `$lookup` the product by `"lines.sku"`, `$unwind` the product, then `$group` by `"$product.category"`.'
quiz:
  - q:
      vi: Theo báo cáo ở bước 2, tuần nào doanh thu giảm nhiều nhất so với tuần trước?
      en: According to the report in step 2, which week had the largest drop in revenue compared with the week before?
    options:
      - vi: Tuần bắt đầu 2026-10-19
        en: The week starting 2026-10-19
      - vi: Tuần bắt đầu 2026-10-26
        en: The week starting 2026-10-26
      - vi: Tuần bắt đầu 2026-10-12
        en: The week starting 2026-10-12
    answer: 0
    why:
      vi: 'Đọc cột `change` của bước 2, số âm lớn nhất là tuần giảm nhiều nhất. Tuần 2026-10-19 có 310.000 (đơn 6 và 7), so với 660.000 của tuần 2026-10-12: 310.000 − 660.000 = −350.000, mức giảm lớn nhất. Tuần 2026-10-26 chỉ giảm 60.000 − 310.000 = −250.000: số tiền thấp nhất tháng, nhưng mức giảm nhỏ hơn. Tuần 2026-10-12 tăng: 660.000 − 215.000 = +445.000 (đơn 4 đã hủy không được tính).'
      en: 'Read the `change` column of step 2: the most negative value is the largest drop. The week of 2026-10-19 has 310,000 (orders 6 and 7) against 660,000 in the week of 2026-10-12: 310,000 − 660,000 = −350,000, the largest drop. The week of 2026-10-26 drops only 60,000 − 310,000 = −250,000: the lowest amount of the month, but a smaller drop. The week of 2026-10-12 went up: 660,000 − 215,000 = +445,000 (cancelled order 4 is not counted).'
---
## Mở bài

Cuối tháng 10, quản lý cần báo cáo tuần: doanh thu mỗi tuần, so với tuần trước, cộng dồn và theo nhóm sản phẩm. Bạn dựng nó bằng một pipeline cho mỗi phần.

## Ý chính

Bài cuối của L2 là một báo cáo tuần thật: gom theo tuần, so với tuần trước, cộng dồn, rồi chia theo nhóm sản phẩm.

- `$dateTrunc` đưa một ngày về đầu đơn vị thời gian (ngày, tuần, tháng). Với tuần, `startOfWeek` chọn ngày bắt đầu.
- `$setWindowFields` chạy sau `$group`, trên các tài liệu tuần, để thêm trường "tuần trước" và "cộng dồn" mà không mất tài liệu nào.
- Doanh thu theo nhóm sản phẩm cần cả mảng nhúng (`lines`) lẫn collection tham chiếu (`products`): `$unwind` rồi `$lookup`.

Lọc càng sớm càng tốt: `$match` đứng trước `$unwind` và `$lookup` để các stage nặng đọc ít tài liệu hơn.

Làm được: tự viết báo cáo doanh thu theo tuần, theo nhóm và theo xu hướng bằng một pipeline.

## Ví dụ

```js
db.orders.aggregate([
  { $group: { _id: { $dateTrunc: { date: "$createdAt", unit: "month" } }, revenue: { $sum: "$total" } } },
  { $sort: { _id: 1 } }
])
```

## Thực hành

Bốn bước, mỗi bước là một phần của báo cáo, rồi một câu hỏi kết luận đọc từ kết quả. Đơn hàng nằm trong tháng 10/2026; ngày 5, 12, 19 và 26 là thứ Hai.

## Tóm tắt

- `$dateTrunc` với `unit: "week"` và `startOfWeek` gom đơn theo tuần.
- `$setWindowFields` sau `$group` thêm "tuần trước" và "cộng dồn".
- Mảng nhúng cần `$unwind`, collection tham chiếu cần `$lookup`.
- `$match` đứng trước các stage nặng.

# EN

## Opening

At the end of October the manager needs a weekly report: revenue per week, compared with the week before, to date and per product category. You build it with one pipeline per part.

## Key idea

The L2 capstone is a real weekly report: group by week, compare with the previous week, add a running total, then split by product category.

- `$dateTrunc` maps a date to the start of a time unit (day, week, month). For weeks, `startOfWeek` picks the first day.
- `$setWindowFields` runs after `$group`, over the weekly documents, to add "previous week" and "to date" fields without losing any document.
- Revenue per category needs both the embedded array (`lines`) and the referenced collection (`products`): `$unwind`, then `$lookup`.

Filter as early as you can: `$match` goes before `$unwind` and `$lookup` so the heavy stages read fewer documents.

You can now: write weekly, per-category and trend revenue reports with one pipeline on your own.

## Example

```js
db.orders.aggregate([
  { $group: { _id: { $dateTrunc: { date: "$createdAt", unit: "month" } }, revenue: { $sum: "$total" } } },
  { $sort: { _id: 1 } }
])
```

## Practice

Four steps, each one part of the report, then a closing question read from the results. The orders are in October 2026; the 5th, 12th, 19th and 26th are Mondays.

## Recap

- `$dateTrunc` with `unit: "week"` and `startOfWeek` groups orders by week.
- `$setWindowFields` after `$group` adds "previous week" and "to date".
- An embedded array needs `$unwind`, a referenced collection needs `$lookup`.
- `$match` goes before the heavy stages.
