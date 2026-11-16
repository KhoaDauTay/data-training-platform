# Cargo Query — Design Spec

Ngày: 2026-11-16 · Trạng thái: vòng 2 — đã cập nhật theo `docs/team/amendments.md` và quyết định D1–D6 của user, chờ review

## Thứ tự thực hiện

| Bước | Plan | Điều kiện bắt đầu |
|---|---|---|
| 1 | `plans/2026-11-16-cargo-query-plan-1-engine.md` (Plan 1, Task 1–11) | Task 1–3 đã có code; làm tiếp từ Task 4 |
| 2 | `plans/2026-11-16-cargo-query-plan-1b-visualization.md` (Plan 1b) | Plan 1 xong |
| 3 | `plans/2026-11-16-cargo-query-plan-1c-product.md` (Plan 1c) | Plan 1b xong |
| 4 | `plans/2026-11-16-cargo-query-plan-import.md` (Plan Import) | Plan 1c xong |
| song song | `plans/2026-11-16-cargo-query-plan-deploy.md` (Plan Deploy) | sau Plan 1 Task 2; chạy song song với các bước trên |

Mỗi plan sau chỉ sửa code của plan trước ở các điểm neo có tên rõ ràng, và Task 0 / Step 0 của plan đó grep các điểm neo trước khi sửa. Plan 2 (bảng Ops/Hải quan/Tài chính/Pricing, chương 4–5) và Plan 3 (chương 6–7) chạy sau Plan Import.

## 1. Mục tiêu

Web game học PostgreSQL, chia sẻ cho team/công khai. Hai nhánh:

- **DA (Data Analyst)** — làm trong bản này: giải ticket nghiệp vụ bằng SQL trên dữ liệu domain.
- **DE (Data Engineer)** — bản sau: kỹ thuật Postgres (index, EXPLAIN, MVCC, isolation…). Backend (nếu cần cho bài concurrency) viết bằng **Python, chạy trên Kubernetes**; không thuộc phạm vi spec này (§10).

Bản đầu tiên: nhánh DA đầy đủ **7 chương, ~35 ticket**.

### Ba chế độ (dùng chung một engine: worker PGlite + grader)

| Chế độ | Nội dung | XP |
|---|---|---|
| **Học chính** | chuỗi ticket theo chương (§5) | có |
| **Luyện tập** | biến thể của ticket đã xong, lặp cách quãng Leitner 5 hộp `[1,2,4,8,16]` ngày; 3 lối vào: Ôn hôm nay / Luyện kỹ năng / Làm lại ticket. Dùng nguyên grader, draft luyện tập không lưu. Boss không có biến thể. | 0 (chống farm) |
| **Sandbox** | editor tự do + đủ các tab panel dưới, **không có nút Nộp**; mục con **Dữ liệu của tôi** nạp CSV (§7b) | 0 |

Lý do: "học dễ nhớ" cần lặp lại cách quãng và buộc nhớ lại (biến thể), không chỉ làm lại câu cũ; Sandbox cho người học thử tự do và thử các tính năng trực quan trên dữ liệu của chính mình.

### Ngôn ngữ: EN/VI

UI và nội dung có **VI + EN**, VI là bản gốc. **Không dịch**: tên bảng/cột, SQL, dữ liệu seed, giá trị trong bảng kết quả, lỗi gốc của Postgres, tên người và phòng ban. Mặc định theo `navigator.language` (`vi*` → VI, còn lại EN); đổi bằng nút `VI | EN` trên topbar, không mất editor. Từ điển tự viết (`src/i18n/{index,vi,en}.ts`, tsc bắt khóa thiếu), không thêm thư viện i18n.

## 2. Bối cảnh game

Người chơi là DA mới của **Cargo Query Logistics**, công ty forwarder xuất nhập khẩu (đường biển + hàng không). Các phòng ban gửi ticket vào inbox; người chơi viết SQL để trả lời.

Vòng chơi: đọc ticket → xem schema → thử query, xem kết quả → **Nộp** → grader so với đáp án mẫu → đúng: ở lại ticket, hiện thẻ **Recap** (kỹ năng vừa mở, SQL của bạn cạnh Solution, +XP) và nút "Ticket tiếp theo →"; sai: báo loại lệch + gợi ý theo bậc.

## 3. Kiến trúc

Chạy hoàn toàn trong trình duyệt, deploy tĩnh, không backend.

```
┌──────────── Browser ─────────────────────────────────────┐
│  UI (DOM): Inbox │ Ticket │ Schema │ SQL Editor │ Result │
│        │                         │                       │
│   Content (tickets/*.md,      Grader ── Worker riêng      │
│    skills.yml, chapters.yml)     │      (PGlite bên trong)│
│   Progress (localStorage)        │      public + sandbox │
│   Import gốc (IndexedDB)         │                       │
└──────────────────────────────────────────────────────────┘
```

