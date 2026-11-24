---
id: e-mg-l2-08
engine: mongodb
level: L2
module: aggregation
title: Ghép collection với $lookup
title_en: Joining collections with $lookup
kind: lab
runtime: browser
minutes: 14
objectives:
  - vi: Ghép tài liệu từ collection khác bằng `$lookup` (localField / foreignField).
    en: Join documents from another collection with `$lookup` (localField / foreignField).
  - vi: Biến mảng kết quả của `$lookup` thành trường dùng được, và tìm tài liệu không có cặp.
    en: Turn the array that `$lookup` returns into usable fields, and find documents with no match.
requires: [e-mg-l2-07]
sources:
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
lab:
  setup: |
    {"collections": {
      "customers": [
        {"_id": "c1", "name": "An", "city": "Da Nang"},
        {"_id": "c2", "name": "Binh", "city": "Hue"},
        {"_id": "c3", "name": "Chi", "city": "Da Nang"},
        {"_id": "c4", "name": "Dung", "city": "Hoi An"},
        {"_id": "c5", "name": "Em", "city": "Hue"},
        {"_id": "c6", "name": "Giang", "city": "Hoi An"}
      ],
      "orders": [
        {"_id": 1, "customer": "c1", "store": "S1", "status": "paid", "total": 95000},
        {"_id": 2, "customer": "c2", "store": "S2", "status": "shipped", "total": 120000},
        {"_id": 3, "customer": "c1", "store": "S1", "status": "shipped", "total": 450000},
        {"_id": 4, "customer": "c3", "store": "S1", "status": "cancelled", "total": 150000},
        {"_id": 5, "customer": "c4", "store": "S2", "status": "paid", "total": 210000},
        {"_id": 6, "customer": "c2", "store": "S2", "status": "paid", "total": 25000},
        {"_id": 7, "customer": "c5", "store": "S1", "status": "shipped", "total": 285000},
        {"_id": 8, "customer": "c1", "store": "S2", "status": "paid", "total": 60000}
      ]
    }}
  steps:
    - task:
        vi: 'Với các đơn của cửa hàng `"S2"`, trả `_id`, `total` và `name` là tên khách đặt đơn.'
        en: 'For the orders of store `"S2"`, return `_id`, `total` and `name`, the name of the customer who placed it.'
      solution: 'db.orders.aggregate([{ $match: { store: "S2" } }, { $lookup: { from: "customers", localField: "customer", foreignField: "_id", as: "buyer" } }, { $unwind: "$buyer" }, { $project: { total: 1, name: "$buyer.name" } }])'
      check: doc
      hint:
        vi: '`$lookup` luôn trả một mảng (ở đây trong `buyer`). `$unwind: "$buyer"` biến nó thành một tài liệu để lấy `"$buyer.name"`.'
        en: '`$lookup` always returns an array (here in `buyer`). `$unwind: "$buyer"` turns it into one document so you can read `"$buyer.name"`.'
    - task:
        vi: 'Doanh thu theo thành phố của khách, bỏ đơn `"cancelled"`: `_id` là thành phố, `revenue` là tổng `total`, xếp theo `_id` từ A tới Z.'
        en: 'Revenue per customer city, leaving out `"cancelled"` orders: `_id` is the city, `revenue` the sum of `total`, sorted by `_id` from A to Z.'
      solution: 'db.orders.aggregate([{ $match: { status: { $ne: "cancelled" } } }, { $lookup: { from: "customers", localField: "customer", foreignField: "_id", as: "buyer" } }, { $unwind: "$buyer" }, { $group: { _id: "$buyer.city", revenue: { $sum: "$total" } } }, { $sort: { _id: 1 } }])'
      check: doc
      ordered: true
      hint:
        vi: "Ghép như bước 1, rồi `$group` theo `\"$buyer.city\"`."
        en: "Join as in step 1, then `$group` by `\"$buyer.city\"`."
    - task:
        vi: Tìm các khách chưa đặt đơn nào. Trả `_id` và `name`.
        en: Find the customers who have never placed an order. Return `_id` and `name`.
      solution: 'db.customers.aggregate([{ $lookup: { from: "orders", localField: "_id", foreignField: "customer", as: "orders" } }, { $match: { orders: { $size: 0 } } }, { $project: { name: 1 } }])'
      check: doc
      hint:
        vi: "Bắt đầu từ `customers`, ghép `orders`; khách không có đơn nhận mảng rỗng."
        en: "Start from `customers` and join `orders`; a customer with no order gets an empty array."
