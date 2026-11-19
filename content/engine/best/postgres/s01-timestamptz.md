---
id: e-bp-s01
engine: best
track: postgres
level: L1
module: s
title: "Thời điểm có thật lưu bằng timestamptz"
title_en: "Store instants as timestamptz"
kind: quiz
minutes: 3
objectives:
  - vi: "Chọn `timestamptz` cho mọi thời điểm có thật (đơn tạo lúc, tiền trả lúc)."
    en: "Choose `timestamptz` for every real instant (order created at, payment made at)."
avoid:
  vi: "Giờ lệch 7 tiếng khi hai phiên ở hai múi giờ đọc cùng một cột."
  en: "Times that are 7 hours off when sessions in two time zones read the same column."
requires: [e-pg-l1-01]
skills: [date_math]
adv: []
sources:
  - https://wiki.postgresql.org/wiki/Don%27t_Do_This#Don.27t_use_timestamp_.28without_time_zone.29
  - https://www.postgresql.org/docs/18/datatype-datetime.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: engine
  check: diff
  setup: |
    CREATE TABLE ev_local (at timestamp NOT NULL);
    CREATE TABLE ev_instant (at timestamptz NOT NULL);
    SET TIME ZONE 'Asia/Ho_Chi_Minh';
    INSERT INTO ev_local VALUES ('2026-10-31 08:00:00+07');
    INSERT INTO ev_instant VALUES ('2026-10-31 08:00:00+07');
    SET TIME ZONE 'UTC';
  bad: |
    SELECT at::text AS at_in_utc_session FROM ev_local
  good: |
    SELECT at::text AS at_in_utc_session FROM ev_instant
  expect: null
quiz:
  - q:
      vi: "Một đơn tạo lúc 08:00 giờ Việt Nam (`+07`). Một phiên đặt `TIME ZONE 'UTC'` đọc lại. Cột `timestamp` (không múi giờ) trả gì?"
      en: "An order is created at 08:00 Vietnam time (`+07`). A session with `TIME ZONE 'UTC'` reads it back. What does a `timestamp` (without time zone) column return?"
    options:
      - { vi: "`2026-10-31 01:00:00`, đã đổi sang UTC", en: "`2026-10-31 01:00:00`, converted to UTC" }
      - { vi: "`2026-10-31 08:00:00`: phần `+07` đã bị bỏ khi ghi, giờ này giờ bị hiểu là 08:00 UTC", en: "`2026-10-31 08:00:00`: the `+07` was dropped on write, and this time now reads as 08:00 UTC" }
      - { vi: "Báo lỗi vì chuỗi có múi giờ", en: "An error, because the string has a time zone" }
    answer: 1
    why:
      vi: "`timestamp` bỏ qua phần múi giờ khi ghi, nên nó lưu \"08:00\" trơn. Đọc ở UTC vẫn là 08:00, lệch 7 tiếng so với thời điểm thật. `timestamptz` lưu thời điểm tuyệt đối và trả `01:00:00+00`."
      en: "`timestamp` ignores the zone on write, so it stores a bare \"08:00\". Read in UTC it is still 08:00, 7 hours off the real instant. `timestamptz` stores the absolute instant and returns `01:00:00+00`."
---

## Ý chính

Một thời điểm có thật lưu bằng `timestamptz`. Chỉ dùng `timestamp` (không múi giờ) cho giờ "trên lịch" không làm phép tính, như giờ mở cửa.

## Vì sao

- `timestamp` bỏ phần `+07` khi ghi, nên database không biết giờ đó thuộc múi nào.
- Lưu "giờ UTC" trong `timestamp` cũng không giúp: database vẫn không biết đó là UTC.
- `timestamptz` cũng chỉ tốn 8 byte, như `timestamp`.

## Ví dụ

Cùng chuỗi `'2026-10-31 08:00:00+07'` ghi vào hai bảng, rồi đọc trong phiên UTC. Bảng `timestamp` trả `2026-10-31 08:00:00` (sai 7 tiếng). Bảng `timestamptz` trả `2026-10-31 01:00:00+00` (đúng thời điểm).

# EN

## Key idea

Store a real instant as `timestamptz`. Use `timestamp` (without time zone) only for "calendar" times you never compute with, such as opening hours.

## Why

- `timestamp` drops the `+07` on write, so the database does not know which zone the time belongs to.
- Storing "UTC time" in `timestamp` does not help: the database still does not know it is UTC.
- `timestamptz` takes 8 bytes too, like `timestamp`.

## Example

The same string `'2026-10-31 08:00:00+07'` goes into two tables and is read back in a UTC session. The `timestamp` table returns `2026-10-31 08:00:00` (7 hours off). The `timestamptz` table returns `2026-10-31 01:00:00+00` (the right instant).
