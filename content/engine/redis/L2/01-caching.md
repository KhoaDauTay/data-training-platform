---
id: e-rd-l2-01
engine: redis
level: L2
module: patterns
title: Cache-aside, thời gian sống lệch nhau và cơn dồn tải
title_en: Cache-aside, jittered expiry and the stampede
kind: lab
runtime: browser
minutes: 20
requires: [e-rd-l1-07]
figures: [{ name: rd-cache-aside, at: idea }]
objectives:
  - vi: Làm cache-aside, đọc cache, trượt thì đọc PostgreSQL rồi ghi cache kèm hạn.
    en: Do cache-aside, read the cache, on a miss read PostgreSQL and write the cache with an expiry.
  - vi: Xóa cache khi dữ liệu gốc đổi, và rải thời gian sống để cache không hết hạn cùng lúc.
    en: Delete the cache when the source data changes, and spread expiries so the cache does not expire all at once.
  - vi: Chặn cơn dồn tải bằng một khóa SET … NX PX để chỉ một request dựng lại cache.
    en: Stop a stampede with a SET … NX PX lock so only one request rebuilds the cache.
sources:
  - { url: "https://redis.io/docs/latest/develop/clients/client-side-caching/", title: "Redis docs: Client-side caching" }
  - { url: "https://docs.aws.amazon.com/whitepapers/latest/database-caching-strategies-using-redis/caching-patterns.html", title: "AWS whitepaper: Caching patterns" }
  - { url: "https://valkey.io/commands/set/", title: "Valkey docs: SET" }
lab:
  setup: |
    SET lock:product:p09 req-17 PX 5000
  steps:
    - task:
        vi: "Trang sản phẩm `p01` hỏi cache trước: đọc `cache:product:p01`."
        en: "The `p01` product page asks the cache first: read `cache:product:p01`."
      solution: GET cache:product:p01
      check: doc
      hint:
        vi: "Một lệnh đọc chuỗi. Cache còn trống, nên câu trả lời là trượt."
        en: "One string read. The cache is still empty, so the answer is a miss."
    - task:
        vi: "Ứng dụng vừa đọc giá `45000` từ PostgreSQL. Ghi nó vào `cache:product:p01`, sống 600 giây, trong một lệnh."
        en: "The app just read the price `45000` from PostgreSQL. Write it to `cache:product:p01` for 600 seconds, in one command."
      solution: SET cache:product:p01 45000 EX 600
      check: doc
      target: cache:product:p01
      expect: { pttl: 600000 }
      hint:
        vi: "`SET … EX 600`: giá trị và hạn cùng một lệnh."
        en: "`SET … EX 600`: value and expiry in the same command."
    - task:
        vi: "Ghi giá `99000` của `p07` vào `cache:product:p07`. Để hàng nghìn sản phẩm không hết hạn cùng lúc, ứng dụng đã bốc thăm thêm 37 giây vào 600 giây."
        en: "Write `p07`'s price `99000` to `cache:product:p07`. So thousands of products do not expire together, the app drew an extra 37 seconds on top of 600."
      solution: SET cache:product:p07 99000 EX 637
      check: doc
      target: cache:product:p07
      expect: { ttl: 637 }
      hint:
        vi: "600 + 37 = 637 giây."
        en: "600 + 37 = 637 seconds."
    - task:
        vi: "Giá của `p01` vừa đổi trong PostgreSQL. Bỏ bản cache cũ để lần đọc sau lấy giá mới."
        en: "`p01`'s price just changed in PostgreSQL. Drop the old cache copy so the next read gets the new price."
      solution: DEL cache:product:p01
      check: doc
      after: EXISTS cache:product:p01
      hint:
        vi: "Xóa khóa cache, đừng ghi giá mới vào nó."
        en: "Delete the cache key, do not write the new price into it."
    - task:
        vi: "Cache của `p01` vừa bị xóa và nhiều request cùng muốn dựng lại. Request `req-42` giành khóa `lock:product:p01`, giữ 5000 ms, chỉ khi chưa ai giữ."
        en: "`p01`'s cache was just deleted and many requests want to rebuild it. Request `req-42` takes lock `lock:product:p01` for 5000 ms, only if nobody holds it."
      solution: SET lock:product:p01 req-42 NX PX 5000
      check: doc
      after: GET lock:product:p01
      target: lock:product:p01
      expect: { pttl: 5000 }
      hint:
        vi: "`SET … NX PX 5000`. Chưa ai giữ nên câu trả lời là `OK`; ví dụ bên dưới cho thấy request đến sau nhận `(nil)`."
        en: "`SET … NX PX 5000`. Nobody holds it, so the reply is `OK`; the example below shows a later request getting `(nil)`."
