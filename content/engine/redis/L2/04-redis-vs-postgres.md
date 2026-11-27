---
id: e-rd-l2-04
engine: redis
level: L2
module: atomic
title: Khi nào dùng Redis, khi nào dùng PostgreSQL
title_en: When to use Redis, when to use PostgreSQL
kind: lab
runtime: browser
minutes: 15
requires: [e-rd-l2-03]
figures: [{ name: rd-where-data-lives, at: idea }]
objectives:
  - vi: Chọn Redis cho dữ liệu ngắn hạn, mất được, đọc rất nhiều; chọn PostgreSQL cho dữ liệu phải đúng và phải còn.
    en: Pick Redis for short-lived, losable, read-heavy data; pick PostgreSQL for data that must be right and must stay.
  - vi: Thấy điều gì xảy ra khi bộ nhớ của Redis mất sạch, và vì sao cache chỉ làm chậm chứ không làm sai.
    en: See what happens when Redis's memory is wiped, and why a cache only slows things down, never makes them wrong.
sources:
  - { url: "https://valkey.io/topics/persistence/", title: "Valkey docs: Persistence", title_vi: "Tài liệu Valkey: lưu bền dữ liệu (persistence)" }
  - { url: "https://www.postgresql.org/docs/18/wal-intro.html", title: "PostgreSQL docs: Write-Ahead Logging", title_vi: "Ghi nhật ký trước (write-ahead logging)" }
  - { url: "https://redis.io/docs/latest/develop/get-started/data-store/", title: "Redis docs: Redis as an in-memory data structure store", title_vi: "Tài liệu Redis: Redis làm kho cấu trúc dữ liệu trong bộ nhớ" }
lab:
  setup: |
    SET cache:order:o101 packed EX 300
    HSET session:lily cart 3 lang vi
  steps:
    - task:
        vi: "Lily đăng nhập: lưu token phiên `session:t9` trỏ tới `lily`, sống 30 phút. Mất token thì Lily chỉ phải đăng nhập lại, nên Redis là chỗ hợp."
        en: "Lily logs in: store session token `session:t9` pointing to `lily`, living 30 minutes. A lost token only means Lily logs in again, so Redis is the right place."
      solution: SET session:t9 lily EX 1800
      check: doc
      target: session:t9
      expect: { pttl: 1800000 }
      hint:
        vi: "`SET … EX 1800`."
        en: "`SET … EX 1800`."
    - task:
        vi: "Trang đơn hàng đọc trạng thái của đơn `o101` từ cache."
        en: "The order page reads order `o101`'s status from the cache."
      solution: GET cache:order:o101
      check: doc
      hint:
        vi: "Một lệnh đọc chuỗi."
        en: "One string read."
    - task:
        vi: "Giả lập Redis khởi động lại mà không có gì được lưu xuống đĩa: xóa sạch mọi khóa."
        en: "Simulate Redis restarting with nothing saved to disk: wipe every key."
      solution: FLUSHALL
      check: doc
      after: DBSIZE
      hint:
        vi: "Một lệnh xóa mọi khóa của server. Đừng bao giờ gõ nó trên Redis thật đang chạy."
        en: "One command deletes every key on the server. Never type it on a real live Redis."
    - task:
        vi: "Sau khi khởi động lại, trang đơn hàng đọc lại trạng thái của `o101` từ cache."
        en: "After the restart, the order page reads `o101`'s status from the cache again."
      solution: GET cache:order:o101
      check: doc
      hint:
        vi: "Cùng lệnh với bước 2; câu trả lời bây giờ là trượt, và ứng dụng sẽ hỏi PostgreSQL."
        en: "The same command as step 2; the answer is now a miss, and the app will ask PostgreSQL."
