---
id: e-mg-l3-16
engine: mongodb
level: L3
module: special-indexes
title: "Đoán kết quả: ép đếm bằng index sparse"
title_en: "Predict the result: forcing a count through a sparse index"
kind: predict
minutes: 6
runtime: docs
objectives:
  - vi: "Đoán kết quả khi `hint()` ép một index sparse cho một câu đếm cả collection"
    en: "Predict the result when `hint()` forces a sparse index on a count of the whole collection"
  - vi: "Phân biệt `hint()` đổi đường đọc với `hint()` đổi tập tài liệu thấy được"
    en: "Tell a `hint()` that changes the read path from a `hint()` that changes which documents are visible"
requires: [e-mg-l3-14]
sources:
  - https://www.mongodb.com/docs/manual/core/index-sparse/
  - https://www.mongodb.com/docs/manual/reference/method/cursor.hint/
predict:
  sql: |
    db.movies.createIndex( { rated: 1 }, { sparse: true } )
    db.movies.countDocuments( {}, { hint: { rated: 1 } } )
  q:
    vi: "Collection `movies` có 1000 phim, trong đó 700 phim có trường `rated`. Câu đếm trên trả về bao nhiêu?"
    en: "The `movies` collection has 1000 movies, and 700 of them have a `rated` field. What does the count above return?"
  options:
    - vi: "1000, vì `hint()` chỉ đổi cách đọc, không đổi kết quả"
      en: "1000, because `hint()` only changes how the data is read, not the result"
    - vi: "700, vì index sparse không có khóa cho 300 phim thiếu `rated`"
      en: "700, because the sparse index has no key for the 300 movies without `rated`"
    - vi: "Lỗi, vì không được `hint()` một index sparse"
      en: "An error, because you cannot `hint()` a sparse index"
  answer: 1
  trap: 0
  why:
    vi: "Với index đầy đủ, `hint()` đúng là chỉ đổi đường đọc, nhưng index sparse không có khóa cho 1000 − 700 = 300 phim thiếu `rated`. Không có `hint()`, planner tự tránh index sparse khi kết quả sẽ thiếu; `hint()` bỏ qua kiểm tra đó, nên câu đếm chỉ thấy tài liệu có khóa trong index: 700. MongoDB không báo lỗi: `hint()` một index sparse là hợp lệ, docs chỉ khuyên đừng làm vậy khi đếm. Muốn đếm đúng cả collection thì gọi `countDocuments()` không `hint()`."
    en: "With a full index `hint()` does only change the read path, but the sparse index has no key for the 1000 - 700 = 300 movies without `rated`. Without `hint()`, the planner avoids a sparse index when the result would be incomplete; `hint()` skips that check, so the count only sees documents that have a key in the index: 700. MongoDB raises no error: a `hint()` on a sparse index is allowed, the docs only advise against it for counts. To count the whole collection correctly, call `countDocuments()` without `hint()`."
  recorded:
    tier: docs
    server: MongoDB
    version: "9.0"
    date: "2026-11-20"
    url: https://www.mongodb.com/docs/manual/core/index-sparse/
quiz:
  - q:
      vi: "Cùng 1000 phim, 700 có `rated` (vài phim trong số đó có `rated: null`). `db.movies.find({ rated: null })` không `hint()` trả những phim nào?"
      en: "The same 1000 movies, 700 with `rated` (a few of them have `rated: null`). Which movies does `db.movies.find({ rated: null })` without `hint()` return?"
    options:
      - { vi: "Chỉ các phim có `rated: null`, vì index sparse chỉ giữ phim có trường", en: "Only the movies with `rated: null`, because the sparse index holds only movies with the field" }
      - { vi: "Các phim có `rated: null` và cả 300 phim thiếu `rated`", en: "The movies with `rated: null` and also the 300 movies without `rated`" }
      - { vi: "Không phim nào: `null` không được lưu trong index", en: "None: `null` is never stored in an index" }
    answer: 1
    trap: 0
    why:
      vi: "Có index sparse, nhưng không có `hint()` thì index không đổi nghĩa của truy vấn. `{ rated: null }` khớp cả giá trị `null` lẫn trường thiếu, nên trả các phim `rated: null` cộng 300 phim thiếu `rated`; vì index sparse không có khóa cho 300 phim đó, planner không dùng nó cho câu này. Index cũng có lưu `null`: phim có `rated: null` vẫn có khóa trong index sparse, chỉ phim thiếu hẳn trường mới bị bỏ."
      en: "There is a sparse index, but without `hint()` an index never changes what a query means. `{ rated: null }` matches both a `null` value and a missing field, so it returns the `rated: null` movies plus the 300 movies without `rated`; since the sparse index has no key for those 300, the planner does not use it for this query. An index does store `null`: a movie with `rated: null` still has a key in the sparse index, only movies lacking the field are skipped."
---
## Mở bài

Báo cáo đếm phim chạy chậm, nên ai đó thêm `hint()` vào câu đếm để ép đọc qua một index nhỏ. Câu đếm nhanh hẳn. Nhưng con số có còn đúng không?

## Ý chính

Đây là bài đoán theo docs chính thức của MongoDB (trang "Sparse Indexes"); trình duyệt không có `mongod`. Con số 1000 và 700 là ví dụ của bài, không phải số đo. Docs chính thức nêu luật: index (chỉ mục) sparse bỏ tài liệu thiếu trường được index; planner không dùng index sparse nếu kết quả sẽ thiếu, trừ khi `hint()` chỉ định nó; vì vậy đừng `hint()` một index sparse khi đếm mọi tài liệu của collection.

Nhiều người nghĩ `hint()` chỉ đổi đường đọc, không bao giờ đổi kết quả. Thật ra điều đó đúng với index đầy đủ; với index sparse, `hint()` đổi luôn tập tài liệu thấy được, và câu đếm thiếu mà không báo lỗi.

## Tóm tắt

- Index sparse không có khóa cho tài liệu thiếu trường.
- Không `hint()`, planner tự tránh index sparse khi kết quả sẽ thiếu.
- `hint()` một index sparse bỏ qua kiểm tra đó: câu đếm thiếu mà không báo lỗi.
- Đếm cả collection thì gọi `countDocuments()` không `hint()`.

# EN

## Opening

The movie count report is slow, so someone adds `hint()` to the count to force a read through a small index. The count gets much faster. But is the number still right?

## Key idea

This is a prediction based on the MongoDB docs (page "Sparse Indexes"); the browser has no `mongod`. The numbers 1000 and 700 are this lesson's example, not a measurement. The docs give the rule: a sparse index skips documents that lack the indexed field; the planner does not use a sparse index if the result would be incomplete, unless `hint()` names it; so do not `hint()` a sparse index when counting every document in a collection.

Many people think `hint()` only changes the read path and never the result. In fact that holds for a full index; with a sparse index, `hint()` also changes which documents are visible, and the count comes up short without any error.

## Recap

- A sparse index has no key for documents without the field.
- Without `hint()`, the planner avoids a sparse index when the result would be incomplete.
- A `hint()` on a sparse index skips that check: the count comes up short without an error.
- To count the whole collection, call `countDocuments()` without `hint()`.
