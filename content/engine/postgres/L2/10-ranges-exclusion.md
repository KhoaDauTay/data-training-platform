---
id: e-pg-l2-10
engine: postgres
level: L2
module: index-types
title: "Khoảng thời gian, GiST và ràng buộc không chồng lịch"
title_en: "Time ranges, GiST and a no-double-booking constraint"
kind: lab
runtime: browser
minutes: 12
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
viz: pg-gist-boxes
objectives:
  - vi: Lưu lịch đặt phòng bằng kiểu `tstzrange` và hỏi "chồng lên nhau" bằng `&&`.
    en: Store bookings as `tstzrange` and ask "do they overlap?" with `&&`.
  - vi: Dùng ràng buộc `EXCLUDE USING gist` (với `btree_gist`) để database tự cấm hai lượt đặt chồng giờ trong một phòng.
    en: Use an `EXCLUDE USING gist` constraint (with `btree_gist`) so the database itself forbids two overlapping bookings of one room.
requires: [e-pg-l2-09]
sources:
  - https://www.postgresql.org/docs/18/rangetypes.html
  - https://www.postgresql.org/docs/18/ddl-constraints.html
  - https://www.postgresql.org/docs/18/btree-gist.html
  - https://www.postgresql.org/docs/18/gist.html
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS btree_gist;
    CREATE TABLE bookings (
      id int PRIMARY KEY,
      room int NOT NULL,
      during tstzrange NOT NULL
    );
    INSERT INTO bookings
    SELECT g, 1 + g % 50,
           tstzrange(timestamptz '2026-01-01 08:00+00' + (g / 50) * interval '3 hours',
                     timestamptz '2026-01-01 08:00+00' + (g / 50) * interval '3 hours' + interval '2 hours')
    FROM generate_series(1, 20000) AS g;
    ANALYZE bookings;
  steps:
    - task:
        vi: "Thêm ràng buộc tên `bookings_no_overlap`: hai lượt đặt cùng `room` không được có `during` chồng nhau."
        en: "Add a constraint named `bookings_no_overlap`: two bookings of the same `room` must not have overlapping `during`."
      solution: ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap EXCLUDE USING gist (room WITH =, during WITH &&)
      target: SELECT id FROM bookings WHERE room = 3 AND during && tstzrange(timestamptz '2026-02-01 00:00+00', timestamptz '2026-02-02 00:00+00')
      check: catalog
      hint:
        vi: "`EXCLUDE USING gist (room WITH =, during WITH &&)`: cấm hai dòng mà mọi cặp toán tử đều đúng."
        en: "`EXCLUDE USING gist (room WITH =, during WITH &&)`: forbids two rows for which every operator pair is true."
    - task:
        vi: "Lấy `id` các lượt đặt phòng 3 chồng lên ngày 2026-02-01 (UTC). Kế hoạch phải dùng index của ràng buộc."
        en: "Return the `id` of room 3 bookings that overlap 2026-02-01 (UTC). The plan must use the constraint's index."
      solution: SELECT id FROM bookings WHERE room = 3 AND during && tstzrange(timestamptz '2026-02-01 00:00+00', timestamptz '2026-02-02 00:00+00')
      check: plan
      hint:
        vi: "`room = 3 AND during && tstzrange(...)`."
        en: "`room = 3 AND during && tstzrange(...)`."
    - task:
        vi: "Phòng 3 có bao nhiêu giờ đặt trong ngày 2026-02-01 (UTC)? Trả về một số: tổng độ dài phần giao của mỗi lượt với ngày đó, tính bằng giờ."
        en: "How many booked hours does room 3 have on 2026-02-01 (UTC)? Return one number: the total length of each booking's overlap with that day, in hours."
      solution: SELECT sum(extract(epoch FROM upper(during * r) - lower(during * r)) / 3600) AS hours FROM bookings, tstzrange(timestamptz '2026-02-01 00:00+00', timestamptz '2026-02-02 00:00+00') AS r WHERE room = 3 AND during && r
      check: rows
      hint:
        vi: "`during * r` là phần giao của hai khoảng; `upper(...) - lower(...)` là độ dài."
        en: "`during * r` is the intersection of two ranges; `upper(...) - lower(...)` is its length."
---
## Ý chính

Kiểu range (`tstzrange`, `daterange`, `int4range`...) lưu một khoảng có đầu và cuối trong một giá trị. Mặc định khoảng là [đầu, cuối): gồm đầu, không gồm cuối, nên hai lượt 08:00–10:00 và 10:00–12:00 không chồng nhau.

- `a && b`: hai khoảng chồng nhau.
- `a @> t`: khoảng chứa thời điểm `t`.
- `a * b`: phần giao.

Index GiST hiểu các toán tử này. Ràng buộc `EXCLUDE` dùng index đó để cấm hai dòng mà mọi cặp "cột WITH toán tử" đều đúng: `(room WITH =, during WITH &&)` nghĩa là "không được có hai dòng cùng phòng và chồng giờ". GiST tự nó không có toán tử `=` cho `int`; extension `btree_gist` thêm vào để trộn cột thường với cột range trong một index GiST. (`btree_gin` làm việc tương tự cho GIN.)

## Ví dụ

```sql
ALTER TABLE bookings ADD CONSTRAINT demo_no_overlap EXCLUDE USING gist (room WITH =, during WITH &&);
-- ERROR: conflicting key value violates exclusion constraint "demo_no_overlap"
INSERT INTO bookings VALUES (99999, 3, tstzrange(timestamptz '2026-01-01 08:30+00', timestamptz '2026-01-01 09:30+00'));
```

## Thực hành

Bảng `bookings` có 20.000 lượt đặt hợp lệ của 50 phòng. Thêm ràng buộc chống đặt trùng, dùng index của nó để tìm, rồi tính số giờ đã đặt.

# EN

## Key idea

A range type (`tstzrange`, `daterange`, `int4range`...) stores an interval with a start and an end in one value. By default a range is [start, end): start included, end excluded, so bookings 08:00-10:00 and 10:00-12:00 do not overlap.

- `a && b`: the two ranges overlap.
- `a @> t`: the range contains instant `t`.
- `a * b`: the intersection.

A GiST index understands these operators. An `EXCLUDE` constraint uses that index to forbid two rows for which every "column WITH operator" pair is true: `(room WITH =, during WITH &&)` means "no two rows for the same room with overlapping times". GiST has no `=` operator for `int` on its own; the `btree_gist` extension adds it so plain columns can mix with range columns in one GiST index. (`btree_gin` does the same for GIN.)

## Example

```sql
ALTER TABLE bookings ADD CONSTRAINT demo_no_overlap EXCLUDE USING gist (room WITH =, during WITH &&);
-- ERROR: conflicting key value violates exclusion constraint "demo_no_overlap"
INSERT INTO bookings VALUES (99999, 3, tstzrange(timestamptz '2026-01-01 08:30+00', timestamptz '2026-01-01 09:30+00'));
```

## Practice

Table `bookings` holds 20,000 valid bookings for 50 rooms. Add the no-double-booking constraint, use its index to search, then compute booked hours.
