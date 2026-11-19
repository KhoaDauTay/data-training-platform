# Danh mục Best Practice: SQL, PostgreSQL, MongoDB, DynamoDB

Người viết: agent Research · 2026-11-20 · theo L215 mục 6 ("luôn có Agent research đi collect kiến thức, tiêu chí, best practice về SQL, và NoSQL chuẩn bị đưa nó vào mục mới Best Practice"). **Chỉ là tài liệu nghiên cứu**: không sửa `src/`, `content/`, test hay `decision-log.md`.

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
  - **mingo**: khối Mongo đã chạy trên `mingo` 7.2.7 (cài tạm ngoài repo) với dữ liệu mẫu ở §7.0.
  - **cú pháp**: chỉ minh họa. Đó là index, shard key, transaction Mongo, cấu hình vận hành, mọi ví dụ DynamoDB. Không chạy được trong trình duyệt, hoặc runtime không mô phỏng ý đó (mingo không có index, xem `db-engine-knowledge.md` §1.5).
- **Mỗi khối mã** bắt đầu bằng một dòng chú thích `-- <mã> bad` / `-- <mã> good` (Mongo: `// <mã> …`). Script kiểm đọc chính file này, nên ví dụ trong tài liệu là đúng thứ đã chạy.
- **Trích dẫn:** ý được diễn đạt lại; chỉ trích nguyên văn vài chữ khi cần.
  - [SQL Style Guide](https://www.sqlstyle.guide/) của Simon Holywell theo giấy phép CC BY-SA 4.0: chỉ dẫn link, không chép.
  - Trang wiki "Don't Do This" của PostgreSQL: chỉ tóm ý.
- **Thuật ngữ** giữ tiếng Anh (index, partition key, fan-out…). Văn xuôi tiếng Việt.

## Tóm tắt

| Khu | Mã | Số mục | Kiểm PGlite / mingo |
|---|---|---|---|
| 1. Viết truy vấn SQL | Q | 22 | 22 |
| 2. SQL cho data analyst | A | 11 | 11 |
| 3. Thiết kế schema PostgreSQL | S | 12 | 12 |
| 4. Index | I | 9 | 9 |
| 5. Hiệu năng và vận hành | P | 9 | 8 |
| 6. Bảo mật | X | 5 | 3 (+ X04 qua S10) |
| 7. MongoDB | M | 14 | 4 |
| 8. DynamoDB | D | 13 | 0 (cú pháp) |
| **Tổng** | | **95** | **69** |

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

## 8. DynamoDB (D)

Ví dụ DynamoDB là minh họa (**cú pháp**). Chúng ghi item theo dạng JSON của API (`PK`, `SK` là tên thuộc tính khóa tự đặt), hoặc theo tham số `Query`. Runtime `@dynoxide/wasm-engine` chưa có trong repo (`db-engine-knowledge.md` §1.5). Khi khu DynamoDB có runtime, các mục D06, D10, D12 là ứng viên chạy thật đầu tiên.

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
- **Cấp:** L1 · **Nối với:** chưa có (node `d7`: lấy yêu cầu) · **Kiểm:** cú pháp

```js
// D01 bad (syntax)
// "Cứ tạo bảng Orders với khóa orderId, cần gì thì Scan + FilterExpression sau."
```
```js
// D01 good (syntax)
// AP1 lấy đơn theo id                 -> GetItem  PK = ORDER#<id>
// AP2 đơn của một khách, mới nhất trước -> Query    PK = CUSTOMER#<id>, SK begins_with ORDER#, ScanIndexForward = false
// AP3 đơn chưa giao của một kho        -> Query GSI1 PK = WAREHOUSE#<id>#PENDING
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
- **Cấp:** L2 · **Nối với:** chưa có · **Kiểm:** cú pháp

```js
// D02 bad (syntax)
{ PK: 'STATUS#PENDING', SK: 'ORDER#2026-10-31T08:00:00Z#9001' }
```
```js
// D02 good (syntax)
{ PK: 'CUSTOMER#4711', SK: 'ORDER#2026-10-31T08:00:00Z#9001', status: 'PENDING' }
```

### D03 · Rải khóa nóng bằng hậu tố (write sharding) / Write sharding for hot keys

- **Luật:**
  - khi một khóa logic buộc phải nhận rất nhiều lần ghi (bộ đếm toàn cục, sự kiện theo ngày), thêm hậu tố `#0…#N-1` (ngẫu nhiên, hoặc tính từ một thuộc tính để còn đọc lại một item);
  - đọc thì hỏi song song N khóa rồi gộp.
- **Vì sao:** chia một khóa nóng thành N khóa trên N partition, nhân giới hạn ghi lên N lần.
- **Nguồn:** https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-sharding.html
- **Cấp:** L3 · **Nối với:** chưa có · **Kiểm:** cú pháp

```js
// D03 bad (syntax)
{ PK: 'EVENTS#2026-10-31', SK: 'ts#…' }
```
```js
// D03 good (syntax)
{ PK: 'EVENTS#2026-10-31#' + (hash(orderId) % 10), SK: 'ts#…' }
```

### D04 · Sort key phân cấp để `begins_with` / Hierarchical sort keys

- **Luật:** sort key ghép theo cấp từ rộng tới hẹp (`COUNTRY#VN#CITY#DANANG#STORE#3`), hoặc tiền tố loại + thời gian ISO-8601 (`ORDER#2026-10-31T…`), để một `Query` với `begins_with`/`between` lấy đúng nhóm, đúng khoảng.
- **Vì sao:**
  - sort key được sắp xếp;
  - đặt đúng thứ tự cấp thì mỗi mức "drill-down" là một `Query`, không cần index thêm;
  - tiền tố phiên bản (`v0_`) giữ bản hiện hành dễ lấy.
- **Nguồn:** https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-sort-keys.html
- **Cấp:** L2 · **Nối với:** skill `order_by` (tư duy sắp xếp) · **Kiểm:** cú pháp

```js
// D04 bad (syntax)
{ PK: 'STORE#3', SK: '31/10/2026' }
```
```js
// D04 good (syntax)
{ TableName: 'Shop', KeyConditionExpression: 'PK = :pk AND begins_with(SK, :m)',
  ExpressionAttributeValues: { ':pk': { S: 'STORE#3' }, ':m': { S: 'ORDER#2026-10' } } }
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
- **Cấp:** L3 · **Nối với:** skill `join` (đối chiếu) · **Kiểm:** cú pháp

```js
// D05 bad (syntax)
// GetItem Customers(4711), rồi Scan Orders với FilterExpression customerId = 4711
```
```js
// D05 good (syntax)
[{ PK: 'CUSTOMER#4711', SK: 'PROFILE', name: 'An' },
 { PK: 'CUSTOMER#4711', SK: 'ORDER#2026-10-30#9000', total: 120 },
 { PK: 'CUSTOMER#4711', SK: 'ORDER#2026-10-31#9001', total: 75 }]
// Query PK = CUSTOMER#4711 -> hồ sơ + đơn trong một lần gọi
```

### D06 · `Query`, đừng `Scan` / Query, don't Scan

- **Luật:**
  - truy vấn trong luồng ứng dụng dùng `GetItem`/`Query` trên bảng hoặc index;
  - `Scan` chỉ cho việc nền (xuất, sửa dữ liệu), có giới hạn tốc độ;
  - `FilterExpression` không giảm chi phí: lọc **sau** khi đã đọc.
- **Vì sao:** `Scan` đọc và tính phí mọi item, ăn hết capacity của bảng, làm throttle các request khác.
- **Nguồn:** https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-query-scan.html
- **Cấp:** L1 · **Nối với:** skill `where`, `sargable` (cùng ý "dùng khóa để thu hẹp") · **Kiểm:** cú pháp

```js
// D06 bad (syntax)
{ TableName: 'Shop', FilterExpression: 'customerId = :c', ExpressionAttributeValues: { ':c': { S: '4711' } } } // Scan
```
```js
// D06 good (syntax)
{ TableName: 'Shop', KeyConditionExpression: 'PK = :pk', ExpressionAttributeValues: { ':pk': { S: 'CUSTOMER#4711' } } } // Query
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
- **Cấp:** L3 · **Nối với:** skill `index_design` (giống partial index I03) · **Kiểm:** cú pháp

```js
// D07 bad (syntax)
{ IndexName: 'ByStatus', KeySchema: [{ AttributeName: 'status', KeyType: 'HASH' }], Projection: { ProjectionType: 'ALL' } }
```
```js
// D07 good (syntax)
// chỉ đơn đang chờ có thuộc tính pendingAt -> GSI thưa
{ IndexName: 'PendingByWarehouse',
  KeySchema: [{ AttributeName: 'warehouseId', KeyType: 'HASH' }, { AttributeName: 'pendingAt', KeyType: 'RANGE' }],
  Projection: { ProjectionType: 'INCLUDE', NonKeyAttributes: ['customerId', 'total'] } }
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
- **Cấp:** L2 · **Nối với:** chưa có (giống M03) · **Kiểm:** cú pháp

```js
// D08 bad (syntax)
{ PK: 'PRODUCT#A', SK: 'DETAIL', manualPdfBase64: '…350 KB…', views: 10234 }
```
```js
// D08 good (syntax)
[{ PK: 'PRODUCT#A', SK: 'DETAIL', manualS3Key: 's3://bucket/manuals/A.pdf' },
 { PK: 'PRODUCT#A', SK: 'COUNTERS', views: 10234 }]
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
- **Cấp:** L3 · **Nối với:** chưa có (giống S11 drop partition) · **Kiểm:** cú pháp

```js
// D09 bad (syntax)
// job đêm: Scan + DeleteItem các phiên đăng nhập quá 30 ngày
```
```js
// D09 good (syntax)
{ PK: 'SESSION#ab12', SK: 'META', expiresAt: 1764547200 } // TTL attribute = expiresAt (epoch seconds)
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
- **Cấp:** L3 · **Nối với:** chưa có · **Kiểm:** cú pháp

```js
// D10 bad (syntax)
{ TableName: 'Shop', Item: { PK: { S: 'ORDER#9001' }, SK: { S: 'META' }, status: { S: 'PAID' } } } // PutItem ghi đè
```
```js
// D10 good (syntax)
{ TableName: 'Shop', Key: { PK: { S: 'ORDER#9001' }, SK: { S: 'META' } },
  UpdateExpression: 'SET #s = :paid, version = version + :one',
  ConditionExpression: 'version = :v AND #s = :pending',
  ExpressionAttributeNames: { '#s': 'status' },
  ExpressionAttributeValues: { ':paid': { S: 'PAID' }, ':pending': { S: 'PENDING' }, ':v': { N: '3' }, ':one': { N: '1' } } }
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
- **Cấp:** L2 · **Nối với:** skill `limit` (giống keyset Q21) · **Kiểm:** cú pháp

```js
// D12 bad (syntax)
const page = await ddb.query(params); return page.Items;
```
```js
// D12 good (syntax)
let items = [], key; do { const p = await ddb.query({ ...params, ExclusiveStartKey: key }); items.push(...p.Items); key = p.LastEvaluatedKey; } while (key);
```

### D13 · Đọc strongly consistent chỉ khi cần / Strong reads only when needed

- **Luật:**
  - mặc định đọc eventually consistent (nửa giá RCU);
  - chỉ bật `ConsistentRead: true` khi ngay sau khi ghi phải thấy giá trị mới;
  - GSI không hỗ trợ đọc strongly consistent.
- **Vì sao:** strong read tốn gấp đôi và chỉ có trên bảng/LSI. Thiết kế dựa vào strong read trên GSI là không làm được.
- **Nguồn:** https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html
- **Cấp:** L2 · **Nối với:** chưa có · **Kiểm:** cú pháp

```js
// D13 bad (syntax)
{ TableName: 'Shop', IndexName: 'PendingByWarehouse', ConsistentRead: true, KeyConditionExpression: 'warehouseId = :w' } // GSI từ chối
```
```js
// D13 good (syntax)
{ TableName: 'Shop', Key: { PK: { S: 'ORDER#9001' }, SK: { S: 'META' } }, ConsistentRead: true } // GetItem ngay sau khi trả tiền
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
| Q22 | `GROUP BY`/`ORDER BY` bằng số thứ tự |
| A05 | `CURRENT_DATE` / `now()` |

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
7. D khi có runtime DynamoDB.

