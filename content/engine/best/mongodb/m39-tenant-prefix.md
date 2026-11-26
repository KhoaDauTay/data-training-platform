---
id: e-bp-m39
engine: best
track: mongodb
level: L3
module: m
title: "tenantId đứng đầu mọi bộ lọc, index kép và shard key"
title_en: "tenantId leads every filter, compound index and shard key"
kind: quiz
minutes: 3
objectives:
  - vi: "Trong collection dùng chung cho nhiều người bán, đặt `tenantId` trong mọi bộ lọc đọc và ghi, ở đầu mọi index kép, và ở đầu shard key."
    en: "In a collection shared by many sellers, put `tenantId` in every read and write filter, first in every compound index, and first in the shard key."
avoid:
  vi: "Một trang người bán quên `tenantId` và trả đơn của cả chợ, hoặc một index không có `tenantId` bắt mỗi trang đi qua khóa của mọi người bán."
  en: "A seller page that forgets `tenantId` and returns the whole market's orders, or an index without `tenantId` that makes every page walk every seller's keys."
requires: [e-mg-l3-19]
skills: []
adv: []
sources:
  - url: https://www.mongodb.com/docs/atlas/build-multi-tenant-arch/
    title: "Build a Multi-Tenant Architecture"
  - url: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-compound/
    title: "Compound Indexes"
  - url: https://www.mongodb.com/docs/manual/core/zone-sharding/
    title: "Zones"
verified: { version: "mingo 7.2.6", date: "2026-11-25" }
pair:
  runtime: mingo
  check: diff
  setup: |
    {"collections": {"orders": [
      {"_id": 1, "tenantId": "S07", "status": "pending", "total": 45000},
      {"_id": 2, "tenantId": "S03", "status": "pending", "total": 100000},
      {"_id": 3, "tenantId": "S07", "status": "paid", "total": 90000},
      {"_id": 4, "tenantId": "S12", "status": "pending", "total": 80000}
    ]}}
  bad: |
    db.orders.find({ status: 'pending' })
  good: |
    db.orders.find({ tenantId: 'S07', status: 'pending' })
  expect: null
quiz:
  - q:
      vi: "Trang người bán chạy `find({ tenantId, status }).sort({ createdAt: -1 })`. Index nào hợp nhất?"
      en: "The seller page runs `find({ tenantId, status }).sort({ createdAt: -1 })`. Which index fits best?"
    options:
      - { vi: "`{ status: 1, createdAt: -1 }`", en: "`{ status: 1, createdAt: -1 }`" }
      - { vi: "`{ createdAt: -1, tenantId: 1, status: 1 }`", en: "`{ createdAt: -1, tenantId: 1, status: 1 }`" }
      - { vi: "`{ tenantId: 1, status: 1, createdAt: -1 }`", en: "`{ tenantId: 1, status: 1, createdAt: -1 }`" }
    answer: 2
    why:
      vi: "Theo luật ESR (trường so bằng trước, rồi trường sắp xếp, rồi trường so khoảng), hai phép bằng `tenantId`, `status` đứng trước `createdAt`. Thiếu `tenantId` thì index quét cả trạng thái đó của mọi người bán; `createdAt` đứng đầu thì phải đi qua mọi ngày để lọc. Thêm nữa, `tenantId` đứng đầu để mọi truy vấn của một người bán chỉ quét đoạn khóa của người đó; index này cũng phục vụ `find({ tenantId })` nhờ quy tắc tiền tố."
      en: "By the ESR rule (equality fields first, then the sort field, then range fields), the two equalities `tenantId`, `status` come before `createdAt`. Without `tenantId` the index scans that status for every seller; with `createdAt` first it walks every date to filter. Also, `tenantId` comes first so every query of one seller scans only that seller's keys; this index also serves `find({ tenantId })` by the prefix rule."
---

## Ý chính

Collection dùng chung cho nhiều người bán: mọi tài liệu có `tenantId`, mọi lệnh đọc và ghi lọc theo nó, mọi index kép mở đầu bằng nó, và khi shard thì shard key cũng mở đầu bằng nó (thêm một trường sau để chia nhỏ người bán lớn).

## Vì sao

- Trang kiến trúc nhiều tenant của Atlas: mỗi truy vấn phải lọc theo `tenantId`, và việc tách dữ liệu do ứng dụng giữ.
- Index kép phục vụ truy vấn trên tiền tố của nó, nên `tenantId` đứng đầu giữ khóa của một người bán liền nhau.
- Zone sharding cần khoảng chứa tiền tố shard key: `tenantId` đứng đầu mới ghim được một người bán lên shard chọn sẵn.
- Cặp chạy trên mingo chỉ cho thấy phần bộ lọc (câu thiếu `tenantId` trả đơn của ba người bán); thứ tự index không đo được ở đây.
- Cả chủ đề nhiều khách hàng, với mọi bài liên quan: `e-ds-l4-09`.

# EN

## Key idea

A collection shared by many sellers: every document has `tenantId`, every read and write filters on it, every compound index starts with it, and when you shard, the shard key starts with it too (plus a second field so a big seller can still split).

## Why

- Atlas's multi-tenant architecture page: every query must filter by `tenantId`, and the application keeps the data apart.
- A compound index serves queries on its prefix, so `tenantId` first keeps one seller's keys together.
- Zone sharding needs a range that holds the shard key prefix: only with `tenantId` first can one seller be pinned to chosen shards.
- The pair on mingo only shows the filter part (the query without `tenantId` returns three sellers' orders); index order cannot be measured here.
- The whole multi-tenant topic, with every related lesson: `e-ds-l4-09`.
