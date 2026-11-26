---
id: e-mg-l3-10
engine: mongodb
level: L3
module: planner-agg
title: "Query planner và plan cache"
title_en: "The query planner and the plan cache"
kind: concept
minutes: 12
figures: [{ name: mg-plan-cache, at: idea }]
runtime: docs
objectives:
  - vi: "Mô tả cách multi-planner chọn kế hoạch thắng"
    en: "Describe how the multi-planner picks the winning plan"
  - vi: "Theo dõi ba trạng thái Missing, Inactive, Active của plan cache"
    en: "Follow the three plan cache states Missing, Inactive, Active"
  - vi: "Biết explain không dùng và không ghi plan cache, và xem cache bằng `$planCacheStats`"
    en: "Know that explain neither uses nor writes the plan cache, and read the cache with `$planCacheStats`"
requires: [e-mg-l3-06]
sources:
  - https://www.mongodb.com/docs/manual/core/query-plans/
  - https://www.mongodb.com/docs/manual/reference/explain-results/
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/planCacheStats/
  - https://www.mongodb.com/docs/manual/reference/command/setQuerySettings/
quiz:
  - q:
      vi: "Bạn vừa tạo một index mới trên collection. Plan cache của collection đó ra sao?"
      en: "You just created a new index on a collection. What happens to that collection's plan cache?"
    options:
      - vi: "Giữ nguyên, index mới chỉ dùng cho truy vấn chưa từng chạy"
        en: "It stays, the new index is used only by queries never run before"
      - vi: "Bị xóa, vì tạo index là một sự kiện DDL"
        en: "It is cleared, because creating an index is a DDL event"
      - vi: "Chỉ bị xóa khi `mongod` khởi động lại"
        en: "It is cleared only when `mongod` restarts"
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì cache thường chỉ đổi khi mục cũ hết hạn, nhưng mọi sự kiện DDL (xóa collection, tạo, xóa hay ẩn index) xóa plan cache của collection đó, để planner được xét lại với index mới. Plan cache cũng mất khi `mongod` khởi động lại."
      en: "It sounds right because a cache usually changes only when an entry expires, but any DDL event (dropping a collection, creating, dropping or hiding an index) clears that collection's plan cache, so the planner can weigh the new index. The cache is also lost when `mongod` restarts."
  - q:
      vi: "Bạn chạy `explain()` để xem kế hoạch của một truy vấn đang chậm. Explain có cho thấy kế hoạch trong plan cache không?"
      en: "You run `explain()` to see the plan of a slow query. Does explain show the plan in the plan cache?"
    options:
      - vi: "Có, explain đọc thẳng từ plan cache"
        en: "Yes, explain reads straight from the plan cache"
      - vi: "Không, explain bỏ qua plan cache, tự chọn lại và không ghi vào cache"
        en: "No, explain ignores the plan cache, picks again and writes nothing to the cache"
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì explain nói về chính truy vấn đó, nhưng docs chính thức ghi: explain bỏ qua mọi mục trong plan cache và không tạo mục mới. Muốn xem cache thì dùng `$planCacheStats`."
      en: "It sounds right because explain is about that very query, but the docs say explain ignores all plan cache entries and creates no new one. To see the cache, use `$planCacheStats`."
---
## Mở bài

Một truy vấn hôm qua chạy 5 ms, hôm nay cùng truy vấn đó mất 2 giây, dù dữ liệu gần như không đổi. Bạn chạy `explain()` và thấy một kế hoạch tốt. Vậy server đang thật sự dùng kế hoạch nào?

## Ý chính

Với mỗi truy vấn, planner tìm các kế hoạch ứng viên dựa trên index (chỉ mục) đang có. Multi-planner cho các ứng viên chạy thử một lúc ngắn; kế hoạch thắng là kế hoạch trả nhiều kết quả nhất trong lúc thử mà tốn ít việc nhất. Docs chính thức ghi thêm: từ 8.3, khi lần thử không phân định, cost-based ranker có thể chấm chi phí từng nút, nhưng hiện chỉ cho một số ít truy vấn.

