---
id: e-pg-l1-01
engine: postgres
level: L1
module: types
title: Chọn kiểu dữ liệu
title_en: Choosing data types
kind: concept
runtime: browser
minutes: 8
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
objectives:
  - vi: Chọn `numeric` cho tiền và `double precision` cho số đo, giải thích được vì sao.
    en: Pick `numeric` for money and `double precision` for measurements, and say why.
  - vi: Dùng `timestamptz` cho thời điểm thật và `text` cho chuỗi, không sợ "chậm hơn varchar".
    en: Use `timestamptz` for real instants and `text` for strings, without fearing it is "slower than varchar".
requires: []
sources:
  - https://www.postgresql.org/docs/18/datatype.html
  - https://www.postgresql.org/docs/18/datatype-numeric.html
  - https://www.postgresql.org/docs/18/datatype-character.html
  - https://www.postgresql.org/docs/18/datatype-datetime.html
lab:
  setup: |
    SET TimeZone = 'Asia/Ho_Chi_Minh';
    CREATE TABLE pay (id int, amount_f double precision, amount_n numeric(12,2));
    INSERT INTO pay SELECT g, 0.1, 0.1 FROM generate_series(1, 10) AS g;
    CREATE TABLE logins (id int, at_tz timestamptz, at_plain timestamp);
    INSERT INTO logins VALUES (1, '2026-03-01 09:00+00', '2026-03-01 09:00+00');
    CREATE TABLE names (c char(10), v varchar(10), t text);
    INSERT INTO names VALUES ('Lan', 'Lan', 'Lan');
  steps:
    - task:
        vi: "Bảng `pay` có 10 khoản 0,1 lưu hai lần: `amount_f` (`double precision`) và `amount_n` (`numeric`). Tổng của mỗi cột có đúng bằng 1 không? Trả về hai cột đúng/sai `float_is_1`, `numeric_is_1`."
        en: "Table `pay` holds ten amounts of 0.1, stored twice: `amount_f` (`double precision`) and `amount_n` (`numeric`). Is each column's total exactly 1? Return two true/false columns `float_is_1`, `numeric_is_1`."
      solution: SELECT sum(amount_f) = 1 AS float_is_1, sum(amount_n) = 1 AS numeric_is_1 FROM pay
      check: rows
      hint:
        vi: "So `sum(amount_f) = 1` và `sum(amount_n) = 1` trong cùng một `SELECT`."
        en: "Compare `sum(amount_f) = 1` and `sum(amount_n) = 1` in one `SELECT`."
      fact:
        vi: "`float_is_1` là false (tổng là 0,9999999999999999), `numeric_is_1` là true: sai số nhị phân cộng dồn qua từng dòng."
        en: "`float_is_1` is false (the total is 0.9999999999999999), `numeric_is_1` is true: the binary error adds up row by row."
        probe: SELECT sum(amount_f) = 1, sum(amount_n) = 1 FROM pay
        expect: [[false, true]]
    - task:
        vi: "Phiên đang ở múi giờ `Asia/Ho_Chi_Minh`. Cùng một lần đăng nhập lúc 09:00 UTC được ghi vào `at_tz` (`timestamptz`) và `at_plain` (`timestamp`). Trả về hai cột đó dưới dạng chữ (`::text`)."
        en: "The session is in time zone `Asia/Ho_Chi_Minh`. The same login at 09:00 UTC was written to `at_tz` (`timestamptz`) and `at_plain` (`timestamp`). Return both columns as text (`::text`)."
      solution: SELECT at_tz::text, at_plain::text FROM logins
      check: rows
      hint:
        vi: "Ép từng cột sang chữ bằng `::text`."
        en: "Cast each column to text with `::text`."
      fact:
        vi: "`at_tz` hiện `2026-03-01 16:00:00+07` (đúng thời điểm, đổi sang giờ phiên), `at_plain` hiện `2026-03-01 09:00:00`: phần `+00` đã bị bỏ khi ghi."
        en: "`at_tz` shows `2026-03-01 16:00:00+07` (the same instant in the session zone), `at_plain` shows `2026-03-01 09:00:00`: the `+00` was dropped on write."
        probe: SELECT at_tz::text, at_plain::text FROM logins
        expect: [["2026-03-01 16:00:00+07", "2026-03-01 09:00:00"]]
    - task:
        vi: "Chữ `Lan` được ghi vào ba cột `char(10)`, `varchar(10)` và `text` của bảng `names`. Mỗi giá trị chiếm bao nhiêu byte? Trả về `pg_column_size` của `c`, `v`, `t`."
        en: "The word `Lan` was written to three columns of `names`: `char(10)`, `varchar(10)` and `text`. How many bytes does each value take? Return `pg_column_size` of `c`, `v`, `t`."
      solution: SELECT pg_column_size(c), pg_column_size(v), pg_column_size(t) FROM names
      check: rows
      hint:
        vi: "Gọi `pg_column_size()` cho từng cột."
        en: "Call `pg_column_size()` on each column."
      fact:
        vi: "`char(10)` chiếm 11 byte vì được đệm khoảng trắng tới 10 ký tự, `varchar` và `text` cùng 4 byte: ba kiểu cùng một cách lưu, chỉ `char(n)` tốn thêm."
        en: "`char(10)` takes 11 bytes because it is padded with blanks to 10 characters; `varchar` and `text` both take 4: the three types share one storage format, only `char(n)` costs more."
        probe: SELECT pg_column_size(c), pg_column_size(v), pg_column_size(t) FROM names
        expect: [[11, 4, 4]]
