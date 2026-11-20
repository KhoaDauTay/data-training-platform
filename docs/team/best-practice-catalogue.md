# Danh mục Best Practice: SQL, PostgreSQL, MongoDB, DynamoDB

Người viết: agent Research · 2026-11-20 · theo L215 mục 6 ("luôn có Agent research đi collect kiến thức, tiêu chí, best practice về SQL, và NoSQL chuẩn bị đưa nó vào mục mới Best Practice"). **Chỉ là tài liệu nghiên cứu**: không sửa `src/`, `content/`, test hay `decision-log.md`.

**Vòng 2** (agent Research, 2026-11-20): thêm 43 mục (A12–A21, P10–P26, M15–M22, D14–D21), chạy thật mọi ví dụ DynamoDB trên `@dynoxide/wasm-engine` 1.5.0 (§8), thêm đặc tả lint 10 luật với AST đã kiểm (§10). Mã cũ giữ nguyên; D01–D13 được thay ví dụ bằng request chạy được, luật và nguồn không đổi.

**Vòng 3** (agent Research, 2026-11-20): thêm 22 mục (Q23, A22–A24, S13–S14, X06–X10, M23–M27, D22–D27) về đặt tên, kiểm chất lượng dữ liệu, bảo mật (quyền tối thiểu, bẫy RLS, SQL động) và vận hành MongoDB/DynamoDB; chuyển 40 mục thành thẻ nội dung chạy được ở `content/engine/best/` (§11); lập bản đồ mọi mục tới bài Engine (§12). Mã cũ giữ nguyên.

**Vòng 4** (agent Research, 2026-11-20): theo L220, không thêm thẻ. Thêm §13:

- đề xuất cho BP-T về `probe`, `compare: rcu`, dữ liệu DynamoDB và chia chunk (đã đo);
- 32 mục mới nối bài Engine bên trong engine với vận hành: P27–P41, S15, M28–M38, D28–D32, 13 mục chạy được;
- bảng nối thêm 48 bài Engine;
- đề xuất phòng trưng bày lỗi.

Mục mới nằm ở §13.2, không chen vào §1–8. Mã cũ giữ nguyên.

**Vòng 5** (agent Research, 2026-11-20): theo L220, không thêm mục hay thẻ. Thêm §14:

- soát chất lượng cả 192 mục: tải lại mọi nguồn, sửa 4 URL chuyển hướng, rút 4 câu trích quá 15 chữ, thêm trang nguồn cho 11 mục, chạy lại cả 145 mục chạy được (dữ liệu DynamoDB dạng JSON thường), không bỏ mục nào;
- ghi phiên bản: PostgreSQL 19 phát hành 2026-11-19, 14 mục có dòng **Phiên bản (vòng 5)**;
- xếp hạng cả 192 mục, đề xuất 60 mục cho v25 (SQL + PostgreSQL), phần còn lại theo v27 và v29;
- bản nháp hướng dẫn cho người học "8 thói quen".

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
    - vòng 5 (cùng ngày) tải lại mọi trang (199 sau khi sửa), kiểm anchor, câu trích, con số có đơn vị và tên hàm/tham số nêu trong Luật/Vì sao trên đúng trang dẫn (§14.1);
    - link PostgreSQL ghim `/docs/18/` cho khớp PGlite 0.5.16. Trang MongoDB (nay là manual 9.0) và AWS (`latest`) không gắn phiên bản: số liệu đúng tại ngày kiểm;
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
| 1. Viết truy vấn SQL | Q | 23 | 23 |
| 2. SQL cho data analyst | A | 24 | 24 |
| 3. Thiết kế schema PostgreSQL | S | 15 | 14 |
| 4. Index | I | 9 | 9 |
| 5. Hiệu năng và vận hành | P | 41 | 33 |
| 6. Bảo mật | X | 10 | 8 (+ X04 qua S10) |
| 7. MongoDB | M | 38 | 14 |
| 8. DynamoDB | D | 32 | 20 (dynoxide) |
| **Tổng** | | **192** | **145** |

Số đã gồm vòng 4. Mục vòng 4 nằm ở §13.2, chưa chen vào từng khu. Vòng 5 chạy lại cả 145 mục, đều khớp dòng Kiểm (§14.1).

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
- **Phiên bản (vòng 5):** PostgreSQL 19 tự đổi `NOT IN` thành anti join khi chứng minh được không có NULL. Đó chỉ là tối ưu tốc độ: khi cột có NULL, kết quả vẫn rỗng như trên, luật giữ nguyên.
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
- **Phiên bản (vòng 5):** PostgreSQL 19 có thể gộp một phần trước khi join (tối ưu của planner). Kết quả không đổi: join hai bảng con vẫn nhân dòng, luật giữ nguyên.
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
- **Nguồn:** https://www.postgresql.org/docs/18/tutorial-window.html (muốn lọc hay gom dòng sau khi tính window thì "you can use a sub-select")
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

### Q23 · Đặt tên cho mọi cột tính toán / Name every computed column

*(vòng 3)*

- **Luật:** mọi cột không phải tham chiếu cột trơn (hàm gộp, biểu thức, `CASE`) có alias bằng `AS`, tên nói đúng nghĩa và đơn vị (`revenue_vnd`, `order_lines`).
- **Vì sao:**
  - không có `AS`, Postgres tự đặt tên: tên hàm (`count`, `sum`) hoặc một tên chung cho biểu thức phức tạp;
  - hai cột `count` trong một kết quả, hay một cột `sum` không nói tổng của gì, làm người đọc báo cáo và công cụ BI đoán sai;
  - tên cột kết quả là giao diện của truy vấn: đổi nó là đổi hợp đồng với dashboard.
- **Nguồn:**
  - https://www.postgresql.org/docs/18/queries-select-lists.html#QUERIES-COLUMN-LABELS (không có `AS` thì "the system assigns a default column name"; với lời gọi hàm, đó là tên hàm)
  - https://www.sqlstyle.guide/#naming-conventions (CC BY-SA 4.0, chỉ link)
- **Cấp:** L1 · **Nối với:** skill `select`, `aggregate` · **Kiểm:** PGlite, Sai = Đúng về giá trị; tên cột Sai là `count`, `sum`, Đúng là `order_lines`, `revenue_vnd`

```sql
-- Q23 bad
SELECT o.store_id, count(*), sum(i.qty * i.unit_price_vnd)
FROM orders o JOIN order_items i ON i.order_id = o.id
GROUP BY o.store_id ORDER BY o.store_id;
```
```sql
-- Q23 good
SELECT o.store_id, count(*) AS order_lines, sum(i.qty * i.unit_price_vnd) AS revenue_vnd
FROM orders o JOIN order_items i ON i.order_id = o.id
GROUP BY o.store_id ORDER BY o.store_id;
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
- **Nguồn:** https://www.postgresql.org/docs/18/sql-select.html#SQL-FROM (`REPEATABLE`: "the same seed and argument values will select the same sample", khi bảng không đổi); `setseed()`: https://www.postgresql.org/docs/18/functions-math.html#FUNCTIONS-MATH-RANDOM-TABLE
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
- **Phiên bản (vòng 5):** PostgreSQL 19 thêm `IGNORE NULLS` cho `first_value`, `last_value`, `nth_value`, `lag`, `lead`. Khung tới cuối partition vẫn bắt buộc với `last_value`.
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
- **Phiên bản (vòng 5):** PostgreSQL 19 thêm `lag(...) IGNORE NULLS`; `PARTITION BY` theo thực thể vẫn bắt buộc.
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

### A22 · Lập hồ sơ cột trước khi phân tích / Profile the columns before you analyse

*(vòng 3)*

- **Luật:** trước khi viết báo cáo trên một bảng lạ, chạy một câu hồ sơ: số dòng, số NULL mỗi cột quan trọng, số giá trị khác nhau, min/max của ngày và số. Ghi kết quả cạnh báo cáo.
- **Vì sao:**
  - NULL bất ngờ (Q03, Q04), ngày tương lai, giá trị âm hay một cột chỉ có 5 giá trị đều lộ ra ở đây, trước khi chúng làm sai con số;
  - `pg_stats` (sau `ANALYZE`) cho `null_frac`, `n_distinct`, `most_common_vals` mà không phải quét bảng, nhưng là **ước lượng** từ mẫu; số để báo cáo thì đếm thật.
- **Nguồn:**
  - https://www.postgresql.org/docs/18/view-pg-stats.html
  - https://www.postgresql.org/docs/18/functions-aggregate.html
- **Cấp:** L1 · **Nối với:** skill `aggregate`, `null_logic`; node `c1` · **Kiểm:** PGlite, chạy được: `customers` có 300 dòng, 13 email NULL, 5 thành phố, `signup_date` từ 2025-01-06 tới 2026-10-14

```sql
-- A22 bad
SELECT count(*) AS customers FROM customers;
```
```sql
-- A22 good
SELECT count(*) AS rows,
       count(*) - count(email) AS null_email,
       count(*) - count(city) AS null_city,
       count(DISTINCT city) AS cities,
       min(signup_date) AS first_signup,
       max(signup_date) AS last_signup
FROM customers;
```

### A23 · Kiểm độ tươi của dữ liệu trước khi gửi số / Check freshness before you send numbers

*(vòng 3)*

- **Luật:** mỗi báo cáo định kỳ kiểm `max(thời điểm sự kiện)` của từng bảng nguồn so với ngày chốt (A05). Trễ hơn ngưỡng đã thỏa thuận (ví dụ 1 ngày) thì dừng, không gửi số.
- **Vì sao:**
  - job nạp dữ liệu hỏng không làm truy vấn lỗi: báo cáo vẫn chạy, chỉ thiếu mấy ngày cuối;
  - "doanh thu giảm 30 %" có khi chỉ là "dữ liệu dừng từ thứ Tư";
  - dbt gọi đây là source freshness, có ngưỡng cảnh báo và ngưỡng lỗi.
- **Nguồn:**
  - https://docs.getdbt.com/docs/deploy/source-freshness (ngoài danh sách nguồn của thẻ; chỉ dùng trong catalogue)
  - https://www.postgresql.org/docs/18/functions-aggregate.html
- **Cấp:** L2 · **Nối với:** skill `aggregate`, `date_math`; node `c1` · **Kiểm:** PGlite, chạy được: `orders` có dữ liệu tới 2026-10-31, `days_behind` = 0

```sql
-- A23 bad
SELECT sum(qty * unit_price_vnd) AS revenue_vnd
FROM orders o JOIN order_items i ON i.order_id = o.id
WHERE o.order_date >= DATE '2026-10-01';
```
```sql
-- A23 good
SELECT max(order_date) AS latest_order,
       DATE '2026-10-31' - max(order_date) AS days_behind
FROM orders;
```

### A24 · Kiểm giá trị cho phép bằng một truy vấn phải trả 0 dòng / Accepted values are a zero-row test

*(vòng 3)*

- **Luật:**
  - cột mã (trạng thái, kênh, loại) có danh sách giá trị cho phép; viết test trả các giá trị **ngoài** danh sách, kèm số dòng;
  - nếu bạn sở hữu bảng thì đặt luật đó thành `CHECK` (S06); nếu không (bảng nguồn), test là cách duy nhất.
- **Vì sao:**
  - một giá trị mới (`'Paid'`, `'REFUND'`) làm mọi `WHERE status = 'PAID'` âm thầm bỏ dòng;
  - dbt có sẵn bốn test chung: `unique`, `not_null`, `accepted_values`, `relationships`; cả bốn viết được bằng SQL thuần như A12.
- **Nguồn:**
  - https://docs.getdbt.com/docs/build/data-tests (ngoài danh sách nguồn của thẻ)
  - https://www.postgresql.org/docs/18/ddl-constraints.html#DDL-CONSTRAINTS-CHECK-CONSTRAINTS
- **Cấp:** L2 · **Nối với:** skill `group_by`, `in_subquery`; node `c1` · **Kiểm:** PGlite, chạy được: test trả 0 dòng trên `lab` (mọi `status` thuộc `PAID`, `CANCELLED`, `REFUNDED`)

```sql
-- A24 bad
SELECT count(*) AS paid_orders FROM orders WHERE status = 'PAID';
```
```sql
-- A24 good
SELECT status, count(*) AS rows
FROM orders
WHERE status NOT IN ('PAID', 'CANCELLED', 'REFUNDED')
GROUP BY status;
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

### S13 · Hậu tố tên có nghĩa và nhất quán / Meaningful, uniform name suffixes

*(vòng 3)*

- **Luật:** chọn một bộ hậu tố và giữ cho cả schema:
  - `_id` cho khóa (khóa chính `id`, khóa ngoại `customer_id`);
  - `_at` cho thời điểm (`timestamptz`), `_on` hoặc `_date` cho ngày (`date`);
  - `_vnd`, `_usd`, `_kg` cho đơn vị; `is_`/`has_` cho boolean; `_count`, `_total` cho số tổng hợp.
  - Không viết tắt tùy hứng, không tiền tố kiểu (`tbl_`, `col_`).
- **Vì sao:**
  - người đọc biết kiểu và đơn vị chỉ nhìn tên, không phải mở schema;
  - join đúng cột dễ hơn khi khóa ngoại cùng tên với bảng nó trỏ tới;
  - SQL Style Guide có hẳn mục "Uniform suffixes" (`_id`, `_status`, `_total`, `_date`…).
- **Nguồn:**
  - https://www.sqlstyle.guide/#uniform-suffixes (CC BY-SA 4.0, chỉ link)
  - https://www.postgresql.org/docs/18/sql-syntax-lexical.html#SQL-SYNTAX-IDENTIFIERS
- **Cấp:** L1 · **Nối với:** skill `select` · **Kiểm:** cú pháp (quy ước đặt tên)

```sql
-- S13 bad (syntax)
CREATE TABLE tbl_Payment (PaymentID int, ord int, amt numeric, dt timestamptz, refunded text);
```
```sql
-- S13 good (syntax)
CREATE TABLE payments (id int PRIMARY KEY, order_id int NOT NULL, amount_vnd bigint NOT NULL,
                       paid_at timestamptz NOT NULL, is_refunded boolean NOT NULL DEFAULT false);
```

### S14 · Không đặt tên trùng từ khóa SQL / Do not name things after SQL key words

*(vòng 3)*

- **Luật:** không đặt tên bảng hay cột là từ khóa (`user`, `order`, `group`, `desc`, `limit`, `table`). Dùng tên có nghĩa hơn: `user_name`, `orders`, `sort_order`.
- **Vì sao:**
  - từ khóa dành riêng chỉ dùng được khi nháy kép, nên mọi truy vấn phải nhớ nháy;
  - tệ hơn, `user` không nháy là một **hàm**: `SELECT user FROM accounts` trả tên role đang đăng nhập ở mọi dòng, không báo lỗi;
  - bảng từ khóa ở Appendix C ghi rõ từ nào là reserved trong PostgreSQL và trong chuẩn SQL.
- **Nguồn:**
  - https://www.postgresql.org/docs/18/sql-keywords-appendix.html
  - https://www.postgresql.org/docs/18/functions-info.html (`user` "is equivalent to current_user")
- **Cấp:** L1 · **Nối với:** skill `select` · **Kiểm:** PGlite, Sai ≠ Đúng: Sai trả `postgres` hai lần, Đúng trả `an`, `binh`; `CREATE TABLE t (user text)` báo `42601`

