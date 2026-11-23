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
    vi: "Theo luật ESR trong docs chính thức của MongoDB: hai trường bằng `store`, `status` trước, trường sắp `createdAt` sau, trường khoảng `total` cuối. Đặt `total` trước `createdAt` thì phải sắp trong bộ nhớ."
    en: "By the ESR rule in the MongoDB docs: the equality fields `store`, `status` first, the sort field `createdAt` next, the range field `total` last. Putting `total` before `createdAt` forces an in-memory sort."
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
      vi: "Với `w: 1` hay `w: 0`, dữ liệu có thể bị rollback nếu primary bước xuống trước khi chép. `w: \"majority\"` chỉ xác nhận khi đa số đã ghi bền vào oplog, nên primary mới chắc chắn có nó."
      en: "With `w: 1` or `w: 0`, data can be rolled back if the primary steps down before replication. `w: \"majority\"` acknowledges only once a majority has durably written it to the oplog, so the new primary is sure to have it."
---

## Ý chính

Bài cuối cấp L5, gồm hai phần với hai nhãn khác nhau:

- Hai bước lab chạy thật bằng mingo trong trình duyệt (ngôn ngữ truy vấn MongoDB): báo cáo theo ngày (mẫu bucket) và theo vùng (`$lookup`).
- Câu đoán index (chỉ mục) và câu kết luận dựa trên docs chính thức của MongoDB (luật ESR, write concern); trình duyệt không có `mongod`, nên phần này không chạy thật: câu đoán index chấm theo luật ESR, không phải `mongod`.

## Thực hành

Làm hai bước lab theo thứ tự, rồi chọn index cho truy vấn bảng điều khiển và write concern cho luồng thanh toán.

# EN

## Key idea

The final lesson of level L5, in two parts with two different labels:

- Two lab steps that really run on mingo in the browser (the MongoDB query language): a daily report (bucket pattern) and a regional report (`$lookup`).
- The index prediction and the conclusion question rest on the MongoDB docs (the ESR rule, write concern); the browser has no `mongod`, so this part does not run for real: the index prediction is graded by the ESR rule, not by `mongod`.

## Practice

Do the two lab steps in order, then pick the index for the dashboard query and the write concern for the payment path.
