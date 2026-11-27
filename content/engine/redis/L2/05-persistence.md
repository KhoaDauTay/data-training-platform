---
id: e-rd-l2-05
engine: redis
level: L2
module: atomic
title: Lưu xuống đĩa, RDB và AOF
title_en: Saving to disk, RDB and AOF
kind: concept
runtime: docs
docs_why: server
minutes: 15
requires: [e-rd-l2-04]
figures: [{ name: rd-rdb-aof, at: idea }]
objectives:
  - vi: Phân biệt ảnh chụp RDB và nhật ký lệnh AOF, và mỗi cách có thể mất bao nhiêu dữ liệu khi sập.
    en: Tell RDB snapshots from the AOF command log, and how much data each can lose in a crash.
  - vi: Đọc được các dòng cấu hình save, appendonly, appendfsync.
    en: Read the save, appendonly and appendfsync configuration lines.
  - vi: Biết vì sao dù có lưu xuống đĩa, nguồn đúng của tiền vẫn nên ở PostgreSQL.
    en: Know why, even with saving to disk, the source of truth for money should still be PostgreSQL.
sources:
  - { url: "https://valkey.io/topics/persistence/", title: "Valkey docs: Persistence", title_vi: "Tài liệu Valkey: lưu bền dữ liệu (persistence)" }
  - { url: "https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/", title: "Redis docs: Redis persistence", title_vi: "Tài liệu Redis: lưu bền dữ liệu (persistence)" }
  - { url: "https://valkey.io/topics/valkey.conf/", title: "Valkey docs: valkey.conf", title_vi: "Tài liệu Valkey: valkey.conf" }
quiz:
  - q:
      vi: "Redis bật AOF với `appendfsync everysec`. Máy chủ mất điện đột ngột. Tối đa mất bao nhiêu lệnh ghi?"
      en: "Redis runs AOF with `appendfsync everysec`. The server loses power suddenly. At most how many writes are lost?"
    options:
      - { vi: "Khoảng một giây ghi cuối", en: "About the last second of writes" }
      - { vi: "Không mất gì, AOF ghi mọi lệnh", en: "Nothing, AOF logs every command" }
      - { vi: "Mọi thứ từ ảnh chụp RDB gần nhất", en: "Everything since the last RDB snapshot" }
    answer: 0
    trap: 1
    why:
      vi: "AOF có ghi mọi lệnh, nhưng ghi vào file chưa chắc đã nằm trên đĩa: hệ điều hành giữ nó trong bộ đệm cho tới lần fsync (ép xuống đĩa). Với `everysec`, Redis fsync mỗi giây, nên mất điện có thể mất khoảng một giây cuối. Ảnh chụp RDB không liên quan ở đây, vì khi khởi động lại Redis đọc AOF. Muốn không mất gì thì `appendfsync always`, đổi lại mỗi lệnh ghi chậm đi nhiều."
      en: "AOF does log every command, but writing to a file does not mean it is on disk yet: the operating system keeps it in a buffer until an fsync (a forced flush to disk). With `everysec`, Redis fsyncs once a second, so a power cut can lose about the last second. RDB snapshots do not matter here, because on restart Redis reads the AOF. To lose nothing, use `appendfsync always`, at the cost of much slower writes."
  - q:
      vi: "Redis chỉ dùng RDB với `save 300 100` (chụp sau 300 giây nếu có ít nhất 100 lần ghi). Lần chụp gần nhất là lúc 10:00; máy sập lúc 10:04:59 sau rất nhiều lần ghi. Khi bật lại, dữ liệu là của lúc nào?"
      en: "Redis uses RDB only, with `save 300 100` (snapshot after 300 seconds if at least 100 writes happened). The last snapshot was at 10:00; the server crashes at 10:04:59 after many writes. On restart, which moment is the data from?"
    options:
      - { vi: "10:04:59, không mất gì", en: "10:04:59, nothing lost" }
      - { vi: "10:04:58, mất một giây", en: "10:04:58, one second lost" }
      - { vi: "10:00, mất gần 5 phút", en: "10:00, almost 5 minutes lost" }
    answer: 2
    trap: 0
    why:
      vi: "RDB không ghi từng lệnh: nó chụp cả bộ nhớ thành một file theo lịch. Mọi lần ghi sau lần chụp 10:00 chỉ nằm trong RAM, nên sập lúc 10:04:59 là mất gần 5 phút. \"Mất một giây\" là đặc điểm của AOF với `everysec`, không phải của RDB. Đổi lại, file RDB gọn và khởi động lại nhanh, nên hai cách thường được bật cùng nhau."
      en: "RDB does not log each command: it dumps the whole memory into one file on a schedule. Every write after the 10:00 snapshot lives only in RAM, so a crash at 10:04:59 loses almost 5 minutes. \"One second lost\" is what AOF with `everysec` gives, not RDB. In return an RDB file is compact and restarts fast, so the two are often turned on together."
