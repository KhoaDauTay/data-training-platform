---
id: e-mg-l5-03
engine: mongodb
level: L5
module: replication
title: "Replica set: oplog và bầu primary"
title_en: "Replica sets: the oplog and primary elections"
kind: concept
minutes: 12
runtime: docs
viz: mg-replica-election
objectives:
  - vi: "Mô tả đường đi của một lần ghi: primary, oplog, secondary"
    en: "Describe the path of a write: primary, oplog, secondary"
  - vi: "Biết khi nào có bầu cử và mất bao lâu"
    en: "Know when an election happens and how long it takes"
  - vi: "Đọc cửa sổ oplog và hậu quả khi secondary tụt quá xa"
    en: "Read the oplog window and what happens when a secondary falls too far behind"
requires: [e-mg-l5-01]
sources:
  - https://www.mongodb.com/docs/manual/core/replica-set-oplog/
  - https://www.mongodb.com/docs/manual/core/replica-set-elections/
quiz:
  - q:
      vi: "Primary mất kết nối. Với cấu hình mặc định, sau bao lâu các thành viên coi nó là không tới được?"
      en: "The primary loses connectivity. With default settings, after how long do members treat it as unreachable?"
    options:
      - { vi: "2 giây", en: "2 seconds" }
      - { vi: "10 giây", en: "10 seconds" }
      - { vi: "60 giây", en: "60 seconds" }
    answer: 1
    why:
      vi: "Heartbeat gửi mỗi 2 giây; không trả lời trong 10 giây (`electionTimeoutMillis` mặc định) thì bị coi là không tới được và có bầu cử. Thời gian trung vị tới khi có primary mới thường không quá 12 giây."
      en: "Heartbeats go every 2 seconds; no reply within 10 seconds (the default `electionTimeoutMillis`) marks it unreachable and starts an election. The median time to a new primary should not typically exceed 12 seconds."
  - q:
      vi: "Một replica set cần 9 thành viên. Có bao nhiêu thành viên được bỏ phiếu tối đa?"
      en: "A replica set needs 9 members. How many of them can vote at most?"
    options:
      - { vi: "9", en: "9" }
      - { vi: "7", en: "7" }
      - { vi: "5", en: "5" }
    answer: 1
    why:
      vi: "Replica set có tối đa 50 thành viên nhưng chỉ 7 thành viên bỏ phiếu. Hai thành viên còn lại phải có `votes: 0` và `priority: 0`."
      en: "A replica set can have up to 50 members but only 7 voting members. The other two must have `votes: 0` and `priority: 0`."
---

## Ý chính

Replica set là một primary nhận ghi và các secondary giữ bản sao.

- Primary áp thay đổi rồi ghi nó vào oplog (`local.oplog.rs`), một capped collection. Secondary chép và áp oplog không đồng bộ. Mỗi mục oplog là idempotent: áp một hay nhiều lần cho cùng kết quả.
- Oplog mặc định bằng 5 % dung lượng đĩa trống, tối thiểu 990 MB, tối đa 50 GB. Cửa sổ oplog là khoảng thời gian giữa mục cũ nhất và mới nhất; secondary mất kết nối lâu hơn cửa sổ đó thì không đồng bộ lại bằng replication được nữa.
- Các thành viên gửi heartbeat mỗi 2 giây. Primary không trả lời quá 10 giây thì có bầu cử; trong lúc bầu không ghi được. Thời gian trung vị tới khi có primary mới thường không quá 12 giây. Driver thường tự thử lại lần ghi một lần (retryable writes).
- Thành viên chỉ thành primary nếu có optime cao nhất trong các thành viên nó thấy; priority cao thì gọi bầu sớm hơn; priority 0 không bao giờ thành primary.
- Primary chỉ thấy thiểu số thành viên bỏ phiếu (chia mạng) thì tự bước xuống.

## Ví dụ

```javascript
rs.printReplicationInfo()
```

Lệnh này in cỡ oplog và khoảng thời gian nó đang giữ.

Đúng với docs chính thức của MongoDB hiện hành, kiểm ngày 2026-11-20. Phần chạy thật cần máy chủ thật (nhiều phiên / replica set / AWS). Bài này dùng sơ đồ và kết quả ghi sẵn.

# EN

## Key idea

A replica set is one primary that takes writes and secondaries that hold copies.

- The primary applies a change and records it in the oplog (`local.oplog.rs`), a capped collection. Secondaries copy and apply the oplog asynchronously. Each oplog entry is idempotent: applying it once or many times gives the same result.
- The default oplog is 5% of free disk space, at least 990 MB and at most 50 GB. The oplog window is the time between its oldest and newest entries; a secondary disconnected for longer than that window can no longer catch up through replication.
- Members send heartbeats every 2 seconds. If the primary does not answer for more than 10 seconds an election starts; no writes are possible during it. The median time to a new primary should not typically exceed 12 seconds. Drivers usually retry a write once (retryable writes).
- A member becomes primary only if it has the highest optime of the members it can see; higher priority calls elections sooner; priority 0 never becomes primary.
- A primary that sees only a minority of voting members (a network partition) steps down by itself.

## Example

```javascript
rs.printReplicationInfo()
```

This prints the oplog size and the time range it holds.

Matches the current MongoDB manual, checked 2026-11-20. The real run needs a real server (several sessions / replica set / AWS). This lesson uses diagrams and recorded results.
