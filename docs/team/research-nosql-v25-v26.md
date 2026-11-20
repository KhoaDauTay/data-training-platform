# Research NoSQL cho v25 (MongoDB đủ) và v26 (DynamoDB đủ)

Luồng research thường trực (L215.6), vòng 9. Đọc kèm:

- `roadmap-v23-v30-revised.md` (nhánh `v22-engine`): v25 = REC, MG-CAP, MG-CAPTURE, MG-UI; v26 = DY-UI, DY-C.
- `engine-pedagogy.md` §2.3–§2.4: danh mục hiểu lầm MG1–MG6, DY1–DY6.
- `spike-engine.md` ES2/ES3: mingo 7.2.6 và dynoxide 1.5.0 chạy được gì.
- `product-design-db-engine.md`: năm loại bài và định dạng ENGINE-CONTENT-V1.

**Thông tin chung:**

- **Ngày:** 2026-11-20.
- **Phạm vi:** chỉ tài liệu. Không code app, không build, không chạy Docker hay `mongod`.
- **Phiên bản đã thử:** mingo 7.2.6 và `@dynoxide/wasm-engine` 1.5.0, đúng bản repo ghim, chạy trong Node 24.
- **Script:** ở `scratchpad/r9/`, không nằm trong repo; xem phụ lục A.

**Quy ước trích dẫn:**

- Câu trong ngoặc kép là nguyên văn đã đọc trên trang nguồn, mỗi câu dưới 15 từ.
- Trang đọc qua công cụ fetch: công cụ này tóm tắt trang rồi trả lại câu trích. Câu nào tôi chưa thấy nguyên văn thì ghi *(chưa kiểm nguyên văn)*.
- Docs MongoDB đọc ngày 2026-11-20. Bản đang hiện trên trang là **9.0 (Current)**, tôi suy ra từ ô chọn phiên bản.
- Docs AWS là bản "latest" (không có số phiên bản).

---

## 0. Tóm tắt

1. **Danh mục hiểu lầm trong `engine-pedagogy.md` đã cũ.**
   - DY2 đã có quiz ở `dynamodb/L2/11` và `L3/04`.
   - DY4 đã có một câu quiz ở `L3/07`.
   - MG2 đã nói "LEFT OUTER" ở `mongodb/L2/08`.
   - Còn thiếu: phần **chạy thật** cho DY2 và DY6, phép tính chi phí cho DY4, và chi phí/index cho MG2 (§1).
2. **Kết quả đo trên dynoxide 1.5.0:**
   - `ConsumedCapacity` khớp **mọi** luật RCU/WCU của AWS đã thử: 25 phép đo, tính cả GSI (§3.2).
   - Tab Chi phí dùng được số thật cho thao tác thành công.
   - Ba thứ dynoxide không cho thấy, tab phải tính bằng công thức và ghi nhãn: ghi có điều kiện bị từ chối, giao dịch bị hủy, và throttle/partition.
3. **Bằng chứng cho bài đối mặt, đều chạy được:**
   - DY2: `ConsistentRead: true` trên GSI → dynoxide trả `ValidationException` thật.
   - DY6: `Limit` 6 + filter → `ScannedCount` 6, `Count` 1, kèm `LastEvaluatedKey`.
   - DY4: single-table tốn 0,5 RCU, hai bảng tốn 1 RCU, đúng ví dụ của AWS.
4. **dynoxide không cho thấy độ trễ của GSI.** GSI thấy ngay item vừa ghi. Bài DY2 phải ghi rõ "trình giả lập cập nhật GSI ngay; DynamoDB thật thì bất đồng bộ".
5. **mingo ≠ MongoDB, ca mới tìm thấy:**
   - Ở mingo, `$count` trên đầu vào rỗng trả `[{n: 0}]`.
   - Docs MongoDB nói "If the input dataset is empty, `$count` doesn't return a result."
   - Đây là bẫy SQL quan trọng (`COUNT(*)` luôn trả một dòng). Thêm vào bộ golden và sửa hoặc ghi chú trong runner (§4.1, §5).
6. **Explain ghi sẵn:**
   - Không có `mongod` thì mọi output chỉ được mang nhãn **"trích tài liệu MongoDB 9.0"**. Không bài nào được mang nhãn "ghi từ `mongod`".
   - Chỉ `L3/06` và `L3/07` có **số explain** chính thức (trang *Analyze Query Performance* bản 9.0: 21.349 / 3809 / 246 / 235; bản 8.0 của cùng trang dùng ví dụ `inventory` khác hẳn).
   - Mọi predict L3–L5 khác có **kết luận** nêu trong docs (dùng/không dùng index, mấy tài liệu, rollback…), nên đủ nhãn T2 nếu không kèm JSON explain. `mongod` chỉ cần để nâng lên T3 có số thật (§2.4).
   - Tôi không thấy tên chiến lược join của `$lookup` (`IndexedLoopJoin`, `HashJoin`…) trong các trang docs đã đọc. Không dựng output theo chúng.

---

## 1. Bài đối mặt cho hiểu lầm còn thiếu

### 1.1 Soát lại độ phủ (trên `v22-engine`)

| Mã | Pedagogy ghi | Hiện trạng thật | Phần còn thiếu |
|---|---|---|---|
| DY2 | "Chưa có" | `L2/11-consistency.md`: quiz "`ConsistentRead` trên GSI → `ValidationException`". `L3/04-query-gsi.md`: mục tiêu "không đọc strong được" và một quiz cùng ý | Bước **chạy** thật; câu đoán "đọc ngay sau ghi"; chi phí ghi GSI |
| DY4 | "Chưa có" | `L3/07-single-table.md`: một quiz (nhật ký đăng nhập → bảng riêng vì Standard-IA và backup) | Phép tính RCU cho thấy single-table rẻ hơn **khi nào**; một bước capstone |
| DY6 | "Chưa kiểm" | `L1/10-paginate.md` có câu đúng trong văn ("`Limit` giới hạn số item **đọc**…") | Chưa có `predict` hay bước lab nào bắt người học đoán trước |
| MG1 | "Chưa đối mặt" | `L2/13-schema-validation.md` là `runtime: docs` (`$jsonSchema` NO-GO, ES2) | Một lab cho thấy hậu quả của dữ liệu lệch kiểu, chạy trên mingo không cần validator |
| MG2 | "chưa có chi phí" | `L2/08-lookup.md`: LEFT OUTER, mảng rỗng, câu "nhúng hay tham chiếu". 0 lần nhắc index `foreignField` | Câu về index `foreignField`; `$lookup` + `$unwind` = INNER; predict chi phí (cần `mongod`, §2.4) |
| MG5 | "thiếu ý chi phí" | `L4/09-transactions.md` (docs) | Chỉ cần một câu trong `why` (F9), không cần lab. mingo không có transaction |

