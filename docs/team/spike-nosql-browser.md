# Spike: MongoDB, DynamoDB, MySQL trong trình duyệt (khu "Database Engine")

Ngày 2026-11-20. Đây chỉ là báo cáo spike: không thêm gì vào app, không thêm dependency nào vào `package.json`.

Câu hỏi của người dùng: "Tìm hiểu xem có thể fork MongoDB lên chạy Editor như Postgres không." Khu "Database Engine" cũng cần MySQL và DynamoDB.

**Kết luận ngắn**

| Engine | Verdict | Runtime đề xuất | Fallback |
|---|---|---|---|
| MongoDB | **PARTIAL (GO cho query/aggregation, NO-GO cho index/EXPLAIN)**. Fork `mongod` thật: **NO-GO** | `mingo` 7.x trong Web Worker, ~35 KB gz | không cần; bài về index/explain viết thành bài đọc |
| DynamoDB | **GO** (thiếu `TransactWriteItems`) | `@dynoxide/wasm-engine` trong Web Worker, ~1,2 MB gz | tự viết emulator trên JS/PGlite (tốn công) |
| MySQL | **NO-GO lúc này** (chưa có engine thật nào chạy được trong trình duyệt) | không có | PGlite + nội dung so sánh cú pháp MySQL; spike lại `mariadb-wasm` sau |

## 1. Đã làm gì

- Các gói nằm trong thư mục nháp riêng (`scratchpad/nosql-spike/`, có `package.json` riêng), cài bằng `npm i --save-exact --ignore-scripts`. Phiên bản chọn theo luật "ra đời ít nhất 2 tuần":
  - `mingo@7.2.6` (2026-10-25; bản mới nhất là 7.2.7);
  - `@dynoxide/wasm-engine@1.5.0` (2026-10-23; bản mới nhất là 1.7.0, ra ngày 2026-11-17);
  - `esbuild@0.28.2` dùng để đóng gói.
- Mã spike nằm ở nhánh **`spike/nosql-browser`** (thư mục `spike-nosql/`), không merge:
  - `mongo-worker.js`: mingo trong module worker. Có 22.200 tài liệu sinh tất định: 20k `orders` có mảng `items` lồng bên trong, 2k `customers`, 200 `skus`. Ô nhập kiểu shell (`db.orders.aggregate([...])`, `find().sort().limit()`, `updateMany`, `countDocuments`). Lệnh ghi chạy trên bản sao `structuredClone` rồi bỏ đi, tương đương `BEGIN … ROLLBACK`.
  - `main.js`: benchmark cố định cho cả hai engine, cộng một ô "Run" để thử tay.
  - `build.mjs`: đóng gói bằng esbuild của thư mục nháp và in cỡ gzip -9.
- Đo trên Edge headless (`--headless=new`), điều khiển qua CDP, server tĩnh tự viết ở cổng 5311 (localhost):
  - mỗi lượt đo là một profile mới (lạnh), sau đó 1–2 lần điều hướng lại (ấm);
  - tổng cộng 10 lần tải trang trên 3 profile.
- **Độ tin cậy của số đo:** máy dùng chung với các agent khác, CPU tải 57% lúc đo cuối. Thời gian vì thế dao động 2–3 lần giữa các lượt, nên bảng ghi **khoảng (n)**. Mạng chỉ là localhost; thời gian tải qua mạng thật ước lượng từ số byte gz.

## 2. MongoDB

### 2.1 Các lựa chọn

