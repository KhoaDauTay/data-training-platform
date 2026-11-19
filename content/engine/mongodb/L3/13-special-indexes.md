---
id: e-mg-l3-13
engine: mongodb
level: L3
module: special-indexes
title: "Wildcard, text, 2dsphere và hashed: index cho dữ liệu đặc biệt"
title_en: "Wildcard, text, 2dsphere and hashed: indexes for special data"
kind: concept
minutes: 12
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
  - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-wildcard/
  - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-wildcard/reference/restrictions/
  - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/
  - https://www.mongodb.com/docs/manual/reference/operator/query/text/
  - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-geospatial/
  - https://www.mongodb.com/docs/manual/reference/geojson/
  - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-hashed/
  - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-hashed/create/
  - https://www.mongodb.com/docs/manual/reference/explain-results/
quiz:
  - q:
      vi: "Mỗi sản phẩm lưu thuộc tính riêng trong `attributes` (áo có `size`, laptop có `ram`, sách có `isbn`), và bạn cần lọc theo bất kỳ thuộc tính nào. Index nào hợp nhất?"
      en: "Each product keeps its own attributes in `attributes` (a shirt has `size`, a laptop has `ram`, a book has `isbn`), and you need to filter on any of them. Which index fits best?"
    options:
      - { vi: "`createIndex({ attributes: \"text\" })`", en: "`createIndex({ attributes: \"text\" })`" }
      - { vi: "`createIndex({ \"attributes.$**\": 1 })`", en: "`createIndex({ \"attributes.$**\": 1 })`" }
      - { vi: "`createIndex({ attributes: \"hashed\" })`", en: "`createIndex({ attributes: \"hashed\" })`" }
    answer: 1
    why:
      vi: "Index wildcard dành cho trường có tên không biết trước hoặc khác nhau giữa các tài liệu. Index text tìm từ trong chuỗi, không lọc theo giá trị một thuộc tính. Index hashed băm cả tài liệu lồng thành một giá trị nên không lọc được từng trường con."
      en: "A wildcard index is for fields whose names are unknown or vary between documents. A text index searches words in strings, it does not filter on one attribute's value. A hashed index hashes the whole embedded document as one value, so it cannot filter on each subfield."
  - q:
      vi: "Có index `{ customerId: \"hashed\" }` và không có index nào khác trên `customerId`. Truy vấn `{ customerId: { $gt: 1000 } }` dùng được index này không?"
      en: "There is an index `{ customerId: \"hashed\" }` and no other index on `customerId`. Can the query `{ customerId: { $gt: 1000 } }` use it?"
    options:
      - { vi: "Có, hash giữ nguyên thứ tự của giá trị", en: "Yes, the hash keeps the order of the values" }
      - { vi: "Không, truy vấn khoảng như `$gt` và `$lt` không dùng được index hashed", en: "No, range queries such as `$gt` and `$lt` cannot use a hashed index" }
      - { vi: "Có, nhưng chỉ khi collection đã được shard", en: "Yes, but only once the collection is sharded" }
    answer: 1
    why:
      vi: "Hai giá trị gần nhau có hash cách xa nhau, nên index hashed không giữ thứ tự. Tài liệu ghi rõ truy vấn khoảng không dùng được index hashed. Cần lọc khoảng thì thêm một index thường trên `customerId`."
      en: "Two close values get far-apart hashes, so a hashed index keeps no order. The docs state that range queries cannot use a hashed index. To filter by range, add a regular index on `customerId`."
---

## Ý chính

Bài 01 dạy multikey, partial và TTL. Bốn loại dưới đây dành cho dữ liệu có hình dạng đặc biệt. Bài này đọc theo tài liệu MongoDB; trình duyệt không có `mongod` nên không có index thật để chạy.

