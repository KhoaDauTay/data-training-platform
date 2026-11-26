---
id: e-mg-l4-04
engine: mongodb
level: L4
module: patterns
title: "Lab: Schema Versioning, đọc hai phiên bản cùng lúc"
title_en: "Lab: Schema Versioning, reading two versions at once"
kind: lab
minutes: 16
runtime: browser
viz: mg-pipeline
objectives:
  - vi: "Dùng `schemaVersion` để đọc tài liệu cũ và mới về cùng một dạng"
    en: "Use `schemaVersion` to read old and new documents into one shape"
  - vi: "Phân biệt trường thiếu với trường `null` khi chuyển dạng"
    en: "Tell a missing field from a `null` field while reshaping"
  - vi: "Tìm tài liệu còn ở phiên bản cũ và chuyển từng tài liệu sang phiên bản mới"
    en: "Find documents still on the old version and migrate them one at a time"
requires: [e-mg-l4-01]
sources:
  - https://www.mongodb.com/docs/manual/data-modeling/design-patterns/data-versioning/
  - https://www.mongodb.com/docs/manual/data-modeling/design-patterns/data-versioning/schema-versioning/
  - https://www.mongodb.com/docs/manual/reference/operator/query/exists/
lab:
  setup: |
    {"collections": {"customers": [
      {"_id": 1, "name": "An", "homePhone": "0236-111", "cellPhone": "090-111", "email": "an@example.com"},
      {"_id": 2, "name": "Binh", "cellPhone": "090-222"},
      {"_id": 3, "name": "Chi", "schemaVersion": 2, "contacts": [{"type": "cell", "value": "090-333"}, {"type": "email", "value": "chi@example.com"}]},
      {"_id": 4, "name": "Dung", "email": "dung@example.com", "homePhone": "0236-444"},
      {"_id": 5, "name": "Em", "schemaVersion": 2, "contacts": []}
    ]}}
  steps:
    - task:
        vi: "Tài liệu không có `schemaVersion` là phiên bản 1 (các trường `homePhone`, `cellPhone`, `email`); phiên bản 2 có mảng `contacts`. Trả mọi khách ở dạng phiên bản 2: `_id`, `name`, `contacts`. Với phiên bản 1, `contacts` gồm các mục `{ type, value }` theo thứ tự `home`, `cell`, `email`, chỉ cho trường có mặt. Xếp theo `_id` tăng dần."
        en: "Documents without `schemaVersion` are version 1 (fields `homePhone`, `cellPhone`, `email`); version 2 has a `contacts` array. Return every customer in the version 2 shape: `_id`, `name`, `contacts`. For version 1, `contacts` holds `{ type, value }` entries in the order `home`, `cell`, `email`, only for fields that are present. Order by `_id` ascending."
      solution: |
        db.customers.aggregate([
          { $project: {
              name: 1,
              contacts: { $cond: [
                { $eq: [ { $ifNull: [ "$schemaVersion", 1 ] }, 2 ] },
                "$contacts",
                { $filter: {
                    input: [
                      { type: "home", value: "$homePhone" },
                      { type: "cell", value: "$cellPhone" },
                      { type: "email", value: "$email" }
                    ],
                    as: "c",
                    cond: { $ne: [ { $type: "$$c.value" }, "missing" ] }
                } }
              ] }
          } },
          { $sort: { _id: 1 } }
        ])
      check: doc
      ordered: true
      hint:
        vi: "`$ifNull` cho phiên bản mặc định 1. Dựng mảng ba mục rồi `$filter` bỏ mục có `value` là trường thiếu: `$type` của trường thiếu là `\"missing\"`."
        en: "`$ifNull` gives the default version 1. Build a three-entry array, then `$filter` out entries whose `value` is a missing field: the `$type` of a missing field is `\"missing\"`."
    - task:
        vi: "Trước khi di chuyển, đếm việc còn lại: trả `_id` và `name` của mọi khách vẫn ở phiên bản 1 (không có trường `schemaVersion`)."
        en: "Before migrating, size the work left: return `_id` and `name` of every customer still on version 1 (no `schemaVersion` field)."
      solution: 'db.customers.find({ schemaVersion: { $exists: false } }, { name: 1 })'
      check: doc
      hint:
        vi: "Phiên bản 1 không có trường, nên `schemaVersion: 1` không khớp gì; dùng `$exists: false`."
        en: "Version 1 has no such field, so `schemaVersion: 1` matches nothing; use `$exists: false`."
    - task:
        vi: "Chuyển khách `2` sang phiên bản 2 bằng một `updateOne`: đặt `schemaVersion: 2` và `contacts` chỉ gồm `{ type: \"cell\", value: \"090-222\" }`, và bỏ trường cũ `cellPhone`."
        en: "Migrate customer `2` to version 2 with one `updateOne`: set `schemaVersion: 2` and `contacts` holding only `{ type: \"cell\", value: \"090-222\" }`, and remove the old `cellPhone` field."
      solution: 'db.customers.updateOne({ _id: 2 }, { $set: { schemaVersion: 2, contacts: [ { type: "cell", value: "090-222" } ] }, $unset: { cellPhone: "" } })'
      check: doc
      hint:
        vi: "`$set` và `$unset` cùng một tài liệu update: tài liệu đổi dạng trong một lần ghi nguyên tử."
        en: "`$set` and `$unset` in the same update document: the document changes shape in one atomic write."
