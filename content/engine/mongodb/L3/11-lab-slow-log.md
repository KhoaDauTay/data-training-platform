---
id: e-mg-l3-11
engine: mongodb
level: L3
module: planner-agg
title: "Lab: tìm truy vấn cần index từ nhật ký chậm"
title_en: "Lab: find the queries that need an index in a slow log"
kind: lab
minutes: 15
runtime: browser
viz: mg-pipeline
objectives:
  - vi: "Tính tỉ lệ tài liệu đọc trên tài liệu trả về bằng aggregation"
    en: "Compute documents examined per document returned with aggregation"
  - vi: "Đánh dấu truy vấn quét cả collection (không đọc khóa index)"
    en: "Flag queries that scan the whole collection (no index keys read)"
  - vi: "Tìm truy vấn đọc nhiều mà không trả gì, và cộng lượng đọc bị phí"
    en: "Find queries that read a lot and return nothing, and add up the wasted reads"
requires: [e-mg-l3-06, e-mg-l3-07]
sources:
  - https://www.mongodb.com/docs/manual/tutorial/analyze-query-plan/
  - https://www.mongodb.com/docs/manual/reference/explain-results/
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/divide/
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
    - task:
        vi: "Có truy vấn đọc tài liệu mà không trả về gì: tỉ lệ không tính được nên bước 1 bỏ sót nó. Trả `_id` và `shape` của mọi truy vấn có `docsExamined` lớn hơn 0 và `nReturned` bằng 0."
        en: "Some queries read documents and return nothing: their ratio cannot be computed, so step 1 misses them. Return `_id` and `shape` of every query with `docsExamined` greater than 0 and `nReturned` equal to 0."
      solution: 'db.slowlog.find({ docsExamined: { $gt: 0 }, nReturned: 0 }, { shape: 1 })'
      check: doc
      hint:
        vi: "Một `find` với hai điều kiện, chiếu `shape` (`_id` có sẵn)."
        en: "One `find` with two conditions, projecting `shape` (`_id` comes by default)."
    - task:
        vi: "Các truy vấn quét cả collection đọc tổng cộng bao nhiêu tài liệu? Trả một tài liệu `{ _id: null, docs: <tổng docsExamined của các truy vấn có keysExamined bằng 0> }`."
        en: "How many documents do the full-scan queries read in total? Return one document `{ _id: null, docs: <sum of docsExamined of queries with keysExamined equal to 0> }`."
      solution: 'db.slowlog.aggregate([{ $match: { keysExamined: 0 } }, { $group: { _id: null, docs: { $sum: "$docsExamined" } } }])'
      check: doc
      hint:
        vi: "`$match` trên `keysExamined: 0`, rồi `$group` với `_id: null` và `$sum`."
        en: "`$match` on `keysExamined: 0`, then `$group` with `_id: null` and `$sum`."
