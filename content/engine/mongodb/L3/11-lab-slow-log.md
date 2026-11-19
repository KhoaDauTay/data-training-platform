---
id: e-mg-l3-11
engine: mongodb
level: L3
module: planner-agg
title: "Lab: tìm truy vấn cần index từ nhật ký chậm"
title_en: "Lab: find the queries that need an index in a slow log"
kind: lab
minutes: 12
runtime: browser
viz: mg-pipeline
objectives:
  - vi: "Tính tỉ lệ tài liệu đọc trên tài liệu trả về bằng aggregation"
    en: "Compute documents examined per document returned with aggregation"
  - vi: "Đánh dấu truy vấn quét cả collection (không đọc khóa index)"
    en: "Flag queries that scan the whole collection (no index keys read)"
requires: [e-mg-l3-06, e-mg-l3-07]
sources:
  - https://www.mongodb.com/docs/manual/tutorial/analyze-query-plan/
  - https://www.mongodb.com/docs/manual/reference/explain-results/
lab:
  setup: |
    {"collections": {"slowlog": [
      {"_id": "q1", "shape": "orders by status", "keysExamined": 0, "docsExamined": 48000, "nReturned": 120},
      {"_id": "q2", "shape": "orders by customer", "keysExamined": 35, "docsExamined": 35, "nReturned": 35},
      {"_id": "q3", "shape": "orders by day range", "keysExamined": 900, "docsExamined": 900, "nReturned": 60},
      {"_id": "q4", "shape": "products by tag", "keysExamined": 0, "docsExamined": 5000, "nReturned": 4900},
      {"_id": "q5", "shape": "stores by city", "keysExamined": 0, "docsExamined": 40, "nReturned": 0},
      {"_id": "q6", "shape": "reviews by product", "keysExamined": 12, "docsExamined": 12, "nReturned": 12},
      {"_id": "q7", "shape": "orders by store and status", "keysExamined": 2400, "docsExamined": 2400, "nReturned": 80}
    ]}}
  steps:
    - task:
        vi: "Collection `slowlog` giữ số liệu `executionStats` của các truy vấn chậm. Với truy vấn có `nReturned` lớn hơn 0, tính `ratio` = `docsExamined` / `nReturned` làm tròn 1 chữ số và `fullScan` = `keysExamined` bằng 0. Chỉ giữ truy vấn có `ratio` từ 10 trở lên. Trả `_id`, `shape`, `ratio`, `fullScan`, xếp `ratio` giảm dần, hòa thì `_id` tăng dần."
        en: "The `slowlog` collection holds `executionStats` numbers of slow queries. For queries with `nReturned` greater than 0, compute `ratio` = `docsExamined` / `nReturned` rounded to 1 decimal and `fullScan` = `keysExamined` equals 0. Keep only queries with `ratio` of 10 or more. Return `_id`, `shape`, `ratio`, `fullScan`, ordered by `ratio` descending, ties by `_id` ascending."
      solution: |
        db.slowlog.aggregate([
          { $match: { nReturned: { $gt: 0 } } },
          { $project: {
              shape: 1,
              ratio: { $round: [ { $divide: [ "$docsExamined", "$nReturned" ] }, 1 ] },
              fullScan: { $eq: [ "$keysExamined", 0 ] }
          } },
          { $match: { ratio: { $gte: 10 } } },
          { $sort: { ratio: -1, _id: 1 } }
        ])
      check: doc
      ordered: true
      hint:
        vi: "Lọc `nReturned` trước để không chia cho 0. Dùng `$divide` trong `$round`, `$eq` cho cờ, rồi `$match` lần hai trên `ratio`."
        en: "Filter `nReturned` first so you never divide by 0. Use `$divide` inside `$round`, `$eq` for the flag, then a second `$match` on `ratio`."
---

## Ý chính

Lab chạy bằng mingo (ngôn ngữ truy vấn MongoDB) trong trình duyệt. mingo không có index và không có explain, nên ở đây ta không đo kế hoạch: ta phân tích những con số explain đã được ghi lại, đúng việc một người vận hành làm với nhật ký truy vấn chậm.

Tài liệu "Interpret Explain Plan Results" nói khoảng cách lớn giữa `totalDocsExamined` và `nReturned` gợi ý truy vấn có thể cần index, và `totalKeysExamined` = 0 nghĩa là không dùng index. Tỉ lệ đọc trên trả về là một con số gọn để xếp hạng.

## Ví dụ

Truy vấn `movies` không index trong tài liệu đọc 21349 tài liệu để trả 3809, tỉ lệ khoảng 5,6. Truy vấn có index tốt thì tỉ lệ gần 1.

## Thực hành

Viết một pipeline `aggregate` trên `slowlog`. Tab "Pipeline từng bước" cho thấy số tài liệu sau mỗi stage: đặt `$match` đầu tiên để các stage sau xử lý ít hơn.

# EN

## Key idea

This lab runs on mingo (the MongoDB query language) in the browser. mingo has no indexes and no explain, so we do not measure plans here: we analyse recorded explain numbers, which is what an operator does with a slow query log.

The page "Interpret Explain Plan Results" says a large gap between `totalDocsExamined` and `nReturned` suggests the query may need an index, and `totalKeysExamined` = 0 means no index was used. Documents read per document returned is a compact number to rank by.

## Example

The unindexed `movies` query in the docs reads 21349 documents to return 3809, a ratio of about 5.6. A query with a good index has a ratio close to 1.

## Practice

Write one `aggregate` pipeline on `slowlog`. The "Pipeline step by step" tab shows the number of documents after each stage: put `$match` first so later stages handle fewer.
