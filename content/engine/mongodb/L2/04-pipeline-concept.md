---
id: e-mg-l2-04
engine: mongodb
level: L2
module: aggregation
title: Aggregation pipeline là gì
title_en: What an aggregation pipeline is
kind: concept
minutes: 8
viz: aggregation-pipeline
objectives:
  - vi: Giải thích pipeline là dãy stage, mỗi stage nhận tài liệu từ stage trước.
    en: Explain that a pipeline is a list of stages, each taking documents from the stage before.
  - vi: Biết vì sao nên đặt `$match` sớm và thứ tự stage làm đổi kết quả.
    en: Know why `$match` should come early and how stage order changes the result.
requires: [e-mg-l1-10]
sources:
  - https://www.mongodb.com/docs/manual/core/aggregation-pipeline/
  - https://www.mongodb.com/docs/manual/core/aggregation-pipeline-optimization/
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation-pipeline/
quiz:
  - q:
      vi: 'Pipeline `[{ $group: { _id: "$store", n: { $sum: 1 } } }, { $match: { status: "paid" } }]` trả về gì?'
      en: 'What does the pipeline `[{ $group: { _id: "$store", n: { $sum: 1 } } }, { $match: { status: "paid" } }]` return?'
    options:
      - vi: Không tài liệu nào
        en: No documents
      - vi: Số đơn đã thanh toán của mỗi cửa hàng
        en: The number of paid orders per store
      - vi: Số đơn của mỗi cửa hàng, mọi trạng thái
        en: The number of orders per store, all statuses
    answer: 0
    why:
      vi: 'Sau `$group`, mỗi tài liệu chỉ còn `_id` và `n`. Không còn trường `status` nên `$match` loại hết. Muốn đếm đơn đã thanh toán thì `$match` phải đứng trước `$group`.'
      en: 'After `$group`, each document only has `_id` and `n`. There is no `status` field left, so `$match` drops everything. To count paid orders, `$match` must come before `$group`.'
  - q:
      vi: Vì sao nên đặt `$match` ở đầu pipeline khi được?
      en: Why put `$match` at the start of a pipeline when you can?
    options:
      - vi: Các stage sau xử lý ít tài liệu hơn, và `$match` đứng đầu dùng được index
        en: Later stages process fewer documents, and a leading `$match` can use an index
      - vi: Vì `$match` chỉ được phép là stage đầu tiên
        en: Because `$match` is only allowed as the first stage
      - vi: Vì đặt ở chỗ khác thì kết quả luôn sai
        en: Because anywhere else the result is always wrong
    answer: 0
    why:
      vi: "`$match` dùng được ở bất kỳ vị trí nào, nhưng đứng đầu thì nó lọc bớt dữ liệu sớm và có thể đọc qua index. Bộ tối ưu của MongoDB cũng tự dời một số `$match` lên trước khi an toàn."
      en: "`$match` may appear anywhere, but at the start it trims data early and can read through an index. MongoDB's optimizer also moves some `$match` stages earlier when that is safe."
---
## Ý chính

`db.<collection>.aggregate([stage, stage, ...])` cho tài liệu chảy qua một dãy stage. Mỗi stage nhận dòng tài liệu ra từ stage trước và trả dòng mới cho stage sau, giống băng chuyền.

Các stage hay dùng:

- `$match`: lọc, cùng cú pháp với filter của `find`;
- `$project`, `$set` (tên khác: `$addFields`), `$unset`: đổi hình tài liệu, tính trường mới;
- `$group`: gom nhiều tài liệu thành một theo khóa `_id`, kèm phép tổng hợp như `$sum`, `$avg`;
- `$sort`, `$limit`, `$skip`, `$count`;
- `$unwind`: tách mảng thành nhiều tài liệu;
- `$lookup`: ghép tài liệu từ collection khác.

Thứ tự stage là một phần của câu hỏi: sau `$group` các trường cũ không còn nữa. Đặt `$match` sớm để các stage sau làm ít việc hơn.

`aggregate` chỉ đọc. Kết quả là một danh sách tài liệu mới, collection gốc không đổi (trừ khi dùng `$out`/`$merge`, một bài sau ở L2).

Làm được: đọc một pipeline và nói hình dạng tài liệu sau từng stage.

## Ví dụ

```js
db.orders.aggregate([
  { $match: { status: "paid" } },
  { $group: { _id: "$store", revenue: { $sum: "$total" } } },
  { $sort: { revenue: -1 } }
])
```

## Thực hành

Bấm qua sơ đồ: số tài liệu và các trường thay đổi thế nào sau mỗi stage. Rồi trả lời hai câu hỏi.

# EN

## Key idea

`db.<collection>.aggregate([stage, stage, ...])` streams documents through a list of stages. Each stage takes the documents coming out of the stage before and passes new ones on, like a conveyor belt.

Common stages:

- `$match`: filter, same syntax as a `find` filter;
- `$project`, `$set` (alias `$addFields`), `$unset`: reshape documents, compute new fields;
- `$group`: merge many documents into one per `_id` key, with accumulators such as `$sum`, `$avg`;
- `$sort`, `$limit`, `$skip`, `$count`;
- `$unwind`: split an array into several documents;
- `$lookup`: join documents from another collection.

Stage order is part of the question: after `$group` the old fields are gone. Put `$match` early so later stages do less work.

`aggregate` only reads. The result is a new list of documents and the collection is unchanged (unless you use `$out`/`$merge`, a later L2 lesson).

You can now: read a pipeline and tell the shape of the documents after each stage.

## Example

```js
db.orders.aggregate([
  { $match: { status: "paid" } },
  { $group: { _id: "$store", revenue: { $sum: "$total" } } },
  { $sort: { revenue: -1 } }
])
```

## Practice

Step through the diagram: how the number of documents and their fields change after each stage. Then answer the two questions.
