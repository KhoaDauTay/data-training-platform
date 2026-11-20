# Research so sánh ba engine cho v28 (PostgreSQL, MongoDB, DynamoDB) và cầu nối DA

Đây là vòng 10 của luồng research thường trực (L215.6). Nên đọc kèm các tài liệu sau:

- `roadmap-v23-v30-revised.md` (nhánh `v22-engine`) §v28:
  - E-CMP: trang `#/engine/compare`, kèm một `quiz` và một `capstone` so sánh;
  - CMP-SQL: "So với SQL" cho DynamoDB;
  - RECALL;
  - LINK: chip "Đào sâu" và chip Best Practice trên trang kỹ năng General.
- `research-nosql-v25-v26.md` (vòng 9):
  - §4.1 và §4.2 là bảng stage/mẫu truy cập ↔ SQL, tài liệu này không chép lại;
  - §3 là luật RCU/WCU, đã đo khớp dynoxide.
- `engine-pedagogy.md` §1.2 (luật viết `quiz`/`predict`/`capstone`) và §2 (danh mục hiểu lầm PG1–PG8, MG1–MG6, DY1–DY6).
- `spike-engine.md` ES2 và ES3 (nhánh `v22-engine`): mingo và dynoxide chạy được gì.
- `best-practice-catalogue.md`: mã thẻ `e-bp-*`.

**Thông tin chung:**

- **Ngày:** 2026-11-20.
- **Phạm vi:** chỉ tài liệu. Không code app, không build, không Docker/`mongod`, không gọi AWS.
- **Runtime đã chạy:** đúng bản repo ghim, trong Node 24:
  - PGlite 0.5.16 (PostgreSQL 18);
  - mingo 7.2.6;
  - `@dynoxide/wasm-engine` 1.5.0.
- **Script:** `scratchpad/r10/cmp.mjs` cho ra `cmp.out`, kết thúc bằng `ALL ASSERTIONS PASSED`. Script nằm ngoài repo, xem phụ lục A.
- **Bộ dữ liệu:** một cửa hàng hư cấu, sinh tất định (LCG, seed 42):
  - 60 khách ở 4 thành phố;
  - 3.000 đơn từ 2026-08-01 đến 2026-10-31, mỗi đơn có trạng thái `NEW 5 % / PAID 15 % / SHIPPED 20 % / DELIVERED 60 %`;
  - khách `C001` mua nhiều, chiếm khoảng 30 % số đơn. Đây là "khóa nóng" có chủ đích cho trục A6.
  - Cùng một dữ liệu được nạp vào ba runtime. Mỗi trục **assert** rằng ba engine trả cùng một đáp số nghiệp vụ, không chỉ kiểm "chạy không lỗi".

**Quy ước trích dẫn** (giống vòng 9):

- Câu trong ngoặc kép là nguyên văn, mỗi câu dưới 15 từ.
- Trang AWS: công cụ fetch trả nguyên trang, tôi đọc thấy nguyên văn.
- Trang PostgreSQL và MongoDB: câu trích do công cụ fetch rút ra từ trang, ghi *(qua fetch)*.
- Câu đã có ở `engine-pedagogy.md` hoặc vòng 9 được dùng lại, kèm ghi chú nguồn đó.
- Không có giá tiền (USD). Tài liệu chỉ nêu **luật tính đơn vị** (RCU/WCU, cost của planner).

**Nhãn trung thực** (theo product design §3.6 và vòng 9 §2.3) gắn cho từng ô:

| Nhãn | Nghĩa |
|---|---|
| **T1 chạy thật** | Runtime trong trình duyệt cho đúng hành vi của engine thật ở điểm đang dạy |
| **T1≠ chạy, khác engine thật** | Đáp số nghiệp vụ đúng, nhưng cơ chế khác engine thật. Bài phải nói rõ khác ở đâu |
| **T2 theo tài liệu/luật** | Runtime không có cơ chế này. Chấm theo luật, hoặc trích tài liệu. Không dựng output explain giả |

---

## 0. Tóm tắt

1. **Khung chín trục chạy được trên cả ba runtime, nhưng chỉ bốn trục là T1 ở cả ba:** mô hình dữ liệu, mô hình truy vấn, chi phí (đọc theo khóa) và chỗ hỏng thường gặp.
   - Các trục index, nhất quán, scale và transaction luôn có ít nhất một engine ở mức T1≠ hoặc T2.
   - Lý do: mingo không có index, replica hay transaction. dynoxide không có partition, độ trễ GSI, backfill hay `TransactWriteItems`. PGlite chỉ có một phiên.
   - Trang E-CMP vì thế phải có cột nhãn cho **từng ô**, không đặt một nhãn chung cho cả trang.
2. **Bằng chứng mạnh nhất cho người học, đều đo thật:**
   - Báo cáo doanh thu theo thành phố (A2) có cùng đáp số ở ba engine. Postgres và Mongo viết bằng một câu lệnh. DynamoDB phải Scan cả bảng (3.062 item, 43,5 RCU), rồi cộng ở phía ứng dụng.
   - "20 đơn PAID mới nhất" (A3):
     - Postgres: `Seq Scan + Sort` cost 73,49 → `Index Only Scan` cost 5,7.
     - DynamoDB: Query trên GSI tốn 0,5 RCU, Scan + filter tốn 43,5 RCU.
   - Đặt đơn trừ kho hai sản phẩm, một sản phẩm thiếu hàng (A4):
     - Postgres: rollback cả hai (`23514`).
     - DynamoDB `ExecuteTransaction`: hủy cả hai (`[None, ConditionalCheckFailed]`).
     - Mongo với hai `updateOne` riêng: **trừ nửa chừng** (P1 còn 3, P2 giữ nguyên).
   - Thêm trường `channel` (A8):
     - Postgres `ADD COLUMN … DEFAULT` không viết lại bảng: filenode 16394 và size 204.800 giữ nguyên, `atthasmissing = true`.
     - Mongo `{channel: "store"}` đếm được 0.
     - GSI mới trên `channel` của DynamoDB đếm `store` được **0**, vì GSI là sparse.
   - Một đơn có `total` lưu dạng chữ (A9):
     - Postgres từ chối lúc ghi (`22P02`).
     - Mongo và DynamoDB nhận vào, rồi **lặng lẽ bỏ qua** đơn đó khi đếm `> 5 triệu`.
3. **Phát hiện mới về runtime** (bổ sung vào danh sách "runtime ≠ engine thật"):
   - dynoxide `UpdateTable` thêm GSI → trả về `ACTIVE` ngay. AWS thật đi qua `CREATING` và backfill.
   - `total` là từ khóa dành riêng của DynamoDB. dynoxide báo `ValidationException` đúng như AWS, nên đây là một bẫy dạy được thật (thẻ `e-bp-d14`).
   - mingo `$sum` bỏ qua chuỗi số `"6500000"`, đúng như MongoDB. mingo **không** lệch ở ca này.
   - Ca `$count` trên đầu vào rỗng trả `[{n: 0}]` (vòng 9) lặp lại ở A8. Bài nào đếm "0 tài liệu" bằng `$count` phải tránh ca này.
4. **12 tình huống "chọn engine nào"** (§2):
   - mỗi tình huống có đáp án, bẫy lấy từ danh mục hiểu lầm, và trích nguồn;
   - 11/12 dẫn tới một số đo ở §1 (S3 chỉ dựa tài liệu); 6 câu là `predict` chạy thật (S4, S6, S8, S9, S11, S12);
   - đủ cho `quiz` và `predict` của E-CMP và cho capstone so sánh.
