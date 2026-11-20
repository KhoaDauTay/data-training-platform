---
id: e-bp-m05
engine: best
track: mongodb
level: L2
module: m
title: "Tính sẵn khi đọc nhiều hơn ghi"
title_en: "Store computed values when reads dominate"
kind: quiz
minutes: 3
objectives:
  - vi: "Lưu sẵn con số được đọc liên tục mà ít đổi (tổng đơn) và cập nhật nó lúc ghi bằng `$inc`, thay vì tính lại ở mỗi lần đọc."
    en: "Store a figure that is read constantly and changes rarely (an order total) and keep it current at write time with `$inc`, instead of recomputing it on every read."
avoid:
  vi: "Mỗi lần mở trang đơn lại chạy một pipeline cộng lại mọi dòng hàng."
  en: "Running a pipeline that adds up every line each time an order page opens."
requires: [e-mg-l4-02]
skills: [aggregate]
adv: []
sources:
  - https://www.mongodb.com/docs/manual/data-modeling/design-patterns/handle-computed-values/
  - https://www.mongodb.com/docs/manual/reference/operator/update/inc/
verified: { version: "mingo 7.2.6", date: "2026-11-20" }
pair:
  runtime: mingo
  check: same
  setup: |
    {"collections": {"orders": [
      {"_id": 1, "customerId": 10, "status": "PAID", "total": 120, "items": [{"sku": "A", "qty": 1, "price": 100}, {"sku": "B", "qty": 2, "price": 10}]},
      {"_id": 2, "customerId": 11, "status": "PAID", "total": 50, "items": [{"sku": "B", "qty": 5, "price": 10}]}
    ]}}
  bad: |
    db.orders.aggregate([
      { $match: { _id: 1 } },
      { $project: { _id: 0, total: { $sum: { $map: { input: '$items', as: 'i', in: { $multiply: ['$$i.qty', '$$i.price'] } } } } } }
    ])
  good: |
    db.orders.find({ _id: 1 }, { _id: 0, total: 1 })
  expect: null
quiz:
  - q:
      vi: "Trang đơn được mở 10.000 lần mỗi ngày, mỗi đơn chỉ đổi dòng hàng vài lần. Cách nào hợp hơn để hiện tổng tiền?"
      en: "An order page is opened 10,000 times a day, and each order's lines change only a few times. Which way of showing the total fits better?"
    options:
      - { vi: "Tính lại tổng bằng pipeline ở mỗi lần mở trang", en: "Recompute the total with a pipeline on every page view" }
      - { vi: "Lưu trường `total`, cập nhật bằng `$inc` khi thêm hay bớt dòng", en: "Store a `total` field and update it with `$inc` when a line is added or removed" }
      - { vi: "Tính tổng ở trình duyệt từ toàn bộ mảng `items`", en: "Add up the whole `items` array in the browser" }
    answer: 1
    why:
      vi: "Đọc nhiều hơn ghi rất nhiều: tính một lần lúc ghi rẻ hơn tính lại ở mỗi lần đọc. `$inc` trong cùng lệnh sửa dòng hàng là atomic, vì cả hai nằm trong một tài liệu."
      en: "Reads far outnumber writes: computing once at write time is cheaper than recomputing on every read. An `$inc` in the same command that changes the lines is atomic, because both live in one document."
---

## Ý chính

Con số được đọc liên tục mà ít đổi (tổng đơn, số bình luận) thì lưu sẵn trong tài liệu và cập nhật lúc ghi, ví dụ bằng `$inc`. Không `aggregate` lại toàn bộ ở mỗi lần đọc.

## Vì sao

- Phép tính lặp lại ở mỗi lần đọc tốn CPU và thêm độ trễ cho thao tác hay gặp nhất.
- Docs gọi đây là pattern tính sẵn (computed pattern): tính lúc ghi, đọc ra ngay.
- Cái giá là mỗi lần ghi phải giữ con số khớp với dữ liệu gốc; sửa trong cùng một tài liệu thì việc đó atomic.

# EN

## Key idea

A figure that is read constantly and changes rarely (an order total, a comment count) is stored in the document and updated at write time, for example with `$inc`. Do not `aggregate` it again on every read.

## Why

- Repeating the calculation on every read costs CPU and adds latency to the most common operation.
- The docs call this the computed pattern: compute on write, read it straight out.
- The price is that every write must keep the figure in step with the source data; inside one document that change is atomic.
