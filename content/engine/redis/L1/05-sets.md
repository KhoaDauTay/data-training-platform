---
id: e-rd-l1-05
engine: redis
level: L1
module: types
title: Set, tập không trùng
title_en: Sets, collections without duplicates
kind: lab
runtime: browser
minutes: 15
requires: [e-rd-l1-04]
figures: [{ name: rd-set-overlap, at: idea }]
objectives:
  - vi: Lưu tập phần tử không trùng bằng SADD, SISMEMBER, SCARD, SMEMBERS.
    en: Keep a collection without duplicates with SADD, SISMEMBER, SCARD, SMEMBERS.
  - vi: Tìm phần chung và phần gộp của hai tập bằng SINTER, SUNION.
    en: Find what two sets share and what they hold together with SINTER, SUNION.
  - vi: Biết rằng set không có thứ tự, nên đừng dựa vào thứ tự SMEMBERS in ra.
    en: Know that a set has no order, so do not rely on the order SMEMBERS prints.
sources:
  - { url: "https://redis.io/docs/latest/develop/data-types/sets/", title: "Redis docs: Sets", title_vi: "Tài liệu Redis: set" }
  - { url: "https://valkey.io/commands/sadd/", title: "Valkey docs: SADD", title_vi: "Tài liệu Valkey: SADD" }
  - { url: "https://valkey.io/commands/sinter/", title: "Valkey docs: SINTER", title_vi: "Tài liệu Valkey: SINTER" }
lab:
  setup: |
    SADD visitors:2026-10-30 lily boon an
    SADD visitors:2026-10-31 lily minh
    SADD tags:p01 lantern paper red
    SADD tags:p07 lantern silk
  steps:
    - task:
        vi: "Khách `boon` vừa vào trang hôm 31/10: ghi nhận vào `visitors:2026-10-31`. Ghi hai lần cũng chỉ được đếm một lần."
        en: "Visitor `boon` just opened the site on 31 Oct: record him in `visitors:2026-10-31`. Recording him twice still counts once."
      solution: SADD visitors:2026-10-31 boon
      check: doc
      after: SCARD visitors:2026-10-31
      hint:
        vi: "Thêm vào set: `SADD`."
        en: "Add to a set: `SADD`."
    - task:
        vi: "Hôm 31/10 có bao nhiêu khách khác nhau?"
        en: "How many different visitors came on 31 Oct?"
      solution: SCARD visitors:2026-10-31
      check: doc
      hint:
        vi: "Số phần tử của một set."
        en: "The number of members of a set."
    - task:
        vi: "Ai đã vào cả hai ngày 30/10 và 31/10?"
        en: "Who came on both 30 Oct and 31 Oct?"
      solution: SINTER visitors:2026-10-30 visitors:2026-10-31
      check: doc
      hint:
        vi: "Phần chung của hai set: giao."
        en: "What two sets share: the intersection."
    - task:
        vi: "Sản phẩm `p07` có gắn nhãn `silk` không?"
        en: "Is product `p07` tagged `silk`?"
      solution: SISMEMBER tags:p07 silk
      check: doc
      hint:
        vi: "Hỏi một phần tử có trong set không, trả 1 hoặc 0."
        en: "Ask whether one member is in a set, it returns 1 or 0."
    - task:
        vi: "Mọi nhãn của `p01` và `p07` gộp lại, không lặp."
        en: "All the tags of `p01` and `p07` together, without repeats."
      solution: SUNION tags:p01 tags:p07
      check: doc
      hint:
        vi: "Phần gộp của hai set: hợp."
        en: "Two sets put together: the union."
