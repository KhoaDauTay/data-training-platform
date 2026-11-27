---
id: e-rd-l2-03
engine: redis
level: L2
module: atomic
title: Giao dịch MULTI, EXEC và WATCH
title_en: MULTI, EXEC and WATCH transactions
kind: lab
runtime: browser
minutes: 20
requires: [e-rd-l2-02]
figures: [{ name: rd-watch-race, at: idea }]
objectives:
  - vi: Gom nhiều lệnh chạy liền một mạch bằng MULTI và EXEC.
    en: Run several commands back to back with MULTI and EXEC.
  - vi: Hiểu rằng Redis không hoàn tác, lỗi lúc chạy nằm lại trong ô của nó, lỗi lúc xếp hàng hủy cả giao dịch.
    en: Understand that Redis has no rollback, a runtime error stays in its slot, a queueing error cancels the whole transaction.
  - vi: Dùng WATCH để EXEC bỏ cuộc khi người khác vừa đổi khóa.
    en: Use WATCH so EXEC gives up when someone else just changed the key.
sources:
  - { url: "https://valkey.io/topics/transactions/", title: "Valkey docs: Transactions", title_vi: "Tài liệu Valkey: transaction" }
  - { url: "https://valkey.io/commands/watch/", title: "Valkey docs: WATCH", title_vi: "Tài liệu Valkey: WATCH" }
  - { url: "https://redis.io/docs/latest/develop/interact/transactions/", title: "Redis docs: Transactions", title_vi: "Tài liệu Redis: transaction" }
lab:
  setup: |
    SET stock:p05 2
    SET stock:p06 3
    SET name:shop "Lantern Market"
  steps:
    - task:
        vi: "Giữ một chiếc `p05` cho đơn `o201`: trừ `stock:p05` đi 1 và xếp `o201` vào cuối `orders:pack`, hai lệnh chạy liền trong một giao dịch."
        en: "Hold one `p05` for order `o201`: take 1 off `stock:p05` and put `o201` at the end of `orders:pack`, both commands in one transaction."
      solution: |
        MULTI
        DECR stock:p05
        RPUSH orders:pack o201
        EXEC
      check: doc
      after: |
        GET stock:p05
        LRANGE orders:pack 0 -1
      hint:
        vi: "`MULTI`, hai lệnh (mỗi lệnh trả `QUEUED`), rồi `EXEC` chạy cả hai và trả một mảng."
        en: "`MULTI`, the two commands (each replies `QUEUED`), then `EXEC` runs both and returns an array."
    - task:
        vi: "Xem Redis không hoàn tác: trong một giao dịch, trước hết `INCR name:shop` (lệnh này sẽ lỗi lúc chạy), rồi trừ chiếc `p05` cuối cùng khỏi kho."
        en: "See that Redis does not roll back: in one transaction, first `INCR name:shop` (it will fail when it runs), then take the last `p05` off the stock."
      solution: |
        MULTI
        INCR name:shop
        DECR stock:p05
        EXEC
      check: doc
      after: GET stock:p05
      hint:
        vi: "Cả hai lệnh được xếp hàng; `EXEC` trả lỗi ở ô thứ nhất và số 0 ở ô thứ hai."
        en: "Both commands queue; `EXEC` returns an error in the first slot and 0 in the second."
    - task:
        vi: "Giữ một chiếc `p06` theo cách lạc quan: theo dõi `stock:p06` trước, rồi trừ 1 trong một giao dịch."
        en: "Hold one `p06` the optimistic way: watch `stock:p06` first, then take 1 off it in a transaction."
      solution: |
        WATCH stock:p06
        MULTI
        DECR stock:p06
        EXEC
      check: doc
      after: GET stock:p06
      hint:
        vi: "`WATCH` đứng trước `MULTI`."
        en: "`WATCH` comes before `MULTI`."
    - task:
        vi: "Gõ thử một giao dịch có lệnh sai số đối số, `DECR stock:p06 1`, rồi `EXEC`. Bước này đạt khi Redis hủy cả giao dịch."
        en: "Try a transaction with a command that has the wrong number of arguments, `DECR stock:p06 1`, then `EXEC`. This step passes when Redis cancels the whole transaction."
      solution: |
        MULTI
        DECR stock:p06 1
        EXEC
      check: doc
      error: EXECABORT
      hint:
        vi: "Lỗi lúc xếp hàng làm `EXEC` trả `EXECABORT`."
        en: "An error while queueing makes `EXEC` answer `EXECABORT`."
    - task:
        vi: "Bắt đầu một giao dịch trừ `stock:p06`, rồi đổi ý và bỏ nó, để kho không đổi."
        en: "Start a transaction that takes 1 off `stock:p06`, then change your mind and drop it, so the stock does not change."
      solution: |
        MULTI
        DECR stock:p06
        DISCARD
      check: doc
      after: GET stock:p06
      hint:
        vi: "`DISCARD` bỏ mọi lệnh đang xếp hàng."
        en: "`DISCARD` drops every queued command."
