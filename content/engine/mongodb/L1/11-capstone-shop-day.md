---
id: e-mg-l1-11
engine: mongodb
level: L1
module: query-ops
title: "Bài cuối L1: Một ngày ở cửa hàng"
title_en: "L1 capstone: A day at the shop"
kind: capstone
runtime: browser
minutes: 20
objectives:
  - vi: Kết hợp find, projection, toán tử truy vấn, sort và các lệnh ghi để xử lý việc thật của một cửa hàng.
    en: Combine find, projection, query operators, sort and write commands to handle a shop's real tasks.
  - vi: Giải thích vì sao một update trên một tài liệu là nguyên tử (atomic).
    en: Explain why an update on a single document is atomic.
requires: [e-mg-l1-06, e-mg-l1-08, e-mg-l1-10]
sources:
  - https://www.mongodb.com/docs/manual/crud/
  - https://www.mongodb.com/docs/manual/core/write-operations-atomicity/
lab:
  setup: |
    {"collections": {
      "customers": [
        {"_id": "c1", "name": "An", "tier": "gold", "tags": ["vip", "newsletter"]},
        {"_id": "c2", "name": "Binh", "tier": "silver", "tags": ["newsletter"]},
        {"_id": "c3", "name": "Chi", "tier": "silver", "tags": []},
        {"_id": "c4", "name": "Dung", "tier": "gold", "tags": ["vip"]},
        {"_id": "c5", "name": "Em", "tier": "bronze", "tags": []}
      ],
      "products": [
        {"_id": "p1", "name": "Green tea", "category": "drink", "price": 25000, "stock": 40},
        {"_id": "p2", "name": "Coffee beans", "category": "drink", "price": 120000, "stock": 8},
        {"_id": "p3", "name": "Rice cracker", "category": "snack", "price": 15000, "stock": 0},
        {"_id": "p4", "name": "Dried mango", "category": "snack", "price": 45000, "stock": 25},
        {"_id": "p5", "name": "Tea set", "category": "gift", "price": 350000, "stock": 3},
        {"_id": "p6", "name": "Lotus tea", "category": "drink", "price": 60000, "stock": 12}
      ],
      "orders": [
        {"_id": 1, "customer": "c1", "status": "paid", "lines": [{"sku": "p1", "qty": 2, "price": 25000}, {"sku": "p4", "qty": 1, "price": 45000}]},
        {"_id": 2, "customer": "c2", "status": "shipped", "lines": [{"sku": "p2", "qty": 1, "price": 120000}]},
        {"_id": 3, "customer": "c1", "status": "shipped", "lines": [{"sku": "p5", "qty": 1, "price": 350000}, {"sku": "p1", "qty": 4, "price": 25000}]},
        {"_id": 4, "customer": "c3", "status": "cancelled", "lines": [{"sku": "p3", "qty": 10, "price": 15000}]},
        {"_id": 5, "customer": "c4", "status": "paid", "lines": [{"sku": "p6", "qty": 2, "price": 60000}, {"sku": "p4", "qty": 2, "price": 45000}]},
        {"_id": 6, "customer": "c2", "status": "paid", "lines": [{"sku": "p1", "qty": 1, "price": 25000}]},
        {"_id": 7, "customer": "c5", "status": "shipped", "lines": [{"sku": "p2", "qty": 2, "price": 120000}, {"sku": "p3", "qty": 3, "price": 15000}]},
        {"_id": 8, "customer": "c1", "status": "paid", "lines": [{"sku": "p6", "qty": 1, "price": 60000}]}
      ]
    }}
  steps:
    - task:
        vi: Sáng nay quản lý hỏi đồ uống nào sắp hết. Lấy `name` và `stock` (không `_id`) của các sản phẩm nhóm `"drink"` còn dưới 15 đơn vị, ít hàng nhất trước.
        en: This morning the manager asks which drinks are running out. Return `name` and `stock` (no `_id`) of the `"drink"` products with fewer than 15 units, lowest stock first.
      solution: 'db.products.find({ category: "drink", stock: { $lt: 15 } }, { name: 1, stock: 1, _id: 0 }).sort({ stock: 1 })'
      check: doc
      ordered: true
      hint:
        vi: Hai điều kiện trong một filter, projection bỏ `_id`, rồi `sort` tăng dần theo tồn kho.
        en: Two conditions in one filter, a projection without `_id`, then an ascending `sort` on stock.
    - task:
        vi: Hàng về. Cộng 20 vào `stock` của mọi sản phẩm còn dưới 5 đơn vị.
        en: A delivery arrives. Add 20 to the `stock` of every product with fewer than 5 units.
      solution: 'db.products.updateMany({ stock: { $lt: 5 } }, { $inc: { stock: 20 } })'
      check: doc
      hint:
        vi: "`updateMany` với filter `$lt` và `$inc`."
        en: "`updateMany` with a `$lt` filter and `$inc`."
    - task:
        vi: Kho muốn biết những đơn có dòng hàng số lượng lớn. Lấy `_id` và `customer` của các đơn có ít nhất một dòng với `qty` từ 4 trở lên.
        en: The warehouse wants the orders with a bulk line. Return `_id` and `customer` of the orders that have at least one line with `qty` of 4 or more.
      solution: 'db.orders.find({ "lines.qty": { $gte: 4 } }, { customer: 1 })'
      check: doc
      hint:
        vi: 'Chỉ một điều kiện trên mảng nên dot notation `"lines.qty"` là đủ.'
        en: 'There is only one condition on the array, so dot notation `"lines.qty"` is enough.'
    - task:
        vi: Khách `"c5"` được lên hạng. Trong một lệnh, đặt `tier` thành `"silver"` và thêm nhãn `"upgraded"` vào `tags`.
        en: Customer `"c5"` moves up a tier. In one command, set `tier` to `"silver"` and append the tag `"upgraded"` to `tags`.
      solution: 'db.customers.updateOne({ _id: "c5" }, { $set: { tier: "silver" }, $push: { tags: "upgraded" } })'
      check: doc
      hint:
        vi: Một tài liệu update có thể chứa nhiều toán tử trên các trường khác nhau.
        en: One update document can hold several operators on different fields.
    - task:
        vi: Cuối ngày, đếm số đơn có `status` là `"paid"`.
        en: At the end of the day, count the orders whose `status` is `"paid"`.
      solution: 'db.orders.countDocuments({ status: "paid" })'
      check: doc
      hint:
        vi: "`countDocuments` với một điều kiện bằng."
        en: "`countDocuments` with one equality condition."
