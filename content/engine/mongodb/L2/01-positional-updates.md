---
id: e-mg-l2-01
engine: mongodb
level: L2
module: update-pipeline
title: Sửa phần tử trong mảng ($, $[], arrayFilters)
title_en: Updating array elements ($, $[], arrayFilters)
kind: lab
runtime: browser
minutes: 14
objectives:
  - vi: Sửa đúng phần tử mảng đã khớp filter bằng toán tử vị trí `$`.
    en: Update the array element that matched the filter with the positional operator `$`.
  - vi: Sửa mọi phần tử bằng `$[]`, hoặc chỉ các phần tử thỏa điều kiện bằng `$[<id>]` và `arrayFilters`.
    en: Update every element with `$[]`, or only the elements meeting a condition with `$[<id>]` and `arrayFilters`.
requires: [e-mg-l1-11]
sources:
  - https://www.mongodb.com/docs/manual/reference/operator/update/positional/
  - https://www.mongodb.com/docs/manual/reference/operator/update/positional-all/
  - https://www.mongodb.com/docs/manual/reference/operator/update/positional-filtered/
lab:
  setup: |
    {"collections": {"orders": [
      {"_id": 1, "customer": "c1", "status": "paid", "lines": [{"sku": "p1", "qty": 2, "price": 25000}, {"sku": "p4", "qty": 1, "price": 45000}]},
      {"_id": 2, "customer": "c2", "status": "shipped", "lines": [{"sku": "p2", "qty": 1, "price": 120000}]},
      {"_id": 3, "customer": "c1", "status": "shipped", "lines": [{"sku": "p5", "qty": 1, "price": 350000}, {"sku": "p1", "qty": 4, "price": 25000}]},
      {"_id": 4, "customer": "c3", "status": "cancelled", "lines": [{"sku": "p3", "qty": 10, "price": 15000}]},
      {"_id": 5, "customer": "c4", "status": "paid", "lines": [{"sku": "p6", "qty": 2, "price": 60000}, {"sku": "p4", "qty": 2, "price": 45000}]},
      {"_id": 6, "customer": "c2", "status": "paid", "lines": [{"sku": "p1", "qty": 1, "price": 25000}]},
      {"_id": 7, "customer": "c5", "status": "shipped", "lines": [{"sku": "p2", "qty": 2, "price": 120000}, {"sku": "p3", "qty": 3, "price": 15000}]}
    ]}}
  steps:
    - task:
        vi: Khách của đơn 7 đổi số lượng dòng hàng `"p3"` thành 4. Chỉ sửa dòng đó.
        en: The customer of order 7 changes the quantity of the `"p3"` line to 4. Change only that line.
      solution: 'db.orders.updateOne({ _id: 7, "lines.sku": "p3" }, { $set: { "lines.$.qty": 4 } })'
      check: doc
      hint:
        vi: 'Đưa `"lines.sku": "p3"` vào filter, rồi `"lines.$.qty"` trỏ tới đúng dòng đã khớp.'
        en: 'Put `"lines.sku": "p3"` in the filter, then `"lines.$.qty"` points at the line that matched.'
    - task:
        vi: Đơn 5 được giảm 10 % trên mọi dòng hàng. Nhân `price` của mọi dòng với `0.9`.
        en: Order 5 gets 10% off every line. Multiply the `price` of every line by `0.9`.
      solution: 'db.orders.updateOne({ _id: 5 }, { $mul: { "lines.$[].price": 0.9 } })'
      check: doc
      hint:
        vi: "`$[]` nghĩa là mọi phần tử của mảng; `$mul` nhân giá trị."
        en: "`$[]` means every element of the array; `$mul` multiplies the value."
    - task:
        vi: Giá sản phẩm `"p1"` được sửa thành `23000` trong mọi đơn có nó. Chỉ đổi các dòng `"p1"`.
        en: The price of product `"p1"` is corrected to `23000` in every order that has it. Change only the `"p1"` lines.
      solution: 'db.orders.updateMany({ "lines.sku": "p1" }, { $set: { "lines.$[l].price": 23000 } }, { arrayFilters: [{ "l.sku": "p1" }] })'
      check: doc
      hint:
        vi: 'Đặt tên phần tử là `l` trong `"lines.$[l].price"`, rồi mô tả nó trong `arrayFilters: [{ "l.sku": "p1" }]`.'
        en: 'Name the element `l` in `"lines.$[l].price"`, then describe it in `arrayFilters: [{ "l.sku": "p1" }]`.'
    - task:
        vi: Đánh dấu `bulk` bằng `true` trên mọi dòng hàng có `qty` từ 4 trở lên, ở mọi đơn.
        en: Set `bulk` to `true` on every line with a `qty` of 4 or more, in every order.
      solution: 'db.orders.updateMany({ "lines.qty": { $gte: 4 } }, { $set: { "lines.$[big].bulk": true } }, { arrayFilters: [{ "big.qty": { $gte: 4 } }] })'
      check: doc
      hint:
        vi: "Điều kiện trong `arrayFilters` dùng được toán tử như `$gte`."
        en: "A condition in `arrayFilters` can use operators such as `$gte`."
