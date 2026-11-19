---
id: e-mg-l1-02
engine: mongodb
level: L1
module: crud
title: Tìm tài liệu với find
title_en: Finding documents with find
kind: lab
runtime: browser
minutes: 10
objectives:
  - vi: Viết `find` với điều kiện bằng trên một hoặc nhiều trường.
    en: Write `find` with equality conditions on one or more fields.
  - vi: Lọc trên trường của tài liệu nhúng (embedded document) bằng dot notation.
    en: Filter on a field of an embedded document with dot notation.
requires: [e-mg-l1-01]
sources:
  - https://www.mongodb.com/docs/manual/tutorial/query-documents/
  - https://www.mongodb.com/docs/manual/tutorial/query-embedded-documents/
lab:
  setup: |
    {"collections": {"customers": [
      {"_id": "c1", "name": "An", "tier": "gold", "address": {"city": "Da Nang", "district": "Hai Chau"}, "tags": ["vip", "newsletter"], "email": "an@example.com", "points": 1200},
      {"_id": "c2", "name": "Binh", "tier": "silver", "address": {"city": "Hue", "district": "Phu Hoi"}, "tags": ["newsletter"], "email": "binh@example.com", "points": 450},
      {"_id": "c3", "name": "Chi", "tier": "silver", "address": {"city": "Da Nang", "district": "Son Tra"}, "tags": [], "phone": "0905000003", "points": 800},
      {"_id": "c4", "name": "Dung", "tier": "gold", "address": {"city": "Hoi An", "district": "Minh An"}, "tags": ["vip"], "email": "dung@example.com", "points": 2300},
      {"_id": "c5", "name": "Em", "tier": "bronze", "address": {"city": "Hue", "district": "Vy Da"}, "email": null, "points": 90}
    ]}}
  steps:
    - task:
        vi: Lấy mọi khách có hạng (`tier`) là `"gold"`. Trả về nguyên tài liệu.
        en: Return every customer whose `tier` is `"gold"`. Return whole documents.
      solution: 'db.customers.find({ tier: "gold" })'
      check: doc
      hint:
        vi: "Điều kiện bằng viết là `{ field: value }` (field là tên trường)."
        en: "An equality condition is written `{ field: value }`."
    - task:
        vi: Lấy mọi khách sống ở thành phố `"Hue"` (trường `city` nằm trong `address`).
        en: Return every customer who lives in the city `"Hue"` (field `city` inside `address`).
      solution: 'db.customers.find({ "address.city": "Hue" })'
      check: doc
      hint:
        vi: 'Dùng dot notation và đặt tên trường trong dấu nháy: `"address.city"`.'
        en: 'Use dot notation and quote the field name: `"address.city"`.'
    - task:
        vi: Lấy khách hạng `"silver"` sống ở `"Da Nang"`.
        en: Return the `"silver"` customers who live in `"Da Nang"`.
      solution: 'db.customers.find({ tier: "silver", "address.city": "Da Nang" })'
      check: doc
      hint:
        vi: Hai điều kiện trong cùng một tài liệu lọc nghĩa là cả hai phải đúng (AND ngầm).
        en: Two conditions in the same filter document must both be true (an implicit AND).
---
## Ý chính

`db.<collection>.find(filter)` trả về mọi tài liệu khớp `filter`. Filter rỗng `{}` (hoặc bỏ trống) lấy cả collection.

- `{ tier: "gold" }` là điều kiện bằng.
- Nhiều điều kiện trong một filter được nối bằng AND: tài liệu phải khớp tất cả.
- Trường lồng dùng dot notation: `"address.city"`. Tên có dấu chấm phải đặt trong dấu nháy.

So bằng trên cả tài liệu nhúng, ví dụ `{ address: { city: "Hue" } }`, chỉ khớp khi tài liệu nhúng giống hệt, cả các trường lẫn thứ tự trường. Vì vậy gần như luôn dùng dot notation.

Làm được: tìm đúng các tài liệu theo một hoặc nhiều trường, kể cả trường nằm trong tài liệu nhúng.

## Ví dụ

```js
db.customers.find({ "address.district": "Son Tra" })
```

## Thực hành

Collection `customers` có 5 khách ở Da Nang, Hue và Hoi An. Làm ba bước.

# EN

## Key idea

`db.<collection>.find(filter)` returns every document that matches `filter`. An empty filter `{}` (or none) returns the whole collection.

- `{ tier: "gold" }` is an equality condition.
- Several conditions in one filter are joined with AND: a document must match all of them.
- Embedded fields use dot notation: `"address.city"`. A name with a dot must be quoted.

Equality on a whole embedded document, such as `{ address: { city: "Hue" } }`, only matches when the embedded document is exactly the same, fields and field order included. That is why you almost always use dot notation.

You can now: find the right documents by one or more fields, including fields inside embedded documents.

## Example

```js
db.customers.find({ "address.district": "Son Tra" })
```

## Practice

Collection `customers` holds 5 customers in Da Nang, Hue and Hoi An. Do the three steps.
