---
id: e-mg-l2-17
engine: mongodb
level: L2
module: modeling
title: $lookup rồi $unwind làm mất khách không có đơn
title_en: $lookup then $unwind drops customers with no orders
kind: predict
runtime: browser
minutes: 12
figures: [{ name: mg-lookup-unwind, at: idea }]
objectives:
  - vi: Đoán đúng `$unwind` làm gì với tài liệu có mảng rỗng sau `$lookup`.
    en: Predict what `$unwind` does to a document whose array is empty after `$lookup`.
  - vi: Giữ đủ mọi khách bằng `preserveNullAndEmptyArrays`, hoặc bằng cách không `$unwind`.
    en: Keep every customer with `preserveNullAndEmptyArrays`, or by leaving out `$unwind`.
requires: [e-mg-l2-08, e-mg-l2-11]
sources:
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/unwind/
predict:
  sql: "db.customers.aggregate([{ $lookup: { from: 'orders', localField: '_id', foreignField: 'customer', as: 'orders' } }, { $unwind: '$orders' }])"
  q:
    vi: 'Có 4 khách. `''c1''` có 2 đơn, `''c2''` và `''c3''` mỗi khách 1 đơn, `''c4''` chưa có đơn nào. Pipeline này trả mấy tài liệu?'
    en: 'There are 4 customers. `''c1''` has 2 orders, `''c2''` and `''c3''` have 1 each, `''c4''` has none. How many documents does this pipeline return?'
  options:
    - vi: 4, mỗi khách một tài liệu
      en: 4, one document per customer
    - vi: '4, `''c1''` tách thành 2 và `''c4''` biến mất'
      en: '4, `''c1''` split into 2 and `''c4''` gone'
    - vi: '5, `''c4''` có `orders` bằng `null`'
      en: '5, `''c4''` with `orders` equal to `null`'
    - vi: '5, `''c4''` có `orders` là mảng rỗng'
      en: '5, `''c4''` with `orders` an empty array'
  answer: 1
  trap: 3
  why:
    vi: '`$lookup` giữ mọi khách như LEFT JOIN, nhưng chỉ cho tới khi gặp `$unwind`. Riêng `$lookup` là left outer join: `''c4''` vẫn còn, với `orders: []` (mảng rỗng, không phải `null`). Nhưng `$unwind` tạo một tài liệu cho mỗi phần tử của mảng, và mảng rỗng thì không tạo tài liệu nào, nên `''c4''` mất thay vì ra tài liệu thứ 5. Kết quả là `''c1''` hai lần, `''c2''`, `''c3''`: 4 tài liệu, nhưng không phải "mỗi khách một": `''c1''` tách thành 2. Cặp `$lookup` + `$unwind` vì vậy chạy như INNER JOIN của SQL.'
    en: '`$lookup` keeps every customer like a LEFT JOIN, but only until `$unwind`. `$lookup` alone is a left outer join: `''c4''` is still there, with `orders: []` (an empty array, not `null`). But `$unwind` makes one document per array element, and an empty array makes none, so `''c4''` is gone instead of giving a 5th document. The result is `''c1''` twice, `''c2''`, `''c3''`: 4 documents, but not "one per customer": `''c1''` is split into 2. So `$lookup` + `$unwind` behaves like an SQL INNER JOIN.'