quiz:
  - q:
      vi: "Giá `p01` đổi trong PostgreSQL. Cách nào giữ cache đúng mà ít rủi ro nhất?"
      en: "`p01`'s price changes in PostgreSQL. Which way keeps the cache right with the least risk?"
    options:
      - { vi: "Ghi giá mới vào cache bằng `SET` ngay", en: "Write the new price to the cache with `SET` at once" }
      - { vi: "Cập nhật PostgreSQL rồi `DEL` khóa cache", en: "Update PostgreSQL, then `DEL` the cache key" }
      - { vi: "`DEL` khóa cache rồi cập nhật PostgreSQL", en: "`DEL` the cache key, then update PostgreSQL" }
    answer: 1
    trap: 0
    why:
      vi: "Ghi giá mới vào cache nghe nhanh hơn, nhưng hai lần cập nhật gần nhau có thể ghi vào cache theo thứ tự ngược và để lại giá cũ tới khi hết hạn. Xóa cache trước khi cập nhật thì một request đọc chen giữa lại nạp giá cũ vào cache. Cập nhật PostgreSQL trước rồi `DEL` để lần đọc sau nạp giá mới từ nguồn; thời gian sống là lưới an toàn nếu một lần xóa bị lỡ."
      en: "Writing the new price into the cache sounds faster, but two updates close together can reach the cache in the wrong order and leave the old price until it expires. Deleting the cache before the update lets a request that reads in between load the old price back. Update PostgreSQL first, then `DEL`, so the next read loads the new price from the source; the expiry is the safety net if a delete is missed."
  - q:
      vi: "Lúc 09:00 ứng dụng nạp 10 000 sản phẩm vào cache, mỗi khóa `EX 600`. Lúc 09:10 điều gì xảy ra, và cách sửa nào đúng?"
      en: "At 09:00 the app loads 10,000 products into the cache, each with `EX 600`. What happens at 09:10, and which fix is right?"
    options:
      - { vi: "Không sao; chỉ cần đổi hạn thành 1 ngày", en: "Nothing; just change the expiry to 1 day" }
      - { vi: "Cache đầy; hạ hạn xuống 60 giây", en: "The cache is full; lower the expiry to 60 s" }
      - { vi: "Cùng hết hạn; cộng thêm vài chục giây ngẫu nhiên", en: "All expire; add a few random seconds" }
    answer: 2
    trap: 0
    why:
      vi: "Hạn 1 ngày chỉ dời cơn dồn tải sang ngày mai và giữ giá cũ lâu hơn. Mười nghìn khóa cùng `EX 600` hết hạn cùng một giây, mọi request trượt cùng lúc và cùng đổ về PostgreSQL. Hạ hạn còn làm việc đó xảy ra thường hơn. Cộng một khoảng ngẫu nhiên (jitter), ví dụ 600 + 0 tới 60 giây, rải các lần hết hạn ra nên PostgreSQL chỉ nhận vài request mỗi giây."
      en: "A one-day expiry only moves the stampede to tomorrow and keeps old prices longer. Ten thousand keys with the same `EX 600` expire in the same second, every request misses at once and they all hit PostgreSQL together. Lowering the expiry makes it happen more often. Adding a random amount (jitter), for example 600 plus 0 to 60 seconds, spreads the expiries out, so PostgreSQL gets a few requests per second."
---
## Mở bài

