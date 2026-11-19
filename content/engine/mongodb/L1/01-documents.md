---
id: e-mg-l1-01
engine: mongodb
level: L1
module: documents
title: Tài liệu, collection và kiểu BSON
title_en: Documents, collections and BSON types
kind: concept
minutes: 8
viz: bson-doc
objectives:
  - vi: Đọc một tài liệu và chỉ ra trường nào là giá trị đơn, trường nào là tài liệu lồng, trường nào là mảng.
    en: Read a document and point out which fields are plain values, which are embedded documents and which are arrays.
  - vi: Biết các kiểu BSON hay gặp (ObjectId, Date, int, double, Decimal128) và hai giới hạn của một tài liệu.
    en: Know the common BSON types (ObjectId, Date, int, double, Decimal128) and the two limits of a document.
requires: []
sources:
  - https://www.mongodb.com/docs/manual/core/document/
  - https://www.mongodb.com/docs/manual/reference/bson-types/
  - https://www.mongodb.com/docs/manual/reference/limits/
quiz:
  - q:
      vi: "Trong tài liệu ví dụ, `address` là gì?"
      en: "In the example document, what is `address`?"
    options:
      - vi: Một tài liệu lồng (embedded document) có hai trường
        en: An embedded document with two fields
      - vi: Một mảng gồm hai chuỗi
        en: An array of two strings
      - vi: Khóa ngoại trỏ sang collection khác
        en: A foreign key into another collection
    answer: 0
    why:
      vi: "`address` nằm trong dấu ngoặc nhọn `{ }` nên là một tài liệu lồng. Mảng dùng ngoặc vuông `[ ]`, như `tags`."
      en: "`address` is wrapped in curly braces `{ }`, so it is an embedded document. Arrays use square brackets `[ ]`, like `tags`."
  - q:
      vi: Một tài liệu BSON được lớn tối đa bao nhiêu?
      en: How large can a single BSON document be?
    options:
      - vi: 16 MiB
        en: 16 MiB
      - vi: 1 MiB
        en: 1 MiB
      - vi: Không giới hạn
        en: No limit
    answer: 0
    why:
      vi: Giới hạn là 16 MiB mỗi tài liệu. Tệp lớn hơn thì dùng GridFS; dữ liệu lớn dần không giới hạn thì nên tách ra tài liệu khác.
      en: The limit is 16 MiB per document. Larger files go to GridFS; data that grows without bound belongs in separate documents.
  - q:
      vi: Bạn cần lưu số tiền chính xác tới từng đồng lẻ (ví dụ 19.99) mà không sai số làm tròn. Kiểu BSON nào hợp nhất?
      en: You must store money exactly (for example 19.99) with no rounding error. Which BSON type fits best?
    options:
      - vi: Decimal128
        en: Decimal128
      - vi: double
        en: double
      - vi: string
        en: string
    answer: 0
    why:
      vi: "`double` là số dấu phẩy động nhị phân nên 19.99 không được lưu chính xác. Decimal128 lưu số thập phân đúng như viết; chuỗi thì không tính toán được."
      en: "`double` is binary floating point, so 19.99 is not stored exactly. Decimal128 keeps the decimal value as written; a string cannot be used in arithmetic."
---
## Ý chính

MongoDB lưu dữ liệu thành tài liệu (document): các cặp tên và giá trị, giống JSON. Các tài liệu cùng loại nằm trong một collection, tương tự một bảng nhưng không bắt mọi tài liệu có cùng các trường.

Giá trị của một trường có thể là:

- giá trị đơn: chuỗi, số, boolean, ngày, `null`;
- tài liệu lồng trong `{ }`, ví dụ địa chỉ;
- mảng trong `[ ]`, ví dụ danh sách nhãn hoặc các dòng hàng của một đơn.

Trên đĩa và trên mạng, tài liệu được mã hóa thành BSON (JSON nhị phân). BSON có thêm kiểu mà JSON không có: `ObjectId` (12 byte: 4 byte thời điểm tạo, 5 byte ngẫu nhiên, 3 byte bộ đếm), `Date` (số mili giây từ 1970, UTC), `int`, `long`, `double` và `Decimal128` cho số thập phân chính xác.

Mọi tài liệu có trường `_id`, duy nhất trong collection. Không đặt thì MongoDB tự sinh một `ObjectId`.

Hai giới hạn: một tài liệu tối đa 16 MiB, và lồng tối đa 100 tầng.

Làm được: đọc một tài liệu, gọi đúng tên từng phần, và chọn kiểu BSON hợp cho tiền, ngày và mã.

## Ví dụ

```js
{
  _id: ObjectId("6716f0a1c2b3d4e5f6a7b8c9"),
  name: "An",
  joined: ISODate("2026-03-14T00:00:00Z"),
  address: { city: "Da Nang", district: "Hai Chau" },
  tags: ["vip", "newsletter"],
  balance: NumberDecimal("19.99")
}
```

`address` là tài liệu lồng, `tags` là mảng, `joined` là kiểu Date, `balance` là Decimal128.

## Thực hành

Bấm qua sơ đồ để xem từng trường được mã hóa thành kiểu BSON nào, rồi trả lời ba câu hỏi.

# EN

## Key idea

MongoDB stores data as documents: name and value pairs, like JSON. Documents of the same kind live in a collection, which is similar to a table but does not force every document to have the same fields.

A field's value can be:

- a plain value: string, number, boolean, date, `null`;
- an embedded document in `{ }`, such as an address;
- an array in `[ ]`, such as a list of tags or the lines of an order.

On disk and on the wire, documents are encoded as BSON (binary JSON). BSON adds types that JSON lacks: `ObjectId` (12 bytes: 4-byte creation time, 5 random bytes, 3-byte counter), `Date` (milliseconds since 1970, UTC), `int`, `long`, `double` and `Decimal128` for exact decimals.

Every document has an `_id` field, unique in its collection. If you leave it out, MongoDB generates an `ObjectId`.

Two limits: a document is at most 16 MiB, and nesting goes at most 100 levels deep.

You can now: read a document, name each part correctly, and pick a suitable BSON type for money, dates and codes.

## Example

```js
{
  _id: ObjectId("6716f0a1c2b3d4e5f6a7b8c9"),
  name: "An",
  joined: ISODate("2026-03-14T00:00:00Z"),
  address: { city: "Da Nang", district: "Hai Chau" },
  tags: ["vip", "newsletter"],
  balance: NumberDecimal("19.99")
}
```

`address` is an embedded document, `tags` is an array, `joined` is a Date, `balance` is a Decimal128.

## Practice

Step through the diagram to see which BSON type each field is encoded as, then answer the three questions.
