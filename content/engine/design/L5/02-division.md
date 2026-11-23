---
id: e-ds-l5-02
engine: design
level: L5
module: algebra
title: Phép chia - câu hỏi "với mọi"
title_en: Division - the "for all" question
kind: lab
runtime: browser
minutes: 20
objectives:
  - vi: Nhận ra câu hỏi cần phép chia ÷ (ai làm đủ mọi thứ trong một danh sách).
    en: Spot a question that needs division ÷ (who did every item on a list).
  - vi: Viết phép chia bằng hai lớp `NOT EXISTS`, bằng `EXCEPT` và bằng cách đếm.
    en: Write division with two levels of `NOT EXISTS`, with `EXCEPT` and by counting.
  - vi: Xử lý đúng số chia rỗng và dòng trùng trong số bị chia.
    en: Handle an empty divisor and duplicate rows in the dividend correctly.
requires: [e-ds-l5-01]
sources:
  - https://doi.org/10.1145/362384.362685
  - https://www.postgresql.org/docs/18/functions-subquery.html
  - https://www.postgresql.org/docs/18/queries-union.html
lab:
  setup: |
    CREATE TABLE students (id int PRIMARY KEY, name text NOT NULL);
    CREATE TABLE courses (code text PRIMARY KEY, track text NOT NULL);
    CREATE TABLE took (student_id int NOT NULL REFERENCES students (id), code text NOT NULL REFERENCES courses (code));
    INSERT INTO students VALUES (1, 'An'), (2, 'Binh'), (3, 'Chi'), (4, 'Dung');
    INSERT INTO courses VALUES ('SQL', 'core'), ('NOSQL', 'core'), ('DESIGN', 'core'), ('SPARK', 'extra');
    INSERT INTO took VALUES (1, 'SQL'), (1, 'NOSQL'), (1, 'DESIGN'), (1, 'SPARK'),
      (2, 'SQL'), (2, 'NOSQL'), (2, 'DESIGN'),
      (3, 'SQL'), (3, 'SQL'), (3, 'NOSQL'),
      (4, 'SPARK');
  steps:
    - task:
        vi: "Ai đã học mọi khóa trong bảng `courses`? Trả `name`. Dùng hai lớp `NOT EXISTS`."
        en: "Who has taken every course in table `courses`? Return `name`. Use two levels of `NOT EXISTS`."
      solution: SELECT s.name FROM students s WHERE NOT EXISTS (SELECT 1 FROM courses c WHERE NOT EXISTS (SELECT 1 FROM took t WHERE t.student_id = s.id AND t.code = c.code))
      check: rows
      hint:
        vi: "Đọc thành: không có khóa nào mà học viên này chưa học. Lớp ngoài duyệt khóa, lớp trong tìm lượt học."
        en: "Read it as: there is no course this student has not taken. The outer level walks the courses, the inner one looks for a take."
    - task:
        vi: "Ai đã học mọi khóa có `track` là `core`? Trả `name`."
        en: "Who has taken every course whose `track` is `core`? Return `name`."
      solution: SELECT s.name FROM students s WHERE NOT EXISTS (SELECT 1 FROM courses c WHERE c.track = 'core' AND NOT EXISTS (SELECT 1 FROM took t WHERE t.student_id = s.id AND t.code = c.code))
      check: rows
      hint:
        vi: "Số chia giờ là các khóa `core`: thêm điều kiện đó vào lớp duyệt khóa."
        en: "The divisor is now the `core` courses: add that condition to the level that walks the courses."
    - task:
        vi: "Ai đã học đủ mọi khóa mà học viên số 3 đã học (kể cả chính người đó)? Trả `name`. Cẩn thận: số 3 có học lặp."
        en: "Who has taken every course that student 3 has taken (that student included)? Return `name`. Careful: student 3 has a repeated take."
      solution: SELECT s.name FROM students s WHERE NOT EXISTS (SELECT 1 FROM took d WHERE d.student_id = 3 AND NOT EXISTS (SELECT 1 FROM took t WHERE t.student_id = s.id AND t.code = d.code))
      check: rows
      hint:
        vi: "Số chia là các khóa trong `took` của học viên 3. Dạng `NOT EXISTS` không bị dòng trùng làm sai."
        en: "The divisor is the courses in `took` for student 3. The `NOT EXISTS` form is not fooled by duplicate rows."