Trang sản phẩm của Chợ Lồng Đèn đọc giá hàng nghìn lần mỗi phút, còn giá chỉ đổi vài lần mỗi ngày. Redis giữ một bản sao gần (cache) để PostgreSQL không phải trả lời mọi lần đọc. Bài này làm cache-aside, mẫu cache phổ biến nhất, và hai cái bẫy của nó: hết hạn cùng lúc và cơn dồn tải.

## Ý chính

**Cache-aside.** Ứng dụng tự quản cache: đọc Redis trước; có thì dùng luôn (trúng, hit); không có (trượt, miss) thì đọc PostgreSQL rồi ghi kết quả vào Redis bằng `SET … EX` để lần sau trúng. PostgreSQL vẫn là nguồn đúng; Redis chỉ là bản sao có thể mất bất cứ lúc nào, nên mất cache chỉ làm chậm, không làm sai.

**Khi dữ liệu gốc đổi.** Cập nhật PostgreSQL rồi `DEL` khóa cache; lần đọc kế tiếp sẽ trượt và nạp giá mới. Ghi đè cache bằng giá mới nghe nhanh hơn, nhưng hai lần cập nhật gần nhau có thể tới cache sai thứ tự. Thời gian sống là lưới an toàn: dù một lần xóa bị lỡ, giá cũ cũng chỉ sống tới hết hạn.

**Hạn lệch nhau (jitter).** Nạp nhiều khóa cùng lúc với cùng `EX 600` thì chúng hết hạn cùng một giây, và PostgreSQL nhận cả loạt request trượt. Cộng thêm một khoảng ngẫu nhiên nhỏ cho mỗi khóa (600 + 0 tới 60 giây) rải các lần hết hạn ra.

**Cơn dồn tải (cache stampede).** Một khóa rất nóng hết hạn, hàng trăm request cùng trượt và cùng truy vấn PostgreSQL. Cách chặn: request đầu tiên giành một khóa khóa bằng `SET lock:… id NX PX 5000`; ai nhận `OK` thì dựng lại cache, ai nhận `(nil)` thì đợi một chút rồi đọc cache lại. `PX` bảo đảm khóa tự mở nếu request giữ nó bị chết giữa chừng.

Hình cuối mục cho thấy một lần đọc trượt đi qua PostgreSQL rồi ghi lại vào cache.

## Cú pháp

```redis
GET cache:product:p01
SET cache:product:p01 45000 EX 600
SET cache:product:p07 99000 EX 637
DEL cache:product:p01
SET lock:product:p09 req-42 NX PX 5000
```

- `EX` = 600 cộng một khoảng ngẫu nhiên do ứng dụng bốc.
- Khóa khóa: `NX` để chỉ một người giữ, `PX` để tự mở.

## Ví dụ

Trượt, nạp, rồi trúng:

```redis
GET cache:product:p01
SET cache:product:p01 45000 EX 600
GET cache:product:p01
```

Khóa của `p09` đang có người giữ:

```redis
SET lock:product:p09 req-42 NX PX 5000
GET lock:product:p09
```

Qua 601 giây, bản cache đã hết hạn:

```redis
SET cache:product:p01 45000 EX 600
@advance 601000
GET cache:product:p01
```

## Lỗi hay gặp

Cache không có hạn: một lần xóa bị lỡ là giá cũ ở mãi.

```redis
# WRONG
SET cache:product:p03 15000
TTL cache:product:p03
```

```redis
# FIX
SET cache:product:p03 15000 EX 600
TTL cache:product:p03
```

Giành khóa mà quên `NX`: `req-42` đè khóa của `req-17`, cả hai cùng dựng lại cache.

```redis
# WRONG
SET lock:product:p09 req-42 PX 5000
GET lock:product:p09
```

```redis
# FIX
SET lock:product:p09 req-42 NX PX 5000
GET lock:product:p09
```

`NX` và `XX` không đi cùng nhau:

```redis
# ERROR ERR
SET lock:product:p01 req-42 NX XX
```

## Thực hành

Năm bước: đọc cache và trượt, nạp cache kèm hạn, nạp một khóa với hạn đã cộng ngẫu nhiên, xóa cache khi giá đổi, và thử giành khóa dựng lại cache.

