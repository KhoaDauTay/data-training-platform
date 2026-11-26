---
id: e-pg-l5-14
engine: postgres
level: L5
module: replication-ops
title: "Vận hành: backup, PITR, failover và autovacuum sản xuất"
title_en: "Operations: backup, PITR, failover and production autovacuum"
kind: quiz
runtime: docs
docs_why: server
minutes: 15
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - { vi: "Phân biệt backup logic (`pg_dump`) và backup vật lý + lưu trữ WAL (PITR)", en: "Tell logical backups (`pg_dump`) from physical backups + WAL archiving (PITR)" }
  - { vi: "Biết vì sao failover cần chống \"hai primary\" (split-brain)", en: "Know why failover must prevent \"two primaries\" (split-brain)" }
  - { vi: "Chỉnh autovacuum cho bảng lớn bằng tham số riêng từng bảng", en: "Tune autovacuum for large tables with per-table parameters" }
requires: [e-pg-l5-13]
viz: pg-replication
sources:
  - https://www.postgresql.org/docs/18/backup.html
  - https://www.postgresql.org/docs/18/continuous-archiving.html
  - https://www.postgresql.org/docs/18/routine-vacuuming.html
  - https://www.postgresql.org/docs/18/runtime-config-autovacuum.html
  - https://www.postgresql.org/docs/18/warm-standby-failover.html
