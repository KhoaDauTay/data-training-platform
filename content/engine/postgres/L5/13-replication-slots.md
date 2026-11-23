---
id: e-pg-l5-13
engine: postgres
level: L5
module: replication-ops
title: "Nhân bản: streaming, slot và logical decoding"
title_en: "Replication: streaming, slots and logical decoding"
kind: lab
runtime: browser
minutes: 20
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - { vi: "Vẽ đường đi của WAL từ primary tới standby và nói đồng bộ/bất đồng bộ khác nhau ở đâu", en: "Trace WAL from the primary to a standby and say where synchronous and asynchronous differ" }
  - { vi: "Đọc `pg_replication_slots` và giải thích vì sao slot bị bỏ quên làm đầy đĩa", en: "Read `pg_replication_slots` and explain why a forgotten slot fills the disk" }
  - { vi: "Biết logical decoding cần `wal_level = logical` và có thể gửi lặp thay đổi sau khi máy sập", en: "Know that logical decoding needs `wal_level = logical` and can resend changes after a crash" }
requires: [e-pg-l5-09]
viz: pg-replication
sources:
  - https://www.postgresql.org/docs/18/warm-standby.html
  - https://www.postgresql.org/docs/18/logicaldecoding-explanation.html
  - https://www.postgresql.org/docs/18/view-pg-replication-slots.html
  - https://www.postgresql.org/docs/18/functions-admin.html
lab:
  setup: |
    SELECT pg_drop_replication_slot(slot_name) FROM pg_replication_slots WHERE slot_name IN ('standby_lazy', 'standby_reserved');
    SELECT pg_create_physical_replication_slot('standby_lazy');
    SELECT pg_create_physical_replication_slot('standby_reserved', true);
  steps:
    - task: { vi: "Hai slot vật lý đã được tạo: một slot thường, một slot giữ WAL ngay khi tạo (`immediately_reserve`). Liệt kê tên, loại, `active`, có `restart_lsn` chưa (cột has_restart_lsn) và `wal_status`. Sắp theo tên.", en: "Two physical slots were created: a plain one and one that reserves WAL at creation (`immediately_reserve`). List name, type, `active`, whether it has a `restart_lsn` (column has_restart_lsn) and `wal_status`. Order by name." }
      solution: "SELECT slot_name, slot_type, active, restart_lsn IS NOT NULL AS has_restart_lsn, wal_status FROM pg_replication_slots ORDER BY slot_name"
      check: rows
      ordered: true
      hint: { vi: "Không chấm theo giá trị LSN (thay đổi theo máy), chỉ theo việc có hay không.", en: "Do not grade on the LSN value (it changes per machine), only on whether there is one." }
    - task: { vi: "Đọc các thiết lập nhân bản: `wal_level`, `max_wal_senders`, `max_replication_slots`, `max_slot_wal_keep_size`, `synchronous_commit` (tên và giá trị, sắp theo tên).", en: "Read the replication settings: `wal_level`, `max_wal_senders`, `max_replication_slots`, `max_slot_wal_keep_size`, `synchronous_commit` (name and value, ordered by name)." }
      solution: "SELECT name, setting FROM pg_settings WHERE name IN ('wal_level', 'max_wal_senders', 'max_replication_slots', 'max_slot_wal_keep_size', 'synchronous_commit') ORDER BY name"
      check: rows
      ordered: true
      hint: { vi: "`max_slot_wal_keep_size` = -1 nghĩa là slot được giữ WAL không giới hạn.", en: "`max_slot_wal_keep_size` = -1 means a slot may keep WAL without limit." }
    - task: { vi: "Viết câu cảnh báo cho hệ thống giám sát: các slot không có người nhận nào đang nối (`active` là false) mà vẫn giữ WAL (có `restart_lsn`). Trả slot_name và wal_status, sắp theo tên.", en: "Write the alert query for the monitoring system: slots with no consumer connected (`active` is false) that still hold WAL (they have a `restart_lsn`). Return slot_name and wal_status, ordered by name." }
      solution: "SELECT slot_name, wal_status FROM pg_replication_slots WHERE NOT active AND restart_lsn IS NOT NULL ORDER BY slot_name"
      check: rows
      ordered: true
      hint: { vi: "Hai điều kiện: `NOT active` và `restart_lsn IS NOT NULL`.", en: "Two conditions: `NOT active` and `restart_lsn IS NOT NULL`." }
      fact:
        vi: "Chỉ `standby_reserved`: nó giữ WAL ngay từ lúc tạo dù chưa ai nối. `standby_lazy` chưa giữ gì cho tới khi có người nhận đầu tiên."
        en: "Only `standby_reserved`: it holds WAL from the moment it was created although nobody has connected. `standby_lazy` holds nothing until its first consumer arrives."
        probe: "SELECT string_agg(slot_name || '=' || wal_status, ', ' ORDER BY slot_name) FROM pg_replication_slots WHERE NOT active AND restart_lsn IS NOT NULL"
        expect: [["standby_reserved=reserved"]]
