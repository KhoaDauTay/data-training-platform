---
id: e-mg-l1-01
engine: mongodb
level: L1
module: documents
title: Tài liệu, collection và kiểu BSON
title_en: Documents, collections and BSON types
kind: concept
runtime: docs
minutes: 12
viz: mg-bson-doc
objectives:
  - vi: Đọc một tài liệu và chỉ ra trường nào là giá trị đơn, trường nào là tài liệu nhúng, trường nào là mảng.
    en: Read a document and point out which fields are plain values, which are embedded documents and which are arrays.
  - vi: Biết các kiểu BSON hay gặp (ObjectId, Date, int, double, Decimal128) và hai giới hạn của một tài liệu.
    en: Know the common BSON types (ObjectId, Date, int, double, Decimal128) and the two limits of a document.
  - vi: Biết database và collection được tạo ngầm ở lần ghi đầu, cách xóa chúng, và hai loại collection đặc biệt (capped, time series).
    en: Know that databases and collections are created implicitly on the first write, how to drop them, and two special kinds of collection (capped, time series).
requires: []
demo_setup: '{"collections": {"items": [{"_id": 1, "sku": "A1", "price": 25000}, {"_id": 2, "sku": "A2", "price": "25000"}, {"_id": 3, "sku": "A3", "price": 40000}]}}'
sources:
  - https://www.mongodb.com/docs/manual/core/document/
  - https://www.mongodb.com/docs/manual/reference/bson-types/
  - https://www.mongodb.com/docs/manual/reference/limits/
  - https://www.mongodb.com/docs/manual/core/databases-and-collections/
  - https://www.mongodb.com/docs/manual/core/capped-collections/
  - https://www.mongodb.com/docs/manual/core/timeseries-collections/
quiz:
  - q:
      vi: "Trong tài liệu ví dụ, `address` là gì?"
      en: "In the example document, what is `address`?"
    options:
      - vi: Một tài liệu nhúng (embedded document) có hai trường
        en: An embedded document with two fields
      - vi: Một mảng gồm hai chuỗi
        en: An array of two strings
      - vi: Khóa ngoại trỏ sang collection khác
        en: A foreign key into another collection
    answer: 0
    why:
      vi: "`address` nằm trong dấu ngoặc nhọn `{ }` nên là một tài liệu nhúng. Mảng dùng ngoặc vuông `[ ]`, như `tags`."
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
      vi: Bạn cần lưu số tiền chính xác tới từng đồng lẻ (ví dụ 19,99) mà không sai số làm tròn. Kiểu BSON nào hợp nhất?
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
      vi: "`double` là số dấu phẩy động nhị phân nên 19,99 không được lưu chính xác. Decimal128 lưu số thập phân đúng như viết; chuỗi thì không tính toán được."
      en: "`double` is binary floating point, so 19.99 is not stored exactly. Decimal128 keeps the decimal value as written; a string cannot be used in arithmetic."
  - q:
      vi: "Bạn gõ `use report` rồi `show dbs`, nhưng chưa ghi tài liệu nào. Database `report` có trong danh sách không?"
      en: "You type `use report` then `show dbs`, but have not written any document yet. Is the `report` database in the list?"
    options:
      - vi: Có, `use` đã tạo nó
        en: Yes, `use` created it
      - vi: Chưa, database chỉ được tạo khi ghi dữ liệu lần đầu
        en: Not yet, a database is created only when data is first written
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý khi nghĩ `use` giống `CREATE DATABASE`. Nhưng `use` chỉ chọn database; MongoDB tạo database và collection khi bạn ghi dữ liệu vào lần đầu, ví dụ một `insertOne`."
      en: "It sounds right to think `use` works like `CREATE DATABASE`. But `use` only selects the database; MongoDB creates the database and the collection when you first write data to them, for example with one `insertOne`."
  - q:
      vi: Một collection capped đã đầy. Bạn thêm một tài liệu mới. Chuyện gì xảy ra?
      en: A capped collection is full. You insert a new document. What happens?
    options:
      - vi: Lệnh ghi bị từ chối
        en: The insert is refused
      - vi: Tài liệu cũ nhất bị xóa để lấy chỗ cho tài liệu mới
        en: The oldest documents are removed to make room for the new one
      - vi: Collection tự lớn thêm
        en: The collection grows by itself
    answer: 1
    why:
      vi: "Collection capped có cỡ cố định và giữ thứ tự ghi vào. Khi đầy, nó ghi đè tài liệu cũ nhất, như một bộ đệm vòng. Docs chính thức nói thường nên dùng TTL index hoặc collection time series thay cho capped, vì chúng linh hoạt hơn."
      en: "A capped collection has a fixed size and keeps insertion order. When it is full it overwrites the oldest documents, like a ring buffer. The docs say a TTL index or a time series collection is usually a better choice than capped, since they are more flexible."
---
## Mở bài

