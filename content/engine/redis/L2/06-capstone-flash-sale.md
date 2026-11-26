---
id: e-rd-l2-06
engine: redis
level: L2
module: capstone
title: Bài tổng hợp, một đợt bán chớp nhoáng
title_en: Capstone, a flash sale
kind: capstone
runtime: browser
minutes: 30
requires: [e-rd-l2-05]
figures: [{ name: rd-flash-sale, at: idea }]
objectives:
  - vi: Ghép giới hạn tần suất, giỏ hàng hash, giao dịch có WATCH và bảng xếp hạng thành một luồng mua hàng.
    en: Put a rate limit, a hash cart, a WATCH transaction and a leaderboard together into one checkout flow.
  - vi: Chọn đúng kiểu dữ liệu và đúng lệnh cho từng bước, kiểm tra kết quả bằng một lệnh đọc.
    en: Pick the right data type and command for each step, and check the result with a read.
  - vi: Biết bước nào cần nguồn đúng ở PostgreSQL ngoài Redis.
    en: Know which step needs a source of truth in PostgreSQL besides Redis.
sources:
  - { url: "https://valkey.io/topics/transactions/", title: "Valkey docs: Transactions" }
  - { url: "https://valkey.io/commands/incr/", title: "Valkey docs: INCR (pattern: rate limiter)" }
  - { url: "https://redis.io/docs/latest/develop/data-types/sorted-sets/", title: "Redis docs: Sorted sets" }
lab:
  setup: |
    SET stock:p05 3
    HSET cart:lily p05 1
    ZADD sales:2026-10 340 store:2 310 store:3 120 store:1
    SET rl:k7:1000 99 EX 60
  steps:
    - name: { vi: "Giới hạn", en: "Rate limit" }
      task:
        vi: "Ứng dụng của Lily gọi API của Cargo Query bằng khóa `k7` trong phút 10:00. Đếm request này vào `rl:k7:1000` (giới hạn 100 mỗi phút)."
        en: "Lily's app calls Cargo Query's API with key `k7` in minute 10:00. Count this request in `rl:k7:1000` (limit 100 per minute)."
      solution: INCR rl:k7:1000
      check: doc
      after: TTL rl:k7:1000
      hint:
        vi: "`INCR` trả 100: vừa chạm giới hạn, vẫn được qua."
        en: "`INCR` returns 100: right at the limit, still allowed."
    - name: { vi: "Giỏ", en: "Cart" }
      task:
        vi: "Lily bấm thêm một chiếc `p05` vào giỏ `cart:lily`."
        en: "Lily adds one more `p05` to her cart `cart:lily`."
      solution: HINCRBY cart:lily p05 1
      check: doc
      after: HGETALL cart:lily
      hint:
        vi: "Sửa một trường số của hash tại chỗ."
        en: "Change a numeric field of the hash in place."
    - name: { vi: "Thanh toán", en: "Checkout" }
      task:
        vi: "Thanh toán đơn `o301` cho 2 chiếc `p05`: theo dõi `stock:p05`, rồi trong một giao dịch trừ 2 khỏi kho và xếp `o301` vào cuối `orders:pack`."
        en: "Check out order `o301` for 2 `p05`: watch `stock:p05`, then in one transaction take 2 off the stock and put `o301` at the end of `orders:pack`."
      solution: |
        WATCH stock:p05
        MULTI
        DECRBY stock:p05 2
        RPUSH orders:pack o301
        EXEC
      check: doc
      after: |
        GET stock:p05
        LRANGE orders:pack 0 -1
      hint:
        vi: "`WATCH`, `MULTI`, hai lệnh, `EXEC`; câu trả lời là một mảng hai ô."
        en: "`WATCH`, `MULTI`, two commands, `EXEC`; the reply is an array of two slots."
    - name: { vi: "Xóa giỏ", en: "Empty cart" }
      task:
        vi: "Đơn đã đặt: bỏ giỏ hàng của Lily."
        en: "The order is placed: drop Lily's cart."
      solution: DEL cart:lily
      check: doc
      after: EXISTS cart:lily
      hint:
        vi: "Xóa cả khóa hash trong một lệnh."
        en: "Delete the whole hash key in one command."
    - name: { vi: "Doanh số", en: "Sales" }
      task:
        vi: "Đơn `o301` thuộc `store:1`, trị giá 240 (nghìn đồng): cộng vào bảng doanh số `sales:2026-10`."
        en: "Order `o301` belongs to `store:1` and is worth 240 (thousand dong): add it to the sales board `sales:2026-10`."
      solution: ZINCRBY sales:2026-10 240 store:1
      check: doc
      after: ZRANGE sales:2026-10 0 0 REV
      hint:
        vi: "Cộng điểm cho một thành viên của sorted set."
        en: "Add to a sorted set member's score."
    - name: { vi: "Top 3", en: "Top 3" }
      task:
        vi: "Ba cửa hàng bán nhiều nhất tháng 10 kèm doanh số, từ cao xuống thấp."
        en: "The three stores with the most sales in October with their sales, highest first."
      solution: ZRANGE sales:2026-10 0 2 REV WITHSCORES
      check: doc
      hint:
        vi: "`ZRANGE … REV WITHSCORES`."
        en: "`ZRANGE … REV WITHSCORES`."