quiz:
  - q: { vi: "Một standby bị tắt 3 ngày nhưng slot của nó vẫn còn trên primary, `max_slot_wal_keep_size` = -1. Chuyện gì xảy ra?", en: "A standby was shut down for 3 days but its slot is still on the primary, `max_slot_wal_keep_size` = -1. What happens?" }
    options:
      - { vi: "Primary xóa WAL cũ như bình thường", en: "The primary removes old WAL as usual" }
      - { vi: "Primary giữ mọi WAL từ `restart_lsn` của slot, thư mục WAL phình tới khi đầy đĩa", en: "The primary keeps all WAL from the slot's `restart_lsn`, and the WAL directory grows until the disk is full" }
      - { vi: "Slot tự bị xóa sau 1 giờ", en: "The slot is dropped automatically after 1 hour" }
    answer: 1
    trap: 0
    why: { vi: "Nghe hợp lý vì primary vốn tự xóa WAL cũ sau checkpoint, nhưng một slot giữ WAL lại cho người nhận. Slot bảo đảm WAL không bị xóa trước khi người nhận đọc xong. Bị bỏ quên thì nó giữ WAL mãi; với slot logic còn giữ cả dòng catalog cho VACUUM, cực đoan có thể dẫn tới wraparound. Đặt `max_slot_wal_keep_size` và giám sát `wal_status`.", en: "It sounds right because the primary normally removes old WAL after a checkpoint, but a slot holds WAL back for its consumer. A slot guarantees WAL is not removed before its consumer has read it. Forgotten, it keeps WAL forever; a logical slot also holds back catalog rows from VACUUM, which in extreme cases can lead to wraparound. Set `max_slot_wal_keep_size` and monitor `wal_status`." }
  - q: { vi: "`synchronous_commit = remote_apply` với một standby đồng bộ nghĩa là gì?", en: "What does `synchronous_commit = remote_apply` with a synchronous standby mean?" }
    options:
      - { vi: "COMMIT trả về khi WAL đã ghi xuống đĩa của primary", en: "COMMIT returns once WAL is flushed on the primary" }
      - { vi: "COMMIT chỉ trả về khi standby đã replay transaction, nên đọc trên standby ngay sau đó thấy được dữ liệu", en: "COMMIT only returns once the standby has replayed the transaction, so a read on the standby right after sees the data" }
      - { vi: "Standby nhận WAL theo lô mỗi giờ", en: "The standby receives WAL in hourly batches" }
    answer: 1
    trap: 0
    why: { vi: "Nghe hợp lý vì đó là điều COMMIT bảo đảm khi không có standby đồng bộ, nhưng `remote_apply` còn chờ standby replay. Thang đo: `remote_write` (standby đã nhận, ghi vào OS), `on` (standby đã flush), `remote_apply` (standby đã replay). Mức càng cao thì commit càng chậm nhưng càng ít mất dữ liệu và đọc trên standby càng nhất quán.", en: "It sounds right because that is what COMMIT promises without a synchronous standby, but `remote_apply` also waits for the standby to replay. The scale: `remote_write` (the standby received it and wrote it to the OS), `on` (the standby flushed it), `remote_apply` (the standby replayed it). Higher levels make commits slower but lose less data and make standby reads more consistent." }
  - q: { vi: "Một consumer logical decoding nhận lại vài thay đổi đã xử lý sau khi primary khởi động lại. Có phải lỗi không?", en: "A logical decoding consumer receives some already-processed changes again after the primary restarts. Is that a bug?" }
    options:
      - { vi: "Có, logical decoding bảo đảm đúng một lần", en: "Yes, logical decoding guarantees exactly once" }
      - { vi: "Không: vị trí slot chỉ được lưu bền lúc checkpoint, nên sau khi máy sập có thể gửi lại; consumer phải xử lý trùng an toàn (idempotent)", en: "No: the slot position is only persisted at checkpoint, so after a crash changes can be resent; the consumer must handle duplicates safely (idempotent)" }
    answer: 1
    trap: 0
    why: { vi: "Nghe hợp lý vì slot ghi nhớ vị trí của người nhận, nhưng vị trí đó không được lưu bền sau mỗi thay đổi. Docs chính thức (logical decoding) nói đúng điều này. Mỗi slot chỉ có một người nhận tại một thời điểm.", en: "It sounds right because the slot remembers the consumer position, but that position is not made durable after every change. The logical decoding docs say exactly this. Each slot has only one receiver at a time." }
