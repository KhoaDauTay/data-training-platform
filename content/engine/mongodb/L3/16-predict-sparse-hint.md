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
requires: [e-mg-l3-14]
sources:
  - https://www.mongodb.com/docs/manual/core/index-sparse/
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
  why:
    vi: "Không có `hint()`, planner tự tránh index sparse khi kết quả sẽ thiếu. `hint()` bỏ qua kiểm tra đó, nên câu đếm chỉ thấy tài liệu có khóa trong index: 700. Muốn đếm đúng cả collection thì gọi `countDocuments()` không `hint()`."
    en: "Without `hint()`, the planner avoids a sparse index when the result would be incomplete. `hint()` skips that check, so the count only sees documents that have a key in the index: 700. To count the whole collection correctly, call `countDocuments()` without `hint()`."
  recorded:
    tier: docs
    server: MongoDB
    version: "9.0"
    date: "2026-11-20"
    url: https://www.mongodb.com/docs/manual/core/index-sparse/
---

## Ý chính

Đây là bài đoán theo docs chính thức của MongoDB (trang "Sparse Indexes"); trình duyệt không có `mongod`. Con số 1000 và 700 là ví dụ của bài, không phải số đo. Docs chính thức chỉ nêu luật:

- index (chỉ mục) sparse bỏ tài liệu thiếu trường được index;
- planner không dùng index sparse nếu kết quả sẽ thiếu, trừ khi `hint()` chỉ định nó;
- vì vậy đừng `hint()` một index sparse khi đếm mọi tài liệu của collection: kết quả sẽ sai.

Đây là chỗ `hint()` khác các trường hợp thường: với index đầy đủ, `hint()` chỉ đổi đường đọc; với index sparse, nó đổi luôn tập tài liệu thấy được.

## Ví dụ

Theo docs chính thức của MongoDB:

```javascript
db.movies.countDocuments( {}, { hint: { rated: 1 } } ) // counts only documents with the rated field
db.movies.countDocuments() // correct count of the whole collection
```

Đúng với docs chính thức của MongoDB hiện hành, kiểm ngày 2026-11-20.

# EN

## Key idea

This is a prediction based on the MongoDB docs (page "Sparse Indexes"); the browser has no `mongod`. The numbers 1000 and 700 are this lesson's example, not a measurement. The docs give the rule:

- a sparse index skips documents that lack the indexed field;
- the planner does not use a sparse index if the result would be incomplete, unless `hint()` names it;
- so do not `hint()` a sparse index when counting every document in a collection: the result will be wrong.

This is where `hint()` differs from the usual case: with a full index, `hint()` only changes the read path; with a sparse index, it also changes which documents are visible.

## Example

Per the MongoDB docs:

```javascript
db.movies.countDocuments( {}, { hint: { rated: 1 } } ) // counts only documents with the rated field
db.movies.countDocuments() // correct count of the whole collection
```

Matches the current MongoDB manual, checked 2026-11-20.