| Lựa chọn | Licence | Cỡ | Bảo trì | Độ giống MongoDB | Verdict |
|---|---|---|---|---|---|
| **Fork `mongod` → WASM** | SSPL v1 (không được OSI công nhận) | không có bản build nào để đo. Mã C++ rất lớn, WiredTiger đa luồng, cần socket TCP | MongoDB Inc. chỉ hỗ trợ x86_64/arm64 trên Linux, Windows và macOS | 100% nếu build được | **NO-GO** |
| FerretDB v2 (wire protocol trên Postgres) | Apache-2.0 | viết bằng Go. Cần extension DocumentDB, mà PGlite không có (DocumentDB còn kéo theo pg_cron, rum, vector, postgis; PostGIS chưa chạy được trên PGlite) | còn bảo trì | cao (MongoDB 5.0+) | **NO-GO** trong trình duyệt |
| FerretDB v1 (backend SQLite/Postgres, không cần extension) | Apache-2.0 | Go → `GOOS=js`: chưa thử. Vẫn cần lớp wire protocol/socket | nhánh `main-v1`, không rõ còn hỗ trợ | trung bình | không thử, không đề xuất |
| **mingo** | **MIT** | **~35 KB gz** (cả worker, đủ mọi operator) | 7.2.7 ra ngày 2026-10-31, phát hành đều từ 2013 | query, projection, update, aggregation đầy đủ. **Không có index, không có explain** | **GO cho query/aggregation** |
| RxDB 17.6.0 | Apache-2.0 | lớn, thiên về đồng bộ offline | còn bảo trì | Mango query, không có pipeline aggregate kiểu Mongo | không hợp |
| PouchDB 9.0.0 | Apache-2.0 | trung bình | bản cuối 2025-10 | chỉ Mango (một tập con của find) | không hợp |
| LokiJS 1.5.12 / `@seald-io/nedb` 4.1.2 | MIT | nhỏ | LokiJS đứng từ 2024 | tập con của find/update | không hợp |

**Vì sao không fork `mongod`:**

- Kỹ thuật:
  - Không tìm thấy bản build WASM nào của `mongod`, kể cả bản chính thức hay bản cộng đồng.
  - Trang production notes của MongoDB chỉ hỗ trợ x86_64 (bắt buộc AVX) và arm64.
  - `mongod` cần ít nhất 2 nhân và WiredTiger đa luồng, và nó là một server nghe trên socket.
  - Emscripten không có `fork()`/signal. Các tiền lệ cho thấy độ khó: port MariaDB (mục 4) phải bỏ thread và chạy Aria ở chế độ chỉ đọc.
  - Ước lượng (chưa đo): wasm hàng chục MB và nhiều tháng công.
- Rủi ro licence (đây là đánh giá rủi ro, không phải ý kiến pháp lý):
  - SSPL §5(c): bản sửa đổi khi phát tán phải được cấp phép "toàn bộ tác phẩm, như một khối" theo SSPL.
  - §13: nếu cho bên thứ ba dùng chức năng của chương trình "như một dịch vụ", thì phải công bố "Service Source Code", gồm cả UI, API và phần hosting.
  - Một web app công khai phát tán `mongod` đã sửa cho mọi người dùng chạm cả hai điều trên. Điều đó mâu thuẫn với licence MIT của repo.
  - SSPL không được OSI công nhận.

### 2.2 Số đo mingo (20k orders, mỗi truy vấn chạy 5 lần, lấy trung vị; khoảng trên các lượt, n = 6 lượt tải trang)

| Đo | Kết quả |
|---|---|
| Worker sẵn sàng (tải + sinh 22.200 tài liệu), tính từ lúc mở trang | 68–145 ms (sinh dữ liệu 31–51 ms) |
| `find` có lọc trên mảng lồng (`'items.qty'`), projection, `sort` 2 khóa, `limit` | 16–45 ms |
| `find` với regex + `$in` (2k tài liệu) | 0,9–2,1 ms |
| `$match → $unwind → $group($sum $multiply) → $sort → $limit` | 76–249 ms |
| `$lookup` 6k × 2k + `$unwind` + `$group` | 11–28 ms |
| `$setWindowFields` (tổng chạy + `$shift`) | 16–34 ms |
| `$facet` + `$sortByCount` + `$count` | 64–133 ms |
| `updateMany` `$set`/`$inc` (311 tài liệu khớp), **có cả `structuredClone` 20k tài liệu cho rollback** | 75–148 ms |
| `countDocuments` theo ngày | 6–12 ms |
| Lỗi: operator lạ → `unknown query operator $foo`; collection lạ → lỗi của spike | < 1 ms |