quiz:
  - q:
      vi: "Dữ liệu nào của Chợ Lồng Đèn phải nằm trong PostgreSQL, không chỉ trong Redis?"
      en: "Which of Lantern Market's data must live in PostgreSQL, not only in Redis?"
    options:
      - { vi: "Token phiên đăng nhập", en: "Login session tokens" }
      - { vi: "Đơn hàng và khoản thanh toán", en: "Orders and payments" }
      - { vi: "Số lượt xem trang trong giờ qua", en: "Page views in the last hour" }
    answer: 1
    trap: 2
    why:
      vi: "Lượt xem nghe như số liệu quan trọng, nhưng mất vài phút lượt xem chỉ làm biểu đồ lệch một chút; mất token thì khách đăng nhập lại. Mất một đơn hay một khoản thanh toán là mất tiền và mất lòng tin, nên chúng cần một cơ sở dữ liệu ghi xuống đĩa trước khi báo xong (WAL của PostgreSQL), có ràng buộc và có giao dịch hoàn tác được. Redis có thể giữ bản sao của đơn để đọc nhanh."
      en: "Page views sound like important numbers, but losing a few minutes of them only skews a chart a little; a lost token means the customer logs in again. Losing an order or a payment loses money and trust, so they need a database that writes to disk before it says done (PostgreSQL's WAL), with constraints and transactions that can roll back. Redis can keep a copy of an order for fast reads."
  - q:
      vi: "Kế toán cần doanh thu theo tháng và thành phố, nối đơn với khách hàng. Nên làm ở đâu?"
      en: "Accounting needs revenue by month and city, joining orders with customers. Where should this be done?"
    options:
      - { vi: "PostgreSQL, bằng một câu SQL", en: "PostgreSQL, with one SQL query" }
      - { vi: "Redis, bằng sorted set theo tháng", en: "Redis, with a sorted set per month" }
      - { vi: "Ở đâu cũng như nhau", en: "Either, it is the same work" }
    answer: 0
    trap: 1
    why:
      vi: "Sorted set theo tháng làm được một bảng xếp hạng đã định sẵn, nhưng câu hỏi đổi (theo thành phố, theo nhóm sản phẩm) là phải dựng thêm khóa mới và tự viết code nối. Redis không có JOIN, GROUP BY hay câu hỏi tùy ý; nó trả lời nhanh những câu bạn đã thiết kế khóa cho. PostgreSQL trả lời câu hỏi mới bằng một câu SQL trên dữ liệu đã có."
      en: "A sorted set per month makes one ranking you planned for, but when the question changes (by city, by product group) you must build new keys and write the joining code yourself. Redis has no JOIN, GROUP BY or ad hoc questions; it answers fast the questions you designed keys for. PostgreSQL answers a new question with one SQL query on the data it already has."
---
## Mở bài

Redis nhanh vì giữ mọi thứ trong bộ nhớ, và chính điều đó quyết định nên đặt gì vào nó. Chợ Lồng Đèn dùng cả hai: PostgreSQL giữ đơn hàng và tiền, Redis giữ phiên, cache và bộ đếm. Bài này đặt hai bên cạnh nhau và cho Redis mất sạch bộ nhớ để thấy vì sao.

## Ý chính

**Redis giỏi gì.** Đọc và ghi một khóa mất chưa tới một mili giây vì dữ liệu nằm trong RAM và mỗi lệnh rất nhỏ. Hợp với dữ liệu ngắn hạn (phiên, mã OTP), dữ liệu có thể dựng lại từ nguồn khác (cache), bộ đếm và bảng xếp hạng cần cập nhật liên tục, và hàng đợi nhỏ. Đặc điểm chung: mất đi thì phiền nhưng không mất tiền.

**PostgreSQL giỏi gì.** Ghi xuống đĩa qua nhật ký WAL trước khi báo xong, nên một lần mất điện không làm mất giao dịch đã xác nhận. Có ràng buộc (khóa ngoại, CHECK), giao dịch hoàn tác được, và SQL để hỏi câu mới bất cứ lúc nào: nối bảng, gom nhóm, lọc tùy ý. Đơn hàng, thanh toán, khách hàng, kho thật là dữ liệu phải đúng và phải còn.

**Redis có lưu xuống đĩa, nhưng.** Redis có thể ghi ảnh chụp (RDB) và nhật ký lệnh (AOF), bài Lưu xuống đĩa nói kỹ. Tuy vậy cấu hình mặc định có thể mất vài giây ghi cuối khi sập, và Redis không có ràng buộc hay hoàn tác. Vì vậy cách an toàn là coi Redis là bản sao hoặc dữ liệu tạm, còn nguồn đúng nằm ở PostgreSQL.

**Bộ nhớ có hạn.** Mọi khóa phải vừa RAM. Khi đầy, Redis hoặc từ chối ghi, hoặc tự xóa bớt khóa theo chính sách `maxmemory-policy` (ví dụ xóa khóa ít dùng nhất). Với cache điều đó ổn; với đơn hàng thì không.

Hình cuối mục chia dữ liệu của cửa hàng ra hai nơi.

## Cú pháp

```redis
SET session:t9 lily EX 1800
GET cache:order:o101
FLUSHALL
DBSIZE
```

- Dữ liệu tạm: luôn có `EX`; nguồn đúng: PostgreSQL.
- `FLUSHALL` xóa mọi khóa; chỉ dùng trong bài học.

## Ví dụ

Một phiên đăng nhập có hạn:

```redis
SET session:t9 lily EX 1800
TTL session:t9
```

Bản cache của trạng thái đơn và hạn còn lại:

