---
id: e-bp-r01
engine: best
track: redis
level: L1
module: r
title: "Khóa cache luôn có thời gian sống"
title_en: "Cache keys always have a time to live"
kind: quiz
minutes: 3
objectives:
  - vi: "Ghi giá trị cache và hạn của nó trong cùng một lệnh `SET … EX`, rồi kiểm bằng `TTL`."
    en: "Write a cache value and its expiry in one `SET … EX` command, then check it with `TTL`."
avoid:
  vi: "Khóa cache không có hạn: dữ liệu cũ nằm mãi trong Redis và bộ nhớ chỉ tăng."
  en: "Cache keys without an expiry: stale data stays in Redis forever and memory only grows."
requires: [e-rd-l1-02]
skills: []
adv: []
sources:
  - https://valkey.io/commands/set/
  - https://valkey.io/commands/ttl/
verified: { version: "BoonData Redis interpreter (Valkey 8.1 wording)", date: "2026-11-27" }
pair:
  runtime: redis
  check: diff
  setup: ""
  bad: |
    SET cache:product:7 "Den long"
    TTL cache:product:7
  good: |
    SET cache:product:7 "Den long" EX 600
    TTL cache:product:7
  expect: null
quiz:
  - q:
      vi: "Sau `SET cache:product:7 \"Den long\"` (không có tùy chọn hạn), `TTL cache:product:7` trả gì?"
      en: "After `SET cache:product:7 \"Den long\"` (no expiry option), what does `TTL cache:product:7` return?"
    options:
      - { vi: "`-2`, vì khóa chưa được lưu", en: "`-2`, because the key was not stored" }
      - { vi: "`-1`, vì khóa có nhưng không có hạn", en: "`-1`, because the key exists but has no expiry" }
      - { vi: "`0`, vì hạn mặc định là 0 giây", en: "`0`, because the default expiry is 0 seconds" }
    answer: 1
    why:
      vi: "`-2` chỉ xuất hiện khi khóa không tồn tại, mà ở đây `SET` vừa ghi xong. Redis không có hạn mặc định: một khóa ghi bằng `SET` thường sống mãi, và `TTL` báo điều đó bằng `-1`. Viết `SET … EX 600` để giá trị và hạn đi cùng nhau, khi đó `TTL` trả số giây còn lại."
      en: "`-2` only appears when the key does not exist, and `SET` has just written it. Redis has no default expiry: a key written by a plain `SET` lives forever, and `TTL` reports that as `-1`. Write `SET … EX 600` so the value and its expiry travel together; `TTL` then returns the seconds left."
---

## Ý chính

Mỗi khóa cache phải có thời gian sống (time to live, TTL). Ghi giá trị và hạn trong một lệnh: `SET key value EX 600`.

## Vì sao

- Redis không tự đặt hạn. Một khóa ghi bằng `SET` thường nằm trong bộ nhớ đến khi có người xóa nó, và `TTL` trả `-1`.
- Cache không có hạn trả dữ liệu cũ sau khi bảng gốc đã đổi, và bộ nhớ của máy chủ chỉ tăng.
- `SET … EX` ghi cả hai trong một lệnh. Nếu viết `SET` rồi mới `EXPIRE`, ứng dụng dừng giữa hai lệnh là khóa mất hạn vĩnh viễn.
- Bản Không nên trả `-1`, bản Nên trả `600`: đó là số giây khóa còn sống.

# EN

## Key idea

Every cache key needs a time to live (TTL). Write the value and its expiry in one command: `SET key value EX 600`.

## Why

- Redis sets no expiry by itself. A key written by a plain `SET` stays in memory until someone deletes it, and `TTL` returns `-1`.
- A cache without expiry serves stale data after the source table has changed, and the server's memory only grows.
- `SET … EX` writes both in one command. With `SET` followed by `EXPIRE`, an application that stops between the two leaves the key without an expiry forever.
- The Avoid version returns `-1`, the Prefer version `600`: the seconds the key has left.