**Nhận xét:**

- Mọi truy vấn đều dưới 250 ms trên 20k tài liệu, kể cả khi máy bận. Ngưỡng timeout 5 s như PGlite vẫn dùng được: cách "terminate worker rồi boot lại" rẻ, vì boot chỉ ~100 ms.
- "Chạy được" chứ chưa phải "đúng như MongoDB": kết quả chưa được so với `mongod` thật. Trước khi làm thật, cần một bộ golden:
  - chạy cùng bộ truy vấn trên `mongod` cục bộ, chỉ lúc phát triển (dùng nội bộ không chạm §13);
  - commit kết quả làm fixture;
  - Vitest so mingo với fixture đó.
- Không có index và không có `explain()`. `createIndex`/`explain` trong spike là stub tự viết, mingo không có. Bài về index, COLLSCAN/IXSCAN hay `executionStats` không thể làm kiểu "chấm plan" như chương 11 của Postgres, nên chỉ còn là bài đọc. Vì vậy verdict là PARTIAL.
- Khi làm thật cần:
  - tắt `scriptEnabled` (`$where`/`$function`/`$accumulator`);
  - thay `new Function` (spike dùng để đọc cú pháp shell) bằng parser chỉ nhận literal, ví dụ acorn → object, cộng `ISODate`/`ObjectId`;
  - với `$lookup`: phải truyền `collectionResolver`;
  - có thể giảm cỡ bằng cách chỉ đăng ký những operator mà bài học dùng (`Context`), nhưng 35 KB đã đủ nhỏ.

## 3. DynamoDB

### 3.1 Các lựa chọn

| Lựa chọn | Licence | Cỡ | Bảo trì | Độ giống | Verdict |
|---|---|---|---|---|---|
| DynamoDB Local (AWS) | licence riêng của AWS | Java + SQLite native | AWS | cao | **NO-GO** (không chạy được trong trình duyệt) |
| dynalite 4.0.0 | Apache-2.0 | thử `esbuild --platform=browser`: **14 lỗi resolve** (`http`, `https`, `crypto`, `fs`, `stream`, `events`, `path`, `url`, `util`). Nó là một server HTTP | bản cuối 2025-09 | trung bình–cao | **NO-GO** (phải polyfill và bỏ lớp HTTP) |
| **`@dynoxide/wasm-engine`** (Rust + SQLite → WASM) | **MIT OR Apache-2.0**. Kèm `sqlite3.wasm` (public domain) | **3,0 MB thô / ~1,2 MB gz**: `dynoxide_bg.wasm` 1,92 MB → 725 KB, `sqlite3.wasm` 865 → 402 KB, worker JS 230 → 71 KB | **còn rất trẻ:** bản đầu 2026-06-24, **1 người bảo trì**, ra bản liên tục (1.5 → 1.7 trong 4 tuần) | cao (xem dưới) | **GO** |
| Tự emulate trên JS hoặc PGlite (bảng jsonb + parser cho KeyCondition/Filter/Update expression) | của mình | nhỏ | tự lo | chỉ phần mình viết | fallback |

### 3.2 Số đo dynoxide 1.5.0 (`ephemeral: true` = SQLite trong bộ nhớ; n = 10 lượt tải trang, 3 profile)

