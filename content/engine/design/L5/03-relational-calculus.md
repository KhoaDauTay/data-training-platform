---
id: e-ds-l5-03
engine: design
level: L5
module: algebra
title: Phép tính quan hệ bộ và miền
title_en: Tuple and domain relational calculus
kind: concept
runtime: browser
minutes: 15
figures: [{ name: ds-division, at: idea, variant: forall }]
objectives:
  - vi: Đọc một biểu thức phép tính bộ {t | P(t)} và phép tính miền, rồi viết câu SQL tương ứng.
    en: Read a tuple calculus expression {t | P(t)} and a domain calculus one, then write the matching SQL.
  - vi: Dịch ∃ thành `EXISTS` và ∀ thành `NOT EXISTS … NOT`.
    en: Translate ∃ into `EXISTS` and ∀ into `NOT EXISTS … NOT`.
  - vi: Giải thích biểu thức an toàn và vì sao phép tính mạnh ngang đại số.
    en: Explain safe expressions and why the calculus is as expressive as the algebra.
requires: [e-ds-l5-02]
sources:
  - { url: https://doi.org/10.1145/362384.362685, title_vi: "Bài báo ACM 10.1145/362384.362685" }
  - { url: https://www.postgresql.org/docs/18/functions-subquery.html, title_vi: "Biểu thức truy vấn con (EXISTS)" }
lab:
  setup: |
    CREATE TABLE students (id int PRIMARY KEY, name text NOT NULL, city text NOT NULL);
    CREATE TABLE took (student_id int NOT NULL REFERENCES students (id), course text NOT NULL, grade int NOT NULL);
    INSERT INTO students VALUES (1, 'An', 'Hue'), (2, 'Binh', 'Hue'), (3, 'Chi', 'Da Nang'), (4, 'Dung', 'Hoi An');
    INSERT INTO took VALUES (1, 'SQL', 8), (1, 'NOSQL', 4), (2, 'SQL', 7), (3, 'NOSQL', 9), (3, 'SQL', 6);
  steps:
    - task:
        vi: "Viết SQL cho `{ t.name | t ∈ students ∧ ∃ e ∈ took (e.student_id = t.id ∧ e.course = 'SQL') }`."
        en: "Write the SQL for `{ t.name | t ∈ students ∧ ∃ e ∈ took (e.student_id = t.id ∧ e.course = 'SQL') }`."
      solution: SELECT t.name FROM students t WHERE EXISTS (SELECT 1 FROM took e WHERE e.student_id = t.id AND e.course = 'SQL')
      check: rows
      hint:
        vi: "Biến bộ `t` chạy trên `students` là `FROM students t`; ∃ là `EXISTS (SELECT 1 FROM took e WHERE …)`."
        en: "The tuple variable `t` ranging over `students` is `FROM students t`; ∃ is `EXISTS (SELECT 1 FROM took e WHERE …)`."
    - task:
        vi: "Viết SQL cho `{ t.name | t ∈ students ∧ ∀ e ∈ took (e.student_id = t.id → e.grade >= 5) }`: không có điểm dưới 5 nào."
        en: "Write the SQL for `{ t.name | t ∈ students ∧ ∀ e ∈ took (e.student_id = t.id → e.grade >= 5) }`: no grade below 5."
      solution: SELECT t.name FROM students t WHERE NOT EXISTS (SELECT 1 FROM took e WHERE e.student_id = t.id AND e.grade < 5)
      check: rows
      hint:
        vi: "∀ x (A → B) tương đương ¬∃ x (A ∧ ¬B): `NOT EXISTS (… WHERE e.student_id = t.id AND e.grade < 5)`."
        en: "∀ x (A → B) equals ¬∃ x (A ∧ ¬B): `NOT EXISTS (… WHERE e.student_id = t.id AND e.grade < 5)`."
    - task:
        vi: "Phép tính miền: viết SQL cho `{ ⟨n, c⟩ | ∃ i (⟨i, n, c⟩ ∈ students ∧ c = 'Hue') }`."
        en: "Domain calculus: write the SQL for `{ ⟨n, c⟩ | ∃ i (⟨i, n, c⟩ ∈ students ∧ c = 'Hue') }`."
      solution: SELECT name, city FROM students WHERE city = 'Hue'
      check: rows
      hint:
        vi: "Các biến miền là từng cột: `i` là `id`, `n` là `name`, `c` là `city`; kết quả gồm `n` và `c`."
        en: "Domain variables are single columns: `i` is `id`, `n` is `name`, `c` is `city`; the result holds `n` and `c`."
quiz:
  - q:
      vi: "Biểu thức `{ t | ¬ (t ∈ students) }` có nghĩa gì?"
      en: "What does the expression `{ t | ¬ (t ∈ students) }` mean?"
    options:
      - { vi: "Một bảng rỗng", en: "An empty table" }
      - { vi: "Mọi bộ có thể tưởng tượng không nằm trong `students`: vô hạn, nên là biểu thức không an toàn", en: "Every imaginable tuple not in `students`: infinite, so it is an unsafe expression" }
      - { vi: "Các học viên bị xóa", en: "The students that were deleted" }
    answer: 1
    trap: 0
    why:
      vi: "Rỗng nghe hợp lý vì phủ định một bảng có vẻ không còn gì, nhưng ở đây biến `t` không bị buộc chạy trên bảng nào, nên mọi bộ có thể tưởng tượng mà không nằm trong `students` đều thỏa: vô số bộ. Phép tính cũng không biết lịch sử, nên không có nghĩa \"học viên đã bị xóa\". Biểu thức an toàn chỉ trả giá trị có trong các quan hệ nhắc tới; SQL ép điều đó vì mọi biến phải được khai báo trong `FROM`."
      en: "Empty sounds right because negating a table seems to leave nothing, but here the variable `t` is not bound to any table, so every imaginable tuple not in `students` qualifies: infinitely many. The calculus knows no history either, so it cannot mean \"students that were deleted\". A safe expression returns only values found in the relations it mentions; SQL enforces this because every variable must be declared in `FROM`."
  - q:
      vi: "Học viên chưa học khóa nào có thỏa `∀ e ∈ took (e.student_id = t.id → e.grade >= 5)` không?"
      en: "Does a student with no course at all satisfy `∀ e ∈ took (e.student_id = t.id → e.grade >= 5)`?"
    options:
      - { vi: "Có: mọi kéo theo có vế trái sai đều đúng", en: "Yes: every implication with a false left side is true" }
      - { vi: "Không: chưa có điểm thì không thể nói điểm đều trên 5", en: "No: without grades you cannot say every grade is above 5" }
    answer: 0
    trap: 1
    why:
      vi: "\"Chưa có điểm thì không kết luận được\" nghe hợp lý, nhưng công thức là một phép kéo theo: với mỗi lượt học `e`, nếu `e` là của học viên này thì điểm ≥ 5. Dung không có lượt học nào, nên vế trái `e.student_id = t.id` sai với mọi `e`, và kéo theo có vế trái sai luôn đúng. Vì vậy câu `NOT EXISTS` trong lab trả cả Dung. Nếu nghiệp vụ cần \"có học và đều đạt\", thêm một `EXISTS` nữa."
      en: "\"Without grades you cannot conclude\" sounds right, but the formula is an implication: for each take `e`, if `e` belongs to this student, the grade is ≥ 5. Dung has no takes, so the left side `e.student_id = t.id` is false for every `e`, and an implication with a false left side is always true. That is why the lab's `NOT EXISTS` query returns Dung too. If the business means \"took something and passed all\", add an `EXISTS`."
---
## Mở bài

Đại số quan hệ nói cách tính kết quả, từng phép một. Phép tính quan hệ chỉ nói kết quả phải thỏa điều gì, giống hệt tinh thần của SQL. Hiểu nó giúp bạn viết các câu "tồn tại" và "với mọi" mà không bị rối.

## Ý chính

**Phép tính quan hệ bộ** (TRC) viết kết quả dạng `{ t | P(t) }`: tập các bộ `t` làm công thức `P` đúng. Công thức ghép từ điều kiện so sánh, `∧`, `∨`, `¬`, và hai lượng từ: ∃ (tồn tại) và ∀ (với mọi). Biến bộ chạy trên một quan hệ, như `t ∈ students`. **Phép tính quan hệ miền** (DRC) dùng biến cho từng giá trị cột thay vì cả bộ: `{ ⟨n, c⟩ | ∃ i (⟨i, n, c⟩ ∈ students) }`.

SQL mượn trực tiếp: biến bộ là bí danh trong `FROM`, ∃ là `EXISTS`. SQL không có ∀, nhưng ∀ x P(x) bằng ¬∃ x ¬P(x), nên "mọi điểm đều ≥ 5" thành "không tồn tại điểm < 5": `NOT EXISTS` với điều kiện bị phủ định.

Một biểu thức có thể trả vô hạn bộ, ví dụ "mọi bộ không thuộc `students`". Biểu thức **an toàn** chỉ trả giá trị lấy từ các quan hệ có mặt trong nó. Codd chứng minh phép tính an toàn và đại số quan hệ có cùng sức biểu diễn: mọi câu viết được bằng cái này đều viết được bằng cái kia. Ngôn ngữ có sức mạnh đó gọi là **đầy đủ quan hệ**; SQL còn hơn thế nhờ gom nhóm, sắp xếp và đệ quy.

Hai bẫy khi dịch ∀ sang SQL. Thứ nhất, ∀ trên tập rỗng luôn đúng: sinh viên chưa có điểm nào vẫn thỏa "mọi điểm đều ≥ 5", nên câu `NOT EXISTS` trả cả họ. Nếu yêu cầu ngầm hiểu "có điểm và mọi điểm đều ≥ 5" thì phải thêm một `EXISTS` nữa. Thứ hai, `NOT IN` không phải ¬∃: khi danh sách con có một NULL, `x NOT IN (…)` không bao giờ đúng, còn `NOT EXISTS` vẫn đúng như logic hai trị của phép tính. Vì vậy dịch phủ định theo phép tính thì dùng `NOT EXISTS`. Bài `e-pg-l4-18` cho thấy ba cách viết "không có" còn khác nhau cả ở kế hoạch.

Hình cuối mục này dùng lại dữ liệu bài phép chia `e-ds-l5-02`: "học đủ mọi môn core" được đọc là "không có môn core nào chưa học".

## Ví dụ

Ký hiệu và câu SQL:

```text
TRC  { t.name | t ∈ students ∧ t.city = 'Hue' }
TRC  { t.name | t ∈ students ∧ ∃ e ∈ took (e.student_id = t.id) }
TRC  { t.name | t ∈ students ∧ ∀ e ∈ took (e.student_id = t.id → e.grade >= 5) }
DRC  { ⟨n⟩ | ∃ i, c (⟨i, n, c⟩ ∈ students ∧ c = 'Hue') }
```

∃: học viên có ít nhất một lượt học.

```sql
SELECT t.name FROM students t
WHERE EXISTS (SELECT 1 FROM took e WHERE e.student_id = t.id)
ORDER BY t.name;
```

∀ thành `NOT EXISTS … NOT`: không có điểm nào dưới 5.

```sql
SELECT t.name FROM students t
WHERE NOT EXISTS (SELECT 1 FROM took e WHERE e.student_id = t.id AND NOT (e.grade >= 5))
ORDER BY t.name;
```

Kết quả gồm Binh, Chi và cả Dung, người chưa học gì: "với mọi" trên tập rỗng là đúng.

Phép tính miền: mỗi biến là một cột.

```sql
SELECT name FROM students WHERE city = 'Hue' ORDER BY name;
```

## Lỗi hay gặp

Viết ∀ bằng `NOT IN` khi bên trong có NULL.

```sql
-- WRONG: one NULL in the list makes NOT IN unknown for every row
CREATE TABLE ex_banned (student_id int);
INSERT INTO ex_banned VALUES (2), (NULL);
SELECT name FROM students WHERE id NOT IN (SELECT student_id FROM ex_banned) ORDER BY name;
```

```sql
-- FIX: NOT EXISTS is the calculus' ¬∃ and ignores the NULL row
SELECT name FROM students t
WHERE NOT EXISTS (SELECT 1 FROM ex_banned b WHERE b.student_id = t.id)
ORDER BY name;
```

Câu sai trả rỗng: `id <> NULL` là "không biết", nên không dòng nào qua. Câu sửa trả An, Chi, Dung.

Biến tự do: trong SQL mọi biến phải được khai báo trong một `FROM`.

```sql
-- ERROR 42P01: missing FROM-clause entry for table "t"
SELECT s.name FROM students s WHERE EXISTS (SELECT 1 FROM took e WHERE e.student_id = t.id);
```

## Tóm tắt

- TRC: `{ t | P(t) }` với biến bộ; DRC: biến cho từng cột.
- ∃ = `EXISTS`; ∀ x P(x) = `NOT EXISTS` với điều kiện bị phủ định.
- Biểu thức an toàn chỉ trả giá trị có trong các quan hệ; SQL ép điều này qua `FROM`.
- Định lý Codd: phép tính an toàn và đại số mạnh ngang nhau.
- Viết ∀ bằng `NOT EXISTS`, không bằng `NOT IN` khi có thể có NULL.

# EN

## Opening

Relational algebra says how to compute a result, one operation at a time. Relational calculus only says what the result must satisfy, exactly the spirit of SQL. Knowing it helps you write "exists" and "for all" queries without getting lost.

## Key idea

**Tuple relational calculus** (TRC) writes a result as `{ t | P(t) }`: the set of tuples `t` that make the formula `P` true. Formulas are built from comparisons, `∧`, `∨`, `¬`, and two quantifiers: ∃ (exists) and ∀ (for all). A tuple variable ranges over a relation, as in `t ∈ students`. **Domain relational calculus** (DRC) uses variables for single column values instead of whole tuples: `{ ⟨n, c⟩ | ∃ i (⟨i, n, c⟩ ∈ students) }`.

SQL borrows directly: a tuple variable is an alias in `FROM`, ∃ is `EXISTS`. SQL has no ∀, but ∀ x P(x) equals ¬∃ x ¬P(x), so "every grade is ≥ 5" becomes "there is no grade < 5": `NOT EXISTS` with the condition negated.

An expression can return infinitely many tuples, for example "every tuple not in `students`". A **safe** expression returns only values taken from the relations it mentions. Codd proved that safe calculus and relational algebra have the same expressive power: anything written in one can be written in the other. A language with that power is called **relationally complete**; SQL goes further with grouping, ordering and recursion.

Two traps when turning ∀ into SQL. First, ∀ over an empty set is always true: a student with no grades still satisfies "every grade is ≥ 5", so the `NOT EXISTS` query returns them too. If the request really means "has grades and every grade is ≥ 5", add one more `EXISTS`. Second, `NOT IN` is not ¬∃: when the subquery's list holds a NULL, `x NOT IN (…)` is never true, while `NOT EXISTS` stays true as in the calculus' two-valued logic. So to translate a negation from the calculus, use `NOT EXISTS`. Lesson `e-pg-l4-18` shows that the three ways to write "has none" also differ in their plans.

The figure at the end of this section reuses the data of the division lesson `e-ds-l5-02`: "took every core course" is read as "no core course not taken".

## Example

Notation and SQL:

```text
TRC  { t.name | t ∈ students ∧ t.city = 'Hue' }
TRC  { t.name | t ∈ students ∧ ∃ e ∈ took (e.student_id = t.id) }
TRC  { t.name | t ∈ students ∧ ∀ e ∈ took (e.student_id = t.id → e.grade >= 5) }
DRC  { ⟨n⟩ | ∃ i, c (⟨i, n, c⟩ ∈ students ∧ c = 'Hue') }
```

∃: students with at least one take.

```sql
SELECT t.name FROM students t
WHERE EXISTS (SELECT 1 FROM took e WHERE e.student_id = t.id)
ORDER BY t.name;
```

∀ becomes `NOT EXISTS … NOT`: no grade below 5.

```sql
SELECT t.name FROM students t
WHERE NOT EXISTS (SELECT 1 FROM took e WHERE e.student_id = t.id AND NOT (e.grade >= 5))
ORDER BY t.name;
```

The result holds Binh, Chi and also Dung, who took nothing: "for all" over an empty set is true.

Domain calculus: each variable is one column.

```sql
SELECT name FROM students WHERE city = 'Hue' ORDER BY name;
```

## Common mistakes

Writing ∀ with `NOT IN` when the inner side has a NULL.

```sql
-- WRONG: one NULL in the list makes NOT IN unknown for every row
CREATE TABLE ex_banned (student_id int);
INSERT INTO ex_banned VALUES (2), (NULL);
SELECT name FROM students WHERE id NOT IN (SELECT student_id FROM ex_banned) ORDER BY name;
```

```sql
-- FIX: NOT EXISTS is the calculus' ¬∃ and ignores the NULL row
SELECT name FROM students t
WHERE NOT EXISTS (SELECT 1 FROM ex_banned b WHERE b.student_id = t.id)
ORDER BY name;
```

The wrong query returns nothing: `id <> NULL` is "unknown", so no row passes. The fix returns An, Chi and Dung.

A free variable: in SQL every variable must be declared in a `FROM`.

```sql
-- ERROR 42P01: missing FROM-clause entry for table "t"
SELECT s.name FROM students s WHERE EXISTS (SELECT 1 FROM took e WHERE e.student_id = t.id);
```

## Recap

- TRC: `{ t | P(t) }` with tuple variables; DRC: variables for single columns.
- ∃ = `EXISTS`; ∀ x P(x) = `NOT EXISTS` with the condition negated.
- A safe expression returns only values found in the relations; SQL enforces it through `FROM`.
- Codd's theorem: safe calculus and the algebra are equally expressive.
- Write ∀ with `NOT EXISTS`, not with `NOT IN` when NULLs are possible.
