---
id: e-mg-l3-14
engine: mongodb
level: L3
module: special-indexes
title: "Sparse, hidden và collation: index bỏ qua gì, ẩn khỏi ai, so chữ thế nào"
title_en: "Sparse, hidden and collation: what an index skips, who it hides from, how it compares text"
kind: concept
minutes: 14
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
demo_setup: '{"collections": {"movies": [{"_id": 1, "rated": "PG"}, {"_id": 2}, {"_id": 3, "rated": null}, {"_id": 4, "rated": "R"}], "fruit": [{"_id": 1, "type": "apple"}, {"_id": 2, "type": "Apple"}, {"_id": 3, "type": "APPLE"}]}}'
quiz:
  - q:
      vi: "Index `{ plot: 1 }` có `sparse: true`, và một số phim không có `plot`. Truy vấn `db.movies.find().sort({ plot: -1 })` không có `hint()`. Planner có dùng index sparse để sắp không?"
      en: "The index `{ plot: 1 }` has `sparse: true`, and some movies have no `plot`. The query `db.movies.find().sort({ plot: -1 })` has no `hint()`. Does the planner use the sparse index for the sort?"
    options:
      - { vi: "Có, vì sắp theo đúng trường của index", en: "Yes, because the sort is on the index's own field" }
      - { vi: "Không, vì dùng nó sẽ làm mất các phim không có `plot`", en: "No, because using it would lose the movies without `plot`" }
      - { vi: "Có, rồi nối thêm các phim thiếu `plot` ở cuối", en: "Yes, then it appends the movies without `plot` at the end" }
    answer: 1
    trap: 0
    why:
      vi: "Sắp theo đúng trường của index thường dùng được index, nhưng truy vấn không lọc gì nên phải trả mọi phim. Index sparse không có khóa cho phim thiếu `plot`, nên MongoDB không dùng nó, trừ khi `hint()` ép dùng; khi đó kết quả chỉ còn phim có `plot`. MongoDB không nối thêm phần thiếu: nó quét cả collection rồi sắp trong bộ nhớ."
      en: "Sorting on an index's own field can usually use the index, but the query has no filter, so it must return every movie. The sparse index has no key for movies without `plot`, so MongoDB does not use it unless `hint()` forces it; then only movies with `plot` come back. MongoDB does not append the missing part: it scans the collection and sorts in memory."
  - q:
      vi: "Bạn ẩn index unique `{ email: 1 }` bằng `hideIndex`. Sau đó chèn một tài liệu có `email` đã tồn tại. Chuyện gì xảy ra?"
      en: "You hide the unique index `{ email: 1 }` with `hideIndex`. Then you insert a document whose `email` already exists. What happens?"
    options:
      - { vi: "Chèn được, vì index ẩn không còn hoạt động", en: "It is inserted, because a hidden index no longer works" }
      - { vi: "Bị từ chối, vì index ẩn vẫn giữ ràng buộc unique", en: "It is rejected, because a hidden index still enforces its unique constraint" }
      - { vi: "Chèn được, rồi index tự xóa bản trùng khi bỏ ẩn", en: "It is inserted, and the index removes the duplicate when unhidden" }
    answer: 1
    trap: 0
    why:
      vi: "\"Ẩn\" nghe giống \"tắt\", nhưng index ẩn chỉ ẩn khỏi planner khi chọn kế hoạch đọc. Nó vẫn được cập nhật mỗi lần ghi và vẫn giữ ràng buộc unique, nên lần chèn `email` trùng bị từ chối ngay (index TTL ẩn cũng vẫn xóa tài liệu hết hạn). Vì không bản trùng nào vào được, bỏ ẩn cũng không có gì để dọn; index unique không bao giờ tự xóa tài liệu."
      en: "\"Hidden\" sounds like \"off\", but a hidden index is hidden only from the planner when it picks a read plan. It is still updated on every write and still enforces its unique constraint, so the insert with a duplicate `email` is rejected at once (a hidden TTL index still expires documents too). Since no duplicate gets in, there is nothing to clean up on unhiding; a unique index never deletes documents by itself."
  - q:
      vi: "Index `{ type: 1 }` tạo với `collation: { locale: \"en\", strength: 2 }`, collection không có collation mặc định. Truy vấn `db.fruit.find({ type: \"apple\" })` không ghi collation. Kết quả?"
      en: "The index `{ type: 1 }` was built with `collation: { locale: \"en\", strength: 2 }`, and the collection has no default collation. The query `db.fruit.find({ type: \"apple\" })` states no collation. What happens?"
    options:
      - { vi: "Dùng index, không phân biệt hoa thường", en: "It uses the index, case-insensitively" }
      - { vi: "Không dùng index, so chữ phân biệt hoa thường", en: "It does not use the index, and compares case-sensitively" }
      - { vi: "Báo lỗi vì thiếu collation", en: "It fails because the collation is missing" }
    answer: 1
    why:
      vi: "Muốn index có collation phục vụ so chuỗi, truy vấn phải ghi cùng collation. Không ghi thì truy vấn dùng luật so mặc định của collection (ở đây không có, tức so từng ký tự, phân biệt hoa thường), chỉ khớp `apple` viết thường, và không dùng index đó. Thiếu collation cũng không phải lỗi: truy vấn vẫn chạy, chỉ là vẫn phân biệt hoa thường."
      en: "For an index with a collation to serve string comparisons, the query must state the same collation. Without it the query uses the collection's default comparison (none here, so character by character, case-sensitive), matches only lowercase `apple`, and does not use that index. A missing collation is no error either: the query runs, just case-sensitively."
