---
id: e-rd-l1-07
engine: redis
level: L1
module: types
title: Đặt tên khóa, xem kiểu và tìm khóa an toàn
title_en: Naming keys, checking types and finding keys safely
kind: lab
runtime: browser
minutes: 15
requires: [e-rd-l1-06]
figures: [{ name: rd-key-types, at: idea }]
objectives:
  - vi: Đặt tên khóa theo mẫu `kind:id:field` để nhóm và tìm được.
    en: Name keys with the pattern `kind:id:field` so they group and can be found.
  - vi: Biết một khóa giữ kiểu gì bằng TYPE, và tránh lỗi WRONGTYPE.
    en: See which type a key holds with TYPE, and avoid WRONGTYPE errors.
  - vi: Tìm khóa bằng SCAN thay vì KEYS, xóa nhiều khóa bằng một DEL.
    en: Find keys with SCAN instead of KEYS, delete several keys with one DEL.
sources:
  - { url: "https://valkey.io/topics/keyspace/", title: "Valkey docs: Keyspace", title_vi: "Tài liệu Valkey: keyspace" }
  - { url: "https://valkey.io/commands/scan/", title: "Valkey docs: SCAN", title_vi: "Tài liệu Valkey: SCAN" }
  - { url: "https://valkey.io/commands/keys/", title: "Valkey docs: KEYS", title_vi: "Tài liệu Valkey: KEYS" }
lab:
  setup: |
    SET user:7:name Lily
    HSET cart:7 p01 2
    RPUSH orders:pack o101
    SADD tags:p01 lantern
    ZADD sales:2026-10 120 store:1
    SET cache:p01 45000 EX 600
    SET cache:p07 99000 EX 600
  steps:
    - task:
        vi: "Khóa `cart:7` đang giữ kiểu dữ liệu gì?"
        en: "Which data type does key `cart:7` hold?"
      solution: TYPE cart:7
      check: doc
      hint:
        vi: "Một lệnh trả tên kiểu của khóa."
        en: "One command returns the key's type name."
    - task:
        vi: "Liệt kê mọi khóa cache (tên bắt đầu bằng `cache:`) mà không chặn server như `KEYS`."
        en: "List every cache key (names starting with `cache:`) without blocking the server the way `KEYS` does."
      solution: "SCAN 0 MATCH cache:*"
      check: doc
      hint:
        vi: "`SCAN` bắt đầu từ con trỏ 0 và nhận `MATCH` với mẫu có `*`."
        en: "`SCAN` starts at cursor 0 and takes `MATCH` with a pattern using `*`."
    - task:
        vi: "Giá vừa đổi: xóa cả hai khóa cache trong một lệnh."
        en: "The prices just changed: delete both cache keys in one command."
      solution: DEL cache:p01 cache:p07
      check: doc
      after: EXISTS cache:p01 cache:p07
      hint:
        vi: "`DEL` nhận nhiều khóa và trả số khóa đã xóa."
        en: "`DEL` takes several keys and returns how many it deleted."
    - task:
        vi: "Bây giờ cơ sở dữ liệu còn bao nhiêu khóa?"
        en: "How many keys does the database hold now?"
      solution: DBSIZE
      check: doc
      hint:
        vi: "Một lệnh đếm mọi khóa, không cần liệt kê."
        en: "One command counts every key, without listing them."
