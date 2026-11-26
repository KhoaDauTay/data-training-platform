---
id: e-ds-l2-05
engine: design
level: L2
module: er-mapping
title: Kiểm tra cấp 2 - mô hình ER
title_en: Level 2 check - ER modelling
kind: quiz
runtime: browser
minutes: 10
objectives:
  - vi: Tự kiểm tra thuộc tính, lực lượng, thực thể yếu và cây EER.
    en: Check yourself on attributes, cardinality, weak entities and EER trees.
  - vi: Đọc ngược một schema có sẵn ra sơ đồ ER bằng catalog.
    en: Read an existing schema back into an ER diagram with the catalog.
requires: [e-ds-l2-04]
sources:
  - https://doi.org/10.1145/320434.320440
  - https://www.postgresql.org/docs/18/catalog-pg-constraint.html
lab:
  setup: |
    CREATE TABLE authors (id int PRIMARY KEY, name text NOT NULL);
    CREATE TABLE books (id int PRIMARY KEY, title text NOT NULL);
    CREATE TABLE book_authors (
      book_id int REFERENCES books (id),
      author_id int REFERENCES authors (id),
      PRIMARY KEY (book_id, author_id)
    );
    CREATE TABLE editions (
      book_id int REFERENCES books (id) ON DELETE CASCADE,
      edition_no int,
      year int NOT NULL,
      PRIMARY KEY (book_id, edition_no)
    );
    INSERT INTO authors VALUES (1, 'Lan'), (2, 'Minh');
    INSERT INTO books VALUES (10, 'Data 101'), (11, 'SQL at work');
    INSERT INTO book_authors VALUES (10, 1), (10, 2), (11, 2);
    INSERT INTO editions VALUES (10, 1, 2020), (10, 2, 2024), (11, 1, 2025);
  steps:
    - task:
        vi: "Đọc ngược sơ đồ: liệt kê mọi khóa ngoại, mỗi dòng gồm bảng con (`child`) và bảng cha (`parent`) dạng chữ, xếp theo hai cột đó."
        en: "Read the diagram back: list every foreign key, each row the child table (`child`) and the parent table (`parent`) as text, ordered by those two columns."
      solution: SELECT conrelid::regclass::text AS child, confrelid::regclass::text AS parent FROM pg_constraint WHERE contype = 'f' ORDER BY child, parent
      check: rows
      ordered: true
      hint:
        vi: "`pg_constraint` với `contype = 'f'`; `conrelid` là bảng con, `confrelid` là bảng cha."
        en: "`pg_constraint` with `contype = 'f'`; `conrelid` is the child, `confrelid` the parent."
    - task:
        vi: "Bảng nào có khóa chính nhiều cột (bảng nối hoặc thực thể yếu)? Trả `table_name` và số cột khóa `key_columns`, chỉ các khóa từ 2 cột trở lên, xếp theo `table_name`."
        en: "Which tables have a multi-column primary key (junction tables or weak entities)? Return `table_name` and the number of key columns `key_columns`, only keys of 2 columns or more, ordered by `table_name`."
      solution: SELECT conrelid::regclass::text AS table_name, array_length(conkey, 1) AS key_columns FROM pg_constraint WHERE contype = 'p' AND array_length(conkey, 1) >= 2 ORDER BY table_name
      check: rows
      ordered: true
      hint:
        vi: "Khóa chính có `contype = 'p'`; `conkey` là mảng số thứ tự cột, đếm bằng `array_length(conkey, 1)`."
        en: "A primary key has `contype = 'p'`; `conkey` is the array of column numbers, counted with `array_length(conkey, 1)`."