```sql
-- S14 bad
CREATE TABLE accounts ("user" text NOT NULL);
INSERT INTO accounts VALUES ('an'), ('binh');
SELECT user FROM accounts;
```
```sql
-- S14 good
CREATE TABLE accounts_ok (user_name text NOT NULL);
INSERT INTO accounts_ok VALUES ('an'), ('binh');
SELECT user_name FROM accounts_ok;
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
- **Phiên bản (vòng 5):** PostgreSQL 19 cho phép câu quét bảng thường cũng đánh dấu trang all-visible, nên index-only scan ít phụ thuộc VACUUM hơn. Trên 18 vẫn cần VACUUM như §0 ghi.
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
- **Nguồn:** https://www.postgresql.org/docs/18/sql-altertable.html (mục Notes: thêm cột có `DEFAULT` volatile "will cause the entire table and its indexes to be rewritten")
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
- **Phiên bản (vòng 5):** PostgreSQL 19 thêm thứ tự ưu tiên có điểm cho autovacuum (`pg_stat_autovacuum_scores`) và autovacuum song song cho index (`autovacuum_max_parallel_workers`). Ngưỡng theo bảng vẫn là cách chỉnh chính.
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
- **Phiên bản (vòng 5):** PostgreSQL 19 thêm `REPACK`, thay `VACUUM FULL` và `CLUSTER` (hai lệnh cũ vẫn chạy), và `REPACK (CONCURRENTLY)` không chặn đọc ghi. Ví dụ ở đây giữ `VACUUM FULL` vì PGlite là 18.6.
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
  - https://www.postgresql.org/docs/18/functions-admin.html#FUNCTIONS-ADMIN-DBOBJECT (`pg_relation_size`)
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
- **Phiên bản (vòng 5):** PostgreSQL 19 bật sẵn `log_lock_waits`, nên chờ khóa lâu hơn `deadlock_timeout` được ghi log mà không cần cấu hình.
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
- **Cấp:** L4 · **Nối với:** chưa có · **Kiểm:** PGlite (PostgreSQL 18.6). Sai: lỗi `23502` "contains null values" sau khi quét. Đúng: ràng buộc `NOT VALID` được thêm dù 228 đơn vãng lai cũ (đếm thật) có `customer_id` NULL, còn dòng mới NULL bị chặn bằng `23502`

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
- **Nguồn:** https://www.postgresql.org/docs/18/sql-altertable.html ("will normally cause the entire table and its indexes to be rewritten", trừ khi kiểu cũ binary coercible); khoảng của `integer`: https://www.postgresql.org/docs/18/datatype-numeric.html#DATATYPE-INT
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
- **Phiên bản (vòng 5):** PostgreSQL 19: `pg_stat_statements` đếm riêng số lần dùng generic plan và custom plan, nên thấy được câu nào đang chạy generic plan.
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
- **Phiên bản (vòng 5):** PostgreSQL 19 thêm cột đếm generic/custom plan vào `pg_stat_statements`, và gộp các `FETCH` khác cỡ làm một dòng.
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
- **Phiên bản (vòng 5):** PostgreSQL 19 cảnh báo sớm hơn: khi còn dưới 100 triệu transaction tới wraparound (bản 18: 40 triệu). Vẫn phải theo dõi `age(datfrozenxid)`, không chờ cảnh báo.
- **Cấp:** L5 · **Nối với:** chưa có · **Kiểm:** PGlite, chạy được: Sai chỉ ra số byte; Đúng ra tuổi từng database (số tùy lượng transaction đã chạy trước: 79–82 ở vòng 2, 131–134 ở vòng 5) và phần trăm so với `autovacuum_freeze_max_age`

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
- **Nguồn:** https://www.postgresql.org/docs/18/sql-prepare.html; `quote_ident`/`format`: https://www.postgresql.org/docs/18/functions-string.html; OWASP SQL Injection Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
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
- **Nguồn:** https://www.postgresql.org/docs/18/ddl-rowsecurity.html ("Superusers and roles with the BYPASSRLS attribute always bypass the row security system"; chủ bảng thường cũng bỏ qua)
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
- **Phiên bản (vòng 5):** PostgreSQL 18 đánh dấu mật khẩu MD5 là lỗi thời; bản 19 cảnh báo sau mỗi lần đăng nhập MD5 thành công (tắt bằng `md5_password_warnings`) và bỏ hẳn RADIUS.
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

### X06 · Người phân tích dùng role chỉ đọc / Analysts work through a read-only role

*(vòng 3)*

- **Luật:**
  - tài khoản của người phân tích và của công cụ BI là thành viên một role chỉ đọc: `GRANT SELECT` trên schema cần thiết, hoặc role có sẵn `pg_read_all_data`;
  - đặt thêm `default_transaction_read_only = on` cho role đó (`ALTER ROLE … SET`), để một câu `UPDATE` gõ nhầm bị từ chối;
  - không bao giờ phân tích bằng tài khoản của ứng dụng.
- **Vì sao:**
  - người phân tích chạy SQL tự do mỗi ngày; một `DELETE` thiếu `WHERE` trong notebook là mất dữ liệu thật;
  - `pg_read_all_data` đọc được mọi bảng, view, sequence (như có `SELECT` + `USAGE` trên mọi schema), nhưng không ghi được gì, và docs ghi rõ nó không bỏ qua RLS.
- **Nguồn:**
  - https://www.postgresql.org/docs/18/predefined-roles.html
  - https://www.postgresql.org/docs/18/runtime-config-client.html#GUC-DEFAULT-TRANSACTION-READ-ONLY
- **Cấp:** L2 · **Nối với:** chưa có (gần X02) · **Kiểm:** PGlite, Sai xóa được dòng; Đúng: `DELETE` báo `42501`

```sql
-- X06 bad
CREATE TABLE sales (id int PRIMARY KEY, amount int);
INSERT INTO sales VALUES (1, 10);
CREATE ROLE analyst_rw NOLOGIN;
GRANT USAGE ON SCHEMA lab TO analyst_rw;
GRANT ALL ON sales TO analyst_rw;
SET ROLE analyst_rw;
DELETE FROM sales RETURNING id;
```
```sql
-- X06 good
CREATE TABLE sales (id int PRIMARY KEY, amount int);
INSERT INTO sales VALUES (1, 10);
CREATE ROLE analyst_ro NOLOGIN;
GRANT pg_read_all_data TO analyst_ro;
SET ROLE analyst_ro;
DELETE FROM sales RETURNING id;
```

### X07 · Policy RLS permissive cộng dồn bằng OR: điều kiện bắt buộc thì `AS RESTRICTIVE` / Permissive policies are OR-ed: make must-hold rules RESTRICTIVE

*(vòng 3)*

- **Luật:** mỗi policy mặc định là `PERMISSIVE`, và các policy permissive cho cùng lệnh được **OR** với nhau. Một điều kiện phải luôn đúng (cùng tenant) không được đứng cạnh một policy permissive rộng hơn; viết điều kiện thêm bằng `AS RESTRICTIVE` (được AND).
- **Vì sao:**
  - thêm một policy "ai cũng xem được tài liệu đã lưu trữ" tưởng là thu hẹp, thật ra mở dữ liệu lưu trữ của **mọi** tenant;
  - docs: các biểu thức permissive kết hợp bằng OR, restrictive bằng AND, rồi hai nhóm AND với nhau; phải có ít nhất một policy permissive thì mới thấy dòng nào.
- **Nguồn:** https://www.postgresql.org/docs/18/sql-createpolicy.html
- **Cấp:** L4 · **Nối với:** chưa có (mở rộng S10) · **Kiểm:** PGlite, Sai ≠ Đúng: tenant 1 thấy 3 dòng (2 của mình + 1 dòng lưu trữ của tenant 2) với hai policy permissive; thấy 1 dòng khi policy thứ hai là `RESTRICTIVE`

```sql
-- X07 bad
CREATE ROLE app NOLOGIN;
CREATE TABLE docs (tenant_id int, id int, archived boolean);
INSERT INTO docs VALUES (1, 1, false), (1, 2, true), (2, 3, false), (2, 4, true);
GRANT USAGE ON SCHEMA lab TO app;
GRANT SELECT ON docs TO app;
ALTER TABLE docs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_only ON docs TO app USING (tenant_id = current_setting('app.tenant_id')::int);
CREATE POLICY archived_rows ON docs TO app USING (archived);
SET app.tenant_id = '1';
SET ROLE app;
SELECT count(*) AS visible FROM docs;
```
```sql
-- X07 good
CREATE ROLE app NOLOGIN;
CREATE TABLE docs (tenant_id int, id int, archived boolean);
INSERT INTO docs VALUES (1, 1, false), (1, 2, true), (2, 3, false), (2, 4, true);
GRANT USAGE ON SCHEMA lab TO app;
GRANT SELECT ON docs TO app;
ALTER TABLE docs ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_only ON docs TO app USING (tenant_id = current_setting('app.tenant_id')::int);
CREATE POLICY archived_rows ON docs AS RESTRICTIVE TO app USING (archived);
SET app.tenant_id = '1';
SET ROLE app;
SELECT count(*) AS visible FROM docs;
```

### X08 · View đọc bảng bằng quyền owner của view: dùng `security_invoker` / Views bypass RLS unless security_invoker

*(vòng 3)*

- **Luật:** view đặt trên bảng có RLS (hoặc có quyền theo cột) thì tạo `WITH (security_invoker = true)` (từ PostgreSQL 15), để quyền và policy được kiểm theo **người gọi**.
- **Vì sao:**
  - mặc định view truy cập bảng gốc bằng quyền của **owner view**; owner thường là owner của bảng nên bỏ qua RLS (X04);
  - người phân tích được `GRANT SELECT` trên view là đọc được mọi tenant, dù bảng đã có policy;
  - đây là đường lộ dữ liệu hay gặp nhất trong lớp báo cáo.
- **Nguồn:** https://www.postgresql.org/docs/18/sql-createview.html (tham số `security_invoker`)
- **Cấp:** L4 · **Nối với:** chưa có (gần A13, S10) · **Kiểm:** PGlite, Sai ≠ Đúng: role `app` với tenant 1 thấy 4 dòng qua view thường, 2 dòng qua view `security_invoker`

```sql
-- X08 bad
CREATE ROLE app NOLOGIN;
CREATE TABLE inv (tenant_id int, id int);
INSERT INTO inv VALUES (1, 1), (1, 2), (2, 3), (2, 4);
ALTER TABLE inv ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_only ON inv USING (tenant_id = current_setting('app.tenant_id')::int);
CREATE VIEW inv_report AS SELECT * FROM inv;
GRANT USAGE ON SCHEMA lab TO app;
GRANT SELECT ON inv, inv_report TO app;
SET app.tenant_id = '1';
SET ROLE app;
SELECT count(*) AS visible FROM inv_report;
```
```sql
-- X08 good
CREATE ROLE app NOLOGIN;
CREATE TABLE inv (tenant_id int, id int);
INSERT INTO inv VALUES (1, 1), (1, 2), (2, 3), (2, 4);
ALTER TABLE inv ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_only ON inv USING (tenant_id = current_setting('app.tenant_id')::int);
CREATE VIEW inv_report WITH (security_invoker = true) AS SELECT * FROM inv;
GRANT USAGE ON SCHEMA lab TO app;
GRANT SELECT ON inv, inv_report TO app;
SET app.tenant_id = '1';
SET ROLE app;
SELECT count(*) AS visible FROM inv_report;
```

### X09 · SQL động: `format('%I')` cho tên, `%L` hoặc `USING` cho giá trị / Dynamic SQL: %I for names, %L or USING for values

*(vòng 3)*

- **Luật:** trong hàm PL/pgSQL, script và công cụ phân tích có dựng câu SQL từ chữ (tên bảng do người chọn, bộ lọc của dashboard):
  - tên đi qua `format('%I', …)` hoặc `quote_ident`;
  - giá trị đi qua tham số `EXECUTE … USING` (tốt nhất) hoặc `format('%L', …)`;
  - không bao giờ nối chuỗi `'… ' || input`.
- **Vì sao:**
  - X01 nói về ứng dụng; SQL injection trong lớp phân tích (notebook, báo cáo động, macro) cũng thật như vậy;
  - `%I` nháy kép tên nên `orders; DROP TABLE orders` chỉ là một tên bảng lạ, không phải hai câu.
- **Nguồn:** https://www.postgresql.org/docs/18/plpgsql-statements.html#PLPGSQL-STATEMENTS-EXECUTING-DYN
- **Cấp:** L2 · **Nối với:** chưa có (gần X01) · **Kiểm:** PGlite, Sai ≠ Đúng (chuỗi SQL sinh ra): Sai thành hai câu `…FROM orders; DROP TABLE orders`, Đúng thành `…FROM "orders; DROP TABLE orders"`

```sql
-- X09 bad
SELECT 'SELECT count(*) FROM ' || 'orders; DROP TABLE orders' AS sql_text;
```
```sql
-- X09 good
SELECT format('SELECT count(*) FROM %I', 'orders; DROP TABLE orders') AS sql_text;
```

### X10 · Cột nhạy cảm: cấp quyền theo cột hoặc qua view / Sensitive columns: column privileges or a view

*(vòng 3)*

- **Luật:** bảng có cột nhạy cảm (số điện thoại, email, số giấy tờ) thì người phân tích chỉ được `GRANT SELECT (cột, …)` trên các cột cần, hoặc đọc qua một view đã bỏ/che cột đó. Không cấp `SELECT` cả bảng "cho tiện".
- **Vì sao:**
  - hầu hết báo cáo không cần dữ liệu định danh; quyền tối thiểu (X02) áp cả ở mức cột;
  - với quyền theo cột, `SELECT *` báo lỗi `42501` thay vì âm thầm trả cột nhạy cảm;
  - docs `GRANT` lưu ý: thu hồi quyền cột không gỡ được quyền đã cấp ở mức bảng.
- **Nguồn:** https://www.postgresql.org/docs/18/sql-grant.html
- **Cấp:** L3 · **Nối với:** chưa có · **Kiểm:** PGlite, chạy được: role chỉ có quyền `(id, city)` đọc được hai cột đó; `SELECT *` và `SELECT phone` báo `42501`

```sql
-- X10 bad
CREATE TABLE customers_pii (id int PRIMARY KEY, city text, phone text);
INSERT INTO customers_pii VALUES (1, 'Hue', '0905000000');
CREATE ROLE analyst NOLOGIN;
GRANT USAGE ON SCHEMA lab TO analyst;
GRANT SELECT ON customers_pii TO analyst;
SET ROLE analyst;
SELECT * FROM customers_pii;
```
```sql
-- X10 good
CREATE TABLE customers_pii (id int PRIMARY KEY, city text, phone text);
INSERT INTO customers_pii VALUES (1, 'Hue', '0905000000');
CREATE ROLE analyst NOLOGIN;
GRANT USAGE ON SCHEMA lab TO analyst;
GRANT SELECT (id, city) ON customers_pii TO analyst;
SET ROLE analyst;
SELECT id, city FROM customers_pii;
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
  - https://www.mongodb.com/docs/manual/data-modeling/best-practices/#link-related-data
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
  - https://www.mongodb.com/docs/manual/core/schema-validation/specify-json-schema/ (`$jsonSchema`)
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
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/datefromstring/
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

### M23 · Bật profiler có ngưỡng và đọc truy vấn chậm / Use the profiler with a threshold

*(vòng 3)*

- **Luật:**
  - trên môi trường cần soi, bật profiler mức 1 với ngưỡng `slowms` (mặc định 100 ms) và `sampleRate` khi tải cao; không để mức 2 (ghi mọi thao tác) lâu dài;
  - đọc `system.profile` (hoặc log chậm) theo `millis`, `planSummary`, `docsExamined` / `nreturned` để tìm truy vấn cần index (bài lab slow log).
- **Vì sao:**
  - đoán "truy vấn nào chậm" luôn sai; profiler cho số thật;
  - profiler tốn tài nguyên và `system.profile` là capped collection, nên mức 2 làm chậm chính hệ thống đang soi.
- **Nguồn:** https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/
- **Cấp:** L3 · **Nối với:** chưa có · **Kiểm:** cú pháp (cần `mongod`)

```js
// M23 bad (syntax)
db.setProfilingLevel(2)
```
```js
// M23 good (syntax)
db.setProfilingLevel(1, { slowms: 100, sampleRate: 0.5 })
db.system.profile.find({ millis: { $gt: 100 } }).sort({ millis: -1 }).limit(10)
```

### M24 · Xây index trên collection đang chạy: tính trước tác động, dùng rolling build khi cần / Building indexes on live collections

*(vòng 3)*

- **Luật:**
  - index mới trên collection lớn đang phục vụ tải: chạy giờ thấp điểm, theo dõi tài nguyên;
  - trên replica set chịu tải nặng, cân nhắc rolling index build (xây từng member một khi đã tách ra);
  - không xây cùng lúc nhiều index lớn.
- **Vì sao:**
  - quá trình build giữ lock độc quyền ngắn ở đầu và cuối, và tốn I/O, cache trong suốt quá trình;
  - trên replica set, build chạy đồng thời ở mọi member mang dữ liệu; secondary chậm là lag tăng.
- **Nguồn:**
  - https://www.mongodb.com/docs/manual/core/index-creation/
  - https://www.mongodb.com/docs/manual/core/rolling-index-builds/
- **Cấp:** L4 · **Nối với:** chưa có (gần P05 của Postgres) · **Kiểm:** cú pháp (cần replica set)

```js
// M24 bad (syntax)
db.orders.createIndexes([{ customerId: 1 }, { status: 1, createdAt: -1 }, { 'items.sku': 1 }])
```
```js
// M24 good (syntax)
db.orders.createIndex({ status: 1, createdAt: -1 }, { name: 'status_createdAt' })
```

### M25 · Sao lưu theo cỡ dữ liệu, và thử khôi phục / Back up for your size, and test the restore

*(vòng 3)*

- **Luật:**
  - `mongodump` chỉ hợp cho dữ liệu nhỏ; deployment lớn dùng snapshot hệ thống file (có journal) hoặc dịch vụ backup quản lý;
  - lịch backup có mục tiêu RPO/RTO viết ra giấy;
  - mỗi kỳ khôi phục thử vào một máy riêng và đếm tài liệu.
- **Vì sao:**
  - docs ghi `mongodump`/`mongorestore` là công cụ cho deployment **nhỏ**; bảng so sánh trong docs xếp nó RTO/RPO cao nhất;
  - backup chưa từng khôi phục thử chưa phải là backup.
- **Nguồn:** https://www.mongodb.com/docs/manual/core/backups/
- **Cấp:** L4 · **Nối với:** chưa có · **Kiểm:** cú pháp (công cụ dòng lệnh)

```js
// M25 bad (ops)
// mongodump on the primary of a 2 TB replica set, every night, never restored
```
```js
// M25 good (ops)
// filesystem snapshot of a secondary (journal on the same volume) + weekly restore test into a scratch cluster
```

### M26 · Theo dõi replication lag và cửa sổ oplog / Watch replication lag and the oplog window

*(vòng 3)*

- **Luật:**
  - cảnh báo khi replication lag vượt ngưỡng (giây) và khi cửa sổ oplog (khoảng thời gian oplog còn giữ) ngắn hơn thời gian bảo trì dài nhất của bạn;
  - đặt cỡ oplog theo tải ghi thực tế, không để mặc định cho hệ ghi nhiều.
- **Vì sao:**
  - secondary tụt quá cửa sổ oplog thì không đuổi kịp nữa, phải resync toàn bộ;
  - đọc từ secondary đang lag là đọc dữ liệu cũ (gần M13).
- **Nguồn:**
  - https://www.mongodb.com/docs/manual/core/replica-set-oplog/
  - https://www.mongodb.com/docs/manual/tutorial/troubleshoot-replica-sets/
- **Cấp:** L5 · **Nối với:** chưa có · **Kiểm:** cú pháp (cần replica set)

```js
// M26 bad (syntax)
rs.status()
```
```js
// M26 good (syntax)
rs.printSecondaryReplicationInfo()
rs.printReplicationInfo()
```

### M27 · Bật xác thực và phân quyền theo vai trò ngay từ đầu / Enable access control from day one

*(vòng 3)*

- **Luật:**
  - bật `security.authorization` (access control) trước khi mở cổng ra mạng;
  - tạo user theo vai trò có sẵn ít quyền nhất (`read`, `readWrite` trên đúng database), không dùng `root` cho ứng dụng hay người phân tích;
  - chỉ bind vào mạng tin cậy, bật TLS.
- **Vì sao:**
  - "Enable Access Control and Enforce Authentication" là mục đầu tiên của security checklist;
  - người phân tích chỉ cần `read`: giống X06 của Postgres.
- **Nguồn:** https://www.mongodb.com/docs/manual/administration/security-checklist/
- **Cấp:** L3 · **Nối với:** chưa có · **Kiểm:** cú pháp (cấu hình `mongod`)

```js
// M27 bad (syntax)
db.createUser({ user: 'report', pwd: passwordPrompt(), roles: ['root'] })
```
```js
// M27 good (syntax)
db.createUser({ user: 'report', pwd: passwordPrompt(), roles: [{ role: 'read', db: 'shop' }] })
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
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html#GSI.Projections (`KEYS_ONLY`)
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
- **Nguồn:** https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ql-reference.select.html ("can result in a full table scan" khi `WHERE` thiếu `=`/`IN` trên partition key)
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

### D22 · Bật point-in-time recovery cho bảng quan trọng / Turn on point-in-time recovery

*(vòng 3)*

- **Luật:** mọi bảng chứa dữ liệu không tạo lại được bật PITR; đặt `RecoveryPeriodInDays` theo nhu cầu (mặc định 35, được 1–35). Backup theo yêu cầu cho mốc dài hạn.
- **Vì sao:**
  - PITR giữ điểm khôi phục tới từng giây, trong tối đa 35 ngày, do DynamoDB quản lý;
  - một job ghi sai hay một lệnh xóa nhầm được sửa bằng cách khôi phục ra bảng mới ở thời điểm trước đó.
- **Nguồn:** https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Point-in-time-recovery.html
- **Cấp:** L4 · **Nối với:** chưa có · **Kiểm:** cú pháp (emulator không có backup)

```json
// D22 bad (syntax)
{"op": "UpdateContinuousBackups", "input": {"TableName": "Shop", "PointInTimeRecoverySpecification": {"PointInTimeRecoveryEnabled": false}}}
```
```json
// D22 good (syntax)
{"op": "UpdateContinuousBackups", "input": {"TableName": "Shop", "PointInTimeRecoverySpecification": {"PointInTimeRecoveryEnabled": true, "RecoveryPeriodInDays": 35}}}
```

### D23 · Bật deletion protection cho bảng production / Enable deletion protection

*(vòng 3)*

- **Luật:** bảng production có `DeletionProtectionEnabled: true`; chỉ tắt có chủ đích, qua quy trình, ngay trước khi xóa thật.
- **Vì sao:**
  - `DeleteTable` không có thùng rác; một script dọn dẹp chạy nhầm môi trường là mất bảng;
  - với deletion protection, lệnh xóa bị từ chối cho tới khi ai đó tắt nó một cách rõ ràng.
- **Nguồn:** https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithTables.Basics.html
- **Cấp:** L3 · **Nối với:** chưa có · **Kiểm:** cú pháp

```json
// D23 bad (syntax)
{"op": "UpdateTable", "input": {"TableName": "Shop", "DeletionProtectionEnabled": false}}
```
```json
// D23 good (syntax)
{"op": "UpdateTable", "input": {"TableName": "Shop", "DeletionProtectionEnabled": true}}
```

### D24 · Báo động khi bị throttle, đừng chờ người dùng báo / Alarm on throttling

*(vòng 3)*

- **Luật:** đặt CloudWatch alarm trên `ReadThrottleEvents`, `WriteThrottleEvents` và `ThrottledRequests` của bảng **và của từng GSI**, cộng với `ConsumedReadCapacityUnits`/`ConsumedWriteCapacityUnits` so với mức cấp.
- **Vì sao:**
  - throttle trên GSI làm chậm cả lệnh ghi vào bảng gốc (D07);
  - khóa nóng (D02) chỉ lộ ra qua số throttle, vì tổng capacity vẫn còn dư.
- **Nguồn:** https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/metrics-dimensions.html
- **Cấp:** L3 · **Nối với:** chưa có · **Kiểm:** cú pháp (CloudWatch không có trong emulator)

```json
// D24 bad (ops)
{"note": "no alarms; users report slow checkout first"}
```
```json
// D24 good (ops)
{"MetricName": "WriteThrottleEvents", "Namespace": "AWS/DynamoDB", "Dimensions": [{"Name": "TableName", "Value": "Shop"}, {"Name": "GlobalSecondaryIndexName", "Value": "ByStatus"}], "Statistic": "Sum", "Period": 60, "Threshold": 0, "ComparisonOperator": "GreaterThanThreshold"}
```

### D25 · Thử lại với exponential backoff, và giới hạn số lần / Retry with exponential backoff, bounded

*(vòng 3)*

- **Luật:**
  - lỗi throttle và lỗi 5xx được thử lại với thời gian chờ tăng dần theo cấp số nhân, có jitter, và có số lần tối đa; SDK của AWS làm sẵn việc này, đừng tắt nó;
  - với batch, chỉ gửi lại `UnprocessedItems`/`UnprocessedKeys` (D19), cũng với backoff;
  - lỗi 4xx khác (validation, điều kiện) không thử lại.
- **Vì sao:**
  - thử lại ngay lập tức làm khóa nóng nóng thêm;
  - không giới hạn số lần thì một sự cố nhỏ thành hàng đợi request chồng chất.
- **Nguồn:** https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Programming.Errors.html#Programming.Errors.RetryAndBackoff
- **Cấp:** L2 · **Nối với:** chưa có · **Kiểm:** cú pháp (emulator không throttle)

```js
// D25 bad (syntax)
while (true) { try { await put(item); break; } catch (e) { /* retry at once, forever */ } }
```
```js
// D25 good (syntax)
for (let i = 0; i < 5; i++) { try { await put(item); break; } catch (e) { if (!retryable(e)) throw e; await sleep(Math.random() * 50 * 2 ** i); } }
```

### D26 · IAM quyền tối thiểu, giới hạn tới khóa của chính người dùng / Least-privilege IAM down to the user's own keys

*(vòng 3)*

- **Luật:**
  - policy IAM của ứng dụng chỉ cho đúng action cần (`dynamodb:Query`, `dynamodb:GetItem`) trên đúng ARN bảng/index, không `dynamodb:*` trên `*`;
  - khi người dùng cuối truy cập trực tiếp (Cognito), giới hạn bằng điều kiện `dynamodb:LeadingKeys` để họ chỉ đọc item có partition key là id của mình;
  - người phân tích đọc qua export (S3) hoặc role chỉ đọc, không dùng credential của ứng dụng.
- **Vì sao:**
  - DynamoDB không có RLS; IAM condition là lớp lọc theo dòng duy nhất;
  - credential lộ chỉ gây hại trong phạm vi policy.
- **Nguồn:** https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/specifying-conditions.html
- **Cấp:** L4 · **Nối với:** chưa có (đối chiếu S10, X02) · **Kiểm:** cú pháp (IAM không có trong emulator)

```json
// D26 bad (syntax)
{"Effect": "Allow", "Action": "dynamodb:*", "Resource": "*"}
```
```json
// D26 good (syntax)
{"Effect": "Allow", "Action": ["dynamodb:GetItem", "dynamodb:Query"], "Resource": "arn:aws:dynamodb:ap-southeast-1:111122223333:table/Shop", "Condition": {"ForAllValues:StringEquals": {"dynamodb:LeadingKeys": ["${cognito-identity.amazonaws.com:sub}"]}}}
```

### D27 · Tìm khóa nóng bằng CloudWatch Contributor Insights / Find hot keys with Contributor Insights

*(vòng 3)*

- **Luật:** khi thấy throttle (D24) mà tổng capacity còn dư, bật Contributor Insights cho bảng (và GSI) để xem các partition key và item được truy cập, bị throttle nhiều nhất; sửa khóa (D02, D03) theo số đó, không đoán.
- **Vì sao:**
  - con số tổng của bảng không chỉ ra khóa nào nóng;
  - Contributor Insights xếp hạng "most accessed" và "most throttled" keys theo thời gian.
- **Nguồn:** https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/contributorinsights_HowItWorks.html
- **Cấp:** L4 · **Nối với:** chưa có · **Kiểm:** cú pháp

```json
// D27 bad (ops)
{"note": "raise provisioned capacity until the throttling stops"}
```
```json
// D27 good (syntax)
{"op": "UpdateContributorInsights", "input": {"TableName": "Shop", "ContributorInsightsAction": "ENABLE"}}
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

Mọi hình dạng dưới đây là JSON thật do `libpg-query` 18.2.4 (bản repo đang ghim) trả về trong Node, không viết theo trí nhớ. Ba điều quan trọng cho người viết matcher:

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

## 11. Vòng 3: 40 thẻ nội dung (ADD-8)

Theo `product-design-best-practice.md` §4 (ENGINE-CONTENT-V1 + ADD-8). File ở `content/engine/best/<track>/<mã>-<slug>.md`, danh sách track ở `content/engine/best/tracks.yml`. Chưa có parser hay UI đọc chúng (luồng BP-T/BP-UI của v25); thẻ là nội dung sẵn để gộp.