quiz:
  - q:
      vi: "Truy vấn `q4` đọc 5000 tài liệu, trả 4900, và `keysExamined` = 0. Có nên ưu tiên index cho nó không?"
      en: "Query `q4` reads 5000 documents, returns 4900, and has `keysExamined` = 0. Should it get an index first?"
    options:
      - { vi: "Có: không dùng index thì luôn là truy vấn tệ nhất", en: "Yes: a query without an index is always the worst one" }
      - { vi: "Chưa: nó trả gần hết những gì đọc, một index cũng phải đọc gần ngần ấy tài liệu", en: "Not yet: it returns almost everything it reads, so an index would still read about as many documents" }
      - { vi: "Không bao giờ: truy vấn trả nhiều tài liệu không dùng được index", en: "Never: a query returning many documents cannot use an index" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì COLLSCAN thường là dấu hiệu xấu, nhưng điều docs chính thức nhấn mạnh là khoảng cách giữa tài liệu đọc và tài liệu trả về. `q4` có tỉ lệ khoảng 1, còn `q1` đọc 400 tài liệu cho mỗi tài liệu trả về: đó mới là chỗ index giúp nhiều."
      en: "It sounds right because a COLLSCAN is usually a bad sign, but what the docs stress is the gap between documents read and documents returned. `q4` has a ratio of about 1, while `q1` reads 400 documents per document returned: that is where an index helps most."
  - q:
      vi: "Vì sao pipeline bước 1 lọc `nReturned` lớn hơn 0 trước khi chia?"
      en: "Why does the step 1 pipeline filter `nReturned` greater than 0 before dividing?"
    options:
      - { vi: "Chia cho 0 làm `$divide` báo lỗi và cả pipeline dừng", en: "Dividing by 0 makes `$divide` raise an error and the whole pipeline stops" }
      - { vi: "Để kết quả được sắp xếp", en: "So the result is sorted" }
      - { vi: "`$divide` cho 0 khi mẫu số bằng 0, làm sai thứ hạng", en: "`$divide` gives 0 when the divisor is 0, which skews the ranking" }
    answer: 0
    why:
      vi: "`$divide` với mẫu số 0 là lỗi, không phải 0 hay null. Lọc trước thì không còn mẫu số 0; truy vấn trả 0 tài liệu được tìm riêng ở bước 2."
      en: "`$divide` with a divisor of 0 is an error, not 0 or null. Filtering first leaves no zero divisor; queries that return 0 documents are found separately in step 2."
---
## Mở bài

Nhật ký truy vấn chậm có hàng trăm dòng, và bạn chỉ có thời gian thêm vài index. Truy vấn nào đáng sửa trước? Một con số đơn giản rút từ `executionStats` trả lời được phần lớn câu hỏi.

## Ý chính

Explain ở chế độ `executionStats` ghi ba con số quan trọng: `totalKeysExamined` (khóa index đã đọc), `totalDocsExamined` (tài liệu đã đọc) và `nReturned` (tài liệu trả về). Trang docs chính thức "Interpret Explain Plan Results" nói khoảng cách lớn giữa tài liệu đọc và tài liệu trả về gợi ý truy vấn có thể cần index, và `totalKeysExamined` = 0 nghĩa là không dùng index. Tỉ lệ đọc trên trả về là một con số gọn để xếp hạng: gần 1 là tốt, hàng trăm là đáng sửa.

Nhiều người nghĩ cứ thấy không dùng index là phải thêm index. Thật ra truy vấn trả gần hết những gì nó đọc (tỉ lệ gần 1) thì index cũng phải đọc gần ngần ấy; còn truy vấn đọc nhiều mà không trả gì thì tỉ lệ không tính được, phải tìm riêng.

Lab chạy bằng mingo trong trình duyệt. mingo không có index và không có explain, nên ở đây ta không đo kế hoạch: ta phân tích các con số explain đã ghi lại trong collection `slowlog`, đúng việc người vận hành làm với nhật ký chậm.

## Cú pháp

```text
{ $divide: [ <dividend>, <divisor> ] }          // error when the divisor is 0
{ $round: [ <number>, <places> ] }
{ $eq: [ <expression>, <value> ] }              // a boolean flag
db.<coll>.aggregate([ { $match: ... }, { $project: { <new field>: <expression> } }, { $match: { <new field>: ... } } ])
```

- `$match` đặt sau `$project` mới thấy được trường vừa tính.
- `$divide` cho 0 ở mẫu là lỗi: lọc mẫu số trước.
- `$eq` trong `$project` trả `true` hoặc `false`.

## Ví dụ

Các truy vấn không đọc khóa index nào:

```javascript
db.slowlog.find({ keysExamined: 0 }, { shape: 1, docsExamined: 1 })
```

Ba truy vấn `q1`, `q4`, `q5` quét cả collection.

Tỉ lệ đọc trên trả về của mọi truy vấn có trả kết quả:

```javascript
db.slowlog.aggregate([{ $match: { nReturned: { $gt: 0 } } }, { $project: { ratio: { $round: [{ $divide: ["$docsExamined", "$nReturned"] }, 1] } } }])
```

`q1` đọc 400 tài liệu cho mỗi tài liệu trả về, `q7` đọc 30, `q3` đọc 15; các truy vấn còn lại gần 1.

Truy vấn đọc mà không trả gì:

```javascript
db.slowlog.find({ nReturned: 0 }, { shape: 1, docsExamined: 1 })
```

`q5` đọc 40 tài liệu và trả 0: tỉ lệ không tính được, nên cần một truy vấn riêng.

## Lỗi hay gặp

Lọc trên trường chưa được tính:

```javascript
// WRONG: ratio does not exist yet at the first $match
db.slowlog.aggregate([{ $match: { ratio: { $gte: 10 } } }, { $project: { ratio: { $divide: ["$docsExamined", "$nReturned"] } } }])
```

```javascript
// FIX: compute first, then filter on the new field
db.slowlog.aggregate([{ $match: { nReturned: { $gt: 0 } } }, { $project: { ratio: { $divide: ["$docsExamined", "$nReturned"] } } }, { $match: { ratio: { $gte: 10 } } }])
```

Câu sai không báo lỗi, chỉ trả rỗng, nên dễ tưởng là không có truy vấn nào chậm.

Chia theo khóa index thay vì tài liệu:

```javascript
// WRONG: keysExamined is 0 for a full scan, so q1 disappears
db.slowlog.aggregate([{ $match: { nReturned: { $gt: 0 } } }, { $project: { ratio: { $divide: ["$keysExamined", "$nReturned"] } } }, { $match: { ratio: { $gte: 10 } } }])
```

```javascript
// FIX: documents examined per document returned
db.slowlog.aggregate([{ $match: { nReturned: { $gt: 0 } } }, { $project: { ratio: { $divide: ["$docsExamined", "$nReturned"] } } }, { $match: { ratio: { $gte: 10 } } }])
```

Câu sai bỏ mất đúng truy vấn tệ nhất, `q1`, vì truy vấn quét cả collection có `keysExamined` = 0.

Chia mà không lọc mẫu số:

```javascript
// ERROR mingo
db.slowlog.aggregate([{ $project: { ratio: { $divide: ["$docsExamined", "$nReturned"] } } }])
```

`q5` có `nReturned` = 0; `$divide` từ chối chia cho 0 và cả pipeline dừng. MongoDB thật cũng báo lỗi ở đây.

## Thực hành

Ba bước trên `slowlog`: xếp hạng theo tỉ lệ, tìm truy vấn đọc mà không trả gì, rồi cộng lượng đọc của các truy vấn quét cả collection. Tab "Pipeline từng bước" cho thấy số tài liệu sau mỗi stage: đặt `$match` đầu tiên để các stage sau xử lý ít hơn.

## Tóm tắt

- Tỉ lệ `docsExamined` / `nReturned` xếp hạng truy vấn cần index; gần 1 là tốt.
- `keysExamined` = 0 nghĩa là quét cả collection, nhưng tỉ lệ mới cho biết có đáng sửa không.
- Truy vấn trả 0 tài liệu không có tỉ lệ: tìm riêng.
- Trong pipeline, tính trường trước rồi mới `$match` trên nó; lọc mẫu số 0 trước khi `$divide`.

# EN

## Opening

The slow query log has hundreds of lines, and you only have time to add a few indexes. Which query is worth fixing first? One simple number taken from `executionStats` answers most of that question.

## Key idea

Explain in `executionStats` mode records three key numbers: `totalKeysExamined` (index keys read), `totalDocsExamined` (documents read) and `nReturned` (documents returned). The docs page "Interpret Explain Plan Results" says a large gap between documents read and documents returned suggests the query may need an index, and `totalKeysExamined` = 0 means no index was used. Documents read per document returned is a compact number to rank by: close to 1 is good, hundreds is worth fixing.

Many people think any query without an index needs one. In fact a query that returns almost everything it reads (a ratio near 1) would make an index read about as much; and a query that reads a lot and returns nothing has no ratio at all, so it must be found separately.

The lab runs on mingo in the browser. mingo has no indexes and no explain, so we do not measure plans here: we analyse the explain numbers recorded in the `slowlog` collection, which is what an operator does with a slow log.

## Syntax

```text
{ $divide: [ <dividend>, <divisor> ] }          // error when the divisor is 0
{ $round: [ <number>, <places> ] }
{ $eq: [ <expression>, <value> ] }              // a boolean flag
db.<coll>.aggregate([ { $match: ... }, { $project: { <new field>: <expression> } }, { $match: { <new field>: ... } } ])
```

- A `$match` placed after `$project` can see the field just computed.
- `$divide` with 0 as the divisor is an error: filter the divisor first.
- `$eq` inside `$project` returns `true` or `false`.

## Example

The queries that read no index key:

```javascript
db.slowlog.find({ keysExamined: 0 }, { shape: 1, docsExamined: 1 })
```

Three queries, `q1`, `q4`, `q5`, scan the whole collection.

Documents read per document returned, for every query that returns something:

```javascript
db.slowlog.aggregate([{ $match: { nReturned: { $gt: 0 } } }, { $project: { ratio: { $round: [{ $divide: ["$docsExamined", "$nReturned"] }, 1] } } }])
```

`q1` reads 400 documents per document returned, `q7` reads 30, `q3` reads 15; the rest are close to 1.

Queries that read and return nothing:

```javascript
db.slowlog.find({ nReturned: 0 }, { shape: 1, docsExamined: 1 })
```

`q5` reads 40 documents and returns 0: it has no ratio, so it needs a query of its own.

## Common mistakes

Filtering on a field not computed yet:

```javascript
// WRONG: ratio does not exist yet at the first $match
db.slowlog.aggregate([{ $match: { ratio: { $gte: 10 } } }, { $project: { ratio: { $divide: ["$docsExamined", "$nReturned"] } } }])
```

```javascript
// FIX: compute first, then filter on the new field
db.slowlog.aggregate([{ $match: { nReturned: { $gt: 0 } } }, { $project: { ratio: { $divide: ["$docsExamined", "$nReturned"] } } }, { $match: { ratio: { $gte: 10 } } }])
```

The wrong pipeline raises no error, it just returns nothing, so it is easy to believe no query is slow.

Dividing index keys instead of documents:

```javascript
// WRONG: keysExamined is 0 for a full scan, so q1 disappears
db.slowlog.aggregate([{ $match: { nReturned: { $gt: 0 } } }, { $project: { ratio: { $divide: ["$keysExamined", "$nReturned"] } } }, { $match: { ratio: { $gte: 10 } } }])
```

```javascript
// FIX: documents examined per document returned
db.slowlog.aggregate([{ $match: { nReturned: { $gt: 0 } } }, { $project: { ratio: { $divide: ["$docsExamined", "$nReturned"] } } }, { $match: { ratio: { $gte: 10 } } }])
```

The wrong one drops exactly the worst query, `q1`, because a full collection scan has `keysExamined` = 0.

Dividing without filtering the divisor:

```javascript
// ERROR mingo
db.slowlog.aggregate([{ $project: { ratio: { $divide: ["$docsExamined", "$nReturned"] } } }])
```

`q5` has `nReturned` = 0; `$divide` refuses to divide by 0 and the whole pipeline stops. A real MongoDB raises an error here too.

## Practice

Three steps on `slowlog`: rank by ratio, find queries that read and return nothing, then add up the reads of the full-scan queries. The "Pipeline step by step" tab shows the number of documents after each stage: put `$match` first so later stages handle fewer.

## Recap

- The ratio `docsExamined` / `nReturned` ranks queries that need an index; close to 1 is good.
- `keysExamined` = 0 means a full collection scan, but the ratio tells whether it is worth fixing.
- A query returning 0 documents has no ratio: find it separately.
- In a pipeline, compute a field before you `$match` on it; filter out a zero divisor before `$divide`.
