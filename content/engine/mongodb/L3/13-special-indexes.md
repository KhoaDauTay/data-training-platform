---
id: e-mg-l3-13
engine: mongodb
level: L3
module: special-indexes
title: "Wildcard, text, 2dsphere và hashed: index cho dữ liệu đặc biệt"
title_en: "Wildcard, text, 2dsphere and hashed: indexes for special data"
kind: concept
minutes: 14
runtime: docs
objectives:
  - vi: "Dùng index wildcard khi tên trường thay đổi giữa các tài liệu, và biết nó không làm được gì"
    en: "Use a wildcard index when field names vary between documents, and know what it cannot do"
  - vi: "Biết collection chỉ có một index text và truy vấn `$text` cần nó"
    en: "Know that a collection has only one text index and that `$text` queries need it"
  - vi: "Chọn 2dsphere hay 2d, và ghi tọa độ theo thứ tự kinh độ trước"
    en: "Choose 2dsphere or 2d, and write coordinates longitude first"
  - vi: "Biết index hashed rải đều dữ liệu khi shard nhưng không phục vụ truy vấn khoảng"
    en: "Know that a hashed index spreads data for sharding but cannot serve range queries"
requires: [e-mg-l3-01]
sources:
  - { url: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-wildcard/, title_vi: "Index wildcard" }
  - { url: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-wildcard/reference/restrictions/, title_vi: "Index wildcard: giới hạn" }
  - { url: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/, title_vi: "Index text" }
  - { url: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-geospatial/, title_vi: "Index không gian địa lý" }
  - { url: https://www.mongodb.com/docs/manual/reference/geojson/, title_vi: "Đối tượng GeoJSON" }
  - { url: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-hashed/, title_vi: "Index hashed" }
quiz:
  - q:
      vi: "Mỗi sản phẩm lưu thuộc tính riêng trong `attributes` (áo có `size`, laptop có `ram`, sách có `isbn`), và bạn cần lọc theo bất kỳ thuộc tính nào. Index nào hợp nhất?"
      en: "Each product keeps its own attributes in `attributes` (a shirt has `size`, a laptop has `ram`, a book has `isbn`), and you need to filter on any of them. Which index fits best?"
    options:
      - { vi: "`createIndex({ attributes: \"text\" })`", en: "`createIndex({ attributes: \"text\" })`" }
      - { vi: "`createIndex({ \"attributes.$**\": 1 })`", en: "`createIndex({ \"attributes.$**\": 1 })`" }
      - { vi: "`createIndex({ attributes: \"hashed\" })`", en: "`createIndex({ attributes: \"hashed\" })`" }
    answer: 1
    trap: 0
    why:
      vi: "Index text nghe như \"tìm được mọi thứ\", nhưng nó tìm từ trong chuỗi bằng `$text`, không lọc được kiểu `ram` bằng 16 hay `size` bằng M. Index wildcard `attributes.$**` tạo khóa riêng cho từng trường con (`size`, `ram`, `isbn`…), kể cả trường thêm sau này, nên lọc theo trường nào cũng dùng được. Index hashed băm cả tài liệu nhúng `attributes` thành một giá trị, nên không lọc được từng trường con."
      en: "A text index sounds like it \"finds anything\", but it searches words in strings with `$text`; it cannot filter `ram` equal to 16 or `size` equal to M. The wildcard index `attributes.$**` makes a separate key for each subfield (`size`, `ram`, `isbn`...), including ones added later, so a filter on any of them can use it. A hashed index hashes the whole embedded document `attributes` as one value, so it cannot filter on each subfield."
  - q:
      vi: "Có index `{ customerId: \"hashed\" }` và không có index nào khác trên `customerId`. Truy vấn `{ customerId: { $gt: 1000 } }` dùng được index này không?"
      en: "There is an index `{ customerId: \"hashed\" }` and no other index on `customerId`. Can the query `{ customerId: { $gt: 1000 } }` use it?"
    options:
      - { vi: "Có, hash giữ nguyên thứ tự của giá trị", en: "Yes, the hash keeps the order of the values" }
      - { vi: "Không, truy vấn khoảng như `$gt` và `$lt` không dùng được index hashed", en: "No, range queries such as `$gt` and `$lt` cannot use a hashed index" }
      - { vi: "Có, nhưng chỉ khi collection đã được shard", en: "Yes, but only once the collection is sharded" }
    answer: 1
    trap: 0
    why:
      vi: "Index thường giữ thứ tự, nhưng index hashed sắp theo hash: 1000 và 1001 có hash cách xa nhau, nên các `customerId` lớn hơn 1000 không nằm thành một đoạn liền để quét. Docs chính thức ghi rõ truy vấn khoảng không dùng được nó. Shard collection cũng không giúp index hashed lọc khoảng: shard theo hash chỉ rải dữ liệu, khoảng vẫn phải hỏi mọi shard. Cần lọc khoảng thì thêm một index thường trên `customerId`."
      en: "Regular indexes keep order, but a hashed index is ordered by hash: 1000 and 1001 get far-apart hashes, so the `customerId` values above 1000 do not form one contiguous run to scan. The docs state that range queries cannot use it. Sharding the collection does not let a hashed index filter ranges: hashed sharding only spreads the data, and a range still has to ask every shard. To filter by range, add a regular index on `customerId`."
---
## Mở bài

Danh mục có áo với `size`, laptop với `ram`, sách với `isbn`, khách muốn tìm theo chữ trong mô tả, và ứng dụng cần "cửa hàng gần tôi nhất". Index B-tree trên một trường cố định không đáp được hết. MongoDB có bốn loại index riêng cho những hình dạng dữ liệu này.

## Ý chính

**Wildcard** (`$**`) cho trường có tên không biết trước hoặc khác nhau giữa các tài liệu. Nó sparse: tài liệu thiếu trường thì không có khóa, nên không phục vụ truy vấn "trường không tồn tại". Nó không unique, không TTL, không làm shard key, không so bằng cả một tài liệu hay cả một mảng. Biết trước tên trường thì index thường trên trường đó tốt hơn.

**Text** tìm từ trong chuỗi bằng `$text`, và `$text` cần index này. Mỗi collection chỉ có một index text, nhưng index đó gồm được nhiều trường. Khóa là từ đã đưa về gốc, từ dừng bị bỏ theo ngôn ngữ, mặc định không phân biệt hoa thường. Index text không phủ được truy vấn. Trên Atlas, docs chính thức khuyên dùng MongoDB Search thay cho index text.

**2dsphere / 2d** cho vị trí. `2dsphere` tính trên mặt cầu như Trái Đất và nhận GeoJSON; `2d` tính trên mặt phẳng. `$near`, `$nearSphere` và `$geoNear` bắt buộc có index không gian. Trong GeoJSON, kinh độ đứng trước, vĩ độ sau.

**Hashed** lưu hash của giá trị, chủ yếu để shard theo hash, rải đều một trường tăng dần như ObjectId. Nhiều người nghĩ index hashed cũng lọc khoảng được như index thường. Thật ra hash không giữ thứ tự, nên `$gt`, `$lt` không dùng được nó; nó cũng không unique, không đặt trên mảng, không phủ truy vấn. Index kép chỉ có đúng một trường `"hashed"`.

Bài đọc theo docs chính thức. Khối `javascript` chạy bằng mingo trên dữ liệu `shop`: mingo chỉ ghi lại định nghĩa index (`getIndexes`), không dựng index thật và không có explain.

## Cú pháp

```text
db.<coll>.createIndex({ "<field>.$**": 1 })                 // wildcard under one field
db.<coll>.createIndex({ <field1>: "text", <field2>: "text" }) // the one text index
db.<coll>.createIndex({ <location>: "2dsphere" })
db.<coll>.createIndex({ <field>: "hashed" })
db.<coll>.find({ $text: { $search: "<words>" } })
```

- `$**`: mọi trường con dưới `<field>`, mỗi trường thành khóa riêng.
- `"text"`: một index cho mỗi collection, gồm được nhiều trường.
- `"2dsphere"`: GeoJSON, tọa độ `[lng, lat]` (kinh độ, vĩ độ).
- `"hashed"`: so bằng và shard theo hash, không so khoảng.

## Ví dụ

Index wildcard cho thuộc tính tự do:

```javascript
db.products.createIndex({ "attributes.$**": 1 })
```

Kết quả là danh sách index; tên tự sinh là `attributes.$**_1`.

Index text trên tên sản phẩm:

```javascript
db.products.createIndex({ name: "text" })
```

Một điểm GeoJSON đúng thứ tự, kinh độ trước:

```javascript
db.stores.insertOne({ name: "A", location: { type: "Point", coordinates: [108.22, 16.07] } })
```

Tìm theo chữ (trên `mongod`, cần index text; mingo không có `$text`):

```text
db.products.find({ $text: { $search: "tea" } })
```

## Lỗi hay gặp

Ghi vĩ độ trước:

```text
// WRONG: latitude first, 108.22 lands in the latitude slot
db.stores.insertOne({ location: { type: "Point", coordinates: [16.07, 108.22] } })
```

```text
// FIX: longitude first
db.stores.insertOne({ location: { type: "Point", coordinates: [108.22, 16.07] } })
```

Có index 2dsphere thì `mongod` từ chối tài liệu sai vì vĩ độ phải trong khoảng -90 đến 90; không có index thì nó vào, và mọi truy vấn gần nhất sau đó sai.

Thêm index text thứ hai:

```text
// WRONG: a collection already has a text index on title
db.articles.createIndex({ body: "text" })
```

```text
// FIX: drop it and build one text index on both fields
db.articles.createIndex({ title: "text", body: "text" })
```

`mongod` từ chối index text thứ hai trên cùng collection.

Lọc khoảng trên index hashed:

```text
// WRONG: the only index on customerId is hashed, so this scans
db.orders.find({ customerId: { $gt: 1000 } })
```

Hash không giữ thứ tự. Thêm index thường `{ customerId: 1 }` cho truy vấn khoảng.

## Tóm tắt

- Wildcard cho tên trường không biết trước; biết tên thì index thường tốt hơn.
- Mỗi collection một index text, gồm được nhiều trường; `$text` cần nó.
- 2dsphere nhận GeoJSON, kinh độ trước vĩ độ.
- Hashed rải đều khi shard nhưng không phục vụ `$gt`, `$lt`.

# EN

## Opening

The catalogue has shirts with `size`, laptops with `ram`, books with `isbn`, customers want to search words in descriptions, and the app needs "the store nearest me". A B-tree index on one fixed field cannot answer all of that. MongoDB has four index kinds for these data shapes.

## Key idea

**Wildcard** (`$**`) is for fields whose names are unknown or vary between documents. It is sparse: a document without the field has no key, so it cannot serve a "field does not exist" query. It is not unique, not TTL, not a shard key, and it cannot match a whole document or a whole array by equality. When you know the field names, a regular index on them is better.

**Text** searches words in strings with `$text`, and `$text` needs this index. A collection has only one text index, but that index can hold several fields. Keys are stemmed words, stop words are dropped per language, and matching is case-insensitive by default. A text index cannot cover a query. On Atlas, the docs recommend MongoDB Search over text indexes.

**2dsphere / 2d** are for locations. `2dsphere` works on an earth-like sphere and takes GeoJSON; `2d` works on a flat surface. `$near`, `$nearSphere` and `$geoNear` require a geospatial index. In GeoJSON, longitude comes first, then latitude.

**Hashed** stores the hash of a value, mainly for hashed sharding, which spreads an increasing field such as an ObjectId. Many people think a hashed index can filter ranges like a regular one. In fact a hash keeps no order, so `$gt`, `$lt` cannot use it; it is also not unique, not on arrays, and cannot cover a query. A compound index has exactly one `"hashed"` field.

The lesson follows the official docs. The `javascript` blocks run on mingo over the `shop` data: mingo only records the index definition (`getIndexes`), it builds no real index and has no explain.

## Syntax

```text
db.<coll>.createIndex({ "<field>.$**": 1 })                 // wildcard under one field
db.<coll>.createIndex({ <field1>: "text", <field2>: "text" }) // the one text index
db.<coll>.createIndex({ <location>: "2dsphere" })
db.<coll>.createIndex({ <field>: "hashed" })
db.<coll>.find({ $text: { $search: "<words>" } })
```

- `$**`: every subfield under `<field>`, each one its own key.
- `"text"`: one index per collection, which can hold several fields.
- `"2dsphere"`: GeoJSON, coordinates `[lng, lat]` (longitude, latitude).
- `"hashed"`: equality and hashed sharding, no range comparisons.

## Example

A wildcard index for free-form attributes:

```javascript
db.products.createIndex({ "attributes.$**": 1 })
```

The result is the index list; the generated name is `attributes.$**_1`.

A text index on product names:

```javascript
db.products.createIndex({ name: "text" })
```

A GeoJSON point in the right order, longitude first:

```javascript
db.stores.insertOne({ name: "A", location: { type: "Point", coordinates: [108.22, 16.07] } })
```

Searching words (on `mongod` it needs the text index; mingo has no `$text`):

```text
db.products.find({ $text: { $search: "tea" } })
```

## Common mistakes

Writing latitude first:

```text
// WRONG: latitude first, 108.22 lands in the latitude slot
db.stores.insertOne({ location: { type: "Point", coordinates: [16.07, 108.22] } })
```

```text
// FIX: longitude first
db.stores.insertOne({ location: { type: "Point", coordinates: [108.22, 16.07] } })
```

With a 2dsphere index, `mongod` refuses the wrong document because latitude must be between -90 and 90; without the index it goes in, and every later nearest query is wrong.

Adding a second text index:

```text
// WRONG: a collection already has a text index on title
db.articles.createIndex({ body: "text" })
```

```text
// FIX: drop it and build one text index on both fields
db.articles.createIndex({ title: "text", body: "text" })
```

`mongod` refuses a second text index on the same collection.

Range filtering on a hashed index:

```text
// WRONG: the only index on customerId is hashed, so this scans
db.orders.find({ customerId: { $gt: 1000 } })
```

A hash keeps no order. Add a regular index `{ customerId: 1 }` for range queries.

## Recap

- Wildcard is for field names not known in advance; when you know them, a regular index is better.
- One text index per collection, which can hold several fields; `$text` needs it.
- 2dsphere takes GeoJSON, longitude before latitude.
- Hashed spreads data for sharding but cannot serve `$gt`, `$lt`.
