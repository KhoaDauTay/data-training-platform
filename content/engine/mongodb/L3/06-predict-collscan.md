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
  trap: 2
  why:
    vi: "3809 là số tài liệu trả về, nhưng `totalDocsExamined` đếm mọi tài liệu đã đọc, khớp hay không. Không có index trên `year`, nên planner quét cả collection: đọc 21.349 để trả 3809. `COLLSCAN` không đọc khóa index nên `totalKeysExamined` = 0. Index `_id` không sắp theo `year` nên không giúp lọc, planner không quét nó; `FETCH` trên `IXSCAN` chỉ xuất hiện sau khi tạo `{ year: 1 }`."
    en: "3809 is the number of documents returned, but `totalDocsExamined` counts every document read, matching or not. With no index on `year`, the planner scans the whole collection: it reads 21,349 to return 3809. A `COLLSCAN` reads no index keys, so `totalKeysExamined` = 0. The `_id` index is not ordered by `year`, so it cannot help the filter and the planner does not scan it; `FETCH` over `IXSCAN` appears only after creating `{ year: 1 }`."
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
quiz:
  - q:
      vi: "Sau khi tạo `{ year: 1 }`, explain có `nReturned` 3809, `totalKeysExamined` 3809, `totalDocsExamined` 3809. Đọc thế nào?"
      en: "After creating `{ year: 1 }`, explain shows `nReturned` 3809, `totalKeysExamined` 3809, `totalDocsExamined` 3809. How do you read it?"
    options:
      - { vi: "Index đọc đúng số khóa cần, và mỗi khóa dẫn tới một tài liệu được trả: gần lý tưởng", en: "The index read just the keys needed, and each key led to a returned document: close to ideal" }
      - { vi: "Truy vấn vẫn quét cả collection", en: "The query still scans the whole collection" }
      - { vi: "Truy vấn được phủ, không đọc tài liệu nào", en: "The query is covered and reads no document" }
    answer: 0
    why:
      vi: "Ba số bằng nhau nghĩa là index đọc 3809 khóa, mỗi khóa mở một tài liệu, và tài liệu nào mở cũng được trả: không đọc thừa. Không còn quét cả collection: khi đó `totalDocsExamined` sẽ là 21.349, không phải 3809. Truy vấn cũng không được phủ (trả lời chỉ từ index): `totalDocsExamined` khác 0 và kế hoạch có `FETCH`, tức vẫn mở tài liệu."
      en: "Three equal numbers mean the index read 3809 keys, each key opened one document, and every opened document was returned: nothing extra was read. It no longer scans the whole collection: then `totalDocsExamined` would be 21,349, not 3809. Nor is the query covered (answered from the index alone): `totalDocsExamined` is not 0 and the plan has a `FETCH`, so documents are still opened."
---
## Mở bài

Một màn hình lọc phim theo năm bỗng chậm khi collection lên hơn hai mươi nghìn tài liệu. Chưa ai tạo index trên `year`. Explain sẽ kể chuyện gì?

## Ý chính

Ví dụ trong docs chính thức của MongoDB (chưa chạy trong trình duyệt): các số ở thẻ "Theo tài liệu" in trong trang "Interpret Explain Plan Results" trên bộ mẫu `sample_mflix`. Trình duyệt không có `mongod` thật, nên bài này chỉ đọc và đoán.

- `winningPlan.stage` là `COLLSCAN`: quét cả collection, từng tài liệu.
- `totalKeysExamined` = 0: không đọc khóa index nào.
- `totalDocsExamined` 21.349 so với `nReturned` 3809: đọc khoảng 5,6 tài liệu cho mỗi tài liệu trả về. Khoảng cách lớn giữa hai số này là dấu hiệu truy vấn có thể cần index.

Nhiều người nghĩ `totalDocsExamined` là số tài liệu khớp. Thật ra nó đếm mọi tài liệu đã mở, khớp hay không; so nó với `nReturned` mới biết truy vấn đọc thừa bao nhiêu. Sau khi tạo `{ year: 1 }`, docs chính thức cho thấy kế hoạch thành `FETCH` trên `IXSCAN`, và cả ba con số đều là 3809. Docs cũng ghi chú định dạng explain có thể đổi giữa các phiên bản.

## Tóm tắt

- `COLLSCAN` = quét cả collection; `totalKeysExamined` = 0.
- `totalDocsExamined` đếm mọi tài liệu đã đọc, không chỉ tài liệu khớp.
- Khoảng cách lớn giữa `totalDocsExamined` và `nReturned` gợi ý cần index.
- Index tốt đưa ba con số về gần nhau.

# EN

## Opening

A screen that filters movies by year suddenly slows down once the collection passes twenty thousand documents. Nobody has created an index on `year`. What story will explain tell?

## Key idea

Example from the official MongoDB docs (not run in the browser): the figures in the "From the docs" card are printed on the page "Interpret Explain Plan Results" for the `sample_mflix` sample set. The browser has no real `mongod`, so this lesson is read and predict only.

- `winningPlan.stage` is `COLLSCAN`: a scan of the whole collection, document by document.
- `totalKeysExamined` = 0: no index keys were read.
- `totalDocsExamined` 21,349 against `nReturned` 3809: about 5.6 documents read per document returned. A large gap between these two numbers suggests the query may need an index.

Many people think `totalDocsExamined` is the number of matching documents. In fact it counts every document opened, matching or not; comparing it with `nReturned` tells how much extra the query read. After creating `{ year: 1 }`, the docs show the plan becomes `FETCH` over `IXSCAN`, with all three numbers at 3809. The docs also note that the explain format can change between versions.

## Recap

- `COLLSCAN` = a whole-collection scan; `totalKeysExamined` = 0.
- `totalDocsExamined` counts every document read, not only the matches.
- A large gap between `totalDocsExamined` and `nReturned` suggests an index is needed.
- A good index brings the three numbers close together.
