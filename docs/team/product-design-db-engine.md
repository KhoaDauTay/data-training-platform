# Product design v2: khu "Database Engine" (PostgreSQL, MongoDB, DynamoDB)

Người viết: Product Design + UI/UX · 2026-11-20 · **Bản 2, thay toàn bộ bản 1** (commit `6253716`, còn MySQL và lộ trình drill soi gương SQL). Chỉ là thiết kế, không code.

**Căn cứ:**

- `decision-log.md`:
  - L215: Engine là ưu tiên số 1; ba engine, mỗi engine từ L1 tới L5; MySQL bỏ; DynamoDB chạy trên thư viện, phần cần backend để "pending"; dependency `mingo`, `@dynoxide/wasm-engine` được phép.
  - L216: push, deploy và tag ở mỗi version.
  - L217: review sau mỗi version publish.
- `db-engine-knowledge.md`: thang L1–L5, ký hiệu H / H-B / D / BE, số bài, nguồn `[Sn]`.
- `spike-nosql-browser.md`: runtime mingo và dynoxide.
- `CLAUDE.md`: General area, Save, ngân sách, luật chuyển động, luật linh vật.

**Lộ trình phiên bản** ở `roadmap-v22-v30.md`. **Checklist review UI/UX** ở `ux-deploy-checklist.md`.

**Quy ước:**

- Số "đo" lấy từ knowledge doc hoặc spike. Mọi KB và cỡ việc khác là ước lượng.
- Ký hiệu thực hành giữ nguyên knowledge doc §1.4:
  - **H**: chạy thật trong trình duyệt. **H-A** là một câu đọc trong `runSandboxed`; **H-B** cần request kịch bản mới trong worker.
  - **D**: sơ đồ, bài đọc, hoặc output ghi sẵn từ server thật.
  - **BE**: cần backend thật, mà hiện chưa có.

---

## 0. Tóm tắt một trang

| Chủ đề | Quyết định trong bản này |
|---|---|
| Phạm vi | **PostgreSQL, MongoDB, DynamoDB**, mỗi engine 5 cấp L1 → L5. Không còn MySQL/MariaDB và không còn hàng "sắp có" engine khác (luật không ngõ cụt) |
| Định dạng nội dung | **ENGINE-CONTENT-V1** (§2), nguyên văn như các agent nội dung đang dùng. Thay đổi đề xuất chỉ là **phần cộng thêm** (§2.4, đánh dấu `ADD-n`) |
| Vị trí | `#/engine`, mục top bar riêng ở desktop. Trên điện thoại, "Lộ trình" thành mục **"Học"** có công tắc **SQL / Database Engine**. Có sidebar cấp/mô-đun, đẩy trang, không đè (L188) |
| Loại bài | `concept` (chữ + sơ đồ bấm từng bước + câu kiểm), `lab` (chạy thật), `predict` (đoán kế hoạch rồi xem thật), `quiz`, `capstone` (bài cuối mỗi cấp, nhiều bước) |
| Giá trị | Mỗi mô-đun có một câu **"Học xong bạn làm được…"** kiểm được bằng chính bài chấm của mô-đun (§4). Bài D vẫn có câu chấm: không bài nào chỉ để đọc |
| Save | **Không bump.** Id `e-<pg\|mg\|dy>-l<n>-<NN>` được nhận theo mẫu như `ECOM_ID`; dùng `completed`, `xp`, `bossStep`; không thẻ Leitner ở bản này |
| Lily, `#/me` | Giai đoạn Lily **không đổi** (đo kỹ năng SQL). Có khối Engine trong `#/me` (chunk Engine, gắn qua hook) và dòng kỷ niệm trong album |
| Thứ tự | Postgres L1 → L5 (v22–v26; Postgres đủ là mức tối thiểu), MongoDB (v27–v28), DynamoDB (v29), Best Practice và hoàn thiện (v25 → v30) |

---

## 1. Engine, runtime, tên gọi

### 1.1 Một bảng tên (mọi file khác tra ở đây)

| Engine | `engine` (frontmatter, thư mục, route) | Mã trong id | Thư mục nội dung | Route | Runtime | Phiên bản mô tả |
|---|---|---|---|---|---|---|
| PostgreSQL | `postgres` | `pg` | `content/engine/postgres/L1..L5/` | `#/engine/postgres…` | PGlite 0.5.16 = **PostgreSQL 18.6** (đo) | 18 |
| MongoDB | `mongodb` | `mg` | `content/engine/mongodb/L1..L5/` | `#/engine/mongodb…` | `mingo` 7.2.x trong worker riêng. **Không có index, không có `explain`** | Manual hiện hành. Mỗi bài ghi "đúng với 8.x" |
| DynamoDB | `dynamodb` | `dy` | `content/engine/dynamodb/L1..L5/` | `#/engine/dynamodb…` | `@dynoxide/wasm-engine` trong worker riêng, ~1,2 MB gz (đo). Không có `TransactWriteItems` | Developer Guide hiện hành |

Sửa theo knowledge doc §7.1 so với bản 1:

- `pg_overexplain` có tarball nhưng **không có wrapper chính thức**. Muốn dùng phải tự viết wrapper, đã thử chạy được. Chỉ là tùy chọn.
- pgvector 0.8.7 và PostGIS 3.6.2 **chạy được** qua gói riêng, ghim `@electric-sql/pglite-pgvector@0.0.17` / `@electric-sql/pglite-postgis@0.2.16` (đo). Hai gói này **chưa dùng**: cần user duyệt dependency, và PostGIS ~20 MB vượt trần. Bài GEO dùng bản nhẹ (`point/box` + GiST, `cube`, `earthdistance`).
- DynamoDB chạy trên **dynoxide**, không phải bộ mô phỏng TS tự viết như bản 1.

### 1.2 Bao nhiêu bài chạy thật (từ knowledge doc §6)

| Engine | Tổng | L1 | L2 | L3 | L4 | L5 | H |
|---|---|---|---|---|---|---|---|
| PostgreSQL | 66 | 10 H | 14 (13 H + 1 D) | 12 (9 H-B + 3 D) | 14 (8 H + 6 D) | 16 (11 H + 5 D) | 51 (77 %) |
| MongoDB | 60 | 10 H | 14 (12 H + 2 D) | 12 D | 12 (5 H + 7 D) | 12 D | 27 (45 %) |
| DynamoDB | 53 | 9 H | 12 (11 H + 1 D) | 12 (11 H + 1 D) | 12 (4 H + 8 D) | 8 D | 35 (66 %) |

Số này **chưa tính** một bài `capstone` cuối mỗi cấp (§3.5): mỗi engine thêm 5 bài. Bài **BE** không có trang riêng. Chúng là bài D, có thêm một dòng "phần chạy thật cần máy chủ thật" (§3.6).

---

## 2. Định dạng nội dung ENGINE-CONTENT-V1

### 2.1 Nguyên văn (authoritative, không sửa)