quiz:
  - q:
      vi: "Tuổi của khách tính được từ ngày sinh. Trên sơ đồ ER, tuổi là thuộc tính gì?"
      en: "A customer's age can be computed from the birth date. On an ER diagram, what kind of attribute is age?"
    options:
      - { vi: "Đa trị", en: "Multivalued" }
      - { vi: "Dẫn xuất", en: "Derived" }
      - { vi: "Thuộc tính khóa", en: "Key attribute" }
    answer: 1
    trap: 0
    why:
      vi: "Đa trị nghe hợp lý vì tuổi đổi theo năm, nhưng tại mỗi thời điểm khách chỉ có một tuổi; đa trị (multivalued) là nhiều giá trị cùng lúc, như nhiều số điện thoại. Tuổi cũng không phải thuộc tính khóa: nhiều khách cùng tuổi, nên nó không phân biệt được ai. Tuổi tính được từ ngày sinh, nên là thuộc tính dẫn xuất (derived), thường tính khi đọc thay vì lưu."
      en: "Multivalued sounds right because age changes every year, but at any moment a customer has one age; multivalued means several values at once, like several phone numbers. Age is not a key attribute either: many customers share an age, so it tells no one apart. Age is computed from the birth date, so it is a derived attribute, usually computed on read rather than stored."
  - q:
      vi: "Trong lab, `editions` có khóa (`book_id`, `edition_no`) và `ON DELETE CASCADE`. Nó là gì trên sơ đồ?"
      en: "In the lab, `editions` is keyed by (`book_id`, `edition_no`) with `ON DELETE CASCADE`. What is it on the diagram?"
    options:
      - { vi: "Bảng nối của mối quan hệ M:N giữa sách và năm", en: "The junction table of an M:N relationship between books and years" }
      - { vi: "Thực thể yếu, chủ là sách, khóa bộ phận là số lần in", en: "A weak entity owned by a book, with the edition number as partial key" }
      - { vi: "Một loại con của sách", en: "A subtype of books" }
    answer: 1
    trap: 0
    why:
      vi: "Nhiều người thấy khóa ghép là nghĩ ngay tới bảng nối, nhưng bảng nối có hai cột khóa đều trỏ tới hai bảng khác (như `book_authors`). Ở `editions`, chỉ `book_id` trỏ tới `books`; `edition_no` là số thứ tự đếm lại từ 1 trong mỗi sách, và không có bảng \"năm\" nào. Khóa = khóa của chủ + số riêng, cộng `ON DELETE CASCADE`, là dấu hiệu của thực thể yếu (weak entity). Loại con (subtype) thì dùng đúng khóa của cha, không thêm cột khóa."
      en: "Many people see a composite key and think junction table, but a junction table has two key columns that both point at other tables (like `book_authors`). In `editions`, only `book_id` points at `books`; `edition_no` restarts at 1 in each book, and there is no \"years\" table. Owner's key + a local number, plus `ON DELETE CASCADE`, is the sign of a weak entity. A subtype would use exactly the parent's key, with no extra key column."
  - q:
      vi: "Một người có thể vừa là giảng viên vừa là sinh viên. Cây chuyên biệt hóa của `person` là gì?"
      en: "One person can be both a lecturer and a student. What is the specialisation tree of `person`?"
    options:
      - { vi: "Rời nhau", en: "Disjoint" }
      - { vi: "Chồng nhau", en: "Overlapping" }
      - { vi: "Không phải chuyên biệt hóa mà là thực thể yếu", en: "Not a specialisation but a weak entity" }
    answer: 1
    trap: 0
    why:
      vi: "Rời nhau (disjoint) nghe hợp lý vì đa số người chỉ có một vai, nhưng rời nhau nghĩa là không ai được thuộc hai loại con; chỉ cần một người vừa dạy vừa học là cây chồng nhau (overlapping). Đây cũng không phải thực thể yếu: `person` có khóa riêng, không cần chủ để nhận diện. Với cây chồng nhau, cách \"một bảng + một cột loại\" không dùng được vì cột chỉ chứa một loại; bảng cha chung cộng mỗi vai một bảng con dùng chung khóa thì được."
      en: "Disjoint sounds right because most people have one role, but disjoint means nobody may belong to two subtypes; one person who both teaches and studies makes the tree overlapping. It is not a weak entity either: `person` has its own key and needs no owner to be identified. With an overlapping tree, \"one table + a type column\" fails because the column holds one type; a shared parent table plus one child table per role, sharing the key, works."
  - q:
      vi: "Mối quan hệ 1:1 giữa nhân viên và thẻ ra vào lên bảng thế nào?"
      en: "How does a 1:1 relationship between an employee and an access badge map to tables?"
    options:
      - { vi: "Một bảng nối có khóa là cặp khóa ngoại", en: "A junction table keyed by the pair of foreign keys" }
      - { vi: "Khóa ngoại `employee_id` trong bảng thẻ, kèm `UNIQUE`", en: "A foreign key `employee_id` in the badge table, with `UNIQUE`" }
      - { vi: "Khóa ngoại `employee_id` trong bảng thẻ, không gì thêm", en: "A foreign key `employee_id` in the badge table, nothing else" }
    answer: 1
    trap: 2
    why:
      vi: "Nhiều người dừng ở khóa ngoại, nhưng khóa ngoại một mình là 1:N: hai thẻ cùng ghi `employee_id` = 5 đều hợp lệ, nên một nhân viên có thể có nhiều thẻ. `UNIQUE` trên cùng cột mới giới hạn mỗi nhân viên một thẻ. Bảng nối là cách cho M:N, cả hai phía đều có nhiều; với 1:1 nó thừa một bảng mà vẫn không chặn được thẻ thứ hai."
      en: "Many people stop at the foreign key, but a foreign key alone is 1:N: two badges both holding `employee_id` = 5 are valid, so one employee can have many badges. `UNIQUE` on the same column is what limits each employee to one badge. A junction table is for M:N, where both sides have many; for 1:1 it adds a table and still does not block a second badge."
