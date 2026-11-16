# Cargo Query — Product Design (vòng review)

Ngày: 2026-11-16 · Vai trò: Product Designer · Trạng thái: đề xuất, chờ user duyệt

Nguồn: spec `docs/superpowers/specs/2026-11-16-cargo-query-design.md`, Plan 1 (`...-plan-1-engine.md`), Plan 1b (`...-plan-1b-visualization.md`), skill `save-systems`, `level-design`.

Tài liệu này chỉ chốt **luật sản phẩm** (cái gì, vì sao, giới hạn bao nhiêu, đổi file nào). Bố cục/component thuộc UI/UX + FE, hiệu năng thuộc DevOps, code thuộc BE — các chỗ bàn giao được ghi rõ “→ FE / → UI/UX / → BE / → DevOps”.

---

## 0. Cấu trúc sản phẩm trong một hình

```
Cargo Query (nhánh DA)
├── Học chính (Story)      7 chương × ~5 ticket, tuyến tính, có XP          ← đã có trong spec
│   └── mỗi chương: Mục tiêu (outcomes) → ticket teach→develop→twist→rest→boss
├── Luyện tập (Practice)   không XP, cập nhật độ thuộc kỹ năng              ← MỚI
│   ├── Ôn hôm nay        hàng đợi Leitner theo kỹ năng đến hạn
│   └── Làm lại ticket     mọi ticket đã xong, ưu tiên bản biến thể (variant)
├── Sandbox                SQL tự do trên DB game, không chấm              ← MỚI
│   └── Dữ liệu của tôi   nạp CSV vào schema `sandbox`, dùng đủ Run/EXPLAIN/Steps/Chart/ERD
├── Kỹ năng (Skill map)    ~20 kỹ năng, trạng thái: khóa/đã học/đang ôn/thuộc ← MỚI
└── Cài đặt                VI/EN, Xuất/Nhập tiến độ                         ← VI/EN MỚI
```

Ba chế độ dùng **chung một engine**: worker PGlite + `runSandboxed` + `grade()` + các tab trực quan của Plan 1b. Không thêm backend.

---

## 1. Mục tiêu học (learning targets) và skill map

### 1.1 Nguồn dữ liệu: 2 file nội dung mới

Hiện `requires/grants` là chuỗi tự do, `CHAPTER_TITLES` hard-code tiếng Việt trong `src/progress.ts`. Đề xuất đưa vào nội dung để có nhãn VI/EN và kiểm được bằng test:

`content/skills.yml` — danh mục kỹ năng chuẩn (id giữ nguyên các id đã dùng ở ch1–3):

| id | chương | VI | EN |
|---|---|---|---|
| `select` | 1 | Chọn cột | Select columns |
| `where` | 1 | Lọc dòng (AND/OR/IN/BETWEEN/LIKE) | Filter rows |
| `order_by` | 1 | Sắp xếp + phá hòa | Sort with tie-break |
| `limit` | 1 | Lấy top N | Top N |
| `aggregate` | 2 | COUNT/SUM/AVG/MIN/MAX | Aggregates |
| `group_by` | 2 | Nhóm theo chiều | Group by |
| `having` | 2 | Lọc nhóm | Filter groups |
| `join` | 3 | Nối 2 bảng | Inner join |
| `multi_join` | 3 | Nối nhiều bảng | Multi-table join |
| `left_join` | 3 | Giữ dòng không khớp | Left join |
| `anti_join` | 3 | Tìm cái “không có” | Anti-join |
| `date_time` | 4 | Ngày, interval, `date_trunc` | Dates & intervals |
| `case_when` | 4 | Phân loại bằng CASE | CASE classification |
| `null_handling` | 4 | NULL, `COALESCE`, NULL trong tổng hợp | NULL handling |
| `subquery` | 5 | Subquery trong WHERE/FROM | Subqueries |
| `cte` | 5 | CTE nhiều bước | CTEs |
| `range_join` | 5 | Join theo khoảng ngày (tỷ giá, hợp đồng) | Range join |
| `window_rank` | 6 | `ROW_NUMBER`/`RANK` top-N mỗi nhóm, khử trùng | Ranking windows |
| `window_lag` | 6 | `LAG`/`LEAD` so kỳ trước | LAG/LEAD |
| `window_frame` | 6 | Lũy kế `SUM() OVER` | Running totals |

