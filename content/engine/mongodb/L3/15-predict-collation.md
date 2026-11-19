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
requires: [e-mg-l3-14]
sources:
  - https://www.mongodb.com/docs/manual/core/index-case-insensitive/
  - https://www.mongodb.com/docs/manual/reference/collation/
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
  why:
    vi: "Index chỉ phục vụ so chuỗi khi truy vấn ghi đúng collation của nó; `strength: 1` khác `strength: 2` nên không dùng index. Nhưng `strength: 1` vẫn bỏ qua hoa thường, nên cả ba tài liệu đều khớp. Ghi `strength: 2` thì vừa dùng index vừa trả 3; không ghi collation thì không dùng index và chỉ trả 1."
    en: "The index serves string comparisons only when the query states its exact collation; `strength: 1` is not `strength: 2`, so the index is not used. But `strength: 1` still ignores case, so all three documents match. With `strength: 2` it uses the index and returns 3; with no collation it does not use the index and returns 1."
---

## Ý chính

Đây là bài đoán theo tài liệu MongoDB (trang "Case-Insensitive Indexes"); trình duyệt không có `mongod`, nên không có explain thật. Tài liệu in sẵn kết luận cho ba truy vấn trên cùng dữ liệu, mỗi dòng là chú thích của chính tài liệu:

- không ghi collation: không dùng index, tìm thấy một tài liệu;
- `strength: 2`: dùng index, tìm thấy ba;
- `strength: 1`: không dùng index, tìm thấy ba.

Hai câu hỏi tách nhau: "có dùng index không" phụ thuộc collation có **giống hệt** collation của index; "khớp mấy tài liệu" phụ thuộc collation của truy vấn có bỏ qua hoa thường không.

## Ví dụ

Kết luận từ tài liệu MongoDB (chú thích trong trang, không phải explain chạy trong trình duyệt):

```javascript
db.fruit.find( { type: "apple" } ) // does not use index, finds one result
db.fruit.find( { type: "apple" } ).collation( { locale: 'en', strength: 2 } ) // uses the index, finds three results
db.fruit.find( { type: "apple" } ).collation( { locale: 'en', strength: 1 } ) // does not use the index, finds three results
```

Đúng với tài liệu MongoDB hiện hành, kiểm ngày 2026-11-20.

# EN

## Key idea

This is a prediction based on the MongoDB docs (page "Case-Insensitive Indexes"); the browser has no `mongod`, so there is no real explain. The docs print the outcome of three queries on the same data, each line being the docs' own comment:

- no collation: does not use the index, finds one document;
- `strength: 2`: uses the index, finds three;
- `strength: 1`: does not use the index, finds three.

These are two separate questions: "is the index used" depends on the collation being **exactly** the index's collation; "how many documents match" depends on whether the query's collation ignores case.

## Example

The outcome from the MongoDB docs (comments on the page, not an explain run in the browser):

```javascript
db.fruit.find( { type: "apple" } ) // does not use index, finds one result
db.fruit.find( { type: "apple" } ).collation( { locale: 'en', strength: 2 } ) // uses the index, finds three results
db.fruit.find( { type: "apple" } ).collation( { locale: 'en', strength: 1 } ) // does not use the index, finds three results
```

Matches the current MongoDB manual, checked 2026-11-20.
