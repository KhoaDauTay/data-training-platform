---
id: e-gr-l3-04
engine: graph
level: L3
module: trees
title: "Cây phân cấp: danh sách kề, bảng bao đóng, ltree"
title_en: "Hierarchies: adjacency list, closure table, ltree"
kind: lab
runtime: browser
minutes: 25
figures: [{ name: gr-tree-stores, at: idea }]
objectives:
  - vi: Đọc một nhánh cây từ danh sách kề (`parent_id`) bằng CTE đệ quy dùng được index.
    en: Read a branch of a tree from an adjacency list (`parent_id`) with a recursive CTE that can use an index.
  - vi: Dựng bảng bao đóng (mọi cặp tổ tiên–con cháu kèm độ sâu) và đọc nhánh, đường về gốc bằng một phép nối.
    en: Build a closure table (every ancestor–descendant pair with its depth) and read a branch and the path to the root with one join.
  - vi: So ba cách lưu cây theo chi phí đọc, ghi và chỗ chứa, gồm cả ltree.
    en: Compare three ways to store a tree by read cost, write cost and space, ltree included.
requires: [e-gr-l2-01]
sources:
  - https://www.postgresql.org/docs/18/queries-with.html
  - https://www.postgresql.org/docs/18/ltree.html
  - https://www.postgresql.org/docs/18/indexes-intro.html
lab:
  setup: |
    CREATE TABLE places (
      id int PRIMARY KEY,
      parent_id int REFERENCES places,
      name text NOT NULL
    );
    INSERT INTO places
    SELECT g,
      CASE WHEN g > 1
        THEN (g + 2) / 4 END,
      'P' || g
    FROM generate_series(1, 4000) g;
    CREATE INDEX places_parent
      ON places (parent_id);
    CREATE TABLE closure (
      ancestor int REFERENCES places,
      descendant int REFERENCES places,
      depth int NOT NULL,
      PRIMARY KEY (ancestor, descendant)
    );
    ANALYZE places;
  steps:
    - name: { vi: Nhánh từ kề, en: Branch from adjacency }
      task:
        vi: "Mọi vị trí trong nhánh của vị trí 37 (kể cả 37), kèm độ sâu tính từ 37: trả `id`, `depth`. Bài chấm cả tốc độ: câu phải dùng được index `places_parent`."
        en: "Every place in the branch of place 37 (37 included), with its depth from 37: return `id`, `depth`. Speed is graded too: the query must be able to use index `places_parent`."
      solution: |
        WITH RECURSIVE s(id, depth) AS (
          SELECT 37, 0
          UNION ALL
          SELECT p.id, s.depth + 1
          FROM s JOIN places p
            ON p.parent_id = s.id
        )
        SELECT id, depth FROM s
      check: rows
      perf: { table: places }
      slow: |
        WITH RECURSIVE s(id, depth) AS (
          SELECT 37, 0
          UNION ALL
          SELECT p.id, s.depth + 1
          FROM s JOIN places p
            ON p.parent_id + 0 = s.id
        )
        SELECT id, depth FROM s
      hint:
        vi: "Phần neo là `SELECT 37, 0`; phần đệ quy nối `places` với `ON p.parent_id = s.id`, so thẳng cột để index dùng được. Cây không có vòng nên câu tự dừng."
        en: "The anchor is `SELECT 37, 0`; the recursive part joins `places` `ON p.parent_id = s.id`, comparing the bare column so the index can be used. A tree has no loop, so the query stops by itself."
    - name: { vi: Bảng bao đóng, en: Closure table }
      task:
        vi: "Điền bảng `closure`: mỗi vị trí với chính nó (độ sâu 0) và với mọi con cháu của nó, kèm độ sâu. Lab chấm bằng `SELECT depth, count(*) AS pairs FROM closure GROUP BY depth`."
        en: "Fill table `closure`: each place with itself (depth 0) and with every descendant of it, with the depth. The lab grades it with `SELECT depth, count(*) AS pairs FROM closure GROUP BY depth`."
      solution: |
        INSERT INTO closure
        WITH RECURSIVE c(a, d, depth) AS (
          SELECT id, id, 0 FROM places
          UNION ALL
          SELECT c.a, p.id, c.depth + 1
          FROM c JOIN places p
            ON p.parent_id = c.d
        )
        SELECT a, d, depth FROM c
      after: |
        SELECT depth, count(*) AS pairs
        FROM closure GROUP BY depth
      check: rows
      hint:
        vi: "`INSERT INTO closure WITH RECURSIVE ...`: phần neo cho mọi vị trí cặp (`id`, `id`, 0), phần đệ quy đi xuống từng con."
        en: "`INSERT INTO closure WITH RECURSIVE ...`: the anchor gives every place the pair (`id`, `id`, 0), the recursive part walks down to each child."
    - name: { vi: Nhánh từ bao đóng, en: Branch from closure }
      task:
        vi: "Dùng `closure`: tên các vị trí nằm đúng 2 cấp dưới vị trí 37: trả `name`. Bài chấm cả tốc độ: câu phải dùng được khóa chính của `closure`."
        en: "Using `closure`: the names of the places exactly 2 levels below place 37: return `name`. Speed is graded too: the query must be able to use the primary key of `closure`."
      solution: |
        SELECT p.name
        FROM closure c
        JOIN places p
          ON p.id = c.descendant
        WHERE c.ancestor = 37
          AND c.depth = 2
      check: rows
      perf: { table: closure }
      slow: |
        SELECT p.name
        FROM closure c
        JOIN places p
          ON p.id = c.descendant
        WHERE c.ancestor + 0 = 37
          AND c.depth = 2
      hint:
        vi: "Lọc `c.ancestor = 37 AND c.depth = 2` (cột trần, khóa chính bắt đầu bằng `ancestor`), rồi nối `places` để lấy tên."
        en: "Filter `c.ancestor = 37 AND c.depth = 2` (bare column; the primary key starts with `ancestor`), then join `places` for the name."
    - name: { vi: Về gốc, en: To the root }
      task:
        vi: "Đường từ gốc xuống vị trí 2345: tên mọi tổ tiên của nó và chính nó, gốc trước. Trả `name`, `depth` (khoảng cách tới 2345), xếp theo `depth` giảm dần."
        en: "The path from the root down to place 2345: the names of all its ancestors and itself, root first. Return `name`, `depth` (the distance to 2345), sorted by `depth` descending."
      solution: |
        SELECT p.name, c.depth
        FROM closure c
        JOIN places p
          ON p.id = c.ancestor
        WHERE c.descendant = 2345
        ORDER BY c.depth DESC
      check: rows
      ordered: true
      hint:
        vi: "Đảo vai: lọc `c.descendant = 2345` và nối `places` theo `c.ancestor`; `ORDER BY c.depth DESC` cho gốc trước."
        en: "Swap the roles: filter `c.descendant = 2345` and join `places` on `c.ancestor`; `ORDER BY c.depth DESC` puts the root first."