quiz:
  - q:
      vi: 'Khách `"c6"` chưa có đơn. Chạy `$lookup` từ `customers` sang `orders` với `as: "orders"`, không có stage nào sau đó. `"c6"` ra sao trong kết quả?'
      en: 'Customer `"c6"` has no order. You run a `$lookup` from `customers` to `orders` with `as: "orders"` and no stage after it. What happens to `"c6"` in the result?'
    options:
      - vi: Bị loại khỏi kết quả, vì không có cặp nào để ghép
        en: It is dropped from the result, because there is nothing to join it with
      - vi: Vẫn có mặt, với `orders` là mảng rỗng
        en: It is still there, with `orders` an empty array
      - vi: Vẫn có mặt, với `orders` bằng `null`
        en: It is still there, with `orders` equal to `null`
    answer: 1
    trap: 0
    why:
      vi: 'Lựa chọn đầu nghe hợp lý nếu bạn nghĩ `$lookup` giống hệt JOIN mặc định (INNER) của SQL. Thật ra `$lookup` là left outer join: tài liệu bên trái luôn được giữ, và trường `as` luôn là một mảng, không có cặp thì mảng rỗng chứ không phải `null`. Bước 3 dùng đúng điều này để tìm khách chưa đặt đơn.'
      en: 'The first option sounds right if you think `$lookup` works exactly like SQL''s default (INNER) JOIN. In fact `$lookup` is a left outer join: the left document is always kept, and the `as` field is always an array, empty rather than `null` when nothing matches. Step 3 relies on exactly this to find customers with no order.'
  - q:
      vi: 'Mỗi đơn có đúng một khách. Sau `$lookup` với `as: "buyer"`, trường `buyer` là gì?'
      en: 'Each order has exactly one customer. After a `$lookup` with `as: "buyer"`, what is the field `buyer`?'
    options:
      - vi: Một tài liệu khách, vì chỉ có một cặp
        en: One customer document, because there is only one match
      - vi: Một mảng có một tài liệu khách
        en: An array holding one customer document
      - vi: Tên khách
        en: The customer's name
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý vì quan hệ là một-một, nhưng `$lookup` luôn trả một mảng trong trường `as`, dù có một cặp hay không có cặp nào. Muốn một tài liệu thì thêm `$unwind: "$buyer"`.'
      en: 'It sounds right because the relationship is one-to-one, but `$lookup` always returns an array in the `as` field, whether it finds one match or none. To get one document, add `$unwind: "$buyer"`.'
---
## Mở bài

Màn hình đơn của cửa hàng `"S2"` cần tên khách, nhưng đơn chỉ lưu mã khách. Tên nằm ở collection `customers`. Làm sao ghép hai collection trong một lệnh?

## Ý chính

`$lookup` ghép mỗi tài liệu với các tài liệu khớp ở collection khác, như LEFT OUTER JOIN:

- Kết quả luôn là một mảng trong trường `as`, kể cả khi chỉ có một cặp. Không có cặp thì mảng rỗng, tài liệu vẫn giữ lại.
- Thường theo sau là `$unwind` để lấy một tài liệu, hoặc `$size` để đếm.
- Collection ở `from` phải cùng database.

`$lookup` tốn hơn đọc một tài liệu nhúng. Nếu màn hình nào cũng cần tên khách cùng đơn, cân nhắc chép sẵn vài trường ít đổi (như `name`) vào đơn: đó là câu hỏi nhúng hay tham chiếu của mô-đun Mô hình hóa.

Thứ tự stage quan trọng. Đặt `$match` trước `$lookup` để chỉ ghép những tài liệu bạn thật sự cần: ghép 4 đơn của một cửa hàng rẻ hơn ghép mọi đơn rồi mới lọc. Sau `$lookup`, mỗi tài liệu mang theo cả mảng tài liệu khớp, nên nó to lên; chỉ giữ trường cần bằng `$project` càng sớm càng tốt.

Làm được: ghép hai collection để trả lời câu hỏi cần dữ liệu từ cả hai, và tìm tài liệu "mồ côi".

## Cú pháp

```text
{ $lookup: { from: "customers", localField: "customer", foreignField: "_id", as: "buyer" } }
```

