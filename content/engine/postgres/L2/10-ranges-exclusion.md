---
id: e-pg-l2-10
engine: postgres
level: L2
module: index-types
title: "Khoảng thời gian, GiST và ràng buộc không chồng lịch"
title_en: "Time ranges, GiST and a no-double-booking constraint"
kind: lab
runtime: browser
minutes: 15
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
viz: pg-gist-boxes
objectives:
  - vi: Lưu lịch đặt phòng bằng kiểu `tstzrange` và hỏi "chồng lên nhau" bằng `&&`.
    en: Store bookings as `tstzrange` and ask "do they overlap?" with `&&`.
  - vi: Dùng ràng buộc `EXCLUDE USING gist` (với `btree_gist`) để database tự cấm hai lượt đặt chồng giờ trong một phòng.
    en: Use an `EXCLUDE USING gist` constraint (with `btree_gist`) so the database itself forbids two overlapping bookings of one room.
  - vi: Viết câu tìm lịch trùng sao cho nó đi qua index GiST thay vì quét cả bảng.
    en: Write an overlap search that goes through the GiST index instead of scanning the whole table.
requires: [e-pg-l2-09]
sources:
  - https://www.postgresql.org/docs/18/rangetypes.html
  - https://www.postgresql.org/docs/18/functions-range.html
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
        vi: "Phòng 3 có bao nhiêu giờ đặt trong ngày 2026-02-01 (UTC)? Trả về một số: tổng độ dài phần giao của mỗi lượt với ngày đó, tính bằng giờ. `during * r` là phần giao của hai range; `extract(epoch FROM x)` đổi một `interval` ra số giây."
        en: "How many booked hours does room 3 have on 2026-02-01 (UTC)? Return one number: the total length of each booking's overlap with that day, in hours. `during * r` is the intersection of two ranges; `extract(epoch FROM x)` turns an `interval` into seconds."
      solution: SELECT sum(extract(epoch FROM upper(during * r) - lower(during * r)) / 3600) AS hours FROM bookings, tstzrange(timestamptz '2026-02-01 00:00+00', timestamptz '2026-02-02 00:00+00') AS r WHERE room = 3 AND during && r
      check: rows
      hint:
        vi: "`during * r` là phần giao của hai khoảng; `upper(...) - lower(...)` là độ dài."
        en: "`during * r` is the intersection of two ranges; `upper(...) - lower(...)` is its length."
    - task:
        vi: "Lễ tân cần mọi lượt đặt, ở mọi phòng, chồng lên khung 09:00–10:00 ngày 2026-02-01 (UTC). Trả về `id` và `room`. Câu phải nhanh: đi qua index của ràng buộc, không quét cả 20.000 dòng."
        en: "The front desk needs every booking, in every room, that overlaps 09:00-10:00 on 2026-02-01 (UTC). Return `id` and `room`. The query must be fast: through the constraint's index, not a scan of all 20,000 rows."
      solution: SELECT id, room FROM bookings WHERE during && tstzrange(timestamptz '2026-02-01 09:00+00', timestamptz '2026-02-01 10:00+00')
      check: rows
      perf: { table: bookings }
      slow: SELECT id, room FROM bookings WHERE lower(during) < timestamptz '2026-02-01 10:00+00' AND upper(during) > timestamptz '2026-02-01 09:00+00'
      hint:
        vi: "Hỏi thẳng range bằng `&&`. Tự so `lower(during)` và `upper(during)` cho cùng kết quả nhưng index GiST không hiểu hai phép so đó."
        en: "Ask the range directly with `&&`. Comparing `lower(during)` and `upper(during)` yourself gives the same rows, but the GiST index does not understand those two comparisons."
