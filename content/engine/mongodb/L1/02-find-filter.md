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
quiz:
  - q:
      vi: 'Khách `c2` có `address` là `{ city: "Hue", district: "Phu Hoi" }`. Lệnh `db.customers.find({ address: { district: "Phu Hoi", city: "Hue" } })` có trả về `c2` không?'
      en: 'Customer `c2` has `address` set to `{ city: "Hue", district: "Phu Hoi" }`. Does `db.customers.find({ address: { district: "Phu Hoi", city: "Hue" } })` return `c2`?'
    options:
      - vi: Có, vì cùng các trường và cùng giá trị
        en: Yes, because the fields and values are the same
      - vi: Không, vì so bằng cả tài liệu nhúng cần đúng cả thứ tự trường
        en: No, because equality on a whole embedded document needs the same field order too
      - vi: Lệnh báo lỗi vì filter không được lồng tài liệu
        en: The command fails because a filter cannot hold a nested document
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý vì hai tài liệu nhúng có cùng nội dung, nhưng so bằng trên cả tài liệu nhúng là so khớp chính xác: cùng trường, cùng giá trị và cùng thứ tự. Filter ghi `district` trước, `c2` lưu `city` trước, nên không khớp. Lệnh không báo lỗi: filter được phép chứa tài liệu nhúng, chỉ là cách so này quá chặt. Viết `{ "address.city": "Hue", "address.district": "Phu Hoi" }` thì mỗi trường được so riêng và thứ tự không còn quan trọng.'
      en: 'It sounds right because both embedded documents hold the same content, but equality on a whole embedded document is an exact match: same fields, same values and the same order. The filter puts `district` first while `c2` stores `city` first, so it does not match. The command does not fail: a filter may hold an embedded document, this way of comparing is just too strict. Write `{ "address.city": "Hue", "address.district": "Phu Hoi" }` and each field is compared on its own, so the order no longer matters.'
  - q:
      vi: '`db.customers.find({ tier: "gold", "address.city": "Hue" })` trả về mấy khách?'
      en: 'How many customers does `db.customers.find({ tier: "gold", "address.city": "Hue" })` return?'
    options:
      - { vi: "0", en: "0" }
      - vi: "4: hai khách gold cộng hai khách ở Hue"
        en: "4: the two gold customers plus the two in Hue"
      - { vi: "2", en: "2" }
    answer: 0
    trap: 1
    why:
      vi: 'Nghe hợp lý nếu mỗi điều kiện thêm kết quả, nhưng các điều kiện trong một filter được nối bằng AND. Hai khách gold ở Da Nang và Hoi An, không ai ở Hue, nên kết quả rỗng. "2" là số khách gold, hoặc số khách ở Hue, khi chỉ xét một điều kiện; một tài liệu phải thỏa cả hai mới được trả về.'
      en: 'It sounds right if each condition adds results, but the conditions in one filter are joined with AND. The two gold customers live in Da Nang and Hoi An, none in Hue, so the result is empty. "2" is the number of gold customers, or of customers in Hue, when you look at one condition alone; a document must meet both to be returned.'
---
## Mở bài

Quản lý hỏi: khách hạng vàng nào sống ở Đà Nẵng? Thành phố lại nằm trong một tài liệu nhúng của collection `customers`. Bạn viết filter thế nào?

## Ý chính

`db.<collection>.find(filter)` trả về mọi tài liệu khớp `filter`. Filter rỗng `{}` (hoặc bỏ trống) lấy cả collection.

- `{ tier: "gold" }` là điều kiện bằng.
- Nhiều điều kiện trong một filter được nối bằng AND: tài liệu phải khớp tất cả.
- Trường lồng dùng dot notation: `"address.city"`. Tên có dấu chấm phải đặt trong dấu nháy.

So bằng trên cả tài liệu nhúng, ví dụ `{ address: { city: "Hue" } }`, chỉ khớp khi tài liệu nhúng giống hệt, cả các trường lẫn thứ tự trường. Vì vậy gần như luôn dùng dot notation.

So bằng phân biệt chữ hoa chữ thường và kiểu dữ liệu: `"Hue"` khác `"hue"`, số `5` khác chuỗi `"5"`.

Làm được: tìm đúng các tài liệu theo một hoặc nhiều trường, kể cả trường nằm trong tài liệu nhúng.

## Cú pháp

```text
db.<collection>.find({ <field>: <value>, "<embedded>.<field>": <value> })
```

- `<field>: <value>` là một điều kiện bằng.
- Nhiều cặp trong cùng một tài liệu lọc: AND ngầm.
- Trường trong tài liệu nhúng: dot notation, tên đặt trong dấu nháy.

## Ví dụ

Khách ở quận Sơn Trà, qua dot notation:

```js
db.customers.find({ "address.district": "Son Tra" })
```

Kết quả là một khách, `c3` (Chi). Dấu chấm đi xuyên vào tài liệu nhúng `address` và so riêng trường `district`; trường `city` bên cạnh không ảnh hưởng.

Khách hạng `"gold"` ở `"Hoi An"`, hai điều kiện cùng phải đúng:

```js
db.customers.find({ tier: "gold", "address.city": "Hoi An" })
```