- **Stack:** Vite + TypeScript, CodeMirror 6 (`@codemirror/lang-sql`, `@codemirror/lint`), PGlite **0.5.16 pin cứng** (Postgres 18.6 — `random()` gắn với bản build), Vitest. UI là DOM thuần (helper `h()`/`svg()`), không UI framework, không game engine (skill web-games). Mọi dependency pin version chính xác.
- **Worker:** một dedicated Web Worker tự viết (giao thức message `{id, kind, …}` → `{id, result|error}`; `kind` là `run | explain | steps | import | dropImport`, thiếu `kind` = `run`), xử lý tuần tự từng request. Lúc boot worker còn gửi `{type: 'progress', loaded, total?}` để hiện tiến độ tải. Không dùng `PGliteWorker` vì nó bầu leader giữa các tab — `terminate()` ở tab không phải leader không dừng được query. Spike xác nhận `statement_timeout` không có tác dụng trong PGlite, nên `terminate()` là cách dừng duy nhất. Client cũng xếp hàng (chỉ gửi query kế khi query trước xong) để timer chỉ đo query đang chạy. Message `ready` kèm `timings: { bootMs, seedMs }`; có `performance.mark` `db:spawn`, `db:ready`, `db:restart`.
- **Ticket là file:** `content/tickets/<chương>/<id>.md` gồm frontmatter + đề + gợi ý + SQL đáp án + khối EN. Thêm ticket = thêm file, nạp qua `import.meta.glob`.

### Tải trang và ngân sách hiệu năng

Render inbox và nội dung ticket trước; PGlite (~5MB gzip) khởi động + seed trong worker. Thanh trạng thái hiện tiến độ tải theo byte (ví dụ `2.1/5.4 MB`). Mạng lỗi → nút thử lại, đề bài vẫn đọc được. Thư viện nặng (Mermaid, libpg-query, sql-formatter) chỉ tải khi cần.

| Chỉ số | Laptop | Slow 4G |
|---|---|---|
| FCP | ≤ 1s | ≤ 3s |
| DB sẵn sàng, lần đầu | ≤ 5s | ≤ 40s |
| DB sẵn sàng, lượt quay lại | ≤ 3.5s | — |
| Bộ nhớ tab | ≤ 400 MB | |

Ngân sách gzip từng chunk (CI kiểm): `index-` 250 KB, `worker-` 160 KB, `pglite-` 5.300 KB, `initdb-` 140 KB, `libpg-query` 380 KB, `mermaid` 900 KB, `sql-formatter` 60 KB.

### Kết luận về RPS

Bản DA không có origin server: RPS lên server của mình ≈ 0, và khi chơi (chạy, nộp, lưu) **không phát sinh request nào**. Lần vào đầu: ~9–17 request, ~5.7 MB gzip (~10 MB nếu `.data` không được nén). Lượt quay lại: 1 request nếu asset được đánh `immutable`. 1.000 người/giờ ≈ 5 RPS ở edge (đỉnh ~50). **Giới hạn chạm tới trước là bandwidth, không phải RPS** → việc cần làm là nén `.data` và cache asset, **không cần load test** cho bản DA.

### Định dạng ticket

````markdown
---
id: ch2-03
chapter: 2
title: Khách hàng chủ lực
title_en: Key accounts
from: { name: Lê Bình, dept: Sales }
difficulty: 2
beat: develop            # teach | develop | twist | rest | boss
requires: [group_by]     # kỹ năng phải có trước (id trong skills.yml)
grants: [having]         # kỹ năng ticket này dạy
tables: [shipments, containers, carriers]
ordered: false
columns: [customer_name, total_teu]   # nhãn cột kết quả mong đợi (boss: một danh sách cho mỗi bước)
starter: SELECT …        # SQL mẫu nạp sẵn vào editor khi draft rỗng (tùy chọn; hiện chỉ ch1-01 dùng)
variants:                # biến thể Luyện tập, variants[0] = bản Học chính
  - { year: "2026" }
  - { year: "2025" }
---
Bối cảnh (lời phòng ban)...

## Task
Yêu cầu cụ thể, có thể dùng {{year}}...

## Hints
1. Hướng đi
2. Bảng/cột cần dùng
3. Khung query

## Solution
```sql
SELECT ... WHERE ... = {{year}}
```

# EN
Context...

## Task
...

## Hints
1. ...
````

