# Danh mục Best Practice: SQL, PostgreSQL, MongoDB, DynamoDB

Người viết: agent Research · 2026-11-20 · theo L215 mục 6 ("luôn có Agent research đi collect kiến thức, tiêu chí, best practice về SQL, và NoSQL chuẩn bị đưa nó vào mục mới Best Practice"). **Chỉ là tài liệu nghiên cứu**: không sửa `src/`, `content/`, test hay `decision-log.md`.

**Vòng 2** (agent Research, 2026-11-20): thêm 43 mục (A12–A21, P10–P26, M15–M22, D14–D21), chạy thật mọi ví dụ DynamoDB trên `@dynoxide/wasm-engine` 1.5.0 (§8), thêm đặc tả lint 10 luật với AST đã kiểm (§10). Mã cũ giữ nguyên; D01–D13 được thay ví dụ bằng request chạy được, luật và nguồn không đổi.

Tài liệu này là nguyên liệu cho khu **Best Practice** sắp có. Nó đi cùng `db-engine-knowledge.md` (bản đồ kiến thức theo engine, L1 → L5) và dùng lại các nguồn `[Sn]` đã mở ở đó. Đề xuất cách khu Best Practice hoạt động trong app nằm ở §9.

## 0. Quy ước

- **Mỗi mục** có:
  - mã (`Q01`, `S04`, `M07`…), tiêu đề VI / EN;
  - **Luật**, **Vì sao**;
  - ví dụ **Sai** và **Đúng**;
  - **Nguồn** (URL chính thức). Ngày 2026-11-20:
    - mọi URL đã được tải về và khớp tiêu đề trang (anchor `#…` cũng đã kiểm có trên trang);
    - wiki "Don't Do This" và SQL Style Guide được đọc toàn bộ;
    - mọi câu trích nguyên văn và mọi con số (giới hạn, chi phí, thời gian) đã được tìm thấy trên đúng trang dẫn;
    - phần diễn giải còn lại dựa trên tài liệu nhưng chưa đối chiếu từng câu;
  - **Cấp** L1–L5, cùng thang với `db-engine-knowledge.md` §3–5: L1 người mới, L2 thực hành, L3 bên trong / hiệu năng, L4 đồng thời và quy mô, L5 chuyên gia;
  - **Nối với** skill có thật trong `content/skills.yml` (`null_logic`, `sargable`…) hoặc node nâng cao trong `content/general/adv.yml` (`a1`…`d8`). "Chưa có" nghĩa là app chưa có bài nào dạy ý đó.
- **Kiểm** cho biết ví dụ đã được chạy thật hay chưa:
  - **PGlite**: hai khối SQL đã chạy trên PGlite 0.5.16 (PostgreSQL 18.6) trong Node, trên schema `lab` (`src/db/lab.sql`, đúng dữ liệu bài luyện của khu General), mỗi khối trong `BEGIN … ROLLBACK`. Ghi kèm điều đã khẳng định:
    - "Sai ≠ Đúng": hai kết quả khác nhau, chính là cái bẫy;
    - "Sai = Đúng": cùng kết quả, chỉ khác cách viết;
    - "kế hoạch": node trong `EXPLAIN`, không bao giờ là mili giây;
    - "cost Đúng < Sai": planner cost từ `EXPLAIN (FORMAT JSON)`;
    - "lỗi `SQLSTATE`": khối đó phải báo đúng lỗi ấy.
  - Điều kiện chạy:
    - sau khi nạp `lab.sql`, script chạy `VACUUM ANALYZE` một lần, nên planner có thống kê và visibility map;
    - chạy lại không có bước này, mọi mục vẫn qua trừ **I04**: không có visibility map, planner bỏ `Index Only Scan` và chọn Seq Scan;
    - test trong app (§9.1) phải làm cùng bước đó trước khi kiểm các mục kế hoạch.
  - Script kiểm là file tạm ngoài repo, không commit. §9.1 đề xuất biến nó thành test thật.
  - **mingo**: khối Mongo đã chạy trên `mingo` 7.2.7 (cài tạm ngoài repo) với dữ liệu mẫu ở §7.0. Vòng 2 chạy trên `mingo` 7.2.6 (M01, M05, M08, M09 cho cùng kết quả; M15–M22 mới, dữ liệu thêm ở §7.1).
  - **dynoxide** (vòng 2): khối DynamoDB đã chạy trên `@dynoxide/wasm-engine` 1.5.0 trong Node, mỗi khối một engine mới với dữ liệu §8.0. Ghi kèm `Count`/`ScannedCount`, RCU/WCU dynoxide báo, hoặc kiểu lỗi.
  - **(notx)** (vòng 2): khối SQL có hậu tố này chạy ngoài transaction trên một PGlite mới (§5.1).
  - **cú pháp**: chỉ minh họa. Đó là index, shard key, transaction Mongo, cấu hình vận hành, và phần DynamoDB mà emulator không có (TTL D09, capacity mode D11). Không chạy được trong trình duyệt, hoặc runtime không mô phỏng ý đó (mingo không có index, xem `db-engine-knowledge.md` §1.5).
