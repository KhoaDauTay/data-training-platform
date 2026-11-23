---
id: e-ds-l4-03
engine: design
level: L4
module: normal-forms
title: BCNF và cái giá của việc giữ phụ thuộc
title_en: BCNF and the price of keeping dependencies
kind: lab
runtime: browser
minutes: 25
objectives:
  - vi: Nhận ra một bảng ở 3NF mà chưa ở BCNF, vì có một vế trái không phải siêu khóa.
    en: Spot a table that is in 3NF but not in BCNF, because a left side is not a superkey.
  - vi: Tách theo BCNF mà không mất thông tin.
    en: Split to BCNF without losing information.
  - vi: Thấy bằng SQL phụ thuộc nào không còn được khóa giữ sau khi tách, và quyết định giữa 3NF và BCNF.
    en: See with SQL which dependency no key enforces after the split, and choose between 3NF and BCNF.
requires: [e-ds-l4-02]
sources:
  - https://www.bkent.net/Doc/simple5.htm
  - https://doi.org/10.1145/362384.362685
  - https://www.postgresql.org/docs/18/ddl-constraints.html
lab:
  setup: |
    CREATE TABLE tutoring (
      student text NOT NULL,
      subject text NOT NULL,
      teacher text NOT NULL,
      PRIMARY KEY (student, subject)
    );
    INSERT INTO tutoring VALUES
      ('An', 'math', 'Hoa'), ('An', 'physics', 'Lan'), ('Binh', 'math', 'Minh'),
      ('Binh', 'physics', 'Lan'), ('Chi', 'math', 'Hoa');
  steps:
    - task:
        vi: "Kiểm phụ thuộc `teacher` → `subject` trên dữ liệu: với mỗi giáo viên, đếm số môn khác nhau (`subjects`). Trả `teacher`, `subjects`, xếp theo `teacher`."
        en: "Check the dependency `teacher` → `subject` on the data: for each teacher, count the distinct subjects (`subjects`). Return `teacher`, `subjects`, ordered by `teacher`."
      solution: SELECT teacher, count(DISTINCT subject) AS subjects FROM tutoring GROUP BY teacher ORDER BY teacher
      check: rows
      ordered: true
      hint:
        vi: "`GROUP BY teacher` và `count(DISTINCT subject)`; mọi giá trị là 1 thì phụ thuộc đứng vững trên dữ liệu này."
        en: "`GROUP BY teacher` and `count(DISTINCT subject)`; all values 1 means the dependency holds on this data."
    - task:
        vi: "Tách theo BCNF. Tạo bảng `teacher_subject` gồm `teacher`, `subject`, mỗi giáo viên một dòng, lấy từ `tutoring`."
        en: "Split to BCNF. Create table `teacher_subject` with `teacher`, `subject`, one row per teacher, from `tutoring`."
      solution: CREATE TABLE teacher_subject AS SELECT DISTINCT teacher, subject FROM tutoring
      check: catalog
      hint:
        vi: "`CREATE TABLE … AS SELECT DISTINCT teacher, subject FROM tutoring`."
        en: "`CREATE TABLE … AS SELECT DISTINCT teacher, subject FROM tutoring`."
    - task:
        vi: "Trong bảng mới, `teacher` là khóa. Thêm khóa chính đó. Đừng đặt tên ràng buộc."
        en: "In the new table `teacher` is the key. Add that primary key. Do not name the constraint."
      solution: ALTER TABLE teacher_subject ADD PRIMARY KEY (teacher)
      check: catalog
      hint:
        vi: "`ALTER TABLE teacher_subject ADD PRIMARY KEY (teacher)`."
        en: "`ALTER TABLE teacher_subject ADD PRIMARY KEY (teacher)`."
    - task:
        vi: "Tạo bảng thứ hai `student_teacher` gồm `student`, `teacher`, lấy từ `tutoring`."
        en: "Create the second table `student_teacher` with `student`, `teacher`, from `tutoring`."
      solution: CREATE TABLE student_teacher AS SELECT student, teacher FROM tutoring
      check: catalog
      hint:
        vi: "Cùng khuôn `CREATE TABLE … AS SELECT`, hai cột `student`, `teacher`."
        en: "Same pattern `CREATE TABLE … AS SELECT`, two columns `student`, `teacher`."
    - task:
        vi: "Nối hai bảng lại theo `teacher`: trả `student`, `subject`, `teacher`, xếp theo `student` rồi `subject`. Kết quả phải đúng năm dòng của `tutoring`."
        en: "Join the two tables back on `teacher`: return `student`, `subject`, `teacher`, ordered by `student` then `subject`. The result must be exactly the five rows of `tutoring`."
      solution: SELECT st.student, ts.subject, st.teacher FROM student_teacher st JOIN teacher_subject ts USING (teacher) ORDER BY st.student, ts.subject
      check: rows
      ordered: true
      hint:
        vi: "`JOIN … USING (teacher)`, rồi `ORDER BY` hai cột."
        en: "`JOIN … USING (teacher)`, then `ORDER BY` the two columns."
