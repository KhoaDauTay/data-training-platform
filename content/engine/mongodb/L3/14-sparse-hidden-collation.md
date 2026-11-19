---
id: e-mg-l3-14
engine: mongodb
level: L3
module: special-indexes
title: "Sparse, hidden và collation: index bỏ qua gì, ẩn khỏi ai, so chữ thế nào"
title_en: "Sparse, hidden and collation: what an index skips, who it hides from, how it compares text"
kind: concept
minutes: 12
runtime: docs
objectives:
  - vi: "Biết index sparse bỏ tài liệu thiếu trường, nên planner không dùng nó khi kết quả sẽ thiếu"
    en: "Know that a sparse index skips documents without the field, so the planner does not use it when the result would be incomplete"
  - vi: "Ẩn một index để thử bỏ nó mà không phải xóa, và biết index ẩn vẫn làm gì"
    en: "Hide an index to test dropping it without deleting it, and know what a hidden index still does"
  - vi: "Tạo index không phân biệt hoa thường bằng collation và biết truy vấn phải ghi cùng collation"
    en: "Build a case-insensitive index with a collation and know that the query must state the same collation"
requires: [e-mg-l3-01]
sources:
  - https://www.mongodb.com/docs/manual/core/index-sparse/
  - https://www.mongodb.com/docs/manual/core/index-hidden/
  - https://www.mongodb.com/docs/manual/core/index-case-insensitive/
  - https://www.mongodb.com/docs/manual/reference/collation/
quiz:
  - q:
      vi: "Index `{ plot: 1 }` có `sparse: true`, và một số phim không có `plot`. Truy vấn `db.movies.find().sort({ plot: -1 })` không có `hint()`. Planner có dùng index sparse để sắp không?"
      en: "The index `{ plot: 1 }` has `sparse: true`, and some movies have no `plot`. The query `db.movies.find().sort({ plot: -1 })` has no `hint()`. Does the planner use the sparse index for the sort?"
    options:
      - { vi: "Có, vì sắp theo đúng trường của index", en: "Yes, because the sort is on the index's own field" }
      - { vi: "Không, vì dùng nó sẽ làm mất các phim không có `plot`", en: "No, because using it would lose the movies without `plot`" }
      - { vi: "Có, rồi nối thêm các phim thiếu `plot` ở cuối", en: "Yes, then it appends the movies without `plot` at the end" }
    answer: 1
    why:
      vi: "Truy vấn không lọc gì nên phải trả mọi phim. Index sparse không có khóa cho phim thiếu `plot`, nên MongoDB không dùng nó, trừ khi `hint()` ép dùng. Khi đó kết quả chỉ còn phim có `plot`."
      en: "The query has no filter, so it must return every movie. The sparse index has no key for movies without `plot`, so MongoDB does not use it unless `hint()` forces it. Then only movies with `plot` come back."
  - q:
      vi: "Bạn ẩn index unique `{ email: 1 }` bằng `hideIndex`. Sau đó chèn một tài liệu có `email` đã tồn tại. Chuyện gì xảy ra?"
      en: "You hide the unique index `{ email: 1 }` with `hideIndex`. Then you insert a document whose `email` already exists. What happens?"
    options:
      - { vi: "Chèn được, vì index ẩn không còn hoạt động", en: "It is inserted, because a hidden index no longer works" }
      - { vi: "Bị từ chối, vì index ẩn vẫn giữ ràng buộc unique", en: "It is rejected, because a hidden index still enforces its unique constraint" }
      - { vi: "Chèn được, rồi index tự xóa bản trùng khi bỏ ẩn", en: "It is inserted, and the index removes the duplicate when unhidden" }
    answer: 1
    why:
      vi: "Index ẩn chỉ ẩn khỏi planner. Nó vẫn được cập nhật mỗi lần ghi, vẫn giữ ràng buộc unique, index TTL ẩn vẫn xóa tài liệu hết hạn."
      en: "A hidden index is hidden only from the planner. It is still updated on every write, still enforces its unique constraint, and a hidden TTL index still expires documents."
  - q:
      vi: "Index `{ type: 1 }` tạo với `collation: { locale: \"en\", strength: 2 }`, collection không có collation mặc định. Truy vấn `db.fruit.find({ type: \"apple\" })` không ghi collation. Kết quả?"
      en: "The index `{ type: 1 }` was built with `collation: { locale: \"en\", strength: 2 }`, and the collection has no default collation. The query `db.fruit.find({ type: \"apple\" })` states no collation. What happens?"
    options:
      - { vi: "Dùng index, không phân biệt hoa thường", en: "It uses the index, case-insensitively" }
      - { vi: "Không dùng index, so chữ phân biệt hoa thường", en: "It does not use the index, and compares case-sensitively" }
      - { vi: "Báo lỗi vì thiếu collation", en: "It fails because the collation is missing" }
    answer: 1
    why:
      vi: "Muốn index có collation phục vụ so chuỗi, truy vấn phải ghi cùng collation. Không ghi thì truy vấn so nhị phân như thường, chỉ khớp `apple` viết thường, và không dùng index đó."
      en: "For an index with a collation to serve string comparisons, the query must state the same collation. Without it the query compares as usual, matches only lowercase `apple`, and does not use that index."
---

