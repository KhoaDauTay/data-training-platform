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
  - vi: "Đo một shard key kép và thấy nó tăng cardinality"
    en: "Measure a compound shard key and see it raise cardinality"
requires: [e-mg-l5-05]
sources:
  - https://www.mongodb.com/docs/manual/core/sharding-choose-a-shard-key/
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/facet/
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
    - name: { vi: "Khóa kép", en: "Compound key" }
      task:
        vi: "Đo shard key kép `{ country, customerId }`: trả một tài liệu `{ distinct, topShare }` như bước 1, trong đó một giá trị là một cặp `country` và `customerId`."
        en: "Measure the compound shard key `{ country, customerId }`: return one document `{ distinct, topShare }` as in step 1, where one value is a pair of `country` and `customerId`."
      solution: |
        db.orders.aggregate([
          { $group: { _id: { country: "$country", customerId: "$customerId" }, n: { $sum: 1 } } },
          { $group: { _id: null, distinct: { $sum: 1 }, top: { $max: "$n" }, total: { $sum: "$n" } } },
          { $project: { _id: 0, distinct: 1, topShare: { $round: [ { $multiply: [ { $divide: [ "$top", "$total" ] }, 100 ] }, 1 ] } } }
        ])
      check: doc
      ordered: false
      hint:
        vi: "Pipeline của bước 1, chỉ đổi `_id` của `$group` đầu thành một tài liệu `{ country: \"$country\", customerId: \"$customerId\" }`."
        en: "The step 1 pipeline, changing only the first `$group`'s `_id` to a document `{ country: \"$country\", customerId: \"$customerId\" }`."
