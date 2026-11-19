---
id: e-mg-l2-13
engine: mongodb
level: L2
module: modeling
title: Luật kiểm tra với $jsonSchema
title_en: Schema validation with $jsonSchema
kind: concept
runtime: docs
minutes: 10
objectives:
  - vi: Viết một validator `$jsonSchema` đòi trường bắt buộc và kiểu BSON cho từng trường.
    en: Write a `$jsonSchema` validator that requires fields and sets the BSON type of each.
  - vi: Chọn `validationLevel` và `validationAction` cho một collection đã có dữ liệu cũ.
    en: Choose `validationLevel` and `validationAction` for a collection that already holds old data.
requires: [e-mg-l2-11]
sources:
  - https://www.mongodb.com/docs/manual/core/schema-validation/
  - https://www.mongodb.com/docs/manual/core/schema-validation/specify-json-schema/
  - https://www.mongodb.com/docs/manual/core/schema-validation/specify-validation-level/
  - https://www.mongodb.com/docs/manual/core/schema-validation/handle-invalid-documents/
quiz:
  - q:
      vi: 'Collection `orders` có validator đòi `total` kiểu `"int"` và không ghi gì thêm. Lệnh `insertOne({ _id: 10, total: "big" })` thì sao?'
      en: 'Collection `orders` has a validator that requires `total` of type `"int"` and sets nothing else. What happens to `insertOne({ _id: 10, total: "big" })`?'
    options:
      - vi: Bị từ chối với lỗi "Document failed validation"
        en: It is rejected with a "Document failed validation" error
      - vi: Được ghi, chỉ có một dòng cảnh báo trong log
        en: It is written, with only a warning in the log
      - vi: Được ghi, `total` tự đổi thành số
        en: It is written and `total` is converted to a number
    answer: 0
    why:
      vi: 'Mặc định `validationAction` là `"error"`: thao tác vi phạm bị từ chối. Chỉ với `"warn"` thì tài liệu sai mới được ghi và vi phạm được ghi vào log. MongoDB không tự đổi kiểu.'
      en: 'By default `validationAction` is `"error"`: a violating write is rejected. Only with `"warn"` is the invalid document written and the violation logged. MongoDB never converts types for you.'
  - q:
      vi: 'Bạn thêm validator cho một collection cũ có sẵn vài tài liệu sai. Muốn tài liệu mới phải đúng, nhưng sửa một tài liệu cũ vốn đã sai thì không bị chặn. Chọn mức nào?'
      en: 'You add a validator to an old collection that already holds some invalid documents. New documents must be valid, but updating an already invalid old document should not be blocked. Which level?'
    options:
      - vi: '`validationLevel: "moderate"`'
        en: '`validationLevel: "moderate"`'
      - vi: '`validationLevel: "strict"`'
        en: '`validationLevel: "strict"`'
      - vi: '`validationAction: "error"`'
        en: '`validationAction: "error"`'
    answer: 0
    why:
      vi: '`"strict"` (mặc định) kiểm mọi lần thêm và sửa. `"moderate"` kiểm lần thêm và lần sửa tài liệu đang hợp lệ, còn tài liệu vốn đã sai thì sửa không cần qua kiểm tra.'
      en: '`"strict"` (the default) checks every insert and update. `"moderate"` checks inserts and updates to documents that are already valid; updates to documents that were already invalid skip the check.'
  - q:
      vi: Muốn tìm những tài liệu hiện có đang vi phạm validator, dùng truy vấn nào?
      en: To find the existing documents that break the validator, which query do you use?
    options:
      - vi: '`find({ $nor: [ { $jsonSchema: schema } ] })`'
        en: '`find({ $nor: [ { $jsonSchema: schema } ] })`'
      - vi: '`find({ $jsonSchema: schema })`'
        en: '`find({ $jsonSchema: schema })`'
      - vi: Không làm được, chỉ biết lúc ghi
        en: You cannot, you only find out at write time
    answer: 0
    why:
      vi: '`$jsonSchema` cũng là một toán tử truy vấn. `find({ $jsonSchema: schema })` trả tài liệu hợp lệ; bọc trong `$nor` để lấy tài liệu không hợp lệ.'
      en: '`$jsonSchema` is also a query operator. `find({ $jsonSchema: schema })` returns the valid documents; wrap it in `$nor` to get the invalid ones.'
