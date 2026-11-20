---
id: e-mg-l3-10
engine: mongodb
level: L3
module: planner-agg
title: "Query planner và plan cache"
title_en: "The query planner and the plan cache"
kind: concept
minutes: 10
runtime: docs
objectives:
  - vi: "Mô tả cách multi-planner chọn kế hoạch thắng"
    en: "Describe how the multi-planner picks the winning plan"
  - vi: "Theo dõi ba trạng thái Missing, Inactive, Active của plan cache"
    en: "Follow the three plan cache states Missing, Inactive, Active"
  - vi: "Biết explain không dùng và không ghi plan cache"
    en: "Know that explain neither uses nor writes the plan cache"
requires: [e-mg-l3-06]
sources:
  - https://www.mongodb.com/docs/manual/core/query-plans/
  - https://www.mongodb.com/docs/manual/reference/explain-results/
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
    why:
      vi: "Mọi sự kiện DDL (xóa collection, tạo, xóa hay ẩn index) xóa plan cache của collection đó. Plan cache cũng mất khi `mongod` khởi động lại."
      en: "Any DDL event (dropping a collection, creating, dropping or hiding an index) clears that collection's plan cache. The cache is also lost when `mongod` restarts."
  - q:
      vi: "Bạn chạy `explain()` để xem kế hoạch của một truy vấn đang chậm. Explain có cho thấy kế hoạch trong plan cache không?"
      en: "You run `explain()` to see the plan of a slow query. Does explain show the plan in the plan cache?"
    options:
      - vi: "Có, explain đọc thẳng từ plan cache"
        en: "Yes, explain reads straight from the plan cache"
      - vi: "Không, explain bỏ qua plan cache, tự chọn lại và không ghi vào cache"
        en: "No, explain ignores the plan cache, picks again and writes nothing to the cache"
    answer: 1
    why:
      vi: "Docs chính thức: explain bỏ qua mọi mục trong plan cache và không tạo mục mới. Muốn xem cache thì dùng `$planCacheStats`."
      en: "The docs: explain ignores all plan cache entries and creates no new one. To see the cache, use `$planCacheStats`."
---

## Ý chính

Với mỗi truy vấn, planner chọn một kế hoạch trong các kế hoạch ứng viên dựa trên index (chỉ mục) đang có. Multi-planner cho các ứng viên chạy thử một lúc ngắn; kế hoạch thắng là kế hoạch trả nhiều kết quả nhất trong lúc thử mà tốn ít việc nhất. Từ 8.3, khi lần thử không phân định, cost-based ranker (CBR) có thể chấm chi phí từng nút để chọn; hiện CBR chỉ được gọi cho một số ít truy vấn.

Kế hoạch thắng được cất trong plan cache theo hình dạng truy vấn (query shape) và dùng lại cho truy vấn cùng hình dạng. Mỗi hình dạng có một trong ba trạng thái:

## Ví dụ

- Missing: chưa có mục. Planner chọn kế hoạch, rồi tạo mục Inactive kèm một giá trị đo lượng việc.
- Inactive: chỉ là chỗ giữ, chưa dùng để sinh kế hoạch. Lần sau nếu kế hoạch chọn được tốn bằng hoặc ít việc hơn, mục thành Active; nếu tốn hơn, giá trị trong mục được tăng lên.
- Active: kế hoạch được dùng lại. Nếu nó không còn đạt, mục trở về Inactive.

Plan cache mất khi `mongod` khởi động lại, bị xóa khi có DDL trên collection, và mục ít dùng nhất bị đẩy ra (LRU). Explain bỏ qua plan cache. Từ 8.0, index filter bị deprecated, thay bằng `setQuerySettings`.

```javascript
db.orders.aggregate([ { $planCacheStats: {} } ])
```

Đúng với docs chính thức của MongoDB hiện hành (có ghi chú 8.0 và 8.3), kiểm ngày 2026-11-20.

# EN

## Key idea

For each query the planner picks one plan among the candidate plans for the available indexes. The multi-planner runs the candidates for a short trial; the winning plan is the one that returns the most results during the trial while doing the least work. From 8.3, when the trial is not decisive, the cost-based ranker (CBR) can score each plan node by cost; for now CBR is invoked for only a small number of queries.

The winning plan is stored in the plan cache by query shape and reused for queries of the same shape. Each shape is in one of three states:

## Example

- Missing: no entry yet. The planner picks a plan and creates an Inactive entry holding a measure of the work.
- Inactive: a placeholder, not used to build plans. Next time, if the chosen plan needs the same or less work, the entry becomes Active; if it needs more, the value in the entry is increased.
- Active: the plan is reused. If it stops meeting the criterion, the entry goes back to Inactive.

The plan cache is lost when `mongod` restarts, cleared by DDL on the collection, and the least recently used entry is evicted (LRU). Explain ignores the plan cache. From 8.0 index filters are deprecated in favour of `setQuerySettings`.

```javascript
db.orders.aggregate([ { $planCacheStats: {} } ])
```

Matches the current MongoDB manual (with its 8.0 and 8.3 notes), checked 2026-11-20.
