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
figures: [{ name: mg-elemmatch, at: pitfalls }]
objectives:
  - vi: Lọc tài liệu có mảng chứa một giá trị, chứa đủ nhiều giá trị (`$all`) hoặc có độ dài cho trước (`$size`).
    en: Filter documents whose array contains a value, contains several values (`$all`) or has a given length (`$size`).
  - vi: Dùng `$elemMatch` khi nhiều điều kiện phải đúng trên cùng một phần tử của mảng tài liệu.
    en: Use `$elemMatch` when several conditions must hold on the same element of an array of documents.
requires: [e-mg-l1-07]
sources:
  - { url: https://www.mongodb.com/docs/manual/tutorial/query-arrays/, title_vi: "Truy vấn mảng" }
  - { url: https://www.mongodb.com/docs/manual/tutorial/query-array-of-documents/, title_vi: "Truy vấn mảng tài liệu con" }
  - { url: https://www.mongodb.com/docs/manual/reference/operator/query/elemmatch/, title_vi: "$elemMatch" }
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
  trap: 0
  why:
    vi: "Nghe hợp lý vì cả hai điều kiện nói về dòng hàng (một phần tử của mảng `lines`), nhưng không có `$elemMatch` thì mỗi điều kiện được thỏa bởi bất kỳ phần tử nào, không cần cùng một phần tử. Đơn 1 có dòng `p4` với qty 1 và dòng `p1` với qty 2: điều kiện `sku` khớp dòng `p4`, điều kiện `qty` khớp dòng `p1`, nên đơn 1 vẫn được trả. Đơn 5 có dòng `p4` với qty 2, đủ cả hai điều kiện, nên \"không đơn nào\" cũng sai."
    en: "It sounds right because both conditions talk about order lines (elements of the `lines` array), but without `$elemMatch` each condition can be met by any element, not necessarily the same one. Order 1 has a `p4` line with qty 1 and a `p1` line with qty 2: the `sku` condition matches the `p4` line, the `qty` condition the `p1` line, so order 1 is still returned. Order 5 has a `p4` line with qty 2, meeting both conditions, so \"no order\" is wrong too."
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
quiz:
  - q:
      vi: 'Sản phẩm `"p6"` có `tags: ["hot", "gift"]`. `db.products.find({ tags: ["gift", "hot"] })` có trả về `"p6"` không?'
      en: 'Product `"p6"` has `tags: ["hot", "gift"]`. Does `db.products.find({ tags: ["gift", "hot"] })` return `"p6"`?'
    options:
      - vi: Có, vì mảng có đủ hai nhãn
        en: Yes, because the array holds both tags
      - vi: Không, vì so bằng cả mảng cần đúng phần tử và đúng thứ tự
        en: No, because equality on a whole array needs the same elements in the same order
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý vì nhãn nào cũng có mặt, nhưng một mảng làm giá trị so bằng là so khớp chính xác, kể cả thứ tự: `"p6"` lưu `"hot"` trước, filter ghi `"gift"` trước, nên không khớp. Không quan tâm thứ tự thì dùng `$all`, toán tử chỉ đòi mảng chứa đủ các giá trị.'
      en: 'It sounds right because every tag is present, but an array used as an equality value is an exact match, order included: `"p6"` stores `"hot"` first while the filter puts `"gift"` first, so it does not match. When order does not matter, use `$all`, which only requires the array to hold every value.'
---
## Mở bài

Kho hỏi: đơn nào có một dòng sản phẩm `"p4"` với số lượng từ 2 trở lên? Các dòng hàng nằm trong một mảng tài liệu. Viết hai điều kiện thế nào để chúng cùng nói về một dòng?

## Ý chính

Với mảng giá trị như `tags`:

- `{ tags: "gift" }` khớp khi có ít nhất một phần tử bằng `"gift"`;
- `{ tags: ["hot", "gift"] }` chỉ khớp mảng giống hệt, cả thứ tự;
- `$all` đòi mảng chứa mọi giá trị đã cho, không quan tâm thứ tự;
- `$size` so độ dài mảng (chỉ so bằng, không nhận `$gt`).

Với mảng tài liệu như `lines`, `"lines.sku"` nhìn vào trường `sku` của mọi phần tử.

Bẫy quan trọng: nhiều điều kiện dạng dot notation trên cùng một mảng có thể được thỏa bởi các phần tử khác nhau. Muốn mọi điều kiện đúng trên cùng một phần tử thì dùng `$elemMatch`.

Làm được: tìm đúng tài liệu theo nội dung mảng, kể cả mảng tài liệu nhúng (embedded document).

## Cú pháp

```text
{ <array>: <value> }
{ <array>: { $all: [ <value>, <value> ] } }
{ <array>: { $size: <n> } }
{ <array>: { $elemMatch: { <field>: <condition>, <field>: <condition> } } }
```

- Giá trị đơn: khớp khi có một phần tử bằng nó.
- `$elemMatch`: mọi điều kiện bên trong phải đúng trên cùng một phần tử.

## Ví dụ

Sản phẩm có nhãn `"gift"`:

```js
db.products.find({ tags: "gift" })
```

Ba sản phẩm `p4`, `p5`, `p6`: mỗi cái có `"gift"` ở đâu đó trong mảng. Một giá trị đơn so với một trường mảng nghĩa là "mảng có chứa phần tử này", không cần toán tử nào.

Sản phẩm có cả `"hot"` lẫn `"cold"`, thứ tự nào cũng được:

```js
db.products.find({ tags: { $all: ["cold", "hot"] } })
```

Chỉ `p1` (Green tea): mảng của nó là `["hot", "cold"]`, ngược thứ tự với danh sách trong `$all`, nhưng vẫn khớp.

Đơn có một dòng vừa số lượng từ 5 vừa giá dưới 20000:

```js
db.orders.find({ lines: { $elemMatch: { qty: { $gte: 5 }, price: { $lt: 20000 } } } })
```

Kết quả là đơn 4, có một dòng `p3` số lượng 10 giá 15000. Cả hai điều kiện được thử trên cùng một phần tử của `lines`.

## Lỗi hay gặp

Hai điều kiện dot notation, tưởng cùng nói về một dòng:

```js
// WRONG: sku and qty may come from different lines (orders 1 and 5)
db.orders.find({ "lines.sku": "p4", "lines.qty": { $gte: 2 } }, { _id: 1 })
```

```js
// FIX: $elemMatch puts both conditions on one line (order 5)
db.orders.find({ lines: { $elemMatch: { sku: "p4", qty: { $gte: 2 } } } }, { _id: 1 })
```

Bản sai trả đơn 1 và 5; bản sửa chỉ trả đơn 5. Ở đơn 1, một dòng có `sku` là `p4` và một dòng khác có số lượng từ 2, nên mỗi điều kiện tìm được phần tử riêng. Khi nhiều điều kiện phải đúng trên cùng một phần tử, dùng `$elemMatch`.

So bằng cả mảng khi không quan tâm thứ tự:

```js
// WRONG: an exact array, so ["hot", "gift"] does not match
db.products.find({ tags: ["gift", "hot"] })
```

```js
// FIX: $all ignores the order
db.products.find({ tags: { $all: ["gift", "hot"] } })
```

Bản sai trả rỗng: so bằng cả mảng đòi đúng các phần tử theo đúng thứ tự, mà `p6` lưu `["hot", "gift"]`. Bản sửa trả `p6`. Chỉ so cả mảng khi thứ tự thật sự có nghĩa.

Hình cuối mục này đặt đơn 1 và đơn 5 của lab cạnh nhau: với dấu chấm, đơn 1 khớp nhờ hai dòng khác nhau; với `$elemMatch`, chỉ đơn 5 có một dòng đủ cả hai điều kiện.

## Thực hành

Trước khi làm, đoán câu hỏi dự đoán: điều kiện dot notation không có `$elemMatch` trả về đơn nào? Rồi làm năm bước. Ba bước đầu trên `products`: một nhãn, hai nhãn bất kể thứ tự, rồi mảng rỗng bằng `$size`. Hai bước sau trên `orders`: một điều kiện dot notation vào mảng tài liệu, rồi hai điều kiện phải đúng trên cùng một dòng.

## Tóm tắt

- Giá trị đơn trên mảng khớp khi một phần tử bằng nó.
- Mảng làm giá trị so bằng cần đúng phần tử và thứ tự; `$all` bỏ qua thứ tự.
- `$size` so độ dài mảng bằng một số.
- Dot notation đi xuyên qua mảng tài liệu, mỗi điều kiện có thể khớp phần tử khác.
- `$elemMatch` bắt mọi điều kiện đúng trên cùng một phần tử.

# EN

## Opening

The warehouse asks: which orders have one line for product `"p4"` with a quantity of 2 or more? The lines sit in an array of documents. How do you write two conditions so they talk about the same line?

## Key idea

For an array of values such as `tags`:

- `{ tags: "gift" }` matches when at least one element equals `"gift"`;
- `{ tags: ["hot", "gift"] }` matches only that exact array, order included;
- `$all` requires the array to hold every given value, in any order;
- `$size` compares the array's length (equality only, no `$gt`).

For an array of documents such as `lines`, `"lines.sku"` looks at the `sku` field of every element.

The key trap: several dot-notation conditions on the same array can be met by different elements. When all conditions must hold on the same element, use `$elemMatch`.

You can now: find the right documents by what their arrays hold, including arrays of embedded documents.

## Syntax

```text
{ <array>: <value> }
{ <array>: { $all: [ <value>, <value> ] } }
{ <array>: { $size: <n> } }
{ <array>: { $elemMatch: { <field>: <condition>, <field>: <condition> } } }
```

- A plain value: matches when one element equals it.
- `$elemMatch`: every condition inside must hold on the same element.

## Example

Products tagged `"gift"`:

```js
db.products.find({ tags: "gift" })
```

Three products `p4`, `p5`, `p6`: each has `"gift"` somewhere in its array. A single value compared with an array field means "the array contains this element", with no operator needed.

Products with both `"hot"` and `"cold"`, in any order:

```js
db.products.find({ tags: { $all: ["cold", "hot"] } })
```

Only `p1` (Green tea): its array is `["hot", "cold"]`, the reverse of the list in `$all`, and it still matches.

Orders with one line that has a quantity of at least 5 and a price under 20000:

```js
db.orders.find({ lines: { $elemMatch: { qty: { $gte: 5 }, price: { $lt: 20000 } } } })
```

The result is order 4, with one line of `p3` at quantity 10 and price 15000. Both conditions are tried on the same element of `lines`.

## Common mistakes

Two dot-notation conditions, expected to talk about one line:

```js
// WRONG: sku and qty may come from different lines (orders 1 and 5)
db.orders.find({ "lines.sku": "p4", "lines.qty": { $gte: 2 } }, { _id: 1 })
```

```js
// FIX: $elemMatch puts both conditions on one line (order 5)
db.orders.find({ lines: { $elemMatch: { sku: "p4", qty: { $gte: 2 } } } }, { _id: 1 })
```

The wrong version returns orders 1 and 5; the fix returns only order 5. In order 1, one line has `sku` `p4` and another line has a quantity of at least 2, so each condition finds its own element. When several conditions must hold on the same element, use `$elemMatch`.

Equality on a whole array when order does not matter:

```js
// WRONG: an exact array, so ["hot", "gift"] does not match
db.products.find({ tags: ["gift", "hot"] })
```

```js
// FIX: $all ignores the order
db.products.find({ tags: { $all: ["gift", "hot"] } })
```

The wrong version returns nothing: equality on a whole array needs exactly those elements in exactly that order, and `p6` stores `["hot", "gift"]`. The fix returns `p6`. Compare a whole array only when the order really matters.

The figure at the end of this section puts the lab's orders 1 and 5 side by side: with dot notation, order 1 matches through two different lines; with `$elemMatch`, only order 5 has one line meeting both conditions.

## Practice

Before you start, answer the prediction: which orders does the dot-notation filter without `$elemMatch` return? Then do the five steps. The first three are on `products`: one tag, two tags in any order, then an empty array with `$size`. The last two are on `orders`: one dot-notation condition into an array of documents, then two conditions that must hold on the same line.

## Recap

- A plain value on an array matches when one element equals it.
- An array as an equality value needs the same elements in order; `$all` ignores order.
- `$size` compares an array's length with a number.
- Dot notation reaches through an array of documents; each condition may match a different element.
- `$elemMatch` makes every condition hold on the same element.
