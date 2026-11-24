---
id: e-mg-l1-10
engine: mongodb
level: L1
module: query-ops
title: Sắp xếp, phân trang và đếm
title_en: Sorting, paging and counting
kind: lab
runtime: browser
minutes: 10
objectives:
  - vi: Sắp xếp kết quả theo một hoặc nhiều trường, rồi lấy trang thứ n bằng `skip` và `limit`.
    en: Sort results by one or more fields, then take page n with `skip` and `limit`.
  - vi: Đếm tài liệu khớp bằng `countDocuments`.
    en: Count matching documents with `countDocuments`.
requires: [e-mg-l1-07]
sources:
  - https://www.mongodb.com/docs/manual/reference/method/cursor.sort/
  - https://www.mongodb.com/docs/manual/reference/method/cursor.skip/
  - https://www.mongodb.com/docs/manual/reference/method/db.collection.countdocuments/
lab:
  setup: |
    {"collections": {"products": [
      {"_id": "p1", "name": "Green tea", "category": "drink", "price": 25000, "stock": 40},
      {"_id": "p2", "name": "Coffee beans", "category": "drink", "price": 120000, "stock": 8},
      {"_id": "p3", "name": "Rice cracker", "category": "snack", "price": 15000, "stock": 0},
      {"_id": "p4", "name": "Dried mango", "category": "snack", "price": 45000, "stock": 25},
      {"_id": "p5", "name": "Tea set", "category": "gift", "price": 350000, "stock": 3},
      {"_id": "p6", "name": "Lotus tea", "category": "drink", "price": 60000, "stock": 12}
    ]}}
  steps:
    - task:
        vi: Lấy `name` và `price` (không kèm `_id`) của 3 sản phẩm đắt nhất, đắt nhất trước. Giá không trùng nhau.
        en: Return `name` and `price` (no `_id`) of the 3 most expensive products, most expensive first. No two prices are equal.
      solution: 'db.products.find({}, { name: 1, price: 1, _id: 0 }).sort({ price: -1 }).limit(3)'
      check: doc
      ordered: true
      hint:
        vi: "`sort({ price: -1 })` là giảm dần, rồi `limit(3)`."
        en: "`sort({ price: -1 })` sorts descending, then `limit(3)`."
    - task:
        vi: Danh sách sản phẩm xếp theo `name` từ A tới Z, mỗi trang 2 sản phẩm. Lấy trang 2 (chỉ `name`, không `_id`).
        en: The product list is sorted by `name` from A to Z, 2 products per page. Return page 2 (only `name`, no `_id`).
      solution: 'db.products.find({}, { name: 1, _id: 0 }).sort({ name: 1 }).skip(2).limit(2)'
      check: doc
      ordered: true
      hint:
        vi: Trang n bỏ qua (n − 1) × cỡ trang tài liệu đầu.
        en: Page n skips the first (n − 1) × page size documents.
    - task:
        vi: Lấy `category`, `name`, `price` (không `_id`) của mọi sản phẩm, xếp theo nhóm A tới Z, trong mỗi nhóm giá cao trước.
        en: Return `category`, `name`, `price` (no `_id`) of every product, sorted by category A to Z and, within a category, highest price first.
      solution: 'db.products.find({}, { category: 1, name: 1, price: 1, _id: 0 }).sort({ category: 1, price: -1 })'
      check: doc
      ordered: true
      hint:
        vi: "Khóa sắp xếp đầu là `category`, khóa thứ hai là `price` giảm dần."
        en: "The first sort key is `category`, the second is `price` descending."
    - task:
        vi: Đếm số sản phẩm nhóm `"drink"`.
        en: Count the products in category `"drink"`.
      solution: 'db.products.countDocuments({ category: "drink" })'
      check: doc
      hint:
        vi: "`countDocuments` nhận một filter như `find` và trả về một số."
        en: "`countDocuments` takes a filter like `find` and returns a number."
