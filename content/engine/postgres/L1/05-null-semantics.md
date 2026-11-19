---
id: e-pg-l1-05
engine: postgres
level: L1
module: constraints
title: NULL không phải là một giá trị
title_en: NULL is not a value
kind: quiz
minutes: 8
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
objectives:
  - vi: Đoán đúng kết quả của so sánh, đếm và `NOT IN` khi có NULL, để không viết câu lọc âm thầm bỏ sót dòng.
    en: Predict comparisons, counts and `NOT IN` when NULLs are present, so your filters never silently drop rows.
  - vi: Dùng `IS NULL`, `IS DISTINCT FROM` và `coalesce` đúng chỗ.
    en: Use `IS NULL`, `IS DISTINCT FROM` and `coalesce` in the right places.
requires: [e-pg-l1-04]
sources:
  - https://www.postgresql.org/docs/18/functions-comparison.html
  - https://www.postgresql.org/docs/18/functions-aggregate.html
  - https://www.postgresql.org/docs/18/functions-subquery.html
  - https://www.postgresql.org/docs/18/ddl-constraints.html
quiz:
  - q:
      vi: "`SELECT NULL = NULL` trả về gì?"
      en: "What does `SELECT NULL = NULL` return?"
    options:
      - { vi: "true", en: "true" }
      - { vi: "false", en: "false" }
      - { vi: "NULL (không biết)", en: "NULL (unknown)" }
      - { vi: "Báo lỗi", en: "An error" }
    answer: 2
    why:
      vi: So sánh thường với NULL luôn cho NULL, vì NULL nghĩa là "không biết". Muốn hỏi "có phải NULL không" thì dùng `IS NULL`.
      en: An ordinary comparison with NULL always yields NULL, because NULL means "unknown". To ask "is it NULL?" use `IS NULL`.
  - q:
      vi: "Cột `v` có ba dòng: 1, NULL, 3. `SELECT count(*), count(v)` cho ra gì?"
      en: "Column `v` has three rows: 1, NULL, 3. What does `SELECT count(*), count(v)` return?"
    options:
      - { vi: "3 và 3", en: "3 and 3" }
      - { vi: "3 và 2", en: "3 and 2" }
      - { vi: "2 và 2", en: "2 and 2" }
    answer: 1
    why:
      vi: "`count(*)` đếm dòng; `count(v)` chỉ đếm dòng có `v` khác NULL. `sum` và `avg` cũng bỏ qua NULL."
      en: "`count(*)` counts rows; `count(v)` counts only rows where `v` is not NULL. `sum` and `avg` also skip NULLs."
  - q:
      vi: "Bảng có `x` = 2 và 3. `SELECT x FROM t WHERE x NOT IN (1, NULL)` trả về bao nhiêu dòng?"
      en: "A table holds `x` = 2 and 3. How many rows does `SELECT x FROM t WHERE x NOT IN (1, NULL)` return?"
    options:
      - { vi: "2 dòng", en: "2 rows" }
      - { vi: "1 dòng", en: "1 row" }
      - { vi: "0 dòng", en: "0 rows" }
    answer: 2
    why:
      vi: "`2 NOT IN (1, NULL)` nghĩa là `2 <> 1 AND 2 <> NULL`, tức true AND NULL = NULL. WHERE chỉ giữ dòng true, nên không còn dòng nào. Đây là bẫy kinh điển khi danh sách là một subquery có NULL; `NOT EXISTS` không có bẫy này."
      en: "`2 NOT IN (1, NULL)` means `2 <> 1 AND 2 <> NULL`, that is true AND NULL = NULL. WHERE keeps only true rows, so nothing is left. This is the classic trap when the list is a subquery containing NULL; `NOT EXISTS` does not have it."
  - q:
      vi: "Muốn tìm dòng mà `a` và `b` khác nhau, coi NULL như một giá trị bình thường (NULL với 5 là khác, NULL với NULL là giống). Viết thế nào?"
      en: "You want rows where `a` and `b` differ, treating NULL as an ordinary value (NULL vs 5 differ, NULL vs NULL are the same). What do you write?"
    options:
      - { vi: "`a <> b`", en: "`a <> b`" }
      - { vi: "`a IS DISTINCT FROM b`", en: "`a IS DISTINCT FROM b`" }
      - { vi: "`NOT (a = b)`", en: "`NOT (a = b)`" }
    answer: 1
    why:
      vi: "`IS DISTINCT FROM` không bao giờ trả NULL: NULL với 5 là true, NULL với NULL là false. `<>` và `NOT (a = b)` cho NULL khi một bên là NULL, nên dòng bị bỏ."
      en: "`IS DISTINCT FROM` never returns NULL: NULL vs 5 is true, NULL vs NULL is false. `<>` and `NOT (a = b)` return NULL when either side is NULL, so the row is dropped."
  - q:
      vi: "Một ràng buộc `CHECK (qty > 0)` gặp dòng có `qty` là NULL. Chuyện gì xảy ra?"
      en: "A `CHECK (qty > 0)` constraint meets a row whose `qty` is NULL. What happens?"
    options:
      - { vi: "Dòng bị từ chối", en: "The row is rejected" }
      - { vi: "Dòng được nhận, vì điều kiện cho NULL chứ không phải false", en: "The row is accepted, because the condition is NULL, not false" }
      - { vi: "NULL được đổi thành 0", en: "NULL is turned into 0" }
    answer: 1
    why:
      vi: "`CHECK` chỉ từ chối khi điều kiện là false. Muốn cấm NULL thì thêm `NOT NULL`."
      en: "`CHECK` only rejects a row when the condition is false. To forbid NULL, add `NOT NULL`."