quiz:
  - q:
      vi: "Schema đổi từ trường điện thoại rời sang mảng `contacts`. Cách nào theo mẫu Schema Versioning?"
      en: "The schema changes from separate phone fields to a `contacts` array. Which approach follows the Schema Versioning pattern?"
    options:
      - { vi: "Dừng ứng dụng, chuyển hết mọi tài liệu trong một đêm, rồi chạy lại", en: "Stop the application, migrate every document overnight, then restart" }
      - { vi: "Tài liệu mới ghi `schemaVersion: 2`, mã đọc hiểu cả hai dạng, tài liệu cũ được chuyển dần", en: "New documents store `schemaVersion: 2`, the reading code understands both shapes, old documents migrate gradually" }
      - { vi: "MongoDB tự chuyển tài liệu cũ khi validator đổi", en: "MongoDB converts old documents by itself when the validator changes" }
    answer: 1
    trap: 2
    why:
      vi: "Validator có vẻ là \"schema\" của collection nên nghe hợp lý, nhưng validator chỉ kiểm lệnh ghi mới; tài liệu đã có vẫn giữ ba trường điện thoại rời cho tới khi chính bạn sửa. Dừng ứng dụng một đêm để chuyển hết thì chạy được, nhưng đó chính là lần di chuyển lớn có thời gian chết mà mẫu này tránh. Schema Versioning để hai dạng cùng sống: tài liệu mới ghi `schemaVersion: 2`, mã đọc hiểu cả hai, tài liệu cũ được chuyển dần trong khi hệ thống vẫn chạy."
      en: "A validator looks like the collection's \"schema\", so it sounds right, but a validator only checks new writes; existing documents keep their three separate phone fields until you fix them yourself. Stopping the application overnight to migrate everything works, but that is exactly the big migration with downtime this pattern avoids. Schema Versioning lets both shapes live together: new documents store `schemaVersion: 2`, the reading code understands both, and old documents migrate gradually while the system keeps running."
  - q:
      vi: "Vì sao `find({ schemaVersion: 1 })` không trả khách phiên bản 1 trong lab này?"
      en: "Why does `find({ schemaVersion: 1 })` return none of the version 1 customers in this lab?"
    options:
      - { vi: "Tài liệu phiên bản 1 không có trường `schemaVersion`; phiên bản 1 là \"không có trường\"", en: "Version 1 documents have no `schemaVersion` field; version 1 means \"no field\"" }
      - { vi: "MongoDB cần chỉ mục trên `schemaVersion`", en: "MongoDB needs an index on `schemaVersion`" }
      - { vi: "Số 1 phải viết là chuỗi `\"1\"`", en: "The number 1 must be written as the string `\"1\"`" }
    answer: 0
    why:
      vi: "Khách 1, 2 và 4 không lưu trường `schemaVersion` nào; phiên bản 1 chỉ là quy ước của ứng dụng (`$ifNull` cho 1), không phải giá trị trên đĩa, nên `schemaVersion: 1` không khớp tài liệu nào. Index chỉ làm truy vấn nhanh hơn, không đổi tài liệu nào khớp; viết chuỗi `\"1\"` cũng không khớp vì vẫn không có trường để so. Truy vấn tìm phiên bản 1 phải hỏi trường thiếu: `$exists: false`."
      en: "Customers 1, 2 and 4 store no `schemaVersion` field at all; version 1 is only the application's convention (`$ifNull` gives 1), not a stored value, so `schemaVersion: 1` matches no document. An index only makes a query faster, it never changes which documents match; the string `\"1\"` matches nothing either, since there is still no field to compare. A query for version 1 must ask for the missing field: `$exists: false`."