### 1.2 DY2: "GSI đọc nhất quán mạnh như bảng chính"

**Nguồn (AWS, GSI.html):**

- GSI được cập nhật "asynchronously, using an eventually consistent model".
- "Global secondary indexes support eventually consistent reads".
- "your applications need to anticipate and handle situations" khi GSI trả dữ liệu chưa mới.
- API Scan: "`ConsistentRead` parameter is not supported on global secondary indexes".

**Đo trên dynoxide 1.5.0** (`dy.mjs`):

| Request | Kết quả |
|---|---|
| `Query` GSI `byStatus`, `ConsistentRead: true` | `ValidationException: Consistent reads are not supported on global secondary indexes` |
| `Scan` GSI, `ConsistentRead: true` | cùng lỗi |
| `PutItem` rồi `Query` GSI ngay | **thấy** item mới (dynoxide cập nhật GSI đồng bộ) |
| `Query` bảng chính, `ConsistentRead: true` | OK, 1 RCU |

**Đề xuất (lab 3 bước, sửa `L3/04-query-gsi.md` hoặc thêm `L3/04b`):**

1. **Đoán rồi chạy.** Câu hỏi: "Thêm `ConsistentRead: true` vào Query trên `byStatus`: kết quả?" Sau đó chạy thật. Người học thấy `ValidationException`. Hiện quiz cuối bài chỉ hỏi bằng lời; chuyển nó thành bước chạy thì người học tự thấy kết quả.
2. **Câu đoán không có "Xem thật".** Câu hỏi: "Vừa `PutItem` đơn `NEW`. Query `byStatus = NEW` ngay lập tức có chắc thấy đơn đó không?" Đáp án: "không chắc". Thêm một dòng nhãn bắt buộc: "Trình giả lập trong trình duyệt cập nhật GSI ngay nên bạn sẽ thấy; DynamoDB thật cập nhật bất đồng bộ, thường dưới một giây."
   - Không được để kết quả của dynoxide trông như bằng chứng cho đáp án sai.
3. **Cách sửa đúng:** đọc lại bảng chính bằng `GetItem` với `ConsistentRead: true` (1 RCU thay vì 0,5) theo khóa lấy từ GSI. Bước này chấm bằng request, chạy thật.

**Chi phí ghi GSI** cho DY-UI, đo bằng `ReturnConsumedCapacity: "INDEXES"`. Kết quả khớp cả sáu trường hợp trong GSI.html §Write capacity units (`dy.mjs` và `dy5.mjs`):

| Ghi vào bảng (GSI `byStatus`, projection ALL) | Table | GSI | AWS nói |
|---|---|---|---|
| Put item mới có `status` | 1 | 1 | "one write operation is required" |
| Update đổi `status` NEW → PAID | 1 | **2** | "two writes are required" (xóa cũ + ghi mới) |
| Update thuộc tính không phải khóa (projection ALL nên có trong index) | 1 | 1 | đổi thuộc tính được project → 1 lần ghi |
| Put item **không có** `status` | 1 | — | "no additional write cost for the index" (GSI thưa) |
| Update thêm `status` cho item chưa có | 1 | 1 | định nghĩa thuộc tính index → 1 lần ghi |
| Update `REMOVE status` (item đang trong index) | 1 | 1 | xóa mục khỏi index → 1 lần ghi |
| Update thuộc tính **không** project (GSI `KEYS_ONLY`) | 1 | — | "no write capacity is consumed for that index" |
| Delete item đang có trong index | 1 | 1 | xóa mục index |

### 1.3 DY4: "Single-table luôn tốt hơn nhiều bảng"

**Nguồn (AWS, data-modeling-foundations.html):**

- Ưu điểm có số: "A single query for two items totalling less than 4KB is 0.5 RCU". Hai query thì 1 RCU.
- Nhược điểm: "Backups are all or nothing"; Infrequent Access kém lợi khi trộn dữ liệu lịch sử với dữ liệu vận hành; "Learning curve can be steep".
- Khi nào nhiều bảng: "multiple table design is a good and sufficient approach" nếu không truy vấn nhiều thực thể cùng nhau.

**Đo trên dynoxide** (`dy4.mjs`, khách `C-02` có hồ sơ + 3 đơn):

| Thiết kế | Request | RCU (eventual) |
|---|---|---|
| Một bảng `Shop` (`PK = CUST#C-02`) | 1 `Query` | **0,5** (4 item) |
| Hai bảng `Customers` + `Orders` | `GetItem` + `Query` | 0,5 + 0,5 = **1** |

**Đề xuất:**

- **Lab "đếm chi phí".** Hai bảng đã seed sẵn. Người học viết cả hai cách lấy "khách và đơn của khách". Tab Chi phí hiện 0,5 so với 1.
- **Quiz đảo chiều, ba tình huống:**
  - (a) Màn hình đơn hàng đọc khách + đơn mỗi lần → một bảng.
  - (b) Nhật ký truy cập, không bao giờ đọc chung, cần Standard-IA → bảng riêng (đã có ở `L3/07`).
  - (c) Dữ liệu của một tenant cần khóa mã hóa riêng → bảng riêng, vì "Table encryption is shared across all items" *(chưa kiểm nguyên văn câu dài; ý có trong trang)*.
- **Bước capstone L3** (`L3/11-capstone-shop-design.md`): câu "Thực thể nào nên tách bảng? Vì sao?". Chấm bằng quiz, không chấm bằng request.

### 1.4 DY6: "`Limit` là số item trả về sau filter"

**Nguồn (AWS, API_Scan):**

- `Limit` là "The maximum number of items to evaluate (not necessarily the number of matching items)".
- Thứ tự xử lý: "first reads up to the maximum number of items set" rồi mới lọc.
- Về kết thúc trang: "`LastEvaluatedKey` is not empty, it does not necessarily mean" còn dữ liệu.

**Đo trên dynoxide** (`dy.mjs`): bảng `Orders`, 12 đơn của `C-01`, `status` lặp NEW, PAID, SHIPPED, DELIVERED. Filter là `status = DELIVERED`.

