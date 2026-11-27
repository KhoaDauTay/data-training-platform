---
id: e-rd-l1-04
engine: redis
level: L1
module: types
title: List, hàng đợi đơn hàng
title_en: Lists, an order queue
kind: lab
runtime: browser
minutes: 15
requires: [e-rd-l1-03]
figures: [{ name: rd-list-queue, at: idea }]
objectives:
  - vi: Dùng list làm hàng đợi vào trước ra trước bằng RPUSH và LPOP.
    en: Use a list as a first-in first-out queue with RPUSH and LPOP.
  - vi: Đọc một đoạn list bằng LRANGE với chỉ số âm.
    en: Read part of a list with LRANGE and negative indexes.
  - vi: Phân biệt hàng đợi (RPUSH + LPOP) với ngăn xếp (LPUSH + LPOP).
    en: Tell a queue (RPUSH + LPOP) from a stack (LPUSH + LPOP).
sources:
  - { url: "https://redis.io/docs/latest/develop/data-types/lists/", title: "Redis docs: Lists", title_vi: "Tài liệu Redis: list" }
  - { url: "https://valkey.io/commands/lpop/", title: "Valkey docs: LPOP", title_vi: "Tài liệu Valkey: LPOP" }
  - { url: "https://valkey.io/commands/lrange/", title: "Valkey docs: LRANGE", title_vi: "Tài liệu Valkey: LRANGE" }
lab:
  setup: |
    RPUSH orders:pack o101 o102 o103
    RPUSH views:lily p01 p07 p03 p09
  steps:
    - task:
        vi: "Đơn `o104` vừa thanh toán: xếp nó vào cuối hàng đợi đóng gói `orders:pack`."
        en: "Order `o104` was just paid: put it at the end of the packing queue `orders:pack`."
      solution: RPUSH orders:pack o104
      check: doc
      after: LRANGE orders:pack 0 -1
      hint:
        vi: "Cuối hàng là bên phải: `RPUSH`."
        en: "The end of the queue is the right side: `RPUSH`."
    - task:
        vi: "Nhân viên kho lấy đơn chờ lâu nhất ra để đóng gói."
        en: "A warehouse worker takes out the order that has waited longest, to pack it."
      solution: LPOP orders:pack
      check: doc
      after: LRANGE orders:pack 0 -1
      hint:
        vi: "Đơn vào trước nằm bên trái: `LPOP`."
        en: "The order that came first is on the left: `LPOP`."
    - task:
        vi: "Còn bao nhiêu đơn đang chờ đóng gói?"
        en: "How many orders are still waiting to be packed?"
      solution: LLEN orders:pack
      check: doc
      hint:
        vi: "Độ dài của một list."
        en: "The length of a list."
    - task:
        vi: "Trang của Lily hiện 2 sản phẩm cô xem gần nhất trong `views:lily` (sản phẩm mới nhất nằm cuối list), cũ trước mới sau."
        en: "Lily's page shows the 2 products she viewed last in `views:lily` (the newest is at the end of the list), older first."
      solution: LRANGE views:lily -2 -1
      check: doc
      hint:
        vi: "Chỉ số âm đếm từ cuối: -1 là phần tử cuối, -2 là phần tử trước nó."
        en: "Negative indexes count from the end: -1 is the last element, -2 the one before it."