> CONTENT SCHEMA ENGINE-CONTENT-V1 (authoritative): files `content/engine/<engine>/<level>/<NN>-<slug>.md` with engine ∈ postgres|mongodb|dynamodb and level ∈ L1..L5. YAML frontmatter: `id` (e.g. e-pg-l1-01, e-mg-…, e-dy-…), `engine`, `level`, `module` (slug), `title_en`, `kind` (concept|lab|predict|quiz|capstone), `minutes`, `objectives` (list of {vi,en}), `requires` (list of ids), `sources` (list of official-doc URLs), optional `viz` (diagram name), optional `lab` ({setup: sql|js, steps: [{task:{vi,en}, solution, check: rows|plan|catalog|doc, ordered?, hint:{vi,en}}]}), optional `quiz` ([{q:{vi,en}, options:[{vi,en}], answer, why:{vi,en}}]), optional `predict` ({sql, q:{vi,en}, options:[{vi,en}], answer, why:{vi,en}}). Body: Vietnamese first with sections `## Ý chính`, `## Ví dụ`, `## Thực hành` (as needed), then `# EN` with `## Key idea`, `## Example`, `## Practice`. Code identical in VI/EN; EN no Vietnamese diacritics.

### 2.2 Cách đọc các trường (diễn giải, không thêm trường)

| Trường | Diễn giải chốt cho code và test |
|---|---|
| `id` | Dạng chặt `e-<mã>-l<n>-<NN>`: `<mã>` ở §1.1, `<n>` = số cấp, `<NN>` = tiền tố tên file. Test nội dung kiểm id khớp đường dẫn và không trùng. Save nhận theo mẫu **lỏng** `ENGINE_ID = /^e-(pg\|mg\|dy)-[a-z0-9-]+$/`, cùng tinh thần `DRILL_ID`, để đổi tên file không làm mất tiến độ |
| `level` | Chuỗi `L1`…`L5`, trùng thư mục. Route dùng chữ thường `l1`…`l5` |
| `module` | Slug. Các bài cùng `module` trong một cấp là một mô-đun. Thứ tự trong mô-đun = `NN` |
| `title_en` | Tiêu đề VI nằm ở trường frontmatter `title`. Parser đã gộp (`src/engine/content.ts`, commit `a33ae40`) **bắt buộc** trường này, xem ADD-0 |
| `minutes` | Hiện trên dòng bài và trong tổng mô-đun. Không dùng để chấm |
| `requires` | Chip "Nên học trước" trỏ tới bài đó. **Không khóa** (L121: General không khóa gì; Engine cũng vậy). Test: mọi id được nhắc phải tồn tại, không có vòng |
| `sources` | Bắt buộc ≥ 1 URL của docs chính thức (`postgresql.org/docs/18`, `mongodb.com/docs`, `docs.aws.amazon.com/amazondynamodb`). Hiện thành "Nguồn" cuối bài |
| `viz` | Tên một sơ đồ trong bộ sơ đồ của Engine (§5). Test: tên có trong danh mục |
| `lab.setup` | Kịch bản **của tác giả**, chạy trước bước đầu, không bao giờ là chữ người chơi. Postgres: script SQL nhiều câu. MongoDB / DynamoDB: chuỗi lệnh `db.<c>.insertMany(…)` / request JSON, được **bộ phân tích shell đọc như dữ liệu** (không `eval`, không `new Function`). Chữ `sql\|js` trong schema chỉ ngôn ngữ của khối này |
| `lab.steps[].solution` | Câu đáp án của bước, cùng ngôn ngữ với editor. Không bao giờ hiện trước khi đạt |
| `lab.steps[].check` | Xem §2.3 |
| `predict.sql` | Câu được hỏi, viết bằng ngôn ngữ của engine. Postgres: SQL. MongoDB: lệnh shell. DynamoDB: request JSON hoặc PartiQL. Tên trường giữ là `sql` |
| `answer` | Chỉ số **từ 0** (parser đã kiểm `0 ≤ answer < options.length`) trong `options` gốc. Lựa chọn hiện theo `optionOrder(id + '#q<i>')` như kết luận đánh giá thăng tiến. Giá trị lưu và so là chỉ số gốc |
| Thân bài | VI trước (`## Ý chính`, `## Ví dụ`, `## Thực hành` khi có), rồi `# EN` cùng mục. Code span và khối code giống hệt nhau giữa VI và EN. EN không có dấu tiếng Việt. Dùng lại `textOf`-kiểu tách khối như ticket |

### 2.3 Bốn kiểu `check`: chấm bằng gì

| `check` | Engine | Chạy | Đạt khi |
|---|---|---|---|
| `rows` | postgres | Câu người học và `solution` chạy bằng `runSandboxed` (`BEGIN → câu → ROLLBACK`) trên schema `engine`, sau `setup` | `grade()` hiện có: so theo vị trí cột, multiset hoặc dãy khi `ordered: true`, làm tròn 2 số |
| `plan` | postgres | `EXPLAIN (FORMAT JSON)` **không ANALYZE** của câu người học và của `solution` (luật ch11: chi phí planner, không bao giờ ms) | Kết quả bằng nhau như `rows`, **và** mỗi bảng được đọc bằng cùng loại nút quét (`planCheck`: Seq / Index / Index Only / Bitmap) như `solution`. Nếu `solution` là một `CREATE INDEX` thì bước đi qua `runLab` như index lab ch11 (`isCreateIndex`, rollback), chấm kế hoạch của câu đích (ADD-4) |
| `catalog` | postgres | Câu DDL của người học chạy trong transaction rollback, rồi chạy một **câu dò catalog cố định** trên các quan hệ mà `solution` tạo hoặc sửa. Câu dò lấy: cột, kiểu, `NOT NULL`, default, generated, `pg_get_constraintdef`, `pg_get_indexdef` đã bỏ tên index. Lặp lại với `solution` | Hai kết quả dò bằng nhau. Dùng cho L1 (CREATE TABLE, ràng buộc, index đầu tiên) |
| `catalog` | dynamodb | `CreateTable` / `UpdateTable` của người học trên dynoxide, rồi `DescribeTable` | `KeySchema`, `AttributeDefinitions` của khóa, GSI/LSI (khóa + projection) bằng `solution`. Bỏ qua tên index và thứ tự mảng |
| `catalog` | mongodb | Đặc tả `createIndex(…)` của người học (mingo **không** có index) | So đặc tả khóa chuẩn hóa với `solution` bằng **bộ luật ESR thuần** (`src/engine/esr.ts`). Màn hình ghi rõ "chấm theo luật ESR, không phải `mongod`" |
| `doc` | mongodb | Lệnh người học và `solution` chạy trên mingo; lệnh ghi chạy trên bản sao `structuredClone` rồi bỏ | `docGrade`: so theo tên trường; bỏ qua thứ tự khóa; mảng có thứ tự; thiếu trường ≠ `null`; số làm tròn 2; ngày theo ms UTC; `_id` mặc định thừa không tính sai (hiện mẹo `_id: 0`) |
| `doc` | dynamodb | Request người học và `solution` trên dynoxide | Danh sách item bằng nhau (kiểu `S/N/BOOL/L/M`, `N` so theo giá trị). Query mặc định `ordered`, Scan thì không |