quiz:
  - q:
      vi: 'Trang hồ sơ khách chạy `$lookup` từ `customers` sang `orders` (1 triệu tài liệu) khoảng 1000 lần mỗi giây. `orders` chưa có index nào trên `customer`. Nên sửa gì trước?'
      en: 'The customer profile page runs a `$lookup` from `customers` to `orders` (1 million documents) about 1000 times per second. `orders` has no index on `customer`. What should you fix first?'
    options:
      - vi: Không cần gì, `$lookup` nhanh như JOIN của SQL
        en: Nothing, `$lookup` is as fast as an SQL JOIN
      - vi: Tạo index trên `orders.customer` (trường `foreignField`), hoặc nhúng các đơn gần đây vào tài liệu khách
        en: Create an index on `orders.customer` (the `foreignField`), or embed recent orders in the customer document
      - vi: Thêm `$unwind` để kết quả nhỏ hơn
        en: Add `$unwind` to make the result smaller
    answer: 1
    why:
      vi: 'Không có index trên `customer`, mỗi khách phải quét cả 1 triệu đơn (COLLSCAN) để tìm cặp, và việc đó lặp 1000 lần mỗi giây. Docs `$lookup` viết rằng stage này sẽ "perform better when the foreign collection contains an index on the foreignField", và "Unindexed or correlated-subquery $lookup operations on large collections can slow down query performance"; docs cũng gợi ý nhúng dữ liệu hay đọc cùng nhau. `$unwind` đứng sau `$lookup` nên không bớt được lần quét nào, chỉ làm thêm tài liệu. Câu này theo docs chính thức, chưa đo trong trình duyệt: mingo không có index.'
      en: 'With no index on `customer`, each customer scans all 1 million orders (COLLSCAN) to find its matches, 1000 times per second. The `$lookup` docs say it will "perform better when the foreign collection contains an index on the foreignField", and "Unindexed or correlated-subquery $lookup operations on large collections can slow down query performance"; the docs also suggest embedding data that is read together. `$unwind` comes after `$lookup`, so it saves no scan and only adds documents. This answer follows the official docs and is not measured in the browser: mingo has no indexes.'
lab:
  setup: |
    {"collections": {
      "customers": [
        {"_id": "c1", "name": "An", "city": "Da Nang"},
        {"_id": "c2", "name": "Binh", "city": "Hue"},
        {"_id": "c3", "name": "Chi", "city": "Da Nang"},
        {"_id": "c4", "name": "Dung", "city": "Hoi An"}
      ],
      "orders": [
        {"_id": 1, "customer": "c1", "total": 95000},
        {"_id": 2, "customer": "c1", "total": 450000},
        {"_id": 3, "customer": "c2", "total": 120000},
        {"_id": 4, "customer": "c3", "total": 210000}
      ]
    }}
  steps:
    - task:
        vi: 'Chạy pipeline ở câu đoán, rồi sửa để `''c4''` vẫn có một tài liệu: mỗi cặp khách và đơn một tài liệu, khách chưa có đơn vẫn giữ lại. Trả `name` và `order` là `_id` của đơn.'
        en: 'Run the pipeline from the prediction, then fix it so `''c4''` still gets a document: one document per customer and order pair, keeping customers with no order. Return `name` and `order`, the order''s `_id`.'
      solution: "db.customers.aggregate([{ $lookup: { from: 'orders', localField: '_id', foreignField: 'customer', as: 'orders' } }, { $unwind: { path: '$orders', preserveNullAndEmptyArrays: true } }, { $project: { name: 1, order: '$orders._id' } }])"
      check: doc
      hint:
        vi: 'Dạng dài của `$unwind`: `{ path: ''$orders'', preserveNullAndEmptyArrays: true }`. Với `''c4''`, `''$orders._id''` không có giá trị nên tài liệu không có trường `order`.'
        en: 'The long form of `$unwind`: `{ path: ''$orders'', preserveNullAndEmptyArrays: true }`. For `''c4''`, `''$orders._id''` has no value, so that document has no `order` field.'
    - task:
        vi: 'Báo cáo số đơn của từng khách, kể cả khách 0 đơn: `name` và `n` là số đơn. Không cần `$unwind`.'
        en: 'Report the number of orders per customer, including customers with 0: `name` and `n`, the number of orders. No `$unwind` needed.'
      solution: "db.customers.aggregate([{ $lookup: { from: 'orders', localField: '_id', foreignField: 'customer', as: 'orders' } }, { $project: { name: 1, n: { $size: '$orders' } } }])"
      check: doc
      hint:
        vi: '`$lookup` đã cho mỗi khách một mảng `orders`, kể cả mảng rỗng. `{ $size: ''$orders'' }` đếm nó.'
        en: '`$lookup` already gives each customer an `orders` array, even an empty one. `{ $size: ''$orders'' }` counts it.'
