---
id: e-pg-l2-03
engine: postgres
level: L2
module: partial-expr
title: Index partial chỉ phủ dòng cần thiết
title_en: Partial indexes cover only the rows you need
kind: lab
runtime: browser
minutes: 14
figures: [{ name: pg-partial-index, at: idea }]
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Tạo index có `WHERE` cho phần nhỏ của bảng mà câu hỏi hay đọc, để index nhỏ và rẻ khi ghi.
    en: Create an index with `WHERE` for the small part of a table your queries read, so it stays small and cheap to maintain.
  - vi: Viết câu hỏi lặp lại đúng điều kiện của index để planner dùng được nó.
    en: Write queries that repeat the index's own condition so the planner can use it.
  - vi: Dùng unique index partial để luật "mỗi người tối đa một việc đang mở" do database giữ.
    en: Use a partial unique index so the database enforces "at most one open task per person".
requires: [e-pg-l2-02]
sources:
  - https://www.postgresql.org/docs/18/indexes-partial.html
  - https://www.postgresql.org/docs/18/sql-createindex.html
lab:
  setup: |
    CREATE TABLE tasks (
      id int PRIMARY KEY,
      owner_id int NOT NULL,
      status text NOT NULL,
      due_date date NOT NULL
    );
    INSERT INTO tasks
    SELECT g, 1 + (g / 50) % 1000,
           CASE WHEN g % 50 = 0 THEN 'open' ELSE 'done' END,
           date '2026-01-01' + (g % 200)
    FROM generate_series(1, 30000) AS g;
    ANALYZE tasks;
  steps:
    - task:
        vi: "Chỉ 2 % việc còn mở, và màn hình chính chỉ hỏi việc đang mở theo hạn. Tạo index tên `tasks_open_due_idx` trên `due_date`, chỉ cho các dòng `status = 'open'`."
        en: "Only 2% of tasks are open, and the main screen only asks for open tasks by due date. Create an index named `tasks_open_due_idx` on `due_date`, only for rows with `status = 'open'`."
      solution: CREATE INDEX tasks_open_due_idx ON tasks (due_date) WHERE status = 'open'
      target: SELECT id, due_date FROM tasks WHERE status = 'open' AND due_date < date '2026-03-01'
      check: catalog
      hint:
        vi: "Thêm `WHERE status = 'open'` vào cuối `CREATE INDEX`."
        en: "Append `WHERE status = 'open'` to the `CREATE INDEX`."
    - task:
        vi: "Lấy `id, due_date` của việc đang mở có hạn trước 2026-03-01. Kế hoạch phải dùng `tasks_open_due_idx`."
        en: "Return `id, due_date` of open tasks due before 2026-03-01. The plan must use `tasks_open_due_idx`."
      solution: SELECT id, due_date FROM tasks WHERE status = 'open' AND due_date < date '2026-03-01'
      check: plan
      hint:
        vi: "Câu phải chứa chính điều kiện của index (`status = 'open'`), nếu không planner không biết index phủ đủ dòng."
        en: "The query must contain the index's own condition (`status = 'open'`), otherwise the planner cannot tell the index covers the rows."
    - task:
        vi: "So kích thước: trả về một cột boolean cho biết `tasks_open_due_idx` có nhỏ hơn `tasks_pkey` không (hàm `pg_relation_size(name)` trả kích thước một quan hệ theo byte)."
        en: "Compare sizes: return one boolean column telling whether `tasks_open_due_idx` is smaller than `tasks_pkey` (the function `pg_relation_size(name)` returns a relation's size in bytes)."
      solution: SELECT pg_relation_size('tasks_open_due_idx') < pg_relation_size('tasks_pkey') AS smaller
      check: rows
      hint:
        vi: "`pg_relation_size('name')` trả số byte của một quan hệ."
        en: "`pg_relation_size('name')` returns a relation's size in bytes."
    - task:
        vi: "Mỗi người chỉ được có tối đa một việc đang mở. Tạo unique index tên `tasks_one_open_idx` trên `owner_id`, chỉ cho dòng `status = 'open'`."
        en: "Each person may have at most one open task. Create a unique index named `tasks_one_open_idx` on `owner_id`, only for rows with `status = 'open'`."
      solution: CREATE UNIQUE INDEX tasks_one_open_idx ON tasks (owner_id) WHERE status = 'open'
      check: catalog
      hint:
        vi: "`CREATE UNIQUE INDEX ... WHERE ...`: chỉ các dòng thỏa điều kiện mới bị bắt không trùng."
        en: "`CREATE UNIQUE INDEX ... WHERE ...`: only rows matching the condition must be unique."
    - task:
        vi: "Đếm số việc đang mở có hạn trong tháng 6/2026 (một cột, một dòng). Bài chấm cả tốc độ: đúng mà không dùng được index partial là chưa đạt."
        en: "Count the open tasks due in June 2026 (one column, one row). Speed is graded too: a right answer that cannot use the partial index does not pass."
      solution: SELECT count(*) FROM tasks WHERE status = 'open' AND due_date BETWEEN date '2026-06-01' AND date '2026-06-30'
      check: rows
      perf: { table: tasks }
      slow: SELECT count(*) FROM tasks WHERE status <> 'done' AND due_date BETWEEN date '2026-06-01' AND date '2026-06-30'
      hint:
        vi: "Viết đúng điều kiện của index, `status = 'open'`, rồi thêm khoảng ngày."
        en: "Write the index's exact condition, `status = 'open'`, then add the date range."