quiz:
  - q:
      vi: "Ở bước thanh toán, `EXEC` trả `(nil)`. Ứng dụng nên làm gì?"
      en: "At the checkout step, `EXEC` returns `(nil)`. What should the app do?"
    options:
      - { vi: "Báo khách đã đặt hàng thành công", en: "Tell the customer the order went through" }
      - { vi: "Đọc lại kho rồi thử lại từ `WATCH`", en: "Read the stock again and retry from `WATCH`" }
      - { vi: "Gọi `DECRBY` thẳng, bỏ giao dịch", en: "Call `DECRBY` directly, without the transaction" }
    answer: 1
    trap: 0
    why:
      vi: "`(nil)` không phải lỗi nên dễ tưởng là xong, nhưng nó nghĩa là khóa `stock:p05` đã đổi sau `WATCH` và không lệnh nào trong giao dịch chạy: kho chưa bị trừ, đơn chưa vào hàng. Gọi `DECRBY` thẳng thì mất đúng sự bảo vệ đó và có thể bán lố. Ứng dụng đọc lại kho; còn đủ hàng thì thử lại từ `WATCH`, hết hàng thì báo khách."
      en: "`(nil)` is not an error, so it is easy to think it worked, but it means `stock:p05` changed after `WATCH` and no command in the transaction ran: the stock was not taken and the order is not queued. Calling `DECRBY` directly throws away exactly that protection and can oversell. The app reads the stock again; if there is enough, it retries from `WATCH`, otherwise it tells the customer."
  - q:
      vi: "Redis của đợt bán khởi động lại mà không lưu gì. Mất khóa nào làm hại nhiều nhất nếu đơn hàng chỉ nằm trong Redis?"
      en: "The flash sale's Redis restarts with nothing saved. Losing which key hurts most if the orders live only in Redis?"
    options:
      - { vi: "`rl:k7:1000`", en: "`rl:k7:1000`" }
      - { vi: "`sales:2026-10`", en: "`sales:2026-10`" }
      - { vi: "`orders:pack`", en: "`orders:pack`" }
    answer: 2
    trap: 1
    why:
      vi: "Bảng doanh số trông quan trọng nhất, nhưng nó là số tổng hợp: dựng lại được bằng một câu SQL trên bảng đơn ở PostgreSQL. Mất bộ đếm giới hạn chỉ cho khóa `k7` thêm vài request. Mất `orders:pack` là mất những đơn khách đã trả tiền mà chưa ai đóng gói. Vì vậy mỗi đơn phải được ghi vào PostgreSQL trước, và `orders:pack` chỉ giữ mã đơn để kho lấy việc."
      en: "The sales board looks the most important, but it is a summary: one SQL query over the orders table in PostgreSQL rebuilds it. Losing the rate counter only lets key `k7` make a few more requests. Losing `orders:pack` loses orders customers paid for that nobody has packed yet. So each order must be written to PostgreSQL first, and `orders:pack` only holds order ids for the warehouse to take work from."
