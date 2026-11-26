---
id: e-mg-l5-10
engine: mongodb
level: L5
module: sharding-ts
title: "Capstone: báo cáo vận hành cho chuỗi cửa hàng"
title_en: "Capstone: an operations report for a store chain"
kind: capstone
minutes: 30
runtime: browser
viz: mg-pipeline
objectives:
  - vi: "Dựng báo cáo doanh thu theo ngày và theo vùng bằng pipeline chạy thật"
    en: "Build daily and regional revenue reports with a pipeline that really runs"
  - vi: "Chọn index ESR cho truy vấn bảng điều khiển và concern cho luồng ghi tiền"
    en: "Pick an ESR index for the dashboard query and the concern for the money write path"
requires: [e-mg-l3-05, e-mg-l4-03, e-mg-l4-07, e-mg-l5-05]
sources:
  - https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/
  - https://www.mongodb.com/docs/manual/reference/write-concern/
  - https://www.mongodb.com/docs/manual/data-modeling/design-patterns/group-data/bucket-pattern/
lab:
  setup: |
    {"collections": {
      "orders": [
        {"_id": 1, "store": "S1", "status": "paid", "total": 120, "createdAt": "2026-10-01T09:15:00Z"},
        {"_id": 2, "store": "S1", "status": "paid", "total": 80, "createdAt": "2026-10-01T17:40:00Z"},
        {"_id": 3, "store": "S2", "status": "paid", "total": 200, "createdAt": "2026-10-01T11:05:00Z"},
        {"_id": 4, "store": "S2", "status": "cancelled", "total": 55, "createdAt": "2026-10-02T08:00:00Z"},
        {"_id": 5, "store": "S1", "status": "paid", "total": 60, "createdAt": "2026-10-02T10:30:00Z"},
        {"_id": 6, "store": "S3", "status": "paid", "total": 150, "createdAt": "2026-10-02T12:00:00Z"},
        {"_id": 7, "store": "S3", "status": "pending", "total": 90, "createdAt": "2026-10-02T19:45:00Z"},
        {"_id": 8, "store": "S2", "status": "paid", "total": 40, "createdAt": "2026-10-02T21:10:00Z"}
      ],
      "stores": [
        {"_id": "S1", "city": "Da Nang", "region": "Central"},
        {"_id": "S2", "city": "Hue", "region": "Central"},
        {"_id": "S3", "city": "Can Tho", "region": "South"}
      ]
    }}
  steps:
    - task:
        vi: "Bước 1: tạo bucket theo ngày cho đơn `paid`: `_id` là `{ store, day }` (ngày UTC của `createdAt`, đổi chuỗi sang ngày), `orders` số đơn, `revenue` tổng `total`. Xếp theo `day` rồi `store` tăng dần."
        en: "Step 1: build daily buckets for `paid` orders: `_id` is `{ store, day }` (the UTC day of `createdAt`, converting the string to a date), `orders` the number of orders, `revenue` the sum of `total`. Order by `day` then `store` ascending."
      solution: |
        db.orders.aggregate([
          { $match: { status: "paid" } },
          { $group: {
              _id: { store: "$store", day: { $dateTrunc: { date: { $toDate: "$createdAt" }, unit: "day" } } },
              orders: { $sum: 1 },
              revenue: { $sum: "$total" }
          } },
          { $sort: { "_id.day": 1, "_id.store": 1 } }
        ])
      check: doc
      ordered: true
      hint:
        vi: "`$match` trước, rồi `$group` với `$dateTrunc` (`unit: \"day\"`) trên `$toDate` của `createdAt`."
        en: "`$match` first, then `$group` with `$dateTrunc` (`unit: \"day\"`) on the `$toDate` of `createdAt`."
    - task:
        vi: "Bước 2: doanh thu đơn `paid` theo vùng: nối `stores` để lấy `region`. Trả `_id` là vùng, `revenue`, `stores` là mảng mã cửa hàng có doanh thu trong vùng, tăng dần. Xếp `revenue` giảm dần, hòa thì `_id` tăng dần."
        en: "Step 2: revenue of `paid` orders by region: join `stores` to get the `region`. Return `_id` as the region, `revenue`, `stores` the ascending array of store codes with revenue in that region. Order by `revenue` descending, ties by `_id` ascending."
      solution: |
        db.orders.aggregate([
          { $match: { status: "paid" } },
          { $group: { _id: "$store", revenue: { $sum: "$total" } } },
          { $lookup: { from: "stores", localField: "_id", foreignField: "_id", as: "s" } },
          { $unwind: "$s" },
          { $sort: { _id: 1 } },
          { $group: { _id: "$s.region", revenue: { $sum: "$revenue" }, stores: { $push: "$_id" } } },
          { $sort: { revenue: -1, _id: 1 } }
        ])
      check: doc
      ordered: true
      hint:
        vi: "Gộp theo cửa hàng trước, rồi `$lookup` sang `stores`, `$unwind`, sắp theo mã cửa hàng và `$group` theo `$s.region` với `$push`."
        en: "Group by store first, then `$lookup` into `stores`, `$unwind`, sort by store code and `$group` by `$s.region` with `$push`."
    - name: { vi: "Lọc trước khi nối", en: "Filter before the join" }
      task:
        vi: "Bước 3: số đơn và doanh thu đơn `paid` theo thành phố của cửa hàng: nối `stores` để lấy `city`. Trả `_id` là thành phố, `orders`, `revenue`; xếp `revenue` giảm dần, hòa thì `_id` tăng dần. Bài chấm cả thứ tự stage: đúng kết quả mà nối mọi đơn trước khi lọc là chưa đạt."
        en: "Step 3: the number and revenue of `paid` orders by the store's city: join `stores` to get the `city`. Return `_id` as the city, `orders`, `revenue`; order by `revenue` descending, ties by `_id` ascending. The stage order is graded too: a right result that joins every order before filtering does not pass."
      solution: |
        db.orders.aggregate([
          { $match: { status: "paid" } },
          { $lookup: { from: "stores", localField: "store", foreignField: "_id", as: "s" } },
          { $unwind: "$s" },
          { $group: { _id: "$s.city", orders: { $sum: 1 }, revenue: { $sum: "$total" } } },
          { $sort: { revenue: -1, _id: 1 } }
        ])
      check: doc
      ordered: true
      rule: match-first
      slow: 'db.orders.aggregate([{ $lookup: { from: "stores", localField: "store", foreignField: "_id", as: "s" } }, { $unwind: "$s" }, { $match: { status: "paid" } }, { $group: { _id: "$s.city", orders: { $sum: 1 }, revenue: { $sum: "$total" } } }, { $sort: { revenue: -1, _id: 1 } }])'
      sql: "SELECT st.city AS _id, COUNT(*) AS orders, SUM(o.total) AS revenue FROM orders o JOIN stores st ON st.id = o.store WHERE o.status = 'paid' GROUP BY st.city ORDER BY revenue DESC, st.city;"
      hint:
        vi: "`$match` trên `status` đứng đầu, rồi `$lookup`, `$unwind`, `$group` theo `$s.city`."
        en: "Put the `$match` on `status` first, then `$lookup`, `$unwind`, `$group` by `$s.city`."
      fact:
        vi: "Bước này chấm theo quy tắc trong docs chính thức (đặt `$match` trước stage nặng), không đo trên `mongod`: mingo không có index hay explain. Trong lab, lọc trước thì `$lookup` chỉ nối 6 đơn `paid` thay vì cả 8 đơn."
        en: "This step is graded by the rule in the official docs (put `$match` before the heavy stages), not measured on `mongod`: mingo has no index or explain. In the lab, filtering first means `$lookup` joins only the 6 `paid` orders instead of all 8."