quiz:
  - q:
      vi: "Index là `ON tasks (due_date) WHERE status = 'open'`, và cột `status` chỉ có hai giá trị `open`, `done`. Câu nào dùng được index này?"
      en: "The index is `ON tasks (due_date) WHERE status = 'open'`, and column `status` holds only two values, `open` and `done`. Which query can use it?"
    options:
      - { vi: "`WHERE status <> 'done' AND due_date < date '2026-04-01'`", en: "`WHERE status <> 'done' AND due_date < date '2026-04-01'`" }
      - { vi: "`WHERE status = 'open' AND due_date < date '2026-04-01'`", en: "`WHERE status = 'open' AND due_date < date '2026-04-01'`" }
      - { vi: "`WHERE due_date < date '2026-04-01'`", en: "`WHERE due_date < date '2026-04-01'`" }
    answer: 1
    trap: 0
    why:
      vi: "Với dữ liệu hôm nay, `status <> 'done'` chọn đúng các dòng mở, nhưng planner không nhìn dữ liệu: nó chỉ so biểu thức để chứng minh rằng mọi dòng câu cần đều có trong index. Nó không biết `status` chỉ có hai giá trị, nên không suy được `<> 'done'` thành `= 'open'`, và câu đó thành Seq Scan. Câu không nhắc `status` thì cần cả việc đã xong, những dòng không có trong index, nên index không đủ để trả lời. Chỉ câu lặp đúng `status = 'open'` mới dùng được index."
      en: "With today's data `status <> 'done'` picks exactly the open rows, but the planner does not look at the data: it only compares expressions to prove that every row the query needs is in the index. It does not know `status` has only two values, so it cannot turn `<> 'done'` into `= 'open'`, and that query becomes a Seq Scan. The query that never mentions `status` also needs done tasks, rows the index does not hold, so the index cannot answer it. Only the query that repeats `status = 'open'` exactly can use the index."
  - q:
      vi: "Có `CREATE UNIQUE INDEX ... ON tasks (owner_id) WHERE status = 'open'`. Người 2 đang có một việc mở. Thêm cho người 2 một việc `done` thì sao?"
      en: "There is `CREATE UNIQUE INDEX ... ON tasks (owner_id) WHERE status = 'open'`. Person 2 already has an open task. What happens when you add a `done` task for person 2?"
    options:
      - { vi: "Bị từ chối: `owner_id` đã có trong unique index", en: "Refused: `owner_id` is already in the unique index" }
      - { vi: "Ghi được: dòng `done` không nằm trong index nên không bị kiểm trùng", en: "It goes in: a `done` row is not in the index, so it is not checked for duplicates" }
      - { vi: "Ghi được, nhưng việc mở cũ bị đổi thành `done`", en: "It goes in, but the old open task is changed to `done`" }
    answer: 1
    trap: 0
    why:
      vi: "Bị từ chối nghe hợp lý vì unique thường áp lên cả cột, nhưng unique index partial chỉ chứa các dòng thỏa `WHERE status = 'open'`. Dòng `done` không vào index, nên không có gì để trùng; chỉ việc mở thứ hai của cùng người mới bị lỗi trùng khóa `23505` (unique violation). Postgres cũng không bao giờ tự sửa việc mở cũ: index chỉ kiểm, không ghi dòng nào."
      en: "Refused sounds right because uniqueness usually covers the whole column, but a partial unique index holds only rows matching `WHERE status = 'open'`. A `done` row never enters the index, so there is nothing to clash with; only a second open task for the same person fails with the duplicate-key error `23505` (unique violation). Postgres never edits the old open task either: an index only checks, it writes no row."