---
## Mở bài

Chợ Lồng Đèn mở một đợt bán chớp nhoáng: chỉ 3 chiếc đèn `p05`, rất nhiều người bấm cùng lúc, và mọi cuộc gọi đi qua API có giới hạn của Cargo Query. Bài tổng hợp này đi hết một lần mua của Lily bằng những gì hai cấp đã dạy. Mỗi bước được chấm bằng câu trả lời của lệnh và một lệnh đọc kiểm tra dữ liệu sau đó.

## Ý chính

**Một luồng, nhiều kiểu dữ liệu.** Mỗi việc dùng kiểu hợp với nó: bộ đếm chuỗi có hạn cho giới hạn tần suất, hash cho giỏ hàng, chuỗi số cho kho, list cho hàng đợi đóng gói, sorted set cho bảng doanh số. Không kiểu nào làm được hết; chọn sai kiểu thường lộ ra bằng lỗi `WRONGTYPE` hoặc bằng nhiều lệnh hơn cần thiết.

**Chỗ cần nguyên tử.** Trừ kho và xếp đơn phải đi cùng nhau, và không được bán lố khi nhiều người cùng mua. `WATCH stock:p05` rồi `MULTI` … `EXEC` cho cả hai: các lệnh chạy liền một mạch, và nếu ai đó đổi kho trước `EXEC` thì không lệnh nào chạy (`(nil)`), ứng dụng đọc lại rồi thử lại.

**Chỗ không cần.** Cộng doanh số bằng `ZINCRBY`, thêm hàng vào giỏ bằng `HINCRBY` đều là một lệnh, nên tự chúng đã nguyên tử; không cần giao dịch. Giao dịch chỉ dùng khi nhiều lệnh phải đi cùng nhau.

**Nguồn đúng.** Đơn hàng và tiền vẫn được ghi vào PostgreSQL; Redis giữ hàng đợi mã đơn, bản sao và các số đếm. Mất Redis thì chậm và phải dựng lại vài thứ, nhưng không mất đơn nào.

Hình cuối mục cho thấy cả luồng mua của Lily.

## Cú pháp

```redis
INCR rl:k7:1000
HINCRBY cart:lily p05 1
WATCH stock:p05
MULTI
DECRBY stock:p05 2
RPUSH orders:pack o301
EXEC
DEL cart:lily
ZINCRBY sales:2026-10 240 store:1
ZRANGE sales:2026-10 0 2 REV WITHSCORES
```

- `EXEC` trả `(nil)`: đọc lại và thử lại từ `WATCH`.
- Một lệnh đơn đã nguyên tử; giao dịch cho nhiều lệnh đi cùng nhau.

## Ví dụ

Trạng thái lúc bắt đầu:

```redis
GET stock:p05
HGETALL cart:lily
TTL rl:k7:1000
```

Bảng doanh số trước đợt bán:

```redis
ZRANGE sales:2026-10 0 -1 REV WITHSCORES
```

## Lỗi hay gặp

Trừ kho mà không `WATCH` khi người khác mua cùng lúc: kho thành -1, bán lố.

```redis
# WRONG
GET stock:p05
@client 1
DECRBY stock:p05 2
@client 0
DECRBY stock:p05 2
```

```redis
# FIX
WATCH stock:p05
GET stock:p05
@client 1
DECRBY stock:p05 2
@client 0
MULTI
DECRBY stock:p05 2
EXEC
```

Dùng lệnh sorted set trên giỏ hàng (một hash):

```redis
# ERROR WRONGTYPE
ZINCRBY cart:lily 1 p05
```

Thiếu đối số lúc xếp hàng: `EXEC` hủy cả giao dịch.

```redis
# ERROR EXECABORT
MULTI
DECRBY stock:p05
EXEC
```

## Thực hành