---
## Mở bài

Redis giữ mọi thứ trong bộ nhớ, nên câu hỏi đầu tiên của người vận hành Chợ Lồng Đèn là: tắt máy thì còn gì? Redis có hai cách ghi xuống đĩa, ảnh chụp RDB và nhật ký lệnh AOF, mỗi cách mất một lượng dữ liệu khác nhau khi sập. Phần đó cần một server Redis thật nên không chạy ở đây; các khối có nút Chạy cho thấy bộ nhớ mất sạch khi không có gì được lưu.

## Ý chính

**Không lưu gì.** Mặc định của nhiều bản cài cho cache là không ghi đĩa: khởi động lại là mất sạch. Với cache thuần thì ổn, vì mọi thứ dựng lại được từ PostgreSQL; trong bài trước, lệnh `FLUSHALL` đã giả lập đúng tình huống này.

**RDB, ảnh chụp theo lịch.** Redis định kỳ chụp toàn bộ bộ nhớ vào một file (`dump.rdb`). Dòng cấu hình `save 300 100` nghĩa là: sau 300 giây, nếu có ít nhất 100 lần ghi, thì chụp. Việc chụp do một tiến trình con làm, nên server vẫn phục vụ khách trong lúc đó. File RDB gọn, sao lưu dễ và khởi động lại nhanh, nhưng mọi thứ ghi sau lần chụp cuối chỉ nằm trong RAM: sập giữa hai lần chụp là mất cả khoảng đó, có khi vài phút.

**AOF, nhật ký từng lệnh.** Với `appendonly yes`, mỗi lệnh ghi được nối vào cuối một file nhật ký; khi khởi động lại, Redis chạy lại các lệnh đó để dựng lại bộ nhớ. Lượng mất khi sập tùy `appendfsync`: `always` ép xuống đĩa sau mỗi lệnh (gần như không mất, nhưng chậm), `everysec` mỗi giây một lần (mất tối đa khoảng một giây, mặc định hợp lý), `no` để hệ điều hành tự quyết (nhanh nhất, mất nhiều hơn). File AOF lớn dần, nên Redis định kỳ viết lại nó cho gọn.

**Bật cả hai.** Nhiều hệ thống bật cả RDB (để sao lưu và khởi động nhanh) lẫn AOF `everysec` (để mất ít). Hạn của khóa được lưu dưới dạng thời điểm tuyệt đối, nên một khóa đã quá hạn trong lúc Redis tắt sẽ biến mất khi bật lại.

**Vẫn không phải nơi giữ tiền.** Dù có AOF, Redis không có ràng buộc, không có hoàn tác, và cấu hình phổ biến vẫn có thể mất khoảng một giây ghi. Đơn hàng và thanh toán của Chợ Lồng Đèn vì vậy nằm ở PostgreSQL, nơi một giao dịch chỉ báo xong khi WAL đã nằm trên đĩa; Redis giữ bản sao và dữ liệu tạm.

Hình cuối mục so hai cách lưu theo trục thời gian.

## Ví dụ

Những gì đang nằm trong bộ nhớ:

```redis
SET order:o500:status packed
SET session:t9 lily EX 1800
DBSIZE
```

Khởi động lại khi không có gì được lưu: bộ nhớ trống.

```redis
SET stats:views 1200
FLUSHALL
GET stats:views
```

Cấu hình bật cả hai cách lưu (chỉ để đọc, không chạy ở đây):

```text
save 3600 1 300 100 60 10000
appendonly yes
appendfsync everysec
```

## Lỗi hay gặp