---
## Ý chính

MongoDB không bắt mọi tài liệu cùng hình, nhưng bạn có thể đặt luật cho một collection bằng `$jsonSchema`:

- `bsonType`: kiểu của tài liệu hoặc của trường (`"object"`, `"string"`, `"int"`, `"date"`, `"array"`…);
- `required`: các trường bắt buộc;
- `properties`: luật cho từng trường, như `minimum`, `enum`, `pattern`.

Đặt lúc tạo bằng `db.createCollection(name, { validator })`, hoặc thêm cho collection đã có bằng lệnh `collMod`.

Hai núm chỉnh:

- `validationLevel`: `"strict"` (mặc định) kiểm mọi lần thêm và sửa; `"moderate"` bỏ qua lần sửa tài liệu vốn đã sai;
- `validationAction`: `"error"` (mặc định) từ chối thao tác sai; `"warn"` vẫn ghi và chỉ ghi vi phạm vào log.

Bản mới còn thêm hành động `"errorAndLog"` (MongoDB 8.1) và mức `"constraint"` (MongoDB 9.0), mức này bảo đảm mọi tài liệu trong collection đều hợp lệ.

## Ví dụ

Validator chỉ kiểm lúc ghi, không sửa dữ liệu cũ. Dùng `$jsonSchema` trong `find` để tìm tài liệu hợp lệ, và bọc trong `$nor` để tìm tài liệu sai.

Bài này là bài đọc: thư viện chạy truy vấn trong trình duyệt không có validator của collection, nên ở đây không chạy thử.

Làm được: viết luật kiểm tra cho một collection và chọn mức áp dụng hợp với dữ liệu cũ.

```js
db.createCollection("orders", {
  validator: { $jsonSchema: {
    bsonType: "object",
    required: ["customer", "status", "lines"],
    properties: {
      status: { enum: ["draft", "paid", "shipped", "cancelled"] },
      lines: { bsonType: "array", minItems: 1 }
    }
  } },
  validationLevel: "strict",
  validationAction: "error"
})
```

## Thực hành

Ba câu hỏi về cách validator xử lý tài liệu sai.

# EN

## Key idea

MongoDB does not force documents to share a shape, but you can put rules on a collection with `$jsonSchema`:

- `bsonType`: the type of the document or of a field (`"object"`, `"string"`, `"int"`, `"date"`, `"array"`…);
- `required`: the mandatory fields;
- `properties`: rules per field, such as `minimum`, `enum`, `pattern`.

Set it at creation with `db.createCollection(name, { validator })`, or add it to an existing collection with the `collMod` command.

Two knobs:

- `validationLevel`: `"strict"` (the default) checks every insert and update; `"moderate"` skips updates to documents that were already invalid;
- `validationAction`: `"error"` (the default) rejects the bad write; `"warn"` still writes it and only logs the violation.

Newer releases add the action `"errorAndLog"` (MongoDB 8.1) and the level `"constraint"` (MongoDB 9.0), which guarantees every document in the collection is valid.

## Example

A validator only checks writes; it does not fix old data. Use `$jsonSchema` in `find` to find valid documents, and wrap it in `$nor` to find invalid ones.

This is a reading lesson: the library that runs queries in the browser has no collection validators, so nothing runs here.

You can now: write validation rules for a collection and choose how strictly they apply to old data.

```js
db.createCollection("orders", {
  validator: { $jsonSchema: {
    bsonType: "object",
    required: ["customer", "status", "lines"],
    properties: {
      status: { enum: ["draft", "paid", "shipped", "cancelled"] },
      lines: { bsonType: "array", minItems: 1 }
    }
  } },
  validationLevel: "strict",
  validationAction: "error"
})
```

## Practice

Three questions about how a validator treats invalid documents.
