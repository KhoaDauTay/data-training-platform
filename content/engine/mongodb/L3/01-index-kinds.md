---
id: e-mg-l3-01
engine: mongodb
level: L3
module: indexes
title: "Multikey, partial và TTL: index nào cho dữ liệu nào"
title_en: "Multikey, partial and TTL: which index for which data"
kind: concept
minutes: 14
runtime: docs
objectives:
  - vi: "Biết index multikey sinh một khóa cho mỗi giá trị khác nhau trong mảng, và giới hạn của index kép multikey"
    en: "Know that a multikey index stores one key per distinct array value, and the limits of a compound multikey index"
  - vi: "Biết truy vấn chỉ dùng được index partial khi điều kiện của nó nằm trong bộ lọc của index"
    en: "Know that a query can use a partial index only when its condition falls inside the index filter"
  - vi: "Dùng index TTL để tự xóa tài liệu hết hạn và biết giới hạn của nó"
    en: "Use a TTL index to expire documents and know its limits"
requires: []
sources:
  - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-multikey/
  - https://www.mongodb.com/docs/manual/core/index-partial/
  - https://www.mongodb.com/docs/manual/core/index-ttl/
quiz:
  - q:
      vi: "Một tài liệu có `genres: [\"Drama\", \"Action\", \"Drama\"]`. Index `{ genres: 1 }` giữ bao nhiêu khóa cho tài liệu này?"
      en: "A document has `genres: [\"Drama\", \"Action\", \"Drama\"]`. How many keys does the index `{ genres: 1 }` hold for it?"
    options:
      - { vi: "1", en: "1" }
      - { vi: "2", en: "2" }
      - { vi: "3", en: "3" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì một tài liệu thường là một khóa, nhưng index multikey sinh một khóa cho mỗi giá trị khác nhau trong mảng; giá trị lặp lại chỉ có một khóa. Hai giá trị khác nhau nên có 2 khóa."
      en: "It sounds right because one document is usually one key, but a multikey index stores one key per distinct array value; a repeated value gets only one key. Two distinct values, so 2 keys."
  - q:
      vi: "Index TTL `{ lastSeen: 1 }` với `expireAfterSeconds: 3600`. Một tài liệu hết hạn lúc 10:00. Khi nào nó bị xóa?"
      en: "TTL index `{ lastSeen: 1 }` with `expireAfterSeconds: 3600`. A document expires at 10:00. When is it removed?"
    options:
      - { vi: "Đúng 10:00:00", en: "Exactly at 10:00:00" }
      - { vi: "Khi tác vụ nền chạy lần kế tiếp sau 10:00; tác vụ này chạy mỗi 60 giây", en: "When the background task next runs after 10:00; it runs every 60 seconds" }
      - { vi: "Chỉ khi có truy vấn đọc tới tài liệu đó", en: "Only when a query reads that document" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì có con số giờ hết hạn, nhưng việc xóa do một tác vụ nền làm, chạy mỗi 60 giây, nên tài liệu có thể còn thêm một lúc sau khi hết hạn (lâu hơn nếu máy bận)."
      en: "It sounds right because there is an expiry time, but removal is done by a background task that runs every 60 seconds, so a document can stay a while after it expires (longer on a busy server)."
---
## Mở bài

Sản phẩm có một mảng `tags`, khách có email có thể trống, phiên đăng nhập phải tự biến mất sau một giờ. Ba nhu cầu này đều cần index, nhưng mỗi cái một kiểu khác nhau.

## Ý chính

Bạn không khai báo "multikey". Tạo index trên một trường có giá trị là mảng thì MongoDB tự làm nó thành index multikey: mỗi giá trị khác nhau trong mảng là một khóa, mọi khóa trỏ về cùng một tài liệu. Mảng không có trần thì index phình theo. Trong index kép multikey, mỗi tài liệu có tối đa một trường được index là mảng; index hashed không là multikey được, và index multikey không làm shard key được.

Index partial chỉ chứa tài liệu khớp `partialFilterExpression`. MongoDB không dùng nó nếu việc đó làm thiếu kết quả, nên điều kiện của truy vấn phải nằm trọn trong bộ lọc. Docs chính thức khuyên dùng partial thay cho sparse.

Index TTL: một tác vụ nền xóa tài liệu hết hạn, chạy mỗi 60 giây. Trường phải là ngày (mảng ngày thì lấy ngày sớm nhất). TTL là index một trường, không đặt trên `_id`.

Nhiều người nghĩ truy vấn trên trường mảng phải viết cả mảng. Thật ra `{ tags: "sale" }` khớp mọi tài liệu có `"sale"` trong mảng; viết `{ tags: ["sale"] }` là so bằng cả mảng.

Ví dụ chạy bằng mingo trên bộ dữ liệu `shop`; mingo không có index nên `createIndex` chỉ trả danh sách index, không đo gì.

## Cú pháp

```text
db.<coll>.createIndex({ <arrayField>: 1 })
db.<coll>.createIndex({ <field>: 1 }, { partialFilterExpression: { <condition> } [, unique: true] })
db.<coll>.createIndex({ <dateField>: 1 }, { expireAfterSeconds: <seconds> })
```

- Trường là mảng: index tự thành multikey.
- `partialFilterExpression`: chỉ tài liệu khớp mới vào index; `unique` khi đó chỉ áp lên các tài liệu này.
- `expireAfterSeconds`: tài liệu bị xóa sau mốc ngày cộng số giây.

## Ví dụ

Truy vấn một phần tử của mảng:

```javascript
db.products.find({ tags: "sale" }, { name: 1, tags: 1 })
```

Bốn sản phẩm có `"sale"` trong `tags`. Trên `mongod`, index `{ tags: 1 }` giữ một khóa cho mỗi tag khác nhau của mỗi sản phẩm.

Index multikey và index partial unique:

```javascript
db.products.createIndex({ tags: 1 })
```

```javascript
db.customers.createIndex({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: "string" } } })
```

Khách có `email: null` không vào index, nên nhiều khách chưa có email không bị coi là trùng.

## Lỗi hay gặp

So cả mảng thay vì một phần tử:

```javascript
// WRONG: equality on the whole array
db.products.find({ tags: ["sale"] }, { name: 1 })
```

```javascript
// FIX: a value matches any element
db.products.find({ tags: "sale" }, { name: 1 })
```

Câu sai không ra tài liệu nào, vì không mảng nào đúng bằng `["sale"]`.

Truy vấn rộng hơn bộ lọc của index partial:

```text
// WRONG: the index holds only year > 2000, this query also needs 1991-2000
db.movies.createIndex({ year: 1 }, { partialFilterExpression: { year: { $gt: 2000 } } })
db.movies.find({ year: { $gt: 1990 } })   // COLLSCAN, the partial index is not used
```

Hai trường mảng trong một index kép:

```text
// ERROR: cannot index parallel arrays [tags] [sizes]
db.items.createIndex({ tags: 1, sizes: 1 })   // when one document has both as arrays
```

## Tóm tắt

- Index trên trường mảng tự thành multikey: một khóa cho mỗi giá trị khác nhau.
- Index kép multikey cho tối đa một trường mảng mỗi tài liệu.
- Index partial chỉ dùng được khi điều kiện truy vấn nằm trong bộ lọc của nó.
- TTL là index một trường kiểu ngày; tác vụ nền xóa mỗi 60 giây, không đúng từng giây.

# EN

## Opening

Products have a `tags` array, customers have an email that may be empty, and login sessions must vanish by themselves after an hour. All three need an index, but each needs a different kind.

## Key idea

You never declare "multikey". Index a field whose value is an array and MongoDB makes it a multikey index: each distinct array value is one key, and every key points back to the same document. An array with no upper bound makes the index grow with it. In a compound multikey index each document can have at most one indexed field that is an array; a hashed index cannot be multikey, and a multikey index cannot be a shard key index.

A partial index holds only documents that match its `partialFilterExpression`. MongoDB does not use it if that would give an incomplete result, so the query condition must fall fully inside the filter. The docs recommend partial indexes over sparse ones.

TTL index: a background task removes expired documents and runs every 60 seconds. The field must hold a date (for an array of dates the earliest counts). TTL is a single-field index and cannot be on `_id`.

Many people think a query on an array field must spell out the whole array. In fact `{ tags: "sale" }` matches every document with `"sale"` in the array; `{ tags: ["sale"] }` is equality on the whole array.

The examples run on mingo over the `shop` dataset; mingo has no indexes, so `createIndex` only returns the index list and measures nothing.

## Syntax

```text
db.<coll>.createIndex({ <arrayField>: 1 })
db.<coll>.createIndex({ <field>: 1 }, { partialFilterExpression: { <condition> } [, unique: true] })
db.<coll>.createIndex({ <dateField>: 1 }, { expireAfterSeconds: <seconds> })
```

- An array field: the index becomes multikey by itself.
- `partialFilterExpression`: only matching documents enter the index; `unique` then applies only to them.
- `expireAfterSeconds`: a document is removed after its date plus that many seconds.

## Example

Querying one element of an array:

```javascript
db.products.find({ tags: "sale" }, { name: 1, tags: 1 })
```

Four products have `"sale"` in `tags`. On `mongod`, the index `{ tags: 1 }` holds one key per distinct tag of each product.

A multikey index and a partial unique index:

```javascript
db.products.createIndex({ tags: 1 })
```

```javascript
db.customers.createIndex({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: "string" } } })
```

Customers with `email: null` do not enter the index, so several customers without an email are not treated as duplicates.

## Common mistakes

Matching the whole array instead of one element:

```javascript
// WRONG: equality on the whole array
db.products.find({ tags: ["sale"] }, { name: 1 })
```

```javascript
// FIX: a value matches any element
db.products.find({ tags: "sale" }, { name: 1 })
```

The wrong query returns no document, because no array equals `["sale"]` exactly.

A query wider than the partial index filter:

```text
// WRONG: the index holds only year > 2000, this query also needs 1991-2000
db.movies.createIndex({ year: 1 }, { partialFilterExpression: { year: { $gt: 2000 } } })
db.movies.find({ year: { $gt: 1990 } })   // COLLSCAN, the partial index is not used
```

Two array fields in one compound index:

```text
// ERROR: cannot index parallel arrays [tags] [sizes]
db.items.createIndex({ tags: 1, sizes: 1 })   // when one document has both as arrays
```

## Recap

- An index on an array field becomes multikey: one key per distinct value.
- A compound multikey index allows at most one array field per document.
- A partial index is usable only when the query condition falls inside its filter.
- TTL is a single-field date index; the background task removes every 60 seconds, not to the second.
