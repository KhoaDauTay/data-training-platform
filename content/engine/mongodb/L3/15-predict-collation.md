---
id: e-mg-l3-15
engine: mongodb
level: L3
module: special-indexes
title: "Đoán kế hoạch: collation khác thì index có được dùng?"
title_en: "Predict the plan: can the index be used with a different collation?"
kind: predict
minutes: 6
runtime: docs
objectives:
  - vi: "Đoán một truy vấn có dùng được index không phân biệt hoa thường hay không, và trả bao nhiêu tài liệu"
    en: "Predict whether a query can use a case-insensitive index, and how many documents it returns"
  - vi: "Tách hai câu hỏi: index có được dùng, và collation của truy vấn khớp những gì"
    en: "Separate two questions: whether the index is used, and what the query's collation matches"
requires: [e-mg-l3-14]
sources:
  - { url: https://www.mongodb.com/docs/manual/core/index-case-insensitive/, title_vi: "Index không phân biệt hoa thường" }
  - { url: https://www.mongodb.com/docs/manual/reference/collation/, title_vi: "Collation" }
predict:
  sql: |
    db.fruit.createIndex(
       { type: 1 },
       { collation: { locale: 'en', strength: 2 } }
    )
    db.fruit.insertMany( [
       { type: "apple" },
       { type: "Apple" },
       { type: "APPLE" }
    ] )
    db.fruit.find( { type: "apple" } ).collation( { locale: 'en', strength: 1 } )
  q:
    vi: "Collection không có collation mặc định. Index dùng `strength: 2`, truy vấn dùng `strength: 1`. Truy vấn có dùng index không, và trả mấy tài liệu?"
    en: "The collection has no default collation. The index uses `strength: 2`, the query uses `strength: 1`. Does the query use the index, and how many documents does it return?"
  options:
    - vi: "Dùng index, trả 3 tài liệu"
      en: "Uses the index, returns 3 documents"
    - vi: "Không dùng index, trả 3 tài liệu"
      en: "Does not use the index, returns 3 documents"
    - vi: "Không dùng index, trả 1 tài liệu"
      en: "Does not use the index, returns 1 document"
    - vi: "Dùng index, trả 1 tài liệu"
      en: "Uses the index, returns 1 document"
  answer: 1
  trap: 0
  why:
    vi: "Nghe hợp lý vì `strength: 1` còn lỏng hơn `strength: 2`, nhưng index chỉ phục vụ so chuỗi khi truy vấn ghi đúng collation của nó, nên index không được dùng. Còn `strength: 1` vẫn bỏ qua hoa thường, nên cả ba tài liệu đều khớp. Ghi `strength: 2` thì vừa dùng index vừa trả 3; không ghi collation thì không dùng index và chỉ trả 1."
    en: "It sounds right because `strength: 1` is even looser than `strength: 2`, but the index serves string comparisons only when the query states its exact collation, so the index is not used. And `strength: 1` still ignores case, so all three documents match. With `strength: 2` it uses the index and returns 3; with no collation it does not use the index and returns 1."
  recorded:
    tier: docs
    server: MongoDB
    version: "9.0"
    date: "2026-11-20"
    url: https://www.mongodb.com/docs/manual/core/index-case-insensitive/
quiz:
  - q:
      vi: "Bạn muốn tìm tên khách không phân biệt hoa thường và có index `{ name: 1 }` với `collation: { locale: \"vi\", strength: 2 }`. Cách nào vừa đúng kết quả vừa dùng index?"
      en: "You want a case-insensitive search on customer names and have the index `{ name: 1 }` with `collation: { locale: \"vi\", strength: 2 }`. Which way gives the right result and uses the index?"
    options:
      - { vi: "`find({ name: /^an$/i })`", en: "`find({ name: /^an$/i })`" }
      - { vi: "`find({ name: \"an\" }).collation({ locale: \"vi\", strength: 2 })`", en: "`find({ name: \"an\" }).collation({ locale: \"vi\", strength: 2 })`" }
      - { vi: "`find({ name: \"an\" })`", en: "`find({ name: \"an\" })`" }
    answer: 1
    trap: 0
    why:
      vi: "Cờ `i` cũng bỏ qua hoa thường nên kết quả đúng, nhưng `$regex` không theo collation nên không dùng được index này. Câu không ghi collation thì so phân biệt hoa thường: chỉ khớp an viết thường, bỏ An, AN, và cũng không dùng index. Chỉ truy vấn ghi đúng collation của index (`vi`, `strength: 2`) mới vừa khớp mọi cách viết vừa đọc qua index."
      en: "The `i` flag also ignores case, so the result is right, but `$regex` is not collation-aware, so it cannot use this index. The query with no collation compares case-sensitively: it matches only lowercase an, missing An and AN, and does not use the index either. Only a query stating the index's exact collation (`vi`, `strength: 2`) both matches every spelling and reads through the index."
---
## Mở bài

Bạn đã tạo index không phân biệt hoa thường cho `type`, và một đồng nghiệp viết truy vấn với collation "lỏng hơn" cho chắc. Truy vấn trả đủ dữ liệu, nhưng có đọc qua index không? Hãy đoán trước khi đọc đáp án.

## Ý chính

Đây là bài đoán theo docs chính thức của MongoDB (trang "Case-Insensitive Indexes"); trình duyệt không có `mongod`, nên không có explain thật. Docs chính thức in sẵn kết luận cho ba truy vấn trên cùng dữ liệu: không ghi collation thì không dùng index (chỉ mục) và tìm thấy một tài liệu; `strength: 2` thì dùng index và tìm thấy ba; `strength: 1` thì không dùng index nhưng vẫn tìm thấy ba.

Nhiều người nghĩ một collation "lỏng hơn" vẫn dùng được index của collation "chặt hơn". Thật ra có hai câu hỏi tách nhau: "có dùng index không" phụ thuộc collation có **giống hệt** collation của index; "khớp mấy tài liệu" phụ thuộc collation của truy vấn có bỏ qua hoa thường không.

## Tóm tắt

- Index có collation chỉ phục vụ truy vấn ghi đúng collation đó, khác `strength` là không dùng.
- Số tài liệu khớp do collation của truy vấn quyết định, không do index.
- Không ghi collation: so phân biệt hoa thường, không dùng index collation.
- `$regex` với cờ `i` không dùng được index collation.

# EN

## Opening

You built a case-insensitive index on `type`, and a colleague wrote a query with a "looser" collation to be safe. The query returns all the data, but does it read through the index? Make your guess before you read the answer.

## Key idea

This is a prediction based on the MongoDB docs (page "Case-Insensitive Indexes"); the browser has no `mongod`, so there is no real explain. The docs print the outcome of three queries on the same data: with no collation the index is not used and one document is found; with `strength: 2` the index is used and three are found; with `strength: 1` the index is not used but three are still found.

Many people think a "looser" collation can still use the index of a "stricter" one. In fact these are two separate questions: "is the index used" depends on the collation being **exactly** the index's collation; "how many documents match" depends on whether the query's collation ignores case.

## Recap

- An index with a collation serves only queries stating that exact collation; another `strength` does not use it.
- How many documents match is decided by the query's collation, not by the index.
- No collation: case-sensitive matching, the collation index is not used.
- A `$regex` with the `i` flag cannot use a collation index.