Chương 7 không dạy kỹ năng mới (tổng hợp). Id chương 4–6 là đề xuất cho Plan 2/3; người viết ticket được đổi, nhưng phải đổi ở `skills.yml` trước.

`content/chapters.yml` — mục tiêu chương “sau chương này bạn có thể…”, mỗi mục tiêu gắn với kỹ năng để tự động tick:

```yaml
- chapter: 1
  title: { vi: Tuần thử việc, en: Probation week }
  outcomes:
    - { vi: "Lấy đúng cột cần từ một bảng", en: "Pull exactly the columns you need", skills: [select] }
    - { vi: "Lọc lô hàng theo nhiều điều kiện", en: "Filter shipments by several conditions", skills: [where] }
    - { vi: "Xếp hạng có tiêu chí phá hòa và lấy top N", en: "Rank with a tie-break and take the top N", skills: [order_by, limit] }
```

Mục tiêu đề xuất cho 7 chương (VI; EN dịch tương ứng):

| Ch. | Sau chương này bạn có thể… |
|---|---|
| 1 | lấy đúng cột; lọc theo nhiều điều kiện; xếp hạng có phá hòa, lấy top N |
| 2 | đếm/tổng/trung bình một tập lô; báo cáo theo hãng tàu/phương thức; lọc nhóm bằng HAVING và phân biệt với WHERE |
| 3 | ghép shipment với khách/hãng tàu; nối 3+ bảng; tìm khách không book bằng LEFT JOIN/anti-join |
| 4 | tính thời gian vận chuyển/on-time bằng interval; phân loại luồng xanh/vàng/đỏ bằng CASE; xử lý `ata` NULL đúng cách |
| 5 | tách câu hỏi thành bước bằng CTE; quy đổi phí nhiều loại tiền theo tỷ giá đúng ngày; tìm báo giá dưới giá mua |
| 6 | top 3 khách mỗi tháng; so tháng này với tháng trước bằng LAG; lũy kế doanh thu; khử khách trùng |
| 7 | điều tra một câu hỏi mở (margin Q3 giảm) qua nhiều truy vấn và chọn kết luận dữ liệu ủng hộ |

### 1.2 Luật kiểm (thêm vào `contentProblems` hoặc `tests/content.test.ts`)

1. Mọi id trong `requires`/`grants` của ticket có trong `skills.yml`.
2. Mọi kỹ năng trong `skills.yml` được `grants` bởi **đúng một** ticket, và ticket đó nằm ở chương ghi trong `skills.yml`.
3. Mọi `outcomes[].skills` của chương N được grants ở chương ≤ N.
4. Chương 1–6 có ≥ 2 outcome; chương 7 có ≥ 1 outcome với `skills: []` (tick khi xong boss ch7).

### 1.3 Người chơi thấy mục tiêu vs tiến độ (luật hiển thị, layout → UI/UX)

- **Đầu mỗi chương** (khi mở ticket teach): thẻ “Mục tiêu chương” liệt kê outcomes; outcome có ✓ khi mọi kỹ năng của nó đã học. Đóng boss → màn tổng kết chương lặp lại thẻ này, tất cả ✓, kèm số gợi ý đã dùng.
- **Thanh trên** luôn hiện: `Ch 2/7 · 7/35 ticket · 1.250 XP · Ôn: 3`. “Ôn: N” = số kỹ năng đến hạn (mục 3).
- **Skill map** (`<dialog>` mở từ thanh trên): lưới kỹ năng theo chương, 4 trạng thái — khóa (chưa grants) / đã học (box 1–2) / đang vững (box 3–4) / thuộc (box 5) — và nhãn “đến hạn ôn”. Bấm kỹ năng → vào Luyện tập kỹ năng đó.
- Ticket hiển thị chip “Dạy: HAVING · Cần: GROUP BY” từ `grants/requires` (nhãn lấy từ `skills.yml`).
- Mọi trạng thái này **tính lại từ save** (`completed` + `review`), không lưu riêng.