quiz:
  - q:
      vi: "`country` có 4 giá trị, `VN` chiếm 70 %. Thêm `customerId` vào sau thành khóa `{ country: 1, customerId: 1 }` thì sao?"
      en: "`country` has 4 values and `VN` holds 70%. What changes when `customerId` is added after it, giving the key `{ country: 1, customerId: 1 }`?"
    options:
      - { vi: "Cardinality vẫn là 4, vì trường đầu quyết định chunk", en: "Cardinality stays 4, because the first field decides the chunk" }
      - { vi: "Cardinality tăng lên số cặp khác nhau, nên các đơn `VN` chia được ra nhiều chunk", en: "Cardinality rises to the number of distinct pairs, so the `VN` orders can split into many chunks" }
      - { vi: "Không đổi gì vì `customerId` lặp lại", en: "Nothing changes because `customerId` repeats" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý nếu nghĩ chunk chỉ chia theo trường đầu, nhưng chunk là khoảng trên cả khóa kép. Các đơn `VN` có nhiều `customerId` khác nhau, nên khoảng `VN` chia nhỏ được."
      en: "It sounds right if chunks split only on the first field, but a chunk is a range over the whole compound key. The `VN` orders have many different `customerId` values, so the `VN` range can be split."
  - q:
      vi: "Trường `day` tăng theo `_id`. Nó là ứng viên thế nào cho sharding theo khoảng?"
      en: "Field `day` grows with `_id`. What kind of candidate is it for ranged sharding?"
    options:
      - { vi: "Tốt, vì có nhiều giá trị", en: "Good, because it has many values" }
      - { vi: "Xấu, vì đơn điệu: mọi lượt chèn mới dồn vào chunk có `MaxKey`", en: "Poor, because it is monotonic: every new insert goes to the chunk with `MaxKey`" }
    answer: 1
    why:
      vi: "Cardinality cao chưa đủ. Khóa luôn tăng làm mọi lượt ghi mới rơi vào một chunk cuối, một shard làm hết việc ghi."
      en: "High cardinality is not enough. An ever-increasing key sends every new write to the last chunk, so one shard does all the writing."
---
## Mở bài

Đội vận hành sắp shard collection đơn hàng và đang cãi nhau giữa `country` và `customerId`. Thay vì đoán, hãy đo hai con số mà docs dùng để chấm một shard key, ngay trên dữ liệu.

## Ý chính

Trên cluster thật, `analyzeShardKey` (từ 7.0) đo cardinality, tần suất và tính đơn điệu từ truy vấn mẫu. Ở đây ta đo hai chỉ số đầu trực tiếp trên dữ liệu bằng aggregation: `distinct` thấp nghĩa là ít chunk tối đa; `topShare` cao nghĩa là một giá trị chiếm phần lớn tài liệu và chunk của nó dễ thành điểm nóng.

Nhiều người nghĩ chỉ cần đếm số giá trị khác nhau. Thật ra một trường có nhiều giá trị vẫn xấu nếu một giá trị chiếm gần hết, hoặc nếu nó luôn tăng như `day`. Phải xem cả hai số, rồi xét tính đơn điệu. Khóa kép là cách thường dùng để tăng cardinality của một trường đầu ít giá trị.

Lab chạy bằng mingo trong trình duyệt: số đo là thật trên 30 đơn của lab.

## Cú pháp

```text
db.<coll>.aggregate([
  { $group: { _id: "$<field>" | { <a>: "$<a>", <b>: "$<b>" }, n: { $sum: 1 } } },
  { $group: { _id: null, distinct: { $sum: 1 }, top: { $max: "$n" }, total: { $sum: "$n" } } },
  { $project: { _id: 0, distinct: 1, topShare: { $round: [ <percent expression>, 1 ] } } }
])
{ $facet: { <name>: [ <stages> ], <name>: [ <stages> ] } }
```

- `$group` lần một: một tài liệu cho mỗi giá trị, kèm số đơn `n`.
- `$group` với `_id: null`: gom tất cả lại để đếm và lấy `$max`.
- `_id` là một tài liệu: nhóm theo cặp giá trị (khóa kép).
- `$facet`: nhiều pipeline con trên cùng đầu vào, mỗi nhánh một mảng kết quả.

## Ví dụ

Tần suất từng nước, nhiều nhất trước:

```javascript
db.orders.aggregate([{ $group: { _id: "$country", n: { $sum: 1 } } }, { $sort: { n: -1, _id: 1 } }])
```

`VN` có 21 trên 30 đơn, ba nước còn lại chia nhau 9 đơn.

Khách đặt nhiều nhất:

```javascript
db.orders.aggregate([{ $group: { _id: "$customerId", n: { $sum: 1 } } }, { $sort: { n: -1, _id: 1 } }, { $limit: 3 }])
```

Không khách nào quá 2 đơn: `customerId` rải đều hơn nhiều.

Tính đơn điệu của `day`:

```javascript
db.orders.find({}, { _id: 1, day: 1 }).sort({ _id: 1 }).limit(5)
```

`day` chỉ tăng theo `_id`: chèn mới luôn rơi vào cuối khoảng.

## Lỗi hay gặp

Chỉ đếm số giá trị, bỏ qua tần suất:

```javascript
// WRONG: 4 values looks fine, the 70% skew is hidden
db.orders.aggregate([{ $group: { _id: "$country" } }, { $count: "distinct" }])
```

```javascript
// FIX: keep each value's count so the top share shows
db.orders.aggregate([{ $group: { _id: "$country", n: { $sum: 1 } } }, { $sort: { n: -1, _id: 1 } }])
```

Đo trên một lát dữ liệu thay vì cả collection:

```javascript
// WRONG: only the last days, the picture changes
db.orders.aggregate([{ $match: { day: { $gte: 308 } } }, { $group: { _id: "$country", n: { $sum: 1 } } }, { $sort: { n: -1, _id: 1 } }])
```

```javascript
// FIX: measure over every document
db.orders.aggregate([{ $group: { _id: "$country", n: { $sum: 1 } } }, { $sort: { n: -1, _id: 1 } }])
```

Lát cuối chỉ có 7 đơn và một phân bố khác; quyết định shard key dựa trên nó là quyết định trên mẫu lệch.

## Thực hành

Bước 1 đo `country`. Bước 2 so `country` với `customerId` bằng `$facet`. Bước 3 đo khóa kép `{ country, customerId }`. Kết luận của bạn nên dựa trên cả `distinct` và `topShare`.

## Tóm tắt

- `distinct` = số chunk tối đa; `topShare` = độ lệch về một giá trị.
- Hai `$group` nối nhau đo được cả hai số; `$facet` so nhiều ứng viên một lần.
- Nhiều giá trị chưa đủ: khóa luôn tăng vẫn dồn ghi vào một chunk.
- Khóa kép tăng cardinality cho trường đầu ít giá trị.
- Shard key cho nhiều người bán mở đầu bằng `tenantId`: `e-mg-l5-12`.

# EN

## Opening

The operations team is about to shard the orders collection and is arguing between `country` and `customerId`. Instead of guessing, measure the two numbers the docs use to judge a shard key, right on the data.

## Key idea

On a real cluster, `analyzeShardKey` (from 7.0) measures cardinality, frequency and monotonicity from sampled queries. Here we measure the first two directly on the data with aggregation: a low `distinct` means few chunks at most; a high `topShare` means one value holds most documents and its chunk easily becomes a hot spot.

Many people think counting distinct values is enough. In fact a field with many values is still poor if one value holds nearly everything, or if it always increases like `day`. Look at both numbers, then at monotonicity. A compound key is the usual way to raise the cardinality of a leading field with few values.

The lab runs on mingo in the browser: the figures are real, measured on the lab's 30 orders.

## Syntax

```text
db.<coll>.aggregate([
  { $group: { _id: "$<field>" | { <a>: "$<a>", <b>: "$<b>" }, n: { $sum: 1 } } },
  { $group: { _id: null, distinct: { $sum: 1 }, top: { $max: "$n" }, total: { $sum: "$n" } } },
  { $project: { _id: 0, distinct: 1, topShare: { $round: [ <percent expression>, 1 ] } } }
])
{ $facet: { <name>: [ <stages> ], <name>: [ <stages> ] } }
```

- First `$group`: one document per value, with its order count `n`.
- `$group` with `_id: null`: gathers everything to count and take the `$max`.
- `_id` as a document: groups by a pair of values (a compound key).
- `$facet`: several sub-pipelines on the same input, one result array per branch.

## Example

The frequency of each country, most first:

```javascript
db.orders.aggregate([{ $group: { _id: "$country", n: { $sum: 1 } } }, { $sort: { n: -1, _id: 1 } }])
```

`VN` has 21 of 30 orders; the other three countries share 9.

The customers who order most:

```javascript
db.orders.aggregate([{ $group: { _id: "$customerId", n: { $sum: 1 } } }, { $sort: { n: -1, _id: 1 } }, { $limit: 3 }])
```

No customer has more than 2 orders: `customerId` spreads far better.

The monotonicity of `day`:

```javascript
db.orders.find({}, { _id: 1, day: 1 }).sort({ _id: 1 }).limit(5)
```

`day` only grows with `_id`: new inserts always land at the end of the range.

## Common mistakes

Counting values only, ignoring frequency:

```javascript
// WRONG: 4 values looks fine, the 70% skew is hidden
db.orders.aggregate([{ $group: { _id: "$country" } }, { $count: "distinct" }])
```

```javascript
// FIX: keep each value's count so the top share shows
db.orders.aggregate([{ $group: { _id: "$country", n: { $sum: 1 } } }, { $sort: { n: -1, _id: 1 } }])
```

Measuring a slice of the data instead of the whole collection:

```javascript
// WRONG: only the last days, the picture changes
db.orders.aggregate([{ $match: { day: { $gte: 308 } } }, { $group: { _id: "$country", n: { $sum: 1 } } }, { $sort: { n: -1, _id: 1 } }])
```

```javascript
// FIX: measure over every document
db.orders.aggregate([{ $group: { _id: "$country", n: { $sum: 1 } } }, { $sort: { n: -1, _id: 1 } }])
```

The last slice has only 7 orders and a different spread; choosing a shard key from it is choosing on a skewed sample.

## Practice

Step 1 measures `country`. Step 2 compares `country` with `customerId` using `$facet`. Step 3 measures the compound key `{ country, customerId }`. Base your conclusion on both `distinct` and `topShare`.

## Recap

- `distinct` = the maximum number of chunks; `topShare` = the skew towards one value.
- Two `$group` stages in a row measure both numbers; `$facet` compares several candidates at once.
- Many values is not enough: an ever-increasing key still sends writes to one chunk.
- A compound key raises the cardinality of a leading field with few values.
- A shard key for many sellers starts with `tenantId`: `e-mg-l5-12`.
