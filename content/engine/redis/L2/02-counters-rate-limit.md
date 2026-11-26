---
id: e-rd-l2-02
engine: redis
level: L2
module: patterns
title: Bộ đếm và giới hạn tần suất
title_en: Counters and rate limiting
kind: lab
runtime: browser
minutes: 20
requires: [e-rd-l2-01]
figures: [{ name: rd-rate-window, at: idea }]
objectives:
  - vi: Đếm bằng INCR, DECRBY, HINCRBY trong một lệnh, không đọc rồi ghi.
    en: Count with INCR, DECRBY, HINCRBY in one command, without reading and writing back.
  - vi: Làm giới hạn tần suất theo cửa sổ cố định bằng INCR và EXPIRE … NX.
    en: Build a fixed-window rate limit with INCR and EXPIRE … NX.
  - vi: Biết điểm yếu của cửa sổ cố định ở ranh giới hai cửa sổ.
    en: Know the fixed window's weak spot at the boundary between two windows.
sources:
  - { url: "https://valkey.io/commands/incr/", title: "Valkey docs: INCR (pattern: rate limiter)" }
  - { url: "https://valkey.io/commands/expire/", title: "Valkey docs: EXPIRE" }
  - { url: "https://redis.io/glossary/rate-limiting/", title: "Redis glossary: Rate limiting" }
lab:
  setup: |
    SET rl:k7:1000 57
    SET rl:k9:1000 100 EX 60
    SET stock:p01 30
  steps:
    - task:
        vi: "API của Cargo Query cho mỗi khóa API 100 request mỗi phút. Khóa `k7` vừa gửi một request trong phút 10:00: đếm nó vào `rl:k7:1000`."
        en: "Cargo Query's API allows each API key 100 requests per minute. Key `k7` just sent a request in minute 10:00: count it in `rl:k7:1000`."
      solution: INCR rl:k7:1000
      check: doc
      after: GET rl:k7:1000
      hint:
        vi: "`INCR` cộng 1 và trả số mới; ứng dụng so số đó với 100."
        en: "`INCR` adds 1 and returns the new number; the app compares it with 100."
    - task:
        vi: "Cửa sổ của `k7` phải tự biến mất sau 60 giây, nhưng chỉ đặt hạn lần đầu, để request sau không kéo dài cửa sổ."
        en: "`k7`'s window must disappear on its own after 60 seconds, but the expiry is set only the first time, so later requests do not stretch the window."
      solution: EXPIRE rl:k7:1000 60 NX
      check: doc
      target: rl:k7:1000
      expect: { ttl: 60 }
      hint:
        vi: "`EXPIRE … NX` chỉ đặt hạn khi khóa chưa có hạn."
        en: "`EXPIRE … NX` only sets an expiry when the key has none."
    - task:
        vi: "Khóa `k9` đã dùng đủ 100 request trong phút này và gửi thêm một request. Đếm nó; ứng dụng sẽ thấy số vượt 100 và trả lỗi 429."
        en: "Key `k9` has used all 100 requests this minute and sends one more. Count it; the app will see the number is over 100 and answer 429."
      solution: INCR rl:k9:1000
      check: doc
      after: TTL rl:k9:1000
      hint:
        vi: "Vẫn là `INCR`: cửa sổ của `k9` đã có hạn, `INCR` giữ nguyên hạn đó."
        en: "Still `INCR`: `k9`'s window already has an expiry, and `INCR` keeps it."
    - task:
        vi: "Hai chiếc đèn `p01` vừa bán: trừ 2 khỏi `stock:p01` trong một lệnh."
        en: "Two `p01` lanterns were just sold: take 2 off `stock:p01` in one command."
      solution: DECRBY stock:p01 2
      check: doc
      after: GET stock:p01
      hint:
        vi: "`DECRBY key 2` trừ và trả số mới."
        en: "`DECRBY key 2` subtracts and returns the new number."
    - task:
        vi: "Ghi nhận một đơn mới vào bảng số liệu ngày `stats:2026-10-31`, trường `orders`."
        en: "Record one new order in the daily stats `stats:2026-10-31`, field `orders`."
      solution: HINCRBY stats:2026-10-31 orders 1
      check: doc
      after: HGETALL stats:2026-10-31
      hint:
        vi: "Nhiều bộ đếm của một ngày nằm chung một hash: `HINCRBY`."
        en: "A day's counters share one hash: `HINCRBY`."