Kế hoạch thắng được cất trong plan cache theo hình dạng truy vấn (query shape): cùng trường lọc, sắp, chiếu, khác giá trị vẫn là một hình dạng. Mỗi hình dạng ở một trong ba trạng thái. Missing: chưa có mục; planner chọn rồi tạo mục Inactive kèm lượng việc đã tốn. Inactive: chỉ là chỗ giữ; lần sau nếu kế hoạch tốn bằng hoặc ít hơn thì thành Active, tốn hơn thì giá trị trong mục được nâng lên. Active: kế hoạch được dùng lại; nếu nó không còn đạt, mục về Inactive.

Nhiều người nghĩ explain cho thấy kế hoạch server đang dùng. Thật ra explain bỏ qua plan cache và chọn lại từ đầu, nên một kế hoạch cache cũ, chọn với giá trị khác, có thể khác hẳn. Plan cache mất khi `mongod` khởi động lại, bị xóa khi có DDL trên collection, và mục ít dùng nhất bị đẩy ra. Từ 8.0, index filter bị deprecated, thay bằng `setQuerySettings`.

Bài này đọc theo docs chính thức; trình duyệt không có `mongod` nên các khối dưới đây là văn bản, không chạy.

Hình từng bước ở cuối mục này theo một mục cache qua ba trạng thái, rồi đặt `explain()` và `$planCacheStats` cạnh cache.

## Cú pháp

```text
db.<coll>.aggregate([ { $planCacheStats: {} } ])          // read the cache entries
db.<coll>.getPlanCache().clear()                          // clear this collection's cache
db.<coll>.find(<filter>).explain("executionStats")       // fresh plan, cache ignored
db.adminCommand({ setQuerySettings: <query shape>, settings: { indexHints: ... } })
```

- `$planCacheStats`: phải là stage đầu tiên; mỗi tài liệu là một mục cache.
- `getPlanCache().clear()`: xóa mục của một collection, planner chọn lại lần sau.
- `explain()`: không đọc, không ghi cache.
- `setQuerySettings` (8.0+): gắn index được phép cho một hình dạng truy vấn.

## Ví dụ

Xem các mục cache của `orders`, chỉ lấy vài trường dễ đọc:

```text
db.orders.aggregate([
  { $planCacheStats: {} },
  { $project: { queryHash: 1, planCacheKey: 1, isActive: 1, works: 1 } }
])
```

Mỗi tài liệu là một hình dạng truy vấn. `isActive: false` là mục Inactive; `works` là lượng việc planner đã ghi lại.

So kế hoạch mới chọn với cache:

```text
db.orders.find({ status: "paid", store: "S1" }).explain("executionStats")
```

Kế hoạch ở `winningPlan` là kế hoạch explain vừa chọn lại, không phải mục trong cache. Nếu nó khác kế hoạch `$planCacheStats` báo, truy vấn thật đang chạy theo kế hoạch cũ.

Ép planner chọn lại cho cả collection:

```text
db.orders.getPlanCache().clear()
```

## Lỗi hay gặp

Tin explain là kế hoạch đang chạy:

```text
// WRONG: explain re-plans and never reads the cache
db.orders.find({ status: "paid" }).explain()
```

```text
// FIX: read what the server reuses
db.orders.aggregate([ { $planCacheStats: {} } ])
```

Explain có thể đẹp trong khi truy vấn thật vẫn theo một mục Active cũ.

Dùng index filter trên 8.0:

```text
// WRONG: index filters are deprecated since 8.0
db.runCommand({ planCacheSetFilter: "orders", query: { status: "paid" }, indexes: [ { status: 1 } ] })
```

```text
// FIX: query settings replace them
db.adminCommand({ setQuerySettings: { find: "orders", filter: { status: "paid" }, $db: "shop" },
  settings: { indexHints: { ns: { db: "shop", coll: "orders" }, allowedIndexes: [ { status: 1 } ] } } })
```

Query settings bền qua khởi động lại và áp cho cả cluster, còn index filter chỉ sống trong bộ nhớ của một `mongod`.

## Tóm tắt

- Multi-planner chạy thử các ứng viên; kế hoạch thắng vào plan cache theo hình dạng truy vấn.
- Mục đi qua Missing → Inactive → Active, và về Inactive khi kế hoạch không còn đạt.
- Explain bỏ qua cache; xem cache bằng `$planCacheStats`.
- DDL trên collection và khởi động lại xóa cache; từ 8.0 dùng `setQuerySettings` thay index filter.

