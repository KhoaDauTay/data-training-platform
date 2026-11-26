---
id: e-mg-l2-04
engine: mongodb
level: L2
module: aggregation
title: Aggregation pipeline là gì
title_en: What an aggregation pipeline is
kind: concept
runtime: docs
minutes: 8
viz: mg-pipeline
objectives:
  - vi: Giải thích pipeline là dãy stage, mỗi stage nhận tài liệu từ stage trước.
    en: Explain that a pipeline is a list of stages, each taking documents from the stage before.
  - vi: Biết vì sao nên đặt `$match` sớm và thứ tự stage làm đổi kết quả.
    en: Know why `$match` should come early and how stage order changes the result.
requires: [e-mg-l1-10]
sources:
  - https://www.mongodb.com/docs/manual/core/aggregation-pipeline/
  - https://www.mongodb.com/docs/manual/core/aggregation-pipeline-optimization/
  - https://www.mongodb.com/docs/manual/reference/mql/aggregation-stages/
demo_setup: '{"collections": {"orders": [{"_id": 1, "store": "S1", "status": "paid", "total": 95000}, {"_id": 2, "store": "S2", "status": "shipped", "total": 120000}, {"_id": 3, "store": "S1", "status": "shipped", "total": 450000}, {"_id": 4, "store": "S1", "status": "cancelled", "total": 150000}, {"_id": 5, "store": "S2", "status": "paid", "total": 210000}, {"_id": 6, "store": "S2", "status": "paid", "total": 25000}]}}'
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
      vi: 'Sau `$group`, mỗi tài liệu chỉ còn `_id` (mã cửa hàng) và `n`. Không còn trường `status`, nên `$match` không giữ tài liệu nào, và không có lỗi nào báo. Không ra "số đơn đã thanh toán", vì lúc đếm chưa có bộ lọc nào; cũng không ra "số đơn mọi trạng thái", vì `$match` phía sau vẫn chạy và loại hết các tài liệu đếm đó. Muốn đếm đơn đã thanh toán thì `$match` phải đứng trước `$group`.'
      en: 'After `$group`, each document only has `_id` (the store code) and `n`. There is no `status` field left, so `$match` keeps no document, and no error is raised. It is not "paid orders per store", because nothing was filtered while counting; nor "orders of every status", because the `$match` after it still runs and drops those counted documents. To count paid orders, `$match` must come before `$group`.'
  - q:
      vi: Vì sao nên đặt `$match` ở đầu pipeline khi được?
      en: Why put `$match` at the start of a pipeline when you can?
    options:
      - vi: Các stage sau xử lý ít tài liệu hơn, và `$match` đứng đầu dùng được index (chỉ mục)
        en: Later stages process fewer documents, and a leading `$match` can use an index
      - vi: Vì `$match` chỉ được phép là stage đầu tiên
        en: Because `$match` is only allowed as the first stage
      - vi: Không cần quan tâm, bộ tối ưu của MongoDB luôn tự dời mọi `$match` lên đầu
        en: No need to care, MongoDB's optimizer always moves every `$match` to the front
    answer: 0
    trap: 2
    why:
      vi: "Bộ tối ưu của MongoDB có dời `$match` lên trước, nhưng chỉ khi kết quả không đổi: một `$match` trên trường do `$group` tạo ra (như `n`) thì không dời được, nên không thể trông vào nó. `$match` cũng không bị giới hạn ở stage đầu: lọc theo `n` sau `$group` là hợp lệ. Đặt đầu là tốt vì các stage sau nhận ít tài liệu hơn, và chỉ `$match` đứng đầu mới đọc được qua index của collection."
      en: "MongoDB's optimizer does move `$match` earlier, but only when the result stays the same: a `$match` on a field created by `$group` (such as `n`) cannot move, so you cannot rely on it. Nor is `$match` limited to the first stage: filtering on `n` after `$group` is valid. Putting it first helps because later stages receive fewer documents, and only a leading `$match` can read through the collection's index."
---
## Mở bài

Quản lý cần doanh thu theo cửa hàng, chỉ tính đơn đã thanh toán, cửa hàng cao nhất trước. Với `find` bạn chỉ lọc và sắp được, không cộng được. Làm sao để MongoDB vừa lọc, vừa gom, vừa sắp trong một lệnh?

## Ý chính

`db.<collection>.aggregate([stage, stage, ...])` cho tài liệu chảy qua một dãy stage. Mỗi stage nhận dòng tài liệu ra từ stage trước và trả dòng mới cho stage sau, giống băng chuyền.

Các stage hay dùng:

- `$match`: lọc, cùng cú pháp với filter của `find`;
- `$project`, `$set` (tên khác: `$addFields`), `$unset`: đổi hình tài liệu, tính trường mới;
- `$group`: gom nhiều tài liệu thành một theo khóa `_id`, kèm phép tổng hợp như `$sum`, `$avg`;
- `$sort`, `$limit`, `$skip`, `$count`;
- `$unwind`: tách mảng thành nhiều tài liệu;
- `$lookup`: ghép tài liệu từ collection khác.

Thứ tự stage là một phần của câu hỏi: sau `$group` các trường cũ không còn nữa. Đặt `$match` sớm để các stage sau làm ít việc hơn, và để `$match` đứng đầu có thể đọc qua index (chỉ mục).

`aggregate` chỉ đọc. Kết quả là một danh sách tài liệu mới, collection gốc không đổi (trừ khi dùng `$out`/`$merge`, một bài sau ở L2).

Nhiều người nghĩ pipeline giống một câu SQL mà bộ máy tự sắp lại mệnh đề. Thật ra thứ tự bạn viết chính là thứ tự dữ liệu chảy qua. Bộ tối ưu của MongoDB có dời hoặc gộp vài stage, nhưng chỉ khi kết quả chắc chắn không đổi; nó không sửa một pipeline viết sai thứ tự. Cách đọc một pipeline: đi từng stage, mỗi lần tự hỏi "ra khỏi stage này còn bao nhiêu tài liệu, mỗi tài liệu có những trường nào". Nếu stage sau nhắc tới một trường mà stage trước đã bỏ, kết quả sẽ rỗng hoặc sai, thường không có lỗi nào báo.

Làm được: đọc một pipeline và nói hình dạng tài liệu sau từng stage.

## Cú pháp

```text
db.<collection>.aggregate([
  { <stage>: { ... } },
  { <stage>: { ... } }
])
```

- Một mảng, mỗi phần tử là một tài liệu có đúng một tên stage.
- Stage chạy theo thứ tự trong mảng.

## Ví dụ

Doanh thu theo cửa hàng của các đơn đã thanh toán, cao nhất trước:

```js
db.orders.aggregate([
  { $match: { status: "paid" } },
  { $group: { _id: "$store", revenue: { $sum: "$total" } } },
  { $sort: { revenue: -1 } }
])
```

Kết quả có hai tài liệu: `S2` với doanh thu 235000 rồi `S1` với 95000. Mỗi tài liệu chỉ còn `_id` (mã cửa hàng) và `revenue`; các trường như `status`, `total` của từng đơn không còn sau `$group`.

Hai đơn lớn nhất, chỉ lấy `total`:

```js
db.orders.aggregate([
  { $sort: { total: -1 } },
  { $limit: 2 },
  { $project: { total: 1 } }
])
```

Kết quả: đơn 3 (450000) rồi đơn 5 (210000), mỗi đơn chỉ có `_id` và `total`. `$sort` đứng trước `$limit` nên đây đúng là hai đơn lớn nhất.

## Lỗi hay gặp

Lọc sau khi gom nhóm, trên trường không còn nữa:

```js
// WRONG: after $group there is no status field, so nothing is left
db.orders.aggregate([{ $group: { _id: "$store", n: { $sum: 1 } } }, { $match: { status: "paid" } }])
```

```js
// FIX: filter first, then group
db.orders.aggregate([{ $match: { status: "paid" } }, { $group: { _id: "$store", n: { $sum: 1 } } }])
```

Bản sai trả về danh sách rỗng mà không báo lỗi; bản sửa đếm được 1 đơn đã thanh toán ở `S1` và 2 ở `S2`.

Cắt trước khi sắp:

```js
// WRONG: takes two documents in stored order, then sorts only those two
db.orders.aggregate([{ $limit: 2 }, { $sort: { total: -1 } }])
```

```js
// FIX: sort first, then keep the top two
db.orders.aggregate([{ $sort: { total: -1 } }, { $limit: 2 }])
```

Bản sai ở đây trả đơn 2 (120000) và đơn 1 (95000): hai đơn đầu theo thứ tự lưu của bộ chạy trong trình duyệt, không phải hai đơn lớn nhất. Trên máy chủ MongoDB thật, thứ tự khi chưa sắp không được bảo đảm, nên bản sai có thể ra hai đơn khác; bản sửa luôn ra đơn 3 và đơn 5.

## Thực hành

Bấm qua sơ đồ: số tài liệu và các trường thay đổi thế nào sau mỗi stage. Rồi trả lời hai câu hỏi. Câu đầu hỏi một pipeline đặt `$match` sau `$group`: trước khi chọn, hãy viết ra các trường còn lại sau `$group`. Câu thứ hai hỏi vì sao `$match` nên đứng đầu.