quiz:
  - q:
      vi: "Ứng dụng chạy `INCR rl:k3:1000` rồi mới `EXPIRE rl:k3:1000 60`, hai lệnh riêng. Nếu ứng dụng sập ngay giữa hai lệnh thì sao?"
      en: "The app runs `INCR rl:k3:1000`, then `EXPIRE rl:k3:1000 60`, as two commands. What if the app crashes right between them?"
    options:
      - { vi: "Bộ đếm không có hạn, khóa API có thể bị chặn mãi", en: "The counter has no expiry; the key may stay blocked" }
      - { vi: "Không sao, Redis tự gắn hạn 60 giây", en: "Nothing, Redis adds the 60 seconds by itself" }
      - { vi: "Redis hoàn tác lệnh INCR", en: "Redis undoes the INCR" }
    answer: 0
    trap: 1
    why:
      vi: "Redis không biết bạn định gắn hạn, nên nó không tự gắn gì, và cũng không hoàn tác một lệnh đã chạy. Bộ đếm ở lại mãi; khi nó vượt 100, khóa API bị chặn cho tới khi có người xóa tay. Vì vậy `EXPIRE … NX` được gọi sau mỗi `INCR`: lần nào cũng sửa được khóa thiếu hạn mà không kéo dài cửa sổ. Cách chắc hơn là gói hai lệnh trong `MULTI`/`EXEC`, bài Giao dịch MULTI, EXEC và WATCH."
      en: "Redis does not know you meant to add an expiry, so it adds none, and it never undoes a command that ran. The counter stays forever; once it passes 100, the API key is blocked until someone deletes it by hand. That is why `EXPIRE … NX` is called after every `INCR`: each call repairs a key with no expiry without stretching the window. Safer still is wrapping both in `MULTI`/`EXEC`, in the lesson on MULTI, EXEC and WATCH transactions."
  - q:
      vi: "Giới hạn 100 request mỗi phút theo cửa sổ cố định (mỗi phút một khóa). Một client gửi 100 request lúc 10:00:59 và 100 request lúc 10:01:00. Trong hai giây đó bao nhiêu request lọt qua?"
      en: "A limit of 100 requests per minute with fixed windows (one key per minute). A client sends 100 requests at 10:00:59 and 100 at 10:01:00. How many get through in those two seconds?"
    options:
      - { vi: "100", en: "100" }
      - { vi: "200", en: "200" }
      - { vi: "101", en: "101" }
    answer: 1
    trap: 0
    why:
      vi: "Giới hạn ghi \"100 mỗi phút\" nên dễ nghĩ không bao giờ quá 100, nhưng mỗi phút là một khóa riêng: 100 request đầu vào khóa của phút 10:00, 100 request sau vào khóa mới của phút 10:01, và khóa nào cũng chỉ đếm tới 100. Vậy 200 request lọt qua trong hai giây. Cửa sổ trượt (đếm 60 giây gần nhất, ví dụ bằng sorted set theo thời điểm) chặn được kiểu dồn ở ranh giới này, đổi lại tốn bộ nhớ hơn."
      en: "The limit says \"100 per minute\", so it is easy to think it never goes past 100, but each minute is its own key: the first 100 requests land in minute 10:00's key, the next 100 in the new key of 10:01, and each key only counts to 100. So 200 requests get through in two seconds. A sliding window (counting the last 60 seconds, for example with a sorted set of timestamps) stops this burst at the boundary, at the cost of more memory."
---
## Mở bài

