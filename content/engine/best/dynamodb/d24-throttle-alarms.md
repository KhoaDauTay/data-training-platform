---
id: e-bp-d24
engine: best
track: dynamodb
level: L3
module: d
title: "Báo động khi bị throttle, đừng chờ người dùng báo"
title_en: "Alarm on throttling before users notice"
kind: quiz
minutes: 3
objectives:
  - vi: "Đặt CloudWatch alarm trên `ReadThrottleEvents`, `WriteThrottleEvents` và `ThrottledRequests` của bảng và của từng GSI."
    en: "Set CloudWatch alarms on `ReadThrottleEvents`, `WriteThrottleEvents` and `ThrottledRequests` for the table and for each GSI."
avoid:
  vi: "Biết bảng bị throttle qua lời phàn nàn của người dùng."
  en: "Learning about throttling from user complaints."
requires: [e-dy-l4-02]
skills: []
adv: []
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/metrics-dimensions.html
verified: { version: "docs.aws.amazon.com", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    {"note": "no alarms; users report slow checkout first"}
  good: |
    {"MetricName": "WriteThrottleEvents", "Namespace": "AWS/DynamoDB", "Dimensions": [{"Name": "TableName", "Value": "Shop"}, {"Name": "GlobalSecondaryIndexName", "Value": "ByStatus"}], "Statistic": "Sum", "Period": 60, "Threshold": 0, "ComparisonOperator": "GreaterThanThreshold"}
  expect: null
quiz:
  - q:
      vi: "Tổng capacity của bảng còn dư, nhưng người dùng báo ghi chậm. Metric nào chỉ ra nguyên nhân?"
      en: "The table has capacity to spare overall, but users report slow writes. Which metric points to the cause?"
    options:
      - { vi: "Số item trong bảng", en: "The number of items in the table" }
      - { vi: "`ConsumedWriteCapacityUnits` của cả bảng", en: "The `ConsumedWriteCapacityUnits` of the whole table" }
      - { vi: "`WriteThrottleEvents` của bảng và của từng GSI", en: "The `WriteThrottleEvents` of the table and of each GSI" }
    answer: 2
    why:
      vi: "Tổng capacity có thể còn dư trong khi một khóa nóng hay một GSI bị throttle. Số sự kiện throttle, tách theo bảng và theo `GlobalSecondaryIndexName`, mới chỉ ra chỗ hỏng."
      en: "Total capacity can have room while one hot key or one GSI is throttled. Throttle event counts, split by table and by `GlobalSecondaryIndexName`, show where it breaks."
---

## Ý chính

Đặt CloudWatch alarm trên `ReadThrottleEvents`, `WriteThrottleEvents` và `ThrottledRequests` của bảng **và của từng GSI**, cùng capacity đã dùng so với mức cấp.

## Vì sao

- GSI có metric throttle riêng, theo dimension `GlobalSecondaryIndexName`.
- Khóa nóng chỉ lộ ra qua số throttle, vì tổng capacity vẫn còn dư.

## Ví dụ

Thẻ chỉ cú pháp: CloudWatch không có trong emulator, và dynoxide không throttle.

# EN

## Key idea

Set CloudWatch alarms on `ReadThrottleEvents`, `WriteThrottleEvents` and `ThrottledRequests` for the table **and for each GSI**, plus consumed capacity against what is provisioned.

## Why

- A GSI has its own throttle metrics, under the `GlobalSecondaryIndexName` dimension.
- A hot key only shows up in throttle counts, because total capacity still has room.

## Example

Syntax only: CloudWatch is not in the emulator, and dynoxide never throttles.