quiz:
  - q:
      vi: "Một ứng dụng xếp việc bằng `LPUSH jobs …` và lấy việc bằng `LPOP jobs`. Việc nào được lấy ra trước?"
      en: "An app adds jobs with `LPUSH jobs …` and takes them with `LPOP jobs`. Which job comes out first?"
    options:
      - { vi: "Việc được thêm sớm nhất", en: "The job added earliest" }
      - { vi: "Một việc ngẫu nhiên", en: "A random job" }
      - { vi: "Việc được thêm sau cùng", en: "The job added last" }
    answer: 2
    trap: 0
    why:
      vi: "Tên `LPUSH` và `LPOP` nghe như một cặp hàng đợi, nhưng cả hai cùng làm việc ở đầu trái: việc mới nhất được đẩy vào bên trái rồi lấy ra đầu tiên, nên đây là ngăn xếp (vào sau ra trước). List giữ đúng thứ tự, không có gì ngẫu nhiên. Muốn hàng đợi vào trước ra trước, đẩy ở một đầu và lấy ở đầu kia: `RPUSH` + `LPOP`."
      en: "`LPUSH` and `LPOP` sound like a queue pair, but both work at the left end: the newest job is pushed on the left and taken first, so this is a stack (last in, first out). A list keeps its order exactly; nothing is random. For a first-in first-out queue, push at one end and take from the other: `RPUSH` + `LPOP`."
  - q:
      vi: "`LPOP orders:pack` trên một list chỉ còn một đơn. Sau lệnh đó, `EXISTS orders:pack` trả gì?"
      en: "`LPOP orders:pack` runs on a list with one order left. What does `EXISTS orders:pack` return after it?"
    options:
      - { vi: "`(integer) 0`", en: "`(integer) 0`" }
      - { vi: "`(integer) 1`, một list rỗng", en: "`(integer) 1`, an empty list" }
      - { vi: "Một lỗi, vì list rỗng", en: "An error, because the list is empty" }
    answer: 0
    trap: 1
    why:
      vi: "Nghe hợp lý khi nghĩ list vẫn còn nhưng rỗng, như một bảng không dòng. Redis không giữ kiểu chứa rỗng: khi phần tử cuối bị lấy đi, khóa bị xóa luôn, nên `EXISTS` trả 0. `LPOP` lần sau trên khóa đó trả `(nil)`, không báo lỗi."
      en: "It sounds reasonable that the list stays, empty, like a table with no rows. Redis keeps no empty containers: when the last element is taken, the key is deleted, so `EXISTS` returns 0. The next `LPOP` on that key returns `(nil)`, not an error."
---
## Mở bài

Ở Chợ Lồng Đèn, mỗi đơn đã thanh toán phải chờ tới lượt đóng gói, đơn đến trước được làm trước. Redis có kiểu list (danh sách có thứ tự) với lệnh thêm và lấy ở cả hai đầu, rất hợp để làm hàng đợi. Bài này xếp đơn vào hàng, lấy đơn ra, và đọc vài sản phẩm Lily xem gần nhất.

## Ý chính

**List là một dãy có thứ tự.** Một khóa list giữ các chuỗi theo đúng thứ tự chúng được thêm, cho phép trùng. Có hai đầu: trái (đầu, chỉ số 0) và phải (cuối, chỉ số -1). `LPUSH` thêm vào bên trái, `RPUSH` thêm vào bên phải; cả hai trả độ dài mới của list. Thêm hay lấy ở hai đầu rất nhanh dù list dài bao nhiêu.

**Hàng đợi và ngăn xếp.** Hàng đợi vào trước ra trước đẩy ở một đầu và lấy ở đầu kia: `RPUSH` để xếp vào cuối, `LPOP` để lấy đơn chờ lâu nhất. Nếu đẩy và lấy cùng một đầu (`LPUSH` + `LPOP`), bạn có một ngăn xếp: món vào sau ra trước. `LPOP` trả phần tử lấy ra, hoặc `(nil)` khi list không có; `LPOP key 2` lấy hai phần tử một lúc và trả một mảng.

**Đọc mà không lấy.** `LRANGE key start stop` trả một đoạn, tính cả hai đầu. Chỉ số âm đếm từ cuối: `LRANGE key 0 -1` là cả list, `LRANGE key -2 -1` là hai phần tử cuối. `LLEN` trả độ dài.

**List rỗng thì khóa biến mất.** Như hash, khi phần tử cuối bị lấy đi, Redis xóa luôn khóa. Một worker hỏi hàng đợi rỗng nhận `(nil)`, không phải lỗi. Redis thật còn có `BLPOP` để worker chờ tới khi có việc; trình mô phỏng trong trình duyệt không có lệnh chờ đó.

Hình cuối mục cho thấy đơn vào bên phải và ra bên trái.

## Cú pháp

```redis
RPUSH key a b c
LPUSH key x
LPOP key
LPOP key 2
RPOP key
LRANGE key 0 -1
LLEN key
```

- Chỉ số 0 là đầu trái, -1 là phần tử cuối.
- `RPUSH` + `LPOP`: hàng đợi; `LPUSH` + `LPOP`: ngăn xếp.

## Ví dụ

Cả hàng đợi và độ dài:

```redis
LRANGE orders:pack 0 -1
LLEN orders:pack
```

Lấy hai đơn một lúc:

```redis
LPOP orders:pack 2
LRANGE orders:pack 0 -1
```

Ba sản phẩm Lily xem gần nhất:

```redis
LRANGE views:lily -3 -1
```

