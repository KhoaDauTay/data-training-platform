---
id: e-mg-l3-02
engine: mongodb
level: L3
module: indexes
title: "Đoán kế hoạch: index partial có được dùng?"
title_en: "Predict the plan: can the partial index be used?"
kind: predict
minutes: 6
runtime: docs
objectives:
  - vi: "Quyết định một truy vấn có dùng được index partial hay không"
    en: "Decide whether a query can use a partial index"
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
  why:
    vi: "Index chỉ giữ phim có `year` lớn hơn 2000. Truy vấn cần cả phim 1991 đến 2000, nên dùng index sẽ làm thiếu kết quả, và MongoDB không chọn nó. `{ year: 2005 }` hay `{ year: { $gt: 2010 } }` thì dùng được."
    en: "The index holds only movies with `year` greater than 2000. The query also needs movies from 1991 to 2000, so the index would give an incomplete result and MongoDB does not pick it. `{ year: 2005 }` or `{ year: { $gt: 2010 } }` can use it."
---

## Ý chính

Đây là bài đoán theo docs chính thức của MongoDB (trang "Partial Indexes"); trình duyệt không chạy `mongod`, nên không có explain thật ở đây. Luật trong tài liệu: MongoDB không dùng index (chỉ mục) partial cho truy vấn hay sắp xếp nếu việc đó làm thiếu kết quả. Muốn dùng, điều kiện của truy vấn phải nằm trong bộ lọc của index (bằng nó hoặc hẹp hơn).

- `{ year: 2005 }`: nằm trong `year > 2000`, dùng được.
- `{ year: { $gt: 2010 } }`: hẹp hơn bộ lọc, dùng được.
- `{ year: { $gt: 1990 } }`: rộng hơn bộ lọc, không dùng được.

Docs chính thức cũng nhắc: việc so tập con không giống nhau với mọi toán tử, nên trước khi dựa vào một index partial, hãy kiểm bằng `explain()`.

## Ví dụ

```javascript
db.movies.find( { year: 2005 } ).explain("executionStats")
db.movies.find( { year: { $gt: 2010 } } ).explain("executionStats")
```

Đúng với docs chính thức của MongoDB hiện hành, kiểm ngày 2026-11-20.

# EN

## Key idea

This is a prediction based on the MongoDB docs (page "Partial Indexes"); the browser runs no `mongod`, so there is no real explain here. The rule in the docs: MongoDB does not use a partial index for a query or sort if that would give an incomplete result. To use it, the query condition must fall inside the index filter (equal to it or narrower).

- `{ year: 2005 }`: inside `year > 2000`, can use it.
- `{ year: { $gt: 2010 } }`: narrower than the filter, can use it.
- `{ year: { $gt: 1990 } }`: wider than the filter, cannot use it.

The docs also warn that subset matching does not behave the same for every operator, so check with `explain()` before relying on a partial index.

## Example

```javascript
db.movies.find( { year: 2005 } ).explain("executionStats")
db.movies.find( { year: { $gt: 2010 } } ).explain("executionStats")
```

Matches the current MongoDB manual, checked 2026-11-20.
