---
id: e-pg-l5-14
engine: postgres
level: L5
module: replication-ops
title: "Vận hành: backup, PITR, failover và autovacuum sản xuất"
title_en: "Operations: backup, PITR, failover and production autovacuum"
kind: quiz
runtime: docs
minutes: 15
objectives:
  - { vi: "Phân biệt backup logic (`pg_dump`) và backup vật lý + lưu trữ WAL (PITR)", en: "Tell logical backups (`pg_dump`) from physical backups + WAL archiving (PITR)" }
  - { vi: "Biết vì sao failover cần chống \"hai primary\" (split-brain)", en: "Know why failover must prevent \"two primaries\" (split-brain)" }
  - { vi: "Chỉnh autovacuum cho bảng lớn bằng tham số riêng từng bảng", en: "Tune autovacuum for large tables with per-table parameters" }
requires: [e-pg-l5-13]
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
    why: { vi: "PITR = base backup + replay WAL tới một thời điểm. Base backup một mình mất cả buổi sáng. Standby đã replay luôn câu DELETE, nên failover không cứu được (nhân bản không phải backup).", en: "PITR = base backup + WAL replay up to a point in time. The base backup alone loses the whole morning. The standby has already replayed the DELETE, so failing over does not help (replication is not a backup)." }
  - q: { vi: "`pg_dump` khác backup vật lý ở điểm nào quan trọng nhất?", en: "What is the most important difference between `pg_dump` and a physical backup?" }
    options:
      - { vi: "`pg_dump` là ảnh chụp logic nhất quán của một database tại một thời điểm, khôi phục được sang phiên bản khác, nhưng không replay WAL để tới một thời điểm sau đó", en: "`pg_dump` is a consistent logical snapshot of one database at one moment, restorable into another version, but it cannot replay WAL to reach a later moment" }
      - { vi: "`pg_dump` nhanh hơn với mọi kích thước", en: "`pg_dump` is faster at every size" }
      - { vi: "Không khác gì", en: "No difference" }
    answer: 0
    why: { vi: "Backup logic hợp cho chuyển phiên bản, sao một database; backup vật lý + lưu trữ WAL cho phục hồi tới từng giây và dùng cho cụm lớn.", en: "Logical backups suit version upgrades and copying one database; physical backups + WAL archiving give recovery to the second and suit large clusters." }
  - q: { vi: "Primary mất kết nối mạng nhưng vẫn chạy. Công cụ HA nâng standby lên làm primary. Rủi ro lớn nhất?", en: "The primary loses its network link but keeps running. The HA tool promotes the standby. The biggest risk?" }
    options:
      - { vi: "Hai primary cùng nhận ghi (split-brain), dữ liệu rẽ nhánh; cần cơ chế cô lập (fencing) primary cũ", en: "Two primaries both accept writes (split-brain) and the data diverges; the old primary must be fenced off" }
      - { vi: "Standby chạy chậm hơn", en: "The standby runs slower" }
      - { vi: "Không rủi ro", en: "No risk" }
    answer: 0
    why: { vi: "Postgres không tự làm failover; công cụ bên ngoài phải bảo đảm primary cũ không còn nhận ghi trước khi nâng standby. Sau đó primary cũ thường phải dựng lại (ví dụ bằng `pg_rewind`).", en: "Postgres does not fail over on its own; the external tool must make sure the old primary can no longer accept writes before promoting the standby. Afterwards the old primary usually has to be rebuilt (for example with `pg_rewind`)." }
  - q: { vi: "Bảng 500 triệu dòng, mặc định `autovacuum_vacuum_scale_factor` = 0,2 và ngưỡng 50. Autovacuum chạy khi nào, và nên chỉnh gì?", en: "A 500-million-row table, default `autovacuum_vacuum_scale_factor` = 0.2 and threshold 50. When does autovacuum run, and what should you tune?" }
    options:
      - { vi: "Sau khoảng 100 triệu dòng chết; hạ scale factor riêng cho bảng đó (`ALTER TABLE … SET (autovacuum_vacuum_scale_factor = 0.01)`)", en: "After about 100 million dead rows; lower the scale factor for that table (`ALTER TABLE … SET (autovacuum_vacuum_scale_factor = 0.01)`)" }
      - { vi: "Mỗi phút; tắt autovacuum", en: "Every minute; turn autovacuum off" }
      - { vi: "Không bao giờ; chạy VACUUM FULL hằng ngày", en: "Never; run VACUUM FULL daily" }
    answer: 0
    why: { vi: "Ngưỡng = threshold + scale_factor × số dòng = 50 + 0,2 × 500 triệu ≈ 100 triệu, và từ 18 còn bị chặn trên bởi `autovacuum_vacuum_max_threshold` (mặc định 100 triệu). Quá trễ cho bảng lớn. Chỉnh theo từng bảng; không tắt autovacuum (nó còn chống wraparound); `VACUUM FULL` giữ lock ACCESS EXCLUSIVE trên cả bảng.", en: "Threshold = threshold + scale_factor × rows = 50 + 0.2 × 500 million ≈ 100 million, and since 18 it is also capped by `autovacuum_vacuum_max_threshold` (default 100 million). Far too late for a big table. Tune per table; never turn autovacuum off (it also prevents wraparound); `VACUUM FULL` takes ACCESS EXCLUSIVE on the whole table." }
