---
id: e-mg-l4-14
engine: mongodb
level: L4
module: consistency
title: "Capstone: tính tiền và thanh toán đơn hàng"
title_en: "Capstone: pricing and paying for orders"
kind: capstone
minutes: 25
runtime: browser
viz: mg-pipeline
objectives:
  - vi: "Tính sẵn tổng đơn bằng pipeline, gộp theo cửa hàng, và cấp số thanh toán bằng một bộ đếm"
    en: "Precompute order totals with a pipeline, sum them per store, and hand out payment numbers from a counter"
  - vi: "Chọn transaction, write concern và session cho luồng thanh toán, theo docs chính thức"
    en: "Choose the transaction, write concern and session for the payment flow, following the official docs"
requires: [e-mg-l4-02, e-mg-l4-09, e-mg-l4-11, e-mg-l4-13]
sources:
  - https://www.mongodb.com/docs/manual/data-modeling/design-patterns/handle-computed-values/
  - https://www.mongodb.com/docs/manual/reference/method/db.collection.findOneAndUpdate/
  - https://www.mongodb.com/docs/manual/core/transactions/
  - https://www.mongodb.com/docs/manual/reference/write-concern/
  - https://www.mongodb.com/docs/manual/core/causal-consistency-read-write-concerns/
lab:
  setup: |
    {"collections": {
      "orders": [
        {"_id": 201, "store": "S1", "lines": [{"sku": "A", "qty": 2, "price": 30000}, {"sku": "B", "qty": 1, "price": 45000}]},
        {"_id": 202, "store": "S2", "lines": [{"sku": "C", "qty": 4, "price": 12000}]},
        {"_id": 203, "store": "S1", "lines": []},
        {"_id": 204, "store": "S1", "lines": [{"sku": "A", "qty": 1, "price": 30000}]}
      ],
      "counters": [
        {"_id": "payment", "seq": 7781}
      ]
    }}
  steps:
    - name: { vi: "Tổng mỗi đơn", en: "Each order's total" }
      task:
        vi: "Trả mỗi đơn với `_id`, `store` và `total` = tổng `qty` nhân `price` của mọi dòng trong `lines` (đơn không có dòng nào có `total` bằng 0). Xếp theo `_id` tăng dần."
        en: "Return each order with `_id`, `store` and `total` = the sum of `qty` times `price` over every entry in `lines` (an order with no lines has a `total` of 0). Order by `_id` ascending."
      solution: 'db.orders.aggregate([{ $project: { store: 1, total: { $sum: { $map: { input: "$lines", as: "l", in: { $multiply: ["$$l.qty", "$$l.price"] } } } } } }, { $sort: { _id: 1 } }])'
      check: doc
      ordered: true
      hint:
        vi: "Như bài Computed Values: `$map` nhân từng dòng, `$sum` cộng mảng kết quả; mảng rỗng cho 0."
        en: "As in the Computed Values lesson: `$map` multiplies each line, `$sum` adds the resulting array; an empty array gives 0."
    - name: { vi: "Tổng theo cửa hàng", en: "Totals per store" }
      task:
        vi: "Dùng lại phép tính ở bước 1 để trả mỗi cửa hàng: `_id` là mã cửa hàng, `orders` là số đơn, `revenue` là tổng `total` của các đơn. Xếp theo `_id` tăng dần."
        en: "Reuse the step 1 computation to return each store: `_id` is the store code, `orders` the number of orders, `revenue` the sum of the orders' `total`. Order by `_id` ascending."
      solution: 'db.orders.aggregate([{ $project: { store: 1, total: { $sum: { $map: { input: "$lines", as: "l", in: { $multiply: ["$$l.qty", "$$l.price"] } } } } } }, { $group: { _id: "$store", orders: { $sum: 1 }, revenue: { $sum: "$total" } } }, { $sort: { _id: 1 } }])'
      check: doc
      ordered: true
      sql: "SELECT o.store AS _id, COUNT(*) AS orders, SUM(COALESCE(l.total, 0)) AS revenue FROM orders o LEFT JOIN (SELECT order_id, SUM(qty * price) AS total FROM order_lines GROUP BY order_id) l ON l.order_id = o.id GROUP BY o.store ORDER BY o.store;"
      hint:
        vi: "Giữ `$project` của bước 1, thêm `$group` theo `$store` với `$sum: 1` và `$sum: \"$total\"`."
        en: "Keep the step 1 `$project`, then add a `$group` by `$store` with `$sum: 1` and `$sum: \"$total\"`."
    - name: { vi: "Số thanh toán", en: "Payment number" }
      task:
        vi: "Mỗi lần thanh toán cần một số mới. Trong một lệnh, tăng `seq` của bộ đếm `_id` là `payment` thêm 1 và trả tài liệu sau khi tăng."
        en: "Every payment needs a new number. In one command, add 1 to the `seq` of the counter whose `_id` is `payment` and return the document after the increase."
      solution: 'db.counters.findOneAndUpdate({ _id: "payment" }, { $inc: { seq: 1 } }, { returnDocument: "after" })'
      check: doc
      hint:
        vi: "`findOneAndUpdate` với `$inc` và `returnDocument: \"after\"`, như bài bộ đếm."
        en: "`findOneAndUpdate` with `$inc` and `returnDocument: \"after\"`, as in the counters lesson."
