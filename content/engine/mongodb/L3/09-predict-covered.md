---
id: e-mg-l3-09
engine: mongodb
level: L3
module: esr-explain
title: "Đoán kế hoạch: truy vấn có được phủ?"
title_en: "Predict the plan: is the query covered?"
kind: predict
minutes: 6
runtime: docs
objectives:
  - vi: "Nêu ba điều kiện của truy vấn được phủ"
    en: "State the three conditions of a covered query"
  - vi: "Nhận ra truy vấn được phủ trong explain: IXSCAN không nằm dưới FETCH"
    en: "Recognise a covered query in explain: an IXSCAN not under a FETCH"
requires: [e-mg-l3-05]
sources:
  - https://www.mongodb.com/docs/manual/core/query-optimization/
  - https://www.mongodb.com/docs/manual/reference/explain-results/
predict:
  sql: |
    db.movies.createIndex( { rated: 1, title: 1 } )
    db.movies.find(
       { rated: "PG", title: /^T/ },
       { title: 1 }
    ).limit(3)
  q:
    vi: "Index `{ rated: 1, title: 1 }`. Projection là `{ title: 1 }`. Truy vấn có được phủ không?"
    en: "Index `{ rated: 1, title: 1 }`. The projection is `{ title: 1 }`. Is the query covered?"
  options:
    - vi: "Có, vì `rated` và `title` đều trong index"
      en: "Yes, because `rated` and `title` are both in the index"
    - vi: "Không, vì projection mặc định vẫn trả `_id`, mà `_id` không có trong index"
      en: "No, because the projection still returns `_id` by default, and `_id` is not in the index"
    - vi: "Không, vì `$regex` không bao giờ dùng được index"
      en: "No, because `$regex` can never use an index"
  answer: 1
  trap: 0
  why:
    vi: "`rated` và `title` đều trong index, nhưng kết quả còn một trường nữa: `_id` luôn được trả về trừ khi bạn ghi `_id: 0`, và `_id` không có trong index này, nên MongoDB phải mở tài liệu để lấy nó. `$regex` cũng không phải lý do: `/^T/` neo ở đầu chuỗi nên đọc được một khoảng `title` trong index. Viết `{ title: 1, _id: 0 }` như ví dụ trong docs chính thức; khi đó explain có `IXSCAN` không nằm dưới `FETCH`."
    en: "`rated` and `title` are both in the index, but the result holds one more field: `_id` is always returned unless you write `_id: 0`, and `_id` is not in this index, so MongoDB must open the documents to get it. `$regex` is not the reason either: `/^T/` is anchored at the start of the string, so it reads one `title` range of the index. Write `{ title: 1, _id: 0 }` as in the docs example; then explain shows an `IXSCAN` that is not under a `FETCH`."
  recorded:
    tier: docs
    server: MongoDB
    version: "9.0"
    date: "2026-11-20"
    url: https://www.mongodb.com/docs/manual/core/query-optimization/
quiz:
  - q:
      vi: "Trong explain, dấu hiệu nào cho biết truy vấn được phủ?"
      en: "In explain, which sign tells you a query is covered?"
    options:
      - { vi: "Có stage `IXSCAN` ở đâu đó trong kế hoạch", en: "There is an `IXSCAN` stage somewhere in the plan" }
      - { vi: "Có `IXSCAN` không nằm dưới `FETCH`, và `totalDocsExamined` = 0", en: "There is an `IXSCAN` not under a `FETCH`, and `totalDocsExamined` = 0" }
      - { vi: "`nReturned` bằng `totalKeysExamined`", en: "`nReturned` equals `totalKeysExamined`" }
    answer: 1
    why:
      vi: "`FETCH` là stage mở tài liệu. Truy vấn được phủ trả lời chỉ từ khóa index, nên không có `FETCH` phía trên `IXSCAN` và không tài liệu nào được đọc. Có `IXSCAN` thôi chưa đủ: `FETCH` trên `IXSCAN` vẫn mở tài liệu. `nReturned` bằng `totalKeysExamined` chỉ nói index không đọc thừa khóa; mỗi khóa vẫn có thể dẫn tới một tài liệu được mở."
      en: "`FETCH` is the stage that opens documents. A covered query answers from index keys alone, so there is no `FETCH` above the `IXSCAN` and no document is read. An `IXSCAN` alone is not enough: `FETCH` over `IXSCAN` still opens documents. `nReturned` equal to `totalKeysExamined` only says the index read no extra keys; each key can still lead to an opened document."
---
## Mở bài

Một màn hình chỉ cần tên ba phim PG bắt đầu bằng chữ T. Có index `{ rated: 1, title: 1 }` và projection chỉ ghi `title`. MongoDB có trả lời mà không mở tài liệu nào không?

## Ý chính

Đây là bài đoán theo docs chính thức của MongoDB (trang "Query Optimization" và "Explain Results"); trình duyệt không có `mongod`. Index phủ truy vấn khi:

- mọi trường trong truy vấn đều thuộc index;
- mọi trường trả về đều thuộc cùng index đó;
- không trường nào trong truy vấn so bằng `null`.

Trong explain, truy vấn được phủ có stage `IXSCAN` không phải con cháu của stage `FETCH`: MongoDB không mở tài liệu nào.

Nhiều người nghĩ projection chỉ trả những trường được ghi ra. Thật ra `_id` luôn được trả về trừ khi ghi `_id: 0`, nên `{ title: 1 }` vẫn cần `_id`, và truy vấn phải mở tài liệu để lấy nó.

## Tóm tắt

- Được phủ = trả lời chỉ từ index, không mở tài liệu.
- Mọi trường lọc và trường trả về phải nằm trong cùng index.
- `_id` được trả mặc định: ghi `_id: 0` khi nó không có trong index.
- Explain: `IXSCAN` không dưới `FETCH`, `totalDocsExamined` = 0.

# EN

## Opening

A screen needs only the titles of three PG movies starting with T. There is an index `{ rated: 1, title: 1 }` and the projection names only `title`. Does MongoDB answer without opening any document?

## Key idea

This is a prediction based on the MongoDB docs (pages "Query Optimization" and "Explain Results"); the browser has no `mongod`. An index covers a query when:

- every field in the query is part of the index;
- every returned field is in that same index;
- no field in the query is compared for equality with `null`.

In explain, a covered query has an `IXSCAN` stage that is not a descendant of a `FETCH` stage: MongoDB opens no document.

Many people think a projection returns only the fields it names. In fact `_id` is always returned unless you write `_id: 0`, so `{ title: 1 }` still needs `_id`, and the query must open documents to get it.

## Recap

- Covered = answered from the index alone, no document opened.
- Every filtered and returned field must be in the same index.
- `_id` is returned by default: write `_id: 0` when it is not in the index.
- Explain: an `IXSCAN` not under a `FETCH`, `totalDocsExamined` = 0.