Một khách hàng có hai địa chỉ và năm nhãn. Trong SQL bạn sẽ cần ba bảng. Trong MongoDB, tất cả nằm trong một tài liệu; vậy tài liệu đó trông thế nào?

## Ý chính

MongoDB lưu dữ liệu thành tài liệu (document): các cặp tên và giá trị, giống JSON. Các tài liệu cùng loại nằm trong một collection, tương tự một bảng nhưng không bắt mọi tài liệu có cùng các trường.

Giá trị của một trường có thể là:

- giá trị đơn: chuỗi, số, boolean, ngày, `null`;
- tài liệu nhúng trong `{ }`, ví dụ địa chỉ;
- mảng trong `[ ]`, ví dụ danh sách nhãn hoặc các dòng hàng của một đơn.

Trên đĩa và trên mạng, tài liệu được mã hóa thành BSON (JSON nhị phân). BSON có thêm kiểu mà JSON không có: `ObjectId` (12 byte: 4 byte thời điểm tạo, 5 byte ngẫu nhiên, 3 byte bộ đếm), `Date` (số mili giây từ 1970, UTC), `int`, `long`, `double` và `Decimal128` cho số thập phân chính xác.

Mọi tài liệu có trường `_id`, duy nhất trong collection. Không đặt thì MongoDB tự sinh một `ObjectId`. Hai giới hạn: một tài liệu tối đa 16 MiB, và lồng tối đa 100 tầng.

Database và collection không cần lệnh tạo trước: `use shop` chỉ chọn database, và lần ghi đầu (ví dụ `insertOne`) tạo cả database lẫn collection. Lệnh `drop` xóa một collection cùng mọi index của nó; `dropDatabase` xóa database đang chọn. Hai loại collection phải tạo rõ bằng `createCollection`: capped (cỡ cố định, đầy thì ghi đè tài liệu cũ nhất) và time series (cho số đo theo thời gian, xem bài L5).

## Cú pháp

```text
{ _id: <value>, <field>: <value>, <field>: { <field>: <value> }, <field>: [ <value>, <value> ] }
```

- `{ }` là tài liệu (hay tài liệu nhúng), `[ ]` là mảng.
- `_id` bắt buộc và duy nhất; thiếu thì MongoDB sinh `ObjectId`.
- Kiểu của giá trị là kiểu BSON: chuỗi, số (`int`, `long`, `double`, `Decimal128`), `Date`, `ObjectId`…

## Ví dụ

Một khách hàng trong mongosh:

```text
{
  _id: ObjectId("6716f0a1c2b3d4e5f6a7b8c9"),
  name: "An",
  joined: ISODate("2026-03-14T00:00:00Z"),
  address: { city: "Da Nang", district: "Hai Chau" },
  tags: ["vip", "newsletter"],
  balance: NumberDecimal("19.99")
}
```

`address` là tài liệu nhúng, `tags` là mảng, `joined` là kiểu Date, `balance` là Decimal128.

Tạo ngầm và tạo rõ (lệnh của máy chủ, trình duyệt không chạy):

```text
use shop
db.orders.insertOne({ total: 120000 })   // creates shop and orders
db.createCollection("events", { capped: true, size: 1048576, max: 1000 })
db.createCollection("readings", { timeseries: { timeField: "ts", metaField: "sensor" } })
db.events.drop()
db.dropDatabase()
```

Kiểu là một phần của giá trị. Collection `items` có giá lưu bằng số và một giá lưu bằng chuỗi; `$type` tìm ra giá lưu bằng chuỗi:

```js
db.items.find({ price: { $type: "string" } })
```

Kết quả là đúng một tài liệu, `A2`, với `price: "25000"` trong dấu nháy. Trên màn hình nó trông giống hệt `A1`, chỉ kiểu BSON cho biết hai giá trị khác nhau. Đây là cách nhanh để kiểm một collection trước khi tin vào các phép so sánh trên trường đó.

## Lỗi hay gặp

Lưu số dưới dạng chuỗi, rồi so sánh như số:

```js
// WRONG: item A2 stores "25000" as a string, so the number comparison skips it
db.items.find({ price: { $lt: 30000 } })
```

```js
// FIX: find the values stored with the wrong type, then store them as numbers
db.items.find({ price: { $type: "string" } })
```

Bản sai chỉ trả `A1`: phép so sánh số bỏ qua lặng lẽ giá trị lưu bằng chuỗi, không báo lỗi. Bản sửa không phải truy vấn tốt hơn mà là bước tìm thủ phạm; cách sửa thật là ghi lại giá trị đó thành số, rồi giữ kiểu đúng ngay từ lúc thêm (bài L2 về kiểm tra lược đồ chỉ cách chặn từ đầu).

Tự đặt `_id` trùng với tài liệu đã có:

```js
// ERROR duplicate_key
db.items.insertOne({ _id: 1, sku: "A4", price: 52000 })
```