| Request | `ScannedCount` | `Count` | `LastEvaluatedKey` | RCU |
|---|---|---|---|---|
| Query, `Limit: 6` + filter | 6 | **1** | có | 0,5 |
| Query, `Limit: 2` + filter (trang 1) | 2 | **0** | có | 0,5 |
| Query, không `Limit` + filter | 12 | 3 | không | 0,5 |
| Scan, `Limit: 6` + filter | 6 | 1 | có | 0,5 |

**Đề xuất (`predict`, `runtime: browser`, thêm vào `L2/02-key-vs-filter.md` hoặc `L1/10-paginate.md`):**

- **Câu hỏi:** "Query khách `C-01` với `Limit: 6` và filter `DELIVERED`. Trả về mấy item?"
- **Lựa chọn:** 6 / 3 / 1 / 0.
- **Đáp án:** 1, vì `Limit` đếm 6 item **đọc**, trong 6 item đầu chỉ có 1 item `DELIVERED`.
- **"Xem thật":** chạy request, chỉ vào `ScannedCount` 6, `Count` 1 và `LastEvaluatedKey`.
- **Câu nối:** "Muốn đủ 3 đơn `DELIVERED` thì phải lặp theo `LastEvaluatedKey`. Muốn rẻ thì đưa `status` vào khóa (GSI) thay cho filter."
- Dùng **Query**, không dùng Scan. Thứ tự Scan của dynoxide không chắc giống DynamoDB, còn Query sắp theo sort key nên đáp án xác định.

### 1.5 MG1: "Schemaless nghĩa là không cần thiết kế"

`$jsonSchema` vẫn NO-GO (ES2: cần Ajv). Không cần validator vẫn đối mặt được: để người học **thấy dữ liệu lệch kiểu làm sai báo cáo**.

**Nguồn (MongoDB `$sum`):** "$sum ignores the non-numeric values and returns the sum of the numeric values."

**Đo trên mingo** (`mg.mjs`):

- Dữ liệu: `orders` có 5 tài liệu. Một tài liệu có `total: "300000"` (chuỗi), một tài liệu thiếu `total`.

| Câu | Kết quả mingo | Ý dạy |
|---|---|---|
| `$group` `{_id: null, sum: {$sum: "$total"}, n: {$sum: 1}}` | `sum` 700000, `n` 5 | Bỏ im lặng 300000; không có lỗi nào |
| Pipeline doanh thu theo thành phố | Hue: `revenue` **0**, `orders` 1 | Có đơn nhưng doanh thu 0 |
| `find({total: {$gt: 100000}})` | `o1`, `o2` (không có `o3`) | So sánh khác kiểu không khớp |
| `$sort: {total: 1}` | `null, 80000, 120000, 500000, "300000"` | Chuỗi xếp sau số (thứ tự kiểu BSON) |
| `find({$or: [{total: {$not: {$type: "number"}}}, {total: {$exists: false}}]})` | `o3`, `o4` | Câu "validator" tự viết |

**Đề xuất (lab `L2`, mô-đun modeling, mở F8):**

1. **Đoán:** "Tổng doanh thu Hue là bao nhiêu?"
2. **Chạy:** người học thấy kết quả 0.
3. **Tìm:** viết `find` có `$type` để tìm tài liệu lệch kiểu. Câu này chấm được trên mingo.
4. **Kết:** một đoạn văn: "MongoDB thật có `validator` với `$jsonSchema` để chặn từ lúc ghi (chưa chạy trong trình duyệt)."
   - Trích docs Data Modeling: "plan your schema prior to using your database at a production scale" (pedagogy §2.3 đã kiểm).

### 1.6 MG2: "`$lookup` giống hệt JOIN, dùng thoải mái"

**Nguồn (MongoDB `$lookup`, 9.0):**

- "Performs a left outer join to a collection in the same database".
- "perform better when the foreign collection contains an index on the foreignField".
- "Unindexed or correlated-subquery $lookup operations on large collections can slow down query performance."
- Từ 6.0, `$lookup` có thể chạy trên slot-based engine (SBE). Ngoại lệ: pipeline con, `from` là view hoặc collection shard.

**Đo trên mingo** (4 khách, 5 đơn, khách `c4` không có đơn):

| Pipeline | Số tài liệu | Tương đương SQL |
|---|---|---|
| `$lookup` | 4 (c4 có `orders: []`) | `LEFT JOIN` nhưng gom thành mảng, không nhân dòng |
| `$lookup` + `$unwind: "$orders"` | 4 (c4 **mất**; c1 tách thành 2) | `INNER JOIN` |
| `$lookup` + `$unwind` + `preserveNullAndEmptyArrays: true` | 5 | `LEFT JOIN` từng dòng |
| `$lookup` + `$match: {orders: {$size: 0}}` | c4 | anti-join (`NOT EXISTS`) |
| `$lookup` từ collection không tồn tại | `x: []` | **Chưa kiểm**: kết quả này do resolver của script trả `[]`, không chứng minh gì về mingo hay MongoDB. Đưa vào golden M8 |

**Đề xuất (bổ sung F7 trong `L2/08`):**

- **Predict chạy thật:** "Thêm `$unwind: "$orders"` sau `$lookup`: còn mấy tài liệu, khách nào biến mất?" Đáp án: 4, mất `c4`.
- **Không** viết predict "gõ nhầm `from`" cho tới khi M8 hoặc docs xác nhận hành vi.
- **Quiz bằng lời (docs):** "`$lookup` chạy 1000 lần/giây trên `orders` 1 triệu tài liệu, không có index ở `customerId`." Đáp án: tạo index `foreignField`, hoặc nhúng. Trích hai câu trên.
- **Predict trên explain:** cần `mongod` (§2.4, mục M7). Trước khi có `mongod` thì không viết.

### 1.7 MG5: transaction bọc mọi thứ

mingo không có session/transaction, nên chỉ có quiz. Sửa đủ ở F9: thêm vào `why` câu docs "a distributed transaction incurs a greater performance cost over single document writes" (pedagogy §2.3 đã kiểm). Không đề xuất lab.

---

## 2. MongoDB: explain ghi sẵn (REC, MG-CAPTURE)

### 2.1 Bài L3–L5 cần đọc trường nào