quiz:
  - q:
      vi: "Phòng 7 đã có lượt 08:00–10:00. Thêm lượt 10:00–12:00 cùng ngày cho phòng 7 (cả hai là `tstzrange` mặc định). Ràng buộc `bookings_no_overlap` làm gì?"
      en: "Room 7 already has a 08:00-10:00 booking. You add 10:00-12:00 on the same day for room 7 (both default `tstzrange`). What does `bookings_no_overlap` do?"
    options:
      - { vi: "Từ chối: hai lượt chạm nhau lúc 10:00 nên là chồng", en: "Refuses it: the two bookings touch at 10:00, so they overlap" }
      - { vi: "Cho qua: mặc định là `[)`, giờ kết thúc không thuộc khoảng nên hai lượt chỉ nối tiếp", en: "Accepts it: the default is `[)`, the end time is not part of the range, so the bookings only follow each other" }
      - { vi: "Cho qua vì ràng buộc chỉ kiểm khi chạy `VACUUM`", en: "Accepts it because the constraint is only checked during `VACUUM`" }
    answer: 1
    trap: 0
    why:
      vi: "Từ chối nghe hợp lý vì trên đồng hồ hai lượt có chung mốc 10:00, nhưng range mặc định là `[)`: gồm mốc đầu, bỏ mốc cuối, nên lượt đầu dừng ngay trước 10:00. Vì thế `&&` (có chồng nhau không) trả `false` và hai lượt nối tiếp được phép. Ràng buộc kiểm ngay lúc `INSERT`, không đợi `VACUUM`. Muốn tính cả mốc cuối thì phải ghi rõ `'[]'`."
      en: "Refusing sounds right because on the clock both bookings share 10:00, but a default range is `[)`: it includes its start and excludes its end, so the first booking stops just before 10:00. So `&&` (do they overlap?) is `false` and back-to-back bookings are allowed. The constraint is checked at `INSERT` time, not during `VACUUM`. To include the end you must write `'[]'`."
  - q:
      vi: "Vì sao ràng buộc `EXCLUDE USING gist (room WITH =, during WITH &&)` cần extension `btree_gist`?"
      en: "Why does the constraint `EXCLUDE USING gist (room WITH =, during WITH &&)` need the `btree_gist` extension?"
    options:
      - { vi: "Để ràng buộc chạy nhanh hơn; thiếu nó vẫn tạo được", en: "To make the constraint faster; it can still be created without it" }
      - { vi: "GiST không có sẵn cách so `=` cho cột `int`; `btree_gist` thêm opclass đó để `room` nằm chung index với `during`", en: "GiST has no built-in way to compare `=` on an `int` column; `btree_gist` adds that opclass so `room` can share the index with `during`" }
      - { vi: "Vì `EXCLUDE` chỉ chạy trên B-tree", en: "Because `EXCLUDE` only works on a B-tree" }
    answer: 1
    trap: 2
    why:
      vi: "`EXCLUDE` chạy trên B-tree nghe hợp lý vì ràng buộc `UNIQUE` quen thuộc chạy trên B-tree, nhưng B-tree không hiểu `&&` của range, nên ràng buộc này phải dùng GiST. GiST lại không có sẵn opclass (operator class: bộ toán tử một loại index hiểu cho một kiểu dữ liệu) với `=` cho số nguyên; `btree_gist` thêm opclass đó. Đây không phải chuyện tốc độ: thiếu extension, lệnh tạo ràng buộc báo lỗi ngay."
      en: "`EXCLUDE` on a B-tree sounds right because the familiar `UNIQUE` constraint runs on a B-tree, but a B-tree does not understand the range `&&`, so this constraint must use GiST. GiST in turn has no built-in opclass (operator class: the set of operators an index type understands for a data type) with `=` for integers; `btree_gist` adds it. This is not about speed: without the extension, creating the constraint fails at once."
---
## Mở bài

Hai khách đặt cùng phòng họp số 3, một người 8:00 tới 10:00, người kia 9:00 tới 11:00, và cả hai đều nhận email xác nhận. Kiểm tra trùng lịch trong code ứng dụng thì vẫn lọt khi hai yêu cầu tới cùng lúc. Bài này để chính database từ chối lượt đặt thứ hai.

## Ý chính

Kiểu range (`tstzrange`, `daterange`, `int4range`...) lưu một khoảng có đầu và cuối trong một giá trị duy nhất, thay vì hai cột rời. Mặc định khoảng là `[)`: gồm đầu, không gồm cuối. Nhờ vậy hai lượt 08:00–10:00 và 10:00–12:00 nối tiếp nhau mà không bị coi là chồng.