---
## Mở bài

Đĩa của primary đầy lúc 3 giờ sáng, và thư mục `pg_wal` chiếm 400 GB. Không ai chạy gì lạ, chỉ có một standby đã bị tắt từ tuần trước để bảo trì. Vì sao một máy đã tắt lại làm đầy đĩa của máy còn chạy?

## Ý chính

Streaming replication: standby nhận WAL từ primary qua tiến trình walsender rồi replay nó. Mặc định là bất đồng bộ: COMMIT trả về trước khi standby nhận, độ trễ thường dưới một giây, và vài transaction cuối có thể mất khi primary hỏng. Muốn đồng bộ thì đặt `synchronous_standby_names` (`FIRST n (…)` hoặc `ANY n (…)`) cùng mức `synchronous_commit`: `remote_write`, `on`, `remote_apply`. Hot standby cho phép đọc trên standby.

Slot nhân bản (vật lý hoặc logic) ghi nhớ người nhận đã đọc tới đâu (`restart_lsn`) và giữ mọi WAL từ đó. Nhiều người nghĩ slot chỉ là một dòng ghi chú, xóa hay giữ cũng không sao. Thật ra một slot không ai đọc giữ WAL mãi mãi, và với `max_slot_wal_keep_size` = -1 (mặc định) thì không có giới hạn: đĩa đầy. Đặt giới hạn đó, theo dõi `wal_status`, và xóa slot của standby đã bỏ.

Logical decoding biến WAL thành thay đổi theo dòng, cho logical replication và CDC. Nó cần `wal_level = logical`; slot logic gắn với một database, mỗi lúc chỉ một người nhận, và có thể gửi lại thay đổi sau khi máy sập, nên bên nhận phải chịu được bản trùng. PGlite chạy một backend với `wal_level = replica`: tạo được slot vật lý thật, nhưng không có standby và không tạo được slot logic.

## Cú pháp

```sql
SELECT * FROM pg_create_physical_replication_slot(slot_name [, immediately_reserve ]);
SELECT * FROM pg_create_logical_replication_slot(slot_name, plugin);
SELECT pg_drop_replication_slot(slot_name);
SELECT slot_name, slot_type, active, restart_lsn, wal_status FROM pg_replication_slots;
```

- `immediately_reserve`: `true` thì giữ WAL ngay khi tạo; mặc định chỉ giữ từ lúc người nhận đầu tiên nối vào.
- `plugin`: bộ giải mã của slot logic, ví dụ `test_decoding` hay `pgoutput`.
- `restart_lsn`: WAL cũ nhất người nhận còn cần; NULL khi slot chưa giữ gì.
- `wal_status`: `reserved`, `extended`, `unreserved` hoặc `lost` (WAL cần đã bị xóa).