---

## Ý chính

- Backup logic: `pg_dump`/`pg_dumpall` xuất SQL hoặc dạng nén; nhất quán tại một thời điểm, khôi phục được sang phiên bản khác; chậm với dữ liệu lớn.
- Backup vật lý: sao thư mục dữ liệu (`pg_basebackup`) + lưu trữ WAL liên tục (`archive_library`). Khôi phục = base backup + replay WAL tới đích: thời điểm, LSN, tên điểm khôi phục. Đó là PITR.
- Nhân bản không phải backup: lỗi logic (xóa nhầm) được nhân bản ngay.
- Failover: `pg_promote()` nâng standby, nhưng quyết định khi nào nâng và cô lập primary cũ là việc của công cụ HA bên ngoài.
- Autovacuum sản xuất: ngưỡng = `autovacuum_vacuum_threshold` + `autovacuum_vacuum_scale_factor` × số dòng (mặc định 50 + 0,2 × số dòng), từ 18 không vượt `autovacuum_vacuum_max_threshold` (100 triệu, đo trên PGlite). Bảng lớn cần tham số riêng; không bao giờ tắt autovacuum vì nó còn freeze tuple chống wraparound.

## Ví dụ

Ví dụ theo docs chính thức của PostgreSQL, mục Continuous Archiving (chưa chạy trong trình duyệt): cấu hình khôi phục PITR điển hình.

```text
restore_command = 'cp /mnt/server/archivedir/%f %p'
recovery_target_time = '2026-10-31 14:04:59'
recovery_target_action = 'pause'
# then create recovery.signal in the data directory and start the server
```

## Thực hành

Phần chạy thật cần máy chủ thật (nhiều phiên / replica set / AWS). Bài này dùng sơ đồ và kết quả ghi sẵn. PGlite không có lưu trữ WAL, standby hay tiến trình autovacuum nền (đo: chỉ một `standalone backend`), nên đây là câu hỏi tình huống dựa trên docs chính thức.

Bốn tình huống vận hành. Kỹ năng chuyên gia: chọn chiến lược backup theo RPO/RTO, giải thích vì sao nhân bản không thay backup, và chỉnh autovacuum cho bảng lớn.

# EN

## Key idea

- Logical backup: `pg_dump`/`pg_dumpall` export SQL or a compressed format; consistent at one moment, restorable into another version; slow for very large data.
- Physical backup: copy the data directory (`pg_basebackup`) + continuous WAL archiving (`archive_library`). Restore = base backup + WAL replay up to a target: a time, an LSN, a named restore point. That is PITR.
- Replication is not a backup: a logical mistake (an accidental delete) is replicated at once.
- Failover: `pg_promote()` promotes a standby, but deciding when to promote and fencing the old primary is the job of an external HA tool.
- Production autovacuum: threshold = `autovacuum_vacuum_threshold` + `autovacuum_vacuum_scale_factor` × rows (default 50 + 0.2 × rows), and since 18 never above `autovacuum_vacuum_max_threshold` (100 million, measured on PGlite). Large tables need their own parameters; never turn autovacuum off, because it also freezes tuples against wraparound.

## Example

Example from the official PostgreSQL docs, Continuous Archiving section (not run in the browser): a typical PITR restore configuration.

```text
restore_command = 'cp /mnt/server/archivedir/%f %p'
recovery_target_time = '2026-10-31 14:04:59'
recovery_target_action = 'pause'
# then create recovery.signal in the data directory and start the server
```

## Practice

The real run needs a real server (several sessions / replica set / AWS). This lesson uses diagrams and recorded output. PGlite has no WAL archiving, no standby and no background autovacuum process (measured: only one `standalone backend`), so these are scenario questions based on the official docs.

Four operations scenarios. Expert skill: choose a backup strategy from RPO/RTO, explain why replication does not replace backups, and tune autovacuum for large tables.