`rows` và `plan` chỉ dùng cho postgres. `doc` chỉ dùng cho mongodb/dynamodb. `catalog` dùng cho cả ba, mỗi engine một nghĩa như bảng trên. Từ v22, bước có `setup` hoặc `catalog` chạy qua request kịch bản `engineLab` (§6.1). Bước cần chạy ngoài transaction (`VACUUM`, flush stats, WAL) thì cần request H-B (`engineLab`, §6.1). Test nội dung chạy mọi `setup` + `solution` trong Node trên runtime thật: PGlite, mingo, dynoxide.

### 2.4 Đề xuất cộng thêm (không đổi gì đã có; mọi trường mới đều tùy chọn)

| Mã | Thay đổi | Vì sao | Nếu chưa làm |
|---|---|---|---|
| **ADD-0** | Trường `title` (VI) trong frontmatter. Parser đã bắt buộc trường này | Không có chỗ khác cho tiêu đề VI | (đã có trong code) |
| **ADD-1** | File mới `content/engine/<engine>/modules.yml`: `- { module, level, title: {vi,en}, after: {vi,en} }`. Thứ tự trong file là thứ tự mô-đun trên trang | Tên mô-đun và câu "Học xong bạn làm được…" (§4) không thuộc về một bài nào | Tiêu đề mô-đun lấy từ slug, trang cấp không có câu giá trị: **không đạt** cổng Product (§7) |
| **ADD-2** | `verified: { version, date }` | Knowledge doc §7.2(7): nguồn trôi, mỗi bài ghi "đúng với phiên bản X, kiểm ngày Y" | Dòng phiên bản lấy từ §1.1 cho mọi bài |
| **ADD-3** | `recorded: { server, version, date }` cho output ghi sẵn từ server thật (explain Mongo, kết quả hai phiên Postgres…) | Nhãn trung thực "Kết quả ghi từ MongoDB 8.0.x ngày …" (§3.6) | Bài D chỉ có nhãn "Sơ đồ" |
| **ADD-4** | `predict.expect: { node, table }` (Postgres) và `lab.steps[].target: <sql>` (bước index) | Test kiểm được đáp án `predict` khớp kế hoạch thật trên PGlite, và bước `CREATE INDEX` biết câu đích để chấm | Test chỉ chạy được `predict.sql`, không kiểm được đáp án: rủi ro dạy sai |
| **ADD-7** | **Luật Product, không phải luật schema:** mỗi `concept` nên có ≥ 1 câu `quiz`; mỗi cấp có đúng một `capstone`. Parser V1 vẫn nhận `concept` không có quiz: bài đó hoàn thành bằng nút "Đã hiểu". Cổng §8 kiểm luật này, test parser thì không | Bài chỉ đọc không đo được giá trị (L215 mục 3) | Bài vẫn hợp lệ, nhưng review Product đánh "Sửa" |
| **ADD-5** | `quiz[].kind: order` + `options` là các mục cần xếp, `answer` là mảng chỉ số | Câu "xếp thứ tự" (các bước COMMIT ghi WAL, election) đáng giá hơn chọn một | Chỉ có trắc nghiệm một đáp án |

Agent nội dung **không chờ** các mục ADD. Mục nào được chấp nhận thì được thêm vào schema thành V1.1, còn file V1 vẫn hợp lệ.

---

## 3. Năm loại bài: người học thấy, làm và nhận được gì

### 3.1 `concept`: chữ + sơ đồ bấm từng bước + câu kiểm

- **Thấy:**
  - `## Ý chính` (≤ 150 từ một khối);
  - sơ đồ `viz` (§5) với ‹ Trước / Tiếp › và thanh bước "3/7";
  - `## Ví dụ` (khối code tô màu tĩnh).
- **Làm:** bấm qua các bước, rồi trả lời câu trong `quiz`. Luật Product ADD-7 yêu cầu ≥ 1 câu. Parser V1 vẫn nhận bài không có câu; khi đó người học hoàn thành bằng nút "Đã hiểu".
- **Xong khi:** trả lời đúng mọi câu, được thử lại không giới hạn. Sai thì hiện `why` của lựa chọn đúng sau lần sai thứ 2.
- **Vì sao bắt có câu:** "đọc xong" không đo được. Một câu đúng chứng minh người học nắm được ý của sơ đồ.

### 3.2 `lab`: chạy thật

- **Workspace** như drill General: đề | editor | Chạy/Nộp | tab dưới. Session mode mới `{ kind: 'engine' }`, `keepsWork()`: có nháp, có lịch sử, không ghi `graded`.
- **Editor:**
  - Postgres: SQL.
  - MongoDB: lệnh shell (`db.<c>.find/aggregate/insertOne/updateMany/createIndex…`).
  - DynamoDB: request JSON (hình input của SDK v3) hoặc PartiQL.
  - Nhãn engine + runtime luôn hiện trên đầu editor, ví dụ "MongoDB · chạy bằng mingo".
- **Tab dưới:** Kết quả, rồi một tab "Bên trong" theo engine:
  - Postgres: trang heap, cây B-tree hoặc kế hoạch vẽ **từ kết quả thật** (cột `lp`, `t_ctid`, `itemoffset`…);
  - MongoDB: "Pipeline từng bước", đếm tài liệu sau mỗi stage bằng tiền tố pipeline;
  - DynamoDB: Partition / Chi phí (`ConsumedCapacity`, `ScannedCount`).
- **Nhiều bước** (`steps`): bước đang làm lưu ở `bossStep[id]`, tải lại vẫn tiếp tục. Gợi ý `hint` miễn phí, không trừ XP (Engine không có XP gợi ý).

### 3.3 `predict`: đoán trước, xem thật sau

- **Thấy:** `predict.sql`, bảng hoặc collection và index đang có (lấy từ `setup`), câu `q`, 3–4 lựa chọn.
- **Làm:** chọn, rồi bấm "Xem thật":
  - Postgres chạy `EXPLAIN (FORMAT JSON)` thật trên PGlite và vẽ cây kế hoạch (chi phí, không ms).
  - MongoDB / DynamoDB hiện output `recorded` (ADD-3) hoặc `ConsumedCapacity` thật của dynoxide.
- **Xong khi:** đã chọn đúng (được chọn lại). `why` luôn hiện sau "Xem thật".
- **Giá trị:** tập thói quen "đoán trước, đo sau". Đây là kỹ năng chính khi tối ưu.

### 3.4 `quiz`

- Từ 1 tới N câu trắc nghiệm, mỗi câu có `why`. Thêm câu xếp thứ tự nếu ADD-5 được chấp nhận.
- Xong khi đúng hết.
- Dùng cho bài D: wraparound, replication, sharding, throttle.

### 3.5 `capstone`: bài cuối mỗi cấp