- **Mỗi khối mã** bắt đầu bằng một dòng chú thích `-- <mã> bad` / `-- <mã> good` (Mongo: `// <mã> …`). Script kiểm đọc chính file này, nên ví dụ trong tài liệu là đúng thứ đã chạy.
- **Trích dẫn:** ý được diễn đạt lại; chỉ trích nguyên văn vài chữ khi cần.
  - [SQL Style Guide](https://www.sqlstyle.guide/) của Simon Holywell theo giấy phép CC BY-SA 4.0: chỉ dẫn link, không chép.
  - Trang wiki "Don't Do This" của PostgreSQL: chỉ tóm ý.
- **Thuật ngữ** giữ tiếng Anh (index, partition key, fan-out…). Văn xuôi tiếng Việt.

## Tóm tắt

| Khu | Mã | Số mục | Kiểm PGlite / mingo / dynoxide |
|---|---|---|---|
| 1. Viết truy vấn SQL | Q | 22 | 22 |
| 2. SQL cho data analyst | A | 21 | 21 |
| 3. Thiết kế schema PostgreSQL | S | 12 | 12 |
| 4. Index | I | 9 | 9 |
| 5. Hiệu năng và vận hành | P | 26 | 24 |
| 6. Bảo mật | X | 5 | 3 (+ X04 qua S10) |
| 7. MongoDB | M | 22 | 12 |
| 8. DynamoDB | D | 21 | 19 (dynoxide) |
| **Tổng** | | **138** | **122** |

**Mười mục giá trị nhất** cho người học BoonData (lỗi thật hay gặp, sai âm thầm, có thể bắt bằng lint):

1. **Q02:** `NOT IN` với NULL trả về rỗng.
2. **Q06:** điều kiện bảng phải đặt trong `WHERE` biến LEFT JOIN thành INNER.
3. **Q07:** join fan-out làm tổng bị nhân đôi.
4. **Q11:** hàm bọc cột làm mất index (sargable).
5. **Q12:** `BETWEEN` với timestamp.
6. **A03:** khử trùng lặp có thứ tự xác định.
7. **A01:** trục ngày cho kỳ không có dữ liệu.
8. **S10:** multi-tenant bằng `tenant_id` + RLS có `FORCE`.
9. **M01:** Mongo: dữ liệu đọc cùng nhau thì lưu cùng nhau.
10. **D02:** DynamoDB: partition key nhiều giá trị, tải đều.

## 1. Viết truy vấn SQL (Q)

### Q01 · So sánh với NULL bằng `IS NULL` / Compare with NULL using IS NULL

- **Luật:** kiểm giá trị thiếu bằng `IS NULL` / `IS NOT NULL`, không bao giờ bằng `= NULL` hay `<> NULL`.
- **Vì sao:**
  - so sánh thường với NULL cho kết quả NULL (không biết), không phải true;
  - `WHERE` chỉ giữ dòng true, nên `= NULL` luôn trả 0 dòng mà không báo lỗi.
- **Nguồn:** https://www.postgresql.org/docs/18/functions-comparison.html
- **Cấp:** L1 · **Nối với:** skill `null_logic` · **Kiểm:** PGlite, Sai ≠ Đúng

```sql
-- Q01 bad
SELECT count(*) FROM customers WHERE email = NULL;
```
```sql
-- Q01 good
SELECT count(*) FROM customers WHERE email IS NULL;
```

### Q02 · Dùng `NOT EXISTS` thay `NOT IN (subquery)` / Use NOT EXISTS, not NOT IN

- **Luật:** để lọc "không có trong tập kia", dùng `NOT EXISTS` (anti join). `NOT IN` chỉ dùng với danh sách hằng chắc chắn không có NULL.
- **Vì sao:**
  - chỉ cần subquery trả về một NULL, `x NOT IN (…)` không bao giờ true, nên kết quả rỗng một cách âm thầm;
  - planner cũng tối ưu `NOT EXISTS` tốt hơn.
  - Đây là mục đầu tiên trong "SQL constructs" của wiki.
- **Nguồn:**
  - https://wiki.postgresql.org/wiki/Don%27t_Do_This#Don.27t_use_NOT_IN
  - https://www.postgresql.org/docs/18/functions-subquery.html
- **Cấp:** L2 · **Nối với:** skill `anti_join`, `in_subquery`, `exists` · **Kiểm:** PGlite, Sai ≠ Đúng (Sai = 0 vì đơn vãng lai có `customer_id` NULL)

```sql
-- Q02 bad
SELECT count(*) FROM customers c
WHERE c.id NOT IN (SELECT o.customer_id FROM orders o WHERE o.order_date >= DATE '2026-10-01');
```
```sql
-- Q02 good
SELECT count(*) FROM customers c
WHERE NOT EXISTS (
  SELECT 1 FROM orders o
  WHERE o.customer_id = c.id AND o.order_date >= DATE '2026-10-01'
);
```

### Q03 · So sánh an toàn với NULL: `IS DISTINCT FROM` / Null-safe comparison

- **Luật:**
  - khi cột có thể NULL và bạn muốn "khác giá trị này, kể cả chưa biết", dùng `IS DISTINCT FROM`;
  - hoặc nói rõ trong điều kiện: `city <> 'Hanoi' OR city IS NULL`.
- **Vì sao:** `city <> 'Hanoi'` bỏ mất mọi dòng `city` NULL. Người đọc kết quả thường không biết.
- **Nguồn:** https://www.postgresql.org/docs/18/functions-comparison.html
- **Cấp:** L2 · **Nối với:** skill `null_logic` · **Kiểm:** PGlite, Sai ≠ Đúng

```sql
-- Q03 bad
SELECT count(*) FROM customers WHERE city <> 'Hanoi';
```
```sql
-- Q03 good
SELECT count(*) FROM customers WHERE city IS DISTINCT FROM 'Hanoi';
```

### Q04 · Hiểu `count(*)` và `count(cột)` / count(*) vs count(column)

- **Luật:**
  - đếm dòng thì dùng `count(*)`;
  - `count(cột)` chỉ khi bạn muốn đếm giá trị không NULL, và đặt tên cột kết quả nói đúng điều đó.
- **Vì sao:** mọi aggregate trừ `count(*)` đều bỏ qua NULL. "Số khách" tính bằng `count(email)` âm thầm thiếu những khách không có email.
- **Nguồn:** https://www.postgresql.org/docs/18/functions-aggregate.html
- **Cấp:** L1 · **Nối với:** skill `aggregate` · **Kiểm:** PGlite, Sai ≠ Đúng

```sql
-- Q04 bad
SELECT count(email) AS customers FROM customers;
```
```sql
-- Q04 good
SELECT count(*) AS customers, count(email) AS customers_with_email FROM customers;
```

### Q05 · `COALESCE` tổng của LEFT JOIN về 0 / COALESCE outer-join sums

- **Luật:**
  - sau LEFT JOIN, `sum`/`max` của nhóm không khớp dòng nào là NULL;
  - nếu nghĩa nghiệp vụ là 0 thì viết `coalesce(sum(…), 0)`.
- **Vì sao:** NULL lan sang phép tính sau đó (`NULL + 1` là NULL) và hiện thành ô trống trong báo cáo.
- **Nguồn:** https://www.postgresql.org/docs/18/functions-conditional.html
- **Cấp:** L1 · **Nối với:** skill `coalesce`, `left_join` · **Kiểm:** PGlite, Sai ≠ Đúng (cửa hàng 4 mở 2025-09-01)

```sql
-- Q05 bad
SELECT s.id, sum(oi.qty) AS units
FROM stores s
LEFT JOIN orders o ON o.store_id = s.id AND o.order_date < DATE '2025-09-01'
LEFT JOIN order_items oi ON oi.order_id = o.id
GROUP BY s.id ORDER BY s.id;
```
```sql
-- Q05 good
SELECT s.id, coalesce(sum(oi.qty), 0) AS units
FROM stores s
LEFT JOIN orders o ON o.store_id = s.id AND o.order_date < DATE '2025-09-01'
LEFT JOIN order_items oi ON oi.order_id = o.id
GROUP BY s.id ORDER BY s.id;
```

### Q06 · Điều kiện của bảng bên phải đặt trong `ON` / Right-table filters belong in ON

- **Luật:** với `LEFT JOIN`, điều kiện lọc trên bảng bên phải đặt trong `ON`, không đặt trong `WHERE`.
- **Vì sao:**
  - `WHERE o.col …` loại các dòng mà `o` là NULL;
  - LEFT JOIN thành INNER JOIN, và nhóm "không có gì" biến mất khỏi kết quả.
- **Nguồn:** https://www.postgresql.org/docs/18/queries-table-expressions.html (mục "Joined Tables")
- **Cấp:** L2 · **Nối với:** skill `left_join` · **Kiểm:** PGlite, Sai ≠ Đúng (Sai thiếu cửa hàng 4)

```sql
-- Q06 bad
SELECT s.id, count(o.id) AS orders_before_sep_2025
FROM stores s
LEFT JOIN orders o ON o.store_id = s.id
WHERE o.order_date < DATE '2025-09-01'
GROUP BY s.id ORDER BY s.id;
```
```sql
-- Q06 good
SELECT s.id, count(o.id) AS orders_before_sep_2025
FROM stores s
LEFT JOIN orders o ON o.store_id = s.id AND o.order_date < DATE '2025-09-01'
GROUP BY s.id ORDER BY s.id;
```

### Q07 · Gộp trước rồi mới join hai bảng con / Aggregate before joining two child tables

- **Luật:**
  - không join một bảng cha với **hai** bảng con (1-n và 1-n) rồi mới `sum`;
  - gộp từng bảng con về đúng grain của bảng cha (subquery hoặc CTE), rồi mới join.
- **Vì sao:**
  - join hai quan hệ 1-n nhân số dòng (fan-out);
  - mỗi payment lặp lại theo số dòng hàng, nên tổng tiền bị nhân lên mà không có lỗi nào.
- **Nguồn:** https://www.postgresql.org/docs/18/queries-with.html (ví dụ gộp trong `WITH` trước khi dùng)
- **Cấp:** L2 · **Nối với:** skill `multi_join`, `cte`; node `c2` (grain) · **Kiểm:** PGlite, Sai ≠ Đúng

```sql
-- Q07 bad
SELECT sum(p.amount_vnd) AS paid
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
JOIN payments p ON p.order_id = o.id
WHERE o.order_date >= DATE '2026-10-01';
```
```sql
-- Q07 good
WITH paid AS (
  SELECT order_id, sum(amount_vnd) AS amount_vnd
  FROM payments
  GROUP BY order_id
)
SELECT sum(paid.amount_vnd) AS paid
FROM orders o
JOIN paid ON paid.order_id = o.id
WHERE o.order_date >= DATE '2026-10-01';
```

### Q08 · Viết `JOIN … ON`, không join bằng dấu phẩy / Explicit JOIN syntax

- **Luật:** nối bảng bằng `JOIN … ON`. Không liệt kê bảng bằng dấu phẩy rồi để điều kiện nối lẫn trong `WHERE`.
- **Vì sao:**
  - điều kiện nối nằm cạnh bảng nó nối;
  - quên một điều kiện sẽ là lỗi cú pháp (`JOIN` thiếu `ON`), không phải một cross join âm thầm;
  - đổi sang `LEFT JOIN` cũng chỉ cần sửa một chữ.
- **Nguồn:** https://www.postgresql.org/docs/18/queries-table-expressions.html
- **Cấp:** L1 · **Nối với:** skill `join` · **Kiểm:** PGlite, Sai = Đúng

```sql
-- Q08 bad
SELECT s.name, count(*) AS orders
FROM orders o, stores s
WHERE o.store_id = s.id AND o.order_date >= DATE '2026-10-01'
GROUP BY s.name ORDER BY s.name;
```
```sql
-- Q08 good
SELECT s.name, count(*) AS orders
FROM orders AS o
JOIN stores AS s ON s.id = o.store_id
WHERE o.order_date >= DATE '2026-10-01'
GROUP BY s.name
ORDER BY s.name;
```

### Q09 · Liệt kê cột, không `SELECT *` trong truy vấn lưu lại / Name your columns

- **Luật:** truy vấn dùng lại (báo cáo, dashboard, view) liệt kê đúng các cột cần, có alias rõ nghĩa.
- **Vì sao:**
  - `SELECT *` đổi hình dạng khi bảng thêm cột;
  - kéo theo cột lớn không cần (jsonb, text dài);
  - chặn index-only scan;
  - người đọc không biết kết quả có gì.
- **Nguồn:** https://www.postgresql.org/docs/18/sql-select.html (mục "SELECT List"); https://www.sqlstyle.guide/ (Query syntax)
- **Cấp:** L1 · **Nối với:** skill `select` · **Kiểm:** PGlite, chạy được

```sql
-- Q09 bad
SELECT * FROM app_events WHERE session_id = 42;
```
```sql
-- Q09 good
SELECT id, event, ts FROM app_events WHERE session_id = 42 ORDER BY ts, id;
```

### Q10 · `LIMIT` luôn đi với `ORDER BY` có tiebreaker / ORDER BY with a tiebreaker

- **Luật:**
  - `LIMIT`/`OFFSET` chỉ có nghĩa khi có `ORDER BY`;
  - `ORDER BY` phải kết thúc bằng một cột duy nhất (thường là khóa) để thứ tự hoàn toàn xác định.
- **Vì sao:**
  - không có `ORDER BY`, thứ tự dòng không được bảo đảm;
  - có `ORDER BY` nhưng trùng giá trị, các dòng hòa nhau có thể đổi chỗ giữa hai lần chạy, nên top-N "nhảy";
  - tài liệu `LIMIT` nói rõ dùng nó không có `ORDER BY` cho ra tập con "không đoán trước".
- **Nguồn:** https://www.postgresql.org/docs/18/queries-limit.html
- **Cấp:** L1 · **Nối với:** skill `order_by`, `limit` · **Kiểm:** PGlite, chạy được (sự không xác định không tái hiện chắc chắn được)

```sql
-- Q10 bad
SELECT id, order_date FROM orders ORDER BY order_date DESC LIMIT 5;
```
```sql
-- Q10 good
SELECT id, order_date FROM orders ORDER BY order_date DESC, id DESC LIMIT 5;
```

### Q11 · Điều kiện sargable: đừng bọc cột trong hàm / Keep predicates sargable

- **Luật:**
  - viết điều kiện để cột đứng một mình bên một vế: `cột >= a AND cột < b`;
  - không viết `date_trunc('month', cột) = …`, `extract(year FROM cột) = …`, `cột + 1 = …`.
- **Vì sao:**
  - index B-tree trên `order_date` chỉ dùng được khi điều kiện so sánh chính cột đó;
  - hàm bọc cột buộc đọc cả bảng, trừ khi có index đúng biểu thức ấy (I05).
- **Nguồn:** https://www.postgresql.org/docs/18/indexes-types.html (B-tree dùng cho `<, <=, =, >=, >`); https://www.postgresql.org/docs/18/indexes-expressional.html
- **Cấp:** L2 · **Nối với:** skill `sargable`, `explain_read` · **Kiểm:** PGlite, kế hoạch: Sai không dùng index, Đúng dùng index (`lab` có sẵn index trên `orders (order_date)`)

```sql
-- Q11 bad
EXPLAIN (COSTS OFF)
SELECT count(*) FROM orders WHERE date_trunc('month', order_date) = DATE '2026-10-01';
```
```sql
-- Q11 good
EXPLAIN (COSTS OFF)
SELECT count(*) FROM orders WHERE order_date >= DATE '2026-10-01' AND order_date < DATE '2026-11-01';
```

### Q12 · Khoảng nửa mở, không `BETWEEN` với timestamp / Half-open ranges, not BETWEEN

- **Luật:** lọc theo thời gian bằng `>= đầu AND < đầu kỳ sau`.
- **Vì sao:**
  - `BETWEEN a AND b` đóng hai đầu;
  - với timestamp, `'2026-10-31'` là 00:00 ngày 31, nên mọi giao dịch trong ngày 31 sau nửa đêm bị bỏ;
  - ngày đầu kỳ sau cũng có thể bị đếm hai lần.
  - `BETWEEN` chỉ an toàn với giá trị rời rạc (số nguyên, `date`).
- **Nguồn:** https://wiki.postgresql.org/wiki/Don%27t_Do_This#Don.27t_use_BETWEEN_.28especially_with_timestamps.29
- **Cấp:** L1 · **Nối với:** skill `date_math`, `where` · **Kiểm:** PGlite, Sai ≠ Đúng

```sql
-- Q12 bad
SELECT count(*) FROM payments
WHERE paid_at BETWEEN '2026-10-01' AND '2026-10-31';
```
```sql
-- Q12 good
SELECT count(*) FROM payments
WHERE paid_at >= TIMESTAMP '2026-10-01' AND paid_at < TIMESTAMP '2026-11-01';
```

### Q13 · Chia số nguyên: ép kiểu trước khi chia / Cast before dividing integers

- **Luật:** tỷ lệ giữa hai số đếm phải ép một vế sang `numeric` (hoặc nhân `100.0`) trước khi chia.
- **Vì sao:** `integer / integer` là phép chia nguyên và cắt phần thập phân, nên tỷ lệ 0,35 thành 0.
- **Nguồn:** https://www.postgresql.org/docs/18/functions-math.html (bảng toán tử: với kiểu số nguyên, phép chia "truncates the result towards zero")
- **Cấp:** L1 · **Nối với:** skill `cast`, `conditional_agg` · **Kiểm:** PGlite, Sai ≠ Đúng

```sql
-- Q13 bad
SELECT count(*) FILTER (WHERE channel = 'ONLINE') / count(*) AS online_share FROM orders;
```
```sql
-- Q13 good
SELECT round(count(*) FILTER (WHERE channel = 'ONLINE')::numeric / count(*), 4) AS online_share FROM orders;
```

### Q14 · Một lần quét với `FILTER` thay nhiều subquery / Conditional aggregation with FILTER

- **Luật:** nhiều con số trên cùng một bảng với điều kiện khác nhau thì tính trong một `SELECT`, dùng `count(*) FILTER (WHERE …)` (hoặc `CASE` trong aggregate).
- **Vì sao:** mỗi scalar subquery quét bảng thêm một lần. `FILTER` đọc một lần, dễ đọc và dễ thêm cột.
- **Nguồn:** https://www.postgresql.org/docs/18/sql-expressions.html (mục "Aggregate Expressions", `FILTER`)
- **Cấp:** L2 · **Nối với:** skill `conditional_agg` · **Kiểm:** PGlite, Sai = Đúng

```sql
-- Q14 bad
SELECT (SELECT count(*) FROM orders WHERE channel = 'ONLINE') AS online,
       (SELECT count(*) FROM orders WHERE channel = 'STORE') AS store;
```
```sql
-- Q14 good
SELECT count(*) FILTER (WHERE channel = 'ONLINE') AS online,
       count(*) FILTER (WHERE channel = 'STORE') AS store
FROM orders;
```

### Q15 · Lọc dòng ở `WHERE`, lọc nhóm ở `HAVING` / WHERE for rows, HAVING for groups

- **Luật:**
  - điều kiện trên cột thường đặt ở `WHERE`;
  - `HAVING` chỉ cho điều kiện trên aggregate.
- **Vì sao:**
  - `WHERE` chạy trước khi gom nhóm, nên ít dòng hơn được gom và dùng được index;
  - người đọc thấy ngay đâu là điều kiện trên nhóm.
- **Nguồn:** https://www.postgresql.org/docs/18/tutorial-agg.html
- **Cấp:** L1 · **Nối với:** skill `having`, `group_by` · **Kiểm:** PGlite, Sai = Đúng

```sql
-- Q15 bad
SELECT store_id, count(*) AS orders FROM orders GROUP BY store_id HAVING store_id = 3;
```
```sql
-- Q15 good
SELECT store_id, count(*) AS orders FROM orders WHERE store_id = 3 GROUP BY store_id;
```

### Q16 · `UNION ALL` trừ khi thật sự cần khử trùng / UNION ALL unless you mean DISTINCT

- **Luật:** ghép hai tập dòng bằng `UNION ALL`. Chỉ dùng `UNION` khi nghiệp vụ muốn bỏ dòng trùng, và ghi rõ điều đó.
- **Vì sao:**
  - `UNION` khử trùng: tốn một bước sort/hash;
  - nó âm thầm gộp các dòng hợp lệ giống hệt nhau (hai lần trả cùng số tiền), nên tổng sai.
- **Nguồn:** https://www.postgresql.org/docs/18/queries-union.html
- **Cấp:** L2 · **Nối với:** skill `union` · **Kiểm:** PGlite, Sai ≠ Đúng (`payments` có khoản trả trùng có chủ đích)

```sql
-- Q16 bad
SELECT sum(amount_vnd) FROM (
  SELECT order_id, amount_vnd FROM payments WHERE amount_vnd > 0
  UNION
  SELECT order_id, amount_vnd FROM payments WHERE amount_vnd < 0
) t;
```
```sql
-- Q16 good
SELECT sum(amount_vnd) FROM (
  SELECT order_id, amount_vnd FROM payments WHERE amount_vnd > 0
  UNION ALL
  SELECT order_id, amount_vnd FROM payments WHERE amount_vnd < 0
) t;
```

### Q17 · CTE để đặt tên từng bước / Name steps with CTEs

- **Luật:**
  - truy vấn nhiều bước viết thành chuỗi CTE, mỗi CTE một ý, tên nói ý đó, thay cho subquery lồng ba tầng;
  - từ PostgreSQL 12, CTE dùng một lần được inline nên không tốn thêm;
  - muốn ép tính một lần thì ghi `MATERIALIZED`.
- **Vì sao:**
  - đọc từ trên xuống theo đúng thứ tự suy nghĩ;
  - mỗi bước chạy thử riêng được (kiểm từng CTE).
- **Nguồn:** https://www.postgresql.org/docs/18/queries-with.html (mục `MATERIALIZED` / `NOT MATERIALIZED`)
- **Cấp:** L2 · **Nối với:** skill `cte`, `multi_cte` · **Kiểm:** PGlite, Sai = Đúng

```sql
-- Q17 bad
SELECT store_id, avg(total) AS avg_order
FROM (SELECT o.store_id, o.id, sum(oi.qty * oi.unit_price_vnd) AS total
      FROM (SELECT * FROM orders WHERE status = 'PAID') o
      JOIN order_items oi ON oi.order_id = o.id
      GROUP BY o.store_id, o.id) t
GROUP BY store_id ORDER BY store_id;
```
```sql
-- Q17 good
WITH paid_orders AS (
  SELECT id, store_id FROM orders WHERE status = 'PAID'
),
order_totals AS (
  SELECT po.store_id, po.id, sum(oi.qty * oi.unit_price_vnd) AS total
  FROM paid_orders po
  JOIN order_items oi ON oi.order_id = po.id
  GROUP BY po.store_id, po.id
)
SELECT store_id, avg(total) AS avg_order
FROM order_totals
GROUP BY store_id
ORDER BY store_id;
```

### Q18 · Khung cửa sổ: nói rõ `ROWS` cho lũy kế / Spell out ROWS for running totals

- **Luật:**
  - lũy kế từng dòng thì ghi khung `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`;
  - `ORDER BY` trong `OVER` có tiebreaker duy nhất.
- **Vì sao:**
  - khi có `ORDER BY`, khung mặc định là `RANGE … CURRENT ROW`, gồm cả các dòng "ngang hàng" (cùng giá trị sắp xếp);
  - nên mọi dòng cùng ngày nhận cùng một tổng lũy kế, không phải tăng dần.
- **Nguồn:** https://www.postgresql.org/docs/18/sql-expressions.html#SYNTAX-WINDOW-FUNCTIONS (frame mặc định); https://www.postgresql.org/docs/18/tutorial-window.html
- **Cấp:** L3 · **Nối với:** skill `window_agg`; node `a1` · **Kiểm:** PGlite, Sai ≠ Đúng

```sql
-- Q18 bad
SELECT id, order_date,
       count(*) OVER (ORDER BY order_date) AS running_orders
FROM orders WHERE store_id = 1 AND order_date >= DATE '2026-10-01'
ORDER BY order_date, id;
```
```sql
-- Q18 good
SELECT id, order_date,
       count(*) OVER (ORDER BY order_date, id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_orders
FROM orders WHERE store_id = 1 AND order_date >= DATE '2026-10-01'
ORDER BY order_date, id;
```

### Q19 · Lọc theo kết quả window qua CTE / Filter window results in an outer query

- **Luật:** muốn "dòng có hạng 1" thì tính `row_number()`/`rank()` trong CTE hoặc subquery, rồi lọc ở truy vấn ngoài.
- **Vì sao:**
  - window function tính **sau** `WHERE`/`GROUP BY`/`HAVING`, nên không được dùng trong `WHERE`;
  - Postgres báo lỗi `42P20`.
- **Nguồn:** https://www.postgresql.org/docs/18/tutorial-window.html (đoạn "If there is a need to filter or group rows after the window calculations are performed, you can use a sub-select")
- **Cấp:** L2 · **Nối với:** skill `window_rank`, `cte` · **Kiểm:** PGlite, Sai = lỗi `42P20`

```sql
-- Q19 bad
SELECT id, customer_id, order_date
FROM orders
WHERE row_number() OVER (PARTITION BY customer_id ORDER BY order_date DESC, id DESC) = 1;
```
```sql
-- Q19 good
WITH ranked AS (
  SELECT id, customer_id, order_date,
         row_number() OVER (PARTITION BY customer_id ORDER BY order_date DESC, id DESC) AS rn
  FROM orders
  WHERE customer_id IS NOT NULL
)
SELECT id, customer_id, order_date FROM ranked WHERE rn = 1 ORDER BY customer_id LIMIT 5;
```

### Q20 · Semi join bằng `EXISTS`, không `JOIN` + `DISTINCT` / EXISTS for "has any"

- **Luật:**
  - câu hỏi "khách nào có ít nhất một đơn online" viết bằng `EXISTS`;
  - đừng `JOIN` rồi chữa trùng bằng `DISTINCT`, và tệ hơn là quên chữa.
- **Vì sao:** `JOIN` lặp mỗi khách theo số đơn khớp (fan-out). `EXISTS` dừng ở dòng khớp đầu tiên và không bao giờ nhân dòng.
- **Nguồn:** https://www.postgresql.org/docs/18/functions-subquery.html (mục `EXISTS`)
- **Cấp:** L2 · **Nối với:** skill `exists`, `distinct` · **Kiểm:** PGlite, Sai ≠ Đúng

```sql
-- Q20 bad
SELECT count(c.id) FROM customers c
JOIN orders o ON o.customer_id = c.id
WHERE o.channel = 'ONLINE';
```
```sql
-- Q20 good
SELECT count(*) FROM customers c
WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.channel = 'ONLINE');
```

### Q21 · Phân trang keyset thay `OFFSET` sâu / Keyset pagination instead of deep OFFSET

- **Luật:** trang sau lấy bằng `WHERE (khóa sắp xếp) > (giá trị cuối trang trước) ORDER BY … LIMIT n`, không bằng `OFFSET` lớn.
- **Vì sao:**
  - `OFFSET 10000` vẫn phải tạo rồi bỏ 10.000 dòng;
  - trang càng sâu càng chậm;
  - dữ liệu chèn thêm giữa hai lần gọi làm trang lệch.
  - Tài liệu `LIMIT` nói rõ dòng bị `OFFSET` bỏ qua "still have to be computed inside the server".
- **Nguồn:** https://www.postgresql.org/docs/18/queries-limit.html
- **Cấp:** L3 · **Nối với:** skill `limit`, `order_by` · **Kiểm:** PGlite, Sai = Đúng (id liên tục)

```sql
-- Q21 bad
SELECT id, order_date FROM orders ORDER BY id LIMIT 20 OFFSET 1000;
```
```sql
-- Q21 good
SELECT id, order_date FROM orders WHERE id > 1000 ORDER BY id LIMIT 20;
```

### Q22 · Định dạng nhất quán / Consistent, readable style

- **Luật:**
  - từ khóa SQL viết hoa;
  - tên bảng/cột `snake_case` chữ thường;
  - mỗi mệnh đề chính (`SELECT`, `FROM`, `JOIN`, `WHERE`, `GROUP BY`…) một dòng;
  - alias có nghĩa (`AS` rõ ràng);
  - không `GROUP BY 1, 2` trong truy vấn lưu lại.
- **Vì sao:**
  - truy vấn được đọc nhiều hơn được viết;
  - số thứ tự cột vỡ âm thầm khi ai đó chèn một cột vào `SELECT`.
  - (BoonData đã có nút Format, `sql-formatter`.)
- **Nguồn:** https://www.sqlstyle.guide/ (CC BY-SA 4.0); https://www.postgresql.org/docs/18/sql-select.html (mục `GROUP BY`: chấp nhận cả số thứ tự cột đầu ra, nên chèn cột là đổi nghĩa)
- **Cấp:** L1 · **Nối với:** skill `select`, `group_by` · **Kiểm:** PGlite, Sai = Đúng

```sql
-- Q22 bad
select s.city,count(*) from orders o join stores s on s.id=o.store_id group by 1 order by 2 desc,1;
```
```sql
-- Q22 good
SELECT s.city,
       count(*) AS orders
FROM orders AS o
JOIN stores AS s ON s.id = o.store_id
GROUP BY s.city
ORDER BY orders DESC, s.city;
```

## 2. SQL cho data analyst (A)

### A01 · Trục ngày cho kỳ không có dữ liệu / Use a date spine for empty periods

- **Luật:** báo cáo theo ngày/tháng phải sinh đủ các kỳ bằng `generate_series`, rồi `LEFT JOIN` dữ liệu vào, thay vì chỉ `GROUP BY` trên bảng sự kiện.
- **Vì sao:**
  - kỳ không có sự kiện nào biến mất khỏi kết quả;
  - biểu đồ nối liền hai điểm xa nhau;
  - phép so sánh kỳ trước (`lag`) so nhầm kỳ.
- **Nguồn:** https://www.postgresql.org/docs/18/functions-srf.html (`generate_series` với timestamp và interval)
- **Cấp:** L2 · **Nối với:** skill `date_bucket`, `left_join`; node `a3` · **Kiểm:** PGlite, Sai ≠ Đúng (cửa hàng 4 không có đơn trước 2025-09)

```sql
-- A01 bad
SELECT date_trunc('month', order_date)::date AS month, count(*) AS orders
FROM orders WHERE store_id = 4 AND order_date < DATE '2025-12-01'
GROUP BY 1 ORDER BY 1;
```
```sql
-- A01 good
WITH months AS (
  SELECT generate_series(DATE '2025-06-01', DATE '2025-11-01', INTERVAL '1 month')::date AS month
)
SELECT m.month, count(o.id) AS orders
FROM months m
LEFT JOIN orders o
  ON o.store_id = 4
 AND o.order_date >= m.month
 AND o.order_date < m.month + INTERVAL '1 month'
GROUP BY m.month
ORDER BY m.month;
```

### A02 · Gom theo ngày ở múi giờ của doanh nghiệp / Bucket days in the business time zone

- **Luật:**
  - lưu `timestamptz`;
  - khi gom theo ngày, đổi về múi giờ nghiệp vụ trước (`AT TIME ZONE 'Asia/Ho_Chi_Minh'`) rồi mới `::date` / `date_trunc`.
- **Vì sao:**
  - `::date` dùng múi giờ của phiên (`TimeZone`), thường là UTC trên server;
  - đơn lúc 20:00 UTC ngày 31/10 là sáng 01/11 ở Việt Nam, nên doanh thu bị đẩy sang sai ngày, sai tháng.
- **Nguồn:** https://www.postgresql.org/docs/18/functions-datetime.html#FUNCTIONS-DATETIME-ZONECONVERT
- **Cấp:** L2 · **Nối với:** skill `date_math`, `date_bucket` · **Kiểm:** PGlite, Sai ≠ Đúng

```sql
-- A02 bad
SET TIME ZONE 'UTC';
SELECT (TIMESTAMPTZ '2026-10-31 20:00:00+00')::date AS sales_day;
```
```sql
-- A02 good
SET TIME ZONE 'UTC';
SELECT (TIMESTAMPTZ '2026-10-31 20:00:00+00' AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS sales_day;
```

### A03 · Khử trùng lặp theo khóa nghiệp vụ, có thứ tự xác định / Deduplicate on a business key, deterministically

- **Luật:**
  - định nghĩa "trùng" bằng khóa nghiệp vụ (ví dụ cùng đơn, cùng số tiền), không bằng toàn bộ dòng;
  - giữ một dòng bằng `DISTINCT ON (khóa) … ORDER BY khóa, tiêu chí giữ, id` hoặc `row_number()`, luôn có tiebreaker.
- **Vì sao:**
  - `SELECT DISTINCT *` không bỏ được bản ghi trùng có `id` hay thời điểm khác nhau;
  - thiếu tiebreaker thì dòng được giữ đổi giữa các lần chạy.
- **Nguồn:** https://www.postgresql.org/docs/18/sql-select.html#SQL-DISTINCT (DISTINCT ON cần `ORDER BY` để kết quả xác định)
- **Cấp:** L2 · **Nối với:** skill `distinct_on`, `window_rank`; node `c1` · **Kiểm:** PGlite, Sai ≠ Đúng (`payments` có khoản trả trùng có chủ đích)

```sql
-- A03 bad
SELECT count(*) FROM (SELECT DISTINCT * FROM payments WHERE amount_vnd > 0) t;
```
```sql
-- A03 good
SELECT count(*) FROM (
  SELECT DISTINCT ON (order_id, amount_vnd) id, order_id, amount_vnd, paid_at
  FROM payments
  WHERE amount_vnd > 0
  ORDER BY order_id, amount_vnd, paid_at, id
) t;
```

### A04 · Kiểm grain trước khi join / Test the grain before you join

- **Luật:** trước khi join một bảng như thể "mỗi đơn một dòng", chạy truy vấn kiểm: `GROUP BY khóa HAVING count(*) > 1` phải rỗng. Không rỗng thì gộp trước (Q07) hoặc khử trùng (A03).
- **Vì sao:** sai grain là nguồn chính của con số phồng. Một truy vấn kiểm vài dòng rẻ hơn nhiều so với một báo cáo sai được gửi đi.
- **Nguồn:** https://www.postgresql.org/docs/18/tutorial-agg.html (HAVING); khái niệm grain: node `c2` của app
- **Cấp:** L2 · **Nối với:** skill `having`; node `c1`, `c2` · **Kiểm:** PGlite, chạy được (truy vấn kiểm trả về các đơn có hơn một khoản trả)

```sql
-- A04 bad
SELECT o.id, o.order_date, p.amount_vnd
FROM orders o JOIN payments p ON p.order_id = o.id
WHERE o.id = 97;
```
```sql
-- A04 good
SELECT order_id, count(*) AS payments
FROM payments
GROUP BY order_id
HAVING count(*) > 1
ORDER BY order_id
LIMIT 5;
```

### A05 · Ngày "hôm nay" là tham số, không phải `now()` / Pin the as-of date

- **Luật:**
  - báo cáo định kỳ nhận ngày chốt số (as-of) là literal hoặc tham số;
  - không dùng `CURRENT_DATE`/`now()` trong logic chọn kỳ.
- **Vì sao:**
  - chạy lại hôm sau ra số khác, không tái lập được;
  - không đối chiếu được với số đã gửi.
  - (BoonData áp luật này cho mọi Solution: `tests/content.test.ts`.)
- **Nguồn:** https://www.postgresql.org/docs/18/functions-datetime.html#FUNCTIONS-DATETIME-CURRENT (`CURRENT_DATE` đổi theo lúc chạy)
- **Cấp:** L1 · **Nối với:** skill `date_math` · **Kiểm:** PGlite, chạy được

```sql
-- A05 bad
SELECT count(*) FROM orders WHERE order_date >= CURRENT_DATE - 30;
```
```sql
-- A05 good
SELECT count(*) FROM orders
WHERE order_date >  DATE '2026-10-31' - 30
  AND order_date <= DATE '2026-10-31';
```

### A06 · Đối chiếu tổng kiểm sau mỗi phép biến đổi / Reconcile control totals

- **Luật:** sau khi join/lọc để làm bảng báo cáo, so tổng của bảng kết quả với tổng của nguồn (cùng phạm vi). Lệch thì phải giải thích được.
- **Vì sao:**
  - join mất dòng (khóa không khớp) hoặc nhân dòng (fan-out) đều không báo lỗi;
  - tổng kiểm là phép thử rẻ nhất.
- **Nguồn:** https://www.postgresql.org/docs/18/functions-aggregate.html; node `c1` (kiểm chất lượng dữ liệu)
- **Cấp:** L2 · **Nối với:** skill `aggregate`, `join`; node `c1` · **Kiểm:** PGlite, Sai = Đúng (hai tổng bằng nhau: phép join này không mất dòng)

```sql
-- A06 bad
SELECT sum(oi.qty * oi.unit_price_vnd) AS revenue
FROM order_items oi JOIN products p ON p.id = oi.product_id;
```
```sql
-- A06 good
SELECT sum(qty * unit_price_vnd) AS revenue FROM order_items;
```

### A07 · Tỷ lệ phải có mẫu số rõ ràng / Ratios need an explicit denominator

- **Luật:**
  - tỷ lệ "phần trăm đơn đã giao" viết `count(*) FILTER (WHERE …)::numeric / count(*)`;
  - hoặc `avg(CASE WHEN … THEN 1 ELSE 0 END)`, có `ELSE 0`.
- **Vì sao:**
  - `avg(CASE WHEN … THEN 1 END)` không có `ELSE`, nên dòng không thỏa là NULL;
  - `avg` bỏ qua NULL, nên kết quả luôn là 1.
- **Nguồn:** https://www.postgresql.org/docs/18/functions-aggregate.html (aggregate trừ `count(*)` bỏ qua giá trị NULL); https://www.postgresql.org/docs/18/functions-conditional.html
- **Cấp:** L2 · **Nối với:** skill `case_when`, `conditional_agg` · **Kiểm:** PGlite, Sai ≠ Đúng

```sql
-- A07 bad
SELECT avg(CASE WHEN delivered_on IS NOT NULL THEN 1 END) AS delivered_share
FROM orders WHERE channel = 'ONLINE';
```
```sql
-- A07 good
SELECT round(count(*) FILTER (WHERE delivered_on IS NOT NULL)::numeric / count(*), 4) AS delivered_share
FROM orders WHERE channel = 'ONLINE';
```

### A08 · Làm tròn ở bước cuối / Round once, at the end

- **Luật:**
  - tính bằng độ chính xác đầy đủ, chỉ `round()` con số cuối cùng;
  - nếu nghiệp vụ bắt làm tròn từng dòng (hóa đơn), ghi rõ điều đó.
- **Vì sao:** làm tròn từng dòng rồi cộng tích lũy sai số. Hai báo cáo cùng nguồn ra hai con số khác nhau.
- **Nguồn:** https://www.postgresql.org/docs/18/functions-math.html (`round`); https://www.postgresql.org/docs/18/datatype-numeric.html
- **Cấp:** L1 · **Nối với:** skill `aggregate`, `cast` · **Kiểm:** PGlite, Sai ≠ Đúng

```sql
-- A08 bad
SELECT sum(round(qty * unit_price_vnd * 0.9, -3)) AS discounted
FROM order_items WHERE order_id < 500;
```
```sql
-- A08 good
SELECT round(sum(qty * unit_price_vnd * 0.9), -3) AS discounted
FROM order_items WHERE order_id < 500;
```

### A09 · Trung vị cho dữ liệu lệch / Median for skewed data

- **Luật:**
  - "giá trị điển hình" của tiền, thời gian chờ… dùng trung vị `percentile_cont(0.5) WITHIN GROUP (ORDER BY …)`;
  - báo kèm trung bình nếu cần, đặt tên rõ.
- **Vì sao:** vài đơn rất lớn kéo trung bình lên xa so với đơn thông thường.
- **Nguồn:** https://www.postgresql.org/docs/18/functions-aggregate.html#FUNCTIONS-ORDEREDSET-TABLE
- **Cấp:** L2 · **Nối với:** skill `aggregate`; node `a2`, `b7` · **Kiểm:** PGlite, Sai ≠ Đúng

```sql
-- A09 bad
SELECT round(avg(total)) AS typical_order
FROM (SELECT order_id, sum(qty * unit_price_vnd) AS total FROM order_items GROUP BY order_id) t;
```
```sql
-- A09 good
SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY total) AS median_order,
       round(avg(total)) AS mean_order
FROM (SELECT order_id, sum(qty * unit_price_vnd) AS total FROM order_items GROUP BY order_id) t;
```

### A10 · Chuẩn hóa khóa chữ trước khi gom hay join / Normalise text keys first

- **Luật:** khóa dạng chữ nhập tay (tên, email) phải `lower(trim(…))` hoặc làm sạch bằng regex trước khi `GROUP BY`, `DISTINCT`, `JOIN`.
- **Vì sao:** `'  An Nguyen'`, `'an nguyen  '` và `'An Nguyen'` là ba giá trị khác nhau với Postgres, nên một người được đếm ba lần.
- **Nguồn:** https://www.postgresql.org/docs/18/functions-string.html
- **Cấp:** L1 · **Nối với:** skill `string_fn`; node `a8`, `c1` · **Kiểm:** PGlite, Sai ≠ Đúng (`raw_signups` bẩn có chủ đích)

```sql
-- A10 bad
SELECT count(DISTINCT full_name) FROM raw_signups;
```
```sql
-- A10 good
SELECT count(DISTINCT lower(trim(full_name))) FROM raw_signups;
```

### A11 · Tìm bản ghi mồ côi bằng anti join / Find orphans with an anti join

- **Luật:**
  - trước khi `INNER JOIN` hai bảng không có foreign key, đếm bản ghi mồ côi bằng `LEFT JOIN … WHERE phải IS NULL` (hoặc `NOT EXISTS`);
  - báo cáo con số đó cùng kết quả.
- **Vì sao:** `INNER JOIN` âm thầm bỏ các khoản trả không khớp đơn nào. Tổng thanh toán trong báo cáo thấp hơn sổ sách mà không ai biết vì sao.
- **Nguồn:** https://www.postgresql.org/docs/18/queries-table-expressions.html (LEFT OUTER JOIN); https://www.postgresql.org/docs/18/ddl-constraints.html#DDL-CONSTRAINTS-FK
- **Cấp:** L2 · **Nối với:** skill `anti_join`, `left_join`; node `c1` · **Kiểm:** PGlite, Sai ≠ Đúng (8 khoản trả mồ côi có chủ đích)

```sql
-- A11 bad
SELECT count(*) FROM payments p JOIN orders o ON o.id = p.order_id;
```
```sql
-- A11 good
SELECT count(*) AS all_payments,
       count(*) FILTER (WHERE o.id IS NULL) AS orphan_payments
FROM payments p LEFT JOIN orders o ON o.id = p.order_id;
```

### A12 · Kiểm dữ liệu bằng truy vấn "phải trả 0 dòng" / Data tests are queries that must return zero rows

- **Luật:**
  - mỗi giả định của báo cáo (khóa không trùng, không mồ côi, số lượng dương, tổng khớp) viết thành một truy vấn trả về **các dòng vi phạm**;
  - gom các test bằng `UNION ALL`, mỗi dòng một tên test và số lỗi;
  - chạy trước mỗi lần gửi số. Test đạt khi `failures = 0`.
- **Vì sao:**
  - `count(*)` "trông ổn" không chứng minh gì;
  - một truy vấn trả ra chính dòng sai vừa là cảnh báo vừa là chỗ bắt đầu sửa;
  - đây cũng là cách dbt định nghĩa data test: câu `select` tìm bản ghi "failing", "zero failing rows" là đạt.
- **Nguồn:**
  - https://docs.getdbt.com/docs/build/data-tests
  - node `c1` (Kiểm chất lượng dữ liệu) của app
- **Cấp:** L2 · **Nối với:** skill `anti_join`, `having`, `union`; node `c1` · **Kiểm:** PGlite, chạy được: Sai chỉ ra 1.395 khoản trả; Đúng bắt được `orphan_payment` = 8 (hook có chủ đích của `lab`), hai test còn lại 0

```sql
-- A12 bad
SELECT count(*) AS payments FROM payments;
```
```sql
-- A12 good
SELECT 'orphan_payment' AS test, count(*) AS failures
FROM payments p WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.id = p.order_id)
UNION ALL
SELECT 'duplicate_order_line', count(*)
FROM (SELECT order_id, line_no FROM order_items GROUP BY order_id, line_no HAVING count(*) > 1) d
UNION ALL
SELECT 'non_positive_qty', count(*) FROM order_items WHERE qty <= 0;
```

### A13 · Một định nghĩa chỉ số, đặt tên và ghi chú ngay trong database / One documented definition per metric

- **Luật:**
  - mỗi chỉ số dùng chung (doanh thu ròng, khách hoạt động) có **một** định nghĩa: một view (hoặc model) có tên rõ;
  - ghi định nghĩa bằng lời bằng `COMMENT ON VIEW` / `COMMENT ON COLUMN`: tính gì, loại gì, đơn vị, theo ngày nào, ai sở hữu;
  - báo cáo đọc từ view đó, không chép lại công thức.
- **Vì sao:** hai báo cáo tự viết "doanh thu" với bộ lọc khác nhau sẽ ra hai con số khác nhau cho cùng một tháng, và không ai biết số nào đúng.
- **Nguồn:**
  - https://www.postgresql.org/docs/18/sql-comment.html ("COMMENT stores, replaces, or removes the comment on a database object.")
  - https://www.postgresql.org/docs/18/sql-createview.html
- **Cấp:** L2 · **Nối với:** node `b1` (KPI), `c2` · **Kiểm:** PGlite, chạy được: Sai hai "doanh thu tháng 10" lệch nhau (105.026.700 so với 100.981.700, khác ở khoản hoàn tiền); Đúng `obj_description` trả lại đúng định nghĩa

```sql
-- A13 bad
SELECT sum(amount_vnd) FILTER (WHERE amount_vnd > 0) AS revenue_report_a,
       sum(amount_vnd) AS revenue_report_b
FROM payments WHERE paid_at >= TIMESTAMP '2026-10-01' AND paid_at < TIMESTAMP '2026-11-01';
```
```sql
-- A13 good
CREATE VIEW metric_net_revenue_daily AS
SELECT paid_at::date AS day, sum(amount_vnd) AS net_revenue_vnd
FROM payments
GROUP BY paid_at::date;
COMMENT ON VIEW metric_net_revenue_daily IS
  'Net revenue per day in VND: payments minus refunds (negative rows), by payment day. Owner: analytics.';
SELECT obj_description('metric_net_revenue_daily'::regclass, 'pg_class') AS definition;
```

### A14 · Mẫu ngẫu nhiên phải lặp lại được / Make random samples reproducible

- **Luật:**
  - lấy mẫu để kiểm tay hay chia nhóm thì dùng `TABLESAMPLE … REPEATABLE (seed)` hoặc `setseed()` trước `random()`, và ghi seed lại;
  - mọi truy vấn trong báo cáo phải cho cùng kết quả khi chạy lại trên cùng dữ liệu: ngày "hôm nay" cố định (A05), `ORDER BY` có tiebreaker (Q10).
- **Vì sao:** `ORDER BY random()` cho mẫu khác nhau mỗi lần, nên người review không tái hiện được con số, và kết luận "mẫu cho thấy…" không kiểm được.
- **Nguồn:** https://www.postgresql.org/docs/18/sql-select.html#SQL-FROM (`REPEATABLE`: "the same seed and argument values will select the same sample", khi bảng không đổi)
- **Cấp:** L2 · **Nối với:** node `b5` (A/B test) · **Kiểm:** PGlite: Sai `same_sample = false`, Đúng `true`

```sql
-- A14 bad
SELECT (SELECT array_agg(id ORDER BY id) FROM (SELECT id FROM orders ORDER BY random() LIMIT 20) s)
     = (SELECT array_agg(id ORDER BY id) FROM (SELECT id FROM orders ORDER BY random() LIMIT 20) s) AS same_sample;
```
```sql
-- A14 good
SELECT (SELECT array_agg(id ORDER BY id) FROM orders TABLESAMPLE BERNOULLI (2) REPEATABLE (42))
     = (SELECT array_agg(id ORDER BY id) FROM orders TABLESAMPLE BERNOULLI (2) REPEATABLE (42)) AS same_sample;
```

### A15 · `last_value` cần khung tới cuối partition / last_value needs a frame to the end of the partition

- **Luật:**
  - dùng `last_value`/`nth_value` thì luôn ghi khung `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`;
  - hoặc đảo chiều: `first_value(…) OVER (… ORDER BY … DESC)`.
- **Vì sao:** khung mặc định khi có `ORDER BY` chỉ chạy tới dòng hiện tại (và các dòng ngang hàng), nên `last_value` trả về chính dòng hiện tại. Tài liệu nói thẳng: "likely to give unhelpful results for last_value".
- **Nguồn:** https://www.postgresql.org/docs/18/functions-window.html
- **Cấp:** L3 · **Nối với:** skill `window_agg`; node `a1` · **Kiểm:** PGlite, Sai ≠ Đúng: "ngày đơn cuối của mỗi cửa hàng" ra 1.051 cặp (Sai) thay vì 5 (Đúng)

```sql
-- A15 bad
SELECT count(*) FROM (
  SELECT DISTINCT store_id, last_value(order_date) OVER (PARTITION BY store_id ORDER BY order_date) AS last_order
  FROM orders
) t;
```
```sql
-- A15 good
SELECT count(*) FROM (
  SELECT DISTINCT store_id,
         last_value(order_date) OVER (PARTITION BY store_id ORDER BY order_date
                                      ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS last_order
  FROM orders
) t;
```

### A16 · `lag`/`lead` theo thực thể phải có `PARTITION BY` / lag and lead need PARTITION BY the entity

- **Luật:** "đơn trước của cùng khách", "tháng trước của cùng cửa hàng": `lag(...) OVER (PARTITION BY khách ORDER BY ngày, id)`.
- **Vì sao:** thiếu `PARTITION BY`, đơn đầu tiên của mỗi khách nhận ngày đơn cuối của khách **trước đó** trong thứ tự sắp. Khoảng cách giữa hai lần mua bị tính sai mà không có NULL nào báo hiệu.
- **Nguồn:** https://www.postgresql.org/docs/18/tutorial-window.html; https://www.postgresql.org/docs/18/functions-window.html (`lag`)
- **Cấp:** L2 · **Nối với:** skill `window_lag`; node `b2` (cohort) · **Kiểm:** PGlite, Sai ≠ Đúng: 1.199 đơn "có đơn trước" (Sai) thay vì 900 (Đúng): 300 khách thành viên, đơn đầu của 299 khách sau người đầu tiên bị gán "đơn trước" của người khác

```sql
-- A16 bad
SELECT count(*) FILTER (WHERE prev_date IS NOT NULL) AS orders_with_previous
FROM (SELECT customer_id, lag(order_date) OVER (ORDER BY customer_id, order_date, id) AS prev_date
      FROM orders WHERE customer_id IS NOT NULL) t;
```
```sql
-- A16 good
SELECT count(*) FILTER (WHERE prev_date IS NOT NULL) AS orders_with_previous
FROM (SELECT customer_id, lag(order_date) OVER (PARTITION BY customer_id ORDER BY order_date, id) AS prev_date
      FROM orders WHERE customer_id IS NOT NULL) t;
```

### A17 · Top N: chọn luật hòa (tie) có chủ đích / Top N: choose the tie rule on purpose

- **Luật:**
  - "top N" phải nói rõ khi bằng điểm thì sao: `rank()` (giữ mọi dòng bằng nhau, có thể hơn N), `dense_rank()`, hay `row_number()` với tiebreaker nghiệp vụ trong `ORDER BY`;
  - không dùng `row_number()` với `ORDER BY` không duy nhất.
- **Vì sao:** `row_number()` cắt ngẫu nhiên giữa các dòng bằng nhau: sản phẩm nào lọt top đổi giữa các lần chạy, và hai sản phẩm bằng điểm bị đối xử khác nhau.
- **Nguồn:** https://www.postgresql.org/docs/18/functions-window.html (`rank`: "the row_number of the first row in its peer group")
- **Cấp:** L2 · **Nối với:** skill `window_rank`; node `a9` · **Kiểm:** PGlite, Sai ≠ Đúng: top 2 theo số dòng bán, Sai 2 sản phẩm (chọn 1 trong 3 sản phẩm cùng 158), Đúng 4

```sql
-- A17 bad
SELECT product_id, lines FROM (
  SELECT product_id, count(*) AS lines, row_number() OVER (ORDER BY count(*) DESC) AS rn
  FROM order_items GROUP BY product_id
) t WHERE rn <= 2 ORDER BY lines DESC, product_id;
```
```sql
-- A17 good
SELECT product_id, lines FROM (
  SELECT product_id, count(*) AS lines, rank() OVER (ORDER BY count(*) DESC) AS rnk
  FROM order_items GROUP BY product_id
) t WHERE rnk <= 2 ORDER BY lines DESC, product_id;
```

### A18 · Trung bình của trung bình / Don't average averages

- **Luật:** tỷ lệ và trung bình tổng thể tính từ dữ liệu chi tiết (`sum(x) / count(*)` trên toàn tập), không lấy trung bình của các trung bình nhóm. Cần gộp từ bảng tổng hợp thì giữ cả tử và mẫu.
- **Vì sao:** mỗi nhóm nhận trọng số bằng nhau, bất kể cỡ nhóm. Cửa hàng ít đơn kéo lệch con số chung.
- **Nguồn:** https://www.postgresql.org/docs/18/functions-aggregate.html
- **Cấp:** L2 · **Nối với:** skill `aggregate`, `group_by`; node `b1` · **Kiểm:** PGlite, Sai ≠ Đúng: giá trị đơn trung bình 474.919 (Sai) so với 477.959 (Đúng)

```sql
-- A18 bad
SELECT round(avg(store_avg)) AS avg_order_vnd FROM (
  SELECT o.store_id, avg(t.total) AS store_avg
  FROM orders o JOIN (SELECT order_id, sum(qty * unit_price_vnd) AS total FROM order_items GROUP BY order_id) t ON t.order_id = o.id
  GROUP BY o.store_id
) s;
```
```sql
-- A18 good
SELECT round(avg(t.total)) AS avg_order_vnd
FROM (SELECT order_id, sum(qty * unit_price_vnd) AS total FROM order_items GROUP BY order_id) t;
```

### A19 · `AT TIME ZONE` đổi chiều theo kiểu dữ liệu / AT TIME ZONE works in opposite directions

- **Luật:**
  - `timestamp` (không múi giờ) chứa giờ UTC thì đổi sang giờ Việt Nam bằng **hai bước**: `ts AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'`;
  - `timestamptz` chỉ cần một bước (A02);
  - ghi rõ trong tài liệu bảng cột `timestamp` đang chứa giờ của múi nào.
- **Vì sao:**
  - với `timestamp`, `AT TIME ZONE z` hiểu giá trị **là giờ tại z** và trả `timestamptz`;
  - với `timestamptz`, nó đổi **sang** giờ tại z.
  - Viết một bước trên `timestamp` UTC là dịch ngược 7 giờ: đơn 20:00 UTC (03:00 sáng hôm sau ở Việt Nam) bị xếp vào hôm trước.
- **Nguồn:** https://www.postgresql.org/docs/18/functions-datetime.html#FUNCTIONS-DATETIME-ZONECONVERT
- **Cấp:** L3 · **Nối với:** skill `date_math`, `date_bucket` · **Kiểm:** PGlite, Sai ≠ Đúng: Sai ra ngày 2026-10-31, Đúng 2026-11-01

```sql
-- A19 bad
SET LOCAL TIME ZONE 'UTC';
SELECT (TIMESTAMP '2026-10-31 20:00:00' AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS sales_day;
```
```sql
-- A19 good
SET LOCAL TIME ZONE 'UTC';
SELECT (TIMESTAMP '2026-10-31 20:00:00' AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS sales_day;
```

### A20 · Cộng `interval '1 day'`, không `'24 hours'`, khi muốn "cùng giờ hôm sau" / Add 1 day, not 24 hours, across DST

- **Luật:** lịch hẹn, "cùng giờ ngày mai", lặp theo ngày: cộng `interval '1 day'` trên `timestamptz` ở đúng múi giờ phiên. Đo thời lượng thật (SLA, thời gian xử lý) mới dùng giờ.
- **Vì sao:** ở múi giờ có giờ mùa hè, ngày đổi giờ dài 23 hoặc 25 tiếng. `'24 hours'` lệch một giờ so với lịch. Việt Nam không đổi giờ, nhưng dữ liệu đối tác châu Âu/Mỹ thì có.
- **Nguồn:** https://www.postgresql.org/docs/18/functions-datetime.html (đoạn đầu: `interval '1 day'` "does not necessarily have the same result as" `interval '24 hours'`)
- **Cấp:** L3 · **Nối với:** skill `date_math` · **Kiểm:** PGlite, Sai ≠ Đúng: ở `Europe/Berlin` qua đêm đổi giờ 25/10/2026, Sai ra 08:00, Đúng 09:00

```sql
-- A20 bad
SET LOCAL TIME ZONE 'Europe/Berlin';
SELECT (TIMESTAMPTZ '2026-10-24 09:00:00' + interval '24 hours')::text AS next_meeting;
```
```sql
-- A20 good
SET LOCAL TIME ZONE 'Europe/Berlin';
SELECT (TIMESTAMPTZ '2026-10-24 09:00:00' + interval '1 day')::text AS next_meeting;
```

### A21 · Đếm khách riêng biệt không cộng dồn được / Distinct counts are not additive

- **Luật:**
  - số khách riêng biệt của tháng tính trực tiếp trên cả tháng (`count(DISTINCT …)` trên khoảng tháng), không cộng số khách riêng biệt của từng ngày;
  - bảng tổng hợp theo ngày phải ghi rõ cột nào cộng được (doanh thu, số đơn) và cột nào không (khách riêng biệt, tỷ lệ).
- **Vì sao:** một khách quay lại ba ngày được đếm ba lần, nên MAU bị phồng.
- **Nguồn:** https://www.postgresql.org/docs/18/functions-aggregate.html (`count(DISTINCT …)`); https://www.postgresql.org/docs/18/sql-expressions.html#SYNTAX-AGGREGATES
- **Cấp:** L2 · **Nối với:** skill `distinct`, `aggregate`; node `b1`, `b2` · **Kiểm:** PGlite, Sai ≠ Đúng: tháng 10 có 266 "khách" (Sai) so với 200 (Đúng)

```sql
-- A21 bad
SELECT sum(dau) AS october_users FROM (
  SELECT ts::date AS day, count(DISTINCT user_id) AS dau
  FROM app_events WHERE ts >= TIMESTAMP '2026-10-01' AND ts < TIMESTAMP '2026-11-01'
  GROUP BY ts::date
) d;
```
```sql
-- A21 good
SELECT count(DISTINCT user_id) AS october_users
FROM app_events WHERE ts >= TIMESTAMP '2026-10-01' AND ts < TIMESTAMP '2026-11-01';
```

## 3. Thiết kế schema PostgreSQL (S)

### S01 · Thời điểm dùng `timestamptz` / Store instants as timestamptz

- **Luật:**
  - một thời điểm có thật (đơn tạo lúc, thanh toán lúc) lưu bằng `timestamptz`;
  - `timestamp` không múi giờ chỉ cho giờ "trừu tượng" không làm phép tính (giờ mở cửa trên lịch);
  - không dùng `timetz`, `timestamp(0)`.
- **Vì sao:**
  - `timestamp` không biết múi giờ, nên cộng trừ qua đổi giờ hay giữa hai múi giờ cho kết quả sai;
  - lưu "UTC" trong `timestamp` cũng không giúp: DB không biết đó là UTC.
  - `timestamptz` không tốn thêm byte nào (cùng 8 byte).
- **Nguồn:**
  - https://wiki.postgresql.org/wiki/Don%27t_Do_This#Don.27t_use_timestamp_.28without_time_zone.29
  - https://www.postgresql.org/docs/18/datatype-datetime.html
- **Cấp:** L1 · **Nối với:** skill `date_math` · **Kiểm:** PGlite, Sai ≠ Đúng (cùng chuỗi đầu vào, hai phiên khác múi giờ)

```sql
-- S01 bad
CREATE TABLE ev_bad (at timestamp NOT NULL);
SET TIME ZONE 'Asia/Ho_Chi_Minh';
INSERT INTO ev_bad VALUES ('2026-10-31 08:00:00+07');
SET TIME ZONE 'UTC';
SELECT at::text FROM ev_bad;
```
```sql
-- S01 good
CREATE TABLE ev_good (at timestamptz NOT NULL);
SET TIME ZONE 'Asia/Ho_Chi_Minh';
INSERT INTO ev_good VALUES ('2026-10-31 08:00:00+07');
SET TIME ZONE 'UTC';
SELECT at::text FROM ev_good;
```

### S02 · `text` + `CHECK`, không `char(n)` / text with a CHECK, not char(n)

- **Luật:**
  - chuỗi lưu bằng `text`, ràng buộc độ dài/định dạng bằng `CHECK`;
  - không dùng `char(n)`;
  - không đặt `varchar(n)` theo thói quen với số tùy hứng.
- **Vì sao:**
  - `char(n)` âm thầm đệm khoảng trắng: mã 2 ký tự vào cột `char(3)` không báo lỗi;
  - nó không nhanh hơn;
  - `varchar(255)` "cho chắc" chỉ tạo lỗi production về sau, lưu trữ y như `text`.
- **Nguồn:**
  - https://wiki.postgresql.org/wiki/Don%27t_Do_This#Text_storage
  - https://www.postgresql.org/docs/18/datatype-character.html
- **Cấp:** L1 · **Nối với:** chưa có (L1 Postgres trong `db-engine-knowledge.md` §3.1) · **Kiểm:** PGlite, Đúng = lỗi `23514`, Sai thì nhận dữ liệu sai

```sql
-- S02 bad
CREATE TABLE port_bad (code char(3) PRIMARY KEY);
INSERT INTO port_bad VALUES ('VN');
SELECT '[' || code::text || ']' AS stored, octet_length(code) AS bytes FROM port_bad;
```
```sql
-- S02 good
CREATE TABLE port_good (code text PRIMARY KEY CHECK (code ~ '^[A-Z]{3}$'));
INSERT INTO port_good VALUES ('VN');
```

### S03 · Tiền dùng `numeric` (hoặc số nguyên đơn vị nhỏ nhất) / Money as numeric

- **Luật:**
  - tiền lưu `numeric(p, s)`, hoặc `bigint` theo đơn vị nhỏ nhất (VND, cent);
  - không dùng `float8`/`real`;
  - không dùng kiểu `money`.
- **Vì sao:**
  - số thực nhị phân không biểu diễn đúng 0,1, nên tổng lệch vài đồng và phép so sánh bằng sai;
  - `money` phụ thuộc thiết lập `lc_monetary` và không có phần lẻ dưới cent.
- **Nguồn:**
  - https://www.postgresql.org/docs/18/datatype-numeric.html (floating-point "inexact")
  - https://wiki.postgresql.org/wiki/Don%27t_Do_This#Don.27t_use_money
- **Cấp:** L1 · **Nối với:** skill `cast` · **Kiểm:** PGlite, Sai ≠ Đúng

```sql
-- S03 bad
SELECT 0.1::float8 + 0.2::float8 = 0.3::float8 AS equal;
```
```sql
-- S03 good
SELECT 0.1::numeric + 0.2::numeric = 0.3::numeric AS equal;
```

### S04 · Cột tự tăng: `IDENTITY`, không `serial` / Identity columns, not serial

- **Luật:**
  - khóa thay thế dạng số dùng `bigint GENERATED ALWAYS AS IDENTITY`;
  - không dùng `serial`/`bigserial` trong schema mới;
  - chọn `bigint` thay vì `int` cho bảng có thể lớn.
- **Vì sao:**
  - `serial` là sequence rời có chủ sở hữu, quyền và phụ thuộc riêng, dễ lệch khi đổi owner, copy bảng;
  - `IDENTITY` là cú pháp chuẩn SQL, gắn với cột;
  - `ALWAYS` chặn chèn tay làm lệch sequence.
  - Hết số `int` (2,1 tỷ) là một lỗi production khó sửa.
- **Nguồn:**
  - https://wiki.postgresql.org/wiki/Don%27t_Do_This#Don.27t_use_serial
  - https://www.postgresql.org/docs/18/sql-createtable.html (`GENERATED … AS IDENTITY`)
- **Cấp:** L1 · **Nối với:** chưa có · **Kiểm:** PGlite, Đúng = lỗi `428C9` khi chèn tay id (Sai thì nhận, rồi sequence va chạm sau)

```sql
-- S04 bad
CREATE TABLE ticket_bad (id serial PRIMARY KEY, title text NOT NULL);
INSERT INTO ticket_bad (id, title) VALUES (1, 'typed by hand');
```
```sql
-- S04 good
CREATE TABLE ticket_good (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, title text NOT NULL);
INSERT INTO ticket_good (id, title) VALUES (1, 'typed by hand');
```

### S05 · UUID thì dùng `uuidv7()` / Prefer time-ordered UUIDv7

- **Luật:**
  - cần khóa sinh ở client hoặc không đoán được thì dùng `uuid` với `uuidv7()` (có sẵn từ PostgreSQL 18);
  - không dùng UUID ngẫu nhiên v4 làm khóa chính của bảng ghi nhiều;
  - không cần các điều đó thì `bigint IDENTITY` (S04) gọn nhất (8 byte so với 16).
- **Vì sao:**
  - UUIDv7 bắt đầu bằng mốc thời gian, nên giá trị mới luôn nằm cuối B-tree như số tăng dần;
  - UUIDv4 rải ngẫu nhiên khắp index: chèn vào trang bất kỳ, nhiều page split, cache kém, WAL lớn hơn.
  - Lưu ý: v7 lộ thời điểm tạo.
- **Nguồn:**
  - https://www.postgresql.org/docs/18/functions-uuid.html
  - https://www.postgresql.org/docs/18/release-18.html
  - RFC 9562: https://www.rfc-editor.org/rfc/rfc9562
- **Cấp:** L2 · **Nối với:** chưa có · **Kiểm:** PGlite, chạy được (`uuid_extract_version` = 7 và hai giá trị sinh liên tiếp tăng dần)

```sql
-- S05 bad
CREATE TABLE doc_bad (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), body text);
SELECT uuid_extract_version(gen_random_uuid()) AS version;
```
```sql
-- S05 good
CREATE TABLE doc_good (id uuid PRIMARY KEY DEFAULT uuidv7(), body text);
SELECT uuid_extract_version(a) AS version, a < b AS ordered
FROM (SELECT uuidv7() AS a) x, LATERAL (SELECT uuidv7() AS b) y;
```

### S06 · Để database giữ luật: PK, FK, NOT NULL, UNIQUE, CHECK / Let constraints enforce the rules

- **Luật:**
  - mọi bảng có primary key;
  - quan hệ có foreign key;
  - cột bắt buộc `NOT NULL`;
  - luật miền giá trị bằng `CHECK`;
  - khóa tự nhiên bằng `UNIQUE`.
- **Vì sao:**
  - kiểm ở ứng dụng bị vượt qua bởi script, job, ứng dụng thứ hai;
  - ràng buộc chặn dữ liệu sai ngay lúc ghi, và planner còn dùng nó (ví dụ bỏ join thừa).
- **Nguồn:** https://www.postgresql.org/docs/18/ddl-constraints.html
- **Cấp:** L1 · **Nối với:** chưa có (`lab.payments` cố ý thiếu FK để dạy node `c1`) · **Kiểm:** PGlite, Đúng = lỗi `23514`

```sql
-- S06 bad
CREATE TABLE line_bad (order_id int, qty int, unit_price_vnd int);
INSERT INTO line_bad VALUES (NULL, -3, 50000);
```
```sql
-- S06 good
CREATE TABLE line_good (
  order_id int NOT NULL REFERENCES orders (id),
  line_no int NOT NULL,
  qty int NOT NULL CHECK (qty > 0),
  unit_price_vnd int NOT NULL CHECK (unit_price_vnd >= 0),
  PRIMARY KEY (order_id, line_no)
);
INSERT INTO line_good VALUES (1, 1, -3, 50000);
```

### S07 · `UNIQUE … NULLS NOT DISTINCT` khi NULL cũng phải duy nhất / NULLS NOT DISTINCT

- **Luật:** ràng buộc duy nhất trên cột có thể NULL mà nghiệp vụ coi NULL là "một giá trị" (mỗi khách chỉ một địa chỉ mặc định, kể cả khách vãng lai NULL) dùng `UNIQUE NULLS NOT DISTINCT` (từ PostgreSQL 15).
- **Vì sao:** mặc định hai NULL "khác nhau", nên `UNIQUE (customer_id, kind)` vẫn cho chèn nhiều dòng `(NULL, 'default')`.
- **Nguồn:** https://www.postgresql.org/docs/18/sql-createtable.html (`NULLS [ NOT ] DISTINCT`); https://www.postgresql.org/docs/18/ddl-constraints.html#DDL-CONSTRAINTS-UNIQUE-CONSTRAINTS
- **Cấp:** L2 · **Nối với:** skill `null_logic` · **Kiểm:** PGlite, Đúng = lỗi `23505`

```sql
-- S07 bad
CREATE TABLE pref_bad (customer_id int, kind text NOT NULL, UNIQUE (customer_id, kind));
INSERT INTO pref_bad VALUES (NULL, 'default'), (NULL, 'default');
```
```sql
-- S07 good
CREATE TABLE pref_good (customer_id int, kind text NOT NULL, UNIQUE NULLS NOT DISTINCT (customer_id, kind));
INSERT INTO pref_good VALUES (NULL, 'default'), (NULL, 'default');
```

### S08 · Tên `snake_case` chữ thường, không nháy kép / Lower-case snake_case names

- **Luật:**
  - tên bảng, cột chữ thường, `snake_case`, không cần nháy kép;
  - tên đẹp cho báo cáo thì đặt bằng alias.
- **Vì sao:**
  - Postgres hạ chữ thường mọi tên không nháy;
  - tạo bằng `"OrderId"` thì mọi truy vấn về sau phải nháy đúng hoa thường, quên là lỗi `42703`.
- **Nguồn:**
  - https://wiki.postgresql.org/wiki/Don%27t_Do_This#Don.27t_use_upper_case_table_or_column_names
  - https://www.postgresql.org/docs/18/sql-syntax-lexical.html#SQL-SYNTAX-IDENTIFIERS
- **Cấp:** L1 · **Nối với:** skill `select` · **Kiểm:** PGlite, Sai = lỗi `42703`

```sql
-- S08 bad
CREATE TABLE "Shipments" ("ShipmentId" int PRIMARY KEY);
SELECT ShipmentId FROM "Shipments";
```
```sql
-- S08 good
CREATE TABLE shipments_demo (shipment_id int PRIMARY KEY);
SELECT shipment_id AS "Shipment ID" FROM shipments_demo;
```

### S09 · Chuẩn hóa cho OLTP, phi chuẩn hóa có chủ đích cho phân tích / Normalise OLTP, denormalise on purpose

- **Luật:**
  - bảng giao dịch tới dạng chuẩn 3: mỗi sự thật lưu một chỗ;
  - lặp dữ liệu chỉ khi có lý do đo được: bảng phân tích kiểu star schema, cột tính sẵn có cơ chế cập nhật;
  - ghi rõ grain của bảng.
- **Vì sao:** thành phố của khách chép vào mọi đơn sẽ lệch nhau khi khách chuyển nhà. Phân tích lại cần lịch sử đó, nên dùng SCD loại 2 (node `c3`), không chép bừa.
- **Nguồn:**
  - https://www.postgresql.org/docs/18/ddl-constraints.html#DDL-CONSTRAINTS-FK (quan hệ qua khóa)
  - Kimball Group, Dimensional Modeling Techniques: https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/
- **Cấp:** L2 · **Nối với:** skill `join`; node `c2`, `c3`, `d6` · **Kiểm:** PGlite, chạy được

```sql
-- S09 bad
CREATE TABLE order_flat (order_id int PRIMARY KEY, customer_id int, customer_city text, customer_email text);
```
```sql
-- S09 good
CREATE TABLE order_norm (order_id int PRIMARY KEY, customer_id int NOT NULL REFERENCES customers (id));
SELECT o.order_id, c.city FROM order_norm o JOIN customers c ON c.id = o.customer_id;
```

### S10 · Multi-tenant: `tenant_id` mọi nơi + RLS có `FORCE` / tenant_id everywhere, RLS forced

- **Luật:** (mô hình nhiều khách thuê chung bảng)
  - mỗi bảng có `tenant_id NOT NULL`, đứng đầu primary key và index (`(tenant_id, id)`);
  - foreign key cũng gồm `tenant_id`;
  - bật Row Level Security với policy đọc tenant từ thiết lập phiên;
  - `FORCE ROW LEVEL SECURITY` để cả owner của bảng cũng bị lọc;
  - ứng dụng không chạy bằng superuser hay role `BYPASSRLS`.
- **Vì sao:**
  - một truy vấn quên `WHERE tenant_id = …` là lộ dữ liệu khách khác;
  - RLS là lớp phòng thủ thứ hai;
  - không có `FORCE`, owner bỏ qua policy; superuser luôn bỏ qua;
  - `tenant_id` đứng đầu khóa giúp index dùng được cho mọi truy vấn trong một tenant, và sau này chia partition theo tenant.
- **Nguồn:**
  - https://www.postgresql.org/docs/18/ddl-rowsecurity.html
  - https://www.postgresql.org/docs/18/sql-altertable.html (`FORCE ROW LEVEL SECURITY`)
- **Cấp:** L4 · **Nối với:** chưa có · **Kiểm:** PGlite, Sai ≠ Đúng (role thường, owner của bảng: Sai thấy 4 dòng của 2 tenant, Đúng thấy 2)

```sql
-- S10 bad
CREATE ROLE app_owner NOLOGIN;
CREATE TABLE invoices_mt (tenant_id int NOT NULL, id int NOT NULL, amount int NOT NULL, PRIMARY KEY (tenant_id, id));
INSERT INTO invoices_mt VALUES (1, 1, 100), (1, 2, 200), (2, 1, 999), (2, 2, 888);
ALTER TABLE invoices_mt OWNER TO app_owner;
GRANT USAGE ON SCHEMA lab TO app_owner;
ALTER TABLE invoices_mt ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_only ON invoices_mt USING (tenant_id = current_setting('app.tenant_id')::int);
SET app.tenant_id = '1';
SET ROLE app_owner;
SELECT count(*) FROM invoices_mt;
```
```sql
-- S10 good
CREATE ROLE app_owner NOLOGIN;
CREATE TABLE invoices_mt (tenant_id int NOT NULL, id int NOT NULL, amount int NOT NULL, PRIMARY KEY (tenant_id, id));
INSERT INTO invoices_mt VALUES (1, 1, 100), (1, 2, 200), (2, 1, 999), (2, 2, 888);
ALTER TABLE invoices_mt OWNER TO app_owner;
GRANT USAGE ON SCHEMA lab TO app_owner;
ALTER TABLE invoices_mt ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices_mt FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_only ON invoices_mt USING (tenant_id = current_setting('app.tenant_id')::int);
SET app.tenant_id = '1';
SET ROLE app_owner;
SELECT count(*) FROM invoices_mt;
```

### S11 · Partition chỉ khi có lý do, và truy vấn phải có khóa partition / Partition for a reason

- **Luật:**
  - chia partition (thường `RANGE` theo thời gian) khi bảng rất lớn và có nhu cầu bỏ dữ liệu cũ theo kỳ (`DETACH`/`DROP` thay cho `DELETE` lớn) hoặc truy vấn luôn lọc theo kỳ;
  - mọi truy vấn nóng phải lọc theo khóa partition để có partition pruning;
  - primary key phải chứa khóa partition.
- **Vì sao:**
  - partition không làm truy vấn nhanh hơn nếu không cắt bớt được partition nào;
  - quá nhiều partition làm planning chậm;
  - không dùng table inheritance kiểu cũ: partitioning khai báo đã thay nó.
- **Nguồn:**
  - https://www.postgresql.org/docs/18/ddl-partitioning.html (mục "Best Practices for Declarative Partitioning", "Partition Pruning")
  - https://wiki.postgresql.org/wiki/Don%27t_Do_This#Don.27t_use_table_inheritance
- **Cấp:** L4 · **Nối với:** skill `explain_read` · **Kiểm:** PGlite, kế hoạch (Sai đọc cả hai partition, Đúng chỉ `ev_2026_10`)

```sql
-- S11 bad
CREATE TABLE ev (id bigint NOT NULL, at date NOT NULL, kind text NOT NULL, PRIMARY KEY (id, at)) PARTITION BY RANGE (at);
CREATE TABLE ev_2026_09 PARTITION OF ev FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE ev_2026_10 PARTITION OF ev FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
EXPLAIN (COSTS OFF) SELECT count(*) FROM ev WHERE kind = 'login';
```
```sql
-- S11 good
CREATE TABLE ev (id bigint NOT NULL, at date NOT NULL, kind text NOT NULL, PRIMARY KEY (id, at)) PARTITION BY RANGE (at);
CREATE TABLE ev_2026_09 PARTITION OF ev FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE ev_2026_10 PARTITION OF ev FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
EXPLAIN (COSTS OFF) SELECT count(*) FROM ev WHERE kind = 'login' AND at >= DATE '2026-10-01' AND at < DATE '2026-11-01';
```

### S12 · `jsonb` cho thuộc tính thật sự động, cột thật cho thứ hay lọc / jsonb for the dynamic part only

- **Luật:**
  - dùng `jsonb` (không phải `json`) cho thuộc tính thay đổi theo loại (props sự kiện);
  - thuộc tính bạn lọc, join, ràng buộc thường xuyên thì đưa thành cột có kiểu;
  - không dựng bảng EAV (entity, attribute, value) chung.
- **Vì sao:**
  - cột thật có kiểu, `NOT NULL`, `CHECK`, thống kê planner;
  - `jsonb` lọc được bằng GIN (I08) nhưng planner đoán số dòng kém hơn;
  - EAV biến mỗi truy vấn thành một chuỗi self-join.
- **Nguồn:** https://www.postgresql.org/docs/18/datatype-json.html (mục "Designing JSON Documents", jsonb vs json)
- **Cấp:** L2 · **Nối với:** node `a7` · **Kiểm:** PGlite, Sai = Đúng (cùng câu hỏi trên `lab.app_events.props`, Đúng dùng cột tính sẵn)

```sql
-- S12 bad
SELECT count(*) FROM app_events WHERE props ->> 'device' = 'ios';
```
```sql
-- S12 good
ALTER TABLE app_events ADD COLUMN device text GENERATED ALWAYS AS (props ->> 'device') STORED;
SELECT count(*) FROM app_events WHERE device = 'ios';
```

## 4. Index (I)

### I01 · Index cho truy vấn, không cho cột / Index for a query, check with EXPLAIN

- **Luật:**
  - tạo index từ một truy vấn thật, chạy thường xuyên, có điều kiện chọn lọc (`WHERE`, `JOIN`, `ORDER BY … LIMIT`);
  - sau khi tạo, xác nhận bằng `EXPLAIN` rằng planner dùng nó.
- **Vì sao:**
  - index không được dùng chỉ tốn chỗ và làm chậm mọi lần ghi;
  - planner chọn Seq Scan khi điều kiện lấy phần lớn bảng (xem I09).
- **Nguồn:** https://www.postgresql.org/docs/18/indexes-intro.html; https://www.postgresql.org/docs/18/using-explain.html
- **Cấp:** L2 · **Nối với:** skill `index_design`, `explain_read` · **Kiểm:** PGlite, kế hoạch (Sai Seq Scan, Đúng có Index)

```sql
-- I01 bad
EXPLAIN (COSTS OFF) SELECT id, amount_vnd FROM payments WHERE order_id = 1234;
```
```sql
-- I01 good
CREATE INDEX payments_order_ix ON payments (order_id);
EXPLAIN (COSTS OFF) SELECT id, amount_vnd FROM payments WHERE order_id = 1234;
```

### I02 · Index nhiều cột: cột so bằng trước, cột khoảng sau / Composite order: equality first, range last

- **Luật:** index nhiều cột đặt các cột so sánh bằng (`=`) trước, cột so sánh khoảng (`>=`, `<`, `BETWEEN`) hoặc cột sắp xếp sau cùng.
- **Vì sao:**
  - phần index phải quét được xác định bởi các điều kiện bằng trên cột đầu, cộng điều kiện khoảng trên cột ngay sau đó;
  - cột khoảng đứng đầu buộc quét mọi `store_id` trong khoảng ngày rồi lọc lại;
  - tài liệu mô tả đúng ví dụ `(a, b, c)` với `a = 5 AND b >= 42 AND c < 77`.
  - Từ PostgreSQL 18, B-tree có **skip scan**: index vẫn dùng được khi cột đầu không có điều kiện, nhờ lặp qua từng giá trị của cột đầu. Cách này chỉ tốt khi cột đầu có ít giá trị. Thứ tự "bằng trước, khoảng sau" vẫn là lựa chọn rẻ nhất, như số cost đo được ở dưới.
- **Nguồn:** https://www.postgresql.org/docs/18/indexes-multicolumn.html
- **Cấp:** L3 · **Nối với:** skill `index_design` · **Kiểm:** PGlite, cost Đúng < Sai (cùng truy vấn, chỉ khác thứ tự cột)

```sql
-- I02 bad
CREATE INDEX orders_date_store_ix ON orders (order_date, store_id);
EXPLAIN (FORMAT JSON)
SELECT count(*) FROM orders WHERE store_id = 3 AND order_date >= DATE '2026-01-01';
```
```sql
-- I02 good
CREATE INDEX orders_store_date_ix ON orders (store_id, order_date);
EXPLAIN (FORMAT JSON)
SELECT count(*) FROM orders WHERE store_id = 3 AND order_date >= DATE '2026-01-01';
```

### I03 · Partial index cho tập con hay hỏi / Partial indexes for the hot subset

- **Luật:** khi truy vấn luôn nhắm một tập con nhỏ (đơn chưa giao, việc đang chờ), index chỉ tập đó: `CREATE INDEX … WHERE delivered_on IS NULL`.
- **Vì sao:**
  - index nhỏ hơn nhiều, rẻ hơn khi ghi, nằm vừa bộ nhớ;
  - planner dùng nó khi điều kiện truy vấn suy ra được điều kiện của index.
- **Nguồn:** https://www.postgresql.org/docs/18/indexes-partial.html
- **Cấp:** L3 · **Nối với:** skill `index_design` · **Kiểm:** PGlite, kích thước Đúng < Sai (`pg_relation_size`, cùng câu hỏi "đơn online chưa giao của khách X")

```sql
-- I03 bad
CREATE INDEX orders_cust_full_ix ON orders (customer_id);
SELECT pg_relation_size('orders_cust_full_ix') AS bytes;
```
```sql
-- I03 good
CREATE INDEX orders_cust_pending_ix ON orders (customer_id)
  WHERE channel = 'ONLINE' AND delivered_on IS NULL;
SELECT pg_relation_size('orders_cust_pending_ix') AS bytes;
```

### I04 · Covering index với `INCLUDE` cho index-only scan / Covering indexes with INCLUDE

- **Luật:**
  - truy vấn nóng chỉ đọc vài cột thì thêm các cột đó vào index bằng `INCLUDE (…)` (không làm khóa);
  - giữ bảng được vacuum để visibility map cho phép index-only scan.
- **Vì sao:**
  - index-only scan trả kết quả từ index, không đọc heap;
  - `INCLUDE` không làm cột thành một phần thứ tự khóa và không áp ràng buộc `UNIQUE` lên nó;
  - đừng nhét cột rộng: index phình.
- **Nguồn:** https://www.postgresql.org/docs/18/indexes-index-only-scans.html
- **Cấp:** L3 · **Nối với:** skill `index_design`; node `a10` · **Kiểm:** PGlite, kế hoạch (Đúng có `Index Only Scan`, Sai không)

```sql
-- I04 bad
CREATE INDEX orders_store_ix ON orders (store_id);
EXPLAIN (COSTS OFF) SELECT store_id, order_date FROM orders WHERE store_id = 3;
```
```sql
-- I04 good
CREATE INDEX orders_store_cover_ix ON orders (store_id) INCLUDE (order_date);
EXPLAIN (COSTS OFF) SELECT store_id, order_date FROM orders WHERE store_id = 3;
```

### I05 · Expression index khi truy vấn luôn dùng một biểu thức / Expression indexes

- **Luật:**
  - truy vấn luôn so `lower(email)` thì index chính biểu thức đó: `CREATE INDEX … (lower(email))`;
  - viết điều kiện đúng y biểu thức ấy.
- **Vì sao:**
  - index trên `email` không dùng được cho `lower(email) = …`, giống Q11;
  - expression index lưu sẵn giá trị đã tính, rẻ khi đọc, tốn thêm khi ghi.
- **Nguồn:** https://www.postgresql.org/docs/18/indexes-expressional.html
- **Cấp:** L3 · **Nối với:** skill `sargable`, `index_design`, `string_fn` · **Kiểm:** PGlite, kế hoạch (Sai không có Index, Đúng có)

```sql
-- I05 bad
CREATE INDEX customers_email_ix ON customers (email);
EXPLAIN (COSTS OFF) SELECT id FROM customers WHERE lower(email) = 'an.nguyen1@gmail.com';
```
```sql
-- I05 good
CREATE INDEX customers_email_lower_ix ON customers (lower(email));
EXPLAIN (COSTS OFF) SELECT id FROM customers WHERE lower(email) = 'an.nguyen1@gmail.com';
```

### I06 · Index cột foreign key / Index your foreign keys

- **Luật:** cột foreign key ở bảng con (`order_items.product_id`) thường cần index riêng. Postgres tự tạo index cho PK/UNIQUE, **không** tự tạo cho FK.
- **Vì sao:**
  - join từ cha sang con và mọi `DELETE`/`UPDATE` khóa ở bảng cha đều phải tìm dòng con;
  - thiếu index thì mỗi lần là một lần quét cả bảng con, giữ khóa lâu.
- **Nguồn:** https://www.postgresql.org/docs/18/ddl-constraints.html#DDL-CONSTRAINTS-FK (đoạn giải thích xóa/sửa ở bảng cha phải quét bảng con, nên thường nên index cột tham chiếu)
- **Cấp:** L2 · **Nối với:** skill `index_design`, `join` · **Kiểm:** PGlite, kế hoạch (Sai không có Index, Đúng có)

```sql
-- I06 bad
EXPLAIN (COSTS OFF) SELECT order_id, qty FROM order_items WHERE product_id = 7;
```
```sql
-- I06 good
CREATE INDEX order_items_product_ix ON order_items (product_id);
EXPLAIN (COSTS OFF) SELECT order_id, qty FROM order_items WHERE product_id = 7;
```

### I07 · Chọn đúng loại index / Pick the index type for the operator

- **Luật:**
  - **B-tree** (mặc định): `=`, khoảng, `ORDER BY`;
  - **GIN**: `jsonb` (`@>`, `?`), mảng, full-text;
  - **BRIN**: bảng rất lớn chỉ ghi thêm mà giá trị tương quan với vị trí vật lý (thời điểm log);
  - **GiST**: hình học, khoảng, k-NN;
  - **Hash**: hầu như không cần.
- **Vì sao:**
  - mỗi loại chỉ phục vụ một tập toán tử;
  - B-tree trên `jsonb` không giúp được `props @> '{…}'`.
- **Nguồn:** https://www.postgresql.org/docs/18/indexes-types.html; https://www.postgresql.org/docs/18/gin.html; https://www.postgresql.org/docs/18/brin.html
- **Cấp:** L3 · **Nối với:** node `a7`, `a10` · **Kiểm:** PGlite, kế hoạch (Đúng dùng GIN qua Bitmap Index Scan, Sai không có Index)

```sql
-- I07 bad
CREATE INDEX app_events_props_btree_ix ON app_events (props);
EXPLAIN (COSTS OFF) SELECT count(*) FROM app_events WHERE props @> '{"screen": "payment"}';
```
```sql
-- I07 good
CREATE INDEX app_events_props_gin_ix ON app_events USING gin (props jsonb_path_ops);
EXPLAIN (COSTS OFF) SELECT count(*) FROM app_events WHERE props @> '{"screen": "payment"}';
```

### I08 · Cột ít giá trị: index thường vô ích, partial index mới đúng / Low-cardinality columns

- **Luật:**
  - đừng index cột chỉ có vài giá trị (`status`, `channel`) để tìm giá trị phổ biến;
  - nếu hay tìm giá trị hiếm (`REFUNDED`) thì dùng partial index cho đúng giá trị đó.
- **Vì sao:** lấy 90% bảng qua index chậm hơn đọc tuần tự, nên planner bỏ qua index và nó chỉ còn là chi phí ghi.
- **Nguồn:** https://www.postgresql.org/docs/18/indexes-partial.html (ví dụ loại trừ giá trị phổ biến); https://www.postgresql.org/docs/18/planner-stats.html
- **Cấp:** L3 · **Nối với:** skill `index_design`, `explain_read` · **Kiểm:** PGlite, kế hoạch (Sai: có index trên `status` mà vẫn Seq Scan cho `PAID`; Đúng: partial index dùng cho `REFUNDED`)

```sql
-- I08 bad
CREATE INDEX orders_status_ix ON orders (status);
EXPLAIN (COSTS OFF) SELECT count(*) FROM orders WHERE status = 'PAID';
```
```sql
-- I08 good
CREATE INDEX orders_refunded_ix ON orders (order_date) WHERE status = 'REFUNDED';
EXPLAIN (COSTS OFF) SELECT count(*) FROM orders WHERE status = 'REFUNDED' AND order_date >= DATE '2026-01-01';
```

### I09 · Đừng index thừa: tìm index không dùng / Remove unused and duplicate indexes

- **Luật:**
  - định kỳ xem `pg_stat_user_indexes`: index có `idx_scan = 0` sau một chu kỳ tải đủ dài, hoặc trùng tiền tố với index khác (`(a)` khi đã có `(a, b)`), là ứng viên xóa;
  - xóa bằng `DROP INDEX CONCURRENTLY` (P05).
- **Vì sao:**
  - mỗi index làm chậm mọi `INSERT`/`UPDATE`;
  - chiếm bộ nhớ đệm;
  - chặn HOT update khi cột của nó bị sửa (P02).
- **Nguồn:** https://www.postgresql.org/docs/18/indexes-examine.html; https://www.postgresql.org/docs/18/monitoring-stats.html (`pg_stat_user_indexes`)
- **Cấp:** L3 · **Nối với:** skill `index_design` · **Kiểm:** PGlite, chạy được (truy vấn thống kê; số liệu thật cần tải thật)

```sql
-- I09 bad
CREATE INDEX orders_store_only_ix ON orders (store_id);
CREATE INDEX orders_store_date_ix2 ON orders (store_id, order_date);
SELECT count(*) AS indexes FROM pg_indexes WHERE tablename = 'orders';
```
```sql
-- I09 good
SELECT s.indexrelname AS index_name, s.idx_scan, pg_relation_size(s.indexrelid) AS bytes
FROM pg_stat_user_indexes s
JOIN pg_index i ON i.indexrelid = s.indexrelid
WHERE s.idx_scan = 0 AND NOT i.indisunique AND NOT i.indisprimary
ORDER BY bytes DESC;
```

## 5. Hiệu năng và vận hành PostgreSQL (P)

### P01 · Đọc `EXPLAIN (ANALYZE, BUFFERS)`, so số dòng ước lượng và thật / Compare estimated vs actual rows

- **Luật:**
  - tối ưu từ kế hoạch thật, không đoán;
  - so `rows` ước lượng với `actual rows` ở từng node: lệch hàng chục lần là dấu hiệu thống kê cũ hoặc thiếu, nên chạy `ANALYZE` (sau nạp dữ liệu lớn luôn chạy);
  - nhớ `EXPLAIN ANALYZE` **thật sự chạy** câu lệnh, nên với `UPDATE`/`DELETE` thì bọc trong `BEGIN … ROLLBACK`.
- **Vì sao:** planner chọn join và cách quét theo ước lượng. Ước lượng sai thì kế hoạch sai, dù index đủ.
- **Nguồn:** https://www.postgresql.org/docs/18/using-explain.html; https://www.postgresql.org/docs/18/planner-stats.html
- **Cấp:** L2 · **Nối với:** skill `explain_read`; node `a10` · **Kiểm:** PGlite, chạy được

```sql
-- P01 bad
EXPLAIN SELECT count(*) FROM orders WHERE status = 'REFUNDED';
```
```sql
-- P01 good
ANALYZE orders;
EXPLAIN (ANALYZE, BUFFERS, COSTS ON) SELECT count(*) FROM orders WHERE status = 'REFUNDED';
```

### P02 · HOT update và `fillfactor` cho bảng sửa nhiều / HOT updates and fillfactor

- **Luật:**
  - bảng bị `UPDATE` thường xuyên trên các cột **không** có index thì đặt `fillfactor` dưới 100 (mặc định của bảng) để còn chỗ trống trong trang;
  - giá trị cụ thể (ví dụ 80) phải đo theo tải: tài liệu chỉ nêu khoảng 10–100;
  - không index cột hay bị sửa (cột trạng thái, `updated_at`) nếu không thật sự cần.
- **Vì sao:**
  - HOT (heap-only tuple) update chỉ xảy ra khi không cột index nào đổi **và** trang còn chỗ cho phiên bản mới;
  - khi đó không phải ghi thêm vào mọi index;
  - dọn dẹp cũng rẻ hơn (pruning ngay trong trang).
- **Nguồn:** https://www.postgresql.org/docs/18/storage-hot.html; https://www.postgresql.org/docs/18/sql-createtable.html (`fillfactor`)
- **Cấp:** L3 · **Nối với:** chưa có (L3 Postgres, `db-engine-knowledge.md` §3.3) · **Kiểm:** PGlite, chạy được (cú pháp; tỷ lệ HOT cần tải thật, xem `pg_stat_user_tables.n_tup_hot_upd`)

```sql
-- P02 bad
CREATE TABLE job_bad (id int PRIMARY KEY, state text NOT NULL, touched_at timestamptz NOT NULL);
CREATE INDEX job_bad_touched_ix ON job_bad (touched_at);
```
```sql
-- P02 good
CREATE TABLE job_good (id int PRIMARY KEY, state text NOT NULL, touched_at timestamptz NOT NULL)
  WITH (fillfactor = 80);
SELECT reloptions FROM pg_class WHERE relname = 'job_good';
```

### P03 · Đừng tắt autovacuum; giữ transaction ngắn / Keep autovacuum on, transactions short

- **Luật:**
  - không tắt autovacuum; bảng ghi nhiều thì chỉnh ngưỡng riêng cho bảng (`autovacuum_vacuum_scale_factor`…);
  - không để phiên "idle in transaction";
  - đặt `idle_in_transaction_session_timeout` và theo dõi transaction lâu nhất.
- **Vì sao:**
  - MVCC để lại phiên bản dòng cũ (dead tuple), chỉ VACUUM dọn được;
  - một transaction mở lâu giữ "đường chân trời" khiến không gì sau nó được dọn, nên bảng và index phình (bloat);
  - không vacuum đủ còn dẫn tới nguy cơ wraparound của transaction ID.
- **Nguồn:**
  - https://www.postgresql.org/docs/18/routine-vacuuming.html
  - https://www.postgresql.org/docs/18/runtime-config-client.html (`idle_in_transaction_session_timeout`)
- **Cấp:** L3 · **Nối với:** chưa có · **Kiểm:** PGlite, chạy được (chỉ là cú pháp: PGlite một phiên, không tái hiện được phiên treo)

```sql
-- P03 bad
ALTER TABLE orders SET (autovacuum_enabled = false);
```
```sql
-- P03 good
ALTER TABLE orders SET (autovacuum_vacuum_scale_factor = 0.05);
SET idle_in_transaction_session_timeout = '60s';
```

### P04 · Connection pooling / Pool connections

- **Luật:**
  - ứng dụng nhiều tiến trình hoặc serverless đi qua pooler (PgBouncer, hoặc pooler của dịch vụ cloud), thường ở chế độ transaction pooling;
  - giữ `max_connections` vừa phải.
  - Biết giới hạn của transaction pooling: không giữ được trạng thái phiên (`SET`, advisory lock theo phiên, `LISTEN`; prepared statement tùy phiên bản PgBouncer).
- **Vì sao:**
  - mỗi kết nối Postgres là một tiến trình riêng, tốn bộ nhớ;
  - hàng nghìn kết nối gần như rảnh làm server chậm đi;
  - pooler cho nhiều client dùng chung ít kết nối thật.
- **Nguồn:**
  - https://www.pgbouncer.org/features.html (bảng tính năng theo chế độ pool)
  - https://www.postgresql.org/docs/18/runtime-config-connection.html (`max_connections`)
- **Cấp:** L3 · **Nối với:** chưa có · **Kiểm:** cú pháp (cấu hình, không chạy được trong trình duyệt)

```sql
-- P04 bad (ops)
-- mỗi lambda/request tự mở kết nối thẳng vào Postgres; max_connections = 2000
```
```sql
-- P04 good (ops)
-- app -> PgBouncer (pool_mode = transaction, default_pool_size nhỏ) -> Postgres (max_connections vừa phải)
-- trạng thái phiên đặt bằng SET LOCAL trong transaction, không SET cho cả phiên
```

### P05 · Tạo/xóa index không khóa bảng: `CONCURRENTLY` / Build indexes CONCURRENTLY

- **Luật:**
  - trên bảng đang phục vụ, dùng `CREATE INDEX CONCURRENTLY` / `DROP INDEX CONCURRENTLY` / `REINDEX … CONCURRENTLY`;
  - lệnh này không chạy được trong transaction block;
  - nếu thất bại sẽ để lại index `INVALID`, phải xóa rồi làm lại.
- **Vì sao:** `CREATE INDEX` thường giữ khóa chặn mọi ghi (`INSERT/UPDATE/DELETE`) suốt thời gian dựng.
- **Nguồn:** https://www.postgresql.org/docs/18/sql-createindex.html#SQL-CREATEINDEX-CONCURRENTLY
- **Cấp:** L3 · **Nối với:** skill `index_design` · **Kiểm:** PGlite, Đúng = lỗi `25001` khi nằm trong `BEGIN` (script kiểm luôn bọc transaction): đúng giới hạn tài liệu nêu, lệnh này phải chạy riêng, ngoài transaction

```sql
-- P05 bad
CREATE INDEX orders_channel_ix ON orders (channel);
```
```sql
-- P05 good
CREATE INDEX CONCURRENTLY orders_channel_ix ON orders (channel);
```

### P06 · Thêm ràng buộc trên bảng lớn: `NOT VALID` rồi `VALIDATE` / Add constraints NOT VALID, then VALIDATE

- **Luật:**
  - thêm `CHECK`/`FOREIGN KEY` vào bảng lớn theo hai bước: `ADD CONSTRAINT … NOT VALID` (nhanh, áp cho dòng mới), rồi `VALIDATE CONSTRAINT` (quét dòng cũ với khóa nhẹ hơn);
  - mọi migration đặt `lock_timeout` ngắn để không xếp hàng chặn cả hệ thống.
- **Vì sao:**
  - `ADD CONSTRAINT` thường quét cả bảng trong khi giữ khóa mạnh;
  - một lệnh DDL chờ khóa còn chặn mọi truy vấn xếp sau nó.
- **Nguồn:**
  - https://www.postgresql.org/docs/18/sql-altertable.html (đoạn về `NOT VALID` và `VALIDATE CONSTRAINT`)
  - https://www.postgresql.org/docs/18/runtime-config-client.html (`lock_timeout`)
  - https://www.postgresql.org/docs/18/explicit-locking.html
- **Cấp:** L4 · **Nối với:** chưa có · **Kiểm:** PGlite, chạy được (cả hai; khác biệt là loại khóa, không đo được trong một phiên)

```sql
-- P06 bad
ALTER TABLE order_items ADD CONSTRAINT qty_positive CHECK (qty > 0);
```
```sql
-- P06 good
SET LOCAL lock_timeout = '3s';
ALTER TABLE order_items ADD CONSTRAINT qty_positive CHECK (qty > 0) NOT VALID;
ALTER TABLE order_items VALIDATE CONSTRAINT qty_positive;
```

### P07 · Thêm cột: default hằng thì nhanh, default biến thiên thì viết lại bảng / Cheap vs table-rewriting ALTERs

- **Luật:**
  - `ADD COLUMN … DEFAULT <hằng>` (kể cả `NOT NULL`) chỉ sửa catalog, chạy tức thì từ PostgreSQL 11;
  - default biến thiên (`clock_timestamp()`, `random()`), đổi kiểu cột không tương thích nhị phân, `SET NOT NULL` không có `CHECK` hỗ trợ đều quét hoặc viết lại bảng: tách thành nhiều bước (thêm cột NULL, backfill theo lô P08, rồi ràng buộc).
- **Vì sao:** viết lại bảng lớn giữ `ACCESS EXCLUSIVE` lâu, nên ứng dụng đứng hình.
- **Nguồn:** https://www.postgresql.org/docs/18/sql-altertable.html (mục Notes: "Adding a column with a volatile DEFAULT … will require the entire table … to be rewritten")
- **Cấp:** L4 · **Nối với:** chưa có · **Kiểm:** PGlite, chạy được (cả hai)

```sql
-- P07 bad
ALTER TABLE orders ADD COLUMN imported_at timestamptz NOT NULL DEFAULT clock_timestamp();
```
```sql
-- P07 good
ALTER TABLE orders ADD COLUMN source text NOT NULL DEFAULT 'pos';
```

### P08 · Sửa/xóa lớn theo lô / Batch large UPDATE and DELETE

- **Luật:**
  - `UPDATE`/`DELETE` hàng triệu dòng chia thành lô theo khoảng khóa (vài nghìn dòng), mỗi lô một transaction, có nghỉ giữa các lô;
  - dữ liệu theo kỳ thì dùng partition và `DROP`/`DETACH` (S11).
- **Vì sao:**
  - một transaction khổng lồ giữ khóa dòng lâu, sinh WAL dồn dập, làm replica trễ;
  - nó tạo hàng loạt dead tuple một lúc;
  - nếu hủy giữa chừng thì mất trắng.
- **Nguồn:** https://www.postgresql.org/docs/18/routine-vacuuming.html; https://www.postgresql.org/docs/18/ddl-partitioning.html (`DROP` partition thay cho `DELETE` lớn)
- **Cấp:** L3 · **Nối với:** chưa có · **Kiểm:** PGlite, chạy được

```sql
-- P08 bad
UPDATE orders SET status = upper(status);
```
```sql
-- P08 good
UPDATE orders SET status = upper(status) WHERE id >= 1 AND id < 2001 AND status <> upper(status);
```

### P09 · Thống kê mở rộng cho cột tương quan / Extended statistics for correlated columns

- **Luật:** khi hai cột phụ thuộc nhau (thành phố và quận, kênh và ngày giao) và hay lọc cùng nhau, tạo `CREATE STATISTICS … (dependencies, ndistinct)` rồi `ANALYZE`.
- **Vì sao:** planner mặc định coi các điều kiện độc lập, nhân xác suất, nên ước lượng quá ít dòng và chọn nested loop sai.
- **Nguồn:** https://www.postgresql.org/docs/18/planner-stats.html#PLANNER-STATS-EXTENDED; https://www.postgresql.org/docs/18/sql-createstatistics.html
- **Cấp:** L4 · **Nối với:** skill `explain_read` · **Kiểm:** PGlite, chạy được (ở `lab` hai cột này gần độc lập nên ước lượng gần như không đổi; ví dụ chỉ chỉ cú pháp)

```sql
-- P09 bad
EXPLAIN SELECT count(*) FROM orders WHERE channel = 'ONLINE' AND status = 'PAID';
```
```sql
-- P09 good
CREATE STATISTICS orders_channel_status_st (dependencies, ndistinct) ON channel, status FROM orders;
ANALYZE orders;
EXPLAIN SELECT count(*) FROM orders WHERE channel = 'ONLINE' AND status = 'PAID';
```

### 5.1 Vòng 2: vận hành sâu hơn (L3–L5)

Các mục P10–P26 đi theo thang Engine của `db-engine-knowledge.md` §3.3–3.5. Cách kiểm như §0, thêm một quy ước:

- khối có hậu tố `(notx)` chạy **ngoài** `BEGIN … ROLLBACK`, trên một PGlite mới nạp `lab.sql`, từng câu một. Đó là các lệnh không chạy được trong transaction (`VACUUM`, `… CONCURRENTLY`), cần bộ đếm thống kê (`pg_stat_force_next_flush()`, đo ở `db-engine-knowledge.md` §1.3) hoặc trạng thái phiên (`PREPARE`, `SET`);
- câu lỗi trong khối `(notx)` được ghi lại (`ERR <SQLSTATE>`) rồi chạy tiếp, vì có mục cần chính lỗi đó (P14).

### P10 · Autovacuum: chỉnh ngưỡng theo bảng lớn, đừng chờ 20% / Tune autovacuum thresholds per large table

- **Luật:**
  - bảng lớn ghi nhiều thì hạ `autovacuum_vacuum_scale_factor` (và `autovacuum_analyze_scale_factor`) **cho riêng bảng đó** bằng storage parameter, kèm ngưỡng cố định `autovacuum_vacuum_threshold`;
  - bảng chỉ insert (log, sự kiện) chỉnh thêm `autovacuum_vacuum_insert_scale_factor` để visibility map được cập nhật cho index-only scan (I04);
  - PostgreSQL 18 có thêm trần `autovacuum_vacuum_max_threshold` (mặc định 100 triệu tuple) cho bảng rất lớn.
- **Vì sao:**
  - ngưỡng vacuum = Minimum(max threshold, base threshold + scale factor × số tuple);
  - với mặc định 50 + 0,2 × N, bảng 10 triệu dòng phải có hơn 2 triệu dead tuple mới được vacuum: bảng và index phình trước khi được dọn.
- **Nguồn:**
  - https://www.postgresql.org/docs/18/routine-vacuuming.html#AUTOVACUUM (công thức ngưỡng)
  - https://www.postgresql.org/docs/18/runtime-config-vacuum.html#GUC-AUTOVACUUM-VACUUM-MAX-THRESHOLD
  - https://www.postgresql.org/docs/18/sql-createtable.html (storage parameter `autovacuum_*`)
- **Cấp:** L3 · **Nối với:** chưa có (L3 Postgres, `db-engine-knowledge.md` §3.3) · **Kiểm:** PGlite, chạy được: Sai tính ra 2.000.050 dead tuple cho bảng 10 triệu dòng và `max_threshold` = 100000000; Đúng ghi đủ bốn tham số vào `reloptions`. Autovacuum không chạy trong PGlite (không có worker nền), nên hiệu quả thật không đo được

```sql
-- P10 bad
SELECT current_setting('autovacuum_vacuum_threshold')::int
     + current_setting('autovacuum_vacuum_scale_factor')::float8 * 10000000 AS dead_rows_before_vacuum_10m,
       current_setting('autovacuum_vacuum_max_threshold') AS max_threshold;
```
```sql
-- P10 good
ALTER TABLE app_events SET (autovacuum_vacuum_scale_factor = 0.01, autovacuum_vacuum_threshold = 1000,
                            autovacuum_vacuum_insert_scale_factor = 0.01, autovacuum_analyze_scale_factor = 0.02);
SELECT reloptions FROM pg_class WHERE relname = 'app_events';
```

### P11 · Đo tỷ lệ HOT update, đừng đoán / Measure the HOT ratio

- **Luật:**
  - sau khi đặt `fillfactor` (P02), kiểm hiệu quả bằng `n_tup_hot_upd / n_tup_upd` trong `pg_stat_user_tables`;
  - `fillfactor` mới chỉ áp cho trang được ghi sau đó: bảng có sẵn cần viết lại (`VACUUM FULL`, `CLUSTER` hoặc công cụ online) mới có chỗ trống;
  - tỷ lệ HOT thấp trên bảng sửa nhiều là dấu hiệu index trên cột hay đổi, hoặc trang đầy.
- **Vì sao:** HOT update chỉ xảy ra khi không cột index nào đổi **và** trang còn chỗ. Một con số đo được cho biết `fillfactor` hay việc bỏ index có đáng hay không.
- **Nguồn:**
  - https://www.postgresql.org/docs/18/storage-hot.html
  - https://www.postgresql.org/docs/18/monitoring-stats.html#MONITORING-PG-STAT-ALL-TABLES-VIEW (`n_tup_hot_upd`: "Number of rows HOT updated")
- **Cấp:** L3 · **Nối với:** chưa có · **Kiểm:** PGlite `(notx)`, cùng một `UPDATE` 1.153 dòng trên cột không index: Sai (trang đầy sau `VACUUM ANALYZE`) 56 HOT; Đúng (`fillfactor = 80` + `VACUUM FULL`) 128 HOT. Phần còn lại không HOT vì một trang 80% vẫn không đủ chỗ cho mọi phiên bản mới trong cùng một lệnh

```sql
-- P11 bad (notx)
UPDATE orders SET delivered_on = delivered_on + 1 WHERE delivered_on IS NOT NULL;
SELECT pg_stat_force_next_flush();
SELECT n_tup_upd, n_tup_hot_upd FROM pg_stat_user_tables WHERE relname = 'orders';
```
```sql
-- P11 good (notx)
ALTER TABLE orders SET (fillfactor = 80);
VACUUM FULL orders;
UPDATE orders SET delivered_on = delivered_on + 1 WHERE delivered_on IS NOT NULL;
SELECT pg_stat_force_next_flush();
SELECT n_tup_upd, n_tup_hot_upd FROM pg_stat_user_tables WHERE relname = 'orders';
```

### P12 · Index phình: đo kích thước, xây lại bằng `REINDEX CONCURRENTLY` / Watch index bloat, rebuild concurrently

- **Luật:**
  - theo dõi `pg_relation_size` của index hay bị sửa (cột thời gian, trạng thái) theo thời gian;
  - khi index lớn bất thường so với dữ liệu, xây lại bằng `REINDEX INDEX CONCURRENTLY` (không chặn ghi);
  - đừng `REINDEX` thường trên bảng đang phục vụ: nó giữ `ACCESS EXCLUSIVE`.
- **Vì sao:** `VACUUM` thu hồi entry chết nhưng trang B-tree chỉ còn vài khóa vẫn được giữ lại, nên index không tự co. Tài liệu: "periodic reindexing is recommended" cho kiểu xóa/sửa này.
- **Nguồn:**
  - https://www.postgresql.org/docs/18/routine-reindex.html
  - https://www.postgresql.org/docs/18/sql-reindex.html
- **Cấp:** L3 · **Nối với:** skill `index_design` · **Kiểm:** PGlite `(notx)`: sau ba lần `UPDATE` cả 1.928 dòng và `VACUUM`, index `ts` là 188.416 byte (Sai); sau `REINDEX INDEX CONCURRENTLY` còn 65.536 byte (Đúng)

```sql
-- P12 bad (notx)
CREATE INDEX app_events_ts_ix ON app_events (ts);
UPDATE app_events SET ts = ts + interval '1 second';
UPDATE app_events SET ts = ts + interval '1 second';
UPDATE app_events SET ts = ts + interval '1 second';
VACUUM app_events;
SELECT pg_relation_size('app_events_ts_ix') AS index_bytes;
```
```sql
-- P12 good (notx)
CREATE INDEX app_events_ts_ix ON app_events (ts);
UPDATE app_events SET ts = ts + interval '1 second';
UPDATE app_events SET ts = ts + interval '1 second';
UPDATE app_events SET ts = ts + interval '1 second';
VACUUM app_events;
REINDEX INDEX CONCURRENTLY app_events_ts_ix;
SELECT pg_relation_size('app_events_ts_ix') AS index_bytes;
```

### P13 · Biết mỗi lệnh DDL lấy khóa gì, và luôn đặt `lock_timeout` / Know each DDL's lock, always set lock_timeout

- **Luật:**
  - trước khi chạy migration, tra (hoặc thử trong transaction rồi xem `pg_locks`) mức khóa của từng lệnh;
  - lệnh lấy `ACCESS EXCLUSIVE` (phần lớn `ALTER TABLE`) phải ngắn, đặt `SET LOCAL lock_timeout` vài giây và có retry;
  - `CREATE INDEX` thường lấy `SHARE` (chặn ghi suốt lúc dựng), nên trên bảng đang phục vụ dùng `CONCURRENTLY` (P05).
- **Vì sao:** lệnh DDL đang **chờ** khóa cũng chặn mọi truy vấn xếp sau nó. Không có `lock_timeout`, một `ALTER TABLE` chờ sau một truy vấn dài có thể làm đứng cả bảng.
- **Nguồn:**
  - https://www.postgresql.org/docs/18/explicit-locking.html#LOCKING-TABLES (`SHARE`: "Acquired by CREATE INDEX (without CONCURRENTLY)")
  - https://www.postgresql.org/docs/18/sql-altertable.html ("An ACCESS EXCLUSIVE lock is acquired unless explicitly noted.")
  - https://www.postgresql.org/docs/18/runtime-config-client.html#GUC-LOCK-TIMEOUT
- **Cấp:** L4 · **Nối với:** chưa có · **Kiểm:** PGlite, chạy được: `pg_locks` cùng transaction cho thấy Sai giữ `AccessExclusiveLock`, Đúng giữ `ShareLock` với `lock_timeout` = `2s`. Một phiên nên không tái hiện được cảnh chờ khóa

```sql
-- P13 bad
ALTER TABLE orders ADD COLUMN note text;
SELECT mode FROM pg_locks WHERE relation = 'orders'::regclass AND granted ORDER BY mode;
```
```sql
-- P13 good
SET LOCAL lock_timeout = '2s';
CREATE INDEX orders_shipped_ix ON orders (shipped_on);
SELECT current_setting('lock_timeout') AS lock_timeout, mode
FROM pg_locks WHERE relation = 'orders'::regclass AND granted ORDER BY mode;
```

### P14 · `CONCURRENTLY` thất bại để lại index `INVALID`: tìm và dọn / Find and drop invalid indexes after a failed concurrent build

- **Luật:**
  - sau mỗi `CREATE [UNIQUE] INDEX CONCURRENTLY` thất bại, chạy truy vấn tìm `NOT indisvalid`;
  - xóa (`DROP INDEX CONCURRENTLY`) rồi dựng lại, hoặc `REINDEX INDEX CONCURRENTLY`;
  - đừng chạy lại với `IF NOT EXISTS`: lệnh thấy tên đã có và bỏ qua, index hỏng vẫn nằm đó.
- **Vì sao:** index `INVALID` không được dùng để đọc nhưng **vẫn được cập nhật** mỗi lần ghi, và index `UNIQUE` hỏng vẫn có thể chặn bản ghi trùng.
- **Nguồn:** https://www.postgresql.org/docs/18/sql-createindex.html#SQL-CREATEINDEX-CONCURRENTLY ("fail but leave behind an 'invalid' index")
- **Cấp:** L4 · **Nối với:** skill `index_design` · **Kiểm:** PGlite `(notx)`: unique index trên `customer_id` (có trùng) báo `23505`; Sai: chạy lại `IF NOT EXISTS`, index vẫn `indisvalid = false`; Đúng: tìm thấy, xóa, dựng index thường, còn 0 index invalid

```sql
-- P14 bad (notx)
CREATE UNIQUE INDEX CONCURRENTLY orders_customer_uq ON orders (customer_id);
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS orders_customer_uq ON orders (customer_id);
SELECT indexrelid::regclass AS index_name, indisvalid FROM pg_index WHERE indexrelid = 'orders_customer_uq'::regclass;
```
```sql
-- P14 good (notx)
CREATE UNIQUE INDEX CONCURRENTLY orders_customer_uq ON orders (customer_id);
SELECT indexrelid::regclass AS invalid_index FROM pg_index WHERE NOT indisvalid;
DROP INDEX CONCURRENTLY orders_customer_uq;
CREATE INDEX CONCURRENTLY orders_customer_ix ON orders (customer_id);
SELECT count(*) AS invalid_indexes FROM pg_index WHERE NOT indisvalid;
```

### P15 · `NOT NULL` trên bảng lớn: `NOT VALID` trước (PostgreSQL 18) / Add NOT NULL as NOT VALID first

- **Luật:**
  - PostgreSQL 18 cho phép ràng buộc not-null `NOT VALID`: áp ngay cho dòng mới, không quét dòng cũ; sửa dữ liệu cũ theo lô (P08), rồi `VALIDATE CONSTRAINT`;
  - trên bản cũ hơn: thêm `CHECK (col IS NOT NULL) NOT VALID`, `VALIDATE`, rồi `SET NOT NULL` (bỏ qua bước quét nhờ CHECK hợp lệ), rồi xóa CHECK.
- **Vì sao:** `ALTER COLUMN … SET NOT NULL` quét cả bảng trong khi giữ `ACCESS EXCLUSIVE`, và thất bại ở cuối nếu còn một dòng NULL.
- **Nguồn:** https://www.postgresql.org/docs/18/sql-altertable.html (`NOT VALID` "only allowed for foreign-key, CHECK, and not-null constraints"; `SET NOT NULL`: "the table scan is skipped" khi có CHECK hợp lệ)
- **Cấp:** L4 · **Nối với:** chưa có · **Kiểm:** PGlite (PostgreSQL 18.6). Sai: lỗi `23502` "contains null values" sau khi quét. Đúng: ràng buộc `NOT VALID` được thêm dù 220 đơn vãng lai cũ có `customer_id` NULL, còn dòng mới NULL bị chặn bằng `23502`

```sql
-- P15 bad
ALTER TABLE orders ALTER COLUMN customer_id SET NOT NULL;
```
```sql
-- P15 good
ALTER TABLE orders ADD CONSTRAINT orders_customer_nn NOT NULL customer_id NOT VALID;
INSERT INTO orders (id, customer_id, store_id, order_date, channel, status) VALUES (999999, NULL, 1, DATE '2026-10-31', 'POS', 'PAID');
```

### P16 · Đổi kiểu cột: biết khi nào bảng bị viết lại / Know which type changes rewrite the table

- **Luật:**
  - đổi kiểu không tương thích nhị phân (`int` → `bigint`, `text` → `int`) viết lại cả bảng và mọi index: làm bằng cột mới + backfill theo lô + đổi tên, hoặc trong khung bảo trì;
  - nới `varchar(n)` lên `varchar(m)` lớn hơn, hay `varchar` → `text`, chỉ sửa catalog;
  - kiểm bằng `relfilenode` trước/sau trên bản sao.
- **Vì sao:** viết lại giữ `ACCESS EXCLUSIVE` suốt thời gian chép bảng. Chọn `bigint` từ đầu cho khóa có thể vượt 2,1 tỷ rẻ hơn nhiều so với đổi sau.
- **Nguồn:** https://www.postgresql.org/docs/18/sql-altertable.html ("will normally cause the entire table and its indexes to be rewritten", trừ khi kiểu cũ binary coercible)
- **Cấp:** L4 · **Nối với:** skill `cast` · **Kiểm:** PGlite, chạy được: Sai `relfilenode` đổi (bảng bị viết lại), Đúng `relfilenode` giữ nguyên

```sql
-- P16 bad
CREATE TEMP TABLE before_alter AS SELECT relfilenode AS before FROM pg_class WHERE relname = 'order_items';
ALTER TABLE order_items ALTER COLUMN qty TYPE bigint;
SELECT before, (SELECT relfilenode FROM pg_class WHERE relname = 'order_items') AS after FROM before_alter;
```
```sql
-- P16 good
CREATE TABLE notes (id int PRIMARY KEY, body varchar(50));
CREATE TEMP TABLE before_alter AS SELECT relfilenode AS before FROM pg_class WHERE relname = 'notes';
ALTER TABLE notes ALTER COLUMN body TYPE varchar(200);
SELECT before, (SELECT relfilenode FROM pg_class WHERE relname = 'notes') AS after FROM before_alter;
```

### P17 · Lọc partition bằng khoảng trên chính khóa, không bọc hàm / Prune partitions with plain ranges on the key

- **Luật:** điều kiện trên khóa partition viết dạng `key >= a AND key < b`, không bọc khóa trong hàm (`date_trunc`, `extract`, ép kiểu).
- **Vì sao:** planner chỉ cắt partition khi so được điều kiện với biên partition. `date_trunc('month', at) = …` là một biểu thức khác, nên mọi partition đều bị quét. Đây là Q11 (sargable) áp cho partition.
- **Nguồn:** https://www.postgresql.org/docs/18/ddl-partitioning.html#DDL-PARTITION-PRUNING
- **Cấp:** L4 · **Nối với:** skill `sargable`, `explain_read` · **Kiểm:** PGlite, kế hoạch: Sai `Append` quét `ev_2026_09` và `ev_2026_10`; Đúng chỉ `ev_2026_10`

```sql
-- P17 bad
CREATE TABLE ev (id bigint NOT NULL, at date NOT NULL, kind text NOT NULL, PRIMARY KEY (id, at)) PARTITION BY RANGE (at);
CREATE TABLE ev_2026_09 PARTITION OF ev FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE ev_2026_10 PARTITION OF ev FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
EXPLAIN (COSTS OFF) SELECT count(*) FROM ev WHERE date_trunc('month', at) = DATE '2026-10-01';
```
```sql
-- P17 good
CREATE TABLE ev (id bigint NOT NULL, at date NOT NULL, kind text NOT NULL, PRIMARY KEY (id, at)) PARTITION BY RANGE (at);
CREATE TABLE ev_2026_09 PARTITION OF ev FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE ev_2026_10 PARTITION OF ev FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
EXPLAIN (COSTS OFF) SELECT count(*) FROM ev WHERE at >= DATE '2026-10-01' AND at < DATE '2026-11-01';
```

### P18 · Tạo partition trước khi dữ liệu tới / Create partitions ahead of the data

- **Luật:**
  - partition theo thời gian được tạo trước ít nhất một kỳ (job định kỳ), và có cảnh báo khi còn ít kỳ trống;
  - partition `DEFAULT` chỉ là lưới an toàn: khi đã có dữ liệu trong `DEFAULT`, mỗi lần thêm partition mới Postgres phải quét `DEFAULT` để kiểm.
- **Vì sao:** dòng không thuộc partition nào làm `INSERT` lỗi, tức ứng dụng ngừng ghi đúng lúc sang kỳ mới.
- **Nguồn:** https://www.postgresql.org/docs/18/ddl-partitioning.html ("an appropriate partition must be added manually"; `DEFAULT` "will be scanned to verify that it contains no records")
- **Cấp:** L4 · **Nối với:** chưa có · **Kiểm:** PGlite. Sai: lỗi `23514` "no partition of relation "ev" found for row". Đúng: dòng vào `ev_2026_11`

```sql
-- P18 bad
CREATE TABLE ev (id bigint NOT NULL, at date NOT NULL, kind text NOT NULL, PRIMARY KEY (id, at)) PARTITION BY RANGE (at);
CREATE TABLE ev_2026_10 PARTITION OF ev FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
INSERT INTO ev VALUES (1, DATE '2026-11-01', 'login');
```
```sql
-- P18 good
CREATE TABLE ev (id bigint NOT NULL, at date NOT NULL, kind text NOT NULL, PRIMARY KEY (id, at)) PARTITION BY RANGE (at);
CREATE TABLE ev_2026_10 PARTITION OF ev FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE ev_2026_11 PARTITION OF ev FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
INSERT INTO ev VALUES (1, DATE '2026-11-01', 'login');
SELECT tableoid::regclass AS partition FROM ev;
```

### P19 · Prepared statement và dữ liệu lệch: coi chừng generic plan / Prepared statements on skewed data: watch the generic plan

- **Luật:**
  - truy vấn tham số hóa trên cột phân bố lệch (vài giá trị chiếm phần lớn bảng) phải được kiểm bằng `EXPLAIN EXECUTE` với giá trị thật, cả giá trị phổ biến lẫn hiếm;
  - khi generic plan ước lượng sai, đặt `plan_cache_mode = force_custom_plan` cho phiên/role đó, hoặc tách truy vấn.
- **Vì sao:**
  - sau năm lần chạy với custom plan, Postgres có thể chuyển sang một generic plan dùng chung cho mọi giá trị;
  - generic plan ước lượng theo selectivity trung bình. Hiệu năng "đột nhiên tệ" ở lần chạy thứ sáu là một dạng plan regression kinh điển.
- **Nguồn:**
  - https://www.postgresql.org/docs/18/sql-prepare.html ("the first five executions are done with custom plans")
  - https://www.postgresql.org/docs/18/runtime-config-query.html#GUC-PLAN-CACHE-MODE
- **Cấp:** L4 · **Nối với:** skill `explain_read`; node `a10` · **Kiểm:** PGlite `(notx)`, kế hoạch: với `'PAID'` (1.298/1.428 dòng), generic plan (Sai) ước lượng `rows=476` và chọn `Index Only Scan` với `$1`; custom plan (Đúng) ước lượng `rows=1298`, chọn `Seq Scan`

```sql
-- P19 bad (notx)
CREATE INDEX orders_status_ix ON orders (status);
ANALYZE orders;
PREPARE by_status(text) AS SELECT count(*) FROM orders WHERE status = $1;
SET plan_cache_mode = force_generic_plan;
EXPLAIN EXECUTE by_status('PAID');
```
```sql
-- P19 good (notx)
CREATE INDEX orders_status_ix ON orders (status);
ANALYZE orders;
PREPARE by_status(text) AS SELECT count(*) FROM orders WHERE status = $1;
SET plan_cache_mode = force_custom_plan;
EXPLAIN EXECUTE by_status('PAID');
```

### P20 · Tăng statistics target cho từng cột lệch, không tăng toàn cục / Raise the statistics target per column

- **Luật:** cột lệch hoặc có rất nhiều giá trị mà planner hay ước lượng sai (P01) thì `ALTER TABLE … ALTER COLUMN … SET STATISTICS n` (tối đa 10000) rồi `ANALYZE`. Giữ `default_statistics_target` mặc định 100.
- **Vì sao:**
  - target quyết định số giá trị phổ biến (MCV) và số biên histogram mà `ANALYZE` giữ;
  - tăng toàn cục làm mọi `ANALYZE` và mọi lần lập kế hoạch chậm hơn cho cả những cột không cần.
- **Nguồn:**
  - https://www.postgresql.org/docs/18/planner-stats.html
  - https://www.postgresql.org/docs/18/sql-altertable.html (`SET STATISTICS`: "The target can be set in the range 0 to 10000"; chỉ lấy `SHARE UPDATE EXCLUSIVE`)
- **Cấp:** L4 · **Nối với:** skill `explain_read` · **Kiểm:** PGlite, chạy được: `order_items.order_id` với target 100 có 100 MCV và 101 biên; với 1000 có 1000 MCV và 428 biên

```sql
-- P20 bad
ANALYZE order_items;
SELECT cardinality(most_common_vals::text::text[]) AS mcv, cardinality(histogram_bounds::text::text[]) AS bounds
FROM pg_stats WHERE tablename = 'order_items' AND attname = 'order_id';
```
```sql
-- P20 good
ALTER TABLE order_items ALTER COLUMN order_id SET STATISTICS 1000;
ANALYZE order_items;
SELECT cardinality(most_common_vals::text::text[]) AS mcv, cardinality(histogram_bounds::text::text[]) AS bounds
FROM pg_stats WHERE tablename = 'order_items' AND attname = 'order_id';
```

### P21 · GIN cho `jsonb`: `jsonb_path_ops` không phục vụ `?` / jsonb_path_ops does not serve key-exists

- **Luật:**
  - chỉ hỏi chứa (`@>`) và jsonpath (`@?`, `@@`): `jsonb_path_ops` (nhỏ hơn, nhanh hơn);
  - cần hỏi khóa có tồn tại (`?`, `?|`, `?&`): opclass mặc định `jsonb_ops`;
  - chọn theo toán tử của truy vấn thật, rồi kiểm bằng `EXPLAIN`.
- **Vì sao:** index không hỗ trợ toán tử thì planner bỏ qua nó: tốn chỗ và chi phí ghi mà không được dùng.
- **Nguồn:**
  - https://www.postgresql.org/docs/18/gin.html#GIN-BUILTIN-OPCLASSES
  - https://www.postgresql.org/docs/18/datatype-json.html#JSON-INDEXING ("does not support the key-exists operators")
- **Cấp:** L3 · **Nối với:** node `a7`, `a10` · **Kiểm:** PGlite, kế hoạch: Sai `Seq Scan` dù có GIN `jsonb_path_ops`; Đúng `Bitmap Index Scan on app_events_props_ix`

```sql
-- P21 bad
CREATE INDEX app_events_props_path_ix ON app_events USING gin (props jsonb_path_ops);
EXPLAIN (COSTS OFF) SELECT count(*) FROM app_events WHERE props ? 'coupon';
```
```sql
-- P21 good
CREATE INDEX app_events_props_ix ON app_events USING gin (props);
EXPLAIN (COSTS OFF) SELECT count(*) FROM app_events WHERE props ? 'coupon';
```

### P22 · Một khóa `jsonb` hay lọc bằng `=`/khoảng: B-tree trên biểu thức `->>` / Expression B-tree for one hot jsonb key

- **Luật:**
  - khi luôn lọc một khóa cụ thể bằng `props ->> 'k' = …` hoặc khoảng, dựng B-tree trên đúng biểu thức `((props ->> 'k'))`;
  - GIN chỉ phục vụ toán tử của nó (`@>`, `?`…), không phục vụ `->>` + `=`;
  - nếu khóa đó quan trọng tới mức này, cân nhắc đưa thành cột thật (S12).
- **Vì sao:** planner chỉ dùng expression index khi truy vấn viết **đúng** biểu thức đã index.
- **Nguồn:**
  - https://www.postgresql.org/docs/18/indexes-expressional.html
  - https://www.postgresql.org/docs/18/datatype-json.html#JSON-INDEXING
- **Cấp:** L3 · **Nối với:** node `a7`; skill `index_design` · **Kiểm:** PGlite, kế hoạch: Sai `Seq Scan` (GIN không dùng được); Đúng `Index Scan using app_events_screen_ix`

```sql
-- P22 bad
CREATE INDEX app_events_props_path_ix ON app_events USING gin (props jsonb_path_ops);
EXPLAIN (COSTS OFF) SELECT count(*) FROM app_events WHERE props ->> 'screen' = 'payment';
```
```sql
-- P22 good
CREATE INDEX app_events_screen_ix ON app_events ((props ->> 'screen'));
ANALYZE app_events;
EXPLAIN (COSTS OFF) SELECT count(*) FROM app_events WHERE props ->> 'screen' = 'payment';
```

### P23 · Sau pooler: `SET LOCAL`, không `SET` / Behind a transaction pooler use SET LOCAL

- **Luật:**
  - ứng dụng đi qua pooler ở chế độ transaction (P04) chỉ đặt tham số bằng `SET LOCAL` trong transaction, hoặc gắn sẵn cho role (P24);
  - không dùng tính năng gắn với phiên (`SET`, advisory lock phiên, `LISTEN`, bảng tạm);
  - prepared statement ở mức giao thức cần PgBouncer bật `max_prepared_statements`.
- **Vì sao:** `SET` sống tới hết **phiên**. Sau pooler, phiên server được trao cho client khác ở transaction kế tiếp, nên cấu hình của request này rò sang request khác.
- **Nguồn:**
  - https://www.pgbouncer.org/config.html (`server_reset_query`: "clients must not use any session-based features"; `max_prepared_statements`)
  - https://www.postgresql.org/docs/18/sql-set.html (`SET LOCAL` chỉ tới hết transaction)
- **Cấp:** L4 · **Nối với:** chưa có · **Kiểm:** PGlite `(notx)`, một phiên đóng vai "kết nối dùng chung": Sai, `SHOW` của request sau vẫn thấy `1s`; Đúng thấy `0` (mặc định)

```sql
-- P23 bad (notx)
SET statement_timeout = '1s';
SHOW statement_timeout;
```
```sql
-- P23 good (notx)
BEGIN;
SET LOCAL statement_timeout = '1s';
COMMIT;
SHOW statement_timeout;
```

### P24 · Timeout theo role, không trong `postgresql.conf` / Set timeouts per role

- **Luật:** mỗi role có giới hạn riêng: `statement_timeout` cho role báo cáo/analyst, `idle_in_transaction_session_timeout` cho role ứng dụng, `lock_timeout` cho role migration (P13).
- **Vì sao:**
  - một truy vấn phân tích chạy quên giờ giữ tài nguyên và chặn vacuum (P03);
  - đặt `statement_timeout` toàn server "is not recommended because it would affect all sessions", kể cả job bảo trì.
- **Nguồn:**
  - https://www.postgresql.org/docs/18/runtime-config-client.html#GUC-STATEMENT-TIMEOUT
  - https://www.postgresql.org/docs/18/sql-alterrole.html
- **Cấp:** L3 · **Nối với:** chưa có · **Kiểm:** PGlite, chạy được: Sai `statement_timeout` = 0 (không giới hạn); Đúng `rolconfig` = `{statement_timeout=30s, idle_in_transaction_session_timeout=60s}`

```sql
-- P24 bad
SET statement_timeout = 0;
SHOW statement_timeout;
```
```sql
-- P24 good
CREATE ROLE analyst_ro NOLOGIN;
ALTER ROLE analyst_ro SET statement_timeout = '30s';
ALTER ROLE analyst_ro SET idle_in_transaction_session_timeout = '60s';
SELECT rolconfig FROM pg_roles WHERE rolname = 'analyst_ro';
```

### P25 · Tìm truy vấn tốn nhất bằng `pg_stat_statements` / Find the costliest queries with pg_stat_statements

- **Luật:**
  - bật `pg_stat_statements` (`shared_preload_libraries`) trên mọi môi trường thật;
  - ưu tiên tối ưu theo `total_exec_time` (tổng cộng dồn), không theo một lần chạy chậm;
  - so `mean_exec_time` trước/sau mỗi lần deploy để bắt plan regression (P19);
  - `pg_stat_statements_reset()` sau khi đã lưu ảnh chụp.
- **Vì sao:** truy vấn 5 ms chạy một triệu lần tốn hơn truy vấn 5 s chạy một lần. Không có số cộng dồn thì tối ưu nhầm chỗ.
- **Nguồn:** https://www.postgresql.org/docs/18/pgstatstatements.html
- **Cấp:** L5 · **Nối với:** skill `explain_read`; node `a10` · **Kiểm:** cú pháp. Extension phải nạp lúc khởi tạo PGlite (`extensions`), script kiểm không làm. Đã đo riêng ở `db-engine-knowledge.md` §1.2

```sql
-- P25 bad (syntax)
EXPLAIN ANALYZE SELECT count(*) FROM orders WHERE status = 'PAID';
```
```sql
-- P25 good (syntax)
SELECT query, calls, round(total_exec_time) AS total_ms, round(mean_exec_time::numeric, 2) AS mean_ms
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

### P26 · Theo dõi tuổi transaction ID (wraparound) / Monitor transaction ID age

- **Luật:**
  - theo dõi `age(datfrozenxid)` của từng database và `age(relfrozenxid)` của bảng lớn nhất, cảnh báo khi vượt một tỷ lệ của `autovacuum_freeze_max_age`;
  - tìm và gỡ thứ chặn freeze: transaction mở lâu, replication slot bỏ quên, prepared transaction treo.
- **Vì sao:**
  - transaction ID 32 bit quay vòng;
  - nếu không freeze kịp, Postgres ngừng cấp transaction ID mới (dừng ghi) để bảo vệ dữ liệu, và cần `VACUUM` toàn database mới chạy lại được;
  - kích thước đĩa không báo trước điều này.
- **Nguồn:** https://www.postgresql.org/docs/18/routine-vacuuming.html#VACUUM-FOR-WRAPAROUND
- **Cấp:** L5 · **Nối với:** chưa có · **Kiểm:** PGlite, chạy được: Sai chỉ ra số byte; Đúng ra tuổi từng database (79–82) và phần trăm so với `autovacuum_freeze_max_age`

```sql
-- P26 bad
SELECT pg_database_size(current_database()) AS bytes;
```
```sql
-- P26 good
SELECT datname, age(datfrozenxid) AS xid_age,
       round(100.0 * age(datfrozenxid) / current_setting('autovacuum_freeze_max_age')::int, 2) AS pct_of_freeze_max
FROM pg_database ORDER BY xid_age DESC;
```

## 6. Bảo mật (X)

### X01 · Truy vấn tham số hóa, không ghép chuỗi / Parameterise, never concatenate

- **Luật:**
  - giá trị từ người dùng đi vào SQL qua tham số (`$1`, prepared statement, placeholder của driver);
  - tên bảng/cột động thì chọn từ danh sách cho phép, hoặc `quote_ident`/`format('%I')`.
- **Vì sao:** ghép chuỗi cho phép SQL injection: `x' OR '1'='1` biến điều kiện thành luôn đúng. Tham số luôn là **giá trị**, không bao giờ là cú pháp.
- **Nguồn:** https://www.postgresql.org/docs/18/sql-prepare.html; OWASP SQL Injection Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
- **Cấp:** L1 · **Nối với:** chưa có (BoonData chỉ đưa `ident()` vào SQL: `src/db/import.ts`) · **Kiểm:** PGlite, Sai ≠ Đúng (cùng chuỗi độc, Sai trả mọi khách, Đúng trả 0)

```sql
-- X01 bad
SELECT count(*) FROM customers WHERE city = 'x' OR '1'='1';
```
```sql
-- X01 good
PREPARE by_city(text) AS SELECT count(*) FROM customers WHERE city = $1;
EXECUTE by_city('x'' OR ''1''=''1');
```

### X02 · Quyền tối thiểu: role riêng cho từng việc / Least privilege roles

- **Luật:**
  - ứng dụng và người phân tích dùng role riêng, không phải superuser, không là owner của bảng;
  - chỉ `GRANT` đúng quyền cần (báo cáo chỉ `SELECT`);
  - quyền gán cho role nhóm (`NOLOGIN`), người dùng là thành viên.
- **Vì sao:**
  - một lỗi hay một mật khẩu lộ chỉ gây hại trong phạm vi quyền của role đó;
  - superuser và owner bỏ qua RLS (S10).
- **Nguồn:** https://www.postgresql.org/docs/18/ddl-priv.html; https://www.postgresql.org/docs/18/sql-createrole.html
- **Cấp:** L2 · **Nối với:** chưa có · **Kiểm:** PGlite, Đúng = lỗi `42501` khi role chỉ đọc thử ghi (Sai thì ghi được)

```sql
-- X02 bad
CREATE ROLE report_bad NOLOGIN;
GRANT ALL ON ALL TABLES IN SCHEMA lab TO report_bad;
GRANT USAGE ON SCHEMA lab TO report_bad;
SET ROLE report_bad;
DELETE FROM store_targets WHERE store_id = 1;
```
```sql
-- X02 good
CREATE ROLE report_good NOLOGIN;
GRANT USAGE ON SCHEMA lab TO report_good;
GRANT SELECT ON ALL TABLES IN SCHEMA lab TO report_good;
SET ROLE report_good;
DELETE FROM store_targets WHERE store_id = 1;
```

### X03 · Hàm `SECURITY DEFINER` phải cố định `search_path` / Pin search_path in SECURITY DEFINER functions

- **Luật:**
  - hàm chạy với quyền người tạo (`SECURITY DEFINER`) luôn có `SET search_path = …` chỉ gồm schema tin cậy (`pg_temp` để cuối);
  - không cho người dùng thường quyền `CREATE` trên schema hàm đó đọc (mặc định `public` đã thu quyền này từ PostgreSQL 15).
- **Vì sao:** không cố định `search_path`, người gọi tạo một bảng/hàm cùng tên trong schema của họ và hàm đặc quyền dùng nhầm, tức là leo thang quyền.
- **Nguồn:**
  - https://www.postgresql.org/docs/18/sql-createfunction.html#SQL-CREATEFUNCTION-SECURITY ("Writing SECURITY DEFINER Functions Safely")
  - https://www.postgresql.org/docs/18/ddl-schemas.html#DDL-SCHEMAS-PATTERNS
- **Cấp:** L4 · **Nối với:** chưa có · **Kiểm:** PGlite, chạy được (cả hai)

```sql
-- X03 bad
CREATE FUNCTION store_revenue_bad(p_store int) RETURNS bigint
LANGUAGE sql SECURITY DEFINER
AS $$ SELECT sum(oi.qty * oi.unit_price_vnd) FROM orders o JOIN order_items oi ON oi.order_id = o.id WHERE o.store_id = p_store $$;
SELECT store_revenue_bad(1) > 0 AS ok;
```
```sql
-- X03 good
CREATE FUNCTION store_revenue_good(p_store int) RETURNS bigint
LANGUAGE sql SECURITY DEFINER
SET search_path = lab, pg_temp
AS $$ SELECT sum(oi.qty * oi.unit_price_vnd) FROM orders o JOIN order_items oi ON oi.order_id = o.id WHERE o.store_id = p_store $$;
SELECT store_revenue_good(1) > 0 AS ok;
```

### X04 · Superuser và owner bỏ qua RLS / RLS does not bind owners unless FORCED

- **Luật:**
  - kiểm RLS bằng đúng role ứng dụng, không bằng tài khoản quản trị;
  - bảng có RLS thì bật `FORCE ROW LEVEL SECURITY` nếu ứng dụng có thể chạy bằng owner.
  - Ví dụ chạy được nằm ở S10.
- **Vì sao:** chạy thử bằng superuser luôn thấy đủ dòng. Bạn tưởng policy hoạt động, nhưng thật ra chưa thử lần nào.
- **Nguồn:** https://www.postgresql.org/docs/18/ddl-rowsecurity.html ("Superusers and roles with the BYPASSRLS attribute always bypass the row security system… Table owners normally bypass row security as well")
- **Cấp:** L4 · **Nối với:** chưa có · **Kiểm:** PGlite, qua S10

### X05 · Xác thực: `scram-sha-256`, không `trust` qua mạng / scram-sha-256, never trust over TCP

- **Luật:**
  - `pg_hba.conf` dùng `scram-sha-256`;
  - không `trust` cho kết nối `host`/`hostssl`;
  - không `md5` cho hệ thống mới;
  - kết nối qua mạng bật TLS (`hostssl`).
- **Vì sao:**
  - `trust` qua TCP cho bất kỳ ai nhận là bất kỳ user nào, kể cả superuser;
  - `md5` yếu hơn và đang bị loại dần.
- **Nguồn:**
  - https://wiki.postgresql.org/wiki/Don%27t_Do_This#Don.27t_use_trust_authentication_over_TCP.2FIP_.28host.2C_hostssl.29
  - https://www.postgresql.org/docs/18/auth-password.html
- **Cấp:** L3 · **Nối với:** chưa có · **Kiểm:** cú pháp (cấu hình server)

```sql
-- X05 bad (ops)
-- pg_hba.conf:  host  all  all  0.0.0.0/0  trust
```
```sql
-- X05 good (ops)
-- pg_hba.conf:  hostssl  all  all  10.0.0.0/8  scram-sha-256
-- postgresql.conf:  password_encryption = scram-sha-256
```

## 7. MongoDB (M)

### 7.0 Dữ liệu mẫu cho các ví dụ chạy được

Script kiểm nạp khối này vào `mingo`. Cú pháp giữ đúng như `mongosh` để người học chép sang được.

```js
// MDATA
const data = {
  orders: [
    { _id: 1, customerId: 10, status: 'PAID', total: 120, createdAt: new Date('2026-10-01'), items: [{ sku: 'A', qty: 1, price: 100 }, { sku: 'B', qty: 2, price: 10 }] },
    { _id: 2, customerId: 11, status: 'PAID', total: 50, createdAt: new Date('2026-10-03'), items: [{ sku: 'B', qty: 5, price: 10 }] },
    { _id: 3, customerId: 10, status: 'CANCELLED', total: 30, createdAt: new Date('2026-10-05'), items: [{ sku: 'C', qty: 1, price: 30 }] },
    { _id: 4, customerId: 12, status: 'PAID', total: 300, createdAt: new Date('2026-10-20'), items: [{ sku: 'A', qty: 3, price: 100 }] },
    { _id: 5, customerId: 11, status: 'PAID', total: 75, createdAt: new Date('2026-10-28'), items: [{ sku: 'C', qty: 2, price: 30 }, { sku: 'B', qty: 1, price: 15 }] }
  ],
  order_lines: [
    { orderId: 1, sku: 'A', qty: 1, price: 100 }, { orderId: 1, sku: 'B', qty: 2, price: 10 },
    { orderId: 2, sku: 'B', qty: 5, price: 10 }, { orderId: 3, sku: 'C', qty: 1, price: 30 },
    { orderId: 4, sku: 'A', qty: 3, price: 100 },
    { orderId: 5, sku: 'C', qty: 2, price: 30 }, { orderId: 5, sku: 'B', qty: 1, price: 15 }
  ],
  customers: [
    { _id: 10, name: 'An', city: 'Da Nang' }, { _id: 11, name: 'Binh', city: 'Hue' }, { _id: 12, name: 'Chi', city: null }
  ]
};
```

### M01 · Đọc cùng nhau thì lưu cùng nhau: embed / Data accessed together is stored together

- **Luật:**
  - mô hình hóa từ access pattern;
  - dữ liệu con luôn đọc và ghi cùng cha, số lượng có giới hạn (dòng hàng của một đơn) thì **embed** vào tài liệu cha;
  - dùng **reference** khi con được đọc độc lập, dùng chung giữa nhiều cha, hoặc tăng không giới hạn (M02).
- **Vì sao:**
  - một lần đọc lấy đủ dữ liệu, không cần `$lookup`;
  - cập nhật trong một tài liệu là atomic nên không cần transaction (M10).
- **Nguồn:**
  - https://www.mongodb.com/docs/manual/data-modeling/concepts/embedding-vs-references/
  - https://www.mongodb.com/docs/manual/data-modeling/design-patterns/
- **Cấp:** L1 · **Nối với:** skill `join` (đối chiếu với JOIN của SQL) · **Kiểm:** mingo, Sai = Đúng (cùng doanh thu theo SKU, Đúng không cần `$lookup`)

```js
// M01 bad
db.orders.aggregate([
  { $match: { status: 'PAID' } },
  { $lookup: { from: 'order_lines', localField: '_id', foreignField: 'orderId', as: 'lines' } },
  { $unwind: '$lines' },
  { $group: { _id: '$lines.sku', revenue: { $sum: { $multiply: ['$lines.qty', '$lines.price'] } } } },
  { $sort: { _id: 1 } }
])
```
```js
// M01 good
db.orders.aggregate([
  { $match: { status: 'PAID' } },
  { $unwind: '$items' },
  { $group: { _id: '$items.sku', revenue: { $sum: { $multiply: ['$items.qty', '$items.price'] } } } },
  { $sort: { _id: 1 } }
])
```

### M02 · Tránh mảng tăng không giới hạn / Avoid unbounded arrays

- **Luật:**
  - không `$push` mãi vào một mảng trong tài liệu (log sự kiện, bình luận, lượt xem của một khách);
  - tách thành collection riêng có `customerId` và index;
  - hoặc giữ một tập con mới nhất (subset pattern, `$push` với `$slice`).
- **Vì sao:**
  - tài liệu bị giới hạn 16 MB;
  - mảng lớn làm mỗi lần đọc/ghi tốn băng thông và bộ nhớ;
  - index multikey trên mảng lớn rất tốn.
- **Nguồn:**
  - https://www.mongodb.com/docs/manual/data-modeling/design-antipatterns/unbounded-arrays/
  - https://www.mongodb.com/docs/manual/reference/limits/
  - https://www.mongodb.com/docs/manual/data-modeling/design-patterns/group-data/subset-pattern/
- **Cấp:** L2 · **Nối với:** chưa có · **Kiểm:** cú pháp

```js
// M02 bad (syntax)
db.customers.updateOne({ _id: 10 }, { $push: { events: { type: 'view', at: new Date() } } })
```
```js
// M02 good (syntax)
db.events.insertOne({ customerId: 10, type: 'view', at: new Date() });
db.events.createIndex({ customerId: 1, at: -1 });
db.customers.updateOne({ _id: 10 }, { $push: { recentEvents: { $each: [{ type: 'view', at: new Date() }], $slice: -10 } } })
```

### M03 · Tài liệu gọn: tách phần nặng ít dùng / Avoid bloated documents

- **Luật:** trường lớn và hiếm khi đọc (mô tả dài, ảnh, lịch sử) để ở collection khác. Tài liệu chính chỉ giữ những gì màn hình chính cần.
- **Vì sao:**
  - working set (tài liệu + index hay dùng) phải nằm vừa RAM;
  - tài liệu phình làm cache chứa ít tài liệu hơn, nên đọc đĩa nhiều hơn.
- **Nguồn:** https://www.mongodb.com/docs/manual/data-modeling/design-antipatterns/bloated-documents/
- **Cấp:** L2 · **Nối với:** chưa có · **Kiểm:** cú pháp

```js
// M03 bad (syntax)
db.products.insertOne({ _id: 'A', name: 'Tea', price: 100, manualPdfBase64: '…2 MB…', reviews: [/* hàng nghìn */] })
```
```js
// M03 good (syntax)
db.products.insertOne({ _id: 'A', name: 'Tea', price: 100, topReviews: [/* 3 cái mới nhất */] });
db.product_details.insertOne({ productId: 'A', manualUrl: 'https://…', specs: { /* … */ } })
```

### M04 · Chuỗi thời gian: time series collection hoặc bucket / Time series and the bucket pattern

- **Luật:**
  - dữ liệu đo theo thời gian (cảm biến, giá, log) dùng time series collection;
  - phiên bản cũ thì dùng bucket pattern: gom các điểm theo nguồn và theo khung giờ vào một tài liệu;
  - đặt TTL (`expireAfterSeconds`) cho dữ liệu hết hạn.
- **Vì sao:** một tài liệu cho mỗi điểm đo làm số tài liệu và kích thước index bùng nổ. Bucket và time series collection nén và quét theo khoảng thời gian hiệu quả hơn.
- **Nguồn:**
  - https://www.mongodb.com/docs/manual/core/timeseries-collections/
  - https://www.mongodb.com/docs/manual/data-modeling/design-patterns/group-data/bucket-pattern/
  - https://www.mongodb.com/docs/manual/core/index-ttl/
- **Cấp:** L3 · **Nối với:** skill `date_bucket` · **Kiểm:** cú pháp

```js
// M04 bad (syntax)
db.readings.insertOne({ sensorId: 7, at: new Date(), temp: 31.2 })
```
```js
// M04 good (syntax)
db.createCollection('readings', { timeseries: { timeField: 'at', metaField: 'sensorId', granularity: 'minutes' }, expireAfterSeconds: 60 * 60 * 24 * 90 })
```

### M05 · Tính sẵn khi đọc nhiều hơn ghi / Store computed values when reads dominate

- **Luật:**
  - con số được đọc liên tục mà ít đổi (tổng đơn, số bình luận) thì lưu sẵn và cập nhật lúc ghi (`$inc`);
  - không `aggregate` lại toàn bộ ở mỗi lần đọc.
- **Vì sao:** phép tính lặp ở mỗi lần đọc tốn CPU và độ trễ. Cập nhật một trường lúc ghi là atomic và rẻ.
- **Nguồn:** https://www.mongodb.com/docs/manual/data-modeling/design-patterns/handle-computed-values/
- **Cấp:** L2 · **Nối với:** skill `aggregate` · **Kiểm:** mingo, Sai = Đúng (tổng tính lại = tổng lưu sẵn `total`)

```js
// M05 bad
db.orders.aggregate([
  { $match: { _id: 1 } },
  { $project: { _id: 0, total: { $sum: { $map: { input: '$items', as: 'i', in: { $multiply: ['$$i.qty', '$$i.price'] } } } } } }
])
```
```js
// M05 good
db.orders.find({ _id: 1 }, { _id: 0, total: 1 })
```

### M06 · Kiểm schema bằng `$jsonSchema` và ghi phiên bản schema / Validate and version your schema

- **Luật:**
  - collection quan trọng có validator `$jsonSchema` (trường bắt buộc, kiểu, enum);
  - tài liệu mang `schemaVersion` khi cấu trúc đổi dần.
- **Vì sao:**
  - "schemaless" không có nghĩa là không có schema: schema chỉ chuyển vào code;
  - validator chặn dữ liệu sai ở DB;
  - `schemaVersion` cho phép đọc song song bản cũ và mới trong lúc migrate.
- **Nguồn:**
  - https://www.mongodb.com/docs/manual/core/schema-validation/
  - https://www.mongodb.com/docs/manual/data-modeling/design-patterns/data-versioning/schema-versioning/
- **Cấp:** L2 · **Nối với:** chưa có (tương ứng `CHECK`/`NOT NULL` ở S06) · **Kiểm:** cú pháp

```js
// M06 bad (syntax)
db.createCollection('payments')
```
```js
// M06 good (syntax)
db.createCollection('payments', { validator: { $jsonSchema: {
  bsonType: 'object', required: ['orderId', 'amount', 'paidAt', 'schemaVersion'],
  properties: { amount: { bsonType: 'long', minimum: 0 }, status: { enum: ['PAID', 'REFUNDED'] }, schemaVersion: { bsonType: 'int' } }
} } })
```

### M07 · Index phức hợp theo ESR: Equality, Sort, Range / Compound indexes follow ESR

- **Luật:** thứ tự trường trong index phức hợp:
  1. trường so **bằng**;
  2. trường **sắp xếp**;
  3. trường **khoảng** (`$gt`, `$lt`, `$in` lớn…).
- **Vì sao:**
  - đúng thứ tự thì index vừa thu hẹp phạm vi vừa trả kết quả đã sắp xếp;
  - đặt khoảng trước sắp xếp buộc sort trong bộ nhớ (`SORT` stage, giới hạn bộ nhớ).
  - Cùng ý với I02 của Postgres.
- **Nguồn:** https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/; https://www.mongodb.com/docs/manual/core/indexes/index-types/index-compound/
- **Cấp:** L3 · **Nối với:** skill `index_design` · **Kiểm:** cú pháp (mingo không có index; truy vấn chạy được nhưng thứ tự index không đo được)

```js
// M07 bad (syntax)
db.orders.createIndex({ createdAt: 1, status: 1, total: -1 })
```
```js
// M07 good (syntax)
db.orders.createIndex({ status: 1, total: -1, createdAt: 1 });
db.orders.find({ status: 'PAID', createdAt: { $gte: new Date('2026-10-01') } }).sort({ total: -1 })
```

### M08 · Chỉ lấy trường cần dùng / Project only what you need

- **Luật:**
  - `find` và `aggregate` luôn chiếu (projection) đúng các trường cần;
  - loại `_id` nếu không dùng;
  - với index phù hợp, truy vấn thành covered query, không đọc tài liệu.
- **Vì sao:** giảm dữ liệu qua mạng và bộ nhớ. Covered query trả kết quả chỉ từ index.
- **Nguồn:** https://www.mongodb.com/docs/manual/core/query-optimization/ (mục Covered Query)
- **Cấp:** L1 · **Nối với:** skill `select` · **Kiểm:** mingo, Sai ≠ Đúng (Sai trả cả mảng `items`)

```js
// M08 bad
db.orders.find({ customerId: 11 })
```
```js
// M08 good
db.orders.find({ customerId: 11 }, { _id: 0, createdAt: 1, total: 1 })
```

### M09 · Pipeline: `$match` sớm, `$sort` + `$limit` cạnh nhau / Filter early in pipelines

- **Luật:**
  - đặt `$match` (và `$project` bớt trường) càng sớm càng tốt, trước `$unwind`, `$group`, `$lookup`;
  - top-N viết `$sort` ngay trước `$limit`.
- **Vì sao:**
  - `$match` ở đầu pipeline dùng được index và giảm số tài liệu đi qua các stage sau;
  - `$sort` + `$limit` được gộp thành top-k, không sắp xếp toàn bộ;
  - optimizer chỉ tự đẩy `$match` lên trong một số trường hợp.
- **Nguồn:** https://www.mongodb.com/docs/manual/core/aggregation-pipeline-optimization/
- **Cấp:** L2 · **Nối với:** skill `where`, `group_by` · **Kiểm:** mingo, Sai = Đúng

```js
// M09 bad
db.orders.aggregate([
  { $unwind: '$items' },
  { $group: { _id: { order: '$_id', status: '$status' }, units: { $sum: '$items.qty' } } },
  { $match: { '_id.status': 'PAID' } },
  { $sort: { units: -1, '_id.order': 1 } },
  { $project: { _id: 0, order: '$_id.order', units: 1 } },
  { $limit: 2 }
])
```
```js
// M09 good
db.orders.aggregate([
  { $match: { status: 'PAID' } },
  { $project: { items: 1 } },
  { $unwind: '$items' },
  { $group: { _id: '$_id', units: { $sum: '$items.qty' } } },
  { $sort: { units: -1, _id: 1 } },
  { $limit: 2 },
  { $project: { _id: 0, order: '$_id', units: 1 } }
])
```

### M10 · Transaction nhiều tài liệu chỉ khi cần, và ngắn / Multi-document transactions: rare and short

- **Luật:**
  - ưu tiên thiết kế để một thay đổi nằm trong **một** tài liệu (atomic sẵn);
  - dùng multi-document transaction khi thật sự phải sửa nhiều tài liệu cùng lúc;
  - giữ nó ngắn: mặc định transaction phải xong trong dưới một phút (`transactionLifetimeLimitSeconds`), quá hạn sẽ bị hủy;
  - mỗi transaction sửa ít tài liệu;
  - xử lý lỗi `TransientTransactionError` bằng retry.
- **Vì sao:** transaction tốn hơn thao tác đơn lẻ, giữ tài nguyên và gây xung đột ghi. Nhu cầu transaction thường xuyên là dấu hiệu mô hình chưa hợp access pattern.
- **Nguồn:**
  - https://www.mongodb.com/docs/manual/core/transactions/
  - https://www.mongodb.com/docs/manual/core/transactions-production-consideration/
  - https://www.mongodb.com/docs/manual/core/write-operations-atomicity/
- **Cấp:** L4 · **Nối với:** chưa có · **Kiểm:** cú pháp

```js
// M10 bad (syntax)
session.withTransaction(async () => {
  await orders.updateOne({ _id: 1 }, { $set: { status: 'PAID' } }, { session });
  await orders.updateOne({ _id: 1 }, { $set: { paidAt: new Date() } }, { session });
})
```
```js
// M10 good (syntax)
db.orders.updateOne({ _id: 1, status: 'PENDING' }, { $set: { status: 'PAID', paidAt: new Date() } })
```

### M11 · Shard key: nhiều giá trị, tần suất đều, không tăng đơn điệu / Choosing a shard key

- **Luật:**
  - shard key có cardinality cao, tần suất mỗi giá trị thấp, không tăng đơn điệu, và có trong các truy vấn chính (để không phải hỏi mọi shard);
  - khóa tăng dần (`_id` ObjectId, timestamp) thì dùng hashed sharding hoặc khóa ghép (`{ tenantId: 1, createdAt: 1 }`).
- **Vì sao:**
  - khóa tăng đơn điệu dồn mọi lần ghi mới vào một chunk cuối, nên một shard "nóng";
  - khóa ít giá trị tạo chunk không chia được (jumbo).
- **Nguồn:** https://www.mongodb.com/docs/manual/core/sharding-choose-a-shard-key/; https://www.mongodb.com/docs/manual/core/indexes/index-types/index-hashed/
- **Cấp:** L5 · **Nối với:** chưa có · **Kiểm:** cú pháp

```js
// M11 bad (syntax)
sh.shardCollection('shop.orders', { createdAt: 1 })
```
```js
// M11 good (syntax)
sh.shardCollection('shop.orders', { customerId: 'hashed' })
```

### M12 · Bỏ index thừa / Remove unnecessary indexes

- **Luật:**
  - định kỳ xem `$indexStats`;
  - xóa index không dùng, hoặc là tiền tố của index khác (`{ a: 1 }` khi đã có `{ a: 1, b: 1 }`).
- **Vì sao:** mỗi index tốn RAM và làm chậm mọi lần ghi. Index thừa đẩy working set ra khỏi bộ nhớ.
- **Nguồn:** https://www.mongodb.com/docs/manual/data-modeling/design-antipatterns/unnecessary-indexes/
- **Cấp:** L3 · **Nối với:** skill `index_design` (giống I09) · **Kiểm:** cú pháp

```js
// M12 bad (syntax)
db.orders.createIndex({ status: 1 });
db.orders.createIndex({ status: 1, total: -1 })
```
```js
// M12 good (syntax)
db.orders.aggregate([{ $indexStats: {} }]);
db.orders.dropIndex({ status: 1 })
```

### M13 · Write concern `majority` cho dữ liệu quan trọng / Use majority write concern for data that matters

- **Luật:**
  - ghi dữ liệu không được mất (thanh toán, đơn) dùng `w: 'majority'` (đây là write concern mặc định ngầm định trong đa số cấu hình replica set, nhưng driver hay cấu hình cụm có thể đặt khác);
  - đọc cần thấy dữ liệu đã xác nhận thì dùng read concern `majority`;
  - không hạ `w: 0` / `w: 1` để "nhanh hơn" cho dữ liệu này.
- **Vì sao:** lần ghi chỉ được primary xác nhận có thể bị rollback khi primary đổi trước khi bản sao kịp nhận.
- **Nguồn:**
  - https://www.mongodb.com/docs/manual/reference/write-concern/
  - https://www.mongodb.com/docs/manual/reference/read-concern/
  - https://www.mongodb.com/docs/manual/administration/production-notes/
- **Cấp:** L4 · **Nối với:** chưa có · **Kiểm:** cú pháp

```js
// M13 bad (syntax)
db.payments.insertOne({ orderId: 1, amount: 120 }, { writeConcern: { w: 0 } })
```
```js
// M13 good (syntax)
db.payments.insertOne({ orderId: 1, amount: 120 }, { writeConcern: { w: 'majority', wtimeout: 5000 } })
```

### M14 · Ít collection, đa hình có chủ đích / Fewer collections, intentional polymorphism

- **Luật:**
  - không tạo một collection cho mỗi khách, mỗi ngày, mỗi loại nhỏ;
  - tài liệu cùng mục đích nhưng khác vài trường để chung một collection, có trường phân loại (`type`) (polymorphic pattern).
- **Vì sao:** mỗi collection kéo theo index, file và metadata riêng. Hàng nghìn collection làm server chậm và khó quản lý index.
- **Nguồn:**
  - https://www.mongodb.com/docs/manual/data-modeling/design-antipatterns/reduce-collections/
  - https://www.mongodb.com/docs/manual/data-modeling/design-patterns/polymorphic-data/
- **Cấp:** L2 · **Nối với:** chưa có · **Kiểm:** cú pháp

```js
// M14 bad (syntax)
db.orders_customer_11.find({})
```
```js
// M14 good (syntax)
db.orders.find({ customerId: 11 }, { _id: 1 })
```

### 7.1 Dữ liệu mẫu bổ sung (vòng 2)

Các mục M15–M22 chạy trên `mingo` **7.2.6** (cài tạm ngoài repo), với `MDATA` ở §7.0 cộng khối dưới đây. Script kiểm vòng 2 cũng chạy lại M01, M05, M08, M09 trên 7.2.6: kết quả như vòng 1. Khối có nhiều lệnh thì kết quả là của lệnh cuối; lệnh ghi chạy trên bản sao dữ liệu của riêng khối đó.

```js
// MDATA2
const data2 = {
  users: [
    { _id: 1, name: 'An', city: 'Da Nang' }, { _id: 2, name: 'Binh', city: null },
    { _id: 3, name: 'Chi' }, { _id: 4, name: 'Dung', city: 'Hue' }
  ],
  carts: [
    { _id: 1, userId: 1, items: [{ sku: 'A', qty: 1 }, { sku: 'B', qty: 2 }] },
    { _id: 2, userId: 2, items: [] },
    { _id: 3, userId: 3 }
  ],
  logins: [
    { _id: 1, userId: 1, at: '2026-9-30' }, { _id: 2, userId: 2, at: '2026-10-02' }, { _id: 3, userId: 4, at: '2026-11-01' }
  ],
  logins_typed: [
    { _id: 1, userId: 1, at: new Date('2026-09-30') }, { _id: 2, userId: 2, at: new Date('2026-10-02') }, { _id: 3, userId: 4, at: new Date('2026-11-01') }
  ]
};
```

### M15 · Nhiều điều kiện trên cùng một phần tử mảng: `$elemMatch` / One array element, many conditions: $elemMatch

- **Luật:** khi các điều kiện phải đúng **trên cùng một** phần tử của mảng tài liệu con (cùng một dòng hàng có `sku = 'A'` **và** `qty ≥ 2`), dùng `$elemMatch`.
- **Vì sao:** viết bằng dot notation (`'items.sku'`, `'items.qty'`), mỗi điều kiện có thể được thỏa bởi một phần tử khác nhau. Tài liệu gọi đó là "any combination of elements". Kết quả thừa mà không báo lỗi.
- **Nguồn:** https://www.mongodb.com/docs/manual/tutorial/query-array-of-documents/ (mục "Combination of Elements Satisfies the Criteria")
- **Cấp:** L2 · **Nối với:** skill `where`, `join` (đối chiếu: điều kiện trên cùng một dòng con) · **Kiểm:** mingo, Sai ≠ Đúng: Sai `[1, 4]` (đơn 1 có A qty 1 và B qty 2), Đúng `[4]`

```js
// M15 bad
db.orders.find({ 'items.sku': 'A', 'items.qty': { $gte: 2 } }, { _id: 1 })
```
```js
// M15 good
db.orders.find({ items: { $elemMatch: { sku: 'A', qty: { $gte: 2 } } } }, { _id: 1 })
```

### M16 · `{ field: null }` khớp cả trường thiếu / null also matches missing fields

- **Luật:** nói rõ ý định: chỉ giá trị null thì `{ $type: 'null' }`, chỉ trường không có thì `{ $exists: false }`; `{ field: null }` chỉ dùng khi muốn cả hai.
- **Vì sao:** `{ city: null }` trả cả tài liệu có `city: null` lẫn tài liệu không có trường `city`. Đếm "khách chưa khai thành phố" sẽ lẫn hai nhóm khác nghĩa.
- **Nguồn:** https://www.mongodb.com/docs/manual/tutorial/query-for-null-fields/
- **Cấp:** L1 · **Nối với:** skill `null_logic` · **Kiểm:** mingo, Sai ≠ Đúng: Sai `[2, 3]`, Đúng `[2]`

```js
// M16 bad
db.users.find({ city: null }, { _id: 1 })
```
```js
// M16 good
db.users.find({ city: { $type: 'null' } }, { _id: 1 })
```

### M17 · `$ne` / `$nin` trả cả tài liệu thiếu trường / $ne and $nin include missing fields

- **Luật:** "khác X" mà chỉ muốn tài liệu có giá trị thật thì thêm `$exists: true` và loại `null`.
- **Vì sao:** `$ne` chọn cả tài liệu không có trường đó. Đây là bẫy ngược với SQL: `city <> 'Da Nang'` trong SQL **bỏ** NULL (Q03), còn Mongo **giữ** cả null lẫn thiếu.
- **Nguồn:** https://www.mongodb.com/docs/manual/reference/operator/query/ne/ ("This includes documents that do not contain the field.")
- **Cấp:** L2 · **Nối với:** skill `null_logic` · **Kiểm:** mingo, Sai ≠ Đúng: Sai `[2, 3, 4]`, Đúng `[4]`

```js
// M17 bad
db.users.find({ city: { $ne: 'Da Nang' } }, { _id: 1 })
```
```js
// M17 good
db.users.find({ city: { $exists: true, $nin: ['Da Nang', null] } }, { _id: 1 })
```

### M18 · `$unwind` bỏ mất tài liệu có mảng rỗng hoặc thiếu / $unwind drops empty and missing arrays

- **Luật:** khi báo cáo phải giữ mọi tài liệu cha (khách có giỏ rỗng vẫn phải hiện 0), dùng `preserveNullAndEmptyArrays: true` rồi đếm có điều kiện.
- **Vì sao:** mặc định `$unwind` không sinh tài liệu nào khi mảng null, thiếu hoặc rỗng. Giống INNER JOIN thay cho LEFT JOIN trong SQL: dòng 0 biến mất khỏi báo cáo.
- **Nguồn:** https://www.mongodb.com/docs/manual/reference/operator/aggregation/unwind/ (mục "Missing Field" và `preserveNullAndEmptyArrays`)
- **Cấp:** L2 · **Nối với:** skill `left_join`, `coalesce` · **Kiểm:** mingo, Sai ≠ Đúng: Sai chỉ còn người dùng 1, Đúng có cả 2 và 3 với `lines: 0`

```js
// M18 bad
db.carts.aggregate([
  { $unwind: '$items' },
  { $group: { _id: '$userId', lines: { $sum: 1 } } },
  { $sort: { _id: 1 } }
])
```
```js
// M18 good
db.carts.aggregate([
  { $unwind: { path: '$items', preserveNullAndEmptyArrays: true } },
  { $group: { _id: '$userId', lines: { $sum: { $cond: [{ $ifNull: ['$items', false] }, 1, 0] } } } },
  { $sort: { _id: 1 } }
])
```

### M19 · Ngày giờ lưu kiểu `Date`, không lưu chuỗi / Store dates as Date, not strings

- **Luật:** thời điểm lưu kiểu `Date` (BSON date, UTC). Nếu dữ liệu nguồn là chuỗi, đổi khi nạp (`$dateFromString`), không để mỗi truy vấn tự so chuỗi.
- **Vì sao:**
  - chuỗi so theo byte ("simple binary comparison"), nên `'2026-9-30'` lớn hơn `'2026-10-01'` và rơi khỏi khoảng tháng 9;
  - toán tử so sánh chỉ so cùng kiểu BSON (type bracketing), nên trộn chuỗi và `Date` trong một trường làm khoảng thời gian thiếu dữ liệu âm thầm.
- **Nguồn:**
  - https://www.mongodb.com/docs/manual/reference/bson-type-comparison-order/
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateFromString/
- **Cấp:** L1 · **Nối với:** skill `date_math`, `cast` · **Kiểm:** mingo, Sai ≠ Đúng: khoảng tháng 9, Sai `[]`, Đúng `[1]`

```js
// M19 bad
db.logins.find({ at: { $gte: '2026-09-01', $lt: '2026-10-01' } }, { _id: 1 })
```
```js
// M19 good
db.logins_typed.find({ at: { $gte: new Date('2026-09-01'), $lt: new Date('2026-10-01') } }, { _id: 1 })
```

### M20 · Sửa mọi phần tử khớp: `$[<id>]` + `arrayFilters`, không `$` / Update all matching elements with filtered positional

- **Luật:** cần sửa **mọi** phần tử mảng thỏa điều kiện thì dùng `$[<identifier>]` với `arrayFilters`. Toán tử `$` chỉ sửa phần tử khớp **đầu tiên**.
- **Vì sao:** `$` là "placeholder for the first element that matches". Giảm giá mọi dòng dưới 50 bằng `$` chỉ đổi một dòng, phần còn lại giữ giá cũ.
- **Nguồn:**
  - https://www.mongodb.com/docs/manual/reference/operator/update/positional/
  - https://www.mongodb.com/docs/manual/reference/operator/update/positional-filtered/
- **Cấp:** L2 · **Nối với:** chưa có · **Kiểm:** mingo, Sai ≠ Đúng: đơn 5, Sai chỉ giảm SKU C (30 → 15), Đúng giảm cả C và B (15 → 7,5)

```js
// M20 bad
db.orders.updateOne({ _id: 5, 'items.price': { $lt: 50 } }, { $mul: { 'items.$.price': 0.5 } });
db.orders.find({ _id: 5 }, { _id: 0, items: 1 })
```
```js
// M20 good
db.orders.updateOne({ _id: 5 }, { $mul: { 'items.$[cheap].price': 0.5 } }, { arrayFilters: [{ 'cheap.price': { $lt: 50 } }] });
db.orders.find({ _id: 5 }, { _id: 0, items: 1 })
```

### M21 · Trung bình của trung bình không phải trung bình / An average of averages is not the average

- **Luật:** giá trị đơn trung bình tính `$avg` trên từng đơn, một lần. Nếu buộc phải gộp từ các nhóm, giữ `sum` và `count` của từng nhóm rồi chia ở cuối.
- **Vì sao:** `$avg` của các trung bình nhóm cho mỗi nhóm trọng số như nhau, bất kể nhóm có 1 hay 100 đơn. Cùng bẫy với A18 trong SQL.
- **Nguồn:** https://www.mongodb.com/docs/manual/reference/operator/aggregation/avg/
- **Cấp:** L2 · **Nối với:** skill `aggregate`, `group_by` · **Kiểm:** mingo, Sai ≠ Đúng: Sai 160,83, Đúng 136,25

```js
// M21 bad
db.orders.aggregate([
  { $match: { status: 'PAID' } },
  { $group: { _id: '$customerId', avgTotal: { $avg: '$total' } } },
  { $group: { _id: null, avgOrder: { $avg: '$avgTotal' } } }
])
```
```js
// M21 good
db.orders.aggregate([
  { $match: { status: 'PAID' } },
  { $group: { _id: null, avgOrder: { $avg: '$total' } } }
])
```

### M22 · Nhiều giá trị của cùng một trường: `$in`, không `$or` / $in instead of $or on one field

- **Luật:** so bằng nhiều giá trị của **một** trường thì viết `{ field: { $in: [...] } }`; `$or` dành cho điều kiện trên các trường khác nhau.
- **Vì sao:** tài liệu `$or` khuyên dùng `$in` cho trường hợp này: ngắn hơn, và một index trên trường đó phục vụ trọn câu lệnh.
- **Nguồn:** https://www.mongodb.com/docs/manual/reference/operator/query/or/ (mục "$or Compared to $in")
- **Cấp:** L1 · **Nối với:** skill `where`, `in_subquery` · **Kiểm:** mingo, Sai = Đúng (cùng 5 đơn); lợi ích về index không đo được vì mingo không có index

```js
// M22 bad
db.orders.find({ $or: [{ status: 'PAID' }, { status: 'CANCELLED' }] }, { _id: 1 })
```
```js
// M22 good
db.orders.find({ status: { $in: ['PAID', 'CANCELLED'] } }, { _id: 1 })
```

## 8. DynamoDB (D)

Vòng 2 (2026-11-20) chạy thật các ví dụ DynamoDB trên `@dynoxide/wasm-engine` **1.5.0** (bản `spike-nosql-browser.md` đã đo), trong Node:

- engine chạy trong một `worker_threads` giả lập Web Worker, chế độ `ephemeral` (SQLite trong bộ nhớ);
- mỗi khối được chạy trên một engine mới, nạp lại dữ liệu §8.0, nên lệnh ghi của khối này không ảnh hưởng khối khác;
- mỗi khối là các lệnh `await <Operation>({...})` với request đúng dạng DynamoDB JSON của API; script kiểm ghi lại `Count`, `ScannedCount`, `ConsumedCapacity` hoặc kiểu lỗi (`EngineError.type`);
- số RCU/WCU ở dòng **Kiểm** là **số dynoxide 1.5.0 báo**. Chúng khớp quy tắc tài liệu (đọc theo khối 4 KB, ghi theo khối 1 KB), nhưng không phải hóa đơn AWS;
- giới hạn của emulator: không có throttle theo partition, không TTL, không `TransactWriteItems` (trả `UnsupportedOperation`). Mục nào dựa vào các thứ này vẫn ghi **cú pháp** và nói lý do;
- emulator kiểm tra đầu vào như AWS: tên bảng/index ít nhất 3 ký tự, từ dành riêng, điều kiện trên khóa trong `FilterExpression`, đọc strong trên GSI. Các lỗi đó được dùng làm bằng chứng ở D13, D14, D15.

Khối có hậu tố `(syntax)` là khối không chạy.

### 8.0 Dữ liệu mẫu cho các ví dụ chạy được

Một bảng `Shop` kiểu single-table (40 khách, 400 đơn, mỗi đơn có một bản trong item collection của khách và một item `META`), hai GSI (`ByStatus`, thưa `PendingByWarehouse`), cùng ba bảng nhỏ cho D04 và D18. Tổng 1.135 item trong `Shop`.

```js
// DDATA
const S = (v) => ({ S: String(v) }), N = (v) => ({ N: String(v) });
const keyAttr = (n, t = 'S') => ({ AttributeName: n, AttributeType: t });
const tables = [
  { TableName: 'Shop', BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [{ AttributeName: 'PK', KeyType: 'HASH' }, { AttributeName: 'SK', KeyType: 'RANGE' }],
    AttributeDefinitions: [keyAttr('PK'), keyAttr('SK'), keyAttr('status'), keyAttr('warehouseId'), keyAttr('pendingAt')],
    GlobalSecondaryIndexes: [
      { IndexName: 'ByStatus', KeySchema: [{ AttributeName: 'status', KeyType: 'HASH' }], Projection: { ProjectionType: 'ALL' } },
      { IndexName: 'PendingByWarehouse',
        KeySchema: [{ AttributeName: 'warehouseId', KeyType: 'HASH' }, { AttributeName: 'pendingAt', KeyType: 'RANGE' }],
        Projection: { ProjectionType: 'INCLUDE', NonKeyAttributes: ['customerId', 'total'] } }] },
  { TableName: 'StoreDaysBad', BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [{ AttributeName: 'PK', KeyType: 'HASH' }, { AttributeName: 'SK', KeyType: 'RANGE' }],
    AttributeDefinitions: [keyAttr('PK'), keyAttr('SK')] },
  { TableName: 'BoardText', BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [{ AttributeName: 'PK', KeyType: 'HASH' }, { AttributeName: 'score', KeyType: 'RANGE' }],
    AttributeDefinitions: [keyAttr('PK'), keyAttr('score')] },
  { TableName: 'BoardNum', BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [{ AttributeName: 'PK', KeyType: 'HASH' }, { AttributeName: 'score', KeyType: 'RANGE' }],
    AttributeDefinitions: [keyAttr('PK'), keyAttr('score', 'N')] }
];
const shop = [], bad = [], text = [], num = [];
for (let c = 4700; c < 4740; c++) shop.push({ PK: S('CUSTOMER#' + c), SK: S('PROFILE'), name: S('Customer ' + c) });
for (let i = 0; i < 400; i++) {
  const id = 9000 + i, c = 4700 + (i * 7) % 40, day = String(1 + (i % 31)).padStart(2, '0');
  const at = `2026-10-${day}T${String(8 + (i % 12)).padStart(2, '0')}:00:00Z`;
  const status = i % 10 === 0 ? 'PENDING' : i % 10 === 1 ? 'CANCELLED' : 'PAID';
  const o = { customerId: S(c), status: S(status), total: N(50 + (i * 37) % 450), warehouseId: S('WH' + (i % 3)) };
  if (status === 'PENDING') o.pendingAt = S(at);
  shop.push({ PK: S('CUSTOMER#' + c), SK: S(`ORDER#${at}#${id}`), ...o });
  shop.push({ PK: S('ORDER#' + id), SK: S('META'), version: N(1), ...o });
}
for (let i = 0; i < 100; i++) {
  shop.push({ PK: S('EVENTS#2026-10-31'), SK: S('ts#' + String(i).padStart(3, '0')) });
  shop.push({ PK: S('EVENTS#2026-10-31#' + (i % 10)), SK: S('ts#' + String(i).padStart(3, '0')) });
}
for (let d = new Date('2026-09-01'); d < new Date('2026-12-01'); d.setUTCDate(d.getUTCDate() + 1)) {
  const iso = d.toISOString().slice(0, 10), [y, m, dd] = iso.split('-');
  shop.push({ PK: S('STORE#3'), SK: S('SALE#' + iso), revenue: N(1000) });
  bad.push({ PK: S('STORE#3'), SK: S(`${dd}/${m}/${y}`), revenue: N(1000) });
}
shop.push({ PK: S('PRODUCT#A'), SK: S('DETAIL'), manualPdfBase64: S('x'.repeat(350 * 1024)), views: N(10234) });
shop.push({ PK: S('PRODUCT#B'), SK: S('DETAIL'), manualS3Key: S('s3://bucket/manuals/B.pdf') });
shop.push({ PK: S('PRODUCT#B'), SK: S('COUNTERS'), views: N(10234) });
shop.push({ PK: S('PAGE#home'), SK: S('COUNTER'), views: N(0) });
for (const s of [9, 75, 80, 100, 250]) { text.push({ PK: S('BOARD'), score: S(s) }); num.push({ PK: S('BOARD'), score: N(s) }); }
const items = { Shop: shop, StoreDaysBad: bad, BoardText: text, BoardNum: num };
```

### D01 · Liệt kê access pattern trước, thiết kế khóa sau / Access patterns first

- **Luật:**
  - trước khi tạo bảng, viết danh sách mọi câu hỏi ứng dụng sẽ hỏi: ai hỏi, lọc theo gì, sắp xếp theo gì, tần suất, độ trễ cần có;
  - khóa và index được chọn để mỗi câu hỏi là một `GetItem`/`Query`.
- **Vì sao:**
  - DynamoDB không có join hay truy vấn tùy ý hiệu quả: câu hỏi nào không có khóa phù hợp thì thành `Scan`;
  - khác SQL, ở đây mô hình đi theo truy vấn chứ không theo thực thể.
- **Nguồn:**
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-general-nosql-design.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/data-modeling.html
- **Cấp:** L1 · **Nối với:** chưa có (node `d7`: lấy yêu cầu) · **Kiểm:** dynoxide, Sai = Đúng (Count 10). Sai: `Scan` có ScannedCount 1135, tốn 54 RCU. Đúng: ba lần gọi, mỗi lần 0,5 RCU

```js
// D01 bad
await Scan({ TableName: 'Shop', FilterExpression: 'customerId = :c AND begins_with(SK, :o)',
  ExpressionAttributeValues: { ':c': { S: '4711' }, ':o': { S: 'ORDER#' } }, ReturnConsumedCapacity: 'TOTAL' });
```
```js
// D01 good
await GetItem({ TableName: 'Shop', Key: { PK: { S: 'ORDER#9001' }, SK: { S: 'META' } }, ReturnConsumedCapacity: 'TOTAL' });          // AP1
await Query({ TableName: 'Shop', KeyConditionExpression: 'PK = :pk AND begins_with(SK, :o)', ScanIndexForward: false,      // AP2
  ExpressionAttributeValues: { ':pk': { S: 'CUSTOMER#4711' }, ':o': { S: 'ORDER#' } }, ReturnConsumedCapacity: 'TOTAL' });
await Query({ TableName: 'Shop', IndexName: 'PendingByWarehouse', KeyConditionExpression: 'warehouseId = :w',            // AP3
  ExpressionAttributeValues: { ':w': { S: 'WH0' } }, ReturnConsumedCapacity: 'TOTAL' });
```

### D02 · Partition key nhiều giá trị, tải đều / High-cardinality, evenly accessed partition keys

- **Luật:**
  - partition key phải có rất nhiều giá trị và lưu lượng chia đều giữa chúng (id khách, id thiết bị);
  - không dùng giá trị ít và lệch (trạng thái, ngày hôm nay, loại sản phẩm) làm partition key của bảng hay GSI ghi nhiều.
- **Vì sao:**
  - dữ liệu và thông lượng chia theo partition;
  - mỗi partition có giới hạn riêng: khoảng 3.000 RCU và 1.000 WCU mỗi giây;
  - một khóa "nóng" bị throttle dù tổng capacity của bảng còn dư;
  - adaptive capacity chỉ giảm nhẹ, không chữa được.
- **Nguồn:**
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-uniform-load.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/burst-adaptive-capacity.html
- **Cấp:** L2 · **Nối với:** chưa có · **Kiểm:** dynoxide, chạy được: GSI `ByStatus` dồn 640 trên 800 item có `status` vào một khóa `PAID`; khóa `CUSTOMER#4711` giữ 11 item. Throttle theo partition không mô phỏng được (emulator một nút)

```js
// D02 bad
await Query({ TableName: 'Shop', IndexName: 'ByStatus', KeyConditionExpression: '#s = :s',
  ExpressionAttributeNames: { '#s': 'status' }, ExpressionAttributeValues: { ':s': { S: 'PAID' } }, Select: 'COUNT' });
```
```js
// D02 good
await Query({ TableName: 'Shop', KeyConditionExpression: 'PK = :pk',
  ExpressionAttributeValues: { ':pk': { S: 'CUSTOMER#4711' } }, Select: 'COUNT' });
```

### D03 · Rải khóa nóng bằng hậu tố (write sharding) / Write sharding for hot keys

- **Luật:**
  - khi một khóa logic buộc phải nhận rất nhiều lần ghi (bộ đếm toàn cục, sự kiện theo ngày), thêm hậu tố `#0…#N-1` (ngẫu nhiên, hoặc tính từ một thuộc tính để còn đọc lại một item);
  - đọc thì hỏi song song N khóa rồi gộp.
- **Vì sao:** chia một khóa nóng thành N khóa trên N partition, nhân giới hạn ghi lên N lần.
- **Nguồn:** https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-sharding.html
- **Cấp:** L3 · **Nối với:** chưa có · **Kiểm:** dynoxide, Sai = Đúng (Count 100 = 10 khóa × 10). Lợi ích chia tải ghi không đo được trên emulator

```js
// D03 bad
await Query({ TableName: 'Shop', KeyConditionExpression: 'PK = :pk',
  ExpressionAttributeValues: { ':pk': { S: 'EVENTS#2026-10-31' } }, Select: 'COUNT' });
```
```js
// D03 good
let total = 0;
for (let k = 0; k < 10; k++) {
  const r = await Query({ TableName: 'Shop', KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': { S: 'EVENTS#2026-10-31#' + k } }, Select: 'COUNT' });
  total += r.Count;
}
```

### D04 · Sort key phân cấp để `begins_with` / Hierarchical sort keys

- **Luật:** sort key ghép theo cấp từ rộng tới hẹp (`COUNTRY#VN#CITY#DANANG#STORE#3`), hoặc tiền tố loại + thời gian ISO-8601 (`ORDER#2026-10-31T…`), để một `Query` với `begins_with`/`between` lấy đúng nhóm, đúng khoảng.
- **Vì sao:**
  - sort key được sắp xếp;
  - đặt đúng thứ tự cấp thì mỗi mức "drill-down" là một `Query`, không cần index thêm;
  - tiền tố phiên bản (`v0_`) giữ bản hiện hành dễ lấy.
- **Nguồn:** https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-sort-keys.html
- **Cấp:** L2 · **Nối với:** skill `order_by` (tư duy sắp xếp) · **Kiểm:** dynoxide, Sai ≠ Đúng: `BETWEEN` trên chuỗi `dd/mm/yyyy` trả 90 item (lẫn cả tháng 9 và 11), Đúng 31

```js
// D04 bad
await Query({ TableName: 'StoreDaysBad', KeyConditionExpression: 'PK = :pk AND SK BETWEEN :a AND :b',
  ExpressionAttributeValues: { ':pk': { S: 'STORE#3' }, ':a': { S: '01/10/2026' }, ':b': { S: '31/10/2026' } }, Select: 'COUNT' });
```
```js
// D04 good
await Query({ TableName: 'Shop', KeyConditionExpression: 'PK = :pk AND begins_with(SK, :m)',
  ExpressionAttributeValues: { ':pk': { S: 'STORE#3' }, ':m': { S: 'SALE#2026-10' } }, Select: 'COUNT' });
```

### D05 · Item collection: thứ đọc cùng nhau chung partition key / Item collections for related data

- **Luật:**
  - thực thể được đọc cùng nhau (khách và các đơn gần đây) đặt chung partition key, phân biệt bằng tiền tố sort key, để một `Query` lấy cả nhóm;
  - single-table design là công cụ, không phải luật: thực thể không bao giờ đọc cùng nhau thì để bảng riêng cũng được.
- **Vì sao:**
  - DynamoDB không join;
  - gom sẵn theo khóa thay cho join lúc đọc;
  - nhưng nhồi mọi thứ vào một bảng làm khó stream, backup, phân quyền và thống kê chi phí theo thực thể.
- **Nguồn:**
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/data-modeling.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-adjacency-graphs.html
- **Cấp:** L3 · **Nối với:** skill `join` (đối chiếu) · **Kiểm:** dynoxide. Sai: `GetItem` + `Scan` (ScannedCount 1135, 54 RCU). Đúng: một `Query`, 11 item, 0,5 RCU

```js
// D05 bad
await GetItem({ TableName: 'Shop', Key: { PK: { S: 'CUSTOMER#4711' }, SK: { S: 'PROFILE' } }, ReturnConsumedCapacity: 'TOTAL' });
await Scan({ TableName: 'Shop', FilterExpression: 'customerId = :c AND begins_with(PK, :p)',
  ExpressionAttributeValues: { ':c': { S: '4711' }, ':p': { S: 'CUSTOMER#' } }, ReturnConsumedCapacity: 'TOTAL' });
```
```js
// D05 good
await Query({ TableName: 'Shop', KeyConditionExpression: 'PK = :pk',
  ExpressionAttributeValues: { ':pk': { S: 'CUSTOMER#4711' } }, ReturnConsumedCapacity: 'TOTAL' });
```

### D06 · `Query`, đừng `Scan` / Query, don't Scan

- **Luật:**
  - truy vấn trong luồng ứng dụng dùng `GetItem`/`Query` trên bảng hoặc index;
  - `Scan` chỉ cho việc nền (xuất, sửa dữ liệu), có giới hạn tốc độ;
  - `FilterExpression` không giảm chi phí: lọc **sau** khi đã đọc.
- **Vì sao:** `Scan` đọc và tính phí mọi item, ăn hết capacity của bảng, làm throttle các request khác.
- **Nguồn:** https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-query-scan.html
- **Cấp:** L1 · **Nối với:** skill `where`, `sargable` (cùng ý "dùng khóa để thu hẹp") · **Kiểm:** dynoxide. Sai: ScannedCount 1135, Count 11, 54 RCU. Đúng: ScannedCount 11, 0,5 RCU

```js
// D06 bad
await Scan({ TableName: 'Shop', FilterExpression: 'PK = :pk',
  ExpressionAttributeValues: { ':pk': { S: 'CUSTOMER#4711' } }, ReturnConsumedCapacity: 'TOTAL' });
```
```js
// D06 good
await Query({ TableName: 'Shop', KeyConditionExpression: 'PK = :pk',
  ExpressionAttributeValues: { ':pk': { S: 'CUSTOMER#4711' } }, ReturnConsumedCapacity: 'TOTAL' });
```

### D07 · GSI: ít, chiếu tối thiểu, sparse khi được / Lean, sparse GSIs

- **Luật:**
  - mỗi GSI phục vụ access pattern cụ thể;
  - chỉ chiếu (`Projection`) thuộc tính cần (`KEYS_ONLY`/`INCLUDE`), tránh `ALL`;
  - dùng sparse index: chỉ item có thuộc tính khóa của GSI mới vào index, ví dụ chỉ đơn đang chờ;
  - nhớ GSI chỉ đọc eventually consistent.
- **Vì sao:**
  - mỗi lần ghi vào bảng ghi thêm vào mọi GSI liên quan, nên tốn WCU và lưu trữ;
  - GSI thiếu capacity sẽ throttle ghi của bảng gốc.
- **Nguồn:**
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-indexes-general.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/SecondaryIndexes.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-gsi-overloading.html
- **Cấp:** L3 · **Nối với:** skill `index_design` (giống partial index I03) · **Kiểm:** dynoxide. GSI `ByStatus` chứa 800 item, GSI thưa `PendingByWarehouse` chỉ 80. Cùng câu hỏi "đơn chờ ở WH0": Sai đọc 80 item rồi lọc còn 28 (ScannedCount 80), Đúng đọc đúng 28

```js
// D07 bad
await Scan({ TableName: 'Shop', IndexName: 'ByStatus', Select: 'COUNT' });
await Query({ TableName: 'Shop', IndexName: 'ByStatus', KeyConditionExpression: '#s = :s', FilterExpression: 'warehouseId = :w',
  ExpressionAttributeNames: { '#s': 'status' }, ExpressionAttributeValues: { ':s': { S: 'PENDING' }, ':w': { S: 'WH0' } } });
```
```js
// D07 good
await Scan({ TableName: 'Shop', IndexName: 'PendingByWarehouse', Select: 'COUNT' });
await Query({ TableName: 'Shop', IndexName: 'PendingByWarehouse', KeyConditionExpression: 'warehouseId = :w',
  ExpressionAttributeValues: { ':w': { S: 'WH0' } } });
```

### D08 · Item nhỏ: phần lớn để S3 / Keep items small

- **Luật:**
  - item giới hạn 400 KB;
  - thuộc tính lớn (ảnh, tài liệu) để ở S3, item chỉ giữ khóa đối tượng;
  - nén văn bản dài;
  - tách thuộc tính hay đổi ra khỏi item to ít đổi.
- **Vì sao:**
  - đọc tính theo khối 4 KB (RCU), ghi theo khối 1 KB (WCU);
  - sửa một trường của item 300 KB bị tính phí cho cả 300 KB.
- **Nguồn:**
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-use-s3-too.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/read-write-operations.html (đọc tròn lên bội 4 KB, ghi bội 1 KB; `UpdateItem` tính theo kích thước lớn hơn của item trước/sau, kể cả khi chỉ sửa một thuộc tính)
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ServiceQuotas.html
- **Cấp:** L2 · **Nối với:** chưa có (giống M03) · **Kiểm:** dynoxide: `UpdateItem` sửa một thuộc tính trên item ~350 KB tốn 351 WCU; trên item nhỏ tách riêng tốn 1 WCU (đúng quy tắc 1 KB mỗi WCU)

```js
// D08 bad
await UpdateItem({ TableName: 'Shop', Key: { PK: { S: 'PRODUCT#A' }, SK: { S: 'DETAIL' } },
  UpdateExpression: 'ADD #v :one', ExpressionAttributeNames: { '#v': 'views' },
  ExpressionAttributeValues: { ':one': { N: '1' } }, ReturnConsumedCapacity: 'TOTAL' });
```
```js
// D08 good
await UpdateItem({ TableName: 'Shop', Key: { PK: { S: 'PRODUCT#B' }, SK: { S: 'COUNTERS' } },
  UpdateExpression: 'ADD #v :one', ExpressionAttributeNames: { '#v': 'views' },
  ExpressionAttributeValues: { ':one': { N: '1' } }, ReturnConsumedCapacity: 'TOTAL' });
```

### D09 · Dữ liệu theo thời gian: TTL hoặc bảng theo kỳ / Time series: TTL or per-period tables

- **Luật:**
  - dữ liệu hết hạn dùng TTL (thuộc tính epoch giây): xóa miễn phí, không tốn WCU;
  - với chuỗi thời gian lớn, AWS gợi ý một bảng cho mỗi kỳ, kỳ cũ giảm capacity hoặc lưu trữ.
- **Vì sao:**
  - xóa hàng loạt bằng `DeleteItem` tốn WCU;
  - dữ liệu mới nóng, cũ nguội: chung bảng thì trả giá capacity cho cả hai.
  - TTL xóa không tức thì (thường trong vài ngày), nên vẫn lọc theo thời gian khi đọc.
- **Nguồn:**
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-time-series.html
- **Cấp:** L3 · **Nối với:** chưa có (giống S11 drop partition) · **Kiểm:** cú pháp: dynoxide 1.5.0 trả `UnsupportedOperation` cho `UpdateTimeToLive` (README của gói ghi TTL chưa có)

```js
// D09 bad (syntax)
// job đêm: Scan + DeleteItem các phiên đăng nhập quá 30 ngày
```
```js
// D09 good
await UpdateTimeToLive({ TableName: 'Shop', TimeToLiveSpecification: { Enabled: true, AttributeName: 'expiresAt' } });
```

### D10 · Ghi có điều kiện cho idempotency và optimistic locking / Conditional writes

- **Luật:**
  - tạo mới thì dùng `ConditionExpression: attribute_not_exists(PK)` để không ghi đè;
  - sửa thì kèm số phiên bản (`version = :expected`) và tăng nó;
  - chỉ dùng `TransactWriteItems` khi nhiều item phải đổi cùng lúc (chi phí gấp đôi).
- **Vì sao:**
  - không điều kiện thì retry hoặc hai request song song ghi đè nhau âm thầm;
  - điều kiện bị từ chối nhanh và rõ (`ConditionalCheckFailedException`).
- **Nguồn:**
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html
- **Cấp:** L3 · **Nối với:** chưa có · **Kiểm:** dynoxide. Sai: `PutItem` ghi đè âm thầm, item chỉ còn `status`. Đúng: `ConditionalCheckFailedException` ở lần tạo trùng và ở lần cập nhật thứ hai cùng `version`

```js
// D10 bad
await PutItem({ TableName: 'Shop', Item: { PK: { S: 'ORDER#9001' }, SK: { S: 'META' }, status: { S: 'PAID' } } });
await GetItem({ TableName: 'Shop', Key: { PK: { S: 'ORDER#9001' }, SK: { S: 'META' } } });
```
```js
// D10 good
await PutItem({ TableName: 'Shop', Item: { PK: { S: 'ORDER#9001' }, SK: { S: 'META' }, status: { S: 'PAID' } },
  ConditionExpression: 'attribute_not_exists(PK)' });
await UpdateItem({ TableName: 'Shop', Key: { PK: { S: 'ORDER#9000' }, SK: { S: 'META' } },
  UpdateExpression: 'SET #s = :paid, version = version + :one',
  ConditionExpression: 'version = :v AND #s = :pending',
  ExpressionAttributeNames: { '#s': 'status' },
  ExpressionAttributeValues: { ':paid': { S: 'PAID' }, ':pending': { S: 'PENDING' }, ':v': { N: '1' }, ':one': { N: '1' } } });
await UpdateItem({ TableName: 'Shop', Key: { PK: { S: 'ORDER#9000' }, SK: { S: 'META' } },
  UpdateExpression: 'SET #s = :paid, version = version + :one',
  ConditionExpression: 'version = :v AND #s = :pending',
  ExpressionAttributeNames: { '#s': 'status' },
  ExpressionAttributeValues: { ':paid': { S: 'PAID' }, ':pending': { S: 'PENDING' }, ':v': { N: '1' }, ':one': { N: '1' } } });
```

### D11 · Chọn chế độ capacity theo dạng tải / Pick the capacity mode for the traffic

- **Luật:**
  - tải chưa biết, đột biến, hoặc nhỏ: **on-demand**;
  - tải ổn định, dự báo được: **provisioned** + auto scaling (rẻ hơn khi dùng đều);
  - xem lại khi dạng tải đổi.
- **Vì sao:**
  - provisioned đặt thấp thì throttle;
  - đặt cao thì trả tiền cho capacity bỏ không;
  - on-demand trả theo request nên đắt hơn mỗi đơn vị khi tải đều.
- **Nguồn:** https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/capacity-mode.html
- **Cấp:** L3 · **Nối với:** chưa có · **Kiểm:** cú pháp

```js
// D11 bad (syntax)
{ BillingMode: 'PROVISIONED', ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 } } // cho flash sale
```
```js
// D11 good (syntax)
{ BillingMode: 'PAY_PER_REQUEST' } // tải đột biến; chuyển sang PROVISIONED + auto scaling khi đã ổn định
```

### D12 · Phân trang bằng `LastEvaluatedKey` / Paginate with LastEvaluatedKey

- **Luật:**
  - `Query`/`Scan` trả tối đa 1 MB mỗi lần;
  - luôn lặp với `ExclusiveStartKey = LastEvaluatedKey` tới khi không còn `LastEvaluatedKey`;
  - `Limit` là số item **đọc**, không phải số item khớp sau `FilterExpression`.
- **Vì sao:** chỉ đọc trang đầu là âm thầm thiếu dữ liệu. Một trang rỗng không có nghĩa là hết.
- **Nguồn:** https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.Pagination.html
- **Cấp:** L2 · **Nối với:** skill `limit` (giống keyset Q21) · **Kiểm:** dynoxide, Sai ≠ Đúng. Sai: trang đầu Count 3 (còn `LastEvaluatedKey`). Đúng: bốn trang 3 + 1 + 0 + 0 = 4; một trang Count 0 vẫn có `LastEvaluatedKey`

```js
// D12 bad
const page = await Query({ TableName: 'Shop', KeyConditionExpression: 'PK = :pk', FilterExpression: '#t > :t', ExpressionAttributeNames: { '#t': 'total' }, Limit: 3,
  ExpressionAttributeValues: { ':pk': { S: 'CUSTOMER#4711' }, ':t': { N: '300' } } });
```
```js
// D12 good
let n = 0, key;
do {
  const p = await Query({ TableName: 'Shop', KeyConditionExpression: 'PK = :pk', FilterExpression: '#t > :t', ExpressionAttributeNames: { '#t': 'total' }, Limit: 3,
    ExpressionAttributeValues: { ':pk': { S: 'CUSTOMER#4711' }, ':t': { N: '300' } }, ExclusiveStartKey: key });
  n += p.Count; key = p.LastEvaluatedKey;
} while (key);
```

### D13 · Đọc strongly consistent chỉ khi cần / Strong reads only when needed

- **Luật:**
  - mặc định đọc eventually consistent (nửa giá RCU);
  - chỉ bật `ConsistentRead: true` khi ngay sau khi ghi phải thấy giá trị mới;
  - GSI không hỗ trợ đọc strongly consistent.
- **Vì sao:** strong read tốn gấp đôi và chỉ có trên bảng/LSI. Thiết kế dựa vào strong read trên GSI là không làm được.
- **Nguồn:** https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html
- **Cấp:** L2 · **Nối với:** chưa có · **Kiểm:** dynoxide. Sai: `ValidationException` "Consistent reads are not supported on global secondary indexes" (khớp tài liệu API `Query`). Đúng: `GetItem` 0,5 RCU khi đọc eventual, 1 RCU khi strong

```js
// D13 bad
await Query({ TableName: 'Shop', IndexName: 'PendingByWarehouse', ConsistentRead: true,
  KeyConditionExpression: 'warehouseId = :w', ExpressionAttributeValues: { ':w': { S: 'WH0' } } });
```
```js
// D13 good
await GetItem({ TableName: 'Shop', Key: { PK: { S: 'ORDER#9001' }, SK: { S: 'META' } }, ReturnConsumedCapacity: 'TOTAL' });
await GetItem({ TableName: 'Shop', Key: { PK: { S: 'ORDER#9001' }, SK: { S: 'META' } }, ConsistentRead: true, ReturnConsumedCapacity: 'TOTAL' });
```

### D14 · Từ dành riêng phải qua `ExpressionAttributeNames` / Reserved words need name placeholders

- **Luật:**
  - tên thuộc tính trùng từ dành riêng (`status`, `total`, `name`, `date`, `count`…) phải viết qua placeholder `#x` trong mọi expression;
  - tốt nhất là không đặt tên thuộc tính trùng từ dành riêng ngay từ đầu.
- **Vì sao:** DynamoDB có hơn 500 từ dành riêng; expression dùng thẳng tên đó bị từ chối bằng `ValidationException` chứ không chạy sai âm thầm, nhưng lỗi chỉ lộ ra lúc chạy.
- **Nguồn:**
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ReservedWords.html (cả `STATUS` và `TOTAL` có trong danh sách)
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html#HowItWorks.NamingRules.Reserved
- **Cấp:** L1 · **Nối với:** chưa có (giống tên cột phải đặt trong nháy kép ở S08) · **Kiểm:** dynoxide. Sai: `ValidationException` "Attribute name is a reserved keyword; reserved keyword: status". Đúng: Count 10, ScannedCount 11

```js
// D14 bad
await Query({ TableName: 'Shop', KeyConditionExpression: 'PK = :pk', FilterExpression: 'status = :s',
  ExpressionAttributeValues: { ':pk': { S: 'CUSTOMER#4711' }, ':s': { S: 'PAID' } } });
```
```js
// D14 good
await Query({ TableName: 'Shop', KeyConditionExpression: 'PK = :pk', FilterExpression: '#s = :s',
  ExpressionAttributeNames: { '#s': 'status' },
  ExpressionAttributeValues: { ':pk': { S: 'CUSTOMER#4711' }, ':s': { S: 'PAID' } } });
```

### D15 · Điều kiện trên sort key đặt trong `KeyConditionExpression` / Sort-key conditions belong in the key condition

- **Luật:** mọi điều kiện trên partition key và sort key (`=`, `<`, `BETWEEN`, `begins_with`) viết trong `KeyConditionExpression`; `FilterExpression` chỉ cho thuộc tính thường.
- **Vì sao:**
  - key condition thu hẹp phần dữ liệu được **đọc**, filter chỉ bỏ bớt thứ **đã đọc**;
  - với `Query`, AWS từ chối hẳn filter trên khóa: "A filter expression cannot contain partition key or sort key attributes."
- **Nguồn:**
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.FilterExpression.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html (`KeyConditionExpression`)
- **Cấp:** L2 · **Nối với:** skill `where`, `sargable` (cùng ý: điều kiện phải "dùng được khóa") · **Kiểm:** dynoxide. Sai: `ValidationException` "Filter Expression can only contain non-primary key attributes". Đúng: Count 7, 0,5 RCU

```js
// D15 bad
await Query({ TableName: 'Shop', KeyConditionExpression: 'PK = :pk', FilterExpression: 'SK BETWEEN :a AND :b',
  ExpressionAttributeValues: { ':pk': { S: 'STORE#3' }, ':a': { S: 'SALE#2026-10-01' }, ':b': { S: 'SALE#2026-10-07' } },
  ReturnConsumedCapacity: 'TOTAL' });
```
```js
// D15 good
await Query({ TableName: 'Shop', KeyConditionExpression: 'PK = :pk AND SK BETWEEN :a AND :b',
  ExpressionAttributeValues: { ':pk': { S: 'STORE#3' }, ':a': { S: 'SALE#2026-10-01' }, ':b': { S: 'SALE#2026-10-07' } },
  ReturnConsumedCapacity: 'TOTAL' });
```

### D16 · `Select: COUNT` và `ProjectionExpression` không làm đọc rẻ hơn / Counting and projecting do not cut read cost

- **Luật:**
  - đừng `Scan` với `Select: 'COUNT'` để đếm trong luồng ứng dụng: nó tốn đúng bằng đọc cả item;
  - `ProjectionExpression` chỉ giảm dữ liệu trả về mạng, không giảm RCU;
  - con số hay hỏi thì giữ sẵn trong một item bộ đếm (D17) hoặc tổng hợp qua Streams.
- **Vì sao:** RCU tính theo kích thước item đã đọc, không theo dữ liệu trả về. Tài liệu `Query` nói `COUNT` "uses the same quantity of read capacity units as getting the items".
- **Nguồn:**
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Scan.html#Scan.CapacityUnits
  - https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html (`Select`)
- **Cấp:** L2 · **Nối với:** skill `aggregate` (khác SQL: không có `count(*)` rẻ phía server) · **Kiểm:** dynoxide. Sai: `Scan` COUNT 54 RCU = `Scan` lấy đủ 54 RCU; `Query` item ~350 KB có projection 44 RCU = không projection 44 RCU. Đúng: đọc bộ đếm 0,5 RCU

```js
// D16 bad
await Scan({ TableName: 'Shop', Select: 'COUNT', ReturnConsumedCapacity: 'TOTAL' });
await Scan({ TableName: 'Shop', ReturnConsumedCapacity: 'TOTAL' });
await Query({ TableName: 'Shop', KeyConditionExpression: 'PK = :pk', ProjectionExpression: 'SK',
  ExpressionAttributeValues: { ':pk': { S: 'PRODUCT#A' } }, ReturnConsumedCapacity: 'TOTAL' });
await Query({ TableName: 'Shop', KeyConditionExpression: 'PK = :pk',
  ExpressionAttributeValues: { ':pk': { S: 'PRODUCT#A' } }, ReturnConsumedCapacity: 'TOTAL' });
```
```js
// D16 good
await GetItem({ TableName: 'Shop', Key: { PK: { S: 'PAGE#home' }, SK: { S: 'COUNTER' } }, ReturnConsumedCapacity: 'TOTAL' });
```

### D17 · Bộ đếm: `UpdateItem … ADD`, không đọc rồi ghi lại / Atomic counters, not read-modify-write

- **Luật:**
  - tăng/giảm số bằng một `UpdateItem` với `ADD` (hoặc `SET x = x + :n`);
  - không `GetItem` rồi `PutItem` giá trị mới;
  - bộ đếm nguyên tử không idempotent: retry có thể đếm hai lần. Số tiền và tồn kho dùng ghi có điều kiện (D10).
- **Vì sao:** hai client cùng đọc giá trị cũ rồi cùng ghi đè thì mất một lần cập nhật (lost update). `UpdateItem` áp từng lần ghi theo thứ tự nhận.
- **Nguồn:** https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html#WorkingWithItems.AtomicCounters
- **Cấp:** L2 · **Nối với:** chưa có (giống `UPDATE … SET x = x + 1` thay cho đọc rồi ghi trong SQL) · **Kiểm:** dynoxide, Sai ≠ Đúng: hai lượt đọc 0 rồi cùng ghi 1, kết quả 1; Đúng hai lần `ADD`, kết quả 2

```js
// D17 bad
const a = await GetItem({ TableName: 'Shop', Key: { PK: { S: 'PAGE#home' }, SK: { S: 'COUNTER' } } });
const b = await GetItem({ TableName: 'Shop', Key: { PK: { S: 'PAGE#home' }, SK: { S: 'COUNTER' } } });
await PutItem({ TableName: 'Shop', Item: { ...a.Item, views: { N: String(Number(a.Item.views.N) + 1) } } });
await PutItem({ TableName: 'Shop', Item: { ...b.Item, views: { N: String(Number(b.Item.views.N) + 1) } } });
await GetItem({ TableName: 'Shop', Key: { PK: { S: 'PAGE#home' }, SK: { S: 'COUNTER' } } });
```
```js
// D17 good
for (let i = 0; i < 2; i++)
  await UpdateItem({ TableName: 'Shop', Key: { PK: { S: 'PAGE#home' }, SK: { S: 'COUNTER' } },
    UpdateExpression: 'ADD #v :one', ExpressionAttributeNames: { '#v': 'views' }, ExpressionAttributeValues: { ':one': { N: '1' } } });
await GetItem({ TableName: 'Shop', Key: { PK: { S: 'PAGE#home' }, SK: { S: 'COUNTER' } } });
```

### D18 · Số lưu kiểu `N`, nhất là khi làm sort key / Store numbers as N, especially in sort keys

- **Luật:** điểm, số tiền, số lượng, epoch giây lưu kiểu `N`. Nếu buộc phải để trong sort key dạng chuỗi (ghép khóa), đệm số 0 tới độ dài cố định.
- **Vì sao:** sort key kiểu `S` sắp theo byte UTF-8, nên `"9"` đứng sau `"80"` và `"250"`. Top N, khoảng `BETWEEN` và phân trang đều sai âm thầm.
- **Nguồn:**
  - https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html (`ScanIndexForward`: Number theo thứ tự số, String theo byte UTF-8)
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html#HowItWorks.DataTypes.String
- **Cấp:** L1 · **Nối với:** skill `order_by`, `cast` · **Kiểm:** dynoxide, Sai ≠ Đúng: top 3 giảm dần là `9, 80, 75` với `S`, là `250, 100, 80` với `N`

```js
// D18 bad
await Query({ TableName: 'BoardText', KeyConditionExpression: 'PK = :pk', ScanIndexForward: false, Limit: 3,
  ExpressionAttributeValues: { ':pk': { S: 'BOARD' } } });
```
```js
// D18 good
await Query({ TableName: 'BoardNum', KeyConditionExpression: 'PK = :pk', ScanIndexForward: false, Limit: 3,
  ExpressionAttributeValues: { ':pk': { S: 'BOARD' } } });
```

### D19 · `BatchWriteItem`: tối đa 25 yêu cầu, lặp lại `UnprocessedItems` / Batch in 25s and retry unprocessed items

- **Luật:**
  - chia lô 25 yêu cầu put/delete;
  - sau mỗi lần gọi, gửi lại `UnprocessedItems` với exponential backoff tới khi rỗng;
  - batch không có điều kiện và không nguyên tử: cần "tất cả hoặc không" thì dùng transaction (D21).
- **Vì sao:**
  - quá 25 yêu cầu thì cả lô bị từ chối;
  - khi bị throttle, AWS trả phần chưa ghi trong `UnprocessedItems` thay vì báo lỗi, nên bỏ qua trường này là mất dữ liệu âm thầm.
- **Nguồn:** https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchWriteItem.html
- **Cấp:** L2 · **Nối với:** chưa có (giống P08 sửa lớn theo lô) · **Kiểm:** dynoxide. Sai: `ValidationException` với 26 yêu cầu. Đúng: 2 lô, `UnprocessedItems` rỗng, `Query` đếm đủ 26. Emulator không throttle nên không tái hiện được `UnprocessedItems` khác rỗng

```js
// D19 bad
const puts = Array.from({ length: 26 }, (_, i) => ({ PutRequest: { Item: { PK: { S: 'IMPORT#1' }, SK: { S: 'ROW#' + i } } } }));
await BatchWriteItem({ RequestItems: { Shop: puts } });
```
```js
// D19 good
const rows = Array.from({ length: 26 }, (_, i) => ({ PutRequest: { Item: { PK: { S: 'IMPORT#1' }, SK: { S: 'ROW#' + i } } } }));
for (let i = 0; i < rows.length; i += 25) {
  let req = { Shop: rows.slice(i, i + 25) };
  while (req && Object.keys(req).length) {
    const r = await BatchWriteItem({ RequestItems: req });
    req = r.UnprocessedItems; // retry with backoff in real code
  }
}
await Query({ TableName: 'Shop', KeyConditionExpression: 'PK = :pk', ExpressionAttributeValues: { ':pk': { S: 'IMPORT#1' } }, Select: 'COUNT' });
```

### D20 · PartiQL `SELECT` phải có partition key trong `WHERE` / PartiQL SELECT needs the partition key

- **Luật:**
  - câu `SELECT` của PartiQL trên DynamoDB phải có điều kiện `=` hoặc `IN` trên partition key;
  - có thể cấm full scan bằng IAM policy cho PartiQL.
- **Vì sao:** cú pháp giống SQL nhưng engine vẫn là DynamoDB. Thiếu partition key thì câu lệnh âm thầm thành `Scan` cả bảng, đúng như D06.
- **Nguồn:** https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ql-reference.select.html ("can result in a full table scan if an equality or IN condition with a partition key is not provided")
- **Cấp:** L2 · **Nối với:** skill `where` · **Kiểm:** dynoxide. Sai: 54 RCU (quét cả bảng; trả 20 item vì `customerId` có ở cả item `META`). Đúng: 0,5 RCU, 11 item

```js
// D20 bad
await ExecuteStatement({ Statement: `SELECT * FROM "Shop" WHERE "customerId" = '4711'`, ReturnConsumedCapacity: 'TOTAL' });
```
```js
// D20 good
await ExecuteStatement({ Statement: `SELECT * FROM "Shop" WHERE "PK" = 'CUSTOMER#4711'`, ReturnConsumedCapacity: 'TOTAL' });
```

### D21 · Nhiều item phải đổi cùng nhau thì dùng transaction / Use a transaction when several items must change together

- **Luật:**
  - khi nhiều item phải nhất quán (đơn và bản sao trong item collection của khách, chuyển tiền), ghi chúng trong một transaction: `TransactWriteItems` hoặc PartiQL `ExecuteTransaction`;
  - không dùng transaction cho việc chỉ một item (giá gấp đôi, D10);
  - một transaction PartiQL chỉ gồm toàn câu đọc hoặc toàn câu ghi, tối đa 100 câu.
- **Vì sao:** hai `UpdateItem` riêng lẻ có thể thành công một nửa. Transaction hủy cả nhóm khi một điều kiện sai (`TransactionCanceledException`).
- **Nguồn:**
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ql-reference.multiplestatements.transactions.html
- **Cấp:** L3 · **Nối với:** chưa có (giống `BEGIN … COMMIT` trong SQL) · **Kiểm:** dynoxide, Sai ≠ Đúng. Sai: lệnh thứ hai hỏng điều kiện, item `META` vẫn đã thành `PAID` (dở dang). Đúng: `TransactionCanceledException` với lý do `[None, ConditionalCheckFailed]`, `META` vẫn `PENDING`. Ví dụ dùng PartiQL vì dynoxide 1.5.0 trả `UnsupportedOperation` cho `TransactWriteItems`; `TransactGetItems` có

```js
// D21 bad
await UpdateItem({ TableName: 'Shop', Key: { PK: { S: 'ORDER#9000' }, SK: { S: 'META' } },
  UpdateExpression: 'SET #s = :paid', ExpressionAttributeNames: { '#s': 'status' }, ExpressionAttributeValues: { ':paid': { S: 'PAID' } } });
await UpdateItem({ TableName: 'Shop', Key: { PK: { S: 'CUSTOMER#4700' }, SK: { S: 'ORDER#2026-10-01T08:00:00Z#9000' } },
  UpdateExpression: 'SET #s = :paid', ConditionExpression: '#s = :cancelled', ExpressionAttributeNames: { '#s': 'status' },
  ExpressionAttributeValues: { ':paid': { S: 'PAID' }, ':cancelled': { S: 'CANCELLED' } } });
await GetItem({ TableName: 'Shop', Key: { PK: { S: 'ORDER#9000' }, SK: { S: 'META' } }, ProjectionExpression: '#s', ExpressionAttributeNames: { '#s': 'status' } });
```
```js
// D21 good
await ExecuteTransaction({ TransactStatements: [
  { Statement: `UPDATE "Shop" SET "status" = 'PAID' WHERE "PK" = 'ORDER#9000' AND "SK" = 'META'` },
  { Statement: `UPDATE "Shop" SET "status" = 'PAID' WHERE "PK" = 'CUSTOMER#4700' AND "SK" = 'ORDER#2026-10-01T08:00:00Z#9000' AND "status" = 'CANCELLED'` }] });
await GetItem({ TableName: 'Shop', Key: { PK: { S: 'ORDER#9000' }, SK: { S: 'META' } }, ProjectionExpression: '#s', ExpressionAttributeNames: { '#s': 'status' } });
```

## 9. Đề xuất: khu Best Practice trong app

Dựng trên những gì đã có. Không thêm framework, không backend.

### 9.1 Nội dung

- **Một file dữ liệu** `content/bestpractice.yml`, chunk lazy riêng như `lessons.yml` (ngân sách riêng trong `check-budget.mjs`).
- **Mỗi mục** lấy từ tài liệu này:
  - `id`, `area` (`sql | analyst | schema | index | ops | security | mongo | dynamo`), `level` (1–5);
  - `title {vi,en}`, `rule {vi,en}`, `why {vi,en}`;
  - `bad`, `good` (SQL hoặc Mongo), `source` (URL);
  - `skills` (id trong `skills.yml`), `adv` (node);
  - `check: diff | same | plan | error | syntax` (đúng loại "Kiểm" ở trên);
  - `lint` (tùy chọn, §9.3).
- **Test:** `tests/bestPractice.test.ts` làm đúng việc script kiểm của tài liệu này làm:
  - chạy `bad`/`good` trên `lab` (PGlite) hoặc `mingo`;
  - khẳng định `check`;
  - mọi `skills` có trong `skills.yml`;
  - mọi `source` là `https://`.

### 9.2 Thẻ (cards)

- **Trang `#/learn/bp`** (General, theo L82 không nói domain): lưới thẻ lọc theo khu và cấp.
- **Một thẻ** gồm luật, vì sao, cặp Sai / Đúng có nút "Chạy cả hai":
  - chạy trên `lab` qua `runOn()` như "Thử ngay";
  - hai bảng kết quả đặt cạnh nhau, dùng lại `diffView()`;
  - với mục `plan`, hai kế hoạch từ tab EXPLAIN có sẵn.
- **Mục `syntax`** chỉ hiện mã và nguồn.
- **Liên kết:**
  - chip "Best practice" ở trang skill `#/learn/skill/<id>`, cho các mục có `skills` chứa skill đó;
  - Recap của một ticket có thể gợi ý một mục liên quan tới skill ticket dạy;
  - chỉ từ domain sang General, đúng L82.

### 9.3 Lint nhẹ nhàng trên SQL của người chơi

- **Khi chạy:** sau Run/Submit **đã chạy xong** (không chặn, không trừ điểm, không đổi chấm điểm).
- **Cách làm:** một hàm thuần `bpTips(ast)` đọc cây cú pháp từ `libpg-query`. Parser đã nạp lazy trong worker cho tab "Thứ tự thực thi" (`ensureParser`). Lint chỉ chạy khi parser đã có sẵn, không bao giờ tải wasm chỉ để lint.
- **Hiển thị:** tối đa **một** gợi ý mỗi lần, trong dòng của Boon (Boon là người dạy, L87), có link "Vì sao?" mở thẻ.
- **Tắt:** pref thiết bị `cargo-query/bp-tips` = `{ off, seen }`, cùng kiểu với `cargo-query/guides`. Một gợi ý đã đóng không hiện lại cho cùng ticket.
- **Không lint:**
  - promotion review;
  - index lab;
  - lần chạy lỗi (đã có ghi chú SQLSTATE).
- **Luật lint khả thi đầu tiên:** đều phát hiện được từ AST, ít báo nhầm.

| Mục | Dấu hiệu trong AST |
|---|---|
| Q01 | `A_Expr` `=`/`<>` với hằng `NULL` |
| Q02 | `NOT` + `SubLink` loại `ANY` (NOT IN subquery) |
| Q06 | LEFT JOIN, và `WHERE` có điều kiện trên bảng bên phải không phải `IS NULL` |
| Q10 | `LIMIT` không `ORDER BY` |
| Q11 | hàm (`date_trunc`, `extract`, `lower`…) bọc cột ở vế trái so sánh trong `WHERE` |
| Q12 | `BETWEEN` trên cột kiểu timestamp (cần kiểu cột: lấy từ `erMeta`) |
| Q13 | phép `/` giữa hai `count(…)` không ép kiểu |
| Q15 | `HAVING` không chứa aggregate |
| A15 | `last_value`/`nth_value` có `ORDER BY` trong `OVER` mà không ghi khung (thay Q22, vòng 2) |
| A05 | `CURRENT_DATE` / `now()` |

Đặc tả chi tiết (AST đã kiểm, lời nhắc VI/EN, báo nhầm, cặp test): §10.

### 9.4 Quiz

- **Định dạng** dùng lại `reflect` (`{ q, options, answer, why }`, đã có `optionOrder` để xáo).
- **Loại câu hỏi:**
  - "Truy vấn nào trả về đúng?": hai lựa chọn là Sai / Đúng của một mục `diff`;
  - "Kế hoạch nào dùng index?" cho mục `plan`;
  - "Lệnh này báo lỗi gì?" cho mục `error`.
- **Nhịp ôn:** đưa vào thẻ ôn Leitner theo skill đã có (`review`), mỗi lần ôn một câu, 0 XP như Practice. Không thêm trường Save.

### 9.5 Thứ tự làm

1. YAML + test cho khu Q, A (không cần runtime mới).
2. Trang thẻ + "Chạy cả hai".
3. Lint 10 luật ở §9.3.
4. Quiz.
5. Khu S, I, P, X đi cùng khu Postgres của Database Engine.
6. M khi `mingo` vào repo.
7. D khi `@dynoxide/wasm-engine` vào repo: vòng 2 đã chạy được D01–D21 trừ D09, D11 trên bản 1.5.0.

## 10. Đặc tả lint: 10 luật đầu tiên (vòng 2)

Chi tiết hóa §9.3. Vẫn chỉ là tài liệu: không có mã trong `src/`.

### 10.1 Cách chọn

Mười luật được chọn theo ba điều kiện, theo thứ tự:

1. **sai âm thầm hoặc chậm hẳn**: kết quả sai mà không có lỗi, hoặc mất index;
2. **nhận ra được từ AST của một câu `SELECT`**, không cần chạy, không cần dữ liệu; chỉ Q12 cần thêm kiểu cột (đã có trong `erMeta`);
3. **ít báo nhầm** trên SQL người chơi viết trong game.

Vì vậy nhiều mục trong "Mười mục giá trị nhất" không có ở đây: Q07, A01, A03, S10, M01, D02 là lỗi thiết kế hoặc ý nghĩa, AST một câu không đủ để thấy. Q22 (style) bị thay bằng A15 (`last_value` không khung): sai âm thầm, nhận ra chắc chắn.

### 10.2 Hình dạng AST đã kiểm

Mọi hình dạng dưới đây là JSON thật do `libpg-query` 18.2.4 (bản repo đang ghim) trả về trong Node, không viết theo trí nhớ. Hai điều quan trọng cho người viết matcher:

- **giá trị enum mặc định vẫn có mặt**: `"kind": "AEXPR_OP"`, `"jointype": "JOIN_INNER"`, `"boolop": "NOT_EXPR"`, `"limitOption": "LIMIT_OPTION_DEFAULT"` đều xuất hiện, nên so bằng `===` được;
- mỗi node là một object một khóa (`{ "A_Expr": {...} }`); tên hàm nằm ở `funcname.at(-1).String.sval` (có thể có schema đứng trước); tên cột ở `ColumnRef.fields[].String.sval`;
- khung window nằm ở `over.frameOptions` (bitmask). Khung mặc định là `1058`; bit `1` (`FRAMEOPTION_NONDEFAULT`) bật khi người viết ghi khung. Ví dụ `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING` là `309`.

Một prototype 10 luật (~60 dòng, file tạm ngoài repo) đã chạy trên các cặp test dưới đây: mọi câu **Sai** kích hoạt, mọi câu **Đúng** không. Cột "Báo nhầm đã thử" là kết quả thật của câu thử thứ ba.

### 10.3 Bảng luật

Giọng: Boon nói, ngôi thứ nhất, một câu, không trách (L87). EN không dấu.

| Mục | Mẫu AST (đã kiểm) | Lời Boon VI / EN |
|---|---|---|
| Q01 | `A_Expr` có `kind = AEXPR_OP`, `name[0].String.sval` ∈ {`=`, `<>`, `!=`}, và `lexpr` hoặc `rexpr` là `A_Const` với `isnull: true` | VI: "Mình thấy so sánh `= NULL`: so với NULL luôn ra 'không biết', nên điều kiện này không bao giờ đúng. Thử `IS NULL` nhé." · EN: "I see a comparison with `= NULL`: it is never true, so no row passes. Try `IS NULL`." |
| Q02 | `BoolExpr` `boolop = NOT_EXPR`, `args[0]` là `SubLink` với `subLinkType = ANY_SUBLINK` (có `subselect`) | VI: "`NOT IN` với một truy vấn con sẽ ra rỗng nếu truy vấn con có một NULL. Mình hay dùng `NOT EXISTS` cho chắc." · EN: "`NOT IN` over a subquery returns nothing if the subquery yields a NULL. `NOT EXISTS` is the safe choice." |
| Q06 | `SelectStmt` có `JoinExpr` `jointype = JOIN_LEFT` với `rarg.RangeVar` (tên = `alias.aliasname` ?? `relname`), và `whereClause` có `ColumnRef` mà `fields[0]` là tên đó, không nằm trong `NullTest` hay `SubLink` | VI: "Điều kiện trên bảng bên phải của LEFT JOIN đặt ở `WHERE` sẽ bỏ các dòng không khớp, thành INNER JOIN. Bạn muốn đặt nó trong `ON` không?" · EN: "A filter on the right table of a LEFT JOIN in `WHERE` drops unmatched rows, so it acts like an INNER JOIN. Move it into `ON`?" |
| Q10 | `SelectStmt` có `limitCount` và không có `sortClause`; bỏ qua khi cha trực tiếp là `SubLink` (`EXISTS (… LIMIT 1)`) | VI: "Có `LIMIT` mà không có `ORDER BY`: mỗi lần chạy có thể ra những dòng khác nhau." · EN: "`LIMIT` without `ORDER BY` can return different rows on each run." |
| Q11 | trong `whereClause`, `A_Expr` (`AEXPR_OP`, `AEXPR_BETWEEN`, `AEXPR_IN`) có `lexpr` là `FuncCall` (không phải aggregate) nhận `ColumnRef` làm đối số, hoặc `TypeCast` có `arg` là `ColumnRef` | VI: "Mình thấy cột bị bọc trong hàm ở `WHERE`, nên index trên cột đó không dùng được. Viết thành khoảng trên chính cột thử xem." · EN: "The column is wrapped in a function in `WHERE`, so an index on it cannot be used. Try a range on the bare column." |
| Q12 | `A_Expr` `kind = AEXPR_BETWEEN`, `lexpr` là `ColumnRef` có kiểu `timestamp…` theo `erMeta` | VI: "`BETWEEN` trên cột thời điểm bỏ sót mọi thứ sau 00:00 của ngày cuối. Khoảng nửa mở `>= … AND < …` an toàn hơn." · EN: "`BETWEEN` on a timestamp misses everything after midnight of the last day. Use a half-open range `>= ... AND < ...`." |
| Q13 | `A_Expr` `AEXPR_OP` `name = '/'`, `lexpr` và `rexpr` đều là `FuncCall` `count` (không bọc `TypeCast`) | VI: "Chia hai `count` cho nhau là chia số nguyên, phần lẻ bị bỏ. Ép một vế sang `numeric` nhé." · EN: "Dividing two `count`s is integer division and drops the fraction. Cast one side to `numeric`." |
| Q15 | `SelectStmt` có `havingClause` không chứa `FuncCall` nào có tên aggregate | VI: "Điều kiện này không dùng hàm gộp, nên đặt ở `WHERE` sẽ lọc sớm hơn và dễ đọc hơn." · EN: "This condition has no aggregate, so it belongs in `WHERE`, where it filters earlier." |
| A05 | `SQLValueFunction` với `op` ∈ {`SVFOP_CURRENT_DATE`, `SVFOP_CURRENT_TIMESTAMP(_N)`, `SVFOP_LOCALTIMESTAMP(_N)`}, hoặc `FuncCall` tên ∈ {`now`, `clock_timestamp`, `statement_timestamp`, `transaction_timestamp`} | VI: "Ở công ty, 'hôm nay' là 31/10/2026. Mình ghi thẳng ngày đó để báo cáo chạy lại vẫn ra cùng số." · EN: "Here 'today' is 2026-10-31. Write that date so the report gives the same numbers when run again." |
| A15 | `FuncCall` tên `last_value` hoặc `nth_value`, có `over.orderClause` và `(over.frameOptions & 1) === 0` | VI: "Khung mặc định dừng ở dòng hiện tại, nên `last_value` trả chính dòng này. Thêm `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`." · EN: "The default frame stops at the current row, so `last_value` returns this row. Add `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`." |

### 10.4 Báo nhầm và cách tránh

| Mục | Báo nhầm đã thử (kết quả) | Ghi chú |
|---|---|---|
| Q01 | `UPDATE … SET email = NULL` (không báo) | phép gán là `ResTarget`, không phải `A_Expr` |
| Q02 | `status NOT IN ('PAID', 'CANCELLED')` (không báo) | danh sách hằng là `A_Expr` `AEXPR_IN`, không phải `SubLink` |
| Q06 | `LEFT JOIN … WHERE o.id IS NULL` (không báo) | anti join (A11) hợp lệ: cột nằm trong `NullTest`. Chưa xử lý: `COALESCE(o.x, 0) > 0` hay `IS DISTINCT FROM` vẫn bị báo; join lồng nhiều tầng chỉ lấy `rarg` là `RangeVar` |
| Q10 | `EXISTS (SELECT 1 … LIMIT 1)` (không báo) | `LIMIT` trong subquery ở `FROM` vẫn bị báo, đúng ý |
| Q11 | `lower(email) = '…'` (**báo**) | đúng là không sargable, trừ khi có expression index (I05). Lint không biết index nào tồn tại, nên lời nhắc chỉ nói "index trên cột" |
| Q12 | `order_date BETWEEN …` trên cột `date` (không báo) | cần kiểu cột; không tra được `erMeta` (bảng import, CTE) thì không báo |
| Q13 | `count(*) / count(DISTINCT customer_id)` (**báo**) | không phải báo nhầm: vẫn là chia nguyên. `sum(int)/count` chưa bắt (cần kiểu) |
| Q15 | `HAVING bool_and(…)` (không báo) | danh sách aggregate phải đủ, kể cả aggregate do người dùng tạo; không chắc thì không báo |
| A05 | `INSERT … VALUES (now())` (**báo**) | game chỉ có `SELECT`; nếu lint chạy cả Sandbox với lệnh ghi thì chỉ xét `SelectStmt` |
| A15 | `last_value(…) OVER (ORDER BY order_date, id)` cố ý lấy chính dòng (**báo**) | hiếm và vô nghĩa; giữ báo |

### 10.5 Cặp test

Mỗi luật có một câu **Sai** (phải báo) và một câu **Đúng** (không được báo), chạy trên `lab`. Chúng là đề xuất cho `tests/bpLint.test.ts` (§9.1).

| Mục | Sai | Đúng |
|---|---|---|
| Q01 | `SELECT count(*) FROM customers WHERE email = NULL` | `SELECT count(*) FROM customers WHERE email IS NULL` |
| Q02 | `SELECT count(*) FROM customers c WHERE c.id NOT IN (SELECT o.customer_id FROM orders o)` | `SELECT count(*) FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id)` |
| Q06 | `SELECT c.id, count(o.id) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.channel = 'ONLINE' GROUP BY c.id` | `SELECT c.id, count(o.id) FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.channel = 'ONLINE' GROUP BY c.id` |
| Q10 | `SELECT id, order_date FROM orders LIMIT 5` | `SELECT id, order_date FROM orders ORDER BY order_date DESC, id DESC LIMIT 5` |
| Q11 | `SELECT count(*) FROM orders WHERE date_trunc('month', order_date) = DATE '2026-10-01'` | `SELECT count(*) FROM orders WHERE order_date >= DATE '2026-10-01' AND order_date < DATE '2026-11-01'` |
| Q12 | `SELECT count(*) FROM payments WHERE paid_at BETWEEN '2026-10-01' AND '2026-10-31'` | `SELECT count(*) FROM payments WHERE paid_at >= TIMESTAMP '2026-10-01' AND paid_at < TIMESTAMP '2026-11-01'` |
| Q13 | `SELECT count(*) FILTER (WHERE channel = 'ONLINE') / count(*) AS online_share FROM orders` | `SELECT count(*) FILTER (WHERE channel = 'ONLINE')::numeric / count(*) AS online_share FROM orders` |
| Q15 | `SELECT store_id, count(*) FROM orders GROUP BY store_id HAVING store_id <> 4` | `SELECT store_id, count(*) FROM orders WHERE store_id <> 4 GROUP BY store_id` |
| A05 | `SELECT count(*) FROM orders WHERE order_date >= CURRENT_DATE - 30` | `SELECT count(*) FROM orders WHERE order_date >= DATE '2026-10-31' - 30` |
| A15 | `SELECT DISTINCT store_id, last_value(order_date) OVER (PARTITION BY store_id ORDER BY order_date) FROM orders` | `SELECT DISTINCT store_id, last_value(order_date) OVER (PARTITION BY store_id ORDER BY order_date ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) FROM orders` |

### 10.6 Ghi chú triển khai

- Đi cây bằng một hàm duyệt chung (mọi khóa viết hoa đầu là một node); mỗi luật là một hàm thuần `(stmt, colTypes) => boolean`. Không cần deparser.
- Chỉ lint câu đã chạy **thành công** (§9.3), nên AST luôn parse được.
- Thứ tự ưu tiên khi nhiều luật cùng báo (chỉ hiện một): Q02, Q06, Q01, A15, Q12, Q13, Q10, Q11, A05, Q15. Sai âm thầm trước, hiệu năng sau, style cuối.
- Mỗi lời nhắc có link "Vì sao?" tới thẻ của mục cùng mã.
