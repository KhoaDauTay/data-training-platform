# Research lấp lỗ kế hoạch truy vấn: window, anti join, CTE (Postgres) và tổng tính trước (DynamoDB)

Đây là vòng 11 của luồng research thường trực (L215.6). Vòng 10 (`research-engine-compare-v28.md` §0 mục 5, §3.3 mục 2–3) tìm ra bốn lỗ:

- Postgres Engine không có bài nào về kế hoạch của hàm cửa sổ (`WindowAgg`);
- không có bài về anti join (`NOT EXISTS` / `NOT IN` / `LEFT JOIN … IS NULL`);
- không có bài về CTE được inline hay materialize (từ PG 12);
- DynamoDB không có bài về tổng tính trước (materialized aggregation).

Tài liệu này viết **brief sẵn để viết bài**, chưa phải bài hoàn chỉnh. Mỗi brief có setup, nhiệm vụ, kế hoạch và chi phí đo thật, câu `predict` cùng hiểu lầm nó nhắm tới, và chỗ đặt bài. Người viết bài theo `engine-writing-style.md` và luật `predict` ở `engine-pedagogy.md` §1.2.

**Thông tin chung:**

- **Ngày:** 2026-11-20.
- **Phạm vi:** chỉ tài liệu. Không code app, không build, không gọi AWS.
- **Runtime đã chạy:** đúng bản repo ghim, trong Node:
  - PGlite 0.5.16 (`PostgreSQL 18.6 (PGlite 0.5.16) on wasm32-unknown-emscripten`);
  - `@dynoxide/wasm-engine` 1.5.0.
- **Script:** `scratchpad/r11/` (ngoài repo): `pg.mjs`, `pg2.mjs`, `pg3.mjs`, `dy.mjs`. Mỗi file kết thúc bằng `ALL ASSERTIONS PASSED`, trừ `pg2.mjs` chỉ có một `assert`. Xem phụ lục A.
- **Đo ở tầng thư viện**, như vòng 10. Trên `v22-engine`, runner DynamoDB đã nhận `ExecuteStatement` và `ExecuteTransaction` (`src/engine/dynamo/engine.ts`, tập `WRITES`/`CAPACITY`). Lab Postgres đổi được `work_mem` qua `set_config(…, true)` trong một hàm của `setup`, như `e-pg-l3-14`.

**Quy ước trích dẫn** (giống vòng 9, 10):

- Câu trong ngoặc kép là nguyên văn, mỗi câu dưới 15 từ.
- Trang AWS: công cụ fetch trả nguyên trang, tôi đọc thấy nguyên văn.
- Trang PostgreSQL: câu trích do công cụ fetch rút ra, ghi *(qua fetch)*.
- Chi phí là `cost` của planner (`EXPLAIN` không ANALYZE), không bao giờ là mili giây (luật ch11). `rows=` là ước lượng, trừ chỗ ghi "thật" (`EXPLAIN ANALYZE`).

**Dữ liệu chung cho cả ba brief Postgres** (cùng dáng `e-pg-l4-04`, chỉ thêm cột ngày và cho `customer_id` được NULL):

```sql
DROP TABLE IF EXISTS orders, customers CASCADE;
CREATE TABLE customers (id int PRIMARY KEY, region int NOT NULL);
INSERT INTO customers SELECT g, g % 5 FROM generate_series(1, 600) g;
CREATE TABLE orders (id int PRIMARY KEY, customer_id int REFERENCES customers, created_on date NOT NULL, amount int NOT NULL);
INSERT INTO orders SELECT g, (g * 37) % 500 + 1, date '2026-01-01' + (g * 7) % 300, g % 997 FROM generate_series(1, 20000) g;
ANALYZE customers, orders;
```

- 600 khách, 20.000 đơn. Đơn chỉ thuộc khách 1–500, mỗi khách 40 đơn. Vậy **đúng 100 khách không có đơn nào** (501–600).
- Không có index nào ngoài hai khóa chính. Mỗi brief ghi rõ index nào được tạo thêm trước kế hoạch nào.

---

## 0. Tóm tắt

| Brief | Bài đề xuất | Cấp, mô-đun | Số đo chính |
|---|---|---|---|
| P1 Window | "Hàm cửa sổ cần dữ liệu đã sắp" (`lab` + `predict`) | L4, mô-đun mới `analytic-plans` | Không index: `WindowAgg ← Sort ← Seq Scan`, cost `2187.77`. Index `(customer_id, created_on, id)`: Sort biến mất, cost `1452.29`. Hai cửa sổ khác thứ tự: hai Sort, cost `3966.54`. Lọc một khách: vẫn Sort (`85.99`), vì Bitmap rẻ hơn Index Scan có sẵn thứ tự (`141.69`) |
| P2 Anti join | "Ba cách viết 'không có', ba kế hoạch" (`predict` + `lab`) | L4, `analytic-plans` | `NOT EXISTS` → `Hash Right Anti Join` (ước 100, thật 100). `NOT IN` → `hashed SubPlan`, ước 300. Một đơn có `customer_id` NULL: `NOT IN` ra **0** dòng, hai cách kia vẫn 100. `work_mem` 64kB: `NOT IN` thành SubPlan thường, cost `161415.75`; `NOT EXISTS` giữ `563.44` |
| P3 CTE | "CTE: inline hay tính riêng?" (`predict` + `quiz`) | L4, `analytic-plans` | CTE dùng một lần: inline, `Bitmap Index Scan`, cost `84.24`. `MATERIALIZED`: `CTE Scan` + `Filter`, cost `759.11`. CTE dùng hai lần (dáng ví dụ của docs): mặc định `1409.9`, `NOT MATERIALIZED` `352.43`. Phản ví dụ: CTE có `GROUP BY` dùng hai lần, `NOT MATERIALIZED` **đắt hơn** (`500.77` so với `437.77`) |
| D1 Tổng tính trước | "Không có SUM: tính sẵn tổng theo tháng" (`lab` + `predict`) | L4, `patterns` (DynamoDB) | Scan + cộng ở ứng dụng: 1.510 item, 9,5 RCU. Query GSI sparse `byMonth`: 3 item, 0,5 RCU. `ExecuteTransaction` (INSERT đơn + UPDATE bộ đếm): 6 WCU trên dynoxide. Retry: transaction bị hủy (`DuplicateItem`), còn `ADD` đếm trùng (371 thay vì 370) |

**Kiểm chứng `SET stock = stock - 2` trong PartiQL** (vòng 10 §A4 để ngỏ):