5. **Cầu nối DA** (§3): 38 kỹ năng trong `content/skills.yml`.
   - Cả 38 kỹ năng có kỹ năng MongoDB tương ứng trong lộ trình `mg.*`.
   - 19 kỹ năng có bài Engine PostgreSQL hoặc DynamoDB để link "Đào sâu" (18 có bài PostgreSQL).
   - 26 kỹ năng có thẻ Best Practice.
   - **Lỗ lớn nhất:**
     - E-com và Finance **không có** chương index/plan nào (không ticket nào dùng `explain_read`/`sargable`/`index_design`), nên dòng LINK của roadmap ("ch có index/plan") không có chỗ gắn ở hai domain này;
     - Postgres Engine không có bài về kế hoạch của window, anti join hay CTE;
     - DynamoDB không có bài về tổng hợp dữ liệu (materialized aggregation).

---

## 1. Khung so sánh chín trục

### 1.1 Bảng khung (cái người học mang đi làm)

Mỗi trục có ba phần:

- một **câu hỏi người học tự hỏi** khi gặp workload mới;
- câu trả lời ngắn cho từng engine;
- một nhiệm vụ đặt cạnh nhau (§1.2–§1.10).

| # | Trục | Câu hỏi tự hỏi | PostgreSQL | MongoDB | DynamoDB |
|---|---|---|---|---|---|
| A1 | Mô hình dữ liệu | Dữ liệu cần đọc cùng nhau nằm ở đâu? | Bảng chuẩn hóa, ghép bằng JOIN lúc đọc | Tài liệu: nhúng thứ đọc cùng, tham chiếu thứ dùng riêng | Item collection: cùng partition key, sort key xếp theo cách đọc |
| A2 | Mô hình truy vấn | Câu hỏi ngày mai có biết trước không? | Hỏi tùy ý (ad hoc), planner lo cách chạy | Pipeline tùy ý trên một collection, `$lookup` có giới hạn | Chỉ hỏi được theo khóa và index đã thiết kế, không GROUP BY |
| A3 | Index | Index đọc theo cột nào, theo thứ tự nào? | B-tree nhiều cột, luật cột đầu, Index Only Scan | Index kép, luật ESR, covered query | Khóa chính + GSI/LSI. Không có khóa thì phải Scan |
| A4 | Transaction | Nhiều thay đổi phải cùng thành công hay cùng hủy? | ACID nhiều dòng, nhiều bảng. Ràng buộc chặn ở CSDL | Atomic trong **một** tài liệu. Nhiều tài liệu cần transaction và trả thêm chi phí | `TransactWriteItems`/`ExecuteTransaction`, tối đa 100 thao tác, tốn ×2 capacity |
| A5 | Nhất quán | Đọc ngay sau khi ghi có thấy dữ liệu mới không? | Một node: thấy ngay. Mặc định Read Committed | Đọc từ primary thì thấy ngay. Đọc từ secondary có thể cũ | Bảng chính: chọn strong (×2 RCU). GSI chỉ cho eventual |
| A6 | Scale và phân vùng | Dữ liệu và tải dồn vào đâu khi lớn lên? | Partition theo khoảng (thường theo thời gian) để cắt bớt phần phải đọc, vẫn một máy | Shard key: số giá trị khác nhau, độ lệch, tăng đơn điệu | Partition key quyết định hết. Khóa nóng thì dùng write sharding |
| A7 | Mô hình chi phí | Một câu tốn bao nhiêu, đo bằng đơn vị gì? | `cost` của planner (đơn vị trừu tượng, không phải tiền hay ms) | Số khóa/tài liệu đã đọc (`explain`) | RCU/WCU = tiền: tính theo byte đã **đọc**, không theo byte trả về |
| A8 | Đổi schema | Thêm một trường cho dữ liệu cũ thì sao? | `ALTER TABLE`. Default không đổi thì không viết lại bảng | Tài liệu cũ thiếu trường. Lúc đọc phải xử lý | Item cũ thiếu thuộc tính. GSI mới bỏ qua chúng (sparse) |
| A9 | Chỗ hỏng thường gặp | Sai thì sai lúc nào, có báo không? | Sai **lúc ghi**, có báo lỗi (kiểu, ràng buộc) | Sai **lúc đọc**, không báo (kiểu lệch, thiếu trường) | Sai lúc đọc, không báo. Thêm bẫy trang/`Limit`/từ khóa |

Nguồn của bảng:

- **A1–A2:**
  - AWS: "In RDBMS, data can be queried flexibly, but queries are relatively expensive".
  - DynamoDB: "data can be queried efficiently in a limited number of ways" (NoSQL design for DynamoDB).
  - MongoDB: "Model data the way your application code uses it." (Data Modeling, đã trích ở pedagogy MG1).
- **A4:**
  - MongoDB: "write operations are atomic on the single-document level, even if modifying multiple values" và "the operation as a whole is not atomic" *(qua fetch, trang Atomicity and Transactions)*.
  - Transaction "should not be a replacement for effective schema design" *(qua fetch, cùng trang)*.
- **A5:**
  - PostgreSQL: "Read Committed is the default isolation level in PostgreSQL." *(qua fetch, transaction-iso 18)*.
  - MongoDB: mọi mode trừ `primary` "may return stale data because secondaries replicate operations from the primary" *(qua fetch, Read Preference)*.
  - AWS: "Global secondary indexes support eventually consistent reads" (vòng 9 §1.2).
- **A6:**
  - PostgreSQL: partition pruning là "a query optimization technique that improves performance for declaratively partitioned tables" *(qua fetch)*.
  - MongoDB: "A shard key with low cardinality reduces the effectiveness of horizontal scaling" *(qua fetch, Choose a Shard Key)*.
  - AWS: "avoid having a single 'hot' partition key value" (pedagogy DY3).
- **A7:** AWS, Query: filter "does not reduce the read capacity consumed" (vòng 9 §4.2).
- **A8:**
  - PostgreSQL: "In neither case is a rewrite of the table required." *(qua fetch, ALTER TABLE 18, Notes)*.
  - AWS: item thiếu thuộc tính khóa của index thì "that item does not appear in the index" (Take advantage of sparse indexes).

### 1.2 A1 Mô hình dữ liệu: "Khách C007: tên và 3 đơn gần nhất"

```sql
SELECT c.name, o.id FROM customers c JOIN orders o ON o.customer_id = c.id
WHERE c.id = 'C007' ORDER BY o.created_at DESC, o.id DESC LIMIT 3;
```

```js
db.orders.aggregate([
  { $match: { customerId: "C007" } }, { $sort: { created: -1, _id: -1 } }, { $limit: 3 },
  { $lookup: { from: "customers", localField: "customerId", foreignField: "_id", as: "c" } },
  { $project: { _id: 1, name: { $first: "$c.name" } } }
])
```

```json
{ "op": "Query", "input": { "TableName": "Shop", "KeyConditionExpression": "PK = :p",
  "ExpressionAttributeValues": { ":p": { "S": "CUST#C007" } },
  "ScanIndexForward": false, "Limit": 4, "ReturnConsumedCapacity": "TOTAL" } }
```

**Kết quả:** ba engine cùng trả `O00824, O02551, O00390`.

DynamoDB trả 4 item: `PROFILE` trước, rồi 3 đơn. Lý do là `'P' > 'O'`, nên khi đọc ngược thì hồ sơ đứng đầu, rồi tới các đơn mới nhất. Lượt đọc tốn **0,5 RCU** cho cả hồ sơ lẫn đơn, trong một request.

**Nhãn:** T1 ở cả ba. Cách tính RCU khớp luật AWS (vòng 9 §3.2).

**Ý dạy:**

- Postgres ghép lúc đọc.
- Mongo ghép bằng `$lookup` (LEFT OUTER, MG2), hoặc không cần ghép nếu nhúng tên khách vào đơn.
- DynamoDB ghép **lúc thiết kế khóa**: hồ sơ và đơn nằm cạnh nhau trong một item collection.
- Thứ tự của sort key (`PROFILE` so với `ORDER#…`) là một quyết định thiết kế. Người học phải đoán được nó trước khi chạy (predict).

**Bài đã có:**

