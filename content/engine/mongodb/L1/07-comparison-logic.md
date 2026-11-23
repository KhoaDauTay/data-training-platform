---
id: e-mg-l1-07
engine: mongodb
level: L1
module: query-ops
title: So sánh và kết hợp điều kiện
title_en: Comparison and logical operators
kind: lab
runtime: browser
minutes: 10
objectives:
  - vi: Lọc theo khoảng với `$gt`, `$gte`, `$lt`, `$lte` và theo danh sách với `$in`, `$nin`.
    en: Filter by range with `$gt`, `$gte`, `$lt`, `$lte` and by list with `$in`, `$nin`.
  - vi: Viết điều kiện "hoặc" bằng `$or` và biết khi nào AND là ngầm định.
    en: Write an "or" condition with `$or` and know when AND is implicit.
requires: [e-mg-l1-02]
sources:
  - https://www.mongodb.com/docs/manual/reference/mql/query-predicates/comparison/
  - https://www.mongodb.com/docs/manual/reference/mql/query-predicates/logical/
lab:
  setup: |
    {"collections": {"products": [
      {"_id": "p1", "name": "Green tea", "category": "drink", "price": 25000, "stock": 40, "tags": ["hot", "cold"]},
      {"_id": "p2", "name": "Coffee beans", "category": "drink", "price": 120000, "stock": 8, "tags": ["hot"]},
      {"_id": "p3", "name": "Rice cracker", "category": "snack", "price": 15000, "stock": 0, "tags": []},
      {"_id": "p4", "name": "Dried mango", "category": "snack", "price": 45000, "stock": 25, "tags": ["gift"]},
      {"_id": "p5", "name": "Tea set", "category": "gift", "price": 350000, "stock": 3, "tags": ["gift", "fragile"]},
      {"_id": "p6", "name": "Lotus tea", "category": "drink", "price": 60000, "stock": 12, "tags": ["hot", "gift"]}
    ]}}
  steps:
    - task:
        vi: Lấy `name` và `price` (không kèm `_id`) của các sản phẩm giá trên `50000`.
        en: Return `name` and `price` (no `_id`) of the products priced above `50000`.
      solution: 'db.products.find({ price: { $gt: 50000 } }, { name: 1, price: 1, _id: 0 })'
      check: doc
      hint:
        vi: "Toán tử nằm trong tài liệu con của trường: `{ price: { $gt: 50000 } }`."
        en: "The operator sits in a sub-document of the field: `{ price: { $gt: 50000 } }`."
    - task:
        vi: Lấy các sản phẩm có giá từ `20000` tới `60000`, tính cả hai đầu.
        en: Return the products priced from `20000` to `60000`, both ends included.
      solution: 'db.products.find({ price: { $gte: 20000, $lte: 60000 } })'
      check: doc
      hint:
        vi: Hai toán tử trên cùng một trường đặt chung trong một tài liệu con.
        en: Two operators on the same field go together in one sub-document.
    - task:
        vi: Lấy các sản phẩm thuộc nhóm `"snack"` hoặc `"gift"`.
        en: Return the products in category `"snack"` or `"gift"`.
      solution: 'db.products.find({ category: { $in: ["snack", "gift"] } })'
      check: doc
      hint:
        vi: Nhiều giá trị cho cùng một trường thì `$in` gọn hơn `$or`.
        en: For several values of one field, `$in` is shorter than `$or`.
    - task:
        vi: Lấy các sản phẩm sắp hết (tồn dưới 10) hoặc đắt (giá từ `100000` trở lên).
        en: Return the products that are running low (stock under 10) or expensive (price `100000` or more).
      solution: 'db.products.find({ $or: [{ stock: { $lt: 10 } }, { price: { $gte: 100000 } }] })'
      check: doc
      hint:
        vi: "`$or` nhận một mảng điều kiện trên các trường khác nhau."
        en: "`$or` takes an array of conditions on different fields."
