---
id: e-bp-a05
engine: best
track: sql
level: L1
module: a
title: "Ngày \"hôm nay\" là tham số, không phải now()"
title_en: "Pin the as-of date"
kind: quiz
minutes: 2
objectives:
  - vi: "Viết ngày chốt số (as-of) thành literal hoặc tham số trong mọi báo cáo định kỳ."
    en: "Write the as-of date as a literal or a parameter in every recurring report."
avoid:
  vi: "Chạy lại báo cáo tuần trước ra số khác số đã gửi."
  en: "Re-running last week's report gives a different number from the one you sent."
requires: []
skills: [date_math]
adv: []
sources:
  - https://www.postgresql.org/docs/18/functions-datetime.html#FUNCTIONS-DATETIME-CURRENT
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: lab
  check: runs
  setup: null
  bad: |
    SELECT count(*) AS orders
    FROM orders
    WHERE order_date >= CURRENT_DATE - 30
  good: |
    SELECT count(*) AS orders
    FROM orders
    WHERE order_date > DATE '2026-10-31' - 30
      AND order_date <= DATE '2026-10-31'
  expect: null
lint:
  rule: a05
  tip:
    vi: "Ở đây \"hôm nay\" là 2026-10-31. Mình ghi thẳng ngày đó để báo cáo chạy lại vẫn ra cùng số."
    en: "Here \"today\" is 2026-10-31. Write that date so the report gives the same numbers when run again."
quiz:
  - q:
      vi: "Báo cáo \"đơn 30 ngày qua\" dùng `CURRENT_DATE - 30`. Kế toán chạy lại sau một tuần để đối chiếu. Chuyện gì xảy ra?"
      en: "A \"last 30 days of orders\" report uses `CURRENT_DATE - 30`. After a week, accounting re-runs it to reconcile. What happens?"
    options:
      - { vi: "Ra cùng số, vì dữ liệu cũ không đổi", en: "Same number, because old data does not change" }
      - { vi: "Ra số khác, vì cửa sổ 30 ngày đã dời đi một tuần", en: "A different number, because the 30-day window has moved by a week" }
      - { vi: "Báo lỗi vì `CURRENT_DATE` đã cũ", en: "An error, because `CURRENT_DATE` is stale" }
    answer: 1
    why:
      vi: "Dữ liệu cũ không đổi, nhưng ranh giới cửa sổ thì đổi: `CURRENT_DATE` là ngày lúc câu chạy, nên chạy lại sau 7 ngày thì cửa sổ mất 7 ngày đầu và thêm 7 ngày mới. Câu không báo lỗi nào, nên không ai thấy số cũ đã mất. Ghi ngày chốt cụ thể thì câu cho cùng số mọi lúc."
      en: "Old data does not change, but the window's edges do: `CURRENT_DATE` is the date when the query runs, so a re-run 7 days later drops the first 7 days and adds 7 new ones. The query raises no error, so nobody notices the old number is gone. A fixed as-of date gives the same number every time."
---

## Ý chính

Báo cáo định kỳ nhận ngày chốt số (as-of) là literal (giá trị viết thẳng trong câu) hoặc tham số. Không dùng `CURRENT_DATE` hay `now()` trong logic chọn kỳ.

## Vì sao

- Chạy lại hôm sau ra số khác, không tái lập được.
- Không đối chiếu được với số đã gửi.
- Mọi Solution của BoonData đều theo luật này: "hôm nay" là 2026-10-31.

## Ví dụ

Bản `CURRENT_DATE` cho một số phụ thuộc vào ngày bạn bấm chạy. Bản ghi `DATE '2026-10-31'` luôn đếm 212 đơn của 30 ngày tính tới ngày chốt.

# EN

## Key idea

A recurring report takes its as-of date (the day the figures are counted up to) as a literal (a value written into the query) or a parameter. Do not use `CURRENT_DATE` or `now()` to pick the period.

## Why

- Running it again the next day gives a different number that nobody can reproduce.
- You cannot reconcile it with the number you already sent.
- Every BoonData Solution follows this rule: "today" is 2026-10-31.

## Example

The `CURRENT_DATE` version gives a number that depends on the day you press Run. The version with `DATE '2026-10-31'` always counts the 212 orders of the 30 days up to the as-of date.