---
## Mở bài

Đội sản phẩm muốn lưu nhiều cách liên hệ thay cho ba trường điện thoại cố định. Collection có hàng triệu khách, và không ai cho bạn dừng hệ thống một đêm để chuyển dữ liệu. Làm sao đổi schema khi dữ liệu cũ vẫn đang được đọc?

## Ý chính

Mẫu Schema Versioning: khi schema đổi, bạn không phải chuyển mọi tài liệu ngay. Tài liệu mới ghi `schemaVersion`, tài liệu cũ giữ dạng cũ, và ứng dụng (hoặc một pipeline đọc) biết đọc cả hai. Docs chính thức của MongoDB dùng đúng ví dụ này: các trường liên hệ rời được gom thành một danh sách `contacts` linh hoạt. Tài liệu cũ được chuyển dần, từng nhóm, bằng chính logic đọc đó.

Trường thiếu không giống trường `null`. Khi dựng `{ type: "home", value: "$homePhone" }` mà `homePhone` không có, `value` là trường thiếu, và `$type` của nó trả `"missing"`. Tương tự, phiên bản 1 không lưu số 1 ở đâu cả: nó là "không có trường".

Nhiều người nghĩ đổi validator của collection là đổi luôn tài liệu cũ. Thật ra validator chỉ kiểm các lệnh ghi mới; tài liệu đã có vẫn nguyên dạng cho tới khi chính bạn sửa chúng.

Lab chạy bằng mingo trong trình duyệt; mỗi lần chạy bắt đầu lại từ dữ liệu gốc.

## Cú pháp

```text
{ $ifNull: [ "$schemaVersion", 1 ] }
{ $cond: [ <is version 2>, "$contacts", <build contacts from old fields> ] }
{ $type: "$<field>" }                       // "missing" when the field is absent
db.<coll>.find({ schemaVersion: { $exists: false } })
db.<coll>.updateOne(<filter>, { $set: { schemaVersion: 2, ... }, $unset: { <old field>: "" } })
```

- `$ifNull`: dùng giá trị thay thế khi trường thiếu hoặc `null`.
- `$type` trả `"missing"` cho trường không có.
- `$exists: false` tìm tài liệu chưa có trường.
- `$set` + `$unset` trong một update: đổi dạng tài liệu trong một lần ghi.

## Ví dụ

Phiên bản của từng khách, mặc định 1:

```javascript
db.customers.aggregate([{ $project: { v: { $ifNull: ["$schemaVersion", 1] } } }])
```

Khách `3` và `5` ra 2, còn lại ra 1.

Trường nào thiếu ở đâu:

```javascript
db.customers.aggregate([{ $project: { t: { $type: "$homePhone" } } }])
```

Khách `1` và `4` có `homePhone` kiểu `"string"`, ba khách còn lại là `"missing"`.

Khách đã ở phiên bản 2:

```javascript
db.customers.find({ schemaVersion: 2 }, { name: 1, contacts: 1 })
```

Chi và Em; `contacts` của Em là mảng rỗng, vẫn là dạng hợp lệ.

## Lỗi hay gặp

Tìm phiên bản 1 bằng giá trị 1:

```javascript
// WRONG: version 1 documents store no schemaVersion at all
db.customers.find({ schemaVersion: 1 }, { name: 1 })
```

```javascript
// FIX: version 1 is the missing field
db.customers.find({ schemaVersion: { $exists: false } }, { name: 1 })
```

Câu sai trả rỗng, và một kịch bản di chuyển dựa vào nó sẽ báo "xong" khi chưa chuyển khách nào.

Chuyển dạng mà để lại trường cũ:

```javascript
// WRONG: contacts is added, cellPhone stays behind
db.customers.updateOne({ _id: 2 }, { $set: { schemaVersion: 2, contacts: [{ type: "cell", value: "090-222" }] } })
```

```javascript
// FIX: remove the old field in the same write
db.customers.updateOne({ _id: 2 }, { $set: { schemaVersion: 2, contacts: [{ type: "cell", value: "090-222" }] }, $unset: { cellPhone: "" } })
```

Sau câu sai, số điện thoại nằm ở hai chỗ; lần sửa sau chỉ đổi một chỗ và hai bản lệch nhau.