- Trang "PartiQL operators" của AWS liệt kê `+` ("Add") và `-` ("Subtract") là toán tử số học của PartiQL for DynamoDB.
- Trang "PartiQL update statements" chỉ liệt kê ba phép cho SET: `LIST_APPEND`, `SET_ADD`, `SET_DELETE`. **Không có ví dụ UPDATE nào dùng phép cộng hay trừ.**
- `SET Price = Price - :p` có ví dụ chính thức, nhưng ở **update expression của `UpdateItem`**, không phải PartiQL. Trang đó không làm chứng cho PartiQL.
- **Kết luận:** toán tử có trong docs, nhưng việc dùng nó trong `UPDATE … SET` của PartiQL thì AWS **chưa có ví dụ**. Câu đó chạy đúng trên dynoxide 1.5.0 (§4). Bài nào dùng nó phải ghi nhãn "chạy bằng dynoxide" và nên kèm bản `UpdateItem` (`SET x = x - :n` + `ConditionExpression`), là dạng AWS có ví dụ.

**Phát hiện phụ** (chi tiết ở §5):

1. `LEFT JOIN … WHERE o.id IS NULL` (dạng của thẻ `e-bp-a11`) **không** được đổi thành anti join trên PG 18.6: kế hoạch là `Hash Right Join` + `Filter`, ước **1** dòng, thật 100. Viết `WHERE o.customer_id IS NULL` (cột của điều kiện nối) thì thành `Hash Right Anti Join`, ước 100.
2. Dòng `Window:` của EXPLAIN in `ORDER BY orders.amount`, **mất chữ `DESC`**, dù `Sort Key` có `DESC` và kết quả đúng thứ tự giảm. Bài phải trích `Sort Key`, không trích dòng `Window:`.
3. dynoxide không trả `ConsumedCapacity` khi transaction bị hủy. AWS nói capacity vẫn bị tính ("This capacity is consumed even when a transaction does not succeed.").

---

## 1. Brief P1: hàm cửa sổ cần dữ liệu đã sắp

### 1.1 Ý cần dạy

- Docs: hàm cửa sổ chạy sau `GROUP BY`/`HAVING` ("evaluated after any grouping, aggregation, and `HAVING` filtering") và "window functions always require presorted data" *(qua fetch, queries-table-expressions 18, §7.2.5)*.
- Nút `WindowAgg` không tự sắp. Nút con phải đưa dòng theo đúng `PARTITION BY` + `ORDER BY`: hoặc `Sort`, hoặc một index có sẵn thứ tự đó, hoặc `Incremental Sort` khi index có sẵn phần đầu.
- Các hàm dùng **cùng** cửa sổ dùng chung một lần sắp. Docs: chúng "guaranteed to see the same ordering of the input rows" *(qua fetch)*. Hai cửa sổ khác thứ tự thì cần hai lần sắp.
- Lọc "top N mỗi nhóm" bằng `row_number() … WHERE rn <= 3`: PG 18 đẩy điều kiện vào `WindowAgg` thành `Run Condition`, nhưng **vẫn phải sắp cả bảng**. (Release note PG 15 chỉ nói "Improve the performance of window functions that use `row_number()`…" *(qua fetch)*, không nói tên `Run Condition`, nên bài chỉ trích output đo được, không gắn số phiên bản.)
- `rank() OVER (ORDER BY amount DESC)` hiện thành `ROWS UNBOUNDED PRECEDING`: PG 16 "Allow window functions to use the faster `ROWS` mode internally…" *(qua fetch, release 16)*. Chỉ là chú thích, không phải ý chính.

### 1.2 Setup và các bước

Setup = dữ liệu chung. Kế hoạch đo thật (`EXPLAIN`, chi phí của nút trên cùng):

| # | Câu | Index có | Kế hoạch | Cost |
|---|---|---|---|---|
| W1 | `SELECT customer_id, created_on, amount, sum(amount) OVER (PARTITION BY customer_id ORDER BY created_on, id) AS running FROM orders` | chỉ khóa chính | `WindowAgg ← Sort (customer_id, created_on, id) ← Seq Scan` | `2187.77` |
| W-cùng | `sum(…) OVER w, row_number() OVER w … WINDOW w AS (PARTITION BY customer_id ORDER BY created_on, id)` | chỉ khóa chính | **một** `WindowAgg ← Sort ← Seq Scan` | `2237.77` |
| W-tiền tố | `sum(…) OVER (PARTITION BY customer_id ORDER BY created_on, id)`, `count(*) OVER (PARTITION BY customer_id)` | chỉ khóa chính | `WindowAgg ← WindowAgg ← Sort ← Seq Scan` (một Sort, hai WindowAgg) | `2487.77` |
| W2 | `sum(…) OVER (PARTITION BY customer_id ORDER BY created_on, id)`, `rank() OVER (ORDER BY amount DESC)` | chỉ khóa chính | `WindowAgg ← Sort ← WindowAgg ← Sort (amount DESC) ← Seq Scan` (**hai** Sort) | `3966.54` |
| W3 | `SELECT * FROM (SELECT customer_id, id, amount, row_number() OVER (PARTITION BY customer_id ORDER BY amount DESC, id) AS rn FROM orders) t WHERE rn <= 3` | chỉ khóa chính | `WindowAgg` + `Run Condition: (row_number() OVER w1 <= 3)` ← `Sort` ← `Seq Scan`; trả 1.500 dòng | `2187.77` |
| W4 | `SELECT created_on, amount, sum(amount) OVER (ORDER BY created_on, id) AS running FROM orders WHERE customer_id = 42` | chỉ khóa chính | `WindowAgg ← Sort ← Seq Scan (Filter)` | `360.86` |
| W1 | như trên | `+ orders_cust_day (customer_id, created_on, id)` | `WindowAgg ← Index Scan using orders_cust_day` (**không Sort**) | `1452.29` |
| W1 + `LIMIT 10` | như trên | `+ orders_cust_day` | `Limit ← WindowAgg ← Index Scan` | `1.09` |
| W4 | như trên | `+ orders_cust_day` | `WindowAgg ← Sort ← Bitmap Heap Scan ← Bitmap Index Scan on orders_cust_day` (**vẫn Sort**) | `85.99` |
| W4, `enable_bitmapscan = off` | như trên | `+ orders_cust_day` | `WindowAgg ← Index Scan using orders_cust_day` (không Sort) | `141.69` |
| W3 | như trên | `+ orders_customer_idx (customer_id)` | `WindowAgg ← Incremental Sort (Presorted Key: orders.customer_id) ← Index Scan` | `2008.48` |

Ghi chú:

- Index `orders_cust_day` có `id` ở cuối để khớp đủ `ORDER BY created_on, id`. Thiếu `id` thì index chỉ có sẵn tiền tố và planner cần `Incremental Sort`.
- W4 sau index là chỗ đáng dạy nhất: index có đúng thứ tự, nhưng chỉ 40 dòng nên Bitmap (đọc theo trang) + Sort 40 dòng rẻ hơn. Đây là PG1 ("có index thì luôn dùng") ở dạng mới.
- `W3` với `orders_customer_idx` đo cùng lúc có cả hai index (`pg2.mjs`, `pg3.mjs`). Bài muốn trích kế hoạch này thì setup tạo **chỉ** `orders_customer_idx` rồi `ANALYZE`, và chạy lại test `expect`.
- `EXPLAIN ANALYZE` của W3 (index `(customer_id)`): `WindowAgg (actual rows=1500.00)`, `Incremental Sort … Full-sort Groups: 500 … Peak Memory: 18kB`, `Storage: Memory  Maximum Storage: 17kB`.

### 1.3 Nhiệm vụ cho người học

1. **Lab bước 1 (`check: plan`):** "Tổng tiền cộng dồn theo từng khách, theo ngày rồi mã đơn" (W1). Đọc nút nằm ngay dưới `WindowAgg`.
2. **`predict` (trước bước 2).** Đề xuất như sau, cần `expect` (ADD-4):
   - Câu hỏi: "Tạo index `(customer_id, created_on, id)` rồi chạy lại W1. Nút nằm ngay dưới `WindowAgg` là gì?"
   - Lựa chọn:
     - (a) `Index Scan using orders_cust_day`, không còn `Sort` (**đúng**: cost `2187.77` → `1452.29`);
     - (b) vẫn `Sort` trên `Seq Scan`, vì hàm cửa sổ luôn tự sắp (**hiểu lầm PG9**);
     - (c) `Index Only Scan` (sai một chi tiết: `amount` không có trong index);
     - (d) `Incremental Sort` (sai một chi tiết: index đã có đủ ba cột của thứ tự).
   - `expect: { node: Index Scan, table: orders }`.
3. **Lab bước 2 (`check: plan`):** tạo index cho W1 rồi chạy lại. Solution là `CREATE INDEX`, nên bước đi qua `runLab` như index lab ch11, câu đích là W1 (ADD-4 `target`).
4. **`predict` thứ hai:**
   - Câu hỏi: "Cùng index đó, nhưng chỉ khách 42 (W4). Còn `Sort` không?"
   - Lựa chọn:
     - (a) Còn: `Bitmap Heap Scan` + `Sort` 40 dòng, cost `85.99`, rẻ hơn `Index Scan` có sẵn thứ tự (`141.69`) (**đúng**);
     - (b) Không, có index đúng thứ tự thì planner luôn bỏ Sort (**PG1/PG9**);
     - (c) `Seq Scan` + `Sort` (sai: index vẫn được dùng để lọc).
   - `expect: { node: Bitmap Heap Scan, table: orders }`. Kèm kiểm thêm có nút `Sort`; nếu ADD-4 chỉ kiểm một nút thì kiểm `Sort`.
5. **`quiz`:** "W2 có hai cửa sổ khác thứ tự. Mấy nút `Sort`?" Đáp án: 2, cost `3966.54`. Lựa chọn sai: 1 ("mọi hàm cửa sổ dùng chung một lần sắp"), 0 ("đã có index khóa chính").
6. **Mở rộng (tùy chọn):** W3 "3 đơn lớn nhất mỗi khách". Hỏi "`rn <= 3` có làm planner đọc ít dòng hơn không?" Đáp án: không. `Seq Scan` vẫn đọc 20.000 dòng và sắp cả bảng; `Run Condition` chỉ dừng tính trong từng nhóm.

**Hiểu lầm mới đề xuất cho `engine-pedagogy.md` §2.2:**

- **PG9:** "Index chỉ giúp `WHERE`; `ORDER BY` trong `OVER()` lúc nào cũng phải sắp" và ngược lại "có index đúng thứ tự thì không bao giờ sắp". Bằng chứng: W1 trước/sau index, W4 sau index.

**Nguồn:** queries-table-expressions 18 §7.2.5, using-explain 18, release notes 15 và 16 (phụ lục B).

---

## 2. Brief P2: ba cách viết "không có", ba kế hoạch

### 2.1 Ý cần dạy

- `NOT EXISTS` và `LEFT JOIN … IS NULL` (đúng dạng) thành **anti join**: một nút join chỉ giữ dòng bên trái **không** có cặp. PG 16 thêm kiểu "Right Anti", cho phép băm bên nhỏ: "Allow anti-joins to be performed with the non-nullable input as the inner relation" *(qua fetch, release 16)*.
- `EXISTS` chỉ cần biết có dòng hay không: subquery "only be executed long enough to determine whether at least one row is returned" *(qua fetch, functions-subquery 18 §9.24.1)*.
- `NOT IN (subquery)` **không** thành anti join. Nó là một `SubPlan` chạy cho từng dòng: `hashed SubPlan` khi bảng băm vừa `work_mem`, SubPlan thường (quét lại) khi không vừa.
- Bẫy NULL: chỉ cần một dòng NULL bên phải là "the result of the `NOT IN` construct will be null, not true" *(qua fetch, §9.24.3)*, nên `WHERE` bỏ mọi dòng.
- **Không được dạy "NOT EXISTS luôn rẻ hơn".** Số đo ở cost mặc định nói ngược lại (§2.2). Lý do chọn `NOT EXISTS` là: đúng khi có NULL, ước lượng số dòng đúng, và không sập khi bảng băm không vừa bộ nhớ.

### 2.2 Setup và các bước

Setup = dữ liệu chung. Kết quả đúng: 100 khách (501–600).

| # | Câu | Kế hoạch (JSON: `Node Type` / `Join Type`) | Ước lượng dòng | Cost |
|---|---|---|---|---|
| A1 | `SELECT c.id FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)` | text: `Hash Right Anti Join`, `Hash Cond: (o.customer_id = c.id)`, băm `customers` (600 dòng). JSON: `Hash Join` / `Right Anti` | 100 (thật 100) | `563.42` |
| A2 | `SELECT c.id FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL` | `Hash Right Join` + `Filter: (o.id IS NULL)`, `Rows Removed by Filter: 20000`. JSON: `Hash Join` / `Right` | **1** (thật 100) | `378.37` |
| A2b | như A2 nhưng `WHERE o.customer_id IS NULL` | `Hash Right Anti Join` (JSON: `Hash Join` / `Right Anti`) | 100 | `563.42` |
| A3 | `SELECT c.id FROM customers c WHERE c.id NOT IN (SELECT o.customer_id FROM orders o)` | `Seq Scan on customers`, `Filter: (NOT (ANY (id = (hashed SubPlan 1).col1)))` | **300** | `369.5` |
| A4 | `SELECT c.id FROM customers c EXCEPT SELECT o.customer_id FROM orders o` | `HashSetOp Except` | 600 | `371` |
| A1, index `orders (customer_id)` | như A1 | `Nested Loop Anti Join` ← `Seq Scan on customers` + `Index Only Scan using orders_customer_idx` (JSON: `Nested Loop` / `Anti`) | 100 | `233.2` |
| A3, `work_mem = '64kB'` | như A3 (không index phụ, đã có đơn NULL: 20.001 dòng) | `Filter: (NOT (ANY (id = (SubPlan 1).col1)))` ← `Materialize` ← `Seq Scan on orders` | 300 | **`161415.75`** |
| A1, `work_mem = '64kB'` | như A1 (cùng trạng thái) | không đổi: `Hash Right Anti Join` | 100 | `563.44` |

