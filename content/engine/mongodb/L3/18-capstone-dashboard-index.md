---
id: e-mg-l3-18
engine: mongodb
level: L3
module: planner-agg
title: "Capstone: index cho bảng điều khiển cửa hàng"
title_en: "Capstone: indexes for a store dashboard"
kind: capstone
minutes: 25
runtime: browser
viz: mg-pipeline
objectives:
  - vi: "Viết truy vấn bảng điều khiển rồi đặt index theo ESR cho nó"
    en: "Write the dashboard query, then build an ESR index for it"
  - vi: "Viết một truy vấn mà index có sẵn phủ được, và một pipeline lọc trước khi nối"
    en: "Write a query an existing index can cover, and a pipeline that filters before it joins"
requires: [e-mg-l3-05, e-mg-l3-09, e-mg-l3-12]
sources:
  - https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/
  - https://www.mongodb.com/docs/manual/core/query-optimization/
  - https://www.mongodb.com/docs/manual/core/aggregation-pipeline-optimization/
lab:
  setup: |
    {"collections": {
      "orders": [
        {"_id": 1, "store": "S1", "status": "paid", "total": 120, "createdAt": {"$date": "2026-10-01T09:15:00Z"}},
        {"_id": 2, "store": "S1", "status": "paid", "total": 80, "createdAt": {"$date": "2026-10-01T17:40:00Z"}},
        {"_id": 3, "store": "S2", "status": "paid", "total": 200, "createdAt": {"$date": "2026-10-01T11:05:00Z"}},
        {"_id": 4, "store": "S2", "status": "cancelled", "total": 55, "createdAt": {"$date": "2026-10-02T08:00:00Z"}},
        {"_id": 5, "store": "S1", "status": "paid", "total": 150, "createdAt": {"$date": "2026-10-02T10:30:00Z"}},
        {"_id": 6, "store": "S3", "status": "paid", "total": 150, "createdAt": {"$date": "2026-10-02T12:00:00Z"}},
        {"_id": 7, "store": "S3", "status": "pending", "total": 90, "createdAt": {"$date": "2026-10-02T19:45:00Z"}},
        {"_id": 8, "store": "S2", "status": "paid", "total": 40, "createdAt": {"$date": "2026-10-02T21:10:00Z"}},
        {"_id": 9, "store": "S1", "status": "cancelled", "total": 300, "createdAt": {"$date": "2026-10-03T09:00:00Z"}},
        {"_id": 10, "store": "S1", "status": "paid", "total": 100, "createdAt": {"$date": "2026-10-03T15:20:00Z"}}
      ],
      "stores": [
        {"_id": "S1", "city": "Da Nang", "region": "Central"},
        {"_id": "S2", "city": "Hue", "region": "Central"},
        {"_id": "S3", "city": "Can Tho", "region": "South"}
      ]
    }}
  steps:
    - name: { vi: "Truy vấn bảng điều khiển", en: "The dashboard query" }
      task:
        vi: "Bảng điều khiển của cửa hàng `S1` liệt kê các đơn `paid` có `total` từ 100 trở lên, mới nhất trước (theo `createdAt` giảm dần). Trả cả tài liệu."
        en: "Store `S1`'s dashboard lists the `paid` orders with a `total` of 100 or more, newest first (by `createdAt` descending). Return whole documents."
      solution: 'db.orders.find({ store: "S1", status: "paid", total: { $gte: 100 } }).sort({ createdAt: -1 })'
      check: doc
      ordered: true
      sql: "SELECT * FROM orders WHERE store = 'S1' AND status = 'paid' AND total >= 100 ORDER BY created_at DESC;"
      hint:
        vi: "Bộ lọc có hai phép so bằng và một khoảng `$gte`; `.sort({ createdAt: -1 })` xếp mới nhất trước."
        en: "The filter has two equalities and one `$gte` range; `.sort({ createdAt: -1 })` puts the newest first."
    - name: { vi: "Index theo ESR", en: "An ESR index" }
      task:
        vi: "Viết một `createIndex` cho truy vấn ở bước 1 theo quy tắc ESR, để MongoDB đọc theo thứ tự index mà không phải sắp trong bộ nhớ."
        en: "Write one `createIndex` for the step 1 query that follows the ESR rule, so MongoDB reads in index order without sorting in memory."
      solution: 'db.orders.createIndex({ store: 1, status: 1, createdAt: -1, total: 1 })'
      check: doc
      rule: esr
      target: 'db.orders.find({ store: "S1", status: "paid", total: { $gte: 100 } }).sort({ createdAt: -1 })'
      slow: 'db.orders.createIndex({ store: 1, status: 1, total: 1, createdAt: -1 })'
      hint:
        vi: "Equality trước (`store`, `status`), rồi trường sắp (`createdAt`), rồi trường khoảng (`total`)."
        en: "Equality first (`store`, `status`), then the sort field (`createdAt`), then the range field (`total`)."
      fact:
        vi: "Docs chính thức (ESR): đặt trường sắp trước trường khoảng để tránh sắp trong bộ nhớ. Bước này chấm theo quy tắc, vì mingo không có index hay explain."
        en: "The official docs (ESR): put the sort field before the range field to avoid an in-memory sort. This step is graded by rule, since mingo has no index or explain."
    - name: { vi: "Truy vấn được phủ", en: "A covered query" }
      task:
        vi: "Đội kế toán đã có index `{ store: 1, status: 1, total: 1 }`. Lấy `store` và `total` của mọi đơn `paid` ở cửa hàng `S2`, viết sao cho index đó phủ được truy vấn (MongoDB không phải đọc tài liệu)."
        en: "The accounting team already has the index `{ store: 1, status: 1, total: 1 }`. Get the `store` and `total` of every `paid` order of store `S2`, written so that index can cover the query (MongoDB does not have to read the documents)."
      solution: 'db.orders.find({ store: "S2", status: "paid" }, { _id: 0, store: 1, total: 1 })'
      check: doc
      rule: covered
      index: '{ store: 1, status: 1, total: 1 }'
      slow: 'db.orders.find({ store: "S2", status: "paid" }, { store: 1, total: 1 })'
      sql: "SELECT store, total FROM orders WHERE store = 'S2' AND status = 'paid';"
      hint:
        vi: "Mọi trường lọc và trường trả về phải nằm trong index. `_id` không có trong index, nên phải bỏ nó bằng `_id: 0`."
        en: "Every filtered and returned field must be in the index. `_id` is not in the index, so drop it with `_id: 0`."
    - name: { vi: "Lọc trước khi nối", en: "Filter before the join" }
      task:
        vi: "Doanh thu đơn `paid` theo vùng: nối `stores` để lấy `region`. Trả `_id` là vùng và `revenue` là tổng `total`, xếp `_id` tăng dần. Viết sao cho các stage nặng đọc ít tài liệu nhất."
        en: "Revenue of `paid` orders by region: join `stores` to get the `region`. Return `_id` as the region and `revenue` as the sum of `total`, ordered by `_id` ascending. Write it so the heavy stages read as few documents as possible."
      solution: 'db.orders.aggregate([{ $match: { status: "paid" } }, { $lookup: { from: "stores", localField: "store", foreignField: "_id", as: "s" } }, { $unwind: "$s" }, { $group: { _id: "$s.region", revenue: { $sum: "$total" } } }, { $sort: { _id: 1 } }])'
      check: doc
      ordered: true
      rule: match-first
      slow: 'db.orders.aggregate([{ $lookup: { from: "stores", localField: "store", foreignField: "_id", as: "s" } }, { $unwind: "$s" }, { $match: { status: "paid" } }, { $group: { _id: "$s.region", revenue: { $sum: "$total" } } }, { $sort: { _id: 1 } }])'
      sql: "SELECT s.region AS _id, SUM(o.total) AS revenue FROM orders o JOIN stores s ON s.id = o.store WHERE o.status = 'paid' GROUP BY s.region ORDER BY s.region;"
      hint:
        vi: "`$match` trên `status` đứng đầu, rồi `$lookup`, `$unwind`, `$group` theo `$s.region`, cuối cùng `$sort`."
        en: "`$match` on `status` goes first, then `$lookup`, `$unwind`, `$group` by `$s.region`, and `$sort` last."
