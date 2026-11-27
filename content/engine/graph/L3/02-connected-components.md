---
id: e-gr-l3-02
engine: graph
level: L3
module: algorithms
title: Thành phần liên thông
title_en: Connected components
kind: lab
runtime: browser
minutes: 20
figures: [{ name: gr-components, at: idea }]
objectives:
  - vi: Tìm mọi cảng nối được với từng cảng trên đồ thị vô hướng, bằng `UNION` để câu tự dừng.
    en: Find every port connected to each port on an undirected graph, with `UNION` so the query stops by itself.
  - vi: Gán nhãn thành phần bằng mã nhỏ nhất trong nhóm và đếm cỡ từng thành phần.
    en: Label each component with the smallest code in the group and count each component's size.
requires: [e-gr-l2-01, e-gr-l1-01]
sources:
  - https://www.postgresql.org/docs/18/queries-with.html
  - https://www.postgresql.org/docs/18/sql-createview.html
  - { url: "https://neo4j.com/docs/graph-data-science/current/algorithms/wcc/", title: "Neo4j GDS docs: Weakly Connected Components" }
lab:
  setup: |
    CREATE TABLE ports (code text PRIMARY KEY);
    INSERT INTO ports VALUES
      ('VNDAD'), ('VNSGN'), ('VNHPH'), ('SGSIN'),
      ('HKHKG'), ('NLRTM'), ('DEHAM'), ('BEANR'),
      ('USLAX'), ('USOAK'), ('AUSYD');
    CREATE TABLE links (
      a text REFERENCES ports,
      b text REFERENCES ports,
      PRIMARY KEY (a, b),
      CHECK (a < b)
    );
    INSERT INTO links VALUES
      ('SGSIN', 'VNDAD'), ('SGSIN', 'VNSGN'),
      ('HKHKG', 'VNHPH'), ('HKHKG', 'SGSIN'),
      ('DEHAM', 'NLRTM'), ('BEANR', 'NLRTM'),
      ('USLAX', 'USOAK');
  steps:
    - name: { vi: Hai chiều, en: Both ways }
      task:
        vi: "Bảng `links` lưu mỗi cặp một lần (`a < b`). Tạo view `nbr(src, dst)` có cả hai chiều của mỗi cặp. Lab chấm bằng `SELECT src, dst FROM nbr`."
        en: "Table `links` stores each pair once (`a < b`). Create the view `nbr(src, dst)` holding both directions of each pair. The lab grades it with `SELECT src, dst FROM nbr`."
      solution: |
        CREATE VIEW nbr AS
          SELECT a AS src, b AS dst
          FROM links
          UNION ALL
          SELECT b, a FROM links
      after: SELECT src, dst FROM nbr
      check: rows
      hint:
        vi: "`SELECT a, b ... UNION ALL SELECT b, a ...` trong `CREATE VIEW nbr AS`."
        en: "`SELECT a, b ... UNION ALL SELECT b, a ...` inside `CREATE VIEW nbr AS`."
    - name: { vi: Nhãn, en: Labels }
      task:
        vi: "Gán mỗi cảng (kể cả cảng không có liên kết nào) vào một thành phần, đặt tên bằng mã nhỏ nhất trong thành phần đó: trả `code`, `comp`."
        en: "Put every port (ports with no link included) into a component named after the smallest code in it: return `code`, `comp`."
      solution: |
        WITH RECURSIVE r(start, code) AS (
          SELECT code, code FROM ports
          UNION
          SELECT r.start, n.dst
          FROM r JOIN nbr n
            ON n.src = r.code
        )
        SELECT start AS code,
          min(code) AS comp
        FROM r
        GROUP BY start
      check: rows
      hint:
        vi: "Phần neo lấy mọi cảng làm `start`; `UNION` (không `ALL`) dừng khi không còn cặp mới; `min(code)` theo `start` là nhãn."
        en: "The anchor takes every port as `start`; `UNION` (not `ALL`) stops once no new pair appears; `min(code)` per `start` is the label."
    - name: { vi: Cỡ, en: Sizes }
      task:
        vi: "Mạng có mấy thành phần và mỗi thành phần bao nhiêu cảng? Trả `comp`, `size`, lớn trước, bằng nhau thì mã nhỏ trước."
        en: "How many components does the network have and how many ports in each? Return `comp`, `size`, largest first, ties by the smaller code first."
      solution: |
        WITH RECURSIVE r(start, code) AS (
          SELECT code, code FROM ports
          UNION
          SELECT r.start, n.dst
          FROM r JOIN nbr n
            ON n.src = r.code
        ), c AS (
          SELECT start, min(code) AS comp
          FROM r GROUP BY start
        )
        SELECT comp, count(*) AS size
        FROM c
        GROUP BY comp
        ORDER BY size DESC, comp
      check: rows
      ordered: true
      hint:
        vi: "Đưa câu của bước 2 vào một CTE `c`, rồi đếm theo `comp` và `ORDER BY size DESC, comp`."
        en: "Put the step 2 query into a CTE `c`, then count per `comp` and `ORDER BY size DESC, comp`."
