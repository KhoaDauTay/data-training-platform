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
  - vi: "Nhận ra bộ lọc nào là tiền tố của shard key kép"
    en: "Recognise which filters are a prefix of a compound shard key"
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
  trap: 0
  why:
    vi: "Hai trên ba trường nghe như đủ, nhưng chunk được xếp theo `a` trước, rồi mới tới `b`: tài liệu có `b: 5` có thể nằm trong khoảng `a` nào cũng được, tức ở chunk nào, shard nào cũng được. Vì vậy `mongos` chỉ định tuyến targeted khi truy vấn có shard key đầy đủ hoặc một tiền tố: `{ a }` hoặc `{ a, b }`, còn `{ b, c }` thì không. Shard chính của database là nơi giữ các collection chưa shard, còn `orders` đã shard nên chunk của nó rải trên nhiều shard; hỏi riêng shard chính sẽ thiếu kết quả; truy vấn đi tới mọi shard rồi `mongos` gộp lại."
    en: "Two of three fields sounds like enough, but chunks are ordered by `a` first, and only then by `b`: a document with `b: 5` can sit in any `a` range, so in any chunk on any shard. That is why `mongos` targets a query only when it holds the full shard key or a prefix: `{ a }` or `{ a, b }`, and `{ b, c }` is not one. The database's primary shard is where unsharded collections live, but `orders` is sharded, so its chunks are spread over many shards; asking the primary shard alone would miss results; the query goes to every shard and `mongos` merges the answers."
  recorded:
    tier: docs
    server: MongoDB
    version: "9.0"
    date: "2026-11-20"
    url: https://www.mongodb.com/docs/manual/core/sharded-cluster-query-router/
quiz:
  - q:
      vi: "Cùng shard key `{ a: 1, b: 1, c: 1 }`. Lệnh `db.orders.updateMany({ b: 5 }, { $set: { flag: true } })` đi tới đâu?"
      en: "The same shard key `{ a: 1, b: 1, c: 1 }`. Where does `db.orders.updateMany({ b: 5 }, { $set: { flag: true } })` go?"
    options:
      - { vi: "Một shard, vì lệnh ghi luôn được định tuyến", en: "One shard, because writes are always routed" }
      - { vi: "Mọi shard, vì bộ lọc không có tiền tố của shard key", en: "Every shard, because the filter holds no prefix of the shard key" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý rằng ghi thì phải biết chỗ ghi, nhưng lệnh ghi cũng chỉ được định tuyến nhờ shard key trong bộ lọc, như truy vấn đọc. `{ b: 5 }` không có `a` nên không phải tiền tố: tài liệu khớp có thể nằm ở mọi shard. `updateMany()` và `deleteMany()` khi đó được broadcast, mọi shard đều nhận lệnh và tự sửa phần của mình."
      en: "It sounds right that a write must know where to go, but a write is routed only by the shard key in its filter, just like a read. `{ b: 5 }` has no `a`, so it is not a prefix: matching documents can live on any shard. `updateMany()` and `deleteMany()` are then broadcast, and every shard gets the command and updates its own part."
---
## Mở bài

Cluster có 10 shard, và trang tìm đơn bỗng chậm như khi chỉ có một máy. Nguyên nhân thường không nằm ở máy, mà ở chỗ bộ lọc của truy vấn có chứa shard key hay không.

## Ý chính

Đây là bài đoán theo docs chính thức của MongoDB (trang "Routing with mongos"); trình duyệt không có sharded cluster. Truy vấn có shard key, hoặc tiền tố của shard key kép, được gửi tới shard (hay nhóm shard) giữ chunk phù hợp: targeted. Truy vấn không có shard key bị gửi tới mọi shard, `mongos` chờ tất cả trả lời rồi gộp: broadcast hay scatter-gather. Thêm shard không làm loại này nhanh lên tuyến tính.

Nhiều người nghĩ chỉ cần bộ lọc có vài trường của shard key. Thật ra thứ tự mới quyết định: với `{ a, b, c }`, chỉ `{ a }`, `{ a, b }` hoặc đủ ba là tiền tố. `{ b, c }` giống như không có shard key. `updateMany()` và `deleteMany()` cũng là broadcast khi bộ lọc không chọn được shard. Ngoại lệ có chủ đích: aggregation trên lượng lớn dữ liệu có thể lợi từ scatter-gather vì chạy song song trên mọi shard.

## Tóm tắt

- Targeted = bộ lọc có shard key đầy đủ hoặc một tiền tố của nó.
- Không có tiền tố thì broadcast: mọi shard làm việc, `mongos` gộp kết quả.
- Với `{ a, b, c }`: `{ a }`, `{ a, b }` là tiền tố; `{ b, c }` thì không.
- Chọn shard key theo bộ lọc của truy vấn hay chạy nhất.

# EN

## Opening

The cluster has 10 shards, yet the order search page is suddenly as slow as with one machine. The cause is usually not the machines but whether the query's filter holds the shard key.

## Key idea

This is a prediction based on the MongoDB docs (page "Routing with mongos"); the browser has no sharded cluster. A query that holds the shard key, or a prefix of a compound shard key, goes to the shard (or set of shards) holding the matching chunks: targeted. A query without the shard key goes to every shard, and `mongos` waits for all of them and merges: broadcast, or scatter-gather. Adding shards does not make this kind scale linearly.

Many people think the filter only needs a few fields of the shard key. In fact the order decides: with `{ a, b, c }`, only `{ a }`, `{ a, b }` or all three are prefixes. `{ b, c }` is as good as no shard key. `updateMany()` and `deleteMany()` are broadcast too when the filter cannot pick a shard. A deliberate exception: aggregation over a large amount of data can benefit from scatter-gather because it runs in parallel on every shard.

## Recap

- Targeted = the filter holds the full shard key or a prefix of it.
- No prefix means broadcast: every shard works and `mongos` merges the results.
- With `{ a, b, c }`: `{ a }` and `{ a, b }` are prefixes; `{ b, c }` is not.
- Choose the shard key from the filters of the most frequent queries.