| Bài | Câu hỏi | Trường explain cần | Có số trong docs chính thức? |
|---|---|---|---|
| L3/02 partial | index partial `year > 2000` có dùng cho `year > 1990` không | `winningPlan` stage, `indexName` | **Kết luận có**: trang partial index dùng đúng ví dụ này; truy vấn `year > 1990` "matches documents that the partial index doesn't include". Không có output explain → T2 đủ |
| L3/03 multikey cover | multikey có phủ được không | có `FETCH` trên `IXSCAN`, `isMultiKey`, `totalDocsExamined` | **Luật có**: "Multikey indexes cannot cover queries over array fields" (Query Optimization). Không có output → T2 đủ |
| L3/06 collscan | không index thì sao | `stage: COLLSCAN`, `nReturned`, `totalKeysExamined`, `totalDocsExamined` | **Có**: *Analyze Query Performance*: 21.349 docs, 3809 trả về, 0 key, 21.349 docs đọc. Có index `{year:1}`: `FETCH` → `IXSCAN`, 3809/3809/3809 |
| L3/07 key count | `{year, rated}` hay `{rated, year}` | `totalKeysExamined` với `hint` | **Có**: cùng trang: 246 so với 235 key, 235 docs, 235 trả về |
| L3/08 ESR sort | range trước sort có `SORT` không | có stage `SORT` trong `winningPlan` | **Luật có**: "place sort fields before range fields" để tránh sort trong bộ nhớ; index đề xuất `{directors, year, runtime}`. Không có output → T2 đủ |
| L3/09 covered | `{rated, title}` + projection `{title:1}` | `IXSCAN` không dưới `FETCH`; `totalDocsExamined: 0` | **Luật và ví dụ có**: trang Query Optimization dùng `{ title: 1, _id: 0 }`; đáp án của bài ("phải ghi `_id: 0`") khớp. Không có output → T2 đủ |
| L3/10 plan cache | plan cache | `planCacheKey`, `isActive` | Không → giữ concept, không predict |
| L3/15 collation | index `strength: 2`, truy vấn `strength: 1` | `COLLSCAN`/`IXSCAN`; số tài liệu | **Kết luận có**: trang Case-Insensitive Index có đúng ví dụ `fruit`, chú thích "does not use the index, finds three results". Đáp án của bài khớp. T2 đủ |
| L3/16 sparse hint | `countDocuments` + `hint` sparse | chỉ kết quả đếm | **Kết luận có, không có số**: "returns only the documents that contain the `rated` field". Con số 700 là giả định của bài, phải ghi rõ. T2 đủ |
| L4/11 payment flow | đọc secondary ngay sau `w: majority` | không cần explain | Kết luận theo trang write concern / read isolation (bài đã trích). T2; T3 cần replica set 3 nút |
| L5/02 write conflict | hai lệnh trên cùng một tài liệu | không cần explain | Kết luận theo trang WiredTiger. T2 |
| L5/04 failover | lệnh nào còn sau bầu cử | không cần explain | Kết luận theo write concern + elections. T2; T3 cần replica set và cắt mạng: không đáng làm |
| L5/06 targeted | một shard hay mọi shard | `SINGLE_SHARD` / `SHARD_MERGE`, `shards[]` | Không. **Cần cụm shard** (mongos + 2 shard), lớn hơn một `mongod` |
| MG2 (mới) | `$lookup` không index `foreignField` | `$lookup` stage: `totalDocsExamined`, `collectionScans`, `indexesUsed` | Docs explain có liệt kê các trường này, không có ví dụ số → **cần `mongod`** |

**Các trường docs xác nhận** (trang Explain Results, 9.0):

- `queryPlanner` "details the plan selected by the query optimizer".
- `executionStats` cần verbosity `executionStats` hoặc `allPlansExecution`.
- `$lookup` có `totalDocsExamined`, `totalKeysExamined`, `collectionScans`, `indexesUsed`.
- Câu phủ (covered): `IXSCAN` không là con của `FETCH`.

### 2.2 Bẫy phiên bản: hai dạng explain

**Hai dạng output:**

- **Engine cổ điển:** cây nằm ở `queryPlanner.winningPlan.stage` / `.inputStage`.
- **SBE:** cây nằm ở `winningPlan.queryPlan`, chi tiết nội bộ ở `winningPlan.slotBasedPlan`, và `explainVersion` là `"2"` (`"1"` là cổ điển).
- Trang *Analyze Query Performance* (9.0) nói thẳng: "Explain plan results for queries are subject to change between MongoDB versions."

**Hệ quả cho REC:**

1. `recorded` phải lưu **cả** `version` lẫn `explainVersion`.
2. Code đọc phải chuẩn hóa: lấy `winningPlan.queryPlan ?? winningPlan` rồi đi theo `inputStage`/`inputStages`. Tab vẽ cây không được hard-code một đường.
3. Người học chỉ cần **4 trường**: stage gốc, `nReturned`, `totalKeysExamined`, `totalDocsExamined`. Thêm `SORT` có hay không cho L3/08. Hiển thị gọn 4 trường này cạnh JSON đầy đủ, như `pg-plan-tree` làm với Postgres.
4. Tên chiến lược join (`EQ_LOOKUP` với `IndexedLoopJoin`, `HashJoin`, `NestedLoopJoin`):
   - Thấy trong blog và Jira MongoDB. Tôi không thấy trong các trang docs đã đọc (fetch có tóm tắt, nên chỉ là "không thấy").
   - Trang Explain Results nhắc `EQ_LOOKUP` nhưng không nêu tên chiến lược.
   - **Không** dạy các tên này. Chỉ dạy `collectionScans` / `indexesUsed`.

### 2.3 Nhãn trung thực: ba tầng

| Tầng | Nhãn VI | Nhãn EN | Điều kiện |
|---|---|---|---|
| T1 chạy thật | "Chạy trong trình duyệt (mingo 7.2.6)" / "(dynoxide 1.5.0)" | "Run in your browser (…)" | output là kết quả request vừa chạy |
| T2 trích tài liệu | "Số liệu trích từ tài liệu MongoDB 9.0, trang *Analyze Query Performance*. Không chạy trong trình duyệt." | "Figures quoted from the MongoDB 9.0 manual, *Analyze Query Performance*. Not run in your browser." | Chỉ chép **số và tên stage** docs đã in, kèm URL. **Không** dựng JSON đầy đủ trông như output thật |
| T3 ghi sẵn | "Ghi sẵn từ MongoDB 8.0.x (`mongod`), ngày …, không chạy trong trình duyệt." | "Recorded from MongoDB 8.0.x (`mongod`) on …, not run in your browser." | Chỉ khi một người đã chạy `scripts/capture-mongo.md` thật, có `buildInfo().version` và `explainVersion` trong file |

**Đề xuất trường cho parser (REC):**