---
## Mở bài

Bảng việc có 30.000 dòng, nhưng màn hình chính chỉ hỏi khoảng 600 việc còn mở. Một index trên cả bảng phải giữ và cập nhật cả 29.400 việc đã xong mà không ai tìm tới. Có cách nào chỉ đánh chỉ mục đúng phần bảng bạn thật sự đọc không?

## Ý chính

Index partial là index có thêm `WHERE`: nó chỉ chứa những dòng thỏa điều kiện. Khi câu hỏi luôn nhắm vào một phần nhỏ của bảng (việc đang mở, đơn chưa giao, tài khoản còn hoạt động), index partial nhỏ hơn nhiều nên nằm gọn trong bộ đệm, và một lần ghi vào dòng nằm ngoài điều kiện không phải đụng tới nó.

Planner chỉ dùng index partial khi chứng minh được rằng điều kiện của câu suy ra điều kiện của index. Việc chứng minh này so biểu thức, không nhìn dữ liệu. Vì vậy cách an toàn nhất là lặp lại đúng điều kiện của index trong câu: `WHERE status = 'open' AND ...`. Một số suy luận đơn giản vẫn được, ví dụ `x < 1` suy ra `x < 2`.

Nhiều người nghĩ chỉ cần câu hỏi cùng ý nghĩa với điều kiện của index là đủ. Thật ra `status <> 'done'` chọn đúng các dòng mở với dữ liệu hôm nay, nhưng planner không biết cột chỉ có hai giá trị, nên nó bỏ index và đọc cả bảng.

`CREATE UNIQUE INDEX ... WHERE ...` biến điều kiện thành luật: mỗi `owner_id` chỉ xuất hiện một lần trong các dòng đang mở, còn số việc đã xong thì không giới hạn. Hàm dùng trong điều kiện phải `IMMUTABLE`, vì index được dựng một lần và không tự tính lại theo thời gian.

Hình cuối mục này so kích thước hai index trên `tasks` và hai câu cùng ý nghĩa nhưng ra hai kế hoạch.

## Cú pháp

```sql
CREATE [ UNIQUE ] INDEX [ index_name ] ON table_name [ USING method ]
  ( column_or_expression [, ...] )
  [ INCLUDE ( column [, ...] ) ]
  WHERE predicate;
```

- `WHERE predicate`: chỉ dòng thỏa điều kiện mới vào index; hàm trong đó phải `IMMUTABLE`.
- `UNIQUE`: không trùng, nhưng chỉ xét các dòng thỏa `predicate`.
- Câu hỏi phải có điều kiện suy ra `predicate` thì mới dùng được index.

## Ví dụ

Tạo một index partial cho việc đang mở và xem kế hoạch:

```sql
CREATE INDEX demo_open_due ON tasks (due_date) WHERE status = 'open';
EXPLAIN SELECT id, due_date FROM tasks
WHERE status = 'open' AND due_date < date '2026-02-01';
```

Kế hoạch có `Bitmap Index Scan on demo_open_due` với `Index Cond` chỉ còn khoảng ngày: điều kiện `status` đã nằm sẵn trong định nghĩa index.