quiz:
  - q: { vi: "Lúc 14:05 ai đó chạy nhầm `DELETE` không có WHERE. Có base backup đêm qua và WAL được lưu trữ liên tục. Khôi phục thế nào?", en: "At 14:05 someone runs a `DELETE` without WHERE by mistake. There is last night's base backup and continuous WAL archiving. How do you recover?" }
    options:
      - { vi: "Khôi phục base backup, replay WAL tới ngay trước 14:05 (`recovery_target_time`), rồi lấy dữ liệu đã mất", en: "Restore the base backup, replay WAL up to just before 14:05 (`recovery_target_time`), then take back the lost data" }
      - { vi: "Chỉ khôi phục base backup đêm qua", en: "Just restore last night's base backup" }
      - { vi: "Failover sang standby", en: "Fail over to the standby" }
    answer: 0
    trap: 2
    why: { vi: "Failover hấp dẫn vì standby có dữ liệu mới nhất, nhưng chính vì vậy nó đã replay luôn câu DELETE: nhân bản (replication) chép cả lỗi, nên không phải backup. Chỉ khôi phục base backup đêm qua thì mất mọi thay đổi từ đêm qua tới 14:05. PITR (point-in-time recovery, phục hồi tới một thời điểm) = khôi phục base backup rồi replay WAL đã lưu trữ tới ngay trước 14:05 (`recovery_target_time`): có đủ dữ liệu buổi sáng mà chưa có câu DELETE.", en: "Failover is tempting because the standby has the newest data, but that is exactly why it has already replayed the DELETE: replication copies mistakes too, so it is not a backup. Restoring last night's base backup alone loses every change from last night to 14:05. PITR (point-in-time recovery) = restore the base backup, then replay the archived WAL up to just before 14:05 (`recovery_target_time`): all of the morning's data, without the DELETE." }
  - q: { vi: "`pg_dump` khác backup vật lý ở điểm nào quan trọng nhất?", en: "What is the most important difference between `pg_dump` and a physical backup?" }
    options:
      - { vi: "`pg_dump` là ảnh chụp logic nhất quán của một database tại một thời điểm, khôi phục được sang phiên bản khác, nhưng không replay WAL để tới một thời điểm sau đó", en: "`pg_dump` is a consistent logical snapshot of one database at one moment, restorable into another version, but it cannot replay WAL to reach a later moment" }
      - { vi: "`pg_dump` nhanh hơn với mọi kích thước", en: "`pg_dump` is faster at every size" }
      - { vi: "Không khác gì", en: "No difference" }
    answer: 0
    trap: 1
    why: { vi: "`pg_dump` nghe nhanh hơn vì chỉ là một lệnh và một file, nhưng tốc độ tùy kích thước: với cụm lớn, sao chép file vật lý thường nhanh hơn xuất từng dòng. \"Không khác gì\" cũng sai. Điểm khác chính: `pg_dump` là ảnh chụp logic (lệnh SQL và dữ liệu dạng dòng) của một database tại đúng lúc chạy, nên khôi phục được sang phiên bản Postgres khác, nhưng chỉ về đúng thời điểm đó. Backup vật lý (bản sao file dữ liệu) cộng lưu trữ WAL thì replay được tới bất kỳ giây nào sau đó.", en: "`pg_dump` sounds faster because it is one command and one file, but speed depends on size: for a large cluster, copying the physical files is usually faster than exporting row by row. \"No difference\" is wrong too. The main difference: `pg_dump` is a logical snapshot (SQL commands and row data) of one database at the moment it runs, so it restores into another Postgres version, but only to that moment. A physical backup (a copy of the data files) plus WAL archiving can replay to any second after it." }
  - q: { vi: "Primary mất kết nối mạng nhưng vẫn chạy. Công cụ HA nâng standby lên làm primary. Rủi ro lớn nhất?", en: "The primary loses its network link but keeps running. The HA tool promotes the standby. The biggest risk?" }
    options:
      - { vi: "Hai primary cùng nhận ghi (split-brain), dữ liệu rẽ nhánh; cần cơ chế cô lập (fencing) primary cũ", en: "Two primaries both accept writes (split-brain) and the data diverges; the old primary must be fenced off" }
      - { vi: "Standby chạy chậm hơn", en: "The standby runs slower" }
      - { vi: "Không rủi ro", en: "No risk" }
    answer: 0
    trap: 2
    why: { vi: "\"Không rủi ro\" nghe hợp lý vì công cụ HA (high availability, tính sẵn sàng cao) đã thay primary, nhưng primary cũ không hỏng: nó chỉ mất mạng và vẫn chạy. Khi mạng trở lại, hai máy cùng nhận ghi (split-brain) và dữ liệu rẽ hai nhánh không gộp lại được. Tốc độ của standby không phải vấn đề ở đây. Postgres không tự làm failover; công cụ bên ngoài phải cô lập (fencing) primary cũ để nó thôi nhận ghi trước khi nâng standby. Sau đó primary cũ thường phải dựng lại, ví dụ bằng `pg_rewind`.", en: "\"No risk\" sounds right because the HA (high availability) tool has replaced the primary, but the old primary is not broken: it only lost its network and is still running. When the network comes back, two machines accept writes (split-brain) and the data forks into two branches that cannot be merged. The standby's speed is not the issue here. Postgres does not fail over on its own; the external tool must fence off the old primary so it stops accepting writes before promoting the standby. Afterwards the old primary usually has to be rebuilt, for example with `pg_rewind`." }
  - q: { vi: "Bảng 500 triệu dòng, mặc định `autovacuum_vacuum_scale_factor` = 0,2 và ngưỡng 50. Autovacuum chạy khi nào, và nên chỉnh gì?", en: "A 500-million-row table, default `autovacuum_vacuum_scale_factor` = 0.2 and threshold 50. When does autovacuum run, and what should you tune?" }
    options:
      - { vi: "Sau khoảng 100 triệu dòng chết; hạ scale factor riêng cho bảng đó (`ALTER TABLE … SET (autovacuum_vacuum_scale_factor = 0.01)`)", en: "After about 100 million dead rows; lower the scale factor for that table (`ALTER TABLE … SET (autovacuum_vacuum_scale_factor = 0.01)`)" }
      - { vi: "Mỗi phút; tắt autovacuum", en: "Every minute; turn autovacuum off" }
      - { vi: "Không bao giờ; chạy VACUUM FULL hằng ngày", en: "Never; run VACUUM FULL daily" }
    answer: 0
    trap: 2
    why: { vi: "VACUUM FULL hằng ngày nghe triệt để vì thu hồi hết chỗ trống, nhưng nó giữ lock ACCESS EXCLUSIVE, chặn cả đọc lẫn ghi trên bảng suốt lúc chạy. Autovacuum cũng không chạy mỗi phút: nó chạy khi số dòng chết vượt ngưỡng = threshold + scale_factor × số dòng = 50 + 0,2 × 500 triệu ≈ 100 triệu dòng chết (từ PostgreSQL 18 còn bị chặn trên bởi `autovacuum_vacuum_max_threshold`, mặc định 100 triệu). Quá trễ cho bảng lớn, nên hạ scale factor riêng cho bảng đó. Không tắt autovacuum: nó còn chống transaction ID wraparound (bộ đếm transaction quay vòng).", en: "A daily VACUUM FULL sounds thorough because it reclaims all free space, but it holds an ACCESS EXCLUSIVE lock that blocks both reads and writes on the table while it runs. Autovacuum does not run every minute either: it runs when dead rows pass the threshold = threshold + scale_factor × rows = 50 + 0.2 × 500 million ≈ 100 million dead rows (since PostgreSQL 18 also capped by `autovacuum_vacuum_max_threshold`, default 100 million). Far too late for a big table, so lower the scale factor for that table. Never turn autovacuum off: it also prevents transaction ID wraparound (the transaction counter wrapping around)." }
---
## Mở bài