quiz:
  - q:
      vi: "`MULTI`, `INCR name:shop`, `SET done yes`, `EXEC`. Lệnh `INCR` lỗi lúc chạy vì `name:shop` không phải số. Sau đó `done` thế nào?"
      en: "`MULTI`, `INCR name:shop`, `SET done yes`, `EXEC`. The `INCR` fails when it runs because `name:shop` is not a number. What about `done` afterwards?"
    options:
      - { vi: "Không có, cả giao dịch bị hoàn tác", en: "Missing, the whole transaction rolled back" }
      - { vi: "Không có, EXEC trả EXECABORT", en: "Missing, EXEC answered EXECABORT" }
      - { vi: "Có, `done` là `yes`", en: "Present, `done` is `yes`" }
    answer: 2
    trap: 0
    why:
      vi: "Quen với SQL thì dễ nghĩ một lệnh lỗi làm cả giao dịch hoàn tác, nhưng Redis không có hoàn tác (rollback): `EXEC` chạy hết các lệnh đã xếp hàng, lỗi của `INCR` nằm trong ô của nó, và `SET done yes` vẫn chạy. `EXECABORT` chỉ đến khi lỗi xảy ra lúc xếp hàng, như sai tên lệnh hay sai số đối số. Vì vậy hãy kiểm tra dữ liệu trước khi `EXEC`, không trông vào hoàn tác."
      en: "Coming from SQL it is easy to think a failing command rolls the whole transaction back, but Redis has no rollback: `EXEC` runs every queued command, the `INCR` error stays in its slot, and `SET done yes` still runs. `EXECABORT` only comes when the error happens while queueing, such as a wrong command name or a wrong number of arguments. So check your data before `EXEC`; do not count on a rollback."
  - q:
      vi: "Bạn `WATCH stock:p06`, mở `MULTI`, xếp `DECR stock:p06`. Trước khi bạn gửi `EXEC`, một client khác ghi `SET stock:p06 0`. `EXEC` trả gì?"
      en: "You `WATCH stock:p06`, open `MULTI`, queue `DECR stock:p06`. Before you send `EXEC`, another client writes `SET stock:p06 0`. What does `EXEC` return?"
    options:
      - { vi: "`(nil)`, không lệnh nào chạy", en: "`(nil)`, no command ran" }
      - { vi: "Một lỗi `WATCH` xung đột", en: "A `WATCH` conflict error" }
      - { vi: "`1) (integer) -1`", en: "`1) (integer) -1`" }
    answer: 0
    trap: 1
    why:
      vi: "Nghe như phải có một lỗi báo xung đột, nhưng Redis báo bằng một câu trả lời rỗng: khóa bị theo dõi đã đổi, nên `EXEC` không chạy gì và trả `(nil)`. Nếu không có `WATCH`, `DECR` sẽ chạy trên số 0 và ra -1, tức bán lố. Nhận `(nil)` thì ứng dụng đọc lại kho rồi thử lại từ `WATCH`."
      en: "It sounds as if there must be a conflict error, but Redis signals it with an empty reply: the watched key changed, so `EXEC` runs nothing and returns `(nil)`. Without `WATCH`, the `DECR` would run on 0 and give -1, an oversale. On `(nil)` the app reads the stock again and retries from `WATCH`."
