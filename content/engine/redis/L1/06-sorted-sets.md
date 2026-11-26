---
id: e-rd-l1-06
engine: redis
level: L1
module: types
title: Sorted set, bảng xếp hạng
title_en: Sorted sets, a leaderboard
kind: lab
runtime: browser
minutes: 20
requires: [e-rd-l1-05]
figures: [{ name: rd-zset-board, at: idea }]
objectives:
  - vi: Xây bảng xếp hạng bằng ZADD, ZINCRBY và đọc top N bằng ZRANGE … REV WITHSCORES.
    en: Build a leaderboard with ZADD, ZINCRBY and read the top N with ZRANGE … REV WITHSCORES.
  - vi: Tìm hạng và điểm của một thành viên bằng ZREVRANK, ZSCORE.
    en: Find a member's rank and score with ZREVRANK, ZSCORE.
  - vi: Lọc theo khoảng điểm bằng ZRANGEBYSCORE và giữ điểm cao nhất bằng ZADD GT.
    en: Filter by a score range with ZRANGEBYSCORE and keep the best score with ZADD GT.
sources:
  - { url: "https://redis.io/docs/latest/develop/data-types/sorted-sets/", title: "Redis docs: Sorted sets" }
  - { url: "https://valkey.io/commands/zadd/", title: "Valkey docs: ZADD" }
  - { url: "https://valkey.io/commands/zrange/", title: "Valkey docs: ZRANGE" }
lab:
  setup: |
    ZADD sales:2026-10 120 store:1 340 store:2 310 store:3 90 store:4
    ZADD quiz:best 70 lily 85 boon
  steps:
    - task:
        vi: "Ba cửa hàng bán nhiều nhất tháng 10 (`sales:2026-10`) kèm doanh số, từ cao xuống thấp."
        en: "The three stores with the most sales in October (`sales:2026-10`) with their sales, highest first."
      solution: ZRANGE sales:2026-10 0 2 REV WITHSCORES
      check: doc
      hint:
        vi: "`ZRANGE` đọc từ thấp lên; thêm `REV` để đọc từ cao xuống, `WITHSCORES` để có điểm."
        en: "`ZRANGE` reads from low to high; add `REV` to read from high to low, `WITHSCORES` to get the scores."
    - task:
        vi: "`store:4` vừa bán thêm 15 đơn: cộng 15 vào điểm của nó."
        en: "`store:4` just sold 15 more: add 15 to its score."
      solution: ZINCRBY sales:2026-10 15 store:4
      check: doc
      after: ZSCORE sales:2026-10 store:4
      hint:
        vi: "`ZINCRBY key 15 member` cộng điểm và trả điểm mới."
        en: "`ZINCRBY key 15 member` adds to the score and returns the new one."
    - task:
        vi: "`store:1` đứng thứ mấy tính từ trên xuống? (0 là hạng nhất)"
        en: "Which place is `store:1` in, counting from the top? (0 is first place)"
      solution: ZREVRANK sales:2026-10 store:1
      check: doc
      hint:
        vi: "`ZRANK` đếm từ điểm thấp nhất; từ trên xuống thì dùng `ZREVRANK`."
        en: "`ZRANK` counts from the lowest score; from the top, use `ZREVRANK`."
    - task:
        vi: "Các cửa hàng có doanh số từ 100 đến 320 (tính cả hai đầu), từ thấp lên cao."
        en: "The stores with sales from 100 to 320 (both included), from low to high."
      solution: ZRANGEBYSCORE sales:2026-10 100 320
      check: doc
      hint:
        vi: "`ZRANGEBYSCORE key min max` đọc theo khoảng điểm."
        en: "`ZRANGEBYSCORE key min max` reads by score range."
    - task:
        vi: "Lily vừa làm bài kiểm tra được 65 điểm. `quiz:best` chỉ giữ điểm cao nhất của mỗi người: ghi điểm mới mà không làm tụt điểm cũ."
        en: "Lily just scored 65 on a quiz. `quiz:best` keeps only each person's best score: record the new score without lowering the old one."
      solution: ZADD quiz:best GT 65 lily
      check: doc
      after: ZSCORE quiz:best lily
      hint:
        vi: "Tùy chọn `GT` chỉ cập nhật khi điểm mới lớn hơn điểm đang có."
        en: "Option `GT` only updates when the new score is greater than the current one."