Sáu bước theo một lần mua: đếm request, thêm vào giỏ, thanh toán trong giao dịch có `WATCH`, xóa giỏ, cộng doanh số, và đọc top 3.

## Tóm tắt

- Mỗi việc một kiểu: chuỗi đếm có hạn, hash, list, sorted set.
- Nhiều lệnh phải đi cùng nhau: `WATCH` + `MULTI`/`EXEC`; `(nil)` thì thử lại.
- Một lệnh đơn như `ZINCRBY`, `HINCRBY` đã nguyên tử, không cần giao dịch.
- Đơn và tiền ghi vào PostgreSQL trước; Redis giữ mã đơn, bản sao và số đếm.

# EN

## Opening

Lantern Market runs a flash sale: only 3 `p05` lanterns, many people clicking at once, and every call going through Cargo Query's rate-limited API. This capstone walks through one purchase by Lily with what the two levels taught. Each step is graded on the command's reply and on a read that checks the data afterwards.

## Key idea

**One flow, many data types.** Each job uses the type that fits it: an expiring string counter for the rate limit, a hash for the cart, a numeric string for the stock, a list for the packing queue, a sorted set for the sales board. No single type does it all; the wrong type usually shows up as a `WRONGTYPE` error or as more commands than needed.

**Where it must be atomic.** Taking the stock and queueing the order must happen together, and nothing may be oversold when many people buy at once. `WATCH stock:p05`, then `MULTI` … `EXEC`, gives both: the commands run back to back, and if someone changes the stock before `EXEC` none of them runs (`(nil)`), and the app reads again and retries.

**Where it need not be.** Adding sales with `ZINCRBY` and adding to the cart with `HINCRBY` are single commands, so they are already atomic; no transaction is needed. Transactions are only for several commands that must go together.

**The source of truth.** Orders and money are still written to PostgreSQL; Redis keeps the queue of order ids, copies and counters. Losing Redis is slower and some things must be rebuilt, but no order is lost.

The figure at the end of this section shows Lily's whole purchase.

## Syntax

```redis
INCR rl:k7:1000
HINCRBY cart:lily p05 1
WATCH stock:p05
MULTI
DECRBY stock:p05 2
RPUSH orders:pack o301
EXEC
DEL cart:lily
ZINCRBY sales:2026-10 240 store:1
ZRANGE sales:2026-10 0 2 REV WITHSCORES
```

- `EXEC` returns `(nil)`: read again and retry from `WATCH`.
- A single command is already atomic; a transaction is for several commands that go together.

## Example

The state at the start:

```redis
GET stock:p05
HGETALL cart:lily
TTL rl:k7:1000
```

The sales board before the sale:

```redis
ZRANGE sales:2026-10 0 -1 REV WITHSCORES
```

## Common mistakes

Taking stock without `WATCH` while someone else buys at the same time: the stock becomes -1, an oversale.

```redis
# WRONG
GET stock:p05
@client 1
DECRBY stock:p05 2
@client 0
DECRBY stock:p05 2
```

```redis
# FIX
WATCH stock:p05
GET stock:p05
@client 1
DECRBY stock:p05 2
@client 0
MULTI
DECRBY stock:p05 2
EXEC
```

A sorted set command on the cart (a hash):

```redis
# ERROR WRONGTYPE
ZINCRBY cart:lily 1 p05
```

A missing argument while queueing: `EXEC` cancels the whole transaction.

```redis
# ERROR EXECABORT
MULTI
DECRBY stock:p05
EXEC
```

## Practice

Six steps along one purchase: count the request, add to the cart, check out in a transaction with `WATCH`, empty the cart, add the sales, and read the top 3.

## Recap

- One type per job: an expiring counter string, a hash, a list, a sorted set.
- Several commands that must go together: `WATCH` + `MULTI`/`EXEC`; on `(nil)`, retry.
- A single command such as `ZINCRBY` or `HINCRBY` is already atomic, no transaction needed.
- Orders and money go to PostgreSQL first; Redis keeps order ids, copies and counters.