```sql
CREATE INDEX demo_due_all ON tasks (due_date);
SELECT pg_size_pretty(pg_relation_size('demo_open_due')) AS partial_size,
       pg_size_pretty(pg_relation_size('demo_due_all')) AS full_size;
DROP INDEX demo_due_all;
```

Cùng cột `due_date`, index partial chỉ `16 kB`, còn index trên cả bảng là `216 kB`, gấp hơn 13 lần. Bản đầy đủ bị xóa ngay để không làm nhiễu các kế hoạch sau.

```sql
CREATE UNIQUE INDEX demo_one_open ON tasks (owner_id) WHERE status = 'open';
INSERT INTO tasks VALUES (90002, 2, 'done', date '2026-05-01')
RETURNING id, owner_id, status;
```

Người 2 đã có một việc mở, nhưng việc `done` mới vẫn ghi được vì nó không thuộc index unique.

## Lỗi hay gặp

Viết điều kiện cùng nghĩa nhưng khác biểu thức:

```sql
-- WRONG: same rows today, but the planner cannot prove it implies status = 'open'
EXPLAIN SELECT id, due_date FROM tasks
WHERE status <> 'done' AND due_date < date '2026-02-01';
```

```sql
-- FIX: repeat the index condition exactly
EXPLAIN SELECT id, due_date FROM tasks
WHERE status = 'open' AND due_date < date '2026-02-01';
```

Câu sai ra `Seq Scan on tasks`. Câu sửa đọc qua một index partial; ở đây planner chọn `demo_one_open` (600 mục) thay vì `demo_open_due`, vì index nào có điều kiện được câu suy ra cũng dùng được. Kết quả giống nhau, chỉ tốc độ khác, nên lỗi này dễ lọt qua kiểm thử.

Thêm việc mở thứ hai cho cùng một người:

```sql
-- ERROR 23505: duplicate key value violates unique constraint "demo_one_open"
INSERT INTO tasks VALUES (90001, 2, 'open', date '2026-05-01');
```

Đây đúng là luật bạn muốn: đóng việc cũ (đổi sang `done`) trước khi mở việc mới.

Dùng hàm thay đổi theo thời gian trong điều kiện:

```sql
-- ERROR 42P17: functions in index predicate must be marked IMMUTABLE
CREATE INDEX demo_future ON tasks (due_date) WHERE due_date > current_date;
```

`current_date` đổi mỗi ngày, còn index thì không tự dựng lại. Hãy dùng một ngày cố định, ví dụ `WHERE due_date > date '2026-06-01'`, và tạo lại index khi mốc đó cũ.

## Thực hành

Bảng `tasks` có 30.000 việc, 600 việc đang mở. Làm một index partial cho màn hình chính, so kích thước, giữ luật một việc mở mỗi người, rồi viết một câu đếm vừa đúng vừa nhanh.

## Tóm tắt

- Index partial chỉ chứa dòng thỏa `WHERE`, nên nhỏ và rẻ khi ghi.
- Câu hỏi phải có điều kiện suy ra điều kiện của index; lặp lại đúng biểu thức là cách chắc nhất.
- Cùng nghĩa với dữ liệu hôm nay chưa đủ: planner so biểu thức, không đọc dữ liệu.
- Unique index partial giữ luật "tối đa một" chỉ trong phần dòng thỏa điều kiện.

# EN

## Opening

The task table has 30,000 rows, but the main screen only asks about some 600 open tasks. An index on the whole table must hold and update 29,400 done tasks nobody ever looks up. Is there a way to index only the part of the table you actually read?

## Key idea

A partial index is an index with a `WHERE`: it holds only the rows that match the condition. When queries always target a small part of a table (open tasks, undelivered orders, active accounts), a partial index is much smaller, so it stays in cache, and a write to a row outside the condition does not touch it.

The planner uses a partial index only when it can prove that the query's condition implies the index's condition. That proof compares expressions; it does not look at the data. So the safest way is to repeat the index's exact condition in the query: `WHERE status = 'open' AND ...`. Some simple reasoning still works, for example `x < 1` implies `x < 2`.