quiz:
  - q:
      vi: "Bảng `tutoring(student, subject, teacher)`, khóa `(student, subject)`, có thêm `teacher` → `subject`. Nó ở dạng chuẩn nào?"
      en: "Table `tutoring(student, subject, teacher)`, key `(student, subject)`, also has `teacher` → `subject`. Which normal form is it in?"
    options:
      - { vi: "Chỉ 2NF, vì có phụ thuộc bắc cầu", en: "Only 2NF, because of a transitive dependency" }
      - { vi: "3NF nhưng chưa BCNF: `subject` là cột khóa nên 3NF cho qua, còn `teacher` không phải siêu khóa", en: "3NF but not BCNF: `subject` is a key column so 3NF allows it, while `teacher` is not a superkey" }
      - { vi: "BCNF, vì bảng có khóa chính", en: "BCNF, because the table has a primary key" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì `teacher` không phải khóa, nhưng 3NF chỉ cấm phụ thuộc vào cột không khóa khi vế phải cũng không thuộc khóa nào. Ở đây vế phải `subject` nằm trong khóa, nên 3NF cho qua; BCNF thì không: mọi vế trái phải là siêu khóa."
      en: "It sounds right because `teacher` is not a key, but 3NF only forbids such a dependency when its right side is not part of any key. Here the right side `subject` is in the key, so 3NF allows it; BCNF does not: every left side must be a superkey."
  - q:
      vi: "Sau khi tách theo BCNF, phụ thuộc `(student, subject)` → `teacher` được giữ bằng gì?"
      en: "After the BCNF split, what enforces `(student, subject)` → `teacher`?"
    options:
      - { vi: "Khóa chính của `student_teacher`", en: "The primary key of `student_teacher`" }
      - { vi: "Không khóa nào: hai cột nằm ở hai bảng; phải kiểm bằng truy vấn, trigger, hoặc giữ thiết kế 3NF", en: "No key: the columns live in two tables; it needs a query, a trigger, or keeping the 3NF design" }
      - { vi: "Khóa ngoại từ `student_teacher` sang `teacher_subject`", en: "The foreign key from `student_teacher` to `teacher_subject`" }
    answer: 1
    trap: 2
    why:
      vi: "Nhiều người nghĩ khóa ngoại nối hai bảng thì giữ được mọi luật giữa chúng. Thật ra khóa ngoại chỉ hứa giáo viên có tồn tại; nó không cấm một học viên có hai giáo viên cùng môn. BCNF đổi mất việc giữ phụ thuộc lấy việc hết lặp."
      en: "Many people think a foreign key between two tables keeps every rule between them. In fact it only promises the teacher exists; it does not stop a student from having two teachers for one subject. BCNF trades dependency preservation for no repetition."
---
## Mở bài

Một trung tâm dạy kèm: mỗi học viên học một môn với đúng một giáo viên, mỗi giáo viên chỉ dạy một môn. Bảng đã có khóa, đã ở 3NF, vậy mà môn của giáo viên Hoa vẫn bị lưu nhiều lần. Bài này cho thấy BCNF chữa chỗ đó và cái giá phải trả.

## Ý chính

**BCNF** (Boyce–Codd): với mọi phụ thuộc hàm không tầm thường X → Y, X phải là siêu khóa. Nói gọn: chỉ khóa mới được quyết định thứ khác. 3NF lỏng hơn ở một chỗ: nó cho qua X → Y nếu Y là một cột thuộc khóa ứng viên nào đó.

Bảng `tutoring` có khóa `(student, subject)` và hai phụ thuộc: `(student, subject)` → `teacher` và `teacher` → `subject`. Phụ thuộc thứ hai có vế trái `teacher` không phải siêu khóa, nhưng vế phải `subject` nằm trong khóa, nên bảng ở 3NF mà không ở BCNF. Hệ quả: môn của mỗi giáo viên lặp theo số học viên, và sửa sót một dòng là một giáo viên dạy hai môn.

Tách theo phụ thuộc vi phạm: `teacher_subject(teacher, subject)` với khóa `teacher`, và `student_teacher(student, teacher)`. Nối lại theo `teacher` ra đúng bảng cũ. Nhưng phụ thuộc `(student, subject)` → `teacher` giờ trải trên hai bảng, không khóa nào giữ nó: học viên có thể có hai giáo viên cùng môn mà database không kêu. Đây là đánh đổi thật: 3NF luôn tách được mà giữ mọi phụ thuộc, BCNF thì không phải lúc nào cũng được. Chọn BCNF khi lặp là vấn đề lớn hơn; giữ 3NF (hoặc thêm trigger) khi luật đó quan trọng hơn.

## Cú pháp

```sql
CREATE TABLE r1 AS SELECT DISTINCT x, y FROM r;   -- the violating dependency x -> y, x becomes the key
ALTER TABLE r1 ADD PRIMARY KEY (x);
CREATE TABLE r2 AS SELECT other_columns, x FROM r; -- everything else, plus x to join back
SELECT ... FROM r2 JOIN r1 USING (x);
```

- Bảng `r1` giữ phụ thuộc vi phạm, vế trái thành khóa.
- Bảng `r2` giữ phần còn lại cộng vế trái làm cột nối.
- Lặp lại cho tới khi mọi bảng ở BCNF.

## Ví dụ

Kiểm hai phụ thuộc trên dữ liệu bằng `GROUP BY … HAVING` (cấp 3): không dòng nào phá chúng.

```sql
SELECT 'teacher -> subject' AS fd, count(*) AS breaking_groups
FROM (SELECT teacher FROM tutoring GROUP BY teacher HAVING count(DISTINCT subject) > 1) x
UNION ALL
SELECT 'student, subject -> teacher', count(*)
FROM (SELECT student, subject FROM tutoring GROUP BY student, subject HAVING count(DISTINCT teacher) > 1) y;
```

Môn của giáo viên bị lặp bao nhiêu lần:

```sql
SELECT teacher, subject, count(*) AS copies FROM tutoring GROUP BY teacher, subject ORDER BY teacher;
```

Hoa và Lan mỗi người lưu môn hai lần. Một bản sao của bảng để thử ở mục sau:

```sql
CREATE TABLE ex_tutoring (student text, subject text, teacher text, PRIMARY KEY (student, subject));
INSERT INTO ex_tutoring SELECT student, subject, teacher FROM tutoring;
SELECT count(*) AS rows_copied FROM ex_tutoring;
```

## Lỗi hay gặp

Tách theo `subject` (không quyết định gì) thay vì `teacher`: nối lại sinh dòng giả.

```sql
-- WRONG: split on subject; the join pairs every student of a subject with every teacher of it
CREATE TABLE ex_s_subj AS SELECT DISTINCT student, subject FROM ex_tutoring;
CREATE TABLE ex_subj_t AS SELECT DISTINCT subject, teacher FROM ex_tutoring;
SELECT count(*) AS rows_back FROM ex_s_subj JOIN ex_subj_t USING (subject);
```

```sql
-- FIX: split on teacher, the left side of teacher -> subject
CREATE TABLE ex_ts AS SELECT DISTINCT teacher, subject FROM ex_tutoring;
CREATE TABLE ex_st AS SELECT student, teacher FROM ex_tutoring;
SELECT count(*) AS rows_back FROM ex_st JOIN ex_ts USING (teacher);
```

Câu sai ra 8 dòng từ 5; câu đúng ra 5.

Phụ thuộc bị mất: sau khi tách, An có thêm giáo viên toán thứ hai mà không gì chặn.

```sql
-- WRONG: the BCNF tables accept a second math teacher for An
INSERT INTO ex_st VALUES ('An', 'Minh');
SELECT student, subject, count(*) AS teachers FROM ex_st JOIN ex_ts USING (teacher) GROUP BY student, subject HAVING count(*) > 1;
```

```sql
-- FIX: find the breach with that query (or a trigger) and remove it
DELETE FROM ex_st WHERE student = 'An' AND teacher = 'Minh';
SELECT student, subject, count(*) AS teachers FROM ex_st JOIN ex_ts USING (teacher) GROUP BY student, subject ORDER BY student, subject;
```

Ở bảng 3NF gốc, khóa `(student, subject)` tự chặn cùng sự thật đó:

```sql
-- ERROR 23505: duplicate key value violates unique constraint "ex_tutoring_pkey"
INSERT INTO ex_tutoring VALUES ('An', 'math', 'Minh');
```

## Thực hành

Kiểm `teacher` → `subject` trên dữ liệu, tách `teacher_subject` và thêm khóa, tạo `student_teacher`, rồi nối lại để thấy đủ năm dòng.

## Tóm tắt

- BCNF: mọi vế trái của phụ thuộc không tầm thường là siêu khóa.
- 3NF cho qua X → Y khi Y thuộc một khóa; BCNF thì không.
- Tách theo phụ thuộc vi phạm: vế trái thành khóa của bảng mới.
- BCNF có thể làm mất phụ thuộc; khi luật đó quan trọng, giữ 3NF hoặc thêm trigger.

# EN

## Opening

A tutoring centre: each student takes a subject with exactly one teacher, and each teacher teaches one subject only. The table has a key and is in 3NF, yet teacher Hoa's subject is still stored many times. This lesson shows how BCNF cures that, and what it costs.

## Key idea

**BCNF** (Boyce–Codd): for every non-trivial functional dependency X → Y, X must be a superkey. In short: only keys may determine anything. 3NF is looser in one place: it allows X → Y when Y is a column of some candidate key.

Table `tutoring` has key `(student, subject)` and two dependencies: `(student, subject)` → `teacher` and `teacher` → `subject`. The second one has a left side `teacher` that is not a superkey, but its right side `subject` is in the key, so the table is in 3NF and not in BCNF. As a result each teacher's subject is repeated once per student, and missing one row on an update gives a teacher two subjects.

Split on the violating dependency: `teacher_subject(teacher, subject)` keyed by `teacher`, and `student_teacher(student, teacher)`. Joining back on `teacher` gives exactly the old table. But the dependency `(student, subject)` → `teacher` now spans two tables, and no key enforces it: a student can get two teachers for one subject without the database noticing. This is a real trade-off: a 3NF split that keeps every dependency always exists, a BCNF one not always. Choose BCNF when repetition is the bigger problem; keep 3NF (or add a trigger) when that rule matters more.

## Syntax

```sql
CREATE TABLE r1 AS SELECT DISTINCT x, y FROM r;   -- the violating dependency x -> y, x becomes the key
ALTER TABLE r1 ADD PRIMARY KEY (x);
CREATE TABLE r2 AS SELECT other_columns, x FROM r; -- everything else, plus x to join back
SELECT ... FROM r2 JOIN r1 USING (x);
```

- Table `r1` holds the violating dependency, its left side as the key.
- Table `r2` holds the rest plus the left side as the join column.
- Repeat until every table is in BCNF.

## Example

Check both dependencies on the data with `GROUP BY … HAVING` (level 3): no row breaks them.

```sql
SELECT 'teacher -> subject' AS fd, count(*) AS breaking_groups
FROM (SELECT teacher FROM tutoring GROUP BY teacher HAVING count(DISTINCT subject) > 1) x
UNION ALL
SELECT 'student, subject -> teacher', count(*)
FROM (SELECT student, subject FROM tutoring GROUP BY student, subject HAVING count(DISTINCT teacher) > 1) y;
```

How many times each teacher's subject is repeated:

```sql
SELECT teacher, subject, count(*) AS copies FROM tutoring GROUP BY teacher, subject ORDER BY teacher;
```

Hoa and Lan each store their subject twice. A copy of the table to experiment with below:

```sql
CREATE TABLE ex_tutoring (student text, subject text, teacher text, PRIMARY KEY (student, subject));
INSERT INTO ex_tutoring SELECT student, subject, teacher FROM tutoring;
SELECT count(*) AS rows_copied FROM ex_tutoring;
```

## Common mistakes

Splitting on `subject` (which determines nothing) instead of `teacher`: the join invents rows.

```sql
-- WRONG: split on subject; the join pairs every student of a subject with every teacher of it
CREATE TABLE ex_s_subj AS SELECT DISTINCT student, subject FROM ex_tutoring;
CREATE TABLE ex_subj_t AS SELECT DISTINCT subject, teacher FROM ex_tutoring;
SELECT count(*) AS rows_back FROM ex_s_subj JOIN ex_subj_t USING (subject);
```

```sql
-- FIX: split on teacher, the left side of teacher -> subject
CREATE TABLE ex_ts AS SELECT DISTINCT teacher, subject FROM ex_tutoring;
CREATE TABLE ex_st AS SELECT student, teacher FROM ex_tutoring;
SELECT count(*) AS rows_back FROM ex_st JOIN ex_ts USING (teacher);
```

The wrong query returns 8 rows from 5; the fixed one 5.

The lost dependency: after the split, An gets a second math teacher and nothing stops it.

```sql
-- WRONG: the BCNF tables accept a second math teacher for An
INSERT INTO ex_st VALUES ('An', 'Minh');
SELECT student, subject, count(*) AS teachers FROM ex_st JOIN ex_ts USING (teacher) GROUP BY student, subject HAVING count(*) > 1;
```

```sql
-- FIX: find the breach with that query (or a trigger) and remove it
DELETE FROM ex_st WHERE student = 'An' AND teacher = 'Minh';
SELECT student, subject, count(*) AS teachers FROM ex_st JOIN ex_ts USING (teacher) GROUP BY student, subject ORDER BY student, subject;
```

In the original 3NF table, the key `(student, subject)` blocks the same fact by itself:

```sql
-- ERROR 23505: duplicate key value violates unique constraint "ex_tutoring_pkey"
INSERT INTO ex_tutoring VALUES ('An', 'math', 'Minh');
```

## Practice

Check `teacher` → `subject` on the data, split out `teacher_subject` and key it, create `student_teacher`, then join back to see all five rows.

## Recap

- BCNF: every left side of a non-trivial dependency is a superkey.
- 3NF allows X → Y when Y belongs to a key; BCNF does not.
- Split on the violating dependency: its left side becomes the key of the new table.
- BCNF can lose a dependency; when that rule matters, keep 3NF or add a trigger.