quiz:
  - q:
      vi: "Vì sao không nên chạy `KEYS *` trên Redis đang phục vụ khách?"
      en: "Why should you not run `KEYS *` on a Redis that is serving customers?"
    options:
      - { vi: "Nó có thể trả thiếu vài khóa", en: "It may miss some of the keys" }
      - { vi: "Nó duyệt hết khóa, khách khác phải chờ", en: "It walks all keys while others wait" }
      - { vi: "Nó đã bị bỏ và luôn báo lỗi", en: "It was removed and always fails" }
    answer: 1
    trap: 0
    why:
      vi: "`KEYS` không trả thiếu: nó trả đủ, và chính vì vậy nó phải duyệt hết mọi khóa trong một lệnh. Redis chạy từng lệnh một, nên với hàng triệu khóa, mọi khách khác phải chờ lệnh đó xong. Lệnh vẫn chạy được, không báo lỗi. `SCAN` đi từng đợt nhỏ với một con trỏ, nên các lệnh khác chen vào được giữa các đợt."
      en: "`KEYS` does not miss keys: it returns them all, and that is exactly why it must walk every key in one command. Redis runs one command at a time, so with millions of keys every other client waits until it ends. The command still works and raises no error. `SCAN` walks in small batches with a cursor, so other commands can run between batches."
  - q:
      vi: "Tên khóa nào tốt nhất cho giỏ hàng của khách số 7?"
      en: "Which key name is best for the cart of customer 7?"
    options:
      - { vi: "`cart:7`", en: "`cart:7`" }
      - { vi: "`7`", en: "`7`" }
      - { vi: "`\"cart of customer 7\"`", en: "`\"cart of customer 7\"`" }
    answer: 0
    trap: 2
    why:
      vi: "Tên có dấu cách là hợp lệ nếu đặt trong ngoặc kép, nên nó trông rõ nghĩa, nhưng mọi lệnh đều phải nhớ ngoặc và `MATCH` khó viết. Chỉ `7` thì đụng với mọi thứ khác của khách 7. `cart:7` theo mẫu `kind:id`: ngắn, nhóm được bằng `SCAN 0 MATCH cart:*`, và không trùng với `user:7:name`."
      en: "A name with spaces is valid inside double quotes, so it looks clear, but every command must remember the quotes and `MATCH` is awkward to write. Plain `7` clashes with everything else about customer 7. `cart:7` follows the `kind:id` pattern: short, groupable with `SCAN 0 MATCH cart:*`, and distinct from `user:7:name`."
---
## Mở bài

Kho Redis của Chợ Lồng Đèn đã có chuỗi, hash, list, set và sorted set nằm cạnh nhau trong một không gian khóa. Bài này là vài thói quen để không lạc trong đó: đặt tên khóa có hệ thống, xem một khóa giữ kiểu gì, và tìm khóa mà không làm server đứng lại.

## Ý chính

**Một không gian khóa phẳng.** Redis không có thư mục hay bảng: mọi khóa nằm chung một chỗ. Thói quen chung là đặt tên theo mẫu `kind:id:field`, như `user:7:name`, `cart:7`, `cache:p01`. Dấu hai chấm không có nghĩa gì với Redis, nhưng giúp người đọc hiểu khóa là gì và giúp tìm cả nhóm bằng một mẫu như `cache:*`. Tên ngắn mà rõ là đủ; mỗi byte của tên khóa cũng nằm trong bộ nhớ.

**Mỗi khóa một kiểu.** `TYPE key` trả `string`, `hash`, `list`, `set`, `zset`, hoặc `none` khi không có khóa. Một khóa chỉ giữ một kiểu, nên lệnh của kiểu khác bị từ chối với `WRONGTYPE`. Kiểu được quyết định bởi lệnh đầu tiên tạo ra khóa.

**Tìm khóa: SCAN thay KEYS.** `KEYS cache:*` trả đủ mọi khóa khớp mẫu, nhưng nó duyệt cả không gian khóa trong một lệnh, và trong lúc đó mọi khách khác phải chờ. `SCAN 0 MATCH cache:*` trả một con trỏ và một đợt khóa; gọi tiếp với con trỏ vừa nhận cho tới khi con trỏ về `0`. Trình mô phỏng trả hết trong một đợt với con trỏ `0`, nhưng cách gọi giống Redis thật.

**Đếm và xóa.** `EXISTS a b` trả số khóa có (một khóa ghi hai lần được đếm hai lần), `DEL a b` xóa nhiều khóa và trả số đã xóa, `DBSIZE` đếm mọi khóa mà không phải liệt kê.

Hình cuối mục cho thấy năm khóa cùng một không gian, mỗi khóa một kiểu.

## Cú pháp

```redis
TYPE key
SCAN 0 MATCH cache:*
SCAN 0 MATCH cache:* COUNT 100
EXISTS k1 k2
DEL k1 k2
DBSIZE
```

- Mẫu dùng `*` (mọi chuỗi), `?` (một ký tự), `[ab]` (một trong các ký tự).
- `SCAN` trả một con trỏ và một đợt khóa; con trỏ `0` là hết.

## Ví dụ

Kiểu của ba khóa, một khóa không có:

```redis
TYPE orders:pack
TYPE tags:p01
TYPE nope
```

Tìm các khóa cache:

```redis
SCAN 0 MATCH cache:*
```

