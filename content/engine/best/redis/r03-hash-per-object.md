---
id: e-bp-r03
engine: best
track: redis
level: L1
module: r
title: "Một đối tượng là một hash, không phải nhiều khóa rời"
title_en: "One object is one hash, not many loose keys"
kind: quiz
minutes: 3
objectives:
  - vi: "Gom các trường của một đối tượng vào một hash bằng `HSET`, để đọc, đặt hạn và xóa nó bằng một khóa."
    en: "Group an object's fields into one hash with `HSET`, so it is read, expired and deleted through one key."
avoid:
  vi: "Mỗi trường một khóa: nhiều khóa hơn để quản lý, đặt hạn và xóa không đồng bộ."
  en: "One key per field: more keys to manage, and expiry and deletion fall out of step."
requires: [e-rd-l1-03]
skills: []
adv: []
sources:
  - https://redis.io/docs/latest/develop/data-types/hashes/
  - https://valkey.io/commands/hset/
verified: { version: "BoonData Redis interpreter (Valkey 8.1 wording)", date: "2026-11-27" }
pair:
  runtime: redis
  check: diff
  setup: ""
  bad: |
    SET user:7:name An
    SET user:7:city Hue
    SET user:7:tier gold
    DBSIZE
  good: |
    HSET user:7 name An city Hue tier gold
    DBSIZE
  expect: { compare: count }
quiz:
  - q:
      vi: "Hồ sơ khách 7 lưu bằng ba khóa `user:7:name`, `user:7:city`, `user:7:tier`. Bạn muốn hồ sơ tự hết hạn sau 1 giờ. Cần bao nhiêu lệnh `EXPIRE`?"
      en: "Customer 7's profile is stored as three keys `user:7:name`, `user:7:city`, `user:7:tier`. You want the profile to expire after 1 hour. How many `EXPIRE` commands do you need?"
    options:
      - { vi: "Một, `EXPIRE user:7 3600` áp cho mọi khóa bắt đầu bằng `user:7`", en: "One, `EXPIRE user:7 3600` applies to every key starting with `user:7`" }
      - { vi: "Ba, mỗi khóa một lệnh, và chúng có thể lệch nhau", en: "Three, one per key, and they can drift apart" }
      - { vi: "Không cần, Redis tự đặt hạn theo tiền tố", en: "None, Redis sets expiry by prefix on its own" }
    answer: 1
    why:
      vi: "Redis không có khái niệm tiền tố: `user:7` và `user:7:name` là hai khóa khác hẳn nhau, nên `EXPIRE user:7` không chạm tới ba khóa kia. Ba khóa cần ba lệnh `EXPIRE`, và nếu một lệnh không chạy thì hồ sơ còn sót một nửa. Một hash `user:7` chỉ có một khóa: một `EXPIRE`, một `DEL`, một `HGETALL`."
      en: "Redis has no notion of a prefix: `user:7` and `user:7:name` are completely different keys, so `EXPIRE user:7` does not touch the other three. Three keys need three `EXPIRE` commands, and if one of them does not run, half of the profile is left behind. A hash `user:7` is one key: one `EXPIRE`, one `DEL`, one `HGETALL`."
---

## Ý chính

Lưu một đối tượng (hồ sơ khách, giỏ hàng) thành một hash: `HSET user:7 name An city Hue tier gold`. Mỗi trường là một field trong hash, không phải một khóa riêng.

## Vì sao

- Thời gian sống, `DEL` và `TYPE` gắn với khóa. Một hash là một khóa, nên cả đối tượng hết hạn và bị xóa cùng lúc.
- Nhiều khóa rời thì mỗi khóa có hạn riêng: chỉ cần quên một khóa là còn sót một phần đối tượng.
- Đọc cả đối tượng bằng một lệnh `HGETALL`, đổi một trường bằng `HSET` hoặc `HINCRBY`.
- `DBSIZE` đếm số khóa: bản Không nên tạo `3` khóa cho một khách, bản Nên tạo `1`.

# EN

## Key idea

Store one object (a customer profile, a cart) as one hash: `HSET user:7 name An city Hue tier gold`. Each field is a field in the hash, not a key of its own.

## Why

- Time to live, `DEL` and `TYPE` belong to a key. A hash is one key, so the whole object expires and is deleted at once.
- With loose keys, every key has its own expiry: forget one and part of the object is left behind.
- Read the whole object with one `HGETALL`, change one field with `HSET` or `HINCRBY`.
- `DBSIZE` counts keys: the Avoid version creates `3` keys for one customer, the Prefer version `1`.