### 11.1 Chọn thẻ

- Bắt buộc: 10 mục có lint ở §5.4 của thiết kế (Q01, Q02, Q06, Q10, Q11, Q12, Q13, Q15, Q22, A05; mỗi thẻ có `lint.tip`, Q22 vẫn tắt ở v25) và "Mười mục giá trị nhất" (Q02, Q06, Q07, Q11, Q12, A03, A01, S10, M01, D02).
- Phần còn lại: mục chạy được và "Sai ≠ Đúng", nặng về SQL và PostgreSQL vì hai track này phát hành trước (v25).
- Cổng Product §11.3 mục 3 (câu kiểm không lộ đáp án): 15 thẻ (Q01, Q02, Q05, S01, S03, S08, X01, M15–M18, D06, D14, D15, D18) đã bỏ khối `## Ví dụ`, vì khối đó nêu đúng kết quả mà câu kiểm hỏi; số đo hiện sau "Chạy cả hai". Các thẻ còn khối Ví dụ chỉ nêu số mà câu kiểm không hỏi. Vẫn cần agent "giải mù" của cổng chạy thật trước khi phát hành.
- Bỏ lại có chủ đích: mục mà bản "Đúng" mới là bản báo lỗi (S02, S04, S06, S07, P05, X02). `check: error` của ADD-8 nghĩa là bản "Không nên" báo lỗi, nên các mục này cần dựng lại kịch bản mới làm thẻ được.

Số thẻ: SQL 18, PostgreSQL 10, MongoDB 6, DynamoDB 6.

| Mã | Track | Cấp | `runtime` | `check` | Lint | File |
|---|---|---|---|---|---|---|
| Q01 | SQL | L1 | `lab` | `diff` | có | `content/engine/best/sql/q01-is-null.md` |
| Q02 | SQL | L2 | `lab` | `diff` | có | `content/engine/best/sql/q02-not-exists.md` |
| Q03 | SQL | L2 | `lab` | `diff` |  | `content/engine/best/sql/q03-is-distinct-from.md` |
| Q04 | SQL | L1 | `lab` | `diff` |  | `content/engine/best/sql/q04-count-star.md` |
| Q05 | SQL | L1 | `lab` | `diff` |  | `content/engine/best/sql/q05-coalesce-sums.md` |
| Q06 | SQL | L2 | `lab` | `diff` | có | `content/engine/best/sql/q06-left-join-on.md` |
| Q07 | SQL | L2 | `lab` | `diff` |  | `content/engine/best/sql/q07-aggregate-before-join.md` |
| Q10 | SQL | L1 | `lab` | `runs` | có | `content/engine/best/sql/q10-limit-order-by.md` |
| Q11 | SQL | L2 | `lab` | `plan` | có | `content/engine/best/sql/q11-sargable.md` |
| Q12 | SQL | L1 | `lab` | `diff` | có | `content/engine/best/sql/q12-half-open-range.md` |
| Q13 | SQL | L1 | `lab` | `diff` | có | `content/engine/best/sql/q13-integer-division.md` |
| Q15 | SQL | L1 | `lab` | `same` | có | `content/engine/best/sql/q15-where-vs-having.md` |
| Q22 | SQL | L1 | `lab` | `same` | có | `content/engine/best/sql/q22-readable-style.md` |
| A01 | SQL | L2 | `lab` | `diff` |  | `content/engine/best/sql/a01-date-spine.md` |
| A03 | SQL | L2 | `lab` | `diff` |  | `content/engine/best/sql/a03-dedupe-business-key.md` |
| A05 | SQL | L1 | `lab` | `runs` | có | `content/engine/best/sql/a05-as-of-date.md` |
| A11 | SQL | L2 | `lab` | `diff` |  | `content/engine/best/sql/a11-orphans-anti-join.md` |
| A18 | SQL | L2 | `lab` | `diff` |  | `content/engine/best/sql/a18-average-of-averages.md` |
| S01 | PostgreSQL | L1 | `engine` | `diff` |  | `content/engine/best/postgres/s01-timestamptz.md` |
| S03 | PostgreSQL | L1 | `lab` | `diff` |  | `content/engine/best/postgres/s03-money-numeric.md` |
| S08 | PostgreSQL | L1 | `engine` | `error` |  | `content/engine/best/postgres/s08-snake-case-names.md` |
| S10 | PostgreSQL | L4 | `engine` | `diff` |  | `content/engine/best/postgres/s10-tenant-rls-force.md` |
| I02 | PostgreSQL | L3 | `engine` | `runs` |  | `content/engine/best/postgres/i02-composite-order.md` |
| I03 | PostgreSQL | L3 | `engine` | `runs` |  | `content/engine/best/postgres/i03-partial-index.md` |
| I04 | PostgreSQL | L3 | `engine-hb` | `runs` |  | `content/engine/best/postgres/i04-covering-include.md` |
| I05 | PostgreSQL | L3 | `engine` | `runs` |  | `content/engine/best/postgres/i05-expression-index.md` |
| I06 | PostgreSQL | L2 | `engine` | `runs` |  | `content/engine/best/postgres/i06-index-foreign-keys.md` |
| X01 | PostgreSQL | L1 | `engine` | `diff` |  | `content/engine/best/postgres/x01-parameterise.md` |
| M01 | MongoDB | L1 | `mingo` | `same` |  | `content/engine/best/mongodb/m01-embed-together.md` |
| M09 | MongoDB | L2 | `mingo` | `same` |  | `content/engine/best/mongodb/m09-match-early.md` |
| M15 | MongoDB | L2 | `mingo` | `diff` |  | `content/engine/best/mongodb/m15-elem-match.md` |
| M16 | MongoDB | L1 | `mingo` | `diff` |  | `content/engine/best/mongodb/m16-null-missing.md` |
| M17 | MongoDB | L2 | `mingo` | `diff` |  | `content/engine/best/mongodb/m17-ne-missing.md` |
| M18 | MongoDB | L2 | `mingo` | `diff` |  | `content/engine/best/mongodb/m18-unwind-preserve.md` |
| D02 | DynamoDB | L2 | `dynoxide` | `runs` |  | `content/engine/best/dynamodb/d02-high-cardinality-key.md` |
| D04 | DynamoDB | L2 | `dynoxide` | `diff` |  | `content/engine/best/dynamodb/d04-iso-sort-key.md` |
| D06 | DynamoDB | L1 | `dynoxide` | `same` |  | `content/engine/best/dynamodb/d06-query-not-scan.md` |
| D14 | DynamoDB | L1 | `dynoxide` | `error` |  | `content/engine/best/dynamodb/d14-reserved-words.md` |
| D15 | DynamoDB | L2 | `dynoxide` | `error` |  | `content/engine/best/dynamodb/d15-key-condition.md` |
| D18 | DynamoDB | L1 | `dynoxide` | `diff` |  | `content/engine/best/dynamodb/d18-number-type.md` |

### 11.2 Kiểm

Một script tạm ngoài repo (`bp3/verify.mjs`, không commit) đọc chính các file thẻ và kiểm mọi luật nội dung của thiết kế §4.3, rồi chạy cặp trên runtime thật. Kết quả ngày 2026-11-20: **40/40 thẻ, 0 lỗi**.

- **Runtime:**
  - `lab`: PGlite 0.5.16 (PostgreSQL 18.6), schema `lab` sau `VACUUM ANALYZE`, mỗi bản trong `BEGIN … ROLLBACK`, chạy bằng `query()`; mỗi bản đúng một câu, không `;` cuối.
  - `engine`/`engine-hb`: một PGlite mới cho mỗi thẻ; `setup` tách từng câu như `src/engine/pglab/script.ts`, nên `VACUUM` chạy được.
  - `mingo`: `runMongo` + `datasetOf` của nhánh `v22-engine` (`src/engine/mongo/engineMongo.ts`) trên mingo 7.2.6, nên cú pháp mongosh đúng như editor sẽ nhận.
  - `dynoxide`: `DynamoEngine` + `parseRequest` + `labProblem` của `v22-engine` (`src/engine/dynamo/`) trên `@dynoxide/wasm-engine` 1.5.0.
- **Khẳng định:** `diff` khác theo vị trí cột, `same` bằng (DynamoDB: không xét thứ tự item); `plan` đúng nút quét trên `expect.table`; `error` đúng SQLSTATE hoặc kiểu lỗi DynamoDB; `expect.compare: cost | size | rcu` thì bản Nên nhỏ hơn hẳn. Mỗi bản < 300 ms trong Node (lâu nhất 9 ms; `setup` lâu nhất ≈ 1 s, I06).
- **Lint:** 10 thẻ có `lint`: `pair.bad` kích luật (cây parse `libpg-query` 18.2.4, matcher của §10 cộng luật Q22), `pair.good` thì không. Q11 lọc thêm "cột là cột đầu của một index có thật trong `lab`", Q12 "cột kiểu timestamp".
- **Chữ:** id = `e-bp-` + mã file; `track` = thư mục; `module` thuộc `areas`; `skills`/`adv` có thật; `requires` là id Engine có thật ở `v22-engine` (`0ede43d`); nguồn thuộc danh sách cho phép; code span VI = EN (cả frontmatter); EN không dấu; không "boss", "sắp có", "later", "sự cố"; không chữ ở cột `avoid` của glossary theo engine; mỗi mục thân bài ≤ 120 từ (không tính dòng tiêu đề); không bản `good` SQL nào kích bất kỳ luật nào trong 10 luật lint.

### 11.3 Chỗ ADD-8 chưa nói, thẻ đã chọn cách (BP-T chốt khi viết parser)

| Chỗ | Cách thẻ đang viết | Vì sao |
|---|---|---|
| `setup` của `mingo` | JSON chặt `{"collections": {…}}`, ngày là `{"$date": "…"}` | Giống `lab.setup` của bài MongoDB và `datasetOf()` |
| `setup` của `dynoxide` | JSON chặt `{"tables": […], "items": {…}}`, giá trị **có kiểu** (`{"S": …}`) | `DynamoEngine.seed()` gửi item thẳng vào `BatchWriteItem`. Lưu ý: vài bài DynamoDB trên `v22-engine` (ví dụ `L1/09-query-vs-scan.md`) ghi item không kiểu; nếu loader không tự chuyển thì bài đó lỗi khi seed |
| Bản Sai/Đúng của DynamoDB | Một request `{"op", "input"}` mỗi bản | Như editor (`parseRequest`); các mục cần vòng lặp hay nhiều lệnh (D01, D03) chưa làm thẻ |
| Mục index (I02–I06) | `setup` dựng **hai bảng cùng dữ liệu**, mỗi bảng một thiết kế index; Sai/Đúng là cùng câu trên hai bảng; `check: runs` + `expect.compare: cost` (I03: `size`) | ADD-8 không có "câu dò" (probe) sau DDL. Nếu BP-T thêm `probe`, các thẻ này có thể đổi về một bảng |
| `expect.compare: rcu` | D06 (cùng kết quả, RCU khác) | Thiết kế chỉ nêu `cost | size`; đây là cùng ý cho DynamoDB |
| Loader và test hiện có | Không đổi gì | Loader Engine (`src/engineSources-{pg,mg,dy}.ts` ở nhánh `content-qa2`) glob `content/engine/<engine>/L*/*.md`, nên không quét `best/`. `tests/contentJson.test.ts` (`v22-engine`) glob `content/**/*.{md,yml}` và so frontmatter JSON với YAML: thẻ dùng ngày dạng chuỗi có nháy, không có giá trị thành `Date`, nên qua được |
| Chú thích lần đầu (style §2.1) | Đã sửa cho "tài liệu (document)", "thuộc tính (attribute)", "partition key (khóa phân vùng)", "sort key (khóa sắp xếp)" | Script chưa kiểm luật này; reviewer kiểm tay |
| Q11 trên `lab` | `expect.good: Index Only Scan` sau `VACUUM ANALYZE` (như test §11.1 của thiết kế); không VACUUM thì là `Bitmap Heap Scan` | Thân thẻ nói cả hai, không hứa một nút |

### 11.4 Ngân sách

- `sql`: 59.2 KB thô, 16.6 KB gzip -9 (cả file, trước khi build đổi YAML sang JSON).
- `postgres`: 36.6 KB thô, 10.7 KB gzip -9 (cả file, trước khi build đổi YAML sang JSON).
- `mongodb`: 24.6 KB thô, 6.9 KB gzip -9 (cả file, trước khi build đổi YAML sang JSON).
- `dynamodb`: 57.8 KB thô, 9.0 KB gzip -9 (cả file, trước khi build đổi YAML sang JSON).

Trần thiết kế §10: `bpsql` 20, `bppg` 20, `bpmg` 10, `bpdy` 10 (cho đủ track). Phần lớn byte của DynamoDB là dữ liệu `setup`. Theo tỷ lệ hiện tại (≈ 0,9 KB gzip mỗi thẻ SQL, ≈ 1,1 KB mỗi thẻ PostgreSQL), đủ 33 mục SQL ≈ 30 KB và 35 mục PostgreSQL ≈ 37 KB: **vượt trần 20**. BP-T cần tách chunk (ví dụ theo khu Q/A, S/I/P/X) hoặc nâng trần, ghi vào L của v25.

## 12. Bản đồ: mục Best Practice → bài Database Engine

Bài Engine đọc ở nhánh `v22-engine` (commit `0ede43d`): 195 id (`e-pg-…` 75, `e-mg-…` 65, `e-dy-…` 55). Lộ trình MongoDB `content/engine/mongodb/path/*.yml` (42 bài học nhanh `mg.<kỹ năng>` + drill) không có id `e-…` nên `requires` không trỏ tới được; nối riêng ở §12.10.
"Bài liên quan" được chọn theo tiêu đề và mục tiêu của bài. Riêng 40 mục có thẻ: mỗi id trong `requires` của thẻ đã được grep xác nhận bài đó có nói đúng thuật ngữ của mục (ví dụ `elemMatch`, `preserveNullAndEmptyArrays`, `INCLUDE`); id không qua bước này đã bị bỏ khỏi thẻ và khỏi bảng. Các dòng còn lại là ứng viên theo tiêu đề, cần người viết thẻ kiểm lại. "—" = chưa bài Engine nào dạy.

### 12.1 1. Viết truy vấn SQL (Q)

| Mã | Mục | Bài Engine liên quan | Thẻ |
|---|---|---|---|
| Q01 | Compare with NULL using IS NULL | `e-pg-l1-05`, `e-mg-l1-09` | `e-bp-q01` |
| Q02 | Use NOT EXISTS, not NOT IN | `e-pg-l1-05` | `e-bp-q02` |
| Q03 | Null-safe comparison | `e-pg-l1-05` | `e-bp-q03` |
| Q04 | count(*) vs count(column) | `e-pg-l1-05` | `e-bp-q04` |
| Q05 | COALESCE outer-join sums | `e-pg-l1-05` | `e-bp-q05` |
| Q06 | Right-table filters belong in ON | — | `e-bp-q06` |
| Q07 | Aggregate before joining two child tables | — | `e-bp-q07` |
| Q08 | Explicit JOIN syntax | — |  |
| Q09 | Name your columns | `e-mg-l1-03` |  |
| Q10 | ORDER BY with a tiebreaker | `e-pg-l1-11`, `e-mg-l1-10`, `e-dy-l1-10` | `e-bp-q10` |
| Q11 | Keep predicates sargable | `e-pg-l2-04` | `e-bp-q11` |
| Q12 | Half-open ranges, not BETWEEN | `e-pg-l1-01`, `e-pg-l2-10` | `e-bp-q12` |
| Q13 | Cast before dividing integers | — | `e-bp-q13` |
| Q14 | Conditional aggregation with FILTER | — |  |
| Q15 | WHERE for rows, HAVING for groups | `e-mg-l3-12`, `e-mg-l2-06` | `e-bp-q15` |
| Q16 | UNION ALL unless you mean DISTINCT | — |  |
| Q17 | Name steps with CTEs | — |  |
| Q18 | Spell out ROWS for running totals | `e-mg-l2-10` |  |
| Q19 | Filter window results in an outer query | `e-mg-l2-10` |  |
| Q20 | EXISTS for "has any" | — |  |
| Q21 | Keyset pagination instead of deep OFFSET | `e-pg-l1-11`, `e-mg-l1-10`, `e-dy-l1-10` |  |
| Q22 | Consistent, readable style | — | `e-bp-q22` |
| Q23 | Name every computed column | — |  |

### 12.2 2. SQL cho data analyst (A)

| Mã | Mục | Bài Engine liên quan | Thẻ |
|---|---|---|---|
| A01 | Use a date spine for empty periods | — | `e-bp-a01` |
| A02 | Bucket days in the business time zone | `e-pg-l1-01` |  |
| A03 | Deduplicate on a business key, deterministically | — | `e-bp-a03` |
| A04 | Test the grain before you join | — |  |
| A05 | Pin the as-of date | — | `e-bp-a05` |
| A06 | Reconcile control totals | — |  |
| A07 | Ratios need an explicit denominator | — |  |
| A08 | Round once, at the end | `e-pg-l1-01` |  |
| A09 | Median for skewed data | — |  |
| A10 | Normalise text keys first | `e-pg-l2-04`, `e-pg-l2-13` |  |
| A11 | Find orphans with an anti join | `e-pg-l1-04` | `e-bp-a11` |
| A12 | Data tests are queries that must return zero rows | `e-pg-l1-04` |  |
| A13 | One documented definition per metric | `e-pg-l1-08` |  |
| A14 | Make random samples reproducible | — |  |
| A15 | last_value needs a frame to the end of the partition | `e-mg-l2-10` |  |
| A16 | lag and lead need PARTITION BY the entity | `e-mg-l2-10` |  |
| A17 | Top N: choose the tie rule on purpose | `e-pg-l1-11` |  |
| A18 | Don't average averages | `e-mg-l2-06` | `e-bp-a18` |
| A19 | AT TIME ZONE works in opposite directions | — |  |
| A20 | Add 1 day, not 24 hours, across DST | — |  |
| A21 | Distinct counts are not additive | — |  |
| A22 | Profile the columns before you analyse | `e-pg-l2-15` |  |
| A23 | Check freshness before you send numbers | — |  |
| A24 | Accepted values are a zero-row test | `e-pg-l1-04` |  |

### 12.3 3. Thiết kế schema (S)

| Mã | Mục | Bài Engine liên quan | Thẻ |
|---|---|---|---|
| S01 | Store instants as timestamptz | `e-pg-l1-01`, `e-pg-l1-02` | `e-bp-s01` |
| S02 | text with a CHECK, not char(n) | `e-pg-l1-01`, `e-pg-l1-04` |  |
| S03 | Money as numeric | `e-pg-l1-01` | `e-bp-s03` |
| S04 | Identity columns, not serial | `e-pg-l1-03` |  |
| S05 | Prefer time-ordered UUIDv7 | `e-pg-l1-03` |  |
| S06 | Let constraints enforce the rules | `e-pg-l1-04`, `e-pg-l1-12` |  |
| S07 | NULLS NOT DISTINCT | `e-pg-l1-04`, `e-pg-l1-05` |  |
| S08 | Lower-case snake_case names | — | `e-bp-s08` |
| S09 | Normalise OLTP, denormalise on purpose | `e-pg-l1-08`, `e-mg-l2-11` |  |
| S10 | tenant_id everywhere, RLS forced | `e-pg-l5-10`, `e-pg-l1-06` | `e-bp-s10` |
| S11 | Partition for a reason | `e-pg-l4-07`, `e-pg-l4-08` |  |
| S12 | jsonb for the dynamic part only | `e-pg-l2-11` |  |
| S13 | Meaningful, uniform name suffixes | — |  |
| S14 | Do not name things after SQL key words | — |  |

### 12.4 4. Index (I)

| Mã | Mục | Bài Engine liên quan | Thẻ |
|---|---|---|---|
| I01 | Index for a query, check with EXPLAIN | `e-pg-l1-09`, `e-pg-l1-10`, `e-pg-l2-14` |  |
| I02 | Composite order: equality first, range last | `e-pg-l2-01`, `e-mg-l3-05`, `e-mg-l3-07` | `e-bp-i02` |
| I03 | Partial indexes for the hot subset | `e-pg-l2-03`, `e-mg-l3-01`, `e-mg-l3-02` | `e-bp-i03` |
| I04 | Covering indexes with INCLUDE | `e-pg-l2-02`, `e-pg-l3-09`, `e-mg-l3-09` | `e-bp-i04` |
| I05 | Expression indexes | `e-pg-l2-04` | `e-bp-i05` |
| I06 | Index your foreign keys | `e-pg-l1-09` | `e-bp-i06` |
| I07 | Pick the index type for the operator | `e-pg-l2-05`, `e-pg-l2-06`, `e-pg-l2-07`, `e-pg-l2-08`, `e-pg-l2-09`, `e-pg-l2-12`, `e-pg-l2-13`, `e-pg-l2-16`, `e-pg-l2-17`, `e-pg-l5-07` |  |
| I08 | Low-cardinality columns | `e-pg-l2-03`, `e-pg-l2-15`, `e-pg-l4-02` |  |
| I09 | Remove unused and duplicate indexes | `e-mg-l3-14`, `e-pg-l5-11` |  |

### 12.5 5. Hiệu năng và vận hành (P)

