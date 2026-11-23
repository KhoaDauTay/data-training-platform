---
id: e-mg-l3-06
engine: mongodb
level: L3
module: esr-explain
title: "Đoán kế hoạch: chưa có index thì sao?"
title_en: "Predict the plan: what happens without an index?"
kind: predict
minutes: 6
runtime: docs
objectives:
  - vi: "Đoán COLLSCAN hay IXSCAN từ danh sách index đang có"
    en: "Predict COLLSCAN or IXSCAN from the list of existing indexes"
  - vi: "Đọc totalKeysExamined, totalDocsExamined và nReturned"
    en: "Read totalKeysExamined, totalDocsExamined and nReturned"
requires: [e-mg-l3-05]
sources:
  - https://www.mongodb.com/docs/manual/tutorial/analyze-query-plan/
  - https://www.mongodb.com/docs/manual/reference/explain-results/
predict:
  sql: |
    db.movies.find(
       { year: { $gte: 2000, $lte: 2005 } }
    ).explain("executionStats")
  q:
    vi: "Collection `movies` có 21.349 tài liệu, chỉ có index `_id`. Truy vấn khớp 3809 tài liệu. Explain cho thấy gì?"
    en: "The `movies` collection has 21,349 documents and only the `_id` index. The query matches 3809 documents. What does explain show?"
  options:
    - vi: "`IXSCAN` trên `_id`, `totalKeysExamined` = 21.349"
      en: "`IXSCAN` on `_id`, `totalKeysExamined` = 21,349"
    - vi: "`COLLSCAN`, `totalKeysExamined` = 0, `totalDocsExamined` = 21.349"
      en: "`COLLSCAN`, `totalKeysExamined` = 0, `totalDocsExamined` = 21,349"
    - vi: "`COLLSCAN`, `totalDocsExamined` = 3809"
      en: "`COLLSCAN`, `totalDocsExamined` = 3809"
    - vi: "`FETCH` trên `IXSCAN`, `totalDocsExamined` = 3809"
      en: "`FETCH` over `IXSCAN`, `totalDocsExamined` = 3809"
  answer: 1
  why:
    vi: "Truy vấn lọc theo `year` mà không có index nào trên `year`, nên planner quét cả collection: đọc 21.349 tài liệu để trả 3809. `COLLSCAN` không đọc khóa index nên `totalKeysExamined` = 0."
    en: "The query filters on `year` and no index covers `year`, so the planner scans the whole collection: it reads 21,349 documents to return 3809. A `COLLSCAN` reads no index keys, so `totalKeysExamined` = 0."
  recorded:
    tier: docs
    server: MongoDB
    version: "9.0"
    date: "2026-11-20"
    url: https://www.mongodb.com/docs/manual/tutorial/analyze-query-plan/
    output: |
      no index on year:
        winningPlan: COLLSCAN
        nReturned: 3809
        totalKeysExamined: 0
        totalDocsExamined: 21349
      after createIndex({ year: 1 }):
        winningPlan: FETCH > IXSCAN
        nReturned: 3809
        totalKeysExamined: 3809
        totalDocsExamined: 3809
---

## Ý chính

Ví dụ trong docs chính thức của MongoDB (chưa chạy trong trình duyệt): kết quả dưới đây in trong trang "Interpret Explain Plan Results" trên bộ mẫu `sample_mflix`. Trình duyệt không có `mongod` thật, nên bài này chỉ đọc và đoán.

- `winningPlan.stage` là `COLLSCAN`: quét cả collection, từng tài liệu.
- `totalKeysExamined` = 0: không đọc khóa index (chỉ mục) nào.
- `totalDocsExamined` 21.349 so với `nReturned` 3809: đọc khoảng 5,6 tài liệu cho mỗi tài liệu trả về. Khoảng cách lớn giữa hai số này là dấu hiệu truy vấn có thể cần index.

Sau khi tạo `{ year: 1 }`, docs chính thức cho thấy kế hoạch thành `FETCH` trên `IXSCAN`, và cả ba con số đều là 3809.

## Ví dụ

```javascript
{
  queryPlanner: {
    namespace: 'sample_mflix.movies',
    winningPlan: {
      stage: 'COLLSCAN',
      '...': '...'
    },
    '...': '...'
  },
  executionStats: {
    executionSuccess: true,
    nReturned: 3809,
    totalKeysExamined: 0,
    totalDocsExamined: 21349,
    executionStages: {
      stage: 'COLLSCAN',
      '...': '...'
    },
    '...': '...'
  },
  '...': '...'
}
```

Đúng với docs chính thức của MongoDB hiện hành, kiểm ngày 2026-11-20. Docs chính thức ghi chú explain có thể đổi giữa các phiên bản.

# EN

## Key idea

Example from the official MongoDB docs (not run in the browser): the output below is printed on the page "Interpret Explain Plan Results" for the `sample_mflix` sample set. The browser has no real `mongod`, so this lesson is read and predict only.

- `winningPlan.stage` is `COLLSCAN`: a scan of the whole collection, document by document.
- `totalKeysExamined` = 0: no index keys were read.
- `totalDocsExamined` 21,349 against `nReturned` 3809: about 5.6 documents read per document returned. A large gap between these two numbers suggests the query may need an index.

After creating `{ year: 1 }`, the docs show the plan becomes `FETCH` over `IXSCAN`, with all three numbers at 3809.

## Example

```javascript
{
  queryPlanner: {
    namespace: 'sample_mflix.movies',
    winningPlan: {
      stage: 'COLLSCAN',
      '...': '...'
    },
    '...': '...'
  },
  executionStats: {
    executionSuccess: true,
    nReturned: 3809,
    totalKeysExamined: 0,
    totalDocsExamined: 21349,
    executionStages: {
      stage: 'COLLSCAN',
      '...': '...'
    },
    '...': '...'
  },
  '...': '...'
}
```

Matches the current MongoDB manual, checked 2026-11-20. The docs note that explain output can change between versions.