MongoDB thật báo lỗi khóa trùng mã 11000, vì `_id` luôn có index duy nhất. Mã `duplicate_key` trên khối này là của mingo, bộ chạy trong trình duyệt; thông báo thì giống: `E11000 duplicate key error`. Cách sửa: bỏ `_id` để MongoDB tự sinh, hoặc chọn một giá trị chưa dùng.

## Tóm tắt

- Tài liệu là các cặp tên và giá trị; collection gom tài liệu cùng loại.
- Giá trị có thể là giá trị đơn, tài liệu nhúng `{ }` hoặc mảng `[ ]`.
- BSON có thêm `ObjectId`, `Date`, `Decimal128`; tiền chính xác dùng `Decimal128`.
- Mỗi tài liệu có `_id` duy nhất và tối đa 16 MiB.
- Database và collection được tạo ở lần ghi đầu; capped và time series tạo bằng `createCollection`.

# EN

## Opening

A customer has two addresses and five tags. In SQL you would need three tables. In MongoDB it all sits in one document; so what does that document look like?

## Key idea

MongoDB stores data as documents: name and value pairs, like JSON. Documents of the same kind live in a collection, which is similar to a table but does not force every document to have the same fields.

A field's value can be:

- a plain value: string, number, boolean, date, `null`;
- an embedded document in `{ }`, such as an address;
- an array in `[ ]`, such as a list of tags or the lines of an order.

On disk and on the wire, documents are encoded as BSON (binary JSON). BSON adds types that JSON lacks: `ObjectId` (12 bytes: 4-byte creation time, 5 random bytes, 3-byte counter), `Date` (milliseconds since 1970, UTC), `int`, `long`, `double` and `Decimal128` for exact decimals.

Every document has an `_id` field, unique in its collection. If you leave it out, MongoDB generates an `ObjectId`. Two limits: a document is at most 16 MiB, and nesting goes at most 100 levels deep.

Databases and collections need no create command first: `use shop` only selects the database, and the first write (for example `insertOne`) creates both the database and the collection. `drop` removes a collection with all its indexes; `dropDatabase` removes the selected database. Two kinds of collection must be created explicitly with `createCollection`: capped (fixed size, overwrites the oldest documents when full) and time series (for measurements over time, see the L5 lesson).

## Syntax

```text
{ _id: <value>, <field>: <value>, <field>: { <field>: <value> }, <field>: [ <value>, <value> ] }
```

- `{ }` is a document (or an embedded document), `[ ]` is an array.
- `_id` is required and unique; if it is missing, MongoDB generates an `ObjectId`.
- A value's type is a BSON type: string, number (`int`, `long`, `double`, `Decimal128`), `Date`, `ObjectId`…

## Example

A customer in mongosh:

```text
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

Implicit and explicit creation (server commands, the browser does not run them):

```text
use shop
db.orders.insertOne({ total: 120000 })   // creates shop and orders
db.createCollection("events", { capped: true, size: 1048576, max: 1000 })
db.createCollection("readings", { timeseries: { timeField: "ts", metaField: "sensor" } })
db.events.drop()
db.dropDatabase()
```

The type is part of the value. Collection `items` stores prices as numbers and one price as a string; `$type` finds the one stored as a string:

```js
db.items.find({ price: { $type: "string" } })
```

The result is exactly one document, `A2`, with `price: "25000"` in quotes. On screen it looks just like `A1`; only the BSON type tells the two values apart. This is a quick way to check a collection before trusting comparisons on that field.

## Common mistakes

Storing a number as a string, then comparing it as a number:

```js
// WRONG: item A2 stores "25000" as a string, so the number comparison skips it
db.items.find({ price: { $lt: 30000 } })
```

```js
// FIX: find the values stored with the wrong type, then store them as numbers
db.items.find({ price: { $type: "string" } })
```

The wrong version returns only `A1`: the number comparison silently skips the value stored as a string and reports no error. The fix is not a better query but the step that finds the culprit; the real repair is to write that value back as a number, then keep the right type from the moment of insert (the L2 lesson on schema validation shows how to block it up front).

Choosing an `_id` that another document already has:

```js
// ERROR duplicate_key
db.items.insertOne({ _id: 1, sku: "A4", price: 52000 })
```

A real MongoDB reports a duplicate key error with code 11000, because `_id` always has a unique index. The code `duplicate_key` on this block comes from mingo, the in-browser runtime; the message is the same: `E11000 duplicate key error`. The fix: leave `_id` out so MongoDB generates one, or pick a value not in use.

## Recap

- A document is name and value pairs; a collection groups documents of one kind.
- A value can be a plain value, an embedded document `{ }` or an array `[ ]`.
- BSON adds `ObjectId`, `Date`, `Decimal128`; exact money uses `Decimal128`.
- Each document has a unique `_id` and is at most 16 MiB.
- Databases and collections are created by the first write; capped and time series ones by `createCollection`.
