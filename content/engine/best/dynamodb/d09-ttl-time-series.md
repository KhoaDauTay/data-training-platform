---
id: e-bp-d09
engine: best
track: dynamodb
level: L3
module: d
title: "Dữ liệu hết hạn: TTL, không job xóa"
title_en: "Expiring data: TTL, not a delete job"
kind: quiz
minutes: 3
objectives:
  - vi: "Bật TTL với một thuộc tính epoch giây cho dữ liệu hết hạn, và vẫn lọc theo thời gian khi đọc."
    en: "Turn on TTL with an epoch-seconds attribute for expiring data, and still filter on time when you read."
avoid:
  vi: "Một job đêm `Scan` rồi xóa từng item, trả tiền đọc và ghi cho việc dọn rác."
  en: "A nightly job that runs a `Scan` and deletes item by item, paying reads and writes to take out the trash."
requires: [e-dy-l5-02]
skills: []
adv: []
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-time-series.html
verified: { version: "docs.aws.amazon.com", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    {"op": "BatchWriteItem", "input": {"RequestItems": {"Sessions": [{"DeleteRequest": {"Key": {"pk": {"S": "SESSION#ab12"}, "sk": {"S": "META"}}}}]}}}
  good: |
    {"op": "UpdateTimeToLive", "input": {"TableName": "Sessions", "TimeToLiveSpecification": {"Enabled": true, "AttributeName": "expiresAt"}}}
  expect: null
quiz:
  - q:
      vi: "Một phiên đăng nhập có `expiresAt` đã qua 1 giờ, TTL đang bật. `Query` có còn trả item đó không?"
      en: "A login session has an `expiresAt` 1 hour in the past, and TTL is on. Can a `Query` still return that item?"
    options:
      - { vi: "Không bao giờ", en: "Never" }
      - { vi: "Có thể: TTL xóa trong vòng vài ngày, nên câu đọc vẫn phải lọc theo `expiresAt`", en: "It can: TTL deletes within a few days, so reads still filter on `expiresAt`" }
      - { vi: "Chỉ khi đọc strongly consistent", en: "Only with a strongly consistent read" }
    answer: 1
    why:
      vi: "Docs chính thức nói item hết hạn thường bị xóa trong vài ngày, và việc xóa không tốn throughput ghi. Trong lúc chờ, item vẫn đọc được, nên câu đọc cần `FilterExpression` trên `expiresAt`."
      en: "The official docs say expired items are usually deleted within a few days, without consuming write throughput. Until then the item can still be read, so reads need a `FilterExpression` on `expiresAt`."
---

## Ý chính

Dữ liệu có hạn (phiên đăng nhập, log ngắn hạn) mang một thuộc tính thời điểm hết hạn kiểu epoch giây, và bảng bật TTL trên thuộc tính đó. Chuỗi thời gian lớn thì docs gợi ý một bảng cho mỗi kỳ, kỳ cũ giảm capacity hoặc lưu trữ.

## Vì sao

- Xóa bằng `DeleteItem` hay `BatchWriteItem` tốn WCU, cộng thêm `Scan` để tìm item cũ.
- TTL xóa không tốn throughput ghi.
- TTL không xóa ngay: đọc vẫn phải lọc theo thời gian.

## Ví dụ

Thẻ chỉ cú pháp: dynoxide 1.5.0 trả `UnsupportedOperation` cho `UpdateTimeToLive`, và thời gian chờ xóa của TTL không mô phỏng được. Item mang TTL trông như `{"pk": {"S": "SESSION#ab12"}, "expiresAt": {"N": "1764547200"}}`.

# EN

## Key idea

Data with a lifetime (login sessions, short-lived logs) carries an expiry attribute in epoch seconds, and the table turns TTL on for that attribute. For large time series the docs suggest one table per period, with older periods scaled down or archived.

## Why

- Deleting with `DeleteItem` or `BatchWriteItem` costs WCU, plus a `Scan` to find the old items.
- TTL deletes without consuming write throughput.
- TTL does not delete at once: reads still filter on time.

## Example

Syntax only: dynoxide 1.5.0 returns `UnsupportedOperation` for `UpdateTimeToLive`, and the delay before TTL deletes cannot be simulated. An item with TTL looks like `{"pk": {"S": "SESSION#ab12"}, "expiresAt": {"N": "1764547200"}}`.