| Đo | Kết quả |
|---|---|
| `EngineClient.ready()` (tạo worker + compile 2 wasm) | 48–206 ms |
| `CreateTable` có GSI + LSI | lần đầu 40–83 ms, sau đó 3–8 ms |
| Nạp 10.000 item (`BatchWriteItem` × 400, mỗi lần 25 item) | **3,2–15,7 s** |
| 200 `PutItem` lẻ | 176–304 ms (~1 ms/item: chi phí nằm ở engine, không ở lời gọi) |
| `GetItem` | 0,4–6 ms |
| `Query` theo partition key + `begins_with(sk)` | 0,9–18 ms |
| `Query` + `FilterExpression` + `ScanIndexForward:false` + `Limit` | 0,5–14 ms |
| `Query` trên GSI, `Select: COUNT` (3.333 item) | 49–104 ms |
| `Query` trên LSI + `BETWEEN` | 1,2–6 ms |
| `Scan` + filter (10k item) | 132–240 ms |
| `PutItem` có `attribute_not_exists` trên item đã có | trả `ConditionalCheckFailedException` |
| `UpdateItem` (`SET #t = #t + :d ADD visits :one`, điều kiện `OR`, `ALL_NEW`) | 1,8–16 ms |
| PartiQL `ExecuteStatement` / `ExecuteTransaction` | chạy được, 1–16 ms |
| `TransactWriteItems` | **`UnsupportedOperation`** |
| Khóa sai kiểu (`N` thay cho `S`) | `ValidationException` |
| Dùng tên thuộc tính `total` (từ dành riêng) trong KeyCondition không có `#alias` | `ValidationException`, giống DynamoDB thật. Đây là một bài học tốt |

**Phần dùng để dạy (tương đương EXPLAIN):**

- `Scan` với `Limit: 1000` trả `Count: 20, ScannedCount: 1000, ConsumedCapacity: 6.5 RCU`, kèm `LastEvaluatedKey`.
- `Query` trả `ConsumedCapacity: 0.5`.
- Phân trang bằng `ExclusiveStartKey` chạy đúng.

Như vậy dạy được chuyện "Scan đắt, Query rẻ" bằng số mà không cần plan.

**Reset (tương đương `ROLLBACK`):**

- `DeleteTable` + `CreateTable` mất 5–8 ms, nhưng sau đó phải nạp lại dữ liệu.
- Worker mới mất 78–103 ms (bản `ephemeral`, nên trống).

Vì nạp chậm (~1 ms/item), cần giữ dữ liệu mỗi bài nhỏ (≤ 1–2k item, ≈ 1–3 s) hoặc nạp lười theo bài. Một hướng khác: nạp một lần rồi để trong OPFS (engine có SAHPool VFS). Hướng này chưa thử.

**Yêu cầu chạy** (theo `docs/wasm.md` của dynoxide):

- secure context (localhost hoặc HTTPS);
- CSP phải cho `'wasm-unsafe-eval'`;
- file `.wasm` phải có MIME `application/wasm`;
- không cần SharedArrayBuffer/COOP/COEP;
- mở cùng một DB OPFS ở tab thứ hai sẽ báo "OPFS is busy" (chế độ `ephemeral` tránh được chuyện này).

**Rủi ro:**

- Gói còn rất trẻ và chỉ có một người bảo trì (người này cũng giữ bộ test Parity Suite mà gói dùng để đo độ giống). Phải pin chính xác phiên bản và kiểm lại khi nâng cấp.
- Nếu dự án dừng, wasm đã pin vẫn chạy tiếp vì không phụ thuộc server.

## 4. MySQL / MariaDB

| Lựa chọn | Licence | Cỡ | Bảo trì | Độ giống | Verdict |
|---|---|---|---|---|---|
| MySQL (Oracle) → WASM | GPL-2.0 | không tìm thấy bản build nào. Oracle chỉ nói về WASM *bên trong* server (HeatWave, 9.4) | | | **NO-GO** |
| `adamziel/mariadb-wasm` (libmysqld nhúng, Emscripten) | GPL-2.0 (MariaDB) | wasm ~10 MB | thử nghiệm. PR WordPress Playground #3474 dùng nó đã **đóng, không merge** (2026-07-07) | chỉ chạy trong Node. Aria chỉ đọc, bảng tạm phải dùng MyISAM, phải chỉnh tay `thread_stack`. **Không có InnoDB**, nên EXPLAIN/index không giống MySQL thật | **NO-GO lúc này**, đáng spike lại |
| TiDB-wasm (hackathon 2019) | Apache-2.0 | không rõ | bỏ từ 2019 | tương thích cú pháp MySQL, nhưng optimizer/EXPLAIN là của TiDB, không phải InnoDB | **NO-GO** |
| MySQL trong máy ảo x86 (v86, `gitee LucasDot/mysql-wasm`) | GPL-2.0 | image + snapshot VM (không công bố cỡ, ước lượng hàng chục MB) | 0 sao, không có hoạt động | cao | **NO-GO** (quá nặng và chậm) |
| go-mysql-server (Dolt) với `GOOS=js` | Apache-2.0 | **chưa thử**. Go wasm thường hàng chục MB | còn bảo trì | cú pháp MySQL, planner riêng | chưa kiểm |