Ba toán tử dùng nhiều nhất: `a && b` đúng khi hai khoảng chồng nhau, `a @> t` đúng khi khoảng chứa thời điểm `t`, `a * b` trả phần giao. Hàm `lower(a)` và `upper(a)` lấy hai đầu, `isempty(a)` cho biết khoảng có rỗng không.

Index GiST hiểu các toán tử này: nó gom các khoảng gần nhau vào cùng một nhánh cây, nên câu hỏi `during && r` chỉ đi xuống những nhánh có thể chồng với `r`. Ràng buộc `EXCLUDE` dùng chính index đó để cấm hai dòng mà mọi cặp "cột WITH toán tử" đều đúng: `(room WITH =, during WITH &&)` nghĩa là "không có hai dòng cùng phòng và chồng giờ". Mỗi lần ghi, Postgres tìm trong index xem đã có dòng xung đột chưa, kể cả khi hai phiên ghi cùng lúc.

GiST tự nó không có toán tử `=` cho `int`. Extension `btree_gist` thêm vào, để cột thường đứng chung với cột range trong một index GiST. (`btree_gin` làm việc tương tự cho GIN.)

Nhiều người nghĩ cứ tự so `lower(during)` và `upper(during)` là đủ, vì kết quả giống `&&`. Thật ra kết quả giống, nhưng index GiST chỉ nhận toán tử của nó: hai phép so trên biểu thức buộc Postgres đọc cả bảng.

## Cú pháp

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE table_name ADD CONSTRAINT constraint_name
  EXCLUDE USING gist ( column WITH operator [, ...] ) [ WHERE ( predicate ) ];
SELECT ... FROM table_name WHERE range_column && tstzrange(start, finish [, bounds ]);
```

- `WITH =`: hai dòng trùng giá trị ở cột này.
- `WITH &&`: hai khoảng chồng nhau ở cột này.
- `WHERE ( predicate )`: chỉ áp ràng buộc cho các dòng thỏa điều kiện, ví dụ bỏ qua lượt đã hủy.
- `bounds`: `'[)'` (mặc định), `'[]'`, `'(]'` hoặc `'()'`.

## Ví dụ

Ba toán tử trên hai khoảng cố định:

```sql
SELECT tstzrange(timestamptz '2026-01-01 08:00+00', timestamptz '2026-01-01 10:00+00')
       && tstzrange(timestamptz '2026-01-01 10:00+00', timestamptz '2026-01-01 12:00+00') AS touching,
       tstzrange(timestamptz '2026-01-01 08:00+00', timestamptz '2026-01-01 10:00+00')
       @> timestamptz '2026-01-01 09:15+00' AS holds_915,
       tstzrange(timestamptz '2026-01-01 08:00+00', timestamptz '2026-01-01 10:00+00')
       * tstzrange(timestamptz '2026-01-01 09:00+00', timestamptz '2026-01-01 12:00+00') AS common_part;