- **Hình thức:** một case 3–5 bước như đánh giá thăng tiến. `lab.steps` trộn `rows|plan|catalog|doc`, `quiz` làm câu kết luận cuối. Có `bossStep`, thanh bước trên đầu, và mỗi cấp có đúng một bài.
- **Xong** capstone thì: Lily reo (`react()`, chỉ ở trang Engine) + `doneBadge()` của cấp.
- **Capstone Postgres L5:** "Bảng sự kiện chậm": đọc `pg_stats` → đoán kế hoạch → đề xuất index (`runLab`) → BRIN hay B-tree theo `correlation` → kết luận.
- **Capstone MongoDB L2:** "Báo cáo tuần cho cửa hàng", pipeline + `$setWindowFields`.
- **Capstone DynamoDB L3:** "Thiết kế bảng cho cửa hàng": 6 mẫu truy cập, mỗi mẫu một Query, không Scan, kiểm bằng `catalog` + `doc`.

### 3.6 Nhãn trung thực

Mỗi bài có **một** nhãn, đặt cạnh tiêu đề. Nhãn suy ra được, không phải trường mới:

| Nhãn | Khi nào |
|---|---|
| "Chạy thật · PostgreSQL 18.6 (PGlite)" | bài có `lab` hoặc `predict` trên postgres |
| "Chạy bằng mingo (ngôn ngữ truy vấn MongoDB)" / "Chạy bằng dynoxide (giả lập DynamoDB)" | lab trên mg/dy |
| "Kết quả ghi từ <server> <version>, ngày …" | có `recorded` |
| "Sơ đồ" | `concept`/`quiz` không có lab |

Bài BE có thêm một dòng `text-caption`: "Phần chạy thật cần máy chủ thật (nhiều phiên / replica set / AWS). Bài này dùng sơ đồ và kết quả ghi sẵn". **Không** dùng chữ "sắp có" hay "later" (`tests/noDeadEnds.test.ts` mở rộng cho Engine).

---

## 4. Thang mỗi engine: mô-đun và "Học xong bạn làm được…"

Mô-đun là các slug đề xuất cho agent nội dung. Agent được đổi tên, nhưng mỗi cấp phải giữ số bài và tỉ lệ H/D ở §1.2 (lệch ±2 bài thì ghi vào L của version). Câu "làm được" đi vào `after` (ADD-1). Mỗi câu **phải kiểm được** bằng một bài `lab`/`predict`/`capstone` của chính mô-đun.

### 4.1 PostgreSQL

| Cấp | Mô-đun (slug) | Nội dung (knowledge §3) | H/D | Học xong bạn làm được… |
|---|---|---|---|---|
| L1 | `types` | `numeric` vs `float8`, `timestamptz`, `text`, `jsonb`, `uuid` + `uuidv7()` | H | chọn kiểu cho một bảng mới và chỉ ra vì sao tiền không để `float8` |
| L1 | `constraints` | PK, FK, UNIQUE (`NULLS NOT DISTINCT`), CHECK, NOT NULL, generated column | H (`catalog`) | viết `CREATE TABLE` từ chối dữ liệu sai ngay lúc ghi |
| L1 | `transactions` | `BEGIN/COMMIT/ROLLBACK`, savepoint, schema và `search_path` | H | gói nhiều thay đổi để chúng cùng thành công hoặc cùng không xảy ra |
| L1 | `first-index` | B-tree đầu tiên, `EXPLAIN` Seq Scan vs Index Scan, `cost=` | H (`plan`) | đọc một dòng `EXPLAIN` và biết câu có dùng index không |
| L2 | `btree-multi` | luật cột đầu, skip scan (18), `INCLUDE`, index-only | H | thiết kế index nhiều cột cho một câu có lọc + sắp xếp |
| L2 | `partial-expr` | partial, expression, unique index | H | làm một index nhỏ chỉ phủ phần dữ liệu câu cần |
| L2 | `index-types` | Hash, GIN, GiST, SP-GiST, BRIN, bloom | H | chọn đúng loại index cho jsonb, mảng, khoảng thời gian, hình học |
| L2 | `search` | `tsvector/tsquery` + GIN, `pg_trgm`, `jsonb_ops` vs `jsonb_path_ops` | H | làm tìm kiếm chữ có index thay cho `LIKE '%x%'` |
| L2 | `explain-analyze` | `EXPLAIN (ANALYZE, BUFFERS)`, `pg_stats` cơ bản, `CONCURRENTLY` (D) | H + 1 D | đọc ước lượng vs thực tế, `Buffers:` và chỉ ra nút đắt nhất |
| L2 | `geo-lite` | `point/box/circle`, GiST KNN `<->`, `earthdistance` | H | tìm "5 điểm gần nhất" bằng index |
| L3 | `pages` | trang 8 KB, header 24 B, line pointer, `ctid`, TOAST | H-B | nhìn một trang heap thật và nói dòng nào nằm ở đâu |
| L3 | `mvcc` | `xmin/xmax/ctid`, phiên bản dòng sau UPDATE | H-B | giải thích vì sao UPDATE làm bảng phình |
| L3 | `vacuum-hot` | HOT, fillfactor, VACUUM, visibility map, FSM, freeze/wraparound (D) | H-B + D | chọn fillfactor cho bảng cập nhật nhiều và kiểm HOT bằng số đếm |
| L3 | `wal` | record, LSN, full-page write, checkpoint, crash replay (D) | H-B + D | đọc bản ghi WAL thật của một INSERT |
| L3 | `memory` | shared buffers, `pg_buffercache`, `work_mem` tràn đĩa | H-B | thấy `external merge Disk:` và sửa bằng `work_mem` |
| L4 | `planner-stats` | 5 hằng số chi phí, MCV/histogram/correlation, extended statistics | H | sửa một ước lượng sai bằng `CREATE STATISTICS` |
| L4 | `joins` | thứ tự join, `join_collapse_limit`, GEQO | H | đọc vì sao planner chọn Hash vs Nested Loop |
| L4 | `prepared` | `plan_cache_mode` generic vs custom | H | nhận ra một câu prepared chậm vì plan generic |
| L4 | `partitioning` | range/list/hash, pruning lúc plan và lúc chạy | H | thiết kế partition và chứng minh pruning bằng `EXPLAIN` |
| L4 | `locks` | 8 lock mode qua `pg_locks`, advisory lock; isolation, SSI, khóa dòng, deadlock (D) | H + D | đoán DDL nào chặn SELECT, và retry đúng khi gặp `40001` |
| L4 | `parallel-jit` | `Gather`, JIT (D: PGlite không có) | D | đọc `Gather` và `JIT:` trong kế hoạch của server thật |
| L5 | `index-internals` | B-tree dedup/split, GIN pending list, BRIN summarize, GiST | H | soi trang index thật, giải thích index phình |
| L5 | `integrity` | `amcheck`, WAL đào sâu (`fpi_length` sau checkpoint) | H | kiểm index hỏng, đo WAL sinh ra |
| L5 | `security` | RLS: `USING`/`WITH CHECK`, permissive/restrictive, `FORCE` | H | viết policy cho mỗi khách chỉ thấy dòng của mình, và thử bằng `SET ROLE` |
| L5 | `observe-tune` | `pg_stat_statements`, `pg_stat_*`, `work_mem`/`maintenance_work_mem`, `pg_overexplain` (tùy chọn) | H | tìm câu tốn nhất và đề xuất chỉnh |
| L5 | `replication-ops` | streaming, logical decoding, autovacuum sản xuất, PITR, failover | D (BE) | vẽ được đường đi của WAL tới standby và đọc độ trễ |