predict:
  sql: |
    db.orders.find(
      { store: "S1", status: "paid", total: { $gte: 100 } }
    ).sort({ createdAt: -1 })
  q:
    vi: "Bảng điều khiển chạy truy vấn này liên tục trên `mongod` thật. Index nào theo ESR, tránh được stage `SORT`?"
    en: "The dashboard runs this query all the time on a real `mongod`. Which index follows ESR and avoids a `SORT` stage?"
  options:
    - vi: "`{ store: 1, status: 1, total: 1, createdAt: -1 }`"
      en: "`{ store: 1, status: 1, total: 1, createdAt: -1 }`"
    - vi: "`{ store: 1, status: 1, createdAt: -1, total: 1 }`"
      en: "`{ store: 1, status: 1, createdAt: -1, total: 1 }`"
    - vi: "`{ createdAt: -1, store: 1, status: 1 }`"
      en: "`{ createdAt: -1, store: 1, status: 1 }`"
  answer: 1
  why:
    vi: "Theo luật ESR (Equality, Sort, Range: trường so bằng, rồi trường sắp xếp, rồi trường so khoảng) trong docs chính thức: `store`, `status` trước, `createdAt` sau, `total` cuối. Đặt `total` trước `createdAt` thì index trả các đơn theo `total`, không theo `createdAt`, nên `mongod` phải sắp lại trong bộ nhớ (stage `SORT`). Đưa `createdAt` lên đầu thì thứ tự đúng, nhưng `store` và `status` không còn là tiền tố liền nhau, nên index phải quét đơn của mọi cửa hàng."
    en: "By the ESR rule (Equality, Sort, Range: equality fields, then the sort field, then range fields) in the official docs: `store`, `status` first, `createdAt` next, `total` last. Putting `total` before `createdAt` makes the index return orders by `total`, not by `createdAt`, so `mongod` must sort again in memory (a `SORT` stage). Putting `createdAt` first gives the right order, but `store` and `status` are no longer a leading prefix, so the index must scan the orders of every store."
  recorded:
    tier: docs
    server: MongoDB
    version: "9.0"
    date: "2026-11-20"
    url: https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/
