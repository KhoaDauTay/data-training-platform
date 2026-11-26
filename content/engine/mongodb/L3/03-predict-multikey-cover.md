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
  - vi: "Sửa projection để truy vấn trên trường mảng được phủ"
    en: "Fix a projection so a query on an array field is covered"
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
  trap: 0
  why:
    vi: "\"Mọi trường đều nằm trong index\" là luật phủ chung (covered query: trả lời chỉ từ index, không mở tài liệu), nhưng index multikey giữ từng phần tử của `genres`, không giữ cả mảng. Projection ở đây trả `genres` là cả mảng, MongoDB không dựng lại được từ các khóa lẻ nên phải mở tài liệu. Nói multikey không bao giờ phủ được thì sai: đổi projection thành `{ _id: 0, title: 1 }`, không trả trường mảng và không dùng `$elemMatch`, thì truy vấn được phủ."
    en: "\"Every field is in the index\" is the general covering rule (covered query: answered from the index alone, no document opened), but a multikey index holds single elements of `genres`, not the whole array. This projection returns `genres` as a whole array, which MongoDB cannot rebuild from the single keys, so it must open the documents. Saying multikey can never cover is wrong: with the projection `{ _id: 0, title: 1 }`, no array field returned and no `$elemMatch`, the query is covered."
  recorded:
    tier: docs
    server: MongoDB
    version: "9.0"
    date: "2026-11-20"
    url: https://www.mongodb.com/docs/manual/core/query-optimization/
quiz:
  - q:
      vi: "Cùng index `{ genres: 1, title: 1 }`. Truy vấn nào được phủ?"
      en: "Same index `{ genres: 1, title: 1 }`. Which query is covered?"
    options:
      - { vi: "`find({ genres: 'Drama' }, { _id: 0, title: 1 })`", en: "`find({ genres: 'Drama' }, { _id: 0, title: 1 })`" }
      - { vi: "`find({ genres: 'Drama' }, { title: 1 })`", en: "`find({ genres: 'Drama' }, { title: 1 })`" }
      - { vi: "`find({ genres: { $elemMatch: { $eq: 'Drama' } } }, { _id: 0, title: 1 })`", en: "`find({ genres: { $elemMatch: { $eq: 'Drama' } } }, { _id: 0, title: 1 })`" }
    answer: 0
    why:
      vi: "Câu đầu chỉ trả `title` và bỏ `_id`. Câu hai vẫn trả `_id` mặc định, mà `_id` không có trong index. Câu ba dùng `$elemMatch`, thứ làm index multikey không phủ được."
      en: "The first returns only `title` and drops `_id`. The second still returns `_id` by default, and `_id` is not in the index. The third uses `$elemMatch`, which stops a multikey index from covering."
---
## Mở bài

Màn hình danh sách phim chỉ cần thể loại của năm phim chính kịch. Có index `{ genres: 1, title: 1 }` và projection chỉ chọn trường có trong index. MongoDB có trả lời mà không mở tài liệu nào không?

## Ý chính

Đây là bài đoán theo docs chính thức của MongoDB (trang "Multikey Indexes", mục Covered Queries); không có `mongod` trong trình duyệt nên không có explain thật. Index multikey phủ được truy vấn khi đủ ba điều:

- truy vấn không trả về trường mảng (nên index phải là index kép, có thêm trường không phải mảng);
- truy vấn không dùng `$elemMatch`;
- thỏa các điều kiện phủ chung: mọi trường của truy vấn và của kết quả nằm trong cùng index, và `_id` bị bỏ nếu không có trong index.

Nhiều người nghĩ "trường nằm trong index" là đủ để phủ. Thật ra khóa multikey là từng phần tử riêng lẻ: từ index, MongoDB không dựng lại được cả mảng `genres`, nên phải mở tài liệu.

## Tóm tắt

- Index multikey giữ từng phần tử của mảng, không giữ cả mảng.
- Nó phủ được truy vấn chỉ khi kết quả không trả trường mảng.
- `$elemMatch` làm truy vấn không được phủ.
- Luật phủ chung vẫn áp dụng: bỏ `_id` khi nó không có trong index.

# EN

## Opening

The movie list screen only needs the genres of five dramas. There is an index `{ genres: 1, title: 1 }` and the projection picks only a field in the index. Does MongoDB answer without opening any document?

## Key idea

This is a prediction based on the MongoDB docs (page "Multikey Indexes", section Covered Queries); there is no `mongod` in the browser, so no real explain. A multikey index can cover a query when all three hold:

- the query does not return the array field (so the index must be compound, with a non-array field as well);
- the query does not use `$elemMatch`;
- the general covering rules hold: every field of the query and of the result is in the same index, and `_id` is dropped unless it is in the index.

Many people think "the field is in the index" is enough to cover. In fact multikey keys are single elements: from the index, MongoDB cannot rebuild the whole `genres` array, so it must open the documents.

## Recap

- A multikey index holds single array elements, not the whole array.
- It can cover a query only when the result does not return the array field.
- `$elemMatch` stops the query from being covered.
- The general covering rules still apply: drop `_id` when it is not in the index.
