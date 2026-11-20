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
---
## Ý chính

Ba cách trỏ vào phần tử của mảng trong update:

- `$`: phần tử đầu tiên khớp điều kiện trên mảng trong filter. Filter phải có điều kiện trên mảng đó, ví dụ `"lines.sku": "p3"`.
- `$[]`: mọi phần tử của mảng.
- `$[<id>]` cùng `arrayFilters`: mọi phần tử thỏa điều kiện mang tên `<id>`. Một đơn có hai dòng cùng điều kiện thì cả hai được sửa, điều `$` không làm được.

Tên `<id>` bắt đầu bằng chữ thường và chỉ có chữ, số. `arrayFilters` là đối số thứ ba của `updateOne`/`updateMany`.

Sửa tại chỗ như vậy tốt hơn đọc cả mảng về ứng dụng rồi ghi đè: lệnh là nguyên tử (atomic) trên tài liệu, và không làm mất thay đổi của người khác lên các phần tử khác.

Làm được: sửa đúng dòng hàng trong đơn mà không ghi lại cả mảng.

## Ví dụ

```js
db.orders.updateMany(
  { status: "paid" },
  { $inc: { "lines.$[cheap].qty": 1 } },
  { arrayFilters: [{ "cheap.price": { $lt: 30000 } }] }
)
```

## Thực hành

Bốn bước trên `orders`, mỗi bước bắt đầu lại từ dữ liệu gốc.

# EN

## Key idea

Three ways to point at array elements in an update:

- `$`: the first element that matched the array condition in the filter. The filter must hold a condition on that array, such as `"lines.sku": "p3"`.
- `$[]`: every element of the array.
- `$[<id>]` with `arrayFilters`: every element that meets the condition named `<id>`. An order with two lines meeting it gets both changed, which `$` cannot do.

The `<id>` name starts with a lowercase letter and holds only letters and digits. `arrayFilters` is the third argument of `updateOne`/`updateMany`.

Updating in place beats reading the whole array into the application and writing it back: the command is atomic on the document and does not lose other clients' changes to other elements.

You can now: change exactly the right order lines without rewriting the whole array.

## Example

```js
db.orders.updateMany(
  { status: "paid" },
  { $inc: { "lines.$[cheap].qty": 1 } },
  { arrayFilters: [{ "cheap.price": { $lt: 30000 } }] }
)
```

## Practice

Four steps on `orders`; each step starts again from the original data.
