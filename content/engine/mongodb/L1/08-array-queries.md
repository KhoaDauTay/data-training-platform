---
id: e-mg-l1-08
engine: mongodb
level: L1
module: query-ops
title: Truy vấn trong mảng và $elemMatch
title_en: Querying arrays and $elemMatch
kind: lab
runtime: browser
minutes: 14
objectives:
  - vi: Lọc tài liệu có mảng chứa một giá trị, chứa đủ nhiều giá trị (`$all`) hoặc có độ dài cho trước (`$size`).
    en: Filter documents whose array contains a value, contains several values (`$all`) or has a given length (`$size`).
  - vi: Dùng `$elemMatch` khi nhiều điều kiện phải đúng trên cùng một phần tử của mảng tài liệu.
    en: Use `$elemMatch` when several conditions must hold on the same element of an array of documents.
requires: [e-mg-l1-07]
sources:
  - https://www.mongodb.com/docs/manual/tutorial/query-arrays/
  - https://www.mongodb.com/docs/manual/tutorial/query-array-of-documents/
  - https://www.mongodb.com/docs/manual/reference/operator/query/elemmatch/
predict:
  sql: 'db.orders.find({ "lines.sku": "p4", "lines.qty": { $gte: 2 } }, { _id: 1 })'
  q:
    vi: Câu này trả về những đơn nào?
    en: Which orders does this query return?
  options:
    - vi: Chỉ đơn 5
      en: Only order 5
    - vi: Đơn 1 và đơn 5
      en: Orders 1 and 5
    - vi: Không đơn nào
      en: No order
  answer: 1
  why:
    vi: "Không có `$elemMatch`, mỗi điều kiện được thỏa bởi bất kỳ phần tử nào. Đơn 1 có một dòng `p4` (qty 1) và một dòng khác qty 2, nên vẫn khớp."
    en: "Without `$elemMatch`, each condition can be met by any element. Order 1 has a `p4` line (qty 1) and a different line with qty 2, so it still matches."
lab:
  setup: |
    {"collections": {
      "products": [
        {"_id": "p1", "name": "Green tea", "category": "drink", "price": 25000, "tags": ["hot", "cold"]},
        {"_id": "p2", "name": "Coffee beans", "category": "drink", "price": 120000, "tags": ["hot"]},
        {"_id": "p3", "name": "Rice cracker", "category": "snack", "price": 15000, "tags": []},
        {"_id": "p4", "name": "Dried mango", "category": "snack", "price": 45000, "tags": ["gift"]},
        {"_id": "p5", "name": "Tea set", "category": "gift", "price": 350000, "tags": ["gift", "fragile"]},
        {"_id": "p6", "name": "Lotus tea", "category": "drink", "price": 60000, "tags": ["hot", "gift"]}
      ],
      "orders": [
        {"_id": 1, "customer": "c1", "status": "paid", "lines": [{"sku": "p1", "qty": 2, "price": 25000}, {"sku": "p4", "qty": 1, "price": 45000}]},
        {"_id": 2, "customer": "c2", "status": "shipped", "lines": [{"sku": "p2", "qty": 1, "price": 120000}]},
        {"_id": 3, "customer": "c1", "status": "shipped", "lines": [{"sku": "p5", "qty": 1, "price": 350000}, {"sku": "p1", "qty": 4, "price": 25000}]},
        {"_id": 4, "customer": "c3", "status": "cancelled", "lines": [{"sku": "p3", "qty": 10, "price": 15000}]},
        {"_id": 5, "customer": "c4", "status": "paid", "lines": [{"sku": "p6", "qty": 2, "price": 60000}, {"sku": "p4", "qty": 2, "price": 45000}]},
        {"_id": 6, "customer": "c2", "status": "paid", "lines": [{"sku": "p1", "qty": 1, "price": 25000}]}
      ]
    }}
  steps:
    - task:
        vi: Lấy các sản phẩm có nhãn `"gift"` trong mảng `tags`.
        en: Return the products with `"gift"` in their `tags` array.
      solution: 'db.products.find({ tags: "gift" })'
      check: doc
      hint:
        vi: "Điều kiện bằng trên một mảng khớp khi bất kỳ phần tử nào bằng giá trị đó."
        en: "An equality condition on an array matches when any element equals the value."
    - task:
        vi: Lấy các sản phẩm có cả hai nhãn `"hot"` và `"gift"`, theo thứ tự nào cũng được.
        en: Return the products that have both tags `"hot"` and `"gift"`, in any order.
      solution: 'db.products.find({ tags: { $all: ["hot", "gift"] } })'
      check: doc
      hint:
        vi: "`{ tags: [\"hot\", \"gift\"] }` đòi mảng giống hệt, cả thứ tự. Toán tử cần dùng là `$all`."
        en: "`{ tags: [\"hot\", \"gift\"] }` requires the exact array, order included. The operator you need is `$all`."
    - task:
        vi: Lấy các sản phẩm chưa có nhãn nào (mảng `tags` rỗng).
        en: Return the products with no tag at all (empty `tags` array).
      solution: 'db.products.find({ tags: { $size: 0 } })'
      check: doc
      hint:
        vi: "`$size` so độ dài mảng với một số."
        en: "`$size` compares the array's length with a number."
    - task:
        vi: Lấy `_id` của các đơn có dòng hàng sản phẩm `"p1"` (trường `sku` trong mảng `lines`).
        en: Return the `_id` of the orders that have a line for product `"p1"` (field `sku` in array `lines`).
      solution: 'db.orders.find({ "lines.sku": "p1" }, { _id: 1 })'
      check: doc
      hint:
        vi: 'Dot notation đi xuyên qua mảng: `"lines.sku"`.'
        en: 'Dot notation reaches through the array: `"lines.sku"`.'
    - task:
        vi: Lấy `_id` của các đơn có một dòng hàng vừa là sản phẩm `"p4"` vừa có số lượng từ 2 trở lên.
        en: Return the `_id` of the orders with one line that is product `"p4"` and has a quantity of 2 or more.
      solution: 'db.orders.find({ lines: { $elemMatch: { sku: "p4", qty: { $gte: 2 } } } }, { _id: 1 })'
      check: doc
      hint:
        vi: "Hai điều kiện phải đúng trên cùng một dòng: gói chúng trong `$elemMatch`."
        en: "Both conditions must hold on the same line: wrap them in `$elemMatch`."
