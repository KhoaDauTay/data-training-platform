---
id: e-bp-m26
engine: best
track: mongodb
level: L5
module: m
title: "Theo dõi replication lag và cửa sổ oplog"
title_en: "Watch replication lag and the oplog window"
kind: quiz
minutes: 3
objectives:
  - vi: "Cảnh báo khi replication lag vượt ngưỡng và khi cửa sổ oplog ngắn hơn lần bảo trì dài nhất của bạn; đặt cỡ oplog theo tải ghi thật."
    en: "Alert when replication lag passes a threshold and when the oplog window is shorter than your longest maintenance; size the oplog for the real write load."
avoid:
  vi: "Một secondary nghỉ bảo trì lâu hơn cửa sổ oplog và không đuổi kịp bằng replication nữa."
  en: "A secondary down for maintenance longer than the oplog window, unable to catch up through replication anymore."
requires: [e-mg-l5-03]
skills: []
adv: []
sources:
  - https://www.mongodb.com/docs/manual/core/replica-set-oplog/
  - https://www.mongodb.com/docs/manual/tutorial/troubleshoot-replica-sets/
verified: { version: "MongoDB manual 9.0", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    rs.status()
  good: |
    rs.printSecondaryReplicationInfo()
    rs.printReplicationInfo()
  expect: null
quiz:
  - q:
      vi: "Cửa sổ oplog là 6 giờ. Một secondary mất kết nối 8 giờ rồi quay lại. Chuyện gì xảy ra?"
      en: "The oplog window is 6 hours. A secondary loses its connection for 8 hours and then comes back. What happens?"
    options:
      - { vi: "Nó đọc oplog và đuổi kịp như thường", en: "It reads the oplog and catches up as usual" }
      - { vi: "Nó không đồng bộ lại được bằng replication, vì phần oplog cần đã bị ghi đè", en: "It cannot sync again through replication, because the oplog entries it needs have been overwritten" }
      - { vi: "Primary tự gửi lại mọi tài liệu đã đổi", en: "The primary resends every changed document by itself" }
    answer: 1
    why:
      vi: "Oplog là nhật ký ghi có cỡ cố định; cửa sổ 6 giờ nghĩa là chỉ giữ được 6 giờ thay đổi gần nhất. Secondary vắng 8 giờ cần cả 2 giờ đầu đã bị ghi đè, nên không đuổi kịp được, và primary không tự gửi lại tài liệu. Nó phải đồng bộ lại từ đầu (initial sync)."
      en: "The oplog is a fixed-size log of writes; a 6-hour window means it holds only the last 6 hours of changes. A secondary gone for 8 hours needs the first 2 hours, which are overwritten, so it cannot catch up, and the primary does not resend documents. It needs a full resync (initial sync)."
---

## Ý chính

Cảnh báo khi replication lag (độ trễ của secondary so với primary) vượt ngưỡng, và khi cửa sổ oplog (khoảng thời gian oplog còn giữ) ngắn hơn lần bảo trì dài nhất của bạn. Hệ ghi nhiều thì đặt cỡ oplog theo tải thật.

## Vì sao

- Cửa sổ oplog là khoảng giữa mục mới nhất và cũ nhất trong oplog; ghi càng nhiều thì cửa sổ càng ngắn.
- Đọc từ secondary đang trễ là đọc dữ liệu cũ.
- `rs.status()` cho trạng thái chung; `rs.printSecondaryReplicationInfo()` cho đúng độ trễ của từng secondary.
- Thẻ này chỉ cú pháp: mingo không có replica set.

# EN

## Key idea

Alert when replication lag (how far a secondary is behind the primary) passes a threshold, and when the oplog window (the time span the oplog still holds) is shorter than your longest maintenance. For write-heavy systems, size the oplog for the real load.

## Why

- The oplog window is the span between the newest and the oldest entries in the oplog; the more you write, the shorter it gets.
- Reading from a lagging secondary means reading old data.
- `rs.status()` gives the overall state; `rs.printSecondaryReplicationInfo()` gives each secondary's exact lag.
- This card is syntax only: mingo has no replica set.
