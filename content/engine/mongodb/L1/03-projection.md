---
id: e-mg-l1-03
engine: mongodb
level: L1
module: crud
title: Chỉ lấy trường cần dùng (projection)
title_en: Returning only the fields you need (projection)
kind: lab
runtime: browser
minutes: 8
figures: [{ name: mg-projection, at: idea }]
objectives:
  - vi: Viết projection kiểu chọn (`1`) hoặc kiểu bỏ (`0`) và biết không được trộn hai kiểu.
    en: Write an include (`1`) or exclude (`0`) projection and know the two styles cannot be mixed.
  - vi: Bỏ `_id` khỏi kết quả và lấy một trường trong tài liệu nhúng (embedded document).
    en: Drop `_id` from the result and return one field of an embedded document.
requires: [e-mg-l1-02]
sources:
  - https://www.mongodb.com/docs/manual/tutorial/project-fields-from-query-results/
lab:
  setup: |
    {"collections": {
      "products": [
        {"_id": "p1", "name": "Green tea", "category": "drink", "price": 25000, "stock": 40, "tags": ["hot", "cold"]},
        {"_id": "p2", "name": "Coffee beans", "category": "drink", "price": 120000, "stock": 8, "tags": ["hot"]},
        {"_id": "p3", "name": "Rice cracker", "category": "snack", "price": 15000, "stock": 0, "tags": []},
        {"_id": "p4", "name": "Dried mango", "category": "snack", "price": 45000, "stock": 25, "tags": ["gift"]},
        {"_id": "p5", "name": "Tea set", "category": "gift", "price": 350000, "stock": 3, "tags": ["gift", "fragile"]},
        {"_id": "p6", "name": "Lotus tea", "category": "drink", "price": 60000, "stock": 12, "tags": ["hot", "gift"]}
      ],
      "customers": [
        {"_id": "c1", "name": "An", "tier": "gold", "address": {"city": "Da Nang", "district": "Hai Chau"}},
        {"_id": "c2", "name": "Binh", "tier": "silver", "address": {"city": "Hue", "district": "Phu Hoi"}},
        {"_id": "c3", "name": "Chi", "tier": "silver", "address": {"city": "Da Nang", "district": "Son Tra"}}
      ]
    }}
  steps:
    - task:
        vi: Lấy `name` và `price` của mọi sản phẩm nhóm `"drink"`, không kèm `_id`.
        en: Return `name` and `price` of every product in category `"drink"`, without `_id`.
      solution: 'db.products.find({ category: "drink" }, { name: 1, price: 1, _id: 0 })'
      check: doc
      hint:
        vi: "Projection là đối số thứ hai của `find`. `_id` luôn có mặt trừ khi bạn ghi `_id: 0`."
        en: "The projection is the second argument of `find`. `_id` is always returned unless you write `_id: 0`."
    - task:
        vi: Lấy `name` và chỉ trường `city` trong `address` của mọi khách, không kèm `_id`.
        en: Return `name` and only the `city` field of `address` for every customer, without `_id`.
      solution: 'db.customers.find({}, { name: 1, "address.city": 1, _id: 0 })'
      check: doc
      hint:
        vi: 'Trong projection cũng dùng dot notation: `"address.city": 1`.'
        en: 'Projections use dot notation too: `"address.city": 1`.'
    - task:
        vi: Lấy mọi sản phẩm với đủ trường, trừ `tags` và `stock`.
        en: Return every product with all its fields except `tags` and `stock`.
      solution: 'db.products.find({}, { tags: 0, stock: 0 })'
      check: doc
      hint:
        vi: Kiểu bỏ ghi `0` cho các trường không muốn thấy.
        en: The exclude style writes `0` for the fields you do not want.
