---
id: e-mg-l3-12
engine: mongodb
level: L3
module: planner-agg
title: "Lab: đưa $match lên đầu pipeline"
title_en: "Lab: move $match to the front of the pipeline"
kind: lab
minutes: 12
runtime: browser
viz: mg-pipeline
objectives:
  - vi: "Viết pipeline lọc trước khi `$unwind` và `$group`"
    en: "Write a pipeline that filters before `$unwind` and `$group`"
  - vi: "Biết stage đầu nào được gộp vào `$cursor` và dùng được index trên `mongod`"
    en: "Know which leading stages are absorbed into `$cursor` and can use an index on `mongod`"
requires: [e-mg-l3-10]
sources:
  - https://www.mongodb.com/docs/manual/reference/explain-results/
  - https://www.mongodb.com/docs/manual/core/aggregation-pipeline-optimization/
lab:
  setup: |
    {"collections": {"orders": [
      {"_id": 1, "store": "S1", "status": "paid", "lines": [{"sku": "A", "qty": 2, "price": 10}, {"sku": "B", "qty": 1, "price": 25}]},
      {"_id": 2, "store": "S1", "status": "cancelled", "lines": [{"sku": "A", "qty": 5, "price": 10}]},
      {"_id": 3, "store": "S2", "status": "paid", "lines": [{"sku": "C", "qty": 3, "price": 8}]},
      {"_id": 4, "store": "S2", "status": "paid", "lines": [{"sku": "A", "qty": 1, "price": 10}, {"sku": "C", "qty": 1, "price": 8}]},
      {"_id": 5, "store": "S3", "status": "pending", "lines": [{"sku": "B", "qty": 2, "price": 25}]},
      {"_id": 6, "store": "S3", "status": "paid", "lines": [{"sku": "B", "qty": 4, "price": 25}]},
      {"_id": 7, "store": "S1", "status": "paid", "lines": [{"sku": "C", "qty": 2, "price": 8}]}
    ]}}
  steps:
    - task:
        vi: "Tính doanh thu từng cửa hàng chỉ từ đơn có `status` là `paid`: doanh thu = tổng `qty` nhân `price` của mọi dòng trong `lines`. Trả `_id` là mã cửa hàng và `revenue`, xếp `revenue` giảm dần, hòa thì `_id` tăng dần."
        en: "Compute each store's revenue from orders whose `status` is `paid` only: revenue = sum of `qty` times `price` over every entry in `lines`. Return `_id` as the store code and `revenue`, ordered by `revenue` descending, ties by `_id` ascending."
      solution: |
        db.orders.aggregate([
          { $match: { status: "paid" } },
          { $unwind: "$lines" },
          { $group: { _id: "$store", revenue: { $sum: { $multiply: [ "$lines.qty", "$lines.price" ] } } } },
          { $sort: { revenue: -1, _id: 1 } }
        ])
      check: doc
      ordered: true
      hint:
        vi: "Bắt đầu bằng `$match` trên `status`, rồi `$unwind` mảng `lines`, rồi `$group` theo `$store` với `$sum` của `$multiply`."
        en: "Start with `$match` on `status`, then `$unwind` the `lines` array, then `$group` by `$store` with a `$sum` of `$multiply`."
---

## Ý chính

Lab chạy bằng mingo trong trình duyệt: kết quả được chấm thật, còn phần index chỉ đúng trên `mongod`. Trang "Explain Results" mô tả: các stage `$match`, `$sort`, `$limit` đứng đầu pipeline được gộp vào `$cursor`; `$match` gộp vào thành `filter` của kế hoạch truy vấn, nên có thể dùng index. Một `$match` đứng sau `$unwind` hay `$group` thì không còn là phần của truy vấn đầu vào.

Đặt `$match` đầu tiên còn giảm việc cho mọi stage sau: `$unwind` chỉ nhân dòng của đơn đã trả tiền.

## Ví dụ

```javascript
db.orders.aggregate([
  { $unwind: "$lines" },
  { $match: { status: "paid" } }
])
```

Pipeline trên cho cùng kết quả lọc nhưng `$unwind` chạy trên mọi đơn trước. Mở tab "Pipeline từng bước" để so số tài liệu sau mỗi stage.

## Thực hành

Viết pipeline doanh thu theo cửa hàng. Bộ chấm so kết quả; hãy tự kiểm thứ tự stage trong tab "Pipeline từng bước".

# EN

## Key idea

This lab runs on mingo in the browser: the result is really graded, while the index part only holds on `mongod`. The page "Explain Results" describes that leading `$match`, `$sort` and `$limit` stages are absorbed into `$cursor`; an absorbed `$match` becomes the `filter` of the query plan, so it can use an index. A `$match` after `$unwind` or `$group` is no longer part of the input query.

Putting `$match` first also cuts work for every later stage: `$unwind` only multiplies the lines of paid orders.

## Example

```javascript
db.orders.aggregate([
  { $unwind: "$lines" },
  { $match: { status: "paid" } }
])
```

The pipeline above filters the same way, but `$unwind` runs over every order first. Open the "Pipeline step by step" tab to compare document counts after each stage.

## Practice

Write the revenue-per-store pipeline. The grader compares results; check the stage order yourself in the "Pipeline step by step" tab.
