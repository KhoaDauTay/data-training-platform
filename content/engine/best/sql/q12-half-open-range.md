---
id: e-bp-q12
engine: best
track: sql
level: L1
module: q
title: "Khoảng nửa mở, không BETWEEN với timestamp"
title_en: "Half-open ranges, not BETWEEN on timestamps"
kind: quiz
minutes: 3
objectives:
  - vi: "Lọc theo thời gian bằng `>= start AND < next_start`."
    en: "Filter on time with `>= start AND < next_start`."
avoid:
  vi: "Báo cáo tháng thiếu mọi khoản trả của ngày cuối tháng."
  en: "A monthly report that misses every payment on the last day of the month."
requires: [e-pg-l1-01]
skills: [date_math, where]
adv: []
sources:
  - https://wiki.postgresql.org/wiki/Don%27t_Do_This#Don.27t_use_BETWEEN_.28especially_with_timestamps.29
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: lab
  check: diff
  setup: null
  bad: |
    SELECT count(*) AS payments
    FROM payments
    WHERE paid_at BETWEEN '2026-10-01' AND '2026-10-31'
  good: |
    SELECT count(*) AS payments
    FROM payments
    WHERE paid_at >= TIMESTAMP '2026-10-01' AND paid_at < TIMESTAMP '2026-11-01'
  expect: null
lint:
  rule: q12
  tip:
    vi: "`BETWEEN` trên cột thời điểm bỏ sót mọi thứ sau 00:00 của ngày cuối. Khoảng nửa mở `>= … AND < …` an toàn hơn."
    en: "`BETWEEN` on a timestamp misses everything after midnight of the last day. Use a half-open range `>= … AND < …`."
quiz:
  - q:
      vi: "Cột `paid_at` kiểu `timestamp`. Một khoản trả lúc `2026-10-31 15:20`. `paid_at BETWEEN '2026-10-01' AND '2026-10-31'` có giữ nó không?"
      en: "Column `paid_at` is a `timestamp`. A payment was made at `2026-10-31 15:20`. Does `paid_at BETWEEN '2026-10-01' AND '2026-10-31'` keep it?"
    options:
      - { vi: "Có, vì cùng ngày 31", en: "Yes, it is the same day, the 31st" }
      - { vi: "Không: `'2026-10-31'` nghĩa là 00:00 ngày 31", en: "No: `'2026-10-31'` means 00:00 on the 31st" }
      - { vi: "Báo lỗi kiểu dữ liệu", en: "A type error" }
    answer: 1
    why:
      vi: "Với timestamp, chuỗi ngày trơn là nửa đêm đầu ngày. `BETWEEN` đóng hai đầu nên dừng ở 00:00 ngày 31. Viết `< TIMESTAMP '2026-11-01'` thì giữ trọn ngày 31 và không đếm lặp ngày đầu kỳ sau."
      en: "For a timestamp, a bare date string is midnight at the start of that day. `BETWEEN` is closed on both ends, so it stops at 00:00 on the 31st. Writing `< TIMESTAMP '2026-11-01'` keeps the whole 31st and never counts the next period's first day twice."
---

## Ý chính

Lọc theo thời gian bằng `>= start AND < next_start`. `BETWEEN` chỉ an toàn với giá trị rời rạc như số nguyên hay `date`.

## Vì sao

- `BETWEEN a AND b` đóng hai đầu.
- Với timestamp, `'2026-10-31'` là 00:00 ngày 31, nên mọi khoản trả trong ngày 31 sau 00:00 bị bỏ.
- Nếu bạn viết đầu kỳ sau làm mốc cuối, ngày đó lại bị đếm hai lần ở hai báo cáo.

## Ví dụ

Trên `lab`, khoản trả tháng 10/2026: bản `BETWEEN` đếm 218, bản nửa mở đếm 223. Năm khoản trả trong ngày 31 đã biến mất.

# EN

## Key idea

Filter on time with `>= start AND < next_start`. `BETWEEN` is only safe for discrete values such as integers or `date`.

## Why

- `BETWEEN a AND b` is closed on both ends.
- For a timestamp, `'2026-10-31'` is 00:00 on the 31st, so every payment after 00:00 that day is dropped.
- If you use the next period's start as the upper bound instead, that instant is counted twice, in two reports.

## Example

On `lab`, payments in October 2026: the `BETWEEN` version counts 218, the half-open version counts 223. Five payments made on the 31st have vanished.