---

## 2. Save & tiến độ

### 2.1 Thay đổi `Save` (Plan 1 Task 6) → v2

Chưa có người chơi nào giữ save v1 (Plan 1 không phát hành riêng), nhưng BE đang viết Task 6 đúng như plan và fixture `tests/fixtures/save-v1.json` đã được định nghĩa là “không bao giờ sửa”. Đề xuất: **giữ nguyên Task 6 (v1), thêm v2 bằng một migration** — không đụng vào việc BE đang làm, và chuỗi migration được chạy thật ngay từ đầu (đúng skill save-systems).

```ts
export const SAVE_VERSION = 2;

export interface Save {
  version: number;
  completed: string[];
  xp: number;
  hintsUsed: Record<string, number>;
  drafts: Record<string, string>;            // "<ticketId>#<stepIndex>", như v1
  // --- v2 ---
  review: Record<string, { box: number; due: string }>; // key = skill id; box 1..5; due = 'YYYY-MM-DD' theo ngày THẬT của máy
  practice: { solved: number; failed: number };          // tổng để hiển thị, không ảnh hưởng mở khóa
  sandboxDraft: string;                                   // SQL đang gõ ở Sandbox, ≤ 20.000 ký tự
}

const MIGRATIONS: Record<number, Migration> = {
  1: (d) => ({ ...d, review: {}, practice: { solved: 0, failed: 0 }, sandboxDraft: '' }),
};
```

Đóng một ticket Học chính → với mỗi kỹ năng trong `grants` chưa có trong `review`, ghi `review[skill] = { box: 1, due: ngày mai }` (không ôn ngay trong ngày vừa học).

Không lưu: độ thuộc dạng %, chương hiện tại, outcome đã tick, danh sách kỹ năng đã học — tất cả suy ra từ `completed` + `review` + nội dung. Chỉ với save migrate từ v1: kỹ năng đã học (grants bởi ticket trong `completed`) mà chưa có trong `review` = coi như `{ box: 1, due: hôm nay }`. Nhờ vậy migration là hàm thuần, không cần biết ticket nào grants gì.

### 2.2 Tác động lên `parseSave` (→ BE)

- `pickRecord` hiện bỏ mọi key mà `ticketOf(k)` không phải ticket id → `review` (key = skill id) sẽ bị xóa sạch. Đổi chữ ký:
  `parseSave(raw: string, known: { ticketIds: Set<string>; skills: Set<string> }): Save` và `loadSave(storage, known)`.
- Validate v2: `review` chỉ giữ skill có trong `skills.yml`, `box` nguyên 1..5, `due` khớp `^\d{4}-\d{2}-\d{2}$`; `practice.*` nguyên ≥ 0; `sandboxDraft` là string, cắt ở 20.000 ký tự.
- Test: thêm `tests/fixtures/save-v2.json`; giữ `save-v1.json` nguyên và test v1 → v2 cho ra `review: {}`.
- Ghi save: sau khi đóng ticket, sau mỗi lượt Luyện tập, và debounce 1s khi gõ draft.

### 2.3 Ngôn ngữ **không** nằm trong save

Ngôn ngữ là tùy chọn của máy, không phải tiến độ: key riêng `cargo-query/prefs` = `{ "lang": "vi" | "en" }`, đọc **đồng bộ** từ `localStorage` trước khi render inbox (PGlite chưa cần sẵn sàng), bọc try/catch, giá trị lạ → mặc định. Xuất/Nhập tiến độ chỉ mang `Save`, không đổi ngôn ngữ của người nhập. Không cần version cho prefs (một trường enum, sai thì về mặc định).

---

## 3. Luyện tập (practice) — không backend, dùng grader sẵn có

### 3.1 Biến thể ticket (variants) — mở rộng định dạng, **tùy chọn**