Thêm một đơn có `customer_id` NULL (`INSERT INTO orders VALUES (20001, NULL, date '2026-10-31', 100)`, rồi `ANALYZE`):

| Cách viết | Số khách "không có đơn" trước | Sau |
|---|---|---|
| `NOT EXISTS` | 100 | 100 |
| `LEFT JOIN … o.id IS NULL` | 100 | 100 |
| `NOT IN (subquery)` | 100 | **0** |
| `EXCEPT` | 100 | 100 |
| `NOT IN (… WHERE o.customer_id IS NOT NULL)` | – | 100 |

Ghi chú:

- Cột `customer_id` phải cho NULL (không có `NOT NULL`). Dữ liệu `e-pg-l4-04` có `NOT NULL`, nên brief này dùng setup riêng.
- Mỗi khách có đơn thì có 40 đơn. Vì vậy khi có index, `Nested Loop Anti Join` dừng ở dòng khớp đầu tiên, và ước lượng phía trong là `rows=40`.
- `work_mem` 64kB với `orders_customer_idx` có sẵn: `161410.5`, cùng dáng kế hoạch.

### 2.3 Nhiệm vụ cho người học

1. **`predict` mở bài (bẫy NULL, chạy thật):**
   - Câu hỏi: "Thêm một đơn khách vãng lai, `customer_id` NULL. Ba câu A1, A2, A3 trả bao nhiêu khách?"
   - Lựa chọn:
     - (a) 100 / 100 / 100 (**hiểu lầm PG10:** "ba cách viết cùng một câu");
     - (b) 100 / 100 / 0 (**đúng**);
     - (c) 0 / 0 / 0 (sai: chỉ `NOT IN` gặp ba giá trị logic);
     - (d) 100 / 100 / 101 (sai: tưởng NULL được tính là một khách).
   - Đây là predict trên kết quả, không trên kế hoạch, nên không cần `expect`; chấm bằng `rows` như lab.
2. **`predict` kế hoạch:**
   - Câu hỏi: "Kế hoạch của A1 (`NOT EXISTS`) là gì?"
   - Lựa chọn:
     - (a) `Hash Right Anti Join`, băm `customers` (**đúng**);
     - (b) `Seq Scan on customers` + một `SubPlan` chạy lại cho từng khách (**hiểu lầm:** "`NOT EXISTS` là subquery tương quan, chạy 600 lần"; đó là kế hoạch của `NOT IN` khi không băm được);
     - (c) `Hash Right Join` + `Filter` (sai một chi tiết: đó là A2).
   - `expect`: JSON cho `Node Type: Hash Join`, `Join Type: Right Anti`. Text là `Hash Right Anti Join`. **Cần quyết định** ADD-4 so `node` với chữ nào (đề xuất: ghép `Join Type` vào như EXPLAIN text làm, để người học thấy đúng chữ trên màn hình).
3. **Lab (`check: rows`):** "Khách chưa từng đặt đơn", có sẵn đơn NULL. Câu `NOT IN` cho 0 dòng, sai. Đạt khi dùng `NOT EXISTS`, `LEFT JOIN` hoặc `NOT IN` có lọc NULL.
4. **Lab (`check: plan` + đọc số):** hàm `setup` kiểu `sort_plan(mem)` của `e-pg-l3-14`, chạy `EXPLAIN` của A3 và A1 với `work_mem` = `'64kB'`. Người học đọc cost `161415.75` so với `563.44`, và giải thích chữ `hashed` mất đi.
5. **`quiz` kết bài:** "A2 (`o.id IS NULL`) và A1 cho cùng 100 dòng. Vì sao A2 ước 1 dòng?" Đáp án: planner không đổi nó thành anti join, nên ước lượng của `Filter (o.id IS NULL)` dựa trên `null_frac` của `o.id` (0, vì là khóa chính). Lựa chọn sai: "vì thống kê cũ, `ANALYZE` lại là hết" (đã `ANALYZE`). Ước lượng sai như vậy có hại khi kết quả này nối tiếp vào câu khác (L4 `joins`: ước lượng sai là nguyên nhân số một của chọn sai thuật toán nối).

**Hiểu lầm mới:**

- **PG10:** "`NOT IN`, `NOT EXISTS`, `LEFT JOIN … IS NULL` là ba cách viết của cùng một câu, planner xử lý như nhau." Bằng chứng: 100/100/0; `Hash Right Anti Join` so với `hashed SubPlan` so với `Hash Right Join + Filter`; ước 100/300/1.
- Nối với thẻ BP `e-bp-q02` (`NOT EXISTS` thay `NOT IN`) và `e-bp-a11` (orphans).

**Nguồn:** functions-subquery 18 §9.24.1 và §9.24.3, using-explain 18, release notes 16 (phụ lục B).

---

## 3. Brief P3: CTE được inline hay tính riêng

### 3.1 Ý cần dạy

- Từ PG 12: "CTEs are automatically inlined if they have no side-effects" và chỉ khi "referenced only once"; trước đó "CTEs were never inlined" *(qua fetch, release 12)*.
- Docs 18: CTE không đệ quy, không tác dụng phụ "can be folded into the parent query", "but not if it references the `WITH` query more than once" *(qua fetch, queries-with 18 §7.8.4)*.
- `MATERIALIZED` "to force separate calculation of the `WITH` query"; `NOT MATERIALIZED` "to force it to be merged into the parent query" *(qua fetch)*.
- CTE bị tính riêng thì "the optimizer is not able to push restrictions from the parent query down" *(qua fetch)*: `WHERE` của câu ngoài thành `Filter` trên `CTE Scan`, không xuống được index.
- Hàm volatile (ví dụ `random()`) trong CTE: CTE không inline được, kể cả khi chỉ dùng một lần.
- `OFFSET 0` trong subquery cũng chặn đẩy điều kiện (cách cũ trước PG 12). Bài chỉ nhắc một dòng.

### 3.2 Setup và các bước

Setup = dữ liệu chung + `CREATE INDEX orders_customer_idx ON orders (customer_id); ANALYZE orders;`. Riêng C1 có một số đo thêm khi **chưa** có index này.

