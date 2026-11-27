---
id: e-rd-l3-01
engine: redis
level: L3
module: streams
title: Stream, nhật ký chỉ ghi thêm
title_en: Streams, an append-only log
kind: lab
runtime: browser
minutes: 20
requires: [e-rd-l2-06]
figures: [{ name: rd-stream-log, at: idea }]
objectives:
  - vi: Ghi sự kiện vào stream bằng XADD và hiểu ID gồm thời điểm và số thứ tự.
    en: Write events to a stream with XADD and understand an ID made of a time and a sequence number.
  - vi: Đọc một khoảng bằng XRANGE và đọc phần mới hơn một ID bằng XREAD.
    en: Read a range with XRANGE and read what is newer than an ID with XREAD.
  - vi: Giới hạn độ dài stream bằng MAXLEN, và biết `~` chỉ cắt cả khối.
    en: Cap a stream's length with MAXLEN, and know that `~` only cuts whole blocks.
sources:
  - { url: "https://valkey.io/topics/streams-intro/", title: "Valkey docs: Streams introduction" }
  - { url: "https://valkey.io/commands/xadd/", title: "Valkey docs: XADD" }
  - { url: "https://valkey.io/commands/xread/", title: "Valkey docs: XREAD" }
  - { url: "https://valkey.io/commands/xtrim/", title: "Valkey docs: XTRIM" }
lab:
  setup: |
    XADD orders 100-0 sku p01 qty 2
    XADD orders 101-0 sku p07 qty 1
    XADD orders 102-0 sku p01 qty 5
  steps:
    - task:
        vi: "Chợ Lồng Đèn vừa nhận đơn mới: sản phẩm `p09`, số lượng `3`. Ghi nó vào stream `orders` và để Redis tự chọn ID."
        en: "Lantern Market just got a new order: product `p09`, quantity `3`. Write it to the stream `orders` and let Redis pick the ID."
      solution: XADD orders * sku p09 qty 3
      check: doc
      after: XLEN orders
      hint:
        vi: "`*` thay cho ID: Redis lấy thời điểm hiện tại làm phần đầu."
        en: "`*` stands for the ID: Redis uses the current time as its first part."
    - task:
        vi: "Đọc các đơn có ID từ `101-0` tới `102-0`, cả hai đầu."
        en: "Read the orders with IDs from `101-0` to `102-0`, both ends included."
      solution: XRANGE orders 101-0 102-0
      check: doc
      ordered: true
      hint:
        vi: "Lệnh đọc một khoảng ID theo thứ tự tăng dần."
        en: "The command that reads a range of IDs in ascending order."
    - task:
        vi: "Dịch vụ đóng gói đã xử lý tới đơn `101-0`. Đọc tối đa 1 đơn mới hơn đơn đó."
        en: "The packing service has handled orders up to `101-0`. Read at most 1 order newer than that one."
      solution: XREAD COUNT 1 STREAMS orders 101-0
      check: doc
      ordered: true
      hint:
        vi: "`XREAD` trả các mục có ID lớn hơn ID bạn đưa; `COUNT` giới hạn số mục."
        en: "`XREAD` returns the entries with an ID greater than the one you give; `COUNT` caps how many."
    - task:
        vi: "Stream chỉ cần giữ 2 đơn mới nhất. Cắt chính xác phần cũ hơn."
        en: "The stream only needs the 2 newest orders. Trim the older part exactly."
      solution: XTRIM orders MAXLEN 2
      check: doc
      after: XRANGE orders - +
      hint:
        vi: "`XTRIM … MAXLEN 2` không có `~` cắt đúng tới 2 mục."
        en: "`XTRIM … MAXLEN 2` without `~` trims to exactly 2 entries."