---
## Ý chính

Với mảng giá trị như `tags`:

- `{ tags: "gift" }` khớp khi có ít nhất một phần tử bằng `"gift"`;
- `{ tags: ["hot", "gift"] }` chỉ khớp mảng giống hệt, cả thứ tự;
- `$all` đòi mảng chứa mọi giá trị đã cho, không quan tâm thứ tự;
- `$size` so độ dài mảng (chỉ so bằng, không nhận `$gt`).

Với mảng tài liệu như `lines`, `"lines.sku"` nhìn vào trường `sku` của mọi phần tử.

Bẫy quan trọng: nhiều điều kiện dạng dot notation trên cùng một mảng có thể được thỏa bởi các phần tử khác nhau. Muốn mọi điều kiện đúng trên cùng một phần tử thì dùng `$elemMatch`.

Làm được: tìm đúng tài liệu theo nội dung mảng, kể cả mảng tài liệu nhúng (embedded document).

## Ví dụ

```js
db.orders.find({ lines: { $elemMatch: { qty: { $gte: 5 }, price: { $lt: 20000 } } } })
```

## Thực hành

Trước khi làm, đoán câu hỏi dự đoán: điều kiện dot notation không có `$elemMatch` trả về đơn nào? Rồi làm năm bước.

# EN

## Key idea

For an array of values such as `tags`:

- `{ tags: "gift" }` matches when at least one element equals `"gift"`;
- `{ tags: ["hot", "gift"] }` matches only that exact array, order included;
- `$all` requires the array to hold every given value, in any order;
- `$size` compares the array's length (equality only, no `$gt`).

For an array of documents such as `lines`, `"lines.sku"` looks at the `sku` field of every element.

The key trap: several dot-notation conditions on the same array can be met by different elements. When all conditions must hold on the same element, use `$elemMatch`.

You can now: find the right documents by what their arrays hold, including arrays of embedded documents.

## Example

```js
db.orders.find({ lines: { $elemMatch: { qty: { $gte: 5 }, price: { $lt: 20000 } } } })
```

## Practice

Before you start, answer the prediction: which orders does the dot-notation filter without `$elemMatch` return? Then do the five steps.