### 4.2 MongoDB

Dữ liệu `mongo-lab` là chuỗi cửa hàng của `lab.sql` chuyển thành tài liệu: `orders` có mảng `lines` nhúng. Bộ này sinh lúc build, md5 ghim trong test. Nhờ vậy mọi lab L1–L2 hiện được tab "So với SQL" **sau khi đạt**: cùng câu hỏi, cùng con số trên `lab`. Đây là phần "gần như tương đương SQL" của yêu cầu gốc, thay cho 168 drill soi gương của bản 1 (đã bỏ, §9).

| Cấp | Mô-đun | Nội dung (knowledge §4) | H/D | Học xong bạn làm được… |
|---|---|---|---|---|
| L1 | `documents` | BSON, ObjectId/Date/Decimal128, 16 MiB, 100 tầng | H | đọc một tài liệu và biết trường nào lồng, trường nào mảng |
| L1 | `crud` | `insertOne/Many`, `find` + projection, `updateOne/Many` (`$set/$inc/$push/$addToSet/$pull`, upsert), `deleteMany` | H (`doc`) | thêm, tìm, sửa, xóa đúng tài liệu |
| L1 | `query-ops` | `$eq/$gt/$in/$exists/$type/$regex/$elemMatch`, dot notation, `sort/limit/skip`, `countDocuments` | H | lọc trên trường lồng và trong mảng |
| L2 | `update-pipeline` | positional `$`, `arrayFilters`, pipeline update, `$$NOW`, bẫy `$literal` | H | sửa hàng loạt bằng biểu thức, không đọc rồi ghi lại |
| L2 | `aggregation` | `$match/$group/$sort/$unwind/$lookup/$facet/$bucket/$setWindowFields` | H | viết báo cáo doanh thu theo tuần bằng pipeline |
| L2 | `modeling` | nhúng vs tham chiếu, `$jsonSchema` (+ `$merge/$out`, validation level: D nếu mingo thiếu) | H + 2 D | chọn nhúng hay tách cho một quan hệ và giải thích |
| L3 | `indexes` | `_id`, single/compound, multikey, partial, sparse, TTL, wildcard, text, 2dsphere, hashed | D (`catalog` theo luật) | viết `createIndex` đúng cho một câu |
| L3 | `esr-explain` | ESR, covered query, `explain` (`totalKeysExamined/totalDocsExamined/nReturned`), stage | D (`predict` trên `recorded`) | đọc `explain("executionStats")` và chỉ ra index tệ |
| L3 | `planner-agg` | multi-planner, plan cache, tối ưu aggregation, 100 MB/stage, `allowDiskUse` | D | sắp lại pipeline cho `$match` dùng được index |
| L4 | `patterns` | Computed, Group Data, Polymorphic, Schema Versioning, Archive, Single Collection; di chuyển schema | H | áp một pattern và di chuyển dữ liệu sang phiên bản schema mới |
| L4 | `consistency` | write/read concern, read preference, causal consistency, transaction, change streams, TTL đang chạy | D (BE) | chọn concern đúng cho một luồng ghi tiền |
| L5 | `wiredtiger` | document-level concurrency, snapshot, checkpoint 60 s, journal, nén, cache | D | giải thích vì sao ghi xung đột thì được retry |
| L5 | `replication` | replica set, election (`electionTimeoutMillis` 10 s), oplog, rollback | D (BE) | đọc một kịch bản failover và đoán dữ liệu nào mất |
| L5 | `sharding-ts` | shard key, hashed vs range, `reshardCollection`, time series | D | chọn shard key cho một collection ghi nhiều và tránh điểm nóng |

**Ca giá trị khó nhất là MongoDB L3: 0 bài H.** Cách giữ giá trị:

1. Mọi bài `predict` dùng `explain` thật, chụp một lần từ `mongod` bằng script ngoài app (`scripts/capture-mongo.md`: chỉ có hướng dẫn, không chạy trong CI), có `recorded`.
2. Mọi lab dùng `check: catalog` theo luật ESR thuần, có test trên các ca chụp thật: luật phải cho cùng kết luận với `explain` đã ghi.
3. Tab "Bên trong" vẽ sơ đồ dãy khóa ESR từ đặc tả của **chính người học**.

### 4.3 DynamoDB

Dữ liệu `dynamo-lab` là bảng single-table `Shop` (`CUST#…`, `ORDER#…`, `STORE#…`) + 2 GSI, ~2k item (≤ 2 s nạp vì ~1 ms/item, đo). Lần đầu mở lab sẽ tải 1,2 MB, có dòng báo trước "Tải bộ máy DynamoDB 1,2 MB".

| Cấp | Mô-đun | Nội dung (knowledge §5) | H/D | Học xong bạn làm được… |
|---|---|---|---|---|
| L1 | `keys` | không JOIN, item ≤ 400 KB, PK/SK, item collection | H | thiết kế khóa cho "mọi đơn của một khách" |
| L1 | `crud` | Put/Get/Update/Delete, `ReturnValues`, `ProjectionExpression` | H (`doc`) | đọc và ghi một item theo khóa |
| L1 | `query-scan` | Query vs Scan, 1 MB/lần, `LastEvaluatedKey` | H | phân trang một Query và thấy Scan tốn hơn bao nhiêu |
| L2 | `expressions` | KeyCondition, FilterExpression (lọc sau khi đọc), UpdateExpression, từ dành riêng | H | viết Query không tốn RCU cho item bị lọc bỏ |
| L2 | `safe-writes` | conditional write, atomic counter, idempotency, batch 100/25 | H | chống lost update bằng điều kiện |
| L2 | `partiql-cost` | PartiQL, cỡ item, RCU/WCU; eventual vs strong (D) | H + D | tính trước chi phí một Query và đối chiếu `ConsumedCapacity` |
| L3 | `secondary` | LSI vs GSI, projection, sparse index; độ trễ GSI (D) | H + D (`catalog`) | thêm GSI cho một mẫu truy cập mới mà không Scan |
| L3 | `single-table` | access-pattern-first, sort key phân cấp, adjacency list, GSI overloading | H | gom 6 mẫu truy cập vào một bảng |
| L4 | `scale` | write sharding, partition 3000/1000, adaptive capacity, hot partition, capacity mode | H + D | rải một khóa nóng và tính giá phải trả khi đọc |
| L4 | `transactions` | PartiQL `ExecuteTransaction`, chi phí ×2; `TransactWriteItems` (D, dynoxide không có: pending) | H + D | ghi hai item cùng thành công hoặc cùng không |
| L5 | `streams-ttl` | Streams 24 h, thứ tự theo item, TTL (không tốn WCU) | D (H nếu spike ES3 thấy dynoxide có) | thiết kế luồng tính tổng từ Streams |
| L5 | `global-ops` | global tables, PITR/backup, DAX, vector index | D (BE: AWS thật) | chọn chế độ global table cho một ứng dụng hai vùng |

