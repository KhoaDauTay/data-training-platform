---
id: e-bp-d22
engine: best
track: dynamodb
level: L4
module: d
title: "Bật point-in-time recovery cho bảng quan trọng"
title_en: "Turn on point-in-time recovery"
kind: quiz
minutes: 3
objectives:
  - vi: "Bật PITR cho mọi bảng chứa dữ liệu không tạo lại được, và đặt `RecoveryPeriodInDays` theo nhu cầu."
    en: "Turn on PITR for every table holding data you cannot rebuild, and set `RecoveryPeriodInDays` to what you need."
avoid:
  vi: "Một job ghi sai hay một lệnh xóa nhầm không còn đường quay lại."
  en: "A bad write job or a mistaken delete with no way back."
requires: [e-dy-l5-04]
skills: []
adv: []
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Point-in-time-recovery.html
verified: { version: "docs.aws.amazon.com", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    {"op": "UpdateContinuousBackups", "input": {"TableName": "Shop", "PointInTimeRecoverySpecification": {"PointInTimeRecoveryEnabled": false}}}
  good: |
    {"op": "UpdateContinuousBackups", "input": {"TableName": "Shop", "PointInTimeRecoverySpecification": {"PointInTimeRecoveryEnabled": true, "RecoveryPeriodInDays": 35}}}
  expect: null
quiz:
  - q:
      vi: "Bảng bật PITR với mặc định. Bạn khôi phục được về thời điểm nào?"
      en: "A table has PITR on with the defaults. To which points in time can you restore?"
    options:
      - { vi: "Chỉ nửa đêm mỗi ngày", en: "Only midnight of each day" }
      - { vi: "Bất kỳ giây nào trong 35 ngày gần nhất", en: "Any second in the last 35 days" }
      - { vi: "Chỉ các backup bạn tự tạo", en: "Only backups you made yourself" }
    answer: 1
    why:
      vi: "PITR giữ điểm khôi phục theo từng giây, mặc định 35 ngày (`RecoveryPeriodInDays` đặt được từ 1 tới 35). Khôi phục tạo ra một bảng mới, rồi bạn chép lại phần cần."
      en: "PITR keeps recovery points per second, 35 days by default (`RecoveryPeriodInDays` can be set from 1 to 35). A restore creates a new table, and you copy back what you need."
---

## Ý chính

Mọi bảng chứa dữ liệu không tạo lại được thì bật PITR, và đặt `RecoveryPeriodInDays` theo nhu cầu (mặc định 35, được 1–35). Backup theo yêu cầu dùng cho mốc giữ lâu dài.

## Vì sao

- PITR do DynamoDB quản lý, giữ điểm khôi phục tới từng giây.
- Một job ghi sai được sửa bằng cách khôi phục ra bảng mới ở thời điểm trước đó.

## Ví dụ

Thẻ chỉ cú pháp: dynoxide 1.5.0 không có backup (`UpdateContinuousBackups` trả `UnsupportedOperation`).

# EN

## Key idea

Every table holding data you cannot rebuild has PITR on, with `RecoveryPeriodInDays` set to what you need (35 by default, 1–35 allowed). On-demand backups cover long-term milestones.

## Why

- PITR is managed by DynamoDB and keeps recovery points down to the second.
- A bad write job is fixed by restoring to a new table at a moment before it ran.

## Example

Syntax only: dynoxide 1.5.0 has no backups (`UpdateContinuousBackups` returns `UnsupportedOperation`).