quiz:
  - q:
      vi: "Số chia rỗng (không có khóa nào thuộc nhóm đó). Theo định nghĩa \"học mọi khóa\", ai thỏa?"
      en: "The divisor is empty (no course is in that group). By the definition \"took every course\", who qualifies?"
    options:
      - { vi: "Không ai, vì không ai học khóa nào trong nhóm", en: "Nobody, because nobody took any course in the group" }
      - { vi: "Mọi học viên: \"với mọi phần tử của tập rỗng\" luôn đúng", en: "Every student: \"for every element of the empty set\" is always true" }
      - { vi: "Câu hỏi báo lỗi chia cho 0", en: "The query fails with a division by zero" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì chưa ai học gì, nhưng mệnh đề \"với mọi\" trên tập rỗng là đúng hiển nhiên. Dạng `NOT EXISTS` trả mọi người; dạng đếm thì trả rỗng, nên phải quyết trước bạn muốn nghĩa nào."
      en: "It sounds right because nobody took anything, but a \"for all\" claim over the empty set is vacuously true. The `NOT EXISTS` form returns everyone; the counting form returns nobody, so decide which meaning you want first."
  - q:
      vi: "Dạng đếm `HAVING count(*) = (SELECT count(*) FROM courses)` sai khi nào?"
      en: "When does the counting form `HAVING count(*) = (SELECT count(*) FROM courses)` go wrong?"
    options:
      - { vi: "Khi bảng `took` có dòng trùng hoặc có khóa ngoài số chia", en: "When table `took` has duplicate rows or courses outside the divisor" }
      - { vi: "Không bao giờ, đếm luôn chính xác", en: "Never, counting is always exact" }
      - { vi: "Khi bảng `students` có hơn 100 dòng", en: "When table `students` has more than 100 rows" }
    answer: 0
    trap: 1
    why:
      vi: "Nhiều người nghĩ đếm là cách an toàn nhất. Thật ra hai lượt học cùng một khóa được đếm hai lần, và khóa ngoài số chia cũng bị đếm nếu không lọc trước; cần `count(DISTINCT …)` và lọc theo số chia."
      en: "Many people think counting is the safest form. In fact two takes of one course count twice, and courses outside the divisor count too unless filtered first; you need `count(DISTINCT …)` and a filter on the divisor."
---
## Mở bài

"Khách nào đã mua đủ mọi sản phẩm của bộ sưu tập?", "Nhân viên nào đã qua mọi khóa an toàn bắt buộc?" Câu hỏi "với mọi" không có từ khóa riêng trong SQL. Trong đại số nó là phép chia ÷, và bài này cho ba cách viết nó.

## Ý chính

Cho số bị chia R(học viên, khóa) và số chia S(khóa). R ÷ S là những học viên đi cùng **mọi** khóa trong S. Phép chia không phải phép cơ bản: viết được bằng π, × và −: lấy mọi cặp (học viên, khóa) lẽ ra phải có, trừ đi các cặp có thật, ai còn sót cặp nào là bị loại.

SQL không có ∀, nhưng "với mọi x, P(x)" tương đương "không có x nào mà không P(x)". Vì vậy dạng chuẩn là hai lớp `NOT EXISTS`: không có khóa nào trong số chia mà không có lượt học tương ứng. Dạng thứ hai dùng `EXCEPT`: tập khóa cần học trừ tập khóa đã học phải rỗng. Dạng thứ ba đếm: số khóa khác nhau đã học trong số chia bằng số khóa của số chia.

Ba dạng cho cùng kết quả trên dữ liệu thường nhưng khác ở hai góc. Số chia rỗng: hai dạng đầu trả mọi người (đúng theo logic), dạng đếm trả rỗng vì không có nhóm nào được tạo. Dòng trùng: dạng đếm phải dùng `count(DISTINCT …)`.

## Cú pháp

```sql
-- double NOT EXISTS
SELECT r.x FROM r_side r
WHERE NOT EXISTS (SELECT 1 FROM divisor d
                  WHERE NOT EXISTS (SELECT 1 FROM dividend v WHERE v.x = r.x AND v.y = d.y));
-- counting
SELECT v.x FROM dividend v JOIN divisor d ON d.y = v.y
GROUP BY v.x HAVING count(DISTINCT v.y) = (SELECT count(*) FROM divisor);
```

- Lớp ngoài: ứng viên (học viên). Lớp giữa: phần tử số chia. Lớp trong: bằng chứng có cặp.
- Dạng đếm phải nối với số chia trước khi đếm, để không đếm khóa ngoài nhóm.

## Ví dụ

Dạng hai lớp `NOT EXISTS`: ai học đủ khóa `core`.

```sql
SELECT s.name FROM students s
WHERE NOT EXISTS (
  SELECT 1 FROM courses c
  WHERE c.track = 'core'
    AND NOT EXISTS (SELECT 1 FROM took t WHERE t.student_id = s.id AND t.code = c.code)
)
ORDER BY s.name;
```

Dạng `EXCEPT`: tập cần học trừ tập đã học phải rỗng.

```sql
SELECT s.name FROM students s
WHERE NOT EXISTS (
  SELECT code FROM courses WHERE track = 'core'
  EXCEPT
  SELECT code FROM took WHERE student_id = s.id
)
ORDER BY s.name;
```

Dạng đếm, với `DISTINCT` và nối với số chia trước.

```sql
SELECT s.name FROM students s
JOIN took t ON t.student_id = s.id
JOIN courses c ON c.code = t.code AND c.track = 'core'
GROUP BY s.id, s.name
HAVING count(DISTINCT c.code) = (SELECT count(*) FROM courses WHERE track = 'core')
ORDER BY s.name;
```

Cả ba trả An và Binh.

## Lỗi hay gặp

Số chia rỗng: chưa có khóa nào thuộc nhóm `lab`.

```sql
-- WRONG: the counting form returns nobody when the divisor is empty
SELECT s.name FROM students s
JOIN took t ON t.student_id = s.id
JOIN courses c ON c.code = t.code AND c.track = 'lab'
GROUP BY s.id, s.name
HAVING count(DISTINCT c.code) = (SELECT count(*) FROM courses WHERE track = 'lab');
```

```sql
-- FIX: NOT EXISTS keeps the logic: every student took all of zero courses
SELECT s.name FROM students s
WHERE NOT EXISTS (
  SELECT 1 FROM courses c WHERE c.track = 'lab'
    AND NOT EXISTS (SELECT 1 FROM took t WHERE t.student_id = s.id AND t.code = c.code)
)
ORDER BY s.name;
```

Nếu nghiệp vụ muốn "không ai" khi nhóm rỗng, hãy viết điều đó ra rõ ràng thay vì dựa vào một dạng tình cờ trả rỗng.

Dòng trùng trong số bị chia: Chi học `SQL` hai lần nhưng chưa học `DESIGN`.

```sql
-- WRONG: count(*) counts the repeated take, so Chi looks complete
SELECT s.name FROM students s
JOIN took t ON t.student_id = s.id
JOIN courses c ON c.code = t.code AND c.track = 'core'
GROUP BY s.id, s.name
HAVING count(*) = (SELECT count(*) FROM courses WHERE track = 'core')
ORDER BY s.name;
```

```sql
-- FIX: count distinct courses
SELECT s.name FROM students s
JOIN took t ON t.student_id = s.id
JOIN courses c ON c.code = t.code AND c.track = 'core'
GROUP BY s.id, s.name
HAVING count(DISTINCT c.code) = (SELECT count(*) FROM courses WHERE track = 'core')
ORDER BY s.name;
```

## Thực hành

Ba câu chia với ba số chia khác nhau: mọi khóa, các khóa `core`, và các khóa của một học viên có học lặp.

## Tóm tắt

- R ÷ S: ứng viên đi cùng mọi phần tử của S; SQL viết nó bằng "không có phần tử nào thiếu".
- Ba dạng: hai lớp `NOT EXISTS`, `NOT EXISTS (… EXCEPT …)`, và đếm với `count(DISTINCT …)`.
- Số chia rỗng: dạng `NOT EXISTS` trả mọi người, dạng đếm trả rỗng.
- Dạng đếm phải nối với số chia trước và đếm khác nhau.

# EN

## Opening

"Which customers bought every product in the collection?", "Which staff passed every mandatory safety course?" A "for all" question has no keyword of its own in SQL. In the algebra it is division ÷, and this lesson gives three ways to write it.

## Key idea

Take a dividend R(student, course) and a divisor S(course). R ÷ S is the students paired with **every** course in S. Division is not a basic operator: it can be written with π, × and −: take every (student, course) pair that should exist, subtract the pairs that do exist, and anyone left with a missing pair is out.

SQL has no ∀, but "for every x, P(x)" is the same as "there is no x for which P(x) fails". So the standard form is two levels of `NOT EXISTS`: there is no course in the divisor without a matching take. The second form uses `EXCEPT`: the set of courses required minus the set taken must be empty. The third form counts: the number of distinct divisor courses taken equals the number of courses in the divisor.

The three forms agree on ordinary data but differ in two corners. Empty divisor: the first two return everyone (logically right), the counting form returns nobody because no group is formed. Duplicate rows: the counting form needs `count(DISTINCT …)`.

## Syntax

```sql
-- double NOT EXISTS
SELECT r.x FROM r_side r
WHERE NOT EXISTS (SELECT 1 FROM divisor d
                  WHERE NOT EXISTS (SELECT 1 FROM dividend v WHERE v.x = r.x AND v.y = d.y));
-- counting
SELECT v.x FROM dividend v JOIN divisor d ON d.y = v.y
GROUP BY v.x HAVING count(DISTINCT v.y) = (SELECT count(*) FROM divisor);
```

- Outer level: the candidates (students). Middle level: the divisor's elements. Inner level: the evidence that the pair exists.
- The counting form must join the divisor before counting, so courses outside the group are not counted.

## Example

The two-level `NOT EXISTS` form: who took every `core` course.

```sql
SELECT s.name FROM students s
WHERE NOT EXISTS (
  SELECT 1 FROM courses c
  WHERE c.track = 'core'
    AND NOT EXISTS (SELECT 1 FROM took t WHERE t.student_id = s.id AND t.code = c.code)
)
ORDER BY s.name;
```

The `EXCEPT` form: required minus taken must be empty.

```sql
SELECT s.name FROM students s
WHERE NOT EXISTS (
  SELECT code FROM courses WHERE track = 'core'
  EXCEPT
  SELECT code FROM took WHERE student_id = s.id
)
ORDER BY s.name;
```

The counting form, with `DISTINCT` and the divisor joined first.

```sql
SELECT s.name FROM students s
JOIN took t ON t.student_id = s.id
JOIN courses c ON c.code = t.code AND c.track = 'core'
GROUP BY s.id, s.name
HAVING count(DISTINCT c.code) = (SELECT count(*) FROM courses WHERE track = 'core')
ORDER BY s.name;
```

All three return An and Binh.

## Common mistakes

An empty divisor: no course is in group `lab` yet.

```sql
-- WRONG: the counting form returns nobody when the divisor is empty
SELECT s.name FROM students s
JOIN took t ON t.student_id = s.id
JOIN courses c ON c.code = t.code AND c.track = 'lab'
GROUP BY s.id, s.name
HAVING count(DISTINCT c.code) = (SELECT count(*) FROM courses WHERE track = 'lab');
```

```sql
-- FIX: NOT EXISTS keeps the logic: every student took all of zero courses
SELECT s.name FROM students s
WHERE NOT EXISTS (
  SELECT 1 FROM courses c WHERE c.track = 'lab'
    AND NOT EXISTS (SELECT 1 FROM took t WHERE t.student_id = s.id AND t.code = c.code)
)
ORDER BY s.name;
```

If the business wants "nobody" for an empty group, write that out explicitly rather than relying on a form that happens to return nothing.

Duplicate rows in the dividend: Chi took `SQL` twice but never `DESIGN`.

```sql
-- WRONG: count(*) counts the repeated take, so Chi looks complete
SELECT s.name FROM students s
JOIN took t ON t.student_id = s.id
JOIN courses c ON c.code = t.code AND c.track = 'core'
GROUP BY s.id, s.name
HAVING count(*) = (SELECT count(*) FROM courses WHERE track = 'core')
ORDER BY s.name;
```

```sql
-- FIX: count distinct courses
SELECT s.name FROM students s
JOIN took t ON t.student_id = s.id
JOIN courses c ON c.code = t.code AND c.track = 'core'
GROUP BY s.id, s.name
HAVING count(DISTINCT c.code) = (SELECT count(*) FROM courses WHERE track = 'core')
ORDER BY s.name;
```

## Practice

Three divisions with three divisors: every course, the `core` courses, and the courses of a student with a repeated take.

## Recap

- R ÷ S: the candidates paired with every element of S; SQL writes it as "no element is missing".
- Three forms: two levels of `NOT EXISTS`, `NOT EXISTS (… EXCEPT …)`, and counting with `count(DISTINCT …)`.
- Empty divisor: the `NOT EXISTS` form returns everyone, the counting form returns nobody.
- The counting form must join the divisor first and count distinct values.
