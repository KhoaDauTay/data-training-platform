---
id: e-bp-d11
engine: best
track: dynamodb
level: L3
module: d
title: "Chọn chế độ capacity theo dạng tải"
title_en: "Pick the capacity mode for the traffic"
kind: quiz
minutes: 3
objectives:
  - vi: "Chọn on-demand cho tải chưa biết hoặc đột biến, provisioned có auto scaling cho tải đều và dự báo được."
    en: "Choose on-demand for unknown or spiky traffic, provisioned with auto scaling for steady, predictable traffic."
avoid:
  vi: "Đặt provisioned thấp cho ngày khuyến mãi rồi bị throttle, hoặc đặt cao và trả tiền cho capacity bỏ không."
  en: "Setting low provisioned capacity for a sale day and getting throttled, or setting it high and paying for idle capacity."
requires: [e-dy-l4-06]
skills: []
adv: []
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/capacity-mode.html
verified: { version: "docs.aws.amazon.com", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    {"op": "CreateTable", "input": {"TableName": "Shop", "BillingMode": "PROVISIONED", "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}, "KeySchema": [{"AttributeName": "pk", "KeyType": "HASH"}], "AttributeDefinitions": [{"AttributeName": "pk", "AttributeType": "S"}]}}
  good: |
    {"op": "CreateTable", "input": {"TableName": "Shop", "BillingMode": "PAY_PER_REQUEST", "KeySchema": [{"AttributeName": "pk", "KeyType": "HASH"}], "AttributeDefinitions": [{"AttributeName": "pk", "AttributeType": "S"}]}}
  expect: null
quiz:
  - q:
      vi: "Cửa hàng mới mở, chưa biết lượng truy cập, và có ngày khuyến mãi. Bảng nên bắt đầu ở chế độ nào?"
      en: "A new shop opens, traffic is unknown, and there are sale days. Which mode should the table start in?"
    options:
      - { vi: "Provisioned 5 RCU / 5 WCU", en: "Provisioned at 5 RCU / 5 WCU" }
      - { vi: "On-demand, xem lại khi tải đã đều", en: "On-demand, revisited once traffic is steady" }
      - { vi: "Provisioned thật cao cho chắc", en: "Provisioned very high, to be safe" }
    answer: 1
    why:
      vi: "On-demand tính tiền theo request và tự theo tải, hợp tải chưa biết. Provisioned thấp thì throttle, cao thì trả tiền cho capacity bỏ không. Khi tải đều và dự báo được, provisioned có auto scaling thường rẻ hơn."
      en: "On-demand charges per request and follows the load, which fits unknown traffic. Low provisioned capacity throttles, high provisioned capacity pays for idle units. Once traffic is steady and predictable, provisioned with auto scaling is usually cheaper."
---

## Ý chính

Tải chưa biết, đột biến hoặc nhỏ: **on-demand**. Tải ổn định, dự báo được: **provisioned** kèm auto scaling. Xem lại khi dạng tải đổi.

## Vì sao

- Provisioned đặt thấp thì request bị throttle; đặt cao thì trả tiền cho capacity không dùng.
- On-demand trả theo request nên mỗi đơn vị đắt hơn khi tải đều.
- Docs khuyên provisioned khi tải đều và dự báo được nhu cầu.

## Ví dụ

Thẻ chỉ cú pháp: dynoxide không tính tiền và không throttle, nên hai chế độ chạy như nhau ở đây.

# EN

## Key idea

Unknown, spiky or small traffic: **on-demand**. Steady, predictable traffic: **provisioned** with auto scaling. Revisit when the traffic shape changes.

## Why

- Provisioned set too low gets requests throttled; set too high, you pay for unused capacity.
- On-demand charges per request, so each unit costs more under steady load.
- The docs recommend provisioned for steady workloads whose needs you can forecast.

## Example

Syntax only: dynoxide neither bills nor throttles, so both modes behave the same here.