## Lỗi hay gặp

Đẩy và lấy cùng một đầu biến hàng đợi thành ngăn xếp: đơn mới nhất bị lấy trước đơn chờ lâu.

```redis
# WRONG
LPUSH orders:pack o104
LPOP orders:pack
```

```redis
# FIX
RPUSH orders:pack o104
LPOP orders:pack
```

Dùng lệnh list trên một khóa chuỗi:

```redis
# ERROR WRONGTYPE
SET orders:today 42
RPUSH orders:today o105
```

Số lượng âm cho `LPOP` bị từ chối:

```redis
# ERROR ERR
LPOP orders:pack -1
```

## Thực hành

Bốn bước: xếp một đơn vào cuối hàng, lấy đơn chờ lâu nhất, đếm đơn còn chờ, và đọc hai sản phẩm Lily xem gần nhất.

## Tóm tắt

- List giữ chuỗi theo thứ tự thêm vào, có hai đầu trái và phải.
- `RPUSH` + `LPOP` là hàng đợi vào trước ra trước; `LPUSH` + `LPOP` là ngăn xếp.
- `LRANGE` đọc một đoạn mà không lấy; chỉ số âm đếm từ cuối.
- Phần tử cuối đi thì khóa đi; `LPOP` trên khóa không có trả `(nil)`.

# EN

## Opening

At Lantern Market every paid order waits its turn to be packed, first come, first served. Redis has the list type (an ordered sequence) with commands to add and take at both ends, a good fit for a queue. This lesson puts orders in the queue, takes them out, and reads the last few products Lily viewed.

## Key idea

**A list is an ordered sequence.** A list key holds strings in exactly the order they were added, duplicates allowed. It has two ends: the left (the head, index 0) and the right (the tail, index -1). `LPUSH` adds on the left, `RPUSH` on the right; both return the list's new length. Adding or taking at either end is fast however long the list is.

**Queues and stacks.** A first-in first-out queue pushes at one end and takes from the other: `RPUSH` to join at the end, `LPOP` to take the order that has waited longest. Push and take at the same end (`LPUSH` + `LPOP`) and you have a stack: last in, first out. `LPOP` returns the element it took, or `(nil)` when there is no list; `LPOP key 2` takes two at once and returns an array.

**Reading without taking.** `LRANGE key start stop` returns a slice, both ends included. Negative indexes count from the end: `LRANGE key 0 -1` is the whole list, `LRANGE key -2 -1` the last two elements. `LLEN` returns the length.

**An empty list makes the key disappear.** As with hashes, when the last element is taken Redis deletes the key. A worker asking an empty queue gets `(nil)`, not an error. Real Redis also has `BLPOP`, so a worker can wait until a job arrives; the simulator in the browser has no waiting command.

The figure at the end of this section shows orders joining on the right and leaving on the left.

## Syntax

```redis
RPUSH key a b c
LPUSH key x
LPOP key
LPOP key 2
RPOP key
LRANGE key 0 -1
LLEN key
```

- Index 0 is the left end, -1 the last element.
- `RPUSH` + `LPOP`: a queue; `LPUSH` + `LPOP`: a stack.

## Example

The whole queue and its length:

```redis
LRANGE orders:pack 0 -1
LLEN orders:pack
```

Take two orders at once:

```redis
LPOP orders:pack 2
LRANGE orders:pack 0 -1
```

The three products Lily viewed last:

```redis
LRANGE views:lily -3 -1
```

## Common mistakes

Pushing and taking at the same end turns the queue into a stack: the newest order is taken before the ones that waited.

```redis
# WRONG
LPUSH orders:pack o104
LPOP orders:pack
```

```redis
# FIX
RPUSH orders:pack o104
LPOP orders:pack
```

A list command on a string key:

```redis
# ERROR WRONGTYPE
SET orders:today 42
RPUSH orders:today o105
```

A negative count for `LPOP` is refused:

```redis
# ERROR ERR
LPOP orders:pack -1
```

## Practice

Four steps: put an order at the end of the queue, take the order that waited longest, count the orders still waiting, and read the two products Lily viewed last.

## Recap

- A list keeps strings in the order they were added, with a left and a right end.
- `RPUSH` + `LPOP` is a first-in first-out queue; `LPUSH` + `LPOP` is a stack.
- `LRANGE` reads a slice without taking it; negative indexes count from the end.
- The key goes with its last element; `LPOP` on a missing key returns `(nil)`.
