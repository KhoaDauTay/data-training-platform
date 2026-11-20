---
id: e-bp-d23
engine: best
track: dynamodb
level: L3
module: d
title: "Bật deletion protection cho bảng production"
title_en: "Enable deletion protection on production tables"
kind: quiz
minutes: 2
objectives:
  - vi: "Đặt `DeletionProtectionEnabled: true` cho bảng production, và chỉ tắt có chủ đích ngay trước khi xóa thật."
    en: "Set `DeletionProtectionEnabled: true` on production tables, and turn it off on purpose only right before a real delete."
avoid:
  vi: "Một script dọn dẹp chạy nhầm vào production và xóa mất bảng."
  en: "A clean-up script run against the wrong environment that deletes a production table."
requires: [e-dy-l5-04]
skills: []
adv: []
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithTables.Basics.html
verified: { version: "docs.aws.amazon.com", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    {"op": "UpdateTable", "input": {"TableName": "Shop", "DeletionProtectionEnabled": false}}
  good: |
    {"op": "UpdateTable", "input": {"TableName": "Shop", "DeletionProtectionEnabled": true}}
  expect: null
quiz:
  - q:
      vi: "Bảng `Shop` có deletion protection. Một script gọi `DeleteTable` nhầm. Chuyện gì xảy ra?"
      en: "Table `Shop` has deletion protection. A script calls `DeleteTable` by mistake. What happens?"
    options:
      - { vi: "Bảng bị xóa, phải khôi phục từ backup", en: "The table is deleted and must be restored from a backup" }
      - { vi: "Lệnh bị từ chối cho tới khi ai đó tắt deletion protection", en: "The call is refused until someone turns deletion protection off" }
      - { vi: "Bảng vào thùng rác 7 ngày", en: "The table goes to a recycle bin for 7 days" }
    answer: 1
    why:
      vi: "Deletion protection giữ bảng khỏi bị xóa nhầm: `DeleteTable` bị từ chối tới khi thuộc tính này được tắt một cách rõ ràng. Không có thùng rác: khi `DeleteTable` chạy xong, bảng không còn."
      en: "Deletion protection guards the table against accidental deletion: `DeleteTable` is refused until the property is turned off explicitly. There is no recycle bin: once `DeleteTable` finishes, the table no longer exists."
---

## Ý chính

Bảng production có `DeletionProtectionEnabled: true`. Chỉ tắt có chủ đích, qua quy trình, ngay trước khi xóa thật.

## Vì sao

- `DeleteTable` không có thùng rác: xong là bảng không còn.
- Có deletion protection, lệnh xóa bị từ chối cho tới khi ai đó tắt nó.

## Ví dụ

Thẻ chỉ cú pháp: lab chỉ nhận các request đọc và ghi item, không nhận `UpdateTable` hay `DeleteTable`.

# EN

## Key idea

Production tables have `DeletionProtectionEnabled: true`. Turn it off only on purpose, through a process, right before a real delete.

## Why

- `DeleteTable` has no recycle bin: once it finishes, the table is gone.
- With deletion protection, the delete is refused until someone turns it off.

## Example

Syntax only: the lab accepts item read and write requests, not `UpdateTable` or `DeleteTable`.