Bảng "không có tương đương SQL" (không JOIN, GROUP BY, window phía server) là **nội dung dạy** của `keys` và `single-table`: mỗi ô có một bài `concept` kèm câu chấm. Không phải chỗ trống.

---

## 5. Sơ đồ (`viz`)

- **Luật giữ nguyên v5/v6 (L101–L122):**
  - người học bấm từng bước; mỗi bước ≤ 3 s; khung gốc = trạng thái cuối, nên giảm chuyển động hiện ngay khung đó;
  - GSAP qua `loadGsap()`, không bao giờ chờ chunk;
  - biến đổi chỉ trên SVG lá; vẽ lại không phát lại;
  - chữ SVG ẩn dưới `lg`, có danh sách HTML các bước + `aria-live` một câu;
  - token `--eng-*` cho cả hai theme, tương phản kiểm trong `tests/theme.test.ts`;
  - không linh vật trong sơ đồ: Boon một dòng dưới sơ đồ, Lily chỉ reo khi xong cấp.
- **Một bộ vẽ chung** `src/engine/diagram.ts`: dựng SVG từ mô tả dữ liệu (các khung node/cạnh), GSAP chỉ tween giữa các khung. Mỗi sơ đồ là một file mô tả trong chunk `enginemotion`, nên 30+ sơ đồ là nội dung chứ không phải 30+ đoạn code.
- **Danh mục `viz` đợt đầu** (tên = giá trị frontmatter):

  | Engine | Sơ đồ |
  |---|---|
  | Postgres | `pg-query-path`, `pg-heap-page`, `pg-mvcc`, `pg-hot`, `pg-vacuum-vm`, `pg-wal`, `pg-btree-split`, `pg-gin`, `pg-brin`, `pg-gist`, `pg-partition-prune`, `pg-locks`, `pg-isolation`, `pg-replication` |
  | MongoDB | `mg-pipeline`, `mg-esr`, `mg-replica-election`, `mg-sharding` |
  | DynamoDB | `dy-partitions`, `dy-gsi`, `dy-single-table` |

  Test: mọi `viz` trong nội dung có trong danh mục, và mọi sơ đồ trong danh mục được ít nhất một bài dùng.
- **"Đoán trước khi xem"** (như hộp đoán của `sqlMotion`, L154): trước bước kết quả có một câu ngắn, ví dụ "Cây cao thêm mấy tầng?". Câu này không lưu và không chấm, vì câu chấm là `quiz` của bài.

---

## 6. Runtime và an toàn

### 6.1 PostgreSQL

| Nhu cầu | Cách làm |
|---|---|
| Lab đọc một câu (H-A) | `runSandboxed` trên schema mới `engine` (`SCHEMAS`, seed lười như `lab`, không đụng md5 của `lab`) |
| Extension (`pageinspect`, `pg_visibility`, `pg_walinspect`, `pg_buffercache`, `pg_freespacemap`, `amcheck`, `bloom`, `btree_gin/gist`, `pg_trgm`, `cube`, `earthdistance`, `pg_stat_statements`) | PGlite chỉ nhận extension lúc tạo. **Spike ES1** (v22) chọn giữa (a) nạp mọi contrib nhỏ (< 100 KB tổng) cho PGlite chính và (b) tạo một PGlite thứ hai chỉ cho Engine, có đo RAM trên điện thoại. Mặc định nghiêng về (a) nếu boot chậm thêm < 150 ms |
| H-B (UPDATE rồi soi trang, `VACUUM`, flush stats, WAL trước/sau, `SET ROLE`, `PREPARE`) | Request mới `kind: 'engineLab'`, làm qua hai phiên bản:
  - **v22, bản tối thiểu:** `setup` của tác giả → câu người chơi → câu dò `catalog`, trong **một** transaction rollback. Đủ cho L1–L2.
  - **v24, thêm phần chạy ngoài transaction:** worker chạy `lab.setup` của **tác giả** ngoài transaction, trên schema `engine` dựng lại mỗi lab (`DROP SCHEMA … CASCADE` + setup); sau đó câu người chơi vẫn đi qua `runSandboxed`, một câu, rollback. `VACUUM` báo 25001 nếu chạy trong transaction (đo), nên nó chỉ nằm trong `setup` hoặc một bước có `solution` do worker chạy tay theo hằng số |
| Nhiều phiên, autovacuum, parallel, JIT, logical decoding | D (+ `recorded` từ PostgreSQL 18 thật). Spike nhỏ: PGlite có boot được với `wal_level=logical` không |

Timeout 5 s và terminate giữ nguyên. Người chơi vẫn chỉ được một câu, vì PGlite từ chối nhiều câu.

### 6.2 MongoDB và DynamoDB

- **Mỗi engine một worker riêng** (`mongoWorker`, `dynamoWorker`), nên `src/db/worker.ts` không đổi vì chúng.
- **Timeout:** cùng luật với `DbClient`: chạy quá 5 s thì terminate worker và dựng lại.
- **Bộ phân tích shell** (`src/engine/mongoShell.ts`, thuần):
  - chỉ nhận `db.<c>.<lệnh>(…)` với JSON lỏng (`ISODate`, `ObjectId`, `NumberDecimal`, regex);
  - không `eval`;
  - lỗi có vị trí, gạch chân bằng `setDiagnostics`.
- **DynamoDB:** request JSON qua `JSON.parse`; PartiQL đưa thẳng cho dynoxide.
- **Tô màu editor Mongo:** cần `@codemirror/lang-javascript`, một dependency **chưa được duyệt**, nên phải hỏi user. Nếu không có, editor hiện chữ thường; bộ phân tích vẫn bắt lỗi.

---

## 7. Kiến trúc thông tin

### 7.1 Route (thuần, `src/route.ts`, thêm `'engine'` vào `ROUTES`)

| Hash | Trang | Vẽ ở |
|---|---|---|
| `#/engine` | Tổng quan: 3 thẻ engine (tiến độ cấp, dòng "Tiếp tục" trong Engine, cấp kế tiếp), một dòng "Best Practice" (§7.5) | section trong `<main id="home">` |
| `#/engine/<engine>` | Trang engine: 5 cấp, mỗi cấp một thẻ (số bài, phút, tỉ lệ chạy thật, đã xong) | như trên |
| `#/engine/<engine>/l<n>` | Trang cấp: các mô-đun (tiêu đề, câu "Học xong bạn làm được…", danh sách bài có loại + phút + nhãn) và capstone ở cuối | như trên |
| `#/engine/lesson/<id>` | Bài `concept`/`quiz`/`predict`: trang đọc | như trên |
| `#/engine/play/<id>` | Bài `lab`/`capstone` trong workspace | `<main id="shell">`, mode `engine` |

