---
id: e-mg-l2-10
engine: mongodb
level: L2
module: aggregation
title: Hàm cửa sổ với $setWindowFields
title_en: Window functions with $setWindowFields
kind: lab
runtime: browser
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
quiz:
  - q:
      vi: 'Collection `orders` có 8 đơn ở 2 cửa hàng. Pipeline chỉ có một stage `$setWindowFields` với `partitionBy: "$store"` trả về bao nhiêu tài liệu?'
      en: 'Collection `orders` holds 8 orders in 2 stores. How many documents does a pipeline with a single `$setWindowFields` stage and `partitionBy: "$store"` return?'
    options:
      - { vi: "8", en: "8" }
      - vi: "2, mỗi cửa hàng một tài liệu"
        en: "2, one document per store"
      - { vi: "1", en: "1" }
    answer: 0
    trap: 1
    why:
      vi: '`partitionBy` trông giống `_id` của `$group`, nhưng nó chỉ chia các đơn thành hai cửa sổ `S1` và `S2` để tính, không gộp đơn nào: `$setWindowFields` giữ cả 8 đơn và chỉ thêm trường mới vào từng đơn. Vì vậy không ra 2, càng không ra 1 (con số của `$group` với `_id: null`).'
      en: '`partitionBy` looks like the `_id` of `$group`, but it only splits the orders into two windows, `S1` and `S2`, for the computation and merges nothing: `$setWindowFields` keeps all 8 orders and only adds new fields to each one. So the answer is not 2, let alone 1 (what `$group` with `_id: null` gives).'
  - q:
      vi: 'Ba đơn trong một cửa hàng có `total` 300, 300 và 200, sắp giảm dần. `$rank` cho hạng nào?'
      en: 'Three orders in one store have `total` 300, 300 and 200, sorted descending. Which ranks does `$rank` give?'
    options:
      - { vi: "1, 1, 3", en: "1, 1, 3" }
      - { vi: "1, 1, 2", en: "1, 1, 2" }
      - { vi: "1, 2, 3", en: "1, 2, 3" }
    answer: 0
    trap: 1
    why:
      vi: 'Hạng sau hai đơn đồng hạng có vẻ là 2, nhưng đó là cách của `$denseRank`. `$rank` cho hai đơn 300 cùng hạng 1, rồi tính hạng tiếp theo bằng số đơn đứng trước cộng 1: có 2 đơn đứng trước, nên đơn 200 hạng 3. "1, 2, 3" là `$documentNumber`, vốn đánh số liên tục và không cho đồng hạng.'
      en: 'The rank after a tie seems to be 2, but that is how `$denseRank` works. `$rank` gives both 300 orders rank 1, then sets the next rank to the number of orders before it plus 1: 2 orders come before, so the 200 order is rank 3. "1, 2, 3" is `$documentNumber`, which numbers in sequence and never ties.'
---
## Mở bài

Kế toán muốn xem doanh thu cộng dồn theo ngày, nhưng vẫn thấy từng đơn. `$group` gộp mất các đơn, vậy làm sao vừa giữ từng đơn vừa tính trên các đơn quanh nó?

## Ý chính

`$group` gộp nhiều tài liệu thành một. `$setWindowFields` thì giữ nguyên mọi tài liệu và thêm trường tính trên một "cửa sổ" các tài liệu quanh nó, như hàm cửa sổ của SQL (`OVER (PARTITION BY ... ORDER BY ...)`).

- `partitionBy`: chia dữ liệu thành các nhóm độc lập (bỏ trống = một nhóm);
- `sortBy`: thứ tự trong mỗi nhóm, cần cho xếp hạng, `$shift` và cửa sổ theo vị trí;
- `output`: các trường mới. Phép tổng hợp (`$sum`, `$avg`…) nhận `window: { documents: [lower, upper] }` (cận đầu, cận cuối) với `"unbounded"`, `"current"` hoặc số tương đối;
- toán tử riêng: `$rank`, `$denseRank`, `$documentNumber`, `$shift`.

`$rank` cho các giá trị bằng nhau cùng hạng và bỏ qua hạng kế tiếp (1, 1, 3). Phép tổng hợp không ghi `window` thì tính trên cả nhóm, không phải cộng dồn.

Làm được: tính tổng cộng dồn, xếp hạng trong nhóm và so sánh với kỳ trước.

## Cú pháp

```text
{ $setWindowFields: {
    partitionBy: <expression>,
    sortBy: { <field>: 1 | -1 },
    output: {
      <newField>: { <accumulator>: <expression>, window: { documents: [<lower>, <upper>] } },
      <rankField>: { $rank: {} }
    }
} }
```

