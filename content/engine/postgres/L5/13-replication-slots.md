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
objectives:
  - { vi: "Vẽ đường đi của WAL từ primary tới standby và nói đồng bộ/bất đồng bộ khác nhau ở đâu", en: "Trace WAL from the primary to a standby and say where synchronous and asynchronous differ" }
  - { vi: "Đọc `pg_replication_slots` và giải thích vì sao slot bị bỏ quên làm đầy đĩa", en: "Read `pg_replication_slots` and explain why a forgotten slot fills the disk" }
  - { vi: "Biết logical decoding cần `wal_level = logical` và có thể gửi lặp thay đổi sau sự cố", en: "Know that logical decoding needs `wal_level = logical` and can resend changes after a crash" }
requires: [e-pg-l5-09]
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
quiz:
  - q: { vi: "Một standby bị tắt 3 ngày nhưng slot của nó vẫn còn trên primary, `max_slot_wal_keep_size` = -1. Chuyện gì xảy ra?", en: "A standby was shut down for 3 days but its slot is still on the primary, `max_slot_wal_keep_size` = -1. What happens?" }
    options:
      - { vi: "Primary xóa WAL cũ như bình thường", en: "The primary removes old WAL as usual" }
      - { vi: "Primary giữ mọi WAL từ `restart_lsn` của slot, thư mục WAL phình tới khi đầy đĩa", en: "The primary keeps all WAL from the slot's `restart_lsn`, and the WAL directory grows until the disk is full" }
      - { vi: "Slot tự bị xóa sau 1 giờ", en: "The slot is dropped automatically after 1 hour" }
    answer: 1
    why: { vi: "Slot bảo đảm WAL không bị xóa trước khi người nhận đọc xong. Bị bỏ quên thì nó giữ WAL mãi; với slot logic còn giữ cả dòng catalog cho VACUUM, cực đoan có thể dẫn tới wraparound. Đặt `max_slot_wal_keep_size` và giám sát `wal_status`.", en: "A slot guarantees WAL is not removed before its consumer has read it. Forgotten, it keeps WAL forever; a logical slot also holds back catalog rows from VACUUM, which in extreme cases can lead to wraparound. Set `max_slot_wal_keep_size` and monitor `wal_status`." }
  - q: { vi: "`synchronous_commit = remote_apply` với một standby đồng bộ nghĩa là gì?", en: "What does `synchronous_commit = remote_apply` with a synchronous standby mean?" }
    options:
      - { vi: "COMMIT trả về khi WAL đã ghi xuống đĩa của primary", en: "COMMIT returns once WAL is flushed on the primary" }
      - { vi: "COMMIT chỉ trả về khi standby đã replay transaction, nên đọc trên standby ngay sau đó thấy được dữ liệu", en: "COMMIT only returns once the standby has replayed the transaction, so a read on the standby right after sees the data" }
      - { vi: "Standby nhận WAL theo lô mỗi giờ", en: "The standby receives WAL in hourly batches" }
    answer: 1
    why: { vi: "Thang đo: `remote_write` (standby đã nhận, ghi vào OS), `on` (standby đã flush), `remote_apply` (standby đã replay). Mức càng cao thì commit càng chậm nhưng càng ít mất dữ liệu và đọc trên standby càng nhất quán.", en: "The scale: `remote_write` (the standby received it and wrote it to the OS), `on` (the standby flushed it), `remote_apply` (the standby replayed it). Higher levels make commits slower but lose less data and make standby reads more consistent." }
  - q: { vi: "Một consumer logical decoding nhận lại vài thay đổi đã xử lý sau khi primary khởi động lại. Có phải lỗi không?", en: "A logical decoding consumer receives some already-processed changes again after the primary restarts. Is that a bug?" }
    options:
      - { vi: "Có, logical decoding bảo đảm đúng một lần", en: "Yes, logical decoding guarantees exactly once" }
      - { vi: "Không: vị trí slot chỉ được lưu bền lúc checkpoint, nên sau sự cố có thể gửi lại; consumer phải xử lý trùng an toàn (idempotent)", en: "No: the slot position is only persisted at checkpoint, so after a crash changes can be resent; the consumer must handle duplicates safely (idempotent)" }
    answer: 1
    why: { vi: "Tài liệu logical decoding nói đúng điều này. Mỗi slot chỉ có một người nhận tại một thời điểm.", en: "The logical decoding docs say exactly this. Each slot has only one receiver at a time." }