Đếm khóa có và cả không gian khóa:

```redis
EXISTS user:7:name cart:7 nope
DBSIZE
```

## Lỗi hay gặp

Dùng lệnh list trên một hash:

```redis
# ERROR WRONGTYPE
LPUSH cart:7 p09
```

`KEYS *` chạy được nhưng duyệt mọi khóa một mạch; tìm theo mẫu bằng `SCAN`:

```redis
# WRONG
KEYS *
```

```redis
# FIX
SCAN 0 MATCH cart:*
```

Con trỏ của `SCAN` phải là một số:

```redis
# ERROR ERR
SCAN abc
```

## Thực hành

Bốn bước: xem kiểu của một khóa, tìm các khóa cache bằng `SCAN`, xóa chúng trong một lệnh, và đếm số khóa còn lại.

## Tóm tắt

- Mọi khóa nằm chung một không gian; đặt tên theo `kind:id:field`.
- `TYPE` cho biết kiểu; mỗi khóa một kiểu, lệnh sai kiểu bị `WRONGTYPE`.
- Tìm bằng `SCAN … MATCH`, không bằng `KEYS` trên server đang chạy.
- `EXISTS`, `DEL` nhận nhiều khóa; `DBSIZE` đếm mà không liệt kê.

# EN

## Opening

Lantern Market's Redis now holds strings, hashes, lists, sets and sorted sets side by side in one keyspace. This lesson is a few habits for not getting lost in it: naming keys systematically, checking which type a key holds, and finding keys without freezing the server.

## Key idea

**One flat keyspace.** Redis has no folders or tables: every key lives in the same place. The common habit is to name keys with the pattern `kind:id:field`, such as `user:7:name`, `cart:7`, `cache:p01`. The colon means nothing to Redis, but it tells a reader what the key is and lets a pattern such as `cache:*` find the whole group. Short but clear names are enough; every byte of a key name is kept in memory too.

**One type per key.** `TYPE key` returns `string`, `hash`, `list`, `set`, `zset`, or `none` when there is no key. A key holds one type, so a command of another type is refused with `WRONGTYPE`. The type is decided by the first command that creates the key.

**Finding keys: SCAN, not KEYS.** `KEYS cache:*` returns every matching key, but it walks the whole keyspace in one command, and meanwhile every other client waits. `SCAN 0 MATCH cache:*` returns a cursor and a batch of keys; call it again with the cursor you got until the cursor comes back as `0`. The simulator returns everything in one batch with cursor `0`, but the call is the same as on real Redis.

**Counting and deleting.** `EXISTS a b` returns how many of the keys exist (a key named twice counts twice), `DEL a b` deletes several keys and returns how many it deleted, `DBSIZE` counts every key without listing them.

The figure at the end of this section shows five keys in one keyspace, each with its own type.

## Syntax

```redis
TYPE key
SCAN 0 MATCH cache:*
SCAN 0 MATCH cache:* COUNT 100
EXISTS k1 k2
DEL k1 k2
DBSIZE
```

- Patterns use `*` (any string), `?` (one character), `[ab]` (one of the characters).
- `SCAN` returns a cursor and a batch of keys; cursor `0` means done.

## Example

The types of three keys, one missing:

```redis
TYPE orders:pack
TYPE tags:p01
TYPE nope
```

Find the cache keys:

```redis
SCAN 0 MATCH cache:*
```

Count existing keys and the whole keyspace:

```redis
EXISTS user:7:name cart:7 nope
DBSIZE
```

## Common mistakes

A list command on a hash:

```redis
# ERROR WRONGTYPE
LPUSH cart:7 p09
```

`KEYS *` runs, but it walks every key in one go; find by pattern with `SCAN`:

```redis
# WRONG
KEYS *
```

```redis
# FIX
SCAN 0 MATCH cart:*
```

The `SCAN` cursor must be a number:

```redis
# ERROR ERR
SCAN abc
```

## Practice

Four steps: check a key's type, find the cache keys with `SCAN`, delete them in one command, and count the keys left.

## Recap

- Every key lives in one keyspace; name keys `kind:id:field`.
- `TYPE` tells the type; one type per key, a wrong-type command gets `WRONGTYPE`.
- Find keys with `SCAN … MATCH`, not with `KEYS` on a live server.
- `EXISTS`, `DEL` take several keys; `DBSIZE` counts without listing.