---
## Mở bài

Bạn ghép khách với đơn rồi `$unwind` để có "mỗi đơn một tài liệu". Một khách biến mất khỏi báo cáo. Vì sao?

## Ý chính

Hai stage, hai cách làm:

- `$lookup` là left outer join: mọi tài liệu bên trái đều được giữ, và trường `as` luôn là một mảng. Không có cặp thì mảng rỗng.
- `$unwind` tạo một tài liệu cho mỗi phần tử. Mảng rỗng, `null` hay thiếu trường thì không tạo tài liệu nào.

Nhiều người nghĩ `$lookup` giống hệt JOIN của SQL, nên viết `$lookup` + `$unwind` mà không để ý. Kết quả là một INNER JOIN: khách không có đơn mất khỏi báo cáo, không có lỗi.

Hai cách giữ đủ khách:

- `{ $unwind: { path: '$orders', preserveNullAndEmptyArrays: true } }`, tương đương LEFT JOIN, giữ cả tài liệu không có đơn;
- không `$unwind`, đọc thẳng mảng (`$size`, `$sum` trên mảng).

`$lookup` còn có giá: mỗi tài liệu bên trái phải tìm trong collection kia. Trên server thật, hãy có index trên trường `foreignField`. Nếu hai thứ luôn đọc cùng nhau, cân nhắc nhúng (bài "Nhúng hay tham chiếu").

Hình từng bước ở cuối mục này chạy `$lookup`, rồi `$unwind`, rồi `$unwind` với `preserveNullAndEmptyArrays` trên bốn khách của lab: Dung mất rồi quay lại.

## Ví dụ

```text
$lookup                          -> 4 documents, c4 has orders: []   (LEFT JOIN, grouped into an array)
$lookup + $unwind                -> 4 documents, c4 gone             (INNER JOIN)
$lookup + $unwind, keep empty    -> 5 documents                      (LEFT JOIN)
```

Riêng `$lookup`: `'c4'` còn đó với mảng rỗng:

```js
db.customers.aggregate([{ $lookup: { from: 'orders', localField: '_id', foreignField: 'customer', as: 'orders' } }])
```

## Lỗi hay gặp

`$unwind` dạng ngắn sau `$lookup` khi cần đủ mọi khách:

```js
// WRONG: c4 has an empty array, so $unwind drops it
db.customers.aggregate([{ $lookup: { from: 'orders', localField: '_id', foreignField: 'customer', as: 'orders' } }, { $unwind: '$orders' }])
```

```js
// FIX: keep documents whose array is empty
db.customers.aggregate([{ $lookup: { from: 'orders', localField: '_id', foreignField: 'customer', as: 'orders' } }, { $unwind: { path: '$orders', preserveNullAndEmptyArrays: true } }])
```

Bản sai trả 4 tài liệu, không có Dung; bản sửa trả 5, Dung có mặt nhưng không có trường `orders`.

Đếm đơn bằng `$unwind` rồi `$group`:

```js
// WRONG: customers with 0 orders never reach $group
db.customers.aggregate([{ $lookup: { from: 'orders', localField: '_id', foreignField: 'customer', as: 'orders' } }, { $unwind: '$orders' }, { $group: { _id: '$name', n: { $sum: 1 } } }])
```

```js
// FIX: count the array, no $unwind
db.customers.aggregate([{ $lookup: { from: 'orders', localField: '_id', foreignField: 'customer', as: 'orders' } }, { $project: { _id: '$name', n: { $size: '$orders' } } }])
```

Bản sai đếm An 2, Binh 1, Chi 1 và không có tài liệu nào cho Dung. Bản sửa đếm thẳng mảng `orders`, mảng rỗng cho `n` bằng 0.

## Thực hành

Hai bước trên `customers` và `orders`. Khách `'c4'` chưa có đơn nào.

