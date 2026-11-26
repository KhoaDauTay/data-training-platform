---
id: e-rd-l1-01
engine: redis
level: L1
module: basics
title: Khóa và chuỗi, Redis là một từ điển rất nhanh
title_en: Keys and strings, Redis is a very fast dictionary
kind: lab
runtime: browser
minutes: 15
figures: [{ name: rd-key-value, at: idea }]
objectives:
  - vi: Ghi và đọc một giá trị bằng SET, GET, MSET, MGET.
    en: Write and read a value with SET, GET, MSET, MGET.
  - vi: Đọc được các kiểu trả lời của redis-cli (OK, số nguyên, chuỗi, nil, mảng).
    en: Read redis-cli's reply kinds (OK, integer, string, nil, array).
  - vi: Tăng một bộ đếm bằng INCR thay vì đọc rồi ghi lại.
    en: Raise a counter with INCR instead of reading and writing it back.
sources:
  - { url: "https://valkey.io/topics/data-types/", title: "Valkey docs: Data types" }
  - { url: "https://redis.io/docs/latest/develop/data-types/strings/", title: "Redis docs: Strings" }
  - { url: "https://valkey.io/commands/incr/", title: "Valkey docs: INCR" }
lab:
  setup: |
    SET shop:name "Lantern Market"
    SET page:home:views 120
    MSET price:p01 45000 price:p02 120000
  steps:
    - task:
        vi: "Đọc giá của sản phẩm `p02` (khóa `price:p02`)."
        en: "Read the price of product `p02` (key `price:p02`)."
      solution: GET price:p02
      check: doc
      hint:
        vi: "Lệnh đọc một khóa chuỗi là `GET`."
        en: "The command that reads a string key is `GET`."
    - task:
        vi: "Có thêm một lượt xem trang chủ: tăng `page:home:views` thêm 1 trong một lệnh."
        en: "One more home page view arrived: raise `page:home:views` by 1 in one command."
      solution: INCR page:home:views
      check: doc
      after: GET page:home:views
      hint:
        vi: "`INCR` cộng 1 và trả số mới, không cần `GET` trước."
        en: "`INCR` adds 1 and returns the new number, no `GET` needed first."
    - task:
        vi: "Lưu dòng chữ quảng cáo `Sale 11.11` vào khóa `banner:today`. Chuỗi có dấu cách nên phải đặt trong ngoặc kép."
        en: "Save the banner text `Sale 11.11` in key `banner:today`. The text has a space, so it must be in double quotes."
      solution: SET banner:today "Sale 11.11"
      check: doc
      after: GET banner:today
      hint:
        vi: "Dạng lệnh: `SET key \"two words\"`."
        en: "The shape: `SET key \"two words\"`."
    - task:
        vi: "Đọc giá của `p01` và `p02` trong một lệnh, theo đúng thứ tự đó."
        en: "Read the prices of `p01` and `p02` in one command, in that order."
      solution: MGET price:p01 price:p02
      check: doc
      hint:
        vi: "`MGET` nhận nhiều khóa và trả một mảng theo thứ tự các khóa."
        en: "`MGET` takes several keys and returns an array in the keys' order."