- `e-pg-l4-04` (thuật toán nối);
- `e-mg-l2-08`, `e-mg-l2-11` (nhúng hay tham chiếu);
- `e-dy-l3-07`, `e-dy-l3-08` (một Query thay JOIN).

### 1.3 A2 Mô hình truy vấn: "Doanh thu tháng 10 theo thành phố"

```sql
SELECT c.city, sum(o.total) AS revenue, count(*) AS n FROM orders o JOIN customers c ON c.id = o.customer_id
WHERE o.created_at >= '2026-10-01' AND o.created_at < '2026-11-01' GROUP BY c.city ORDER BY c.city;
```

```js
db.orders.aggregate([
  { $match: { created: { $gte: ISODate("2026-10-01"), $lt: ISODate("2026-11-01") } } },
  { $lookup: { from: "customers", localField: "customerId", foreignField: "_id", as: "c" } }, { $unwind: "$c" },
  { $group: { _id: "$c.city", revenue: { $sum: "$total" }, n: { $sum: 1 } } }, { $sort: { _id: 1 } }
])
```

```json
{ "op": "Scan", "input": { "TableName": "Shop", "ReturnConsumedCapacity": "TOTAL",
  "FilterExpression": "begins_with(SK, :o) AND created BETWEEN :a AND :b",
  "ExpressionAttributeValues": { ":o": {"S": "ORDER#"}, ":a": {"S": "2026-10-01"}, ":b": {"S": "2026-10-31T99"} } } }
```

Sau Scan, ứng dụng tự cộng theo `city`, lặp lại trên mọi trang có `LastEvaluatedKey`.

| Thành phố | Doanh thu | Số đơn |
|---|---|---|
| Da Nang | 2.210.600.000 | 451 |
| Hoi An | 920.200.000 | 179 |
| Hue | 778.850.000 | 167 |
| Quang Ngai | 904.700.000 | 180 |

Ba engine cho cùng một bảng trên.

**Chi phí của DynamoDB:** 1 trang, đọc 3.062 item, giữ lại 977 item, tốn **43,5 RCU**.

- Mỗi lần mở báo cáo lại tốn đúng chừng đó, vì filter không làm giảm RCU.
- Item đơn phải **chép sẵn `city`** (phi chuẩn hóa) thì mới gom được, vì DynamoDB không có JOIN.

**Nhãn:**

- T1 cho Postgres và Mongo.
- T1 cho đáp số và RCU của DynamoDB.
- Dữ liệu chỉ ~350 KB, dưới 1 MB, nên chỉ có một trang. Bảng thật lớn hơn sẽ có nhiều trang, và tab nên hiện "số trang × RCU".

**Ý dạy:**

- AWS nói thẳng: DynamoDB "doesn't natively support aggregation operations like `SUM` or `COUNT` across items".
- Cách AWS khuyên là **tính trước** (materialized aggregation qua Streams + Lambda + `ADD`), và cách này "eventually consistent (typically seconds behind)" (AWS, materialized aggregation queries).
- dynoxide không có Streams (ES3), nên phần tính trước chỉ làm được bằng `UpdateItem ADD` gọi tay (T1, bài `e-dy-l2-05`). Đường Stream → Lambda là T2.

### 1.4 A3 Index: "20 đơn PAID mới nhất"

```sql
SELECT id FROM orders WHERE status = 'PAID' ORDER BY created_at DESC, id DESC LIMIT 20;
CREATE INDEX orders_status_created ON orders (status, created_at DESC, id DESC);
```

```js
db.orders.find({ status: "PAID" }).sort({ created: -1, _id: -1 }).limit(20)
// index ESR: db.orders.createIndex({ status: 1, created: -1, _id: -1 })
```

```json
{ "op": "Query", "input": { "TableName": "Shop", "IndexName": "byStatus",
  "KeyConditionExpression": "#s = :s", "ExpressionAttributeNames": { "#s": "status" },
  "ExpressionAttributeValues": { ":s": { "S": "PAID" } }, "ScanIndexForward": false, "Limit": 20 } }
```

| Engine | Không có index | Có index |
|---|---|---|
| PostgreSQL | `Limit → Sort → Seq Scan orders`, cost **73,49** | `Limit → Index Only Scan [orders_status_created]`, cost **5,7** |
| MongoDB (mingo) | đúng 20 id như Postgres | mingo không có index: `createIndex` chỉ lưu metadata (ES2). Thứ tự `{status, created}` chấm theo luật ESR (`src/engine/mongo/path.ts`) |
| DynamoDB | Scan + filter (cả bảng): đọc 3.062, giữ 411, **43,5 RCU** | Query GSI: đọc 20, **0,5 RCU** |

**Nhãn:**

- Postgres T1 (cost, không phải ms).
- Mongo T1≠: đúng kết quả, còn cơ chế là T2.
- DynamoDB T1.

**Chú ý cho người viết bài:** sort key của GSI chỉ là `created`. Hai đơn trùng giây sẽ xếp theo khóa của bảng chính, không theo `id DESC`. Vì vậy script so tập 20 id, không so thứ tự. Bài nào hỏi top N trên GSI phải đặt tiebreaker **vào sort key** (`created#id`), giống luật tiebreaker của ticket (BP `e-bp-q10`, `e-bp-d04`).

**Bài đã có:** `e-pg-l1-11`, `e-pg-l2-01`, `e-pg-l2-02`; `e-mg-l3-05`, `e-mg-l3-08`; `e-dy-l3-03`, `e-dy-l3-04`.

### 1.5 A4 Transaction: "Đặt đơn lấy 2 × P1 và 2 × P2; kho P2 chỉ còn 1"

```sql
BEGIN;
UPDATE products SET stock = stock - 2 WHERE id = 'P1';
UPDATE products SET stock = stock - 2 WHERE id = 'P2';   -- CHECK (stock >= 0) chặn
COMMIT;
```

```js
db.products.updateOne({ _id: "P1", stock: { $gte: 2 } }, { $inc: { stock: -2 } })
db.products.updateOne({ _id: "P2", stock: { $gte: 2 } }, { $inc: { stock: -2 } })
```

```sql
-- DynamoDB PartiQL, op ExecuteTransaction (TransactStatements)
UPDATE "Shop" SET stock = stock - 2 WHERE PK = 'PROD#P1' AND SK = 'STOCK' AND stock >= 2
UPDATE "Shop" SET stock = stock - 2 WHERE PK = 'PROD#P2' AND SK = 'STOCK' AND stock >= 2
```

| Engine | Kết quả đo | Kho sau đó |
|---|---|---|
| PostgreSQL | `23514 … violates check constraint "products_stock_check"`, cả transaction rollback | P1 5, P2 1 |
| MongoDB (mingo), hai lệnh riêng | `matchedCount` [1, 0] | **P1 3**, P2 1: trừ nửa chừng |
| DynamoDB `ExecuteTransaction` | `TransactionCanceledException`, lý do `[None, ConditionalCheckFailed]` | P1 5 |
| DynamoDB `TransactWriteItems` | `UnsupportedOperation` (dynoxide 1.5.0, ES3) | — |

**Nhãn:**

- Postgres T1.
- Mongo T1 cho kết quả "nửa chừng". MongoDB thật cũng cho kết quả này với hai lệnh ngoài session. Cách sửa bằng transaction nhiều tài liệu là T2: mingo không có session (`e-mg-l4-09` là docs).
- DynamoDB T1 qua PartiQL. Riêng `TransactWriteItems` là T2.

**Ý dạy:**

- Mongo có hai cách sửa:
  - (a) mô hình lại để đơn và tồn kho cùng nằm trong **một** tài liệu (hiếm khi hợp với tồn kho);
  - (b) dùng transaction, và chấp nhận rằng nó "incurs a greater performance cost over single document writes" (pedagogy MG5).
- Đây là câu `predict` tốt nhất của E-CMP: "Sau hai lệnh, P1 còn mấy?" Đáp án 3. Bẫy là 5, vì người học nghĩ như SQL rằng "lỗi thì hủy hết".

