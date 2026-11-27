---
id: e-bp-r07
engine: best
track: redis
level: L1
module: r
title: "Tìm khóa bằng SCAN, không bằng KEYS"
title_en: "Find keys with SCAN, not KEYS"
kind: quiz
minutes: 3
objectives:
  - vi: "Duyệt khóa theo mẫu bằng `SCAN` với con trỏ (cursor), từng trang một, thay vì `KEYS` một lần cho tất cả."
    en: "Walk keys by pattern with `SCAN` and a cursor, one page at a time, instead of `KEYS` all at once."
avoid:
  vi: "`KEYS` trên máy chủ có hàng triệu khóa: mọi client khác phải chờ đến khi lệnh xong."
  en: "`KEYS` on a server with millions of keys: every other client waits until it finishes."
requires: [e-rd-l1-07]
skills: []
adv: []
sources:
  - https://valkey.io/commands/keys/
  - https://valkey.io/commands/scan/
verified: { version: "BoonData Redis interpreter (Valkey 8.1 wording)", date: "2026-11-27" }
pair:
  runtime: redis
  check: runs
  setup: |
    MSET order:1 a order:2 b order:3 c user:1 x
  bad: |
    KEYS order:*
  good: |
    SCAN 0 MATCH order:* COUNT 100
  expect: null
quiz:
  - q:
      vi: "`SCAN 0 MATCH order:* COUNT 100` trả `\"0\"` và ba khóa. Con số `\"0\"` đầu tiên nghĩa là gì?"
      en: "`SCAN 0 MATCH order:* COUNT 100` returns `\"0\"` and three keys. What does the first `\"0\"` mean?"
    options:
      - { vi: "Không khóa nào khớp mẫu", en: "No key matched the pattern" }
      - { vi: "Con trỏ cho lần gọi sau; `0` là đã duyệt hết", en: "The cursor for the next call; `0` means the walk is done" }
      - { vi: "Số khóa bị bỏ qua vì hết hạn", en: "The number of keys skipped because they expired" }
    answer: 1
    why:
      vi: "Ba khóa đi kèm cho thấy có khóa khớp mẫu, nên `\"0\"` không phải số khóa tìm được. `SCAN` trả hai phần: con trỏ (cursor) để gửi ở lần gọi tiếp, và một trang khóa. Bạn gọi lại với con trỏ vừa nhận cho đến khi nó về `0`; mỗi lần chỉ làm một phần việc, nên máy chủ vẫn phục vụ client khác giữa các lần gọi."
      en: "Three keys come with it, so some keys did match and `\"0\"` is not a count of matches. `SCAN` returns two parts: a cursor to send on the next call, and one page of keys. You call again with the cursor you got until it comes back as `0`; each call does a small part of the work, so the server keeps serving other clients between calls."
---

## Ý chính

Muốn liệt kê khóa theo mẫu trên máy chủ thật, dùng `SCAN cursor MATCH pattern COUNT n` và lặp đến khi con trỏ (cursor) về `0`. Để dành `KEYS` cho máy thử nghiệm.

## Vì sao

- Redis chạy từng lệnh một. `KEYS` duyệt toàn bộ không gian khóa trong một lệnh, nên trên máy chủ lớn mọi client khác phải chờ nó xong; tài liệu của lệnh khuyên chỉ dùng nó cực kỳ cẩn thận.
- `SCAN` làm cùng việc theo từng trang nhỏ: mỗi lần gọi trả con trỏ cho lần sau và một ít khóa.
- `SCAN` có thể trả một khóa hơn một lần, nên ứng dụng phải chịu được trùng.
- Thẻ này chỉ cho thấy cả hai chạy và cách đọc câu trả lời: bộ mô phỏng với vài khóa không đo được thời gian chờ của máy chủ lớn. Bản Không nên trả ba khóa một lượt; bản Nên trả con trỏ `"0"` và cùng ba khóa trong một trang.

# EN

## Key idea

To list keys by pattern on a real server, use `SCAN cursor MATCH pattern COUNT n` and loop until the cursor comes back as `0`. Keep `KEYS` for test machines.

## Why

- Redis runs one command at a time. `KEYS` walks the whole keyspace in one command, so on a large server every other client waits for it; the command's documentation says to use it only with extreme care.
- `SCAN` does the same job in small pages: each call returns a cursor for the next call and a few keys.
- `SCAN` may return a key more than once, so the application must tolerate duplicates.
- This card only shows that both run and how to read the replies: a simulation with a few keys cannot measure a large server's wait. The Avoid version returns three keys at once; the Prefer version returns the cursor `"0"` and the same three keys in one page.