---
## Mở bài

Đợt giảm giá chớp nhoáng của Chợ Lồng Đèn chỉ có vài chiếc đèn, và nhiều khách cùng bấm mua. Muốn trừ kho và ghi đơn liền một mạch, không bán lố, Redis có giao dịch (transaction) `MULTI`/`EXEC` và khóa lạc quan `WATCH`. Nhưng giao dịch của Redis khác SQL ở một chỗ quan trọng: không có hoàn tác.

## Ý chính

**Xếp hàng rồi chạy.** Sau `MULTI`, mỗi lệnh không chạy ngay mà trả `QUEUED`. `EXEC` chạy cả hàng liền một mạch: không lệnh của client nào khác chen vào giữa, và câu trả lời là một mảng, mỗi lệnh một ô. `DISCARD` bỏ cả hàng.

**Không có hoàn tác.** Một lệnh lỗi lúc chạy (ví dụ `INCR` trên chữ) chỉ để lại một lỗi trong ô của nó; các lệnh khác vẫn chạy và kết quả của chúng ở lại. Khác hẳn, một lỗi lúc xếp hàng (sai tên lệnh, sai số đối số) đánh dấu giao dịch hỏng, và `EXEC` trả `EXECABORT` mà không chạy gì. Redis chọn như vậy vì lỗi lúc chạy là lỗi lập trình cần sửa trong code, không phải tình huống cần hoàn tác.

**WATCH: khóa lạc quan.** `WATCH key` trước `MULTI` nghĩa là: nếu khóa này đổi trước khi tôi gửi `EXEC`, đừng chạy gì cả. Khi có client khác ghi vào khóa (hoặc khóa hết hạn), `EXEC` trả `(nil)` và ứng dụng đọc lại rồi thử lại. Không ai bị chặn chờ; chỉ người đến sau phải thử lại, nên khi tranh chấp ít, cách này nhanh hơn khóa thật.

**Hai client trong bài.** Ví dụ dùng dòng `@client 1` để gửi lệnh như một client khác, rồi `@client 0` để quay về; ô lệnh của lab luôn là client 0.

Hình cuối mục cho thấy client khác ghi chen vào giữa `WATCH` và `EXEC`.

## Cú pháp

```redis
MULTI
DECR stock:p05
RPUSH orders:pack o201
EXEC
WATCH stock:p06
DISCARD
UNWATCH
```

- Trong `MULTI`, mỗi lệnh trả `QUEUED`; `EXEC` trả một mảng.
- `EXEC` trả `(nil)` khi khóa bị `WATCH` đã đổi.

## Ví dụ

Trừ kho và ghi đơn liền một mạch:

```redis
MULTI
DECR stock:p05
RPUSH orders:pack o201
EXEC
```

Client 1 ghi chen vào giữa: `EXEC` của client 0 bỏ cuộc.

```redis
WATCH stock:p06
MULTI
DECR stock:p06
@client 1
SET stock:p06 0
@client 0
EXEC
```

Không ai chen vào: `EXEC` chạy.

```redis
WATCH stock:p06
MULTI
DECR stock:p06
EXEC
```

## Lỗi hay gặp

Sai số đối số lúc xếp hàng: cả giao dịch bị hủy.

```redis
# ERROR EXECABORT
MULTI
DECR stock:p06 1
EXEC
```

Đọc kho rồi trừ mà không `WATCH`: client khác bán hết ở giữa, kho thành -1.

```redis
# WRONG
GET stock:p06
@client 1
SET stock:p06 0
@client 0
DECR stock:p06
```

```redis
# FIX
WATCH stock:p06
GET stock:p06
@client 1
SET stock:p06 0
@client 0
MULTI
DECR stock:p06
EXEC
```

`EXEC` khi chưa mở `MULTI`:

```redis
# ERROR ERR
EXEC
```

## Thực hành

Năm bước: một giao dịch trừ kho và ghi đơn, một giao dịch có lỗi lúc chạy, một giao dịch có `WATCH`, một giao dịch bị hủy lúc xếp hàng, và một giao dịch bỏ bằng `DISCARD`.