quiz:
  - q:
      vi: 'Bạn viết `db.products.find({}, { name: 1, stock: 0 })` để lấy tên và bỏ tồn kho. Chuyện gì xảy ra?'
      en: 'You write `db.products.find({}, { name: 1, stock: 0 })` to return the name and drop the stock. What happens?'
    options:
      - vi: Trả về `_id` và `name` của mọi sản phẩm
        en: It returns `_id` and `name` of every product
      - vi: Lệnh bị từ chối vì trộn kiểu chọn và kiểu bỏ
        en: The command is refused because it mixes include and exclude
      - vi: Trả về mọi trường trừ `stock`
        en: It returns every field except `stock`
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý vì `stock` vốn không có trong kiểu chọn, nhưng MongoDB không đoán ý: một projection chỉ được là kiểu chọn hoặc kiểu bỏ, và gặp cả `1` lẫn `0` thì từ chối cả lệnh, không trả về gì. Vì vậy nó cũng không tự coi đây là kiểu bỏ để trả mọi trường trừ `stock`. Ngoại lệ duy nhất là `_id: 0`. Viết `{ name: 1 }` là đủ: trường không ghi trong kiểu chọn đã bị bỏ.'
      en: 'It sounds right because `stock` is left out of an include projection anyway, but MongoDB does not guess: a projection is either include or exclude, and when it sees both `1` and `0` it refuses the whole command and returns nothing. So it does not treat it as exclude and return every field except `stock` either. The only exception is `_id: 0`. Writing `{ name: 1 }` is enough: a field not listed in an include projection is already dropped.'
  - q:
      vi: '`db.customers.find({}, { "address.city": 1 })` trả về những trường nào cho khách `c1`?'
      en: 'Which fields does `db.customers.find({}, { "address.city": 1 })` return for customer `c1`?'
    options:
      - vi: '`_id` và `address` chỉ còn `city` bên trong'
        en: '`_id` and `address` with only `city` inside'
      - vi: 'Chỉ một trường phẳng `city`'
        en: 'Only a flat field `city`'
      - vi: '`_id` và cả `address`, gồm `city` và `district`'
        en: '`_id` and the whole `address`, with `city` and `district`'
    answer: 0
    trap: 1
    why:
      vi: 'Nghe hợp lý nếu nghĩ projection kéo trường ra ngoài như bí danh cột trong SQL, nhưng projection giữ nguyên hình dạng tài liệu: `address` vẫn là tài liệu nhúng, chỉ còn `city`; `district` bị cắt vì projection chọn đúng đường dẫn `"address.city"`, không phải cả `address`. `_id` có mặt vì không ghi `_id: 0`. Đổi tên hay kéo phẳng trường là việc của `$project` trong aggregation (L2).'
      en: 'It sounds right if a projection lifts the field out like a column alias in SQL, but a projection keeps the document shape: `address` stays an embedded document with only `city`; `district` is cut because the projection selects the exact path `"address.city"`, not the whole `address`. `_id` is there because `_id: 0` is not written. Renaming or flattening a field is the job of `$project` in an aggregation (L2).'
---
## Mở bài

Màn hình danh sách chỉ cần tên và giá, nhưng mỗi sản phẩm có sáu trường. Gửi hết về rồi bỏ đi ở ứng dụng là phí. Làm sao để MongoDB chỉ trả đúng các trường cần?

## Ý chính

Đối số thứ hai của `find` là projection: nó chọn trường nào xuất hiện trong kết quả. Có hai kiểu:

- kiểu chọn: `{ name: 1, price: 1 }` trả về đúng các trường đó (cộng `_id`);
- kiểu bỏ: `{ tags: 0 }` trả về mọi trường trừ các trường đã ghi.

Không được trộn `1` và `0` trong cùng projection. Ngoại lệ duy nhất là `_id: 0`, được phép trong kiểu chọn.

Với trường lồng, `"address.city": 1` trả về `address` chỉ còn `city` bên trong. Trả ít trường hơn giúp gửi ít dữ liệu qua mạng hơn.

Projection không lọc tài liệu: số tài liệu trả về do bộ lọc (đối số thứ nhất) quyết định, projection chỉ cắt bớt trường của từng tài liệu. Nếu một tài liệu thiếu trường bạn chọn, nó vẫn có mặt trong kết quả, chỉ là không có trường đó. Vì collection không ép một lược đồ chung, hai tài liệu trong cùng kết quả có thể có số trường khác nhau.

Làm được: lấy đúng những trường một màn hình cần, bỏ `_id` khi không dùng.

Hình từng bước ở cuối mục này cho tài liệu `p1` đi qua ba projection: kiểu chọn, kiểu chọn kèm `_id: 0`, rồi kiểu bỏ.

## Cú pháp

```text
db.<collection>.find(<filter>, { <field>: 1, "<embedded>.<field>": 1, _id: 0 })
db.<collection>.find(<filter>, { <field>: 0, <field>: 0 })
```

- Kiểu chọn: liệt kê trường muốn giữ với `1`; `_id` luôn có trừ khi ghi `_id: 0`.
- Kiểu bỏ: liệt kê trường muốn bỏ với `0`.
- Không trộn hai kiểu, trừ `_id: 0`.

## Ví dụ

Tên của sản phẩm giá 25000, không kèm `_id`:

```js
db.products.find({ price: 25000 }, { name: 1, _id: 0 })
```

Kết quả: `{ name: "Green tea" }`. Chỉ còn một trường, vì `_id` đã bị bỏ và chỉ `name` được chọn.

Mọi trường của các đồ uống trừ `tags`:

```js
db.products.find({ category: "drink" }, { tags: 0 })
```

Ba đồ uống `p1`, `p2`, `p6` trở về với `_id`, `name`, `category`, `price`, `stock`; chỉ `tags` biến mất. Kiểu bỏ hợp khi tài liệu có nhiều trường và bạn chỉ muốn giấu vài trường.

Tên và quận của khách, quận nằm trong `address`:

```js
db.customers.find({}, { name: 1, "address.district": 1, _id: 0 })
```

Mỗi khách trở về với `name` và một `address` chỉ còn `district`, ví dụ `{ name: "An", address: { district: "Hai Chau" } }`: hình dạng lồng được giữ nguyên.

## Lỗi hay gặp

Trộn kiểu chọn và kiểu bỏ:

```js
// ERROR mingo
db.products.find({}, { name: 1, stock: 0 })
```