quiz:
  - q:
      vi: "Bỏ view `nbr` và đi thẳng trên `links` (`ON l.a = r.code`, lấy `l.b`). `VNDAD` thuộc thành phần nào?"
      en: "Drop view `nbr` and walk `links` directly (`ON l.a = r.code`, taking `l.b`). Which component does `VNDAD` get?"
    options:
      - { vi: "`HKHKG`, như với `nbr`", en: "`HKHKG`, as with `nbr`" }
      - { vi: "`VNDAD`, nó đứng một mình", en: "`VNDAD`, it stands alone" }
      - { vi: "Câu không dừng", en: "The query never stops" }
    answer: 1
    trap: 0
    why:
      vi: "`links` chỉ lưu (`SGSIN`, `VNDAD`) với `a < b`, nên đi theo `a` tới `b` thì từ `VNDAD` không có cạnh nào ra: nó chỉ tới được chính nó và nhãn là `VNDAD`. Thành phần liên thông bỏ qua hướng (tài liệu Neo4j GDS về WCC nói vậy), nên phải đi cả hai chiều qua `nbr`. Câu vẫn dừng vì dùng `UNION`."
      en: "`links` stores only (`SGSIN`, `VNDAD`) with `a < b`, so walking from `a` to `b` gives `VNDAD` no outgoing edge: it reaches only itself and its label is `VNDAD`. Connected components ignore direction (the Neo4j GDS docs on WCC say so), so the walk must go both ways through `nbr`. The query still stops because it uses `UNION`."
  - q:
      vi: "Vì sao câu ở bước 2 dừng dù `nbr` có cạnh đi về (`VNDAD` tới `SGSIN` rồi `SGSIN` tới `VNDAD`)?"
      en: "Why does the step 2 query stop although `nbr` has edges that come back (`VNDAD` to `SGSIN`, then `SGSIN` to `VNDAD`)?"
    options:
      - { vi: "`UNION` bỏ cặp (`start`, `code`) đã có", en: "`UNION` drops a (`start`, `code`) pair already there" }
      - { vi: "PostgreSQL tự dừng sau 100 vòng", en: "PostgreSQL stops by itself after 100 rounds" }
      - { vi: "`GROUP BY` ở câu ngoài chặn vòng lặp", en: "The outer `GROUP BY` stops the loop" }
    answer: 0
    trap: 2
    why:
      vi: "`GROUP BY` chỉ chạy sau khi CTE đã xong, nên nó không chặn được gì. Với `UNION`, mỗi vòng chỉ giữ cặp mới chưa có; khi mọi cặp đã có, bảng làm việc rỗng và đệ quy dừng (tài liệu PostgreSQL về `WITH RECURSIVE`). Không có giới hạn số vòng tự động nào."
      en: "`GROUP BY` runs only after the CTE has finished, so it stops nothing. With `UNION`, each round keeps only pairs not seen yet; once every pair is there the working table is empty and the recursion stops (the PostgreSQL docs on `WITH RECURSIVE`). There is no automatic round limit."
---
## Mở bài

Cảng nào nối được với cảng nào, nếu đi theo các tuyến feeder cả hai chiều? Câu trả lời chia mạng thành các thành phần liên thông: trong một thành phần, mọi cảng tới được nhau. Bài này tính chúng bằng một CTE đệ quy.

## Ý chính

