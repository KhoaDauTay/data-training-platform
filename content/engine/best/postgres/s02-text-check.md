---
id: e-bp-s02
engine: best
track: postgres
level: L1
module: s
title: "text kèm CHECK, không char(n)"
title_en: "text with a CHECK, not char(n)"
kind: quiz
minutes: 3
objectives:
  - vi: "Lưu chuỗi bằng `text` và ràng buộc độ dài hay định dạng bằng `CHECK`, không dùng `char(n)`."
    en: "Store strings as `text` and constrain length or format with `CHECK`, not with `char(n)`."
avoid:
  vi: "Mã sai độ dài lọt vào bảng mà không báo gì, vì `char(n)` âm thầm đệm khoảng trắng."
  en: "Codes of the wrong length that get in with no error, because `char(n)` silently pads them with spaces."
requires: [e-pg-l1-01]
skills: []
adv: []
sources:
  - https://www.postgresql.org/docs/18/datatype-character.html
  - https://wiki.postgresql.org/wiki/Don%27t_Do_This#Text_storage
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: engine
  check: diff
  setup: |
    CREATE TABLE port_char (code char(3) PRIMARY KEY);
    CREATE TABLE port_text (code text PRIMARY KEY CHECK (code ~ '^[A-Z]{3}$'));
    DO $$
    DECLARE c text;
    BEGIN
      FOREACH c IN ARRAY ARRAY['SGN', 'HAN', 'VN', 'DAD'] LOOP
        INSERT INTO port_char VALUES (c);
        BEGIN
          INSERT INTO port_text VALUES (c);
        EXCEPTION WHEN check_violation THEN NULL;
        END;
      END LOOP;
    END $$;
  bad: |
    SELECT count(*) AS invalid_codes
    FROM port_char
    WHERE code !~ '^[A-Z]{3}$'
  good: |
    SELECT count(*) AS invalid_codes
    FROM port_text
    WHERE code !~ '^[A-Z]{3}$'
  expect: null
quiz:
  - q:
      vi: "Cột `code char(3)`. Chèn `'VN'` (2 ký tự). Chuyện gì xảy ra?"
      en: "Column `code char(3)`. You insert `'VN'` (2 characters). What happens?"
    options:
      - { vi: "Bị từ chối vì thiếu một ký tự", en: "It is refused for being one character short" }
      - { vi: "Được nhận và đệm thành `'VN '`, không báo gì", en: "It is accepted and padded to `'VN '`, with no error" }
      - { vi: "Được nhận và lưu `'VN'` y như gõ", en: "It is accepted and stored as `'VN'` exactly" }
    answer: 1
    why:
      vi: "`char(n)` đệm khoảng trắng tới đủ n ký tự, nên mã thiếu chữ vẫn vào được. `text` kèm `CHECK (code ~ '^[A-Z]{3}$')` từ chối nó với lỗi `23514`."
      en: "`char(n)` pads with spaces up to n characters, so a short code still gets in. `text` with `CHECK (code ~ '^[A-Z]{3}$')` refuses it with error `23514`."
---

## Ý chính

Lưu chuỗi bằng `text`. Luật độ dài hay định dạng viết bằng `CHECK`. Không dùng `char(n)`, và không đặt `varchar(255)` theo thói quen.

## Vì sao

- `char(n)` âm thầm đệm khoảng trắng: mã 2 ký tự vào cột `char(3)` không báo lỗi.
- Nó cũng không nhanh hơn `text`; docs chính thức nói kiểu này thường chậm nhất trong ba kiểu chuỗi.
- `CHECK` nói đúng luật nghiệp vụ (ba chữ hoa), không chỉ một độ dài tối đa.

# EN

## Key idea

Store strings as `text`. Write length or format rules as a `CHECK`. Do not use `char(n)`, and do not reach for `varchar(255)` out of habit.

## Why

- `char(n)` silently pads with spaces: a 2-character code goes into a `char(3)` column with no error.
- It is not faster than `text` either; the official docs say it is usually the slowest of the three string types.
- A `CHECK` states the real business rule (three capital letters), not just a maximum length.