quiz:
  - q:
      vi: 'Bạn muốn giá từ trên 20000 tới dưới 100000 và viết `db.products.find({ price: { $gt: 20000 }, price: { $lt: 100000 } })`. Kết quả là gì?'
      en: 'You want prices above 20000 and below 100000 and write `db.products.find({ price: { $gt: 20000 }, price: { $lt: 100000 } })`. What is the result?'
    options:
      - vi: Đúng các sản phẩm giá trong khoảng đó
        en: Exactly the products priced in that range
      - vi: Mọi sản phẩm giá dưới 100000, kể cả giá 15000
        en: Every product priced below 100000, including the one at 15000
      - vi: Lệnh báo lỗi trùng trường
        en: The command fails with a duplicate field error
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý vì hai điều kiện trong một filter được nối bằng AND, nhưng đây là hai khóa `price` trong cùng một đối tượng: khóa sau đè khóa trước, chỉ còn `$lt`. Đặt hai toán tử chung một tài liệu con: `{ price: { $gt: 20000, $lt: 100000 } }`.'
      en: 'It sounds right because two conditions in one filter are joined with AND, but these are two `price` keys in the same object: the later key overwrites the earlier one, leaving only `$lt`. Put both operators in one sub-document: `{ price: { $gt: 20000, $lt: 100000 } }`.'
  - q:
      vi: 'Không sản phẩm nào có trường `color`. `db.products.find({ color: { $ne: "red" } })` trả về mấy sản phẩm?'
      en: 'No product has a `color` field. How many products does `db.products.find({ color: { $ne: "red" } })` return?'
    options:
      - vi: "0, vì không sản phẩm nào có màu"
        en: "0, because no product has a colour"
      - vi: "6, mọi sản phẩm"
        en: "6, every product"
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý vì trường không có thì không có gì để so, nhưng `$ne` và `$nin` khớp cả tài liệu thiếu trường. Muốn chỉ xét sản phẩm có màu thì thêm `$exists: true`.'
      en: 'It sounds right because a missing field has nothing to compare, but `$ne` and `$nin` also match documents that lack the field. To consider only products with a colour, add `$exists: true`.'
---
## Mở bài

Quản lý hỏi: đồ nào giá từ 20 tới 60 nghìn, và món nào sắp hết hoặc quá đắt? Điều kiện bằng không còn đủ. Viết khoảng giá và "hoặc" trong filter thế nào?

## Ý chính

Toán tử so sánh đặt trong tài liệu con của trường:

- `$eq`, `$ne`: bằng, khác;
- `$gt`, `$gte`, `$lt`, `$lte`: lớn hơn, lớn hơn hoặc bằng, nhỏ hơn, nhỏ hơn hoặc bằng;
- `$in`, `$nin`: nằm trong, không nằm trong một danh sách.

Các điều kiện trong cùng filter được nối AND. Muốn "hoặc" giữa các trường khác nhau thì dùng `$or: [ ... ]`. `$and` chỉ cần khi phải lặp lại cùng một toán tử, ví dụ hai `$or`.

Bẫy: `$ne` và `$nin` cũng khớp tài liệu không có trường đó. `{ color: { $ne: "red" } }` trả cả các sản phẩm không có `color`.

So sánh chỉ khớp giá trị cùng nhóm kiểu: số so với số, chuỗi so với chuỗi. `{ price: { $gt: "50000" } }` không khớp giá lưu bằng số.

Làm được: lọc theo khoảng, theo danh sách và kết hợp nhiều điều kiện bằng AND/OR.

## Cú pháp

```text
{ <field>: { $gte: <low>, $lte: <high> } }
{ <field>: { $in: [ <value>, <value> ] } }
{ $or: [ { <condition> }, { <condition> } ] }
```

- Nhiều toán tử trên cùng một trường: chung một tài liệu con.
- `$in` cho nhiều giá trị của một trường; `$or` cho điều kiện trên các trường khác nhau.

## Ví dụ

Đồ uống còn dưới 15 đơn vị:

```js
db.products.find({ category: "drink", stock: { $lt: 15 } })
```

Hàng quà tặng, theo nhóm hoặc theo nhãn:

```js
db.products.find({ $or: [{ category: "gift" }, { tags: "gift" }] })
```

Mọi sản phẩm không thuộc nhóm `"drink"` hay `"gift"`:

```js
db.products.find({ category: { $nin: ["drink", "gift"] } })
```

## Lỗi hay gặp

Viết hai lần cùng một trường trong một filter:

```js
// WRONG: the second price key replaces the first, so only $lt is left
db.products.find({ price: { $gt: 20000 }, price: { $lt: 100000 } })
```

```js
// FIX: both operators in one sub-document
db.products.find({ price: { $gt: 20000, $lt: 100000 } })
```

So một số với chuỗi:

```js
// WRONG: a string bound never matches a number price
db.products.find({ price: { $gt: "50000" } })
```

```js
// FIX: compare numbers with a number
db.products.find({ price: { $gt: 50000 } })
```

## Thực hành

Bốn bước trên `products` (6 sản phẩm, giá từ 15.000 tới 350.000).

## Tóm tắt

- `$gt`, `$gte`, `$lt`, `$lte` lọc khoảng; `$in`, `$nin` lọc theo danh sách.
- Nhiều toán tử trên một trường đặt chung một tài liệu con.
- Các điều kiện của filter nối AND; `$or` cho "hoặc" giữa các trường.
- `$ne` và `$nin` khớp cả tài liệu thiếu trường.
- So sánh chỉ khớp giá trị cùng nhóm kiểu.

# EN

## Opening

The manager asks: which items cost between 20 and 60 thousand, and which are running low or too expensive? Equality is no longer enough. How do you write a price range and an "or" in a filter?

## Key idea

Comparison operators sit in a sub-document of the field:

- `$eq`, `$ne`: equal, not equal;
- `$gt`, `$gte`, `$lt`, `$lte`: greater, greater or equal, less, less or equal;
- `$in`, `$nin`: in, not in a list.

Conditions in the same filter are joined with AND. For "or" across different fields use `$or: [ ... ]`. You only need `$and` when you must repeat the same operator, such as two `$or`.

Trap: `$ne` and `$nin` also match documents that lack the field. `{ color: { $ne: "red" } }` returns the products without `color` too.

A comparison only matches values of the same type group: numbers with numbers, strings with strings. `{ price: { $gt: "50000" } }` matches no price stored as a number.

You can now: filter by range and by list, and combine conditions with AND/OR.

## Syntax

```text
{ <field>: { $gte: <low>, $lte: <high> } }
{ <field>: { $in: [ <value>, <value> ] } }
{ $or: [ { <condition> }, { <condition> } ] }
```

- Several operators on one field: one shared sub-document.
- `$in` for several values of one field; `$or` for conditions on different fields.

## Example

Drinks with fewer than 15 units:

```js
db.products.find({ category: "drink", stock: { $lt: 15 } })
```

Gift items, by category or by tag:

```js
db.products.find({ $or: [{ category: "gift" }, { tags: "gift" }] })
```

Every product outside the `"drink"` and `"gift"` categories:

```js
db.products.find({ category: { $nin: ["drink", "gift"] } })
```

## Common mistakes

Writing the same field twice in one filter:

```js
// WRONG: the second price key replaces the first, so only $lt is left
db.products.find({ price: { $gt: 20000 }, price: { $lt: 100000 } })
```

```js
// FIX: both operators in one sub-document
db.products.find({ price: { $gt: 20000, $lt: 100000 } })
```

Comparing a number with a string:

```js
// WRONG: a string bound never matches a number price
db.products.find({ price: { $gt: "50000" } })
```

```js
// FIX: compare numbers with a number
db.products.find({ price: { $gt: 50000 } })
```

## Practice

Four steps on `products` (6 products, priced from 15,000 to 350,000).

## Recap

- `$gt`, `$gte`, `$lt`, `$lte` filter a range; `$in`, `$nin` filter by list.
- Several operators on one field share one sub-document.
- Filter conditions join with AND; `$or` gives "or" across fields.
- `$ne` and `$nin` also match documents without the field.
- A comparison only matches values of the same type group.
