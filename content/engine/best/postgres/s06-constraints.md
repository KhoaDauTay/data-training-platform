---
id: e-bp-s06
engine: best
track: postgres
level: L1
module: s
title: "Để database giữ luật: PK, FK, NOT NULL, UNIQUE, CHECK"
title_en: "Let constraints enforce the rules"
kind: quiz
minutes: 4
objectives:
  - vi: "Khai luật của dữ liệu thành ràng buộc: khóa chính, khóa ngoại, `NOT NULL`, `CHECK` và `UNIQUE`."
    en: "Declare the data's rules as constraints: primary key, foreign key, `NOT NULL`, `CHECK` and `UNIQUE`."
avoid:
  vi: "Dòng thiếu đơn, số lượng âm, dòng trùng lọt vào bảng và làm sai mọi tổng về sau."
  en: "Lines with no order, negative quantities and duplicates that get into the table and skew every total after."
requires: [e-pg-l1-04]
skills: []
adv: [c1]
sources:
  - https://www.postgresql.org/docs/18/ddl-constraints.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: engine
  check: diff
  setup: |
    CREATE TABLE orders (id int PRIMARY KEY);
    INSERT INTO orders VALUES (1), (2);
    CREATE TABLE lines_loose (order_id int, line_no int, qty int, unit_price_vnd int);
    CREATE TABLE lines_strict (
      order_id int NOT NULL REFERENCES orders (id),
      line_no int NOT NULL,
      qty int NOT NULL CHECK (qty > 0),
      unit_price_vnd int NOT NULL CHECK (unit_price_vnd >= 0),
      PRIMARY KEY (order_id, line_no)
    );
    DO $$
    DECLARE r record;
    BEGIN
      FOR r IN SELECT * FROM (VALUES (1, 1, 2, 50000), (1, 2, -3, 50000), (NULL, 1, 1, 20000), (2, 1, 1, 30000), (2, 1, 1, 30000), (9, 1, 1, 10000)) AS v (order_id, line_no, qty, unit_price_vnd) LOOP
        INSERT INTO lines_loose VALUES (r.order_id, r.line_no, r.qty, r.unit_price_vnd);
        BEGIN
          INSERT INTO lines_strict VALUES (r.order_id, r.line_no, r.qty, r.unit_price_vnd);
        EXCEPTION WHEN integrity_constraint_violation THEN NULL;
        END;
      END LOOP;
    END $$;
  bad: |
    SELECT count(*) AS lines, sum(qty * unit_price_vnd) AS total_vnd
    FROM lines_loose
  good: |
    SELECT count(*) AS lines, sum(qty * unit_price_vnd) AS total_vnd
    FROM lines_strict
  expect: null
quiz:
  - q:
      vi: "Bảng có `qty int NOT NULL CHECK (qty > 0)`. Một script nhập dòng có `qty` = -3. Chuyện gì xảy ra?"
      en: "A table has `qty int NOT NULL CHECK (qty > 0)`. A script inserts a line with `qty` = -3. What happens?"
    options:
      - { vi: "Dòng được ghi, ứng dụng sẽ kiểm sau", en: "The row is written; the application will check it afterwards" }
      - { vi: "Lệnh ghi bị từ chối với lỗi `23514`", en: "The insert is refused with error `23514`" }
      - { vi: "Postgres tự đổi -3 thành 3", en: "Postgres turns -3 into 3" }
    answer: 1
    why:
      vi: "-3 không thỏa `CHECK (qty > 0)`, nên lệnh ghi bị từ chối với lỗi `23514`. Ràng buộc chạy ở mọi lần ghi, dù lệnh đến từ ứng dụng hay script, nên không có chuyện ghi trước rồi kiểm sau. Postgres cũng không bao giờ tự sửa giá trị: nó chỉ nhận hoặc từ chối."
      en: "-3 fails `CHECK (qty > 0)`, so the insert is refused with error `23514`. A constraint runs on every write, from the application or a script, so nothing is written first and checked later. Postgres never fixes a value either: it only accepts or refuses."
---

## Ý chính

Mọi bảng có khóa chính (primary key). Quan hệ có khóa ngoại (foreign key). Cột bắt buộc `NOT NULL`, luật giá trị bằng `CHECK`, khóa tự nhiên bằng `UNIQUE`.

## Vì sao

- Kiểm ở ứng dụng bị vượt qua bởi script, job nhập dữ liệu, hay một ứng dụng thứ hai.
- Ràng buộc chặn dữ liệu sai ngay lúc ghi, ở mọi đường vào.
- Một dòng âm hay trùng lọt vào thì mọi tổng về sau đều sai, và rất khó tìm lại.

## Ví dụ

Setup ghi cùng 6 dòng vào hai bảng: có dòng số lượng âm, dòng thiếu đơn, dòng trùng, dòng trỏ tới đơn không có. Mỗi dòng được ghi riêng; dòng nào bị từ chối thì script bỏ qua và ghi tiếp.

# EN

## Key idea

Every table has a primary key. Relationships have foreign keys. Required columns are `NOT NULL`, value rules are `CHECK`, natural keys are `UNIQUE`.

## Why

- Checks in the application are bypassed by scripts, import jobs or a second application.
- Constraints stop bad data at write time, on every path in.
- Once a negative or duplicate line gets in, every total after it is wrong, and it is hard to trace back.

## Example

The setup writes the same 6 lines into two tables: a negative quantity, a missing order, a duplicate, a line pointing to an order that does not exist. Each line is written on its own; when a line is refused, the script skips it and goes on.
