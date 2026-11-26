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
figures: [{ name: mg-missing-vs-null, at: idea }]
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
quiz:
  - q:
      vi: 'Khách `"c3"` không có trường `email`, khách `"c5"` có `email: null`. `db.customers.find({ email: null })` trả về ai?'
      en: 'Customer `"c3"` has no `email` field, customer `"c5"` has `email: null`. Who does `db.customers.find({ email: null })` return?'
    options:
      - vi: 'Chỉ `"c5"`, vì chỉ `"c5"` có giá trị `null`'
        en: 'Only `"c5"`, because only `"c5"` holds the value `null`'
      - vi: 'Cả `"c3"` và `"c5"`'
        en: 'Both `"c3"` and `"c5"`'
      - vi: Không ai, vì `null` không so bằng được
        en: Nobody, because `null` cannot be compared for equality
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý vì chỉ `"c5"` thật sự lưu `null`, nhưng `{ email: null }` khớp cả trường bằng `null` lẫn trường không có, nên `"c3"` cũng được trả. "Không ai" là thói quen từ SQL, nơi `= NULL` không bao giờ đúng; trong MongoDB so bằng `null` là phép so hợp lệ. Chỉ muốn `null` thật thì dùng `{ email: { $type: "null" } }`.'
      en: 'It sounds right because only `"c5"` really stores `null`, but `{ email: null }` matches both a field equal to `null` and a missing field, so `"c3"` comes back too. "Nobody" is a habit from SQL, where `= NULL` is never true; in MongoDB equality with `null` is a valid comparison. For a real `null` only, use `{ email: { $type: "null" } }`.'
  - q:
      vi: '`db.customers.find({ email: { $exists: true } })` có trả về `"c5"` (có `email: null`) không?'
      en: 'Does `db.customers.find({ email: { $exists: true } })` return `"c5"` (which has `email: null`)?'
    options:
      - vi: Có, vì trường có mặt dù giá trị là `null`
        en: Yes, because the field is present even though its value is `null`
      - vi: Không, vì `null` nghĩa là không có email
        en: No, because `null` means there is no email
    answer: 0
    trap: 1
    why:
      vi: 'Nghe hợp lý vì `null` thường được hiểu là "không có", nhưng `$exists` chỉ hỏi trường có mặt trong tài liệu hay không, không xét giá trị. Muốn email là chuỗi thật thì dùng `$type: "string"`.'
      en: 'It sounds right because `null` is often read as "nothing", but `$exists` only asks whether the field is present in the document, not what it holds. For an email that is a real string, use `$type: "string"`.'
---
## Mở bài

Đội marketing cần danh sách khách không gửi email được. Có khách thiếu hẳn trường `email`, có khách lưu `email: null`. Một filter có bắt được cả hai không, và nếu chỉ muốn một trong hai thì sao?

## Ý chính

MongoDB không bắt mọi tài liệu có cùng trường, nên "không có email" có hai dạng: trường thiếu hẳn, hoặc trường có mặt với giá trị `null`.

- `{ email: null }` khớp cả hai dạng.
- `{ email: { $exists: false } }` chỉ khớp trường thiếu.
- `{ email: { $type: "null" } }` chỉ khớp trường bằng `null`.
- `$type` nhận tên kiểu BSON (`"string"`, `"int"`, `"double"`, `"date"`, `"array"`…) hoặc `"number"` cho mọi kiểu số.

`$regex` lọc chuỗi theo biểu thức chính quy. `$options: "i"` bỏ qua hoa thường. Mẫu bắt đầu bằng `^` (neo đầu chuỗi) và phân biệt hoa thường là dạng dùng index (chỉ mục) hiệu quả nhất; mẫu không neo phải xét mọi giá trị.

Làm được: tìm đúng tài liệu thiếu dữ liệu, kiểm kiểu của một trường, và tìm theo một phần của chuỗi.

Hình cuối mục này chạy ba bộ lọc trên năm khách của lab: Chi không có trường `email`, Em có `email: null`, và mỗi bộ lọc bắt đúng những ai.

## Cú pháp

```text
{ <field>: null }
{ <field>: { $exists: <true | false> } }
{ <field>: { $type: "<bson type>" } }
{ <field>: { $regex: "<pattern>", $options: "i" } }
```

- `null` khớp trường bằng `null` hoặc thiếu.
- `$exists` hỏi trường có mặt; `$type` hỏi kiểu của giá trị.
- `$regex` khớp một phần chuỗi; `^` neo đầu chuỗi.

## Ví dụ

Khách có số điện thoại nhưng không có trường `email`:

```js
db.customers.find({ phone: { $exists: true }, email: { $exists: false } })
```

Chỉ `c3` (Chi): có `phone`, không có trường `email`. `$exists` hỏi trường có mặt hay không, chứ không quan tâm giá trị bên trong.

Khách có tên bắt đầu bằng `D`:

```js
db.customers.find({ name: { $regex: "^D" } })
```

Kết quả là `c4` (Dung). Dấu `^` neo mẫu vào đầu chuỗi; bỏ nó đi thì mọi tên có chữ `D` ở bất kỳ đâu đều khớp.

Khách có `email` đúng bằng `null`, không tính khách thiếu trường:

```js
db.customers.find({ email: { $type: "null" } })
```

Chỉ `c5` (Em), người có `email: null` ghi rõ. `c3` thiếu trường nên không khớp: `$type: "null"` phân biệt "có trường, giá trị rỗng" với "không có trường".

## Lỗi hay gặp

Dùng `{ email: null }` khi chỉ muốn trường thiếu:

```js
// WRONG: c5 (email: null) comes back too
db.customers.find({ email: null })
```

```js
// FIX: only the documents without the field
db.customers.find({ email: { $exists: false } })
```

Bản sai trả `c3` và `c5`, bản sửa chỉ trả `c3`. So bằng `null` khớp cả hai trường hợp, thiếu trường và giá trị `null`; đó là chủ ý của MongoDB, nhưng dễ đếm nhầm khi hai trường hợp có nghĩa nghiệp vụ khác nhau.

Quên rằng `$regex` phân biệt hoa thường:

```js
// WRONG: "Tea set" starts with a capital T and is missed
db.products.find({ name: { $regex: "tea" } })
```

```js
// FIX: ignore case
db.products.find({ name: { $regex: "tea", $options: "i" } })
```

Bản sai trả `p1` và `p6`; bản sửa thêm `p5` (Tea set). Tùy chọn `i` bỏ qua hoa thường, nhưng một mẫu không neo `^` vẫn phải dò cả chuỗi của từng tài liệu, nên trên collection lớn nó chậm hơn so bằng.

## Thực hành

Khách `"c3"` không có trường `email`, khách `"c5"` có `email` bằng `null`. Làm bốn bước. Bước 1 lấy khách có trường `email`, dù giá trị là gì. Bước 2 chỉ giữ email là chuỗi. Bước 3 dùng so bằng `null` và nhận cả hai trường hợp. Bước 4 tìm tên sản phẩm chứa một từ, bất kể hoa thường.

## Tóm tắt

- "Không có giá trị" có hai dạng: trường thiếu và trường bằng `null`.
- `{ f: null }` khớp cả hai; `$exists` và `$type: "null"` tách chúng ra.
- `$type` kiểm kiểu BSON; `"number"` khớp mọi kiểu số.
- `$regex` phân biệt hoa thường trừ khi có `$options: "i"`.

# EN

## Opening

The marketing team needs the customers you cannot email. Some lack the `email` field entirely, some store `email: null`. Can one filter catch both, and what if you want only one of them?

## Key idea

MongoDB does not force documents to share fields, so "no email" comes in two forms: the field is missing, or it is present with the value `null`.

- `{ email: null }` matches both forms.
- `{ email: { $exists: false } }` matches only a missing field.
- `{ email: { $type: "null" } }` matches only a field equal to `null`.
- `$type` takes a BSON type name (`"string"`, `"int"`, `"double"`, `"date"`, `"array"`…) or `"number"` for every numeric type.

`$regex` filters strings by regular expression. `$options: "i"` ignores case. A case-sensitive pattern starting with `^` (anchored at the start) is the form that uses an index best; an unanchored pattern must look at every value.

You can now: find documents with missing data, check a field's type, and search by part of a string.

The figure at the end of this section runs the three filters over the lab's five customers: Chi has no `email` field, Em has `email: null`, and it shows exactly who each filter catches.

## Syntax

```text
{ <field>: null }
{ <field>: { $exists: <true | false> } }
{ <field>: { $type: "<bson type>" } }
{ <field>: { $regex: "<pattern>", $options: "i" } }
```

- `null` matches a field equal to `null` or missing.
- `$exists` asks whether the field is present; `$type` asks the value's type.
- `$regex` matches part of a string; `^` anchors at the start.

## Example

Customers with a phone number but no `email` field:

```js
db.customers.find({ phone: { $exists: true }, email: { $exists: false } })
```

Only `c3` (Chi): it has `phone` and no `email` field. `$exists` asks whether the field is present, not what value it holds.

Customers whose name starts with `D`:

```js
db.customers.find({ name: { $regex: "^D" } })
```

The result is `c4` (Dung). The `^` anchors the pattern at the start of the string; without it, every name with a `D` anywhere would match.

Customers whose `email` is exactly `null`, leaving out those without the field:

```js
db.customers.find({ email: { $type: "null" } })
```

Only `c5` (Em), who has `email: null` written out. `c3` lacks the field and does not match: `$type: "null"` tells "field present, empty value" apart from "no field".

## Common mistakes

Using `{ email: null }` when you want only the missing field:

```js
// WRONG: c5 (email: null) comes back too
db.customers.find({ email: null })
```

```js
// FIX: only the documents without the field
db.customers.find({ email: { $exists: false } })
```

The wrong version returns `c3` and `c5`, the fix returns only `c3`. Equality with `null` matches both cases, a missing field and a `null` value; MongoDB does this on purpose, but it is easy to miscount when the two cases mean different things to the business.

Forgetting that `$regex` is case-sensitive:

```js
// WRONG: "Tea set" starts with a capital T and is missed
db.products.find({ name: { $regex: "tea" } })
```

```js
// FIX: ignore case
db.products.find({ name: { $regex: "tea", $options: "i" } })
```

The wrong version returns `p1` and `p6`; the fix adds `p5` (Tea set). The `i` option ignores case, but a pattern without a `^` anchor still has to scan the whole string of every document, so on a large collection it is slower than an equality.

## Practice

Customer `"c3"` has no `email` field, customer `"c5"` has `email` set to `null`. Do the four steps. Step 1 gets customers that have an `email` field, whatever its value. Step 2 keeps only emails that are strings. Step 3 uses equality with `null` and accepts both cases. Step 4 finds product names that contain a word, in any case.

## Recap

- "No value" comes in two forms: a missing field and a field equal to `null`.
- `{ f: null }` matches both; `$exists` and `$type: "null"` tell them apart.
- `$type` checks the BSON type; `"number"` matches every numeric type.
- `$regex` is case-sensitive unless `$options: "i"` is set.