Thêm khóa frontmatter `variants` (không bắt buộc → 15 ticket ch1–3 BE đang viết vẫn hợp lệ, `parseTicket` chỉ cần nhận thêm khóa). Khi có `variants`, đề, gợi ý và Solution là template `{{tên}}`; **`variants[0]` là bản dùng trong Học chính**.

```yaml
# content/tickets/ch1/ch1-03.md (ví dụ) — title: "Lô hàng nặng nhất tháng {{month}}"
variants:
  - { month: "10/2026", from: "2026-10-01", to: "2026-11-01" }
  - { month: "08/2026", from: "2026-08-01", to: "2026-09-01" }
  - { month: "05/2026", from: "2026-05-01", to: "2026-06-01" }
```
```sql
WHERE direction = 'EXPORT' AND mode = 'SEA'
  AND booking_date >= '{{from}}' AND booking_date < '{{to}}'
```

Chấm: `grade(run, render(solution, v), playerSql, ordered)` — **grader không đổi**.

Luật (thêm vào `parseTicket` + `tests/content.test.ts`):
1. Giá trị biến thể khớp `^[\w .:/-]{1,40}$` (chỉ nội dung tác giả viết, nhưng vẫn chặn dấu nháy) và là **mã/số/ngày trung tính ngôn ngữ** (`NLRTM`, `2026-08-01`, `10/2026`), hiện nguyên văn ở cả VI lẫn EN. Không dùng biến thể để đổi thứ gì mà văn xuôi đã nói cứng (ví dụ “xuất khẩu”); tiêu đề phải template hoặc trung tính.
2. Mọi `{{x}}` trong đề/gợi ý/Solution/bản EN có giá trị ở **mọi** biến thể; 2–4 biến thể/ticket.
3. Mỗi Solution đã render chạy được, trả kết quả **khác rỗng** (test sẵn có, mở rộng cho mọi biến thể) và tuân luật ngày cố định (không `CURRENT_DATE`/`now()`).
4. Kết quả các biến thể **khác nhau từng đôi** (nếu giống thì biến thể vô nghĩa, người chơi dán lại câu cũ).
5. Ticket `ordered`/top-N: câu phá hòa phải nằm trong phần đề không template, để mọi biến thể đều có.
6. Boss không có variants (nhiều bước + câu kết luận phụ thuộc câu chuyện).

Mục tiêu nội dung: mỗi kỹ năng trong `skills.yml` có ≥ 1 ticket (grants hoặc requires) mang variants → ~20 ticket × 2 biến thể thêm.

### 3.2 Ba lối vào Luyện tập

| Lối vào | Chọn bài thế nào | XP | Ảnh hưởng |
|---|---|---|---|
| **Ôn hôm nay** | kỹ năng có `due ≤ hôm nay`, tối đa 5 bài/lượt; mỗi kỹ năng → ticket đã xong (không boss) có kỹ năng đó trong `grants ∪ requires`, ưu tiên ticket có variants, chọn biến thể ≠ `variants[0]` ngẫu nhiên | 0 | cập nhật `review` |
| **Luyện kỹ năng X** (từ skill map) | như trên nhưng chỉ kỹ năng X, kể cả chưa đến hạn | 0 | cập nhật `review[X]` |
| **Làm lại ticket** (từ inbox, ticket đã xong) | đúng ticket đó, biến thể ngẫu nhiên nếu có; boss làm lại nguyên bản | 0 | cập nhật `review` cho mọi kỹ năng trong `grants` |

Practice **không cho XP** → XP chỉ phản ánh Học chính, không farm được. Draft luyện tập không lưu.

### 3.3 Lịch ôn Leitner (≈ 30 dòng, hàm thuần trong `src/practice.ts`, có test)

- Hộp 1..5, khoảng cách `[1, 2, 4, 8, 16]` ngày.
- Đúng **với ≤ 1 gợi ý** → `box = min(box + 1, 5)`, `due = hôm nay + interval[box]`.
- Sai khi nộp (bất kỳ lần nào trong bài) **hoặc** mở ≥ 2 gợi ý → `box = 1`, `due = ngày mai`.
- “Hôm nay” ở đây là ngày thật (`new Date()` theo giờ máy), **khác** “hôm nay trong game” 2026-10-31 — chỉ dùng cho lịch ôn, không bao giờ vào SQL.
- Hiển thị độ thuộc: box 1–2 “đã học”, 3–4 “đang vững”, 5 “thuộc”.