quiz:
  - q:
      vi: 'Đơn 5 có hai dòng hàng cùng `qty` bằng 2. Lệnh `db.orders.updateOne({ _id: 5, "lines.qty": 2 }, { $set: { "lines.$.qty": 3 } })` sửa mấy dòng?'
      en: 'Order 5 has two lines with `qty` equal to 2. How many lines does `db.orders.updateOne({ _id: 5, "lines.qty": 2 }, { $set: { "lines.$.qty": 3 } })` change?'
    options:
      - vi: Cả hai dòng, vì cả hai khớp điều kiện
        en: Both lines, because both match the condition
      - vi: Chỉ dòng đầu tiên khớp
        en: Only the first line that matches
      - vi: Không dòng nào, vì có nhiều hơn một dòng khớp
        en: None, because more than one line matches
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý vì cả hai dòng đều khớp filter, nhưng `$` chỉ trỏ tới phần tử đầu tiên khớp điều kiện trên mảng. Muốn sửa mọi dòng khớp thì dùng `$[<id>]` với `arrayFilters`.'
      en: 'It sounds right because both lines match the filter, but `$` points only at the first element that matched the array condition. To change every matching line, use `$[<id>]` with `arrayFilters`.'
  - q:
      vi: 'Bạn muốn giảm giá mọi dòng của đơn 1, không cần điều kiện trên dòng. Đường dẫn nào đúng?'
      en: 'You want a discount on every line of order 1, with no condition on the lines. Which path is right?'
    options:
      - { vi: '`"lines.$.price"`', en: '`"lines.$.price"`' }
      - { vi: '`"lines.$[].price"`', en: '`"lines.$[].price"`' }
      - { vi: '`"lines.price"`', en: '`"lines.price"`' }
    answer: 1
    why:
      vi: '`$[]` là mọi phần tử của mảng. `$` cần một điều kiện trên mảng trong filter và chỉ sửa một phần tử; `"lines.price"` không trỏ vào từng phần tử của mảng.'
      en: '`$[]` is every element of the array. `$` needs an array condition in the filter and changes one element; `"lines.price"` does not point into each element of the array.'
---
## Mở bài

Khách của đơn 7 đổi số lượng một dòng hàng. Đọc cả mảng `lines` về ứng dụng, sửa, rồi ghi đè lại thì chậm và dễ mất thay đổi của người khác. Có cách nào sửa đúng một dòng ngay trong MongoDB?

## Ý chính

Ba cách trỏ vào phần tử của mảng trong update:

- `$`: phần tử đầu tiên khớp điều kiện trên mảng trong filter. Filter phải có điều kiện trên mảng đó, ví dụ `"lines.sku": "p3"`.
- `$[]`: mọi phần tử của mảng.
- `$[<id>]` cùng `arrayFilters`: mọi phần tử thỏa điều kiện mang tên `<id>`. Một đơn có hai dòng cùng điều kiện thì cả hai được sửa, điều `$` không làm được.

Tên `<id>` bắt đầu bằng chữ thường và chỉ có chữ, số. `arrayFilters` là đối số thứ ba của `updateOne`/`updateMany`.

Sửa tại chỗ như vậy tốt hơn đọc cả mảng về ứng dụng rồi ghi đè: lệnh là nguyên tử (atomic) trên tài liệu, và không làm mất thay đổi của người khác lên các phần tử khác.