- `partitionBy` tùy chọn; `sortBy` bắt buộc với `$rank`, `$shift` và cửa sổ `documents`.
- `"unbounded"`, `"current"` hoặc số âm/dương tính từ tài liệu hiện tại.

## Ví dụ

Trung bình của đơn hiện tại và đơn liền trước trong từng cửa hàng:

```js
db.orders.aggregate([{ $setWindowFields: { partitionBy: "$store", sortBy: { createdAt: 1 }, output: { avgLast2: { $avg: "$total", window: { documents: [-1, "current"] } } } } }])
```

Cả 8 đơn trở về, không đơn nào bị gộp. Trong cửa hàng `S1`, đơn 1 có `avgLast2` là 95000 vì chưa có đơn liền trước; đơn 3 có 272500, trung bình của 95000 và 450000. Sang `S2` cửa sổ bắt đầu lại từ đầu.

Số thứ tự của từng đơn trong cửa hàng, theo thời gian:

```js
db.orders.aggregate([{ $setWindowFields: { partitionBy: "$store", sortBy: { createdAt: 1 }, output: { n: { $documentNumber: {} } } } }, { $project: { store: 1, n: 1 } }])
```

Mỗi cửa hàng đánh số riêng từ 1 tới 4: đơn 1, 3, 4, 7 của `S1` có `n` từ 1 tới 4, rồi đơn 2, 5, 6, 8 của `S2` cũng từ 1 tới 4. `$documentNumber` không đồng hạng, khác `$rank`.

## Lỗi hay gặp

Quên `window` khi muốn cộng dồn:

```js
// WRONG: no window, so every order gets the total of the whole partition
db.orders.aggregate([{ $setWindowFields: { sortBy: { createdAt: 1 }, output: { runningTotal: { $sum: "$total" } } } }, { $project: { runningTotal: 1 } }])
```

```js
// FIX: from the first document up to the current one
db.orders.aggregate([{ $setWindowFields: { sortBy: { createdAt: 1 }, output: { runningTotal: { $sum: "$total", window: { documents: ["unbounded", "current"] } } } } }, { $project: { runningTotal: 1 } }])
```

Bản sai cho mọi đơn cùng `runningTotal` là 1395000, tổng của cả 8 đơn. Bản sửa tăng dần từ 95000 ở đơn đầu tới 1395000 ở đơn cuối. `sortBy` đã có, nhưng không có `window` thì phép cộng vẫn chạy trên cả nhóm.

Đảo dấu `by` của `$shift`:

```js
// WRONG: by: 1 is the NEXT document, not the previous one
db.orders.aggregate([{ $setWindowFields: { sortBy: { createdAt: 1 }, output: { prevTotal: { $shift: { output: "$total", by: 1, default: null } } } } }, { $project: { prevTotal: 1 } }])
```

```js
// FIX: by: -1 looks one document back
db.orders.aggregate([{ $setWindowFields: { sortBy: { createdAt: 1 }, output: { prevTotal: { $shift: { output: "$total", by: -1, default: null } } } } }, { $project: { prevTotal: 1 } }])
```

Bản sai cho đơn 1 `prevTotal` là 120000, tức `total` của đơn 2 đứng sau nó, và đơn cuối nhận `null`. Bản sửa cho đơn đầu `null` và đơn 2 nhận 95000 của đơn 1. Nhớ: số âm nhìn lùi, số dương nhìn tới.

## Thực hành

Ba bước trên `orders`. Bước 1 và 3 chấm cả thứ tự. Bước 1 bỏ đơn đã hủy rồi cộng dồn `total` theo `createdAt`. Bước 2 xếp hạng đơn theo `total` trong từng cửa hàng bằng `partitionBy` và `$rank`. Bước 3 lọc đơn của một khách rồi lấy `total` của đơn liền trước bằng `$shift`.

## Tóm tắt

- `$setWindowFields` giữ mọi tài liệu và thêm trường tính trên cửa sổ.
- `partitionBy` chia nhóm, `sortBy` cho thứ tự trong nhóm.
- Cộng dồn cần `window: { documents: ["unbounded", "current"] }`; không có `window` là cả nhóm.
- `$rank` đồng hạng rồi nhảy hạng (1, 1, 3); `$shift` với `by: -1` lấy tài liệu liền trước.

# EN

## Opening

Accounting wants cumulative revenue by day, while still seeing each order. `$group` merges the orders away, so how do you keep every order and still compute over the orders around it?

## Key idea

`$group` merges many documents into one. `$setWindowFields` keeps every document and adds fields computed over a "window" of documents around it, like SQL window functions (`OVER (PARTITION BY ... ORDER BY ...)`).

