---
id: e-mg-l2-07
engine: mongodb
level: L2
module: aggregation
title: Tách mảng với $unwind
title_en: Splitting arrays with $unwind
kind: lab
runtime: browser
minutes: 12
objectives:
  - vi: Dùng `$unwind` để biến mỗi phần tử mảng thành một tài liệu, rồi gom nhóm theo phần tử.
    en: Use `$unwind` to turn each array element into its own document, then group by element.
  - vi: Giữ lại tài liệu có mảng rỗng bằng `preserveNullAndEmptyArrays`.
    en: Keep documents with an empty array using `preserveNullAndEmptyArrays`.
requires: [e-mg-l2-06]
sources:
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/unwind/
lab:
  setup: |
    {"collections": {"orders": [
      {"_id": 1, "customer": "c1", "store": "S1", "status": "paid", "lines": [{"sku": "p1", "qty": 2, "price": 25000}, {"sku": "p4", "qty": 1, "price": 45000}]},
      {"_id": 2, "customer": "c2", "store": "S2", "status": "shipped", "lines": [{"sku": "p2", "qty": 1, "price": 120000}]},
      {"_id": 3, "customer": "c1", "store": "S1", "status": "shipped", "lines": [{"sku": "p5", "qty": 1, "price": 350000}, {"sku": "p1", "qty": 4, "price": 25000}]},
      {"_id": 4, "customer": "c3", "store": "S1", "status": "cancelled", "lines": [{"sku": "p3", "qty": 10, "price": 15000}]},
      {"_id": 5, "customer": "c4", "store": "S2", "status": "paid", "lines": [{"sku": "p6", "qty": 2, "price": 60000}, {"sku": "p4", "qty": 2, "price": 45000}]},
      {"_id": 6, "customer": "c2", "store": "S2", "status": "paid", "lines": [{"sku": "p1", "qty": 1, "price": 25000}]},
      {"_id": 7, "customer": "c5", "store": "S1", "status": "shipped", "lines": [{"sku": "p2", "qty": 2, "price": 120000}, {"sku": "p3", "qty": 3, "price": 15000}]},
      {"_id": 8, "customer": "c1", "store": "S2", "status": "paid", "lines": [{"sku": "p6", "qty": 1, "price": 60000}]},
      {"_id": 9, "customer": "c4", "store": "S1", "status": "draft", "lines": []}
    ]}}
  steps:
    - task:
        vi: 'Số đơn vị đã bán của từng sản phẩm, chỉ tính đơn `"paid"` và `"shipped"`: `_id` là mã sản phẩm, `units` là tổng `qty`, xếp theo `_id` từ A tới Z.'
        en: 'Units sold per product, counting only `"paid"` and `"shipped"` orders: `_id` is the product code, `units` the sum of `qty`, sorted by `_id` from A to Z.'
      solution: 'db.orders.aggregate([{ $match: { status: { $in: ["paid", "shipped"] } } }, { $unwind: "$lines" }, { $group: { _id: "$lines.sku", units: { $sum: "$lines.qty" } } }, { $sort: { _id: 1 } }])'
      check: doc
      ordered: true
      hint:
        vi: 'Sau `$unwind: "$lines"`, `lines` là một tài liệu chứ không còn là mảng, nên gom theo `"$lines.sku"`.'
        en: 'After `$unwind: "$lines"`, `lines` is one document instead of an array, so group by `"$lines.sku"`.'
    - task:
        vi: 'Ba sản phẩm mang lại doanh thu cao nhất (đơn `"paid"` và `"shipped"`): `_id` là mã sản phẩm, `revenue` là tổng `qty` × `price`, cao nhất trước. Không có hai doanh thu bằng nhau.'
        en: 'The three products with the highest revenue (`"paid"` and `"shipped"` orders): `_id` is the product code, `revenue` the sum of `qty` × `price`, highest first. No two revenues are equal.'
      solution: 'db.orders.aggregate([{ $match: { status: { $in: ["paid", "shipped"] } } }, { $unwind: "$lines" }, { $group: { _id: "$lines.sku", revenue: { $sum: { $multiply: ["$lines.qty", "$lines.price"] } } } }, { $sort: { revenue: -1 } }, { $limit: 3 }])'
      check: doc
      ordered: true
      hint:
        vi: '`$sum` nhận cả biểu thức: `{ $sum: { $multiply: ["$lines.qty", "$lines.price"] } }`.'
        en: '`$sum` accepts an expression: `{ $sum: { $multiply: ["$lines.qty", "$lines.price"] } }`.'
    - task:
        vi: 'Với các đơn `"draft"` và `"cancelled"`, trả mỗi dòng hàng thành một kết quả gồm `_id` của đơn và `sku`. Đơn không có dòng nào vẫn phải hiện (không có `sku`).'
        en: 'For the `"draft"` and `"cancelled"` orders, return one result per line with the order `_id` and `sku`. An order with no line must still appear (without `sku`).'
      solution: 'db.orders.aggregate([{ $match: { status: { $in: ["draft", "cancelled"] } } }, { $unwind: { path: "$lines", preserveNullAndEmptyArrays: true } }, { $project: { sku: "$lines.sku" } }])'
      check: doc
      hint:
        vi: "Mặc định `$unwind` bỏ tài liệu có mảng rỗng. Dùng dạng tài liệu với `preserveNullAndEmptyArrays: true`."
        en: "By default `$unwind` drops documents with an empty array. Use the document form with `preserveNullAndEmptyArrays: true`."