**Rủi ro licence:** GPL-2.0 cho phép phát tán bản wasm, nhưng phải kèm mã nguồn và giữ engine là một chương trình tách riêng (worker, giao tiếp qua message). Không được trộn chung chunk với mã MIT.

**Fallback đề xuất:**

- Khu MySQL dùng PGlite. Nội dung dạy cú pháp chung, cộng các thẻ "khác ở MySQL": `LIMIT` giống nhau, backtick, `AUTO_INCREMENT`, `IFNULL`, `GROUP_CONCAT`, `ON DUPLICATE KEY`, InnoDB clustered index. Phần EXPLAIN của MySQL là bài đọc.
- Khi `mariadb-wasm` có bản build cho trình duyệt thì spike lại: đo cỡ, xem bảng InnoDB có tạo được không, xem `EXPLAIN FORMAT=JSON` trả về gì.

## 5. Đề xuất

1. **DynamoDB: GO.**
   - `@dynoxide/wasm-engine` (pin ≥ 2 tuần tuổi), chạy trong worker riêng, chunk lười. Budget mới cỡ ~1,3 MB gz, tức khoảng 1 s ở 10 Mbps.
   - Thêm dòng vào `assets/THIRD_PARTY.md` (MIT/Apache-2.0, SQLite public domain).
   - Dữ liệu bài nhỏ, reset bằng worker mới hoặc DeleteTable + nạp lại.
   - Chưa dạy `TransactWriteItems` (dùng PartiQL `ExecuteTransaction` thay).
2. **MongoDB: PARTIAL.**
   - Không fork `mongod` (kỹ thuật và SSPL).
   - Dùng `mingo` (MIT, ~35 KB gz) trong worker, theo đúng khuôn của `DbClient`: một request mỗi lần, timeout 5 s bằng terminate, ghi trên bản sao rồi bỏ.
   - Cần parser shell an toàn và bộ golden so với `mongod` thật lúc phát triển.
   - Index/explain là bài đọc, không chấm.
3. **MySQL: NO-GO cho engine thật.** Dùng fallback PGlite + nội dung so sánh; spike lại `mariadb-wasm` sau.

## Nguồn

- mingo: https://github.com/kofrasa/mingo (MIT); npm `mingo` (lịch phát hành)
- SSPL: https://www.mongodb.com/legal/licensing/server-side-public-license, FAQ https://www.mongodb.com/legal/licensing/server-side-public-license/faq
- Nền tảng `mongod`: https://www.mongodb.com/docs/manual/administration/production-notes/
- FerretDB: https://github.com/FerretDB/FerretDB, v1: https://github.com/FerretDB/FerretDB/tree/main-v1
- Extension của PGlite: https://pglite.dev/extensions/
- dynoxide: https://raw.githubusercontent.com/nubo-db/dynoxide/main/README.md, https://raw.githubusercontent.com/nubo-db/dynoxide/main/docs/wasm.md
- dynalite: https://github.com/architect/dynalite
- mariadb-wasm: https://github.com/WordPress/wordpress-playground/pull/3474 (dẫn tới `github.com/adamziel/mariadb-wasm`)
- TiDB-wasm: https://www.pingcap.com/blog/how-we-compiled-a-golang-database-in-the-browser-using-webassembly/
- MySQL trên v86: https://gitee.com/LucasDot/mysql-wasm
- Oracle MySQL và WASM (phía server): https://blogs.oracle.com/mysql/post/webassembly-integration-for-nextgen-data-apps-in-mysql
