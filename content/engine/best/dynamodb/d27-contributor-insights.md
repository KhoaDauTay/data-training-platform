---
id: e-bp-d27
engine: best
track: dynamodb
level: L4
module: d
title: "Tìm khóa nóng bằng Contributor Insights"
title_en: "Find hot keys with Contributor Insights"
kind: quiz
minutes: 3
objectives:
  - vi: "Khi bị throttle mà tổng capacity còn dư, bật Contributor Insights để thấy khóa được truy cập và bị throttle nhiều nhất."
    en: "When you are throttled while total capacity has room, turn on Contributor Insights to see the most accessed and most throttled keys."
avoid:
  vi: "Nâng capacity mãi cho tới khi hết throttle, trong khi lỗi nằm ở một khóa."
  en: "Raising capacity until the throttling stops, while the fault is one key."
requires: [e-dy-l4-03]
skills: []
adv: []
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/contributorinsights_HowItWorks.html
verified: { version: "docs.aws.amazon.com", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    {"note": "raise provisioned capacity until the throttling stops"}
  good: |
    {"op": "UpdateContributorInsights", "input": {"TableName": "Shop", "ContributorInsightsAction": "ENABLE"}}
  expect: null
quiz:
  - q:
      vi: "Bảng bị throttle dù tổng capacity còn dư. Contributor Insights cho bạn thấy gì?"
      en: "A table is throttled although total capacity has room. What does Contributor Insights show you?"
    options:
      - { vi: "Tổng RCU của bảng", en: "The total RCU of the table" }
      - { vi: "Item được truy cập và bị throttle nhiều nhất, của bảng hay GSI", en: "The most accessed and most throttled items, for a table or GSI" }
      - { vi: "Câu SQL chạy chậm", en: "Slow SQL statements" }
    answer: 1
    why:
      vi: "Con số tổng không chỉ ra khóa nào nóng. Contributor Insights xếp hạng item được truy cập nhiều nhất và bị throttle nhiều nhất, nên bạn sửa đúng khóa (rải khóa, đổi partition key) thay vì đoán."
      en: "Totals never say which key is hot. Contributor Insights ranks the most accessed and most throttled items, so you fix the right key (spread it, change the partition key) instead of guessing."
---

## Ý chính

Khi thấy throttle mà tổng capacity còn dư, bật Contributor Insights cho bảng (và GSI) để xem partition key và item được truy cập, bị throttle nhiều nhất. Sửa khóa theo số đó, không đoán.

## Vì sao

- Con số tổng của bảng không chỉ ra khóa nào nóng.
- Nâng capacity không cứu được một khóa vượt giới hạn của một partition.

## Ví dụ

Thẻ chỉ cú pháp: CloudWatch Contributor Insights không có trong emulator.

# EN

## Key idea

When you see throttling while total capacity has room, turn on Contributor Insights for the table (and GSIs) to see the most accessed and most throttled partition keys and items. Fix keys from those numbers, not from guesses.

## Why

- Table totals never say which key is hot.
- More capacity cannot save one key that exceeds the limit of one partition.

## Example

Syntax only: CloudWatch Contributor Insights is not in the emulator.