```yaml
recorded:
  tier: docs            # docs | mongod
  server: MongoDB       # tên engine
  version: "9.0"        # docs: phiên bản trang; mongod: buildInfo().version
  date: 2026-11-20
  url: https://www.mongodb.com/docs/manual/tutorial/analyze-query-plan/   # bắt buộc khi tier = docs
  explainVersion: null  # bắt buộc khi tier = mongod
  output: |             # tier docs: chỉ các trường docs in ra
    winningPlan.stage: COLLSCAN
    nReturned: 3809
    totalKeysExamined: 0
    totalDocsExamined: 21349
```

**Test nên thêm** (`tests/engineContent.test.ts`, điều kiện thoát v25):

- mọi `predict` MongoDB L3–L5 có `recorded`;
- `tier: docs` thì có `url` và không có khóa `queryPlanner` / `executionStats` dạng JSON;
- `tier: mongod` thì có `explainVersion`.

### 2.4 Danh sách cần `mongod` (chưa chạy: Docker chưa được duyệt)

| # | Bài | Cần gì |
|---|---|---|
| M1 | L3/02 partial | tùy chọn (T2 đã đủ): 1 `mongod` để có số |
| M2 | L3/03 multikey cover | tùy chọn: 1 `mongod` |
| M3 | L3/08 ESR sort | **nên có**: cặp explain có/không `SORT` là chỗ người học cần thấy tận mắt; 1 `mongod`, hai index |
| M4 | L3/09 covered | tùy chọn: 1 `mongod` (cả hai projection) |
| M5 | L3/15 collation | tùy chọn: 1 `mongod` |
| M6 | L5/06 targeted | cụm shard: mongos + config + 2 shard. Đắt nhất; có thể giữ T2 "minh họa theo docs sharding" |
| M7 | MG2 `$lookup` | 1 `mongod`; `orders` ≥ 10⁴ tài liệu; có và không index `customerId` |
| M8 | golden mingo ↔ `mongod` | các dòng "chỉ mingo" ở §4.1 và §1.6 (`$count`/`$group` trên rỗng, null + thiếu chung nhóm, `{tags: "a"}`, `$lookup` `from` không tồn tại) |

Vì vậy điều kiện thoát v25 ("mọi predict L3/L5 có `recorded` hoặc nhãn trích tài liệu") **đạt được không cần Docker**. Việc bắt buộc cần `mongod` chỉ còn M3, M7 và M8.

**Ghi chú cho người viết `scripts/capture-mongo.md`:**

- Không dùng `sample_mflix` của Atlas khi chưa rõ giấy phép (chưa kiểm). Sinh dữ liệu bằng seed tất định, cùng hình với dataset của lab.
- Khi đó **số liệu sẽ khác** 21.349 / 3809 của docs. Hai cách:
  - giữ T2 cho L3/06–07, hoặc
  - đổi câu hỏi theo số ghi được.
- Không trộn hai nguồn trong một bài.

---

## 3. DynamoDB: tab Partition/Chi phí (DY-UI)

### 3.1 Luật (AWS, `read-write-operations.html` trừ chỗ ghi khác)

**Đọc** (đơn vị 4 KB):

- Một item ≤ 4 KB: strong = 1 RCU, eventual = 0,5, transactional = 2 ("of an item up to 4 KB requires two read units").
- Làm tròn lên bội 4 KB: 3500 byte tính như 4 KB.
- `GetItem`: ceil(cỡ / 4 KB) × hệ số.
- `BatchGetItem`: **làm tròn từng item rồi cộng**. Ví dụ docs: 1,5 KB + 6,5 KB → 4 + 8 = 12 KB.
- `Query`: **cộng rồi mới làm tròn**. Ví dụ docs: 10 item, 40,8 KB → 44 KB.
- `Scan`: tính theo item **đã đọc**, không theo item trả về.
- Item không tồn tại: vẫn tốn. Projection và `Select: COUNT`: không rẻ hơn.
- Query/Scan không có dữ liệu vẫn tốn theo số partition phải tìm (không mô phỏng được).

**Ghi** (đơn vị 1 KB):

- Làm tròn lên bội 1 KB. Transactional ×2 ("one to prepare the transaction and one to commit it").
- `PutItem` đè item cũ và `UpdateItem`: tính bản **lớn hơn** giữa trước và sau.
- `DeleteItem`: theo cỡ item bị xóa.
- `BatchWriteItem`: làm tròn từng item rồi cộng.
- Ghi có điều kiện bị từ chối: "DynamoDB still consumes write capacity units".
- Giao dịch bị hủy: "This capacity is consumed even when a transaction does not succeed" (transaction-apis).

**GSI:**

- Ghi bảng có tác động lên GSI thì GSI tốn WCU riêng. Sáu trường hợp ở §1.2.
- Query GSI tính theo cỡ **mục index** (thuộc tính đã project), chỉ eventual.

**Công thức cho tab:**

```text
RCU_get    = ceil(size / 4096) × k        k = 0.5 eventual | 1 strong | 2 transactional
RCU_query  = ceil(Σ size_read / 4096) × k     (Scan: Σ trên mọi item đã đọc, trước filter)
RCU_batch  = Σ ceil(size_i / 4096) × k
WCU_write  = ceil(max(before, after) / 1024) × (2 nếu transactional)
WCU_gsi    = Σ_index {0 | 1 | 2} × ceil(size_index_entry / 1024)
```

### 3.2 dynoxide 1.5.0 có ra đúng số không

Đo bằng `ReturnConsumedCapacity` (`dy.mjs`, `dy3.mjs`). Cỡ item tính theo luật L2/08: tên + giá trị.

