---
id: e-ds-l5-01
engine: design
level: L5
module: algebra
title: Đại số quan hệ và SQL
title_en: Relational algebra and SQL
kind: concept
runtime: browser
minutes: 15
objectives:
  - vi: Đọc được một biểu thức đại số quan hệ (σ, π, ρ, ∪, −, ∩, ×, ⋈, γ) và viết câu SQL tương ứng.
    en: Read a relational algebra expression (σ, π, ρ, ∪, −, ∩, ×, ⋈, γ) and write the matching SQL.
  - vi: "Biết chỗ SQL lệch khỏi đại số: SQL giữ dòng trùng, đại số thì không."
    en: "Know where SQL departs from the algebra: SQL keeps duplicate rows, the algebra does not."
  - vi: Tránh hai bẫy hay gặp là `NATURAL JOIN` và phép hợp không cùng số cột.
    en: Avoid two common traps, `NATURAL JOIN` and a union whose sides have different column counts.
requires: [e-ds-l1-02]
sources:
  - https://doi.org/10.1145/362384.362685
  - https://www.postgresql.org/docs/18/queries-table-expressions.html
  - https://www.postgresql.org/docs/18/queries-union.html
lab:
  setup: |
    CREATE TABLE emp (id int PRIMARY KEY, name text NOT NULL, dept_id int NOT NULL, city text NOT NULL);
    CREATE TABLE dept (id int PRIMARY KEY, title text NOT NULL);
    INSERT INTO dept VALUES (1, 'sales'), (2, 'ops'), (3, 'it'), (4, 'legal');
    INSERT INTO emp VALUES (1, 'An', 1, 'Hue'), (2, 'Binh', 2, 'Hue'), (3, 'Chi', 3, 'Da Nang'), (4, 'An', 3, 'Hue'), (5, 'Dung', 1, 'Hoi An');
  steps:
    - task:
        vi: "Viết SQL cho `π name (σ city = 'Hue' (emp))`. Nhớ: phép chiếu của đại số trả một tập, không có dòng trùng."
        en: "Write the SQL for `π name (σ city = 'Hue' (emp))`. Remember: the algebra's projection returns a set, with no duplicate rows."
      solution: SELECT DISTINCT name FROM emp WHERE city = 'Hue'
      check: rows
      hint:
        vi: "σ là `WHERE`, π là danh sách cột, và phép chiếu bỏ trùng nên cần `DISTINCT`."
        en: "σ is `WHERE`, π is the column list, and projection removes duplicates, so you need `DISTINCT`."
    - task:
        vi: "Viết SQL cho `π emp.name, dept.title (emp ⋈ emp.dept_id = dept.id dept)`: tên nhân viên và tên phòng."
        en: "Write the SQL for `π emp.name, dept.title (emp ⋈ emp.dept_id = dept.id dept)`: employee names and department titles."
      solution: SELECT DISTINCT e.name, d.title FROM emp e JOIN dept d ON e.dept_id = d.id
      check: rows
      hint:
        vi: "Phép nối theta là `JOIN … ON` với điều kiện viết sau ký hiệu ⋈; vẫn là phép chiếu nên `DISTINCT`."
        en: "A theta join is `JOIN … ON` with the condition written after ⋈; it is still a projection, so `DISTINCT`."
    - task:
        vi: "Viết SQL cho `π id (dept) − π dept_id (emp)`: mã các phòng chưa có ai."
        en: "Write the SQL for `π id (dept) − π dept_id (emp)`: the ids of departments with nobody in them."
      solution: SELECT id FROM dept EXCEPT SELECT dept_id FROM emp
      check: rows
      hint:
        vi: "Phép trừ tập là `EXCEPT`; hai vế phải cùng số cột và kiểu tương thích."
        en: "Set difference is `EXCEPT`; both sides need the same number of columns and compatible types."