Hệ thống có một standby đồng bộ và một bản `pg_dump` mỗi đêm, nên ai cũng nghĩ dữ liệu đã an toàn. Rồi lúc 14:05 một câu `DELETE` thiếu `WHERE` chạy trên primary. Trong hai thứ đang có, thứ nào cứu được buổi sáng hôm đó?

## Ý chính

Backup logic (`pg_dump`, `pg_dumpall`) là ảnh chụp nhất quán của database tại một thời điểm, khôi phục được sang phiên bản Postgres khác, nhưng chậm với dữ liệu lớn và không tiến thêm được sau thời điểm chụp. Backup vật lý sao cả thư mục dữ liệu (`pg_basebackup`) và lưu trữ WAL liên tục (`archive_command` hoặc `archive_library`). Khôi phục = base backup + replay WAL tới một đích: thời điểm, LSN hoặc tên điểm khôi phục. Đó là PITR.

Nhiều người nghĩ có standby là có backup. Thật ra standby replay mọi thứ primary làm, kể cả câu xóa nhầm, chỉ chậm hơn vài phần giây. Nhân bản bảo vệ khỏi hỏng máy; chỉ backup cộng lưu trữ WAL bảo vệ khỏi lỗi của con người.

Failover: `pg_promote()` nâng standby lên làm primary, nhưng Postgres không tự quyết định khi nào nâng. Công cụ HA bên ngoài phải chắc rằng primary cũ đã thôi nhận ghi (fencing) trước khi nâng, nếu không sẽ có hai primary cùng ghi (split-brain). Primary cũ thường phải dựng lại, ví dụ bằng `pg_rewind`.

Autovacuum ở sản xuất: một bảng được vacuum khi số dòng chết vượt `autovacuum_vacuum_threshold` + `autovacuum_vacuum_scale_factor` × số dòng (mặc định 50 + 0,2 × số dòng), và từ PostgreSQL 18 không vượt quá `autovacuum_vacuum_max_threshold` (100 triệu). Bảng lớn cần tham số riêng. Đừng tắt autovacuum: nó còn freeze tuple để chống wraparound.

## Ví dụ

Các thiết lập liên quan, đọc thật trên PGlite:

```sql
SELECT name, setting
FROM pg_settings
WHERE name IN ('archive_mode', 'autovacuum', 'autovacuum_vacuum_max_threshold',
               'autovacuum_vacuum_scale_factor', 'autovacuum_vacuum_threshold', 'wal_level')
ORDER BY name;
```

`archive_mode` là off và PGlite không có tiến trình autovacuum nền dù `autovacuum` ghi on, nên phần còn lại của bài là tình huống.

Ngưỡng mặc định cho một bảng 500 triệu dòng, rồi hạ nó cho riêng một bảng:

```sql
SELECT least(50 + 0.2 * 500000000, 100000000) AS dead_rows_before_autovacuum;
```

```sql
CREATE TABLE events (id bigint PRIMARY KEY, payload text);
ALTER TABLE events SET (autovacuum_vacuum_scale_factor = 0.01, autovacuum_vacuum_threshold = 1000);
SELECT relname, reloptions FROM pg_class WHERE relname = 'events';
```

Mặc định phải chờ 100 triệu dòng chết. Với tham số riêng, bảng 500 triệu dòng được vacuum sau khoảng 5 triệu.

Đặt một điểm khôi phục có tên trước một việc rủi ro, để PITR dừng đúng chỗ (`recovery_target_name`):

```sql
SELECT pg_create_restore_point('before_cleanup') IS NOT NULL AS created, pg_is_in_recovery() AS in_recovery;
```

Cấu hình khôi phục PITR điển hình, theo mục Continuous Archiving của docs (cần server thật, không chạy ở đây):

```text
restore_command = 'cp /mnt/server/archivedir/%f %p'
recovery_target_time = '2026-10-31 14:04:59'
recovery_target_action = 'pause'
# then create recovery.signal in the data directory and start the server
```

## Lỗi hay gặp

Chạy VACUUM trong một transaction:

```sql
BEGIN;
-- ERROR 25001: VACUUM cannot run inside a transaction block
VACUUM events;
```

`VACUUM` tự quản lý transaction của nó. Nhiều công cụ tự mở `BEGIN`; hãy chạy `VACUUM` ở chế độ autocommit.

Nâng một máy không phải standby:

```sql
ROLLBACK;
-- ERROR 55000: recovery is not in progress
SELECT pg_promote();
```

`pg_promote()` chỉ có nghĩa trên standby đang replay. Trước khi nâng, kiểm `pg_is_in_recovery()` và chắc rằng primary cũ đã bị cô lập.

## Thực hành

PGlite không có lưu trữ WAL, standby hay autovacuum nền (chỉ một backend), nên bài này là bốn tình huống vận hành dựa trên docs chính thức.

