---
id: e-bp-x01
engine: best
track: postgres
level: L1
module: x
title: "Truy vấn tham số hóa, không ghép chuỗi"
title_en: "Parameterise, never concatenate"
kind: quiz
minutes: 3
objectives:
  - vi: "Đưa giá trị người dùng nhập vào SQL qua tham số (`$1`, prepared statement), không ghép chuỗi."
    en: "Pass user input into SQL as parameters (`$1`, prepared statements), never by string concatenation."
avoid:
  vi: "Một ô lọc thành phố trả về mọi khách vì SQL injection."
  en: "A city filter box that returns every customer because of SQL injection."
requires: []
skills: [where]
adv: []
sources:
  - https://www.postgresql.org/docs/18/sql-prepare.html
  - https://www.postgresql.org/docs/18/functions-string.html#FUNCTIONS-STRING-FORMAT
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: engine
  check: diff
  setup: |
    CREATE TABLE members (id int PRIMARY KEY, city text);
    INSERT INTO members VALUES (1, 'Da Nang'), (2, 'Hue'), (3, 'Hanoi'), (4, NULL);
    PREPARE members_in_city (text) AS SELECT count(*) AS members FROM members WHERE city = $1;
  bad: |
    SELECT count(*) AS members FROM members WHERE city = 'x' OR '1'='1'
  good: |
    EXECUTE members_in_city('x'' OR ''1''=''1')
  expect: null
quiz:
  - q:
      vi: "Một công cụ báo cáo ghép chữ người dùng gõ vào `WHERE city = '…'`. Người dùng gõ `x' OR '1'='1`. Câu nhận được trả gì?"
      en: "A reporting tool pastes the user's text into `WHERE city = '…'`. The user types `x' OR '1'='1`. What does the resulting query return?"
    options:
      - { vi: "0 dòng, vì không có thành phố tên đó", en: "0 rows, because no city has that name" }
      - { vi: "Mọi dòng, vì điều kiện thành luôn đúng", en: "Every row, because the condition becomes always true" }
      - { vi: "Báo lỗi cú pháp", en: "A syntax error" }
    answer: 1
    why:
      vi: "Dấu nháy của người dùng đóng chuỗi, phần còn lại thành cú pháp SQL: `city = 'x' OR '1'='1'`. Với tham số, cả chuỗi chỉ là một giá trị để so, nên trả 0."
      en: "The user's quote closes the string and the rest becomes SQL syntax: `city = 'x' OR '1'='1'`. With a parameter the whole text is just a value to compare, so it returns 0."
---

## Ý chính

Giá trị từ người dùng đi vào SQL qua tham số: `$1`, prepared statement, placeholder của driver. Tên bảng hay cột động thì chọn từ danh sách cho phép, hoặc dùng `format('%I', …)`.

## Vì sao

- Ghép chuỗi cho phép SQL injection: `x' OR '1'='1` biến điều kiện thành luôn đúng.
- Tham số luôn là **giá trị**, không bao giờ là cú pháp.
- Công cụ phân tích (notebook, dashboard có ô lọc) cũng ghép chuỗi nếu bạn để nó làm vậy.

## Ví dụ

Cùng chữ độc. Câu ghép chuỗi đếm 4 thành viên (mọi dòng). Câu `EXECUTE` với tham số đếm 0.

# EN

## Key idea

User input reaches SQL through parameters: `$1`, prepared statements, the driver's placeholders. For dynamic table or column names, pick from an allow-list or use `format('%I', …)`.

## Why

- String concatenation allows SQL injection: `x' OR '1'='1` turns the condition into always true.
- A parameter is always a **value**, never syntax.
- Analyst tools (notebooks, dashboards with filter boxes) concatenate strings too if you let them.

## Example

Same malicious text. The concatenated query counts 4 members (every row). The `EXECUTE` with a parameter counts 0.