quiz:
  - q:
      vi: "`GET` một khóa chưa từng được ghi thì redis-cli in ra gì?"
      en: "What does redis-cli print for `GET` on a key that was never written?"
    options:
      - { vi: "Một chuỗi rỗng `\"\"`", en: "An empty string `\"\"`" }
      - { vi: "`(nil)`", en: "`(nil)`" }
      - { vi: "Một lỗi `ERR no such key`", en: "An error `ERR no such key`" }
    answer: 1
    trap: 0
    why:
      vi: "Chuỗi rỗng là một giá trị có thật: `SET k \"\"` tạo ra nó, và `EXISTS k` trả 1. Khóa không tồn tại thì không có giá trị nào, nên Redis trả nil (không có gì) và redis-cli in `(nil)`. `GET` không báo lỗi khi thiếu khóa; lỗi chỉ đến khi khóa giữ một kiểu khác chuỗi."
      en: "An empty string is a real value: `SET k \"\"` creates it, and `EXISTS k` returns 1. A missing key has no value at all, so Redis replies nil (nothing) and redis-cli prints `(nil)`. `GET` raises no error for a missing key; it only fails when the key holds a type other than a string."
  - q:
      vi: "Hai quầy cùng chạy `GET views`, cộng 1 trong ứng dụng, rồi `SET views` số mới. Lúc đầu `views` là 120. Sau hai lượt, `views` có thể là bao nhiêu?"
      en: "Two desks both run `GET views`, add 1 in the app, then `SET views` to the new number. `views` starts at 120. What can `views` be after both?"
    options:
      - { vi: "Luôn là 122", en: "Always 122" }
      - { vi: "121 hoặc 122", en: "121 or 122" }
      - { vi: "Luôn là 121", en: "Always 121" }
    answer: 1
    trap: 0
    why:
      vi: "Nếu hai quầy cùng đọc 120 trước khi quầy nào kịp ghi, cả hai cùng ghi 121 và một lượt xem bị mất; nếu chúng không chen nhau thì ra 122. Cách đọc, cộng, ghi lại có khe hở giữa các lệnh. `INCR views` cộng ngay trên server trong một lệnh, Redis chạy từng lệnh một nên không lượt nào bị mất."
      en: "If both desks read 120 before either writes, both write 121 and one view is lost; if they do not overlap the result is 122. Reading, adding and writing back leaves a gap between the commands. `INCR views` adds on the server in one command, and Redis runs commands one at a time, so no view is lost."
---
## Mở bài

Chợ Lồng Đèn cần nhớ vài con số nhỏ và đọc chúng hàng nghìn lần mỗi giây: giá sản phẩm, lượt xem trang chủ, dòng chữ quảng cáo hôm nay. Redis giữ những con số đó trong bộ nhớ dưới dạng một từ điển rất lớn: mỗi khóa trỏ tới một giá trị. Bài này dùng kiểu đơn giản nhất, chuỗi (string).

## Ý chính

**Khóa và giá trị.** Redis không có bảng hay cột. Mọi thứ là một khóa (key), một chuỗi như `price:p02`, trỏ tới một giá trị. Dấu hai chấm chỉ là thói quen đặt tên để nhóm khóa theo loại (`price:`, `page:`), Redis không hiểu nó là gì. Kiểu giá trị đơn giản nhất là chuỗi: chữ, số, hoặc bất kỳ dãy byte nào.

**Ghi và đọc.** `SET key value` ghi đè giá trị cũ nếu có và trả `OK`. `GET key` trả giá trị, hoặc `(nil)` khi khóa không tồn tại. `MSET` và `MGET` làm việc với nhiều khóa trong một lệnh, nên ứng dụng chỉ gửi một lần qua mạng thay vì nhiều lần.

**Đọc câu trả lời của redis-cli.** Mỗi lệnh trả một kiểu: `OK` (trạng thái), `(integer) 121` (số nguyên), `"45000"` (chuỗi, luôn trong ngoặc kép), `(nil)` (không có gì), một danh sách đánh số `1) … 2) …` (mảng), hoặc `(error) …`. Giá lưu bằng `SET` là chuỗi, nên `GET` in `"120000"` có ngoặc kép, còn `INCR` trả một số nguyên không có ngoặc.

**Bộ đếm nguyên tử.** `INCR` đọc số trong chuỗi, cộng 1, ghi lại và trả số mới, tất cả trong một lệnh. Redis chạy từng lệnh một, nên hai quầy cùng gửi `INCR` không bao giờ làm mất lượt nào. Chuỗi không phải số nguyên thì `INCR` báo lỗi, giá trị giữ nguyên.

Hình cuối mục cho thấy khóa trỏ tới giá trị và kiểu trả lời của từng lệnh.

## Cú pháp

```redis
SET key value
GET key
MSET k1 v1 k2 v2
MGET k1 k2
INCR key
SET key "text with spaces"
```

- Giá trị có dấu cách phải nằm trong ngoặc kép, như trong redis-cli.
- Tên lệnh không phân biệt hoa thường; tên khóa thì có.

## Ví dụ

Đọc tên cửa hàng và một khóa chưa có:

```redis
GET shop:name
GET shop:phone
```