| # | Câu | Kế hoạch | Cost |
|---|---|---|---|
| C1 (chưa index phụ) | `WITH t AS (SELECT customer_id, amount FROM orders) SELECT sum(amount) FROM t WHERE customer_id = 42` | `Aggregate ← Seq Scan on orders (Filter: customer_id = 42)`: không có nút CTE, đã inline | `359.11` |
| C1 | như trên | `Aggregate ← Bitmap Heap Scan ← Bitmap Index Scan on orders_customer_idx` | `84.24` |
| C2 | `WITH t AS MATERIALIZED (…) …` (cùng câu) | `Aggregate`, `CTE t ← Seq Scan on orders (rows=20000)`, `CTE Scan on t (Filter: customer_id = 42)` | `759.11` |
| C5 | `WITH t AS (SELECT customer_id, amount, random() AS r FROM orders) …` | như C2: `CTE t` + `CTE Scan` + `Filter` | `809.11` |
| C6 | `SELECT sum(amount) FROM (SELECT customer_id, amount FROM orders OFFSET 0) t WHERE customer_id = 42` | `Subquery Scan on t (Filter)` ← `Seq Scan` | `559.11` |
| D1 | `WITH w AS (SELECT * FROM orders) SELECT w1.id, w2.id FROM w AS w1 JOIN w AS w2 ON w1.id = w2.id + 1 WHERE w2.customer_id = 42` (dáng ví dụ trong docs) | mặc định tính riêng: `Hash Join`, `CTE w ← Seq Scan`, hai `CTE Scan`, `Filter` trên `w2` | `1409.9` |
| D2 | D1 với `NOT MATERIALIZED` | `Nested Loop ← Bitmap Heap Scan (customer_id = 42) + Index Only Scan using orders_pkey` | `352.43` |
| C3 | `WITH t AS (SELECT customer_id, sum(amount) AS total FROM orders GROUP BY customer_id) SELECT a.customer_id, a.total FROM t a JOIN t b ON b.customer_id = a.customer_id + 1 WHERE a.total > b.total AND a.customer_id = 42` | mặc định tính riêng: `CTE t ← HashAggregate` (một lần), hai `CTE Scan` | `437.77` |
| C4 | C3 với `NOT MATERIALIZED` | `HashAggregate` cả bảng cho `b` + `GroupAggregate ← Bitmap Heap Scan` cho `a`: **tính `GROUP BY` hai lần** | `500.77` |

Kiểm đáp số: C1 = C2 = `26860`; D1 và D2 cùng 40 dòng (assert trong `pg.mjs`, `pg3.mjs`).

Ghi chú:

- D1 ra cùng `1409.9` dù có hay không `orders_customer_idx`, vì điều kiện không xuống được. D2 không có index phụ: `627.3` (`Seq Scan` + `Index Only Scan` khóa chính). Hai số này cho một câu `predict` đẹp: "thêm index `customer_id` thì D1 rẻ hơn không?" (không).
- C3/C4 là **phản ví dụ** cho lời khuyên "CTE dùng hai lần thì thêm `NOT MATERIALIZED`". Inline nghĩa là chép phần thân CTE vào mỗi chỗ dùng. Với thân là `GROUP BY` cả bảng, chép hai lần thì phải gộp hai lần.

### 3.3 Nhiệm vụ cho người học

1. **`predict`:**
   - Câu hỏi: "C1, có index `customer_id`. Kế hoạch có nút `CTE Scan` không?"
   - Lựa chọn:
     - (a) Không: CTE được gộp vào câu ngoài, `Bitmap Index Scan on orders_customer_idx`, cost `84.24` (**đúng**);
     - (b) Có: CTE luôn tính trước toàn bộ rồi mới lọc (**hiểu lầm PG11a**, đúng với PG ≤ 11);
     - (c) Không, nhưng `Seq Scan` (sai một chi tiết: đó là kế hoạch khi chưa có index, cost `359.11`).
   - `expect: { node: Bitmap Index Scan, table: orders }`.
2. **Lab bước (`check: plan`):** người học thêm `MATERIALIZED` vào C1 rồi đọc `CTE t` + `CTE Scan` + `Filter`, cost `759.11`. Câu hỏi đi kèm: "vì sao `Filter` nằm trên `CTE Scan` mà không xuống `orders`?"
3. **`predict` hai:**
   - Câu hỏi: "D1 dùng `w` hai lần, `w2.customer_id = 42`. Thêm `NOT MATERIALIZED`, cost đổi thế nào?"
   - Lựa chọn:
     - (a) giảm mạnh, `1409.9` → `352.43`, vì điều kiện xuống được index (**đúng**);
     - (b) không đổi, CTE là một view nên luôn được inline (**hiểu lầm PG11b**);
     - (c) tăng, vì phải đọc `orders` hai lần (sai ở đây; đúng ở C3/C4, dùng cho câu sau).
   - `expect: { node: Bitmap Index Scan, table: orders }`.
4. **`quiz` kết bài (chọn cách sửa):** cho C3 và hỏi "có nên thêm `NOT MATERIALIZED` không?" Đáp án: không, cost `437.77` → `500.77`, vì `GROUP BY` bị tính hai lần. Lời giải thích đúng là "inline = chép thân CTE vào mỗi chỗ dùng; chỉ có lợi khi điều kiện bên ngoài cắt được phần đọc lớn hơn phần phải làm lại".

**Hiểu lầm mới:**

- **PG11:** (a) "CTE là hàng rào tối ưu, luôn được tính trước" (đúng tới PG 11, sai từ PG 12) và (b) ngược lại "CTE chỉ là cách đặt tên, luôn được inline" (sai khi dùng hai lần, có hàm volatile, hay có `MATERIALIZED`). Bằng chứng: C1/C2, D1/D2, C3/C4.
- Nối với thẻ BP `e-bp-q07` (gộp trước khi nối, đang viết bằng CTE).

**Nguồn:** queries-with 18 §7.8.4, release notes 12 (phụ lục B).

---

## 4. Brief D1: DynamoDB tính sẵn tổng theo tháng

### 4.1 Ý cần dạy

- AWS: DynamoDB "doesn't natively support aggregation operations like `SUM` or `COUNT` across items" (trang materialized aggregation). Tính lúc đọc nghĩa là Scan và cộng ở ứng dụng.
- Cách AWS khuyên là **tính trước** khi dữ liệu đổi, lưu kết quả thành item thường, rồi đọc bằng một GSI sparse (chỉ item tổng có thuộc tính khóa của GSI).
- Trang đó so bốn cách. Hai cách liên quan tới bài:
  - Streams + Lambda + `ADD`: tách khỏi đường ghi, "Aggregation is eventually consistent (typically seconds behind)." Đây là cách trang chọn. Lambda retry có thể đếm trùng: "a retry would increment the count more than once".
  - Tổng hợp ngay lúc ghi trong ứng dụng: "Couples the aggregation logic to the write path." Dùng khi "you need synchronous, strongly consistent aggregation".