### 3.4 Sandbox

Một mục trong inbox: editor + toàn bộ panel dưới (Kết quả, Biểu đồ, Thứ tự thực thi, EXPLAIN, Luồng dữ liệu, ERD), **không có nút Nộp**. Vẫn chạy qua `runSandboxed` (BEGIN…ROLLBACK, timeout 5s) nên không phá được dữ liệu. Sidebar schema chỉ liệt kê bảng đã mở khóa (DB vẫn đủ 26 bảng — giữ luật spec §4). Draft lưu ở `save.sandboxDraft`.

---

## 4. Nạp dữ liệu ngoài (“Dữ liệu của tôi”)

### 4.1 Phạm vi

- **MVP: chỉ CSV** (UTF-8, phân cách `,` hoặc `;`, có dòng tiêu đề).
- **SQL dump: hoãn.** Chạy dump = nhiều câu lệnh ngoài `BEGIN…ROLLBACK`, có thể `DROP SCHEMA public` hoặc ghi đè bảng game → DB game hỏng tới khi tải lại. Chỉ mở lại khi spike xác nhận được PGlite chạy `SET ROLE` sang role chỉ có quyền trên schema `sandbox`; và khi đó chỉ nhận `CREATE TABLE`/`INSERT`/`COPY`, lọc bằng `libpg-query` (đã có từ Plan 1b) trước khi chạy.

### 4.2 Giới hạn

| Mục | Giới hạn | Lý do |
|---|---|---|
| Kích thước file | ≤ 10 MB | PGlite in-memory cùng worker với DB game; DevOps xác nhận lại bộ nhớ |
| Số dòng | ≤ 100.000 / file | giữ query trong ngưỡng 5s |
| Số cột | ≤ 50 | |
| Số bảng nạp cùng lúc | ≤ 5 | |
| Tên bảng/cột | sanitize: lowercase, ký tự ngoài `[a-z0-9_]` → `_`, bắt đầu bằng số → tiền tố `c_`, cắt 63 ký tự, trùng → hậu tố `_2`; tên bảng trùng bảng game (`shipments`…) → hậu tố `_my` | an toàn cho SQL, cho Mermaid ERD, không che bảng game |

Vượt giới hạn → từ chối cả file, báo rõ giới hạn nào (không cắt ngầm).

### 4.3 Nơi chứa và luồng nạp (→ BE)

- Cùng worker PGlite, schema riêng **`sandbox`** (tạo lúc init, rỗng). Worker đặt `search_path = public, sandbox` một lần khi init → người chơi gõ `SELECT * FROM my_orders`, và bảng game luôn thắng khi trùng tên (đã chặn ở 4.2).
- Message mới cho worker: `{ id, kind: 'import', name, columns, file: Blob }`. Chạy **ngoài** `runSandboxed` (vì `runSandboxed` luôn ROLLBACK):
  1. `CREATE TABLE sandbox.<name>_raw (<cột> text, …)` — tên cột từ dòng tiêu đề (đọc ở main thread, chỉ dòng đầu).
  2. `COPY sandbox.<name>_raw FROM '/dev/blob' WITH (FORMAT csv, HEADER true, DELIMITER ...)` với `{ blob: file }` — dùng parser CSV của Postgres, **không** thêm thư viện CSV, **không** ghép giá trị vào SQL.
  3. Suy kiểu từng cột bằng SQL trên bảng raw: `bigint` / `numeric` / `date` / `timestamp` / `boolean` / `text` (cột mà mọi giá trị khác rỗng cast được). `CREATE TABLE sandbox.<name> AS SELECT NULLIF(c,'')::<kiểu> …`, `DROP` bảng raw.
  4. Mọi định danh đi qua `format('%I')` / quote phía worker.
