---
id: e-bp-m25
engine: best
track: mongodb
level: L4
module: m
title: "Sao lưu theo cỡ dữ liệu, và thử khôi phục"
title_en: "Back up for your size, and test the restore"
kind: quiz
minutes: 3
objectives:
  - vi: "Chọn cách sao lưu theo cỡ deployment (`mongodump` cho dữ liệu nhỏ, snapshot hệ thống tệp hay dịch vụ quản lý cho dữ liệu lớn), ghi ra mục tiêu RPO/RTO, và khôi phục thử định kỳ."
    en: "Pick the backup method by deployment size (`mongodump` for small data, filesystem snapshots or a managed service for large data), write down RPO/RTO targets, and test a restore regularly."
avoid:
  vi: "Phát hiện bản sao lưu không dùng được đúng ngày cần khôi phục."
  en: "Finding out the backup is unusable on the very day you need to restore it."
requires: []
skills: []
adv: []
sources:
  - https://www.mongodb.com/docs/manual/core/backups/
verified: { version: "MongoDB manual 9.0", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    // mongodump on the primary of a 2 TB replica set, every night, never restored
  good: |
    // filesystem snapshot of a secondary (journal on the same volume)
    // + a weekly restore test into a scratch cluster, then count documents
  expect: null
quiz:
  - q:
      vi: "Theo docs, `mongodump` và `mongorestore` hợp nhất với deployment như thế nào?"
      en: "According to the docs, which deployments are `mongodump` and `mongorestore` meant for?"
    options:
      - { vi: "Deployment nhỏ", en: "Small deployments" }
      - { vi: "Cluster nhiều TB", en: "Multi-TB clusters" }
      - { vi: "Mọi cỡ, như nhau", en: "Any size, equally" }
    answer: 0
    why:
      vi: "Docs ghi `mongodump`/`mongorestore` là công cụ cho deployment nhỏ. Dữ liệu lớn dùng snapshot hệ thống tệp hoặc dịch vụ backup quản lý."
      en: "The docs describe `mongodump`/`mongorestore` as tools for small deployments. Large data uses filesystem snapshots or a managed backup service."
---

## Ý chính

Chọn cách sao lưu theo cỡ dữ liệu và mục tiêu khôi phục. Viết ra RPO (mất tối đa bao nhiêu dữ liệu) và RTO (dừng tối đa bao lâu). Mỗi kỳ, khôi phục thử vào một máy riêng và đếm tài liệu.

## Vì sao

- Bản dump nhỏ hơn; snapshot hệ thống tệp lớn hơn vì chứa cả index, và chỉ nhất quán khi journal nằm cùng volume với dữ liệu.
- Bản sao lưu chưa từng khôi phục thử thì chưa biết có dùng được không.
- Thẻ này chỉ cú pháp: đây là công cụ dòng lệnh và quy trình vận hành, không phải lệnh trong `mongosh`.

# EN

## Key idea

Choose the backup method by data size and recovery targets. Write down the RPO (how much data you may lose) and the RTO (how long you may be down). Every cycle, restore into a separate machine and count documents.

## Why

- A dump is smaller; a filesystem snapshot is larger because it includes the indexes, and it is only consistent when the journal sits on the same volume as the data.
- A backup that has never been restored is not known to work.
- This card is syntax only: these are command-line tools and an operations process, not commands in `mongosh`.