## Ý chính

Ba thuộc tính này không đổi loại index, chỉ đổi index chứa gì, ai thấy nó và so chuỗi ra sao. Bài đọc theo tài liệu MongoDB, không có `mongod` trong trình duyệt.

- **Sparse**: chỉ có khóa cho tài liệu có trường đó, kể cả khi giá trị là `null`; tài liệu thiếu trường bị bỏ. Nếu dùng index sparse làm thiếu kết quả của truy vấn hay sắp xếp, MongoDB không dùng nó trừ khi `hint()` chỉ định. `countDocuments({}, { hint: ... })` với index sparse đếm thiếu. Index `2d`, `2dsphere`, `text` và wildcard luôn sparse. Sparse + unique: không cho trùng giá trị, nhưng nhiều tài liệu được thiếu trường. Tài liệu khuyên dùng partial khi cần lọc chính xác hơn "có trường hay không".
- **Hidden**: ẩn khỏi planner, để đo tác động của việc xóa index mà không phải xóa. Index ẩn vẫn được cập nhật khi ghi, vẫn tốn đĩa và bộ nhớ, vẫn giữ unique, index TTL ẩn vẫn xóa tài liệu hết hạn. Không ẩn được index `_id`, không `hint()` được index ẩn. Cần `featureCompatibilityVersion` từ `7.0`. Bỏ ẩn thì dùng được ngay, không phải dựng lại.
- **Collation**: luật so chuỗi theo ngôn ngữ. `strength` 1 chỉ so chữ gốc (bỏ dấu và hoa thường), 2 so thêm dấu (bỏ hoa thường), 3 là mặc định (so cả hoa thường). Index tạo với `strength` 1 hoặc 2 là index không phân biệt hoa thường. Muốn index phục vụ so chuỗi, truy vấn phải ghi **cùng** collation; collation khác (kể cả khác `strength`) thì không dùng được. Collection có collation mặc định thì index và truy vấn mới thừa hưởng nó. `$regex` không theo collation nên không dùng được index loại này.

## Ví dụ

```javascript
db.movies.createIndex({ plot: 1 }, { sparse: true })

db.restaurants.hideIndex("borough_1_ratings_1")
db.restaurants.unhideIndex("borough_1_ratings_1")

db.fruit.createIndex({ type: 1 }, { collation: { locale: "en", strength: 2 } })
db.fruit.find({ type: "apple" }).collation({ locale: "en", strength: 2 })
```

Kết quả `getIndexes()` từ tài liệu MongoDB sau khi ẩn (trường `hidden` chỉ hiện khi bằng `true`):

```javascript
[
  { "v" : 2, "key" : { "_id" : 1 }, "name" : "_id_" },
  { "v" : 2, "key" : { "borough" : 1, "ratings" : 1 }, "name" : "borough_1_ratings_1", "hidden" : true }
]
```

Đúng với tài liệu MongoDB hiện hành, kiểm ngày 2026-11-20.

# EN

## Key idea

These three properties do not change the index kind. They change what the index holds, who can see it and how it compares strings. The lesson follows the MongoDB docs; there is no `mongod` in the browser.

- **Sparse**: holds keys only for documents that have the field, even when its value is `null`; documents without the field are skipped. If using a sparse index would give an incomplete result for a query or a sort, MongoDB does not use it unless `hint()` names it. `countDocuments({}, { hint: ... })` with a sparse index undercounts. `2d`, `2dsphere`, `text` and wildcard indexes are always sparse. Sparse + unique: duplicate values are refused, but many documents may lack the field. The docs recommend partial indexes when you need a filter finer than "has the field or not".
- **Hidden**: hidden from the planner, so you can measure the effect of dropping an index without dropping it. A hidden index is still updated on writes, still uses disk and memory, still enforces unique, and a hidden TTL index still expires documents. The `_id` index cannot be hidden, and a hidden index cannot be named in `hint()`. It needs `featureCompatibilityVersion` `7.0` or later. Once unhidden it is usable at once, with no rebuild.
- **Collation**: language rules for comparing strings. `strength` 1 compares base letters only (ignores accents and case), 2 adds accents (ignores case), 3 is the default (compares case too). An index built with `strength` 1 or 2 is a case-insensitive index. For the index to serve string comparisons, the query must state the **same** collation; a different one (even another `strength`) cannot use it. When the collection has a default collation, new indexes and queries inherit it. `$regex` is not collation-aware, so it cannot use such an index.

## Example

```javascript
db.movies.createIndex({ plot: 1 }, { sparse: true })

db.restaurants.hideIndex("borough_1_ratings_1")
db.restaurants.unhideIndex("borough_1_ratings_1")

db.fruit.createIndex({ type: 1 }, { collation: { locale: "en", strength: 2 } })
db.fruit.find({ type: "apple" }).collation({ locale: "en", strength: 2 })
```

The `getIndexes()` output from the MongoDB docs after hiding (the `hidden` field shows only when it is `true`):

```javascript
[
  { "v" : 2, "key" : { "_id" : 1 }, "name" : "_id_" },
  { "v" : 2, "key" : { "borough" : 1, "ratings" : 1 }, "name" : "borough_1_ratings_1", "hidden" : true }
]
```

Matches the current MongoDB manual, checked 2026-11-20.