quiz:
  - q:
      vi: "Stream `orders` có 1.050 mục, mỗi khối nội bộ chứa 100 mục. Chạy `XTRIM orders MAXLEN ~ 1000`. Còn lại bao nhiêu mục?"
      en: "The stream `orders` holds 1,050 entries, and each internal block holds 100. You run `XTRIM orders MAXLEN ~ 1000`. How many entries are left?"
    options:
      - { vi: "Đúng 1.000", en: "Exactly 1,000" }
      - { vi: "Vẫn 1.050", en: "Still 1,050" }
      - { vi: "950", en: "950" }
    answer: 1
    trap: 0
    why:
      vi: "Dấu `~` cho phép Redis chỉ bỏ những khối nội bộ trọn vẹn, vì bỏ cả khối rẻ hơn nhiều so với sửa từng mục. Bỏ khối cũ nhất (100 mục) thì còn 950, ít hơn 1.000, nên Redis không bỏ khối nào và stream vẫn có 1.050 mục. \"Đúng 1.000\" là kết quả của `MAXLEN 1000` không có `~`. Vì vậy `~` hợp để giữ stream \"khoảng\" một cỡ, không hợp khi cần con số chính xác."
      en: "The `~` lets Redis drop only whole internal blocks, because dropping a block is much cheaper than editing single entries. Dropping the oldest block (100 entries) would leave 950, fewer than 1,000, so Redis drops none and the stream keeps 1,050 entries. \"Exactly 1,000\" is what `MAXLEN 1000` without `~` gives. So `~` suits keeping a stream at \"about\" a size, not an exact number."
  - q:
      vi: "Không có `BLOCK`, lệnh `XREAD STREAMS orders $` trả gì?"
      en: "Without `BLOCK`, what does `XREAD STREAMS orders $` return?"
    options:
      - { vi: "Mục cuối cùng của stream", en: "The stream's last entry" }
      - { vi: "Mọi mục của stream", en: "Every entry of the stream" }
      - { vi: "(nil), không có gì mới", en: "(nil), nothing new" }
    answer: 2
    trap: 0
    why:
      vi: "`$` nghĩa là \"ID lớn nhất hiện có\", và `XREAD` chỉ trả các mục lớn hơn ID đó, tức là những mục sẽ đến sau. Không có `BLOCK` thì lệnh không chờ, nên trả `(nil)` ngay. Dễ tưởng `$` là \"mục cuối\", nhưng nó là điểm bắt đầu nghe. `$` chỉ có ích khi đi cùng `BLOCK`: client chờ mục mới đầu tiên."
      en: "`$` means \"the greatest ID right now\", and `XREAD` only returns entries greater than it, that is entries that arrive later. Without `BLOCK` the command does not wait, so it returns `(nil)` at once. It is easy to read `$` as \"the last entry\", but it is a point to start listening from. `$` is only useful with `BLOCK`: the client waits for the first new entry."
---
## Mở bài

Chợ Lồng Đèn muốn mọi đơn hàng được ghi lại theo thứ tự đến, để kho, kế toán và giao hàng đọc cùng một nguồn. List làm được hàng đợi, nhưng một phần tử đã lấy ra là mất; stream thì giữ lại mọi mục cho tới khi bạn cắt nó. Bài này dùng `XADD`, `XRANGE`, `XREAD` và `XTRIM`.

## Ý chính

**Stream là nhật ký chỉ ghi thêm.** Mỗi mục có một ID và một bộ trường như hash nhỏ (`sku p01 qty 2`). Mục mới luôn nằm ở cuối, mục cũ không bị sửa. Đọc một mục không xóa nó, nên nhiều dịch vụ đọc cùng stream mà không lấy mất của nhau, khác với `LPOP` trên list.

**ID là thời điểm và số thứ tự.** ID có dạng `<ms>-<seq>` (mili giây, số thứ tự), ví dụ `1793404800000-0`. Với `XADD orders * …`, Redis lấy thời điểm hiện tại làm phần đầu; nhiều mục trong cùng một mili giây được số thứ tự 0, 1, 2… ID luôn tăng: một ID nhỏ hơn hoặc bằng ID cuối bị từ chối. Lab này dùng ID ngắn như `100-0` cho dễ đọc; ứng dụng thật hầu như luôn dùng `*`.

**Đọc theo khoảng hoặc đọc phần mới.** `XRANGE orders - +` đọc từ đầu tới cuối, `-` và `+` là ID nhỏ nhất và lớn nhất; thêm `COUNT n` để đọc từng trang. `XREAD STREAMS orders 101-0` trả các mục có ID lớn hơn `101-0`: dịch vụ nhớ ID cuối cùng đã xử lý và hỏi tiếp từ đó. Với `BLOCK`, client chờ mục mới; trình mô phỏng không chờ mà trả ngay.

**Stream lớn dần, nên cần cắt.** `XTRIM orders MAXLEN 1000` giữ đúng 1.000 mục mới nhất; `XADD orders MAXLEN 1000 * …` cắt ngay khi ghi. Redis lưu stream thành các khối, mỗi khối mặc định tới 100 mục. Với `MAXLEN ~ 1000`, Redis chỉ bỏ những khối trọn vẹn, nên stream có thể dài hơn 1.000 một chút, đổi lại việc cắt rẻ hơn nhiều.

Hình cuối mục cho thấy stream của lab sau khi có đơn mới.

## Cú pháp

```redis
XADD orders * sku p09 qty 3
XRANGE orders - + COUNT 10
XREAD COUNT 5 STREAMS orders 101-0
XTRIM orders MAXLEN 1000
XLEN orders
```

- `*` = Redis chọn ID; `-` và `+` = đầu và cuối stream.
- `XREAD … STREAMS <key> <ID>` trả các mục có ID lớn hơn `<ID>`.
- `MAXLEN ~ n` cắt gần đúng theo khối, `MAXLEN n` cắt chính xác.

## Ví dụ

Ghi một đơn với ID tự động, rồi đếm:

```redis
XADD orders * sku p09 qty 3
XLEN orders
```

Đọc trang đầu, mỗi trang 2 mục:

```redis
XRANGE orders - + COUNT 2
```

Đọc phần mới hơn một ID đã xử lý:

```redis
XREAD STREAMS orders 100-0
```

`$` không có `BLOCK`: không có gì mới để trả.

```redis
XREAD STREAMS orders $
```

## Lỗi hay gặp

Tự đặt ID nhỏ hơn ID cuối cùng:

```redis
# ERROR ERR
XADD orders 99-0 sku p02 qty 1
```

Dùng `~` khi cần đúng số mục: stream nhỏ hơn một khối nên không có gì bị cắt.

```redis
# WRONG
XTRIM orders MAXLEN ~ 2
XLEN orders
```

```redis
# FIX
XTRIM orders MAXLEN 2
XLEN orders
```

## Thực hành

Bốn bước: ghi một đơn với ID tự động, đọc một khoảng ID, đọc phần mới hơn một ID đã xử lý, và cắt stream còn 2 mục.

## Tóm tắt

- Stream là nhật ký chỉ ghi thêm; đọc không xóa mục.
- ID = mili giây + số thứ tự, luôn tăng; `*` để Redis chọn.
- `XRANGE` đọc theo khoảng, `XREAD` đọc phần lớn hơn một ID.
- `MAXLEN n` cắt chính xác, `MAXLEN ~ n` chỉ bỏ khối trọn vẹn.

# EN

## Opening

Lantern Market wants every order recorded in arrival order, so the warehouse, accounting and delivery all read one source. A list can be a queue, but an element you pop is gone; a stream keeps every entry until you trim it. This lesson uses `XADD`, `XRANGE`, `XREAD` and `XTRIM`.

## Key idea

**A stream is an append-only log.** Each entry has an ID and a set of fields like a small hash (`sku p01 qty 2`). New entries always go at the end, and old entries are never edited. Reading an entry does not delete it, so several services read the same stream without taking entries from each other, unlike `LPOP` on a list.

**An ID is a time and a sequence number.** An ID looks like `<ms>-<seq>` (milliseconds, sequence), for example `1793404800000-0`. With `XADD orders * …`, Redis uses the current time as the first part; several entries in the same millisecond get sequence 0, 1, 2… IDs always grow: an ID smaller than or equal to the last one is refused. This lab uses short IDs such as `100-0` to keep things readable; real applications almost always use `*`.

**Read a range or read what is new.** `XRANGE orders - +` reads from start to end, `-` and `+` being the smallest and greatest IDs; add `COUNT n` to read page by page. `XREAD STREAMS orders 101-0` returns the entries with an ID greater than `101-0`: a service remembers the last ID it handled and asks again from there. With `BLOCK`, the client waits for new entries; the simulator does not wait and answers at once.

**A stream keeps growing, so trim it.** `XTRIM orders MAXLEN 1000` keeps exactly the 1,000 newest entries; `XADD orders MAXLEN 1000 * …` trims while writing. Redis stores a stream in blocks of up to 100 entries by default. With `MAXLEN ~ 1000`, Redis only drops whole blocks, so the stream may stay a little longer than 1,000, in return for much cheaper trimming.

The figure at the end of this section shows the lab's stream after the new order.

## Syntax

```redis
XADD orders * sku p09 qty 3
XRANGE orders - + COUNT 10
XREAD COUNT 5 STREAMS orders 101-0
XTRIM orders MAXLEN 1000
XLEN orders
```

- `*` = Redis picks the ID; `-` and `+` = start and end of the stream.
- `XREAD … STREAMS <key> <ID>` returns the entries with an ID greater than `<ID>`.
- `MAXLEN ~ n` trims roughly by block, `MAXLEN n` trims exactly.

## Example

Write an order with an automatic ID, then count:

```redis
XADD orders * sku p09 qty 3
XLEN orders
```

Read the first page, 2 entries per page:

```redis
XRANGE orders - + COUNT 2
```

Read what is newer than an ID already handled:

```redis
XREAD STREAMS orders 100-0
```

`$` without `BLOCK`: there is nothing new to return.

```redis
XREAD STREAMS orders $
```

## Common mistakes

Setting an ID smaller than the last one yourself:

```redis
# ERROR ERR
XADD orders 99-0 sku p02 qty 1
```

Using `~` when you need an exact count: the stream is smaller than one block, so nothing is trimmed.

```redis
# WRONG
XTRIM orders MAXLEN ~ 2
XLEN orders
```

```redis
# FIX
XTRIM orders MAXLEN 2
XLEN orders
```

## Practice

Four steps: write an order with an automatic ID, read a range of IDs, read what is newer than an ID already handled, and trim the stream to 2 entries.

## Recap

- A stream is an append-only log; reading does not delete entries.
- ID = milliseconds + sequence, always growing; `*` lets Redis pick.
- `XRANGE` reads by range, `XREAD` reads what is greater than an ID.
- `MAXLEN n` trims exactly, `MAXLEN ~ n` only drops whole blocks.