quiz:
  - q:
      vi: '`db.products.find().limit(2).sort({ price: -1 })` trả về gì?'
      en: 'What does `db.products.find().limit(2).sort({ price: -1 })` return?'
    options:
      - vi: Hai tài liệu đầu tiên của collection, rồi xếp hai cái đó theo giá
        en: The first two documents of the collection, then those two sorted by price
      - vi: Hai sản phẩm đắt nhất, đắt nhất trước
        en: The two most expensive products, most expensive first
      - vi: Lỗi, vì `sort` phải viết trước `limit`
        en: An error, because `sort` must come before `limit`
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý nếu các lệnh chạy theo thứ tự viết, như một chuỗi bước. Nhưng cursor gom các tùy chọn lại, và MongoDB luôn áp `sort` trước, rồi `skip`, rồi `limit`.'
      en: 'It sounds right if the calls run in the order written, like a chain of steps. But the cursor collects the options, and MongoDB always applies `sort` first, then `skip`, then `limit`.'
  - q:
      vi: 'Bạn phân trang bằng `sort({ category: 1 }).skip(2).limit(2)`, và nhiều sản phẩm cùng nhóm. Rủi ro là gì?'
      en: 'You page with `sort({ category: 1 }).skip(2).limit(2)`, and many products share a category. What is the risk?'
    options:
      - vi: Không rủi ro gì, vì đã có `sort`
        en: No risk, because there is a `sort`
      - vi: Thứ tự giữa các sản phẩm cùng nhóm không cố định, nên một sản phẩm có thể hiện ở hai trang hoặc không trang nào
        en: The order among products of the same category is not fixed, so a product can show on two pages or on none
      - vi: '`skip` bị bỏ qua khi khóa sắp xếp trùng'
        en: '`skip` is ignored when sort keys tie'
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý vì đã có `sort`, nhưng `sort` chỉ hứa thứ tự giữa các khóa khác nhau. Khi hòa, thứ tự có thể khác giữa hai lần gọi. Thêm `_id` làm khóa cuối: `sort({ category: 1, _id: 1 })`.'
      en: 'It sounds right because there is a `sort`, but `sort` only promises an order between different keys. On a tie, the order may differ from one call to the next. Add `_id` as the last key: `sort({ category: 1, _id: 1 })`.'
---
## Mở bài

Trang danh sách hiện 2 sản phẩm mỗi trang, xếp theo tên. Trang 1 đã xong, giờ cần trang 2, và trang chủ cần số đồ uống. Bạn ghép `sort`, `skip`, `limit` và `countDocuments` thế nào?

## Ý chính

- `sort({ price: -1 })` xếp giảm dần, `1` là tăng dần. Nhiều khóa thì xếp theo khóa đầu, hòa thì xét khóa sau.
- `limit(n)` giữ n tài liệu đầu, `skip(k)` bỏ k tài liệu đầu.
- Dù bạn viết theo thứ tự nào, MongoDB luôn áp `sort` trước, rồi `skip`, rồi `limit`.

Không có `sort`, thứ tự trả về không được hứa trước. Phân trang luôn cần `sort` với khóa duy nhất (thêm `_id` làm khóa cuối nếu cần), nếu không một tài liệu có thể hiện ở hai trang. `skip` lớn vẫn phải đi qua mọi tài liệu bị bỏ, nên trang sâu sẽ chậm; khi đó lọc theo giá trị cuối của trang trước (ví dụ `_id` lớn hơn) thì tốt hơn.

`countDocuments(filter)` đếm chính xác số tài liệu khớp.

Làm được: lấy top N, lấy một trang bất kỳ của danh sách đã xếp, và đếm kết quả.

## Cú pháp

```text
db.<collection>.find(<filter>, <projection>).sort({ <field>: 1 | -1, _id: 1 }).skip(<k>).limit(<n>)
db.<collection>.countDocuments(<filter>)
```

- `1` tăng dần, `-1` giảm dần; khóa sau phá hòa của khóa trước.
- Trang n (cỡ trang p): `skip((n - 1) * p).limit(p)`.
- `countDocuments` trả về một số, không trả tài liệu.

## Ví dụ

Hai đồ uống tồn kho ít nhất, hòa thì theo `_id`:

```js
db.products.find({ category: "drink" }).sort({ stock: 1, _id: 1 }).limit(2)
```

Kết quả là `p2` (tồn 8) rồi `p6` (tồn 12). `sort` chạy trước `limit` dù bạn viết theo thứ tự nào; `_id` trong khóa sắp xếp làm thứ tự cố định khi hai sản phẩm cùng tồn kho.

Số sản phẩm còn dưới 10 đơn vị:

```js
db.products.countDocuments({ stock: { $lt: 10 } })
```

Kết quả là một con số, 3 (`p2`, `p3`, `p5`), không phải danh sách tài liệu. `countDocuments` nhận cùng filter với `find`, nên kiểm được bằng `find` khi con số trông lạ.

## Lỗi hay gặp

Phân trang mà không `sort`:

```js
// WRONG: no sort, so page 2 is whatever comes 3rd and 4th
db.products.find({}, { name: 1, _id: 0 }).skip(2).limit(2)
```

```js
// FIX: a fixed order first
db.products.find({}, { name: 1, _id: 0 }).sort({ name: 1, _id: 1 }).skip(2).limit(2)
```

Ở đây bản sai trả `Rice cracker`, `Dried mango` theo thứ tự lưu, bản sửa trả `Green tea`, `Lotus tea`. Không có `sort`, MongoDB không hứa thứ tự nào: máy chủ thật có thể đổi thứ tự sau một lần cập nhật, nên trang 2 có thể lặp hoặc bỏ sót tài liệu.

Nhầm chiều sắp xếp khi lấy top N:

```js
// WRONG: 1 is ascending, so these are the 3 cheapest
db.products.find({}, { name: 1, price: 1, _id: 0 }).sort({ price: 1 }).limit(3)
```

```js
// FIX: -1 puts the most expensive first
db.products.find({}, { name: 1, price: 1, _id: 0 }).sort({ price: -1 }).limit(3)
```