quiz:
  - q:
      vi: "Cây có 4000 vị trí và sâu 6 cấp. Bảng bao đóng của nó có bao nhiêu dòng?"
      en: "The tree has 4000 places and is 6 levels deep. How many rows does its closure table hold?"
    options:
      - { vi: "3999, mỗi cạnh cha–con một dòng", en: "3999, one row per parent–child edge" }
      - { vi: "26 182, mỗi cặp tổ tiên–con cháu một dòng", en: "26,182, one per ancestor–descendant pair" }
      - { vi: "16 triệu, mọi cặp vị trí", en: "16 million, every pair of places" }
    answer: 1
    trap: 0
    why:
      vi: "Một dòng mỗi cạnh là danh sách kề (`parent_id`), không phải bảng bao đóng. Bảng bao đóng có một dòng cho mỗi vị trí với chính nó và với mỗi tổ tiên: khoảng số vị trí × (độ sâu + 1), ở lab này là 26 182 dòng. Đó là giá của việc đọc nhánh bằng một phép nối: chỗ chứa và việc giữ bảng đúng khi cây đổi."
      en: "One row per edge is the adjacency list (`parent_id`), not the closure table. A closure table holds one row for each place with itself and with each ancestor: about places × (depth + 1), here 26,182 rows. That is the price of reading a branch with one join: space, and keeping the table right when the tree changes."
  - q:
      vi: "Chuyển cả nhánh của vị trí 37 sang cha khác. Cách lưu nào chỉ cần sửa một dòng?"
      en: "Move the whole branch of place 37 under another parent. Which store needs only one row changed?"
    options:
      - { vi: "Bảng bao đóng: nó có đủ mọi cặp", en: "The closure table: it holds every pair" }
      - { vi: "ltree: đường đi nằm sẵn trong nhãn", en: "ltree: the path is already in the label" }
      - { vi: "Danh sách kề: chỉ đổi `parent_id` của 37", en: "Adjacency list: only 37's `parent_id`" }
    answer: 2
    trap: 0
    why:
      vi: "Bảng bao đóng có đủ mọi cặp, nên chuyển nhánh phải xóa và thêm lại mọi cặp nối nhánh với tổ tiên cũ và mới. Với ltree, mỗi vị trí trong nhánh mang cả đường đi trong nhãn, nên cả 85 nhãn phải viết lại. Danh sách kề chỉ lưu cha trực tiếp: đổi `parent_id` của 37 là xong, cái giá nằm ở lúc đọc (CTE đệ quy)."
      en: "The closure table holds every pair, so moving a branch means deleting and re-adding every pair that links the branch to its old and new ancestors. With ltree each place in the branch carries the whole path in its label, so all 85 labels must be rewritten. The adjacency list stores only the direct parent: changing 37's `parent_id` is enough, and the cost moves to reading (a recursive CTE)."