**Bỏ qua hướng.** Tài liệu Neo4j GDS định nghĩa thành phần liên thông yếu (WCC) là tập nút nối với nhau bằng một đường đi, không xét hướng của quan hệ trên đường. Bảng `links` lưu mỗi cặp một lần (`a < b`), nên view `nbr` thêm chiều ngược bằng `UNION ALL`.

**Tới được từ mọi điểm.** Phần neo cho mỗi cảng một dòng (`start`, `start`), kể cả cảng không có liên kết. Phần đệ quy đi tiếp qua `nbr`. Với `UNION`, cặp (`start`, `code`) đã có bị bỏ, nên câu dừng khi không còn cặp mới, dù đồ thị vô hướng đầy chiều đi về.

**Nhãn = mã nhỏ nhất.** Hai cảng cùng thành phần tới được đúng cùng một tập cảng, nên `min(code)` của tập đó giống nhau: đó là nhãn. GDS cũng đánh số thành phần, nhưng tài liệu nói giá trị số có thể khác giữa các lần chạy; nhãn `min(code)` thì luôn như nhau.

**Giá.** Cách này sinh mọi cặp tới được: một thành phần n cảng cho n × n dòng. Với mạng lớn, hệ thống đồ thị dùng thuật toán riêng; ở quy mô vài nghìn nút, SQL vẫn đủ.

## Cú pháp

```sql
CREATE VIEW nbr AS
  SELECT a AS src, b AS dst FROM links
  UNION ALL
  SELECT b, a FROM links;
WITH RECURSIVE r(start, code) AS (
  SELECT code, code FROM ports
  UNION
  SELECT r.start, n.dst
  FROM r JOIN nbr n
    ON n.src = r.code
)
SELECT start, min(code) AS comp
FROM r GROUP BY start;
```

- Phần neo từ `ports`, không từ `links`, để cảng không có liên kết vẫn có thành phần riêng.
- `UNION` thay `UNION ALL` ở CTE là thứ làm câu dừng.

## Ví dụ

Các liên kết, mỗi cặp một lần:

```sql
SELECT a, b FROM links
ORDER BY a, b;
```

Mọi cảng nối được với `VNDAD`:

```sql
WITH RECURSIVE r(code) AS (
  SELECT 'VNDAD'::text
  UNION
  SELECT CASE WHEN l.a = r.code
    THEN l.b ELSE l.a END
  FROM r JOIN links l
    ON r.code IN (l.a, l.b)
)
SELECT code FROM r ORDER BY code;
```

Bậc (số liên kết) của từng cảng, kể cả 0:

```sql
SELECT p.code,
  (SELECT count(*) FROM links
   WHERE p.code IN (a, b)) AS deg
FROM ports p
ORDER BY deg DESC, p.code;
```

## Lỗi hay gặp

Chỉ đi một chiều trên bảng lưu mỗi cặp một lần làm vỡ thành phần:

```sql
-- WRONG: one direction, VNDAD alone
WITH RECURSIVE r(start, code) AS (
  SELECT code, code FROM ports
  UNION
  SELECT r.start, l.b
  FROM r JOIN links l
    ON l.a = r.code
)
SELECT start, min(code) AS comp
FROM r GROUP BY start;
```

```sql
-- FIX: both directions
WITH RECURSIVE r(start, code) AS (
  SELECT code, code FROM ports
  UNION
  SELECT r.start,
    CASE WHEN l.a = r.code
      THEN l.b ELSE l.a END
  FROM r JOIN links l
    ON r.code IN (l.a, l.b)
)
SELECT start, min(code) AS comp
FROM r GROUP BY start;
```

Phần neo từ `links` thì cảng không có liên kết (`AUSYD`) biến mất:

```sql
-- WRONG: AUSYD missing
SELECT count(DISTINCT x) AS ports
FROM (
  SELECT a AS x FROM links
  UNION ALL
  SELECT b FROM links
) e;
```

```sql
-- FIX: count from ports
SELECT count(*) AS ports FROM ports;
```

## Thực hành

Ba bước: view hai chiều `nbr`, nhãn thành phần của từng cảng, và cỡ của từng thành phần.

## Tóm tắt