quiz:
  - q:
      vi: "Kết luận: trên `mongod` thật, có index của bước 2, explain của truy vấn bước 1 có stage `SORT` không?"
      en: "Conclusion: on a real `mongod` with the step 2 index, does the explain of the step 1 query have a `SORT` stage?"
    options:
      - { vi: "Có, vì truy vấn có `.sort()`", en: "Yes, because the query has `.sort()`" }
      - { vi: "Không, thứ tự `createdAt` lấy thẳng từ index", en: "No, the `createdAt` order comes straight from the index" }
    answer: 1
    why:
      vi: "Nghe hợp lý vì có `.sort()` thì phải sắp. Nhưng khi hai trường bằng đã cố định một khối, các khóa `createdAt` trong khối đã có thứ tự; docs chính thức nói kế hoạch không có stage `SORT` nghĩa là thứ tự lấy từ index."
      en: "It sounds right that `.sort()` means sorting. But once the two equality fields fix one block, the `createdAt` keys inside it are already in order; the docs say a plan without a `SORT` stage means the order comes from the index."
  - q:
      vi: "Kết luận: với truy vấn bước 3 trên `mongod` thật, `totalDocsExamined` trong explain bằng bao nhiêu?"
      en: "Conclusion: for the step 3 query on a real `mongod`, what is `totalDocsExamined` in the explain?"
    options:
      - { vi: "0", en: "0" }
      - { vi: "Bằng số tài liệu trả về", en: "The number of documents returned" }
      - { vi: "Bằng số tài liệu của collection", en: "The number of documents in the collection" }
    answer: 0
    why:
      vi: "Truy vấn được phủ trả kết quả chỉ từ index: `IXSCAN` không nằm dưới `FETCH`, nên không đọc tài liệu nào. Thiếu `_id: 0` thì MongoDB phải đọc tài liệu để lấy `_id`."
      en: "A covered query answers from the index alone: the `IXSCAN` is not under a `FETCH`, so no document is read. Without `_id: 0`, MongoDB must read the documents to get `_id`."