| Mã | Mục | Bài Engine liên quan | Thẻ |
|---|---|---|---|
| P01 | Compare estimated vs actual rows | `e-pg-l2-14`, `e-pg-l2-15`, `e-pg-l4-01` |  |
| P02 | HOT updates and fillfactor | `e-pg-l3-06`, `e-pg-l3-07`, `e-pg-l3-08` |  |
| P03 | Keep autovacuum on, transactions short | `e-pg-l3-04`, `e-pg-l3-05`, `e-pg-l3-06`, `e-pg-l3-15`, `e-pg-l5-14` |  |
| P04 | Pool connections | — |  |
| P05 | Build indexes CONCURRENTLY | `e-pg-l2-14`, `e-pg-l4-16` |  |
| P06 | Add constraints NOT VALID, then VALIDATE | `e-pg-l1-04` |  |
| P07 | Cheap vs table-rewriting ALTERs | — |  |
| P08 | Batch large UPDATE and DELETE | `e-pg-l3-15`, `e-pg-l4-16` |  |
| P09 | Extended statistics for correlated columns | `e-pg-l2-15`, `e-pg-l4-03` |  |
| P10 | Tune autovacuum thresholds per large table | `e-pg-l3-15`, `e-pg-l5-14` |  |
| P11 | Measure the HOT ratio | `e-pg-l3-07` |  |
| P12 | Watch index bloat, rebuild concurrently | `e-pg-l3-15`, `e-pg-l5-03` |  |
| P13 | Know each DDL's lock, always set lock_timeout | `e-pg-l1-07`, `e-pg-l4-09` |  |
| P14 | Find and drop invalid indexes after a failed concurrent build | `e-pg-l2-14` |  |
| P15 | Add NOT NULL as NOT VALID first | `e-pg-l1-04` |  |
| P16 | Know which type changes rewrite the table | `e-pg-l1-01` |  |
| P17 | Prune partitions with plain ranges on the key | `e-pg-l4-07` |  |
| P18 | Create partitions ahead of the data | `e-pg-l4-08` |  |
| P19 | Prepared statements on skewed data: watch the generic plan | `e-pg-l2-15`, `e-pg-l4-06` |  |
| P20 | Raise the statistics target per column | `e-pg-l2-15`, `e-pg-l4-02` |  |
| P21 | jsonb_path_ops does not serve key-exists | `e-pg-l2-11`, `e-pg-l5-04` |  |
| P22 | Expression B-tree for one hot jsonb key | `e-pg-l2-11`, `e-pg-l2-04` |  |
| P23 | Behind a transaction pooler use SET LOCAL | `e-pg-l1-06`, `e-pg-l1-07` |  |
| P24 | Set timeouts per role | — |  |
| P25 | Find the costliest queries with pg_stat_statements | `e-pg-l5-11` |  |
| P26 | Monitor transaction ID age | `e-pg-l3-10`, `e-pg-l3-11`, `e-pg-l5-14` |  |

### 12.6 6. Bảo mật (X)

| Mã | Mục | Bài Engine liên quan | Thẻ |
|---|---|---|---|
| X01 | Parameterise, never concatenate | — | `e-bp-x01` |
| X02 | Least privilege roles | — |  |
| X03 | Pin search_path in SECURITY DEFINER functions | `e-pg-l1-06` |  |
| X04 | RLS does not bind owners unless FORCED | `e-pg-l5-10` |  |
| X05 | scram-sha-256, never trust over TCP | — |  |
| X06 | Analysts work through a read-only role | — |  |
| X07 | Permissive policies are OR-ed: make must-hold rules RESTRICTIVE | `e-pg-l5-10` |  |
| X08 | Views bypass RLS unless security_invoker | `e-pg-l1-08`, `e-pg-l5-10` |  |
| X09 | Dynamic SQL: %I for names, %L or USING for values | — |  |
| X10 | Sensitive columns: column privileges or a view | — |  |

### 12.7 7. MongoDB (M)

| Mã | Mục | Bài Engine liên quan | Thẻ |
|---|---|---|---|
| M01 | Data accessed together is stored together | `e-mg-l2-11`, `e-mg-l2-12`, `e-mg-l4-01` | `e-bp-m01` |
| M02 | Avoid unbounded arrays | `e-mg-l4-05`, `e-mg-l1-06` |  |
| M03 | Avoid bloated documents | `e-mg-l4-01`, `e-mg-l1-03` |  |
| M04 | Time series and the bucket pattern | `e-mg-l4-03`, `e-mg-l5-08` |  |
| M05 | Store computed values when reads dominate | `e-mg-l4-02`, `e-mg-l2-14` |  |
| M06 | Validate and version your schema | `e-mg-l2-13`, `e-mg-l4-04` |  |
| M07 | Compound indexes follow ESR | `e-mg-l3-05`, `e-mg-l3-07`, `e-mg-l3-08`, `e-mg-l3-06` |  |
| M08 | Project only what you need | `e-mg-l1-03`, `e-mg-l3-09` |  |
| M09 | Filter early in pipelines | `e-mg-l3-12`, `e-mg-l2-04`, `e-mg-l2-05`, `e-mg-l2-08` | `e-bp-m09` |
| M10 | Multi-document transactions: rare and short | `e-mg-l4-09` |  |
| M11 | Choosing a shard key | `e-mg-l5-05`, `e-mg-l5-06`, `e-mg-l5-07` |  |
| M12 | Remove unnecessary indexes | `e-mg-l3-14` |  |
| M13 | Use majority write concern for data that matters | `e-mg-l4-07`, `e-mg-l4-11`, `e-mg-l5-04` |  |
| M14 | Fewer collections, intentional polymorphism | `e-mg-l4-06` |  |
| M15 | One array element, many conditions: $elemMatch | `e-mg-l1-08` | `e-bp-m15` |
| M16 | null also matches missing fields | `e-mg-l1-09` | `e-bp-m16` |
| M17 | `$nin` trả cả tài liệu thiếu trường / $ne and $nin include missing fields | `e-mg-l1-07`, `e-mg-l1-09` | `e-bp-m17` |
| M18 | $unwind drops empty and missing arrays | `e-mg-l2-07` | `e-bp-m18` |
| M19 | Store dates as Date, not strings | `e-mg-l1-01` |  |
| M20 | Update all matching elements with filtered positional | `e-mg-l2-01` |  |
| M21 | An average of averages is not the average | `e-mg-l2-06` |  |
| M22 | $in instead of $or on one field | `e-mg-l1-07` |  |
| M23 | Use the profiler with a threshold | `e-mg-l3-11` |  |
| M24 | Building indexes on live collections | — |  |
| M25 | Back up for your size, and test the restore | — |  |
| M26 | Watch replication lag and the oplog window | `e-mg-l5-03` |  |
| M27 | Enable access control from day one | — |  |

### 12.8 8. DynamoDB (D)

| Mã | Mục | Bài Engine liên quan | Thẻ |
|---|---|---|---|
| D01 | Access patterns first | `e-dy-l3-01`, `e-dy-l1-04` |  |
| D02 | High-cardinality, evenly accessed partition keys | `e-dy-l1-02`, `e-dy-l4-01`, `e-dy-l4-03` | `e-bp-d02` |
| D03 | Write sharding for hot keys | `e-dy-l4-04`, `e-dy-l4-05` |  |
| D04 | Hierarchical sort keys | `e-dy-l3-09`, `e-dy-l4-10`, `e-dy-l3-05` | `e-bp-d04` |
| D05 | Item collections for related data | `e-dy-l3-07`, `e-dy-l3-08`, `e-dy-l1-08`, `e-dy-l3-10`, `e-dy-l4-07` |  |
| D06 | Query, don't Scan | `e-dy-l1-09`, `e-dy-l1-05` | `e-bp-d06` |
| D07 | Lean, sparse GSIs | `e-dy-l3-02`, `e-dy-l3-06`, `e-dy-l4-08`, `e-dy-l4-09`, `e-dy-l3-03`, `e-dy-l3-04` |  |
| D08 | Keep items small | `e-dy-l2-08`, `e-dy-l2-10` |  |
| D09 | Time series: TTL or per-period tables | `e-dy-l5-02` |  |
| D10 | Conditional writes | `e-dy-l2-04`, `e-dy-l1-06`, `e-dy-l1-07` |  |
| D11 | Pick the capacity mode for the traffic | `e-dy-l4-06`, `e-dy-l4-02` |  |
| D12 | Paginate with LastEvaluatedKey | `e-dy-l1-10` |  |
| D13 | Strong reads only when needed | `e-dy-l2-11` |  |
| D14 | Reserved words need name placeholders | `e-dy-l2-01` | `e-bp-d14` |
| D15 | Sort-key conditions belong in the key condition | `e-dy-l2-02` | `e-bp-d15` |
| D16 | Counting and projecting do not cut read cost | `e-dy-l2-09` |  |
| D17 | Atomic counters, not read-modify-write | `e-dy-l2-05` |  |
| D18 | Store numbers as N, especially in sort keys | `e-dy-l1-01`, `e-dy-l1-02` | `e-bp-d18` |
| D19 | Batch in 25s and retry unprocessed items | `e-dy-l2-06` |  |
| D20 | PartiQL SELECT needs the partition key | `e-dy-l2-07` |  |
| D21 | Use a transaction when several items must change together | `e-dy-l4-11`, `e-dy-l4-12`, `e-dy-l4-13` |  |
| D22 | Turn on point-in-time recovery | `e-dy-l5-04` |  |
| D23 | Enable deletion protection | `e-dy-l5-04` |  |
| D24 | Alarm on throttling | `e-dy-l4-02` |  |
| D25 | Retry with exponential backoff, bounded | `e-dy-l2-06` |  |
| D26 | Least-privilege IAM down to the user's own keys | — |  |
| D27 | Find hot keys with Contributor Insights | `e-dy-l4-03` |  |

### 12.9 Tổng kết

- 122/160 mục có ít nhất một bài Engine liên quan; 38 mục chưa có (phần lớn là Q/A thuần SQL phân tích, bảo mật X, vận hành MongoDB/DynamoDB vòng 3).
- 139/195 bài Engine được ít nhất một mục dùng tới.
- **Sau vòng 4:**
  - 149/192 mục có bài Engine: thêm 27 mục mới có dòng ở §13.3; P31, P41, M31, M38, D32 chưa có;
  - 187/195 bài Engine có mục.
  - Danh sách dưới là trạng thái trước vòng 4; tám bài còn lại liệt kê ở cuối §13.3.

**Bài Engine chưa có mục Best Practice nào (56):**

- PostgreSQL: `e-pg-l3-01`, `e-pg-l3-02`, `e-pg-l3-03`, `e-pg-l3-12`, `e-pg-l3-13`, `e-pg-l3-14`, `e-pg-l4-04`, `e-pg-l4-05`, `e-pg-l4-10`, `e-pg-l4-11`, `e-pg-l4-12`, `e-pg-l4-13`, `e-pg-l4-14`, `e-pg-l4-15`, `e-pg-l5-01`, `e-pg-l5-02`, `e-pg-l5-05`, `e-pg-l5-06`, `e-pg-l5-08`, `e-pg-l5-09`, `e-pg-l5-12`, `e-pg-l5-13`, `e-pg-l5-15`.
- MongoDB: `e-mg-l1-02`, `e-mg-l1-04`, `e-mg-l1-05`, `e-mg-l1-11`, `e-mg-l2-02`, `e-mg-l2-03`, `e-mg-l2-09`, `e-mg-l2-15`, `e-mg-l3-03`, `e-mg-l3-04`, `e-mg-l3-10`, `e-mg-l3-13`, `e-mg-l3-15`, `e-mg-l3-16`, `e-mg-l3-17`, `e-mg-l4-08`, `e-mg-l4-10`, `e-mg-l4-12`, `e-mg-l5-01`, `e-mg-l5-02`, `e-mg-l5-09`, `e-mg-l5-10`.
- DynamoDB: `e-dy-l1-03`, `e-dy-l1-11`, `e-dy-l2-03`, `e-dy-l2-12`, `e-dy-l3-11`, `e-dy-l4-14`, `e-dy-l5-01`, `e-dy-l5-03`, `e-dy-l5-05`, `e-dy-l5-06`, `e-dy-l5-07`.

Phần lớn là bài bên trong engine (trang heap, WAL, B-tree nội tại, WiredTiger, election, Streams, global tables) hoặc capstone: chúng là kiến thức nền, không phải một luật "nên / không nên" viết được thành thẻ. Ứng viên cho vòng sau: lock và isolation (`e-pg-l4-10`…`e-pg-l4-14`: luật "giữ transaction ngắn", "lấy lock theo một thứ tự cố định để tránh deadlock"), change streams (`e-mg-l4-10`), Streams/TTL của DynamoDB.

## 13. Vòng 4: câu hỏi mở cho BP-T, nối bài Engine, phòng trưng bày lỗi

Theo L220 (chưa thêm track nội dung khi Engine chưa chơi được), vòng này **không thêm thẻ** và không sửa `content/engine/best/`. Mọi đo đạc chạy trong một thư mục tạm ngoài repo (`bp4/`, `package.json` riêng, `npm i --ignore-scripts`): PGlite 0.5.16, mingo 7.2.6, `@dynoxide/wasm-engine` 1.5.0.

Nguồn vòng 4 được tải bằng `curl` ngày 2026-11-20 (trang PostgreSQL 18, MongoDB manual, AWS developer guide), đổi sang chữ rồi tìm đúng câu. Câu trích nguyên văn ≤ 15 chữ; còn lại là diễn đạt lại.

### 13.1 Đề xuất cho BP-T (đóng §11.3–11.4)

#### 13.1.1 Trường `probe` cho thẻ index (thay "hai bảng cùng dữ liệu")

Runtime `engine` đã có sẵn hình dạng cần: `PgLabClient.run({ setup, extensions, steps })` (`src/engine/pglab/script.ts`, `v22-engine` `0ede43d`) dựng **một database mới mỗi lần gọi**, chạy `setup` từng câu, rồi chạy `steps` theo thứ tự. Vậy `probe` không cần runtime mới, chỉ cần parser ghép:

```yaml
pair:
  runtime: engine
  check: runs
  setup: |            # dữ liệu, một bảng; VACUUM/ANALYZE dùng chung đặt ở đây
    CREATE TABLE orders (id int PRIMARY KEY, store_id int NOT NULL, order_date date NOT NULL);
    INSERT INTO orders SELECT i, i % 20, DATE '2025-01-01' + (i * 7) % 670 FROM generate_series(1, 20000) AS i;
    ANALYZE orders;
  bad: |              # thiết kế "Không nên": một hoặc vài câu DDL (splitSql)
    CREATE INDEX orders_ix ON orders (order_date, store_id)
  good: |
    CREATE INDEX orders_ix ON orders (store_id, order_date)
  probe: |            # MỚI: một câu đọc, chạy sau bad và sau good
    SELECT count(*) AS orders FROM orders WHERE store_id = 3 AND order_date >= DATE '2026-01-01'
  expect: { compare: cost }
```

- **Luật chạy:** mỗi bên là một lần `run({ setup, steps: [...splitSql(side), probe] })` trên database mới, nên bản Đúng không bao giờ thấy index của bản Sai.
  - `compare: cost` hoặc `plan`: bước cuối là `EXPLAIN (FORMAT JSON) <probe>`.
  - `compare: size`: `probe` tự trả số byte.
  - Kết quả hiện ra là kết quả của `probe`. Câu DDL chỉ hiện ở khung mã.
- **Luật nội dung (test):**
  - `probe` chỉ có khi `runtime: engine | engine-hb`;
  - khi có `probe`, `bad`/`good` không được là câu đọc;
  - `probe` là đúng một câu.
- **Đã kiểm** (đổi I02–I06 sang một bảng + `probe`, chỉ trong `bp4/`, thẻ thật giữ nguyên):

| Thẻ | Sai | Đúng | Thẻ hai bảng hiện có (chạy lại cùng ngày) |
|---|---|---|---|
| I02 | Bitmap Heap Scan, cost 252,64 | Bitmap Heap Scan, cost 125,95 | Sai 252,64, Đúng 144,95: bản Đúng khác số (bảng thứ hai dựng bằng `CREATE TABLE AS` nên thống kê khác), cùng chiều Đúng < Sai |
| I03 | 163.840 byte | 16.384 byte (`probe` = `pg_relation_size('web_orders_ix')`, cùng tên index ở hai bên) | trùng số |
| I04 | Bitmap Heap Scan, cost 220,84 | Index Only Scan, cost 15,29 | trùng nút và cost |
| I05 | Seq Scan, cost 428 | Index Scan, cost 8,3 | trùng nút và cost (khi có `ANALYZE` sau index, xem dưới) |
| I06 | Seq Scan, cost 538 (bản Sai không có DDL: `bad` rỗng là hợp lệ) | Bitmap Heap Scan, cost 173,69 | trùng nút và cost |

- **Ba điều phải ghi vào luật:**
  - **I05:** index biểu thức cần `ANALYZE` **sau** `CREATE INDEX` (thống kê của biểu thức sinh lúc đó). Không có nó, bản Đúng là Bitmap Heap Scan cost 132,56 thay vì Index Scan cost 8,3. Nên `good` của I05 là `CREATE INDEX …; ANALYZE members`.
  - **I04:** `VACUUM ANALYZE` chạy một lần trong `setup` (trước mọi DDL), rồi `CREATE INDEX … INCLUDE` chạy **trong transaction** vẫn cho `Index Only Scan` cost 15,29, vì visibility map đã có từ `setup`. Vậy với `probe`, I04 xuống được `runtime: engine`, không cần `engine-hb`.
  - **Thời gian:**
    - mỗi lần "Chạy cả hai" dựng **hai database mới**, mỗi cái ≈ 0,5 s từ template (theo chú thích của `src/engine/pglab/session.ts`), rồi chạy `setup` ở mỗi bên;
    - dữ liệu chỉ còn một bảng; `setup` lâu nhất 727 ms (I06), không tính boot;
    - với hai bảng thì chỉ một database, nhưng `setup` gấp đôi dữ liệu.

#### 13.1.2 `expect.compare: rcu` cho thẻ DynamoDB

- **Nghĩa:** chạy hai request trên cùng lab đã seed, đọc `ConsumedCapacity.CapacityUnits` của mỗi bên. Thẻ qua khi bản Đúng **nhỏ hơn hẳn** bản Sai (`<`, không `≤`). Với `check: same`, `Items` hai bên còn phải bằng nhau (không xét thứ tự).
- **Không cần ghi `ReturnConsumedCapacity` trong thẻ:** `DynamoEngine.run` tự thêm `'TOTAL'` cho mọi op đọc/ghi (`CAPACITY` trong `src/engine/dynamo/engine.ts`). Thiếu nó thì dynoxide không trả `ConsumedCapacity` (đã thử: chỉ có `Count`/`ScannedCount`). Test nội dung chạy qua `DynamoEngine`, không gọi engine trần.
- **Chỉ một trang:** so một response, không theo `LastEvaluatedKey`. Thẻ phải giữ dữ liệu dưới 1 MB đọc mỗi request (D12), nếu không con số chỉ là trang đầu.
- **Đã kiểm dynoxide đúng công thức AWS** (cộng cỡ item, làm tròn lên 4 KB, eventually consistent = một nửa):

| Request | Eventually | Strongly |
|---|---|---|
| `Query` 10 item ≈ 1 KB | 1,5 | 3 |
| `Query` 10 item ≈ 5 KB | 6,5 | 13 |
| `Scan` cả bảng 20 item, `FilterExpression` giữ 10 | 7,5 | 15 |
| `GetItem` 1 item ≈ 5 KB | 1 | 2 |
| `Query` 10 item ≈ 5 KB, `Select: COUNT` | 6,5 | 13 |
| `Query` 10 item ≈ 5 KB, `Limit: 3` | 2 | 4 |

  Dòng `Select: COUNT` khớp D16 (đếm không làm đọc rẻ hơn); dòng `Limit` là cách duy nhất trong bảng làm giảm số đọc. `ReturnConsumedCapacity: 'INDEXES'` trả thêm khối `Table`, cùng tổng.
- **Nhãn trung thực:** số RCU là do dynoxide tính theo công thức, không phải hóa đơn AWS. Câu kết luận nên viết "dynoxide tính …", như nhãn §3.4 của thiết kế.

#### 13.1.3 Dữ liệu DynamoDB trong thẻ: đổi sang JSON thường

§11.3 ghi thẻ dùng giá trị **có kiểu** (`{"S": …}`) vì `DynamoEngine.seed()` gửi item thẳng vào `BatchWriteItem`. Đọc lại đường đi của `lab.setup`:

- Ở `v22-engine`, `seed()` không chuyển kiểu. Gửi item không kiểu thì dynoxide báo `EngineError: Unexpected value type in payload` (đã thử cả `PutItem` lẫn `BatchWriteItem`). Bài `L1/09-query-vs-scan.md` ghi item không kiểu nên **seed lỗi** trên nhánh đó.
- Nhánh tích hợp `engine-integrate` (L248) đã sửa: `src/engine/dynamo/runner.ts` có `labOf(setup)` đổi **JSON thường → DynamoDB JSON** cho mọi item (`marshal`: chuỗi `S`, số `N`, boolean `BOOL`, null `NULL`, mảng `L`, object `M`). Đây là đường bài Engine sẽ chạy.
- **Hệ quả:** nếu BP-T cho thẻ đi qua `labOf`, item có kiểu của thẻ sẽ bị bọc lần nữa: `{"S": "CUST#1"}` thành `{M: {S: {S: "CUST#1"}}}`. Đã thử ghi đúng item như vậy lên dynoxide: `BatchWriteItem` báo "The provided key element does not match the schema". Vậy seed sẽ lỗi.

**Đề xuất:**

1. `pair.setup` của `dynoxide` dùng **đúng định dạng bài Engine**: JSON thường, đi qua `labOf()`. Request `bad`/`good` giữ kiểu (`ExpressionAttributeValues` có kiểu), vì đó là thứ người chơi gõ và `parseRequest` đòi kiểu (`untyped`).
2. Đã kiểm sáu thẻ D hiện có: mọi giá trị chỉ là `S` và `N`, và `marshal(unmarshal(item))` trả lại đúng item cũ ở 100% item. Đổi định dạng không làm đổi dữ liệu được seed.
3. Cỡ: 33.926 → 27.544 byte thô cho `setup` của sáu thẻ. Gzip gần như không đổi (−2 đến −3%): kiểu lặp lại nén rất tốt.
4. Kiểu mà JSON thường không nói được (set `SS`/`NS`, binary `B`) chưa thẻ nào cần. Khi cần, thêm vào `labOf` một lối thoát rõ ràng (ví dụ `{"$dy": {"SS": [...]}}`). Đừng đoán kiểu từ hình dạng, vì đoán thì mảng chuỗi không biết là `L` hay `SS`.
5. Test nội dung: chạy `labOf(setup)` rồi seed thật. Đây cũng là test bắt được lỗi seed của bài `L1/09` trên `v22-engine`.

#### 13.1.4 Chia chunk `bpsql`/`bppg` để giữ ≤ 20 KB

Đo lại trên 40 thẻ (frontmatter đổi sang JSON cùng thân bài, gzip -9):