## Tóm tắt

- `$lookup` giữ mọi tài liệu bên trái; không có cặp thì mảng rỗng.
- `$unwind` bỏ tài liệu có mảng rỗng, nên `$lookup` + `$unwind` là INNER JOIN.
- `preserveNullAndEmptyArrays: true` giữ lại chúng, như LEFT JOIN.
- Đếm hay cộng trên mảng thì không cần `$unwind`.

# EN

## Opening

You join customers to orders and `$unwind` to get "one document per order". One customer disappears from the report. Why?

## Key idea

Two stages, two behaviours:

- `$lookup` is a left outer join: every document on the left is kept, and the `as` field is always an array. No match means an empty array.
- `$unwind` makes one document per element. An empty array, `null` or a missing field makes no document at all.

Many people think `$lookup` is exactly an SQL JOIN, so they write `$lookup` + `$unwind` without a second thought. The result is an INNER JOIN: customers with no orders drop out of the report, with no error.

Two ways to keep every customer:

- `{ $unwind: { path: '$orders', preserveNullAndEmptyArrays: true } }`, the LEFT JOIN equivalent that keeps documents with no order;
- no `$unwind`, read the array directly (`$size`, `$sum` over the array).

`$lookup` also has a cost: every document on the left searches the other collection. On a real server, have an index on the `foreignField`. If the two are always read together, consider embedding (the "Embed or reference" lesson).

The step-through figure at the end of this section runs `$lookup`, then `$unwind`, then `$unwind` with `preserveNullAndEmptyArrays` on the lab's four customers: Dung disappears, then comes back.

## Example

```text
$lookup                          -> 4 documents, c4 has orders: []   (LEFT JOIN, grouped into an array)
$lookup + $unwind                -> 4 documents, c4 gone             (INNER JOIN)
$lookup + $unwind, keep empty    -> 5 documents                      (LEFT JOIN)
```

`$lookup` alone: `'c4'` is still there with an empty array:

```js
db.customers.aggregate([{ $lookup: { from: 'orders', localField: '_id', foreignField: 'customer', as: 'orders' } }])
```

## Common mistakes

The short form of `$unwind` after `$lookup` when you need every customer:

```js
// WRONG: c4 has an empty array, so $unwind drops it
db.customers.aggregate([{ $lookup: { from: 'orders', localField: '_id', foreignField: 'customer', as: 'orders' } }, { $unwind: '$orders' }])
```

```js
// FIX: keep documents whose array is empty
db.customers.aggregate([{ $lookup: { from: 'orders', localField: '_id', foreignField: 'customer', as: 'orders' } }, { $unwind: { path: '$orders', preserveNullAndEmptyArrays: true } }])
```

The wrong version returns 4 documents without Dung; the fix returns 5, with Dung present but no `orders` field.

Counting orders with `$unwind` and then `$group`:

```js
// WRONG: customers with 0 orders never reach $group
db.customers.aggregate([{ $lookup: { from: 'orders', localField: '_id', foreignField: 'customer', as: 'orders' } }, { $unwind: '$orders' }, { $group: { _id: '$name', n: { $sum: 1 } } }])
```

```js
// FIX: count the array, no $unwind
db.customers.aggregate([{ $lookup: { from: 'orders', localField: '_id', foreignField: 'customer', as: 'orders' } }, { $project: { _id: '$name', n: { $size: '$orders' } } }])
```

The wrong version counts An 2, Binh 1, Chi 1 and has no entry for Dung. The fix counts the `orders` array directly, and an empty array gives `n` 0.

## Practice

Two steps on `customers` and `orders`. Customer `'c4'` has no order yet.

## Recap

- `$lookup` keeps every document on the left; no match means an empty array.
- `$unwind` drops documents with an empty array, so `$lookup` + `$unwind` is an INNER JOIN.
- `preserveNullAndEmptyArrays: true` keeps them, like a LEFT JOIN.
- Counting or summing over the array needs no `$unwind`.