---

## Ý chính

Bài cuối cấp L3: bốn bước lab trên cùng dữ liệu đơn hàng, rồi hai câu kết luận.

- Bước 1, 3 và 4 chạy thật bằng mingo trong trình duyệt và chấm theo kết quả.
- Bước 2, 3 và 4 còn có thanh quy tắc: index theo ESR, truy vấn được phủ, `$match` trước `$lookup`. Một câu cho đúng kết quả mà sai quy tắc vẫn chưa đạt.
- mingo không có index hay explain, nên các quy tắc được chấm theo docs chính thức của MongoDB, không đo trên `mongod`. Hai câu kết luận cũng dựa trên docs.

## Thực hành

Làm bốn bước theo thứ tự. Bước 2 không chạy truy vấn nào: chỉ thứ tự khóa của index được chấm. Sau đó trả lời hai câu kết luận.

# EN

## Key idea

The final lesson of level L3: four lab steps on the same order data, then two conclusion questions.

- Steps 1, 3 and 4 really run on mingo in the browser and are graded by their result.
- Steps 2, 3 and 4 also have a rule bar: an ESR index, a covered query, `$match` before `$lookup`. An answer with the right result that breaks the rule does not pass yet.
- mingo has no indexes and no explain, so the rules are graded from the official MongoDB docs, not measured on `mongod`. The two conclusion questions also rest on the docs.

## Practice

Do the four steps in order. Step 2 runs no query: only the key order of the index is graded. Then answer the two conclusion questions.