| Ca | AWS | dynoxide | Khớp |
|---|---|---|---|
| Get 1,5 KB eventual / strong | 0,5 / 1 | 0,5 / 1 | ✓ |
| Get 6,5 KB eventual / strong | 1 / 2 | 1 / 2 | ✓ |
| Get đúng 4,0 KB strong | 1 | 1 | ✓ |
| Get key không tồn tại, strong | 1 | 1 | ✓ |
| Get 6,5 KB strong + projection 1 thuộc tính | 2 | 2 | ✓ |
| BatchGet 1,5 + 6,5 KB strong | 3 | 3 | ✓ |
| BatchGet 10 × ~0,9 KB strong | 10 | 10 | ✓ |
| Query 10 × ~0,9 KB strong / eventual | 3 / 1,5 | 3 / 1,5 | ✓ (cộng rồi làm tròn) |
| PartiQL `SELECT … WHERE pk =` strong | như Query: 3 | 3 | ✓ |
| Scan 5 item (16 KB) eventual / strong / `Select COUNT` | 2 / 4 / 2 | 2 / 4 / 2 | ✓ |
| Put 0,5 / 1,5 / 3,5 / 4,0 / 6,5 KB | 1 / 2 / 4 / 4 / 7 | 1 / 2 / 4 / 4 / 7 | ✓ |
| Update 3,5 → 4,2 KB | 5 | 5 | ✓ |
| Put 0,5 KB đè item 6,5 KB | 7 | 7 | ✓ |
| Delete 4 KB / Delete key không có | 4 / (1, *chưa kiểm nguồn*) | 4 / 1 | ✓ / ? |
| BatchWrite 0,5 KB + 3,5 KB | 5 | 5 | ✓ |
| `ExecuteTransaction` 2 INSERT nhỏ | 4 | 4 (`WriteCapacityUnits` 4) | ✓ |
| `TransactGetItems` 2 item nhỏ | 4 | 4 | ✓ |
| GSI: put / đổi khóa / đổi thuộc tính / item thưa | 1 / 2 / 1 / 0 | 1 / 2 / 1 / 0 | ✓ |
| Query GSI 4 item nhỏ | 0,5 | 0,5 (Table 0, GSI 0,5) | ✓ |
| Ghi có điều kiện bị từ chối | tốn WCU | lỗi `ConditionalCheckFailedException`, **không có** `ConsumedCapacity` | ✗: tab tính bằng công thức |
| Giao dịch bị hủy | tốn ×2 cho item đã thử | lỗi `TransactionCanceledException`, không có số | ✗: công thức |
| Item > 400 KB | `ValidationException` | `ValidationException: Item size has exceeded…` | ✓ |
| Bảng provisioned 1 WCU, 500 ghi trong 0,17 s | burst giữ tối đa 300 giây × 1 WCU = 300 đơn vị, nên **ước tính** AWS throttle phần vượt (chưa đo trên AWS) | 0 lỗi | ✗: không mô phỏng throttle |

Kết luận cho DY-UI:

- Thao tác **thành công**: hiện số của dynoxide, nhãn T1.
- Thao tác **lỗi**: tab tự tính theo §3.1, ghi "AWS vẫn tính phí: ước tính theo luật, trình giả lập không trả số".
- **Partition và throttle**: luôn là T2 (minh họa theo tài liệu).

### 3.3 Partition nóng

**Số liệu (AWS):**

- Mỗi partition: "maximum capacity of 3,000 read units per second and 1,000 write units per second" (`bp-partition-key-design`).
- Ví dụ trên cùng trang: item 20 KB, đọc strong = 5 RCU → tối đa 600 lần đọc/giây trên item đó.
- **Burst:** "retains up to five minutes (300 seconds) of unused read and write capacity". DynamoDB có thể tiêu phần này cho bảo trì nền mà không báo.
- **Adaptive capacity:**
  - Bật sẵn, không tốn thêm. Có thể cô lập item nóng vào partition riêng, nhưng trần vẫn 3000 RCU / 1000 WCU cho một khóa chính.
  - Không tách item collection khi bảng có LSI.
  - Ví dụ docs: 400 WCU / 4 partition, partition 4 nhận 150 → được nâng lên.
- **On-demand:**
  - Bảng mới: "sustain up to 4,000 writes per second and 12,000 reads per second".
  - Chịu tức thì gấp đôi đỉnh trước. Throttle nếu vượt gấp đôi đỉnh trong vòng 30 phút.
  - Trần mặc định 40.000 cho mỗi bảng (quota của account).
- **Write sharding** (`bp-partition-key-sharding`):
  - Hậu tố ngẫu nhiên `2014-07-09.1` … `.200`. Đọc cả ngày phải Query đủ 200 hậu tố rồi gộp.
  - Hậu tố tính được: hash(`OrderId`) mod 200 + 1, nên `GetItem` theo đơn vẫn được.

**Công thức và ví dụ cho bài:**

```text
WCU_key = writes/s × ceil(size/1 KB)          (× 2 nếu transactional, + WCU GSI)
RCU_key = reads/s  × ceil(size/4 KB) × k
N_shard tối thiểu = ceil(WCU_key / 1000)      (nên chừa 20–30 %: ý kiến, không phải luật AWS)
Chi phí đọc sau khi shard = N lần Query, mỗi lần làm tròn riêng
```

**Ví dụ 1** (bảng `Votes`, khớp `L4/01`):

- 1500 phiếu/giây, 0,4 KB → 1500 WCU > 1000.
- N = 2 → 750 mỗi shard.
- Đọc tổng ngày: 2 Query thay vì 1. Mỗi Query tối thiểu 0,5 RCU dù rỗng.

**Ví dụ 2** (khớp `L4/03`):

- 1800 ghi/giây × 1,5 KB → 2 WCU mỗi lần → 3600 WCU → N = 4 (900 mỗi shard).

**Ví dụ 3** (đọc; nối DY2):

- 4500 đọc strong/giây, item 3 KB → 4500 RCU > 3000.
- Chuyển sang eventual → 2250, dưới trần mà không cần shard.
- Nếu đọc qua GSI thì vốn đã eventual, và GSI có partition riêng.

**Ví dụ 4** (on-demand):

- Đỉnh cũ 50.000 đọc/giây. Lên 100.000 thì ngay lập tức được.
- Nhảy từ đỉnh 50.000 lên quá 100.000 (ví dụ 150.000) trong vòng 30 phút thì có thể bị throttle. Nếu 100.000 đã thành đỉnh mới thì 150.000 vẫn trong mức gấp đôi, không bị throttle.
- Đúng ví dụ trong docs (25.000–50.000). Dùng làm quiz "on-demand có cứu được khóa nóng không": không, trần 1000 WCU mỗi partition vẫn còn (`L4/06` đã nói).

**Đối chiếu số trong bài hiện có:** đã soát `L4/01`, `L4/02`, `L4/03`, `L4/06`, `L4/11`, `L2/09`, `L2/10`. Mọi số khớp docs.

- `L4/06` có bảng cộng 280 WCU: tôi cộng lại thì đúng (200 + 80 từ giao dịch).
- **Không thấy chỗ sai.**

### 3.4 Vẽ partition (`dy-partitions-hash`)

- dynoxide không có partition vật lý (spike §3). Mọi hình "hash → partition" là **minh họa**.
- Tab không được ghi "partition 2" như thể engine trả số đó.
- Đề xuất: tô item theo partition key, cột bên phải là "tải trên mỗi khóa" (WCU/s tính từ kịch bản bài), vạch đỏ ở 1000.
- Số tải là đầu vào của bài (T2), không đo.

---

## 4. "So với SQL" (MG-UI, CMP-SQL)