---
## Mở bài

Bạn muốn biết một index có còn cần không, nhưng xóa rồi dựng lại trên collection lớn mất hàng giờ. Một index khác thì hình như không ai dùng tới, vì truy vấn tìm `apple` bỏ qua `Apple`. Ba thuộc tính sparse, hidden và collation giải thích cả hai chuyện.

## Ý chính

**Sparse** chỉ có khóa cho tài liệu có trường đó, kể cả khi giá trị là `null`; tài liệu thiếu trường bị bỏ. Nếu dùng index sparse làm thiếu kết quả của truy vấn hay sắp xếp, MongoDB không dùng nó trừ khi `hint()` chỉ định. Index `2d`, `2dsphere`, `text` và wildcard luôn sparse. Sparse + unique: không cho trùng giá trị, nhưng nhiều tài liệu được thiếu trường. Docs chính thức khuyên dùng partial khi cần lọc tinh hơn "có trường hay không".

**Hidden** ẩn index khỏi planner, để đo tác động của việc xóa mà không phải xóa. Nhiều người nghĩ ẩn là tắt hẳn. Thật ra index ẩn vẫn được cập nhật khi ghi, vẫn tốn đĩa và bộ nhớ, vẫn giữ unique, index TTL ẩn vẫn xóa tài liệu hết hạn. Không ẩn được index `_id`, không `hint()` được index ẩn. Bỏ ẩn thì dùng được ngay, không phải dựng lại.

**Collation** là luật so chuỗi theo ngôn ngữ. `strength` 1 chỉ so chữ gốc (bỏ dấu và hoa thường), 2 so thêm dấu (bỏ hoa thường), 3 là mặc định. Index tạo với `strength` 1 hoặc 2 là index không phân biệt hoa thường. Truy vấn phải ghi **cùng** collation thì mới dùng được nó. `$regex` không theo collation nên không dùng được index loại này.

Khối `javascript` chạy bằng mingo trên dữ liệu mẫu nhỏ của bài; mingo không có `hideIndex` hay `collation()`, nên các khối đó là văn bản theo docs chính thức.

## Cú pháp

```text
db.<coll>.createIndex({ <field>: 1 }, { sparse: true })
db.<coll>.hideIndex("<index name>")       // and unhideIndex("<index name>")
db.<coll>.createIndex({ <field>: 1 }, { collation: { locale: "<lang>", strength: <1|2|3> } })
db.<coll>.find({ <field>: "<value>" }).collation({ locale: "<lang>", strength: <same> })
```

- `sparse: true`: bỏ tài liệu thiếu trường, giữ tài liệu có trường bằng `null`.
- `hideIndex`: planner không thấy, việc ghi vẫn cập nhật index.
- `collation`: truy vấn phải ghi đúng collation của index.

## Ví dụ

Tài liệu nào có khóa trong index sparse trên `rated`:

```javascript
db.movies.find({ rated: { $exists: true } })
```

Ba phim `1`, `3`, `4`: phim `3` có `rated: null` vẫn có khóa; chỉ phim `2` thiếu trường bị bỏ.

Tạo index sparse (mingo chỉ ghi lại định nghĩa):

```javascript
db.movies.createIndex({ rated: 1 }, { sparse: true })
```

So chữ phân biệt hoa thường khi không có collation:

```javascript
db.fruit.find({ type: "apple" })
```

Chỉ `_id: 1` khớp; `Apple` và `APPLE` bị bỏ.

Ẩn rồi bỏ ẩn một index, theo docs chính thức:

```text
db.restaurants.hideIndex("borough_1_ratings_1")
db.restaurants.unhideIndex("borough_1_ratings_1")
```

## Lỗi hay gặp

Tưởng index sparse bỏ cả giá trị `null`:

```javascript
// WRONG: misses movie 3, which does have a key in the sparse index
db.movies.find({ rated: { $ne: null } })
```

```javascript
// FIX: the sparse index holds every document that has the field
db.movies.find({ rated: { $exists: true } })
```

`$ne: null` bỏ cả phim thiếu trường lẫn phim `3` có `rated: null`, nên câu sai ra 2 phim; index sparse vẫn có khóa cho phim `3`, nên câu sửa ra 3.

Có index collation mà truy vấn không ghi collation:

```text
// WRONG: no collation, so the strength 2 index is not used and only "apple" matches
db.fruit.find({ type: "apple" })
```

```text
// FIX: state the index's exact collation
db.fruit.find({ type: "apple" }).collation({ locale: "en", strength: 2 })
```

