---
id: e-bp-s04
engine: best
track: postgres
level: L1
module: s
title: "Id tự sinh: IDENTITY, không serial"
title_en: "Identity columns, not serial"
kind: quiz
minutes: 3
objectives:
  - vi: "Khai khóa thay thế dạng số bằng `bigint GENERATED ALWAYS AS IDENTITY` thay vì `serial`."
    en: "Declare numeric surrogate keys as `bigint GENERATED ALWAYS AS IDENTITY` instead of `serial`."
avoid:
  vi: "Ứng dụng bỗng báo trùng khóa chính vì một script đã chèn id bằng tay, làm sequence tụt lại phía sau."
  en: "The application suddenly hits duplicate primary keys because a script inserted ids by hand and left the sequence behind."
requires: [e-pg-l1-03]
skills: []
adv: []
sources:
  - https://www.postgresql.org/docs/18/sql-createtable.html
  - https://wiki.postgresql.org/wiki/Don%27t_Do_This#Don.27t_use_serial
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: engine
  check: error
  setup: |
    CREATE TABLE ticket_serial (id serial PRIMARY KEY, title text NOT NULL);
    CREATE TABLE ticket_identity (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, title text NOT NULL);
    INSERT INTO ticket_serial (id, title) VALUES (1, 'copied 1'), (2, 'copied 2'), (3, 'copied 3');
    INSERT INTO ticket_identity (title) VALUES ('copied 1'), ('copied 2'), ('copied 3');
  bad: |
    INSERT INTO ticket_serial (title) VALUES ('new from the app') RETURNING id
  good: |
    INSERT INTO ticket_identity (title) VALUES ('new from the app') RETURNING id
  expect: { code: "23505" }
quiz:
  - q:
      vi: "Cột `id bigint GENERATED ALWAYS AS IDENTITY`. Một script chạy `INSERT INTO ticket_identity (id, title) VALUES (4, 'typed by hand')`. Chuyện gì xảy ra?"
      en: "Column `id bigint GENERATED ALWAYS AS IDENTITY`. A script runs `INSERT INTO ticket_identity (id, title) VALUES (4, 'typed by hand')`. What happens?"
    options:
      - { vi: "Dòng được ghi với id 4", en: "The row is written with id 4" }
      - { vi: "Bị từ chối với lỗi `428C9`, nên sequence không bao giờ bị vượt mặt", en: "It is refused with error `428C9`, so the sequence can never be overtaken" }
      - { vi: "Id 4 bị bỏ qua, Postgres tự chọn id khác", en: "The 4 is ignored and Postgres picks another id" }
    answer: 1
    why:
      vi: "`ALWAYS` chỉ cho database đặt id. Muốn chèn tay phải viết rõ `OVERRIDING SYSTEM VALUE`. Với `serial`, id tay được nhận, sequence vẫn ở 1, và lần chèn bình thường kế tiếp va vào id đã có."
      en: "`ALWAYS` lets only the database set the id. Inserting one by hand needs an explicit `OVERRIDING SYSTEM VALUE`. With `serial`, the hand-typed id is accepted, the sequence stays at 1, and the next normal insert collides with an existing id."
---

## Ý chính

Khóa thay thế dạng số dùng `bigint GENERATED ALWAYS AS IDENTITY`. Không dùng `serial`/`bigserial` trong schema mới. Chọn `bigint` cho bảng có thể lớn.

## Vì sao

- `serial` nhận id chèn tay mà không cập nhật sequence. Lần chèn bình thường sau đó va vào id đã có và báo `23505`.
- `ALWAYS` từ chối id chèn tay với lỗi `428C9`, trừ khi viết rõ `OVERRIDING SYSTEM VALUE`.
- `IDENTITY` là cú pháp chuẩn SQL, gắn với cột; `serial` là một sequence rời có quyền và phụ thuộc riêng.
- Hết số `int` (khoảng 2,1 tỷ) là lỗi production rất khó sửa.

# EN

## Key idea

Numeric surrogate keys use `bigint GENERATED ALWAYS AS IDENTITY`. Do not use `serial`/`bigserial` in new schemas. Choose `bigint` for tables that can grow large.

## Why

- `serial` accepts hand-typed ids without moving the sequence. The next normal insert collides with an existing id and fails with `23505`.
- `ALWAYS` refuses hand-typed ids with error `428C9`, unless you write `OVERRIDING SYSTEM VALUE` explicitly.
- `IDENTITY` is standard SQL and belongs to the column; `serial` is a separate sequence with its own privileges and dependencies.
- Running out of `int` (about 2.1 billion) is a production failure that is very hard to fix.
