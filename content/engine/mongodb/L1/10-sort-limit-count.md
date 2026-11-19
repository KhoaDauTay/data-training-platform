---
id: e-mg-l1-10
engine: mongodb
level: L1
module: query-ops
title: Sắp xếp, phân trang và đếm
title_en: Sorting, paging and counting
kind: lab
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
  - https://www.mongodb.com/docs/manual/reference/method/db.collection.countDocuments/
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
---
## Ý chính

- `sort({ price: -1 })` xếp giảm dần, `1` là tăng dần. Nhiều khóa thì xếp theo khóa đầu, hòa thì xét khóa sau.
- `limit(n)` giữ n tài liệu đầu, `skip(k)` bỏ k tài liệu đầu.
- Dù bạn viết theo thứ tự nào, MongoDB luôn áp `sort` trước, rồi `skip`, rồi `limit`.

Không có `sort`, thứ tự trả về không được hứa trước. Phân trang luôn cần `sort` với khóa duy nhất (thêm `_id` làm khóa cuối nếu cần), nếu không một tài liệu có thể hiện ở hai trang. `skip` lớn vẫn phải đi qua mọi tài liệu bị bỏ, nên trang sâu sẽ chậm; khi đó lọc theo giá trị cuối của trang trước (ví dụ `_id` lớn hơn) thì tốt hơn.

`countDocuments(filter)` đếm chính xác số tài liệu khớp.

Làm được: lấy top N, lấy một trang bất kỳ của danh sách đã xếp, và đếm kết quả.

## Ví dụ

```js
db.products.find({ category: "drink" }).sort({ stock: 1, _id: 1 }).limit(2)
db.products.countDocuments({ stock: { $lt: 10 } })
```

## Thực hành

Bốn bước trên `products`. Ba bước đầu chấm cả thứ tự.

# EN

## Key idea

- `sort({ price: -1 })` sorts descending, `1` ascending. With several keys, ties on the first key are broken by the next.
- `limit(n)` keeps the first n documents, `skip(k)` drops the first k.
- Whatever order you write them in, MongoDB always applies `sort`, then `skip`, then `limit`.

Without `sort`, the order of results is not guaranteed. Paging always needs a `sort` on a unique key (add `_id` as the last key if needed), or a document can show up on two pages. A large `skip` still walks over every skipped document, so deep pages get slow; filtering on the last value of the previous page (such as a greater `_id`) works better then.

`countDocuments(filter)` counts the matching documents exactly.

You can now: take a top N, fetch any page of a sorted list, and count results.

## Example

```js
db.products.find({ category: "drink" }).sort({ stock: 1, _id: 1 }).limit(2)
db.products.countDocuments({ stock: { $lt: 10 } })
```

## Practice

Four steps on `products`. The first three are graded in order.
