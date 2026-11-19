---
id: e-mg-l1-03
engine: mongodb
level: L1
module: crud
title: Chỉ lấy trường cần dùng (projection)
title_en: Returning only the fields you need (projection)
kind: lab
minutes: 8
objectives:
  - vi: Viết projection kiểu chọn (`1`) hoặc kiểu bỏ (`0`) và biết không được trộn hai kiểu.
    en: Write an include (`1`) or exclude (`0`) projection and know the two styles cannot be mixed.
  - vi: Bỏ `_id` khỏi kết quả và lấy một trường trong tài liệu lồng.
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
---
## Ý chính

Đối số thứ hai của `find` là projection: nó chọn trường nào xuất hiện trong kết quả. Có hai kiểu:

- kiểu chọn: `{ name: 1, price: 1 }` trả về đúng các trường đó (cộng `_id`);
- kiểu bỏ: `{ tags: 0 }` trả về mọi trường trừ các trường đã ghi.

Không được trộn `1` và `0` trong cùng projection. Ngoại lệ duy nhất là `_id: 0`, được phép trong kiểu chọn.

Với trường lồng, `"address.city": 1` trả về `address` chỉ còn `city` bên trong. Trả ít trường hơn giúp gửi ít dữ liệu qua mạng hơn.

Làm được: lấy đúng những trường một màn hình cần, bỏ `_id` khi không dùng.

## Ví dụ

```js
db.products.find({ price: 25000 }, { name: 1, _id: 0 })
```

Kết quả: `{ name: "Green tea" }`.

## Thực hành

Ba bước trên `products` và `customers`.

# EN

## Key idea

The second argument of `find` is the projection: it picks which fields appear in the result. There are two styles:

- include: `{ name: 1, price: 1 }` returns exactly those fields (plus `_id`);
- exclude: `{ tags: 0 }` returns every field except the listed ones.

You cannot mix `1` and `0` in one projection. The only exception is `_id: 0`, which is allowed in an include projection.

For an embedded field, `"address.city": 1` returns `address` with only `city` inside. Returning fewer fields sends less data over the network.

You can now: return exactly the fields a screen needs and drop `_id` when you do not use it.

## Example

```js
db.products.find({ price: 25000 }, { name: 1, _id: 0 })
```

Result: `{ name: "Green tea" }`.

## Practice

Three steps on `products` and `customers`.
