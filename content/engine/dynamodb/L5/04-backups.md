---
id: e-dy-l5-04
engine: dynamodb
level: L5
module: global-ops
title: "PITR và backup theo yêu cầu"
title_en: "PITR and on-demand backups"
kind: concept
runtime: docs
minutes: 7
objectives:
  - { vi: "Phân biệt PITR (liên tục, tới 35 ngày, theo giây) và backup theo yêu cầu (chụp toàn bộ khi bạn gọi)", en: "Tell PITR (continuous, up to 35 days, per second) from on-demand backups (a full copy when you call it)" }
  - { vi: "Biết khôi phục luôn tạo bảng mới và những cài đặt phải làm lại", en: "Know that a restore always creates a new table and which settings must be redone" }
requires: []
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Point-in-time-recovery.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/CreateBackup.html
quiz:
  - q: { vi: "Một lỗi deploy xóa nhầm dữ liệu lúc 14:03:20 hôm qua. Cách nào đưa bảng về đúng 14:03:19?", en: "A bad deploy deleted data by mistake at 14:03:20 yesterday. Which way brings the table back to exactly 14:03:19?" }
    options:
      - { vi: "PITR, khôi phục theo từng giây vào một bảng mới", en: "PITR, restoring to the second into a new table" }
      - { vi: "Backup theo yêu cầu tạo lúc nửa đêm", en: "The on-demand backup taken at midnight" }
      - { vi: "Đọc lại DynamoDB Streams của tuần trước", en: "Replay last week's DynamoDB Streams" }
    answer: 0
    trap: 1
    why: { vi: "Backup lúc nửa đêm đưa bảng về 00:00, nên mất mọi thay đổi đúng từ 00:00 tới 14:03:19. Streams chỉ giữ bản ghi 24 giờ, nên bản ghi của tuần trước đã bị cắt từ lâu. PITR (point-in-time recovery, khôi phục về một thời điểm) sao lưu liên tục và cho chọn bất kỳ giây nào trong tối đa 35 ngày, nên khôi phục đúng 14:03:19 vào một bảng mới.", en: "The midnight backup takes the table back to 00:00, so every valid change from 00:00 to 14:03:19 is lost. Streams keeps records for only 24 hours, so last week's records were trimmed long ago. PITR (point-in-time recovery) backs up continuously and lets you pick any second within up to 35 days, so it restores exactly 14:03:19 into a new table." }
  - q: { vi: "Sau khi khôi phục, cái gì phải cài lại bằng tay?", en: "After a restore, what must be set up again by hand?" }
    options:
      - { vi: "Không gì cả, bảng mới giống hệt bảng cũ", en: "Nothing, the new table is identical to the old one" }
      - { vi: "Auto scaling, IAM, alarm, tag, Streams, TTL, deletion protection và PITR", en: "Auto scaling, IAM, alarms, tags, Streams, TTL, deletion protection and PITR" }
      - { vi: "Chỉ GSI", en: "Only the GSIs" }
    answer: 1
    why: { vi: "Bảng mới không giống hệt bảng cũ: khôi phục chỉ mang theo dữ liệu, index (LSI, local secondary index, và GSI, global secondary index) cùng capacity. Vì GSI được mang theo nên \"chỉ GSI\" sai. Các cài đặt vận hành gắn với bảng cũ thì không đi theo: auto scaling, quyền IAM (Identity and Access Management), alarm, tag, Streams, TTL (time to live, hạn sống của item), deletion protection và PITR (point-in-time recovery) phải làm lại trên bảng mới. Khôi phục không bao giờ ghi đè bảng đang có.", en: "The new table is not identical: a restore brings back only the data, the indexes (LSIs, local secondary indexes, and GSIs, global secondary indexes) and capacity. Since GSIs do come back, \"only the GSIs\" is wrong. Operational settings tied to the old table do not follow: auto scaling, IAM (Identity and Access Management) permissions, alarms, tags, Streams, TTL (time to live), deletion protection and PITR (point-in-time recovery) must be redone on the new table. A restore never overwrites an existing table." }
---

## Mở bài

Một lần deploy lỗi ghi đè giá của 3.000 sản phẩm lúc 14:03:20, và 20 phút sau mới có người phát hiện. Bản backup gần nhất chụp lúc nửa đêm. Bạn lấy lại dữ liệu đúng tới giây trước lỗi bằng cách nào?

## Ý chính

DynamoDB có hai cách sao lưu, đều **không tiêu throughput** của bảng. **PITR** (point-in-time recovery) sao lưu liên tục và khôi phục về **bất kỳ giây nào** trong tối đa **35 ngày** (`RecoveryPeriodInDays` từ 1 tới 35, mặc định 35). Tắt rồi bật lại thì mốc bắt đầu bị đặt lại. **Backup theo yêu cầu** chụp toàn bộ bảng khi bạn gọi, giữ tới khi bạn xóa, không giới hạn số lượng; dùng cho lưu trữ dài hạn hoặc trước một thay đổi lớn.

Nhiều người nghĩ khôi phục là "tua bảng đang chạy về quá khứ". Thật ra khôi phục luôn tạo **bảng mới**, không ghi đè bảng cũ, và có thể sang Region khác. Bảng mới mang dữ liệu, LSI, GSI và capacity, nhưng phải tự cài lại: auto scaling, IAM, metric và alarm CloudWatch, tag, Streams, TTL, deletion protection, PITR. Sau đó hoặc trỏ ứng dụng sang bảng mới, hoặc chép các item bị hỏng từ bảng mới về bảng cũ.

Backup không bảo đảm nhất quán nhân quả giữa các item, dù độ lệch thường dưới một giây. Sao lưu và khôi phục chỉ có trên AWS thật, nên bài này chưa chạy được trong trình duyệt.

