---
id: e-mg-l4-06
engine: mongodb
level: L4
module: patterns
title: "Lab: dữ liệu đa hình trong một collection"
title_en: "Lab: polymorphic data in one collection"
kind: lab
minutes: 12
runtime: browser
viz: mg-pipeline
objectives:
  - vi: "Đọc nhiều dạng tài liệu trong một collection bằng `$switch` theo trường loại"
    en: "Read several document shapes in one collection with `$switch` on a type field"
requires: [e-mg-l4-01]
sources:
  - https://www.mongodb.com/docs/manual/data-modeling/design-patterns/polymorphic-data/
lab:
  setup: |
    {"collections": {"policies": [
      {"_id": 1, "kind": "car", "plate": "43A-12345", "insured": 300},
      {"_id": 2, "kind": "home", "address": "12 Bach Dang", "insured": 1500},
      {"_id": 3, "kind": "travel", "destination": "Tokyo", "days": 6, "insured": 80},
      {"_id": 4, "kind": "car", "plate": "43B-67890", "insured": 260},
      {"_id": 5, "kind": "home", "address": "8 Tran Phu", "insured": 2100}
    ]}}
  steps:
    - task:
        vi: "Collection `policies` chứa ba loại hợp đồng, phân biệt bằng `kind`. Trả một dòng tổng hợp cho mỗi `kind`: `_id` là `kind`, `count`, `totalInsured` (tổng `insured`), `labels` là mảng nhãn theo `_id` hợp đồng tăng dần. Nhãn: `plate` với `car`, `address` với `home`, `destination` với `travel`. Xếp theo `_id` tăng dần."
        en: "The `policies` collection holds three kinds of policy, told apart by `kind`. Return one summary per `kind`: `_id` is the `kind`, `count`, `totalInsured` (sum of `insured`), `labels` the array of labels by policy `_id` ascending. Label: `plate` for `car`, `address` for `home`, `destination` for `travel`. Order by `_id` ascending."
      solution: |
        db.policies.aggregate([
          { $sort: { _id: 1 } },
          { $group: {
              _id: "$kind",
              count: { $sum: 1 },
              totalInsured: { $sum: "$insured" },
              labels: { $push: { $switch: { branches: [
                { case: { $eq: [ "$kind", "car" ] }, then: "$plate" },
                { case: { $eq: [ "$kind", "home" ] }, then: "$address" },
                { case: { $eq: [ "$kind", "travel" ] }, then: "$destination" }
              ] } } }
          } },
          { $sort: { _id: 1 } }
        ])
      check: doc
      ordered: true
      hint:
        vi: "`$sort` theo `_id` trước `$group` để `labels` đúng thứ tự. Trong `$push`, dùng `$switch` với ba `case` theo `kind`."
        en: "`$sort` by `_id` before `$group` so `labels` comes out in order. Inside `$push`, use `$switch` with three `case` branches on `kind`."
---

## Ý chính

Lab chạy bằng mingo trong trình duyệt. Mẫu Polymorphic Data: các tài liệu giống nhau ở phần chung (`insured`) nhưng khác nhau ở phần riêng của từng loại. Đặt chúng trong một collection giúp truy vấn chung (tổng tiền bảo hiểm) chỉ cần một lần đọc; một trường loại như `kind` cho biết phải đọc phần riêng nào.

## Ví dụ

```javascript
{ $switch: { branches: [ { case: { $eq: [ "$kind", "car" ] }, then: "$plate" } ] } }
```

## Thực hành

Viết pipeline tổng hợp theo `kind` với nhãn riêng của từng loại.

# EN

## Key idea

This lab runs on mingo in the browser. The Polymorphic Data pattern: documents share a common part (`insured`) but differ in the part specific to each kind. Keeping them in one collection lets a common query (total insured amount) run in a single read; a type field such as `kind` says which specific part to read.

## Example

```javascript
{ $switch: { branches: [ { case: { $eq: [ "$kind", "car" ] }, then: "$plate" } ] } }
```

## Practice

Write the pipeline that summarises by `kind` with each kind's own label.