Làm được: sửa đúng dòng hàng trong đơn mà không ghi lại cả mảng.

## Cú pháp

```text
{ $set: { "lines.$.qty": 4 } }            // first element matched by the filter
{ $set: { "lines.$[].qty": 4 } }          // every element
{ $set: { "lines.$[l].qty": 4 } }, { arrayFilters: [{ "l.sku": "p1" }] }
```

- `$` cần một điều kiện trên `lines` trong filter.
- `arrayFilters` là đối số thứ ba; mỗi `<id>` trong đường dẫn có đúng một điều kiện.

## Ví dụ

Đơn 1 thêm một gói `"p4"`, qua `$`:

```js
db.orders.updateOne({ _id: 1, "lines.sku": "p4" }, { $inc: { "lines.$.qty": 1 } })
```

Trong đơn 1, dòng `"p4"` đổi `qty` từ 1 thành 2; dòng `"p1"` đứng trước nó không bị chạm, vì `$` trỏ đúng phần tử đã khớp `"lines.sku": "p4"`.

Mọi đơn đã thanh toán được tặng thêm một đơn vị cho dòng rẻ hơn 30000:

```js
db.orders.updateMany(
  { status: "paid" },
  { $inc: { "lines.$[cheap].qty": 1 } },
  { arrayFilters: [{ "cheap.price": { $lt: 30000 } }] }
)
```

Ba đơn `paid` được xét. Dòng `"p1"` giá 25000 của đơn 1 lên 3, của đơn 6 lên 2. Đơn 5 khớp filter nhưng không dòng nào rẻ hơn 30000, nên giữ nguyên: một tài liệu khớp filter không bắt buộc phải có phần tử khớp `arrayFilters`.

## Lỗi hay gặp

Dùng `$` khi muốn sửa mọi dòng khớp:

```js
// WRONG: only the first line with qty 2 or more gets the flag
db.orders.updateMany({ "lines.qty": { $gte: 2 } }, { $set: { "lines.$.bulk": true } })
```

```js
// FIX: arrayFilters marks every matching line
db.orders.updateMany({ "lines.qty": { $gte: 2 } }, { $set: { "lines.$[l].bulk": true } }, { arrayFilters: [{ "l.qty": { $gte: 2 } }] })
```

Đơn 5 có hai dòng `qty` bằng 2: bản sai chỉ đánh dấu dòng đầu. Đơn 7 cũng vậy: `"p2"` (2) có cờ, `"p3"` (3) thì không. Lỗi này lặng lẽ, không có thông báo nào; chỉ đếm lại các dòng mới thấy. Khi một tài liệu có thể chứa nhiều phần tử khớp, dùng `$[<id>]`.

Ghi thẳng vào tên mảng thay vì vào từng phần tử:

```js
// WRONG: replaces the whole array with one number
db.orders.updateOne({ _id: 7 }, { $set: { lines: 4 } })
```

```js
// FIX: point at the element, keep the rest of the array
db.orders.updateOne({ _id: 7, "lines.sku": "p3" }, { $set: { "lines.$.qty": 4 } })
```

Bản sai biến `lines` của đơn 7 thành số `4`: cả hai dòng hàng mất. MongoDB không cảnh báo, vì `$set` cho phép đổi kiểu một trường. Bản sửa chỉ đổi `qty` của dòng `"p3"` thành 4 và giữ dòng `"p2"`.

## Thực hành

Bốn bước trên `orders`, mỗi bước bắt đầu lại từ dữ liệu gốc. Bước 1 sửa một dòng bằng `$`, nên filter phải có điều kiện trên `lines`. Bước 2 dùng `$[]` cùng `$mul` cho mọi dòng của một đơn. Bước 3 và 4 dùng `updateMany` với `arrayFilters`: một điều kiện bằng, rồi một điều kiện có toán tử. Sau mỗi bước, xem lại cả các dòng không được sửa: chúng phải giữ nguyên.

## Tóm tắt

- `$` sửa phần tử đầu tiên khớp điều kiện trên mảng trong filter.
- `$[]` sửa mọi phần tử của mảng.
- `$[<id>]` cùng `arrayFilters` sửa mọi phần tử thỏa điều kiện.
- Sửa tại chỗ là nguyên tử trên tài liệu và không ghi đè cả mảng.

