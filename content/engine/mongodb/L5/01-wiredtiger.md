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
quiz:
  - q:
      vi: "Máy có 16 GB RAM, một `mongod`, cấu hình mặc định. Cache nội bộ của WiredTiger là bao nhiêu?"
      en: "A machine with 16 GB of RAM, one `mongod`, default settings. How big is the WiredTiger internal cache?"
    options:
      - { vi: "8 GB", en: "8 GB" }
      - { vi: "7,5 GB", en: "7.5 GB" }
      - { vi: "0,256 GB", en: "0.256 GB" }
    answer: 1
    why:
      vi: "Mặc định là giá trị lớn hơn giữa 50% của (RAM trừ 1 GB) và 0,256 GB: 0,5 nhân 15 GB bằng 7,5 GB."
      en: "The default is the larger of 50% of (RAM minus 1 GB) and 0.256 GB: 0.5 times 15 GB is 7.5 GB."
  - q:
      vi: "`mongod` dừng đột ngột 40 giây sau checkpoint gần nhất. Khi khởi động lại, dữ liệu của 40 giây đó lấy từ đâu?"
      en: "`mongod` stops abruptly 40 seconds after the last checkpoint. On restart, where does the data of those 40 seconds come from?"
    options:
      - { vi: "Mất, vì chưa có checkpoint", en: "It is lost, because no checkpoint covered it" }
      - { vi: "Phát lại từ journal, từ checkpoint cuối", en: "Replayed from the journal, from the last checkpoint" }
    answer: 1
    why:
      vi: "Journal giữ mọi thay đổi giữa hai checkpoint; khi khởi động lại, MongoDB phục hồi từ checkpoint hợp lệ cuối và phát lại journal."
      en: "The journal holds every change between checkpoints; on restart MongoDB recovers from the last valid checkpoint and replays the journal."
---

## Ý chính

WiredTiger là storage engine mặc định của MongoDB.

- Đồng thời ở mức tài liệu: nhiều client sửa các tài liệu khác nhau cùng lúc. Phần lớn thao tác dùng kiểm soát lạc quan, chỉ giữ intent lock ở mức global, database, collection; khi hai thao tác xung đột, một bên gặp write conflict và MongoDB tự chạy lại nó.
- MVCC: đầu mỗi thao tác, WiredTiger cho nó một snapshot tại một thời điểm.
- Checkpoint: cứ 60 giây, dữ liệu của một snapshot được ghi xuống đĩa nhất quán trên mọi file. Checkpoint cũ còn hợp lệ trong lúc ghi checkpoint mới, nên sập giữa chừng vẫn phục hồi được.
- Journal: write-ahead log giữ mọi thay đổi giữa hai checkpoint, nén snappy. Sập giữa hai checkpoint thì phát lại journal.
- Nén: collection dùng block compression snappy, index dùng prefix compression, collection time series mặc định zstd.
- Cache nội bộ mặc định: lớn hơn giữa 50% của (RAM trừ 1 GB) và 0,256 GB. Phần RAM còn lại hệ điều hành dùng làm filesystem cache (giữ dữ liệu ở dạng nén). Chạy trong container thì phải tự đặt cỡ cache.

## Ví dụ

Máy 4 GB RAM: 0,5 nhân (4 GB trừ 1 GB) bằng 1,5 GB cache. Tài liệu khuyên không tăng cache quá mặc định; nếu cần, dùng `--wiredTigerCacheSizePct`.

Đúng với tài liệu MongoDB hiện hành, kiểm ngày 2026-11-20. Bài này dùng sơ đồ: trình duyệt không có WiredTiger.

# EN

## Key idea

WiredTiger is MongoDB's default storage engine.

- Document-level concurrency: many clients modify different documents at the same time. Most operations use optimistic concurrency control with only intent locks at the global, database and collection levels; when two operations conflict, one hits a write conflict and MongoDB retries it transparently.
- MVCC: at the start of each operation WiredTiger gives it a point-in-time snapshot.
- Checkpoints: every 60 seconds the data of a snapshot is written to disk consistently across all files. The old checkpoint stays valid while a new one is written, so a crash halfway can still recover.
- Journal: a write-ahead log that holds every change between checkpoints, compressed with snappy. A crash between checkpoints is recovered by replaying the journal.
- Compression: collections use snappy block compression, indexes use prefix compression, time series collections default to zstd.
- Default internal cache: the larger of 50% of (RAM minus 1 GB) and 0.256 GB. The operating system uses the remaining RAM as filesystem cache (holding data in compressed form). Inside a container you must set the cache size yourself.

## Example

A 4 GB machine: 0.5 times (4 GB minus 1 GB) is a 1.5 GB cache. The docs advise against raising the cache above the default; if needed, use `--wiredTigerCacheSizePct`.

Matches the current MongoDB manual, checked 2026-11-20. This lesson uses a diagram: the browser has no WiredTiger.