## Ví dụ

Tạo thêm một slot giữ WAL ngay:

```sql
SELECT slot_name, lsn IS NOT NULL AS reserved
FROM pg_create_physical_replication_slot('standby_new', true);
```

Sinh thêm WAL rồi xem mỗi slot đang giữ lại bao nhiêu:

```sql
CREATE TABLE filler (id int PRIMARY KEY);
INSERT INTO filler SELECT generate_series(1, 10000);
SELECT slot_name, pg_size_pretty(pg_current_wal_lsn() - restart_lsn) AS held_back
FROM pg_replication_slots
WHERE restart_lsn IS NOT NULL
ORDER BY slot_name;
```

Hai slot có `restart_lsn` cùng giữ mọi WAL vừa sinh ra; chưa có người nhận nào, nên con số chỉ tăng. `standby_lazy` không có dòng vì nó chưa giữ gì.

Xóa slot của một standby không còn dùng:

```sql
SELECT pg_drop_replication_slot('standby_new');
SELECT slot_name FROM pg_replication_slots ORDER BY slot_name;
```

## Lỗi hay gặp

Tạo slot logic khi `wal_level` chưa đủ:

```sql
-- ERROR 55000: logical decoding requires "wal_level" >= "logical"
SELECT pg_create_logical_replication_slot('cdc', 'test_decoding');
```

`wal_level` chỉ đổi được khi khởi động lại server. Lên kế hoạch trước khi cần CDC.

Tạo trùng tên slot:

```sql
-- ERROR 42710: replication slot "standby_reserved" already exists
SELECT pg_create_physical_replication_slot('standby_reserved');
```

Tên slot là duy nhất trong cả cụm. Script dựng standby nên kiểm `pg_replication_slots` trước khi tạo.

Đếm slot để biết bao nhiêu slot đang giữ WAL:

```sql
-- WRONG: a slot created without reserving holds no WAL yet
SELECT count(*) AS slots_holding_wal FROM pg_replication_slots;
```

```sql
-- FIX: only slots with a restart_lsn hold WAL
SELECT count(*) AS slots_holding_wal FROM pg_replication_slots WHERE restart_lsn IS NOT NULL;
```

Câu sai đếm 2, câu đúng đếm 1. Một slot thường chưa có `restart_lsn` cho tới khi người nhận đầu tiên nối vào; từ lúc đó nó mới bắt đầu giữ WAL.

## Thực hành

Ba bước: đọc hai slot thật, đọc các thiết lập nhân bản, rồi viết câu cảnh báo tìm slot bị bỏ quên. Sau đó là ba câu hỏi.

## Tóm tắt

- Standby replay WAL của primary; mặc định bất đồng bộ, `synchronous_commit` chọn mức chờ.
- Slot giữ WAL từ `restart_lsn`; slot bị bỏ quên làm đầy đĩa, nên đặt `max_slot_wal_keep_size` và theo dõi `wal_status`.
- Slot thường chỉ giữ WAL từ khi có người nhận; `immediately_reserve` giữ ngay.
- Logical decoding cần `wal_level = logical` và có thể gửi lại thay đổi: bên nhận phải chịu được bản trùng.

# EN

## Opening

The primary's disk fills up at 3 a.m., and the `pg_wal` directory takes 400 GB. Nobody ran anything unusual; only one standby was shut down last week for maintenance. Why does a machine that is switched off fill the disk of the one still running?

## Key idea

Streaming replication: a standby receives WAL from the primary through a walsender process and replays it. It is asynchronous by default: COMMIT returns before the standby has it, the lag is usually under a second, and the last few transactions can be lost when the primary fails. For synchronous replication set `synchronous_standby_names` (`FIRST n (…)` or `ANY n (…)`) together with a `synchronous_commit` level: `remote_write`, `on`, `remote_apply`. Hot standby allows reads on the standby.

