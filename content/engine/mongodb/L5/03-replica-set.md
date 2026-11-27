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
  - { url: https://www.mongodb.com/docs/manual/core/replica-set-oplog/, title_vi: "Oplog của replica set" }
  - { url: https://www.mongodb.com/docs/manual/core/replica-set-elections/, title_vi: "Bầu primary trong replica set" }
  - { url: https://www.mongodb.com/docs/manual/reference/method/rs.initiate/, title_vi: "rs.initiate()" }
quiz:
  - q:
      vi: "Primary mất kết nối. Với cấu hình mặc định, sau bao lâu các thành viên coi nó là không tới được?"
      en: "The primary loses connectivity. With default settings, after how long do members treat it as unreachable?"
    options:
      - { vi: "2 giây", en: "2 seconds" }
      - { vi: "10 giây", en: "10 seconds" }
      - { vi: "60 giây", en: "60 seconds" }
    answer: 1
    trap: 0
    why:
      vi: "2 giây nghe hợp lý vì đó là nhịp heartbeat, nhưng một heartbeat lỡ chưa đủ. Không trả lời trong 10 giây (`electionTimeoutMillis` mặc định) thì mới bị coi là không tới được và có bầu cử. Thời gian trung vị tới khi có primary mới thường không quá 12 giây. 60 giây là nhịp checkpoint của WiredTiger, không liên quan tới bầu cử; chờ lâu vậy thì cả phút không ghi được."
      en: "2 seconds sounds right because that is the heartbeat interval, but one missed heartbeat is not enough. Only no reply within 10 seconds (the default `electionTimeoutMillis`) marks it unreachable and starts an election. The median time to a new primary should not typically exceed 12 seconds. 60 seconds is WiredTiger's checkpoint interval, unrelated to elections; waiting that long would block writes for a whole minute."
  - q:
      vi: "Một replica set cần 9 thành viên. Có bao nhiêu thành viên được bỏ phiếu tối đa?"
      en: "A replica set needs 9 members. How many of them can vote at most?"
    options:
      - { vi: "9", en: "9" }
      - { vi: "7", en: "7" }
      - { vi: "5", en: "5" }
    answer: 1
    trap: 0
    why:
      vi: "Ai cũng bỏ phiếu nghe công bằng, nhưng replica set có tối đa 50 thành viên và chỉ tối đa 7 thành viên bỏ phiếu, nên cấu hình 9 phiếu bị từ chối. 5 thì chạy được nhưng không phải tối đa: 7 vẫn là số lẻ, và đa số 4 trên 7 chịu được 3 máy hỏng thay vì 2. Với 9 thành viên: 7 bỏ phiếu, 2 thành viên còn lại phải có `votes: 0` và `priority: 0`."
      en: "Everyone voting sounds fair, but a replica set can have up to 50 members and at most 7 voting members, so a 9-voter config is refused. 5 works but is not the maximum: 7 is still odd, and a majority of 4 out of 7 survives 3 failed machines instead of 2. With 9 members: 7 vote, and the other 2 must have `votes: 0` and `priority: 0`."
---
## Mở bài

Máy chủ MongoDB duy nhất của cửa hàng hỏng ổ đĩa lúc nửa đêm, và cả website ngừng bán. Replica set giữ nhiều bản sao để một máy hỏng không làm dừng cả hệ thống, nhưng bản sao được chép thế nào và ai lên thay?

## Ý chính

Replica set là một primary nhận ghi và các secondary giữ bản sao. Primary áp thay đổi rồi ghi nó vào oplog (`local.oplog.rs`), một capped collection. Secondary chép và áp oplog không đồng bộ, theo đúng thứ tự của primary. Mỗi mục oplog là idempotent: áp một hay nhiều lần cho cùng kết quả.

Oplog mặc định bằng 5 % dung lượng đĩa trống, tối thiểu 990 MB, tối đa 50 GB. Cửa sổ oplog là khoảng thời gian giữa mục cũ nhất và mới nhất. Nhiều người nghĩ oplog giữ mọi thao tác mãi mãi. Thật ra nó là capped: secondary mất kết nối lâu hơn cửa sổ thì không đồng bộ lại bằng replication được, phải đồng bộ lại từ đầu (initial sync).

Các thành viên gửi heartbeat mỗi 2 giây. Primary không trả lời quá 10 giây thì có bầu cử; trong lúc bầu không ghi được, và thời gian trung vị tới khi có primary mới thường không quá 12 giây. Driver thường tự thử lại lần ghi một lần (retryable writes). Thành viên chỉ thành primary nếu có optime cao nhất trong các thành viên nó thấy; priority cao gọi bầu sớm hơn; priority 0 không bao giờ thành primary. Primary chỉ thấy thiểu số thành viên bỏ phiếu (chia mạng) thì tự bước xuống.

Trình duyệt không có replica set: bài này dùng sơ đồ và lệnh từ docs.

## Cú pháp

```text
rs.initiate({ _id: "<set>", members: [ { _id: 0, host: "<host:port>", [priority: <n>,] [votes: 0|1] }, ... ] })
rs.status()
rs.printReplicationInfo()
rs.printSecondaryReplicationInfo()
rs.stepDown(<seconds>)
```

- `members`: tối đa 50, trong đó tối đa 7 có `votes: 1`.
- `priority: 0`: không bao giờ thành primary (hợp cho máy sao lưu, máy ở xa).
- `rs.printReplicationInfo()`: cỡ oplog và khoảng thời gian nó giữ.
- `rs.stepDown()`: bắt primary bước xuống để bảo trì.

## Ví dụ

Ba thành viên, một máy ở xa không bao giờ thành primary:

```text
rs.initiate({ _id: "shop", members: [
  { _id: 0, host: "db1:27017" },
  { _id: 1, host: "db2:27017" },
  { _id: 2, host: "db3:27017", priority: 0 }
] })
```

Dòng thời gian của một lần failover với cấu hình mặc định:

```text
t = 0 s    primary db1 stops answering
t = 2 s    heartbeat missed
t = 10 s   electionTimeoutMillis reached, db2 calls an election
t ~ 12 s   db2 is primary (median, not a promise); retryable writes go to db2
```

`db3` có `priority: 0` nên không bao giờ tranh; nó vẫn bỏ phiếu và vẫn giữ bản sao.

## Lỗi hay gặp

Cho tất cả thành viên bỏ phiếu:

```text
// WRONG: 9 voting members are refused
rs.initiate({ _id: "shop", members: [ /* 9 members, all votes: 1 */ ] })
```

```text
// FIX: at most 7 voters; the others need votes: 0 and priority: 0
{ _id: 8, host: "db9:27017", votes: 0, priority: 0 }
```

Chỉ có hai thành viên mang dữ liệu:

```text
// WRONG: two voters, one fails, the survivor sees no majority
members: [ { _id: 0, host: "db1:27017" }, { _id: 1, host: "db2:27017" } ]
```

Một máy hỏng thì máy còn lại chỉ thấy 1 trên 2 phiếu, không phải đa số, nên không ai thành primary. Dùng số thành viên bỏ phiếu lẻ, ít nhất 3.

Oplog quá nhỏ cho lần bảo trì dài: một secondary tắt lâu hơn cửa sổ oplog sẽ phải initial sync. Kiểm cửa sổ bằng `rs.printReplicationInfo()` trước khi tắt máy.

## Tóm tắt

- Primary ghi vào oplog; secondary áp oplog không đồng bộ, theo đúng thứ tự.
- Oplog là capped: secondary tụt quá cửa sổ oplog phải initial sync.
- Bầu cử sau 10 giây không trả lời; trung vị thường không quá 12 giây.
- Tối đa 50 thành viên, 7 bỏ phiếu; `priority: 0` không bao giờ thành primary.

# EN

## Opening

The shop's only MongoDB server loses a disk at midnight, and the whole website stops selling. A replica set keeps several copies so one broken machine does not stop the system, but how are the copies made and who takes over?

## Key idea

A replica set is one primary that takes writes and secondaries that hold copies. The primary applies a change and records it in the oplog (`local.oplog.rs`), a capped collection. Secondaries copy and apply the oplog asynchronously, in the primary's exact order. Each oplog entry is idempotent: applying it once or many times gives the same result.

The default oplog is 5% of free disk space, at least 990 MB and at most 50 GB. The oplog window is the time between its oldest and newest entries. Many people think the oplog keeps every operation forever. In fact it is capped: a secondary disconnected for longer than the window cannot catch up through replication and must start over (initial sync).

Members send heartbeats every 2 seconds. If the primary does not answer for more than 10 seconds an election starts; no writes are possible during it, and the median time to a new primary should not typically exceed 12 seconds. Drivers usually retry a write once (retryable writes). A member becomes primary only if it has the highest optime of the members it can see; higher priority calls elections sooner; priority 0 never becomes primary. A primary that sees only a minority of voting members (a network partition) steps down by itself.

The browser has no replica set: this lesson uses diagrams and commands from the docs.

## Syntax

```text
rs.initiate({ _id: "<set>", members: [ { _id: 0, host: "<host:port>", [priority: <n>,] [votes: 0|1] }, ... ] })
rs.status()
rs.printReplicationInfo()
rs.printSecondaryReplicationInfo()
rs.stepDown(<seconds>)
```

- `members`: up to 50, of which at most 7 have `votes: 1`.
- `priority: 0`: never becomes primary (good for a backup or remote machine).
- `rs.printReplicationInfo()`: the oplog size and the time range it holds.
- `rs.stepDown()`: makes the primary step down for maintenance.

## Example

Three members, one remote machine that never becomes primary:

```text
rs.initiate({ _id: "shop", members: [
  { _id: 0, host: "db1:27017" },
  { _id: 1, host: "db2:27017" },
  { _id: 2, host: "db3:27017", priority: 0 }
] })
```

The timeline of one failover with default settings:

```text
t = 0 s    primary db1 stops answering
t = 2 s    heartbeat missed
t = 10 s   electionTimeoutMillis reached, db2 calls an election
t ~ 12 s   db2 is primary (median, not a promise); retryable writes go to db2
```

`db3` has `priority: 0`, so it never competes; it still votes and still holds a copy.

## Common mistakes

Letting every member vote:

```text
// WRONG: 9 voting members are refused
rs.initiate({ _id: "shop", members: [ /* 9 members, all votes: 1 */ ] })
```

```text
// FIX: at most 7 voters; the others need votes: 0 and priority: 0
{ _id: 8, host: "db9:27017", votes: 0, priority: 0 }
```

Only two data-bearing members:

```text
// WRONG: two voters, one fails, the survivor sees no majority
members: [ { _id: 0, host: "db1:27017" }, { _id: 1, host: "db2:27017" } ]
```

When one machine fails, the other sees 1 vote out of 2, not a majority, so nobody becomes primary. Use an odd number of voting members, at least 3.

An oplog too small for a long maintenance: a secondary down for longer than the oplog window must do an initial sync. Check the window with `rs.printReplicationInfo()` before shutting it down.

## Recap

- The primary writes to the oplog; secondaries apply it asynchronously, in the same order.
- The oplog is capped: a secondary that falls past the window needs an initial sync.
- An election starts after 10 seconds without an answer; the median is typically no more than 12 seconds.
- At most 50 members and 7 voters; `priority: 0` never becomes primary.