quiz:
  - q:
      vi: '9 đơn có tổng cộng 12 dòng hàng; đơn 9 có `lines` rỗng. `$unwind: "$lines"` (mặc định) trả ra bao nhiêu tài liệu?'
      en: '9 orders hold 12 lines in total; order 9 has an empty `lines`. How many documents does a default `$unwind: "$lines"` return?'
    options:
      - vi: "9, vì `$unwind` chỉ đổi hình chứ không đổi số tài liệu"
        en: "9, because `$unwind` only reshapes and keeps the number of documents"
      - vi: "12"
        en: "12"
      - vi: "13, vì đơn rỗng vẫn ra một tài liệu"
        en: "13, because the empty order still gives one document"
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý nếu xem `$unwind` như một phép đổi hình, nhưng nó ra một tài liệu cho mỗi phần tử: 12 dòng thành 12 tài liệu. Đơn 9 có mảng rỗng nên bị bỏ, trừ khi bật `preserveNullAndEmptyArrays`.'
      en: 'It sounds right if `$unwind` is just a reshape, but it outputs one document per element: 12 lines become 12 documents. Order 9 has an empty array, so it is dropped unless `preserveNullAndEmptyArrays` is on.'
  - q:
      vi: 'Muốn tính tổng tiền của từng đơn (cộng `qty` × `price` trong chính đơn đó). Có cần `$unwind` không?'
      en: 'You want each order''s own total (the sum of `qty` × `price` inside that order). Do you need `$unwind`?'
    options:
      - vi: 'Không: `$sum` trên mảng tính ngay trong tài liệu'
        en: 'No: `$sum` over the array works inside the document'
      - vi: 'Có, mảng không tổng hợp được nếu chưa tách'
        en: 'Yes, an array cannot be aggregated before it is split'
    answer: 0
    trap: 1
    why:
      vi: 'Nghe hợp lý vì gom nhóm theo phần tử thì cần tách, nhưng tổng của một đơn nằm trọn trong tài liệu: `$sum` với `$map` tính được mà không nhân số tài liệu lên.'
      en: 'It sounds right because grouping by element needs a split, but one order''s total lives inside the document: `$sum` with `$map` computes it without multiplying the documents.'
---
## Mở bài

Kho hỏi: mỗi sản phẩm đã bán được bao nhiêu đơn vị? Sản phẩm nằm trong mảng `lines` của từng đơn, nên `$group` theo đơn không trả lời được. Bạn tách mảng thế nào?

## Ý chính