### 1.6 A5 Nhất quán: "Ghi đơn rồi đọc lại ngay"

| Engine | Phép thử | Kết quả | Nhãn |
|---|---|---|---|
| PostgreSQL | `BEGIN; INSERT …;` rồi `SELECT` cùng phiên, chưa COMMIT | thấy 1 dòng. Docs: "SELECT does see the effects of previous updates executed within its own transaction" *(qua fetch)* | T1. Hai phiên (một phiên không thấy dòng chưa commit) là T2: PGlite chỉ có một phiên |
| PostgreSQL | `SHOW transaction_isolation` | `read committed` | T1 |
| MongoDB | đọc secondary ngay sau khi ghi primary | — | T2: mingo không có replica. Bài `e-mg-l4-07`, `e-mg-l4-11` |
| DynamoDB | `GetItem` eventual / `ConsistentRead: true` | **0,5 / 1 RCU** | T1 |
| DynamoDB | Query GSI `ConsistentRead: true` | `ValidationException: Consistent reads are not supported on global secondary indexes` | T1 |
| DynamoDB | Query GSI ngay sau `PutItem` | **thấy ngay** item mới | **T1≠**: AWS cập nhật GSI bất đồng bộ (vòng 9 §1.2). Bài phải ghi "trình giả lập cập nhật GSI ngay" |

### 1.7 A6 Scale và phân vùng: "Dữ liệu dồn vào đâu?"

**PostgreSQL** (T1). Bảng `orders_p` partition theo tháng. `SUM(total)` của tháng 10 chỉ đọc một partition:

```text
Aggregate → Seq Scan orders_p_10
```

Docs có luật kinh nghiệm: partition đáng làm khi "the size of the table should exceed the physical memory of the database server" *(qua fetch, ddl-partitioning 18)*. Bảng 3.000 dòng thì không cần partition. Đây là một lựa chọn bẫy cho §2 S10.

**MongoDB** (T1 cho phép đo, T2 cho định tuyến). Đo ứng viên shard key bằng aggregation, cùng cách bài `e-mg-l5-07`:

| Ứng viên | Số giá trị khác nhau | Phần lớn nhất |
|---|---|---|
| `status` | 4 | 0,594 |
| `customerId` | 60 | **0,32** (`C001`) |
| `_id` | 3.000 | ~0 |

- `status` có cardinality thấp, nên đối chiếu được với câu docs: "A shard key with low cardinality reduces the effectiveness of horizontal scaling".
- `customerId` bị lệch tần suất. Docs nói chunk của giá trị quá nhiều "can become a bottleneck" *(qua fetch)*.
- `created` tăng đơn điệu, và docs nói "The shard containing that chunk becomes the bottleneck for write operations." *(qua fetch)*.

**DynamoDB:**

- Phần đếm là T1: 62 partition key khác nhau. `CUST#C001` giữ 961/3.062 item (**31,4 %**). GSI `byStatus` với `DELIVERED` có 1.783 item.
- Phần partition vật lý, throttle và adaptive capacity là T2: dynoxide không mô phỏng (vòng 9 §3.3).
- Cách sửa là write sharding hoặc hậu tố tính được (`e-dy-l4-04`, `e-dy-l4-05`).

**Ý dạy chung:**

- Cả ba engine hỏi cùng một câu: "giá trị khóa nào gánh phần lớn dữ liệu và tải?"
- Postgres chia để **đọc ít hơn** (pruning), trên một máy.
- Mongo và DynamoDB chia để **trải tải** ra nhiều máy. Khóa lệch thì một máy gánh hết.

### 1.8 A7 Mô hình chi phí: "Đọc một đơn theo mã" so với "lọc đơn trên 9 triệu"

| Engine | Theo khóa | Lọc cột không có index (`total > 9.000.000`, 283 đơn) | Đơn vị |
|---|---|---|---|
| PostgreSQL | `Index Scan [orders_pkey]` cost **8,3** | `Seq Scan orders` cost **62,5** (ước lượng 288 dòng, thật 283) | đơn vị trừu tượng của planner, không phải tiền hay ms |
| MongoDB | — | đáp số 283 | mingo không có `explain`. `totalDocsExamined` là T2 (vòng 9 §2) |
| DynamoDB | `GetItem` **0,5 RCU** | Scan + filter: đọc 3.063, giữ 283, **43,5 RCU** | RCU = tiền (on-demand), hoặc phần capacity đã mua (provisioned) |

Ba engine đều trả 283 (assert).

**Bẫy đo được trên đường đi:** lần chạy đầu, `FilterExpression: "total > :t"` bị dynoxide trả:

```text
ValidationException: Attribute name is a reserved keyword; reserved keyword: total
```

`TOTAL` có trong danh sách từ khóa dành riêng của AWS. AWS dặn: "Don't use any of these words as attribute names in expressions." (Reserved words).

Cách sửa là `#t` + `ExpressionAttributeNames`. Ca này đáng làm một bước lab: dynoxide cho hành vi T1, và thẻ `e-bp-d14` đã có.

**Ý dạy:** chỉ DynamoDB đặt **giá tiền** lên từng câu. Postgres và Mongo tính tiền theo máy (CPU, RAM, IOPS), nên một câu đắt chỉ làm chậm cả máy, không hiện ra trên hóa đơn của câu đó. Đây là lý do tab Chi phí (DY-UI) dạy được điều mà hai engine kia không dạy được.

### 1.9 A8 Đổi schema: "Thêm kênh bán `channel`, đơn cũ coi là `store`"

```sql
ALTER TABLE orders ADD COLUMN channel text NOT NULL DEFAULT 'store';
```

**PostgreSQL** (T1):

- filenode trước/sau đều là 16394, `pg_relation_size` trước/sau đều là 204.800: **không viết lại bảng**.
- `pg_attribute.atthasmissing = true`, `attmissingval = {store}`.
- `count(*) WHERE channel = 'store'` = 3.000.
- Docs: default không đổi thì "In neither case is a rewrite of the table required". Default thay đổi theo lần gọi (`clock_timestamp()`) "will cause the entire table and its indexes to be rewritten" *(qua fetch)*.

```js
db.orders.aggregate([{ $match: { channel: "store" } }, { $count: "n" }])               // mingo: [{ n: 0 }]
db.orders.aggregate([{ $group: { _id: { $ifNull: ["$channel", "store"] }, n: { $sum: 1 } } }])
// → app 1, store 3000
```

**MongoDB:**

- T1: tài liệu cũ không có trường, nên phải xử lý lúc đọc (`$ifNull`), hoặc backfill bằng `updateMany`.
- **T1≠:** MongoDB trả **không có tài liệu nào** cho `$count` trên rỗng, còn mingo trả `[{n: 0}]` (vòng 9 §4.1).

```json
{ "op": "UpdateTable", "input": { "TableName": "Shop",
  "AttributeDefinitions": [{ "AttributeName": "channel", "AttributeType": "S" }, { "AttributeName": "created", "AttributeType": "S" }],
  "GlobalSecondaryIndexUpdates": [{ "Create": { "IndexName": "byChannel",
    "KeySchema": [{ "AttributeName": "channel", "KeyType": "HASH" }, { "AttributeName": "created", "KeyType": "RANGE" }],
    "Projection": { "ProjectionType": "KEYS_ONLY" } } }] } }
```

**DynamoDB:**

- Query `byChannel` với `channel = store` → **0**. Với `app` → 1.
- Phần sparse là T1: AWS nói item thiếu thuộc tính khóa thì "that item does not appear in the index".
- **T1≠:** dynoxide trả `byStatus:ACTIVE, byChannel:ACTIVE` ngay sau `UpdateTable`. Trên AWS, index mới đi qua `CREATING` và backfill, và "not available for Query operations until its status changes" sang `ACTIVE` (Managing GSI). Bài phải ghi điều này.

**Ý dạy:**