- Câu hỏi người chơi trên dữ liệu nạp vẫn qua `runSandboxed` → chỉ đọc được, không sửa được.
- **Timeout 5s → `DbClient.restart()` → reseed** sẽ mất schema `sandbox`. `DbClient` giữ danh sách `{ name, file: Blob }` đã nạp trong bộ nhớ và **nạp lại tự động** sau `ready`.
- `kind: 'import'` có **timeout riêng 30s** (không dùng 5s của query; con số chốt sau spike 4.6.1 → DevOps). Nạp lại sau restart mà lỗi/quá hạn → bỏ bảng đó khỏi danh sách và báo người dùng, **không** restart thêm lần nữa (tránh vòng lặp terminate → nạp lại → terminate).
- **Không lưu bền trong MVP**: tải lại trang = mất dữ liệu nạp, giao diện nói rõ điều này khi nạp. Bản sau: lưu Blob vào IndexedDB (không dùng chế độ lưu IndexedDB của chính PGlite, vì DB game phải luôn seed tất định).

### 4.4 Tính năng trên dữ liệu nạp

| Tính năng | Trên `sandbox` | Việc cần làm |
|---|---|---|
| Run, Kết quả, Biểu đồ | chạy ngay | — |
| EXPLAIN, Luồng dữ liệu | chạy ngay | — |
| Thứ tự thực thi | cần spike | `runSteps` cắt query bằng deparser — kiểm với bảng ở schema thứ hai qua `search_path` |
| ERD | cần sửa | `ER_COLUMNS_SQL`/`ER_CONSTRAINTS_SQL` đang `table_schema = 'public'` (Plan 1b dòng 1284, 1293) → tham số schema; CSV không có PK/FK nên ERD chỉ có hộp bảng. Ngoại lệ `innerHTML` của Mermaid vẫn đúng vì tên đã sanitize về `[a-z0-9_]` |
| Bản đồ tuyến, chấm điểm | không áp dụng | — |

### 4.5 An toàn

- File là của chính người dùng, chạy trong tab của họ; không có gì gửi ra mạng.
- Nội dung CSV **chỉ là dữ liệu**: không bao giờ chạy như SQL, không ghép vào chuỗi SQL, không render bằng `innerHTML` (luật `textContent` của Plan 1 áp dụng cho kết quả).
- Không tác tử/LLM nào đọc nội dung file như chỉ dẫn (nếu sau này có trợ lý gợi ý).

### 4.6 Cần spike trước khi viết plan (chưa nằm trong danh sách đã xác minh)

1. `COPY … FROM '/dev/blob'` với `{ blob }` trong PGlite 0.5.16 chạy trong worker; thời gian nạp CSV 10 MB/100k dòng.
2. `SET search_path` ở cấp phiên có giữ qua các lần `BEGIN…ROLLBACK` không.
3. `runSteps` (libpg-query + deparser) với bảng ở schema `sandbox`.
4. Bộ nhớ worker sau khi nạp 5 × 10 MB (→ DevOps đặt lại giới hạn nếu cần).
5. (Chỉ cho SQL dump, bản sau) `CREATE ROLE` + `SET ROLE` trong PGlite.

---

## 5. VI/EN — luật cấp sản phẩm

### 5.1 Mặc định và chuyển

- Lần đầu: `navigator.language` bắt đầu bằng `vi` → `vi`, ngược lại → `en`. Lưu ở `cargo-query/prefs`.
- Nút chuyển `VI | EN` ở thanh trên; đổi ngôn ngữ **chỉ render lại chữ** — không đụng editor, kết quả đang hiện, DB hay save.

### 5.2 Dịch gì / không dịch gì