Chỉ cần `{ name: 1 }`: trường không ghi trong kiểu chọn đã bị bỏ. Mã `mingo` là của bộ chạy trong trình duyệt; máy chủ MongoDB thật cũng từ chối projection này, với thông báo và mã lỗi của nó.

Quên rằng `_id` luôn đi kèm:

```js
// WRONG: _id comes back too
db.products.find({ category: "gift" }, { name: 1 })
```

```js
// FIX: drop it explicitly
db.products.find({ category: "gift" }, { name: 1, _id: 0 })
```

Bản sai trả `{ name: "Tea set", _id: "p5" }` dù bạn chỉ chọn `name`. Ứng dụng đọc kết quả theo đúng danh sách trường sẽ gặp một trường thừa; ghi `_id: 0` khi không cần nó.

## Thực hành

Ba bước trên `products` và `customers`. Bước 1 dùng kiểu chọn và bỏ `_id`. Bước 2 chọn một trường trong tài liệu nhúng bằng dot notation. Bước 3 đổi sang kiểu bỏ để giữ mọi trường trừ hai trường. Sau mỗi bước, so số trường trong kết quả với số trường của tài liệu gốc.

## Tóm tắt

- Projection là đối số thứ hai của `find`.
- Kiểu chọn `1` giữ trường đã ghi, kiểu bỏ `0` bỏ trường đã ghi.
- Không trộn hai kiểu; chỉ `_id: 0` được đi cùng kiểu chọn.
- Dot notation chọn một trường trong tài liệu nhúng mà vẫn giữ hình dạng.

# EN

## Opening

The list screen needs only the name and price, but each product has six fields. Sending them all and dropping them in the application is waste. How do you make MongoDB return only the fields you need?

## Key idea

The second argument of `find` is the projection: it picks which fields appear in the result. There are two styles:

- include: `{ name: 1, price: 1 }` returns exactly those fields (plus `_id`);
- exclude: `{ tags: 0 }` returns every field except the listed ones.

You cannot mix `1` and `0` in one projection. The only exception is `_id: 0`, which is allowed in an include projection.

For an embedded field, `"address.city": 1` returns `address` with only `city` inside. Returning fewer fields sends less data over the network.

A projection does not filter documents: the filter (the first argument) decides how many documents come back, the projection only trims the fields of each one. If a document lacks a field you selected, it is still in the result, just without that field. Because a collection does not enforce one shared schema, two documents in the same result can carry different numbers of fields.

You can now: return exactly the fields a screen needs and drop `_id` when you do not use it.

The step-through figure at the end of this section sends document `p1` through three projections: include, include with `_id: 0`, then exclude.

## Syntax

```text
db.<collection>.find(<filter>, { <field>: 1, "<embedded>.<field>": 1, _id: 0 })
db.<collection>.find(<filter>, { <field>: 0, <field>: 0 })
```

- Include: list the fields to keep with `1`; `_id` is always there unless you write `_id: 0`.
- Exclude: list the fields to drop with `0`.
- Do not mix the two styles, except for `_id: 0`.

## Example

The name of the product priced 25000, without `_id`:

```js
db.products.find({ price: 25000 }, { name: 1, _id: 0 })
```

Result: `{ name: "Green tea" }`. Only one field is left, because `_id` is dropped and only `name` is selected.

Every field of the drinks except `tags`:

```js
db.products.find({ category: "drink" }, { tags: 0 })
```

The three drinks `p1`, `p2`, `p6` come back with `_id`, `name`, `category`, `price`, `stock`; only `tags` is gone. The exclude style suits documents with many fields when you want to hide just a few.

Customer names and districts, with the district inside `address`:

```js
db.customers.find({}, { name: 1, "address.district": 1, _id: 0 })
```

Each customer comes back with `name` and an `address` holding only `district`, for example `{ name: "An", address: { district: "Hai Chau" } }`: the nested shape is kept.

## Common mistakes

Mixing include and exclude:

```js
// ERROR mingo
db.products.find({}, { name: 1, stock: 0 })
```

`{ name: 1 }` is enough: a field not listed in an include projection is already dropped. The code `mingo` comes from the in-browser runtime; a real MongoDB server refuses this projection too, with its own message and error code.

Forgetting that `_id` always comes along:

```js
// WRONG: _id comes back too
db.products.find({ category: "gift" }, { name: 1 })
```

```js
// FIX: drop it explicitly
db.products.find({ category: "gift" }, { name: 1, _id: 0 })
```

The wrong version returns `{ name: "Tea set", _id: "p5" }` although you selected only `name`. An application that reads the result by an exact field list meets an extra field; write `_id: 0` when you do not need it.

## Practice

Three steps on `products` and `customers`. Step 1 uses an include projection and drops `_id`. Step 2 selects one field of an embedded document with dot notation. Step 3 switches to the exclude style to keep every field but two. After each step, compare the number of fields in the result with the fields of the source document.

## Recap

- The projection is the second argument of `find`.
- Include `1` keeps the listed fields, exclude `0` drops them.
- Do not mix the styles; only `_id: 0` may join an include projection.
- Dot notation picks one field of an embedded document and keeps its shape.