| Khu | Thẻ | Gzip cả nhóm | Mỗi thẻ (trong nhóm) | Mỗi thẻ (đứng một mình) |
|---|---|---|---|---|
| q | 13 | 12,1 KB | 0,93 KB | 1,54 KB |
| a | 5 | 5,7 KB | 1,14 KB | 1,59 KB |
| s | 4 | 4,8 KB | 1,21 KB | 1,60 KB |
| i | 5 | 5,7 KB | 1,14 KB | 1,70 KB |
| x | 1 | 1,7 KB | 1,67 KB | 1,67 KB |
| m | 6 | 7,0 KB | 1,16 KB | 1,70 KB |
| d | 6 | 9,1 KB | 1,51 KB | 2,19 KB |

- Trong một thẻ: câu kiểm chiếm ≈ 35%, thân bài ≈ 45%, `pair` 7–26% (DynamoDB nặng nhất vì dữ liệu `setup`). Tách theo ngôn ngữ cắt ≈ 40% (q: 12,1 → 7,1 KB chỉ VI).
- Dự phóng nếu mọi mục thành thẻ, theo hệ số trong nhóm:
  - Q 23 mục ≈ 21 KB, A 24 mục ≈ 27 KB: **mỗi khu đã quá 20**, gộp `bpsql` ≈ 41 KB;
  - S/I/P/X, tính cả vòng 4: 15 S + 9 I + 41 P + 10 X = 75 mục ≈ 85 KB.
  - Chia theo khu (`bpq`, `bpa`…) **không đủ**.

**Đề xuất: mỗi thẻ một chunk lười, cộng một chỉ mục nhỏ mỗi track.**

- `src/bestSources.ts` dùng `import.meta.glob('../content/engine/best/*/*.md', { query: '?raw', import: 'default' })` **không `eager`**.
  - Mỗi file thành một chunk lười, ≈ 1,5–2,2 KB gzip theo số đo dạng JSON ở trên; bản `?raw` (markdown thô) sẽ khác một chút.
  - Trang mục chỉ tải đúng thẻ đang mở.
- Loader Engine hiện có (`src/engineSources-pg.ts`, nhánh `content-qa2`) làm ngược lại: glob `eager: true` bên trong một module được `import()`, nên cả track là một chunk.
  - Đề xuất này chỉ đổi một cờ, nhưng **chưa build kiểm**.
  - BP-T phải build một lần và xem `dist` có đúng một chunk mỗi thẻ không, trước khi chốt L.
- Lưới và chip kỹ năng đọc một chỉ mục nhỏ `{ id, module, level, title, title_en, skills }`, sinh lúc build. Đo trên 40 thẻ: 2,5 KB gzip, ≈ 63 byte mỗi thẻ.
  - Một chỉ mục mỗi track **không đủ** cho PostgreSQL: 75 mục × 63 byte ≈ 4,7 KB, quá trần `bpindex` 4.
  - Đề xuất: một chỉ mục mỗi khu (`bpindex-q`, `bpindex-p`…; khu lớn nhất là P, 41 mục ≈ 2,6 KB). Cách khác: giữ một chỉ mục mỗi track và nâng trần lên 6.
- `check-budget.mjs`:
  - nhóm `bp` đo **thẻ lớn nhất** (trần 3 KB), không đo tổng;
  - nhóm `bpindex` đo từng track (trần 4);
  - như vậy trần không phải nâng khi thêm mục.
- Giá phải trả:
  - mỗi lần mở thẻ là một request nhỏ;
  - `dist` có thêm ≈ 1 file mỗi thẻ (precache của nhánh `v16-offline` cũng phải liệt kê chúng);
  - khác cách ticket (một chunk cho cả nhóm, L41). Ghi L mới, nói rõ vì sao: thẻ được mở lẻ từ chip, ticket thì đi theo chuỗi.
- **Phương án dự phòng**, nếu không muốn nhiều file: chunk theo khu **và** ngôn ngữ (`bpq-vi`, `bpq-en`…). Q-vi ≈ 13 KB, A-vi ≈ 18 KB: vừa trần nhưng sát. Khi đổi ngôn ngữ phải tải lại.

### 13.2 Mục mới (vòng 4): nối bài Engine bên trong engine với việc vận hành

Chọn theo một luật: mỗi cụm bài Engine chưa có mục (§12.9) được một mục **có nguồn chính thức nói đúng ý đó**, cộng các chủ đề vận hành được giao (checkpoint, `wal_compression`, vacuum cost, slot, WiredTiger cache, shard key, adaptive capacity). Mã tiếp nối, không đánh lại số cũ.

Đã bỏ vì không đạt chuẩn nguồn của §0:

- TOAST nén `lz4`: PGlite không có (`default_toast_compression = lz4` báo 22023). Bài TOAST được nối bằng Q09 (§13.3).
- `synchronous_commit` theo transaction: tài liệu có, nhưng bài WAL không nói tới nó.
- `insertMany` không thứ tự: trang tài liệu không nói nhanh hơn.
- Multikey không phủ được truy vấn: tài liệu MongoDB nay nói multikey **có thể** phủ, có điều kiện.
- Wildcard index không thay index theo tải: không tìm thấy câu đó trên trang.

Khối có dòng `-- Pxx bad/good` đã chạy bằng script đọc chính file này: PGlite mới cho mỗi khối, `(notx)` = ngoài transaction, còn lại trong `BEGIN … ROLLBACK`.

### P27 · Bảng rất lớn: xếp cột rộng cố định trước, cột hẹp sau / Order columns to avoid alignment padding

*(vòng 4)*

- **Luật:**
  - với bảng hàng chục triệu dòng, đặt cột 8 byte (`bigint`, `timestamptz`, `float8`) trước, rồi 4, 2, 1 byte, cột độ dài thay đổi cuối;
  - chỉ làm khi tạo bảng, không viết lại bảng đang chạy chỉ vì việc này.
- **Vì sao:** mỗi giá trị bắt đầu ở bội số căn lề của kiểu (`attalign`). Một `boolean` đứng trước `bigint` để lại 7 byte đệm trong **mỗi** dòng.
- **Nguồn:**
  - https://www.postgresql.org/docs/18/storage-page-layout.html (bố cục dòng, `attlen` và `attalign`)
  - https://www.postgresql.org/docs/18/catalog-pg-type.html (`typalign`)
- **Cấp:** L3 · **Nối với:** chưa có · **Kiểm:** PGlite `(notx)`, cùng 50.000 dòng cùng giá trị: Sai 3.833.856 byte, Đúng 3.014.656 byte (−21%)

```sql
-- P27 bad (notx)
CREATE TABLE ev_bad (flag_a boolean, id bigint, flag_b boolean, amount bigint, kind smallint, created_at timestamptz);
INSERT INTO ev_bad SELECT true, i, false, i * 10, 1, TIMESTAMPTZ '2026-01-01' + i * interval '1 minute' FROM generate_series(1, 50000) AS i;
SELECT pg_relation_size('ev_bad') AS table_bytes
```
```sql
-- P27 good (notx)
CREATE TABLE ev_good (id bigint, amount bigint, created_at timestamptz, kind smallint, flag_a boolean, flag_b boolean);
INSERT INTO ev_good SELECT i, i * 10, TIMESTAMPTZ '2026-01-01' + i * interval '1 minute', 1, true, false FROM generate_series(1, 50000) AS i;
SELECT pg_relation_size('ev_good') AS table_bytes
```

### P28 · Checkpoint theo giờ, không theo WAL đầy / Checkpoints should be timed, not forced by WAL volume

*(vòng 4)*

- **Luật:**
  - theo dõi `pg_stat_checkpointer`: `num_requested` (checkpoint do WAL đầy) tăng nhanh hơn `num_timed` là dấu hiệu `max_wal_size` quá nhỏ;
  - đọc log `checkpoint_warning`. Tài liệu nói cảnh báo này gợi ý `max_wal_size` "ought to be raised";
  - giữ `checkpoint_completion_target` mặc định 0,9.
- **Vì sao:**
  - mặc định `checkpoint_timeout` 5 phút, `max_wal_size` 1 GB;
  - checkpoint dồn dập ghi nhiều trang bẩn hơn;
  - checkpoint dồn dập cũng ghi nhiều full-page image hơn, vì lần sửa đầu sau mỗi checkpoint ghi cả trang (P29);
  - đổi lại: khoảng cách lớn làm khôi phục sau sự cố lâu hơn.
- **Nguồn:**
  - https://www.postgresql.org/docs/18/wal-configuration.html
  - https://www.postgresql.org/docs/18/runtime-config-wal.html#GUC-CHECKPOINT-WARNING
  - https://www.postgresql.org/docs/18/monitoring-stats.html#MONITORING-PG-STAT-CHECKPOINTER-VIEW (`num_timed`, `num_requested`; view có từ PostgreSQL 17)
- **Cấp:** L4 · **Nối với:** chưa có · **Kiểm:** PGlite `(notx)` chỉ khối Đúng: câu đọc chạy được (`num_timed` 0, `num_requested` 0: PGlite chạy một tiến trình, không có checkpointer định kỳ). Đổi cấu hình là cú pháp

```sql
-- P28 bad (syntax)
-- postgresql.conf trên máy ghi nhiều: max_wal_size = 256MB, nên checkpoint bị ép vài chục giây một lần
ALTER SYSTEM SET max_wal_size = '256MB'
```
```sql
-- P28 good (notx)
CHECKPOINT;
SELECT num_timed, num_requested FROM pg_stat_checkpointer
```

### P29 · Bật `wal_compression` khi WAL bị full-page image chiếm phần lớn / Compress full-page images in WAL

*(vòng 4)*

- **Luật:** trên máy ghi nhiều (nhân bản, sao lưu WAL), bật `wal_compression` (`pglz`, hoặc `lz4`/`zstd` nếu bản build có), đo lượng WAL trước và sau.
- **Vì sao:**
  - sau mỗi checkpoint, lần sửa đầu của một trang ghi cả trang vào WAL;
  - `wal_compression` nén chính các ảnh trang đó, giảm WAL cần ghi, gửi và lưu;
  - tài liệu: nén "without increasing the risk of unrecoverable data corruption", đổi lại tốn CPU;
  - mặc định `off`.
- **Nguồn:** https://www.postgresql.org/docs/18/runtime-config-wal.html#GUC-WAL-COMPRESSION
- **Phiên bản (vòng 5):** PostgreSQL 19: `wal_compression = on` tự chọn phương pháp nén tốt nhất có sẵn (bản 18: `on` = `pglz`).
- **Cấp:** L5 · **Nối với:** chưa có · **Kiểm:** PGlite `(notx)`, cùng một `UPDATE` 400 dòng ngay sau `CHECKPOINT`: Sai 3.205.032 byte WAL, Đúng 691.464 byte (−78%; vòng 5 đo 691.440, WAL lệch vài chục byte giữa các lần chạy). PGlite 0.5.16 chỉ có `pglz` (`lz4` báo 22023)

```sql
-- P29 bad (notx)
CREATE TABLE w (id int PRIMARY KEY, a int, pad text);
INSERT INTO w SELECT i, i, repeat('abc', 30) FROM generate_series(1, 20000) AS i;
SET wal_compression = off;
CHECKPOINT;
CREATE TABLE lsn (at pg_lsn);
INSERT INTO lsn SELECT pg_current_wal_lsn();
UPDATE w SET a = a + 1 WHERE id % 50 = 0;
SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), at) AS wal_bytes FROM lsn
```
```sql
-- P29 good (notx)
CREATE TABLE w (id int PRIMARY KEY, a int, pad text);
INSERT INTO w SELECT i, i, repeat('abc', 30) FROM generate_series(1, 20000) AS i;
SET wal_compression = pglz;
CHECKPOINT;
CREATE TABLE lsn (at pg_lsn);
INSERT INTO lsn SELECT pg_current_wal_lsn();
UPDATE w SET a = a + 1 WHERE id % 50 = 0;
SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), at) AS wal_bytes FROM lsn
```

### P30 · Nâng `work_mem` cho một câu nặng bằng `SET LOCAL`, không nâng toàn cục / Raise work_mem per query, not globally

*(vòng 4)*

- **Luật:**
  - báo cáo nặng (gom nhóm, sort lớn): `SET LOCAL work_mem = '64MB'` trong transaction của câu đó;
  - giữ mặc định toàn cục nhỏ.
- **Vì sao:**
  - `work_mem` (mặc định 4 MB) là trần **cho từng** node sort/hash;
  - tài liệu: một câu có thể dùng "several sort and hash operations" cùng lúc, nhân với số phiên;
  - nâng toàn cục có thể làm hết RAM;
  - nâng cho một câu đổi được kế hoạch: hash trong bộ nhớ thay vì sort.
- **Nguồn:**
  - https://www.postgresql.org/docs/18/runtime-config-resource.html#GUC-WORK-MEM
  - https://www.postgresql.org/docs/18/sql-set.html
- **Cấp:** L3 · **Nối với:** chưa có · **Kiểm:** PGlite, cùng câu gom 200.000 khóa khác nhau:
  - Sai (4 MB): `Sort` + `GroupAggregate` (planner không dám hash);
  - Đúng: `HashAggregate`, 1 batch, `Disk Usage` 0;
  - Kế hoạch, Sai ≠ Đúng.

```sql
-- P30 bad
CREATE TABLE big (id int, k text);
INSERT INTO big SELECT i, md5(i::text) || md5((-i)::text) FROM generate_series(1, 200000) AS i;
ANALYZE big;
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF, FORMAT JSON) SELECT k, count(*) AS n FROM big GROUP BY k
```
```sql
-- P30 good
CREATE TABLE big (id int, k text);
INSERT INTO big SELECT i, md5(i::text) || md5((-i)::text) FROM generate_series(1, 200000) AS i;
ANALYZE big;
SET LOCAL work_mem = '64MB';
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF, FORMAT JSON) SELECT k, count(*) AS n FROM big GROUP BY k
```

### P31 · `enable_*` chỉ để chẩn đoán, sửa thống kê mới là cách thật / enable_* is for diagnosis; fix the statistics

*(vòng 4)*

- **Luật:**
  - `SET enable_seqscan = off` (hay `enable_nestloop`, `enable_hashjoin`…) chỉ dùng để thử "nếu planner chọn đường kia thì cost bao nhiêu";
  - đừng để trong ứng dụng hay trong `postgresql.conf`;
  - sửa gốc: `ANALYZE`, statistics target theo cột (P20), thống kê mở rộng (P09), cost constants.
- **Vì sao:**
  - tài liệu gọi các cờ này là "a crude method", chỉ là "a temporary solution";
  - chúng đúng cho câu hôm nay nhưng ép sai khi dữ liệu đổi.
- **Nguồn:** https://www.postgresql.org/docs/18/runtime-config-query.html#RUNTIME-CONFIG-QUERY-ENABLE
- **Cấp:** L4 · **Nối với:** chưa có · **Kiểm:** PGlite, câu đọc cả bảng 20.000 dòng: Sai (`enable_seqscan = off`) Bitmap Heap Scan cost 620,3; Đúng (để planner chọn) Seq Scan cost 389,01. Cost Đúng < Sai

```sql
-- P31 bad
CREATE TABLE t32 (id int PRIMARY KEY, grp int NOT NULL);
INSERT INTO t32 SELECT i, i % 2 FROM generate_series(1, 20000) AS i;
CREATE INDEX t32_grp_ix ON t32 (grp);
ANALYZE t32;
SET LOCAL enable_seqscan = off;
EXPLAIN (FORMAT JSON) SELECT count(*) FROM t32 WHERE grp >= 0
```
```sql
-- P31 good
CREATE TABLE t32 (id int PRIMARY KEY, grp int NOT NULL);
INSERT INTO t32 SELECT i, i % 2 FROM generate_series(1, 20000) AS i;
CREATE INDEX t32_grp_ix ON t32 (grp);
ANALYZE t32;
EXPLAIN (FORMAT JSON) SELECT count(*) FROM t32 WHERE grp >= 0
```

### P32 · Khóa nhiều dòng theo một thứ tự cố định / Lock rows in one consistent order

*(vòng 4)*

- **Luật:**
  - mọi đoạn code sửa nhiều dòng cùng lúc (chuyển tiền, giữ hàng) khóa theo cùng thứ tự: `SELECT … WHERE id IN (…) ORDER BY id FOR UPDATE`;
  - lấy ngay mức khóa mạnh nhất sẽ cần;
  - giữ transaction ngắn (P03).
- **Vì sao:**
  - hai transaction khóa A rồi B và B rồi A sẽ chờ nhau, tới khi Postgres phát hiện deadlock và hủy một bên (`40P01`);
  - tài liệu: cách phòng tốt nhất là lấy khóa "in a consistent order".
- **Nguồn:** https://www.postgresql.org/docs/18/explicit-locking.html#LOCKING-DEADLOCKS
- **Cấp:** L4 · **Nối với:** chưa có · **Kiểm:** cú pháp (cần hai phiên; PGlite chỉ có một)

```sql
-- P32 bad (syntax)
-- phiên 1: UPDATE accounts SET balance = balance - 100 WHERE id = 2; rồi id = 1
-- phiên 2: UPDATE accounts SET balance = balance - 100 WHERE id = 1; rồi id = 2
UPDATE accounts SET balance = balance - 100 WHERE id = 2
```
```sql
-- P32 good (syntax)
SELECT id FROM accounts WHERE id IN (1, 2) ORDER BY id FOR UPDATE
```

### P33 · Hàng đợi trong bảng: `FOR UPDATE SKIP LOCKED` / Queue tables: FOR UPDATE SKIP LOCKED

*(vòng 4)*

- **Luật:** nhiều worker lấy việc từ một bảng thì mỗi worker lấy `… ORDER BY id LIMIT 10 FOR UPDATE SKIP LOCKED`, không `FOR UPDATE` trần (mọi worker xếp hàng chờ cùng dòng) và không đọc rồi `UPDATE` (hai worker nhận cùng việc).
- **Vì sao:** `SKIP LOCKED` bỏ qua dòng đang bị worker khác khóa nên các worker lấy việc khác nhau mà không chờ. Tài liệu nói rõ kết quả là một cái nhìn không nhất quán, hợp cho hàng đợi, không hợp cho báo cáo.
- **Nguồn:** https://www.postgresql.org/docs/18/sql-select.html#SQL-FOR-UPDATE-SHARE
- **Cấp:** L4 · **Nối với:** chưa có · **Kiểm:** cú pháp (cần hai phiên)

```sql
-- P33 bad (syntax)
SELECT id FROM jobs WHERE status = 'new' ORDER BY id LIMIT 10 FOR UPDATE
```
```sql
-- P33 good (syntax)
SELECT id FROM jobs WHERE status = 'new' ORDER BY id LIMIT 10 FOR UPDATE SKIP LOCKED
```

### P34 · Dùng `REPEATABLE READ`/`SERIALIZABLE` thì phải thử lại khi gặp `40001` / Retry serialization failures

*(vòng 4)*

- **Luật:**
  - code chạy ở `REPEATABLE READ` hoặc `SERIALIZABLE` phải bắt `40001` (`serialization_failure`) và chạy lại **cả transaction** từ đầu, có giới hạn số lần;
  - không chỉ chạy lại câu lỗi.
- **Vì sao:**
  - hai mức này hủy transaction thay vì để xảy ra bất thường (write skew, lost update);
  - tài liệu: ứng dụng "must be prepared to retry transactions";
  - transaction chỉ đọc thì không bao giờ gặp xung đột này.
- **Nguồn:** https://www.postgresql.org/docs/18/transaction-iso.html; `40001` = `serialization_failure`: https://www.postgresql.org/docs/18/errcodes-appendix.html#ERRCODES-TABLE
- **Cấp:** L4 · **Nối với:** chưa có · **Kiểm:** cú pháp (cần hai phiên đồng thời)

```sql
-- P34 bad (syntax)
-- ứng dụng: gặp lỗi 40001 thì báo lỗi cho người dùng, hoặc chỉ chạy lại câu UPDATE cuối
BEGIN ISOLATION LEVEL SERIALIZABLE
```
```sql
-- P34 good (syntax)
-- ứng dụng: vòng lặp tối đa N lần; gặp 40001 thì ROLLBACK rồi chạy lại từ BEGIN
BEGIN ISOLATION LEVEL SERIALIZABLE
```

### P35 · Báo cáo nhiều câu: một snapshot `REPEATABLE READ READ ONLY` / One snapshot for a multi-query report

*(vòng 4)*

- **Luật:** báo cáo gồm nhiều câu (tổng, chi tiết, tỷ lệ) chạy trong một `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY`, để mọi câu thấy cùng dữ liệu.
- **Vì sao:**
  - ở `READ COMMITTED` (mặc định), mỗi câu thấy dữ liệu mới nhất nên tổng và chi tiết có thể lệch nhau khi có người đang ghi;
  - `REPEATABLE READ` thấy một snapshot từ câu đầu tiên;
  - `READ ONLY` không bao giờ cần thử lại (P34).
- **Nguồn:** https://www.postgresql.org/docs/18/transaction-iso.html#XACT-REPEATABLE-READ
- **Cấp:** L3 · **Nối với:** skill `aggregate` (gần A06 đối chiếu tổng kiểm) · **Kiểm:** cú pháp (khác biệt chỉ thấy khi có phiên thứ hai ghi xen vào)

```sql
-- P35 bad (syntax)
-- hai câu riêng, mỗi câu một snapshot
SELECT sum(total) FROM orders WHERE order_date >= DATE '2026-10-01'
```
```sql
-- P35 good (syntax)
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY
```

### P36 · Khóa tư vấn: dùng bản theo transaction / Prefer transaction-level advisory locks

*(vòng 4)*

- **Luật:**
  - dùng `pg_advisory_xact_lock(key)` (tự nhả khi transaction kết thúc);
  - chỉ dùng `pg_advisory_lock` (theo phiên) khi thật sự cần giữ qua nhiều transaction, và luôn `pg_advisory_unlock`;
  - sau pooler theo transaction (P23), khóa theo phiên gần như luôn sai;
  - đừng gọi hàm khóa trong câu có `LIMIT`: không chắc `LIMIT` áp trước khi hàm chạy.
- **Vì sao:** tài liệu: khóa theo phiên "do not honor transaction semantics": `ROLLBACK` không nhả nó.
- **Nguồn:** https://www.postgresql.org/docs/18/explicit-locking.html#ADVISORY-LOCKS; hàm `pg_advisory_*`: https://www.postgresql.org/docs/18/functions-admin.html#FUNCTIONS-ADVISORY-LOCKS
- **Cấp:** L4 · **Nối với:** chưa có · **Kiểm:** PGlite `(notx)`, Sai ≠ Đúng: sau `ROLLBACK`, Sai còn 1 khóa trong `pg_locks`, Đúng còn 0