quiz:
  - q:
      vi: "Kết luận: lần ghi thanh toán của cửa hàng chạy trên replica set P-S-S. Nó cần sống sót khi primary đổi. Write concern nào?"
      en: "Conclusion: the store's payment write runs on a P-S-S replica set. It must survive a primary change. Which write concern?"
    options:
      - { vi: "`{ w: 1 }`", en: "`{ w: 1 }`" }
      - { vi: "`{ w: 0 }`", en: "`{ w: 0 }`" }
      - { vi: "`{ w: \"majority\" }`", en: "`{ w: \"majority\" }`" }
    answer: 2
    why:
      vi: "`w: 1` chỉ chờ primary xác nhận: nếu primary sập trước khi chép sang secondary, lần ghi bị rollback khi primary cũ quay lại. `w: 0` còn yếu hơn: server không gửi xác nhận nào, nên ứng dụng không biết lần ghi có thành công hay không. `w: \"majority\"` chỉ xác nhận khi 2 trong 3 node đã ghi bền vào oplog, nên primary mới nào cũng chắc chắn có nó."
      en: "`w: 1` waits only for the primary: if the primary fails before copying to a secondary, the write is rolled back when the old primary returns. `w: 0` is weaker still: the server sends no acknowledgement, so the application does not know whether the write succeeded at all. `w: \"majority\"` acknowledges only once 2 of the 3 nodes have durably written it to the oplog, so any new primary is sure to have it."
---

## Mở bài

Chuỗi ba cửa hàng cần một báo cáo vận hành trước buổi họp sáng mai: doanh thu theo ngày, theo vùng, theo thành phố, cùng index cho bảng điều khiển và cách ghi tiền an toàn. Bài cuối L5 gom lại những gì bạn đã học.

## Ý chính

Bài gồm hai phần với hai nhãn khác nhau. Ba bước lab chạy thật bằng mingo trong trình duyệt: báo cáo theo ngày (mẫu bucket), theo vùng (`$lookup`) và theo thành phố, có thanh quy tắc: `$match` phải đứng trước `$lookup`, `$unwind`, `$group`. Câu đoán index (chỉ mục) và câu kết luận dựa trên docs chính thức của MongoDB (luật ESR, write concern); trình duyệt không có `mongod`, nên phần này chấm theo luật, không đo trên `mongod`.

## Thực hành

Làm ba bước lab theo thứ tự, rồi chọn index cho truy vấn bảng điều khiển và write concern cho luồng thanh toán. Ở bước 3, xem phần "Pipeline từng bước" dưới kết quả để so số tài liệu sau mỗi stage khi `$match` đứng đầu và khi nó đứng sau `$lookup`.

## Tóm tắt

- `$dateTrunc` trên `$toDate` gom đơn thành bucket theo ngày.
- Gộp theo cửa hàng trước rồi mới `$lookup`: ít tài liệu phải nối hơn.
- `$match` đứng đầu pipeline: mọi stage nặng sau nó đọc ít hơn, và trên `mongod` nó dùng được index.
- Index theo ESR cho bảng điều khiển; `w: "majority"` cho tiền.

# EN

## Opening

A chain of three stores needs an operations report before tomorrow morning's meeting: revenue by day, by region and by city, plus an index for the dashboard and a safe way to write money. The final L5 lesson brings together what you have learned.

## Key idea

The lesson has two parts with two different labels. Three lab steps really run on mingo in the browser: a daily report (bucket pattern), a regional report (`$lookup`) and a city report with a rule bar: `$match` must come before `$lookup`, `$unwind` and `$group`. The index prediction and the conclusion question rest on the MongoDB docs (the ESR rule, write concern); the browser has no `mongod`, so this part is graded by rule, not measured on `mongod`.

## Practice

Do the three lab steps in order, then pick the index for the dashboard query and the write concern for the payment path. In step 3, look at the "Pipeline step by step" part under the result to compare the documents after each stage with `$match` first and with it after `$lookup`.

## Recap

- `$dateTrunc` on `$toDate` groups orders into daily buckets.
- Group by store first, then `$lookup`: fewer documents to join.
- `$match` first in the pipeline: every heavy stage after it reads less, and on `mongod` it can use an index.
- An ESR index for the dashboard; `w: "majority"` for money.