- **Wildcard** (`$**`): cho trường có tên không biết trước hoặc khác nhau giữa các tài liệu. Index này sparse: tài liệu thiếu trường thì không có khóa, nên nó không phục vụ truy vấn "trường không tồn tại". Nó không unique, không TTL, không làm shard key, và không so bằng cả một tài liệu hay cả một mảng. Biết trước tên trường thì index thường trên trường đó tốt hơn.
- **Text**: tìm từ trong chuỗi bằng `$text`, và `$text` cần index này. Mỗi collection chỉ có một index text, nhưng index đó gồm được nhiều trường. Khóa là từ đã đưa về gốc (stem), từ dừng bị bỏ theo ngôn ngữ, và mặc định không phân biệt hoa thường. Index text không phủ được truy vấn, và `$text` không cho `hint()`. Trên Atlas, tài liệu khuyên dùng MongoDB Search thay cho index text.
- **2dsphere / 2d**: dữ liệu vị trí. `2dsphere` tính trên mặt cầu như Trái Đất, nhận GeoJSON và cặp tọa độ cũ. `2d` tính trên mặt phẳng và có thể trả sai với truy vấn trên mặt cầu. `$near`, `$nearSphere` và stage `$geoNear` bắt buộc có index không gian. Trong GeoJSON, kinh độ đứng trước, vĩ độ đứng sau.
- **Hashed**: lưu hash của giá trị, dùng chủ yếu để shard theo hash, rải đều một trường tăng dần như ObjectId. Truy vấn khoảng (`$gt`, `$lt`) không dùng được nó. Không unique, không đặt trên mảng, không phủ truy vấn. Số thực bị cắt về số nguyên 64 bit trước khi băm, nên 2.2, 2.3 và 2.9 trùng hash. Index kép chỉ có đúng một trường `"hashed"`.

## Ví dụ

```javascript
db.products.createIndex({ "attributes.$**": 1 })

db.movies.createIndex({ title: "text", fullplot: "text" })
db.movies.find({ $text: { $search: "baseball" } })

db.stores.createIndex({ location: "2dsphere" })
db.stores.insertOne({ name: "A", location: { type: "Point", coordinates: [108.22, 16.07] } })

db.orders.createIndex({ _id: "hashed" })
```

Explain từ tài liệu MongoDB: trang "Explain Results" có stage `GEO_NEAR_2DSPHERE` (truy vấn gần nhất trên index 2dsphere) bên cạnh `IXSCAN` của index thường. Các trang về index text, 2dsphere và hashed không in explain nào, nên bài này không đưa con số.

Đúng với tài liệu MongoDB hiện hành, kiểm ngày 2026-11-20.

# EN

## Key idea

Lesson 01 covered multikey, partial and TTL. The four kinds below are for data with a special shape. This lesson follows the MongoDB docs; the browser has no `mongod`, so there is no real index to run.

- **Wildcard** (`$**`): for fields whose names are unknown or vary between documents. It is sparse: a document without the field has no key, so it cannot serve a "field does not exist" query. It is not unique, not TTL, not a shard key, and it cannot match a whole document or a whole array by equality. When you know the field names, a regular index on them is better.
- **Text**: searches words in strings with `$text`, and `$text` needs this index. A collection has only one text index, but that index can hold several fields. Keys are stemmed words, stop words are dropped per language, and matching is case-insensitive by default. A text index cannot cover a query, and `$text` does not allow `hint()`. On Atlas, the docs recommend MongoDB Search over text indexes.
- **2dsphere / 2d**: location data. `2dsphere` works on an earth-like sphere and takes GeoJSON and legacy coordinate pairs. `2d` works on a flat surface and can give wrong results for queries on a sphere. `$near`, `$nearSphere` and the `$geoNear` stage require a geospatial index. In GeoJSON, longitude comes first, then latitude.
- **Hashed**: stores the hash of a value, mainly for hashed sharding, which spreads an increasing field such as an ObjectId. Range queries (`$gt`, `$lt`) cannot use it. It is not unique, not on arrays, and cannot cover a query. Floating-point values are truncated to a 64-bit integer before hashing, so 2.2, 2.3 and 2.9 share a hash. A compound index has exactly one `"hashed"` field.

## Example

```javascript
db.products.createIndex({ "attributes.$**": 1 })

db.movies.createIndex({ title: "text", fullplot: "text" })
db.movies.find({ $text: { $search: "baseball" } })

db.stores.createIndex({ location: "2dsphere" })
db.stores.insertOne({ name: "A", location: { type: "Point", coordinates: [108.22, 16.07] } })

db.orders.createIndex({ _id: "hashed" })
```

Explain from the MongoDB docs: the "Explain Results" page has the stage `GEO_NEAR_2DSPHERE` (a nearest query on a 2dsphere index) next to `IXSCAN` for a regular index. The pages on text, 2dsphere and hashed indexes print no explain, so this lesson gives no numbers.

Matches the current MongoDB manual, checked 2026-11-20.