Bản sai trả ba món rẻ nhất (15000, 25000, 45000), bản sửa trả ba món đắt nhất: `Tea set`, `Coffee beans`, `Lotus tea`. Cả hai chạy không lỗi; chỉ đọc kết quả mới thấy sai.

## Thực hành

Bốn bước trên `products`. Ba bước đầu chấm cả thứ tự. Bước 1 lấy ba sản phẩm đắt nhất. Bước 2 lấy trang thứ hai, mỗi trang hai tên, theo thứ tự tên. Bước 3 sắp xếp theo hai khóa: nhóm tăng dần, trong nhóm giá giảm dần. Bước 4 chỉ đếm, không trả tài liệu.

## Tóm tắt

- `sort` nhận `1` (tăng) hoặc `-1` (giảm), khóa sau phá hòa.
- MongoDB luôn áp `sort`, rồi `skip`, rồi `limit`, dù viết theo thứ tự nào.
- Phân trang cần `sort` trên khóa duy nhất; thêm `_id` làm khóa cuối.
- `skip` lớn chậm; trang sâu nên lọc theo giá trị cuối của trang trước.
- `countDocuments(filter)` đếm chính xác.

# EN

## Opening

The list page shows 2 products per page, sorted by name. Page 1 is done, now page 2 is needed, and the home page needs the number of drinks. How do you combine `sort`, `skip`, `limit` and `countDocuments`?

## Key idea

- `sort({ price: -1 })` sorts descending, `1` ascending. With several keys, ties on the first key are broken by the next.
- `limit(n)` keeps the first n documents, `skip(k)` drops the first k.
- Whatever order you write them in, MongoDB always applies `sort`, then `skip`, then `limit`.

Without `sort`, the order of results is not guaranteed. Paging always needs a `sort` on a unique key (add `_id` as the last key if needed), or a document can show up on two pages. A large `skip` still walks over every skipped document, so deep pages get slow; filtering on the last value of the previous page (such as a greater `_id`) works better then.

`countDocuments(filter)` counts the matching documents exactly.

You can now: take a top N, fetch any page of a sorted list, and count results.

## Syntax

```text
db.<collection>.find(<filter>, <projection>).sort({ <field>: 1 | -1, _id: 1 }).skip(<k>).limit(<n>)
db.<collection>.countDocuments(<filter>)
```

- `1` ascending, `-1` descending; a later key breaks ties of the one before.
- Page n (page size p): `skip((n - 1) * p).limit(p)`.
- `countDocuments` returns a number, not documents.

## Example

The two drinks with the lowest stock, ties broken by `_id`:

```js
db.products.find({ category: "drink" }).sort({ stock: 1, _id: 1 }).limit(2)
```

The result is `p2` (8 in stock), then `p6` (12 in stock). `sort` runs before `limit` whatever order you write them in; `_id` in the sort key fixes the order when two products have the same stock.

The number of products with fewer than 10 units:

```js
db.products.countDocuments({ stock: { $lt: 10 } })
```

The result is one number, 3 (`p2`, `p3`, `p5`), not a list of documents. `countDocuments` takes the same filter as `find`, so you can check it with `find` when the number looks odd.

## Common mistakes

Paging without `sort`:

```js
// WRONG: no sort, so page 2 is whatever comes 3rd and 4th
db.products.find({}, { name: 1, _id: 0 }).skip(2).limit(2)
```

```js
// FIX: a fixed order first
db.products.find({}, { name: 1, _id: 0 }).sort({ name: 1, _id: 1 }).skip(2).limit(2)
```

Here the wrong version returns `Rice cracker`, `Dried mango` in stored order, the fix returns `Green tea`, `Lotus tea`. Without `sort`, MongoDB promises no order: a real server may change the order after an update, so page 2 can repeat or skip documents.

Getting the sort direction wrong for a top N:

```js
// WRONG: 1 is ascending, so these are the 3 cheapest
db.products.find({}, { name: 1, price: 1, _id: 0 }).sort({ price: 1 }).limit(3)
```

```js
// FIX: -1 puts the most expensive first
db.products.find({}, { name: 1, price: 1, _id: 0 }).sort({ price: -1 }).limit(3)
```

The wrong version returns the three cheapest (15000, 25000, 45000), the fix the three most expensive: `Tea set`, `Coffee beans`, `Lotus tea`. Both run without an error; only reading the result shows the mistake.

## Practice

Four steps on `products`. The first three are graded in order. Step 1 takes the three most expensive products. Step 2 takes the second page, two names per page, in name order. Step 3 sorts by two keys: category ascending, then price descending within a category. Step 4 only counts and returns no documents.

## Recap

- `sort` takes `1` (ascending) or `-1` (descending); later keys break ties.
- MongoDB always applies `sort`, then `skip`, then `limit`, whatever the written order.
- Paging needs a `sort` on a unique key; add `_id` as the last key.
- A large `skip` is slow; deep pages should filter on the last value of the previous page.
- `countDocuments(filter)` counts exactly.
