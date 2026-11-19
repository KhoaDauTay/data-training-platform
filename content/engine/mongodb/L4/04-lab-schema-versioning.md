---
id: e-mg-l4-04
engine: mongodb
level: L4
module: patterns
title: "Lab: Schema Versioning, đọc hai phiên bản cùng lúc"
title_en: "Lab: Schema Versioning, reading two versions at once"
kind: lab
minutes: 15
runtime: browser
viz: mg-pipeline
objectives:
  - vi: "Dùng `schemaVersion` để đọc tài liệu cũ và mới về cùng một dạng"
    en: "Use `schemaVersion` to read old and new documents into one shape"
  - vi: "Phân biệt trường thiếu với trường `null` khi chuyển dạng"
    en: "Tell a missing field from a `null` field while reshaping"
requires: [e-mg-l4-01]
sources:
  - https://www.mongodb.com/docs/manual/data-modeling/design-patterns/data-versioning/
  - https://www.mongodb.com/docs/manual/data-modeling/design-patterns/data-versioning/schema-versioning/
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
---

## Ý chính

Lab chạy bằng mingo trong trình duyệt. Mẫu Schema Versioning: khi schema đổi, bạn không phải di chuyển mọi tài liệu ngay. Tài liệu mới ghi `schemaVersion`, tài liệu cũ giữ dạng cũ, và ứng dụng (hoặc một pipeline đọc) biết cách đọc cả hai. Tài liệu MongoDB nêu đúng ví dụ này: thông tin liên hệ tách trường riêng được gom thành một tài liệu `contacts` linh hoạt.

Chú ý một bẫy: trường thiếu không giống trường `null`. Khi dựng `{ type: "home", value: "$homePhone" }` mà `homePhone` không có, `value` là trường thiếu, và `$type` của nó trả `"missing"`.

## Ví dụ

```javascript
{ $ifNull: [ "$schemaVersion", 1 ] }
```

## Thực hành

Viết pipeline đưa cả hai phiên bản về dạng `contacts`. Trên `mongod`, cùng pipeline này có thể dùng để di chuyển dần từng nhóm tài liệu.

# EN

## Key idea

This lab runs on mingo in the browser. The Schema Versioning pattern: when the schema changes you do not have to migrate every document at once. New documents store `schemaVersion`, old documents keep the old shape, and the application (or a read pipeline) knows how to read both. The MongoDB docs give this very example: separate contact fields are folded into a flexible `contacts` document.

Mind one trap: a missing field is not the same as a `null` field. When you build `{ type: "home", value: "$homePhone" }` and `homePhone` does not exist, `value` is a missing field and its `$type` returns `"missing"`.

## Example

```javascript
{ $ifNull: [ "$schemaVersion", 1 ] }
```

## Practice

Write the pipeline that brings both versions into the `contacts` shape. On `mongod`, the same pipeline can drive a gradual migration, one batch of documents at a time.