---
## Ý chính

NULL nghĩa là "không biết" hoặc "không có". Nó không bằng, không khác, không lớn hơn bất cứ thứ gì, kể cả chính nó: mọi phép so sánh thường với NULL cho ra NULL. Logic SQL vì thế có ba giá trị: true, false, NULL.

- `WHERE` chỉ giữ dòng có điều kiện là true; NULL bị bỏ như false.
- Kiểm tra NULL bằng `IS NULL` / `IS NOT NULL`, không bằng `= NULL`.
- `IS DISTINCT FROM` so sánh mà coi NULL là một giá trị.
- Hàm gộp (`count(v)`, `sum`, `avg`) bỏ qua NULL; `count(*)` thì không.
- `coalesce(v, 0)` thay NULL bằng giá trị bạn chọn.

## Ví dụ

```sql
CREATE TABLE t (x int);
INSERT INTO t VALUES (2), (3), (NULL);
SELECT count(*) AS all_rows, count(x) AS with_x,
       (SELECT count(*) FROM t WHERE x NOT IN (1, NULL)) AS not_in_rows,
       (SELECT count(*) FROM t WHERE x IS DISTINCT FROM 2) AS distinct_rows,
       sum(coalesce(x, 0)) AS total
FROM t;
```

Kết quả: `all_rows` 3, `with_x` 2, `not_in_rows` 0, `distinct_rows` 2, `total` 5.

## Thực hành

Trả lời năm câu hỏi. Chạy thử ví dụ trên nếu muốn kiểm.

# EN

## Key idea

NULL means "unknown" or "missing". It is not equal to, different from or greater than anything, itself included: every ordinary comparison with NULL yields NULL. SQL logic therefore has three values: true, false, NULL.

- `WHERE` keeps only rows whose condition is true; NULL is dropped like false.
- Test for NULL with `IS NULL` / `IS NOT NULL`, never with `= NULL`.
- `IS DISTINCT FROM` compares while treating NULL as a value.
- Aggregates (`count(v)`, `sum`, `avg`) skip NULLs; `count(*)` does not.
- `coalesce(v, 0)` replaces NULL with a value you choose.

## Example

```sql
CREATE TABLE t (x int);
INSERT INTO t VALUES (2), (3), (NULL);
SELECT count(*) AS all_rows, count(x) AS with_x,
       (SELECT count(*) FROM t WHERE x NOT IN (1, NULL)) AS not_in_rows,
       (SELECT count(*) FROM t WHERE x IS DISTINCT FROM 2) AS distinct_rows,
       sum(coalesce(x, 0)) AS total
FROM t;
```

Result: `all_rows` 3, `with_x` 2, `not_in_rows` 0, `distinct_rows` 2, `total` 5.

## Practice

Answer the five questions. Run the example above if you want to check.