```redis
GET cache:order:o101
TTL cache:order:o101
```

Redis khởi động lại mà không lưu gì: mọi khóa biến mất.

```redis
FLUSHALL
DBSIZE
GET cache:order:o101
```

## Lỗi hay gặp

Lưu đơn hàng chỉ trong Redis: mất bộ nhớ là mất đơn, không còn nguồn nào để nạp lại.

```redis
# WRONG
HSET order:o300 total 450000
FLUSHALL
HGETALL order:o300
```

```redis
# FIX
SET cache:order:o300 450000 EX 600
FLUSHALL
GET cache:order:o300
```

Bản sửa vẫn trượt sau khi mất bộ nhớ, nhưng `(nil)` ở đây chỉ có nghĩa "hỏi lại PostgreSQL", nơi đơn `o300` vẫn còn.

Redis không có JOIN hay SQL:

```redis
# ERROR ERR
JOIN orders customers
```

## Thực hành

Bốn bước: lưu một token phiên có hạn, đọc một bản cache, giả lập Redis mất sạch bộ nhớ, và đọc lại bản cache để thấy nó trượt.

## Tóm tắt

- Redis: dữ liệu tạm, dựng lại được, đọc rất nhiều; luôn đặt hạn.
- PostgreSQL: dữ liệu phải đúng và phải còn, cần ràng buộc, hoàn tác và SQL.
- Cache mất chỉ làm chậm, vì nguồn đúng vẫn ở PostgreSQL.
- Bộ nhớ có hạn: khi đầy, Redis từ chối ghi hoặc tự xóa bớt khóa.

# EN

## Opening

Redis is fast because it keeps everything in memory, and that very fact decides what belongs in it. Lantern Market uses both: PostgreSQL keeps orders and money, Redis keeps sessions, caches and counters. This lesson puts the two side by side and wipes Redis's memory to show why.

## Key idea

**What Redis is good at.** Reading or writing a key takes well under a millisecond because the data sits in RAM and each command is tiny. It fits short-lived data (sessions, OTP codes), data that can be rebuilt from another source (caches), counters and leaderboards that change all the time, and small queues. What they share: losing them is annoying but costs no money.

**What PostgreSQL is good at.** It writes to disk through the WAL log before it says done, so a power cut does not lose a confirmed transaction. It has constraints (foreign keys, CHECK), transactions that can roll back, and SQL to ask a new question at any time: joins, grouping, any filter. Orders, payments, customers and real stock are data that must be right and must stay.

**Redis does save to disk, but.** Redis can write snapshots (RDB) and a command log (AOF), covered in the lesson on saving to disk. Still, a default setup can lose the last few seconds of writes in a crash, and Redis has no constraints or rollback. So the safe habit is to treat Redis as a copy or as temporary data, with the source of truth in PostgreSQL.

**Memory is limited.** Every key must fit in RAM. When it is full, Redis either refuses writes or deletes keys by itself according to `maxmemory-policy` (for example the least recently used keys). For a cache that is fine; for orders it is not.

The figure at the end of this section splits the shop's data between the two places.

## Syntax

```redis
SET session:t9 lily EX 1800
GET cache:order:o101
FLUSHALL
DBSIZE
```

- Temporary data: always with `EX`; the source of truth: PostgreSQL.
- `FLUSHALL` deletes every key; only use it in lessons.

## Example

A login session with an expiry:

```redis
SET session:t9 lily EX 1800
TTL session:t9
```

The cached order status and its time left:

```redis
GET cache:order:o101
TTL cache:order:o101
```

Redis restarts with nothing saved: every key is gone.

```redis
FLUSHALL
DBSIZE
GET cache:order:o101
```

## Common mistakes

Keeping an order only in Redis: losing the memory loses the order, with no source to load it back from.

```redis
# WRONG
HSET order:o300 total 450000
FLUSHALL
HGETALL order:o300
```

```redis
# FIX
SET cache:order:o300 450000 EX 600
FLUSHALL
GET cache:order:o300
```

The fix still misses after the memory is lost, but `(nil)` here only means "ask PostgreSQL again", where order `o300` is still there.

Redis has no JOIN or SQL:

```redis
# ERROR ERR
JOIN orders customers
```

## Practice

Four steps: store a session token with an expiry, read a cached copy, simulate Redis losing its memory, and read the cached copy again to see it miss.

## Recap

- Redis: temporary, rebuildable, read-heavy data; always set an expiry.
- PostgreSQL: data that must be right and must stay, with constraints, rollback and SQL.
- A lost cache only slows things down, because the source of truth is still in PostgreSQL.
- Memory is limited: when full, Redis refuses writes or deletes keys by itself.
