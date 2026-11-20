---
id: e-bp-m24
engine: best
track: mongodb
level: L4
module: m
title: "Xây index trên collection đang chạy: tính trước tác động"
title_en: "Building indexes on live collections"
kind: quiz
minutes: 3
objectives:
  - vi: "Xây index mới trên collection lớn đang phục vụ tải vào giờ thấp điểm, từng index một, theo dõi tài nguyên; cân nhắc rolling index build khi replica set chịu tải nặng."
    en: "Build a new index on a large, busy collection at off-peak hours, one index at a time, watching resources; consider a rolling index build when the replica set is under heavy load."
avoid:
  vi: "Ba index lớn xây cùng lúc giờ cao điểm, secondary tụt lại và ứng dụng chậm hẳn."
  en: "Three large indexes built at once at peak time, secondaries falling behind and the application slowing down."
requires: []
skills: [index_design]
adv: []
sources:
  - https://www.mongodb.com/docs/manual/core/index-creation/
  - https://www.mongodb.com/docs/manual/core/rolling-index-builds/
verified: { version: "MongoDB manual 9.0", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    db.orders.createIndexes([{ customerId: 1 }, { status: 1, createdAt: -1 }, { 'items.sku': 1 }])
  good: |
    db.orders.createIndex({ status: 1, createdAt: -1 }, { name: 'status_createdAt' })
  expect: null
quiz:
  - q:
      vi: "Trong lúc xây index trên collection đang có dữ liệu, MongoDB giữ lock độc quyền trên collection khi nào?"
      en: "While building an index on a collection that already holds data, when does MongoDB hold an exclusive lock on the collection?"
    options:
      - { vi: "Suốt quá trình xây", en: "For the whole build" }
      - { vi: "Chỉ một lúc ngắn ở đầu và ở cuối", en: "Only briefly at the start and at the end" }
      - { vi: "Không bao giờ", en: "Never" }
    answer: 1
    why:
      vi: "Docs: lock độc quyền chỉ giữ ngắn ở đầu và cuối; phần giữa nhường cho đọc và ghi xen vào. Dù vậy, quá trình xây vẫn tốn I/O và cache suốt thời gian chạy."
      en: "The docs: the exclusive lock is held briefly at the beginning and the end; the middle yields to interleaved reads and writes. Even so, the build costs I/O and cache for its whole duration."
---

## Ý chính

Index mới trên collection lớn đang phục vụ tải: chạy giờ thấp điểm, từng index một, theo dõi tài nguyên. Replica set chịu tải nặng thì cân nhắc rolling index build: xây lần lượt trên từng node.

## Vì sao

- Quá trình xây đọc toàn bộ collection, tốn I/O và cache, dù chỉ giữ lock độc quyền một lúc ngắn.
- Trên replica set, mặc định index được xây trên các node mang dữ liệu cùng lúc; secondary chậm thì lag tăng.
- Rolling build xây lần lượt trên từng node, có thể giảm tác động khi cụm đang chịu tải nặng.
- Gần ý `CREATE INDEX CONCURRENTLY` của Postgres. Thẻ này chỉ cú pháp: mingo không xây index thật.

# EN

## Key idea

A new index on a large, busy collection: build it at off-peak hours, one index at a time, watching resources. When the replica set is under heavy load, consider a rolling index build: building on one node after another.

## Why

- The build reads the whole collection and costs I/O and cache, even though it holds the exclusive lock only briefly.
- On a replica set the default build runs on the data-bearing nodes at the same time; a slow secondary means growing lag.
- A rolling build runs on one node after another and may reduce the impact when the cluster is under heavy load.
- Close to Postgres' `CREATE INDEX CONCURRENTLY`. This card is syntax only: mingo builds no real index.
