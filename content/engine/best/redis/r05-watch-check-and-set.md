---
id: e-bp-r05
engine: best
track: redis
level: L2
module: r
title: "Đọc rồi ghi thì WATCH khóa trước"
title_en: "WATCH the key before a read-then-write"
kind: quiz
minutes: 4
objectives:
  - vi: "Dùng `WATCH` trước khi đọc, để `EXEC` hủy giao dịch (trả `(nil)`) nếu client khác đã đổi khóa."
    en: "Use `WATCH` before reading, so `EXEC` aborts the transaction (answers `(nil)`) when another client changed the key."
avoid:
  vi: "`MULTI`/`EXEC` ghi đè một giá trị mà client khác vừa đổi, vì `MULTI` một mình không kiểm tra gì."
  en: "`MULTI`/`EXEC` overwriting a value another client has just changed, because `MULTI` alone checks nothing."
requires: [e-rd-l2-03]
skills: []
adv: []
sources:
  - https://valkey.io/topics/transactions/
  - https://valkey.io/commands/watch/
verified: { version: "BoonData Redis interpreter (Valkey 8.1 wording)", date: "2026-11-27" }
pair:
  runtime: redis
  check: diff
  setup: |
    SET stock:sku9 5
  bad: |
    GET stock:sku9
    @client 1
    DECR stock:sku9
    @client 0
    MULTI
    SET stock:sku9 4
    EXEC
  good: |
    WATCH stock:sku9
    GET stock:sku9
    @client 1
    DECR stock:sku9
    @client 0
    MULTI
    SET stock:sku9 4
    EXEC
  expect: null
quiz:
  - q:
      vi: "Client A chạy `WATCH stock:sku9`, đọc được 5. Client B chạy `DECR stock:sku9`. A gửi `MULTI`, `SET stock:sku9 4`, `EXEC`. `EXEC` trả gì?"
      en: "Client A runs `WATCH stock:sku9` and reads 5. Client B runs `DECR stock:sku9`. A sends `MULTI`, `SET stock:sku9 4`, `EXEC`. What does `EXEC` return?"
    options:
      - { vi: "`OK`, và kho thành 4", en: "`OK`, and the stock becomes 4" }
      - { vi: "`(nil)`: giao dịch bị hủy, kho vẫn là 4 do B trừ", en: "`(nil)`: the transaction is aborted, the stock stays at the 4 left by B" }
      - { vi: "Lỗi `EXECABORT` vì `SET` sai cú pháp", en: "An `EXECABORT` error because `SET` has a syntax error" }
    answer: 1
    why:
      vi: "`SET stock:sku9 4` đúng cú pháp, nên không có `EXECABORT`. Khóa đã bị B đổi sau khi A `WATCH`, nên `EXEC` hủy cả giao dịch và trả `(nil)`: lệnh `SET` của A không chạy, kho giữ giá trị 4 mà `DECR` của B để lại. A đọc lại rồi thử lần nữa. Không có `WATCH`, `EXEC` trả `OK` và ghi 4 đè lên số 4 của B: hai món đã bán mà kho chỉ giảm 1."
      en: "`SET stock:sku9 4` is valid, so there is no `EXECABORT`. B changed the key after A's `WATCH`, so `EXEC` aborts the whole transaction and answers `(nil)`: A's `SET` does not run, and the stock keeps the 4 left by B's `DECR`. A reads again and retries. Without `WATCH`, `EXEC` answers `OK` and writes 4 over B's 4: two items were sold but the stock only went down by 1."
---

## Ý chính

Khi phải đọc một khóa, quyết định, rồi ghi, hãy `WATCH` khóa đó trước khi đọc. Nếu client khác đổi khóa trước `EXEC`, giao dịch bị hủy (`EXEC` trả `(nil)`) và bạn thử lại.

## Vì sao

- `MULTI`/`EXEC` chỉ bảo đảm các lệnh trong khối chạy liền nhau. Nó không kiểm tra giá trị bạn đã đọc trước `MULTI` còn đúng không.
- `WATCH` là khóa lạc quan (optimistic locking): Redis nhớ khóa đó, và nếu nó bị đổi thì `EXEC` không chạy lệnh nào.
- Trong kịch bản, `@client 1` là cách bộ mô phỏng gửi lệnh từ client thứ hai; `@client 0` quay về client đầu.
- Bản Không nên: `EXEC` trả `OK`, ghi 4 đè lên giá trị client B vừa đổi, nên một lần bán bị mất. Bản Nên: `EXEC` trả `(nil)`, không ghi đè gì.

# EN

## Key idea

When you must read a key, decide, then write, `WATCH` the key before reading. If another client changes it before `EXEC`, the transaction is aborted (`EXEC` answers `(nil)`) and you retry.

## Why

- `MULTI`/`EXEC` only guarantees that the commands in the block run back to back. It does not check that the value you read before `MULTI` is still current.
- `WATCH` is optimistic locking: Redis remembers the key, and if it changes, `EXEC` runs none of the commands.
- In the script, `@client 1` is how the simulation sends commands from a second client; `@client 0` goes back to the first one.
- Avoid: `EXEC` answers `OK` and writes 4 over the value client B has just changed, so one sale is lost. Prefer: `EXEC` answers `(nil)` and overwrites nothing.
