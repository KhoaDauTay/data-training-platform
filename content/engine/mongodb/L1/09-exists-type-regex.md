---
id: e-mg-l1-09
engine: mongodb
level: L1
module: query-ops
title: Trường thiếu, null, kiểu và regex
title_en: Missing fields, null, types and regex
kind: lab
runtime: browser
minutes: 12
objectives:
  - vi: Phân biệt trường thiếu và trường bằng `null` bằng `$exists` và `$type`.
    en: Tell a missing field from a `null` field with `$exists` and `$type`.
  - vi: Lọc chuỗi theo mẫu bằng `$regex`.
    en: Filter strings by pattern with `$regex`.
requires: [e-mg-l1-07]
sources:
  - https://www.mongodb.com/docs/manual/tutorial/query-for-null-fields/
  - https://www.mongodb.com/docs/manual/reference/operator/query/type/
  - https://www.mongodb.com/docs/manual/reference/operator/query/regex/
lab:
  setup: |
    {"collections": {
      "customers": [
        {"_id": "c1", "name": "An", "tier": "gold", "email": "an@example.com"},
        {"_id": "c2", "name": "Binh", "tier": "silver", "email": "binh@example.com"},
        {"_id": "c3", "name": "Chi", "tier": "silver", "phone": "0905000003"},
        {"_id": "c4", "name": "Dung", "tier": "gold", "email": "dung@example.com"},
        {"_id": "c5", "name": "Em", "tier": "bronze", "email": null}
      ],
      "products": [
        {"_id": "p1", "name": "Green tea", "category": "drink", "price": 25000},
        {"_id": "p2", "name": "Coffee beans", "category": "drink", "price": 120000},
        {"_id": "p3", "name": "Rice cracker", "category": "snack", "price": 15000},
        {"_id": "p5", "name": "Tea set", "category": "gift", "price": 350000},
        {"_id": "p6", "name": "Lotus tea", "category": "drink", "price": 60000}
      ]
    }}
  steps:
    - task:
        vi: Lấy các khách có trường `email` trong tài liệu, kể cả khi giá trị là `null`.
        en: Return the customers whose document has an `email` field, even when its value is `null`.
      solution: 'db.customers.find({ email: { $exists: true } })'
      check: doc
      hint:
        vi: "`$exists: true` chỉ hỏi trường có mặt hay không."
        en: "`$exists: true` only asks whether the field is present."
    - task:
        vi: Lấy các khách có `email` là một chuỗi thật sự.
        en: Return the customers whose `email` is an actual string.
      solution: 'db.customers.find({ email: { $type: "string" } })'
      check: doc
      hint:
        vi: "`$type` nhận tên kiểu BSON, ví dụ `\"string\"`, `\"null\"`, `\"date\"`."
        en: "`$type` takes a BSON type name such as `\"string\"`, `\"null\"`, `\"date\"`."
    - task:
        vi: Lấy các khách không gửi email được, vì thiếu trường `email` hoặc `email` là `null`.
        en: Return the customers you cannot email, because the `email` field is missing or `email` is `null`.
      solution: 'db.customers.find({ email: null })'
      check: doc
      hint:
        vi: "`{ email: null }` khớp cả hai trường hợp: trường bằng `null` và trường không có."
        en: "`{ email: null }` matches both cases: the field is `null` or the field is missing."
    - task:
        vi: Lấy các sản phẩm có chữ `tea` trong `name`, không phân biệt hoa thường.
        en: Return the products with `tea` in their `name`, ignoring case.
      solution: 'db.products.find({ name: { $regex: "tea", $options: "i" } })'
      check: doc
      hint:
        vi: "Thêm `$options: \"i\"` để không phân biệt hoa thường."
        en: "Add `$options: \"i\"` to ignore case."
---
## Ý chính

MongoDB không bắt mọi tài liệu có cùng trường, nên "không có email" có hai dạng: trường thiếu hẳn, hoặc trường có mặt với giá trị `null`.

- `{ email: null }` khớp cả hai dạng.
- `{ email: { $exists: false } }` chỉ khớp trường thiếu.
- `{ email: { $type: "null" } }` chỉ khớp trường bằng `null`.
- `$type` nhận tên kiểu BSON (`"string"`, `"int"`, `"double"`, `"date"`, `"array"`…) hoặc `"number"` cho mọi kiểu số.

`$regex` lọc chuỗi theo biểu thức chính quy. `$options: "i"` bỏ qua hoa thường. Mẫu bắt đầu bằng `^` (neo đầu chuỗi) và phân biệt hoa thường là dạng dùng index (chỉ mục) hiệu quả nhất; mẫu không neo phải xét mọi giá trị.

Làm được: tìm đúng tài liệu thiếu dữ liệu, kiểm kiểu của một trường, và tìm theo một phần của chuỗi.

## Ví dụ

```js
db.customers.find({ phone: { $exists: true }, email: { $exists: false } })
db.customers.find({ name: { $regex: "^D" } })
```

## Thực hành

Khách `"c3"` không có trường `email`, khách `"c5"` có `email` bằng `null`. Làm bốn bước.

# EN

## Key idea

MongoDB does not force documents to share fields, so "no email" comes in two forms: the field is missing, or it is present with the value `null`.

- `{ email: null }` matches both forms.
- `{ email: { $exists: false } }` matches only a missing field.
- `{ email: { $type: "null" } }` matches only a field equal to `null`.
- `$type` takes a BSON type name (`"string"`, `"int"`, `"double"`, `"date"`, `"array"`…) or `"number"` for every numeric type.

`$regex` filters strings by regular expression. `$options: "i"` ignores case. A case-sensitive pattern starting with `^` (anchored at the start) is the form that uses an index best; an unanchored pattern must look at every value.

You can now: find documents with missing data, check a field's type, and search by part of a string.

## Example

```js
db.customers.find({ phone: { $exists: true }, email: { $exists: false } })
db.customers.find({ name: { $regex: "^D" } })
```

## Practice

Customer `"c3"` has no `email` field, customer `"c5"` has `email` set to `null`. Do the four steps.
