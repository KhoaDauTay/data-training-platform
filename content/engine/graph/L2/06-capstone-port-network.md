---
id: e-gr-l2-06
engine: graph
level: L2
module: choose
title: "Tổng hợp: mạng cảng của Cargo Query"
title_en: "Capstone: the Cargo Query port network"
kind: capstone
runtime: browser
minutes: 35
figures: [{ name: gr-port-network, at: idea }]
objectives:
  - vi: Biến bảng tuyến có cảng trung chuyển (`via_port`) thành bảng cạnh.
    en: Turn a lane table with a transshipment port (`via_port`) into an edge table.
  - vi: Tìm các đường đi có tối đa một lần trung chuyển và đường ít chặng nhất trên đồ thị có vòng.
    en: Find the routes with at most one transshipment and the fewest legs on a graph with a loop.
  - vi: Phát hiện vòng tàu chạy và cảng không tới được.
    en: Detect the loop ships run and the ports that cannot be reached.
requires: [e-gr-l2-03, e-gr-l2-02]
sources:
  - { url: https://www.postgresql.org/docs/18/queries-with.html, title_vi: "Truy vấn WITH (CTE)" }
  - { url: https://www.postgresql.org/docs/18/sql-createview.html, title_vi: "CREATE VIEW" }
  - { url: "https://neo4j.com/docs/cypher-manual/current/patterns/variable-length-patterns/", title: "Cypher Manual: Variable-length patterns", title_vi: "Cypher Manual: mẫu độ dài thay đổi" }
lab:
  setup: |
    CREATE TABLE ports (code text PRIMARY KEY);
    INSERT INTO ports VALUES
      ('VNDAD'), ('VNSGN'), ('SGSIN'), ('KRPUS'),
      ('NLRTM'), ('AUSYD'), ('USLAX');
    CREATE TABLE lanes (
      pol text NOT NULL REFERENCES ports,
      pod text NOT NULL REFERENCES ports,
      via_port text REFERENCES ports,
      sea_days numeric(4, 1) NOT NULL,
      PRIMARY KEY (pol, pod)
    );
    INSERT INTO lanes VALUES
      ('VNDAD', 'SGSIN', NULL, 3.2),
      ('VNDAD', 'KRPUS', NULL, 5.8),
      ('VNDAD', 'NLRTM', 'SGSIN', 30.2),
      ('VNDAD', 'USLAX', 'KRPUS', 19.8),
      ('VNSGN', 'SGSIN', NULL, 2.2),
      ('SGSIN', 'NLRTM', NULL, 27.0),
      ('SGSIN', 'AUSYD', NULL, 12.4),
      ('KRPUS', 'USLAX', NULL, 14.0),
      ('USLAX', 'VNDAD', NULL, 18.0);
  steps:
    - name: { vi: Cạnh, en: Edges }
      task:
        vi: "Tạo view `legs(src, dst)`: mỗi tuyến không có `via_port` là một cạnh `pol` tới `pod`; tuyến có `via_port` là hai cạnh, `pol` tới `via_port` và `via_port` tới `pod`. Mỗi cạnh chỉ một lần. Lab chấm bằng `SELECT src, dst FROM legs`."
        en: "Create the view `legs(src, dst)`: a lane without `via_port` is one edge from `pol` to `pod`; a lane with `via_port` is two edges, `pol` to `via_port` and `via_port` to `pod`. Each edge once. The lab grades it with `SELECT src, dst FROM legs`."
      solution: |
        CREATE VIEW legs AS
          SELECT pol AS src,
            coalesce(via_port, pod) AS dst
          FROM lanes
          UNION
          SELECT via_port, pod
          FROM lanes
          WHERE via_port IS NOT NULL
      after: SELECT src, dst FROM legs
      check: rows
      hint:
        vi: "`coalesce(via_port, pod)` cho chặng đầu của mọi tuyến; `UNION` thêm chặng `via_port` tới `pod` và bỏ cạnh trùng."
        en: "`coalesce(via_port, pod)` gives every lane's first leg; `UNION` adds the `via_port` to `pod` leg and drops duplicate edges."
    - name: { vi: "≤ 1 trung chuyển", en: "≤ 1 transshipment" }
      task:
        vi: "Mọi đường đi từ Đà Nẵng (`VNDAD`) trên `legs` có tối đa một lần trung chuyển (tối đa 2 chặng): trả `route` (các mã nối bằng `>`) và `transships` (0 hoặc 1)."
        en: "Every route from Da Nang (`VNDAD`) over `legs` with at most one transshipment (at most 2 legs): return `route` (the codes joined with `>`) and `transships` (0 or 1)."
      solution: |
        WITH RECURSIVE r(code, n, route)
        AS (
          SELECT 'VNDAD'::text, 0, 'VNDAD'
          UNION ALL
          SELECT l.dst, r.n + 1,
            r.route || '>' || l.dst
          FROM r JOIN legs l
            ON l.src = r.code
          WHERE r.n < 2
        )
        SELECT route, n - 1 AS transships
        FROM r
        WHERE n > 0
      check: rows
      hint:
        vi: "Chặn ở phần đệ quy bằng `WHERE r.n < 2`; số lần trung chuyển là số chặng trừ 1."
        en: "Stop in the recursive part with `WHERE r.n < 2`; the transshipment count is the leg count minus 1."
    - name: { vi: Từ USLAX, en: From USLAX }
      task:
        vi: "Từ Los Angeles (`USLAX`), mỗi cảng khác tới được với ít chặng nhất là bao nhiêu? Đồ thị có vòng: dùng `CYCLE` để câu dừng. Trả `code`, `legs`."
        en: "From Los Angeles (`USLAX`), what is the fewest legs to each other port it can reach? The graph has a loop: use `CYCLE` so the query stops. Return `code`, `legs`."
      solution: |
        WITH RECURSIVE r(code, n) AS (
          SELECT 'USLAX'::text, 0
          UNION ALL
          SELECT l.dst, r.n + 1
          FROM r JOIN legs l
            ON l.src = r.code
        ) CYCLE code SET is_cycle
          USING path
        SELECT code, min(n) AS legs
        FROM r
        WHERE NOT is_cycle
          AND code <> 'USLAX'
        GROUP BY code
      check: rows
      hint:
        vi: "`CYCLE code SET is_cycle USING path` sau CTE; bỏ dòng `is_cycle`, rồi `min(n)` theo `code`."
        en: "`CYCLE code SET is_cycle USING path` after the CTE; drop the `is_cycle` rows, then `min(n)` per `code`."
    - name: { vi: Vòng, en: Loop }
      task:
        vi: "Những cảng nào nằm trên một vòng (tàu rời cảng rồi quay về đúng cảng đó)? Trả `code`, mỗi cảng một lần."
        en: "Which ports lie on a loop (a ship leaves the port and comes back to the same port)? Return `code`, each port once."
      solution: |
        WITH RECURSIVE r(start, code) AS (
          SELECT code, code FROM ports
          UNION ALL
          SELECT r.start, l.dst
          FROM r JOIN legs l
            ON l.src = r.code
        ) CYCLE code SET is_cycle
          USING path
        SELECT DISTINCT start AS code
        FROM r
        WHERE is_cycle AND code = start
      check: rows
      hint:
        vi: "Lấy mọi cảng làm `start`, rồi giữ dòng có `is_cycle` và `code = start`."
        en: "Take every port as `start`, then keep the rows with `is_cycle` and `code = start`."
    - name: { vi: Không tới được, en: Unreachable }
      task:
        vi: "Cảng nào `VNDAD` không bao giờ tới được, dù đi bao nhiêu chặng? Trả `code`, không tính `VNDAD`."
        en: "Which ports can `VNDAD` never reach, however many legs it takes? Return `code`, `VNDAD` left out."
      solution: |
        WITH RECURSIVE r(code) AS (
          SELECT 'VNDAD'::text
          UNION
          SELECT l.dst
          FROM r JOIN legs l
            ON l.src = r.code
        )
        SELECT p.code FROM ports p
        WHERE p.code <> 'VNDAD'
          AND p.code NOT IN (
            SELECT code FROM r)
      check: rows
      hint:
        vi: "`UNION` (không `ALL`) tự dừng khi không còn cảng mới; rồi lấy các cảng `NOT IN` tập đó."
        en: "`UNION` (not `ALL`) stops by itself once no new port appears; then take the ports `NOT IN` that set."
quiz:
  - q:
      vi: "Tuyến (`VNDAD`, `NLRTM`) có `via_port` là `SGSIN`. Nó cho view `legs` mấy cạnh?"
      en: "Lane (`VNDAD`, `NLRTM`) has `via_port` `SGSIN`. How many edges does it give the view `legs`?"
    options:
      - { vi: "Một cạnh, từ `VNDAD` tới `NLRTM`", en: "One edge, `VNDAD` to `NLRTM`" }
      - { vi: "Hai cạnh, qua `SGSIN`", en: "Two edges, through `SGSIN`" }
      - { vi: "Ba cạnh, kể cả `SGSIN` tới `VNDAD`", en: "Three, `SGSIN` to `VNDAD` too" }
    answer: 1
    trap: 0
    why:
      vi: "Một tuyến là một dòng của `lanes`, nên dễ nghĩ nó là một cạnh; nhưng tàu thật dừng ở `SGSIN`, nên đồ thị phải có hai chặng: `VNDAD` tới `SGSIN` và `SGSIN` tới `NLRTM`. Nếu giữ một cạnh thẳng, đường qua `SGSIN` tới `AUSYD` sẽ thiếu chặng đầu chung. Chiều ngược `SGSIN` tới `VNDAD` không có trong tuyến này."
      en: "A lane is one row of `lanes`, so it is easy to think of it as one edge; but the ship really stops at `SGSIN`, so the graph needs two legs: `VNDAD` to `SGSIN` and `SGSIN` to `NLRTM`. Keeping one straight edge would hide the shared first leg of the route through `SGSIN` to `AUSYD`. The reverse, `SGSIN` to `VNDAD`, is not part of this lane."
  - q:
      vi: "Mạng có vòng `VNDAD>KRPUS>USLAX>VNDAD`. Bước 4 của lab trả những cảng nào?"
      en: "The network has the loop `VNDAD>KRPUS>USLAX>VNDAD`. Which ports does step 4 of the lab return?"
    options:
      - { vi: "Mọi cảng tới được từ `USLAX`", en: "Every port reachable from `USLAX`" }
      - { vi: "Chỉ `VNDAD`, nơi vòng bắt đầu", en: "Only `VNDAD`, where the loop starts" }
      - { vi: "`VNDAD`, `KRPUS` và `USLAX`", en: "`VNDAD`, `KRPUS` and `USLAX`" }
    answer: 2
    trap: 1
    why:
      vi: "Một vòng không có điểm bắt đầu riêng: xuất phát từ `KRPUS` hay `USLAX` cũng quay về đúng cảng đó, nên cả ba cảng trên vòng đều được trả. `SGSIN` tới được từ `USLAX` nhưng không có đường quay về `SGSIN`, nên không nằm trên vòng nào."
      en: "A loop has no special starting point: starting at `KRPUS` or `USLAX` also comes back to that same port, so all three ports on the loop are returned. `SGSIN` is reachable from `USLAX` but has no route back to `SGSIN`, so it lies on no loop."
---
## Mở bài

Bảng tuyến của Cargo Query ghi cảng đi, cảng đến và cảng trung chuyển (`via_port`), giống bảng `lane_profiles` của Logistics. Bài tổng hợp này dựng đồ thị từ bảng đó, tìm đường có tối đa một lần trung chuyển và phát hiện vòng tàu chạy.

## Ý chính

**Từ tuyến tới cạnh.** Một tuyến không có `via_port` là một chặng; một tuyến có `via_port` là hai chặng nối nhau ở cảng trung chuyển. View `legs` gom mọi chặng thành một bảng cạnh, mỗi cạnh một lần nhờ `UNION`. Sau bước này mọi câu hỏi chỉ đọc `legs`.

**Tối đa một lần trung chuyển.** Một lần trung chuyển là hai chặng. Chặn độ sâu ở phần đệ quy (`WHERE r.n < 2`) cho mọi đường dài 1 hoặc 2 chặng, kể cả những đường không có trong bảng tuyến, như `VNDAD>SGSIN>AUSYD`.

**Vòng.** Tuyến về không (`USLAX` tới `VNDAD`) đóng vòng `VNDAD>KRPUS>USLAX>VNDAD`. Từ đây câu đệ quy không chặn sẽ chạy tới khi lab hết giờ, nên mọi câu đi qua vòng cần `CYCLE` hoặc `UNION` không kèm cột đếm. Cảng nằm trên vòng là cảng có đường quay về chính nó.

**Không tới được.** Tập cảng tới được từ `VNDAD` tính bằng `UNION`; phần còn lại của bảng `ports` là cảng không tới được.

Cùng câu tối đa hai chặng trong Cypher:

```text
MATCH p = (a:Port {code: 'VNDAD'})
  -[:LEG]->{1,2}(b:Port)
RETURN [n IN nodes(p) | n.code]
```

## Cú pháp

```sql
-- lanes to edges
CREATE VIEW legs AS
  SELECT pol AS src,
    coalesce(via_port, pod) AS dst
  FROM lanes
  UNION
  SELECT via_port, pod FROM lanes
  WHERE via_port IS NOT NULL;
-- loops back to the start
... ) CYCLE code SET is_cycle
  USING path
SELECT start FROM r
WHERE is_cycle AND code = start;
```

- `coalesce(via_port, pod)`: chặng đầu tới cảng trung chuyển nếu có, nếu không thì tới cảng đến.
- Đổi view bằng `CREATE OR REPLACE VIEW`.

## Ví dụ

Bảng tuyến, tuyến có cảng trung chuyển trước:

```sql
SELECT pol, pod, via_port, sea_days
FROM lanes
ORDER BY via_port NULLS LAST, pol, pod;
```

Dựng bảng cạnh và xem nó:

```sql
CREATE VIEW legs AS
  SELECT pol AS src,
    coalesce(via_port, pod) AS dst
  FROM lanes
  UNION
  SELECT via_port, pod FROM lanes
  WHERE via_port IS NOT NULL;
SELECT src, dst FROM legs
ORDER BY src, dst;
```

Mọi đường từ `VNDAD`, đường quay lại được đánh dấu:

```sql
WITH RECURSIVE r(code, route) AS (
  SELECT 'VNDAD'::text, 'VNDAD'
  UNION ALL
  SELECT l.dst,
    r.route || '>' || l.dst
  FROM r JOIN legs l
    ON l.src = r.code
) CYCLE code SET is_cycle
  USING path
SELECT route, is_cycle FROM r;
```

## Lỗi hay gặp

Chỉ đọc bảng tuyến thì thiếu đường ghép từ hai tuyến, như `VNDAD>SGSIN>AUSYD`:

```sql
-- WRONG: lanes only, AUSYD missing
SELECT pod AS code FROM lanes
WHERE pol = 'VNDAD';
```

```sql
-- FIX: walk the edges, 2 legs max
WITH RECURSIVE r(code, n) AS (
  SELECT 'VNDAD'::text, 0
  UNION ALL
  SELECT l.dst, r.n + 1
  FROM r JOIN legs l
    ON l.src = r.code
  WHERE r.n < 2
)
SELECT DISTINCT code FROM r
WHERE n > 0;
```

Coi tuyến có trung chuyển là một cạnh thẳng thì mất chặng tới cảng trung chuyển:

```sql
-- WRONG: via_port ignored
SELECT pol AS src, pod AS dst
FROM lanes;
```

```sql
-- FIX: split at via_port
SELECT src, dst FROM legs;
```

Tạo lại view đã có thì bị từ chối; dùng `CREATE OR REPLACE VIEW`:

```sql
-- ERROR 42P07
CREATE VIEW legs AS
  SELECT pol AS src, pod AS dst
  FROM lanes;
```

## Thực hành

Năm bước: dựng bảng cạnh, đường có tối đa một lần trung chuyển, ít chặng nhất từ `USLAX`, cảng nằm trên vòng, và cảng không tới được.

## Tóm tắt

- Tuyến có `via_port` là hai cạnh; view `legs` với `UNION` gom mọi chặng một lần.
- Tối đa một lần trung chuyển = tối đa 2 chặng: chặn bằng `WHERE r.n < 2`.
- Trên đồ thị có vòng, dùng `CYCLE` (hoặc `UNION` không cột đếm) để câu dừng.
- Cảng trên vòng: `is_cycle` và `code = start`; cảng không tới được: `NOT IN` tập tới được.

# EN

## Opening

Cargo Query's lane table records the port of loading, the port of discharge and the transshipment port (`via_port`), like the `lane_profiles` table of the Logistics domain. This capstone builds a graph from that table, finds the routes with at most one transshipment and detects the loop ships run.

## Key idea

**From lanes to edges.** A lane without `via_port` is one leg; a lane with `via_port` is two legs joined at the transshipment port. View `legs` gathers every leg into one edge table, each edge once thanks to `UNION`. After this step every question reads only `legs`.

**At most one transshipment.** One transshipment is two legs. Capping the depth in the recursive part (`WHERE r.n < 2`) gives every route of 1 or 2 legs, including routes that are not in the lane table, such as `VNDAD>SGSIN>AUSYD`.

**The loop.** The return lane (`USLAX` to `VNDAD`) closes the loop `VNDAD>KRPUS>USLAX>VNDAD`. From then on an unguarded recursive query runs until the lab's time limit, so every query that passes the loop needs `CYCLE`, or a `UNION` without a counter column. A port on a loop is a port with a route back to itself.

**Unreachable.** The set of ports reachable from `VNDAD` comes from a `UNION`; the rest of table `ports` is the unreachable ones.

The same two-leg-maximum query in Cypher:

```text
MATCH p = (a:Port {code: 'VNDAD'})
  -[:LEG]->{1,2}(b:Port)
RETURN [n IN nodes(p) | n.code]
```

## Syntax

```sql
-- lanes to edges
CREATE VIEW legs AS
  SELECT pol AS src,
    coalesce(via_port, pod) AS dst
  FROM lanes
  UNION
  SELECT via_port, pod FROM lanes
  WHERE via_port IS NOT NULL;
-- loops back to the start
... ) CYCLE code SET is_cycle
  USING path
SELECT start FROM r
WHERE is_cycle AND code = start;
```

- `coalesce(via_port, pod)`: the first leg goes to the transshipment port if there is one, else to the port of discharge.
- Change a view with `CREATE OR REPLACE VIEW`.

## Example

The lane table, lanes with a transshipment port first:

```sql
SELECT pol, pod, via_port, sea_days
FROM lanes
ORDER BY via_port NULLS LAST, pol, pod;
```

Build the edge table and look at it:

```sql
CREATE VIEW legs AS
  SELECT pol AS src,
    coalesce(via_port, pod) AS dst
  FROM lanes
  UNION
  SELECT via_port, pod FROM lanes
  WHERE via_port IS NOT NULL;
SELECT src, dst FROM legs
ORDER BY src, dst;
```

Every route from `VNDAD`, the route that comes back marked:

```sql
WITH RECURSIVE r(code, route) AS (
  SELECT 'VNDAD'::text, 'VNDAD'
  UNION ALL
  SELECT l.dst,
    r.route || '>' || l.dst
  FROM r JOIN legs l
    ON l.src = r.code
) CYCLE code SET is_cycle
  USING path
SELECT route, is_cycle FROM r;
```

## Common mistakes

Reading only the lane table misses routes made of two lanes, such as `VNDAD>SGSIN>AUSYD`:

```sql
-- WRONG: lanes only, AUSYD missing
SELECT pod AS code FROM lanes
WHERE pol = 'VNDAD';
```

```sql
-- FIX: walk the edges, 2 legs max
WITH RECURSIVE r(code, n) AS (
  SELECT 'VNDAD'::text, 0
  UNION ALL
  SELECT l.dst, r.n + 1
  FROM r JOIN legs l
    ON l.src = r.code
  WHERE r.n < 2
)
SELECT DISTINCT code FROM r
WHERE n > 0;
```

Treating a lane with a transshipment as one straight edge loses the leg to the transshipment port:

```sql
-- WRONG: via_port ignored
SELECT pol AS src, pod AS dst
FROM lanes;
```

```sql
-- FIX: split at via_port
SELECT src, dst FROM legs;
```

Creating a view that already exists is refused; use `CREATE OR REPLACE VIEW`:

```sql
-- ERROR 42P07
CREATE VIEW legs AS
  SELECT pol AS src, pod AS dst
  FROM lanes;
```

## Practice

Five steps: build the edge table, routes with at most one transshipment, the fewest legs from `USLAX`, the ports on a loop, and the unreachable ports.

## Recap

- A lane with `via_port` is two edges; view `legs` with `UNION` gathers each leg once.
- At most one transshipment = at most 2 legs: cap with `WHERE r.n < 2`.
- On a graph with a loop, use `CYCLE` (or a `UNION` without a counter) so the query stops.
- Ports on a loop: `is_cycle` and `code = start`; unreachable ports: `NOT IN` the reachable set.