quiz:
  - q:
      vi: "Kết luận: thanh toán phải trừ tồn kho trong collection `stock` và đánh dấu đơn `paid` trong `orders`, cả hai hoặc không gì cả. Cần gì?"
      en: "Conclusion: a payment must take stock off in the `stock` collection and mark the order `paid` in `orders`, both or neither. What is needed?"
    options:
      - { vi: "Hai lệnh `updateOne` liên tiếp là đủ, vì mỗi lệnh đã atomic", en: "Two `updateOne` commands in a row are enough, since each one is atomic" }
      - { vi: "Một transaction nhiều tài liệu", en: "A multi-document transaction" }
    answer: 1
    why:
      vi: "Nghe hợp lý vì mỗi `updateOne` đều atomic. Nhưng atomic chỉ trong một tài liệu: nếu lỗi xảy ra giữa hai lệnh, tồn kho đã trừ mà đơn chưa `paid`. Hai tài liệu ở hai collection cần transaction nhiều tài liệu; giữ nó ngắn, vì docs nói transaction tốn hơn ghi một tài liệu."
      en: "It sounds right because each `updateOne` is atomic. But atomic only within one document: if a failure hits between the two commands, the stock is taken off while the order is not `paid`. Two documents in two collections need a multi-document transaction; keep it short, since the docs say a transaction costs more than a single-document write."
  - q:
      vi: "Kết luận: lần ghi thanh toán phải sống sót khi primary của replica set P-S-S đổi. Write concern nào?"
      en: "Conclusion: the payment write must survive a primary change on a P-S-S replica set. Which write concern?"
    options:
      - { vi: "`{ w: 1 }`", en: "`{ w: 1 }`" }
      - { vi: "`{ w: \"majority\" }`", en: "`{ w: \"majority\" }`" }
    answer: 1
    why:
      vi: "`w: 1` chỉ chờ primary, nên lần ghi có thể bị rollback nếu primary bước xuống trước khi chép. `w: \"majority\"` chỉ xác nhận khi đa số thành viên đã ghi, nên primary mới chắc chắn có nó."
      en: "`w: 1` waits for the primary only, so the write can be rolled back if the primary steps down before replication. `w: \"majority\"` acknowledges only once a majority of members have written it, so the new primary is sure to have it."
  - q:
      vi: "Kết luận: ngay sau khi thanh toán, trang biên nhận đọc lại đơn từ một secondary và phải thấy chính lần ghi đó. Dùng gì?"
      en: "Conclusion: right after paying, the receipt page reads the order back from a secondary and must see that very write. What do you use?"
    options:
      - { vi: "Đọc với read concern `local` là đủ", en: "Reading with read concern `local` is enough" }
      - { vi: "Session nhất quán nhân quả, ghi và đọc với `majority`", en: "A causally consistent session, writing and reading with `majority`" }
    answer: 1
    why:
      vi: "Nghe hợp lý vì đọc `local` nhanh và thường thấy dữ liệu mới. Nhưng secondary có thể chậm hơn primary. Docs chính thức nói session nhất quán nhân quả với read concern và write concern `majority` bảo đảm đọc được chính lần ghi của mình."
      en: "It sounds right because a `local` read is fast and often sees new data. But a secondary can lag behind the primary. The docs say a causally consistent session with `majority` read and write concerns guarantees you read your own write."
---

## Ý chính

Bài cuối cấp L4, gồm hai phần với hai nhãn khác nhau:

- Ba bước lab chạy thật bằng mingo trong trình duyệt: tính sẵn tổng đơn (mẫu Computed Values), gộp theo cửa hàng, và cấp số thanh toán bằng bộ đếm.
- Ba câu kết luận về transaction, write concern và session dựa trên docs chính thức của MongoDB. mingo không có replica set hay transaction, nên phần này không chạy thật.

## Thực hành

Làm ba bước lab theo thứ tự, rồi trả lời ba câu kết luận cho luồng thanh toán.

# EN

## Key idea

The final lesson of level L4, in two parts with two different labels:

- Three lab steps that really run on mingo in the browser: precompute order totals (the Computed Values pattern), sum them per store, and hand out payment numbers from a counter.
- Three conclusion questions about transactions, write concern and sessions, resting on the official MongoDB docs. mingo has no replica set and no transactions, so this part does not run for real.

## Practice

Do the three lab steps in order, then answer the three conclusion questions for the payment flow.