## Cú pháp

```text
UpdateContinuousBackups { TableName, PointInTimeRecoverySpecification: { PointInTimeRecoveryEnabled: true, RecoveryPeriodInDays: 35 } }
RestoreTableToPointInTime { SourceTableName, TargetTableName, RestoreDateTime | UseLatestRestorableTime: true }
CreateBackup { TableName, BackupName }
RestoreTableFromBackup { TargetTableName, BackupArn }
```

- `RecoveryPeriodInDays`: cửa sổ PITR, 1 tới 35 ngày.
- `TargetTableName`: tên bảng mới; phải chưa tồn tại.
- `RestoreDateTime`: mốc theo giây trong cửa sổ PITR.

## Ví dụ

Chọn cách theo tình huống:

```text
need                                    choose
undo a mistake from 20 minutes ago      PITR restore to the second before it
keep a copy for one year                on-demand backup (or AWS Backup plan)
before a risky migration                on-demand backup, then migrate
```

Sửa lần deploy lỗi lúc 14:03:20:

```text
1. RestoreTableToPointInTime  Products -> Products_restore  at 14:03:19
2. set up Streams, TTL, alarms, PITR on Products_restore if it will stay
3. copy the 3,000 damaged items back to Products (or switch the app to the new table)
```

## Lỗi hay gặp

Khôi phục về bảng đang dùng:

```text
// WRONG: expecting the restore to overwrite the live table
RestoreTableToPointInTime { SourceTableName: Products, TargetTableName: Products }   -> refused: table exists
```

```text
// FIX: restore to a new name, then copy back or switch
RestoreTableToPointInTime { SourceTableName: Products, TargetTableName: Products_restore }
```

Dùng Streams làm bản sao lưu:

```text
// WRONG: "we can rebuild from Streams" for a mistake found after 2 days
replay stream records older than 24 hours                     -> already trimmed
```

```text
// FIX: PITR covers up to 35 days, to the second
RestoreTableToPointInTime { ..., RestoreDateTime: <the second before the mistake> }
```

## Tóm tắt

- PITR: liên tục, tới 35 ngày, khôi phục theo giây.
- Backup theo yêu cầu: chụp khi gọi, giữ tới khi xóa, cho lưu dài hạn.
- Khôi phục luôn tạo bảng mới; cài lại Streams, TTL, IAM, alarm, PITR.
- Streams giữ 24 giờ, không phải bản sao lưu.

# EN

## Opening

A bad deploy overwrote the prices of 3,000 products at 14:03:20, and nobody noticed for 20 minutes. The latest backup was taken at midnight. How do you get the data back exactly as it was the second before the mistake?

## Key idea

DynamoDB has two backup methods, neither **consumes the table's throughput**. **PITR** (point-in-time recovery) backs up continuously and restores to **any second** within up to **35 days** (`RecoveryPeriodInDays` from 1 to 35, default 35). Disabling and re-enabling resets the start point. An **on-demand backup** takes a full copy of the table when you call it, kept until you delete it, with no limit on how many; use it for long-term retention or before a big change.

Many people think a restore "rewinds the live table". In fact a restore always creates a **new table**, never overwriting the old one, and it can go to another Region. The new table brings back data, LSIs, GSIs and capacity, but you must set up again: auto scaling, IAM, CloudWatch metrics and alarms, tags, Streams, TTL, deletion protection, PITR. Then either point the app at the new table, or copy the damaged items from the new table back to the old one.

A backup does not guarantee causal consistency across items, though the skew is usually under a second. Backup and restore exist only on real AWS, so this lesson does not run in the browser yet.

## Syntax

```text
UpdateContinuousBackups { TableName, PointInTimeRecoverySpecification: { PointInTimeRecoveryEnabled: true, RecoveryPeriodInDays: 35 } }
RestoreTableToPointInTime { SourceTableName, TargetTableName, RestoreDateTime | UseLatestRestorableTime: true }
CreateBackup { TableName, BackupName }
RestoreTableFromBackup { TargetTableName, BackupArn }
```

- `RecoveryPeriodInDays`: the PITR window, 1 to 35 days.
- `TargetTableName`: the new table's name; it must not exist yet.
- `RestoreDateTime`: a point to the second inside the PITR window.

## Example

Choosing the method from the situation:

```text
need                                    choose
undo a mistake from 20 minutes ago      PITR restore to the second before it
keep a copy for one year                on-demand backup (or AWS Backup plan)
before a risky migration                on-demand backup, then migrate
```

Repairing the bad deploy at 14:03:20:

```text
1. RestoreTableToPointInTime  Products -> Products_restore  at 14:03:19
2. set up Streams, TTL, alarms, PITR on Products_restore if it will stay
3. copy the 3,000 damaged items back to Products (or switch the app to the new table)
```

## Common mistakes

Restoring onto the live table:

```text
// WRONG: expecting the restore to overwrite the live table
RestoreTableToPointInTime { SourceTableName: Products, TargetTableName: Products }   -> refused: table exists
```

```text
// FIX: restore to a new name, then copy back or switch
RestoreTableToPointInTime { SourceTableName: Products, TargetTableName: Products_restore }
```

Using Streams as a backup:

```text
// WRONG: "we can rebuild from Streams" for a mistake found after 2 days
replay stream records older than 24 hours                     -> already trimmed
```

```text
// FIX: PITR covers up to 35 days, to the second
RestoreTableToPointInTime { ..., RestoreDateTime: <the second before the mistake> }
```

## Recap

- PITR: continuous, up to 35 days, restore to the second.
- On-demand backup: taken when you call it, kept until deleted, for long retention.
- A restore always creates a new table; set up Streams, TTL, IAM, alarms, PITR again.
- Streams keep 24 hours and are not a backup.
