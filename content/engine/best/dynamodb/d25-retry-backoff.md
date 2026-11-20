---
id: e-bp-d25
engine: best
track: dynamodb
level: L2
module: d
title: "Thử lại với exponential backoff, có giới hạn"
title_en: "Retry with exponential backoff, bounded"
kind: quiz
minutes: 3
objectives:
  - vi: "Thử lại lỗi throttle và lỗi 5xx với thời gian chờ tăng dần, có jitter và số lần tối đa; không thử lại lỗi do request sai."
    en: "Retry throttling and 5xx errors with growing waits, jitter and a maximum count; never retry errors caused by a bad request."
avoid:
  vi: "Thử lại ngay, mãi mãi, làm khóa nóng nóng thêm."
  en: "Retrying at once, forever, making a hot key hotter."
requires: [e-dy-l2-06]
skills: []
adv: []
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Programming.Errors.html#Programming.Errors.RetryAndBackoff
verified: { version: "docs.aws.amazon.com", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    while (true) { try { await put(item); break; } catch (e) { /* retry at once, forever */ } }
  good: |
    for (let i = 0; i < 5; i++) {
      try { await put(item); break; }
      catch (e) { if (!retryable(e) || i === 4) throw e; await sleep(Math.random() * 50 * 2 ** i); }
    }
  expect: null
quiz:
  - q:
      vi: "Lỗi nào nên thử lại với backoff?"
      en: "Which error should be retried with backoff?"
    options:
      - { vi: "`ValidationException`", en: "`ValidationException`" }
      - { vi: "`ProvisionedThroughputExceededException`", en: "`ProvisionedThroughputExceededException`" }
      - { vi: "`ConditionalCheckFailedException`", en: "`ConditionalCheckFailedException`" }
    answer: 1
    why:
      vi: "Bảng lỗi trong docs ghi lỗi vượt throughput là thử lại được. `ValidationException` là request sai, gửi lại vẫn sai; `ConditionalCheckFailedException` nghĩa là dữ liệu đã đổi, phải đọc lại trước khi quyết định."
      en: "The error table in the docs marks the throughput error as retryable. `ValidationException` is a bad request that stays bad; `ConditionalCheckFailedException` means the data changed, so read again before deciding."
---

## Ý chính

Lỗi throttle và lỗi 5xx được thử lại với thời gian chờ tăng theo cấp số nhân, có jitter và số lần tối đa. SDK của AWS làm sẵn việc này: đừng tắt nó. Lỗi 4xx khác (request sai, điều kiện sai) không thử lại.

## Vì sao

- Thử lại ngay làm khóa nóng nóng thêm.
- Không giới hạn số lần thì một lỗi nhỏ thành hàng đợi request chồng chất.
- Với batch, chỉ gửi lại `UnprocessedItems`, cũng với backoff.

## Ví dụ

Thẻ chỉ cú pháp: dynoxide không throttle, nên không có lỗi nào để thử lại. Mã là JavaScript phía ứng dụng, không phải request DynamoDB.

# EN

## Key idea

Throttling and 5xx errors are retried with exponentially growing waits, jitter and a maximum count. The AWS SDKs do this already: do not turn it off. Other 4xx errors (bad request, false condition) are not retried.

## Why

- Retrying at once makes a hot key hotter.
- With no limit on tries, a small incident turns into a growing queue of requests.
- For batches, resend only `UnprocessedItems`, with backoff too.

## Example

Syntax only: dynoxide never throttles, so there is nothing to retry. The code is application JavaScript, not a DynamoDB request.
