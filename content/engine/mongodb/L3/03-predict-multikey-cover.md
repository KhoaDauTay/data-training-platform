---
id: e-mg-l3-03
engine: mongodb
level: L3
module: indexes
title: "Đoán kế hoạch: index multikey có phủ được truy vấn?"
title_en: "Predict the plan: can a multikey index cover the query?"
kind: predict
minutes: 6
runtime: docs
objectives:
  - vi: "Biết khi nào index multikey phủ được truy vấn"
    en: "Know when a multikey index can cover a query"
requires: [e-mg-l3-01]
sources:
  - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-multikey/
  - https://www.mongodb.com/docs/manual/core/query-optimization/
predict:
  sql: |
    db.movies.createIndex( { genres: 1, title: 1 } )
    db.movies.find(
       { genres: 'Drama' },
       { _id: 0, genres: 1 }
    ).limit(5)
  q:
    vi: "`genres` là mảng, nên `{ genres: 1, title: 1 }` là index multikey. Truy vấn này có được phủ (không đọc tài liệu) không?"
    en: "`genres` is an array, so `{ genres: 1, title: 1 }` is a multikey index. Is this query covered (no documents read)?"
  options:
    - vi: "Có, vì mọi trường trong truy vấn và projection đều nằm trong index"
      en: "Yes, because every field in the query and the projection is in the index"
    - vi: "Không, vì projection trả về trường mảng `genres`"
      en: "No, because the projection returns the array field `genres`"
    - vi: "Không, vì index multikey không bao giờ phủ được truy vấn"
      en: "No, because a multikey index can never cover a query"
  answer: 1
  why:
    vi: "Theo tài liệu, index multikey phủ được truy vấn chỉ khi truy vấn không trả về trường mảng và không dùng `$elemMatch`. Projection ở đây trả `genres`, nên không phủ. Đổi projection thành `{ _id: 0, title: 1 }` thì được phủ."
    en: "Per the docs, a multikey index covers a query only when the query does not return the array field and does not use `$elemMatch`. This projection returns `genres`, so it is not covered. With the projection `{ _id: 0, title: 1 }` it is covered."
---

## Ý chính

Đây là bài đoán theo tài liệu MongoDB (trang "Multikey Indexes", mục Covered Queries); không có `mongod` trong trình duyệt nên không có explain thật. Index multikey phủ được truy vấn khi đủ ba điều:

- truy vấn không trả về trường mảng (nên index phải là index kép, có thêm trường không phải mảng);
- truy vấn không dùng `$elemMatch`;
- thỏa các điều kiện phủ chung: mọi trường của truy vấn và của kết quả nằm trong cùng index.

## Ví dụ

Tài liệu nêu hai truy vấn được phủ bởi `{ genres: 1, title: 1 }`:

```javascript
db.movies.find(
   { genres: 'Drama' },
   { _id: 0, title: 1 }
).sort({ genres: 1 }).limit(5)

db.movies.find(
   { title: 'The Ace of Hearts', genres: 'Drama' },
   { _id: 0, title: 1 }
)
```

Đúng với tài liệu MongoDB hiện hành, kiểm ngày 2026-11-20.

# EN

## Key idea

This is a prediction based on the MongoDB docs (page "Multikey Indexes", section Covered Queries); there is no `mongod` in the browser, so no real explain. A multikey index can cover a query when all three hold:

- the query does not return the array field (so the index must be compound, with a non-array field as well);
- the query does not use `$elemMatch`;
- the general covering rules hold: every field of the query and of the result is in the same index.

## Example

The docs list two queries covered by `{ genres: 1, title: 1 }`:

```javascript
db.movies.find(
   { genres: 'Drama' },
   { _id: 0, title: 1 }
).sort({ genres: 1 }).limit(5)

db.movies.find(
   { title: 'The Ace of Hearts', genres: 'Drama' },
   { _id: 0, title: 1 }
)
```

Matches the current MongoDB manual, checked 2026-11-20.