Many people think a query with the same meaning as the index condition is enough. In fact `status <> 'done'` picks exactly the open rows with today's data, but the planner does not know the column has only two values, so it drops the index and reads the whole table.

`CREATE UNIQUE INDEX ... WHERE ...` turns the condition into a rule: each `owner_id` appears once among open rows, while done tasks are unlimited. A function in the condition must be `IMMUTABLE`, because the index is built once and never recomputes itself as time passes.

The figure at the end of this section compares the size of two indexes on `tasks` and two queries with the same meaning but two plans.

## Syntax

```sql
CREATE [ UNIQUE ] INDEX [ index_name ] ON table_name [ USING method ]
  ( column_or_expression [, ...] )
  [ INCLUDE ( column [, ...] ) ]
  WHERE predicate;
```

- `WHERE predicate`: only matching rows enter the index; functions in it must be `IMMUTABLE`.
- `UNIQUE`: no duplicates, but only among rows matching `predicate`.
- A query can use the index only when its condition implies `predicate`.

## Example

Create a partial index for open tasks and look at the plan:

```sql
CREATE INDEX demo_open_due ON tasks (due_date) WHERE status = 'open';
EXPLAIN SELECT id, due_date FROM tasks
WHERE status = 'open' AND due_date < date '2026-02-01';
```

The plan has `Bitmap Index Scan on demo_open_due` with an `Index Cond` holding only the date range: the `status` condition is already part of the index definition.

```sql
CREATE INDEX demo_due_all ON tasks (due_date);
SELECT pg_size_pretty(pg_relation_size('demo_open_due')) AS partial_size,
       pg_size_pretty(pg_relation_size('demo_due_all')) AS full_size;
DROP INDEX demo_due_all;
```

On the same column `due_date`, the partial index is only `16 kB`, while the index on the whole table is `216 kB`, more than 13 times bigger. The full one is dropped right away so it does not muddle the later plans.

```sql
CREATE UNIQUE INDEX demo_one_open ON tasks (owner_id) WHERE status = 'open';
INSERT INTO tasks VALUES (90002, 2, 'done', date '2026-05-01')
RETURNING id, owner_id, status;
```

Person 2 already has an open task, but the new `done` task still goes in because it is not part of the unique index.

## Common mistakes

Writing a condition with the same meaning but a different expression:

```sql
-- WRONG: same rows today, but the planner cannot prove it implies status = 'open'
EXPLAIN SELECT id, due_date FROM tasks
WHERE status <> 'done' AND due_date < date '2026-02-01';
```

```sql
-- FIX: repeat the index condition exactly
EXPLAIN SELECT id, due_date FROM tasks
WHERE status = 'open' AND due_date < date '2026-02-01';
```

The wrong query gives `Seq Scan on tasks`. The fixed one reads through a partial index; here the planner picks `demo_one_open` (600 entries) over `demo_open_due`, because any index whose condition the query implies can be used. The results are the same, only the speed differs, so this mistake slips through tests easily.

Adding a second open task for the same person:

```sql
-- ERROR 23505: duplicate key value violates unique constraint "demo_one_open"
INSERT INTO tasks VALUES (90001, 2, 'open', date '2026-05-01');
```

That is exactly the rule you wanted: close the old task (set it to `done`) before opening a new one.

Using a function that changes over time in the condition:

```sql
-- ERROR 42P17: functions in index predicate must be marked IMMUTABLE
CREATE INDEX demo_future ON tasks (due_date) WHERE due_date > current_date;
```

`current_date` changes every day, but the index never rebuilds itself. Use a fixed date, for example `WHERE due_date > date '2026-06-01'`, and recreate the index when that cut-off gets old.

## Practice

Table `tasks` holds 30,000 tasks, 600 of them open. Build a partial index for the main screen, compare sizes, enforce one open task per person, then write a count that is both right and fast.

## Recap

- A partial index holds only rows matching its `WHERE`, so it is small and cheap to write.
- A query must have a condition that implies the index's condition; repeating the exact expression is the surest way.
- Same meaning with today's data is not enough: the planner compares expressions, it does not read the data.
- A partial unique index enforces "at most one" only among the rows matching its condition.