- `partitionBy`: splits the data into independent groups (none = one group);
- `sortBy`: the order inside each group, needed for ranks, `$shift` and position-based windows;
- `output`: the new fields. Accumulators (`$sum`, `$avg`…) take `window: { documents: [lower, upper] }` with `"unbounded"`, `"current"` or a relative number;
- dedicated operators: `$rank`, `$denseRank`, `$documentNumber`, `$shift`.

`$rank` gives equal values the same rank and skips the next one (1, 1, 3). An accumulator without `window` is computed over the whole group, not as a running total.

You can now: compute running totals, ranks within a group and comparisons with the previous period.

## Syntax

```text
{ $setWindowFields: {
    partitionBy: <expression>,
    sortBy: { <field>: 1 | -1 },
    output: {
      <newField>: { <accumulator>: <expression>, window: { documents: [<lower>, <upper>] } },
      <rankField>: { $rank: {} }
    }
} }
```

- `partitionBy` is optional; `sortBy` is required for `$rank`, `$shift` and `documents` windows.
- `"unbounded"`, `"current"` or a negative/positive number counted from the current document.

## Example

The average of the current order and the one before it, per store:

```js
db.orders.aggregate([{ $setWindowFields: { partitionBy: "$store", sortBy: { createdAt: 1 }, output: { avgLast2: { $avg: "$total", window: { documents: [-1, "current"] } } } } }])
```

All 8 orders come back; none is merged. In store `S1`, order 1 has `avgLast2` 95000 because it has no previous order; order 3 has 272500, the mean of 95000 and 450000. In `S2` the window starts again from the beginning.

Each order's sequence number within its store, by time:

```js
db.orders.aggregate([{ $setWindowFields: { partitionBy: "$store", sortBy: { createdAt: 1 }, output: { n: { $documentNumber: {} } } } }, { $project: { store: 1, n: 1 } }])
```

Each store numbers its own orders from 1 to 4: orders 1, 3, 4, 7 of `S1` get `n` 1 to 4, then orders 2, 5, 6, 8 of `S2` also get 1 to 4. `$documentNumber` never ties, unlike `$rank`.

## Common mistakes

Forgetting `window` when you want a running total:

```js
// WRONG: no window, so every order gets the total of the whole partition
db.orders.aggregate([{ $setWindowFields: { sortBy: { createdAt: 1 }, output: { runningTotal: { $sum: "$total" } } } }, { $project: { runningTotal: 1 } }])
```

```js
// FIX: from the first document up to the current one
db.orders.aggregate([{ $setWindowFields: { sortBy: { createdAt: 1 }, output: { runningTotal: { $sum: "$total", window: { documents: ["unbounded", "current"] } } } } }, { $project: { runningTotal: 1 } }])
```

The wrong version gives every order the same `runningTotal` of 1395000, the sum of all 8 orders. The fix grows from 95000 on the first order to 1395000 on the last. `sortBy` is there, but without `window` the sum still runs over the whole partition.

Flipping the sign of `by` in `$shift`:

```js
// WRONG: by: 1 is the NEXT document, not the previous one
db.orders.aggregate([{ $setWindowFields: { sortBy: { createdAt: 1 }, output: { prevTotal: { $shift: { output: "$total", by: 1, default: null } } } } }, { $project: { prevTotal: 1 } }])
```

```js
// FIX: by: -1 looks one document back
db.orders.aggregate([{ $setWindowFields: { sortBy: { createdAt: 1 }, output: { prevTotal: { $shift: { output: "$total", by: -1, default: null } } } } }, { $project: { prevTotal: 1 } }])
```

The wrong version gives order 1 a `prevTotal` of 120000, the `total` of order 2 that comes after it, and the last order gets `null`. The fix gives the first order `null` and order 2 gets the 95000 of order 1. Remember: a negative number looks back, a positive one looks ahead.

## Practice

Three steps on `orders`. Steps 1 and 3 are graded in order. Step 1 drops cancelled orders and adds up `total` by `createdAt`. Step 2 ranks orders by `total` within each store with `partitionBy` and `$rank`. Step 3 filters one customer's orders and takes the `total` of the previous order with `$shift`.

## Recap

- `$setWindowFields` keeps every document and adds fields computed over a window.
- `partitionBy` splits the groups, `sortBy` sets the order inside each group.
- A running total needs `window: { documents: ["unbounded", "current"] }`; no `window` means the whole group.
- `$rank` ties and then skips (1, 1, 3); `$shift` with `by: -1` takes the document before.