`$unwind: "$lines"` biến một đơn có 3 dòng hàng thành 3 tài liệu, mỗi tài liệu giữ mọi trường của đơn và một dòng trong `lines`. Đây là cách gom nhóm theo thứ nằm trong mảng: theo sản phẩm, theo nhãn, theo từng dòng.

Hai điều cần nhớ:

- tài liệu có mảng rỗng, `null` hoặc thiếu trường bị bỏ, trừ khi dùng `{ path: "$lines", preserveNullAndEmptyArrays: true }`;
- số tài liệu tăng lên, nên lọc bằng `$match` trước `$unwind` khi được.

Không phải lúc nào cũng cần `$unwind`: tổng của một đơn tính ngay trong tài liệu bằng `$sum` trên mảng, không cần tách.

Làm được: báo cáo theo sản phẩm từ các đơn có dòng hàng nhúng.

## Cú pháp

```text
{ $unwind: "$<array field>" }
{ $unwind: { path: "$<array field>", preserveNullAndEmptyArrays: true } }
```

- Dạng chuỗi bỏ tài liệu có mảng rỗng hoặc thiếu.
- Dạng tài liệu giữ chúng lại, không có phần tử nào.

## Ví dụ

Các dòng có số lượng từ 4:

```js
db.orders.aggregate([
  { $unwind: "$lines" },
  { $match: { "lines.qty": { $gte: 4 } } },
  { $project: { sku: "$lines.sku", qty: "$lines.qty" } }
])
```

Hai kết quả: dòng `"p1"` số lượng 4 của đơn 3 và dòng `"p3"` số lượng 10 của đơn 4. `_id` vẫn là mã đơn: sau `$unwind`, mọi tài liệu tách từ một đơn mang chung `_id` của đơn đó.

Đếm tổng số dòng hàng của mọi đơn:

```js
db.orders.aggregate([{ $unwind: "$lines" }, { $count: "lineCount" }])
```

Kết quả: `{ lineCount: 12 }`, đúng bằng số dòng hàng của 9 đơn. Đơn 9 không có dòng nào nên không góp tài liệu nào.

## Lỗi hay gặp

Gom theo trường trong mảng mà chưa tách:

```js
// WRONG: without $unwind, the key is the whole array of skus
db.orders.aggregate([{ $group: { _id: "$lines.sku", orders: { $sum: 1 } } }])
```

```js
// FIX: split first, then group by one sku
db.orders.aggregate([{ $unwind: "$lines" }, { $group: { _id: "$lines.sku", orders: { $sum: 1 } } }])
```

Bản sai ra 9 nhóm, mỗi nhóm 1 đơn, với khóa là cả mảng như `["p1", "p4"]`, kể cả một nhóm `[]` của đơn 9. Bản sửa ra 6 nhóm theo từng sản phẩm, ví dụ `"p1"` có mặt trong 3 đơn.

Quên rằng `$unwind` mặc định bỏ mảng rỗng:

```js
// WRONG: the draft order 9 disappears
db.orders.aggregate([{ $match: { _id: 9 } }, { $unwind: "$lines" }])
```

```js
// FIX: keep documents with an empty array
db.orders.aggregate([{ $match: { _id: 9 } }, { $unwind: { path: "$lines", preserveNullAndEmptyArrays: true } }])
```

Bản sai trả danh sách rỗng. Bản sửa trả đơn 9 với `_id`, `customer`, `store`, `status` và không có trường `lines`. Báo cáo "đơn nào chưa có hàng" cần đúng những tài liệu mà `$unwind` mặc định bỏ đi.

## Thực hành

Ba bước trên `orders`. Đơn 9 là đơn nháp chưa có dòng hàng nào. Trước bước 3, đoán trước: với `$unwind` mặc định, đơn 9 có hiện trong kết quả không? Bước 1 và 2 đi theo cùng một khuôn: `$match` theo trạng thái, `$unwind`, `$group` theo `"$lines.sku"`, `$sort`; bước 2 thêm `$multiply` trong `$sum` và `$limit`. Bước 3 dùng dạng tài liệu của `$unwind` để giữ đơn rỗng.

## Tóm tắt

