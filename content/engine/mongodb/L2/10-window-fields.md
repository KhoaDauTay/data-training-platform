---
id: e-mg-l2-10
engine: mongodb
level: L2
module: aggregation
title: Hàm cửa sổ với $setWindowFields
title_en: Window functions with $setWindowFields
kind: lab
minutes: 15
objectives:
  - vi: Tính tổng chạy, xếp hạng và giá trị của tài liệu liền trước mà không gom tài liệu lại.
    en: Compute running totals, ranks and the previous document's value without merging documents.
  - vi: Dùng `partitionBy`, `sortBy` và `window` của `$setWindowFields`.
    en: Use the `partitionBy`, `sortBy` and `window` options of `$setWindowFields`.
requires: [e-mg-l2-06]
sources:
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/setwindowfields/
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/rank/
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/shift/
lab:
  setup: |
    {"collections": {"orders": [
      {"_id": 1, "customer": "c1", "store": "S1", "status": "paid", "createdAt": {"$date": "2026-10-05T09:00:00Z"}, "total": 95000},
      {"_id": 2, "customer": "c2", "store": "S2", "status": "shipped", "createdAt": {"$date": "2026-10-06T10:30:00Z"}, "total": 120000},
      {"_id": 3, "customer": "c1", "store": "S1", "status": "shipped", "createdAt": {"$date": "2026-10-12T08:15:00Z"}, "total": 450000},
      {"_id": 4, "customer": "c3", "store": "S1", "status": "cancelled", "createdAt": {"$date": "2026-10-13T14:00:00Z"}, "total": 150000},
      {"_id": 5, "customer": "c4", "store": "S2", "status": "paid", "createdAt": {"$date": "2026-10-14T11:45:00Z"}, "total": 210000},
      {"_id": 6, "customer": "c2", "store": "S2", "status": "paid", "createdAt": {"$date": "2026-10-20T16:20:00Z"}, "total": 25000},
      {"_id": 7, "customer": "c5", "store": "S1", "status": "shipped", "createdAt": {"$date": "2026-10-21T09:10:00Z"}, "total": 285000},
      {"_id": 8, "customer": "c1", "store": "S2", "status": "paid", "createdAt": {"$date": "2026-10-27T13:05:00Z"}, "total": 60000}
    ]}}
  steps:
    - task:
        vi: 'Doanh thu cộng dồn theo thời gian, bỏ đơn `"cancelled"`: mỗi đơn trả `_id`, `total` và `runningTotal` là tổng `total` từ đơn đầu tiên tới đơn này (theo `createdAt`). Xếp theo `createdAt` tăng dần.'
        en: 'Cumulative revenue over time, leaving out `"cancelled"` orders: each order returns `_id`, `total` and `runningTotal`, the sum of `total` from the first order up to this one (by `createdAt`). Sort by `createdAt` ascending.'
      solution: 'db.orders.aggregate([{ $match: { status: { $ne: "cancelled" } } }, { $setWindowFields: { sortBy: { createdAt: 1 }, output: { runningTotal: { $sum: "$total", window: { documents: ["unbounded", "current"] } } } } }, { $sort: { createdAt: 1 } }, { $project: { total: 1, runningTotal: 1 } }])'
      check: doc
      ordered: true
      hint:
        vi: '`window: { documents: ["unbounded", "current"] }` là từ đầu tới tài liệu hiện tại.'
        en: '`window: { documents: ["unbounded", "current"] }` means from the start up to the current document.'
    - task:
        vi: 'Xếp hạng đơn theo `total` trong từng cửa hàng (lớn nhất hạng 1): trả `_id`, `store`, `total`, `rank`.'
        en: 'Rank orders by `total` within each store (largest is rank 1): return `_id`, `store`, `total`, `rank`.'
      solution: 'db.orders.aggregate([{ $setWindowFields: { partitionBy: "$store", sortBy: { total: -1 }, output: { rank: { $rank: {} } } } }, { $project: { store: 1, total: 1, rank: 1 } }])'
      check: doc
      hint:
        vi: '`partitionBy: "$store"` tách cửa sổ theo cửa hàng; `$rank` cần `sortBy`.'
        en: '`partitionBy: "$store"` splits the window per store; `$rank` needs `sortBy`.'
    - task:
        vi: 'Với các đơn của khách `"c1"`, trả `_id`, `total` và `prevTotal` là `total` của đơn liền trước của khách đó theo `createdAt` (đơn đầu tiên có `prevTotal` là `null`). Xếp theo `createdAt` tăng dần.'
        en: 'For the orders of customer `"c1"`, return `_id`, `total` and `prevTotal`, the `total` of that customer''s previous order by `createdAt` (the first order has `prevTotal` `null`). Sort by `createdAt` ascending.'
      solution: 'db.orders.aggregate([{ $match: { customer: "c1" } }, { $setWindowFields: { sortBy: { createdAt: 1 }, output: { prevTotal: { $shift: { output: "$total", by: -1, default: null } } } } }, { $sort: { createdAt: 1 } }, { $project: { total: 1, prevTotal: 1 } }])'
      check: doc
      ordered: true
      hint:
        vi: '`$shift` với `by: -1` lấy giá trị của tài liệu đứng trước; `default` dùng khi không có.'
        en: '`$shift` with `by: -1` takes the value of the document before; `default` applies when there is none.'