---

## Ý chính

- Streaming replication: standby nhận WAL từ primary qua một tiến trình walsender và replay nó. Mặc định bất đồng bộ: commit trả về trước khi standby nhận, trễ thường dưới một giây, có thể mất vài transaction cuối khi primary hỏng.
- Đồng bộ: `synchronous_standby_names` (`FIRST n (…)` hoặc `ANY n (…)`) cùng `synchronous_commit` (`remote_write`, `on`, `remote_apply`). Hot standby cho phép đọc trên standby.
- Slot nhân bản (vật lý hoặc logic) ghi nhớ người nhận đã đọc tới đâu (`restart_lsn`) và giữ WAL từ đó. Giới hạn bằng `max_slot_wal_keep_size`; `wal_status` cho biết slot còn an toàn hay WAL đã bị mất.
- Logical decoding giải mã WAL thành thay đổi theo dòng (cho logical replication, CDC). Cần `wal_level = logical`; slot logic gắn với một database, có thể gửi lặp sau sự cố, mỗi lúc một người nhận.

Giới hạn của PGlite (đo): một backend, `wal_level = replica`. Tạo được slot vật lý (bài này đọc nó thật), nhưng không có standby để kết nối; tạo slot logic báo lỗi. Streaming và failover thật cần hai server.

## Ví dụ

Kết quả thật trên PGlite:

```text
SELECT pg_create_logical_replication_slot('s1', 'test_decoding');
ERROR:  logical decoding requires "wal_level" >= "logical"   (SQLSTATE 55000)
```

Đường đi của WAL (sơ đồ có giải thích, cần server thật):

```text
primary: COMMIT -> WAL buffer -> WAL file -> walsender ==> standby: walreceiver -> WAL file -> startup (replay)
                                            slot.restart_lsn: oldest WAL the standby still needs
```

## Thực hành

Đọc hai slot thật và các thiết lập nhân bản, rồi ba câu hỏi. Kỹ năng chuyên gia: nhận ra slot bị bỏ quên trước khi nó làm đầy đĩa, và chọn mức `synchronous_commit` theo yêu cầu mất dữ liệu/độ trễ.

# EN

## Key idea

- Streaming replication: a standby receives WAL from the primary through a walsender process and replays it. Asynchronous by default: commit returns before the standby has it, the lag is usually under a second, and the last few transactions can be lost when the primary fails.
- Synchronous: `synchronous_standby_names` (`FIRST n (…)` or `ANY n (…)`) together with `synchronous_commit` (`remote_write`, `on`, `remote_apply`). Hot standby allows reads on the standby.
- A replication slot (physical or logical) remembers how far its consumer has read (`restart_lsn`) and keeps WAL from there. Cap it with `max_slot_wal_keep_size`; `wal_status` says whether the slot is still safe or its WAL is gone.
- Logical decoding turns WAL into row-level changes (for logical replication, CDC). It needs `wal_level = logical`; a logical slot belongs to one database, can resend changes after a crash, and has one receiver at a time.

PGlite limits (measured): a single backend, `wal_level = replica`. Physical slots can be created (this lesson reads them for real), but there is no standby to connect; creating a logical slot errors. Real streaming and failover need two servers.

## Example

Real output from PGlite:

```text
SELECT pg_create_logical_replication_slot('s1', 'test_decoding');
ERROR:  logical decoding requires "wal_level" >= "logical"   (SQLSTATE 55000)
```

The path of WAL (an explained diagram; it needs a real server):

```text
primary: COMMIT -> WAL buffer -> WAL file -> walsender ==> standby: walreceiver -> WAL file -> startup (replay)
                                            slot.restart_lsn: oldest WAL the standby still needs
```

## Practice

Read two real slots and the replication settings, then three questions. Expert skill: spot a forgotten slot before it fills the disk, and choose the `synchronous_commit` level from the data-loss and latency requirements.