| Dịch | Không dịch |
|---|---|
| Chuỗi UI, thông báo lỗi do game viết (“Query quá lâu”, phản hồi grader thiếu/thừa N dòng) | Tên bảng, cột, SQL trong Solution/gợi ý |
| Tiêu đề chương, outcomes (`chapters.yml`), nhãn kỹ năng (`skills.yml`) | Dữ liệu seed (tên khách, cảng, giá trị enum `EXPORT`/`SEA`…) |
| Ticket: `title`, đề, gợi ý, tiêu đề/đề từng step boss, `conclusion.question` + `options` | Thông báo lỗi gốc của Postgres (vốn tiếng Anh) |
| Chú thích node EXPLAIN, nhãn giai đoạn tab Thứ tự thực thi, nhãn tab | Tên người gửi ticket; tên phòng ban giữ dạng đã dùng (Ops, Sales…) |
| Thuật ngữ nghiệp vụ trong glossary | Giá trị trong bảng kết quả (hiện đúng như Postgres trả, không format theo locale) |

Số trên thanh trên/biểu đồ: `Intl.NumberFormat(lang)`. Bảng kết quả: thô, để người học thấy đúng giá trị SQL.

### 5.3 Nơi chứa bản dịch

- UI: `src/i18n.ts` — `const vi = {...}`, `const en = {...} satisfies Record<keyof typeof vi, string>` → thiếu khóa EN là lỗi `tsc`. Không thêm thư viện i18n. (→ FE)
- Ticket EN: **`content/en/tickets/chN/<id>.md`** — ngoài thư mục `content/tickets/` nên glob `../content/tickets/**/*.md` của `content.ts` không nạp nhầm làm ticket. File EN chỉ có `title` trong frontmatter + đề + `## Hints` + `## Step N: …` (tiêu đề + đề) + `conclusion.question/options`; **không có Solution** — SQL chỉ một nguồn ở file VI.
- Luật test: file EN có cùng số gợi ý, số step, số `options`; `answer` dùng chung chỉ số nên thứ tự options phải khớp; cùng tập `{{biến}}` nếu ticket có variants.
- Thiếu file EN → hiện bản VI kèm nhãn “VI”; test in danh sách thiếu. **Cổng phát hành: 0 ticket thiếu EN.**
- Glossary: `content/glossary.yml` (~30 mục: TEU, HBL/MBL, Incoterms FOB/CIF/EXW, D&D, free time, CFS, luồng xanh/vàng/đỏ, HS code…), mỗi mục `{ term, vi, en }`; hiển thị là danh sách trong `<dialog>` (MVP), chưa tự gắn link trong đề.

### 5.4 Chi phí dịch (phải tính vào kế hoạch)

Đo trên 15 ticket ch1–3 trong Plan 1: ~1.900 từ (đề + gợi ý + frontmatter, bỏ SQL) ≈ 125 từ/ticket → 35 ticket ≈ **4.500–5.000 từ**, ch6–7 dài hơn nên dự phòng ~6.000; cộng ~150 chuỗi UI, 20 kỹ năng, 7 chương, 30 thuật ngữ. Dịch song song khi viết ticket (mỗi task nội dung của Plan 2/3 tạo cả file VI + EN), đừng dồn cuối. Plan 1 ch1–3 (15 ticket) cần một task dịch bù.

---

## 6. Cắt MVP (bản phát hành đầu = Plan 1 + 1b + 2 + 3, đủ 7 chương)

### Bắt buộc trong bản đầu

| # | Hạng mục | Lý do bắt buộc | Effort |
|---|---|---|---|
| 1 | `skills.yml` + `chapters.yml` + luật test 1.2 | rẻ, phải có **trước** khi viết ticket ch4–7 | S |
| 2 | Hiển thị mục tiêu chương, thanh tiến độ, skill map | user yêu cầu “có target, có quá trình” | M |
| 3 | Save v2 (`review`, `practice`, `sandboxDraft`) + `parseSave(known)` | chốt hình dạng save một lần trước khi phát hành, tránh v3 sớm | S |
| 4 | Định dạng `variants` + Luyện tập (Ôn hôm nay / Luyện kỹ năng / Làm lại) + Leitner | user yêu cầu “có luyện tập”; tận dụng grader | M |
| 5 | Sandbox (SQL tự do, không chấm) | gần như miễn phí, là nền cho mục 6 | S |
| 6 | Nạp CSV vào `sandbox` (không lưu bền, nạp lại sau restart) | user yêu cầu “import data ngoài test tính năng” | M |
| 7 | VI/EN: UI + toàn bộ ticket + chương/kỹ năng/glossary | user yêu cầu; cổng phát hành 0 thiếu EN | M (~6k từ dịch + i18n UI) |

