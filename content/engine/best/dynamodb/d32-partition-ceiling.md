---
id: e-bp-d32
engine: best
track: dynamodb
level: L4
module: d
title: "Adaptive capacity không vượt trần mỗi partition"
title_en: "Adaptive capacity cannot lift the per-partition ceiling"
kind: quiz
minutes: 3
objectives:
  - vi: "Nhận ra một partition key cần gần 3.000 RCU hay 1.000 WCU mỗi giây, và đổi thiết kế (rải khóa, cache đọc) thay vì trông vào adaptive capacity."
    en: "Spot a single partition key that needs close to 3,000 RCU or 1,000 WCU per second, and change the design (spread the key, cache reads) instead of counting on adaptive capacity."
avoid:
  vi: "Một khóa bình chọn nhận 5.000 lần ghi mỗi giây và bị throttle dù bảng còn dư."
  en: "One voting key taking 5,000 writes per second and getting throttled while the table has room."
requires: [e-dy-l4-02]
skills: []
adv: []
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/burst-adaptive-capacity.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html
verified: { version: "docs.aws.amazon.com", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    {"op": "UpdateItem", "input": {"TableName": "Votes", "Key": {"pk": {"S": "VOTE#show42"}}, "UpdateExpression": "ADD n :one", "ExpressionAttributeValues": {":one": {"N": "1"}}}}
  good: |
    {"op": "UpdateItem", "input": {"TableName": "Votes", "Key": {"pk": {"S": "VOTE#show42#7"}}, "UpdateExpression": "ADD n :one", "ExpressionAttributeValues": {":one": {"N": "1"}}}}
  expect: null
quiz:
  - q:
      vi: "Một partition key cần 5.000 lần ghi mỗi giây, bảng còn rất nhiều capacity. Adaptive capacity có giúp đủ không?"
      en: "One partition key needs 5,000 writes per second, and the table has plenty of capacity. Is adaptive capacity enough?"
    options:
      - { vi: "Có, nó dồn capacity cho partition nóng", en: "Yes, it shifts capacity to the hot partition" }
      - { vi: "Không: mỗi partition tối đa 1.000 đơn vị ghi mỗi giây, phải rải khóa", en: "No: one partition takes at most 1,000 write units per second, so spread the key" }
      - { vi: "Có, nếu chuyển sang on-demand", en: "Yes, after switching to on-demand" }
    answer: 1
    why:
      vi: "Adaptive capacity dồn throughput cho partition nóng và có thể tách item hay truy cập ra partition riêng, nhưng mỗi partition vẫn tối đa 3.000 đơn vị đọc và 1.000 đơn vị ghi mỗi giây. Một khóa cần hơn thế phải được rải ra nhiều khóa."
      en: "Adaptive capacity shifts throughput to a hot partition and can isolate frequently accessed items, but each partition still tops out at 3,000 read units and 1,000 write units per second. A key that needs more must be spread over several keys."
---

## Ý chính

Một partition key đơn lẻ có nhu cầu gần 3.000 RCU hay 1.000 WCU mỗi giây thì phải đổi thiết kế: rải khóa bằng hậu tố, cache phần đọc. Không trông vào adaptive capacity hay on-demand.

## Vì sao

- Adaptive capacity dồn throughput cho partition nóng, và có thể tách item hay truy cập ra partition riêng.
- Nhưng mỗi partition tối đa 3.000 đơn vị đọc và 1.000 đơn vị ghi mỗi giây.

## Ví dụ

Thẻ chỉ cú pháp: dynoxide chạy một nút, không mô phỏng partition hay throttle. Bản Nên ghi vào khóa con `#7`, một trong 10 hậu tố chọn ngẫu nhiên.

# EN

## Key idea

A single partition key that needs close to 3,000 RCU or 1,000 WCU per second needs a new design: spread the key with suffixes, cache the reads. Do not count on adaptive capacity or on-demand.

## Why

- Adaptive capacity shifts throughput to a hot partition, and can isolate frequently accessed items on their own partition.
- But each partition tops out at 3,000 read units and 1,000 write units per second.

## Example

Syntax only: dynoxide runs as one node and simulates neither partitions nor throttling. The Prefer version writes to sub-key `#7`, one of 10 suffixes picked at random.