Không có route riêng cho mô-đun: mô-đun là một khối của trang cấp (bớt một tầng bấm). Hash lạ rơi về trang gần nhất còn đúng (`#/engine/postgres/l9` → `#/engine/postgres`), theo luật không ngõ cụt. `tests/noDeadEnds.test.ts` mở rộng: mọi route Engine parse được; mọi cấp đã phát hành có ≥ 1 mô-đun và đúng một capstone; không có chữ "sắp có/later".

Một cấp **chưa phát hành** không có thẻ. Trang engine chỉ ghi "L1–L2 · 24 bài", không có thẻ xám. Engine chưa phát hành (Mongo trước v27) thì **không có** thẻ trên `#/engine`.

### 7.2 Điều hướng

- **Desktop (≥ 1024):**
  - `registerNav({ id: 'engine', area: 'top', order: 25, … })`, đứng giữa Lộ trình (20) và Luyện (30);
  - icon mới `database` trong `NAV_ICON` (Phosphor `Database`, duotone), test icon duy nhất;
  - nhãn "Engine" cả VI lẫn EN (thêm vào `SAME_OK`); tiêu đề trang là "Database Engine".
- **Rủi ro top bar:** thêm một mục có thể làm thanh lại thành hai hàng hoặc cắt chữ (L114, U1/U2). Luật:
  - từ 1024 tới dưới 1440 px, mục Engine giữ nhãn ngắn "Engine";
  - nếu phải bớt chỗ thì bớt như các mục khác (`#rank` ẩn dưới 1440, U1), không cắt chữ.
  - **Cổng:** header một hàng 53 px, không phần tử con nào có `scrollWidth > clientWidth` ở 1024/1280/1366/1440, VI và EN, sáng và tối.
- **Điện thoại (< 1024, `#bottom-nav`):** không thêm mục thứ sáu.
  - "Lộ trình" đổi nhãn thành **"Học"** và được "đang ở" cả trên `#/learn…` lẫn `#/engine…`.
  - Đầu `#/learn` và `#/engine` có công tắc hai nút **SQL | Database Engine**: `role=tablist`, mỗi nút là link, nhớ lựa chọn cuối trong pref `cargo-query/learn-tab`. Mục "Học" mở trang theo pref đó.
  - **Cổng:** `#bottom-nav` cao < 72 px ở 320 (checklist I1).
- **Sidebar** (`#side`, theo mẫu `sideExtra()` của trang Dữ liệu):
  - rộng (≥ 1280, pref không phải `rail`): cây engine → cấp → mô-đun của trang đang mở;
  - rail (64 px): 3 icon engine + 5 chấm cấp;
  - mở rộng rail thì **đẩy trang, không đè, không lớp mờ** (L188);
  - chỉ tô "đang ở" đúng engine, cấp và mô-đun của trang hoặc bài đang mở (bài học từ U19); bài lab trong workspace tô theo `id` của bài;
  - dưới 1024: ngăn kéo `<dialog id="side-drawer">` có sẵn.
- **Liên kết một chiều** (theo tinh thần L82):
  - Domain → Engine: chip "Đào sâu: …", ví dụ việc index lab ch11 → `first-index`/`btree-multi`;
  - General → Engine: nút nâng cao về hiệu năng, kỹ năng `explain_read`/`index_design`;
  - Engine **không** nhắc domain nào; Engine → General chỉ có chip "Nên biết trước" trỏ tới trang kỹ năng SQL.

### 7.3 Wireframe (desktop 1280 và điện thoại 375)

```
1280, #/engine/postgres/l2 (sidebar rộng)
┌─────────────────────────────────────────────────────────────────────────────┐
│ ◉BoonData  Trang chủ  Lộ trình  Engine  Luyện  Tiến bộ        Logistics ▾ ⋯ │
├────────────┬────────────────────────────────────────────────────────────────┤
│ PostgreSQL │ Database Engine › PostgreSQL › L2 Thực hành                    │
│  L1 ✓      │ # Chọn đúng index, đọc đúng kế hoạch     14 bài · ~3 giờ · 93% │
│ ▸L2        │                                                    chạy thật   │
│   btree-…  │ ┌ Index nhiều cột ───────────────────────────────────────────┐ │
│   partial  │ │ Học xong bạn làm được: thiết kế index nhiều cột cho một     │ │
│   …        │ │ câu có lọc + sắp xếp.                                       │ │
│  L3        │ │ 01 Khái niệm · Luật cột đầu        8'  Sơ đồ          ✓     │ │
│  L4  L5    │ │ 02 Đoán kế hoạch · Skip scan       5'  Chạy thật            │ │
│ MongoDB    │ │ 03 Lab · INCLUDE và index-only    12'  Chạy thật            │ │
│ DynamoDB   │ └─────────────────────────────────────────────────────────────┘ │
│            │ … Kiểm tra cấp L2 (capstone, 4 bước)                           │
└────────────┴────────────────────────────────────────────────────────────────┘

375, #/engine
┌───────────────────────┐
│ [ SQL | DB Engine ]   │ ← công tắc, nút đang chọn đậm
│ Database Engine       │
│ ┌ PostgreSQL ───────┐ │
│ │ L2 · 9/14  ▓▓▓░░  │ │
│ │ Tiếp: 10 Lab …  › │ │
│ └───────────────────┘ │
├───────────────────────┤
│ ⌂  Học  Luyện  ☺  ◧   │ ← vẫn 5 mục
└───────────────────────┘
```

Wireframe lab heap, đoán kế hoạch, sơ đồ B-tree split và lab DynamoDB giữ như bản 1 (`git show 6253716:docs/team/product-design-db-engine.md`, §2.2, §2.5, §5.3). Điểm khác duy nhất: nhãn trung thực của §3.6 nằm cạnh tiêu đề.

### 7.4 Tiến độ, XP, Lily, `#/me` (không bump Save)

| Thứ | Quyết định |
|---|---|
| Save | `isWorkId` nhận thêm `ENGINE_ID` (§2.2). Không field mới, không bump `SAVE_VERSION`. Fixture mới `save-v5-engine.json` + test đọc → ghi → đọc giữ id Engine. Bản build cũ đọc save mới sẽ bỏ id Engine: chấp nhận (một site), ghi vào L |
| `completed` | Bài đạt của **mọi** loại, kể cả `concept`. Đạt là trả lời đúng mọi câu, hoặc bấm "Đã hiểu" khi bài không có câu |
| `bossStep` | Bước đang làm của `lab` nhiều bước và `capstone` |
| `drafts` | Nháp editor của lab. `graded` **không** ghi (Recap và portfolio chỉ là của SQL) |
| XP | Lần đạt đầu: `concept`/`quiz`/`predict` +5, `lab` +10, `capstone` +20 cho cả bài, như `ENGINE_XP` trong parser. Lần sau: 0. Tính trong chunk Engine lúc đạt, vì `kind` nằm trong nội dung chứ không trong id. Cộng vào `save.xp`. Chức danh vẫn chỉ đổi theo đánh giá thăng tiến của domain |
| Gợi ý | Miễn phí, không ghi `hintsUsed` |
| Ôn Leitner | **Không có ở bản này**: schema không có kỹ năng, và `readV2` bỏ khóa lạ. Đề xuất sau v30 (hoặc khi dư sức) là ADD-6, trường `recall: <khóa>` + mẫu khóa `^(pg\|mg\|dy)\.[a-z_]+$` trong `review` |
| Tổng số không cần chunk | Top bar, Trang chủ và `#/me` chỉ cần "N bài Engine xong", đếm theo mẫu id. Số "/ tổng", mô-đun và cấp xong chỉ có trong chunk Engine |
| Lily | Giai đoạn **không đổi** (L87/L132: đo kỹ năng SQL). Reo khi xong capstone. Album (L134) thêm dòng kỷ niệm suy ra từ `completed`: "Lần đầu soi một trang heap" (`e-pg-l3-…` đầu tiên), "Xong PostgreSQL L5" |
| `#/me` | Khối "Database Engine": mỗi engine có cấp xong / tổng, bài xong, phút đã học. Vẽ bởi chunk Engine, gắn qua hook `pages: ['me']`. `me` hiện 11/12, nên hook chỉ thêm ~0,2 KB |
| Trang chủ | Không thêm thẻ. `resumeLine` có thể trỏ vào bài Engine cuối (pref route có sẵn). Không thêm vào thẻ "Buổi học hôm nay" của V22-C ở bản này |

