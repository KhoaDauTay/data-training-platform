---
id: e-rd-l1-02
engine: redis
level: L1
module: basics
title: Thời gian sống, khóa tự biến mất
title_en: Time to live, keys that disappear on their own
kind: lab
runtime: browser
minutes: 15
requires: [e-rd-l1-01]
figures: [{ name: rd-ttl-clock, at: idea }]
objectives:
  - vi: Đặt và đọc thời gian sống bằng EXPIRE, SET … EX, TTL, PTTL.
    en: Set and read a time to live with EXPIRE, SET … EX, TTL, PTTL.
  - vi: Phân biệt TTL trả -1 (không có hạn) và -2 (khóa không tồn tại).
    en: Tell TTL's -1 (no expiry) from -2 (the key does not exist).
  - vi: Biết lệnh nào xóa thời gian sống (SET) và lệnh nào giữ nó (INCR, KEEPTTL).
    en: Know which commands clear the time to live (SET) and which keep it (INCR, KEEPTTL).
sources:
  - { url: "https://valkey.io/commands/expire/", title: "Valkey docs: EXPIRE", title_vi: "Tài liệu Valkey: EXPIRE" }
  - { url: "https://valkey.io/commands/ttl/", title: "Valkey docs: TTL", title_vi: "Tài liệu Valkey: TTL" }
  - { url: "https://valkey.io/commands/set/", title: "Valkey docs: SET", title_vi: "Tài liệu Valkey: SET" }
lab:
  setup: |
    SET session:lily "cart=3" EX 1800
    SET otp:lily 731904 EX 60
    SET promo:flash "11.11" EX 3600
    @advance 15000
  steps:
    - task:
        vi: "Lily vừa bấm thêm một trang, nên phiên `session:lily` được gia hạn: cho nó sống lại đủ 30 phút tính từ bây giờ."
        en: "Lily just opened another page, so session `session:lily` is renewed: give it a full 30 minutes from now."
      solution: EXPIRE session:lily 1800
      check: doc
      target: session:lily
      expect: { advance: 600000, ttl: 1200 }
      hint:
        vi: "`EXPIRE` nhận số giây: 30 phút là 1800 giây. Bước này còn kiểm tra rằng 10 phút sau phiên còn 1200 giây."
        en: "`EXPIRE` takes seconds: 30 minutes is 1800 seconds. This step also checks that 10 minutes later the session has 1200 seconds left."
    - task:
        vi: "Mã OTP `otp:lily` còn sống bao nhiêu giây?"
        en: "How many seconds does the OTP `otp:lily` have left?"
      solution: TTL otp:lily
      check: doc
      hint:
        vi: "`TTL` trả số giây còn lại; mã được tạo 15 giây trước với 60 giây."
        en: "`TTL` returns the seconds left; the code was made 15 seconds ago with 60 seconds."
    - task:
        vi: "Ứng dụng gửi lại mã `111111` cho Lily, nhưng chỉ được ghi khi chưa có mã nào, để mã cũ còn dùng được. Ghi vào `otp:lily`, sống 60 giây."
        en: "The app sends Lily the code `111111` again, but it may only be written when no code exists yet, so the old code keeps working. Write it to `otp:lily` for 60 seconds."
      solution: SET otp:lily 111111 EX 60 NX
      check: doc
      after: GET otp:lily
      hint:
        vi: "Một lệnh `SET` với hai tùy chọn: `EX` cho thời gian, `NX` cho \"chỉ khi chưa có\". Khóa đã có nên câu trả lời là `(nil)`."
        en: "One `SET` with two options: `EX` for the time, `NX` for \"only if it does not exist\". The key exists, so the reply is `(nil)`."
    - task:
        vi: "Tạo mã OTP `482100` cho Boon ở khóa `otp:boon`, sống đúng 60 giây."
        en: "Create the OTP `482100` for Boon in key `otp:boon`, living exactly 60 seconds."
      solution: SET otp:boon 482100 EX 60
      check: doc
      target: otp:boon
      expect: { pttl: 60000 }
      hint:
        vi: "`SET otp:boon 482100 EX 60`: ghi giá trị và thời gian sống trong một lệnh."
        en: "`SET otp:boon 482100 EX 60`: write the value and the time to live in one command."
    - task:
        vi: "Đợt giảm giá `promo:flash` được giữ luôn, không hết hạn nữa. Bỏ thời gian sống của nó."
        en: "The `promo:flash` sale is kept for good and should no longer expire. Remove its time to live."
      solution: PERSIST promo:flash
      check: doc
      target: promo:flash
      expect: { advance: 7200000, ttl: -1 }
      hint:
        vi: "`PERSIST` bỏ thời gian sống; bước này đợi 2 giờ rồi kiểm tra `TTL` là -1."
        en: "`PERSIST` removes the time to live; this step waits 2 hours, then checks that `TTL` is -1."