quiz:
  - q:
      vi: Cột lưu số tiền đơn hàng (VND, có thể có phần lẻ) nên dùng kiểu nào?
      en: Which type should hold an order amount (VND, possibly with a fraction)?
    options:
      - { vi: "`double precision`", en: "`double precision`" }
      - { vi: "`numeric(14,2)`", en: "`numeric(14,2)`" }
      - { vi: "`text`", en: "`text`" }
    answer: 1
    why:
      vi: "`double precision` nghe hợp lý vì nó là kiểu số có phần lẻ, nhưng nó có sai số nhị phân nên cộng nhiều lần thì tổng tiền lệch. `numeric` lưu chính xác từng chữ số, nên tổng tiền không lệch; `text` không cộng trừ được."
      en: "`double precision` sounds right because it is a number type with a fraction, but it has binary rounding error, so totals drift once you add many amounts. `numeric` stores every digit exactly, so totals never drift; `text` cannot be added up."
  - q:
      vi: Một lần đăng nhập xảy ra lúc 09:00 giờ UTC. Kiểu nào giữ đúng thời điểm đó cho người xem ở mọi múi giờ?
      en: A login happens at 09:00 UTC. Which type keeps that exact instant for viewers in every time zone?
    options:
      - { vi: "`timestamp` (không múi giờ)", en: "`timestamp` (without time zone)" }
      - { vi: "`timestamptz`", en: "`timestamptz`" }
      - { vi: "`date`", en: "`date`" }
    answer: 1
    why:
      vi: "`timestamp` dễ được chọn vì tên của nó nghe đúng là \"thời điểm\"; nhưng nó bỏ phần múi giờ, nên hai người ở hai nơi hiểu khác nhau. `timestamptz` lưu một thời điểm tuyệt đối và đổi sang múi giờ của phiên khi hiển thị."
      en: "`timestamp` is tempting because its name sounds exactly like \"an instant\", but it drops the zone, so two people in two places read it differently. `timestamptz` stores an absolute instant and converts it to the session zone for display."
  - q:
      vi: Bạn muốn tên khách tối đa 100 ký tự. Cách nào đúng với Postgres?
      en: You want customer names to be at most 100 characters. Which is right for Postgres?
    options:
      - { vi: "`char(100)` vì nhanh hơn", en: "`char(100)` because it is faster" }
      - { vi: "`varchar(100)`, hoặc `text` kèm một `CHECK`", en: "`varchar(100)`, or `text` with a `CHECK`" }
      - { vi: Không giới hạn được, en: It cannot be limited }
    answer: 1
    why:
      vi: "Lời khuyên \"chuỗi độ dài cố định thì nhanh hơn\" đến từ vài hệ CSDL khác, nên nghe quen; nhưng ở Postgres ba kiểu chuỗi không khác nhau về hiệu năng, và `char(n)` còn đệm khoảng trắng nên thường chậm nhất. Giới hạn độ dài bằng `varchar(n)` hoặc `CHECK`."
      en: "The advice \"fixed-length strings are faster\" comes from some other databases, so it sounds familiar, but in Postgres the three string types perform the same, and `char(n)` also pads with blanks and is usually the slowest. Cap the length with `varchar(n)` or a `CHECK`."