- `localField`: trường của tài liệu đang chảy trong pipeline.
- `foreignField`: trường của collection ở `from`.
- `as`: tên trường mảng nhận các tài liệu khớp.

## Ví dụ

Số đơn của mỗi khách, kể cả khách chưa có đơn:

```js
db.customers.aggregate([
  { $lookup: { from: "orders", localField: "_id", foreignField: "customer", as: "orders" } },
  { $project: { name: 1, orderCount: { $size: "$orders" } } }
])
```

Sáu khách trở về, mỗi khách có `name` và `orderCount`: `An` có 3 đơn, `Binh` 2, `Giang` 0. `Giang` vẫn có mặt với mảng rỗng, đúng tính chất left outer join.

Đơn của cửa hàng `"S2"` kèm thành phố của khách:

```js
db.orders.aggregate([
  { $match: { store: "S2" } },
  { $lookup: { from: "customers", localField: "customer", foreignField: "_id", as: "buyer" } },
  { $unwind: "$buyer" },
  { $project: { total: 1, city: "$buyer.city" } }
])
```

Bốn đơn của `"S2"` trở về, mỗi đơn có `total` và một `city` phẳng, ví dụ đơn 2 là `Hue`, đơn 5 là `Hoi An`. `$match` đứng đầu nên chỉ bốn đơn này được ghép.

## Lỗi hay gặp

Đọc trường của mảng `as` mà không `$unwind`:

```js
// WRONG: name comes out as an array, ["Binh"]
db.orders.aggregate([{ $match: { _id: 2 } }, { $lookup: { from: "customers", localField: "customer", foreignField: "_id", as: "buyer" } }, { $project: { name: "$buyer.name" } }])
```

```js
// FIX: $unwind turns the one-element array into a document
db.orders.aggregate([{ $match: { _id: 2 } }, { $lookup: { from: "customers", localField: "customer", foreignField: "_id", as: "buyer" } }, { $unwind: "$buyer" }, { $project: { name: "$buyer.name" } }])
```

Bản sai trả `name: ["Binh"]`, một mảng; ứng dụng chờ chuỗi sẽ hiện sai hoặc lỗi. Bản sửa trả `name: "Binh"`. Lưu ý: `$unwind` bỏ tài liệu có mảng rỗng, nên khi cần giữ đơn không có khách, dùng `$arrayElemAt` hoặc tùy chọn `preserveNullAndEmptyArrays`.

Đảo `localField` và `foreignField`:

```js
// WRONG: compares the order _id with customers.customer, so buyer is always empty
db.orders.aggregate([{ $match: { _id: 2 } }, { $lookup: { from: "customers", localField: "_id", foreignField: "customer", as: "buyer" } }])
```

```js
// FIX: local is the order's field, foreign is the customer's field
db.orders.aggregate([{ $match: { _id: 2 } }, { $lookup: { from: "customers", localField: "customer", foreignField: "_id", as: "buyer" } }])
```

Bản sai vẫn chạy, không báo lỗi: đơn 2 trở về với `buyer: []`. Bản sửa cho `buyer` có đúng một khách, `c2` tên `Binh` ở `Hue`. Khi mảng `as` rỗng ở mọi tài liệu, nghi ngay hai trường bị đảo.

## Thực hành

Ba bước trên `orders` và `customers`. Khách `"c6"` chưa có đơn. Bước 1 ghép tên khách vào các đơn của `"S2"` rồi kéo phẳng bằng `$unwind`. Bước 2 ghép như vậy, bỏ đơn đã hủy, rồi `$group` theo thành phố của khách và sắp theo tên thành phố. Bước 3 đổi hướng: bắt đầu từ `customers` và giữ những khách có mảng đơn rỗng.

## Tóm tắt

- `$lookup` là left outer join: tài liệu bên trái luôn được giữ.
- Trường `as` luôn là mảng; không có cặp thì rỗng.
- `$unwind` biến mảng một phần tử thành tài liệu; `$size` đếm cặp.
- `localField` thuộc tài liệu đang chảy, `foreignField` thuộc collection `from`.

# EN

## Opening

The order screen of store `"S2"` needs the customer's name, but an order only stores the customer code. The name lives in the `customers` collection. How do you join two collections in one command?

## Key idea

`$lookup` joins each document with the matching documents of another collection, like a LEFT OUTER JOIN:

- The result is always an array in the `as` field, even with a single match. With no match the array is empty and the document is kept.
- It is usually followed by `$unwind` to get one document, or `$size` to count.
- The `from` collection must be in the same database.

`$lookup` costs more than reading an embedded document. If every screen needs the customer's name with the order, consider copying a few rarely changing fields (such as `name`) into the order: that is the embed-or-reference question of the Modelling module.

Stage order matters. Put `$match` before `$lookup` so you join only the documents you need: joining the 4 orders of one store is cheaper than joining every order and filtering afterwards. After `$lookup` each document carries the whole array of matches, so it grows; keep only the fields you need with `$project` as early as you can.

You can now: join two collections to answer a question that needs data from both, and find "orphan" documents.

## Syntax

```text
{ $lookup: { from: "customers", localField: "customer", foreignField: "_id", as: "buyer" } }
```

- `localField`: the field of the document flowing through the pipeline.
- `foreignField`: the field of the `from` collection.
- `as`: the name of the array field that receives the matches.

## Example

The number of orders per customer, including customers with none:

```js
db.customers.aggregate([
  { $lookup: { from: "orders", localField: "_id", foreignField: "customer", as: "orders" } },
  { $project: { name: 1, orderCount: { $size: "$orders" } } }
])
```

Six customers come back, each with `name` and `orderCount`: `An` has 3 orders, `Binh` 2, `Giang` 0. `Giang` is still there with an empty array, as a left outer join promises.

The orders of store `"S2"` with the customer's city:

```js
db.orders.aggregate([
  { $match: { store: "S2" } },
  { $lookup: { from: "customers", localField: "customer", foreignField: "_id", as: "buyer" } },
  { $unwind: "$buyer" },
  { $project: { total: 1, city: "$buyer.city" } }
])
```

The four orders of `"S2"` come back, each with `total` and a flat `city`, for example order 2 is `Hue`, order 5 is `Hoi An`. `$match` comes first, so only these four orders are joined.

## Common mistakes

Reading a field of the `as` array without `$unwind`:

```js
// WRONG: name comes out as an array, ["Binh"]
db.orders.aggregate([{ $match: { _id: 2 } }, { $lookup: { from: "customers", localField: "customer", foreignField: "_id", as: "buyer" } }, { $project: { name: "$buyer.name" } }])
```

```js
// FIX: $unwind turns the one-element array into a document
db.orders.aggregate([{ $match: { _id: 2 } }, { $lookup: { from: "customers", localField: "customer", foreignField: "_id", as: "buyer" } }, { $unwind: "$buyer" }, { $project: { name: "$buyer.name" } }])
```

The wrong version returns `name: ["Binh"]`, an array; an application expecting a string shows it wrongly or fails. The fix returns `name: "Binh"`. Note that `$unwind` drops documents whose array is empty, so when you must keep an order without a customer, use `$arrayElemAt` or the `preserveNullAndEmptyArrays` option.

Swapping `localField` and `foreignField`:

```js
// WRONG: compares the order _id with customers.customer, so buyer is always empty
db.orders.aggregate([{ $match: { _id: 2 } }, { $lookup: { from: "customers", localField: "_id", foreignField: "customer", as: "buyer" } }])
```

```js
// FIX: local is the order's field, foreign is the customer's field
db.orders.aggregate([{ $match: { _id: 2 } }, { $lookup: { from: "customers", localField: "customer", foreignField: "_id", as: "buyer" } }])
```

The wrong version still runs with no error: order 2 comes back with `buyer: []`. The fix gives `buyer` exactly one customer, `c2` named `Binh` in `Hue`. When the `as` array is empty on every document, suspect swapped fields first.

## Practice

Three steps on `orders` and `customers`. Customer `"c6"` has no order yet. Step 1 joins the customer name onto the orders of `"S2"` and flattens it with `$unwind`. Step 2 joins the same way, drops cancelled orders, then runs `$group` on the customer's city and sorts by city name. Step 3 turns around: it starts from `customers` and keeps those whose order array is empty.

## Recap

- `$lookup` is a left outer join: the left document is always kept.
- The `as` field is always an array, empty when nothing matches.
- `$unwind` turns a one-element array into a document; `$size` counts the matches.
- `localField` belongs to the flowing document, `foreignField` to the `from` collection.