- Thành phần liên thông (WCC) bỏ qua hướng: đi cả hai chiều của mỗi cạnh.
- Phần neo lấy mọi nút, kể cả nút không có cạnh; `UNION` làm đệ quy dừng.
- Nhãn thành phần = `min(code)` của tập tới được: ổn định giữa các lần chạy.
- Cách này sinh n × n cặp cho mỗi thành phần: hợp với mạng vừa, không phải mạng khổng lồ.

# EN

## Opening

Which ports can reach which, following the feeder links both ways? The answer splits the network into connected components: inside one component, every port reaches every other. This lesson computes them with a recursive CTE.

## Key idea

**Ignore direction.** The Neo4j GDS docs define weakly connected components (WCC) as sets of nodes joined by a path, without regard to the direction of the relationships on the path. Table `links` stores each pair once (`a < b`), so view `nbr` adds the reverse direction with `UNION ALL`.

**Reachable from every start.** The anchor gives each port one row (`start`, `start`), ports without links included. The recursive part walks on through `nbr`. With `UNION`, a (`start`, `code`) pair already there is dropped, so the query stops once no new pair appears, even though an undirected graph is full of back-and-forth edges.

**Label = smallest code.** Two ports in the same component reach exactly the same set of ports, so the `min(code)` of that set is the same: that is the label. GDS numbers components too, but its docs say the numbers may differ between runs; the `min(code)` label is always the same.

**Cost.** This method produces every reachable pair: a component of n ports gives n × n rows. For large networks a graph system uses a dedicated algorithm; at a few thousand nodes, SQL is still enough.

## Syntax

```sql
CREATE VIEW nbr AS
  SELECT a AS src, b AS dst FROM links
  UNION ALL
  SELECT b, a FROM links;
WITH RECURSIVE r(start, code) AS (
  SELECT code, code FROM ports
  UNION
  SELECT r.start, n.dst
  FROM r JOIN nbr n
    ON n.src = r.code
)
SELECT start, min(code) AS comp
FROM r GROUP BY start;
```

- Anchor on `ports`, not `links`, so a port without links still gets its own component.
- `UNION` instead of `UNION ALL` in the CTE is what makes the query stop.

## Example

The links, each pair once:

```sql
SELECT a, b FROM links
ORDER BY a, b;
```

Every port connected to `VNDAD`:

```sql
WITH RECURSIVE r(code) AS (
  SELECT 'VNDAD'::text
  UNION
  SELECT CASE WHEN l.a = r.code
    THEN l.b ELSE l.a END
  FROM r JOIN links l
    ON r.code IN (l.a, l.b)
)
SELECT code FROM r ORDER BY code;
```

The degree (number of links) of each port, 0 included:

```sql
SELECT p.code,
  (SELECT count(*) FROM links
   WHERE p.code IN (a, b)) AS deg
FROM ports p
ORDER BY deg DESC, p.code;
```

## Common mistakes

Walking one direction on a table that stores each pair once breaks the components apart:

```sql
-- WRONG: one direction, VNDAD alone
WITH RECURSIVE r(start, code) AS (
  SELECT code, code FROM ports
  UNION
  SELECT r.start, l.b
  FROM r JOIN links l
    ON l.a = r.code
)
SELECT start, min(code) AS comp
FROM r GROUP BY start;
```

```sql
-- FIX: both directions
WITH RECURSIVE r(start, code) AS (
  SELECT code, code FROM ports
  UNION
  SELECT r.start,
    CASE WHEN l.a = r.code
      THEN l.b ELSE l.a END
  FROM r JOIN links l
    ON r.code IN (l.a, l.b)
)
SELECT start, min(code) AS comp
FROM r GROUP BY start;
```

Anchoring on `links` loses the port without links (`AUSYD`):

```sql
-- WRONG: AUSYD missing
SELECT count(DISTINCT x) AS ports
FROM (
  SELECT a AS x FROM links
  UNION ALL
  SELECT b FROM links
) e;
```

```sql
-- FIX: count from ports
SELECT count(*) AS ports FROM ports;
```

## Practice

Three steps: the two-way view `nbr`, each port's component label, and each component's size.

## Recap

- Connected components (WCC) ignore direction: walk both ways of each edge.
- The anchor takes every node, nodes without edges included; `UNION` makes the recursion stop.
- Component label = the `min(code)` of the reachable set: stable between runs.
- This method produces n × n pairs per component: fine for a medium network, not a huge one.