---
## Ý chính

Cộng 0,1 với 0,2 trong một cột tiền, tổng có đúng bằng 0,3 không? Kiểu của cột quyết định giá trị nhận được, kết quả phép tính và dung lượng:

- Số nguyên: `integer` (4 byte, tới khoảng 2,1 tỉ) và `bigint` (8 byte), dùng cho khóa có thể lớn.
- Số thực: `numeric(p, s)` lưu chính xác từng chữ số, hợp với tiền. `real` và `double precision` theo IEEE 754, có sai số: `0.1 + 0.2` không đúng bằng `0.3`. Dùng chúng cho số đo, tọa độ.
- Chuỗi: docs chính thức nói `text`, `varchar(n)` và `char(n)` không khác nhau về hiệu năng; `char(n)` còn đệm khoảng trắng. Giới hạn độ dài bằng `varchar(n)` hoặc `CHECK`.
- Thời gian: `timestamptz` lưu một thời điểm tuyệt đối, hiển thị theo `TimeZone` của phiên; `timestamp` chỉ là "ngày giờ trên lịch". Sự kiện thật nên là `timestamptz`; ngày thuần dùng `date`.

## Ví dụ

Ngoài ra có `boolean`, `uuid`, `jsonb` và mảng; các bài sau dùng tới.

```sql
SELECT 0.1::float8 + 0.2::float8 = 0.3 AS float_equal,
       0.1::numeric + 0.2::numeric = 0.3 AS numeric_equal;
```

Kết quả: `float_equal` là false, `numeric_equal` là true.

```sql
SET TimeZone = 'Asia/Ho_Chi_Minh';
SELECT (timestamptz '2026-03-01 09:00+00')::text AS shown_local,
       (timestamp '2026-03-01 09:00+00')::text AS no_zone;
```

Cùng một chuỗi: `timestamptz` hiện `16:00+07` (đã đổi sang giờ phiên), còn `timestamp` bỏ phần `+00` và giữ `09:00`.

## Thực hành

Làm lab (ba bước: tổng tiền, thời điểm, chuỗi) rồi trả lời ba câu hỏi bên dưới. Trước đó, thử tự nghĩ: bảng hóa đơn cần cột "số tiền", "thời điểm thanh toán", "ghi chú" và "đã hoàn tiền chưa". Bạn chọn kiểu gì cho từng cột? (Gợi ý: `numeric(12,2)`, `timestamptz`, `text`, `boolean`.)

# EN

## Key idea

Add 0.1 and 0.2 in a money column: is the total exactly 0.3? A column's type decides the values it accepts, what arithmetic returns and the space it takes:

- Integers: `integer` (4 bytes, up to about 2.1 billion) and `bigint` (8 bytes), for keys that may grow large.
- Fractions: `numeric(p, s)` stores every digit exactly, which suits money. `real` and `double precision` follow IEEE 754 and are inexact: `0.1 + 0.2` is not exactly `0.3`. Use them for measurements and coordinates.
- Strings: the official docs say `text`, `varchar(n)` and `char(n)` perform the same; `char(n)` also pads with blanks. Cap a length with `varchar(n)` or `CHECK`.
- Time: `timestamptz` stores an absolute instant, shown in the session's `TimeZone`; `timestamp` is just "a date and time on a calendar". Real events should be `timestamptz`; plain days use `date`.

## Example

There are also `boolean`, `uuid`, `jsonb` and arrays; later lessons use them.

```sql
SELECT 0.1::float8 + 0.2::float8 = 0.3 AS float_equal,
       0.1::numeric + 0.2::numeric = 0.3 AS numeric_equal;
```

Result: `float_equal` is false, `numeric_equal` is true.

```sql
SET TimeZone = 'Asia/Ho_Chi_Minh';
SELECT (timestamptz '2026-03-01 09:00+00')::text AS shown_local,
       (timestamp '2026-03-01 09:00+00')::text AS no_zone;
```

Same literal: `timestamptz` shows `16:00+07` (converted to the session zone), while `timestamp` drops the `+00` and keeps `09:00`.

## Practice

Do the lab (three steps: money totals, instants, strings), then answer the three questions below. First, think it through: an invoice table needs "amount", "paid at", "note" and "refunded?". Which type fits each column? (Hint: `numeric(12,2)`, `timestamptz`, `text`, `boolean`.)
