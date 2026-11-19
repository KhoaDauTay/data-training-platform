---
id: e-pg-l1-01
engine: postgres
level: L1
module: types
title: Chọn kiểu dữ liệu
title_en: Choosing data types
kind: concept
runtime: docs
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
      vi: "`numeric` lưu chính xác từng chữ số, nên tổng tiền không lệch. `double precision` có sai số nhị phân; `text` không cộng trừ được."
      en: "`numeric` stores every digit exactly, so totals never drift. `double precision` has binary rounding error; `text` cannot be added up."
  - q:
      vi: Một lần đăng nhập xảy ra lúc 09:00 giờ UTC. Kiểu nào giữ đúng thời điểm đó cho người xem ở mọi múi giờ?
      en: A login happens at 09:00 UTC. Which type keeps that exact instant for viewers in every time zone?
    options:
      - { vi: "`timestamp` (không múi giờ)", en: "`timestamp` (without time zone)" }
      - { vi: "`timestamptz`", en: "`timestamptz`" }
      - { vi: "`date`", en: "`date`" }
    answer: 1
    why:
      vi: "`timestamptz` lưu một thời điểm tuyệt đối và đổi sang múi giờ của phiên khi hiển thị. `timestamp` bỏ phần múi giờ, nên hai người ở hai nơi hiểu khác nhau."
      en: "`timestamptz` stores an absolute instant and converts it to the session zone for display. `timestamp` drops the zone, so two people in two places read it differently."
  - q:
      vi: Bạn muốn tên khách tối đa 100 ký tự. Cách nào đúng với Postgres?
      en: You want customer names to be at most 100 characters. Which is right for Postgres?
    options:
      - { vi: "`char(100)` vì nhanh hơn", en: "`char(100)` because it is faster" }
      - { vi: "`varchar(100)`, hoặc `text` kèm một `CHECK`", en: "`varchar(100)`, or `text` with a `CHECK`" }
      - { vi: Không giới hạn được, en: It cannot be limited }
    answer: 1
    why:
      vi: "Ba kiểu chuỗi không khác nhau về hiệu năng; `char(n)` còn đệm khoảng trắng và thường chậm nhất. Giới hạn độ dài bằng `varchar(n)` hoặc `CHECK`."
      en: "The three string types perform the same; `char(n)` also pads with blanks and is usually the slowest. Cap the length with `varchar(n)` or a `CHECK`."
---
## Ý chính

Kiểu của cột quyết định giá trị nào được nhận, phép tính cho ra gì và tốn bao nhiêu chỗ. Bốn lựa chọn hay gặp nhất:

- Số nguyên: `integer` (4 byte, tới khoảng 2,1 tỉ) và `bigint` (8 byte). Khóa của bảng có thể lớn thì dùng `bigint`.
- Số thực: `numeric(p, s)` lưu chính xác từng chữ số, hợp với tiền. `real` và `double precision` theo chuẩn IEEE 754, không chính xác: `0.1 + 0.2` không đúng bằng `0.3`. Dùng chúng cho số đo, tọa độ, nơi sai số nhỏ chấp nhận được.
- Chuỗi: `text`, `varchar(n)` và `char(n)`. Tài liệu Postgres nói rõ ba kiểu này không khác nhau về hiệu năng; `char(n)` còn thường chậm nhất vì phải đệm khoảng trắng. Muốn giới hạn độ dài thì dùng `varchar(n)` hoặc một ràng buộc `CHECK`.
- Thời gian: `timestamptz` (có múi giờ) lưu một thời điểm tuyệt đối và hiển thị theo `TimeZone` của phiên. `timestamp` (không múi giờ) chỉ là "ngày giờ trên lịch", bỏ qua múi giờ. Sự kiện thật (đặt hàng, đăng nhập) nên là `timestamptz`; ngày thuần dùng `date`.

Ngoài ra có `boolean`, `uuid`, `jsonb`, mảng và nhiều kiểu khác; các bài sau dùng tới.

## Ví dụ

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

Trả lời ba câu hỏi bên dưới. Trước đó, thử tự nghĩ: bảng hóa đơn cần cột "số tiền", "thời điểm thanh toán", "ghi chú" và "đã hoàn tiền chưa". Bạn chọn kiểu gì cho từng cột? (Gợi ý: `numeric(12,2)`, `timestamptz`, `text`, `boolean`.)

# EN

## Key idea

A column's type decides which values it accepts, what arithmetic returns and how much space it uses. The four choices you meet most:

- Integers: `integer` (4 bytes, up to about 2.1 billion) and `bigint` (8 bytes). Use `bigint` for keys that may grow large.
- Fractions: `numeric(p, s)` stores every digit exactly, which suits money. `real` and `double precision` follow IEEE 754 and are inexact: `0.1 + 0.2` is not exactly `0.3`. Use them for measurements and coordinates, where a tiny error is fine.
- Strings: `text`, `varchar(n)` and `char(n)`. The Postgres docs state there is no performance difference between them; `char(n)` is usually the slowest because of its blank padding. To cap a length, use `varchar(n)` or a `CHECK` constraint.
- Time: `timestamptz` (with time zone) stores an absolute instant and displays it in the session's `TimeZone`. `timestamp` (without time zone) is just "a date and time on a calendar" and ignores zones. Real events (an order, a login) should be `timestamptz`; plain days use `date`.

There are also `boolean`, `uuid`, `jsonb`, arrays and many more; later lessons use them.

## Example

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

Answer the three questions below. First, think it through: an invoice table needs "amount", "paid at", "note" and "refunded?". Which type fits each column? (Hint: `numeric(12,2)`, `timestamptz`, `text`, `boolean`.)
