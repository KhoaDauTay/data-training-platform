---
id: e-mg-l4-05
engine: mongodb
level: L4
module: patterns
title: "Lab: mẫu Outlier cho sản phẩm có quá nhiều đánh giá"
title_en: "Lab: the Outlier pattern for products with too many reviews"
kind: lab
minutes: 12
runtime: browser
viz: mg-pipeline
objectives:
  - vi: "Giữ một số mục đầu trong tài liệu chính và đánh dấu phần tràn"
    en: "Keep the first entries in the main document and flag the overflow"
requires: [e-mg-l4-01]
sources:
  - https://www.mongodb.com/docs/manual/data-modeling/design-patterns/group-data/outlier-pattern/
  - https://www.mongodb.com/docs/manual/data-modeling/design-patterns/group-data/
lab:
  setup: |
    {"collections": {"products": [
      {"_id": "p1", "name": "Lantern", "reviews": [{"by": "u1", "stars": 5}, {"by": "u2", "stars": 4}]},
      {"_id": "p2", "name": "Kite", "reviews": [{"by": "u1", "stars": 3}, {"by": "u3", "stars": 5}, {"by": "u4", "stars": 4}, {"by": "u5", "stars": 5}, {"by": "u6", "stars": 2}]},
      {"_id": "p3", "name": "Drum", "reviews": []},
      {"_id": "p4", "name": "Fan", "reviews": [{"by": "u2", "stars": 4}, {"by": "u7", "stars": 4}, {"by": "u8", "stars": 1}]}
    ]}}
  steps:
    - task:
        vi: "Mỗi sản phẩm chỉ giữ tối đa 3 đánh giá đầu trong tài liệu chính. Trả `_id`, `name`, `reviewCount` (tổng số đánh giá), `reviews` (3 đánh giá đầu theo thứ tự đang có), `hasOverflow` (đúng khi có hơn 3 đánh giá). Xếp theo `_id` tăng dần."
        en: "Each product keeps at most its first 3 reviews in the main document. Return `_id`, `name`, `reviewCount` (the total number of reviews), `reviews` (the first 3 reviews in their current order), `hasOverflow` (true when there are more than 3 reviews). Order by `_id` ascending."
      solution: |
        db.products.aggregate([
          { $project: {
              name: 1,
              reviewCount: { $size: "$reviews" },
              reviews: { $slice: [ "$reviews", 3 ] },
              hasOverflow: { $gt: [ { $size: "$reviews" }, 3 ] }
          } },
          { $sort: { _id: 1 } }
        ])
      check: doc
      ordered: true
      hint:
        vi: "`$size` đếm phần tử, `$slice` với số 3 lấy 3 phần tử đầu, `$gt` cho cờ."
        en: "`$size` counts elements, `$slice` with 3 takes the first 3 elements, `$gt` gives the flag."
---

## Ý chính

Lab chạy bằng mingo trong trình duyệt. Mẫu Outlier: hầu hết sản phẩm có ít đánh giá, vài sản phẩm có rất nhiều. Thay vì thiết kế mọi tài liệu cho trường hợp hiếm, tài liệu chính giữ một số mục đầu và một cờ `hasOverflow`; phần tràn nằm ở tài liệu riêng. Ứng dụng đọc cờ để biết khi nào cần lấy thêm.

Điều này cũng giữ tài liệu dưới giới hạn 16 MiB của BSON, và tránh mảng không có trần làm index (chỉ mục) multikey phình.

## Ví dụ

```javascript
{ $slice: [ "$reviews", 3 ] }
```

## Thực hành

Viết pipeline trả dạng tài liệu chính sau khi áp mẫu outlier.

# EN

## Key idea

This lab runs on mingo in the browser. The Outlier pattern: most products have few reviews, a few have very many. Instead of designing every document for the rare case, the main document keeps its first entries and a `hasOverflow` flag; the overflow lives in separate documents. The application reads the flag to know when to fetch more.

This also keeps documents under the 16 MiB BSON limit, and stops an unbounded array from bloating a multikey index.

## Example

```javascript
{ $slice: [ "$reviews", 3 ] }
```

## Practice

Write the pipeline that returns the main document shape after applying the outlier pattern.