---
## Mở bài

Bốn câu hỏi và một lab đọc ngược schema để chốt lại cấp 2. Sai câu nào thì đọc lời giải thích và quay lại bài tương ứng.

## Ý chính

Cấp 2 có ba ý. Sơ đồ ER mô tả thực thể, thuộc tính (đơn, phức hợp, đa trị, dẫn xuất, khóa) và mối quan hệ (bậc, lực lượng, mức tham gia từng phía). EER thêm thực thể yếu và cây cha - con (rời nhau hay chồng nhau, toàn phần hay bộ phận). Và một bộ luật gần như máy móc đưa sơ đồ lên bảng.

Đọc ngược cũng quan trọng như vẽ xuôi: gặp một database lạ, `pg_constraint` cho bạn khóa ngoại (đường nối) và khóa chính (khóa ghép là bảng nối hoặc thực thể yếu), đủ để vẽ lại sơ đồ.

## Ví dụ

Từ ER sang bảng, tra nhanh:

```text
ER                          Bảng / Table
entity                      table, key -> PRIMARY KEY
1:N                         FOREIGN KEY on the N side (+ NOT NULL if total)
M:N                         junction table, PRIMARY KEY (fk1, fk2)
1:1                         FOREIGN KEY + UNIQUE
multivalued attribute       child table, PRIMARY KEY (owner_fk, value)
weak entity                 PRIMARY KEY (owner_fk, partial_key), ON DELETE CASCADE
subtype                     PRIMARY KEY that is also FOREIGN KEY to the parent
```

## Tóm tắt

- Thuộc tính: đơn, phức hợp, đa trị, dẫn xuất, khóa; mối quan hệ: bậc, lực lượng, mức tham gia.
- Thực thể yếu = khóa của chủ + khóa bộ phận; cây EER: rời nhau hay chồng nhau.
- 1:N = khóa ngoại phía N; M:N = bảng nối; 1:1 = khóa ngoại + `UNIQUE`.
- Đọc ngược sơ đồ từ `pg_constraint`: `contype` `f` là đường nối, `p` nhiều cột là bảng nối hoặc thực thể yếu.

# EN

## Opening

Four questions and a lab that reads a schema backwards to wrap up level 2. If you miss one, read the explanation and go back to the lesson it comes from.

## Key idea

Level 2 has three ideas. An ER diagram describes entities, attributes (simple, composite, multivalued, derived, key) and relationships (degree, cardinality, participation per side). EER adds weak entities and parent-child trees (disjoint or overlapping, total or partial). And an almost mechanical set of rules puts the diagram into tables.

Reading backwards matters as much as drawing forwards: faced with an unknown database, `pg_constraint` gives you the foreign keys (the lines) and the primary keys (a composite key means a junction table or a weak entity), enough to redraw the diagram.

## Example

From ER to tables, at a glance:

```text
ER                          Bảng / Table
entity                      table, key -> PRIMARY KEY
1:N                         FOREIGN KEY on the N side (+ NOT NULL if total)
M:N                         junction table, PRIMARY KEY (fk1, fk2)
1:1                         FOREIGN KEY + UNIQUE
multivalued attribute       child table, PRIMARY KEY (owner_fk, value)
weak entity                 PRIMARY KEY (owner_fk, partial_key), ON DELETE CASCADE
subtype                     PRIMARY KEY that is also FOREIGN KEY to the parent
```

## Recap

- Attributes: simple, composite, multivalued, derived, key; relationships: degree, cardinality, participation.
- Weak entity = the owner's key + a partial key; EER trees: disjoint or overlapping.
- 1:N = foreign key on the N side; M:N = junction table; 1:1 = foreign key + `UNIQUE`.
- Read a diagram back from `pg_constraint`: `contype` `f` is a line, a multi-column `p` is a junction table or a weak entity.