### 7.5 Best Practice (L215 mục 6)

- **Ở đâu:** `#/engine/best` (tab "Best Practice" thứ tư trên `#/engine`, sau ba engine) và mỗi trang engine có một liên kết tới phần của engine đó. Nó thuộc Engine vì phủ cả SQL lẫn NoSQL, và không chiếm chỗ ở thanh dưới.
- **Nội dung:** agent Research viết liên tục. Mỗi mục là một **luật có lý do**, một ví dụ "nên / không nên" chạy được (cùng runtime, có `check` như lab) và nguồn chính thức.
- **Định dạng (còn mở):** đề xuất dùng lại ENGINE-CONTENT-V1 (`kind: lab` hoặc `quiz`). Có hai chỗ chưa khớp:
  - thư mục `content/engine/best/…` nằm ngoài danh sách `engine` của schema;
  - id `e-bp-…` không khớp `ENGINE_ID` (`pg|mg|dy`), nên khi đọc save sẽ bị bỏ.

  Gọn nhất là thêm `bp` vào mẫu id và `best` vào danh sách engine (ADD-8). Chốt cùng agent Research trước v25.

### 7.6 Chunk và ngân sách

**main tăng ≤ +1,5 KB cho cả vòng Engine.** Phần này gồm route, nav, `ENGINE_ID`, hook. Mọi chữ VI/EN của khung Engine nằm trong `src/i18n/engine.ts` (`et()`), không vào `vi.ts`/`en.ts`.

| Nhóm mới | Nội dung | Trần đề xuất (gz) |
|---|---|---|
| `engineui` | Trang tổng quan/engine/cấp/bài, trình chấm quiz/predict, `et()` | 20 |
| `enginemotion` | `diagram.ts` + mô tả sơ đồ | 25 |
| `pgcontent` | Nội dung Postgres, một chunk mỗi cấp (`pgl1`…`pgl5`), tải khi mở cấp | 15 mỗi cấp |
| `pgext` | Tarball contrib (knowledge §1.2, tổng ~120 KB) | 130 |
| `engineseed` | Seed schema `engine` | 12 |
| `mongort` | mingo + `mongoShell` + `docGrade` + `esr` | 45 |
| `mongodata` | `mongo-lab` | 80 |
| `mgcontent` / `dycontent` | Nội dung | 40 / 35 |
| `dynamort` | dynoxide wasm + glue | **1300** (cần user duyệt trần, §10) |

Mỗi luồng thêm dòng nhóm của mình vào `scripts/check-budget.mjs` trong commit gộp của luồng đó.

---

## 8. Cổng Product cho mỗi lần phát hành Engine (L215 mục 2, L217)

Một cấp chỉ được phát hành khi đủ các điều kiện sau:

1. Mỗi mô-đun có `after` (ADD-1), và có ít nhất một bài chấm chứng minh câu đó.
2. Mọi `setup`/`solution` chạy trong test trên runtime thật. Mọi `predict` Postgres có `expect` khớp kế hoạch thật (ADD-4).
3. Mọi số liệu trong bài có `[nguồn]` chính thức. Mọi output không chạy được trong trình duyệt có `recorded`.
4. **"Giải mù"** (như L84): một agent mới, chỉ thấy đúng những gì người học thấy, giải được mọi lab của cấp. Bài nào agent đó không giải được thì sửa đề.
5. e2e đi hết cấp đó trên bản build (`scripts/e2e.mjs`, phần `engine`).
6. Có checklist `ux-deploy-checklist.md` trên bản live, và có phần Product trong `review-vNN.md`.

---

## 9. Bỏ so với bản 1 (và vì sao)

| Bỏ | Vì sao |
|---|---|
| MySQL/InnoDB, MariaDB, hàng "sắp có" | User bỏ (L215). Hàng "sắp có" vi phạm luật không ngõ cụt |
| Lộ trình drill soi gương 11 Phần SQL cho MongoDB (168 drill, 42 kỹ năng), 8 Phần drill DynamoDB, phỏng vấn NoSQL, kiểm tra đầu vào NoSQL | Thang L1–L5 của knowledge doc + schema V1 (không có drill, không có kỹ năng) thay thế. "Gần như tương đương SQL" giữ bằng tab "So với SQL" trên cùng dữ liệu (§4.2). Có thể làm lại sau v30 trên ADD-6 |
| Bộ mô phỏng DynamoDB tự viết | dynoxide chạy thật Query/Scan/GSI/PartiQL (spike) |
| Mã loại bài trong id (`e-pg-l-…`) | Schema V1 đặt `kind` trong frontmatter |
| Dải L215–L239 | L215–L218 đã dùng. Dải mới ở `roadmap-v22-v30.md` §3 |

## 10. Cần user

| # | Câu hỏi | Khuyến nghị | Nếu không trả lời |
|---|---|---|---|
| D-E1 | Điện thoại: gộp "Lộ trình" + "Engine" thành "Học" có công tắc | Gộp | Gộp |
| D-E6' | Dependency ngoài phần L215 đã cho: `@codemirror/lang-javascript` (tô màu editor Mongo) | Đồng ý (ghim chính xác, MIT) | Editor Mongo không tô màu |
| D-E11 | pgvector (~50 KB) / PostGIS (~20 MB) | pgvector **có** (nằm trong trần) ở L2 `geo-lite`/`search` tùy chọn; PostGIS **không** | Không cái nào; GEO bản nhẹ |
| D-E12 | Trần ngân sách mới, nhất là `dynamort` 1,3 MB tải lười (chỉ khi mở lab DynamoDB) | Chấp nhận | Lab DynamoDB vẫn chạy; vượt trần thì cổng budget đỏ ở v29 |
| D-E13 | Backend Python cho phần BE (Postgres nhiều phiên, `mongod`, replica set) | **Không** trong vòng v30. Giữ D + `recorded` | Không |
