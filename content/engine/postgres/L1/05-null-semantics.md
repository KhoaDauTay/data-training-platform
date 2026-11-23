---
id: e-pg-l1-05
engine: postgres
level: L1
module: constraints
title: NULL không phải là một giá trị
title_en: NULL is not a value
kind: quiz
runtime: browser
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
lab:
  setup: |
    CREATE TABLE staff (id int, dept_id int, bonus int);
    INSERT INTO staff VALUES (1, 10, 100), (2, NULL, NULL), (3, 20, 50), (4, 30, NULL);
    CREATE TABLE closed_depts (dept_id int);
    INSERT INTO closed_depts VALUES (20), (NULL);
  steps:
    - task:
        vi: "Bảng `staff` có bao nhiêu dòng, và bao nhiêu dòng có `bonus`? Trả về `all_rows` và `with_bonus`."
        en: "How many rows does `staff` have, and how many have a `bonus`? Return `all_rows` and `with_bonus`."
      solution: SELECT count(*) AS all_rows, count(bonus) AS with_bonus FROM staff
      check: rows
      hint:
        vi: "`count(*)` đếm dòng, `count(bonus)` chỉ đếm giá trị khác NULL."
        en: "`count(*)` counts rows, `count(bonus)` counts only non-NULL values."
      fact:
        vi: "4 dòng nhưng chỉ 2 có thưởng: `count(bonus)` bỏ qua NULL."
        en: "4 rows but only 2 with a bonus: `count(bonus)` skips NULLs."
        probe: SELECT count(*), count(bonus) FROM staff
        expect: [[4, 2]]
    - task:
        vi: "Đếm nhân viên có phòng không nằm trong `closed_depts`, viết bằng `NOT IN (SELECT dept_id FROM closed_depts)`. Trả về một số đếm."
        en: "Count the staff whose department is not in `closed_depts`, written with `NOT IN (SELECT dept_id FROM closed_depts)`. Return one count."
      solution: SELECT count(*) FROM staff WHERE dept_id NOT IN (SELECT dept_id FROM closed_depts)
      check: rows
      hint:
        vi: "`WHERE dept_id NOT IN (SELECT dept_id FROM closed_depts)` rồi `count(*)`."
        en: "`WHERE dept_id NOT IN (SELECT dept_id FROM closed_depts)`, then `count(*)`."
      fact:
        vi: "Ra 0: danh sách có một NULL, nên `x NOT IN (20, NULL)` không bao giờ đúng, chỉ là false hoặc NULL. Phòng 10 và 30 cũng mất."
        en: "It is 0: the list holds a NULL, so `x NOT IN (20, NULL)` is never true, only false or NULL. Departments 10 and 30 are lost too."
        probe: SELECT count(*) FROM staff WHERE dept_id NOT IN (SELECT dept_id FROM closed_depts)
        expect: [[0]]
    - task:
        vi: "Viết lại bằng `NOT EXISTS`: mã những nhân viên không có dòng nào trong `closed_depts` cùng `dept_id`, theo `id`."
        en: "Rewrite it with `NOT EXISTS`: the ids of staff with no row in `closed_depts` for the same `dept_id`, by `id`."
      solution: SELECT id FROM staff s WHERE NOT EXISTS (SELECT 1 FROM closed_depts c WHERE c.dept_id = s.dept_id) ORDER BY id
      check: rows
      ordered: true
      hint:
        vi: "Câu con trong `NOT EXISTS` nối `closed_depts` với dòng `staff` bên ngoài qua `dept_id`."
        en: "The subquery inside `NOT EXISTS` links `closed_depts` to the outer `staff` row on `dept_id`."
      fact:
        vi: "Ra 1, 2, 4: `NOT EXISTS` chỉ hỏi có dòng khớp hay không, nên một NULL không làm hỏng cả câu lọc. Nhân viên 2 (không có phòng) cũng được giữ."
        en: "It is 1, 2, 4: `NOT EXISTS` only asks whether a matching row exists, so one NULL cannot spoil the whole filter. Staff 2 (no department) is kept too."
        probe: SELECT id FROM staff s WHERE NOT EXISTS (SELECT 1 FROM closed_depts c WHERE c.dept_id = s.dept_id) ORDER BY id
        expect: [[1], [2], [4]]
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
      vi: Dễ chọn true vì một giá trị thì luôn bằng chính nó; nhưng NULL nghĩa là "không biết", và hai thứ không biết chưa chắc bằng nhau, nên so sánh thường với NULL luôn cho NULL. Muốn hỏi "có phải NULL không" thì dùng `IS NULL`.
      en: True is tempting because a value always equals itself, but NULL means "unknown", and two unknowns are not known to be equal, so an ordinary comparison with NULL always yields NULL. To ask "is it NULL?" use `IS NULL`.
  - q:
      vi: "Cột `v` có ba dòng: 1, NULL, 3. `SELECT count(*), count(v)` cho ra gì?"
      en: "Column `v` has three rows: 1, NULL, 3. What does `SELECT count(*), count(v)` return?"
    options:
      - { vi: "3 và 3", en: "3 and 3" }
      - { vi: "3 và 2", en: "3 and 2" }
      - { vi: "2 và 2", en: "2 and 2" }
    answer: 1
    why:
      vi: "\"3 và 3\" nghe hợp lý nếu bạn nghĩ `count` nào cũng đếm số dòng; nhưng `count(*)` đếm dòng, còn `count(v)` chỉ đếm dòng có `v` khác NULL. `sum` và `avg` cũng bỏ qua NULL."
      en: "\"3 and 3\" sounds right if you think every `count` counts rows, but `count(*)` counts rows while `count(v)` counts only rows where `v` is not NULL. `sum` and `avg` also skip NULLs."
  - q:
      vi: "Bảng có `x` = 2 và 3. `SELECT x FROM t WHERE x NOT IN (1, NULL)` trả về bao nhiêu dòng?"
      en: "A table holds `x` = 2 and 3. How many rows does `SELECT x FROM t WHERE x NOT IN (1, NULL)` return?"
    options:
      - { vi: "2 dòng", en: "2 rows" }
      - { vi: "1 dòng", en: "1 row" }
      - { vi: "0 dòng", en: "0 rows" }
    answer: 2
    why:
      vi: "Chọn 2 dòng vì cả 2 lẫn 3 đều không phải 1, còn NULL trông như một phần tử vô hại; nhưng `2 NOT IN (1, NULL)` nghĩa là `2 <> 1 AND 2 <> NULL`, tức true AND NULL = NULL. WHERE chỉ giữ dòng true, nên không còn dòng nào. Đây là bẫy kinh điển khi danh sách là một subquery có NULL; `NOT EXISTS` không có bẫy này."
      en: "2 rows is tempting because neither 2 nor 3 is 1 and the NULL looks harmless, but `2 NOT IN (1, NULL)` means `2 <> 1 AND 2 <> NULL`, that is true AND NULL = NULL. WHERE keeps only true rows, so nothing is left. This is the classic trap when the list is a subquery containing NULL; `NOT EXISTS` does not have it."
  - q:
      vi: "Muốn tìm dòng mà `a` và `b` khác nhau, coi NULL như một giá trị bình thường (NULL với 5 là khác, NULL với NULL là giống). Viết thế nào?"
      en: "You want rows where `a` and `b` differ, treating NULL as an ordinary value (NULL vs 5 differ, NULL vs NULL are the same). What do you write?"
    options:
      - { vi: "`a <> b`", en: "`a <> b`" }
      - { vi: "`a IS DISTINCT FROM b`", en: "`a IS DISTINCT FROM b`" }
      - { vi: "`NOT (a = b)`", en: "`NOT (a = b)`" }
    answer: 1
    why:
      vi: "`a <> b` trông như cách tự nhiên để hỏi \"khác nhau\"; nhưng `<>` và `NOT (a = b)` cho NULL khi một bên là NULL, nên dòng bị bỏ. `IS DISTINCT FROM` không bao giờ trả NULL: NULL với 5 là true, NULL với NULL là false."
      en: "`a <> b` looks like the natural way to ask \"different\", but `<>` and `NOT (a = b)` return NULL when either side is NULL, so the row is dropped. `IS DISTINCT FROM` never returns NULL: NULL vs 5 is true, NULL vs NULL is false."
  - q:
      vi: "Một ràng buộc `CHECK (qty > 0)` gặp dòng có `qty` là NULL. Chuyện gì xảy ra?"
      en: "A `CHECK (qty > 0)` constraint meets a row whose `qty` is NULL. What happens?"
    options:
      - { vi: "Dòng bị từ chối", en: "The row is rejected" }
      - { vi: "Dòng được nhận, vì điều kiện cho NULL chứ không phải false", en: "The row is accepted, because the condition is NULL, not false" }
      - { vi: "NULL được đổi thành 0", en: "NULL is turned into 0" }
    answer: 1
    why:
      vi: "Dễ nghĩ dòng bị từ chối, vì NULL đâu có lớn hơn 0; nhưng `CHECK` chỉ từ chối khi điều kiện là false, còn ở đây điều kiện là NULL. Muốn cấm NULL thì thêm `NOT NULL`."
      en: "A rejection feels likely, since NULL is not greater than 0, but `CHECK` only rejects a row when the condition is false, and here the condition is NULL. To forbid NULL, add `NOT NULL`."
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

Đoán kết quả của từng dòng trong ví dụ trên, kiểm lại bằng lab (ba bước), rồi trả lời năm câu hỏi.

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

Guess the result of each line in the example above, check it in the lab (three steps), then answer the five questions.