# EN

## Opening

A query ran in 5 ms yesterday and the same query takes 2 seconds today, though the data has barely changed. You run `explain()` and see a good plan. So which plan is the server really using?

## Key idea

For each query, the planner finds candidate plans from the available indexes. The multi-planner runs the candidates for a short trial; the winning plan is the one that returns the most results during the trial while doing the least work. The docs add that from 8.3, when the trial is not decisive, a cost-based ranker can score each plan node, but for now only for a small number of queries.

The winning plan is stored in the plan cache by query shape: the same filter, sort and projection fields with other values are one shape. Each shape is in one of three states. Missing: no entry; the planner picks a plan and creates an Inactive entry with the work it took. Inactive: a placeholder; next time, if the plan needs the same or less work it becomes Active, if it needs more the value in the entry is raised. Active: the plan is reused; if it stops meeting the criterion, the entry goes back to Inactive.

Many people think explain shows the plan the server is using. In fact explain ignores the plan cache and plans from scratch, so an old cached plan, chosen for other values, can be quite different. The plan cache is lost when `mongod` restarts, cleared by DDL on the collection, and the least used entry is evicted. From 8.0, index filters are deprecated in favour of `setQuerySettings`.

This lesson follows the official docs; the browser has no `mongod`, so the blocks below are text, not run.

The step-through figure at the end of this section follows one cache entry through the three states, then sets `explain()` and `$planCacheStats` beside the cache.

## Syntax

```text
db.<coll>.aggregate([ { $planCacheStats: {} } ])          // read the cache entries
db.<coll>.getPlanCache().clear()                          // clear this collection's cache
db.<coll>.find(<filter>).explain("executionStats")       // fresh plan, cache ignored
db.adminCommand({ setQuerySettings: <query shape>, settings: { indexHints: ... } })
```

- `$planCacheStats`: must be the first stage; each document is one cache entry.
- `getPlanCache().clear()`: drops one collection's entries, the planner picks again next time.
- `explain()`: neither reads nor writes the cache.
- `setQuerySettings` (8.0+): attaches the allowed indexes to a query shape.

## Example

Read the cache entries of `orders`, keeping a few readable fields:

```text
db.orders.aggregate([
  { $planCacheStats: {} },
  { $project: { queryHash: 1, planCacheKey: 1, isActive: 1, works: 1 } }
])
```

Each document is one query shape. `isActive: false` is an Inactive entry; `works` is the work the planner recorded.

Compare a freshly chosen plan with the cache:

```text
db.orders.find({ status: "paid", store: "S1" }).explain("executionStats")
```

The plan in `winningPlan` is the one explain just chose again, not the cache entry. If it differs from what `$planCacheStats` reports, the real query is running on the old plan.

Force the planner to choose again for the whole collection:

```text
db.orders.getPlanCache().clear()
```

## Common mistakes

Trusting explain as the running plan:

```text
// WRONG: explain re-plans and never reads the cache
db.orders.find({ status: "paid" }).explain()
```

```text
// FIX: read what the server reuses
db.orders.aggregate([ { $planCacheStats: {} } ])
```

Explain can look fine while the real query still follows an old Active entry.

Using index filters on 8.0:

```text
// WRONG: index filters are deprecated since 8.0
db.runCommand({ planCacheSetFilter: "orders", query: { status: "paid" }, indexes: [ { status: 1 } ] })
```

```text
// FIX: query settings replace them
db.adminCommand({ setQuerySettings: { find: "orders", filter: { status: "paid" }, $db: "shop" },
  settings: { indexHints: { ns: { db: "shop", coll: "orders" }, allowedIndexes: [ { status: 1 } ] } } })
```

Query settings survive restarts and apply to the whole cluster, while an index filter lives only in one `mongod`'s memory.

## Recap

- The multi-planner trials the candidates; the winner enters the plan cache by query shape.
- An entry moves Missing → Inactive → Active, and back to Inactive when the plan stops qualifying.
- Explain ignores the cache; read the cache with `$planCacheStats`.
- DDL on the collection and a restart clear the cache; from 8.0 use `setQuerySettings` instead of index filters.