# EN

## Opening

The customer of order 7 changes the quantity of one line. Reading the whole `lines` array into the application, editing it and writing it back is slow and can lose other people's changes. Can MongoDB change exactly one line in place?

## Key idea

Three ways to point at array elements in an update:

- `$`: the first element that matched the array condition in the filter. The filter must hold a condition on that array, such as `"lines.sku": "p3"`.
- `$[]`: every element of the array.
- `$[<id>]` with `arrayFilters`: every element that meets the condition named `<id>`. An order with two lines meeting it gets both changed, which `$` cannot do.

The `<id>` name starts with a lowercase letter and holds only letters and digits. `arrayFilters` is the third argument of `updateOne`/`updateMany`.

Updating in place beats reading the whole array into the application and writing it back: the command is atomic on the document and does not lose other clients' changes to other elements.

You can now: change exactly the right order lines without rewriting the whole array.

## Syntax

```text
{ $set: { "lines.$.qty": 4 } }            // first element matched by the filter
{ $set: { "lines.$[].qty": 4 } }          // every element
{ $set: { "lines.$[l].qty": 4 } }, { arrayFilters: [{ "l.sku": "p1" }] }
```

- `$` needs a condition on `lines` in the filter.
- `arrayFilters` is the third argument; each `<id>` in the path has exactly one condition.

## Example

Order 1 adds one more `"p4"`, through `$`:

```js
db.orders.updateOne({ _id: 1, "lines.sku": "p4" }, { $inc: { "lines.$.qty": 1 } })
```

In order 1, line `"p4"` goes from `qty` 1 to 2; line `"p1"` before it is untouched, because `$` points at exactly the element that matched `"lines.sku": "p4"`.

Every paid order gets one extra unit on lines cheaper than 30000:

```js
db.orders.updateMany(
  { status: "paid" },
  { $inc: { "lines.$[cheap].qty": 1 } },
  { arrayFilters: [{ "cheap.price": { $lt: 30000 } }] }
)
```

Three `paid` orders are considered. The `"p1"` line priced 25000 goes up to 3 in order 1 and to 2 in order 6. Order 5 matches the filter but has no line under 30000, so it stays as it was: a document that matches the filter need not hold an element that matches `arrayFilters`.

## Common mistakes

Using `$` when you meant every matching line:

```js
// WRONG: only the first line with qty 2 or more gets the flag
db.orders.updateMany({ "lines.qty": { $gte: 2 } }, { $set: { "lines.$.bulk": true } })
```

```js
// FIX: arrayFilters marks every matching line
db.orders.updateMany({ "lines.qty": { $gte: 2 } }, { $set: { "lines.$[l].bulk": true } }, { arrayFilters: [{ "l.qty": { $gte: 2 } }] })
```

Order 5 has two lines with `qty` equal to 2: the wrong version flags only the first. Order 7 is the same: `"p2"` (2) gets the flag, `"p3"` (3) does not. This mistake is silent, with no message; only counting the lines again shows it. When one document can hold several matching elements, use `$[<id>]`.

Writing to the array name instead of its elements:

```js
// WRONG: replaces the whole array with one number
db.orders.updateOne({ _id: 7 }, { $set: { lines: 4 } })
```

```js
// FIX: point at the element, keep the rest of the array
db.orders.updateOne({ _id: 7, "lines.sku": "p3" }, { $set: { "lines.$.qty": 4 } })
```

The wrong version turns the `lines` of order 7 into the number `4`: both lines are gone. MongoDB gives no warning, because `$set` may change a field's type. The fix changes only the `qty` of line `"p3"` to 4 and keeps line `"p2"`.

## Practice

Four steps on `orders`; each step starts again from the original data. Step 1 changes one line with `$`, so the filter needs a condition on `lines`. Step 2 uses `$[]` with `$mul` on every line of one order. Steps 3 and 4 use `updateMany` with `arrayFilters`: an equality condition, then a condition with an operator. After each step, also look at the lines that were not changed: they must stay as they were.

## Recap

- `$` changes the first element that matched the array condition in the filter.
- `$[]` changes every element of the array.
- `$[<id>]` with `arrayFilters` changes every element meeting the condition.
- An in-place update is atomic on the document and does not rewrite the whole array.