```

`touching` là `false` (hai lượt chỉ chạm nhau), `holds_915` là `true`, và phần giao là khoảng 09:00–10:00.

Thêm ràng buộc thử rồi xem định nghĩa Postgres lưu:

```sql
ALTER TABLE bookings ADD CONSTRAINT demo_no_overlap EXCLUDE USING gist (room WITH =, during WITH &&);
SELECT conname, contype, pg_get_constraintdef(oid) AS definition
FROM pg_constraint WHERE conrelid = 'bookings'::regclass ORDER BY conname;
```

Có hai dòng: khóa chính (`p`) và ràng buộc loại trừ (`x`). Ràng buộc mang theo một index GiST cùng tên, và câu tìm dùng được nó:

```sql
EXPLAIN SELECT id FROM bookings
WHERE room = 3 AND during && tstzrange(timestamptz '2026-02-01 00:00+00', timestamptz '2026-02-02 00:00+00');
```

Kế hoạch là `Bitmap Index Scan on demo_no_overlap` với cả hai điều kiện trong `Index Cond`.

## Lỗi hay gặp

Đặt chồng giờ khi ràng buộc đã có: Postgres từ chối, và ứng dụng nên bắt mã lỗi này để báo "phòng đã có người".

```sql
-- ERROR 23P01: conflicting key value violates exclusion constraint "demo_no_overlap"
INSERT INTO bookings VALUES (99999, 3, tstzrange(timestamptz '2026-01-01 08:30+00', timestamptz '2026-01-01 09:30+00'));
```

Quên `USING gist`: khi đó Postgres dùng B-tree, mà B-tree không biết `&&`.

```sql
-- ERROR 42809: operator &&(anyrange,anyrange) is not a member of operator family "range_ops"
ALTER TABLE bookings ADD CONSTRAINT demo_btree EXCLUDE (room WITH =, during WITH &&);
```

Viết khoảng tìm kiếm có cả mốc cuối: lượt bắt đầu đúng 11:00 bị tính là trùng.

```sql
-- WRONG: '[]' also counts the booking that starts at 11:00
SELECT count(*) AS hits FROM bookings
WHERE room = 3 AND during && tstzrange(timestamptz '2026-01-01 08:00+00', timestamptz '2026-01-01 11:00+00', '[]');
```

```sql
-- FIX: keep the default '[)' bounds
SELECT count(*) AS hits FROM bookings
WHERE room = 3 AND during && tstzrange(timestamptz '2026-01-01 08:00+00', timestamptz '2026-01-01 11:00+00');
```

Câu sai đếm 2, câu đúng đếm 1. Giữ một quy ước `[)` cho mọi khoảng trong hệ thống thì không phải nghĩ về mốc nối.

## Thực hành

Bảng `bookings` có 20.000 lượt đặt hợp lệ của 50 phòng. Thêm ràng buộc chống đặt trùng, dùng index của nó để tìm, tính số giờ đã đặt, rồi viết câu tìm theo khung giờ cho mọi phòng đủ nhanh để qua thanh hiệu năng. Sau lab là hai câu hỏi.

## Tóm tắt

- Một cột range thay cho cặp cột đầu/cuối; mặc định `[)` nên lịch nối tiếp không bị coi là chồng.
- `&&` hỏi chồng nhau, `@>` hỏi chứa, `*` lấy phần giao.
- `EXCLUDE USING gist (room WITH =, during WITH &&)` để database tự cấm đặt trùng; cần `btree_gist` cho cột `room`.
- Hỏi bằng toán tử của range thì index GiST giúp được; tự so `lower`/`upper` thì quét cả bảng.

# EN

## Opening

Two customers book meeting room 3, one from 8:00 to 10:00, the other from 9:00 to 11:00, and both get a confirmation email. A double-booking check in application code still slips when two requests arrive at the same moment. This lesson makes the database itself refuse the second booking.

## Key idea

A range type (`tstzrange`, `daterange`, `int4range`...) stores an interval with a start and an end in one value instead of two loose columns. By default a range is `[)`: start included, end excluded. That way bookings 08:00-10:00 and 10:00-12:00 follow each other without counting as an overlap.

The three most used operators: `a && b` is true when the ranges overlap, `a @> t` is true when the range contains instant `t`, `a * b` returns the intersection. The functions `lower(a)` and `upper(a)` give the two ends, and `isempty(a)` tells whether the range is empty.

A GiST index understands these operators: it groups nearby ranges in the same branch of its tree, so the question `during && r` only walks down branches that can overlap `r`. An `EXCLUDE` constraint uses that same index to forbid two rows for which every "column WITH operator" pair is true: `(room WITH =, during WITH &&)` means "no two rows with the same room and overlapping times". On every write Postgres searches the index for a conflicting row, even when two sessions write at the same time.

GiST has no `=` operator for `int` on its own. The `btree_gist` extension adds it, so a plain column can sit next to a range column in one GiST index. (`btree_gin` does the same for GIN.)

Many people think comparing `lower(during)` and `upper(during)` themselves is enough, since the result equals `&&`. In fact the rows are the same, but a GiST index only accepts its own operators: two comparisons on expressions force Postgres to read the whole table.

## Syntax

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE table_name ADD CONSTRAINT constraint_name
  EXCLUDE USING gist ( column WITH operator [, ...] ) [ WHERE ( predicate ) ];
SELECT ... FROM table_name WHERE range_column && tstzrange(start, finish [, bounds ]);
```