- Postgres buộc **mọi** dòng có giá trị: lưu trong catalog, nên rẻ.
- Hai engine NoSQL để dữ liệu cũ thiếu trường. Câu đọc và index mới phải tự lo phần thiếu đó.
- MongoDB còn mẫu Schema Versioning (`e-mg-l4-04`).

### 1.10 A9 Chỗ hỏng thường gặp: "Bao nhiêu đơn trên 5 triệu?" khi một nguồn ghi `total` dạng chữ

| Engine | Ghi `total = "6,500,000"` / `"6500000"` | Đếm `total > 5.000.000` | Tìm ra dòng lệch |
|---|---|---|---|
| PostgreSQL | **từ chối:** `22P02 invalid input syntax for type numeric` | 1.462 | không cần: dòng lệch không vào được bảng |
| MongoDB | nhận | 1.462 (**bỏ qua lặng lẽ** đơn chữ) | `{ total: { $type: "string" } }` → `O90002` |
| DynamoDB | nhận (thuộc tính kiểu `S`) | 1.462 (bỏ qua lặng lẽ: so `S` với `N` cho false) | `attribute_type(#t, :s)` → `O90002` |

Thêm hai thử nghiệm phụ, đều T1:

- mingo `$sum` trên `["6500000", 1000000]` → 1.000.000. Chuỗi bị bỏ qua, đúng như docs `$sum` (vòng 9).
- DynamoDB Scan `Limit: 100` + filter `> 9.500.000` → trang đầu `Count 5`, `ScannedCount 100`, **có `LastEvaluatedKey`**. Đếm theo trang đầu là sai (DY5, DY6).

Phụ: Postgres với điều kiện bọc cột, `created_at::date = '2026-10-31'`, vẫn dùng index vì `status` đứng đầu, nhưng cost **47,57** so với **17,75** của khoảng nửa mở. Đây là bằng chứng nhẹ cho `e-bp-q11`/`e-bp-q12`. Phép ép kiểu còn phụ thuộc `TimeZone` của phiên (BP A02).

**Nhãn:** T1 ở cả ba.

**Ý dạy:**

- Schema-on-write (Postgres) đổi **lỗi lúc ghi** lấy **đáp số đúng lúc đọc**.
- Schema-on-read (Mongo, DynamoDB) nhận mọi thứ, nên DA phải tự kiểm. Mẫu kiểm là "truy vấn phải trả 0 dòng" (BP A12), viết bằng `$type` hoặc `attribute_type`.

### 1.11 Tổng hợp nhãn (cho cột nhãn của trang E-CMP)

| Trục | PostgreSQL | MongoDB | DynamoDB |
|---|---|---|---|
| A1 mô hình dữ liệu | T1 | T1 | T1 |
| A2 truy vấn | T1 | T1 | T1 (Streams: T2) |
| A3 index | T1 | T1≠ (không index) | T1 |
| A4 transaction | T1 | T1 nửa chừng / T2 transaction | T1 PartiQL / T2 `TransactWriteItems` |
| A5 nhất quán | T1 một phiên / T2 hai phiên | T2 | T1, GSI lag T1≠ |
| A6 scale | T1 pruning | T1 đo khóa / T2 định tuyến | T1 đếm / T2 partition |
| A7 chi phí | T1 (cost) | T2 | T1 (RCU) |
| A8 đổi schema | T1 | T1 (`$count` rỗng T1≠) | T1 sparse / T1≠ backfill |
| A9 chỗ hỏng | T1 | T1 | T1 |

**Đề xuất cho capstone so sánh của E-CMP** (`e-pg-cmp-…` theo `ENGINE_ID`), 5 bước:

1. A2: viết báo cáo trên ba runtime, chấm `rows`.
2. A3: `predict` RCU của Scan so với GSI.
3. A4: `predict` "P1 còn mấy?".
4. A9: tìm dòng lệch bằng `$type`.
5. Bước cuối là `quiz` chọn engine cho workload §2 S1, đúng luật "giải thích số đo" của pedagogy §1.2.

Mọi bước đều T1, nên đạt điều kiện thoát của v28: "Capstone so sánh chạy trên ba runtime trong e2e".

---

## 2. Bài tập "Chọn engine nào?" (12 tình huống)

Mỗi tình huống tuân theo pedagogy §1.2:

- 3–4 lựa chọn, một trong số đó là **bẫy** lấy từ danh mục hiểu lầm;
- phần "vì sao bẫy nghe hợp lý" viết **trước** đáp án;
- **Bằng chứng** dẫn tới số đo ở §1 khi có, nếu không thì dẫn tài liệu.

Đề xuất loại bài ghi ở đầu mỗi tình huống.

**S1 (quiz).** Phòng DA cần báo cáo doanh thu, tỷ lệ hủy, cohort. Câu hỏi đổi mỗi tuần, dữ liệu 20 GB.

- Đáp án: **PostgreSQL.** Câu hỏi không biết trước, cần JOIN/GROUP BY tùy ý.
- Bẫy: "DynamoDB vì scale vô hạn".
  - Nghe hợp lý vì "lớn thì chọn NoSQL".
  - Thật ra mỗi câu mới cần Scan cả bảng hoặc thêm GSI mới (A2: 43,5 RCU mỗi lần mở báo cáo, cộng ở phía ứng dụng). AWS: "you shouldn't start designing your schema for DynamoDB until you know the questions".
- Lựa chọn khác: "MongoDB vì schemaless thì đổi nhanh" (MG1).

**S2 (quiz).** Giỏ hàng của app di động: đọc và ghi theo `userId`, tải tăng gấp 50 lần vào ngày khuyến mãi, không có báo cáo trên giỏ.

- Đáp án: **DynamoDB, on-demand, partition key `userId`.** Mẫu truy cập biết trước, chỉ đọc theo khóa (A1, A7: `GetItem` 0,5 RCU).
- Bẫy: "Postgres vì cần transaction". Giỏ của một người là một item, nên ghi một item đã atomic.
- Lựa chọn sai thứ ba: "DynamoDB, partition key = ngày". Khóa nóng (DY3, A6).

**S3 (quiz).** Danh mục sản phẩm: mỗi loại có bộ thuộc tính khác nhau (áo có size, máy có công suất). Trang chi tiết đọc cả sản phẩm một lần. Bộ lọc dùng 3–4 thuộc tính phổ biến.

- Đáp án: **MongoDB, một tài liệu cho mỗi sản phẩm, index cho các thuộc tính lọc nhiều.**
- Ghi chú trong `why`: Postgres `jsonb` + GIN (`e-pg-l2-11`) cũng bảo vệ được. Câu hỏi là "khớp nhất", không phải "duy nhất".
- Bẫy: "DynamoDB, mỗi thuộc tính một GSI". Quota mặc định 20 GSI mỗi bảng (Managing GSI), mỗi GSI tốn WCU riêng, và tổ hợp lọc tùy ý vẫn không làm được.
- Lựa chọn sai: "Postgres, mỗi loại một bảng" (schema bùng nổ).

**S4 (predict, chạy thật A4).** Hai lệnh `updateOne` trừ kho P1 rồi P2. P2 không đủ hàng. Hỏi P1 còn mấy?

- Đáp án: **3.**
- Bẫy: **5**, "lỗi thì cả đơn hủy như SQL".
  - Nghe hợp lý vì người học quen BEGIN/ROLLBACK.
  - Docs MongoDB nói thao tác nhiều tài liệu "the operation as a whole is not atomic".
- Câu tiếp theo (quiz): engine nào cho "tất cả hoặc không" mà không cần đổi mô hình? Postgres (rollback `23514`) và DynamoDB `ExecuteTransaction` (`ConditionalCheckFailed`, P1 vẫn 5).

**S5 (quiz).** Bảng xếp hạng bài hát tải nhiều nhất trong tháng. Hàng nghìn lượt tải mỗi giây, cần đọc trong vài ms, trễ vài giây chấp nhận được.