```sql
-- P36 bad (notx)
BEGIN;
SELECT pg_advisory_lock(42);
ROLLBACK;
SELECT count(*) AS advisory_locks_held FROM pg_locks WHERE locktype = 'advisory'
```
```sql
-- P36 good (notx)
BEGIN;
SELECT pg_advisory_xact_lock(42);
ROLLBACK;
SELECT count(*) AS advisory_locks_held FROM pg_locks WHERE locktype = 'advisory'
```

### P37 · Hàm tự viết: khai `PARALLEL SAFE` khi đúng là an toàn / Label safe functions PARALLEL SAFE

*(vòng 4)*

- **Luật:**
  - hàm chỉ tính toán (không ghi, không dùng sequence, không đổi cấu hình) thì khai `PARALLEL SAFE`;
  - hàm đọc bảng tạm hay trạng thái phiên thì `PARALLEL RESTRICTED`;
  - không khai bừa: khai sai có thể cho lỗi hoặc kết quả sai.
- **Vì sao:**
  - mặc định là `PARALLEL UNSAFE`;
  - tài liệu: một hàm như vậy trong câu "forces a serial execution plan";
  - một hàm định dạng tiền nhỏ có thể tắt truy vấn song song của cả báo cáo lớn.
- **Nguồn:**
  - https://www.postgresql.org/docs/18/parallel-safety.html
  - https://www.postgresql.org/docs/18/sql-createfunction.html
- **Cấp:** L4 · **Nối với:** chưa có · **Kiểm:** PGlite, Sai ≠ Đúng: `pg_proc.proparallel` Sai `u`, Đúng `s`. PGlite không có worker song song (`max_parallel_workers_per_gather` = 0) nên không đo được kế hoạch

```sql
-- P37 bad
CREATE FUNCTION net_price(p numeric) RETURNS numeric LANGUAGE sql IMMUTABLE AS $$ SELECT round(p / 1.1, 2) $$;
SELECT proparallel FROM pg_proc WHERE proname = 'net_price'
```
```sql
-- P37 good
CREATE FUNCTION net_price(p numeric) RETURNS numeric LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$ SELECT round(p / 1.1, 2) $$;
SELECT proparallel FROM pg_proc WHERE proname = 'net_price'
```

### P38 · BRIN chỉ cho cột tương quan với thứ tự vật lý: kiểm `correlation` trước / Check correlation before choosing BRIN

*(vòng 4)*

- **Luật:**
  - trước khi tạo BRIN, xem `pg_stats.correlation` của cột;
  - gần ±1 (thời điểm ghi của bảng chỉ thêm vào cuối) thì BRIN hợp;
  - gần 0 thì BRIN gần như vô ích, dùng B-tree.
- **Vì sao:**
  - BRIN chỉ lưu min/max mỗi khoảng khối;
  - tài liệu: BRIN dành cho cột có "natural correlation with their physical location";
  - cột rải ngẫu nhiên làm mọi khoảng khối đều "có thể khớp".
- **Nguồn:**
  - https://www.postgresql.org/docs/18/brin.html
  - https://www.postgresql.org/docs/18/view-pg-stats.html (`correlation`)
- **Cấp:** L5 · **Nối với:** chưa có · **Kiểm:** PGlite, Sai ≠ Đúng, cùng bảng 50.000 dòng: `correlation` của `device` (Sai) 0,00, của `read_at` (Đúng) 1,00

```sql
-- P38 bad
CREATE TABLE readings (id int, read_at timestamptz, device int);
INSERT INTO readings SELECT i, TIMESTAMPTZ '2026-01-01' + i * interval '1 minute', (i * 7919) % 1000 FROM generate_series(1, 50000) AS i;
ANALYZE readings;
SELECT round(correlation::numeric, 2) AS correlation FROM pg_stats WHERE tablename = 'readings' AND attname = 'device'
```
```sql
-- P38 good
CREATE TABLE readings (id int, read_at timestamptz, device int);
INSERT INTO readings SELECT i, TIMESTAMPTZ '2026-01-01' + i * interval '1 minute', (i * 7919) % 1000 FROM generate_series(1, 50000) AS i;
ANALYZE readings;
SELECT round(correlation::numeric, 2) AS correlation FROM pg_stats WHERE tablename = 'readings' AND attname = 'read_at'
```

### P39 · Giữ data checksums bật và kiểm index định kỳ bằng `amcheck` / Keep checksums on, run amcheck

*(vòng 4)*

- **Luật:**
  - đừng tắt data checksums: PostgreSQL 18 bật sẵn khi `initdb`, chỉ tắt bằng `--no-data-checksums`;
  - chạy `bt_index_check` định kỳ (và trước/sau nâng cấp hệ điều hành hay đổi locale) trên index quan trọng;
  - `heapallindexed => true` để kiểm cả việc mọi dòng có trong index.
- **Vì sao:**
  - checksum bắt hỏng do đĩa, cái mà nếu không thì "would otherwise be silent";
  - `amcheck` bắt index hỏng logic (ví dụ thứ tự sort đổi sau khi đổi thư viện collation);
  - `bt_index_check` chỉ lấy `AccessShareLock`, như một `SELECT`.
- **Nguồn:**
  - https://www.postgresql.org/docs/18/app-initdb.html (`--no-data-checksums`)
  - https://www.postgresql.org/docs/18/amcheck.html
- **Cấp:** L5 · **Nối với:** chưa có · **Kiểm:** PGlite, khối Đúng chạy được: `bt_index_check` không báo lỗi, `data_checksums` = `on`

```sql
-- P39 bad (syntax)
-- initdb --no-data-checksums, và không bao giờ kiểm index
SHOW data_checksums
```
```sql
-- P39 good
CREATE EXTENSION amcheck;
CREATE TABLE acct (id int PRIMARY KEY, name text);
INSERT INTO acct SELECT i, 'a' || i FROM generate_series(1, 5000) AS i;
SELECT bt_index_check(index => 'acct_pkey'::regclass, heapallindexed => true);
SELECT 'acct_pkey' AS index_checked, current_setting('data_checksums') AS data_checksums
```

### P40 · Vệ sinh replication slot: trần WAL, cảnh báo slot nằm im / Replication slot hygiene

*(vòng 4)*

- **Luật:**
  - đặt `max_slot_wal_keep_size` (mặc định `-1` = giữ WAL không giới hạn) để một slot bỏ quên không làm đầy đĩa;
  - cảnh báo theo `pg_replication_slots`: `wal_status` khác `reserved`, `inactive_since` quá lâu;
  - PostgreSQL 18 có `idle_replication_slot_timeout` (mặc định 0 = tắt) để tự vô hiệu slot nằm im;
  - xóa slot không còn ai dùng bằng `pg_drop_replication_slot`.
- **Vì sao:**
  - slot giữ WAL cho tới khi bên nhận đọc xong;
  - bên nhận chết thì WAL dồn mãi tới khi máy chính hết đĩa và dừng;
  - có trần thì slot thành `lost` thay vì làm sập máy chính.
- **Nguồn:**
  - https://www.postgresql.org/docs/18/runtime-config-replication.html#GUC-MAX-SLOT-WAL-KEEP-SIZE
  - https://www.postgresql.org/docs/18/view-pg-replication-slots.html
  - https://www.postgresql.org/docs/18/functions-admin.html#FUNCTIONS-REPLICATION (`pg_drop_replication_slot`)
- **Cấp:** L5 · **Nối với:** chưa có · **Kiểm:** cú pháp (PGlite không có nhân bản)

```sql
-- P40 bad (syntax)
SELECT slot_name, active FROM pg_replication_slots
```
```sql
-- P40 good (syntax)
SELECT slot_name, active, wal_status, safe_wal_size, inactive_since
FROM pg_replication_slots
WHERE wal_status <> 'reserved' OR inactive_since < now() - interval '1 hour'
```

### P41 · Autovacuum chậm hơn tốc độ rác: nâng giới hạn cost, đừng tắt / Let autovacuum keep up: tune its cost limit

*(vòng 4)*

- **Luật:**
  - khi bảng lớn luôn có nhiều dòng chết dù autovacuum vẫn chạy, nâng `autovacuum_vacuum_cost_limit` (mặc định `-1` = dùng `vacuum_cost_limit` 200), toàn cục hoặc theo bảng;
  - giữ `autovacuum_vacuum_cost_delay` nhỏ (mặc định 2 ms).
  - Không tắt autovacuum (P03).
- **Vì sao:**
  - autovacuum tự hãm: tích đủ "cost" thì ngủ;
  - giới hạn được **chia đều** cho các worker đang chạy, nên thêm worker không làm nhanh hơn;
  - nâng giới hạn là cách cho autovacuum làm nhiều việc hơn trước mỗi lần ngủ; đo bằng số dòng chết trong `pg_stat_user_tables` trước và sau (gần P10).
- **Nguồn:** https://www.postgresql.org/docs/18/runtime-config-vacuum.html#RUNTIME-CONFIG-RESOURCE-VACUUM-COST; `pg_stat_user_tables`: https://www.postgresql.org/docs/18/monitoring-stats.html#MONITORING-PG-STAT-ALL-TABLES-VIEW
- **Phiên bản (vòng 5):** PostgreSQL 19: leader và worker của VACUUM song song dùng chung `vacuum_cost_limit` (trước đây mỗi worker tính riêng), nên VACUUM song song có thể chậm hơn bản 18 với cùng cấu hình.
- **Cấp:** L4 · **Nối với:** chưa có · **Kiểm:** cú pháp (PGlite không có autovacuum chạy nền)

```sql
-- P41 bad (syntax)
ALTER TABLE events SET (autovacuum_enabled = false)
```
```sql
-- P41 good (syntax)
ALTER TABLE events SET (autovacuum_vacuum_cost_limit = 2000, autovacuum_vacuum_scale_factor = 0.01)
```

### S15 · Khoảng thời gian không được chồng nhau: exclusion constraint / Use an exclusion constraint for non-overlapping ranges

*(vòng 4)*

- **Luật:**
  - lịch đặt phòng, ca trực, giá hiệu lực theo kỳ: lưu khoảng bằng kiểu range (`tstzrange`, `daterange`) và cấm chồng bằng `EXCLUDE USING gist (… WITH &&)`;
  - có thêm cột bằng nhau (phòng, xe) thì cần `btree_gist`;
  - đừng kiểm "chưa ai đặt" bằng `SELECT` trong ứng dụng.
- **Vì sao:**
  - `CHECK` chỉ xem một dòng, không so được với dòng khác;
  - kiểm trong ứng dụng thì hai phiên cùng thấy "trống" rồi cùng ghi;
  - exclusion constraint đặt luật vào index GiST, nên database chặn cả khi ghi đồng thời.
- **Nguồn:**
  - https://www.postgresql.org/docs/18/ddl-constraints.html#DDL-CONSTRAINTS-EXCLUSION
  - https://www.postgresql.org/docs/18/rangetypes.html#RANGETYPES-CONSTRAINT
- **Cấp:** L3 · **Nối với:** chưa có · **Kiểm:** PGlite: Sai nhận hai lần đặt chồng (2 dòng), Đúng báo lỗi `23P01` ở lần thứ hai

```sql
-- S15 bad
CREATE TABLE bookings (room int NOT NULL, during tstzrange NOT NULL, CHECK (NOT isempty(during)));
INSERT INTO bookings VALUES (1, '[2026-11-20 09:00+07, 2026-11-20 11:00+07)');
INSERT INTO bookings VALUES (1, '[2026-11-20 10:00+07, 2026-11-20 12:00+07)');
SELECT count(*) AS bookings FROM bookings
```
```sql
-- S15 good
CREATE TABLE bookings (room int NOT NULL, during tstzrange NOT NULL, EXCLUDE USING gist (during WITH &&));
INSERT INTO bookings VALUES (1, '[2026-11-20 09:00+07, 2026-11-20 11:00+07)');
INSERT INTO bookings VALUES (1, '[2026-11-20 10:00+07, 2026-11-20 12:00+07)');
SELECT count(*) AS bookings FROM bookings
```

### M28 · Upsert phải có unique index trên trường lọc / Upserts need a unique index on the filter fields

*(vòng 4)*

- **Luật:** `updateOne(filter, update, { upsert: true })` thì các trường trong `filter` phải có unique index.
- **Vì sao:**
  - hai upsert đồng thời cùng không thấy tài liệu nào, nên cả hai cùng chèn: dữ liệu trùng;
  - tài liệu: "To avoid multiple upserts, ensure that the filter field(s) are uniquely indexed";
  - với unique index, bên thua nhận lỗi trùng khóa và thử lại được.
- **Nguồn:** https://www.mongodb.com/docs/manual/reference/method/db.collection.updateone/
- **Cấp:** L2 · **Nối với:** chưa có · **Kiểm:** cú pháp (cần hai client và index; mingo không có cả hai)

```js
// M28 bad (syntax)
db.stock.updateOne({ sku: 'TEA-01', store: 'S1' }, { $inc: { qty: 5 } }, { upsert: true })
```
```js
// M28 good (syntax)
db.stock.createIndex({ sku: 1, store: 1 }, { unique: true })
db.stock.updateOne({ sku: 'TEA-01', store: 'S1' }, { $inc: { qty: 5 } }, { upsert: true })
```

### M29 · Chuỗi bắt đầu bằng `$` trong pipeline: bọc `$literal` / Wrap $-strings in $literal

*(vòng 4)*

- **Luật:** trong aggregation pipeline (kể cả update bằng pipeline), giá trị chữ có thể bắt đầu bằng `$` (mã giảm giá, chữ người dùng nhập) phải bọc `{ $literal: … }`.
- **Vì sao:**
  - trong biểu thức, chuỗi bắt đầu bằng `$` là **đường dẫn trường**;
  - `'$5 off'` được hiểu là trường `5 off`; trường đó không có nên giá trị biến mất, không báo lỗi.
- **Nguồn:** https://www.mongodb.com/docs/manual/reference/operator/aggregation/literal/
- **Cấp:** L2 · **Nối với:** chưa có · **Kiểm:** mingo, dữ liệu dưới; Sai ≠ Đúng:
  - Sai `[{"name":"Tea"}]` (mất `promo`);
  - Đúng `[{"name":"Tea","promo":"$5 off"}]`.

```js
// M29 bad
db.products.aggregate([{ $match: { _id: 1 } }, { $set: { promo: '$5 off' } }, { $project: { _id: 0, name: 1, promo: 1 } }])
```
```js
// M29 good
db.products.aggregate([{ $match: { _id: 1 } }, { $set: { promo: { $literal: '$5 off' } } }, { $project: { _id: 0, name: 1, promo: 1 } }])
```

Dữ liệu cho M29–M30: `products` = `{ _id: 1, name: 'Tea', price: 30000 }`, `{ _id: 2, name: 'Cake', price: 45000 }`, `{ _id: 3, name: 'Gift box', price: 450000 }`.

### M30 · `$bucket` luôn khai `default` / Always give $bucket a default

*(vòng 4)*

- **Luật:** `$bucket` trên dữ liệu thật luôn có `default: 'other'` (hoặc ranh giới chắc chắn phủ mọi giá trị, kể cả null và kiểu lạ).
- **Vì sao:**
  - thiếu `default`, mỗi tài liệu phải rơi vào một khoảng, không thì cả báo cáo lỗi;
  - một đơn giá bất thường làm hỏng cả dashboard;
  - `$bucket` cũng bỏ khoảng không có tài liệu: muốn đủ mọi khoảng thì ghép với danh sách khoảng (như trục ngày A01).
- **Nguồn:** https://www.mongodb.com/docs/manual/reference/operator/aggregation/bucket/
- **Cấp:** L2 · **Nối với:** skill `case_when` (cùng ý "nhánh còn lại") · **Kiểm:** mingo:
  - Sai báo lỗi (`$bucket require a default for out of range values`);
  - Đúng trả 3 nhóm: `0`, `40000`, `other`.

```js
// M30 bad
db.products.aggregate([{ $bucket: { groupBy: '$price', boundaries: [0, 40000, 200000] } }])
```
```js
// M30 good
db.products.aggregate([{ $bucket: { groupBy: '$price', boundaries: [0, 40000, 200000], default: 'other' } }])
```

### M31 · Đọc `explain('executionStats')`: so tài liệu đã xét với tài liệu trả về / Compare examined vs returned

*(vòng 4)*

- **Luật:** với câu chậm, chạy `explain('executionStats')` và so `totalDocsExamined`, `totalKeysExamined` với `nReturned`:
  - `COLLSCAN` hoặc docs xét gấp nhiều lần docs trả là thiếu index đúng (M07);
  - `totalKeysExamined` = 0 là không dùng index.
- **Vì sao:** tài liệu lấy ví dụ quét 21.349 tài liệu để trả 3.809, rồi sửa bằng index. Đây là con số không phụ thuộc máy, như cost của Postgres (P01).
- **Nguồn:** https://www.mongodb.com/docs/manual/tutorial/analyze-query-plan/
- **Cấp:** L3 · **Nối với:** chưa có · **Kiểm:** cú pháp (mingo không có index hay explain)

```js
// M31 bad (syntax)
db.orders.find({ status: 'PAID', store: 'S1' })
```
```js
// M31 good (syntax)
db.orders.find({ status: 'PAID', store: 'S1' }).explain('executionStats')
```

### M32 · Index có collation chỉ phục vụ truy vấn cùng collation / Queries must use the index's collation

*(vòng 4)*

- **Luật:**
  - so chuỗi không phân biệt hoa thường bằng collation thì tạo index **với cùng collation** và gửi truy vấn kèm đúng collation đó;
  - hoặc đặt collation mặc định cho collection.
- **Vì sao:** tài liệu: "an operation must also specify the same collation"; khác collation thì index không dùng được cho so chuỗi, truy vấn âm thầm quét cả collection.
- **Nguồn:** https://www.mongodb.com/docs/manual/reference/collation/
- **Cấp:** L3 · **Nối với:** chưa có · **Kiểm:** cú pháp (mingo không có index)

```js
// M32 bad (syntax)
db.customers.createIndex({ city: 1 }, { collation: { locale: 'vi', strength: 2 } })
db.customers.find({ city: 'da nang' })
```
```js
// M32 good (syntax)
db.customers.createIndex({ city: 1 }, { collation: { locale: 'vi', strength: 2 } })
db.customers.find({ city: 'da nang' }).collation({ locale: 'vi', strength: 2 })
```

### M33 · Đừng `hint` index sparse khi cần đủ tài liệu / Never hint a sparse index for complete results

*(vòng 4)*

- **Luật:**
  - không dùng `hint()` trỏ tới index sparse (hay partial) cho truy vấn hoặc `count()` cần mọi tài liệu;
  - muốn đếm nhanh tập con thì viết điều kiện khớp đúng tập con đó.
- **Vì sao:**
  - MongoDB tự tránh index sparse khi nó cho kết quả thiếu;
  - nhưng tài liệu nói `hint()` sparse với `count()` rỗng vẫn dùng index "even if the sparse index results in an incorrect count".
- **Nguồn:** https://www.mongodb.com/docs/manual/core/index-sparse/
- **Cấp:** L3 · **Nối với:** chưa có · **Kiểm:** cú pháp (mingo không có index)

```js
// M33 bad (syntax)
db.movies.find().hint({ rated: 1 }).count()
```
```js
// M33 good (syntax)
db.movies.countDocuments({})
```

### M34 · Đọc ngay sau ghi trên secondary: causally consistent session với `majority` / Read your writes with a causal session

*(vòng 4)*

- **Luật:**
  - khi một luồng ghi rồi đọc lại (có thể từ secondary), dùng một session `causalConsistency: true` với read concern và write concern đều `majority`;
  - không trộn đọc/ghi ngoài session.
- **Vì sao:**
  - đọc từ secondary có thể chưa thấy lần ghi vừa xong (gần M26);
  - bảng trong tài liệu: tổ hợp read concern `majority` + write concern `majority` có đủ bốn đảm bảo (đọc lại được lần ghi của mình, đọc đơn điệu, ghi đơn điệu, ghi theo sau đọc).
- **Nguồn:** https://www.mongodb.com/docs/manual/core/causal-consistency-read-write-concerns/
- **Cấp:** L4 · **Nối với:** chưa có · **Kiểm:** cú pháp (cần replica set)

```js
// M34 bad (syntax)
db.orders.insertOne({ _id: 9, status: 'NEW' })
db.getMongo().setReadPref('secondary'); db.orders.findOne({ _id: 9 })
```
```js
// M34 good (syntax)
const s = db.getMongo().startSession({ causalConsistency: true })
const o = s.getDatabase('shop').orders.withOptions({ readConcern: { level: 'majority' }, writeConcern: { w: 'majority' }, readPreference: 'secondary' })
o.insertOne({ _id: 9, status: 'NEW' }); o.findOne({ _id: 9 })
```

### M35 · Change stream: lưu resume token, tiếp tục bằng `resumeAfter`/`startAfter` / Persist the resume token

*(vòng 4)*

- **Luật:**
  - sau khi xử lý mỗi sự kiện, lưu `_id` của nó (resume token) bền vững;
  - khởi động lại bằng `resumeAfter` (hoặc `startAfter`);
  - không sửa hay xóa `_id` trong pipeline của change stream;
  - giữ thời gian dừng ngắn hơn cửa sổ oplog (M26).
- **Vì sao:**
  - không có token thì chạy lại sẽ mất sự kiện trong lúc dừng hoặc phải đọc lại từ đầu;
  - token chỉ dùng được khi oplog còn giữ điểm đó.
- **Nguồn:** https://www.mongodb.com/docs/manual/changestreams/
- **Cấp:** L4 · **Nối với:** chưa có · **Kiểm:** cú pháp (cần replica set)

```js
// M35 bad (syntax)
db.orders.watch([{ $project: { _id: 0, fullDocument: 1 } }])
```
```js
// M35 good (syntax)
db.orders.watch([], { resumeAfter: savedToken })
```

### M36 · WiredTiger cache: để mặc định, chừa RAM cho filesystem cache / Leave the WiredTiger cache at its default

*(vòng 4)*

- **Luật:**
  - để cache WiredTiger mặc định: lớn hơn của 50% × (RAM − 1 GB) và 0,256 GB;
  - chỉ giảm khi nhiều `mongod` hay tiến trình khác chung máy;
  - đừng nâng gần hết RAM.