Dùng Redis như kho chính mà tắt cả hai cách lưu: một lần khởi động lại là mất hết.

```text
# WRONG
save ""
appendonly no
```

```text
# FIX
save 3600 1 300 100 60 10000
appendonly yes
appendfsync everysec
```

Đặt `appendfsync always` cho một cache đọc rất nhiều: mỗi lệnh ghi phải chờ đĩa, trong khi dữ liệu dựng lại được từ PostgreSQL.

```text
# WRONG
appendonly yes
appendfsync always
```

```text
# FIX
appendonly yes
appendfsync everysec
```

## Tóm tắt

- Không lưu gì: khởi động lại là mất sạch; chỉ hợp với cache thuần.
- RDB chụp theo lịch: gọn, khởi động nhanh, nhưng mất mọi thứ sau lần chụp cuối.
- AOF ghi từng lệnh; với `everysec` mất tối đa khoảng một giây.
- Dù có lưu, tiền và đơn hàng vẫn để nguồn đúng ở PostgreSQL.

# EN

## Opening

Redis keeps everything in memory, so the first question Lantern Market's operators ask is: what is left after a shutdown? Redis has two ways to write to disk, RDB snapshots and the AOF command log, and each loses a different amount of data in a crash. That part needs a real Redis server, so it does not run here; the blocks with a Run button show memory being wiped when nothing is saved.

## Key idea

**Saving nothing.** The default of many cache installs is not to write to disk: a restart wipes everything. For a pure cache that is fine, because everything can be rebuilt from PostgreSQL; in the previous lesson, `FLUSHALL` simulated exactly this.

**RDB, scheduled snapshots.** Redis regularly dumps the whole memory into one file (`dump.rdb`). The configuration line `save 300 100` means: after 300 seconds, if at least 100 writes happened, take a snapshot. A child process does the dumping, so the server keeps serving clients meanwhile. An RDB file is compact, easy to back up and quick to restart from, but everything written after the last snapshot lives only in RAM: a crash between two snapshots loses that whole span, sometimes minutes.

**AOF, a log of every command.** With `appendonly yes`, every write command is appended to a log file; on restart, Redis replays those commands to rebuild memory. How much a crash loses depends on `appendfsync`: `always` forces data to disk after every command (almost nothing lost, but slow), `everysec` once a second (at most about one second lost, a sensible default), `no` lets the operating system decide (fastest, loses more). The AOF file keeps growing, so Redis rewrites it into a compact form from time to time.

**Turning on both.** Many systems turn on both RDB (for backups and fast restarts) and AOF `everysec` (to lose little). A key's expiry is stored as an absolute time, so a key that expired while Redis was down is gone when it comes back.

**Still not the place for money.** Even with AOF, Redis has no constraints, no rollback, and a common setup can still lose about a second of writes. Lantern Market's orders and payments therefore live in PostgreSQL, where a transaction only says done once its WAL is on disk; Redis keeps copies and temporary data.

The figure at the end of this section compares the two ways of saving along a timeline.

## Example

What sits in memory now:

```redis
SET order:o500:status packed
SET session:t9 lily EX 1800
DBSIZE
```

A restart with nothing saved: memory is empty.

```redis
SET stats:views 1200
FLUSHALL
GET stats:views
```

A configuration that turns on both ways of saving (for reading only, not run here):

```text
save 3600 1 300 100 60 10000
appendonly yes
appendfsync everysec
```

## Common mistakes

Using Redis as the main store with both ways of saving turned off: one restart and everything is gone.

```text
# WRONG
save ""
appendonly no
```

```text
# FIX
save 3600 1 300 100 60 10000
appendonly yes
appendfsync everysec
```

Setting `appendfsync always` for a read-heavy cache: every write waits for the disk, while the data can be rebuilt from PostgreSQL.

```text
# WRONG
appendonly yes
appendfsync always
```

```text
# FIX
appendonly yes
appendfsync everysec
```

## Recap

- Saving nothing: a restart wipes everything; only fine for a pure cache.
- RDB snapshots on a schedule: compact, fast restarts, but loses everything after the last snapshot.
- AOF logs every command; with `everysec` at most about one second is lost.
- Even with saving, keep the source of truth for money and orders in PostgreSQL.