## Tóm tắt

- `aggregate` cho tài liệu chảy qua một dãy stage theo thứ tự.
- Mỗi stage chỉ thấy những gì stage trước trả ra.
- Đặt `$match` sớm: ít việc hơn cho các stage sau, và có thể dùng index.
- `$sort` phải đứng trước `$limit` để lấy top N đúng.
- `aggregate` chỉ đọc, trừ khi có `$out` hoặc `$merge`.

# EN

## Opening

The manager needs revenue per store, counting only paid orders, highest store first. With `find` you can filter and sort, but not add up. How does MongoDB filter, group and sort in one command?

## Key idea

`db.<collection>.aggregate([stage, stage, ...])` streams documents through a list of stages. Each stage takes the documents coming out of the stage before and passes new ones on, like a conveyor belt.

Common stages:

- `$match`: filter, same syntax as a `find` filter;
- `$project`, `$set` (alias `$addFields`), `$unset`: reshape documents, compute new fields;
- `$group`: merge many documents into one per `_id` key, with accumulators such as `$sum`, `$avg`;
- `$sort`, `$limit`, `$skip`, `$count`;
- `$unwind`: split an array into several documents;
- `$lookup`: join documents from another collection.

Stage order is part of the question: after `$group` the old fields are gone. Put `$match` early so later stages do less work, and so a leading `$match` can read through an index.

`aggregate` only reads. The result is a new list of documents and the collection is unchanged (unless you use `$out`/`$merge`, a later L2 lesson).

Many people think a pipeline is like an SQL query whose clauses the engine reorders for you. In fact the order you write is the order the data flows through. MongoDB's optimizer does move or merge some stages, but only when the result is certain not to change; it does not repair a pipeline written in the wrong order. How to read a pipeline: walk it stage by stage and ask each time "how many documents leave this stage, and which fields does each one have". If a later stage refers to a field an earlier stage dropped, the result is empty or wrong, usually with no error.

You can now: read a pipeline and tell the shape of the documents after each stage.

## Syntax

```text
db.<collection>.aggregate([
  { <stage>: { ... } },
  { <stage>: { ... } }
])
```

- An array; each element is a document with exactly one stage name.
- Stages run in array order.

## Example

Revenue per store for the paid orders, highest first:

```js
db.orders.aggregate([
  { $match: { status: "paid" } },
  { $group: { _id: "$store", revenue: { $sum: "$total" } } },
  { $sort: { revenue: -1 } }
])
```

The result has two documents: `S2` with revenue 235000, then `S1` with 95000. Each holds only `_id` (the store code) and `revenue`; fields such as `status` and `total` of each order are gone after `$group`.

The two largest orders, with `total` only:

```js
db.orders.aggregate([
  { $sort: { total: -1 } },
  { $limit: 2 },
  { $project: { total: 1 } }
])
```

Result: order 3 (450000) then order 5 (210000), each with only `_id` and `total`. `$sort` comes before `$limit`, so these really are the two largest orders.

## Common mistakes

Filtering after grouping, on a field that no longer exists:

```js
// WRONG: after $group there is no status field, so nothing is left
db.orders.aggregate([{ $group: { _id: "$store", n: { $sum: 1 } } }, { $match: { status: "paid" } }])
```

```js
// FIX: filter first, then group
db.orders.aggregate([{ $match: { status: "paid" } }, { $group: { _id: "$store", n: { $sum: 1 } } }])
```

The wrong version returns an empty list with no error; the fix counts 1 paid order at `S1` and 2 at `S2`.

Cutting before sorting:

```js
// WRONG: takes two documents in stored order, then sorts only those two
db.orders.aggregate([{ $limit: 2 }, { $sort: { total: -1 } }])
```

```js
// FIX: sort first, then keep the top two
db.orders.aggregate([{ $sort: { total: -1 } }, { $limit: 2 }])
```

The wrong version here returns order 2 (120000) and order 1 (95000): the first two in the in-browser runtime's stored order, not the two largest. On a real MongoDB server the order without a sort is not guaranteed, so the wrong version may return two other orders; the fix always returns orders 3 and 5.

## Practice

Step through the diagram: how the number of documents and their fields change after each stage. Then answer the two questions. The first asks about a pipeline with `$match` after `$group`: before you choose, write down the fields left after `$group`. The second asks why `$match` belongs at the start.

## Recap

- `aggregate` streams documents through a list of stages, in order.
- Each stage only sees what the stage before returned.
- Put `$match` early: less work for later stages, and it can use an index.
- `$sort` must come before `$limit` to get the right top N.
- `aggregate` only reads, unless it has `$out` or `$merge`.