- `WITH =`: two rows with equal values in this column.
- `WITH &&`: two overlapping ranges in this column.
- `WHERE ( predicate )`: apply the constraint only to rows matching the condition, for example skip cancelled bookings.
- `bounds`: `'[)'` (default), `'[]'`, `'(]'` or `'()'`.

## Example

The three operators on two fixed ranges:

```sql
SELECT tstzrange(timestamptz '2026-01-01 08:00+00', timestamptz '2026-01-01 10:00+00')
       && tstzrange(timestamptz '2026-01-01 10:00+00', timestamptz '2026-01-01 12:00+00') AS touching,
       tstzrange(timestamptz '2026-01-01 08:00+00', timestamptz '2026-01-01 10:00+00')
       @> timestamptz '2026-01-01 09:15+00' AS holds_915,
       tstzrange(timestamptz '2026-01-01 08:00+00', timestamptz '2026-01-01 10:00+00')
       * tstzrange(timestamptz '2026-01-01 09:00+00', timestamptz '2026-01-01 12:00+00') AS common_part;
```

`touching` is `false` (the bookings only touch), `holds_915` is `true`, and the intersection is the range 09:00-10:00.

Add a trial constraint, then read the definition Postgres stores:

```sql
ALTER TABLE bookings ADD CONSTRAINT demo_no_overlap EXCLUDE USING gist (room WITH =, during WITH &&);
SELECT conname, contype, pg_get_constraintdef(oid) AS definition
FROM pg_constraint WHERE conrelid = 'bookings'::regclass ORDER BY conname;
```

There are two rows: the primary key (`p`) and the exclusion constraint (`x`). The constraint brings a GiST index of the same name, and a search can use it:

```sql
EXPLAIN SELECT id FROM bookings
WHERE room = 3 AND during && tstzrange(timestamptz '2026-02-01 00:00+00', timestamptz '2026-02-02 00:00+00');
```

The plan is a `Bitmap Index Scan on demo_no_overlap` with both conditions in its `Index Cond`.

## Common mistakes

Booking an overlapping slot once the constraint exists: Postgres refuses, and the application should catch this error code to say "the room is taken".

```sql
-- ERROR 23P01: conflicting key value violates exclusion constraint "demo_no_overlap"
INSERT INTO bookings VALUES (99999, 3, tstzrange(timestamptz '2026-01-01 08:30+00', timestamptz '2026-01-01 09:30+00'));
```

Forgetting `USING gist`: Postgres then uses a B-tree, and a B-tree does not know `&&`.

```sql
-- ERROR 42809: operator &&(anyrange,anyrange) is not a member of operator family "range_ops"
ALTER TABLE bookings ADD CONSTRAINT demo_btree EXCLUDE (room WITH =, during WITH &&);
```

Writing the search range with its end included: the booking that starts exactly at 11:00 counts as a clash.

```sql
-- WRONG: '[]' also counts the booking that starts at 11:00
SELECT count(*) AS hits FROM bookings
WHERE room = 3 AND during && tstzrange(timestamptz '2026-01-01 08:00+00', timestamptz '2026-01-01 11:00+00', '[]');
```

```sql
-- FIX: keep the default '[)' bounds
SELECT count(*) AS hits FROM bookings
WHERE room = 3 AND during && tstzrange(timestamptz '2026-01-01 08:00+00', timestamptz '2026-01-01 11:00+00');
```

The wrong query counts 2, the right one 1. Keep one `[)` convention for every range in the system and the joints never need thought.

## Practice

Table `bookings` holds 20,000 valid bookings for 50 rooms. Add the no-double-booking constraint, use its index to search, compute booked hours, then write a time-slot search across all rooms that is fast enough to pass the performance bar. Two questions follow the lab.

## Recap

- One range column replaces a start/end pair; the default `[)` means back-to-back bookings do not overlap.
- `&&` asks overlap, `@>` asks containment, `*` takes the intersection.
- `EXCLUDE USING gist (room WITH =, during WITH &&)` lets the database forbid double bookings; the `room` column needs `btree_gist`.
- Ask with the range operators and the GiST index helps; comparing `lower`/`upper` yourself scans the whole table.