API của Cargo Query cho mỗi khóa API 100 request mỗi phút, và Chợ Lồng Đèn đếm kho và đơn trong ngày. Cả hai là bộ đếm được nhiều máy chủ cùng cộng một lúc. Bài này dùng các lệnh đếm nguyên tử của Redis và dựng một giới hạn tần suất (rate limit) đơn giản.

## Ý chính

**Đếm trong một lệnh.** `INCR`, `INCRBY`, `DECRBY` cộng trừ một chuỗi số nguyên và trả số mới; `HINCRBY` làm điều đó với một trường của hash. Redis chạy từng lệnh một, nên khi mười máy chủ cùng `INCR` một khóa, không lượt nào bị mất, khác với cách đọc ra, cộng trong ứng dụng, rồi ghi lại. Khóa chưa có được coi như 0.

**Cửa sổ cố định.** Mỗi khóa API, mỗi phút là một khóa đếm, ví dụ `rl:k7:1000` cho khóa `k7` trong phút 10:00. Mỗi request gọi `INCR`; nếu số trả về lớn hơn 100, ứng dụng từ chối với mã HTTP 429. Khóa đếm cần hạn để tự biến mất khi hết phút: `EXPIRE rl:k7:1000 60 NX`. `NX` chỉ đặt hạn khi khóa chưa có hạn, nên gọi sau mỗi `INCR` cũng an toàn: request sau không kéo dài cửa sổ, và một khóa lỡ thiếu hạn được sửa ngay lần sau.

**Hạn được giữ.** `INCR` sửa giá trị tại chỗ nên giữ nguyên hạn đã có; chỉ một `SET` thường mới xóa hạn. Bộ đếm theo ngày như `stats:2026-10-31` cũng nên có hạn vài ngày để không tích mãi.

**Điểm yếu ở ranh giới.** Cửa sổ cố định đơn giản và rẻ, nhưng một client gửi 100 request cuối phút này và 100 request đầu phút sau sẽ lọt 200 request trong hai giây. Khi điều đó quan trọng, dùng cửa sổ trượt; với nhiều API, cửa sổ cố định là đủ.

Hình cuối mục cho thấy một request đi qua bộ đếm của phút 10:00.

## Cú pháp

```redis
INCR rl:k7:1000
EXPIRE rl:k7:1000 60 NX
INCRBY counter 5
DECRBY stock:p01 2
HINCRBY stats:2026-10-31 orders 1
```

- Số trả về của `INCR` lớn hơn giới hạn: ứng dụng từ chối (429).
- `EXPIRE … NX` chỉ đặt hạn lần đầu.

## Ví dụ

Đếm một request và đặt hạn cho cửa sổ:

```redis
INCR rl:k7:1000
EXPIRE rl:k7:1000 60 NX
TTL rl:k7:1000
```

Hết phút, cửa sổ tự biến mất:

```redis
INCR rl:k5:1000
EXPIRE rl:k5:1000 60 NX
@advance 61000
GET rl:k5:1000
```

Bộ đếm của một ngày trong một hash:

```redis
HINCRBY stats:2026-10-31 orders 1
HINCRBY stats:2026-10-31 views 40
HGETALL stats:2026-10-31
```

## Lỗi hay gặp

Đặt lại hạn ở mọi request mà không có `NX`: cửa sổ bị kéo dài, client gửi đều đặn không bao giờ được mở lại.

```redis
# WRONG
@advance 30000
EXPIRE rl:k9:1000 60
TTL rl:k9:1000
```

```redis
# FIX
@advance 30000
EXPIRE rl:k9:1000 60 NX
TTL rl:k9:1000
```

`INCR` trên một chuỗi không phải số:

```redis
# ERROR ERR
SET rl:bad full
INCR rl:bad
```

## Thực hành

Năm bước: đếm một request, đặt hạn cho cửa sổ chỉ lần đầu, đếm request vượt giới hạn, trừ kho, và đếm một đơn vào số liệu ngày.

