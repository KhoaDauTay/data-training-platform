---
id: e-mg-l3-02
engine: mongodb
level: L3
module: indexes
title: "Đoán kế hoạch: index partial có được dùng?"
title_en: "Predict the plan: can the partial index be used?"
figures: [{ name: mg-multikey-partial, at: idea, variant: partial }]
kind: predict
minutes: 6
runtime: docs
objectives:
  - vi: "Quyết định một truy vấn có dùng được index partial hay không"
    en: "Decide whether a query can use a partial index"
  - vi: "Viết lại truy vấn để nó nằm trong bộ lọc của index"
    en: "Rewrite a query so it falls inside the index filter"
requires: [e-mg-l3-01]
sources:
  - https://www.mongodb.com/docs/manual/core/index-partial/
predict:
  sql: |
    db.movies.createIndex(
      { year: 1 },
      { name: "year_gt_2000_partial", partialFilterExpression: { year: { $gt: 2000 } } }
    )
    db.movies.find( { year: { $gt: 1990 } } ).explain("executionStats")
  q:
    vi: "Chỉ có `_id` và index partial `year_gt_2000_partial`. Truy vấn `year` lớn hơn 1990 có dùng index partial không?"
    en: "Only `_id` and the partial index `year_gt_2000_partial` exist. Can the query for `year` greater than 1990 use the partial index?"
  options:
    - vi: "Có, vì truy vấn lọc trên đúng trường `year`"
      en: "Yes, because the query filters on the same field `year`"
    - vi: "Có, MongoDB dùng index rồi quét thêm phần còn thiếu"
      en: "Yes, MongoDB uses the index and scans the missing part as well"
    - vi: "Không, vì dùng index sẽ thiếu các phim từ 1991 đến 2000"
      en: "No, because using the index would miss the movies from 1991 to 2000"
  answer: 2
  trap: 0
  why:
    vi: "Nghe hợp lý vì index và truy vấn cùng trường `year`, nhưng index chỉ giữ phim có `year` lớn hơn 2000. Truy vấn cần cả phim 1991 đến 2000, nên dùng index sẽ làm thiếu kết quả, và MongoDB không chọn nó. `{ year: 2005 }` hay `{ year: { $gt: 2010 } }` thì dùng được."
    en: "It sounds right because the index and the query share the field `year`, but the index holds only movies with `year` greater than 2000. The query also needs movies from 1991 to 2000, so the index would give an incomplete result and MongoDB does not pick it. `{ year: 2005 }` or `{ year: { $gt: 2010 } }` can use it."
  recorded:
    tier: docs
    server: MongoDB
    version: "9.0"
    date: "2026-11-20"
    url: https://www.mongodb.com/docs/manual/core/index-partial/
quiz:
  - q:
      vi: "Cùng index partial `year > 2000`. Câu nào dùng được nó?"
      en: "Same partial index `year > 2000`. Which query can use it?"
    options:
      - { vi: "`find({ year: { $gte: 2000 } })`", en: "`find({ year: { $gte: 2000 } })`" }
      - { vi: "`find({ year: { $gt: 2010 } })`", en: "`find({ year: { $gt: 2010 } })`" }
      - { vi: "`find({ year: { $ne: 1999 } })`", en: "`find({ year: { $ne: 1999 } })`" }
    answer: 1
    why:
      vi: "`year > 2010` nằm trọn trong `year > 2000`. `$gte: 2000` cần cả năm 2000, mà index không giữ năm 2000; `$ne` gồm gần như mọi năm."
      en: "`year > 2010` lies fully inside `year > 2000`. `$gte: 2000` also needs the year 2000, which the index does not hold; `$ne` covers almost every year."
---
## Mở bài

Bạn đã tạo một index partial cho phim sau năm 2000, rồi một màn hình hỏi phim sau năm 1990. Truy vấn lọc đúng trường `year`, vậy index có giúp được không?

## Ý chính

Đây là bài đoán theo docs chính thức của MongoDB (trang "Partial Indexes"); trình duyệt không chạy `mongod`, nên không có explain thật ở đây. Luật trong tài liệu: MongoDB không dùng index partial cho truy vấn hay sắp xếp nếu việc đó làm thiếu kết quả. Muốn dùng, điều kiện của truy vấn phải nằm trong bộ lọc của index (bằng nó hoặc hẹp hơn).

- `{ year: 2005 }`: nằm trong `year > 2000`, dùng được.
- `{ year: { $gt: 2010 } }`: hẹp hơn bộ lọc, dùng được.
- `{ year: { $gt: 1990 } }`: rộng hơn bộ lọc, không dùng được.

Nhiều người nghĩ cứ cùng trường là index dùng được. Thật ra index partial thiếu hẳn một phần tài liệu, nên MongoDB chỉ dùng khi chứng minh được không thiếu dòng nào. Docs chính thức cũng nhắc: việc so tập con không giống nhau với mọi toán tử, nên trước khi dựa vào một index partial, hãy kiểm bằng `explain()`.

Hình dưới vẽ khoảng 1991–2000 mà index partial thiếu, nên truy vấn rộng hơn phải đọc cả collection.

## Tóm tắt

- Index partial chỉ giữ tài liệu khớp `partialFilterExpression`.
- Truy vấn dùng được nó khi điều kiện bằng hoặc hẹp hơn bộ lọc.
- Truy vấn rộng hơn sẽ quét collection, dù lọc cùng trường.
- Kiểm bằng `explain()` trước khi dựa vào index partial.

# EN

## Opening

You built a partial index for movies after 2000, then a screen asks for movies after 1990. The query filters on the same field `year`, so can the index help?

## Key idea

This is a prediction based on the MongoDB docs (page "Partial Indexes"); the browser runs no `mongod`, so there is no real explain here. The rule in the docs: MongoDB does not use a partial index for a query or sort if that would give an incomplete result. To use it, the query condition must fall inside the index filter (equal to it or narrower).

- `{ year: 2005 }`: inside `year > 2000`, can use it.
- `{ year: { $gt: 2010 } }`: narrower than the filter, can use it.
- `{ year: { $gt: 1990 } }`: wider than the filter, cannot use it.

Many people think the same field is enough for the index to be used. In fact a partial index lacks part of the documents, so MongoDB uses it only when it can prove no row is missed. The docs also warn that subset matching does not behave the same for every operator, so check with `explain()` before relying on a partial index.

The figure below draws the 1991–2000 range the partial index lacks, so the wider query must read the whole collection.

## Recap

- A partial index holds only documents matching its `partialFilterExpression`.
- A query can use it when its condition equals or is narrower than the filter.
- A wider query scans the collection, even on the same field.
- Check with `explain()` before relying on a partial index.