- Đáp án: **DynamoDB với materialized aggregation:** `ADD` vào item đếm theo tháng, GSI sparse theo tháng. Đây là ví dụ của chính AWS.
- Bẫy: "Scan rồi đếm lúc đọc".
  - AWS chỉ coi cách này hợp với "very small datasets".
  - A2 đã cho thấy Scan tốn theo cả bảng.
- Lựa chọn sai: "Postgres `count(*)` mỗi lần mở trang". Chạy đúng nhưng đọc cả bảng sự kiện mỗi lần (PG4, `e-pg-l3-09`).

**S6 (predict + quiz, chạy thật A6/A3).** Màn hình "đơn mới nhất theo trạng thái" trên DynamoDB. Đề xuất: GSI `status` + `created`. Hỏi partition key `DELIVERED` của GSI giữ bao nhiêu phần item?

- Đáp án: **~59 %** (1.783/3.000).
- Bẫy: "GSI tự chia tải nên không sao" (DY3).
- Cách sửa đúng:
  - GSI **sparse** chỉ cho đơn còn mở (`NEW`/`PAID`, thuộc tính bị xóa khi giao);
  - hoặc shard hậu tố `PAID#0..9`.

**S7 (quiz, đo A6).** Chọn shard key cho collection `orders` của MongoDB. Truy vấn chính là "đơn của một khách". Một khách lớn chiếm khoảng 30 % đơn. Có bốn lựa chọn:

| | Lựa chọn | Nhận xét |
|---|---|---|
| (a) | `{ status: 1 }` | Bẫy: cardinality 4 |
| (b) | `{ created: 1 }` | Bẫy: tăng đơn điệu, mọi insert dồn vào chunk `maxKey` |
| (c) | `{ customerId: 1 }` | Gần đúng: truy vấn đi đúng một shard, nhưng 32 % dồn vào một giá trị nên thành chunk không chia được |
| (d) | `{ customerId: 1, _id: 1 }` | **Đáp án:** vẫn định tuyến theo khách, và chunk của khách lớn chia được |

- Nguồn: Choose a Shard Key *(qua fetch)*.
- Bài liên quan: `e-mg-l5-05`, `e-mg-l5-07`.

**S8 (predict, chạy thật A8).** Sau khi thêm GSI `byChannel` cho bảng có 3.000 đơn cũ chưa có `channel`, Query `channel = "store"` trả mấy item?

- Đáp án: **0.**
- Bẫy: **3.000**, "như `DEFAULT 'store'` của Postgres".
  - Nghe hợp lý vì A8 cho Postgres trả 3.000.
  - AWS: item thiếu thuộc tính khóa thì không vào index.
- Nhãn phụ: "trên AWS thật, index còn phải qua `CREATING`/backfill. Trình giả lập bỏ qua bước này".

**S9 (predict, chạy thật A5).** Query GSI với `ConsistentRead: true` ngay sau khi ghi. Có bốn lựa chọn:

| | Lựa chọn | Nhận xét |
|---|---|---|
| (a) | Trả bản mới, tốn 1 RCU | Bẫy DY2 |
| (b) | Trả bản mới, 0,5 RCU | |
| (c) | **`ValidationException`** | **Đáp án** |
| (d) | Có thể trả bản cũ | Đúng khi **bỏ** `ConsistentRead` |

Câu nối tiếp hỏi về MongoDB: đọc với `readPreference: secondary` thì sao? "may return stale data" (T2).

**S10 (quiz).** Bảng sự kiện Postgres có 800 triệu dòng, lớn hơn RAM nhiều lần. Báo cáo luôn lọc theo tháng. Dữ liệu cũ hơn 2 năm phải xóa hàng tháng.

- Đáp án: **partition theo tháng.** Pruning (A6: chỉ `orders_p_10`), và xóa dữ liệu cũ bằng `DROP`/`DETACH` partition thay cho `DELETE` (`e-pg-l4-07`, `e-pg-l4-08`).
- Bẫy: "Partition luôn làm câu nhanh hơn, nên partition cả bảng 3.000 dòng". Docs đặt ngưỡng là bảng lớn hơn bộ nhớ.
- Lựa chọn sai: "Chuyển sang MongoDB sharding". Một máy vẫn đủ, đây là vấn đề đọc ít đi chứ không phải trải tải.

**S11 (predict, chạy thật A9).** Ba nguồn dữ liệu, một nguồn ghi tiền dạng chữ. Đếm đơn trên 5 triệu ở mỗi engine thì sao?

- Đáp án:
  - Postgres **không nhận** dòng lệch (`22P02`);
  - Mongo và DynamoDB nhận nhưng **không đếm** nó, và không báo gì.
- Bẫy: "Mongo tự ép kiểu chuỗi số".
  - Nghe hợp lý vì JavaScript làm vậy (`"6500000" > 5000000` là true).
  - Thật ra MongoDB có type bracketing: `$gt` không khớp chuỗi (vòng 9 §4.1).
- Bước tiếp theo (lab): viết truy vấn "phải trả 0 dòng" bằng `$type` hoặc `attribute_type` (BP A12).

**S12 (predict, chạy thật A9 và vòng 9 DY6).** Scan với `Limit: 100` và filter "đơn trên 9,5 triệu", trang đầu trả `Count: 5`. Vậy có bao nhiêu đơn như thế?

- Đáp án: **chưa biết.** Còn `LastEvaluatedKey`, phải đọc tiếp.
- Bẫy: "5".
- Bài liên quan: `e-dy-l1-10`, `e-dy-l2-02`.

**Phủ hiểu lầm:**

- S1 → MG1/DY4.
- S2 → DY3.
- S3 → MG1.
- S4 → MG5.
- S5 → DY1/PG4.
- S6 → DY3.
- S7 → MG (shard key, chưa có mã: đề xuất thêm **MG7** "shard key nào cũng được, balancer tự lo" vào pedagogy §2.3).
- S8 → đề xuất **DY7** "GSI mới phủ mọi item cũ".
- S9 → DY2/MG6.
- S10 → đề xuất **PG9** "partition luôn nhanh hơn".
- S11 → MG1.
- S12 → DY5/DY6.

---

## 3. Cầu nối DA ↔ Engine

### 3.1 Cách đọc bảng

- **Engine PG** và **DynamoDB**: id bài trên `v22-engine`, đã đối chiếu với frontmatter (`scratchpad/r10/lessons.tsv`, 195 bài).
- **Mongo path**:
  - kỹ năng `mg.*` trong `content/engine/mongodb/path/skills-*.yml`;
  - Phần 7–12 có trường `sql:`, đối chiếu chính xác;
  - **Phần 1–6 không có trường `sql:`** (0/23 kỹ năng), nên tôi ghép theo tên (`mg.group_keys` ↔ `group_by`…). Đây là một lỗ, xem §3.3.
- **Bài Mongo:** bài cấp L1–L5 nên link tới.
- **BP:** thẻ `e-bp-*` có `skills:` chứa kỹ năng đó (lấy từ frontmatter, không đoán).
- "—" = không có.

### 3.2 Bảng ánh xạ (38 kỹ năng)