### 4.1 MongoDB: stage ↔ mệnh đề

Bảng gốc của MongoDB (*SQL to Aggregation Mapping Chart*, 9.0, mở đầu bằng "The aggregation pipeline maps to many common SQL aggregation operations."):

- WHERE → `$match`
- GROUP BY → `$group`
- HAVING → `$match`
- SELECT → `$project`
- ORDER BY → `$sort`
- LIMIT → `$limit`
- SUM() → `$sum`
- COUNT() → `$sum` / `$sortByCount`
- join → `$lookup`
- SELECT INTO NEW_TABLE → `$out`
- MERGE INTO TABLE → `$merge`
- UNION ALL → `$unionWith`

Bảng cho tab, có cột bẫy. Mọi dòng "mingo" đã chạy (`mg.mjs`):

| Stage | SQL | Bẫy (đã kiểm) |
|---|---|---|
| `$match` (đầu) | `WHERE` | **docs:** `{ item : null }` khớp cả tài liệu "do not contain the `item` field"; `$ne` "includes documents that do not contain the field"; `$gt`/`$lt` có type bracketing nên `$gt: 100000` không khớp chuỗi (trang `$ne`). **chỉ mingo → M8:** `{tags: "a"}` khớp mảng chứa `"a"` (chưa đọc trang mảng) |
| `$match` (sau `$group`) | `HAVING` | Cùng một stage. Vị trí trong pipeline quyết định nghĩa, không có từ khóa riêng |
| `$group` | `GROUP BY` + hàm gộp | **docs:** `_id: null` (hằng) gom mọi tài liệu; `$sum` bỏ qua giá trị không phải số (MG1). **chỉ mingo → M8:** `null` và thiếu trường vào chung một nhóm (mingo: `{_id: null, n: 2}`; trang `$group` không nêu luật này) |
| `$group` trên đầu vào rỗng | `SELECT count(*) …` (luôn 1 dòng) | **chỉ mingo → M8:** không trả dòng nào (trang `$group` không nói) |
| `$count` trên đầu vào rỗng | `SELECT count(*)` = 0 | MongoDB: "If the input dataset is empty, `$count` doesn't return a result." **mingo trả `[{n: 0}]`: lệch.** Golden M8; runner cần sửa hoặc bài không được dựa vào ca này |
| `$project` | `SELECT` danh sách cột | `_id` luôn có trừ khi `_id: 0` (bẫy câu phủ L3/09) |
| `$sort` | `ORDER BY` | **docs** (BSON comparison order): Null < Numbers < String, và "treats a non-existent field as if it were null". mingo khớp (`null, 80000, …, "300000"`). Không có `NULLS LAST` |
| `$limit` | `LIMIT` | Đặt trước `$sort` thì cắt trước rồi mới sắp (mingo: `[1,3]` so với `[1,2]`) |
| `$lookup` | `LEFT JOIN` gom mảng | Không nhân dòng. `from` không tồn tại: chưa kiểm (§1.6, M8) |
| `$lookup` + `$unwind` | `INNER JOIN` | Mất tài liệu không có cặp, trừ khi `preserveNullAndEmptyArrays` |
| `$lookup` (`let` + `pipeline`) | subquery tương quan | Docs: tương quan + không index thì chậm. Từ 6.0, dạng này **không** chạy trên SBE |
| `$addToSet` + `$size` | `COUNT(DISTINCT …)` | Mảng nằm trong một tài liệu, nên bị giới hạn 16 MB *(giới hạn cỡ tài liệu, chưa kiểm câu nguyên văn)* |
| `$out` / `$merge` | `SELECT INTO` / `MERGE` | Runner đã sửa lỗi bẩn dữ liệu ở `v22-nosql-fix` (L254); kiểm lại sau khi gộp |

**"Pipeline từng bước"** (MG-UI):

- Cách làm: chạy tiền tố `pipeline.slice(0, k)` cho k = 1..n trên mingo. Mỗi bước hiện số tài liệu và 3 tài liệu đầu.
- Đã thử với pipeline 5 stage (`$match` → `$lookup` → `$unwind` → `$group` → `$sort`): kết quả 4 → 4 → 3 → 2 → 2. Ở bước 4, Hue `revenue: 0` lộ rõ bẫy MG1.
- Chi phí O(n·k) trên dataset lab (≤ vài nghìn tài liệu) là nhỏ.
- `$out`/`$merge` phải chạy trên bản sao, vì đó chính là lỗi L254.

### 4.2 DynamoDB: mẫu truy cập ↔ SQL

Nguồn: *SQL to NoSQL / Querying a table* (AWS). Query cần điều kiện bằng trên partition key, sort key tùy chọn. Về filter: "it does not reduce the read capacity consumed".

| SQL | DynamoDB | Bẫy |
|---|---|---|
| `SELECT * WHERE pk = ? AND sk = ?` | `GetItem` | Rẻ nhất (0,5/1 RCU), nhưng phải có **đủ** khóa |
| `SELECT * WHERE pk = ?` | `Query` `KeyConditionExpression: pk = :p` | Trả tối đa 1 MB mỗi trang (DY5) |
| `… AND sk LIKE 'Call%'` | `begins_with(sk, :t)` | Chỉ prefix. Không có `LIKE '%x'` trên khóa |
| `… AND sk BETWEEN a AND b` | `sk BETWEEN :a AND :b` | So sánh theo byte của chuỗi: ngày phải ISO (BP d04) |
| `… AND price < 1` (cột không phải khóa) | `FilterExpression` | **Không rẻ hơn**: tính RCU trên item đã đọc (DY1) |
| `… LIMIT 6` | `Limit: 6` | Đếm item **đọc**, trước filter (DY6, §1.4) |
| `SELECT count(*) WHERE …` | `Select: COUNT` | Tốn như đọc cả item; vẫn phân trang |
| `SELECT * WHERE status = ?` (không phải khóa) | Scan + filter, hoặc **GSI** `status` | GSI chỉ eventual (DY2), có WCU riêng |
| `JOIN customers c ON …` | single-table: một `Query` trên item collection | Chỉ khi luôn đọc cùng nhau (DY4); không có JOIN tùy ý |
| `ORDER BY created DESC LIMIT 5` | sort key + `ScanIndexForward: false` + `Limit: 5` | Chỉ sắp theo sort key. Không có `ORDER BY` cột khác |
| `UPDATE … SET n = n + 1` | `UpdateItem` `ADD`/`SET n = n + :1` | Tốn theo **cỡ cả item** (bản lớn hơn), không theo cột |
| `BEGIN … COMMIT` | `ExecuteTransaction` / `TransactWriteItems` | ×2 capacity; tối đa 100 hành động, 4 MB; "Transactions cannot be performed using indexes" |
| `SELECT * FROM t` | `Scan` | Đọc cả bảng, phân trang 1 MB |
| PartiQL `SELECT … WHERE pk = 'x'` | `ExecuteStatement` → thành Query | Thiếu khóa thì thành **Scan** ngầm (dynoxide: 1,5 RCU cho câu không có khóa, đọc cả bảng) |

