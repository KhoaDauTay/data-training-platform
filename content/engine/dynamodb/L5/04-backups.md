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
    why: { vi: "PITR cho điểm khôi phục theo giây trong tối đa 35 ngày. Backup lúc nửa đêm mất mọi thay đổi sau đó; Streams chỉ giữ 24 giờ.", en: "PITR gives per-second recovery points over up to 35 days. The midnight backup loses every change after it; Streams keeps only 24 hours." }
  - q: { vi: "Sau khi khôi phục, cái gì phải cài lại bằng tay?", en: "After a restore, what must be set up again by hand?" }
    options:
      - { vi: "Không gì cả, bảng mới giống hệt bảng cũ", en: "Nothing, the new table is identical to the old one" }
      - { vi: "Auto scaling, IAM, alarm, tag, Streams, TTL, deletion protection và PITR", en: "Auto scaling, IAM, alarms, tags, Streams, TTL, deletion protection and PITR" }
      - { vi: "Chỉ GSI", en: "Only the GSIs" }
    answer: 1
    why: { vi: "Khôi phục mang theo dữ liệu, LSI/GSI và capacity, nhưng các cài đặt vận hành kể trên phải làm lại trên bảng mới. Khôi phục không bao giờ ghi đè bảng đang có.", en: "A restore brings back data, LSIs/GSIs and capacity, but the operational settings above must be redone on the new table. A restore never overwrites an existing table." }
---

## Ý chính

DynamoDB có hai cách sao lưu, đều **không tiêu throughput** của bảng:

- **PITR** (point-in-time recovery): sao lưu liên tục, khôi phục về **bất kỳ giây nào** trong tối đa **35 ngày** (`RecoveryPeriodInDays` từ 1 tới 35, mặc định 35). Tắt rồi bật lại thì mốc bắt đầu bị đặt lại.
- **Backup theo yêu cầu**: chụp toàn bộ bảng khi bạn gọi, **không giới hạn số lượng**. Dùng cho lưu trữ dài hạn hoặc trước một thay đổi lớn.
- Khôi phục luôn tạo **bảng mới**, không ghi đè bảng cũ. Có thể khôi phục sang Region khác.
- Phải tự cài lại trên bảng mới: auto scaling, IAM, metric và alarm CloudWatch, tag, Streams, TTL, deletion protection, PITR.
- Backup không bảo đảm nhất quán nhân quả giữa các item, dù độ lệch thường dưới một giây.

Sao lưu và khôi phục chỉ có trên AWS thật, nên bài này **chưa chạy được trong trình duyệt**.

## Ví dụ

```text
need                                    choose
undo a mistake from 20 minutes ago      PITR restore to the second before it
keep a copy for one year                on-demand backup (or AWS Backup plan)
before a risky migration                on-demand backup, then migrate
```

# EN

## Key idea

DynamoDB has two backup methods, neither **consumes the table's throughput**:

- **PITR** (point-in-time recovery): continuous backups, restore to **any second** within up to **35 days** (`RecoveryPeriodInDays` from 1 to 35, default 35). Disabling and re-enabling resets the start point.
- **On-demand backup**: a full copy of the table when you call it, with **no limit on how many**. Use it for long-term retention or before a big change.
- A restore always creates a **new table**, never overwriting the old one. It can restore into another Region.
- On the new table you must set up again: auto scaling, IAM, CloudWatch metrics and alarms, tags, Streams, TTL, deletion protection, PITR.
- A backup does not guarantee causal consistency across items, though the skew is usually under a second.

Backup and restore exist only on real AWS, so this lesson does not run in the browser yet.

## Example

```text
need                                    choose
undo a mistake from 20 minutes ago      PITR restore to the second before it
keep a copy for one year                on-demand backup (or AWS Backup plan)
before a risky migration                on-demand backup, then migrate
```
