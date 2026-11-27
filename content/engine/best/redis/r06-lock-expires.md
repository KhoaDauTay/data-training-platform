---
id: e-bp-r06
engine: best
track: redis
level: L2
module: r
title: "Khóa phân tán phải tự hết hạn"
title_en: "A lock must expire on its own"
kind: quiz
minutes: 3
objectives:
  - vi: "Lấy khóa bằng một lệnh `SET … NX EX`, để khóa tự nhả nếu tiến trình giữ nó dừng giữa chừng."
    en: "Take a lock with one `SET … NX EX` command, so it releases itself if the process holding it stops halfway."
avoid:
  vi: "Khóa lấy bằng `SET … NX` không có hạn: tiến trình chết là việc đó bị khóa mãi."
  en: "A lock taken with `SET … NX` and no expiry: if the process dies, the job stays locked forever."
requires: [e-rd-l1-02, e-rd-l2-03]
skills: []
adv: []
sources:
  - https://valkey.io/commands/set/
verified: { version: "BoonData Redis interpreter (Valkey 8.1 wording)", date: "2026-11-27" }
pair:
  runtime: redis
  check: diff
  setup: ""
  bad: |
    SET lock:job:42 worker-a NX
    TTL lock:job:42
  good: |
    SET lock:job:42 worker-a NX EX 30
    TTL lock:job:42
  expect: null
quiz:
  - q:
      vi: "Worker A lấy khóa bằng `SET lock:job:42 worker-a NX` rồi bị tắt máy trước khi `DEL`. Worker B chạy cùng lệnh `SET … NX`. B nhận gì?"
      en: "Worker A takes the lock with `SET lock:job:42 worker-a NX`, then its machine shuts down before `DEL`. Worker B runs the same `SET … NX`. What does B get?"
    options:
      - { vi: "`OK`, vì khóa của A mất theo tiến trình", en: "`OK`, because A's lock died with its process" }
      - { vi: "`(nil)`, hôm nay và mọi lần sau, vì khóa không có hạn", en: "`(nil)`, now and every time after, because the lock has no expiry" }
      - { vi: "`(nil)` trong 30 giây, rồi `OK`", en: "`(nil)` for 30 seconds, then `OK`" }
    answer: 1
    why:
      vi: "Redis không biết tiến trình nào tạo ra khóa: khóa `lock:job:42` vẫn nằm đó sau khi A chết. Không có hạn, nên `SET … NX` của B luôn trả `(nil)` và việc 42 không bao giờ chạy lại. Chỉ khi A lấy khóa bằng `SET lock:job:42 worker-a NX EX 30` thì B mới nhận `OK` sau 30 giây."
      en: "Redis does not know which process created the lock: the key `lock:job:42` is still there after A dies. It has no expiry, so B's `SET … NX` always answers `(nil)` and job 42 never runs again. Only if A had taken the lock with `SET lock:job:42 worker-a NX EX 30` would B get `OK` after 30 seconds."
---

## Ý chính

Lấy khóa (lock) bằng một lệnh có cả điều kiện và hạn: `SET lock:job:42 worker-a NX EX 30`. `NX` chỉ ghi khi khóa chưa có, `EX 30` cho khóa tự nhả sau 30 giây.

## Vì sao

- Tiến trình giữ khóa có thể dừng bất cứ lúc nào, trước khi kịp `DEL`. Khóa không có hạn thì không ai lấy lại được.
- Ghi điều kiện và hạn trong cùng một lệnh. `SET … NX` rồi mới `EXPIRE` để hở một khoảng: tiến trình chết giữa hai lệnh là khóa không có hạn.
- Giá trị của khóa nên là tên người giữ (`worker-a`), để chỉ đúng người đó nhả khóa.
- Bản Không nên: `TTL` trả `-1`, khóa sống mãi. Bản Nên: `TTL` trả `30`.

# EN

## Key idea

Take a lock with one command that holds both the condition and the expiry: `SET lock:job:42 worker-a NX EX 30`. `NX` writes only if the key does not exist, `EX 30` releases it by itself after 30 seconds.

## Why

- The process holding a lock can stop at any moment, before it gets to `DEL`. A lock without an expiry can then never be taken again.
- Write the condition and the expiry in the same command. `SET … NX` followed by `EXPIRE` leaves a gap: a process that dies between the two leaves a lock with no expiry.
- The lock's value should name its holder (`worker-a`), so only that holder releases it.
- Avoid: `TTL` returns `-1`, the lock lives forever. Prefer: `TTL` returns `30`.
