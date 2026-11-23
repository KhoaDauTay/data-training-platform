---
id: e-mg-l2-16
engine: mongodb
level: L2
module: modeling
title: Một trường lệch kiểu làm sai báo cáo
title_en: One field of the wrong type breaks a report
kind: predict
runtime: browser
minutes: 12
objectives:
  - vi: Đoán đúng `$sum` làm gì với một giá trị là chuỗi thay vì số.
    en: Predict what `$sum` does with a value stored as a string instead of a number.
  - vi: Tìm tài liệu lệch kiểu bằng `$type` và sửa chúng.
    en: Find documents of the wrong type with `$type` and fix them.
requires: [e-mg-l2-06, e-mg-l2-11]
sources:
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/sum/
  - https://www.mongodb.com/docs/manual/reference/operator/query/type/
  - https://www.mongodb.com/docs/manual/data-modeling/
  - https://www.mongodb.com/docs/manual/core/schema-validation/
predict:
  sql: "db.orders.aggregate([{ $group: { _id: '$city', revenue: { $sum: '$total' }, orders: { $sum: 1 } } }, { $sort: { _id: 1 } }])"
  q:
    vi: 'Hue có đúng một đơn, `total` của nó được nhập là `''300000''` (chuỗi). Dòng `Hue` cho `revenue` bằng bao nhiêu?'
    en: 'Hue has exactly one order, whose `total` was entered as `''300000''` (a string). What `revenue` does the `Hue` row show?'
  options:
    - vi: "300000"
      en: "300000"
    - vi: "0"
      en: "0"
    - vi: '`null`'
      en: '`null`'
    - vi: Pipeline báo lỗi kiểu dữ liệu
      en: The pipeline fails with a type error
  answer: 1
  why:
    vi: 'Nhiều người nghĩ "schemaless" nghĩa là không cần thiết kế, và nếu sai thì sẽ có lỗi. Thật ra `$sum` bỏ qua im lặng mọi giá trị không phải số ("$sum ignores the non-numeric values", docs `$sum`). Hue vẫn có `orders` 1 nhưng `revenue` 0, và không có lỗi nào báo cho bạn.'
    en: 'Many people think "schemaless" means no design is needed, and that a mistake would raise an error. In fact `$sum` silently skips every non-numeric value ("$sum ignores the non-numeric values", `$sum` docs). Hue still has `orders` 1 but `revenue` 0, and nothing warns you.'
lab:
  setup: |
    {"collections": {"orders": [
      {"_id": "o1", "city": "Da Nang", "total": 500000, "status": "paid"},
      {"_id": "o2", "city": "Da Nang", "total": 120000, "status": "paid"},
      {"_id": "o3", "city": "Hue", "total": "300000", "status": "paid"},
      {"_id": "o4", "city": "Hoi An", "status": "paid"},
      {"_id": "o5", "city": "Hoi An", "total": 80000, "status": "paid"}
    ]}}
  steps:
    - task:
        vi: 'Chạy báo cáo ở câu đoán: theo thành phố (`_id`), `revenue` là tổng `total`, `orders` là số đơn, xếp `_id` từ A tới Z. Tìm dòng có đơn mà không có doanh thu.'
        en: 'Run the report from the prediction: per city (`_id`), `revenue` is the sum of `total`, `orders` the number of orders, sorted by `_id` from A to Z. Find the row that has orders but no revenue.'
      solution: "db.orders.aggregate([{ $group: { _id: '$city', revenue: { $sum: '$total' }, orders: { $sum: 1 } } }, { $sort: { _id: 1 } }])"
      check: doc
      ordered: true
      hint:
        vi: 'Chép pipeline ở câu đoán vào editor và bấm Chạy.'
        en: 'Copy the pipeline from the prediction into the editor and press Run.'
    - task:
        vi: 'Tìm mọi đơn có `total` không phải số, kể cả đơn thiếu hẳn `total`. Trả cả tài liệu.'
        en: 'Find every order whose `total` is not a number, including orders with no `total` at all. Return the whole documents.'
      solution: "db.orders.find({ total: { $not: { $type: 'number' } } })"
      check: doc
      hint:
        vi: '`{ $type: ''number'' }` khớp mọi kiểu số. Bọc trong `$not` để lấy phần còn lại; tài liệu thiếu trường cũng khớp `$not`.'
        en: '`{ $type: ''number'' }` matches every numeric type. Wrap it in `$not` to get the rest; a document missing the field also matches `$not`.'
    - task:
        vi: 'Sửa đơn `''o3''`: lưu `total` thành số `300000`.'
        en: 'Fix order `''o3''`: store `total` as the number `300000`.'
      solution: "db.orders.updateOne({ _id: 'o3' }, { $set: { total: 300000 } })"
      check: doc
      hint:
        vi: '`$set` với giá trị không có dấu nháy: `300000`, không phải `''300000''`.'
        en: '`$set` with a value without quotes: `300000`, not `''300000''`.'
---
## Ý chính

Báo cáo doanh thu ghi Hue 0 đồng, dù Hue có đơn. Không có lỗi nào. Chuyện gì đã xảy ra?

MongoDB không bắt mọi tài liệu trong một collection có cùng kiểu cho một trường. Một form nhập `total` là chuỗi `'300000'` vẫn được ghi. Sau đó:

- `$sum` bỏ qua giá trị không phải số, nên doanh thu hụt mà không báo.
- So sánh như `{ total: { $gt: 100000 } }` không khớp chuỗi, nên đơn đó biến khỏi bộ lọc.
- `$sort` xếp chuỗi sau mọi số, theo thứ tự kiểu của BSON.

Nhiều người nghĩ "schemaless" là không cần thiết kế. Docs Data Modeling khuyên ngược lại: "plan your schema prior to using your database at a production scale". Tức là chốt trước kiểu của mỗi trường.

Làm được: tìm tài liệu lệch kiểu bằng `$type` trước khi tin một con số tổng.

## Ví dụ

Kiểm tra nhanh trước khi chạy báo cáo:

```js
db.orders.countDocuments({ total: { $not: { $type: 'number' } } })
```

## Thực hành

Trên server MongoDB thật, bạn chặn lỗi này từ lúc ghi bằng `validator` với `$jsonSchema` (ví dụ `total` phải là `'number'`). Validator chưa chạy trong trình duyệt (mingo không kiểm `$jsonSchema`), nên bài này dùng `$type` để tìm và sửa sau khi đã ghi.

# EN

## Key idea

The revenue report shows 0 for Hue, even though Hue has an order. No error anywhere. What happened?

MongoDB does not force every document in a collection to use the same type for a field. A form that enters `total` as the string `'300000'` is still written. Then:

- `$sum` skips non-numeric values, so revenue comes up short without a warning.
- A comparison such as `{ total: { $gt: 100000 } }` does not match a string, so that order drops out of the filter.
- `$sort` puts strings after every number, following BSON type order.

Many people think "schemaless" means no design. The Data Modeling docs advise the opposite: "plan your schema prior to using your database at a production scale". That means settling each field's type up front.

You can now: find documents of the wrong type with `$type` before you trust a total.

## Example

A quick check before running the report:

```js
db.orders.countDocuments({ total: { $not: { $type: 'number' } } })
```

## Practice

On a real MongoDB server you block this mistake at write time with a `validator` using `$jsonSchema` (for example, `total` must be `'number'`). Validators do not run in the browser (mingo does not check `$jsonSchema`), so this lesson uses `$type` to find and fix the documents after they were written.