quiz:
  - q:
      vi: "`SADD visitors:2026-10-31 lily` khi `lily` đã có trong set trả gì?"
      en: "What does `SADD visitors:2026-10-31 lily` return when `lily` is already in the set?"
    options:
      - { vi: "`(integer) 0`", en: "`(integer) 0`" }
      - { vi: "Một lỗi vì trùng", en: "An error, because it is a duplicate" }
      - { vi: "`(integer) 1`", en: "`(integer) 1`" }
    answer: 0
    trap: 1
    why:
      vi: "Với cơ sở dữ liệu có ràng buộc UNIQUE, ghi trùng thường bị báo lỗi, nên dễ nghĩ Redis cũng vậy. Set không báo lỗi: nó chỉ bỏ qua phần tử đã có, và `SADD` trả số phần tử mới thêm, ở đây là 0. Vì vậy ứng dụng có thể gọi `SADD` mỗi lượt xem mà số khách không bao giờ bị đếm hai lần."
      en: "In a database with a UNIQUE constraint a duplicate write usually fails, so it is easy to think Redis does the same. A set raises no error: it simply ignores a member it already has, and `SADD` returns the number of new members, here 0. That is why the app can call `SADD` on every view and no visitor is ever counted twice."
  - q:
      vi: "`SMEMBERS tags:p01` in `\"red\"`, `\"lantern\"`, `\"paper\"`. Lần sau có chắc in đúng thứ tự đó không?"
      en: "`SMEMBERS tags:p01` printed `\"red\"`, `\"lantern\"`, `\"paper\"`. Will the next call surely print that order?"
    options:
      - { vi: "Có, theo thứ tự thêm vào", en: "Yes, in the order they were added" }
      - { vi: "Có, theo bảng chữ cái", en: "Yes, in alphabetical order" }
      - { vi: "Không, set không có thứ tự", en: "No, a set has no order" }
    answer: 2
    trap: 0
    why:
      vi: "Thứ tự in ra có thể trông giống thứ tự thêm vào, nhưng set lưu phần tử theo cấu trúc băm và Redis không hứa thứ tự nào; một set lớn hơn hay một server khác có thể in khác. Cũng không có sắp theo bảng chữ cái. Cần thứ tự thì dùng list (theo lúc thêm) hoặc sorted set (theo điểm)."
      en: "The printed order may look like the order of adding, but a set stores members in a hash structure and Redis promises no order; a bigger set or another server may print it differently. There is no alphabetical sort either. When order matters, use a list (by time added) or a sorted set (by score)."
---
## Mở bài

Chợ Lồng Đèn muốn biết mỗi ngày có bao nhiêu khách khác nhau, và sản phẩm nào gắn nhãn gì. Cả hai đều là tập hợp: một khách vào mười lần vẫn là một khách. Redis có kiểu set (tập hợp) giữ mỗi phần tử đúng một lần.

## Ý chính

**Không trùng, không thứ tự.** Một khóa set giữ các chuỗi khác nhau. `SADD` thêm một hay nhiều phần tử và trả số phần tử thật sự mới; thêm phần tử đã có không báo lỗi, chỉ không được đếm. Set không có thứ tự: `SMEMBERS` in hết phần tử nhưng Redis không hứa thứ tự nào, nên bài này chấm các câu `SMEMBERS`, `SINTER`, `SUNION` như một tập, không theo thứ tự in.

**Hỏi nhanh.** `SISMEMBER key x` trả 1 nếu `x` có trong set, 0 nếu không; `SCARD` trả số phần tử. Cả hai nhanh như nhau dù set lớn hay nhỏ, vì Redis không phải duyệt cả set.

**Phép tập hợp.** `SINTER a b` trả phần tử có trong cả hai set (giao), `SUNION a b` trả phần tử có trong ít nhất một set (hợp), không lặp. Khách vào cả hai ngày là giao của hai set khách theo ngày. Một set không tồn tại được coi như set rỗng, nên giao với nó là rỗng.

**Một khóa mỗi ngày.** Đặt khóa theo ngày (`visitors:2026-10-31`) giúp mỗi ngày là một set riêng, đếm bằng `SCARD`, và có thể cho hết hạn bằng `EXPIRE` sau vài tuần. Với hàng triệu khách mỗi ngày, Redis thật có HyperLogLog để đếm gần đúng với rất ít bộ nhớ; bài này dùng set vì đếm đúng.

Hình cuối mục cho thấy hai set khách theo ngày và phần chung của chúng.

## Cú pháp

```redis
SADD key a b c
SREM key a
SISMEMBER key a
SCARD key
SMEMBERS key
SINTER k1 k2
SUNION k1 k2
```

- `SADD` trả số phần tử mới, không báo lỗi khi trùng.
- `SMEMBERS`, `SINTER`, `SUNION` không có thứ tự.

## Ví dụ

Khách ngày 30/10 và số lượng:

```redis
SMEMBERS visitors:2026-10-30
SCARD visitors:2026-10-30
```

Ghi trùng không đổi số khách:

```redis
SADD visitors:2026-10-30 lily
SCARD visitors:2026-10-30
```

Nhãn chung của hai sản phẩm:

```redis
SINTER tags:p01 tags:p07
```

## Lỗi hay gặp

Đếm lượt bằng list thay vì set: khách vào hai lần bị đếm hai lần.

```redis
# WRONG
RPUSH visits:list lily lily boon
LLEN visits:list
```

```redis
# FIX
SADD visits:set lily lily boon
SCARD visits:set
```

Dùng lệnh set trên một khóa list:

```redis
# ERROR WRONGTYPE
RPUSH recent:lily p01
SADD recent:lily p02
```

## Thực hành

Năm bước: ghi một khách vào set của ngày, đếm khách, tìm khách vào cả hai ngày, hỏi một nhãn có không, và gộp nhãn của hai sản phẩm.

## Tóm tắt

- Set giữ mỗi phần tử một lần; `SADD` trùng không lỗi, trả 0.
- `SISMEMBER` và `SCARD` trả lời nhanh mà không duyệt cả set.
- `SINTER` là phần chung, `SUNION` là phần gộp.
- Set không có thứ tự; cần thứ tự thì dùng list hoặc sorted set.

# EN

## Opening

Lantern Market wants to know how many different visitors come each day, and which tags each product has. Both are sets: a visitor who comes ten times is still one visitor. Redis has the set type, which holds each member exactly once.

## Key idea

**No duplicates, no order.** A set key holds distinct strings. `SADD` adds one or more members and returns how many were really new; adding a member that is already there raises no error, it is just not counted. A set has no order: `SMEMBERS` prints every member but Redis promises no order, so this lesson grades `SMEMBERS`, `SINTER` and `SUNION` answers as sets, not by printed order.

**Fast questions.** `SISMEMBER key x` returns 1 if `x` is in the set, 0 if not; `SCARD` returns the number of members. Both are equally fast for a big set or a small one, because Redis does not walk the whole set.

**Set operations.** `SINTER a b` returns the members in both sets (the intersection), `SUNION a b` returns the members in at least one (the union), without repeats. Visitors who came on both days are the intersection of the two daily sets. A set that does not exist counts as empty, so intersecting with it gives nothing.

**One key per day.** Naming keys by day (`visitors:2026-10-31`) makes each day its own set, counted with `SCARD`, and lets it expire with `EXPIRE` after a few weeks. With millions of visitors a day, real Redis has HyperLogLog to count approximately with very little memory; this lesson uses sets because they count exactly.

The figure at the end of this section shows two daily visitor sets and what they share.

## Syntax

```redis
SADD key a b c
SREM key a
SISMEMBER key a
SCARD key
SMEMBERS key
SINTER k1 k2
SUNION k1 k2
```

- `SADD` returns the number of new members and raises no error on duplicates.
- `SMEMBERS`, `SINTER`, `SUNION` have no order.

## Example

The visitors of 30 Oct and how many:

```redis
SMEMBERS visitors:2026-10-30
SCARD visitors:2026-10-30
```

A duplicate does not change the count:

```redis
SADD visitors:2026-10-30 lily
SCARD visitors:2026-10-30
```

The tags two products share:

```redis
SINTER tags:p01 tags:p07
```

## Common mistakes

Counting with a list instead of a set: a visitor who came twice is counted twice.

```redis
# WRONG
RPUSH visits:list lily lily boon
LLEN visits:list
```

```redis
# FIX
SADD visits:set lily lily boon
SCARD visits:set
```

A set command on a list key:

```redis
# ERROR WRONGTYPE
RPUSH recent:lily p01
SADD recent:lily p02
```

## Practice

Five steps: record a visitor in the day's set, count the visitors, find who came on both days, ask whether a tag is there, and put two products' tags together.

## Recap

- A set holds each member once; a duplicate `SADD` raises no error and returns 0.
- `SISMEMBER` and `SCARD` answer fast without walking the whole set.
- `SINTER` is what sets share, `SUNION` is what they hold together.
- A set has no order; when order matters, use a list or a sorted set.