| Kỹ năng DA | Engine PG ("Đào sâu") | Mongo path / bài | DynamoDB | BP |
|---|---|---|---|---|
| `select` | `e-pg-l1-01` | `mg.find`, `mg.projection` / `e-mg-l1-03` | `e-dy-l1-05` | `e-bp-s08`, `e-bp-q22` |
| `where` | `e-pg-l1-09`, `e-pg-l1-10` | `mg.filter` / `e-mg-l1-02`, `e-mg-l1-07` | `e-dy-l1-08`, `e-dy-l2-02` | `e-bp-d06`, `e-bp-d15`, `e-bp-m09`, `e-bp-m15`, `e-bp-x01`, `e-bp-q03`, `e-bp-q12` |
| `order_by` | `e-pg-l1-11`, `e-pg-l3-14` | `mg.sort` / `e-mg-l1-10` | `e-dy-l1-08` (chỉ theo sort key) | `e-bp-d04`, `e-bp-d18`, `e-bp-q10` |
| `limit` | `e-pg-l1-11` | `mg.limit` / `e-mg-l1-10` | `e-dy-l1-10` (DY6) | `e-bp-q10` |
| `aggregate` | `e-pg-l4-04` (HashAggregate), `e-pg-l1-08` (materialized view) | `mg.group` / `e-mg-l2-06` | `e-dy-l2-05` (đếm bằng `ADD`). **Lỗ:** chưa có bài materialized aggregation | `e-bp-a18`, `e-bp-q04` |
| `group_by` | `e-pg-l4-03` (ước lượng nhóm), `e-pg-l4-04` | `mg.group_keys` / `e-mg-l2-06` | — (A2: không GROUP BY) | `e-bp-m09`, `e-bp-a18`, `e-bp-q15`, `e-bp-q22` |
| `having` | — | `mg.match_after_group` / `e-mg-l2-05` | — | `e-bp-q15` |
| `join` | `e-pg-l4-04`, `e-pg-l4-05` | `mg.lookup`, `mg.unwind` / `e-mg-l2-08`, `e-mg-l2-11` | `e-dy-l1-03`, `e-dy-l3-08` | `e-bp-m01`, `e-bp-i06` |
| `multi_join` | `e-pg-l4-05` (thứ tự nối, GEQO) | `mg.lookup` | `e-dy-l3-07` | `e-bp-q07` |
| `left_join` | `e-pg-l4-04` | `mg.lookup_keep` / `e-mg-l2-08` | `e-dy-l3-08` | `e-bp-m18`, `e-bp-a01`, `e-bp-a11`, `e-bp-q05`, `e-bp-q06` |
| `anti_join` | — (lỗ: Hash Anti Join) | `mg.lookup_none`, `mg.except_like` | — | `e-bp-a11`, `e-bp-q02` |
| `date_math` | `e-pg-l2-10` (khoảng thời gian) | `mg.date_math` | `e-dy-l3-09` (khóa ISO) | `e-bp-s01`, `e-bp-a05`, `e-bp-q12` |
| `date_bucket` | `e-pg-l2-08` (BRIN), `e-pg-l4-07` (partition theo thời gian) | `mg.date_bucket` / `e-mg-l4-03`, `e-mg-l5-08` | `e-dy-l4-10` | `e-bp-a01` |
| `null_logic` | `e-pg-l1-05` (có `NOT IN`) | `mg.missing_null` / `e-mg-l1-09` | `e-dy-l3-06` (thiếu thuộc tính = không vào index) | `e-bp-m16`, `e-bp-m17`, `e-bp-q01`, `e-bp-q03` |
| `case_when` | — | `mg.cond` | — | — |
| `conditional_agg` | — | `mg.cond_sum` | — | `e-bp-q13` |
| `coalesce` | — | `mg.if_null` (A8 `$ifNull`) | — | `e-bp-m18`, `e-bp-q05` |
| `self_join` | — | `mg.self_lookup` | `e-dy-l3-10` (adjacency list) | — |
| `string_fn` | `e-pg-l2-04` (index biểu thức `lower()`) | `mg.string_ops` / `e-mg-l3-14` (collation) | — | `e-bp-i05` |
| `pattern_match` | `e-pg-l2-13` (trigram), `e-pg-l2-12` (FTS) | `mg.regex` / `e-mg-l1-09` | `e-dy-l3-09` (`begins_with`) | — |
| `distinct` | — | `mg.distinct` | — | — |
| `cast` | `e-pg-l1-01` | `mg.convert` / `e-mg-l1-01` (BSON) | — (A9: `S` và `N`) | `e-bp-d18`, `e-bp-s03`, `e-bp-q13` |
| `scalar_subquery` | — | `mg.lookup_pipeline`, `mg.facet` / `e-mg-l2-09` | — | — |
| `in_subquery` | — | `mg.in_other` | — | `e-bp-q02` |
| `exists` | — | `mg.in_other` | — | `e-bp-q02` |
| `correlated_value` | — | `mg.lookup_pipeline` | — | — |
| `cte` | — | `mg.stages`, `mg.set_fields` / `e-mg-l2-04` | — | `e-bp-q07` |
| `multi_cte` | — | `mg.stages` | — | — |
| `distinct_on` | — | `mg.first_per_group` | — | `e-bp-a03` |
| `union` | — | `mg.union_with` | — | — |
| `except` | — | `mg.except_like` | — | — |
| `full_join` | — | `mg.full_like` | — | — |
| `window_rank` | — | `mg.win_rank` / `e-mg-l2-10` | — | `e-bp-a03` |
| `window_lag` | — | `mg.win_shift` / `e-mg-l2-10` | — | — |
| `window_agg` | — | `mg.win_agg` / `e-mg-l2-10` | — | — |
| `explain_read` | `e-pg-l1-10`, `e-pg-l2-14`, `e-pg-l2-15`, `e-pg-l4-01` | `mg.explain_read` / `e-mg-l3-06`, `e-mg-l3-10` | `e-dy-l1-09` (ConsumedCapacity như "plan") | `e-bp-q11` |
| `sargable` | `e-pg-l2-04`, `e-pg-l1-10` | `mg.covered` / `e-mg-l3-12` | `e-dy-l2-02` | `e-bp-d06`, `e-bp-d15`, `e-bp-i05`, `e-bp-q11` |
| `index_design` | `e-pg-l1-09`, `e-pg-l2-01`, `e-pg-l2-02`, `e-pg-l2-03`, `e-pg-l5-07` | `mg.esr`, `mg.covered` / `e-mg-l3-05`, `e-mg-l3-07` | `e-dy-l3-01`, `e-dy-l3-02` | `e-bp-i02`, `e-bp-i03`, `e-bp-i04`, `e-bp-i05`, `e-bp-i06` |

**Nút General nâng cao** (Finance dùng `adv:`) cũng nên có chip "Đào sâu":

| Nút | Bài nên link |
|---|---|
| `a7` JSON/JSONB | `e-pg-l2-11`, `e-mg-l1-01` |
| `a10` Hiệu năng sâu hơn | `e-pg-l2-14`, `e-pg-l4-01`, `e-pg-l5-11` |
| `c2` Star schema và grain | `e-mg-l2-11`, `e-dy-l3-01` (thiết kế theo câu hỏi, đối lập với chuẩn hóa) |
| `a4` ROLLUP | Không có: đã grep `rollup\|grouping sets` trên `content/engine/`, chỉ `interview-bank.yml` nhắc tới. Đây là một lỗ, không gắn chip |

### 3.3 Lỗ (việc cho v28 LINK, RECALL, nội dung)

1. **E-com và Finance không có chương index/plan.**
   - `grep` `explain_read|sargable|index_design` trên `content/domains/**` cho ra 0 file. Chỉ Logistics `ch11-01…06` dùng ba kỹ năng này.
   - Roadmap v28 LINK ("chip Đào sâu từ E-com/Finance (ch có index/plan)") cần đổi thành một trong hai:
     - (a) chip từ **kỹ năng** của ticket: mọi ticket có `requires`/`grants` ở cột "Engine PG" của §3.2;
     - (b) chỉ ch11 Logistics + nút `a7`/`a10`/`c2`.
   - Đề xuất (a), một dòng trong `engineLink.ts`: bảng `skill → lesson[]` sinh từ §3.2.
2. **Postgres Engine thiếu bài về kế hoạch của các cấu trúc DA dùng nhiều:**
   - `WindowAgg` (window: 0 bài có `OVER (`);
   - `Hash Anti Join` (anti join, `NOT EXISTS`: 0 bài có "Anti");
   - CTE được inline (từ PG 12) so với `MATERIALIZED`;
   - `HashAggregate`/`Unique` cho `DISTINCT`/`UNION`.
   - 20/38 kỹ năng không có bài PG để link. Đề xuất một mô-đun nhỏ L2 "kế hoạch của truy vấn phân tích", 4 bài `predict` có `expect`, chạy được trên PGlite. Đây là lỗ có giá trị nhất cho người học DA.
