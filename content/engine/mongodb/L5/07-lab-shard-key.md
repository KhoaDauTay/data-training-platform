---
id: e-mg-l5-07
engine: mongodb
level: L5
module: sharding-ts
title: "Lab: đo ứng viên shard key bằng aggregation"
title_en: "Lab: measure shard key candidates with aggregation"
kind: lab
minutes: 15
runtime: browser
viz: mg-pipeline
objectives:
  - vi: "Đo cardinality và tần suất của một trường bằng `$group`"
    en: "Measure a field's cardinality and frequency with `$group`"
  - vi: "So hai ứng viên shard key trong một pipeline bằng `$facet`"
    en: "Compare two shard key candidates in one pipeline with `$facet`"
requires: [e-mg-l5-05]
sources:
  - https://www.mongodb.com/docs/manual/core/sharding-choose-a-shard-key/
lab:
  setup: |
    {"collections":{"orders":[{"_id":1,"customerId":"c08","country":"VN","day":300},{"_id":2,"customerId":"c15","country":"VN","day":300},{"_id":3,"customerId":"c22","country":"JP","day":301},{"_id":4,"customerId":"c06","country":"VN","day":301},{"_id":5,"customerId":"c13","country":"VN","day":301},{"_id":6,"customerId":"c20","country":"TH","day":302},{"_id":7,"customerId":"c04","country":"VN","day":302},{"_id":8,"customerId":"c11","country":"VN","day":302},{"_id":9,"customerId":"c18","country":"SG","day":303},{"_id":10,"customerId":"c02","country":"VN","day":303},{"_id":11,"customerId":"c09","country":"VN","day":303},{"_id":12,"customerId":"c16","country":"VN","day":304},{"_id":13,"customerId":"c23","country":"JP","day":304},{"_id":14,"customerId":"c07","country":"VN","day":304},{"_id":15,"customerId":"c14","country":"VN","day":305},{"_id":16,"customerId":"c21","country":"TH","day":305},{"_id":17,"customerId":"c05","country":"VN","day":305},{"_id":18,"customerId":"c12","country":"VN","day":306},{"_id":19,"customerId":"c19","country":"SG","day":306},{"_id":20,"customerId":"c03","country":"VN","day":306},{"_id":21,"customerId":"c10","country":"VN","day":307},{"_id":22,"customerId":"c17","country":"VN","day":307},{"_id":23,"customerId":"c01","country":"JP","day":307},{"_id":24,"customerId":"c08","country":"VN","day":308},{"_id":25,"customerId":"c15","country":"VN","day":308},{"_id":26,"customerId":"c22","country":"TH","day":308},{"_id":27,"customerId":"c06","country":"VN","day":309},{"_id":28,"customerId":"c13","country":"VN","day":309},{"_id":29,"customerId":"c20","country":"SG","day":309},{"_id":30,"customerId":"c04","country":"VN","day":310}]}}
  steps:
    - task:
        vi: "Đo một ứng viên: với `country`, trả một tài liệu gồm `distinct` (số giá trị khác nhau) và `topShare` (phần trăm tài liệu của giá trị phổ biến nhất, làm tròn 1 chữ số). Không trả `_id`."
        en: "Measure one candidate: for `country`, return one document with `distinct` (the number of distinct values) and `topShare` (the percentage of documents holding the most common value, rounded to 1 decimal). Do not return `_id`."
      solution: |
        db.orders.aggregate([
          { $group: { _id: "$country", n: { $sum: 1 } } },
          { $group: { _id: null, distinct: { $sum: 1 }, top: { $max: "$n" }, total: { $sum: "$n" } } },
          { $project: { _id: 0, distinct: 1, topShare: { $round: [ { $multiply: [ { $divide: [ "$top", "$total" ] }, 100 ] }, 1 ] } } }
        ])
      check: doc
      ordered: false
      hint:
        vi: "Hai `$group` nối nhau: lần đầu đếm theo `$country`, lần hai gom tất cả (`_id: null`) để đếm số nhóm, lấy `$max` và tổng."
        en: "Two `$group` stages in a row: the first counts by `$country`, the second groups everything (`_id: null`) to count the groups, take the `$max` and the total."
    - task:
        vi: "Giờ so hai ứng viên trong một pipeline: trả một tài liệu có hai trường `country` và `customerId`, mỗi trường là mảng một phần tử `{ distinct, topShare }` tính như bước 1."
        en: "Now compare both candidates in one pipeline: return one document with two fields `country` and `customerId`, each an array of one element `{ distinct, topShare }` computed as in step 1."
      solution: |
        db.orders.aggregate([
          { $facet: {
              country: [
                { $group: { _id: "$country", n: { $sum: 1 } } },
                { $group: { _id: null, distinct: { $sum: 1 }, top: { $max: "$n" }, total: { $sum: "$n" } } },
                { $project: { _id: 0, distinct: 1, topShare: { $round: [ { $multiply: [ { $divide: [ "$top", "$total" ] }, 100 ] }, 1 ] } } }
              ],
              customerId: [
                { $group: { _id: "$customerId", n: { $sum: 1 } } },
                { $group: { _id: null, distinct: { $sum: 1 }, top: { $max: "$n" }, total: { $sum: "$n" } } },
                { $project: { _id: 0, distinct: 1, topShare: { $round: [ { $multiply: [ { $divide: [ "$top", "$total" ] }, 100 ] }, 1 ] } } }
              ]
          } }
        ])
      check: doc
      ordered: false
      hint:
        vi: "`$facet` chạy nhiều pipeline con trên cùng đầu vào; đặt pipeline của bước 1 vào hai nhánh, đổi `$country` thành `$customerId` ở nhánh hai."
        en: "`$facet` runs several sub-pipelines on the same input; put the step 1 pipeline in two branches, changing `$country` to `$customerId` in the second."
---

## Ý chính

Lab chạy bằng mingo trong trình duyệt. Trên cluster thật, `analyzeShardKey` (từ 7.0) đo cardinality, tần suất và tính đơn điệu từ truy vấn mẫu. Ở đây ta đo hai chỉ số đầu trực tiếp trên dữ liệu bằng aggregation, cùng ý nghĩa như tài liệu mô tả:

- `distinct` thấp nghĩa là ít chunk tối đa.
- `topShare` cao nghĩa là một giá trị chiếm phần lớn tài liệu, chunk của nó dễ thành điểm nóng.

Trường `day` tăng dần theo `_id`: nó là khóa đơn điệu, ứng viên xấu nếu dùng sharding theo khoảng.

## Ví dụ

```javascript
{ $group: { _id: "$country", n: { $sum: 1 } } }
```

## Thực hành

Bước 1 đo `country`. Bước 2 so `country` với `customerId`. Kết quả cho thấy ứng viên nào phân tán tốt hơn: kết luận của bạn nên dựa trên cả hai con số.

# EN

## Key idea

This lab runs on mingo in the browser. On a real cluster, `analyzeShardKey` (from 7.0) measures cardinality, frequency and monotonicity from sampled queries. Here we measure the first two directly on the data with aggregation, with the same meaning the docs describe:

- A low `distinct` means few chunks at most.
- A high `topShare` means one value holds most documents, and its chunk easily becomes a hot spot.

The `day` field increases with `_id`: it is a monotonic key, a poor candidate for ranged sharding.

## Example

```javascript
{ $group: { _id: "$country", n: { $sum: 1 } } }
```

## Practice

Step 1 measures `country`. Step 2 compares `country` with `customerId`. The result shows which candidate spreads better: base your conclusion on both numbers.