---
## Mở bài

Bãi container chia thành khu, hàng, dãy, ô: một cây vị trí. Cây là đồ thị không có vòng, mỗi nút một cha, và có ba cách lưu quen thuộc trong PostgreSQL. Bài này đo hai cách bằng SQL và so với cách thứ ba, ltree.

## Ý chính

**Danh sách kề.** Mỗi dòng giữ `parent_id`. Ghi rất rẻ: thêm hay chuyển một nhánh là sửa một dòng. Đọc một nhánh cần CTE đệ quy, mỗi vòng một cấp; với index trên `parent_id`, mỗi vòng là một lần tra index cho mỗi nút.

**Bảng bao đóng.** Lưu mọi cặp (tổ tiên, con cháu, độ sâu), kể cả cặp một nút với chính nó. Đọc nhánh, đọc một cấp hay đường về gốc chỉ là một phép lọc và một phép nối, dùng được khóa chính `(ancestor, descendant)`. Giá: khoảng n × (độ sâu + 1) dòng, và mỗi lần cây đổi phải sửa nhiều cặp.

**ltree.** Kiểu `ltree` (bài `e-pg-ext-09` trên Kệ Extension) lưu cả đường đi trong một nhãn như `1.10.37`. Toán tử `<@` hỏi "là con cháu của (hoặc bằng)", và index GiST hỗ trợ nó. Đọc nhánh nhanh và gọn, nhưng chuyển một nhánh phải viết lại nhãn của mọi nút trong nhánh.

**Chọn theo việc chính.** Cây đổi thường xuyên: danh sách kề. Đọc nhánh liên tục trên cây ít đổi: bảng bao đóng hoặc ltree. Cả ba đều cần index đúng cột, nên hai bước của lab chấm cả tốc độ.

## Cú pháp

```sql
-- adjacency: walk down
WITH RECURSIVE s(id) AS (
  SELECT 37
  UNION ALL
  SELECT p.id FROM s
  JOIN places p
    ON p.parent_id = s.id
)
SELECT id FROM s;
-- closure: one filter
SELECT descendant FROM closure
WHERE ancestor = 37;
```

- Index trên `parent_id` cho danh sách kề; khóa chính `(ancestor, descendant)` cho bảng bao đóng.
- So thẳng cột (`p.parent_id = s.id`); bọc cột trong phép tính thì index không dùng được.

## Ví dụ

Các con trực tiếp của gốc:

```sql
SELECT id, name FROM places
WHERE parent_id = 1
ORDER BY id;
```

Số vị trí ở mỗi cấp của nhánh 37:

```sql
WITH RECURSIVE s(id, depth) AS (
  SELECT 37, 0
  UNION ALL
  SELECT p.id, s.depth + 1
  FROM s JOIN places p
    ON p.parent_id = s.id
)
SELECT depth, count(*) AS places
FROM s
GROUP BY depth ORDER BY depth;
```

Dựng bảng bao đóng rồi đếm cặp theo độ sâu:

```sql
INSERT INTO closure
WITH RECURSIVE c(a, d, depth) AS (
  SELECT id, id, 0 FROM places
  UNION ALL
  SELECT c.a, p.id, c.depth + 1
  FROM c JOIN places p
    ON p.parent_id = c.d
)
SELECT a, d, depth FROM c;
SELECT depth, count(*) AS pairs
FROM closure
GROUP BY depth ORDER BY depth;
```

## Lỗi hay gặp

Chỉ nối một lần thì chỉ ra một cấp, không phải cả nhánh:

```sql
-- WRONG: children only
SELECT p.id FROM places p
WHERE p.parent_id = 37;
```

```sql
-- FIX: the whole branch
SELECT descendant AS id
FROM closure
WHERE ancestor = 37
  AND depth > 0;
```

Điền bảng bao đóng lần thứ hai thì đụng khóa chính:

```sql
-- ERROR 23505
INSERT INTO closure
SELECT id, id, 0 FROM places;
```

## Thực hành