quiz:
  - q:
      vi: Ở bước 4, nếu máy chủ dừng đúng lúc đang ghi thì tài liệu của `"c5"` có thể ở trạng thái nào?
      en: In step 4, if the server stops in the middle of the write, what state can the `"c5"` document be in?
    options:
      - vi: Hoặc đã có cả hai thay đổi, hoặc chưa có thay đổi nào
        en: Either both changes are there or neither is
      - vi: Có thể đã đổi `tier` nhưng chưa thêm nhãn
        en: It may have the new `tier` but not the new tag
      - vi: Có thể mất cả mảng `tags`
        en: It may lose the whole `tags` array
    answer: 0
    trap: 1
    why:
      vi: Nghe hợp lý vì lệnh có hai toán tử như hai bước, nhưng một thao tác ghi trên một tài liệu là nguyên tử, kể cả khi nó sửa nhiều trường và tài liệu nhúng (embedded document). Cần nhiều tài liệu cùng đổi một lúc thì mới phải nghĩ tới transaction.
      en: It sounds right because the command has two operators like two steps, but a write on a single document is atomic, even when it changes several fields and embedded documents. Only when several documents must change together do you need a transaction.
  - q:
      vi: 'Ở bước 3, vì sao dùng `"lines.qty"` mà không cần `$elemMatch`?'
      en: 'In step 3, why is `"lines.qty"` enough, without `$elemMatch`?'
    options:
      - vi: Vì chỉ có một điều kiện trên mảng, nên phần tử nào thỏa cũng đúng ý
        en: Because there is only one condition on the array, so any element that meets it is what you want
      - vi: Vì `$elemMatch` chỉ dùng cho mảng giá trị đơn
        en: Because `$elemMatch` only works on arrays of plain values
      - vi: Vì dot notation luôn xét cùng một phần tử
        en: Because dot notation always looks at the same element
    answer: 0
    trap: 2
    why:
      vi: 'Nghe hợp lý vì kết quả bước 3 đúng, nhưng dot notation không giữ các điều kiện trên cùng một phần tử. Ở đây chỉ có một điều kiện nên không sao; có hai điều kiện trên cùng một dòng thì cần `$elemMatch`.'
      en: 'It sounds right because step 3 gives the right result, but dot notation does not keep conditions on the same element. Here there is only one condition, so it does not matter; with two conditions on the same line you need `$elemMatch`.'