quiz:
  - q:
      vi: "`ZRANGE sales:2026-10 0 2` (không có `REV`) trả ba cửa hàng nào?"
      en: "Which three stores does `ZRANGE sales:2026-10 0 2` (no `REV`) return?"
    options:
      - { vi: "Ba cửa hàng bán nhiều nhất", en: "The three with the most sales" }
      - { vi: "Ba cửa hàng bán ít nhất", en: "The three with the fewest sales" }
      - { vi: "Ba cửa hàng được thêm đầu tiên", en: "The first three stores added" }
    answer: 1
    trap: 0
    why:
      vi: "Bảng xếp hạng làm ta nghĩ hạng 0 là cao nhất, nhưng sorted set luôn xếp từ điểm thấp lên cao, nên chỉ số 0 là điểm thấp nhất và câu này trả ba cửa hàng bán ít nhất. Thứ tự thêm vào không quan trọng: điểm quyết định vị trí. Muốn top 3, thêm `REV`: `ZRANGE sales:2026-10 0 2 REV`."
      en: "A leaderboard makes us think index 0 is the top, but a sorted set always orders from the lowest score up, so index 0 is the lowest and this returns the three stores with the fewest sales. The order of adding does not matter: the score decides the position. For the top 3, add `REV`: `ZRANGE sales:2026-10 0 2 REV`."
  - q:
      vi: "`quiz:best` có `lily` với 70 điểm. Sau `ZADD quiz:best GT 90 lily`, điểm của Lily là bao nhiêu?"
      en: "`quiz:best` has `lily` at 70. After `ZADD quiz:best GT 90 lily`, what is Lily's score?"
    options:
      - { vi: "Vẫn 70", en: "Still 70" }
      - { vi: "90", en: "90" }
      - { vi: "160, cộng dồn", en: "160, added up" }
    answer: 1
    trap: 2
    why:
      vi: "`ZADD` ghi điểm, không cộng: cộng dồn là việc của `ZINCRBY`, nên 160 là sai. `GT` (greater than) chỉ chặn khi điểm mới không lớn hơn điểm cũ; 90 lớn hơn 70 nên điểm thành 90. Với 65 thì điểm giữ nguyên 70, đó là cách giữ điểm cao nhất trong một lệnh."
      en: "`ZADD` sets a score, it does not add: adding up is what `ZINCRBY` does, so 160 is wrong. `GT` (greater than) only blocks a new score that is not higher than the old one; 90 is higher than 70, so the score becomes 90. With 65 the score would stay 70, which is how one command keeps the best score."
---
## Mở bài

Chợ Lồng Đèn xếp hạng cửa hàng theo doanh số tháng và giữ điểm cao nhất của mỗi người trong bài kiểm tra. Cả hai cần một tập có thứ tự theo con số. Redis có sorted set (tập có thứ tự): mỗi thành viên đi kèm một điểm, và Redis luôn giữ chúng xếp theo điểm.

## Ý chính

**Thành viên và điểm.** Sorted set giống set ở chỗ mỗi thành viên chỉ có một lần, nhưng mỗi thành viên mang một điểm (score), là một số thực. `ZADD key 120 store:1` thêm thành viên hoặc đổi điểm của nó và trả số thành viên mới. `ZINCRBY key 15 store:4` cộng 15 vào điểm và trả điểm mới, trong một lệnh, nên hai đơn cùng lúc không làm mất lượt nào.

**Thứ tự luôn từ thấp lên.** Redis xếp theo điểm tăng dần; hai thành viên cùng điểm thì xếp theo tên. `ZRANGE key 0 2` trả ba thành viên điểm thấp nhất. Bảng xếp hạng cần đọc từ cao xuống: thêm `REV`, và `WITHSCORES` để có điểm đi kèm. Trong redis-cli, `WITHSCORES` in xen kẽ: thành viên, điểm, thành viên, điểm. Thứ tự ở đây có ý nghĩa, nên các bước của bài chấm theo thứ tự.

**Hạng và khoảng điểm.** `ZRANK` trả vị trí tính từ điểm thấp nhất (0 là thấp nhất), `ZREVRANK` tính từ điểm cao nhất (0 là hạng nhất); thành viên không có thì trả `(nil)`. `ZSCORE` trả điểm. `ZRANGEBYSCORE key min max` lấy theo khoảng điểm, tính cả hai đầu; viết `(120` để bỏ đầu 120, và `-inf`, `+inf` cho không giới hạn.

**Giữ điểm tốt nhất.** `ZADD … GT` chỉ đổi điểm khi điểm mới lớn hơn điểm đang có, `LT` khi nhỏ hơn; thành viên mới vẫn được thêm. Đó là bảng "kỷ lục" trong một lệnh, không cần đọc điểm cũ ra so.

Hình cuối mục cho thấy bảng doanh số tháng 10 đọc từ cao xuống.

## Cú pháp

```redis
ZADD key 120 store:1
ZINCRBY key 15 store:4
ZRANGE key 0 2 REV WITHSCORES
ZREVRANK key store:1
ZSCORE key store:1
ZRANGEBYSCORE key 100 320
ZADD key GT 65 lily
```

- Chỉ số 0 của `ZRANGE` là điểm thấp nhất; `REV` đảo lại.
- `(120` là "lớn hơn 120", không tính 120.

## Ví dụ

Cả bảng, từ thấp lên, kèm điểm:

```redis
ZRANGE sales:2026-10 0 -1 WITHSCORES
```

Điểm và hạng tính từ dưới lên của một cửa hàng:

```redis
ZSCORE sales:2026-10 store:2
ZRANK sales:2026-10 store:2
```