quiz:
  - q:
      vi: "`session:lily` còn 1200 giây. Ứng dụng chạy `SET session:lily \"cart=4\"` để cập nhật giỏ. `TTL session:lily` giờ trả gì?"
      en: "`session:lily` has 1200 seconds left. The app runs `SET session:lily \"cart=4\"` to update the cart. What does `TTL session:lily` return now?"
    options:
      - { vi: "`(integer) 1200`", en: "`(integer) 1200`" }
      - { vi: "`(integer) -1`", en: "`(integer) -1`" }
      - { vi: "`(integer) -2`", en: "`(integer) -2`" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe như `SET` chỉ đổi giá trị, nhưng một `SET` thường ghi đè cả khóa, kể cả thời gian sống, nên phiên thành không bao giờ hết hạn và `TTL` trả -1. Khóa vẫn còn nên không phải -2. Muốn giữ hạn cũ, viết `SET session:lily \"cart=4\" KEEPTTL` hoặc đặt lại `EX`."
      en: "It sounds as if `SET` only changes the value, but a plain `SET` overwrites the whole key, time to live included, so the session never expires and `TTL` returns -1. The key still exists, so it is not -2. To keep the old expiry, write `SET session:lily \"cart=4\" KEEPTTL` or set `EX` again."
  - q:
      vi: "`TTL otp:boon` trả `(integer) -2`. Điều đó nghĩa là gì?"
      en: "`TTL otp:boon` returns `(integer) -2`. What does that mean?"
    options:
      - { vi: "Khóa không tồn tại (hoặc đã hết hạn)", en: "The key does not exist (or has expired)" }
      - { vi: "Khóa có nhưng không có hạn", en: "The key exists with no expiry" }
      - { vi: "Khóa đã hết hạn 2 giây trước", en: "The key expired 2 seconds ago" }
    answer: 0
    trap: 2
    why:
      vi: "Số âm của `TTL` không phải thời gian: -2 là mã \"không có khóa\", -1 là mã \"có khóa nhưng không có hạn\". Redis không nhớ khóa đã hết hạn lúc nào, vì khóa hết hạn bị xóa hẳn. Vì vậy -2 chỉ cho biết bây giờ không có `otp:boon`."
      en: "A negative `TTL` is not a time: -2 is the code for \"no such key\", -1 for \"the key exists with no expiry\". Redis does not remember when a key expired, because an expired key is deleted for good. So -2 only says that `otp:boon` is not there now."
---
## Mở bài

Phiên đăng nhập, mã OTP, đợt giảm giá chớp nhoáng đều chỉ nên sống một lúc. Redis cho mỗi khóa một thời gian sống (time to live, TTL): hết giờ, khóa tự biến mất, ứng dụng không phải dọn. Bài này dùng một đồng hồ ảo, nên mọi con số thời gian bạn thấy đều lặp lại đúng như nhau.

## Ý chính

**Đặt thời gian sống.** `EXPIRE key 1800` đặt hạn 1800 giây cho một khóa đã có và trả `(integer) 1`; khóa không có thì trả 0. Cách thường dùng hơn là ghi giá trị và hạn trong cùng một lệnh: `SET key value EX 60` (giây) hoặc `PX 60000` (mili giây). Một lệnh thay vì hai nghĩa là không có lúc nào khóa tồn tại mà không có hạn.

**Đọc thời gian còn lại.** `TTL key` trả số giây còn lại (làm tròn), `PTTL key` trả mili giây. Hai số âm là mã chứ không phải thời gian: -1 nghĩa là khóa có nhưng không có hạn, -2 nghĩa là không có khóa đó.

**Hết hạn là xóa.** Khi hết giờ, khóa biến mất hẳn: `GET` trả `(nil)`, `EXISTS` trả 0. Redis không xóa đúng từng mili giây; nó kiểm tra hạn mỗi khi có lệnh chạm vào khóa, và một tác vụ nền dọn dần những khóa không ai chạm. Với người dùng, kết quả như nhau: khóa hết hạn không bao giờ được đọc ra.

**Lệnh nào giữ hạn.** `SET` thường ghi đè cả khóa nên xóa hạn, trừ khi thêm `KEEPTTL`. `INCR`, `APPEND` sửa giá trị tại chỗ nên giữ hạn. `PERSIST` bỏ hạn hẳn. `SET … NX` chỉ ghi khi khóa chưa có, nên một mã OTP đang dùng không bị thay.

**Đồng hồ ảo.** Trong bài, dòng `@advance 61000` cho đồng hồ chạy thêm 61 giây. Đó không phải lệnh Redis, chỉ là cách bài học tua thời gian; ô lệnh của lab không nhận nó.

Hình cuối mục cho thấy một mã OTP từ lúc tạo tới lúc biến mất.

## Cú pháp

```redis
SET key value EX 60
SET key value PX 60000
SET key value EX 60 NX
EXPIRE key 1800
TTL key
PTTL key
PERSIST key
```

- `EX` tính bằng giây, `PX` bằng mili giây; `EXPIRE` giây, `PEXPIRE` mili giây.
- `TTL` -1: không có hạn; -2: không có khóa.

## Ví dụ

Một mã OTP mới và thời gian còn lại của nó:

```redis
SET otp:demo 1234 EX 60
TTL otp:demo
PTTL otp:demo
```

Tua đồng hồ 61 giây: mã đã biến mất.

```redis
SET otp:demo 1234 EX 60
@advance 61000
GET otp:demo
TTL otp:demo
```

Bỏ hạn của đợt giảm giá:

```redis
TTL promo:flash
PERSIST promo:flash
TTL promo:flash
```

## Lỗi hay gặp

Cập nhật phiên bằng `SET` thường làm mất hạn, phiên thành vĩnh viễn:

```redis
# WRONG
SET session:lily "cart=4"
TTL session:lily
```

```redis
# FIX
SET session:lily "cart=4" KEEPTTL
TTL session:lily
```

Nhầm đơn vị: `EXPIRE` nhận giây, nên 60000 là gần 17 giờ chứ không phải một phút.

```redis
# WRONG
EXPIRE otp:lily 60000
TTL otp:lily
```

```redis
# FIX
PEXPIRE otp:lily 60000
TTL otp:lily
```

Thời gian sống phải lớn hơn 0:

```redis
# ERROR ERR
SET otp:demo 1234 EX 0
```

## Thực hành

Năm bước: gia hạn một phiên, đọc thời gian còn lại của mã OTP, ghi mã mới chỉ khi chưa có, tạo một mã sống đúng 60 giây, và bỏ hạn của đợt giảm giá.

## Tóm tắt

- `SET … EX` ghi giá trị và hạn trong một lệnh; `EXPIRE` đặt hạn cho khóa đã có.
- `TTL`/`PTTL` đọc thời gian còn lại; -1 là không có hạn, -2 là không có khóa.
- Khóa hết hạn bị xóa hẳn: `GET` trả `(nil)`.
- `SET` thường xóa hạn (trừ `KEEPTTL`); `INCR` giữ hạn; `PERSIST` bỏ hạn.

# EN

## Opening

Login sessions, OTP codes and flash sales should only live for a while. Redis gives each key a time to live (TTL): when it runs out the key disappears by itself, and the app does not have to clean up. This lesson uses a virtual clock, so every time you see here comes out the same on every run.

## Key idea

**Setting a time to live.** `EXPIRE key 1800` sets an expiry of 1800 seconds on an existing key and returns `(integer) 1`; a missing key returns 0. The more common way writes the value and the expiry in one command: `SET key value EX 60` (seconds) or `PX 60000` (milliseconds). One command instead of two means there is never a moment when the key exists without an expiry.

**Reading the time left.** `TTL key` returns the seconds left (rounded), `PTTL key` returns milliseconds. The two negative numbers are codes, not times: -1 means the key exists with no expiry, -2 means there is no such key.

**Expiring means deleting.** When the time runs out the key is gone for good: `GET` returns `(nil)`, `EXISTS` returns 0. Redis does not delete on the exact millisecond; it checks the expiry whenever a command touches the key, and a background task slowly cleans up keys nobody touches. For the user the result is the same: an expired key is never read back.

**Which commands keep the expiry.** A plain `SET` overwrites the whole key, so it clears the expiry, unless you add `KEEPTTL`. `INCR` and `APPEND` change the value in place, so they keep it. `PERSIST` removes the expiry for good. `SET … NX` only writes when the key does not exist, so an OTP in use is never replaced.

**The virtual clock.** In this lesson, the line `@advance 61000` moves the clock 61 seconds ahead. It is not a Redis command, only the lesson's way to move time; the lab editor does not accept it.

The figure at the end of this section follows one OTP from the moment it is made to the moment it disappears.

## Syntax

```redis
SET key value EX 60
SET key value PX 60000
SET key value EX 60 NX
EXPIRE key 1800
TTL key
PTTL key
PERSIST key
```

- `EX` counts seconds, `PX` milliseconds; `EXPIRE` seconds, `PEXPIRE` milliseconds.
- `TTL` -1: no expiry; -2: no such key.

## Example

A new OTP and the time it has left:

```redis
SET otp:demo 1234 EX 60
TTL otp:demo
PTTL otp:demo
```

Move the clock 61 seconds: the code is gone.

```redis
SET otp:demo 1234 EX 60
@advance 61000
GET otp:demo
TTL otp:demo
```

Remove the sale's expiry:

```redis
TTL promo:flash
PERSIST promo:flash
TTL promo:flash
```

## Common mistakes

Updating a session with a plain `SET` loses the expiry, and the session lives forever:

```redis
# WRONG
SET session:lily "cart=4"
TTL session:lily
```

```redis
# FIX
SET session:lily "cart=4" KEEPTTL
TTL session:lily
```

Mixing up units: `EXPIRE` takes seconds, so 60000 is almost 17 hours, not one minute.

```redis
# WRONG
EXPIRE otp:lily 60000
TTL otp:lily
```

```redis
# FIX
PEXPIRE otp:lily 60000
TTL otp:lily
```

The time to live must be above 0:

```redis
# ERROR ERR
SET otp:demo 1234 EX 0
```

## Practice

Five steps: renew a session, read the time an OTP has left, write a new code only when none exists, create a code that lives exactly 60 seconds, and remove the sale's expiry.

## Recap

- `SET … EX` writes the value and the expiry in one command; `EXPIRE` sets an expiry on an existing key.
- `TTL`/`PTTL` read the time left; -1 is no expiry, -2 is no such key.
- An expired key is deleted for good: `GET` returns `(nil)`.
- A plain `SET` clears the expiry (unless `KEEPTTL`); `INCR` keeps it; `PERSIST` removes it.