---
## Mở bài

Một ngày ở cửa hàng: quản lý hỏi hàng sắp hết, hàng về, kho tìm đơn số lượng lớn, một khách được lên hạng, cuối ngày đếm đơn đã trả. Mỗi việc là một lệnh. Bạn làm được cả năm không?

## Ý chính

Bài cuối của L1 gom mọi thứ đã học vào một ngày làm việc: tìm và chiếu trường, lọc theo khoảng và trong mảng, sắp xếp, đếm, sửa nhiều tài liệu và sửa một tài liệu bằng nhiều toán tử.

Mọi thao tác ghi trên một tài liệu là nguyên tử. Đó là lý do mô hình tài liệu thường nhúng dữ liệu đi cùng nhau (như các dòng hàng trong đơn) vào cùng một tài liệu: một lệnh đổi được tất cả, không cần transaction.

Làm được: tự xử lý các yêu cầu hằng ngày của một cửa hàng trên MongoDB bằng các lệnh CRUD.

## Ví dụ

```js
db.orders.find({ status: "shipped" }, { customer: 1, _id: 0 }).sort({ customer: 1 })
```

## Thực hành

Năm bước, rồi hai câu hỏi kết luận. Mỗi bước chạy trên dữ liệu gốc.

## Tóm tắt

- Đọc: filter, projection, toán tử so sánh và mảng, `sort`, `countDocuments`.
- Ghi: `updateMany` cho nhiều tài liệu, nhiều toán tử trong một `updateOne`.
- Một lệnh ghi trên một tài liệu là nguyên tử.
- Dot notation đủ cho một điều kiện trên mảng; nhiều điều kiện trên cùng phần tử cần `$elemMatch`.

# EN

## Opening

A day at the shop: the manager asks what is running low, stock arrives, the warehouse looks for bulk orders, a customer moves up a tier, and at the end of the day the paid orders are counted. Each task is one command. Can you do all five?

## Key idea

The L1 capstone brings everything together in one working day: find with projection, range and array filters, sorting, counting, updating many documents and updating one document with several operators.

Every write on a single document is atomic. That is why the document model often embeds data that belongs together (such as an order's lines) in one document: one command changes all of it, without a transaction.

You can now: handle a shop's everyday requests on MongoDB with CRUD commands on your own.

## Example

```js
db.orders.find({ status: "shipped" }, { customer: 1, _id: 0 }).sort({ customer: 1 })
```

## Practice

Five steps, then two closing questions. Every step runs on the original data.

## Recap

- Read: filter, projection, comparison and array operators, `sort`, `countDocuments`.
- Write: `updateMany` for many documents, several operators in one `updateOne`.
- A write on one document is atomic.
- Dot notation is enough for one condition on an array; several conditions on the same element need `$elemMatch`.