A replication slot (physical or logical) remembers how far its consumer has read (`restart_lsn`) and keeps all WAL from there. Many people think a slot is just a bookkeeping row, harmless to keep around. In fact a slot nobody reads keeps WAL forever, and with `max_slot_wal_keep_size` = -1 (the default) there is no limit: the disk fills up. Set that limit, watch `wal_status`, and drop the slot of a retired standby.

Logical decoding turns WAL into row-level changes, for logical replication and CDC. It needs `wal_level = logical`; a logical slot belongs to one database, has one consumer at a time, and can resend changes after a crash, so the consumer must tolerate duplicates. PGlite runs a single backend with `wal_level = replica`: it creates real physical slots, but there is no standby and no logical slot.

## Syntax

```sql
SELECT * FROM pg_create_physical_replication_slot(slot_name [, immediately_reserve ]);
SELECT * FROM pg_create_logical_replication_slot(slot_name, plugin);
SELECT pg_drop_replication_slot(slot_name);
SELECT slot_name, slot_type, active, restart_lsn, wal_status FROM pg_replication_slots;
```

- `immediately_reserve`: `true` keeps WAL from creation; by default WAL is kept only once the first consumer connects.
- `plugin`: the decoder of a logical slot, for example `test_decoding` or `pgoutput`.
- `restart_lsn`: the oldest WAL the consumer still needs; NULL while the slot holds nothing.
- `wal_status`: `reserved`, `extended`, `unreserved` or `lost` (the needed WAL is gone).

## Example

Create one more slot that reserves WAL at once:

```sql
SELECT slot_name, lsn IS NOT NULL AS reserved
FROM pg_create_physical_replication_slot('standby_new', true);
```

Produce more WAL, then see how much each slot holds back:

```sql
CREATE TABLE filler (id int PRIMARY KEY);
INSERT INTO filler SELECT generate_series(1, 10000);
SELECT slot_name, pg_size_pretty(pg_current_wal_lsn() - restart_lsn) AS held_back
FROM pg_replication_slots
WHERE restart_lsn IS NOT NULL
ORDER BY slot_name;
```

Both slots with a `restart_lsn` keep all the WAL just produced; there is no consumer yet, so the number only grows. `standby_lazy` has no row because it holds nothing yet.

Drop the slot of a standby that is no longer used:

```sql
SELECT pg_drop_replication_slot('standby_new');
SELECT slot_name FROM pg_replication_slots ORDER BY slot_name;
```

## Common mistakes

Creating a logical slot while `wal_level` is too low:

```sql
-- ERROR 55000: logical decoding requires "wal_level" >= "logical"
SELECT pg_create_logical_replication_slot('cdc', 'test_decoding');
```

`wal_level` only changes with a server restart. Plan for it before you need CDC.

Creating a slot with a name that is taken:

```sql
-- ERROR 42710: replication slot "standby_reserved" already exists
SELECT pg_create_physical_replication_slot('standby_reserved');
```

Slot names are unique across the whole cluster. A standby build script should check `pg_replication_slots` before creating one.

Counting slots to know how many hold WAL:

```sql
-- WRONG: a slot created without reserving holds no WAL yet
SELECT count(*) AS slots_holding_wal FROM pg_replication_slots;
```

```sql
-- FIX: only slots with a restart_lsn hold WAL
SELECT count(*) AS slots_holding_wal FROM pg_replication_slots WHERE restart_lsn IS NOT NULL;
```

The wrong query counts 2, the right one 1. A plain slot has no `restart_lsn` until its first consumer connects; only from then on does it start holding WAL.

## Practice

Three steps: read two real slots, read the replication settings, then write the alert query that finds a forgotten slot. Then three questions.

## Recap

- A standby replays the primary's WAL; asynchronous by default, `synchronous_commit` picks how long to wait.
- A slot keeps WAL from its `restart_lsn`; a forgotten slot fills the disk, so set `max_slot_wal_keep_size` and watch `wal_status`.
- A plain slot holds WAL only once a consumer connects; `immediately_reserve` holds it at once.
- Logical decoding needs `wal_level = logical` and can resend changes: the consumer must tolerate duplicates.
