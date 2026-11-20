---
id: e-bp-m06
engine: best
track: mongodb
level: L2
module: m
title: "Kiểm schema bằng $jsonSchema và ghi phiên bản schema"
title_en: "Validate and version your schema"
kind: quiz
minutes: 4
objectives:
  - vi: "Đặt validator `$jsonSchema` (trường bắt buộc, kiểu, giá trị cho phép) cho collection quan trọng, và cho tài liệu mang `schemaVersion` khi cấu trúc đổi dần."
    en: "Give important collections a `$jsonSchema` validator (required fields, types, allowed values), and give documents a `schemaVersion` when the structure changes over time."
avoid:
  vi: "Một bản ghi thanh toán thiếu số tiền lọt vào database và chỉ lộ ra khi báo cáo sai."
  en: "A payment record with no amount getting into the database and only showing up when a report is wrong."
requires: [e-mg-l2-13, e-mg-l4-04]
skills: []
adv: []
sources:
  - https://www.mongodb.com/docs/manual/core/schema-validation/
  - https://www.mongodb.com/docs/manual/core/schema-validation/specify-json-schema/
  - https://www.mongodb.com/docs/manual/data-modeling/design-patterns/data-versioning/schema-versioning/
verified: { version: "MongoDB manual 9.0", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    db.createCollection('payments')
  good: |
    db.createCollection('payments', { validator: { $jsonSchema: {
      bsonType: 'object',
      required: ['orderId', 'amount', 'paidAt', 'schemaVersion'],
      properties: {
        amount: { bsonType: 'long', minimum: 0 },
        status: { enum: ['PAID', 'REFUNDED'] },
        schemaVersion: { bsonType: 'int' }
      }
    } } })
  expect: null
quiz:
  - q:
      vi: "Collection `payments` có validator như bản Nên. Một lệnh `insertOne` thiếu `amount` sẽ ra sao, với cấu hình mặc định?"
      en: "The `payments` collection has the validator from the good version. With the default settings, what happens to an `insertOne` that has no `amount`?"
    options:
      - { vi: "Được ghi, kèm một cảnh báo trong log", en: "It is written, with a warning in the log" }
      - { vi: "Bị từ chối, lệnh báo lỗi", en: "It is rejected and the command returns an error" }
      - { vi: "Được ghi với `amount: null`", en: "It is written with `amount: null`" }
    answer: 1
    why:
      vi: "Mặc định MongoDB từ chối mọi lệnh thêm hay sửa tạo ra tài liệu không hợp lệ. Chỉ khi bạn tự cấu hình khác thì tài liệu sai mới được ghi kèm cảnh báo."
      en: "By default MongoDB rejects any insert or update that would produce an invalid document. Only if you configure it otherwise is an invalid document written with a warning."
---

## Ý chính

Collection quan trọng có validator `$jsonSchema`: trường bắt buộc, kiểu BSON, giá trị cho phép. Khi cấu trúc tài liệu đổi dần, mỗi tài liệu mang `schemaVersion` để code đọc được cả bản cũ lẫn bản mới.

## Vì sao

- "Không có schema cố định" không có nghĩa là không có schema: schema chỉ chuyển vào code, và mỗi chỗ ghi có thể hiểu khác nhau.
- Validator chặn dữ liệu sai ngay ở database, như `NOT NULL` và `CHECK` trong Postgres.
- `schemaVersion` cho phép hai dạng tài liệu cùng sống trong lúc chuyển đổi.
- Thẻ này chỉ cú pháp: mingo không có `createCollection` hay validator.

# EN

## Key idea

Important collections get a `$jsonSchema` validator: required fields, BSON types, allowed values. When the document structure changes over time, each document carries a `schemaVersion` so code can read both the old and the new shape.

## Why

- "No fixed schema" does not mean no schema: the schema just moves into code, and every writer may read it differently.
- A validator stops bad data at the database, like `NOT NULL` and `CHECK` in Postgres.
- `schemaVersion` lets both document shapes live side by side while documents are being converted.
- This card is syntax only: mingo has no `createCollection` and no validator.