## Tóm tắt

- Cache-aside: đọc Redis, trượt thì đọc PostgreSQL và `SET … EX`.
- Dữ liệu gốc đổi: cập nhật PostgreSQL rồi `DEL` cache; hạn là lưới an toàn.
- Cộng một khoảng ngẫu nhiên vào hạn để các khóa không hết hạn cùng lúc.
- Chặn cơn dồn tải bằng `SET lock … NX PX`: chỉ một request dựng lại.

# EN

## Opening

Lantern Market's product pages read prices thousands of times a minute, while prices change only a few times a day. Redis keeps a nearby copy (a cache) so PostgreSQL does not have to answer every read. This lesson does cache-aside, the most common caching pattern, and its two traps: expiring all at once and the stampede.

## Key idea

**Cache-aside.** The app manages the cache itself: read Redis first; if the value is there (a hit), use it; if not (a miss), read PostgreSQL and write the result into Redis with `SET … EX` so the next read hits. PostgreSQL stays the source of truth; Redis is only a copy that can vanish at any time, so a lost cache only makes things slower, never wrong.

**When the source data changes.** Update PostgreSQL, then `DEL` the cache key; the next read misses and loads the new price. Overwriting the cache with the new price sounds faster, but two updates close together can reach the cache in the wrong order. The expiry is the safety net: even if a delete is missed, the old price only lives until it expires.

**Jittered expiry.** Loading many keys at once with the same `EX 600` makes them expire in the same second, and PostgreSQL gets the whole batch of misses. Adding a small random amount to each key (600 plus 0 to 60 seconds) spreads the expiries out.

**The cache stampede.** A very hot key expires, hundreds of requests miss together and all query PostgreSQL. The way to stop it: the first request takes a lock key with `SET lock:… id NX PX 5000`; whoever gets `OK` rebuilds the cache, whoever gets `(nil)` waits a moment and reads the cache again. `PX` makes sure the lock opens by itself if the request holding it dies halfway.

The figure at the end of this section shows a missed read going through PostgreSQL and written back into the cache.

## Syntax

```redis
GET cache:product:p01
SET cache:product:p01 45000 EX 600
SET cache:product:p07 99000 EX 637
DEL cache:product:p01
SET lock:product:p09 req-42 NX PX 5000
```

- `EX` = 600 plus a random amount the app draws.
- A lock key: `NX` so only one holds it, `PX` so it opens by itself.

## Example

A miss, a load, then a hit:

```redis
GET cache:product:p01
SET cache:product:p01 45000 EX 600
GET cache:product:p01
```

Someone holds `p09`'s lock:

```redis
SET lock:product:p09 req-42 NX PX 5000
GET lock:product:p09
```

After 601 seconds the cache copy has expired:

```redis
SET cache:product:p01 45000 EX 600
@advance 601000
GET cache:product:p01
```

## Common mistakes

A cache with no expiry: one missed delete and the old price stays forever.

```redis
# WRONG
SET cache:product:p03 15000
TTL cache:product:p03
```

```redis
# FIX
SET cache:product:p03 15000 EX 600
TTL cache:product:p03
```

Taking the lock without `NX`: `req-42` overwrites `req-17`'s lock and both rebuild the cache.

```redis
# WRONG
SET lock:product:p09 req-42 PX 5000
GET lock:product:p09
```

```redis
# FIX
SET lock:product:p09 req-42 NX PX 5000
GET lock:product:p09
```

`NX` and `XX` do not go together:

```redis
# ERROR ERR
SET lock:product:p01 req-42 NX XX
```

## Practice

Five steps: read the cache and miss, load the cache with an expiry, load a key whose expiry has the random extra, delete the cache when the price changes, and try to take the rebuild lock.

## Recap

- Cache-aside: read Redis, on a miss read PostgreSQL and `SET … EX`.
- The source changes: update PostgreSQL, then `DEL` the cache; the expiry is the safety net.
- Add a random amount to the expiry so keys do not expire together.
- Stop a stampede with `SET lock … NX PX`: only one request rebuilds.