## Thực hành

Ba bước: đọc cả hai phiên bản về một dạng, tìm các khách còn ở phiên bản 1, rồi chuyển một khách sang phiên bản 2.

## Tóm tắt

- Schema Versioning: tài liệu mới ghi `schemaVersion`, mã đọc hiểu mọi phiên bản còn sống.
- Phiên bản mặc định là quy ước (`$ifNull`), không phải giá trị trên đĩa: tìm nó bằng `$exists: false`.
- `$type` trả `"missing"` cho trường không có, khác với `null`.
- Chuyển một tài liệu bằng `$set` + `$unset` trong cùng một lần ghi.

# EN

## Opening

The product team wants to store any number of contact methods instead of three fixed phone fields. The collection holds millions of customers, and nobody will let you stop the system for a night to migrate. How do you change the schema while old data is still being read?

## Key idea

The Schema Versioning pattern: when the schema changes you do not have to migrate every document at once. New documents store `schemaVersion`, old documents keep the old shape, and the application (or a read pipeline) knows how to read both. The MongoDB docs use this very example: separate contact fields are folded into a flexible `contacts` list. Old documents migrate gradually, batch by batch, with that same reading logic.

A missing field is not the same as a `null` field. When you build `{ type: "home", value: "$homePhone" }` and `homePhone` does not exist, `value` is a missing field and its `$type` returns `"missing"`. In the same way, version 1 stores the number 1 nowhere: it is "no field".

Many people think changing the collection's validator also changes the old documents. In fact a validator only checks new writes; existing documents keep their shape until you fix them yourself.

The lab runs on mingo in the browser; every run starts again from the original data.

## Syntax

```text
{ $ifNull: [ "$schemaVersion", 1 ] }
{ $cond: [ <is version 2>, "$contacts", <build contacts from old fields> ] }
{ $type: "$<field>" }                       // "missing" when the field is absent
db.<coll>.find({ schemaVersion: { $exists: false } })
db.<coll>.updateOne(<filter>, { $set: { schemaVersion: 2, ... }, $unset: { <old field>: "" } })
```

- `$ifNull`: uses a replacement value when the field is missing or `null`.
- `$type` returns `"missing"` for an absent field.
- `$exists: false` finds documents that do not have the field yet.
- `$set` + `$unset` in one update: the document changes shape in one write.

## Example

Each customer's version, defaulting to 1:

```javascript
db.customers.aggregate([{ $project: { v: { $ifNull: ["$schemaVersion", 1] } } }])
```

Customers `3` and `5` give 2, the rest give 1.

Which field is missing where:

```javascript
db.customers.aggregate([{ $project: { t: { $type: "$homePhone" } } }])
```

Customers `1` and `4` have a `homePhone` of type `"string"`, the other three are `"missing"`.

Customers already on version 2:

```javascript
db.customers.find({ schemaVersion: 2 }, { name: 1, contacts: 1 })
```

Chi and Em; Em's `contacts` is an empty array, still a valid shape.

## Common mistakes

Looking for version 1 with the value 1:

```javascript
// WRONG: version 1 documents store no schemaVersion at all
db.customers.find({ schemaVersion: 1 }, { name: 1 })
```

```javascript
// FIX: version 1 is the missing field
db.customers.find({ schemaVersion: { $exists: false } }, { name: 1 })
```

The wrong query returns nothing, and a migration script built on it reports "done" before moving a single customer.

Changing the shape and leaving the old field behind:

```javascript
// WRONG: contacts is added, cellPhone stays behind
db.customers.updateOne({ _id: 2 }, { $set: { schemaVersion: 2, contacts: [{ type: "cell", value: "090-222" }] } })
```

```javascript
// FIX: remove the old field in the same write
db.customers.updateOne({ _id: 2 }, { $set: { schemaVersion: 2, contacts: [{ type: "cell", value: "090-222" }] }, $unset: { cellPhone: "" } })
```

After the wrong command the phone number lives in two places; the next edit changes only one and the two copies drift apart.

## Practice

Three steps: read both versions into one shape, find the customers still on version 1, then migrate one customer to version 2.

## Recap

- Schema Versioning: new documents store `schemaVersion`, the reading code understands every live version.
- The default version is a convention (`$ifNull`), not a stored value: find it with `$exists: false`.
- `$type` returns `"missing"` for an absent field, which is not `null`.
- Migrate a document with `$set` + `$unset` in the same write.