- **Song ngữ (D1):** khối `# EN` ở cuối **cùng file** (tối đa một khối, không chứa ```sql — SQL dùng chung), cùng cấu trúc mục với bản VI (cùng số gợi ý; boss lặp lại `## Step N: <title EN>` + đề bước), kèm `title_en` (và `conclusion_en` cho boss). Frontmatter và SQL chỉ một bản. Lý do: mọi thay đổi VI/EN của một ticket nằm trong một diff, test bắt lệch ngay. Bản phát hành yêu cầu **0 ticket thiếu EN**; ở dev thì fallback về VI có nhãn.
- **`columns:`** khai báo nhãn cột kết quả do tác giả viết (không bao giờ suy từ Solution) để thẻ "Kết quả mong đợi" hiển thị; số nhãn phải bằng số cột Solution. Nhãn là chuỗi trung tính ngôn ngữ, hiện y nguyên ở VI và EN: tên cột thật (`ref`, `eta`) hoặc định danh do tác giả đặt cho cột tính toán (`shipment_count`, `total_teu`), không dùng tên hàm (`count`, `sum`) vì lộ đáp án. Ticket thường: `columns: [a, b]`; boss: một danh sách cho mỗi bước. Grader vẫn so theo vị trí cột, không theo tên.
- **`## Task`** (tùy chọn) tách yêu cầu cụ thể khỏi phần bối cảnh, hiện trong khung nhấn "Yêu cầu" để người chơi thấy ngay việc phải làm. Không có thì giữ như cũ.
- **`variants`** (tùy chọn): 2–4 bộ giá trị cho template `{{x}}` trong tiêu đề, đề, gợi ý, Solution và khối EN; `variants[0]` là bản Học chính. Giá trị là mã/số/ngày trung tính ngôn ngữ (khớp `^[\w .:/-]{1,40}$`), hiện nguyên văn ở cả VI và EN. Kết quả các biến thể phải khác nhau từng đôi. Boss không có `variants`.
- **Boss** thay `## Solution` bằng 2–3 mục `## Step N: <tiêu đề>` (mỗi mục có đề bước + khối ```sql riêng) và thêm `conclusion: { question, options, answer }` + `conclusion_en: { question, options }` (`answer` dùng chung, số lựa chọn bằng nhau). Câu kết luận phải **không phụ thuộc số liệu** hoặc được một test seed khẳng định. Boss `ch2-05` (HAVING) và `ch3-05` (anti-join) có **bước 3 kiểm tra kỹ năng twist** của chương.

**Quy tắc nội dung:** ticket có thứ tự / top-N phải nêu tiêu chí phá hòa đầy đủ (ví dụ "bằng nhau thì xếp theo `ref`"), nếu không grader sẽ chấm sai câu đúng. Solution chỉ dùng ngày cố định, không dùng `CURRENT_DATE`/`now()` (test kiểm tra). Code span trong VI và EN phải giống nhau; EN không còn dấu tiếng Việt; bảng dùng trong Solution phải nằm trong `tables`. Mẫu ticket `content/TEMPLATE.md` đặt ngoài `content/tickets/`.

## 4. Dữ liệu domain

### Schema (~26 bảng, theo phòng ban)

| Nhóm | Bảng | Mở ở chương |
|---|---|---|
| Lõi | `customers`, `employees`, `ports`, `carriers`, `shipments`, `containers` | 1–3 |
| Ops | `shipment_events`, `trucking_orders`, `cfs_receipts` | 4 |
| Hải quan | `customs_declarations` (luồng xanh/vàng/đỏ, `amended_from_id`), `hs_codes`, `duties_taxes` | 4 |
| Tài chính | `charges`, `invoices`, `payments`, `vendor_bills`, `exchange_rates` | 5 |
| Sales/Pricing | `rate_contracts`, `quotations` | 5 |
| Chứng từ | `master_bills`, `house_bills` (`master_id`), `incoterms` | 6 |
| D&D + Claims | `free_time_terms`, `container_events`, `claims` | 6–7 |

Seed tạo **mọi bảng ngay khi khởi động** (đủ 26 bảng khi xong cả 3 plan triển khai) trong schema `public`. Schema `sandbox` được tạo rỗng lúc init, chỉ chứa dữ liệu người dùng nạp (§7b). "Mở khóa" chỉ ảnh hưởng sidebar schema và gợi ý; DB luôn đầy đủ.

### Seed

- Sinh trong Postgres bằng `generate_series` + `setseed()` → tất định, file SQL vài KB. **Mỗi khối bảng có `setseed()` riêng** và khối mới chỉ thêm vào cuối, để thêm bảng sau không làm đổi dữ liệu cũ.
- **"Hôm nay" trong game = 2026-10-31.** Dữ liệu booking từ 2024-11-01 đến 2026-10-31.
- Móc câu chuyện đặt sẵn từ seed lõi: khách 171–190 ngừng book từ 2026-03-01; khách 191–200 là bản trùng của khách 1–10; ~2% lô AIR ghi FOB; khách 1 là khách lớn nhất (dành cho câu chuyện D&D); hãng tàu 3 *Blue Anchor Lines* (câu chuyện claim); tuyến châu Âu NLRTM/DEHAM/BEANR (câu chuyện margin Q3/2026).
- Quy mô: ~200 khách, ~20.000 shipment trong 2 năm, tương ứng container/charges/events.
- Benchmark ngành (margin, on-time…) chỉ dùng làm tham số sinh dữ liệu cho hợp lý.

### Bẫy data quality (chỉ xuất hiện sau khi đã dạy cách xử lý)

Khách trùng tên khác cách viết · `ata` NULL ở lô chưa đến · phí nhiều loại tiền · lô hủy vẫn còn dòng phí · trọng lượng house ≠ master · FOB khai cho lô đường hàng không · tờ khai bị hủy rồi khai lại · lô đã giao nhưng chưa xuất hóa đơn.

### Câu chuyện cài sẵn (đáp án cho boss chương 7: "Biên lợi nhuận Q3 giảm, vì sao?")

1. Cước mua tuyến châu Âu tăng, hợp đồng bán chưa điều chỉnh → báo giá bán lỗ (nguyên nhân chính).
2. Phí D&D tăng mạnh ở một khách lớn.
3. Một hãng tàu có tỉ lệ claim cao.

## 5. Lộ trình ticket

Mỗi chương theo nhịp **teach → develop → twist → rest → boss** (răng cưa, skill level-design), ~5 ticket. Boss không dạy hàm mới và phải kiểm tra lại kỹ năng của ticket twist.

| Ch. | Kỹ năng | Phòng ban chính | Ví dụ |
|---|---|---|---|
| 1 Tuần thử việc | SELECT, WHERE, ORDER BY, LIMIT | Ops | Lô đi Rotterdam tuần này |
| 2 Báo cáo sản lượng | COUNT/SUM/AVG, ROUND, GROUP BY, HAVING | Sales | TEU theo hãng tàu quý 3 |
| 3 Nối dữ liệu | JOIN, LEFT JOIN, anti-join | CSKH | Khách 6 tháng không book |
| 4 Thời gian & phân loại | date/interval, CASE, NULL | Ops, Hải quan | On-time theo tuyến; thông quan theo luồng |
| 5 Nhiều bước | subquery, CTE | Kế toán, Pricing | Lô lỗ sau quy đổi tỷ giá; báo giá dưới giá mua |
| 6 Xu hướng | window functions (RANK, LAG, SUM OVER) | GĐ, Chứng từ | Top 3 khách mỗi tháng; lô kẹt ở bước nào; house ≠ master |
| 7 Điều tra | tổng hợp | Ban GĐ | Margin Q3 giảm, vì sao? D&D, claims scorecard |

`ch1-01` có `starter:` để người mới thắng trong 30 giây đầu. AVG/ROUND được dạy ở `ch2-01` (thẻ kỹ năng `aggregate`).

### Kỹ năng và mục tiêu chương (dữ liệu, không hard-code)

- **`content/skills.yml`** — ~20 kỹ năng. Mỗi kỹ năng: `id` (giữ id ch1–3: `select`, `where`, `order_by`, `limit`, `aggregate`, `group_by`, `having`, `join`, `multi_join`, `left_join`, `anti_join`), `chapter`, nhãn `label: {vi, en}`, và **thẻ kỹ năng** `syntax` (SQL, một bản), `when: {vi, en}`, `trap: {vi, en}` (≤ 6 dòng, dùng cho Sổ tay và skill map). Một file duy nhất, không tách file thẻ riêng.
- **`content/chapters.yml`** — mỗi chương: `chapter`, tiêu đề `title: {vi, en}` và `outcomes[]`, mỗi mục `{ vi, en, skills }` (câu mục tiêu hai ngôn ngữ + kỹ năng để tự tick khi đã học). Không còn `CHAPTER_TITLES` trong code.
- **`content/glossary.yml`** — ~30 thuật ngữ freight `{term, vi, en, columns}` cho Sổ tay.

Luật nội dung (test kiểm): mọi `requires/grants` có trong `skills.yml`; mỗi kỹ năng được grant đúng 1 lần, đúng chương; outcome chương N chỉ dùng kỹ năng của chương ≤ N; mỗi kỹ năng có `syntax/when/trap`; kỹ năng twist ⊂ `requires` của boss cùng chương.

## 6. Grader

- Mỗi lần chạy/nộp: `BEGIN` → query → `ROLLBACK`, nên người chơi không thể phá dữ liệu.
- Chạy query người chơi và Solution trên cùng DB, so kết quả:
  - không xét thứ tự dòng, trừ khi `ordered: true`;
  - so theo **vị trí cột**, bỏ qua tên cột;
  - **mọi giá trị số** (int, float, numeric — PGlite trả numeric dạng chuỗi) so sánh sau khi **làm tròn 2 chữ số thập phân**, nên `AVG(x)` khớp với `ROUND(AVG(x), 2)`; giá trị nằm đúng ranh giới làm tròn (0.335 vs 0.33499) có thể lệch — chấp nhận;
  - NULL bằng NULL; ngày so theo thời điểm.
- Query người chơi chỉ được **một câu lệnh** (PGlite từ chối nhiều câu trong một lần chạy), nên không thể thoát khỏi `BEGIN … ROLLBACK`.
- Phản hồi khi sai: sai số cột / thiếu N dòng / thừa N dòng / giá trị lệch (ví dụ 1 dòng). Không lộ đáp án. Query lỗi khi Nộp thì kết quả chấm kèm `error` (vị trí, SQLSTATE) để editor gạch lỗi.
- XP: base theo `difficulty`; mỗi bậc gợi ý đã mở trừ một phần. Luyện tập và Sandbox: 0 XP.

## 6b. Giao diện & trực quan hóa

**Bố cục** (đã chọn qua mockup): thanh trên → **dải bản đồ tuyến** mỏng, thu gọn được → hàng giữa: **đề bài trái**, **editor phải** (Chạy / EXPLAIN / Nộp) → **panel dưới rộng** có các tab:

| Tab | Nội dung | Nguồn dữ liệu |
|---|---|---|
| Kết quả | bảng kết quả (tối đa 500 dòng) | query của người chơi |
| Biểu đồ | tự vẽ cột (nhãn + số) hoặc đường (ngày + số), SVG tự viết | kết quả, nhận dạng theo OID kiểu cột |
| Thứ tự thực thi | 4 giai đoạn Parse → Transform → Optimize → Execute (theo ByteByteGo); chuỗi FROM/JOIN → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT với **số dòng thật** từng bước, tô sáng mệnh đề trong SQL gốc, dòng mẫu, nút phát tự động | `libpg-query` (parser Postgres WASM) + `pgsql-deparser` cắt query thành các query con, chạy trong `BEGIN … ROLLBACK`; `scan` lấy vị trí mệnh đề ở mức ngoặc 0 |
| EXPLAIN | cây plan có thanh số dòng/thời gian, cảnh báo Seq Scan lớn, chú thích VI/EN từng loại node | `EXPLAIN (ANALYZE, FORMAT JSON)` trong `BEGIN … ROLLBACK` |
| Luồng dữ liệu | sơ đồ SVG lá → gốc của plan, độ dày cạnh theo số dòng, chấm chạy theo cạnh | cùng dữ liệu EXPLAIN |
| Sơ đồ ER | ERD chuẩn **crow's foot** (Mermaid `erDiagram`), PK/FK/UK, quan hệ 0..1/1 theo cột FK nullable; bảng dùng trong query được tô màu; chỉ các bảng đã mở khóa (hoặc bảng trong `sandbox`) | `information_schema` (cột, ràng buộc, FK), tham số theo schema |
| Cột | danh sách bảng/cột đã mở khóa | `information_schema` |

- Query có `WITH`, `UNION`… hoặc window function: tab Thứ tự thực thi báo "chưa hỗ trợ, xem EXPLAIN" (mở rộng ở Plan 2).
- **Bản đồ tuyến:** SVG từ `world-atlas` (land 110m) + `d3-geo` (Natural Earth, xoay tâm 150°E để thấy cả châu Âu lẫn Mỹ); cảng là chấm, tuyến từ Việt Nam là đường tròn lớn; tuyến mở theo chương (Asia → South Asia → Europe → North America → Oceania → đường hàng không); rê chuột xem số lô của tuyến; đóng ticket → tàu chạy dọc một tuyến đã mở. Dải thu gọn kiêm thanh tiến độ: chấm theo beat `● ● ◐ ○ ◆` + `Tuyến đã mở n/N`.
- Mọi animation tắt khi `prefers-reduced-motion`. Không dùng 3D.

### Bổ sung (vòng 2)

Mọi trạng thái hiển thị dưới đây **tính lại từ save**, không lưu thêm.

- **Thanh trên:** `Ch 2/7 · 7/35 ticket · 1.250 XP · Ôn: N`, nút Hộp thư (`<dialog>`), trạng thái DB (tiến độ tải theo byte), nút `VI | EN` (nhóm 2 nút `aria-pressed`), xuất/nhập tiến độ, nút Sổ tay.
- **Inbox:** ngoài ticket theo chương có mục **Luyện tập** (Ôn hôm nay / Luyện kỹ năng / Làm lại ticket) và **Sandbox** (kèm Dữ liệu của tôi).
- **Ticket:** chip "Dạy: X · Cần: Y"; thẻ "Mục tiêu chương" ở ticket teach; thẻ **Kết quả mong đợi** (số cột, loại cột chữ/số/ngày/đúng-sai, số dòng, có thứ tự hay không, nhãn từ `columns:`; không bao giờ hiện tên cột của Solution), so với kết quả sau mỗi lần Chạy; thẻ **Recap** khi nộp đúng; màn **Tổng kết chương** sau boss.
- **Skill map** (`<dialog>`): khóa / đã học / đang vững / thuộc.
- **Sổ tay** (`<dialog>` không modal, để vừa đọc vừa gõ): Thẻ kỹ năng / Thuật ngữ, có ô lọc.
- **Panel:** tablist theo ARIA (roving tabindex, ←/→/Home/End). Nhóm tab [Kết quả · Biểu đồ] | [Thứ tự · EXPLAIN · Luồng] | [ER · Cột]; **không ẩn tab nào**, chỉ chấm "mới" trên Biểu đồ ở `ch2-01` và EXPLAIN ở `ch3-01`. Tab mặc định: Cột khi chưa chạy; sau khi Nộp sai thì mở tab theo loại sai. Mọi tab đọc SQL của lần chạy gần nhất; editor khác SQL đó thì hiện dải "SQL đã thay đổi — Ctrl+Enter để cập nhật".
- **Editor:** gợi ý tên bảng/cột có kiểu (chỉ bảng đã mở), chạy vùng chọn, gạch lỗi tại vị trí Postgres báo, lịch sử query (≤ 15 mục mỗi ticket, `<details>`), **Format SQL** bằng `sql-formatter` (pin version, tải lười, `Shift-Alt-F`). Phím tắt: `Mod-Enter` Chạy, `Mod-Shift-Enter` Nộp, `Ctrl+S` lưu draft, phím đơn `? i g 1–7 e` (bỏ qua khi focus trong editor/ô nhập). Đổi ngôn ngữ không remount editor.
- **Bố cục:** app shell `100dvh` khi màn ≥ 1024×700; bản đồ 28px (thu gọn) / 120px (mở); splitter kéo được (`role=separator`, phím ±5%); màn < 600px thanh Chạy/Nộp sticky.
- **Onboarding:** 4 coach mark trong `ch1-01` → `ch1-02`; bấm Chạy khi DB chưa sẵn sàng thì xếp hàng; có empty state cho các bảng/tab.
- **Sandbox:** như màn ticket nhưng không có đề và nút Nộp; sidebar chỉ có bảng đã mở và bảng trong `sandbox`; chấm điểm và bản đồ không áp dụng.
- **Tương phản:** đạt WCAG AA ở cả light/dark; trạng thái mờ dùng màu, không dùng `opacity`.
- **Phiên bản mới:** bắt `vite:preloadError` → "Có phiên bản mới, tải lại trang".

## 7. Xử lý lỗi

| Tình huống | Xử lý |
|---|---|
| Lỗi SQL | hiển thị **nguyên** thông báo lỗi Postgres, **thêm** khối giải thích VI/EN bên dưới (map theo SQLSTATE: `42703`, `42P01`, `42803`, `42601`…; regex trên message chỉ cho vài ca SQLSTATE không phân biệt được). Worker trả `SqlError` có `position` (1-based, theo ký tự), `code` (SQLSTATE), `hint` để editor gạch lỗi. |
| Query > 5 giây | `terminate()` worker, khởi động lại PGlite, nạp lại seed, tự nạp lại dữ liệu `sandbox` (§7b), báo "Query quá lâu". Timer chỉ đo query đang chạy (client xếp hàng). `restart()` lúc đang boot thì reject các query đang chờ thay vì treo. |
| Kết quả lớn | worker cắt ở `MAX_ROWS_WORKER = 50.000` dòng trước khi gửi về và đặt `truncated: true`; UI đọc cờ này và báo "Kết quả quá lớn". Dưới mức đó UI hiển thị 500 dòng đầu, grader so toàn bộ |
| PGlite tải lỗi / worker lỗi | nút thử lại; inbox/đề vẫn dùng được; query đang chờ reject ngay |
| Import lỗi / vượt giới hạn | từ chối cả file, nói rõ giới hạn nào (không cắt ngầm) |
| IndexedDB / localStorage không dùng được | chơi tiếp, không lưu, báo người chơi |

Lỗi và timeout là lỗi có kiểu, không kèm chữ; UI dịch theo ngôn ngữ.

### 7b. Nạp dữ liệu ngoài ("Dữ liệu của tôi", D3)

Mục tiêu: người học thử các tính năng đã có (Chạy, Biểu đồ, EXPLAIN, Luồng, Thứ tự thực thi, ERD) trên dữ liệu của chính mình.

| Mục | Quy định |
|---|---|
| Định dạng | chỉ **CSV** (UTF-8, phân cách `,` hoặc `;`, có dòng tiêu đề). SQL dump: chưa hỗ trợ. |
| Giới hạn | file **≤ 20 MB**, **≤ 200.000 dòng**, **≤ 50 cột**, **≤ 5 bảng**; kiểm ở main thread trước khi gửi worker |
| Nơi chứa | schema riêng **`sandbox`** trong cùng PGlite; `search_path = public, sandbox` (bảng game luôn thắng khi trùng tên) |
| Tên bảng/cột | sanitize về `[a-z0-9_]`, bắt đầu bằng số → tiền tố `c_`, cắt 63 ký tự, trùng → `_2`, trùng bảng game → hậu tố `_my`, trùng từ khóa Postgres loại R/T (`order`, `left`…) → hậu tố `_` (`order_`). Nạp file có cùng tên bảng với bảng đã nạp thì **thay** bảng cũ (không tính thêm một bảng). |
| Kiểu cột | suy bằng một lượt quét SQL: `bigint` (≤ 18 chữ số, không có số 0 đầu — `007`, số điện thoại giữ `text`), `numeric`, `date`/`timestamp` **chỉ dạng ISO** `YYYY-MM-DD[ HH:MM[:SS]]` (vì `DateStyle` là MDY), `boolean` (`true/false`), còn lại `text`; ô rỗng → `NULL`. Bảng nạp là `UNLOGGED` (spike: tốn khoảng nửa bộ nhớ so với bảng thường). |
| Cách nạp | message worker `kind: 'import'`, chạy ngoài `BEGIN…ROLLBACK`, `COPY … FROM '/dev/blob'` (parser CSV của Postgres, không ghép giá trị vào SQL, không thêm thư viện CSV), suy kiểu cột bằng SQL; timeout riêng **30s** |
| Lưu bền | **file gốc lưu IndexedDB**, tự nạp lại khi mở trang và sau mỗi `restart()`. Nạp lại lỗi/quá hạn → bỏ bảng đó và báo, không restart thêm. Có nút **xóa dữ liệu đã nhập**. Mọi truy cập IndexedDB bọc try/catch. Không dùng chế độ lưu IndexedDB của PGlite (DB game phải luôn seed tất định). |
| An toàn | nội dung CSV chỉ là dữ liệu: không chạy như SQL, không render bằng `innerHTML`; không gửi gì ra mạng. Truy vấn trên `sandbox` vẫn qua `BEGIN…ROLLBACK` (chỉ đọc). |
| Hiển thị | bảng nạp hiện trong mục "Dữ liệu của tôi", tab ER và autocomplete **chỉ trong Sandbox**. Ngoài Sandbox vẫn truy vấn được (cùng `search_path`) nhưng không hiện ở đâu và không ảnh hưởng chấm điểm (bảng game luôn thắng khi trùng tên). |

Cần spike trước khi viết plan Import: `COPY … FROM '/dev/blob'` trong worker và thời gian nạp 20 MB/200k dòng; `search_path` giữ qua `BEGIN…ROLLBACK`; Thứ tự thực thi với bảng ở `sandbox`; bộ nhớ worker sau khi nạp 5 file tối đa (5 × 20 MB). Nếu vượt ngân sách bộ nhớ tab 400 MB thì báo user quyết, không tự hạ giới hạn.

## 8. Lưu tiến độ (skill save-systems)

- JSON trong `localStorage`, key `cargo-query-save`. Chỉ lưu ID/dữ liệu gốc; chương mở khóa, level, tiến độ, "Ôn: N" được tính lại.
- **v1:** `{ version: 1, completed: [ticketId], xp, hintsUsed: {ticketId: n}, drafts: {"ticketId#stepIndex": sql} }`.
- **v2** (một lần nâng duy nhất, `MIGRATIONS[1]`), thêm:
  - `review: Record<skillId, { box, due }>` — hộp Leitner và ngày đến hạn;
  - `practice: { solved, failed }` — thống kê luyện tập;
  - `sandboxDraft: string` (≤ 20.000 ký tự);
  - `bossStep: Record<ticketId, number>` — bước boss đang làm (câu kết luận đang chọn dở không lưu).
- Đọc save: parse → kiểm `version` → từ chối nếu mới hơn bản game → **giữ bản cũ ở key `cargo-query-save.v<old>`** (1 bản) → migration tuần tự vN→vN+1 → validate với danh sách ticket id và skill id hiện có (bỏ id không còn tồn tại). Lỗi có kiểu (`NewerSaveError`, `InvalidSaveError`, cảnh báo `corrupt`/`newer`), không kèm chữ. Save hỏng hoặc mới hơn bản game được chép sang `cargo-query-save.bak` trước khi bắt đầu lại.
- Release nâng save version **đi riêng**, không gộp với thay đổi rủi ro khác.
- **Không nằm trong save** (key riêng, đọc trước khi render): `cargo-query/prefs` = `{ lang }`, `cargo-query/layout` (splitter), `cargo-query/map-collapsed`, `cargo-query/coach-done`, `cargo-query/history` (lịch sử query). Dữ liệu import nằm trong IndexedDB.
- Mọi truy cập `localStorage`/IndexedDB bọc try/catch; lỗi thì chơi tiếp không lưu và báo người chơi.
- Nút **Xuất/Nhập tiến độ** (file JSON).

## 9. Kiểm thử (Vitest, PGlite chạy trong Node)

1. Solution mọi ticket (mọi step boss, mọi biến thể) chạy được trên seed, trả kết quả khác rỗng.
2. Seed tất định: sinh 2 lần cho kết quả giống nhau; 3 câu chuyện ở §4 có mặt (ví dụ margin Q3 < Q2, tuyến châu Âu đóng góp phần giảm lớn nhất).
3. Soft-lock: theo thứ tự chương, mỗi `requires` đã được `grants` bởi ticket trước; mỗi `tables` đã mở ở chương đó hoặc trước.
4. Grader: đảo thứ tự, alias khác, thiếu/thừa dòng, lệch số thực, NULL; query lỗi trả `error`.
5. Save: round-trip, migration v1 → v2 từ fixture `save-v1.json`/`save-v2.json`, giữ bản cũ trước migrate, từ chối save mới hơn, bỏ id không tồn tại.
6. Kỹ năng/chương: luật ở §5 (skills.yml, outcomes, mỗi kỹ năng grant đúng 1 lần, twist ⊂ requires của boss).
7. Song ngữ: mọi ticket có khối `# EN`, `title_en` (`conclusion_en` cho boss), cùng số gợi ý/bước; code span VI = EN; EN không có dấu tiếng Việt.
8. Biến thể: mọi `{{x}}` có giá trị ở mọi biến thể; 2–4 biến thể; Solution mọi biến thể khác rỗng và kết quả khác nhau từng đôi; boss không có `variants`; `columns:` khớp số cột Solution.
9. i18n: placeholder `{x}` khớp giữa VI và EN; các bảng `Record<Lang, …>` cùng tập khóa.
10. Leitner (`src/practice.ts`): lên/xuống hộp, ngày đến hạn, đếm "Ôn: N".
11. Lỗi SQL: chạy SQL sai thật trên PGlite, kiểm map SQLSTATE → giải thích và `position`.
12. Import (sau spike): kiểm giới hạn, sanitize tên, suy kiểu cột trên PGlite Node.

CI chạy thêm kiểm ngân sách chunk (§3). Chưa chạy test trình duyệt trong CI.

## 9b. Vận hành & deploy (D6)

- **Mặc định: GitHub Pages**, deploy bằng GitHub Actions: `npm ci` → `npm run typecheck` → `npm test` → `vite build --base=/<repo>/` → `node scripts/check-budget.mjs` → deploy → `scripts/check-deploy.sh` trên URL vừa deploy. Miễn phí, không backend. Build phải chạy được dưới đường dẫn con (`base` tương đối hoặc `/<repo>/` trong `vite.config.ts`).
- **Phương án thay thế: Cloudflare Pages** (miễn phí, đặt được header cache và nén tốt hơn). Giữ sẵn `public/_headers` (`/assets/*` immutable, `index.html` no-cache) để chuyển host không phải sửa build. Đánh đổi của GitHub Pages: không đặt được `Cache-Control`, lượt quay lại tốn ~9–14 request revalidate, không có preview theo PR.
- **Nghiệm thu nén** sau mỗi lần deploy (script `curl`): `.wasm` có `application/wasm` + `content-encoding`, `.data` có `content-encoding`. Không đạt thì build `pglite.data.gz` và giải nén trong worker bằng `DecompressionStream` (spike nhỏ).
- Không bật COOP/COEP (PGlite không dùng SharedArrayBuffer; kiểm lại khi thêm dependency).
- Không dùng Railway/Vercel/Supabase lúc này.
- **Telemetry:** chỉ nút "Sao chép thông tin chẩn đoán" (allowlist: `build`, `kind`, `sqlstate`, `errorName`, `timings`, `ua`). Không bao giờ gửi SQL, message lỗi, draft hay dữ liệu import.

## 10. Ngoài phạm vi bản đầu

- Nhánh DE; backend cho DE sau này là **Python chạy trên Kubernetes** (chưa mở plan).
- Tài khoản / leaderboard / đồng bộ giữa máy.
- Nạp **SQL dump** (cần spike `SET ROLE` + lọc câu lệnh bằng libpg-query trước).
- **Telemetry tự động** (Worker + Analytics Engine) — chỉ làm khi có sự cố người chơi không tự báo được.
- Tự gắn link thuật ngữ trong đề và badge thuật ngữ ở tab Cột.
- ERD với FK do người dùng tự khai cho dữ liệu nạp.
- PWA/offline install · âm thanh · hiệu ứng canvas.
