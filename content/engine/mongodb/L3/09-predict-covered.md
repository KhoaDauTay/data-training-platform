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
  why:
    vi: "Truy vấn được phủ khi mọi trường của truy vấn và mọi trường trả về đều trong cùng index. `_id` được trả về mặc định, nên phải ghi `{ title: 1, _id: 0 }` như ví dụ trong tài liệu. Khi đó explain có `IXSCAN` không nằm dưới `FETCH`."
    en: "A query is covered when every queried field and every returned field is in the same index. `_id` is returned by default, so you must write `{ title: 1, _id: 0 }` as in the docs example. Then explain shows an `IXSCAN` that is not under a `FETCH`."
---

## Ý chính

Đây là bài đoán theo tài liệu MongoDB (trang "Query Optimization" và "Explain Results"); trình duyệt không có `mongod`. Index phủ truy vấn khi:

- mọi trường trong truy vấn đều thuộc index;
- mọi trường trả về đều thuộc cùng index đó;
- không trường nào trong truy vấn so bằng `null`.

Trong explain, truy vấn được phủ có stage `IXSCAN` không phải con cháu của stage `FETCH`: MongoDB không mở tài liệu nào.

## Ví dụ

Ví dụ được phủ trong tài liệu (chú ý `_id: 0`):

```javascript
db.movies.find(
   { rated: "PG", title: /^T/ },
   { title: 1, _id: 0 }
).limit(3)
```

Đúng với tài liệu MongoDB hiện hành, kiểm ngày 2026-11-20.

# EN

## Key idea

This is a prediction based on the MongoDB docs (pages "Query Optimization" and "Explain Results"); the browser has no `mongod`. An index covers a query when:

- every field in the query is part of the index;
- every returned field is in that same index;
- no field in the query is compared for equality with `null`.

In explain, a covered query has an `IXSCAN` stage that is not a descendant of a `FETCH` stage: MongoDB opens no document.

## Example

The covered example from the docs (note `_id: 0`):

```javascript
db.movies.find(
   { rated: "PG", title: /^T/ },
   { title: 1, _id: 0 }
).limit(3)
```

Matches the current MongoDB manual, checked 2026-11-20.
