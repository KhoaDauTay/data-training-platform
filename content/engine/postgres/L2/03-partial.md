---
id: e-pg-l2-03
engine: postgres
level: L2
module: partial-expr
title: Index partial chỉ phủ dòng cần thiết
title_en: Partial indexes cover only the rows you need
kind: lab
runtime: browser
minutes: 12
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
objectives:
  - vi: Tạo index có `WHERE` cho phần nhỏ của bảng mà câu hỏi hay đọc, để index nhỏ và rẻ khi ghi.
    en: Create an index with `WHERE` for the small part of a table your queries read, so it stays small and cheap to maintain.
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
        vi: "So kích thước: trả về một cột boolean cho biết `tasks_open_due_idx` có nhỏ hơn `tasks_pkey` không."
        en: "Compare sizes: return one boolean column telling whether `tasks_open_due_idx` is smaller than `tasks_pkey`."
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
---
## Ý chính

Index partial là index có thêm `WHERE`: nó chỉ chứa những dòng thỏa điều kiện. Khi câu hỏi luôn nhắm vào một phần nhỏ của bảng (việc đang mở, đơn chưa giao, tài khoản còn hoạt động), index partial:

- nhỏ hơn nhiều, nên nằm gọn trong bộ đệm;
- không phải cập nhật khi ghi các dòng nằm ngoài điều kiện;
- chỉ được dùng khi điều kiện của câu suy ra được điều kiện của index. Câu `WHERE status = 'open' AND ...` dùng được; câu không nhắc `status` thì không.

`CREATE UNIQUE INDEX ... WHERE ...` biến điều kiện thành luật: mỗi `owner_id` chỉ xuất hiện một lần trong các dòng đang mở, còn số việc đã xong thì không giới hạn.

## Ví dụ

```sql
CREATE UNIQUE INDEX demo_one_open ON tasks (owner_id) WHERE status = 'open';
-- ERROR: duplicate key value violates unique constraint "demo_one_open"
INSERT INTO tasks VALUES (90001, 2, 'open', date '2026-05-01');
INSERT INTO tasks VALUES (90002, 2, 'done', date '2026-05-01');
```

Người 2 đã có một việc mở, nên việc mở thứ hai bị từ chối; việc đã xong thì vẫn ghi được.

## Thực hành

Bảng `tasks` có 30.000 việc, 600 việc đang mở. Làm một index partial cho màn hình chính, so kích thước, rồi giữ luật một việc mở mỗi người.

# EN

## Key idea

A partial index is an index with a `WHERE`: it holds only the rows that match the condition. When queries always target a small part of a table (open tasks, undelivered orders, active accounts), a partial index:

- is much smaller, so it stays in cache;
- needs no update when rows outside the condition are written;
- is used only when the query's condition implies the index's condition. A query with `WHERE status = 'open' AND ...` can use it; one that never mentions `status` cannot.

`CREATE UNIQUE INDEX ... WHERE ...` turns the condition into a rule: each `owner_id` appears once among open rows, while done tasks are unlimited.

## Example

```sql
CREATE UNIQUE INDEX demo_one_open ON tasks (owner_id) WHERE status = 'open';
-- ERROR: duplicate key value violates unique constraint "demo_one_open"
INSERT INTO tasks VALUES (90001, 2, 'open', date '2026-05-01');
INSERT INTO tasks VALUES (90002, 2, 'done', date '2026-05-01');
```

Person 2 already has an open task, so a second open one is refused; a done task still goes in.

## Practice

Table `tasks` holds 30,000 tasks, 600 of them open. Build a partial index for the main screen, compare sizes, then enforce one open task per person.