Một lượt xem mới, rồi đọc lại:

```redis
INCR page:home:views
GET page:home:views
```

Hai giá trong một lệnh:

```redis
MGET price:p01 price:p02
```

## Lỗi hay gặp

Quên ngoặc kép, redis-cli tách chữ thành hai đối số và `SET` không hiểu đối số thứ ba:

```redis
# ERROR ERR
SET banner:today Sale 11.11
```

`INCR` trên một chuỗi không phải số:

```redis
# ERROR ERR
INCR shop:name
```

Đọc rồi ghi lại số đã cộng trong ứng dụng: chạy được, nhưng có khe hở giữa hai lệnh:

```redis
# WRONG
GET page:home:views
SET page:home:views 121
```

```redis
# FIX
INCR page:home:views
```

## Thực hành

Bốn bước: đọc một giá, tăng bộ đếm lượt xem, lưu một chuỗi có dấu cách, đọc hai giá trong một lệnh.

## Tóm tắt

- Redis là một từ điển: mỗi khóa trỏ tới một giá trị, không có bảng.
- `SET`/`GET` ghi và đọc; khóa không có trả `(nil)`, không phải lỗi.
- `MSET`/`MGET` gộp nhiều khóa vào một lệnh, một lần qua mạng.
- `INCR` cộng trên server trong một lệnh, không mất lượt khi nhiều người cùng ghi.

# EN

## Opening

Lantern Market has to remember a few small numbers and read them thousands of times a second: product prices, home page views, today's banner text. Redis keeps them in memory as one very large dictionary: each key points to a value. This lesson uses the simplest type, the string.

## Key idea

**Keys and values.** Redis has no tables or columns. Everything is a key, a string such as `price:p02`, pointing to a value. The colon is only a naming habit that groups keys by kind (`price:`, `page:`); Redis does not know what it means. The simplest value type is the string: text, a number, or any sequence of bytes.

**Writing and reading.** `SET key value` overwrites any old value and replies `OK`. `GET key` returns the value, or `(nil)` when the key does not exist. `MSET` and `MGET` work on several keys in one command, so the app crosses the network once instead of many times.

**Reading redis-cli's replies.** Each command answers with one kind: `OK` (a status), `(integer) 121` (an integer), `"45000"` (a string, always in double quotes), `(nil)` (nothing), a numbered list `1) … 2) …` (an array), or `(error) …`. A price stored with `SET` is a string, so `GET` prints `"120000"` with quotes, while `INCR` returns an integer without them.

**An atomic counter.** `INCR` reads the number in the string, adds 1, writes it back and returns the new number, all in one command. Redis runs one command at a time, so two desks sending `INCR` together never lose a view. When the string is not an integer, `INCR` fails and the value stays as it was.

The figure at the end of this section shows keys pointing to values and the reply kind of each command.

## Syntax

```redis
SET key value
GET key
MSET k1 v1 k2 v2
MGET k1 k2
INCR key
SET key "text with spaces"
```

- A value with spaces must be in double quotes, as in redis-cli.
- Command names ignore case; key names do not.

## Example

Read the shop's name and a key that does not exist:

```redis
GET shop:name
GET shop:phone
```

One more view, then read it back:

```redis
INCR page:home:views
GET page:home:views
```

Two prices in one command:

```redis
MGET price:p01 price:p02
```

## Common mistakes

Without the quotes, redis-cli splits the text into two arguments and `SET` does not understand the third one:

```redis
# ERROR ERR
SET banner:today Sale 11.11
```

`INCR` on a string that is not a number:

```redis
# ERROR ERR
INCR shop:name
```

Reading, adding in the app and writing back: it runs, but there is a gap between the two commands:

```redis
# WRONG
GET page:home:views
SET page:home:views 121
```

```redis
# FIX
INCR page:home:views
```

## Practice

Four steps: read a price, raise the view counter, save a string with a space, read two prices in one command.

## Recap

- Redis is a dictionary: each key points to a value, there are no tables.
- `SET`/`GET` write and read; a missing key gives `(nil)`, not an error.
- `MSET`/`MGET` put several keys in one command, one trip over the network.
- `INCR` adds on the server in one command, so no count is lost when many write at once.