Bốn bước: nhánh của vị trí 37 từ danh sách kề (chấm tốc độ), điền bảng bao đóng, các vị trí 2 cấp dưới 37 từ bảng bao đóng (chấm tốc độ), và đường từ gốc tới vị trí 2345.

## Tóm tắt

- Danh sách kề: ghi rẻ, đọc nhánh bằng CTE đệ quy, cần index trên `parent_id`.
- Bảng bao đóng: mọi cặp tổ tiên–con cháu kèm độ sâu; đọc bằng một phép lọc, trả bằng chỗ chứa và công sửa khi cây đổi.
- ltree (bài `e-pg-ext-09`): đường đi trong nhãn, `<@` với index GiST; chuyển nhánh phải viết lại nhãn.
- Chọn theo việc chính của hệ thống: cây hay đổi, hay đọc nhánh liên tục.

# EN

## Opening

A container yard splits into zones, rows, bays and slots: a tree of places. A tree is a graph with no loop and one parent per node, and PostgreSQL has three familiar ways to store it. This lesson measures two of them in SQL and compares them with the third, ltree.

## Key idea

**Adjacency list.** Each row keeps `parent_id`. Writes are very cheap: adding or moving a branch changes one row. Reading a branch needs a recursive CTE, one level per round; with an index on `parent_id`, each round is one index lookup per node.

**Closure table.** It stores every (ancestor, descendant, depth) pair, including each node paired with itself. Reading a branch, one level or the path to the root is a single filter and a single join, able to use the primary key `(ancestor, descendant)`. The price: about n × (depth + 1) rows, and every change to the tree must fix many pairs.

**ltree.** The `ltree` type (lesson `e-pg-ext-09` on the Extensions shelf) stores the whole path in one label such as `1.10.37`. Operator `<@` asks "is a descendant of (or equal to)", and a GiST index supports it. Reading a branch is fast and compact, but moving a branch rewrites the label of every node in it.

**Choose by the main job.** A tree that changes often: adjacency list. Constant branch reads on a tree that rarely changes: closure table or ltree. All three need an index on the right column, so two lab steps grade speed too.

## Syntax

```sql
-- adjacency: walk down
WITH RECURSIVE s(id) AS (
  SELECT 37
  UNION ALL
  SELECT p.id FROM s
  JOIN places p
    ON p.parent_id = s.id
)
SELECT id FROM s;
-- closure: one filter
SELECT descendant FROM closure
WHERE ancestor = 37;
```

- An index on `parent_id` for the adjacency list; the primary key `(ancestor, descendant)` for the closure table.
- Compare the bare column (`p.parent_id = s.id`); wrapping the column in arithmetic stops the index from being used.

## Example

The direct children of the root:

```sql
SELECT id, name FROM places
WHERE parent_id = 1
ORDER BY id;
```

The number of places at each level of branch 37:

```sql
WITH RECURSIVE s(id, depth) AS (
  SELECT 37, 0
  UNION ALL
  SELECT p.id, s.depth + 1
  FROM s JOIN places p
    ON p.parent_id = s.id
)
SELECT depth, count(*) AS places
FROM s
GROUP BY depth ORDER BY depth;
```

Build the closure table, then count the pairs per depth:

```sql
INSERT INTO closure
WITH RECURSIVE c(a, d, depth) AS (
  SELECT id, id, 0 FROM places
  UNION ALL
  SELECT c.a, p.id, c.depth + 1
  FROM c JOIN places p
    ON p.parent_id = c.d
)
SELECT a, d, depth FROM c;
SELECT depth, count(*) AS pairs
FROM closure
GROUP BY depth ORDER BY depth;
```

## Common mistakes

Joining once gives one level, not the whole branch:

```sql
-- WRONG: children only
SELECT p.id FROM places p
WHERE p.parent_id = 37;
```

```sql
-- FIX: the whole branch
SELECT descendant AS id
FROM closure
WHERE ancestor = 37
  AND depth > 0;
```

Filling the closure table a second time hits the primary key:

```sql
-- ERROR 23505
INSERT INTO closure
SELECT id, id, 0 FROM places;
```

## Practice

Four steps: the branch of place 37 from the adjacency list (speed graded), fill the closure table, the places 2 levels below 37 from the closure table (speed graded), and the path from the root to place 2345.

## Recap

- Adjacency list: cheap writes, branch reads with a recursive CTE, needs an index on `parent_id`.
- Closure table: every ancestor–descendant pair with its depth; one-filter reads, paid for with space and the work of fixing it when the tree changes.
- ltree (lesson `e-pg-ext-09`): the path in the label, `<@` with a GiST index; moving a branch rewrites labels.
- Choose by the system's main job: a tree that changes often, or constant branch reads.