Chỉ `c4` (Dung) thỏa cả hai. Khách gold còn lại, `c1`, ở Da Nang nên bị loại: thêm một điều kiện vào filter chỉ có thể làm kết quả nhỏ đi, không bao giờ lớn thêm.

## Lỗi hay gặp

So bằng cả tài liệu nhúng khi chỉ muốn so một trường:

```js
// WRONG: matches only an address that is exactly { city: "Hue" }
db.customers.find({ address: { city: "Hue" } })
```

```js
// FIX: dot notation compares one field
db.customers.find({ "address.city": "Hue" })
```

Bản sai trả về rỗng: địa chỉ nào cũng có thêm trường `district`, nên không địa chỉ nào giống hệt tài liệu nhúng chỉ có `city`. Dot notation so riêng `city` và trả `c2`, `c5`.

Gõ sai chữ hoa chữ thường:

```js
// WRONG: string equality is case-sensitive
db.customers.find({ "address.city": "da nang" })
```

```js
// FIX: the value as it is stored
db.customers.find({ "address.city": "Da Nang" })
```

Bản sai trả rỗng, bản sửa trả `c1` và `c3`. MongoDB không báo "không tìm thấy" hay gợi ý chữ gần đúng: kết quả rỗng là tín hiệu duy nhất. Khi một filter trả rỗng bất ngờ, mở một tài liệu ra xem giá trị thật được lưu thế nào trước khi sửa filter.

## Thực hành

Collection `customers` có 5 khách ở Da Nang, Hue và Hoi An. Làm ba bước. Bước 1 là một điều kiện bằng trên trường phẳng `tier`. Bước 2 đi vào tài liệu nhúng bằng dot notation. Bước 3 ghép hai điều kiện trong cùng một filter, một phẳng và một lồng. Mỗi bước được chấm trên tài liệu trả về, nên giữ nguyên tài liệu, không cần projection.

## Tóm tắt

- `find(filter)` trả mọi tài liệu khớp; `{}` lấy cả collection.
- Các điều kiện trong một filter nối bằng AND.
- Trường lồng dùng dot notation trong dấu nháy: `"address.city"`.
- So bằng cả tài liệu nhúng cần giống hệt, kể cả thứ tự trường.

# EN

## Opening

The manager asks: which gold customers live in Da Nang? The city sits inside an embedded document of the `customers` collection. How do you write the filter?

## Key idea

`db.<collection>.find(filter)` returns every document that matches `filter`. An empty filter `{}` (or none) returns the whole collection.

- `{ tier: "gold" }` is an equality condition.
- Several conditions in one filter are joined with AND: a document must match all of them.
- Embedded fields use dot notation: `"address.city"`. A name with a dot must be quoted.

Equality on a whole embedded document, such as `{ address: { city: "Hue" } }`, only matches when the embedded document is exactly the same, fields and field order included. That is why you almost always use dot notation.

Equality is case-sensitive and type-sensitive: `"Hue"` is not `"hue"`, and the number `5` is not the string `"5"`.

You can now: find the right documents by one or more fields, including fields inside embedded documents.

## Syntax

```text
db.<collection>.find({ <field>: <value>, "<embedded>.<field>": <value> })
```

- `<field>: <value>` is one equality condition.
- Several pairs in the same filter document: an implicit AND.
- A field inside an embedded document: dot notation, with the name quoted.

## Example

Customers in the Son Tra district, through dot notation:

```js
db.customers.find({ "address.district": "Son Tra" })
```

The result is one customer, `c3` (Chi). The dot reaches into the embedded `address` document and compares only its `district` field; the `city` field next to it plays no part.

`"gold"` customers in `"Hoi An"`, both conditions must hold:

```js
db.customers.find({ tier: "gold", "address.city": "Hoi An" })
```

Only `c4` (Dung) meets both. The other gold customer, `c1`, lives in Da Nang and is left out: adding a condition to a filter can only shrink the result, never grow it.

## Common mistakes

Matching a whole embedded document when you meant one field:

```js
// WRONG: matches only an address that is exactly { city: "Hue" }
db.customers.find({ address: { city: "Hue" } })
```

```js
// FIX: dot notation compares one field
db.customers.find({ "address.city": "Hue" })
```

The wrong version returns nothing: every address also has a `district` field, so none is an exact copy of an embedded document holding only `city`. Dot notation compares `city` alone and returns `c2`, `c5`.

Getting the case wrong:

```js
// WRONG: string equality is case-sensitive
db.customers.find({ "address.city": "da nang" })
```

```js
// FIX: the value as it is stored
db.customers.find({ "address.city": "Da Nang" })
```

The wrong version returns nothing, the fix returns `c1` and `c3`. MongoDB does not say "not found" or suggest a near match: an empty result is the only signal. When a filter comes back empty unexpectedly, open one document and look at how the value is really stored before you change the filter.

## Practice

Collection `customers` holds 5 customers in Da Nang, Hue and Hoi An. Do the three steps. Step 1 is one equality on the flat field `tier`. Step 2 reaches into the embedded document with dot notation. Step 3 joins two conditions in one filter, one flat and one nested. Each step is graded on the documents returned, so keep whole documents, no projection needed.

## Recap

- `find(filter)` returns every matching document; `{}` returns the whole collection.
- The conditions in one filter are joined with AND.
- Embedded fields use quoted dot notation: `"address.city"`.
- Equality on a whole embedded document needs an exact copy, field order included.
