---
id: e-bp-t01
engine: best
track: timeseries
level: L1
module: t
title: "Lưu thời điểm đo bằng timestamptz"
title_en: "Store measurement instants as timestamptz"
kind: quiz
minutes: 3
objectives:
  - vi: "Dùng `timestamptz` cho thời điểm đo, để dữ liệu từ nhiều múi giờ so sánh và sắp xếp đúng."
    en: "Use `timestamptz` for measurement instants, so data from several time zones compares and sorts correctly."
avoid:
  vi: "Cột `timestamp` âm thầm bỏ phần múi giờ: cảm biến ở Singapore và Hải Phòng bị xếp sai thứ tự."
  en: "A `timestamp` column silently drops the time zone: sensors in Singapore and Hai Phong come out in the wrong order."
requires: [e-ts-l1-02]
skills: []
adv: []
sources:
  - https://wiki.postgresql.org/wiki/Don%27t_Do_This
  - https://www.postgresql.org/docs/18/datatype-datetime.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-27" }
pair:
  runtime: engine
  check: diff
  setup: |
    CREATE TABLE r_local (device text, ts timestamp, temp numeric);
    CREATE TABLE r_tz (device text, ts timestamptz, temp numeric);
    INSERT INTO r_local VALUES ('hp-01', '2026-10-31 08:30+07', 4.1), ('sg-02', '2026-10-31 09:00+08', 3.9);
    INSERT INTO r_tz VALUES ('hp-01', '2026-10-31 08:30+07', 4.1), ('sg-02', '2026-10-31 09:00+08', 3.9);
  bad: |
    SELECT device FROM r_local
    ORDER BY ts LIMIT 1
  good: |
    SELECT device FROM r_tz
    ORDER BY ts LIMIT 1
  expect: null
quiz:
  - q:
      vi: "Chèn `'2026-10-31 09:00+08'` vào một cột `timestamp` (không có múi giờ). PostgreSQL lưu gì?"
      en: "You insert `'2026-10-31 09:00+08'` into a `timestamp` column (no time zone). What does PostgreSQL store?"
    options:
      - { vi: "`2026-10-31 01:00`, đã đổi sang UTC", en: "`2026-10-31 01:00`, converted to UTC" }
      - { vi: "`2026-10-31 09:00`, phần `+08` bị bỏ đi không báo lỗi", en: "`2026-10-31 09:00`, the `+08` silently dropped" }
      - { vi: "Báo lỗi vì cột không nhận múi giờ", en: "An error, because the column does not accept a time zone" }
    answer: 1
    why:
      vi: "Cột `timestamp` không đổi giờ sang UTC và cũng không báo lỗi: nó bỏ qua phần múi giờ trong chuỗi và giữ nguyên giờ đồng hồ 09:00. Vì thế 09:00 ở Singapore (01:00 UTC) bị coi là muộn hơn 08:30 ở Hải Phòng (01:30 UTC), dù thật ra sớm hơn. `timestamptz` đổi mọi giá trị về một thời điểm chung khi lưu, nên sắp xếp và so sánh luôn đúng."
      en: "A `timestamp` column neither converts to UTC nor raises an error: it ignores the time zone in the string and keeps the wall-clock 09:00. So 09:00 in Singapore (01:00 UTC) is treated as later than 08:30 in Hai Phong (01:30 UTC), although it is earlier. `timestamptz` turns every value into one shared instant when storing, so sorting and comparing are always right."
---

## Ý chính

Thời điểm đo (cảm biến, sự kiện, log) lưu bằng `timestamptz`. Chỉ dùng `timestamp` cho giờ đồng hồ không gắn nơi chốn, ví dụ "mở cửa lúc 08:00 mỗi ngày".

## Vì sao

- `timestamp` bỏ qua phần múi giờ trong chuỗi chèn vào mà không báo gì: `09:00+08` thành `09:00`.
- Dữ liệu từ nhiều múi giờ khi đó không còn so sánh được: thứ tự, khoảng cách và khung giờ đều sai.
- `timestamptz` lưu một thời điểm tuyệt đối và hiển thị theo `TimeZone` của phiên. Wiki PostgreSQL ("Don't Do This") khuyên dùng nó cho thời điểm.
- Bản Không nên trả `hp-01` là cảm biến đo trước. Bản Nên trả `sg-02`: 01:00 UTC, sớm hơn 01:30 UTC của Hải Phòng.

# EN

## Key idea

Store measurement instants (sensors, events, logs) as `timestamptz`. Use `timestamp` only for wall-clock times not tied to a place, such as "opens at 08:00 every day".

## Why

- `timestamp` ignores the time zone of the string you insert without a word: `09:00+08` becomes `09:00`.
- Data from several time zones then no longer compares: order, gaps and time buckets are all wrong.
- `timestamptz` stores an absolute instant and displays it in the session's `TimeZone`. The PostgreSQL wiki ("Don't Do This") recommends it for instants.
- The Avoid version says `hp-01` measured first. The Prefer version says `sg-02`: 01:00 UTC, earlier than Hai Phong's 01:30 UTC.