- **Vì sao:**
  - MongoDB dùng **hai** lớp cache: cache WiredTiger (dữ liệu đã giải nén) và filesystem cache của hệ điều hành (dữ liệu nén như trên đĩa), lớp sau tự dùng mọi RAM còn trống;
  - nâng cache WiredTiger làm co filesystem cache.
- **Nguồn:** https://www.mongodb.com/docs/manual/core/wiredtiger/
- **Cấp:** L5 · **Nối với:** chưa có · **Kiểm:** cú pháp (cấu hình máy chủ)

```js
// M36 bad (syntax)
// mongod.conf trên máy 16 GB chạy cùng một ứng dụng: storage.wiredTiger.engineConfig.cacheSizeGB: 14
db.serverStatus().wiredTiger.cache
```
```js
// M36 good (syntax)
// để mặc định ≈ 7,5 GB, theo dõi "bytes currently in the cache" và số trang bị đẩy ra
db.serverStatus().wiredTiger.cache
```

### M37 · Transaction gặp `TransientTransactionError`: chạy lại cả transaction / Retry the whole transaction on transient errors

*(vòng 4)*

- **Luật:**
  - dùng callback API (`session.withTransaction`): nó tự chạy lại cả transaction khi gặp `TransientTransactionError` (ví dụ write conflict) và chạy lại riêng lệnh commit khi gặp `UnknownTransactionCommitResult`;
  - với core API, tự viết đúng hai vòng lặp đó;
  - giữ transaction ngắn (M10).
- **Vì sao:** hai transaction cùng sửa một tài liệu thì một bên bị hủy (write conflict). Không thử lại là mất việc; thử lại sai chỗ (chỉ lệnh cuối) là nửa transaction.
- **Nguồn:** https://www.mongodb.com/docs/manual/core/transactions-in-applications/
- **Cấp:** L4 · **Nối với:** chưa có · **Kiểm:** cú pháp (cần replica set)

```js
// M37 bad (syntax)
s.startTransaction(); orders.updateOne({ _id: 9 }, { $set: { status: 'PAID' } }); s.commitTransaction()
```
```js
// M37 good (syntax)
s.withTransaction(() => { orders.updateOne({ _id: 9 }, { $set: { status: 'PAID' } }) })
```

### M38 · Đo shard key bằng `analyzeShardKey` trước khi chọn / Measure a candidate shard key with analyzeShardKey

*(vòng 4)*

- **Luật:**
  - trước khi shard (hoặc reshard), chạy `analyzeShardKey` trên khóa ứng viên;
  - đọc `keyCharacteristics`: số giá trị riêng, tần suất giá trị phổ biến nhất, tính tăng đơn điệu;
  - sau một thời gian bật `configureQueryAnalyzer`, đọc thêm phân bố đọc/ghi.
- **Vì sao:**
  - M11 nêu ba tiêu chí (nhiều giá trị, tần suất đều, không tăng đơn điệu);
  - lệnh này (MongoDB 7.0+) đo cả ba trên dữ liệu thật thay vì đoán.
- **Nguồn:** https://www.mongodb.com/docs/manual/reference/command/analyzeshardkey/
- **Cấp:** L5 · **Nối với:** chưa có · **Kiểm:** cú pháp (cần cluster)

```js
// M38 bad (syntax)
sh.shardCollection('shop.orders', { createdAt: 1 })
```
```js
// M38 good (syntax)
db.adminCommand({ analyzeShardKey: 'shop.orders', key: { customerId: 1, createdAt: 1 } })
```

### D28 · Khởi tạo trong `UpdateExpression`: `if_not_exists` / Initialise with if_not_exists

*(vòng 4)*

- **Luật:**
  - cộng vào số hay nối vào list mà thuộc tính có thể chưa có thì dùng `SET n = if_not_exists(n, :zero) + :one` và `SET tags = list_append(if_not_exists(tags, :empty), :t)`;
  - không đọc trước để kiểm.
- **Vì sao:**
  - `SET n = n + :one` trên item chưa có `n` báo lỗi "attribute that does not exist";
  - đọc rồi ghi để khởi tạo thì mất cập nhật khi chạy đồng thời (D17).
- **Nguồn:** https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html
- **Cấp:** L2 · **Nối với:** chưa có · **Kiểm:** dynoxide, item `{pk: C, sk: 1}` chưa có `n`:
  - Sai báo lỗi "The provided expression refers to an attribute that does not exist in the item";
  - Đúng trả `n = 1`;
  - `list_append` cho kết quả tương tự.

```js
// D28 bad
await UpdateItem({ TableName: 'Counters', Key: { pk: { S: 'C' }, sk: { S: '1' } },
  UpdateExpression: 'SET n = n + :one', ExpressionAttributeValues: { ':one': { N: '1' } }, ReturnValues: 'ALL_NEW' });
```
```js
// D28 good
await UpdateItem({ TableName: 'Counters', Key: { pk: { S: 'C' }, sk: { S: '1' } },
  UpdateExpression: 'SET n = if_not_exists(n, :zero) + :one', ExpressionAttributeValues: { ':one': { N: '1' }, ':zero': { N: '0' } }, ReturnValues: 'ALL_NEW' });
```

### D29 · Bên đọc DynamoDB Streams: xử lý idempotent, theo dõi `IteratorAge` / Idempotent stream consumers, watch IteratorAge

*(vòng 4)*

- **Luật:**
  - hàm xử lý bản ghi Streams (thường là Lambda) phải idempotent (ghi có điều kiện D10, khóa theo id sự kiện), vì một batch có thể được gọi lại;
  - đặt báo động trên `IteratorAge`: tuổi bản ghi cũ nhất chưa xử lý.
- **Vì sao:**
  - mỗi bản ghi xuất hiện đúng một lần trong stream, nhưng Lambda thử lại batch lỗi nên hàm có thể chạy hai lần trên cùng bản ghi;
  - bản ghi chỉ được giữ 24 giờ, nên tụt hơn mức đó là mất thay đổi.
- **Nguồn:**
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.Lambda.BestPracticesWithDynamoDB.html
  - https://docs.aws.amazon.com/lambda/latest/dg/with-ddb.html
- **Cấp:** L5 · **Nối với:** chưa có · **Kiểm:** cú pháp (dynoxide không có Streams)

```js
// D29 bad (syntax)
// handler: mỗi bản ghi INSERT cộng điểm thưởng bằng ADD, chạy lại batch là cộng hai lần
UpdateItem({ TableName: 'Points', Key: { pk: { S: 'CUST#1' } }, UpdateExpression: 'ADD pts :p', ExpressionAttributeValues: { ':p': { N: '10' } } })
```
```js
// D29 good (syntax)
// ghi dấu đã xử lý theo eventID trong cùng transaction, có điều kiện attribute_not_exists
TransactWriteItems({ TransactItems: [
  { Put: { TableName: 'Points', Item: { pk: { S: 'EVT#' + eventID } }, ConditionExpression: 'attribute_not_exists(pk)' } },
  { Update: { TableName: 'Points', Key: { pk: { S: 'CUST#1' } }, UpdateExpression: 'ADD pts :p', ExpressionAttributeValues: { ':p': { N: '10' } } } }] })
```

### D30 · Global tables: tránh hai Region cùng sửa một item / Avoid concurrent multi-Region writes to one item

*(vòng 4)*

- **Luật:**
  - với global tables kiểu nhất quán sau cùng (MREC), cho mỗi item một Region ghi: chặn ghi bằng IAM, hoặc chia người dùng theo Region;
  - thay cập nhật tương đối (`x = x + 1`) bằng cập nhật giá trị tuyệt đối khi có thể.
- **Vì sao:**
  - tài liệu: xung đột được giải bằng "last writer wins";
  - hai lần cộng ở hai Region cùng lúc thì một lần biến mất, không báo lỗi;
  - cập nhật tuyệt đối thì ghi lại lần nữa vẫn đúng.
- **Nguồn:**
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/globaltables_HowItWorks.html (last writer wins, cách tránh xung đột)
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GlobalTables.html (MREC là mặc định)
- **Cấp:** L5 · **Nối với:** chưa có · **Kiểm:** cú pháp (dynoxide không có global tables)

```js
// D30 bad (syntax)
// cả ap-southeast-1 và us-east-1 cùng chạy:
UpdateItem({ TableName: 'Users', Key: { pk: { S: 'U#7' } }, UpdateExpression: 'SET bookmark = bookmark + :one', ExpressionAttributeValues: { ':one': { N: '1' } } })
```
```js
// D30 good (syntax)
// chỉ Region "nhà" của U#7 được ghi, và ghi giá trị tuyệt đối
UpdateItem({ TableName: 'Users', Key: { pk: { S: 'U#7' } }, UpdateExpression: 'SET bookmark = :v', ExpressionAttributeValues: { ':v': { N: '25' } } })
```

### D31 · DAX không giúp đọc strongly consistent / DAX does not cache strongly consistent reads

*(vòng 4)*

- **Luật:**
  - dùng DAX cho đọc lặp lại, eventually consistent (danh mục, hồ sơ);
  - đường đọc cần `ConsistentRead: true` thì đi thẳng tới bảng hoặc chấp nhận DAX không giúp gì;
  - đừng mong DAX giảm RCU cho các lần đọc đó.
- **Vì sao:** tài liệu: DAX chuyển đọc strongly consistent sang DynamoDB và không cache kết quả. Trả tiền cluster DAX cho tải toàn đọc mạnh là trả cho một lớp chỉ chuyển tiếp.
- **Nguồn:** https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.consistency.html
- **Cấp:** L5 · **Nối với:** chưa có · **Kiểm:** cú pháp (dynoxide không có DAX)

```js
// D31 bad (syntax)
dax.getItem({ TableName: 'Catalog', Key: { pk: { S: 'P#1' } }, ConsistentRead: true })
```
```js
// D31 good (syntax)
dax.getItem({ TableName: 'Catalog', Key: { pk: { S: 'P#1' } } })
```

### D32 · Adaptive capacity không vượt trần mỗi partition / Adaptive capacity cannot lift the per-partition ceiling

*(vòng 4)*

- **Luật:**
  - một partition key đơn lẻ có nhu cầu gần 3.000 RCU hay 1.000 WCU mỗi giây thì phải đổi thiết kế: rải khóa D03, cache đọc D31;
  - không trông vào adaptive capacity hay on-demand.
- **Vì sao:**
  - adaptive capacity dồn throughput cho partition nóng, và có thể tách item hay đọc vào partition riêng ("isolate frequently accessed items");
  - nhưng mỗi partition tối đa 3.000 đơn vị đọc và 1.000 đơn vị ghi mỗi giây;
  - tài liệu ghi adaptive capacity áp cho cả on-demand lẫn provisioned, nên trần mỗi partition cũng áp cho cả hai: một khóa nóng hơn mức đó vẫn bị throttle.
- **Nguồn:**
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/burst-adaptive-capacity.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html
- **Cấp:** L4 · **Nối với:** chưa có · **Kiểm:** cú pháp (dynoxide không mô phỏng partition hay throttle)

```js
// D32 bad (syntax)
// mọi lượt bình chọn của một chương trình ghi vào một item: 5.000 ghi/giây trên PK = 'VOTE#show42'
UpdateItem({ TableName: 'Votes', Key: { pk: { S: 'VOTE#show42' } }, UpdateExpression: 'ADD n :one', ExpressionAttributeValues: { ':one': { N: '1' } } })
```
```js
// D32 good (syntax)
// rải ra 10 khóa con (D03), cộng lại khi đọc
UpdateItem({ TableName: 'Votes', Key: { pk: { S: 'VOTE#show42#' + (Math.floor(Math.random() * 10)) } }, UpdateExpression: 'ADD n :one', ExpressionAttributeValues: { ':one': { N: '1' } } })
```

### 13.3 Bài Engine được nối thêm

Luật chặt hơn §12:

- grep **một** thuật ngữ riêng của mục trong bài (`git show 0ede43d:<file>`);
- tìm trong thân bài; với bài kiểm tra và capstone thì tìm cả câu kiểm / lab, vì nội dung của chúng nằm ở frontmatter;
- không tính `id`, `requires`, nguồn hay dữ liệu mẫu.

Cột cuối là từ đã tìm thấy. Lần grep đầu dùng mẫu `A|B|C` trên cả file nên đã bị bỏ; các dòng không qua lần thứ hai đã bị xóa.

| Bài | Mục | Từ khóa có trong bài |
|---|---|---|
| `e-pg-l3-02` | P27 | `padding` (căn lề trong tuple) |
| `e-pg-l3-03` | Q09 | `SELECT *` kéo cả giá trị TOAST |
| `e-pg-l3-12` | P28 | `checkpoint` |
| `e-pg-l3-13` | P29 | full-page image |
| `e-pg-l3-14` | P30 | `work_mem` |
| `e-pg-l4-10` | P32, P33 | `FOR UPDATE`, `SKIP LOCKED` |
| `e-pg-l4-11` | P32 | deadlock, thứ tự khóa |
| `e-pg-l4-12` | P34, P35 | `40001`, `REPEATABLE READ` |
| `e-pg-l4-13` | P34, P35 | `40001`, `READ ONLY` / `DEFERRABLE` |
| `e-pg-l4-14` | P36 | `pg_advisory_xact_lock` |
| `e-pg-l4-15` | P37 | `PARALLEL SAFE/UNSAFE` |
| `e-pg-l5-01` | S05, P12 | `uuid`, `REINDEX` / phình |
| `e-pg-l5-02` | I08 | khóa "lặp lại" nhiều lần (dedup chính là cho cột ít giá trị) |
| `e-pg-l5-05` | P38 | `correlation` |
| `e-pg-l5-06` | S15 | `EXCLUDE USING gist (… WITH &&)` (trong câu kiểm của bài) |
| `e-pg-l5-08` | P39 | `amcheck`, `bt_index_check`, checksum |
| `e-pg-l5-09` | P28, P29 | `checkpoint_timeout`/`max_wal_size`, full-page write |
| `e-pg-l5-12` | P30 | `work_mem`, `hash_mem_multiplier` |
| `e-pg-l5-13` | P40 | slot, `wal_status`, `max_slot_wal_keep_size` |
| `e-pg-l5-15` | I07, S11, P38 | BRIN, partition, `correlation` |
| `e-mg-l1-05` | M28 | `upsert` |
| `e-mg-l1-11` | M01 | nhúng (embed) |
| `e-mg-l2-02` | M29 | `$literal` |
| `e-mg-l2-03` | M29 | `$literal` |
| `e-mg-l2-09` | M30 | `default` (của `$bucket`) |
| `e-mg-l2-15` | M18 | `$unwind` |
| `e-mg-l3-03` | M08 | covered query, projection |
| `e-mg-l3-15` | M32 | `collation` |
| `e-mg-l3-16` | M33 | `sparse`, `hint` |
| `e-mg-l3-17` | M32 | `collation` |
| `e-mg-l4-08` | M34 | causal |
| `e-mg-l4-10` | M35 | resume token, `resumeAfter`/`startAfter` |
| `e-mg-l4-12` | M13 | `w: "majority"` |
| `e-mg-l5-01` | M36 | cache |
| `e-mg-l5-02` | M37 | write conflict, thử lại |
| `e-mg-l5-09` | M26 | oplog |
| `e-mg-l5-10` | M13 | `w: "majority"` |
| `e-dy-l1-03` | D08, D12 | 400 KB, 1 MB |
| `e-dy-l1-11` | D06 | `Scan` |
| `e-dy-l2-03` | D28 | `if_not_exists`, `list_append` |
| `e-dy-l2-12` | D10 | `ConditionExpression` (`attribute_not_exists`) |
| `e-dy-l3-11` | D05, D07 | `begins_with` / item collection, GSI |
| `e-dy-l4-14` | D03 | shard (rải khóa) |
| `e-dy-l5-01` | D29 | Lambda, 24 giờ |
| `e-dy-l5-03` | D30 | last writer wins |
| `e-dy-l5-05` | D11, D24 | capacity / on-demand, throttle |
| `e-dy-l5-06` | D31 | `ConsistentRead`, strongly consistent |
| `e-dy-l5-07` | D22, D29, D31 | PITR, Stream, DAX |

**Tổng sau vòng 4:** 48/56 bài của danh sách §12.9 đã có mục. Tám bài còn lại:

- `e-pg-l3-01` (trang heap): bài chỉ nói "chỗ trống" là một phần của trang, không nói `fillfactor` (P02).
- `e-pg-l4-04`, `e-pg-l4-05` (thuật toán nối, thứ tự nối, GEQO): không bài nào dùng `enable_…` (P31).
  - Một mục về `join_collapse_limit`/`geqo_threshold` (mặc định 12, đã đọc trên trang `runtime-config-query`) sẽ nối được `e-pg-l4-05`;
  - nhưng chưa có luật "nên / không nên" đủ rõ.
- `e-mg-l1-02` (find): `null` chỉ có trong dữ liệu mẫu.
- `e-mg-l3-04` (kiểm tra index): nói compound multikey, không nói ESR (M07).
- `e-mg-l3-10` (plan cache): có `explain` nhưng không có `executionStats` (M31).
- `e-mg-l1-04` (thêm và xóa tài liệu): không mục nào nói đúng thuật ngữ của bài. Mục `insertMany` có thứ tự đã bị bỏ vì thiếu nguồn.
- `e-mg-l3-13` (wildcard, text, 2dsphere, hashed): mục wildcard bị bỏ vì không tìm thấy câu trên trang. M12 ("bỏ index thừa") chỉ khớp chữ "index", không đủ.

Bảng §12 không viết lại. Đọc §12 cùng bảng này.

### 13.4 Đề xuất: phòng trưng bày lỗi (anti-pattern gallery)

**Dữ liệu tần suất có thật, nhưng chỉ ở mức lớp lỗi.**

- **Đã tìm:** WebSearch "empirical study frequency of semantic errors in SQL queries". Kết quả là các nghiên cứu của nhóm Taipalus (Đại học Jyväskylä) trên câu SQL của sinh viên:
  - 2018: hơn 33.000 câu, lập bảng phân loại lỗi;
  - 2019: 744 sinh viên, 2.765 câu trả lời cuối bị sai;
  - 2020: 987 sinh viên.
