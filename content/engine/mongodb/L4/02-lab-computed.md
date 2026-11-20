---
id: e-mg-l4-02
engine: mongodb
level: L4
module: patterns
title: "Lab: mẫu Computed Values cho tổng đơn hàng"
title_en: "Lab: the Computed Values pattern for order totals"
kind: lab
minutes: 12
runtime: browser
viz: mg-pipeline
objectives:
  - vi: "Tính trước tổng tiền và số món của mỗi đơn bằng biểu thức trên mảng"
    en: "Precompute each order's total and item count with array expressions"
requires: [e-mg-l4-01]
sources:
  - https://www.mongodb.com/docs/manual/data-modeling/design-patterns/handle-computed-values/
lab:
  setup: |
    {"collections": {"orders": [
      {"_id": 101, "customer": "c01", "lines": [{"sku": "A", "qty": 2, "price": 12.5}, {"sku": "B", "qty": 1, "price": 40}]},
      {"_id": 102, "customer": "c02", "lines": [{"sku": "C", "qty": 3, "price": 8}]},
      {"_id": 103, "customer": "c01", "lines": [{"sku": "A", "qty": 1, "price": 12.5}, {"sku": "C", "qty": 2, "price": 8}, {"sku": "D", "qty": 1, "price": 99}]},
      {"_id": 104, "customer": "c03", "lines": []}
    ]}}
  steps:
    - task:
        vi: "Trả mỗi đơn ở dạng đã tính sẵn: `_id`, `customer`, `itemCount` = tổng `qty`, `total` = tổng `qty` nhân `price` của mọi dòng trong `lines`. Đơn không có dòng nào có `itemCount` và `total` bằng 0. Xếp theo `_id` tăng dần."
        en: "Return each order in its precomputed shape: `_id`, `customer`, `itemCount` = sum of `qty`, `total` = sum of `qty` times `price` over every entry in `lines`. An order with no lines has `itemCount` and `total` of 0. Order by `_id` ascending."
      solution: |
        db.orders.aggregate([
          { $project: {
              customer: 1,
              itemCount: { $sum: "$lines.qty" },
              total: { $sum: { $map: { input: "$lines", as: "l", in: { $multiply: [ "$$l.qty", "$$l.price" ] } } } }
          } },
          { $sort: { _id: 1 } }
        ])
      check: doc
      ordered: true
      hint:
        vi: "Trong `$project`, `$sum` nhận cả một mảng: `$lines.qty` là mảng các `qty`. Với tiền, dùng `$map` để nhân từng dòng rồi `$sum`."
        en: "Inside `$project`, `$sum` accepts a whole array: `$lines.qty` is the array of `qty` values. For money, use `$map` to multiply each line, then `$sum`."
---

## Ý chính

Lab chạy bằng mingo trong trình duyệt. Mẫu Computed Values: khi một giá trị được đọc nhiều hơn nhiều so với được ghi, tính nó một lần lúc ghi và lưu lại, thay vì tính lại ở mỗi lần đọc. Ở đây tổng tiền và số món của đơn được lưu cùng đơn.

Trên `mongod`, bạn chạy pipeline này rồi ghi kết quả về (ví dụ bằng `$merge`), hoặc cập nhật hai trường mỗi khi đơn đổi. Ở đây ta chỉ viết phần tính.

## Ví dụ

```javascript
{ $sum: "$lines.qty" }
```

Trong `$project`, `$sum` trên một mảng cộng các phần tử của mảng; mảng rỗng cho 0.

## Thực hành

Viết pipeline trả mỗi đơn với `itemCount` và `total`.

# EN

## Key idea

This lab runs on mingo in the browser. The Computed Values pattern: when a value is read far more often than it is written, compute it once at write time and store it, instead of computing it on every read. Here an order's total and item count are stored with the order.

On `mongod` you would run this pipeline and write the result back (for example with `$merge`), or update both fields whenever the order changes. Here we only write the computation.

## Example

```javascript
{ $sum: "$lines.qty" }
```

Inside `$project`, `$sum` over an array adds its elements; an empty array gives 0.

## Practice

Write the pipeline that returns each order with `itemCount` and `total`.