## Tóm tắt

- `MULTI` xếp hàng, `EXEC` chạy liền một mạch và trả một mảng; `DISCARD` bỏ.
- Không có hoàn tác: lỗi lúc chạy nằm trong ô của nó, các lệnh khác vẫn chạy.
- Lỗi lúc xếp hàng làm `EXEC` trả `EXECABORT`, không lệnh nào chạy.
- `WATCH` làm `EXEC` trả `(nil)` khi khóa đã đổi; ứng dụng đọc lại và thử lại.

# EN

## Opening

Lantern Market's flash sale has only a few lanterns, and many customers click buy at once. To take stock and record the order back to back without overselling, Redis has `MULTI`/`EXEC` transactions and the optimistic `WATCH`. But Redis transactions differ from SQL in one important way: there is no rollback.

## Key idea

**Queue, then run.** After `MULTI`, each command does not run at once but replies `QUEUED`. `EXEC` runs the whole queue back to back: no other client's command gets in between, and the reply is an array, one slot per command. `DISCARD` drops the queue.

**No rollback.** A command that fails when it runs (for example `INCR` on text) only leaves an error in its slot; the other commands still run and their results stay. In contrast, an error while queueing (a wrong command name, a wrong number of arguments) marks the transaction as broken, and `EXEC` answers `EXECABORT` without running anything. Redis chose this because a runtime error is a programming bug to fix in the code, not a situation to roll back.

**WATCH: optimistic locking.** `WATCH key` before `MULTI` means: if this key changes before I send `EXEC`, run nothing. When another client writes the key (or the key expires), `EXEC` returns `(nil)` and the app reads again and retries. Nobody is blocked waiting; only the one who came later must retry, so with little contention this is faster than a real lock.

**Two clients in the lesson.** The examples use the line `@client 1` to send commands as another client, then `@client 0` to come back; the lab editor is always client 0.

The figure at the end of this section shows another client writing between `WATCH` and `EXEC`.

## Syntax

```redis
MULTI
DECR stock:p05
RPUSH orders:pack o201
EXEC
WATCH stock:p06
DISCARD
UNWATCH
```

- Inside `MULTI` each command replies `QUEUED`; `EXEC` returns an array.
- `EXEC` returns `(nil)` when a `WATCH`ed key has changed.

## Example

Take stock and record the order back to back:

```redis
MULTI
DECR stock:p05
RPUSH orders:pack o201
EXEC
```

Client 1 writes in between: client 0's `EXEC` gives up.

```redis
WATCH stock:p06
MULTI
DECR stock:p06
@client 1
SET stock:p06 0
@client 0
EXEC
```

Nobody gets in between: `EXEC` runs.

```redis
WATCH stock:p06
MULTI
DECR stock:p06
EXEC
```

## Common mistakes

A wrong number of arguments while queueing: the whole transaction is cancelled.

```redis
# ERROR EXECABORT
MULTI
DECR stock:p06 1
EXEC
```

Reading the stock and taking from it without `WATCH`: another client sells out in between and the stock becomes -1.

```redis
# WRONG
GET stock:p06
@client 1
SET stock:p06 0
@client 0
DECR stock:p06
```

```redis
# FIX
WATCH stock:p06
GET stock:p06
@client 1
SET stock:p06 0
@client 0
MULTI
DECR stock:p06
EXEC
```

`EXEC` with no `MULTI` open:

```redis
# ERROR ERR
EXEC
```

## Practice

Five steps: a transaction that takes stock and records an order, a transaction with a runtime error, a transaction with `WATCH`, a transaction cancelled while queueing, and a transaction dropped with `DISCARD`.

## Recap

- `MULTI` queues, `EXEC` runs back to back and returns an array; `DISCARD` drops.
- No rollback: a runtime error stays in its slot, the other commands still run.
- An error while queueing makes `EXEC` answer `EXECABORT`, and nothing runs.
- `WATCH` makes `EXEC` return `(nil)` when the key has changed; the app reads again and retries.