Ẩn index unique rồi tưởng được chèn trùng:

```text
// WRONG: the hidden unique index still rejects a duplicate email
db.users.hideIndex("email_1")
```

Ẩn chỉ giấu index khỏi planner khi chọn kế hoạch đọc; mỗi lần ghi vẫn cập nhật index và kiểm unique trên nó. Muốn bỏ ràng buộc thì phải xóa index.

## Tóm tắt

- Sparse bỏ tài liệu thiếu trường nhưng giữ tài liệu có `null`; planner tránh nó khi kết quả sẽ thiếu.
- Index ẩn vẫn được ghi, vẫn giữ unique; bỏ ẩn không cần dựng lại.
- Index collation chỉ được dùng khi truy vấn ghi đúng collation đó.
- `$regex` không theo collation.

# EN

## Opening

You want to know whether an index is still needed, but dropping and rebuilding it on a large collection takes hours. Another index seems never to be used, because a query for `apple` skips `Apple`. The three properties sparse, hidden and collation explain both stories.

## Key idea

**Sparse** holds keys only for documents that have the field, even when its value is `null`; documents without the field are skipped. If using a sparse index would give an incomplete result for a query or a sort, MongoDB does not use it unless `hint()` names it. `2d`, `2dsphere`, `text` and wildcard indexes are always sparse. Sparse + unique: duplicate values are refused, but many documents may lack the field. The docs recommend partial indexes when you need a filter finer than "has the field or not".

**Hidden** hides an index from the planner, so you can measure the effect of dropping it without dropping it. Many people think hiding switches it off entirely. In fact a hidden index is still updated on writes, still uses disk and memory, still enforces unique, and a hidden TTL index still expires documents. The `_id` index cannot be hidden, and a hidden index cannot be named in `hint()`. Once unhidden it is usable at once, with no rebuild.

**Collation** is a set of language rules for comparing strings. `strength` 1 compares base letters only (ignores accents and case), 2 adds accents (ignores case), 3 is the default. An index built with `strength` 1 or 2 is a case-insensitive index. A query must state the **same** collation to use it. `$regex` is not collation-aware, so it cannot use such an index.

The `javascript` blocks run on mingo over the lesson's small sample data; mingo has no `hideIndex` or `collation()`, so those blocks are text, following the official docs.

## Syntax

```text
db.<coll>.createIndex({ <field>: 1 }, { sparse: true })
db.<coll>.hideIndex("<index name>")       // and unhideIndex("<index name>")
db.<coll>.createIndex({ <field>: 1 }, { collation: { locale: "<lang>", strength: <1|2|3> } })
db.<coll>.find({ <field>: "<value>" }).collation({ locale: "<lang>", strength: <same> })
```

- `sparse: true`: skips documents without the field, keeps documents where it is `null`.
- `hideIndex`: the planner cannot see it, writes still update it.
- `collation`: the query must state the index's exact collation.

## Example

Which documents have a key in a sparse index on `rated`:

```javascript
db.movies.find({ rated: { $exists: true } })
```

Three movies, `1`, `3`, `4`: movie `3` with `rated: null` still has a key; only movie `2`, which lacks the field, is skipped.

Create the sparse index (mingo only records the definition):

```javascript
db.movies.createIndex({ rated: 1 }, { sparse: true })
```

Case-sensitive matching when there is no collation:

```javascript
db.fruit.find({ type: "apple" })
```

Only `_id: 1` matches; `Apple` and `APPLE` are left out.

Hide and unhide an index, per the official docs:

```text
db.restaurants.hideIndex("borough_1_ratings_1")
db.restaurants.unhideIndex("borough_1_ratings_1")
```

## Common mistakes

Thinking a sparse index also skips `null` values:

```javascript
// WRONG: misses movie 3, which does have a key in the sparse index
db.movies.find({ rated: { $ne: null } })
```

```javascript
// FIX: the sparse index holds every document that has the field
db.movies.find({ rated: { $exists: true } })
```

`$ne: null` drops both the movie without the field and movie `3` with `rated: null`, so the wrong query returns 2 movies; the sparse index still has a key for movie `3`, so the fix returns 3.

A collation index, but a query without the collation:

```text
// WRONG: no collation, so the strength 2 index is not used and only "apple" matches
db.fruit.find({ type: "apple" })
```

```text
// FIX: state the index's exact collation
db.fruit.find({ type: "apple" }).collation({ locale: "en", strength: 2 })
```

Hiding a unique index and expecting duplicates to go in:

```text
// WRONG: the hidden unique index still rejects a duplicate email
db.users.hideIndex("email_1")
```

Hiding only keeps the index out of the planner's read plans; every write still updates it and checks unique on it. To drop the constraint you must drop the index.

## Recap

- Sparse skips documents without the field but keeps documents with `null`; the planner avoids it when the result would be incomplete.
- A hidden index is still written and still enforces unique; unhiding needs no rebuild.
- A collation index is used only when the query states that exact collation.
- `$regex` is not collation-aware.