### Để sau

- Nạp SQL dump (sau spike role, mục 4.1).
- Lưu dữ liệu nạp vào IndexedDB; ERD với FK do người dùng tự khai.
- Gắn link glossary tự động trong đề; tooltip thuật ngữ.
- Biến thể cho boss; lịch sử luyện tập dạng biểu đồ; chứng nhận hoàn thành.
- Đồng bộ tiến độ qua mạng / leaderboard (cần backend Python — spec §10).

### Thứ tự làm đề xuất

1. **Ngay sau Plan 1 Task 4–7** (BE đang làm): một plan nhỏ **Plan 1c “Product layer”**: `skills.yml`/`chapters.yml` + test, `src/i18n.ts`, prefs, save v2, `variants` trong `parseTicket`, `src/practice.ts` (Leitner), Sandbox. Làm trước Plan 2 để ticket ch4–7 viết đúng định dạng mới ngay từ đầu (VI + EN + variants).
2. Nạp CSV sau Plan 1b (cần tab trực quan + sửa ERD theo schema) và sau 4 spike ở 4.6.
3. Dịch EN ch1–3 thành một task trong Plan 1c; ch4–7 dịch trong từng task nội dung của Plan 2/3.

---

## 7. Thay đổi cần đưa vào spec / plan

| Tài liệu | Mục | Thay đổi |
|---|---|---|
| Spec | §1 | thêm 3 chế độ: Học chính / Luyện tập / Sandbox (+ Dữ liệu của tôi) |
| Spec | §3 Định dạng ticket | thêm khóa tùy chọn `variants`; file EN ở `content/en/tickets/` |
| Spec | §5 | thêm `content/skills.yml`, `content/chapters.yml` (outcomes) |
| Spec | §6b | thêm skill map, thẻ mục tiêu chương, nút VI/EN, mục Luyện tập/Sandbox trong inbox; bảng tính năng trên dữ liệu nạp |
| Spec | §7 | lỗi nạp CSV (quá giới hạn, cột không đọc được); restart → nạp lại sandbox |
| Spec | §8 | Save v2 + migration 1→2; prefs tách khỏi save |
| Spec | §9 | test: skills/outcomes, mọi biến thể, khớp file EN, Leitner, migration v1→v2 |
| Spec | §10 | **bỏ** “đa ngôn ngữ” khỏi ngoài phạm vi (user đã yêu cầu); thêm “SQL dump, lưu bền dữ liệu nạp” vào ngoài phạm vi bản đầu |
| Plan 1 | Global Constraints | “Nội dung hiển thị tiếng Việt” → “Nội dung VI + EN; tên bảng/cột tiếng Anh” |
| Plan 1 | Task 5 `progress.ts` | `CHAPTER_TITLES` chuyển sang `content/chapters.yml` |
| Plan 1 | Task 6 `save.ts` | giữ v1 như plan; Plan 1c thêm v2 (mục 2) |
| Plan 1b | Task 1 worker | thêm `kind: 'import'`; init tạo schema `sandbox` + `search_path` |
| Plan 1b | Task 6 ERD | tham số hóa `table_schema` |
| Mới | Plan 1c | Product layer (mục 6, bước 1) |

## 8. Cần user quyết

1. **Ngôn ngữ mặc định** theo `navigator.language` (đề xuất) hay luôn VI.
2. **Cổng phát hành EN 100%** (đề xuất) hay cho phép phát hành với ticket fallback VI.
3. **Dữ liệu nạp không lưu bền** trong bản đầu (đề xuất) hay cần IndexedDB ngay.
4. **Luyện tập 0 XP** (đề xuất, chống farm) hay có XP nhỏ.
5. **SQL dump hoãn** (đề xuất) — nếu bắt buộc thì cần spike role trước.