## Tóm tắt

- `pg_dump` là ảnh chụp logic tại một thời điểm; backup vật lý + lưu trữ WAL cho phép PITR tới từng giây.
- Nhân bản không phải backup: câu xóa nhầm được nhân bản ngay.
- Failover cần công cụ HA và fencing để tránh hai primary.
- Bảng lớn cần tham số autovacuum riêng; không bao giờ tắt autovacuum.

# EN

## Opening

The system has a synchronous standby and a nightly `pg_dump`, so everyone thinks the data is safe. Then at 14:05 a `DELETE` with no `WHERE` runs on the primary. Of the two things you have, which one saves that morning's work?

## Key idea

A logical backup (`pg_dump`, `pg_dumpall`) is a consistent snapshot of a database at one moment, restorable into another Postgres version, but slow for large data and unable to move forward past the moment it was taken. A physical backup copies the whole data directory (`pg_basebackup`) and archives WAL continuously (`archive_command` or `archive_library`). Restore = base backup + WAL replay up to a target: a time, an LSN or a named restore point. That is PITR.

Many people think a standby is a backup. In fact a standby replays everything the primary does, the accidental delete included, only a fraction of a second later. Replication protects against a failed machine; only backups plus WAL archiving protect against human mistakes.

Failover: `pg_promote()` promotes a standby to primary, but Postgres never decides by itself when to promote. An external HA tool must make sure the old primary has stopped accepting writes (fencing) before promoting, or two primaries write at once (split-brain). The old primary usually has to be rebuilt, for example with `pg_rewind`.

Autovacuum in production: a table is vacuumed once its dead rows exceed `autovacuum_vacuum_threshold` + `autovacuum_vacuum_scale_factor` × rows (by default 50 + 0.2 × rows), and since PostgreSQL 18 never above `autovacuum_vacuum_max_threshold` (100 million). Large tables need their own parameters. Never turn autovacuum off: it also freezes tuples to prevent wraparound.

## Example

The related settings, read for real on PGlite:

```sql
SELECT name, setting
FROM pg_settings
WHERE name IN ('archive_mode', 'autovacuum', 'autovacuum_vacuum_max_threshold',
               'autovacuum_vacuum_scale_factor', 'autovacuum_vacuum_threshold', 'wal_level')
ORDER BY name;
```

`archive_mode` is off and PGlite has no background autovacuum process even though `autovacuum` says on, so the rest of the lesson is scenarios.

The default threshold for a 500-million-row table, then a lower one for a single table:

```sql
SELECT least(50 + 0.2 * 500000000, 100000000) AS dead_rows_before_autovacuum;
```

```sql
CREATE TABLE events (id bigint PRIMARY KEY, payload text);
ALTER TABLE events SET (autovacuum_vacuum_scale_factor = 0.01, autovacuum_vacuum_threshold = 1000);
SELECT relname, reloptions FROM pg_class WHERE relname = 'events';
```

By default it waits for 100 million dead rows. With its own parameters, the 500-million-row table is vacuumed after about 5 million.

Set a named restore point before a risky job, so PITR can stop right there (`recovery_target_name`):

```sql
SELECT pg_create_restore_point('before_cleanup') IS NOT NULL AS created, pg_is_in_recovery() AS in_recovery;
```

A typical PITR restore configuration, from the Continuous Archiving section of the docs (needs a real server, not run here):

```text
restore_command = 'cp /mnt/server/archivedir/%f %p'
recovery_target_time = '2026-10-31 14:04:59'
recovery_target_action = 'pause'
# then create recovery.signal in the data directory and start the server
```

## Common mistakes

Running VACUUM inside a transaction:

```sql
BEGIN;
-- ERROR 25001: VACUUM cannot run inside a transaction block
VACUUM events;
```

`VACUUM` manages its own transactions. Many tools open a `BEGIN` for you; run `VACUUM` in autocommit mode.

Promoting a server that is not a standby:

```sql
ROLLBACK;
-- ERROR 55000: recovery is not in progress
SELECT pg_promote();
```

`pg_promote()` only means something on a standby that is replaying. Before promoting, check `pg_is_in_recovery()` and make sure the old primary is fenced off.

## Practice

PGlite has no WAL archiving, no standby and no background autovacuum (a single backend), so this lesson is four operations scenarios based on the official docs.

## Recap

- `pg_dump` is a logical snapshot at one moment; a physical backup + WAL archiving allows PITR to the second.
- Replication is not a backup: an accidental delete is replicated at once.
- Failover needs an HA tool and fencing to avoid two primaries.
- Large tables need their own autovacuum parameters; never turn autovacuum off.