## Tóm tắt

- `INCR`/`DECRBY`/`HINCRBY` đếm trong một lệnh, không mất lượt khi nhiều máy cùng ghi.
- Cửa sổ cố định: mỗi khóa API mỗi phút một khóa; `INCR` rồi so với giới hạn.
- `EXPIRE … NX` đặt hạn lần đầu và không kéo dài cửa sổ.
- Cửa sổ cố định có thể lọt gấp đôi ở ranh giới; cần chặt hơn thì dùng cửa sổ trượt.

# EN

## Opening

Cargo Query's API gives each API key 100 requests per minute, and Lantern Market counts stock and the day's orders. Both are counters that many servers add to at once. This lesson uses Redis's atomic counting commands and builds a simple rate limit.

## Key idea

**Counting in one command.** `INCR`, `INCRBY`, `DECRBY` add to or subtract from an integer string and return the new number; `HINCRBY` does the same with a field of a hash. Redis runs one command at a time, so when ten servers `INCR` one key together, no count is lost, unlike reading the value, adding in the app and writing it back. A missing key counts as 0.

**A fixed window.** Each API key, each minute, gets a counter key, for example `rl:k7:1000` for key `k7` in minute 10:00. Every request calls `INCR`; if the number returned is above 100, the app refuses with HTTP status 429. The counter key needs an expiry so it disappears when the minute is over: `EXPIRE rl:k7:1000 60 NX`. `NX` only sets an expiry when the key has none, so calling it after every `INCR` is safe: later requests do not stretch the window, and a key that missed its expiry is repaired on the next call.

**The expiry is kept.** `INCR` changes the value in place, so it keeps the expiry; only a plain `SET` clears it. Daily counters such as `stats:2026-10-31` should also expire after a few days so they do not pile up forever.

**The weak spot at the boundary.** The fixed window is simple and cheap, but a client that sends 100 requests at the end of one minute and 100 at the start of the next gets 200 through in two seconds. When that matters, use a sliding window; for many APIs the fixed window is enough.

The figure at the end of this section shows one request going through the counter of minute 10:00.

## Syntax

```redis
INCR rl:k7:1000
EXPIRE rl:k7:1000 60 NX
INCRBY counter 5
DECRBY stock:p01 2
HINCRBY stats:2026-10-31 orders 1
```

- The number `INCR` returns is above the limit: the app refuses (429).
- `EXPIRE … NX` sets the expiry only the first time.

## Example

Count one request and set the window's expiry:

```redis
INCR rl:k7:1000
EXPIRE rl:k7:1000 60 NX
TTL rl:k7:1000
```

When the minute is over, the window disappears on its own:

```redis
INCR rl:k5:1000
EXPIRE rl:k5:1000 60 NX
@advance 61000
GET rl:k5:1000
```

A day's counters in one hash:

```redis
HINCRBY stats:2026-10-31 orders 1
HINCRBY stats:2026-10-31 views 40
HGETALL stats:2026-10-31
```

## Common mistakes

Setting the expiry again on every request without `NX`: the window keeps stretching, and a client that sends steadily is never let in again.

```redis
# WRONG
@advance 30000
EXPIRE rl:k9:1000 60
TTL rl:k9:1000
```

```redis
# FIX
@advance 30000
EXPIRE rl:k9:1000 60 NX
TTL rl:k9:1000
```

`INCR` on a string that is not a number:

```redis
# ERROR ERR
SET rl:bad full
INCR rl:bad
```

## Practice

Five steps: count a request, set the window's expiry only the first time, count a request over the limit, take stock off, and count an order in the day's stats.

## Recap

- `INCR`/`DECRBY`/`HINCRBY` count in one command, so no count is lost when many servers write.
- A fixed window: one counter key per API key per minute; `INCR`, then compare with the limit.
- `EXPIRE … NX` sets the expiry the first time and does not stretch the window.
- A fixed window can let twice the limit through at the boundary; when that matters, use a sliding window.
