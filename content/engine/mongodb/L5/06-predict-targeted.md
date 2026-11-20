---
id: e-mg-l5-06
engine: mongodb
level: L5
module: sharding-ts
title: "Đoán định tuyến: truy vấn tới một shard hay mọi shard?"
title_en: "Predict the routing: one shard or every shard?"
kind: predict
minutes: 6
runtime: docs
objectives:
  - vi: "Phân biệt truy vấn targeted với truy vấn broadcast (scatter-gather)"
    en: "Tell targeted queries from broadcast (scatter-gather) queries"
requires: [e-mg-l5-05]
sources:
  - https://www.mongodb.com/docs/manual/core/sharded-cluster-query-router/
  - https://www.mongodb.com/docs/manual/core/sharding-choose-a-shard-key/
predict:
  sql: |
    sh.shardCollection("shop.orders", { a: 1, b: 1, c: 1 })
    db.orders.find({ b: 5, c: 9 })
  q:
    vi: "Shard key là `{ a: 1, b: 1, c: 1 }`. `mongos` gửi truy vấn lọc theo `b` và `c` (không có `a`) tới đâu?"
    en: "The shard key is `{ a: 1, b: 1, c: 1 }`. Where does `mongos` send a query that filters on `b` and `c` (no `a`)?"
  options:
    - vi: "Tới một shard, vì truy vấn có hai trường của shard key"
      en: "To one shard, because the query holds two fields of the shard key"
    - vi: "Tới mọi shard (broadcast), vì truy vấn không chứa tiền tố của shard key"
      en: "To every shard (broadcast), because the query holds no prefix of the shard key"
    - vi: "Tới shard chính của database"
      en: "To the database's primary shard"
  answer: 1
  why:
    vi: "`mongos` định tuyến targeted khi truy vấn có shard key đầy đủ hoặc một tiền tố: `{ a }` hoặc `{ a, b }`. `{ b, c }` không phải tiền tố, nên truy vấn đi tới mọi shard rồi gộp lại."
    en: "`mongos` targets a query when it holds the full shard key or a prefix: `{ a }` or `{ a, b }`. `{ b, c }` is not a prefix, so the query goes to every shard and the results are merged."
---

## Ý chính

Đây là bài đoán theo docs chính thức của MongoDB (trang "Routing with mongos"); trình duyệt không có sharded cluster.

- Truy vấn có shard key, hoặc tiền tố của shard key kép, được gửi tới shard (hay nhóm shard) giữ chunk phù hợp: targeted.
- Truy vấn không có shard key bị gửi tới mọi shard, `mongos` chờ tất cả trả lời rồi gộp: broadcast hay scatter-gather. Thêm shard không làm loại này nhanh lên tuyến tính.
- `updateMany()` và `deleteMany()` là broadcast, trừ khi bộ lọc có đủ shard key.
- Ngoại lệ có chủ đích: aggregation trên lượng lớn dữ liệu có thể lợi từ scatter-gather vì chạy song song trên mọi shard.

## Ví dụ

Với shard key `{ a: 1, b: 1, c: 1 }`, các bộ lọc này được targeted:

```javascript
db.orders.find({ a: 1 })
db.orders.find({ a: 1, b: 2 })
```

Đúng với docs chính thức của MongoDB hiện hành, kiểm ngày 2026-11-20. Phần chạy thật cần máy chủ thật (nhiều phiên / replica set / AWS). Bài này dùng sơ đồ và kết quả ghi sẵn.

# EN

## Key idea

This is a prediction based on the MongoDB docs (page "Routing with mongos"); the browser has no sharded cluster.

- A query that holds the shard key, or a prefix of a compound shard key, goes to the shard (or set of shards) holding the matching chunks: targeted.
- A query without the shard key goes to every shard, and `mongos` waits for all of them and merges: broadcast, or scatter-gather. Adding shards does not make this kind scale linearly.
- `updateMany()` and `deleteMany()` are broadcast unless the filter holds the full shard key.
- A deliberate exception: aggregation over a large amount of data can benefit from scatter-gather because it runs in parallel on every shard.

## Example

With shard key `{ a: 1, b: 1, c: 1 }`, these filters are targeted:

```javascript
db.orders.find({ a: 1 })
db.orders.find({ a: 1, b: 2 })
```

Matches the current MongoDB manual, checked 2026-11-20. The real run needs a real server (several sessions / replica set / AWS). This lesson uses diagrams and recorded results.