3. **DynamoDB thiếu bài materialized aggregation:** `ADD` + GSI sparse theo kỳ, theo trang AWS. A2/S5 là bằng chứng. Phần Streams là T2.
4. **Mongo path Phần 1–6 không có trường `sql:`.** Thêm trường để LINK đọc được từ dữ liệu, không ghép theo tên. Đó là 23 dòng YAML, như Phần 7–12.
5. **Không có thẻ BP** cho:
   - `case_when`, `self_join`, `pattern_match`, `distinct`;
   - các subquery (`scalar_subquery`, `correlated_value`);
   - `multi_cte`, `union`, `except`, `full_join`, `window_lag`, `window_agg`.
   - Catalogue có Q16 (`UNION ALL`), A15, A16 (`lag`/`lead` phải có `PARTITION BY`) nhưng **chưa thành file thẻ**. Đó là các ứng viên rẻ nhất.
6. **RECALL:** capstone so sánh nên gọi lại một câu của mỗi engine:
   - `e-pg-l1-10` (Seq Scan dù có index);
   - `e-mg-l2-08` (`$lookup` LEFT OUTER);
   - `e-dy-l2-02` (filter không giảm RCU).

---

## 4. Việc cho các luồng v28

| Luồng | Việc | Nhãn |
|---|---|---|
| E-CMP | Bộ dữ liệu §1 (60 khách, 3.000 đơn, tất định) làm seed chung cho ba runtime. Trang có chín trục: bảng §1.1, mỗi trục một ô "Chạy" trên mỗi runtime, cột nhãn §1.11. Capstone 5 bước như §1.11. Quiz chọn trong S1–S12 | T1 + nhãn từng ô |
| E-CMP, nội dung | Mỗi ô T1≠ có một dòng "trình giả lập khác DynamoDB/MongoDB thật ở đâu": GSI cập nhật ngay, GSI mới `ACTIVE` ngay, `$count` rỗng, không index | — |
| CMP-SQL | Bảng vòng 9 §4.2, thêm 3 dòng: `GROUP BY` → "không có, Scan + cộng phía ứng dụng, hoặc tính trước bằng `ADD`" (A2); `ALTER TABLE ADD COLUMN DEFAULT` → "item cũ thiếu thuộc tính, GSI mới bỏ qua" (A8); cột tên `total`/`status`/`name`… → `#alias` (A7) | T1 |
| LINK | §3.2 thành `skill → lesson[]` cho `engineLink.ts`. Chip BP lấy từ `skills:` của thẻ (đã có, không cần bảng mới). Sửa phạm vi E-com/Finance theo §3.3 mục 1 | — |
| Pedagogy | Thêm MG7, DY7, PG9 (§2) vào danh mục §2 của `engine-pedagogy.md` | — |
| Nội dung (sau v28) | Mô-đun PG "kế hoạch của truy vấn phân tích" (§3.3 mục 2); bài DynamoDB materialized aggregation (§3.3 mục 3); `sql:` cho Mongo path 1–6 | T1 |

---

## Phụ lục A. Script và output

Thư mục: `C:\Users\KHOA~1.HUY\AppData\Local\Temp\claude\…\scratchpad\r10\`, nằm ngoài repo.

**`cmp.mjs`:**

- nạp PGlite 0.5.16 từ `node_modules` của repo;
- nạp mingo qua `createRequire`;
- nạp dynoxide 1.5.0 bằng cùng shim với `r9/dy.mjs` (vá `fetch` cho `file:`, định tuyến `postMessage`, `open { ephemeral: true }`);
- sinh dữ liệu §0 và nạp vào ba runtime;
- chạy A1–A9 với `assert` đáp số giống nhau, kết thúc bằng `ALL ASSERTIONS PASSED`. Output ở `cmp.out`.

**`sum.mjs`:** mingo `$sum`/`$avg`/`$max` trên chuỗi số, `$gt` trên chuỗi, `$count` rỗng. Output ở `sum.out`.

**`lessons.tsv`:** id, loại, runtime, tiêu đề của 195 bài Engine trên `v22-engine`, dùng để kiểm id ở §3.

**Dòng chính:**

```text
A1 dynamo items SK ["PROFILE","ORDER#2026-10-28T07:03:30Z#O00824",…]  CC 0.5, scanned 4
A2 dynamo scan cost {"pages":1,"scanned":3062,"kept":977,"rcu":43.5}
A3 pg before {"nodes":["Limit","Sort","Seq Scan orders"],"cost":73.49}
A3 pg after  {"nodes":["Limit","Index Only Scan orders [orders_status_created]"],"cost":5.7}
A3 dynamo GSI {"scanned":20,"count":20,"cc":0.5} | Scan+filter {"scanned":3062,"kept":411,"rcu":43.5}
A4 pg 23514 … products_stock_check | mingo matched [1,0], P1 3 | dynamo [None, ConditionalCheckFailed], P1 5
A4 dynamo TransactWriteItems UnsupportedOperation
A5 GetItem eventual/strong RCU [0.5,1] | GSI ConsistentRead ValidationException | GSI sees new item at once true
A6 pg pruned ["Aggregate","Seq Scan orders_p_10"] | mingo status 4/0.594, customerId 60/0.32 | dynamo CUST#C001 961, 0.314
A7 pg PK cost 8.3 | Seq Scan cost 62.5 | dynamo GetItem 0.5, Scan 43.5 | answer [283,283,283]
A7 dynamo `total` unescaped: ValidationException … reserved keyword: total
A8 pg filenode/size 16394/204800 → 16394/204800, atthasmissing true {store}
A8 mingo {channel:"store"} [{"n":0}] | $ifNull app 1, store 3000 | dynamo byChannel:ACTIVE, store 0 / app 1
A9 pg 22P02 | count>5M pg/mingo/dynamo 1462 | $type / attribute_type → O90002 | Limit 100 page Count 5 Scanned 100 LEK
A9 pg created_at::date cost 47.57 vs half-open 17.75 (both Bitmap Index Scan on orders_status_created)
```

## Phụ lục B. Nguồn (đọc 2026-11-20)

**Đọc mới ở vòng này:**

- PostgreSQL 18, ALTER TABLE (Notes): https://www.postgresql.org/docs/18/sql-altertable.html *(qua fetch)*
- PostgreSQL 18, Table Partitioning: https://www.postgresql.org/docs/18/ddl-partitioning.html *(qua fetch)*
- PostgreSQL 18, Transaction Isolation: https://www.postgresql.org/docs/18/transaction-iso.html *(qua fetch)*
- MongoDB, Choose a Shard Key: https://www.mongodb.com/docs/manual/core/sharding-choose-a-shard-key/ *(qua fetch)*
- MongoDB, Atomicity and Transactions: https://www.mongodb.com/docs/manual/core/write-operations-atomicity/ *(qua fetch)*
- MongoDB, Read Preference: https://www.mongodb.com/docs/manual/core/read-preference/ *(qua fetch)*
- AWS, NoSQL design for DynamoDB: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-general-nosql-design.html
- AWS, Take advantage of sparse indexes: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-indexes-general-sparse-indexes.html
- AWS, Managing Global Secondary Indexes: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.OnlineOps.html
- AWS, materialized aggregation queries: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-gsi-aggregation.html
- AWS, Reserved words: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ReservedWords.html

**Dùng lại** (trích ở `engine-pedagogy.md` §5 và vòng 9 phụ lục B):

- AWS GSI, Query/SQLtoNoSQL, Scan, data modeling foundations, write sharding;
- MongoDB Data Modeling, `$lookup`, `$count`, `$sum`, SQL to Aggregation Mapping Chart, Transactions.