---
## Ý chính

`$group` gộp nhiều tài liệu thành một. `$setWindowFields` thì giữ nguyên mọi tài liệu và thêm trường tính trên một "cửa sổ" các tài liệu quanh nó, như hàm cửa sổ của SQL (`OVER (PARTITION BY ... ORDER BY ...)`).

- `partitionBy`: chia dữ liệu thành các nhóm độc lập (bỏ trống = một nhóm);
- `sortBy`: thứ tự trong mỗi nhóm, cần cho xếp hạng, `$shift` và cửa sổ theo vị trí;
- `output`: các trường mới. Phép tổng hợp (`$sum`, `$avg`…) nhận `window: { documents: [lower, upper] }` (cận đầu, cận cuối) với `"unbounded"`, `"current"` hoặc số tương đối;
- toán tử riêng: `$rank`, `$denseRank`, `$documentNumber`, `$shift`.

`$rank` cho các giá trị bằng nhau cùng hạng và bỏ qua hạng kế tiếp (1, 1, 3).

Làm được: tính tổng cộng dồn, xếp hạng trong nhóm và so sánh với kỳ trước.

## Ví dụ

```js
db.orders.aggregate([
  { $setWindowFields: {
      partitionBy: "$store",
      sortBy: { createdAt: 1 },
      output: { avgLast2: { $avg: "$total", window: { documents: [-1, "current"] } } }
  } }
])
```

## Thực hành

Ba bước trên `orders`. Bước 1 và 3 chấm cả thứ tự.

# EN

## Key idea

`$group` merges many documents into one. `$setWindowFields` keeps every document and adds fields computed over a "window" of documents around it, like SQL window functions (`OVER (PARTITION BY ... ORDER BY ...)`).

- `partitionBy`: splits the data into independent groups (none = one group);
- `sortBy`: the order inside each group, needed for ranks, `$shift` and position-based windows;
- `output`: the new fields. Accumulators (`$sum`, `$avg`…) take `window: { documents: [lower, upper] }` with `"unbounded"`, `"current"` or a relative number;
- dedicated operators: `$rank`, `$denseRank`, `$documentNumber`, `$shift`.

`$rank` gives equal values the same rank and skips the next one (1, 1, 3).

You can now: compute running totals, ranks within a group and comparisons with the previous period.

## Example

```js
db.orders.aggregate([
  { $setWindowFields: {
      partitionBy: "$store",
      sortBy: { createdAt: 1 },
      output: { avgLast2: { $avg: "$total", window: { documents: [-1, "current"] } } }
  } }
])
```

## Practice

Three steps on `orders`. Steps 1 and 3 are graded in order.
