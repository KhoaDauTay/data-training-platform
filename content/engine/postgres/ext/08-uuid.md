---
id: e-pg-ext-08
engine: postgres
level: EXT
module: ext-types
title: "UUID: uuid-ossp, gen_random_uuid và uuidv7"
title_en: "UUIDs: uuid-ossp, gen_random_uuid and uuidv7"
kind: lab
runtime: browser
minutes: 14
verified: { version: "PostgreSQL 18.x (PGlite 0.5.16)", date: "2026-11-26" }
figures:
  - { name: pg-ext-uuid-order, at: idea }
objectives:
  - vi: Tạo UUID bằng hàm lõi `gen_random_uuid()` (v4) và `uuidv7()`, không cần extension.
    en: Make UUIDs with the core functions `gen_random_uuid()` (v4) and `uuidv7()`, no extension needed.
  - vi: Giải thích vì sao khóa chính v7 nhẹ cho index hơn v4.
    en: Explain why a v7 primary key is lighter on the index than v4.
  - vi: Dùng `uuid_generate_v5` của uuid-ossp khi cần cùng một id cho cùng một tên trên mọi máy.
    en: Use uuid-ossp's `uuid_generate_v5` when the same name must give the same id on every machine.
sources:
  - { url: https://www.postgresql.org/docs/18/functions-uuid.html, title_vi: "Hàm UUID" }
  - { url: https://www.postgresql.org/docs/18/uuid-ossp.html, title_vi: "uuid-ossp" }
  - { url: https://www.postgresql.org/docs/18/datatype-uuid.html, title_vi: "Kiểu UUID" }
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE TABLE ports (
      code text PRIMARY KEY,
      name text NOT NULL
    );
    INSERT INTO ports VALUES
      ('VNDAD', 'Tien Sa'), ('VNSGN', 'Cat Lai'), ('VNHPH', 'Hai Phong');
    CREATE TABLE bookings (
      id uuid PRIMARY KEY DEFAULT uuidv7(),
      port text NOT NULL REFERENCES ports,
      booked_at timestamp NOT NULL
    );
  steps:
    - task:
        vi: "Gọi một lần `gen_random_uuid()` và một lần `uuidv7()`, rồi trả về số phiên bản của từng cái: hai cột `v_random`, `v_time`."
        en: "Call `gen_random_uuid()` once and `uuidv7()` once, and return the version number of each: two columns `v_random`, `v_time`."
      solution: SELECT uuid_extract_version(gen_random_uuid()) AS v_random, uuid_extract_version(uuidv7()) AS v_time
      check: rows
      hint:
        vi: "`uuid_extract_version(x)` trả số phiên bản của một UUID."
        en: "`uuid_extract_version(x)` returns a UUID's version number."
    - task:
        vi: "Thêm ba booking ở cảng `VNDAD` lúc `2026-10-30 08:00`, `09:00` và `10:00`, để cột `id` tự lấy giá trị mặc định."
        en: "Insert three bookings at port `VNDAD` at `2026-10-30 08:00`, `09:00` and `10:00`, letting column `id` take its default."
      solution: |-
        INSERT INTO bookings (port, booked_at) VALUES
          ('VNDAD', '2026-10-30 08:00'), ('VNDAD', '2026-10-30 09:00'), ('VNDAD', '2026-10-30 10:00')
      after: SELECT count(*) AS n, count(DISTINCT id) AS ids, bool_and(uuid_extract_version(id) = 7) AS all_v7 FROM bookings
      check: rows
      hint:
        vi: "Chỉ liệt kê `(port, booked_at)` trong `INSERT`; `id` có `DEFAULT uuidv7()`."
        en: "List only `(port, booked_at)` in the `INSERT`; `id` has `DEFAULT uuidv7()`."
    - task:
        vi: "Đọc lại các booking theo thứ tự `id`: cột `port`, `booked_at`. Với v7, thứ tự đó là thứ tự tạo."
        en: "Read the bookings back in `id` order: columns `port`, `booked_at`. With v7, that order is creation order."
      solution: SELECT port, booked_at FROM bookings ORDER BY id
      check: rows
      ordered: true
      hint:
        vi: "`ORDER BY id`; trong một phiên, `uuidv7()` luôn tăng."
        en: "`ORDER BY id`; within one session, `uuidv7()` always rises."
    - task:
        vi: "Mỗi cảng cần một UUID cố định, giống nhau trên mọi máy: dùng `uuid_generate_v5` với không gian tên URL và mã cảng. Trả về `code`, `port_uuid`, sắp theo `code`."
        en: "Each port needs a fixed UUID, the same on every machine: use `uuid_generate_v5` with the URL namespace and the port code. Return `code`, `port_uuid`, ordered by `code`."
      solution: SELECT code, uuid_generate_v5(uuid_ns_url(), code) AS port_uuid FROM ports ORDER BY code
      check: rows
      ordered: true
      hint:
        vi: "`uuid_generate_v5(uuid_ns_url(), code)`."
        en: "`uuid_generate_v5(uuid_ns_url(), code)`."
quiz:
  - q:
      vi: "Dự án mới trên PostgreSQL 18 cần khóa chính UUID. Có phải cài uuid-ossp không?"
      en: "A new project on PostgreSQL 18 needs UUID primary keys. Must you install uuid-ossp?"
    options:
      - { vi: "Có: Postgres lõi lưu được kiểu `uuid` nhưng không tạo ra giá trị", en: "Yes: core Postgres stores the `uuid` type but cannot generate values" }
      - { vi: "Không: `gen_random_uuid()` và `uuidv7()` là hàm lõi sẵn có", en: "No: `gen_random_uuid()` and `uuidv7()` are built-in core functions" }
      - { vi: "Có, nhưng chỉ để có `uuid_generate_v4()` vì v4 an toàn hơn", en: "Yes, but only for `uuid_generate_v4()`, because its v4 is safer" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì nhiều hướng dẫn cũ bắt đầu bằng `CREATE EXTENSION \"uuid-ossp\"`, nhưng `gen_random_uuid()` có trong lõi từ PostgreSQL 13 và `uuidv7()` từ 18. uuid-ossp chỉ còn cần cho v1, v3, v5, như id cố định theo tên."
      en: "It sounds right because many old guides start with `CREATE EXTENSION \"uuid-ossp\"`, but `gen_random_uuid()` has been core since PostgreSQL 13 and `uuidv7()` since 18. uuid-ossp is only still needed for v1, v3 and v5, such as fixed name-based ids."
  - q:
      vi: "Bảng booking nhận vài nghìn dòng mỗi phút, khóa chính là UUID. Vì sao v7 thường nhẹ cho index hơn v4?"
      en: "The bookings table takes a few thousand rows a minute with a UUID primary key. Why is v7 usually lighter on the index than v4?"
    options:
      - { vi: "v7 ngắn hơn v4 nên mỗi trang index chứa được nhiều khóa hơn", en: "v7 is shorter than v4, so each index page holds more keys" }
      - { vi: "v7 không cần index vì nó đã tự sắp theo thời gian tạo", en: "v7 needs no index, since it is already sorted by creation time" }
      - { vi: "v7 tăng theo thời gian nên dòng mới nối vào trang lá cuối", en: "v7 rises with time, so new rows append to the last leaf page" }
    answer: 2
    trap: 0
    why:
      vi: "Nghe hợp lý vì khóa ngắn thì index nhỏ, nhưng mọi UUID đều 16 byte. Khác biệt là thứ tự: v4 ngẫu nhiên chen vào khắp index, làm nhiều trang phải đọc, ghi và tách; v7 bắt đầu bằng thời điểm nên dòng mới đi vào cạnh phải của B-tree. Đổi lại, v7 để lộ thời điểm tạo."
      en: "It sounds right because shorter keys mean a smaller index, but every UUID is 16 bytes. The difference is order: random v4 keys squeeze in all over the index, so many pages are read, written and split; v7 starts with a timestamp, so new rows go to the right edge of the B-tree. In exchange, v7 reveals its creation time."
---
## Mở bài

Cargo Query tạo booking ở nhiều văn phòng, rồi gộp về một chỗ. Khóa số tự tăng sẽ trùng giữa các văn phòng, nên đội chọn UUID. Câu hỏi còn lại: loại UUID nào, và có cần extension không?

## Ý chính

UUID là số 128 bit, đủ lớn để mỗi máy tự tạo mà gần như không trùng. Postgres lõi có kiểu `uuid` và hai hàm tạo: `gen_random_uuid()` cho v4 (ngẫu nhiên, có từ bản 13) và `uuidv7()` cho v7 (có từ bản 18). v7 bắt đầu bằng thời điểm tạo tính theo mili giây, phần sau ngẫu nhiên; `uuid_extract_timestamp` đọc lại thời điểm đó, `uuid_extract_version` đọc phiên bản.

Nhiều người nghĩ muốn có UUID thì phải cài uuid-ossp. Thật ra từ bản 13 thì không. uuid-ossp vẫn có ích cho v1, v3 và v5. v5 băm một tên trong một không gian tên: cùng tên luôn cho cùng UUID, trên mọi máy. Đó là cách đặt id cố định cho cảng `VNDAD` mà không cần bảng tra.

Với khóa chính, thứ tự quan trọng. Khóa v4 ngẫu nhiên chen vào khắp các trang lá của index, nên mỗi lần ghi đụng một trang khác. Khóa v7 tăng theo thời gian, dòng mới luôn nối vào trang cuối, giống số tự tăng. Đổi lại, ai đọc được id v7 thì biết lúc nó được tạo.

## Cú pháp

```sql
SELECT gen_random_uuid();
SELECT uuidv7();
SELECT uuidv7(interval '-1 hour');
SELECT uuid_extract_version(u),
       uuid_extract_timestamp(u);
CREATE EXTENSION "uuid-ossp";
SELECT uuid_generate_v5(
  uuid_ns_url(), 'name');
```

- `gen_random_uuid()`: v4 ngẫu nhiên, lõi.
- `uuidv7([shift])`: v7 theo thời gian, lõi từ bản 18; `shift` dời thời điểm.
- `uuid_generate_v5(namespace, name)`: uuid-ossp; cùng tên, cùng id.

## Ví dụ

Phiên bản của hai hàm lõi:

```sql
SELECT
  uuid_extract_version(
    gen_random_uuid()) AS v_random,
  uuid_extract_version(
    uuidv7()) AS v_time;
```

Ra 4 và 7.

Id cố định cho từng cảng, tính lại bao nhiêu lần cũng vậy:

```sql
SELECT code,
  uuid_generate_v5(uuid_ns_url(),
                   code) AS port_uuid
FROM ports
ORDER BY code;
```

Ba UUID; `VNDAD` luôn là `4197ebcb-e3c7-5a49-8c7e-e919ae450149`.

Dòng thêm sau có id lớn hơn:

```sql
INSERT INTO bookings (port, booked_at)
VALUES ('VNSGN', '2026-10-31 07:00'),
       ('VNHPH', '2026-10-31 07:05');
SELECT port, booked_at
FROM bookings
ORDER BY id;
```

Thứ tự theo `id` trùng thứ tự thêm, vì `uuidv7()` tăng.

## Lỗi hay gặp

Gọi một hàm v7 không có trong uuid-ossp:

```sql
-- ERROR 42883:
SELECT uuid_generate_v7();
```

uuid-ossp chỉ có v1, v3, v4, v5. v7 là hàm lõi `uuidv7()`.

Tạo id ngẫu nhiên khi cần id cố định theo tên:

```sql
-- WRONG: a new id on every call
SELECT gen_random_uuid()
     = gen_random_uuid() AS same;
```

```sql
-- FIX: name-based v5 is repeatable
SELECT uuid_generate_v5(
         uuid_ns_url(), 'VNDAD')
     = uuid_generate_v5(
         uuid_ns_url(), 'VNDAD')
       AS same;
```

Câu sai ra `false`: hai máy sẽ cho cảng `VNDAD` hai id khác nhau. Câu đúng ra `true`.

Ghi chuỗi không phải UUID vào cột `uuid`:

```sql
-- ERROR 22P02:
SELECT 'VNDAD-001'::uuid;
```

Kiểu `uuid` chỉ nhận 32 chữ số hex (có hoặc không có gạch nối); mã đọc được như `VNDAD-001` để ở cột `text` riêng.

## Thực hành

Bốn bước: đọc phiên bản của hai hàm lõi, thêm booking để `id` tự lấy v7, đọc lại theo `id`, rồi tạo id cố định cho từng cảng bằng v5. Sau lab là hai câu hỏi.

## Tóm tắt

- `gen_random_uuid()` (v4) và `uuidv7()` là hàm lõi; không cần extension.
- v7 tăng theo thời gian nên nhẹ cho index khóa chính; đổi lại nó để lộ thời điểm tạo.
- uuid-ossp còn hữu ích cho v5: cùng tên, cùng id, trên mọi máy.
- `uuid_generate_v7` không tồn tại; dùng `uuidv7()`.

# EN

## Opening

Cargo Query creates bookings in several offices and merges them in one place. Auto-increment keys would clash between offices, so the team picks UUIDs. The question left: which kind of UUID, and is an extension needed?

## Key idea

A UUID is a 128-bit number, large enough for every machine to make its own with almost no chance of a clash. Core Postgres has the `uuid` type and two generators: `gen_random_uuid()` for v4 (random, since version 13) and `uuidv7()` for v7 (since version 18). A v7 starts with its creation time in milliseconds, the rest is random; `uuid_extract_timestamp` reads that time back, `uuid_extract_version` reads the version.

Many people think you must install uuid-ossp to get UUIDs. In fact not since version 13. uuid-ossp is still useful for v1, v3 and v5. A v5 hashes a name within a namespace: the same name always gives the same UUID, on every machine. That is how to give port `VNDAD` a fixed id with no lookup table.

For a primary key, order matters. Random v4 keys squeeze in all over the index's leaf pages, so each write touches a different page. v7 keys rise with time, so new rows always append to the last page, like an auto-increment number. In exchange, anyone who can read a v7 id knows when it was created.

## Syntax

```sql
SELECT gen_random_uuid();
SELECT uuidv7();
SELECT uuidv7(interval '-1 hour');
SELECT uuid_extract_version(u),
       uuid_extract_timestamp(u);
CREATE EXTENSION "uuid-ossp";
SELECT uuid_generate_v5(
  uuid_ns_url(), 'name');
```

- `gen_random_uuid()`: random v4, core.
- `uuidv7([shift])`: time-ordered v7, core since 18; `shift` moves the timestamp.
- `uuid_generate_v5(namespace, name)`: uuid-ossp; same name, same id.

## Example

The versions of the two core functions:

```sql
SELECT
  uuid_extract_version(
    gen_random_uuid()) AS v_random,
  uuid_extract_version(
    uuidv7()) AS v_time;
```

It gives 4 and 7.

A fixed id per port, the same however many times it is computed:

```sql
SELECT code,
  uuid_generate_v5(uuid_ns_url(),
                   code) AS port_uuid
FROM ports
ORDER BY code;
```

Three UUIDs; `VNDAD` is always `4197ebcb-e3c7-5a49-8c7e-e919ae450149`.

A row added later has a larger id:

```sql
INSERT INTO bookings (port, booked_at)
VALUES ('VNSGN', '2026-10-31 07:00'),
       ('VNHPH', '2026-10-31 07:05');
SELECT port, booked_at
FROM bookings
ORDER BY id;
```

The order by `id` matches the insert order, because `uuidv7()` rises.

## Common mistakes

Calling a v7 function that uuid-ossp does not have:

```sql
-- ERROR 42883:
SELECT uuid_generate_v7();
```

uuid-ossp has only v1, v3, v4 and v5. v7 is the core function `uuidv7()`.

Making a random id where a fixed, name-based one is needed:

```sql
-- WRONG: a new id on every call
SELECT gen_random_uuid()
     = gen_random_uuid() AS same;
```

```sql
-- FIX: name-based v5 is repeatable
SELECT uuid_generate_v5(
         uuid_ns_url(), 'VNDAD')
     = uuid_generate_v5(
         uuid_ns_url(), 'VNDAD')
       AS same;
```

The wrong query gives `false`: two machines would give port `VNDAD` two different ids. The right one gives `true`.

Writing a string that is not a UUID into a `uuid` column:

```sql
-- ERROR 22P02:
SELECT 'VNDAD-001'::uuid;
```

The `uuid` type takes only 32 hex digits (with or without hyphens); keep readable codes such as `VNDAD-001` in a separate `text` column.

## Practice

Four steps: read the versions of the two core functions, insert bookings so `id` takes a v7 by itself, read them back by `id`, then make a fixed id per port with v5. Two questions follow the lab.

## Recap

- `gen_random_uuid()` (v4) and `uuidv7()` are core functions; no extension needed.
- v7 rises with time, so it is light on a primary key index; in exchange it reveals its creation time.
- uuid-ossp is still useful for v5: same name, same id, on every machine.
- `uuid_generate_v7` does not exist; use `uuidv7()`.