Doanh số lớn hơn 120, không giới hạn trên:

```redis
ZRANGEBYSCORE sales:2026-10 (120 +inf
```

## Lỗi hay gặp

Đọc top 3 mà quên `REV`: ra ba cửa hàng bán ít nhất.

```redis
# WRONG
ZRANGE sales:2026-10 0 2
```

```redis
# FIX
ZRANGE sales:2026-10 0 2 REV
```

Ghi điểm mới bằng `ZADD` thường làm tụt kỷ lục:

```redis
# WRONG
ZADD quiz:best 65 lily
ZSCORE quiz:best lily
```

```redis
# FIX
ZADD quiz:best GT 65 lily
ZSCORE quiz:best lily
```

Điểm phải là một số:

```redis
# ERROR ERR
ZADD sales:2026-10 abc store:5
```

## Thực hành

Năm bước: đọc top 3 kèm doanh số, cộng doanh số cho một cửa hàng, tìm hạng của một cửa hàng, lọc theo khoảng doanh số, và ghi điểm kiểm tra mà không làm tụt kỷ lục.

## Tóm tắt

- Sorted set: mỗi thành viên một lần, kèm một điểm; Redis giữ thứ tự theo điểm.
- Thứ tự luôn từ thấp lên; bảng xếp hạng dùng `REV` và `WITHSCORES`.
- `ZREVRANK` là hạng từ trên xuống, `ZRANGEBYSCORE` lọc theo khoảng điểm.
- `ZINCRBY` cộng điểm trong một lệnh; `ZADD … GT` giữ điểm cao nhất.

# EN

## Opening

Lantern Market ranks its stores by monthly sales and keeps each person's best quiz score. Both need a collection ordered by a number. Redis has the sorted set: every member carries a score, and Redis always keeps them ordered by it.

## Key idea

**Members and scores.** A sorted set is like a set in that each member appears once, but every member carries a score, a floating-point number. `ZADD key 120 store:1` adds a member or changes its score and returns the number of new members. `ZINCRBY key 15 store:4` adds 15 to the score and returns the new score, in one command, so two orders at once never lose one.

**The order is always low to high.** Redis orders by ascending score; members with the same score are ordered by name. `ZRANGE key 0 2` returns the three members with the lowest scores. A leaderboard reads from the top: add `REV`, and `WITHSCORES` to get the scores along. In redis-cli `WITHSCORES` prints them interleaved: member, score, member, score. Here the order means something, so this lesson grades its steps in order.

**Rank and score range.** `ZRANK` returns the position counted from the lowest score (0 is the lowest), `ZREVRANK` counts from the highest (0 is first place); a missing member returns `(nil)`. `ZSCORE` returns the score. `ZRANGEBYSCORE key min max` takes a score range, both ends included; write `(120` to leave 120 out, and `-inf`, `+inf` for no limit.

**Keeping the best score.** `ZADD … GT` only changes a score when the new one is greater than the current one, `LT` when it is lower; new members are still added. That is a "record" board in one command, with no need to read the old score and compare.

The figure at the end of this section shows October's sales board read from the top.

## Syntax

```redis
ZADD key 120 store:1
ZINCRBY key 15 store:4
ZRANGE key 0 2 REV WITHSCORES
ZREVRANK key store:1
ZSCORE key store:1
ZRANGEBYSCORE key 100 320
ZADD key GT 65 lily
```

- Index 0 of `ZRANGE` is the lowest score; `REV` turns it around.
- `(120` means "greater than 120", 120 not included.

## Example

The whole board, low to high, with scores:

```redis
ZRANGE sales:2026-10 0 -1 WITHSCORES
```

One store's score and its rank counted from the bottom:

```redis
ZSCORE sales:2026-10 store:2
ZRANK sales:2026-10 store:2
```

Sales above 120, with no upper limit:

```redis
ZRANGEBYSCORE sales:2026-10 (120 +inf
```

## Common mistakes

Reading the top 3 without `REV`: you get the three stores with the fewest sales.

```redis
# WRONG
ZRANGE sales:2026-10 0 2
```

```redis
# FIX
ZRANGE sales:2026-10 0 2 REV
```

Writing a new score with a plain `ZADD` lowers the record:

```redis
# WRONG
ZADD quiz:best 65 lily
ZSCORE quiz:best lily
```

```redis
# FIX
ZADD quiz:best GT 65 lily
ZSCORE quiz:best lily
```

The score must be a number:

```redis
# ERROR ERR
ZADD sales:2026-10 abc store:5
```

## Practice

Five steps: read the top 3 with their sales, add sales to one store, find a store's rank, filter by a sales range, and record a quiz score without lowering the record.

## Recap

- A sorted set: each member once, with a score; Redis keeps the order by score.
- The order is always low to high; a leaderboard uses `REV` and `WITHSCORES`.
- `ZREVRANK` is the rank from the top, `ZRANGEBYSCORE` filters by score range.
- `ZINCRBY` adds to a score in one command; `ZADD … GT` keeps the best score.
