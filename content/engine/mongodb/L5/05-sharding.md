---
id: e-mg-l5-05
engine: mongodb
level: L5
module: sharding-ts
title: "Sharding: shard key, chunk và balancer"
title_en: "Sharding: shard keys, chunks and the balancer"
kind: concept
minutes: 14
runtime: docs
viz: mg-sharding
objectives:
  - vi: "Đánh giá shard key theo cardinality, tần suất và tính đơn điệu"
    en: "Judge a shard key by cardinality, frequency and monotonic growth"
  - vi: "Biết khi nào balancer chuyển dữ liệu giữa các shard"
    en: "Know when the balancer moves data between shards"
  - vi: "Chọn sharding theo khoảng hay hashed"
    en: "Choose ranged or hashed sharding"
requires: [e-mg-l5-03]
sources:
  - https://www.mongodb.com/docs/manual/core/sharding-shard-key/
  - https://www.mongodb.com/docs/manual/core/sharding-choose-a-shard-key/
  - https://www.mongodb.com/docs/manual/core/sharding-balancer-administration/
quiz:
  - q:
      vi: "Shard theo `continent` (7 giá trị). Thêm shard thứ 8 có giúp gì không?"
      en: "Sharding on `continent` (7 values). Does adding an 8th shard help?"
    options:
      - { vi: "Có, balancer chia đều ra 8 shard", en: "Yes, the balancer spreads data over 8 shards" }
      - { vi: "Không, mỗi giá trị shard key chỉ nằm trong một chunk, nên tối đa 7 chunk", en: "No, each shard key value lives in one chunk, so there are at most 7 chunks" }
    answer: 1
    why:
      vi: "Cardinality giới hạn số chunk tối đa: 7 giá trị thì tối đa 7 chunk, nên shard thứ 8 không có gì để giữ. Docs chính thức khuyên dùng shard key kép (nhiều trường) để tăng cardinality."
      en: "Cardinality caps the number of chunks: 7 values means at most 7 chunks, so an 8th shard has nothing to hold. The docs suggest a compound shard key to raise cardinality."
  - q:
      vi: "Shard key là thời điểm tạo, luôn tăng. Điều gì xảy ra với lượt chèn mới?"
      en: "The shard key is the creation time, always increasing. What happens to new inserts?"
    options:
      - { vi: "Rải đều ra mọi shard", en: "They spread evenly over every shard" }
      - { vi: "Dồn vào chunk có cận trên `MaxKey`, một shard thành điểm nóng", en: "They all go to the chunk bounded by `MaxKey`, one shard becomes a hot spot" }
    answer: 1
    why:
      vi: "Giá trị luôn tăng đi vào chunk có cận trên `MaxKey`. Docs chính thức khuyên dùng hashed sharding cho khóa đơn điệu."
      en: "Ever-increasing values go to the chunk bounded by `MaxKey`. The docs recommend hashed sharding for a monotonic key."
---

## Ý chính

Sharded cluster chia một collection ra nhiều shard theo shard key. MongoDB chia miền giá trị shard key (hoặc giá trị hash của nó) thành các khoảng không chồng nhau, mỗi khoảng là một chunk. `mongos` định tuyến truy vấn theo metadata lấy từ config server.

Chọn shard key theo ba tiêu chí (không tiêu chí nào một mình đủ):

- Cardinality: số giá trị khác nhau giới hạn số chunk tối đa.
- Tần suất: vài giá trị chiếm phần lớn tài liệu thì chunk của chúng thành nút cổ chai và có thể thành chunk không chia được (jumbo).
- Đơn điệu: khóa luôn tăng (hay luôn giảm) dồn mọi lượt chèn vào chunk có `MaxKey` (hay `MinKey`). Dùng hashed sharding cho khóa như vậy.

Balancer chạy trên primary của config server. Một collection coi là cân bằng khi chênh lệch dữ liệu giữa các shard dưới ba lần range size; với mặc định 128 MB, phải chênh ít nhất 384 MB mới di chuyển. Mỗi shard chỉ tham gia một lần di chuyển một lúc. Từ 5.0 đổi được shard key bằng `reshardCollection`; `refineCollectionShardKey` thêm trường vào cuối khóa. Từ 7.0, `analyzeShardKey` đo các chỉ số này từ truy vấn mẫu.

## Ví dụ

```javascript
sh.shardCollection("shop.orders", { customerId: 1 })
sh.shardCollection("shop.events", { deviceId: "hashed" })
```

Đúng với docs chính thức của MongoDB hiện hành, kiểm ngày 2026-11-20. Phần chạy thật cần máy chủ thật (nhiều phiên / replica set / AWS). Bài này dùng sơ đồ và kết quả ghi sẵn.

# EN

## Key idea

A sharded cluster splits one collection across many shards by the shard key. MongoDB divides the span of shard key values (or of their hashes) into non-overlapping ranges, each one a chunk. `mongos` routes queries using metadata from the config servers.

Choose a shard key on three criteria (none is enough on its own):

- Cardinality: the number of distinct values caps the number of chunks.
- Frequency: if a few values hold most documents, their chunks become a bottleneck and can turn into indivisible (jumbo) chunks.
- Monotonic growth: an always increasing (or decreasing) key sends every insert to the chunk with `MaxKey` (or `MinKey`). Use hashed sharding for such a key.

The balancer runs on the primary of the config server replica set. A collection counts as balanced when the data difference between shards is under three times the range size; with the default 128 MB, the difference must reach 384 MB before a migration. Each shard takes part in only one migration at a time. From 5.0 you can change the shard key with `reshardCollection`; `refineCollectionShardKey` adds fields to the end of the key. From 7.0, `analyzeShardKey` measures these metrics from sampled queries.

## Example

```javascript
sh.shardCollection("shop.orders", { customerId: 1 })
sh.shardCollection("shop.events", { deviceId: "hashed" })
```

Matches the current MongoDB manual, checked 2026-11-20. The real run needs a real server (several sessions / replica set / AWS). This lesson uses diagrams and recorded results.