- **Bài chạy được trên dynoxide là cách thứ hai** (ghi đơn và cộng bộ đếm trong một `ExecuteTransaction`). Streams + Lambda không chạy trong trình duyệt, nên chỉ vẽ sơ đồ. Bài phải nói rõ đây **không phải** cách trang AWS chọn, và nói giá của nó: mỗi đơn tốn transaction (×2 WCU).
- `ADD` trên số không idempotent (bài `e-dy-l2-05` đã dạy). AWS: "In general, we recommend using `SET` rather than `ADD` to ensure idempotent operations." Transaction có `INSERT` đơn (khóa trùng thì hủy) tránh được đếm trùng khi retry.
- PartiQL transaction: "limited to 100 total statements (actions)". Một UPDATE của PartiQL phải trỏ đúng một item ("must resolve to a single primary key value"), và WHERE không khớp item nào thì trả `ConditionalCheckFailedException`.

### 4.2 Setup

```json
{"TableName": "Shop", "BillingMode": "PAY_PER_REQUEST",
 "KeySchema": [{"AttributeName": "PK", "KeyType": "HASH"}, {"AttributeName": "SK", "KeyType": "RANGE"}],
 "AttributeDefinitions": [{"AttributeName": "PK", "AttributeType": "S"}, {"AttributeName": "SK", "AttributeType": "S"},
   {"AttributeName": "month", "AttributeType": "S"}, {"AttributeName": "revenue", "AttributeType": "N"}],
 "GlobalSecondaryIndexes": [{"IndexName": "byMonth",
   "KeySchema": [{"AttributeName": "month", "KeyType": "HASH"}, {"AttributeName": "revenue", "KeyType": "RANGE"}],
   "Projection": {"ProjectionType": "ALL"}}]}
```

- Item đơn: `PK = ORDER#O00001`, `SK = ORDER`, `cat`, `day`, `amount`. **Không có `month`**, nên không vào GSI.
- Item tổng: `PK = CAT#books`, `SK = MONTH#2026-10`, `month`, `orders`, `revenue`. Có `month`, nên vào GSI `byMonth` (sparse, giống `Month` + `DownloadCount` trong ví dụ của AWS).
- Dữ liệu sinh tất định (LCG seed 7): 1.500 đơn, 5 loại hàng (`books`, `toys`, `garden`, `kitchen`, `sports`, lệch về `books`). 700 đơn tháng 9 và 800 đơn tháng 10; tiền là bội của 50.000 VND. Lab thật nên giữ cỡ này hoặc nhỏ hơn: dynoxide nạp khoảng 1 ms mỗi item (`engine.ts`).
- Đáp số tháng 10 (assert khớp cả Scan + cộng và bộ đếm): `books` 431 đơn / 227.350.000; `toys` 196 / 94.000.000; `garden` 91 / 47.100.000; `kitchen` 66 / 33.100.000; `sports` 16 / 8.050.000.

### 4.3 Request và `ConsumedCapacity` đo thật (dynoxide 1.5.0)

| # | Request | Kết quả | Capacity |
|---|---|---|---|
| R1 | `Scan` + `FilterExpression: begins_with(PK, :o) AND #d BETWEEN :a AND :b` (tháng 10), cộng ở ứng dụng | 1 trang, `ScannedCount` 1510, giữ 800 | 9,5 RCU |
| R2 | `UpdateItem` `ADD orders :one, revenue :amt SET #m = :m` (bộ đếm tháng 9, mỗi đơn một lần) | tạo bộ đếm nếu chưa có | 700 lần = 2095 WCU: 3 WCU mỗi lần (bảng 1 + GSI 2, vì `revenue` là sort key của GSI); 5 lần tạo mới chỉ 2 WCU (bảng 1 + GSI 1) |
| R2' | `UpdateItem` `ADD revenue :a` (`INDEXES`) | `revenue` đổi | `Table 1`, `byMonth 2` |
| R2'' | `UpdateItem` `ADD orders :z, revenue :z` với `:z = 0` | không đổi gì | `Table 1`, GSI 0 |
| R3 | `ExecuteStatement` `UPDATE "Shop" SET orders = orders + 1 WHERE PK = 'CAT#books' AND SK = 'MONTH#2026-10'` khi bộ đếm **chưa có** | `ConditionalCheckFailedException`, item vẫn không có | không trả |
| R4 | `ExecuteTransaction` [INSERT đơn `ORDER#X`, UPDATE bộ đếm chưa có] | `TransactionCanceledException`, lý do `[None, ConditionalCheckFailed]`; `ORDER#X` **không** được ghi | không trả |
| R5 | `ExecuteTransaction` [`INSERT INTO "Shop" VALUE {…}` đơn, `UPDATE "Shop" SET orders = orders + 1 SET revenue = revenue + ? WHERE PK = ? AND SK = 'MONTH#2026-10'`] | `{"Responses":[]}` | 6 WCU (`INDEXES`: bảng 4, `byMonth` 2); 800 lần = 4800 WCU |
| R5' | như R5 với `amount = 0` (`revenue` không đổi) | ok | 5 WCU (bảng 4, `byMonth` 1: `orders` là thuộc tính được chiếu) |
| R6 | gửi lại R5 của cùng một đơn | `TransactionCanceledException`, `[DuplicateItem, None]`: bộ đếm không bị cộng lần hai | không trả |
| R7 | gửi lại `UpdateItem ADD orders :one` (bộ đếm tháng 9 của `books`) | `orders` = 371, đúng là 370: **đếm trùng** | – |
| R8 | `Query` GSI `byMonth`, `month = 2026-10`, `ScanIndexForward: false`, `Limit: 3` | `books`, `toys`, `garden`; `ScannedCount` 3 | 0,5 RCU |
| R9 | `Query` GSI `byMonth`, cả tháng 10 | 5 item | 0,5 RCU |
| R10 | `Scan` GSI `byMonth` (`Select: COUNT`) | 10 item (5 loại × 2 tháng): không có item đơn nào | 0,5 RCU |
| R11 | `UPDATE "Shop" SET stock = stock - 2 WHERE PK = 'PROD#P1' AND SK = 'STOCK' AND stock >= 2` khi `stock` = 1 | `ConditionalCheckFailedException` | không trả |

Đối chiếu với luật AWS:

- Bảng chính trong transaction: 2 item × 2 = 4 WCU, khớp "two underlying reads or writes of every item in the transaction".
- Phần GSI (1 hoặc 2 WCU) là **số của dynoxide**. AWS nói GSI tốn hai lần ghi khi đổi giá trị khóa ("two writes are required", vòng 9 §3.2, đã khớp dynoxide ở `UpdateItem`). Docs transaction không nói phần GSI có bị nhân đôi hay không. Bài chỉ hỏi phần bảng, hoặc ghi "dynoxide báo".
- Transaction bị hủy: AWS nói "This capacity is consumed even when a transaction does not succeed." dynoxide không trả `ConsumedCapacity` lúc đó (giống vòng 9 với ghi có điều kiện bị từ chối). Bài không được nói "hủy thì miễn phí".
- R3: AWS nói WHERE không khớp item nào thì trả `ConditionalCheckFailedException`. Vậy PartiQL `UPDATE` **không tạo item mới**, khác `UpdateItem` (tạo nếu chưa có). Bộ đếm phải được tạo trước (đầu tháng), hoặc ghi bằng `UpdateItem` + `ADD`.
- Thiết kế `revenue` làm sort key của GSI có giá: mỗi lần cộng tiền là 2 WCU cho GSI (R2'). AWS dùng đúng mẫu này (`DownloadCount` là sort key). Bài nói rõ đây là giá của "top N theo tháng".

### 4.4 Nhiệm vụ cho người học

1. **Bước 1 (lab, `runtime: browser`):** "Doanh thu tháng 10 theo loại hàng". Người học Scan + filter (R1) và thấy cộng phải làm ở ứng dụng. Ghi lại 1.510 item đã đọc, 9,5 RCU.
2. **`predict` (trước bước 2):**
   - Câu hỏi: "Bộ đếm `CAT#books / MONTH#2026-10` chưa có. Chạy `UPDATE "Shop" SET orders = orders + 1 WHERE …` (PartiQL). Kết quả?"
   - Lựa chọn:
     - (a) tạo item với `orders = 1`, như `UpdateItem` (**hiểu lầm DY7a:** "PartiQL `UPDATE` là upsert");
     - (b) `ConditionalCheckFailedException`, không có item nào được tạo (**đúng**, R3);
     - (c) `ValidationException` vì `orders` chưa có (sai một chi tiết: lỗi đến từ WHERE không khớp item nào).
3. **Bước 2:** tạo 5 bộ đếm tháng 10 (`INSERT` PartiQL hoặc `PutItem`), rồi ghi một đơn mới bằng `ExecuteTransaction` (R5). Chấm: bộ đếm `books` đúng 1 đơn và đúng số tiền.
4. **`predict` (capacity):**
   - Câu hỏi: "Transaction R5 ghi 2 item. Phần **bảng chính** tốn bao nhiêu WCU?"
   - Lựa chọn:
     - (a) 2 (**hiểu lầm:** "transaction tính như hai lần ghi thường");
     - (b) 4 (**đúng**: 2 item × 2, luật AWS);
     - (c) 6 (sai một chi tiết: 6 là tổng dynoxide báo, gồm 2 WCU của GSI).
   - Đọc `ReturnConsumedCapacity: "INDEXES"`. Runner đã có `ExecuteTransaction` trong `CAPACITY`.
5. **Bước 3 (lab):** "Top 3 loại hàng tháng 10" bằng `Query` GSI `byMonth` (R8). So 0,5 RCU với 9,5 RCU của R1.
6. **`quiz` (retry):** "Mạng lỗi, ứng dụng gửi lại đúng request vừa thành công. Cách nào giữ bộ đếm đúng?" Đáp án: transaction có `INSERT` đơn (R6: `DuplicateItem` hủy cả transaction). Lựa chọn sai: "`UpdateItem ADD` lần hai" (R7: 371 thay vì 370), "`ADD` vốn idempotent".
7. **`concept` cuối (sơ đồ, `runtime: docs`):** đường đi của AWS: ghi đơn → Streams → Lambda → `ADD` → GSI sparse. Hai giá phải trả: trễ vài giây ("typically seconds behind") và có thể đếm trùng khi retry. So với cách transaction: đúng ngay, nhưng mỗi đơn tốn gấp đôi WCU và mọi đơn cùng loại hàng ghi vào **một** item (khóa nóng: nối `e-dy-l4-03`, `e-dy-l4-04`).

**Hiểu lầm mới cho `engine-pedagogy.md` §2.4:**

- **DY7:** (a) "PartiQL `UPDATE` tạo item nếu chưa có, như `UpdateItem`" và (b) "DynamoDB không có `SUM` nên báo cáo nào cũng phải Scan". Bằng chứng: R3; R1 so với R8 (9,5 với 0,5 RCU).

**Nguồn:** AWS materialized aggregation, PartiQL update, PartiQL operators, PartiQL transactions, Transactions (capacity), Update expressions (phụ lục B).

---

## 5. Phát hiện phụ (cần sửa ở chỗ khác)

1. **`e-bp-a11` (orphans):** thẻ dạy `LEFT JOIN … WHERE o.id IS NULL`. Đáp số đúng, nhưng trên PG 18.6 kế hoạch là `Hash Right Join` + `Filter` với **ước 1 dòng** (thật 100, `Rows Removed by Filter: 20000`). Cùng câu với `o.customer_id IS NULL` (cột trong điều kiện nối) thì thành `Hash Right Anti Join`, ước 100. Đề xuất: thẻ giữ nguyên ý chính, thêm một dòng "kiểm cột của điều kiện nối (`o.customer_id IS NULL`), hoặc dùng `NOT EXISTS`, để planner nhận ra anti join". Brief P2 bước 5 dạy chuyện này ở Engine.
2. **Dòng `Window:` của EXPLAIN mất `DESC`:** W2 in `Window: w1 AS (ORDER BY amount ROWS UNBOUNDED PRECEDING)`, W3 in `ORDER BY orders.amount, orders.id`. Nhưng `Sort Key` là `amount DESC` và W3 trả đúng thứ tự giảm (khách 42: 950, 947, 944). Bài nào trích kế hoạch cửa sổ có `DESC` thì trích dòng `Sort Key`. Test `expect` nên so nút, không so chữ của dòng `Window:`.
3. **ADD-4 và join type:** JSON tách `Node Type` (`Hash Join`, `Nested Loop`) và `Join Type` (`Right Anti`, `Anti`, `Right`). EXPLAIN text ghép thành `Hash Right Anti Join`. `planCheck` hiện chỉ so nút quét theo bảng (`product-design-db-engine.md` §2.3). Brief P2 cần ADD-4 so được cả join type; nếu không, câu predict kế hoạch chấm bằng chữ của text.
4. **dynoxide và transaction bị hủy:** không trả `ConsumedCapacity` (R4, R6), trong khi AWS vẫn tính capacity. Thêm dòng này vào danh sách "runtime ≠ engine thật" (vòng 10 §0 mục 3).

---

## 6. Đặt bài

**Postgres: mô-đun mới `analytic-plans` ở L4**, đặt sau `joins` (cần `e-pg-l4-04` cho Hash/Nested Loop, `e-pg-l4-02` cho ước lượng). Đây là mô-đun vòng 10 §3.3 mục 2 gọi tên "kế hoạch của truy vấn phân tích".

| Id đề xuất | Bài | Loại | `requires` |
|---|---|---|---|
| `e-pg-l4-17` | P1 "Hàm cửa sổ cần dữ liệu đã sắp" | `lab` (3 bước `check: plan`) + 2 `predict` + 1 `quiz` | `e-pg-l4-04`, `e-pg-l2-02` (index có sẵn thứ tự) |
| `e-pg-l4-18` | P2 "Ba cách viết 'không có'" | `lab` (2 bước) + 2 `predict` + 1 `quiz` | `e-pg-l4-04`, `e-pg-l1-05` (NULL) |
| `e-pg-l4-19` | P3 "CTE: inline hay tính riêng" | `predict` × 2 + 1 bước lab + `quiz` | `e-pg-l4-17` hoặc `e-pg-l4-04` |

- Capstone `e-pg-l4-16` vẫn là bài cuối của L4 theo thứ tự trong `modules.yml`: đặt `analytic-plans` trước `capstone-l4`. Capstone có thể thêm một bước gài PG10 hoặc PG11 (pedagogy §1.2: capstone gài lại hiểu lầm của cấp).
- Vì sao không đặt ở L2: phần đáng dạy là chọn nút và cost, cần Hash/Nested Loop (L4 `joins`) và ước lượng (L4 `planner-stats`). Bẫy NULL của `NOT IN` là ý cấp L1–L2 và đã có ở thẻ BP `e-bp-q02`; bài Engine dùng nó làm câu mở, không dạy lại từ đầu.
- Mục tiêu "sau mô-đun" (`after`) đề xuất: "đọc kế hoạch của câu có hàm cửa sổ, anti join hoặc CTE, chỉ ra nút sắp hay nút băm đến từ đâu, và đổi index hoặc cách viết để bỏ nó".

**DynamoDB: `e-dy-l4-15` trong mô-đun `patterns` (L4)**, cần `e-dy-l2-05` (`ADD`), `e-dy-l2-07` (PartiQL), `e-dy-l4-08` (GSI sparse) và `e-dy-l4-11` (transaction). Nếu muốn mô-đun `transactions` gọn hơn thì đặt sau `e-dy-l4-13`. Nhãn: "Chạy bằng dynoxide" cho bước 1–6; bước 7 là "Sơ đồ".

**Thứ tự viết đề xuất:** P2 trước (rủi ro dạy sai cao nhất, và có sửa kèm thẻ `e-bp-a11`), rồi P1, P3, D1.

---

## Phụ lục A. Script và output

Thư mục: `C:\Users\KHOA~1.HUY\AppData\Local\Temp\claude\…\scratchpad\r11\`, nằm ngoài repo. Nạp PGlite và dynoxide từ `node_modules` của repo, dynoxide qua cùng shim với `r10/cmp.mjs`.

- **`pg.mjs` → `pg.out`:** setup chung; W1–W4 trước và sau `orders_cust_day`; A1–A4 trước/sau đơn NULL (assert 100/100/100/100 rồi 100/100/0/100) và với `work_mem` 64kB; C1–C6 (assert C1 = C2 = 26860).
- **`pg2.mjs` → `pg2.out`:** `EXPLAIN ANALYZE` của A1/A2 (ước và thật), A2b, A1 có index, W4 tắt bitmap, W3 `EXPLAIN ANALYZE` với index `(customer_id)`.
- **`pg3.mjs` → `pg3.out`:** `Node Type`/`Join Type` từ `FORMAT JSON` cho mọi kế hoạch dùng trong `predict`; cửa sổ dùng chung; D1/D2 có và không có index (assert cùng 40 dòng).
- **`dy.mjs` → `dy.out`:** R1–R11, assert bộ đếm = đáp số sinh = tổng Scan cho cả 5 loại tháng 10, và đếm đơn tháng 9.

**Dòng chính:**

```text
PostgreSQL 18.6 (PGlite 0.5.16) on wasm32-unknown-emscripten
W1 no index      WindowAgg <- Sort <- Seq Scan                       2187.77
W1 + cust_day    WindowAgg <- Index Scan using orders_cust_day       1452.29
W2 two windows   WindowAgg <- Sort <- WindowAgg <- Sort <- Seq Scan  3966.54
W4 + cust_day    WindowAgg <- Sort <- Bitmap Heap Scan                 85.99 (bitmap off: Index Scan 141.69)
A1 NOT EXISTS    Hash Join/Right Anti   rows 100                      563.42
A2 o.id IS NULL  Hash Join/Right + Filter rows 1 (actual 100)         378.37
A3 NOT IN        Seq Scan, hashed SubPlan 1, rows 300                 369.5  | work_mem 64kB: 161415.75
counts before NULL [100,100,100,100]  after NULL [100,100,0,100]
C1 inlined 84.24 | C2 MATERIALIZED 759.11 | D1 1409.9 | D2 NOT MATERIALIZED 352.43 | C3 437.77 | C4 500.77
dynoxide 1.5.0
R1 Scan+filter   scanned 1510, kept 800, 9.5 RCU
R5 ExecuteTransaction  6 WCU (Table 4, byMonth 2)
R6 retry tx      [DuplicateItem, None]   | R7 retry ADD 371 (want 370)
R8 GSI top 3     scanned 3, 0.5 RCU
R3 PartiQL UPDATE on missing item  ConditionalCheckFailedException, item absent
```

## Phụ lục B. Nguồn (đọc 2026-11-20)

**PostgreSQL 18** *(qua fetch)*:

- Queries, Window Function Processing (§7.2.5): https://www.postgresql.org/docs/18/queries-table-expressions.html
- WITH Queries, CTE materialization (§7.8.4): https://www.postgresql.org/docs/18/queries-with.html
- Subquery Expressions, EXISTS và NOT IN (§9.24): https://www.postgresql.org/docs/18/functions-subquery.html
- Using EXPLAIN: https://www.postgresql.org/docs/18/using-explain.html *(dùng lại từ `e-pg-l4-04`)*
- Release 12.0 (CTE inline): https://www.postgresql.org/docs/release/12.0/
- Release 15.0 (window performance): https://www.postgresql.org/docs/release/15.0/
- Release 16.0 (anti join, ROWS mode): https://www.postgresql.org/docs/release/16.0/

**AWS DynamoDB:**

- Materialized aggregation queries: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-gsi-aggregation.html
- PartiQL update statements: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ql-reference.update.html
- PartiQL operators: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ql-operators.html
- PartiQL transactions: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ql-reference.multiplestatements.transactions.html
- Transactions, capacity: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html
- Update expressions (SET `+`/`-`, ADD): https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html
- GSI write capacity: dùng lại vòng 9 §3.2 (`research-nosql-v25-v26.md`).
