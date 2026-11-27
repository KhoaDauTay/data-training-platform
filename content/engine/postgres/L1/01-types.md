---
id: e-pg-l1-01
engine: postgres
level: L1
module: ddl
title: Chọn kiểu dữ liệu
title_en: Choosing data types
kind: concept
runtime: browser
minutes: 10
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Chọn `numeric` cho tiền và `double precision` cho số đo, giải thích được vì sao.
    en: Pick `numeric` for money and `double precision` for measurements, and say why.
  - vi: Dùng `timestamptz` cho thời điểm thật và `text` cho chuỗi, không sợ "chậm hơn varchar".
    en: Use `timestamptz` for real instants and `text` for strings, without fearing it is "slower than varchar".
  - vi: Nhận ra lỗi tràn số và chuỗi quá dài, và chọn kiểu đủ rộng ngay từ đầu.
    en: Recognise integer overflow and too-long strings, and pick a type wide enough from the start.
requires: []
sources:
  - { url: https://www.postgresql.org/docs/18/datatype.html, title_vi: "Kiểu dữ liệu" }
  - { url: https://www.postgresql.org/docs/18/datatype-numeric.html, title_vi: "Kiểu số" }
  - { url: https://www.postgresql.org/docs/18/datatype-character.html, title_vi: "Kiểu chuỗi ký tự" }
  - { url: https://www.postgresql.org/docs/18/datatype-datetime.html, title_vi: "Kiểu ngày giờ" }
lab:
  setup: |
    SET TimeZone = 'Asia/Ho_Chi_Minh';
    CREATE TABLE pay (id int PRIMARY KEY, amount_f double precision, amount_n numeric(12,2));
    INSERT INTO pay SELECT g, 0.1, 0.1 FROM generate_series(1, 10) AS g;
    CREATE TABLE logins (id int PRIMARY KEY, at_tz timestamptz, at_plain timestamp);
    INSERT INTO logins VALUES (1, '2026-03-01 09:00+00', '2026-03-01 09:00+00');
    CREATE TABLE names (id int PRIMARY KEY, c char(10), v varchar(10), t text);
    INSERT INTO names VALUES (1, 'Lan', 'Lan', 'Lan');
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
        vi: "`float_is_1` là false (tổng là 0,9999999999999999), `numeric_is_1` là true: hệ nhị phân không ghi đúng được 0,1, nên mỗi dòng lệch một chút và mười lần lệch cộng lại thành sai."
        en: "`float_is_1` is false (the total is 0.9999999999999999), `numeric_is_1` is true: binary cannot store 0.1 exactly, so each row is slightly off and ten small errors add up."
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
    trap: 0
    why:
      vi: "`double precision` nghe hợp lý vì nó nhận phần lẻ, nhưng nó lưu số ở dạng nhị phân, chỉ gần đúng: ở bước 1, mười khoản 0,1 cộng ra 0,9999999999999999. `numeric(14,2)` lưu đúng từng chữ số thập phân, nên tổng tiền không lệch. `text` thì không cộng trừ được."
      en: "`double precision` sounds right because it takes a fraction, but it stores numbers in binary, only approximately: in step 1, ten amounts of 0.1 add up to 0.9999999999999999. `numeric(14,2)` stores every decimal digit exactly, so totals never drift. `text` cannot be added up at all."
  - q:
      vi: Một lần đăng nhập xảy ra lúc 09:00 giờ UTC. Kiểu nào giữ đúng thời điểm đó cho người xem ở mọi múi giờ?
      en: A login happens at 09:00 UTC. Which type keeps that exact instant for viewers in every time zone?
    options:
      - { vi: "`timestamp` (không múi giờ)", en: "`timestamp` (without time zone)" }
      - { vi: "`timestamptz`", en: "`timestamptz`" }
      - { vi: "`date`", en: "`date`" }
    answer: 1
    trap: 0
    why:
      vi: "`timestamp` nghe hợp lý vì tên của nó nghĩa là \"thời điểm\", nhưng khi ghi nó bỏ phần múi giờ (time zone) `+00`: ở bước 2, cột này chỉ còn `09:00` và một phiên ở +07 hiểu đó là 02:00 UTC. `timestamptz` lưu một thời điểm tuyệt đối và đổi sang múi giờ của phiên khi hiển thị. `date` thì mất luôn giờ."
      en: "`timestamp` sounds right because its name means \"an instant\", but on write it drops the `+00` zone: in step 2 the column keeps only `09:00`, and a session at +07 reads that as 02:00 UTC. `timestamptz` stores an absolute instant and converts it to the session zone for display. `date` loses the time entirely."
  - q:
      vi: Bạn muốn tên khách tối đa 100 ký tự. Cách nào đúng với Postgres?
      en: You want customer names to be at most 100 characters. Which is right for Postgres?
    options:
      - { vi: "`char(100)` vì nhanh hơn", en: "`char(100)` because it is faster" }
      - { vi: "`varchar(100)`, hoặc `text` kèm một `CHECK`", en: "`varchar(100)`, or `text` with a `CHECK`" }
      - { vi: Không giới hạn được, en: It cannot be limited }
    answer: 1
    trap: 0
    why:
      vi: "`char(100)` nghe hợp lý vì lời khuyên \"chuỗi độ dài cố định thì nhanh hơn\" có từ vài hệ cơ sở dữ liệu khác, nhưng ở Postgres ba kiểu chuỗi dùng chung một cách lưu và nhanh như nhau. `char(n)` còn đệm khoảng trắng: ở bước 3, `Lan` trong `char(10)` tốn 11 byte so với 4 byte của `text`. Giới hạn được: `varchar(100)` hoặc `CHECK` từ chối chuỗi dài hơn."
      en: "`char(100)` sounds right because the advice \"fixed-length strings are faster\" comes from some other databases, but in Postgres the three string types share one storage format and are equally fast. `char(n)` also pads with blanks: in step 3, `Lan` in `char(10)` takes 11 bytes against 4 for `text`. A limit is possible: `varchar(100)` or a `CHECK` refuses longer strings."
---
## Mở bài

Bạn cộng mười khoản 0,1 đồng và báo cáo ra 0,9999999999999999 thay vì 1. Không có câu SQL nào sai: lỗi nằm ở kiểu của cột, chọn từ lúc tạo bảng. Bài này giúp bạn chọn kiểu đúng cho tiền, thời điểm và chuỗi.

## Ý chính

Kiểu của cột quyết định ba thứ: giá trị nào được nhận, phép tính trả về gì và mỗi giá trị chiếm bao nhiêu byte. Đổi kiểu khi bảng đã đầy dữ liệu tốn công, nên chọn đúng ngay từ đầu.

Số nguyên: `integer` chiếm 4 byte và chỉ tới 2.147.483.647 (khoảng 2,1 tỉ); `bigint` chiếm 8 byte và đủ cho mọi khóa, mọi bộ đếm. Vượt giới hạn thì Postgres báo lỗi chứ không tự quay vòng, nên một bảng log sống lâu nên dùng `bigint`.

Số có phần lẻ: `numeric(p, s)` lưu chính xác từng chữ số thập phân, với `p` chữ số tổng và `s` chữ số sau dấu phẩy; giá trị có nhiều chữ số lẻ hơn `s` được làm tròn. `real` và `double precision` theo chuẩn IEEE 754, lưu số dạng nhị phân nên phần lớn số thập phân chỉ gần đúng. Nhiều người nghĩ `double precision` đủ chính xác cho tiền vì nó có 15 chữ số. Thật ra sai số nhỏ cộng dồn qua hàng nghìn dòng, và phép so sánh bằng `=` có thể sai. Tiền dùng `numeric`; số đo, tọa độ, điểm số dùng `double precision`.

Chuỗi: `text`, `varchar(n)` và `char(n)` dùng chung một cách lưu. Nhiều người nghĩ `varchar(n)` hay `char(n)` nhanh hơn `text`. Thật ra tài liệu chính thức nói ba kiểu không khác nhau về hiệu năng, và `char(n)` còn đệm khoảng trắng cho đủ `n` ký tự nên thường tốn chỗ nhất. Muốn giới hạn độ dài thì dùng `varchar(n)` hoặc `text` kèm `CHECK`.

Thời gian: `timestamptz` lưu một thời điểm tuyệt đối (bên trong là UTC) và hiển thị theo `TimeZone` của phiên. `timestamp` chỉ là "ngày giờ trên lịch", không biết múi giờ, nên phần `+00` trong chuỗi nhập bị bỏ. Sự kiện thật (đăng nhập, thanh toán) dùng `timestamptz`; ngày thuần như ngày sinh dùng `date`. Ngoài ra còn `boolean`, `uuid`, `jsonb` và mảng; các bài sau dùng tới.

## Cú pháp

```sql
CREATE TABLE table_name (
  column_name data_type [ NOT NULL ] [ DEFAULT expr ]
  [, ...]
);
-- data_type: integer | bigint | numeric(p, s) | double precision
--          | text | varchar(n) | timestamptz | date | boolean
SELECT value::data_type;
```

- `numeric(p, s)`: `p` chữ số tổng, `s` chữ số sau dấu phẩy; dư thì làm tròn, thiếu chỗ cho phần nguyên thì báo lỗi.
- `varchar(n)`: tối đa `n` ký tự; bỏ `(n)` thì giống `text`.
- `::`: ép kiểu một giá trị, ví dụ `'2026-03-01'::date`.

## Ví dụ

Bảng `pay`, `logins` và `names` của lab dùng kiểu sai cố ý để so sánh. Trước hết, cộng 0,1 với 0,2 bằng hai kiểu số:

```sql
SELECT 0.1::float8 + 0.2::float8 = 0.3 AS float_equal,
       0.1::numeric + 0.2::numeric = 0.3 AS numeric_equal;
```

`float_equal` là false, `numeric_equal` là true: `float8` (tên ngắn của `double precision`) chỉ lưu gần đúng 0,1 và 0,2.

```sql
SELECT 12.345::numeric(5,2) AS rounded,
       pg_column_size(1::int) AS int_bytes,
       pg_column_size(1::bigint) AS bigint_bytes;
```

`rounded` là 12.35 vì `numeric(5,2)` giữ hai chữ số lẻ; `integer` chiếm 4 byte, `bigint` 8 byte.

```sql
SET TimeZone = 'Asia/Ho_Chi_Minh';
SELECT (timestamptz '2026-03-01 09:00+00')::text AS shown_local,
       (timestamp '2026-03-01 09:00+00')::text AS no_zone;
```

Cùng một chuỗi: `timestamptz` hiện `2026-03-01 16:00:00+07` (đã đổi sang giờ phiên), còn `timestamp` bỏ phần `+00` và giữ `09:00`.

```sql
SELECT 'ab'::char(5) = 'ab   ' AS same,
       length('ab'::char(5)) AS chars,
       octet_length('ab'::char(5)) AS stored_bytes;
```

`same` là true và `chars` là 2 vì `char(n)` coi khoảng trắng đệm là không có nghĩa, nhưng `stored_bytes` là 5: khoảng trắng vẫn được lưu.

## Lỗi hay gặp

Bộ đếm `integer` chạm trần:

```sql
-- ERROR 22003: integer out of range
SELECT 2147483647 + 1;
```

Postgres không quay vòng về số âm mà báo lỗi. Cột nào có thể vượt 2,1 tỉ thì khai báo `bigint` từ đầu.

So tiền kiểu `float8` bằng `=`:

```sql
-- WRONG: float8 keeps only an approximation of 1.1
SELECT 1.1::float8 * 3 = 3.3 AS is_exact;
```

```sql
-- FIX: numeric keeps every decimal digit
SELECT 1.1::numeric * 3 = 3.3 AS is_exact;
```

Câu sai trả false vì `1.1::float8 * 3` thật ra là 3.3000000000000003. Cột tiền phải là `numeric`.

Lọc thời điểm trên cột `timestamp`:

```sql
-- WRONG: at_plain lost its zone, so it is read as 09:00 local time
SELECT count(*) AS before_5_utc FROM logins
WHERE at_plain < timestamptz '2026-03-01 05:00+00';
```

```sql
-- FIX: compare the timestamptz column
SELECT count(*) AS before_5_utc FROM logins
WHERE at_tz < timestamptz '2026-03-01 05:00+00';
```

Lần đăng nhập xảy ra lúc 09:00 UTC, sau mốc 05:00 UTC, nên đáp đúng là 0. Câu sai đếm ra 1 vì Postgres hiểu `09:00` của `at_plain` là giờ phiên (+07), tức 02:00 UTC.

Chuỗi dài hơn `varchar(n)`:

```sql
CREATE TABLE codes (id int PRIMARY KEY, code varchar(5));
-- ERROR 22001: value too long for type character varying(5)
INSERT INTO codes VALUES (1, 'VN-DAD-01');
```

Khi ghi vào cột, Postgres từ chối thay vì cắt bớt. Nếu giới hạn chỉ là đoán, dùng `text` và để `CHECK` giữ luật thật.

## Tóm tắt

- Tiền dùng `numeric(p, s)`; `double precision` chỉ cho số đo, vì nó lưu gần đúng.
- Khóa và bộ đếm có thể lớn dùng `bigint`; `integer` dừng ở khoảng 2,1 tỉ và báo lỗi khi tràn.
- `text`, `varchar(n)` và `char(n)` nhanh như nhau; `char(n)` đệm khoảng trắng nên tránh.
- Sự kiện thật dùng `timestamptz`; `timestamp` bỏ múi giờ và làm sai phép so sánh.

# EN

## Opening

You add ten amounts of 0.1 and the report shows 0.9999999999999999 instead of 1. No SQL statement is wrong: the bug lives in the column's type, chosen when the table was created. This lesson helps you pick the right type for money, instants and strings.

## Key idea

A column's type decides three things: which values it accepts, what arithmetic returns and how many bytes each value takes. Changing a type once a table is full of data is real work, so choose well from the start.

Integers: `integer` takes 4 bytes and only reaches 2,147,483,647 (about 2.1 billion); `bigint` takes 8 bytes and is enough for any key or counter. Going past the limit raises an error instead of wrapping around, so a long-lived log table should use `bigint`.

Numbers with a fraction: `numeric(p, s)` stores every decimal digit exactly, with `p` digits in total and `s` after the decimal point; a value with more fractional digits than `s` is rounded. `real` and `double precision` follow IEEE 754 and store numbers in binary, so most decimal values are only approximate. Many people think `double precision` is precise enough for money because it has 15 digits. In fact tiny errors add up over thousands of rows, and an `=` comparison can fail. Money uses `numeric`; measurements, coordinates and scores use `double precision`.

Strings: `text`, `varchar(n)` and `char(n)` share one storage format. Many people think `varchar(n)` or `char(n)` is faster than `text`. In fact the official docs say the three types perform the same, and `char(n)` also pads with blanks up to `n` characters, so it usually takes the most space. To cap a length use `varchar(n)` or `text` with a `CHECK`.

Time: `timestamptz` stores an absolute instant (UTC inside) and displays it in the session's `TimeZone`. `timestamp` is just "a date and time on a calendar" with no zone, so the `+00` in the input string is dropped. Real events (logins, payments) use `timestamptz`; plain days such as a birthday use `date`. There are also `boolean`, `uuid`, `jsonb` and arrays; later lessons use them.

## Syntax

```sql
CREATE TABLE table_name (
  column_name data_type [ NOT NULL ] [ DEFAULT expr ]
  [, ...]
);
-- data_type: integer | bigint | numeric(p, s) | double precision
--          | text | varchar(n) | timestamptz | date | boolean
SELECT value::data_type;
```

- `numeric(p, s)`: `p` digits in total, `s` after the point; extra fractional digits are rounded, too many integer digits raise an error.
- `varchar(n)`: at most `n` characters; without `(n)` it behaves like `text`.
- `::`: casts a value, for example `'2026-03-01'::date`.

## Example

The lab tables `pay`, `logins` and `names` use wrong types on purpose, for comparison. First, add 0.1 and 0.2 with two number types:

```sql
SELECT 0.1::float8 + 0.2::float8 = 0.3 AS float_equal,
       0.1::numeric + 0.2::numeric = 0.3 AS numeric_equal;
```

`float_equal` is false, `numeric_equal` is true: `float8` (the short name of `double precision`) only stores an approximation of 0.1 and 0.2.

```sql
SELECT 12.345::numeric(5,2) AS rounded,
       pg_column_size(1::int) AS int_bytes,
       pg_column_size(1::bigint) AS bigint_bytes;
```

`rounded` is 12.35 because `numeric(5,2)` keeps two fractional digits; `integer` takes 4 bytes, `bigint` 8.

```sql
SET TimeZone = 'Asia/Ho_Chi_Minh';
SELECT (timestamptz '2026-03-01 09:00+00')::text AS shown_local,
       (timestamp '2026-03-01 09:00+00')::text AS no_zone;
```

Same literal: `timestamptz` shows `2026-03-01 16:00:00+07` (converted to the session zone), while `timestamp` drops the `+00` and keeps `09:00`.

```sql
SELECT 'ab'::char(5) = 'ab   ' AS same,
       length('ab'::char(5)) AS chars,
       octet_length('ab'::char(5)) AS stored_bytes;
```

`same` is true and `chars` is 2 because `char(n)` treats padding blanks as meaningless, yet `stored_bytes` is 5: the blanks are still stored.

## Common mistakes

An `integer` counter hits its ceiling:

```sql
-- ERROR 22003: integer out of range
SELECT 2147483647 + 1;
```

Postgres does not wrap around to a negative number, it raises an error. Declare `bigint` from the start for any column that may pass 2.1 billion.

Comparing `float8` money with `=`:

```sql
-- WRONG: float8 keeps only an approximation of 1.1
SELECT 1.1::float8 * 3 = 3.3 AS is_exact;
```

```sql
-- FIX: numeric keeps every decimal digit
SELECT 1.1::numeric * 3 = 3.3 AS is_exact;
```

The wrong version returns false because `1.1::float8 * 3` is really 3.3000000000000003. Money columns must be `numeric`.

Filtering instants on a `timestamp` column:

```sql
-- WRONG: at_plain lost its zone, so it is read as 09:00 local time
SELECT count(*) AS before_5_utc FROM logins
WHERE at_plain < timestamptz '2026-03-01 05:00+00';
```

```sql
-- FIX: compare the timestamptz column
SELECT count(*) AS before_5_utc FROM logins
WHERE at_tz < timestamptz '2026-03-01 05:00+00';
```

The login happened at 09:00 UTC, after the 05:00 UTC mark, so the right answer is 0. The wrong version counts 1 because Postgres reads the `09:00` of `at_plain` as session time (+07), which is 02:00 UTC.

A string longer than `varchar(n)`:

```sql
CREATE TABLE codes (id int PRIMARY KEY, code varchar(5));
-- ERROR 22001: value too long for type character varying(5)
INSERT INTO codes VALUES (1, 'VN-DAD-01');
```

When writing into a column, Postgres refuses instead of cutting the value. If the limit is only a guess, use `text` and let a `CHECK` hold the real rule.

## Recap

- Money uses `numeric(p, s)`; `double precision` is for measurements only, because it stores approximations.
- Keys and counters that may grow use `bigint`; `integer` stops at about 2.1 billion and raises an error on overflow.
- `text`, `varchar(n)` and `char(n)` are equally fast; `char(n)` pads with blanks, so avoid it.
- Real events use `timestamptz`; `timestamp` drops the zone and breaks comparisons.
