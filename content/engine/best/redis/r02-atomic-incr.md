---
id: e-bp-r02
engine: best
track: redis
level: L1
module: r
title: "Tăng giảm bằng INCR/DECR, không đọc rồi ghi"
title_en: "Count with INCR/DECR, not read-then-write"
kind: quiz
minutes: 3
objectives:
  - vi: "Đổi một bộ đếm bằng một lệnh nguyên tử (`INCR`, `DECR`, `INCRBY`) thay vì `GET` rồi `SET`."
    en: "Change a counter with one atomic command (`INCR`, `DECR`, `INCRBY`) instead of `GET` then `SET`."
avoid:
  vi: "Hai ứng dụng cùng đọc một số rồi cùng ghi đè: một lần trừ kho bị mất."
  en: "Two applications read the same number and both overwrite it: one stock decrement is lost."
requires: [e-rd-l1-01, e-rd-l2-02]
skills: []
adv: []
sources:
  - https://valkey.io/commands/incr/
  - https://valkey.io/commands/decr/
verified: { version: "BoonData Redis interpreter (Valkey 8.1 wording)", date: "2026-11-27" }
pair:
  runtime: redis
  check: diff
  setup: |
    SET stock:sku9 10
  bad: |
    # app A reads 10
    GET stock:sku9
    # app B reads 10
    GET stock:sku9
    # A writes 10 - 1
    SET stock:sku9 9
    # B writes 10 - 1
    SET stock:sku9 9
    GET stock:sku9
  good: |
    # app A
    DECR stock:sku9
    # app B
    DECR stock:sku9
    GET stock:sku9
  expect: null
quiz:
  - q:
      vi: "Kho đang là 10. Hai ứng dụng cùng `GET stock:sku9` (cả hai thấy 10) rồi mỗi bên `SET stock:sku9 9`. Kho còn bao nhiêu, và đúng ra phải là bao nhiêu?"
      en: "Stock is 10. Two applications both `GET stock:sku9` (both see 10), then each runs `SET stock:sku9 9`. What is the stock now, and what should it be?"
    options:
      - { vi: "Còn 9, đúng ra là 8", en: "It is 9, it should be 8" }
      - { vi: "Còn 8, đúng ra là 8", en: "It is 8, it should be 8" }
      - { vi: "Redis báo lỗi vì hai lệnh `SET` trùng nhau", en: "Redis returns an error because the two `SET` commands clash" }
    answer: 0
    why:
      vi: "Hai lệnh `SET` không xung đột gì: lệnh sau ghi đè lệnh trước, nên Redis không báo lỗi. Cả hai ứng dụng tính 10 − 1 từ cùng một lần đọc, nên kho thành 9 dù đã bán hai món: một lần trừ bị mất. `DECR` đọc và trừ ngay trong máy chủ, trong một lệnh, nên hai lần `DECR` luôn ra 8."
      en: "The two `SET` commands do not clash: the second simply overwrites the first, so Redis returns no error. Both applications computed 10 − 1 from the same read, so the stock becomes 9 although two items were sold: one decrement is lost. `DECR` reads and subtracts inside the server, in one command, so two `DECR` calls always give 8."
---

## Ý chính

Đổi một con số trong Redis bằng một lệnh nguyên tử: `INCR`, `DECR`, `INCRBY`, `HINCRBY`. Không `GET` về ứng dụng, cộng trừ, rồi `SET` lại.

## Vì sao

- Redis chạy từng lệnh một, trọn vẹn. `DECR` đọc và ghi trong cùng một lệnh, nên không ứng dụng nào chen vào giữa.
- Với `GET` rồi `SET`, hai ứng dụng có thể đọc cùng một giá trị trước khi bên nào kịp ghi. Bên ghi sau xóa mất kết quả của bên ghi trước (lost update).
- Bản Không nên mô phỏng đúng thứ tự đó trong một kịch bản: kho còn `"9"` sau hai lần bán. Bản Nên dùng hai lần `DECR` và còn `"8"`.
- Cần đọc rồi quyết định (ví dụ chỉ trừ khi còn hàng) thì dùng `WATCH` với `MULTI`/`EXEC`, ở thẻ `e-bp-r05`.

# EN

## Key idea

Change a number in Redis with one atomic command: `INCR`, `DECR`, `INCRBY`, `HINCRBY`. Do not `GET` it into the application, add or subtract, then `SET` it back.

## Why

- Redis runs one command at a time, completely. `DECR` reads and writes in the same command, so no other application can get in between.
- With `GET` then `SET`, two applications can read the same value before either has written. The one that writes last wipes out the other's result (a lost update).
- The Avoid version replays exactly that order in one script: the stock is `"9"` after two sales. The Prefer version uses two `DECR` calls and ends at `"8"`.
- When you must read and then decide (for example, decrement only while stock lasts), use `WATCH` with `MULTI`/`EXEC`, on card `e-bp-r05`.