- **Đã đọc:** bản accepted của Taipalus & Perälä 2019, "What to Expect and What to Focus on in SQL Query Teaching" (SIGCSE '19): https://jyx.jyu.fi/jyx/Record/jyx_123456789_63057.
  - Bảng 2 cho tần suất tương đối của từng lớp lỗi trong câu trả lời cuối bị sai, theo 15 bài tập.
  - Lỗi **logic** (câu chạy được, kết quả sai) bền nhất. Lỗi cú pháp và ngữ nghĩa thường được sửa trước khi nộp.
  - Số lớn nhất đọc được trên bảng:
    - lỗi chiếu cột (LOG-5) tới 0,75;
    - lỗi toán tử (LOG-1) tới 0,65;
    - lỗi biểu thức (LOG-4) tới 0,47;
    - lỗi join (LOG-2) tới 0,40;
    - thiếu join (SEM-3) tới 0,34;
    - dòng trùng (SEM-4) tới 0,20.
  - Bản chuyển sang chữ bị cắt mất ba cột cuối của bảng, nên đây là mức "ít nhất".
- **Giới hạn:**
  - đây là sinh viên làm bài, không phải data analyst;
  - lớp lỗi rộng hơn một luật (ví dụ "lỗi biểu thức" gồm cả `BETWEEN` lẫn điều kiện NULL).
  - Không nghiên cứu nào đếm riêng từng lỗi như `NOT IN`.

Vì vậy bảng dưới xếp theo hai bậc:

1. lỗi khớp một lớp có tần suất cao trong nghiên cứu trên đứng trước;
2. sau đó xếp theo số nguồn hướng dẫn độc lập nêu đúng lỗi đó như điều nên tránh.

Các nguồn hướng dẫn:

- **W:** wiki PostgreSQL "Don't Do This";
- **B:** BigQuery, "Optimize query computation": https://docs.cloud.google.com/bigquery/docs/best-practices-performance-compute;
- **T:** dbt, "How we style our SQL": https://docs.getdbt.com/best-practices/how-we-style/2-how-we-style-our-sql;
- **F:** Snowflake, "Working with joins": https://docs.snowflake.com/en/user-guide/querying-joins;
- **D:** tài liệu PostgreSQL, đúng trang mà mục tương ứng đã dẫn.

Mỗi dòng trỏ về mục đã có; phòng trưng bày **không thêm mục mới**.

| # | Lỗi | Lớp lỗi (Taipalus & Perälä 2019) | Nguồn hướng dẫn | Mục | Thẻ |
|---|---|---|---|---|---|
| 1 | Join nhân dòng (fan-out, tích Đề-các) làm tổng phình, hoặc thiếu điều kiện join | LOG-2 join, SEM-3 thiếu join, SEM-4 dòng trùng | B ("joins that generate more outputs than inputs"), T (gom trước khi join), F (Cartesian product) | Q07, A04 | `e-bp-q07` |
| 2 | Điều kiện lọc sai với NULL (`= NULL`, `NOT IN` gặp NULL) | thuộc LOG-1 / LOG-4 (không đếm riêng) | W, D | Q01, Q02 | `e-bp-q01`, `e-bp-q02` |
| 3 | `BETWEEN` với timestamp | thuộc LOG-4 (không đếm riêng) | W | Q12 | `e-bp-q12` |
| 4 | Chọn sai hoặc thừa cột; `SELECT *` trong truy vấn lưu lại | LOG-5 chiếu cột (một phần) | B ("Avoid SELECT *") | Q09, Q23 | chưa có |
| 5 | `timestamp` không múi giờ cho thời điểm | — | W | S01, A02 | `e-bp-s01` |
| 6 | `UNION` khi muốn `UNION ALL` | — | T | Q16 | chưa có |
| 7 | Không nói rõ kiểu join | — | T ("Be explicit about your join type") | Q08 | chưa có |
| 8 | `LIMIT` không `ORDER BY` đủ tiebreaker | — | D (trang LIMIT của Q10) | Q10, A17 | `e-bp-q10` |

**Đọc bảng:**

- BigQuery có nhắc `ORDER BY`, nhưng là lời khuyên hiệu năng ("in the outermost query"), không phải tiebreaker. Vì vậy dòng 8 chỉ dựa vào tài liệu PostgreSQL.
- Năm dòng đã có thẻ: 1, 2, 3, 5, 8.
- Dòng 4, 6, 7 cần thẻ Q09, Q16, Q08 khi luồng nội dung mở lại.

**Đề xuất dùng trong app** (cho luồng sau L220):

- Một hàng "Lỗi hay gặp" đầu track SQL, theo đúng thứ tự trên, mỗi ô mở thẻ có sẵn.
- Không cần trường mới trong thẻ: thứ tự là một danh sách id trong `tracks.yml` (`gallery: [e-bp-q07, e-bp-q02, …]`).
- Câu dẫn của hàng nói thật nguồn của thứ tự: "theo nghiên cứu lỗi SQL của sinh viên và hướng dẫn của các nhà cung cấp". Không viết "lỗi phổ biến nhất của analyst".

## 14. Vòng 5: soát chất lượng, danh sách v25, hướng dẫn học

Theo L220: chỉ nghiên cứu và đề xuất. Vòng này không thêm mục, không thêm thẻ, không sửa `content/engine/best/`, `src/`, test hay `decision-log.md`. Mọi lần chạy nằm trong một thư mục tạm ngoài repo (`bp5/`, `package.json` riêng, `npm i --ignore-scripts`): PGlite 0.5.16 (PostgreSQL 18.6), mingo 7.2.6, `@dynoxide/wasm-engine` 1.5.0. Ngày kiểm: 2026-11-20.

### 14.1 Soát chất lượng toàn bộ 192 mục

**Nguồn (URL):**

- Tải lại cả 196 trang khác nhau mà tài liệu dẫn (238 URL kể cả anchor) bằng `curl -L`: cả 196 trả 200, đúng tiêu đề trang.
- 42 anchor `#…`: có `id` tương ứng trên trang.
- Sau khi sửa (dưới đây), tải lại lần nữa: 246 URL, 199 trang, đều 200, mọi anchor có thật; chạy lại kiểm câu trích và tên hàm.
- Năm URL đi qua chuyển hướng. Bốn đã sửa tại chỗ:
  - M01: trang "embedding vs references" của MongoDB nay chuyển về `data-modeling/best-practices/#link-related-data`. Đã đọc lại: trang mới vẫn nói embed khi dữ liệu được đọc và sửa cùng nhau, và ghi atomic ở mức một tài liệu. Luật M01 giữ nguyên.
  - M19: `dateFromString` → `datefromstring` (chỉ đổi chữ hoa thường).
  - P41: `runtime-config-autovacuum.html` → `runtime-config-vacuum.html`. Ở bản 18, mục autovacuum đã gộp vào trang "Vacuuming"; anchor `RUNTIME-CONFIG-RESOURCE-VACUUM-COST` vẫn còn.
  - §13.4: `cloud.google.com/bigquery/...` → `docs.cloud.google.com/bigquery/...`.
- URL thứ năm là RFC 9562 (`/rfc/rfc9562` chuyển sang trang `info`). Đó là địa chỉ chuẩn RFC Editor đưa ra, nên giữ.

**Nguồn có nói đúng điều mục nêu không:**

- Cách kiểm tự động: với mỗi mục, mọi tên hàm, tham số, view, toán tử (trong `…`) ở **Luật** và **Vì sao** phải có trên ít nhất một trang nguồn của mục đó.
- 32 mục bị gắn cờ. Phần lớn là tên cột của ví dụ (`order_date`, `revenue_vnd`), không cần nguồn.
- 11 mục thiếu thật: tên được nêu nhưng không có trên trang dẫn. Đã thêm trang chính thức có tên đó:

| Mục | Tên còn thiếu | Trang thêm |
|---|---|---|
| A14 | `setseed()` | functions-math, bảng hàm ngẫu nhiên |
| X01 | `quote_ident`, `format` | functions-string |
| D07 | `KEYS_ONLY` | GSI.html#GSI.Projections |
| P12 | `pg_relation_size` | functions-admin#FUNCTIONS-ADMIN-DBOBJECT |
| P16 | "2,1 tỷ" (trần `integer`) | datatype-numeric#DATATYPE-INT |
| P28 | `num_timed`, `num_requested` | monitoring-stats, view `pg_stat_checkpointer` (có từ bản 17) |
| P34 | `serialization_failure` | errcodes-appendix |
| P36 | `pg_advisory_unlock` | functions-admin#FUNCTIONS-ADVISORY-LOCKS |
| P40 | `pg_drop_replication_slot` | functions-admin#FUNCTIONS-REPLICATION |
| P41 | `pg_stat_user_tables` | monitoring-stats, view `pg_stat_all_tables` |
| M06 | `$jsonSchema` | schema-validation/specify-json-schema |

- **Con số lấy từ tài liệu:** mọi số có đơn vị trong Luật/Vì sao (KB, MB, RCU, WCU, %, item, lần…) được tìm trên trang nguồn của mục. Có hết, trừ P16 (đã thêm trang như bảng trên). Các trang AWS và MongoDB không gắn phiên bản. Ngày kiểm, trang hiện hành vẫn ghi đúng các giới hạn: item 400 KB và 25 request mỗi lô (`BatchWriteItem`), 1 MB mỗi trang (`Query`), 3.000 RCU / 1.000 WCU mỗi partition.
- **Câu trích nguyên văn:** 68 câu tiếng Anh trong ngoặc kép.
  - 58 câu trích tài liệu: 57 có đúng từng chữ trên trang nguồn; P07 ghép chữ bằng "…" (đã sửa, xem dưới).
  - 10 câu không phải trích tài liệu: thông báo lỗi do engine trả (P15, P18, D13, D14, D15, D28), chuỗi tấn công của X09, câu tiếng Việt của A14. Các thông báo lỗi khớp output chạy thật.
  - Bốn câu quá 15 chữ, đã rút ngắn và giữ nguyên văn: Q19, Q23, X04, P07. P07 cũ còn ghép chữ bằng dấu "…"; nay trích đúng câu trên trang ("will cause the entire table and its indexes to be rewritten").
- **Bỏ mục:** không mục nào. Mọi nguồn còn sống và nói đúng điều mục nêu.

**Ví dụ chạy được: chạy lại cả 145 mục.**

- Script đọc chính tài liệu này: mọi khối `-- <mã> bad|good` (SQL), `// <mã> …` (Mongo, DynamoDB), bỏ khối `(syntax)`/`(ops)`. Điều kiện như §0:
  - SQL trên schema `lab` sau `VACUUM ANALYZE`, `BEGIN … ROLLBACK`;
  - `(notx)` trên PGlite mới có `amcheck`;
  - Mongo trên `MDATA` + `MDATA2` (+ `products` của M29–M30);
  - DynamoDB trên một engine mới mỗi khối.
- **Dữ liệu DynamoDB là JSON thường (theo §13.1.3):**
  - khối `DDATA` được đổi một lần ra `ddata.json` không kiểu: 1.237 item, chỉ có chuỗi và số;
  - lúc seed thì `marshal` lại (chuỗi → `S`, số → `N`), như `labOf()`;
  - bản dựng lại trùng từng byte với item có kiểu cũ, rồi mới chạy khối;
  - kết quả trùng vòng 2–4.
- **Cách so:** "Sai = Đúng" so **toàn bộ** mảng giá trị (md5 của mọi dòng, bỏ tên cột), không so chuỗi hiển thị đã cắt.
- **Kết quả: 145/145 khớp dòng Kiểm**:
  - 53 Sai ≠ Đúng;
  - 15 Sai = Đúng (gồm D01, D03: cùng `Count`);
  - 20 đúng lỗi đã ghi (mã SQLSTATE, kiểu lỗi DynamoDB hoặc thông báo mingo);
  - 14 kế hoạch: đúng nút; I02 cost Đúng < Sai (35,32 → 16,34); P31 đúng 620,3 / 389,01;
  - 43 "chạy được", gồm số đếm và RCU của DynamoDB (D01 54 → 0,5; D08 351 → 1 WCU; D20 20 item 54 RCU → 11 item 0,5 RCU…).
- Ba điều phụ, chưa có output, đã chạy riêng:
  - X10: role chỉ có quyền `(id, city)` gặp `42501` với cả `SELECT *` lẫn `SELECT phone`;
  - S14: `CREATE TABLE t (user text)` báo `42601`;
  - P29: `SET wal_compression = lz4` báo `22023`.
- Hai số đổi giữa các lần chạy, đã sửa dòng Kiểm cho trung thực:
  - P26: tuổi transaction ID là 131–134 (vòng 2 ghi 79–82). Số này tùy lượng transaction đã chạy trước đó trên cùng database.
  - P29: WAL bản Đúng 691.440 byte (vòng 4: 691.464). Lệch vài chục byte, tỷ lệ −78% giữ nguyên.

**Phiên bản.** Ví dụ chạy trên PostgreSQL 18.6, và link `/docs/18/` cố ý giữ để khớp PGlite. Nhưng **PostgreSQL 19 đã phát hành ngày 2026-11-19**, và trang MongoDB không gắn phiên bản nay là manual **9.0**.

- Đã đọc hết phần "Migration" và "Changes" của release notes 19, đối chiếu từng mục Q/A/S/I/P/X.
- Không mục nào sai trên 19.
- 14 mục có thêm một dòng **Phiên bản (vòng 5)** ngay trên dòng Cấp. Đó là chỗ 19 đổi hành vi, mặc định hoặc công cụ:
  - Q02: `NOT IN` thành anti join khi không có NULL;
  - Q07: gộp trước khi join;
  - P10, P41: điểm ưu tiên autovacuum, VACUUM song song dùng chung cost limit;
  - P11: `REPACK` thay `VACUUM FULL`/`CLUSTER`;
  - P13: `log_lock_waits` bật sẵn;
  - P19, P25: `pg_stat_statements` đếm generic/custom plan;
  - P26: cảnh báo wraparound từ 100 triệu;
  - P29: `wal_compression = on` chọn phương pháp tốt nhất;
  - X05: cảnh báo MD5, bỏ RADIUS;
  - I04: câu quét thường cũng đánh dấu all-visible;
  - A15, A16: `IGNORE NULLS`.
- Mục cần phiên bản tối thiểu (đã ghi trong thân mục, ghi lại đây để BP-C đặt nhãn):

| Mục | Cần | Ghi chú |
|---|---|---|
| S05 `uuidv7()` | PostgreSQL 18 | |
| P15 `NOT NULL … NOT VALID` | PostgreSQL 18 | |
| I02 skip scan | PostgreSQL 18 | luật "so bằng trước, khoảng sau" không đổi |
| P10 `autovacuum_vacuum_max_threshold`, P39 checksums bật sẵn, P40 `idle_replication_slot_timeout` | PostgreSQL 18 | |
| P28 `pg_stat_checkpointer` | PostgreSQL 17 | |
| S07 `NULLS NOT DISTINCT`, X08 `security_invoker`, X03 quyền `CREATE` trên `public` | PostgreSQL 15 | |
| M38 `analyzeShardKey` | MongoDB 7.0 | |
| M04 time series collection | MongoDB 5.0 | bản 9.0 đổi cách lưu (một namespace), lời khuyên không đổi |
| M35 change stream | trang ghi "Changed in version 9.0" | `resumeAfter`/`startAfter` không đổi |

- Trang AWS chỉ có bản `latest`. Các con số giới hạn ở D đã đối chiếu với bản ngày kiểm.

### 14.2 Xếp hạng và danh sách v25

**Thang điểm** (giá trị cho người học đi từ data analyst mới tới kỹ sư senior):

| Tiêu chí | Điểm | Đọc từ |
|---|---|---|
| Sai **âm thầm** (chạy được, số sai) | 0–3 | dòng Kiểm: "Sai ≠ Đúng" = 3; lỗi rõ hoặc chỉ hiệu năng = 1 |
| Hay gặp | 0–2 | §13.4: lớp lỗi của Taipalus & Perälä, số nguồn hướng dẫn độc lập; với data analyst: gặp trong việc hằng ngày |
| Chạy được trong trình duyệt, khác biệt thấy được | 0–2 | `lab`/`engine` có số đo = 2; kế hoạch hay cost = 1; chỉ cú pháp = 0 |
| Boon nhắc bắt được | 0–1 | 10 luật §10 |
| Đã có thẻ | 0–1 | `content/engine/best/` (28 thẻ SQL + PostgreSQL) |
| Giữ đủ bậc thang | điều chỉnh | mỗi track phải có cả L1–L2 (data analyst) lẫn L3–L5 (kỹ sư); một mục L4–L5 có thể lên trước mục điểm cao hơn để bậc không trống |

**Ràng buộc của danh sách:**

- chỉ lấy từ Q/A/S/I/P/X (MongoDB ở v27, DynamoDB ở v29 theo `product-design-best-practice.md`);
- giữ đủ 28 thẻ đã viết và đủ 10 mục có luật Boon nhắc;
- 30 SQL + 30 PostgreSQL. Số này thay cho "SQL 33 + PostgreSQL 35" của product design, vốn đếm từ vòng 1.

**v25: 60 mục, theo thứ tự giá trị** (★ = đã có thẻ, ⚑ = có luật Boon nhắc, (cp) = chỉ cú pháp):

SQL (30):

1. Q02 ★⚑
2. Q06 ★⚑
3. Q07 ★
4. Q01 ★⚑
5. Q12 ★⚑
6. A03 ★
7. A01 ★
8. Q11 ★⚑
9. Q05 ★
10. Q10 ★⚑
11. Q13 ★⚑
12. A18 ★
13. A21
14. Q04 ★
15. Q03 ★
16. Q15 ★⚑
17. A16
18. A11 ★
19. A05 ★⚑
20. Q16
21. A17
22. A07
23. A08
24. A15
25. Q18
26. A02
27. A12
28. Q09
29. Q08
30. Q22 ★⚑

PostgreSQL (30):

31. S01 ★
32. S03 ★
33. S06
34. X01 ★
35. I01
36. P01
37. I06 ★
38. I02 ★
39. S04
40. S02
41. S08 ★
42. X06
43. X02
44. I05 ★
45. I03 ★
46. I04 ★
47. S07
48. I08
49. P17
50. S10 ★
51. P35 (cp)
52. X09
53. P05
54. P13
55. P08
56. P06
57. P03 (cp)
58. I09
59. P30
60. P25 (cp)

- Đếm: Q 17, A 13, S 8, I 8, P 10, X 4. Có 28 thẻ cũ, nên **32 thẻ mới** cho BP-C.
- Chọn Q08, Q09, Q16 vì ba ô "Lỗi hay gặp" của §13.4 (dòng 4, 6, 7) chỉ chờ ba thẻ này.
- Chọn P17, P30 trước P33, P34: cả hai chạy được trên `lab` (kế hoạch). P33, P34 cần hai phiên.
- Chỉ ba mục chỉ cú pháp:
  - P35: báo cáo một snapshot, rất gần việc của data analyst;
  - P03: transaction ngắn;
  - P25: `pg_stat_statements`. Thẻ ghi rõ là cú pháp, hoặc chạy ở runtime `engine` có nạp extension.
- Runtime: P05 phải chạy ngoài transaction (`notx`), nên thuộc `engine`/`engine-hb`. Các mục còn lại chạy được trên `lab` hoặc `engine` như dòng Kiểm.
- **Ngân sách** (theo §13.1.4):
  - mỗi thẻ một chunk lười ≈ 1,5–2,2 KB gzip, nên số thẻ không đụng trần;
  - chỉ mục mỗi khu: Q 17 mục, khu lớn nhất ≈ 1,1 KB;
  - phương án dự phòng chia theo khu và ngôn ngữ: Q-vi ≈ 9,5 KB, A-vi ≈ 9 KB, mỗi khu PostgreSQL ≤ 8 KB một ngôn ngữ (P 10 thẻ ≈ 7 KB), đều dưới 20 KB.

**Chờ v27** (thêm track MongoDB):

- Hạng 61–91, SQL + PostgreSQL bổ sung: Q20, Q14, A04, A10, A22, A24, A23, A06, A13, A09, Q23, Q19, Q17, A19, A20, Q21, A14, S05, S12, S09, S13, S14, I07, P02, P12, P07, P15, S15, S11, P34, P33.
- MongoDB, 38 mục, theo thứ tự (chạy được và sai âm thầm trước):
  - M16, M17, M15, M18, M01, M29, M30, M21, M19, M20;
  - M08, M09, M22, M05, M02, M07, M31, M03, M06, M14;
  - M12, M32, M33, M28, M04, M13, M10, M37, M34, M23;
  - M24, M27, M35, M25, M26, M11, M38, M36.

**Chờ v29** (thêm track DynamoDB):

- Hạng 92–122, phần vận hành và bảo mật L4–L5 của PostgreSQL: X04, X08, X07, X10, X03, P19, P09, P20, P31, P24, P23, P04, P14, P16, P18, P10, P41, P11, P21, P22, P32, P36, P37, P26, P27, P38, P28, P29, P39, P40, X05.
- DynamoDB, 32 mục:
  - D06, D01, D02, D14, D15, D18, D04, D16, D12, D17;
  - D10, D28, D13, D20, D19, D08, D05, D07, D21, D03;
  - D25, D09, D11, D24, D23, D22, D26, D27, D32, D31;
  - D29, D30.

**Đối chiếu:** v25 60 + v27 (31 + 38) + v29 (31 + 32) = 192. Mọi mục có đúng một đợt, không mục nào bị bỏ. Khớp bảng Tóm tắt: Q 23, A 24, S 15, I 9, P 41, X 10, M 38, D 32.

**Ghi chú cho người điều phối:**

- Đẩy phần vận hành PostgreSQL L4–L5 sang v29 vì v25 nên chơi được hết trên `lab`.
- Nếu muốn track PostgreSQL ở v25 sâu hơn: đổi P35 (cú pháp) lấy P19 (kế hoạch chạy được, `notx`).

### 14.3 Bản nháp: "Học SQL và NoSQL cho đúng: 8 thói quen"

Dành cho người chơi. Đặt ở đầu khu Best Practice hoặc trong sổ tay. Mỗi thói quen dẫn tới thẻ. Nguồn ở cuối; không trích nguyên văn.

1. **Nói ra hình dạng kết quả trước khi gõ.**
   - Mỗi dòng là gì (một đơn? một khách một tháng?) và khoảng bao nhiêu dòng.
   - Lệch so với dự đoán là dấu hiệu đầu tiên của lỗi.
   - Thẻ: A04, A13.
2. **Đi từng bước nhỏ, đếm dòng sau mỗi join.**
   - Chạy phần `FROM … JOIN` trước và xem số dòng.
   - Sau khi gộp, so tổng với bảng gốc (tổng kiểm).
   - Lỗi logic (câu chạy được nhưng số sai) là loại lỗi bền nhất ở người học SQL [1]; cú pháp thì database tự báo.
   - Thẻ: Q07, A06.
3. **Hỏi "còn NULL thì sao?" ở mọi điều kiện.**
   - `= NULL`, `NOT IN` gặp NULL, `LEFT JOIN` bị `WHERE` biến thành `INNER`.
   - Bên NoSQL: trường thiếu khác trường null.
   - Thẻ: Q01, Q02, Q06; MongoDB M16, M17.
4. **Viết kiểm tra như một truy vấn phải trả 0 dòng.**
   - Khóa không trùng, không có bản ghi mồ côi, giá trị nằm trong danh sách cho phép.
   - Lưu lại, chạy lại mỗi lần dữ liệu đổi [2].
   - Thẻ: A12, A24, A11.
5. **Đọc kế hoạch, đừng đoán tốc độ.**
   - PostgreSQL: `EXPLAIN`; so số dòng ước lượng với số thật, xem index có được dùng [3].
   - MongoDB: `explain('executionStats')`; so số tài liệu đã xét với số trả về [4].
   - DynamoDB: so `ScannedCount` với `Count`, và đọc `ConsumedCapacity` [5].
   - Đo bằng số đọc và cost, không bằng mili giây trên máy mình.
   - Thẻ: P01, I01, M31, D06.
6. **Đặt tên để người sau đọc được.**
   - Bảng và cột `snake_case` chữ thường, không trùng từ khóa.
   - Mọi cột tính toán có tên nói nghĩa và đơn vị (`revenue_vnd`).
   - Theo một bộ quy tắc có sẵn và giữ nhất quán [6].
   - Thẻ: S08, S13, S14, Q23.
7. **Ghim mọi thứ làm kết quả đổi theo ngày chạy.**
   - "Hôm nay" là tham số.
   - `ORDER BY` có tiebreaker trước `LIMIT`.
   - Lấy mẫu có seed.
   - Khoảng ngày nửa mở.
   - Thẻ: A05, Q10, A14, Q12.
8. **Tự review trước khi gửi, rồi nhờ người khác review.** Đọc lại câu của mình theo năm câu hỏi:
   - grain là gì;
   - NULL đi đâu;
   - join có nhân dòng không;
   - lọc ở `WHERE` hay `HAVING`;
   - tên cột có nói nghĩa không.
   - Với NoSQL hỏi thêm: câu này dùng khóa hay index nào?
   - Thẻ: Q15, Q22; DynamoDB D01, MongoDB M01 (thiết kế theo access pattern).

Thói quen học đi kèm: làm lại bài từng sai sau vài ngày (hàng "Ôn" của BoonData). Mỗi thẻ đọc theo thứ tự: tự đoán kết quả bản "Không nên" trước khi bấm "Chạy cả hai".

**Nguồn của hướng dẫn** (đều đã tải và kiểm ở 14.1):

- [1] Taipalus & Perälä 2019, SIGCSE: https://jyx.jyu.fi/jyx/Record/jyx_123456789_63057
- [2] dbt, data tests: https://docs.getdbt.com/docs/build/data-tests
- [3] PostgreSQL 18, Using EXPLAIN: https://www.postgresql.org/docs/18/using-explain.html
- [4] MongoDB, Analyze Query Performance: https://www.mongodb.com/docs/manual/tutorial/analyze-query-plan/
- [5] AWS, best practices for querying and scanning: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-query-scan.html
- [6] SQL Style Guide (CC BY-SA 4.0, chỉ dẫn link): https://www.sqlstyle.guide/

Đề xuất dùng (cho luồng sau L220): một trang ngắn `#/engine/best` đầu track SQL. Mỗi thói quen một dòng và các chip thẻ; chỉ chip của thẻ đã phát hành là link. Văn bản VI/EN đi theo quy tắc của `content/` (EN không dấu, mã giống nhau ở hai bản).