quiz:
  - q:
      vi: "`π city (emp)` trên bảng có năm nhân viên ở ba thành phố trả mấy bộ?"
      en: "How many tuples does `π city (emp)` return on a table with five employees in three cities?"
    options:
      - { vi: "Năm, mỗi nhân viên một bộ", en: "Five, one per employee" }
      - { vi: "Ba, vì quan hệ là tập nên các bộ trùng gộp lại", en: "Three, because a relation is a set and equal tuples merge" }
      - { vi: "Không biết được nếu không có khóa", en: "It cannot be known without a key" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì `SELECT city FROM emp` trả năm dòng, nhưng đó là SQL, không phải đại số. Kết quả của phép chiếu là một quan hệ, tức một tập: ba thành phố, ba bộ."
      en: "It sounds right because `SELECT city FROM emp` returns five rows, but that is SQL, not the algebra. A projection returns a relation, which is a set: three cities, three tuples."
  - q:
      vi: "Phép nào sau đây có thể viết lại bằng các phép khác, nên không thuộc tập phép cơ bản?"
      en: "Which operator can be rewritten with the others, so it is not one of the basic operators?"
    options:
      - { vi: "Phép giao ∩, vì `R ∩ S = R − (R − S)`", en: "Intersection ∩, because `R ∩ S = R − (R − S)`" }
      - { vi: "Phép chọn σ", en: "Selection σ" }
      - { vi: "Phép tích ×", en: "Product ×" }
    answer: 0
    trap: 2
    why:
      vi: "Nhiều người nghĩ tích × là phép phụ vì ít ai viết nó. Thật ra tích là phép cơ bản; phép nối mới là tích cộng phép chọn, và phép giao là hai lần phép trừ."
      en: "Many people think × is a derived operator because nobody writes it. In fact the product is basic; a join is a product followed by a selection, and intersection is two differences."
---
## Mở bài

Bạn viết SQL để nói muốn gì, còn database phải tự tìm cách lấy. Cách nó làm là đổi câu SQL thành một cây phép toán trên bảng, gọi là đại số quan hệ. Hiểu đại số giúp bạn đọc kế hoạch thực thi và đoán đúng một câu sẽ trả gì.

## Ý chính

Đại số quan hệ là một bộ phép toán, mỗi phép nhận một hoặc hai quan hệ và trả một quan hệ mới, nên có thể lồng nhau như biểu thức số học. Phép một ngôi: **chọn** σ giữ các bộ thỏa điều kiện (`WHERE`), **chiếu** π giữ một số thuộc tính (danh sách cột), **đổi tên** ρ (`AS`). Phép tập: **hợp** ∪, **trừ** −, **giao** ∩, đòi hai vế cùng số thuộc tính và miền tương thích. **Tích** × ghép mọi cặp bộ (`CROSS JOIN`).

Từ các phép cơ bản suy ra phép **nối** ⋈: tích rồi chọn. Nối theta có điều kiện tùy ý, nối bằng chỉ dùng `=`, nối tự nhiên ghép theo mọi thuộc tính trùng tên, nối ngoài giữ bộ không có cặp. Đại số mở rộng thêm **gom nhóm** γ (`GROUP BY` với hàm tổng hợp).

Khác biệt quan trọng: đại số làm trên tập, SQL làm trên đa tập. `SELECT city FROM emp` giữ dòng trùng; muốn đúng phép chiếu phải `DISTINCT`. `UNION` bỏ trùng như đại số, `UNION ALL` thì không.

SQL không chỉ có truy vấn. Lệnh chia thành bốn nhóm: DDL định nghĩa cấu trúc (`CREATE`, `ALTER`, `DROP`), DML đọc và ghi dữ liệu (`SELECT`, `INSERT`, `UPDATE`, `DELETE`), DCL phân quyền (`GRANT`, `REVOKE`), TCL điều khiển giao dịch (`BEGIN`, `COMMIT`, `ROLLBACK`). Đại số chỉ mô tả phần đọc.

Hai biểu thức **tương đương** khi cho cùng kết quả trên mọi dữ liệu, và optimizer sống nhờ điều đó. Nó đẩy phép chọn xuống sát bảng (σ trước ⋈) để phép nối nhận ít bộ hơn, đổi chỗ và nhóm lại các phép nối (⋈ giao hoán và kết hợp) để tìm thứ tự rẻ nhất, gộp các phép chiếu liên tiếp thành một. Trong `EXPLAIN`, dòng `Filter` ngay dưới một `Seq Scan` là phép chọn đã được đẩy xuống, và thứ tự các nút `Join` là thứ tự nối planner chọn. Planner làm việc trên cây đại số, nên viết bảng nào trước trong `FROM` thường không đổi kế hoạch. Ngoại lệ là chỗ luật không cho đổi: nối ngoài không giao hoán tùy ý, và điều kiện đặt ở `ON` khác ở `WHERE`. Bài `e-pg-l4-05` xem điều này trên kế hoạch thật.

## Ví dụ

Ký hiệu đại số và câu SQL tương ứng:

```text
σ city = 'Hue' (emp)                 SELECT * FROM emp WHERE city = 'Hue'
π name (emp)                         SELECT DISTINCT name FROM emp
ρ e (emp)                            FROM emp AS e
emp × dept                           FROM emp CROSS JOIN dept
emp ⋈ emp.dept_id = dept.id dept     FROM emp JOIN dept ON emp.dept_id = dept.id
R ∪ S, R − S, R ∩ S                  UNION, EXCEPT, INTERSECT
dept_id γ count(*) (emp)             SELECT dept_id, count(*) FROM emp GROUP BY dept_id
```

Phép tích rồi phép chọn chính là phép nối:

```sql
SELECT e.name, d.title
FROM emp e CROSS JOIN dept d
WHERE e.dept_id = d.id
ORDER BY e.id;
```

Phép giao: thành phố vừa có nhân viên phòng 1 vừa có nhân viên phòng 3.

```sql
SELECT city FROM emp WHERE dept_id = 1
INTERSECT
SELECT city FROM emp WHERE dept_id = 3;
```

Gom nhóm γ: số người mỗi phòng.

```sql
SELECT dept_id, count(*) AS people FROM emp GROUP BY dept_id ORDER BY dept_id;
```

## Lỗi hay gặp

Quên rằng phép chiếu bỏ trùng.

```sql
-- WRONG: SQL keeps one row per employee, so 'An' appears twice
SELECT name FROM emp WHERE city = 'Hue';
```

```sql
-- FIX: DISTINCT gives the algebra's projection
SELECT DISTINCT name FROM emp WHERE city = 'Hue';
```

`NATURAL JOIN` nối theo mọi cột trùng tên, kể cả cột bạn không nghĩ tới.

```sql
-- WRONG: both tables have a column id, so NATURAL JOIN matches emp.id = dept.id
SELECT name, title FROM emp NATURAL JOIN dept ORDER BY name, title;
```

```sql
-- FIX: name the join condition
SELECT e.name, d.title FROM emp e JOIN dept d ON e.dept_id = d.id ORDER BY e.name, d.title;
```

Câu sai ghép nhân viên số 2 với phòng số 2 chỉ vì trùng số; câu sửa ghép theo đúng phòng.

Phép hợp đòi hai vế tương thích.

```sql
-- ERROR 42601: each UNION query must have the same number of columns
SELECT id, name FROM emp UNION SELECT id FROM dept;
```

## Tóm tắt

- σ = `WHERE`, π = danh sách cột (cộng `DISTINCT`), ρ = `AS`, × = `CROSS JOIN`, ⋈ = `JOIN … ON`.
- ∪, −, ∩ = `UNION`, `EXCEPT`, `INTERSECT`; hai vế cùng số cột, kiểu tương thích.
- Đại số làm trên tập, SQL trên đa tập: dòng trùng chỉ mất khi bạn yêu cầu.
- Đừng dùng `NATURAL JOIN`: điều kiện nối phải viết ra.

# EN

## Opening

You write SQL to say what you want, and the database must find a way to get it. It does so by turning the query into a tree of operations on tables, called relational algebra. Knowing the algebra helps you read execution plans and predict what a query returns.

## Key idea

Relational algebra is a set of operators, each taking one or two relations and returning a new relation, so they nest like arithmetic. Unary operators: **selection** σ keeps the tuples that satisfy a condition (`WHERE`), **projection** π keeps some attributes (the column list), **rename** ρ (`AS`). Set operators: **union** ∪, **difference** −, **intersection** ∩ need both sides to have the same number of attributes with compatible domains. **Product** × pairs every tuple with every tuple (`CROSS JOIN`).

The **join** ⋈ is derived from the basic operators: a product, then a selection. A theta join has any condition, an equi-join uses only `=`, a natural join matches every attribute with the same name, an outer join keeps tuples without a partner. The extended algebra adds **grouping** γ (`GROUP BY` with aggregates).

An important difference: the algebra works on sets, SQL on multisets. `SELECT city FROM emp` keeps duplicate rows; the true projection needs `DISTINCT`. `UNION` removes duplicates like the algebra, `UNION ALL` does not.

SQL is more than queries. Statements fall into four groups: DDL defines structure (`CREATE`, `ALTER`, `DROP`), DML reads and writes data (`SELECT`, `INSERT`, `UPDATE`, `DELETE`), DCL grants access (`GRANT`, `REVOKE`), TCL controls transactions (`BEGIN`, `COMMIT`, `ROLLBACK`). The algebra describes only the reading part.

Two expressions are **equivalent** when they give the same result on every database, and the optimizer lives on that. It pushes selections down next to the tables (σ before ⋈) so joins receive fewer tuples, swaps and regroups joins (⋈ is commutative and associative) to find the cheapest order, and merges consecutive projections into one. In `EXPLAIN`, a `Filter` line right under a `Seq Scan` is a selection that was pushed down, and the order of the `Join` nodes is the join order the planner chose. Because the planner works on the algebra tree, not on the order of the words you typed, which table you write first in `FROM` usually does not change the plan. The exceptions are where the rules forbid a swap: outer joins do not commute freely, and a condition in `ON` is not the same as one in `WHERE`. Lesson `e-pg-l4-05` looks at this on real plans.

## Example

Algebra notation and the matching SQL:

```text
σ city = 'Hue' (emp)                 SELECT * FROM emp WHERE city = 'Hue'
π name (emp)                         SELECT DISTINCT name FROM emp
ρ e (emp)                            FROM emp AS e
emp × dept                           FROM emp CROSS JOIN dept
emp ⋈ emp.dept_id = dept.id dept     FROM emp JOIN dept ON emp.dept_id = dept.id
R ∪ S, R − S, R ∩ S                  UNION, EXCEPT, INTERSECT
dept_id γ count(*) (emp)             SELECT dept_id, count(*) FROM emp GROUP BY dept_id
```

A product followed by a selection is a join:

```sql
SELECT e.name, d.title
FROM emp e CROSS JOIN dept d
WHERE e.dept_id = d.id
ORDER BY e.id;
```

Intersection: cities that have staff from department 1 and from department 3.

```sql
SELECT city FROM emp WHERE dept_id = 1
INTERSECT
SELECT city FROM emp WHERE dept_id = 3;
```

Grouping γ: people per department.

```sql
SELECT dept_id, count(*) AS people FROM emp GROUP BY dept_id ORDER BY dept_id;
```

## Common mistakes

Forgetting that projection removes duplicates.

```sql
-- WRONG: SQL keeps one row per employee, so 'An' appears twice
SELECT name FROM emp WHERE city = 'Hue';
```

```sql
-- FIX: DISTINCT gives the algebra's projection
SELECT DISTINCT name FROM emp WHERE city = 'Hue';
```

`NATURAL JOIN` matches every column with the same name, including ones you did not think of.

```sql
-- WRONG: both tables have a column id, so NATURAL JOIN matches emp.id = dept.id
SELECT name, title FROM emp NATURAL JOIN dept ORDER BY name, title;
```

```sql
-- FIX: name the join condition
SELECT e.name, d.title FROM emp e JOIN dept d ON e.dept_id = d.id ORDER BY e.name, d.title;
```

The wrong query pairs employee 2 with department 2 only because the numbers match; the fix pairs each person with their real department.

A union needs compatible sides.

```sql
-- ERROR 42601: each UNION query must have the same number of columns
SELECT id, name FROM emp UNION SELECT id FROM dept;
```

## Recap

- σ = `WHERE`, π = the column list (plus `DISTINCT`), ρ = `AS`, × = `CROSS JOIN`, ⋈ = `JOIN … ON`.
- ∪, −, ∩ = `UNION`, `EXCEPT`, `INTERSECT`; both sides need the same column count and compatible types.
- The algebra works on sets, SQL on multisets: duplicates go only when you ask.
- Avoid `NATURAL JOIN`: write the join condition out.