---

## 5. Việc cho các luồng v25/v26

| Luồng | Việc | Tầng nhãn |
|---|---|---|
| REC | Trường `recorded` như §2.3; đọc được cả cây cổ điển lẫn SBE; test §2.3 | — |
| MG-CAPTURE | Ngay: đổi L3/06, L3/07 sang `recorded.tier: docs` (số §2.1). Mục M1–M8 chờ user duyệt Docker; trong lúc chờ, các bài đó ghi T2 "theo luật trong tài liệu" và **không** có JSON explain | T2 → T3 |
| MG-CAP | Capstone L3 chấm theo luật ESR (đã có trong `src/engine/mongo/path.ts`); một bước "nhúng hay `$lookup`" (§1.6) | T1 + T2 |
| MG-ED (F7) | §1.6: predict `$unwind` mất `c4`; quiz index `foreignField` | T1 |
| F8 | Lab MG1 §1.5 (Hue doanh thu 0, tìm bằng `$type`) | T1 |
| Runner Mongo | `$count` trên rỗng: trả `[]` cho giống MongoDB, hoặc ghi vào danh sách "mingo ≠ MongoDB" và cấm bài dựa vào ca này | — |
| MG-UI | "Pipeline từng bước" = chạy tiền tố (§4.1); "So với SQL" = bảng §4.1 kèm cột bẫy | T1 |
| DY-UI | Số thật từ `ConsumedCapacity` (`INDEXES` khi có GSI); công thức §3.1 cho ca lỗi; partition và throttle là T2 | T1 + T2 |
| DY-C | DY2 §1.2 (bước chạy + câu "không có Xem thật" + nhãn), DY4 §1.3 (lab 0,5 so với 1 RCU), DY6 §1.4 (predict Query `Limit` 6) | T1 |
| CMP-SQL (v28) | Bảng §4.2 | — |

---

## Phụ lục A. Script và output thô

Thư mục: `C:\Users\KHOA~1.HUY\AppData\Local\Temp\claude\…\scratchpad\r9\` (không nằm trong repo).

**Các script:**

- `dy.mjs`:
  - nạp `@dynoxide/wasm-engine/worker` vào global scope (cùng cách `tests/dynamo.test.ts`: vá `fetch` cho `file:`, đổi `postMessage` sang bộ định tuyến), rồi `open` `{ ephemeral: true }`;
  - DY6, DY2, các ca chi phí, chi phí ghi GSI;
  - output: `dy.out`.
- `dy3.mjs`: bảng provisioned 1 WCU (không throttle); Query cộng rồi làm tròn; BatchGet làm tròn từng item; PartiQL có khóa và không khóa; item > 400 KB. Output: `dy3.out`.
- `dy5.mjs`: bốn ca GSI còn lại (GSI `KEYS_ONLY`) và 500 ghi vào bảng 1 WCU. Output: `dy5.out`.
- `dy4.mjs`: single-table so với hai bảng. Output: `dy4.out`. Dòng `Assertion failed … async.c` lúc thoát là Node trên Windows, không phải lỗi engine.
- `mg.mjs`: `createRequire` trên `package.json` của repo → `mingo` 7.2.6 (`aggregate`, `find`, `collectionResolver`). Ca MG1, MG2, pipeline tiền tố, bẫy SQL. Output: `mg.out`.

**Dòng chính đã ghi:**

```text
Query Limit 6 + filter {"Count":1,"ScannedCount":6,"LEK":"yes","CC":{"CapacityUnits":0.5}}
GSI Query ConsistentRead true -> ValidationException: Consistent reads are not supported on global secondary indexes
GSI read right after write sees O-999: true
Update GSI key NEW->PAID (INDEXES) {"Table":{"CapacityUnits":1},"GlobalSecondaryIndexes":{"byStatus":{"CapacityUnits":2}}}
single-table Query PK 0.5 | multi: GetItem 0.5 + Query 0.5
$count on empty input: [{"n":0}]          (MongoDB: no result)
after stage 4 $group: [{"_id":"Da Nang","revenue":500000,"orders":2},{"_id":"Hue","revenue":0,"orders":1}]
```

## Phụ lục B. Nguồn (đọc 2026-11-20)

**AWS** (Developer Guide / API Reference, latest):

- https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/read-write-operations.html
- https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html
- https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html
- https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/burst-adaptive-capacity.html
- https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/on-demand-capacity-mode.html
- https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-sharding.html
- https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html
- https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/data-modeling-foundations.html
- https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/SQLtoNoSQL.ReadData.Query.html
- https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Scan.html

**MongoDB** (Database Manual, 9.0 Current):

- https://www.mongodb.com/docs/manual/tutorial/analyze-query-plan/
- https://www.mongodb.com/docs/manual/reference/explain-results/
- https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/
- https://www.mongodb.com/docs/manual/core/query-optimization/
- https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
- https://www.mongodb.com/docs/manual/reference/operator/aggregation/count/
- https://www.mongodb.com/docs/manual/reference/operator/aggregation/sum/
- https://www.mongodb.com/docs/manual/reference/sql-aggregation-comparison/
- https://www.mongodb.com/docs/manual/core/index-partial/
- https://www.mongodb.com/docs/manual/core/index-case-insensitive/
- https://www.mongodb.com/docs/manual/core/index-sparse/
- https://www.mongodb.com/docs/manual/reference/bson-type-comparison-order/
- https://www.mongodb.com/docs/manual/tutorial/query-for-null-fields/
- https://www.mongodb.com/docs/manual/reference/operator/query/ne/
- https://www.mongodb.com/docs/manual/reference/operator/aggregation/group/
- https://www.mongodb.com/docs/v8.0/tutorial/analyze-query-plan/ (để so: bản 8.0 dùng ví dụ `inventory`)

**Không phải nguồn chính thức, chỉ dùng để biết rằng docs chưa có:**

- blog Franck Pachot trên dev.to về chiến lược `$lookup`;
- Jira SERVER-58426 và SERVER-107525.

Không trích câu nào từ các nguồn này.
