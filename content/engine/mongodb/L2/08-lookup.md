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
    why:
      vi: 'Lựa chọn đầu nghe hợp lý nếu bạn nghĩ `$lookup` giống hệt JOIN mặc định (INNER) của SQL. Thật ra `$lookup` là left outer join: tài liệu bên trái luôn được giữ, và trường `as` luôn là một mảng, không có cặp thì mảng rỗng chứ không phải `null`. Bước 3 dùng đúng điều này để tìm khách chưa đặt đơn.'
      en: 'The first option sounds right if you think `$lookup` works exactly like SQL''s default (INNER) JOIN. In fact `$lookup` is a left outer join: the left document is always kept, and the `as` field is always an array, empty rather than `null` when nothing matches. Step 3 relies on exactly this to find customers with no order.'
---
## Ý chính

`$lookup` ghép mỗi tài liệu với các tài liệu khớp ở collection khác, như LEFT OUTER JOIN:

```js
{ $lookup: { from: "customers", localField: "customer", foreignField: "_id", as: "buyer" } }
```

- Kết quả luôn là một mảng trong trường `as`, kể cả khi chỉ có một cặp. Không có cặp thì mảng rỗng, tài liệu vẫn giữ lại.
- Thường theo sau là `$unwind` để lấy một tài liệu, hoặc `$size` để đếm.
- Collection ở `from` phải cùng database.

`$lookup` tốn hơn đọc một tài liệu nhúng. Nếu màn hình nào cũng cần tên khách cùng đơn, cân nhắc chép sẵn vài trường ít đổi (như `name`) vào đơn: đó là câu hỏi nhúng hay tham chiếu của mô-đun Mô hình hóa.

Làm được: ghép hai collection để trả lời câu hỏi cần dữ liệu từ cả hai, và tìm tài liệu "mồ côi".

## Ví dụ

```js
db.customers.aggregate([
  { $lookup: { from: "orders", localField: "_id", foreignField: "customer", as: "orders" } },
  { $project: { name: 1, orderCount: { $size: "$orders" } } }
])
```

## Thực hành

Ba bước trên `orders` và `customers`. Khách `"c6"` chưa có đơn.

# EN

## Key idea

`$lookup` joins each document with the matching documents of another collection, like a LEFT OUTER JOIN:

```js
{ $lookup: { from: "customers", localField: "customer", foreignField: "_id", as: "buyer" } }
```

- The result is always an array in the `as` field, even with a single match. With no match the array is empty and the document is kept.
- It is usually followed by `$unwind` to get one document, or `$size` to count.
- The `from` collection must be in the same database.

`$lookup` costs more than reading an embedded document. If every screen needs the customer's name with the order, consider copying a few rarely changing fields (such as `name`) into the order: that is the embed-or-reference question of the Modelling module.

You can now: join two collections to answer a question that needs data from both, and find "orphan" documents.

## Example

```js
db.customers.aggregate([
  { $lookup: { from: "orders", localField: "_id", foreignField: "customer", as: "orders" } },
  { $project: { name: 1, orderCount: { $size: "$orders" } } }
])
```

## Practice

Three steps on `orders` and `customers`. Customer `"c6"` has no order yet.
