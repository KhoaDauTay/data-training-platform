---
id: e-mg-l5-01
engine: mongodb
level: L5
module: wiredtiger
title: "WiredTiger: snapshot, checkpoint, journal, cache"
title_en: "WiredTiger: snapshots, checkpoints, journal, cache"
kind: concept
minutes: 12
runtime: docs
objectives:
  - vi: "Giải thích checkpoint 60 giây và journal cùng giữ dữ liệu bền ra sao"
    en: "Explain how 60-second checkpoints and the journal keep data durable together"
  - vi: "Tính cỡ cache WiredTiger mặc định"
    en: "Compute the default WiredTiger cache size"
  - vi: "Mô tả kiểm soát đồng thời ở mức tài liệu"
    en: "Describe document-level concurrency control"
requires: []
sources:
  - https://www.mongodb.com/docs/manual/core/wiredtiger/
  - https://www.mongodb.com/docs/manual/core/journaling/
quiz:
  - q:
      vi: "Máy có 16 GB RAM, một `mongod`, cấu hình mặc định. Cache nội bộ của WiredTiger là bao nhiêu?"
      en: "A machine with 16 GB of RAM, one `mongod`, default settings. How big is the WiredTiger internal cache?"
    options:
      - { vi: "8 GB", en: "8 GB" }
      - { vi: "7,5 GB", en: "7.5 GB" }
      - { vi: "0,256 GB", en: "0.256 GB" }
    answer: 1
    trap: 0
    why:
      vi: "8 GB nghe hợp lý vì \"một nửa RAM\" dễ nhớ, nhưng công thức trừ 1 GB trước: giá trị lớn hơn giữa 50 % của (RAM trừ 1 GB) và 0,256 GB, tức 0,5 nhân 15 GB bằng 7,5 GB."
      en: "8 GB sounds right because \"half the RAM\" is easy to remember, but the formula subtracts 1 GB first: the larger of 50% of (RAM minus 1 GB) and 0.256 GB, so 0.5 times 15 GB is 7.5 GB."
  - q:
      vi: "`mongod` dừng đột ngột 40 giây sau checkpoint gần nhất. Khi khởi động lại, dữ liệu của 40 giây đó lấy từ đâu?"
      en: "`mongod` stops abruptly 40 seconds after the last checkpoint. On restart, where does the data of those 40 seconds come from?"
    options:
      - { vi: "Mất, vì chưa có checkpoint", en: "It is lost, because no checkpoint covered it" }
      - { vi: "Phát lại từ journal, từ checkpoint cuối", en: "Replayed from the journal, from the last checkpoint" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý nếu coi checkpoint là lần lưu duy nhất, nhưng journal giữ mọi thay đổi giữa hai checkpoint; khi khởi động lại, MongoDB phục hồi từ checkpoint hợp lệ cuối và phát lại journal."
      en: "It sounds right if a checkpoint were the only save, but the journal holds every change between checkpoints; on restart MongoDB recovers from the last valid checkpoint and replays the journal."
---
## Mở bài

Máy chủ mất điện giữa giờ cao điểm, và lần ghi xuống đĩa đầy đủ gần nhất là từ 40 giây trước. Khi bật lại, đơn hàng của 40 giây đó còn không? Câu trả lời nằm ở cách WiredTiger, storage engine mặc định của MongoDB, ghi dữ liệu.

## Ý chính

WiredTiger giữ dữ liệu bền bằng hai cơ chế đi cùng nhau. Checkpoint: cứ 60 giây, dữ liệu của một snapshot được ghi xuống đĩa nhất quán trên mọi file; checkpoint cũ còn hợp lệ trong lúc ghi checkpoint mới, nên sập giữa chừng vẫn phục hồi được. Journal: một write-ahead log giữ mọi thay đổi giữa hai checkpoint (nén snappy). Sập giữa hai checkpoint thì MongoDB mở checkpoint cuối rồi phát lại journal.

Đồng thời ở mức tài liệu: phần lớn thao tác dùng kiểm soát lạc quan, chỉ giữ intent lock ở mức global, database, collection. Hai client sửa hai tài liệu khác nhau không chờ nhau; khi hai thao tác xung đột trên cùng tài liệu, một bên gặp write conflict và MongoDB tự chạy lại nó. Đầu mỗi thao tác, WiredTiger cho nó một snapshot tại một thời điểm (MVCC).

Cache nội bộ mặc định là giá trị lớn hơn giữa 50 % của (RAM trừ 1 GB) và 0,256 GB. Phần RAM còn lại hệ điều hành dùng làm filesystem cache, giữ dữ liệu ở dạng nén. Nhiều người nghĩ cache càng to càng tốt. Thật ra docs chính thức khuyên không tăng quá mặc định, vì filesystem cache cũng cần RAM; và trong container, `mongod` có thể đọc RAM của cả máy, nên phải tự đặt cỡ cache.

Nén: collection dùng block compression snappy, index dùng prefix compression, collection time series mặc định zstd. Trình duyệt không có WiredTiger: bài này dùng sơ đồ và con số từ docs.

## Cú pháp

```text
mongod --wiredTigerCacheSizeGB <number>
mongod --wiredTigerCacheSizePct <percent>
storage.wiredTiger.engineConfig.cacheSizeGB: <number>
db.serverStatus().wiredTiger.cache
```

- `--wiredTigerCacheSizeGB`: đặt cỡ cache theo GB.
- `--wiredTigerCacheSizePct`: đặt cỡ cache theo phần trăm RAM.
- `storage.wiredTiger.engineConfig.cacheSizeGB`: cùng tùy chọn trong file cấu hình.
- `db.serverStatus().wiredTiger.cache`: số liệu cache đang chạy.

## Ví dụ

Cỡ cache mặc định theo RAM của máy:

```text
RAM 4 GB   -> 0.5 x (4 - 1)  = 1.5 GB
RAM 16 GB  -> 0.5 x (16 - 1) = 7.5 GB
RAM 1 GB   -> max(0.5 x 0, 0.256) = 0.256 GB
```

Dòng cuối cho thấy sàn 0,256 GB: máy rất nhỏ vẫn có cache.

Dòng thời gian của một lần sập:

```text
10:00:00  checkpoint A written
10:00:20  insert order 501   -> journal
10:00:40  crash
restart   open checkpoint A, replay journal -> order 501 is back
```

Đơn `501` chưa có trong checkpoint nào nhưng đã nằm trong journal, nên nó quay lại khi khởi động.

## Lỗi hay gặp

Chạy trong container mà không đặt cỡ cache:

```text
// WRONG: container limited to 4 GB on a 64 GB host, no cache setting
mongod --dbpath /data/db
```

```text
// FIX: size the cache from the container's own limit
mongod --dbpath /data/db --wiredTigerCacheSizeGB 1.5
```

Không đặt thì cache có thể tính theo RAM của máy chủ, vượt giới hạn container và tiến trình bị hệ điều hành giết.

Tăng cache bằng cả RAM:

```text
// WRONG: leaves nothing for the filesystem cache and connections
mongod --wiredTigerCacheSizeGB 15
```

Trên máy 16 GB, câu này giành gần hết RAM. Giữ mặc định trước, đo `db.serverStatus().wiredTiger.cache`, rồi mới chỉnh.

## Tóm tắt

- Checkpoint 60 giây + journal giữa hai checkpoint = phục hồi được sau khi sập.
- Kiểm soát lạc quan mức tài liệu: hai lần ghi khác tài liệu không chờ nhau.
- Cache mặc định = max(50 % của (RAM − 1 GB), 0,256 GB).
- Trong container, tự đặt cỡ cache; đừng nâng cache quá mặc định khi chưa đo.

# EN

## Opening

The server loses power at peak time, and the last full write to disk was 40 seconds ago. When it comes back, are the orders of those 40 seconds still there? The answer lies in how WiredTiger, MongoDB's default storage engine, writes data.

## Key idea

WiredTiger keeps data durable with two mechanisms working together. Checkpoints: every 60 seconds the data of a snapshot is written to disk consistently across all files; the old checkpoint stays valid while a new one is written, so a crash halfway can still recover. Journal: a write-ahead log holding every change between checkpoints (snappy compressed). After a crash between checkpoints, MongoDB opens the last checkpoint and replays the journal.

Document-level concurrency: most operations use optimistic concurrency control with only intent locks at the global, database and collection levels. Two clients modifying two different documents do not wait for each other; when two operations conflict on the same document, one hits a write conflict and MongoDB retries it. At the start of each operation WiredTiger gives it a point-in-time snapshot (MVCC).

The default internal cache is the larger of 50% of (RAM minus 1 GB) and 0.256 GB. The operating system uses the remaining RAM as filesystem cache, holding data in compressed form. Many people think a bigger cache is always better. In fact the docs advise against raising it above the default, because the filesystem cache needs RAM too; and inside a container, `mongod` may read the whole host's RAM, so you must set the cache size yourself.

Compression: collections use snappy block compression, indexes use prefix compression, time series collections default to zstd. The browser has no WiredTiger: this lesson uses diagrams and figures from the docs.

## Syntax

```text
mongod --wiredTigerCacheSizeGB <number>
mongod --wiredTigerCacheSizePct <percent>
storage.wiredTiger.engineConfig.cacheSizeGB: <number>
db.serverStatus().wiredTiger.cache
```

- `--wiredTigerCacheSizeGB`: sets the cache size in GB.
- `--wiredTigerCacheSizePct`: sets the cache size as a percentage of RAM.
- `storage.wiredTiger.engineConfig.cacheSizeGB`: the same option in the config file.
- `db.serverStatus().wiredTiger.cache`: live cache figures.

## Example

The default cache size by machine RAM:

```text
RAM 4 GB   -> 0.5 x (4 - 1)  = 1.5 GB
RAM 16 GB  -> 0.5 x (16 - 1) = 7.5 GB
RAM 1 GB   -> max(0.5 x 0, 0.256) = 0.256 GB
```

The last line shows the 0.256 GB floor: even a tiny machine gets a cache.

The timeline of a crash:

```text
10:00:00  checkpoint A written
10:00:20  insert order 501   -> journal
10:00:40  crash
restart   open checkpoint A, replay journal -> order 501 is back
```

Order `501` is in no checkpoint yet but is already in the journal, so it comes back on restart.

## Common mistakes

Running in a container without setting the cache size:

```text
// WRONG: container limited to 4 GB on a 64 GB host, no cache setting
mongod --dbpath /data/db
```

```text
// FIX: size the cache from the container's own limit
mongod --dbpath /data/db --wiredTigerCacheSizeGB 1.5
```

Without the setting the cache may be sized from the host's RAM, exceed the container limit, and the process gets killed by the operating system.

Raising the cache to all of the RAM:

```text
// WRONG: leaves nothing for the filesystem cache and connections
mongod --wiredTigerCacheSizeGB 15
```

On a 16 GB machine this grabs almost all the RAM. Keep the default first, measure `db.serverStatus().wiredTiger.cache`, then tune.

## Recap

- 60-second checkpoints + the journal between them = recovery after a crash.
- Optimistic document-level control: two writes on different documents do not wait for each other.
- Default cache = max(50% of (RAM − 1 GB), 0.256 GB).
- In a container, set the cache size yourself; do not raise the cache above the default before measuring.