- `$unwind` ra một tài liệu cho mỗi phần tử của mảng.
- Mảng rỗng, `null` hay thiếu bị bỏ, trừ khi có `preserveNullAndEmptyArrays`.
- Gom theo phần tử mảng: `$unwind` trước, `$group` sau.
- Lọc trước `$unwind` để bớt tài liệu; tổng trong một đơn không cần tách.

# EN

## Opening

The warehouse asks: how many units of each product were sold? Products sit inside the `lines` array of each order, so a `$group` per order cannot answer. How do you split the array?

## Key idea

`$unwind: "$lines"` turns an order with 3 lines into 3 documents, each keeping every field of the order plus one line in `lines`. This is how you group by what sits inside an array: per product, per tag, per line.

Two things to remember:

- documents whose array is empty, `null` or missing are dropped, unless you use `{ path: "$lines", preserveNullAndEmptyArrays: true }`;
- the number of documents grows, so filter with `$match` before `$unwind` when you can.

You do not always need `$unwind`: an order's own total is computed inside the document with `$sum` over the array, with no split.

You can now: report per product from orders with embedded lines.

## Syntax

```text
{ $unwind: "$<array field>" }
{ $unwind: { path: "$<array field>", preserveNullAndEmptyArrays: true } }
```

- The string form drops documents whose array is empty or missing.
- The document form keeps them, with no element.

## Example

The lines with a quantity of 4 or more:

```js
db.orders.aggregate([
  { $unwind: "$lines" },
  { $match: { "lines.qty": { $gte: 4 } } },
  { $project: { sku: "$lines.sku", qty: "$lines.qty" } }
])
```

Two results: line `"p1"` with quantity 4 in order 3 and line `"p3"` with quantity 10 in order 4. `_id` is still the order id: after `$unwind`, every document split from one order carries that order's `_id`.

Count all the lines of every order:

```js
db.orders.aggregate([{ $unwind: "$lines" }, { $count: "lineCount" }])
```

Result: `{ lineCount: 12 }`, exactly the number of lines in the 9 orders. Order 9 has no line, so it adds no document.

## Common mistakes

Grouping by a field inside the array without splitting it:

```js
// WRONG: without $unwind, the key is the whole array of skus
db.orders.aggregate([{ $group: { _id: "$lines.sku", orders: { $sum: 1 } } }])
```

```js
// FIX: split first, then group by one sku
db.orders.aggregate([{ $unwind: "$lines" }, { $group: { _id: "$lines.sku", orders: { $sum: 1 } } }])
```

The wrong version gives 9 groups of 1 order each, keyed by the whole array such as `["p1", "p4"]`, including a group `[]` for order 9. The fix gives 6 groups, one per product; for example `"p1"` appears in 3 orders.

Forgetting that a default `$unwind` drops empty arrays:

```js
// WRONG: the draft order 9 disappears
db.orders.aggregate([{ $match: { _id: 9 } }, { $unwind: "$lines" }])
```

```js
// FIX: keep documents with an empty array
db.orders.aggregate([{ $match: { _id: 9 } }, { $unwind: { path: "$lines", preserveNullAndEmptyArrays: true } }])
```

The wrong version returns an empty list. The fix returns order 9 with `_id`, `customer`, `store`, `status` and no `lines` field. A report of "orders with no items yet" needs exactly the documents a default `$unwind` drops.

## Practice

Three steps on `orders`. Order 9 is a draft with no line yet. Before step 3, predict: with a default `$unwind`, does order 9 show up in the result? Steps 1 and 2 follow one pattern: `$match` on status, `$unwind`, `$group` on `"$lines.sku"`, `$sort`; step 2 adds `$multiply` inside `$sum` and a `$limit`. Step 3 uses the document form of `$unwind` to keep the empty order.

## Recap

- `$unwind` outputs one document per array element.
- Empty, `null` or missing arrays are dropped unless `preserveNullAndEmptyArrays` is set.
- To group by array elements: `$unwind` first, `$group` second.
- Filter before `$unwind` to cut documents; a total inside one order needs no split.
