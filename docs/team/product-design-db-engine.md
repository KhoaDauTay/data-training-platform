# Product design: khu "Database Engine" và lộ trình NoSQL (BoonData)

Người viết: Product Design + UI/UX · 2026-11-20 · **Chỉ là thiết kế**, chưa có code, chưa sửa `src/`, `content/`, test hay `decision-log.md`.

Yêu cầu của user (nguyên văn): *"Bây giờ SQL khá ok rồi. Bây giờ học thêm một chút về Database. Tôi muốn build phần riêng liên quan đến PostgreSQL. Tất cả mọi thứ, B-tree, heap, index, GEO, ... Phần này khá dài nên nó được ngang với lộ trình, ... Đặt tên Database Engine. Trong đó có nhiều Loại, SQL server, Postgres, DynamoDB, MongoDB, MySQL, MariaDB, ... Trước mắt đánh vào Postgres và MySQL, DynamoDB, MongoDB. Vì chúng ta có thêm NoSQL nên Agent Product Design vạch hướng để có lộ trình học NoSQL giống như những gì chúng ta đã làm với SQL. (Gần như tương đương)."*

Đọc trước: `CLAUDE.md` (General area, domains, Lily, budgets), `roadmap-v22.md` (§1.1 ngân sách, §5 dải L), `product-roadmap-v15.md`, `decision-log.md` tới L188, `content/skills.yml`, `content/general/{sql,adv,interview}.yml`, `src/save.ts` (`isWorkId`, `readV2`), `src/home.ts` (`skillOfDrill`, `knownSkills`), `src/session.ts` (`schemaOf`), `src/db/run.ts`.

**Chưa có lúc viết:** `docs/team/db-engine-knowledge.md` (đề cương + extension PGlite) và `docs/team/spike-nosql-browser.md` (MongoDB/DynamoDB/MySQL chạy trong trình duyệt được không). Hai agent khác đang viết. Vì vậy §4 viết thành **bảng quyết định theo kết quả spike**, không chốt một runtime. Khi hai tài liệu có, người điều phối thay các ô "chờ spike" bằng số đo và gạch phương án bị loại. Những gì tài liệu này **tự kiểm** được ghi "đo" (ví dụ danh sách extension trong `node_modules`).

**Mọi KB, cỡ việc và độ trung thực là ước lượng**, trừ số ghi "đo". Cỡ: S ≤ 1 ngày, M 2–4 ngày, L 1–2 tuần, XL > 2 tuần (ngày làm của agent, gồm test và review).

---

## 0. Tóm tắt một trang

| Chủ đề | Đề xuất |
|---|---|
| Tên, vị trí | Khu **Database Engine** (`#/engine`), ngang hàng **Lộ trình** (`#/learn`): mục top bar riêng; trên điện thoại gộp với Lộ trình vào một mục "Học" có công tắc SQL / Engine (§1.2) |
| Engine đợt 1 | **PostgreSQL** (sâu nhất, chạy thật trên PGlite), **MongoDB** (lộ trình truy vấn đầy đủ + bên trong), **DynamoDB** (thiết kế theo mẫu truy cập + bên trong), **MySQL/InnoDB** (bên trong, so sánh với Postgres). SQL Server, MariaDB, Redis…: thẻ "sau" không bấm được, **không** có trang rỗng (luật không ngõ cụt) |
| Mỗi engine | Mô-đun → bài. Năm loại bài: **Khái niệm** (chữ + sơ đồ động bấm từng bước), **Lab** (chạy thật trong editor), **Đoán kế hoạch** (chọn kế hoạch/chi phí trước khi xem), **Câu hỏi** (máy chấm), **Capstone** (một case nhiều bước, như đánh giá thăng tiến) |
| NoSQL "gần như tương đương" SQL | **MongoDB**: 11 Phần soi gương 11 Phần SQL + Phần 12 mô hình tài liệu; 4 drill mỗi kỹ năng (`faded/open/trap/review`, như L168), bài học nhanh, ôn Leitner, kiểm tra đầu vào, 2 bộ đề phỏng vấn. **DynamoDB**: không có GROUP BY/JOIN/window, nên **không** soi gương; lộ trình riêng 8 Phần theo mẫu truy cập, có bảng "không có tương đương" trung thực (§3.4) |
| Runtime (chờ spike) | Postgres: PGlite thật + extension đã có trong gói (**đo**: `pageinspect`, `pg_visibility`, `pg_walinspect`, `pg_buffercache`, `pg_freespacemap`, `bloom`, `btree_gin`, `btree_gist`, `pg_trgm`, `cube`, `earthdistance`, `ltree`, `pg_overexplain`…; **không** có pgvector, PostGIS). MongoDB: **mingo** (thư viện JS chạy ngôn ngữ truy vấn/pipeline) trong worker riêng, cú pháp shell **phân tích như dữ liệu, không `eval`**. DynamoDB: **mô phỏng TS tự viết** (Query/Scan/GSI/biểu thức/RCU). MySQL: không chạy được trung thực → sơ đồ + kết quả `EXPLAIN` ghi sẵn từ MySQL thật, ghi rõ phiên bản |
| Save | **Không bump.** Id mới `e-<engine>-<loại>-…` (không phải `g-`, vì `schemaOf` đưa mọi `g-` lên `lab`); thẻ ôn `mg.<kỹ năng>`/`dy.<kỹ năng>`; cả hai được nhận theo mẫu như `ECOM_ID` |
| Lily | Không đổi giai đoạn (giai đoạn = kỹ năng SQL, L87/L132). Engine cộng XP, có mục riêng ở `#/me` và album Lily (§1.5, quyết định D-E5) |
| Thứ tự | v23 nền + spike + Postgres I · v24 Postgres II + Mongo Phần 1–6 · v25 Mongo 7–12 + DynamoDB · v26 MySQL + capstone + phỏng vấn NoSQL (§6) |
| Dải L | **L215–L239** (v21 giữ L189–L199, v22 giữ L200–L214, `roadmap-v22.md` §5) |

---

## 1. Kiến trúc thông tin

### 1.1 Vị trí trong app

Hiện có ba lớp:

- **Trang chủ** `#/`.
- **Lộ trình** `#/learn` (SQL chung, General) và **Luyện** `#/practice`.
- **Domain** `#/d/<d>/…` (cốt truyện).

Database Engine là lớp **thứ tư**, ngang Lộ trình, theo luật L82:

- General **không** nói kỹ năng dùng ở domain nào. Engine cũng vậy: không nhắc cảng, khách vay hay Chợ Lồng Đèn.
- Chiều liên kết đi **một hướng**, từ nơi dùng tới nơi dạy:
  - Domain → Engine: ví dụ việc chương 11 Logistics (index lab) có chip "Đào sâu: B-tree trong Postgres".
  - Lộ trình → Engine: ví dụ nút nâng cao A10 "Hiệu năng sâu hơn" và kỹ năng `explain_read`/`index_design`.
  - Engine **không** link ngược về domain.
- Engine không cần đi hết SQL mới vào được. Mỗi engine ghi "Nên biết trước" (ví dụ Postgres II cần `explain_read`) dạng chip tới trang kỹ năng SQL. **Không khóa** (General không khóa gì, L121).

### 1.2 Route

Route thuần trong `src/route.ts`, theo mẫu `learnModuleOf`/`learnSkillOf`/`learnAdvOf`. Thêm `'engine'` vào `ROUTES`.

| Hash | Trang | Ghi chú |
|---|---|---|
| `#/engine` | Tổng quan Engine: thẻ 4 engine đợt 1 + hàng "sắp có" (không bấm), dòng "Tiếp tục", thẻ ôn NoSQL tới hạn | section trong `<main id="home">` |
| `#/engine/<e>` | Trang một engine (`pg`, `my`, `mg`, `dy`): danh sách mô-đun, tiến độ, capstone | |
| `#/engine/<e>/<m>` | Một mô-đun: các bài theo thứ tự, mỗi bài một dòng có loại (Khái niệm/Lab/Đoán/Câu hỏi) | `<m>` = id mô-đun, ví dụ `btree` |
| `#/engine/<e>/<m>/<bài>` | Bài khái niệm hoặc câu hỏi: trang đọc, sơ đồ bước | trang đọc |
| `#/engine/mg/path`, `#/engine/mg/path/<n>`, `#/engine/mg/skill/<id>` | Lộ trình truy vấn MongoDB, soi gương `#/learn/sql/<n>` | khuyến nghị D-E2 |
| `#/engine/dy/path`, `…/path/<n>` | Lộ trình DynamoDB | |
| Workspace | Lab, drill, capstone chạy ở `#/play` như drill General (session mode mới `{ kind: 'engine' }`, `keepsWork()`) | hash workspace mang id bài, giống `generalNav` (L147) |

`canonicalHash` không cần alias, vì route này mới.

Hash lạ rơi về `#/engine` (luật không ngõ cụt). `tests/noDeadEnds.test.ts` mở rộng: mọi route Engine parse được, mọi mô-đun có ≥ 1 bài, không chữ "sắp có" trên đường đã mở.

### 1.3 Điều hướng

- **Desktop (top bar `#nav`):** `registerNav` thêm mục `engine` (area `'top'`), ngay sau "Lộ trình", icon mới `database` trong `NAV_ICON` (Phosphor `Database`, duotone; test icon duy nhất). Nhãn "Database Engine" / "Database Engine" (giữ tiếng Anh ở cả hai, như tên riêng; thêm vào `SAME_OK`).
- **Sidebar trái:** không có. Engine là trang đọc như `#/learn`, không phải domain. Trang engine/mô-đun dùng mục lục **trong trang**: ô `<select>` trên màn hẹp, danh sách bên trái nội dung ở ≥ 1280. Không dùng `#side` (sidebar là của domain).
- **Điện thoại 375:** thanh dưới **đã rớt dòng ở 5 mục** (roadmap-v22 §1.4; `v21-ux-review.md` U3: 5 mục trong `grid-cols-4`, cao 113 px). Bản sửa U3 (`grid-cols-5`) vừa khít 5 mục ở 320; mục thứ sáu không còn chỗ. Đề xuất (D-E1):
  - gộp "Lộ trình" + "Engine" thành **một mục "Học"** (`#/learn`);
  - đầu trang `#/learn` và `#/engine` có công tắc hai nút **SQL | Database Engine** (`role=tablist`, mỗi nút là link tới route kia);
  - desktop vẫn hai mục riêng.

```
Desktop 1280                                     Điện thoại 375
┌──────────────────────────────────────────────┐  ┌───────────────────────┐
│ ◉BoonData  Trang chủ  Lộ trình  [Database    │  │ [ SQL | DB Engine ]   │ ← công tắc
│            Engine]  Luyện  Logistics ▾  ⋯   │  │ Database Engine       │
├──────────────────────────────────────────────┤  │ ┌─────────────────┐   │
│ Database Engine                              │  │ │ PostgreSQL  4/9 │   │
│ Nhìn vào bên trong cơ sở dữ liệu…            │  │ └─────────────────┘   │
│ ┌──────────┐┌──────────┐┌──────────┐┌──────┐ │  │ ┌─────────────────┐   │
│ │PostgreSQL││ MongoDB  ││ DynamoDB ││MySQL │ │  │ │ MongoDB     0/12│   │
│ │ 9 mô-đun ││12 Phần + ││ 8 Phần + ││6 mô- │ │  │ └─────────────────┘   │
│ │ ▓▓▓░░ 4/9││ 4 mô-đun ││ 3 mô-đun ││ đun  │ │  │ …                     │
│ └──────────┘└──────────┘└──────────┘└──────┘ │  ├───────────────────────┤
│ Sắp có: SQL Server · MariaDB · Redis          │  │ ⌂  Học  Luyện  ◧  ☺  │ ← 5 mục
└──────────────────────────────────────────────┘  └───────────────────────┘
```

### 1.4 Id, Save, ôn tập

Hai bẫy đọc được trong code:

- `schemaOf` (`src/session.ts`) đưa **mọi** id `g-…` lên schema `lab`.
- `skillOfDrill` (`src/home.ts`) đọc kỹ năng từ id `g-<kỹ năng>-<n>`, nên id `g-` mới có thể lặng lẽ đẩy giai đoạn Lily và hàng ôn.

Vì vậy Engine **không** dùng tiền tố `g-`.

| Thứ | Mẫu | Ví dụ | Đi đâu |
|---|---|---|---|
| Bài, drill, capstone | `ENGINE_ID = /^e-(pg|my|mg|dy)-(c|l|p|q|d|x)-[a-z0-9-]+$/` | `e-pg-l-btree-2`, `e-mg-d-group-3`, `e-dy-x-shop-2` | `save.completed`, `drafts`, `graded`, `bossStep` (capstone) |
| Câu phỏng vấn NoSQL | `e-mg-iv-…`, `e-dy-iv-…`: **cố ý không khớp** `ENGINE_ID`, nên không vào `completed`. Giống `INTERVIEW_ID` (L144): phòng phỏng vấn không lưu tiến độ | `e-mg-iv-j1-3` | không lưu |
| Loại trong id | `c` khái niệm (đọc xong không lưu), `l` lab, `p` đoán kế hoạch, `q` câu hỏi, `d` drill lộ trình, `x` capstone | | XP tính **từ id**, không cần chunk |
| Thẻ ôn | `ENGINE_SKILL = /^(mg|dy|pg)\.[a-z_]+$/` | `mg.lookup`, `dy.gsi`, `pg.mvcc` | `save.review` |

Sửa Save, **không bump `SAVE_VERSION`** (cùng kiểu `ECOM_ID`, `FIN_ID`):

- `isWorkId` nhận thêm `ENGINE_ID.test(id)`.
- `readV2` giữ thẻ ôn khi `known.skills.has(skill) || ENGINE_SKILL.test(skill)`. Hiện nay khóa lạ **bị bỏ khi đọc**, nên đây là chỗ bắt buộc phải sửa.
- Fixture mới `save-v5-engine.json` (v5 + id/thẻ Engine) và test đọc → ghi → đọc giữ nguyên.
- Rủi ro chấp nhận: một bản build cũ đọc save mới sẽ bỏ id/thẻ Engine. Bản cũ không còn phục vụ (một site), nên chấp nhận được; ghi vào dòng L.

**XP** (`engineXp(id, firstPass)`, thuần, cùng chỗ `drillXp`):

| Loại | XP lần đầu đạt |
|---|---|
| `q` câu hỏi, `p` đoán kế hoạch | +5 |
| `l` lab, `d` drill lộ trình | +10 (như drill General) |
| `x` capstone (mỗi bước) | +20 (như challenge) |
| Lần sau, ôn | 0 |

**Ôn Leitner:**

- Chỉ kỹ năng **lộ trình NoSQL** (`mg.*`, `dy.*`) và một số khái niệm Postgres đáng nhớ (`pg.mvcc`, `pg.hot`, `pg.index_choice`, ~10 thẻ) có thẻ ôn.
- Postgres không có drill. Thẻ `pg.*` khi tới hạn phát lại **một bài `q` hoặc `p`** của khái niệm đó (mỗi thẻ khai ≥ 2 bài, lần lượt). Đạt thì thẻ lên hộp.
- **Thẻ chỉ bắt đầu được ghi từ E5 (v25)**, khi hàng ôn trộn có. Ở v24 (E4), drill Mongo đạt chỉ vào `completed`. E5 gieo thẻ cho kỹ năng đã "học" theo luật D8a-11 (≥ 2 drill đạt), như v1 → v2 đã làm với `review`.
- Thẻ dùng cùng hộp `[1, 2, 4, 8, 16]` và `localDay`.
- `reviewCount()` hiện là `min(kỹ năng tới hạn, QUEUE_MAX)` trên SQL. Đề xuất (D-E4): nút "Ôn: N" trên top bar **tính chung** SQL + Engine. Hàng ôn trộn lần lượt SQL → Mongo → Dynamo → Postgres, mỗi kỹ năng một drill (open → trap → review → faded).
- Đếm được thẻ tới hạn mà không cần chunk, vì khóa nhận theo mẫu.

### 1.5 Tiến độ, Lily, `#/me`

- **"Đã học"** một kỹ năng Engine dùng cùng luật D8a-11: ≥ 2 drill của kỹ năng đạt, hoặc có thẻ ôn. Có thể tính từ id (`e-mg-d-<kỹ năng>-<n>`) bằng `engineSkillOf(id)`, cùng kiểu `skillOfDrill`.
- **Mô-đun xong:** mọi bài `l/p/q` của mô-đun có trong `completed`. Bài khái niệm `c` không tính, vì đọc không chấm được. Xong thì có `doneBadge()` + `playUnlock` một lần như L121.
- **Lily** (D-E5, khuyến nghị):
  - giai đoạn **không đổi**. `STAGE_AT` đo kỹ năng SQL; trộn kỹ năng Engine vào thì người đã xong SQL nhảy giai đoạn vô nghĩa, và trang Lily mất nghĩa "học SQL tới đâu";
  - thay vào đó, album Lily (L134) có thêm **dòng kỷ niệm** "Lần đầu nhìn vào một trang heap", "Xong lộ trình MongoDB Phần 6". Khoảnh khắc reo khi xong mô-đun dùng `react()` có sẵn, chỉ ở trang Engine;
  - không thêm phụ kiện mới (ngân sách `html` 10/12).
- **`#/me`:** khối "Database Engine" (mỗi engine: mô-đun xong / tổng, kỹ năng NoSQL đã học, thẻ ôn) ở **chunk lười của Engine**, gắn vào `#/me` qua hook. Lý do: `me` đang 11/12. Hook kiểu `registerHomeSection` với `pages: ['me']` tốn ~0,2 KB trong `me`.
- **Trang chủ:** chỉ dòng "Tiếp tục" chung (`resumeLine`) có thể trỏ vào bài Engine cuối. Không thêm thẻ (V22-C đang gọn Trang chủ về một thẻ "Buổi học hôm nay"; mục ôn Engine nằm **trong** thẻ đó).

### 1.6 Chunk lười và ngân sách

Engine **không được làm tăng main quá +1,5 KB** (main 325/500 ở trần mềm v19–v22). Lượng này gồm route, nav item, mẫu id, `engineXp`, hook. Mọi chữ VI/EN nằm trong chunk của Engine, theo mẫu `src/i18n/learn.ts` (`lt()`), **không** vào `vi.ts`/`en.ts` (`en` 18/20).

Mọi nội dung YAML đi qua bộ chuyển JSON lúc build của V22-E. Engine **chờ V22-E** (§6).

| Nhóm ngân sách (mới) | Nội dung | Trần đề xuất (gz) |
|---|---|---|
| `engineui` | Trang tổng quan, trang engine/mô-đun, trình xem bài, bộ chấm câu hỏi, chữ khung (`et()`) | 20 |
| `enginemotion` | Sơ đồ động internals (§5), một chunk chung | 25 |
| `pgengine` / `pgengine2` | Nội dung Postgres I (mô-đun 1–5) / II (6–9) | 40 / 40 |
| `pgext` | Tarball extension PGlite tải trong worker khi bài cần (tài sản, **đo** dạng `.tar.gz`: pageinspect 16,1 KB, pg_walinspect 4,7, pg_visibility 4,5, pg_buffercache 4,6, pg_trgm 15,7, btree_gist 22,2, cube 15,4, earthdistance 2,4) | 100 (tổng các tarball dùng) |
| `pgengineseed` | Seed schema `engine` (Postgres lab) | 12 |
| `mongo` / `mongolate` | Lộ trình MongoDB Phần 1–6 / 7–12 + bài học nhanh + drill | 45 / 45 |
| `mongort` | Runtime Mongo: mingo (chỉ toán tử dùng) + bộ phân tích cú pháp shell + so sánh tài liệu | **chờ spike**, trần tạm 45 |
| `mongodata` | Bộ tài liệu mẫu (sinh từ `lab`, §3.2) | 80 |
| `dynamo` | Nội dung lộ trình DynamoDB + bài | 35 |
| `dynamort` | Bộ mô phỏng DynamoDB (TS tự viết) | 15 |
| `mysql` | Nội dung MySQL/InnoDB + `EXPLAIN` ghi sẵn | 30 |
| `codemirror-js` | Ngôn ngữ JavaScript cho editor Mongo (`@codemirror/lang-javascript`, ghim chính xác) | **chờ đo**, trần tạm 25 |

Mỗi luồng thêm dòng nhóm vào `scripts/check-budget.mjs` **trong commit gộp của nó** (luật roadmap-v22 §3).

---

## 2. Các track engine

### 2.1 Năm loại bài: người học thấy và làm gì

| Loại | Thấy | Làm | Chấm |
|---|---|---|---|
| **Khái niệm** (`c`) | Đoạn chữ ngắn (≤ 150 từ/bước) + **sơ đồ bước** (§5) với nút ‹ Trước / Tiếp › và thanh bước "3/7" | Bấm từng bước. Mỗi bước tối đa 3 s chuyển động, khung cuối là trạng thái gốc | Không chấm; đọc xong không lưu (như bài học nhanh: pref thiết bị `cargo-query/engine-seen`) |
| **Lab** (`l`) | Workspace như drill: đề, editor, Run/Submit, tab kết quả. Tab phụ "Bên trong" vẽ trang heap / cây / kế hoạch từ kết quả thật | Viết **một** câu (Postgres: SQL; Mongo: shell; Dynamo: lệnh) trên dữ liệu đã dựng sẵn | Như drill: so kết quả với Solution (SQL: `grade()`; tài liệu: §3.5) |
| **Đoán kế hoạch** (`p`) | Một câu truy vấn + bảng/collection + index đang có. 3–4 lựa chọn kế hoạch (Seq Scan / Index Scan / Bitmap / Index Only; Mongo COLLSCAN / IXSCAN + SORT / IXSCAN không SORT) hoặc "cái nào rẻ hơn" | Chọn trước, rồi bấm "Xem thật". Postgres chạy `EXPLAIN (FORMAT JSON)` thật, đọc bằng `planCheck`, **chi phí planner, không bao giờ ms** như ch11 | Đúng/sai theo loại nút và bảng, như `planCheck` |
| **Câu hỏi** (`q`) | 1 câu nhiều lựa chọn hoặc sắp thứ tự (ví dụ xếp các bước khi ghi WAL) | Chọn hoặc kéo-thả (có nút ↑/↓ cho bàn phím) | Máy chấm. Lựa chọn trộn bằng `optionOrder`, giá trị lưu là chỉ số gốc |
| **Capstone** (`x`) | Một case 3–5 bước như đánh giá thăng tiến: "Bảng `events` 2 triệu dòng chậm" → chọn index → viết `CREATE INDEX` (index lab, `runLab`) → đoán kế hoạch → kết luận nhiều lựa chọn | Theo bước, có `bossStep` | Từng bước; xong thì dock nhỏ (Lily reo) |

### 2.2 PostgreSQL (track sâu nhất, chạy thật)

Chín mô-đun, chia hai chunk (I = 1–5, II = 6–9). Mỗi mô-đun: 2–4 khái niệm, 1–3 lab, 1–2 đoán kế hoạch, 2–3 câu hỏi.

| # | Mô-đun | Khái niệm chính | Lab chạy thật (PGlite) | Độ trung thực |
|---|---|---|---|---|
| 1 | Từ câu SQL tới đĩa | parser → rewriter → planner → executor; tiến trình, shared buffers; trang 8 KB | `pg_relation_size`, `pg_buffercache` xem trang nào đang trong bộ đệm (**cần spike E-S1**: extension trong worker) | cao (đúng Postgres 17/18 của PGlite) |
| 2 | Heap và trang | trang = header + line pointer + tuple; `ctid`; TOAST; fillfactor | `SELECT ctid, xmin, xmax, *`; `pageinspect`: `heap_page_items(get_raw_page('t', 0))` | cao nếu E-S1 qua (cần `pageinspect`); không qua: chỉ `ctid/xmin/xmax` |
| 3 | MVCC | `xmin/xmax`, snapshot, mức cô lập, dead tuple | Một phiên: `UPDATE` rồi thấy dòng cũ/mới qua `heap_page_items` (cùng transaction). **Hai phiên đồng thời: chỉ sơ đồ**, vì PGlite một kết nối; ghi rõ "mô phỏng" | lab một phiên cao; đồng thời = sơ đồ |
| 4 | VACUUM, HOT, freeze | HOT chain, prune, visibility map, wraparound | `pg_visibility`; `VACUUM` **không chạy được trong `BEGIN…ROLLBACK`**, cần môi trường lab riêng (§4.1) | chờ spike E-S1 |
| 5 | WAL và phục hồi | WAL record, LSN, checkpoint, full-page write, replay | `pg_walinspect` (`pg_get_wal_records_info`) sau một `INSERT` (chờ E-S1); replay = sơ đồ | cao nếu E-S1 qua |
| 6 | B-tree sâu | trang lá/nội, split, dedup, index-only scan, `INCLUDE`, thứ tự cột | `bt_page_items`, `bt_metap` (pageinspect); đoán kế hoạch; index lab (`runLab` có sẵn) | cao nếu E-S1 qua; không qua: chỉ đoán kế hoạch + index lab |
| 7 | Các loại index khác | Hash, GIN (posting list/tree, `jsonb_path_ops`), GiST, SP-GiST, BRIN (khoảng trang), bloom, partial, expression | `gin_page_opaque_info`, `brin_page_items`; so `EXPLAIN` các loại; `btree_gin`/`btree_gist`/`bloom` | cao nếu E-S1 qua; `EXPLAIN` các loại index có sẵn chạy được ngay |
| 8 | Dữ liệu đặc biệt | **GEO:** kiểu hình học có sẵn (`point`, `box`, `polygon`, `circle`) + GiST/SP-GiST + KNN `<->`; `earthdistance` (`ll_to_earth`, `earth_box`); **full-text:** `tsvector`, `ts_rank`, GIN, `pg_trgm`; **jsonb:** toán tử, `jsonb_path_ops`; **vector:** `cube` + KNN làm bản thu nhỏ của tìm kiếm vector | chạy thật. **PostGIS và pgvector không có trong gói PGlite 0.5.16 (đo)**: chỉ là bài đọc + code chỉ đọc, trừ khi spike E-S2 thêm gói riêng (dependency mới, cần user) | có sẵn: cao; PostGIS/pgvector: đọc |
| 9 | Phân vùng và thống kê | khai báo partition, pruning, `pg_stats`, histogram/MCV, ước lượng sai, `ANALYZE` | `EXPLAIN` thấy pruning; đọc `pg_stats`; đoán số dòng ước lượng | cao |

**Capstone Postgres** "Bảng sự kiện chậm":

1. Đọc `pg_stats`.
2. Đoán kế hoạch.
3. Đề xuất index (index lab).
4. Chọn BRIN hay B-tree cho cột thời gian theo kích thước/độ tương quan.
5. Kết luận.

Dữ liệu là schema mới `engine` (§4.1), **không** dùng bảng domain hay `lab` (giữ md5 của `lab`).

**Wireframe, lab heap (mô-đun 2):**

```
┌ Đề ────────────────────┐┌ Editor ─────────────────────────────────────────┐
│ Heap và trang · Lab 2   ││ SELECT lp, t_ctid, t_xmin, t_xmax                │
│ Cập nhật 1 dòng làm     ││ FROM heap_page_items(get_raw_page('notes', 0));  │
│ trang có thêm một tuple ││                         [Chạy ⌘↵] [Nộp ⌘⇧↵]      │
│ Hãy liệt kê mọi tuple   │├ Kết quả │ Bên trong │ Kế hoạch ─────────────────┤
│ của trang 0…            ││  Trang 0 (8192 B)                                 │
│                         ││  ┌hdr┬lp1┬lp2┬lp3┬──── trống ────┬t3 ┬t2 ┬t1 ┐   │
│ Boon: "xmax ≠ 0 nghĩa   ││  └───┴─┬─┴─┬─┴─┬─┴───────────────┴─▲─┴─▲─┴─▲─┘   │
│ là dòng đã bị thay…"    ││        └───┼───┼───────────────────┼───┘   │      │
│                         ││            └───┼───────────────────┘       │      │
│                         ││  t1 xmax=742 (chết)  → t3 (HOT)            ┘      │
└─────────────────────────┘└───────────────────────────────────────────────────┘
```

Tab "Bên trong" vẽ từ **kết quả thật** của người học: cột `lp`, `lp_off`, `lp_len`, `t_ctid`. Không phải hình tĩnh.

**Wireframe, đoán kế hoạch (mô-đun 6), trước và sau "Xem thật":**

```
┌ B-tree sâu · Đoán kế hoạch 2 ──────────────────────────────────────────┐
│ SELECT id, created_at FROM events WHERE user_id = 42 ORDER BY created_at│
│ Index có: events_user_created (user_id, created_at) INCLUDE (id)        │
│ Postgres sẽ đọc thế nào?                                                │
│  ( ) Seq Scan rồi Sort        ( ) Bitmap Heap Scan rồi Sort             │
│  ( ) Index Scan, không Sort   (•) Index Only Scan, không Sort           │
│                                            [Xem thật ▸]                 │
├─────────────────────────────────────────────────────────────────────────┤
│ ✓ Đúng. Kế hoạch thật (chi phí planner, không phải thời gian):          │
│   Index Only Scan using events_user_created  cost 0.43..8.6  rows 12    │
│ Vì sao: cột lọc đứng đầu index, cột sắp xếp đứng ngay sau, id nằm trong  │
│ INCLUDE nên không phải về heap.                       [Bài tiếp ›]       │
└─────────────────────────────────────────────────────────────────────────┘
```

**Câu hỏi sắp thứ tự** (mô-đun 5) và **capstone** (khung bước) dùng chung trình xem:

```
┌ WAL · Câu hỏi 3 ─────────────────────┐ ┌ Capstone Postgres · bước 2/5 ───────┐
│ Xếp đúng thứ tự khi COMMIT một UPDATE │ │ ● Đọc pg_stats  ◉ Đoán kế hoạch     │
│  1. [Ghi bản ghi WAL vào bộ đệm ] ↑ ↓ │ │ ○ Tạo index  ○ BRIN/B-tree  ○ Kết   │
│  2. [Sửa trang trong shared buf ] ↑ ↓ │ │─────────────────────────────────────│
│  3. [Flush WAL tới LSN commit   ] ↑ ↓ │ │ (nội dung bước: một bài p/l/q bình  │
│  4. [Trang ghi xuống đĩa sau    ] ↑ ↓ │ │  thường, chạy trong workspace)      │
│                     [Kiểm tra]        │ │                    [Nộp bước ⌘⇧↵]   │
└───────────────────────────────────────┘ └─────────────────────────────────────┘
```

### 2.3 MySQL / InnoDB (so sánh, không chạy được trung thực)

Sáu mô-đun:

1. Kiến trúc: server layer vs storage engine.
2. **Clustered index**: bảng là cây B+ theo khóa chính; secondary index trỏ về PK, nên có "double lookup".
3. Undo log và MVCC kiểu InnoDB, so với `xmin/xmax` của Postgres.
4. Redo log, doublewrite, so với WAL.
5. Khóa: record/gap/next-key lock, REPEATABLE READ mặc định.
6. `EXPLAIN` của MySQL (`type: ref/range/ALL`, `Using index`, `Using filesort`) + đọc `EXPLAIN ANALYZE`.

Loại bài: khái niệm + sơ đồ, câu hỏi, **đoán kế hoạch trên `EXPLAIN` ghi sẵn**:

- Mỗi câu, bảng, index và output được chụp **một lần** từ MySQL 8.4 thật bằng script ngoài app;
- dữ liệu ghi vào YAML, có dòng "Kết quả ghi từ MySQL 8.4.x ngày …";
- **không** có editor chạy MySQL.

Lab thật chỉ có ở dạng "so với Postgres": cùng câu chạy trên PGlite. Ví dụ bảng có PK UUID ngẫu nhiên: Postgres ghi heap theo thứ tự chèn, InnoDB phải chen vào giữa cây.

Capstone MySQL là quiz nhiều bước: chọn PK cho bảng ghi nhiều, đọc `EXPLAIN`, chọn index phủ.

**Nếu spike tìm được engine tương thích MySQL chạy WASM** (§4.3), mô-đun 6 nâng lên lab thật. Không chặn track.

### 2.4 MongoDB (bên trong)

Ngoài lộ trình truy vấn (§3), có bốn mô-đun bên trong:

- **M1 WiredTiger:** tài liệu BSON, B-tree, cache, journal, checkpoint.
- **M2 Index:** single, compound, **ESR** (Equality → Sort → Range), multikey, text, 2dsphere, TTL, partial.
- **M3 Planner:** candidate plans, trial run, plan cache, `explain("executionStats")`: `totalKeysExamined` / `totalDocsExamined` / `nReturned`.
- **M4 Nhân bản và shard:** replica set, oplog, write concern, read preference, shard key, chunk, hashed vs ranged.

Đoán kế hoạch Mongo **không** chạy planner thật, vì mingo không có index. Có hai đường, chọn theo spike:

- (a) `explain` ghi sẵn từ MongoDB 8 thật, như MySQL;
- (b) **bộ mô phỏng planner nhỏ**: cho index + truy vấn, suy ra IXSCAN/COLLSCAN, có/không SORT, `keysExamined` ước lượng theo luật ESR. Ghi rõ "mô phỏng theo luật, không phải MongoDB".

Khuyến nghị (a) cho câu hỏi chấm, (b) chỉ để vẽ sơ đồ.

### 2.5 DynamoDB (bên trong)

Ba mô-đun:

- **D1 Partition:** hash của partition key → partition, 10 GB / 3000 RCU / 1000 WCU mỗi partition, adaptive capacity, hot key.
- **D2 Đọc ghi:** strongly vs eventually consistent, RCU/WCU (4 KB/1 KB), batch, transaction, conditional write.
- **D3 Chỉ mục và dòng sự kiện:** LSI vs GSI (GSI cập nhật bất đồng bộ), Streams, TTL.

Lab chạy trên bộ mô phỏng (§4.4): người học Query một bảng và xem RCU tiêu thụ do mô phỏng tính theo công thức công khai của AWS.

**Wireframe, lab DynamoDB** (editor là JSON request, đúng hình input của `QueryCommand`):

```
┌ Đề ──────────────────────────┐┌ Editor (JSON request) · Mô phỏng ───────────────┐
│ Phần 2 · Query vs Scan        ││ { "TableName": "Shop",                          │
│ Mọi đơn của khách C-0042 trong││   "KeyConditionExpression":                     │
│ tháng 10/2026, mới nhất trước.││     "PK = :c AND begins_with(SK, :m)",          │
│ Chỉ một lần đọc, không Scan.  ││   "ExpressionAttributeValues": {                │
│                               ││     ":c": "CUST#C-0042", ":m": "ORDER#2026-10" },│
│ Bảng Shop: PK, SK, GSI1       ││   "ScanIndexForward": false }                   │
│                               ││                        [Chạy ⌘↵]  [Nộp ⌘⇧↵]      │
│                               │├ Kết quả │ Partition │ Chi phí ──────────────────┤
│ Boon: "FilterExpression vẫn   ││ 6 item · Query · 1 partition (P3 sáng)          │
│ đọc hết rồi mới lọc…"         ││ Đọc 2,1 KB → 0,5 RCU (eventual) / 1 RCU (strong) │
│                               ││ So với Scan cùng kết quả: 412 item, 48 RCU       │
└───────────────────────────────┘└─────────────────────────────────────────────────┘
```

### 2.6 Engine "sắp có"

SQL Server, MariaDB, Redis, Cassandra, ClickHouse… là một hàng chữ trên `#/engine`, **không** là thẻ bấm được, không route. Luật không ngõ cụt cấm trang "sắp có" trên đường đi.

MariaDB rất gần MySQL. Khi làm, nó có thể chỉ là một mô-đun "Khác MySQL ở đâu" trong track MySQL (D-E7).

---

## 3. Lộ trình NoSQL "gần như tương đương" SQL

### 3.1 Nguyên tắc

- **MongoDB soi gương 11 Phần SQL.** Cùng thứ tự tư duy, cùng câu hỏi nghiệp vụ trên **cùng sự thật** (bộ dữ liệu sinh từ `lab`, §3.2). Người học có thể so: "Phần 3 SQL dùng JOIN, Phần 3 Mongo dùng `$lookup`, và hai kết quả ra cùng con số."
- **DynamoDB không soi gương được.** Không có GROUP BY, JOIN, window hay subquery phía server. Giả vờ có tương đương là dạy sai. DynamoDB có lộ trình riêng theo **mẫu truy cập**, kèm bảng đối chiếu trung thực (§3.4).
- **Cùng cơ chế với SQL:** drill 4 loại mỗi kỹ năng (`faded | open | trap | review`, L168; yêu cầu gốc nói ×3, nhưng app đã là 4 từ v19), bài học nhanh mỗi kỹ năng (khái niệm, ví dụ, lỗi hay gặp, "Thử ngay"), khung gợi ý `___` (L95), ôn Leitner, kiểm tra đầu vào (`placementItems`), phòng phỏng vấn.
- Kỹ năng NoSQL **không** vào `content/skills.yml`. `tests/icons.test.ts` và `noDeadEnds` ("mỗi kỹ năng có chương dùng") sẽ fail. Chúng nằm ở `content/engine/mongo/skills.yml` và `content/engine/dynamo/skills.yml`, có test riêng: mỗi kỹ năng có bài học, 4 drill, icon, và một Phần.

### 3.2 Dữ liệu

`mongo-lab`: chuỗi cửa hàng của `lab.sql`, chuyển sang tài liệu:

- `stores`, `customers`, `products`;
- `orders` có **mảng `lines` nhúng** (`{ product_id, qty, unit_price_vnd }`).

Sinh **một lần lúc build** bằng `scripts/lab-to-docs.mjs`: chạy `lab.sql` trên PGlite trong Node, xuất JSON tất định, md5 ghim trong test, giống `coast.mjs`.

Rút gọn còn ~3–4k tài liệu để vừa `mongodata` ≤ 80 KB gz (ước lượng). Test: tổng doanh thu, số đơn mỗi cửa hàng… trên tài liệu = trên SQL `lab`. Nhờ đó Phần 3 nói được "cùng con số".

`dynamo-lab`: một bảng **single-table** `Shop` (PK/SK: `CUST#…`, `ORDER#…`, `STORE#…`) + 2 GSI, sinh từ cùng nguồn, ~2k item.

### 3.3 MongoDB: 12 Phần

Dưới đây id kỹ năng là `mg.<id>`. Cột "SQL tương ứng" là kỹ năng của `content/skills.yml`.

| Phần | Chủ đề | Kỹ năng Mongo | SQL tương ứng |
|---|---|---|---|
| 1 | Đọc và lọc | `find`, `projection`, `filter` (toán tử `$eq/$gt/$in/$and/$or`), `sort`, `limit` | select, where, order_by, limit |
| 2 | Gộp | `group` (`$group` + `$sum/$avg/$count`), `group_keys` (khóa ghép `_id: {…}`), `match_after_group` | aggregate, group_by, having |
| 3 | Nối | `lookup`, `unwind`, `lookup_keep` (`preserveNullAndEmptyArrays`), `lookup_none` (anti-join: `$match: { x: { $size: 0 } }`) | join, multi_join, left_join, anti_join |
| 4 | Ngày và thiếu dữ liệu | `date_math` (`$dateDiff/$dateAdd`), `date_bucket` (`$dateTrunc`), `missing_null` (thiếu trường ≠ `null`, `$exists`, `$type`) | date_math, date_bucket, null_logic |
| 5 | Điều kiện | `cond` (`$cond/$switch`), `cond_sum`, `if_null`, `self_lookup` | case_when, conditional_agg, coalesce, self_join |
| 6 | Chữ và kiểu | `string_ops` (`$concat/$toLower/$substrCP`), `regex`, `distinct` (`$addToSet`, `distinct()`), `convert` (`$toInt/$toDate`) | string_fn, pattern_match, distinct, cast |
| 7 | Truy vấn lồng | `lookup_pipeline` (`$lookup` với `let`+`pipeline`, tương quan), `in_other` (`$in` từ kết quả khác), `facet` | scalar_subquery, in_subquery, correlated_value, exists |
| 8 | Pipeline nhiều bước | `stages` (đọc pipeline như CTE), `first_per_group` (`$sort` + `$group` `$first` / `$top`), `set_fields` (`$set/$unset`) | cte, multi_cte, distinct_on |
| 9 | Gộp tập | `union_with`, `except_like` (`$lookup` + `$size: 0`), `full_like` (`$unionWith` + `$group`) | union, except, full_join |
| 10 | Cửa sổ | `win_rank` (`$rank/$denseRank`), `win_shift` (`$shift`), `win_agg` (`window: { documents/range }`) | window_rank, window_lag, window_agg |
| 11 | Hiệu năng | `explain_read`, `esr` (thứ tự index ghép), `covered` (truy vấn phủ, projection bỏ `_id`) | explain_read, index_design, sargable |
| 12 | **Mô hình tài liệu** (Mongo riêng) | `embed_vs_ref`, `array_ops` (`$elemMatch`, `$filter`, `$size`), `schema_validation`, `bucket_pattern` | (không có; gần c2 "star schema và grain") |

Tổng 42 kỹ năng (tính `projection` là kỹ năng riêng của Phần 1) → 168 drill, 42 bài học nhanh. Chia hai chunk: Phần 1–6 / 7–12.

**Capstone MongoDB "Báo cáo tuần cho cửa hàng"** (`e-mg-x-weekly-1..4`, 4 bước, `bossStep`):

1. Viết pipeline doanh thu theo tuần và cửa hàng (`$match` → `$unwind lines` → `$group` → `$sort`).
2. Thêm hạng mỗi tuần bằng `$setWindowFields`.
3. Chọn index ghép cho bước 1 theo ESR (chấm theo luật).
4. Kết luận nhiều lựa chọn: "nhúng `lines` trong `orders` hay tách collection".

Phần 11 không chạy planner thật (§2.4). Drill Phần 11 là "đoán kế hoạch" chấm theo `explain` ghi sẵn, hoặc drill **viết định nghĩa index** chấm theo luật ESR. Ví dụ `{ status: 1, created: -1, total: 1 }` cho câu "status = …, sort created, total > …". Luật này là logic thuần, kiểm được, giống `planCheck`.

**Phòng phỏng vấn NoSQL:** `mongo-junior-1` (Phần 1–6, 20 phút) và `mongo-mid-1` (7–12), id `e-mg-iv-…`. Cùng UI phòng phỏng vấn (L144), nếu ngân sách `interview` cho phép (D-V22-9 tách nội dung). Nếu không, chúng ở chunk `mongolate`.

**Kiểm tra đầu vào:** "Đã biết MongoDB?": một drill `open` mỗi Phần; đạt thì gieo thẻ ôn cả Phần. Giống hệt `placementItems` (L145).

### 3.4 DynamoDB: 8 Phần theo mẫu truy cập

| Phần | Chủ đề | Kỹ năng `dy.*` | SQL tương đương? |
|---|---|---|---|
| 1 | Khóa và GetItem | `pk_sk`, `get_item`, `attr_types` | WHERE theo khóa chính |
| 2 | Query vs Scan | `query`, `sk_condition` (`begins_with`, `between`), `scan_cost` | WHERE + ORDER BY trên khóa |
| 3 | Lọc và chiếu | `filter_expr` (lọc **sau** khi đọc, vẫn tốn RCU: bẫy), `projection`, `paginate` (`LastEvaluatedKey`) | WHERE (cảnh báo chi phí), LIMIT/phân trang |
| 4 | Chỉ mục phụ | `gsi`, `lsi`, `sparse_index` | index |
| 5 | Single-table design | `entity_prefix`, `item_collection`, `adjacency_list` (quan hệ nhiều-nhiều) | **JOIN: không có**; thay bằng nhúng sẵn quan hệ vào khóa |
| 6 | Thời gian và đếm | `time_series_sk`, `counter` (`UpdateExpression ADD`), `aggregate_on_write` | **GROUP BY: không có**; tính sẵn lúc ghi hoặc đẩy qua Streams |
| 7 | Ghi an toàn | `condition_write`, `transact`, `idempotency` | ràng buộc, transaction |
| 8 | Phân tích | `partiql_read` (PartiQL `SELECT` một bảng), `export_to_sql` (sơ đồ: Streams → S3 → Athena) | **Window, subquery, JOIN: không có**; phân tích đi ra ngoài |

Ô "không có" là **nội dung dạy** ("vì sao DynamoDB bỏ JOIN"), không phải chỗ trống. Mỗi ô có một bài khái niệm + một câu hỏi "chọn thiết kế khóa cho 4 mẫu truy cập này".

23 kỹ năng, 92 drill. Kiểm tra đầu vào DynamoDB: **có**, một drill `open` mỗi Phần như Mongo (`placementItems` dùng chung). Capstone **"Thiết kế bảng cho cửa hàng"**: cho 6 mẫu truy cập; người học chọn PK/SK/GSI, rồi bộ mô phỏng chạy cả 6 Query và chấm: mỗi mẫu là **một Query, không Scan**, RCU ≤ ngưỡng.

### 3.5 Chấm kết quả tài liệu (Mongo) và kết quả DynamoDB

Bộ chấm thuần mới `src/engine/docGrade.ts` (không DOM, test trong Node).

| Luật | Quyết định | Lý do |
|---|---|---|
| Khớp theo | **Tên trường** (đường dẫn `a.b`), không theo vị trí | Tài liệu không có thứ tự cột. Đề drill được nêu tên trường trong backtick (D8a-7 cho phép), nên không lộ đáp án |
| Thứ tự khóa trong tài liệu | Bỏ qua (chuẩn hóa sắp khóa) | `$project` không đảm bảo thứ tự với người học |
| `_id` | Chấm nếu Solution có `_id`. Nếu Solution bỏ (`_id: 0`) mà người học còn `_id` mặc định: **không tính sai**, hiện mẹo "thêm `_id: 0`" | Lỗi nhỏ nhất thường gặp; bắt sai thì gây nản |
| Thứ tự tài liệu ở mức đỉnh | Multiset, trừ `ordered: true` (có `$sort` + đề nêu luật hòa) | như SQL |
| Mảng bên trong | **Có thứ tự** (Mongo coi mảng có thứ tự), trừ trường khai `unorderedArrays: [path]` (ví dụ kết quả `$addToSet`, vốn không có thứ tự) | đúng ngữ nghĩa |
| Thiếu trường vs `null` | **Khác nhau**: đây là kỹ năng `missing_null`. Mẹo riêng khi chỉ khác ở đây | dạy đúng |
| Số | Int32/Int64/Double/Decimal128 so theo giá trị, làm tròn 2 chữ số như SQL; `precision:` được phép | như grader SQL |
| Ngày | So theo thời điểm (ms UTC); `ISODate("…")` và `new Date("…")` ngang nhau | |
| ObjectId | So theo chuỗi hex | |
| Giới hạn | ≤ 5.000 tài liệu kết quả (cắt + cờ `truncated`, như `MAX_ROWS_WORKER`) | |

**DynamoDB:**

- So danh sách item, mỗi item là map thuộc tính; kiểu DynamoDB (`S/N/BOOL/L/M`) giữ khi so, `N` so theo giá trị.
- Query luôn có thứ tự theo SK, nên `ordered` mặc định **true** cho Query và false cho Scan.
- Thêm **luật chi phí** tùy chọn trên drill: `maxRcu: n`, `noScan: true`. Đúng item mà Scan → "đúng kết quả nhưng chưa đạt": như "weak pass" của practice, không tính XP đầy đủ.

**Mẹo khi sai** (giống `wrongTipper`):

1. `wrong: [{ query, vi, en }]` trên drill: kết quả người học bằng một `wrong` → hiện giải thích đó.
2. Kiểm tĩnh trên cây pipeline (thuần):
   - `$match` sau `$group` mà đề hỏi trước khi gộp;
   - `$unwind` làm nhân dòng trước `$group`, nên tổng sai;
   - `$lookup` không `preserveNullAndEmptyArrays` khi đề cần giữ;
   - FilterExpression thay KeyCondition.
   Mỗi luật một mã, chữ ở chunk.
3. Không khớp gì → bẫy của kỹ năng (skills.yml `trap`).
4. Bảng "tài liệu thừa / thiếu" (≤ 3 mỗi bên) dùng lại ý `diffView`, vẽ tài liệu dạng JSON gọn.

**Khung gợi ý `___`** (L95) cho Mongo:

- `frameOf` mới trên cây pipeline: giữ tên stage và toán tử, thay tên trường và giá trị bằng `___`;
- trap drill gộp stage khác `wrong:` thành một `___`;
- chunk `frame` hiện là SQL-only, nên khung Mongo ở `mongort`.

### 3.6 Wireframe: drill Mongo (Phần 3, `$lookup`)

```
┌ Đề ──────────────────────────┐┌ Editor (JavaScript, chỉ dạng shell) ───────────┐
│ Phần 3 · Nối · drill mở       ││ db.orders.aggregate([                          │
│ Mỗi đơn PAID tháng 10/2026 của ││   { $match: { status: "PAID", … } },          │
│ cửa hàng 2: `order_id`,       ││   { $lookup: { from: "customers",             │
│ `customer_name` (khách vãng   ││       localField: "customer_id",              │
│ lai giữ lại, tên là null).    ││       foreignField: "_id", as: "c" } },       │
│                               ││   { $unwind: { path: "$c",                    │
│ Bảng dùng ▸ orders ▸ customers││       preserveNullAndEmptyArrays: true } },   │
│ Kết quả mong đợi: 41 tài liệu ││   { $project: { _id: 0, order_id: 1, … } }    │
│ { order_id: …, customer_… }   ││ ])                  [Chạy ⌘↵]  [Nộp ⌘⇧↵]       │
│                               │├ Kết quả │ Pipeline từng bước │ So với SQL ─────┤
│ Boon: "Thiếu khách thì $unwind││ Bước 1 $match   ▓▓▓▓▓▓▓▓▓▓▓▓  12.408 → 57 tài liệu│
│ bỏ mất đơn đó…"               ││ Bước 2 $lookup  57 → 57 (c: mảng 0–1 phần tử)  │
│                               ││ Bước 3 $unwind  57 → 41  ← mất 16! (preserve?) │
└───────────────────────────────┘└────────────────────────────────────────────────┘
```

- Tab **"Pipeline từng bước"** là bản Mongo của "Thứ tự thực thi": chạy tiền tố pipeline `[0..i]` và đếm tài liệu. Việc này dễ hơn SQL rất nhiều, vì pipeline vốn là danh sách stage, không cần parser Postgres.
- Tab **"So với SQL"** cho câu SQL tương ứng trên `lab`, chỉ đọc, **chỉ sau khi đạt** (không lộ đáp án).
- "Kết quả mong đợi" và "Bảng dùng" giống `tryPreview` của drill General (L84).

---

## 4. Runtime cho từng engine

Hai spike đang chạy. Mỗi mục dưới là **phương án + khi nào chọn**. Người điều phối điền cột "Kết quả spike".

### 4.1 PostgreSQL: PGlite thật

| Nhu cầu | Đường hiện có | Đề xuất | Spike |
|---|---|---|---|
| Lab một câu đọc (`ctid`, `pg_stats`, `EXPLAIN`) | `runSandboxed` (`BEGIN → câu → ROLLBACK`) trên schema mới `engine` (`SCHEMAS.eng`, seed lười như `lab`) | dùng nguyên | không |
| Extension (`pageinspect`, `pg_walinspect`, `pg_visibility`, `pg_buffercache`, `pg_trgm`, `btree_gist`, `cube`, `earthdistance`, `bloom`) | PGlite nhận extension **khi khởi tạo** (`new PGlite({ extensions })`); worker hiện khởi tạo một lần | **E-S1:** tạo một PGlite **thứ hai** trong worker ("máy lab engine", bộ nhớ, không snapshot) chỉ khi mở bài Engine cần extension; tarball tải lười (nhóm `pgext`). DB chính không đổi | **E-S1**: hai PGlite trong một worker (RAM, thời gian boot), `CREATE EXTENSION` trong PGlite 0.5.16 |
| Câu do tác giả viết nhiều lệnh (dựng bảng, `UPDATE`, `VACUUM`, `CHECKPOINT`) rồi người học đọc | không có: player chỉ được một câu, trong transaction | request mới `kind: 'engineLab'`: worker chạy **script của tác giả** (từ chunk nội dung, không bao giờ chữ người chơi) ngoài transaction trên máy lab engine, rồi chạy câu đọc của người chơi bằng `runSandboxed`. Mỗi lab **tạo lại** máy lab (DROP SCHEMA + script), nên thứ tự bài không ảnh hưởng nhau | E-S1 (VACUUM thấy HOT prune trong PGlite một tiến trình? autovacuum không chạy, nên tác giả gọi tay) |
| MVCC hai phiên | PGlite một kết nối | **Sơ đồ** (§5) + bảng `xmin/xmax` thật đọc được sau mỗi bước script. Ghi rõ "phiên B được mô phỏng". Không giả lập bằng hai PGlite (hai DB khác nhau, sai bản chất) | không |
| PostGIS, pgvector | **không có trong gói (đo)** | **E-S2** (tùy chọn): gói PostGIS/pgvector cho PGlite có tồn tại và tương thích 0.5.16 không, nặng bao nhiêu. Không qua → bài đọc + `cube`/`earthdistance` thay | E-S2 |

Bảo vệ an toàn giữ như hiện tại:

- người chơi vẫn chỉ một câu, và PGlite từ chối nhiều câu;
- script tác giả được test chạy trong Node (`tests/engineLabs.test.ts`: mọi script chạy, mọi Solution ra ≥ 1 dòng, mọi đoán kế hoạch ra đúng loại nút bằng `planCheck`).

Timeout 5 s và terminate giữ nguyên. Máy lab engine bị terminate cùng worker và dựng lại khi cần.

### 4.2 MongoDB

| Phương án | Trung thực | Kích thước | Ghi chú |
|---|---|---|---|
| **A. mingo** (JS, MIT, chạy `find` + aggregation pipeline gồm `$lookup`, `$group`, `$setWindowFields`, `$dateTrunc`…) trong **worker riêng** `mongoWorker` | Ngữ nghĩa toán tử cao; **không** có index, planner, `explain`, transaction. Một số toán tử hiếm có thể thiếu: E-S3 kiểm danh sách toán tử của 42 kỹ năng | chờ đo (chỉ đăng ký toán tử dùng) | **Khuyến nghị**, nếu E-S3 xác nhận đủ toán tử |
| B. FerretDB trên PGlite | Cao hơn ở giao thức, nhưng FerretDB viết bằng Go, cần wire protocol; chạy trong trình duyệt gần như không khả thi | rất lớn | loại, trừ khi spike chứng minh ngược lại |
| C. MongoDB thật qua WASM | không có bản chính thức | — | loại |
| D. Chỉ sơ đồ + câu hỏi | thấp (không viết truy vấn) | nhỏ | fallback nếu A thất bại; lộ trình mất phần "gần như tương đương" |

Editor Mongo:

- CodeMirror thêm `@codemirror/lang-javascript` (**dependency mới, ghim chính xác**, `npm i --save-exact`, dòng trong `assets/THIRD_PARTY.md`).
- Chữ người học **không bao giờ `eval`/`new Function`**. Bộ phân tích riêng (thuần, `src/engine/mongoShell.ts`) chỉ nhận:
  - `db.<coll>.find(<doc>[, <proj>])` + chuỗi `.sort()/.limit()/.skip()/.count()`;
  - `db.<coll>.aggregate([<stage>…])`;
  - `db.<coll>.distinct(...)`;
  - `db.<coll>.createIndex(...)` (Phần 11, chấm theo luật);
  - trong đó `<doc>` là cú pháp JSON lỏng (khóa không ngoặc, nháy đơn, dấu phẩy cuối) + `ISODate()`, `new Date()`, `ObjectId()`, `NumberDecimal()`, regex `/…/i`.
- Lỗi cú pháp có vị trí, gạch chân qua `setDiagnostics` như SQL.
- Timeout giống DbClient: worker chạy > 5 s thì terminate và dựng lại (một pipeline `$lookup` lồng có thể chậm).

### 4.3 MySQL

| Phương án | Ghi chú |
|---|---|
| **A. Không chạy; `EXPLAIN` ghi sẵn từ MySQL 8.4 + lab so sánh trên PGlite** | **Khuyến nghị** (trung thực, nhỏ). Mỗi output có dòng phiên bản |
| B. Engine tương thích MySQL bằng WASM (theo spike) | Chỉ khi spike tìm được bản duy trì, giấy phép hợp, ≤ ~5 MB tải lười; vẫn phải ghi rõ "tương thích, không phải InnoDB" vì internals InnoDB không quan sát được |
| C. Dịch câu MySQL sang Postgres | loại: dạy sai cả hai |

### 4.4 DynamoDB

| Phương án | Ghi chú |
|---|---|
| **A. Bộ mô phỏng TS tự viết** (`src/engine/dynamoSim.ts`, thuần): bảng PK/SK, LSI/GSI (GSI cập nhật đồng bộ trong mô phỏng, có ghi chú), `GetItem/Query/Scan/PutItem/UpdateItem` với `KeyConditionExpression`, `FilterExpression`, `ProjectionExpression`, `ExpressionAttributeNames/Values`, phân trang `Limit`/`ExclusiveStartKey`, tính RCU/WCU theo công thức công khai, hash partition để vẽ | **Khuyến nghị.** Nhỏ (ước lượng ≤ 15 KB gz), test kỹ được. Trung thực ở **ngữ nghĩa API và chi phí**; không mô phỏng throttling theo thời gian, eventual consistency thật hay giới hạn dịch vụ ngoài 1 MB/trang |
| B. Đầu vào: JSON request (giống AWS CLI/SDK v3 `QueryCommand` input) | Khuyến nghị làm định dạng editor. Người học học được đúng hình request thật |
| C. PartiQL cho Phần 8 | tập con `SELECT … FROM t WHERE pk = … [AND sk …]`, dịch sang Query/Scan của bộ mô phỏng; câu gây Scan bị cảnh báo như DynamoDB thật |
| D. DynamoDB Local (Java) / dịch vụ thật | loại: không backend (D6) |

### 4.5 Nếu spike nói "không"

| Engine | Fallback | Mất gì |
|---|---|---|
| Postgres extension (E-S1 thất bại) | lab chỉ dùng cột hệ thống (`ctid`, `xmin`, `xmax`), `EXPLAIN`, `pg_stats`, `pg_relation_size` trên DB chính; trang/WAL/HOT = sơ đồ | lab mô-đun 2, 4, 5, 6 thành sơ đồ + câu hỏi |
| Mongo (mingo thiếu toán tử) | kỹ năng thiếu thành bài "đọc pipeline + chọn kết quả đúng" (câu hỏi), phần còn lại giữ lab | một số drill `open` thành câu hỏi |
| MySQL WASM | phương án A (đã là khuyến nghị) | không mất gì so với kế hoạch |
| Dynamo | không phụ thuộc spike | — |

---

## 5. Hình ảnh và chuyển động cho phần "bên trong"

### 5.1 Luật (giữ nguyên luật v5/v6, L101–L122)

- Mỗi sơ đồ là **chuỗi bước do người học bấm** (‹ Trước / Tiếp ›, phím ←/→ khi sơ đồ có focus), không tự chạy.
- Mỗi bước ≤ 3 s. **Khung gốc luôn là trạng thái cuối của bước**: giảm chuyển động hiện ngay khung đó, và "Tiếp" vẫn dùng được.
- Một timeline GSAP **tạm dừng** mỗi bước (`timeline()` của `src/art/gsap.ts`, qua `loadGsap()`/`DrillDeps`). Không chờ chunk: chưa có GSAP thì hiện khung cuối.
- Biến đổi chỉ trên SVG lá. Không biến đổi link/nút/thẻ. Vẽ lại (`rerender`, đổi ngôn ngữ) không phát lại.
- Chữ trong SVG ẩn dưới `lg` (như cảnh harbour); dưới sơ đồ có danh sách HTML các bước (đọc được bằng trình đọc màn hình, `aria-live` một câu khi đổi bước).
- Màu: token mới `--eng-*` cho cả hai theme (heap, tuple sống/chết, khóa, trang), kiểm tương phản ≥ 4,5:1 trong `tests/theme.test.ts`. Không dùng màu chương.
- Không linh vật trong sơ đồ. Boon nói một dòng **dưới** sơ đồ (thầy), Lily chỉ reo khi xong mô-đun (một linh vật mỗi vùng).
- Chung một engine vẽ: `src/engine/diagram.ts` dựng SVG từ **mô tả dữ liệu** (YAML: các "khung" = trạng thái node/cạnh), GSAP chỉ tween giữa khung. Nhờ vậy 30+ sơ đồ là nội dung, không phải 30+ đoạn code. Nhóm `enginemotion` ≤ 25.

### 5.2 Danh sách sơ đồ

| Sơ đồ | Bước (tóm) | Gắn dữ liệu thật? |
|---|---|---|
| **B-tree split** | chèn khóa → lá đầy → tách đôi → đẩy khóa giữa lên cha → cha đầy → tách tiếp → gốc mới (cây cao +1) | Có: sau đó lab `bt_page_items` xem lá thật |
| **Heap page + HOT** | trang trống → INSERT 3 tuple (line pointer từ trên, tuple từ dưới) → UPDATE: tuple mới cùng trang, `t_ctid` trỏ tiếp (HOT) → index vẫn trỏ lp1 → prune: lp1 thành redirect | Có: lab `heap_page_items` |
| **MVCC snapshot** | hai làn thời gian Phiên A / Phiên B; A `BEGIN` (snapshot xmin..xmax) → B UPDATE + COMMIT → A vẫn thấy bản cũ (READ COMMITTED vs REPEATABLE READ: công tắc) | Một phần: số `xmin/xmax` lấy từ script thật |
| **WAL replay** | trang trong bộ đệm bẩn → bản ghi WAL ghi trước (LSN tăng) → checkpoint → sập (màn hình đỏ nhạt, không nhấp nháy) → replay từ checkpoint, LSN chạy, trang khớp lại | Có nếu E-S1: LSN thật từ `pg_walinspect` |
| **VACUUM / visibility map** | trang có tuple chết → vacuum dọn → bit all-visible bật → index-only scan bỏ qua heap | Có nếu E-S1 |
| **GIN posting list** | tài liệu → tách từ → mỗi từ một mục với danh sách TID → danh sách dài thành posting tree → truy vấn `a & b` = giao hai danh sách | Có: `to_tsvector` thật trên 5 câu |
| **BRIN ranges** | bảng chia khối 128 trang → mỗi khối lưu min/max → truy vấn khoảng: chỉ khối giao sáng lên → dữ liệu xáo trộn: mọi khối sáng (BRIN vô dụng) | Có: `brin_page_items` |
| **GiST / R-tree** | điểm trên mặt phẳng → hộp bao nhóm điểm → hộp cha → truy vấn KNN `<->`: duyệt hộp gần nhất trước | Có: `point` + GiST thật |
| **Partition pruning** | bảng cha → 12 phân vùng tháng → WHERE tháng 10 → 11 phân vùng mờ đi | Có: `EXPLAIN` |
| **InnoDB clustered vs heap** | cùng 5 dòng: Postgres heap + index trỏ ctid / InnoDB cây theo PK, secondary trỏ PK → tra secondary = 2 lần đi cây | Sơ đồ |
| **DynamoDB partitions** | item → hash(PK) → vòng partition → khóa nóng: một partition đỏ dần (thanh RCU) → write sharding (`PK#1..#4`) chia đều | Có: hash do bộ mô phỏng tính trên dữ liệu `dynamo-lab` |
| **DynamoDB GSI** | ghi bảng gốc → bản chiếu sang GSI (khóa khác) → Query GSI | Có (mô phỏng) |
| **Mongo compound index ESR** | index `{a:1, b:1, c:1}` vẽ thành dãy khóa có thứ tự → câu bằng/sort/khoảng: vùng quét liên tục (tốt) vs nhảy cóc + SORT trong bộ nhớ (xấu) → đổi thứ tự cột, xem lại | Có: luật ESR thuần + `explain` ghi sẵn |
| **Mongo pipeline** | băng chuyền stage, số tài liệu mỗi stage | Có: tab "Pipeline từng bước" (đếm thật bằng mingo) |

**Đoán trước khi xem** (giống hộp đoán của `sqlMotion`, L154): trước bước "kết quả" của sơ đồ, có câu hỏi ngắn: "Cây cao thêm mấy tầng?", "Phân vùng nào được đọc?". Đúng hay sai đều xem tiếp; không lưu.

### 5.3 Wireframe sơ đồ (B-tree split, bước 4/7)

```
┌ B-tree: khi trang lá đầy ───────────────────────────── bước 4 / 7 ─┐
│                          ┌──────────┐                               │
│                          │  20 │ 40 │   ← cha nhận khóa 30 (sáng)    │
│                          └─┬────┬───┘                               │
│              ┌─────────────┘    └──────────────┐                    │
│        ┌─────┴─────┐ ┌───────────┐ ┌───────────┴┐                   │
│        │ 21 25 28  │ │ 30 33 35  │ │ 41 44 …    │                   │
│        └───────────┘ └───────────┘ └────────────┘                   │
│  Đoán trước: cha còn chỗ cho thêm mấy khóa?  ( 0 )( 1 )( 2 )        │
├─────────────────────────────────────────────────────────────────────┤
│ 4. Trang lá tách đôi; khóa đầu của nửa phải (30) được chép lên cha.  │
│ [‹ Trước]  ● ● ● ◉ ○ ○ ○  [Tiếp ›]                [Xem trang thật ▸] │
└─────────────────────────────────────────────────────────────────────┘
```

"Xem trang thật" mở lab mô-đun 6 với câu `bt_page_items` dựng sẵn.

---

## 6. Lộ trình phiên bản

Engine bắt đầu **sau v22**:

- V22-E chuyển YAML → JSON lúc build và tách chunk late; Engine dựa trên bộ nạp đó;
- v22 giữ L200–L214.

Giao thức luồng, worktree, cổng, deploy: `roadmap-v18-v20.md` §5, giữ nguyên.

### 6.1 Các luồng

| Ver. | Luồng | Nội dung | File (tách nhau) | Cỡ | Chặn bởi |
|---|---|---|---|---|---|
| **v23** | **E0 Spike** | E-S1 (hai PGlite + extension + VACUUM trong worker), E-S2 (PostGIS/pgvector cho PGlite, tùy chọn), E-S3 (mingo: phủ toán tử 42 kỹ năng Mongo, kích thước, tốc độ `$lookup` trên 4k tài liệu). Kết quả: `docs/team/spike-engine.md` + nhánh spike, không gộp code | nhánh `spike/engine-*` | M | tag v22 |
| v23 | **E1 Nền Engine** | route `engine`, nav (desktop + công tắc "Học" trên 375), `ENGINE_ID`/`ENGINE_SKILL` trong Save (+ fixture), `engineXp`, chunk `engineui`, trang tổng quan/engine/mô-đun, trình xem bài khái niệm + câu hỏi, `diagram.ts` + chunk `enginemotion`, hook `#/me`, `tests/noDeadEnds` mở rộng | `src/route.ts`, `src/save.ts`, `src/ui/topbar.ts` (chỉ đăng ký), mới `src/engine/*`, `src/ui/engine*.ts`, `src/i18n/engine.ts`, `scripts/check-budget.mjs` (dòng nhóm) | L | V22-E (bộ nạp JSON); song song E0 |
| v23 | **E2 Postgres I** | mô-đun 1–5: nội dung, schema `engine` + seed, request `engineLab` (nếu E-S1 qua; không qua thì bản fallback §4.5), 6 sơ đồ (heap/HOT, MVCC, WAL, VACUUM, trang, bộ đệm) | `content/engine/pg/**`, `src/db/engine/*`, `src/db/worker.ts` (một kind mới), `src/db/client.ts` (một hàm) | L | E1 (trình xem), E0 (E-S1) |
| **v24** | **E3 Postgres II** | mô-đun 6–9 + capstone; sơ đồ B-tree, GIN, BRIN, GiST, partition; đoán kế hoạch dùng `planCheck` | `content/engine/pg2/**`, tests | L | E2 |
| v24 | **E4 Mongo runtime + Phần 1–6** | `mongoWorker`, `mongoShell.ts`, `docGrade.ts`, lang-javascript, `mongo-lab` (script + JSON), skills/drills/bài học Phần 1–6, tab "Pipeline từng bước", session mode `engine` trong `work.ts` (hook chạy theo engine của bài) | `src/engine/mongo/*`, `content/engine/mongo/**`, `scripts/lab-to-docs.mjs`, `src/ui/work.ts` (**một** điểm rẽ "chạy bằng gì", commit riêng gộp sớm) | XL | E1, E0 (E-S3) |
| **v25** | **E5 Mongo Phần 7–12** | nội dung + bên trong M1–M4 + `explain` ghi sẵn + kiểm tra đầu vào Mongo + **capstone Mongo** (§3.3) + ôn Leitner Engine trong `reviewQueue` | `content/engine/mongo2/**`, `src/practice.ts` (hàng ôn trộn) | L | E4 |
| v25 | **E6 DynamoDB** | `dynamoSim.ts`, `dynamo-lab`, 8 Phần + D1–D3 + capstone thiết kế bảng, sơ đồ partition/GSI | `src/engine/dynamo/*`, `content/engine/dynamo/**` | L | E1, E4 (điểm rẽ `work.ts` đã có) |
| **v26** | **E7 MySQL** | 6 mô-đun, `EXPLAIN` ghi sẵn (script chụp ngoài app, ghi phiên bản), sơ đồ clustered vs heap | `content/engine/mysql/**`, `scripts/capture-mysql.md` (cách chụp, không chạy trong CI) | M | E1 |
| v26 | **E8 Phỏng vấn + liên kết** | 2 bộ đề Mongo, 1 bộ thiết kế DynamoDB, chip "Đào sâu" từ ch11 Logistics/A10/`index_design` sang Engine, album Lily, smoke + axe cho mọi trang Engine | `content/engine/interview.yml`, chỗ chip trong `ui/brief.ts`/`learnView.ts` (một dòng mỗi chỗ) | M | E3, E5, E6 |

**Thứ tự gộp:**

1. E0 (tài liệu) → E1.
2. E2 ∥ commit "điểm rẽ `work.ts`" của E4.
3. E3 ∥ E4.
4. E5 ∥ E6.
5. E7 ∥ E8.

Chỗ giao file phải kiểm:

- `src/ui/work.ts`: chỉ E4 sửa, những luồng khác dùng hook;
- `src/db/worker.ts`: chỉ E2;
- `scripts/check-budget.mjs`: mỗi luồng một dòng, nối cuối bảng.

### 6.2 Tiêu chí thoát mỗi phiên bản

- Gồm tsc, vitest, build, budget, smoke + axe trên trang mới (1280 sáng, 375 tối, 320 không cuộn ngang).
- **main tăng ≤ +1,5 KB qua cả bốn phiên bản Engine.**
- Mọi Solution/lab/drill chạy trong test: Postgres trên PGlite Node; Mongo trên mingo Node; Dynamo trên bộ mô phỏng.
- Mọi drill khác Solution của 3 drill cùng kỹ năng; mọi `wrong` chạy được và khác Solution.
- Code span VI = EN, EN không dấu.

---

## 7. Rủi ro

| # | Rủi ro | Mức | Giảm |
|---|---|---|---|
| R1 | Hai PGlite trong một worker tốn RAM (mỗi cái ~ vài chục MB), máy yếu/điện thoại sập tab | cao | E-S1 đo; máy lab engine chỉ dựng khi mở bài cần extension, hủy khi rời Engine; fallback §4.5 |
| R2 | mingo khác MongoDB ở ca biên (so sánh kiểu hỗn hợp, `$group` với `null`/thiếu trường, độ chính xác Decimal128) | trung bình | test ngữ nghĩa trên bộ ca biên chụp từ MongoDB 8 thật (một lần, ghi phiên bản); drill tránh ca biên chưa khớp; ghi "chạy bằng mingo, tương thích ngôn ngữ truy vấn MongoDB" trên trang Mongo |
| R3 | Người học tưởng bộ mô phỏng DynamoDB = DynamoDB | trung bình | nhãn "Mô phỏng" trên editor Dynamo; bài D1 nói rõ phần nào không mô phỏng |
| R4 | Nội dung quá lớn (≈ 170 + 100 drill, ~70 bài học, ~40 bài khái niệm) làm chậm các luồng khác | cao | Engine là vòng riêng v23–v26, không chen vào v22; mỗi chunk có trần; nội dung theo Phần, gộp được từng phần |
| R5 | Kiến thức internals sai chi tiết (số, phiên bản) | trung bình | mọi số liệu trong bài khái niệm dẫn nguồn chính thức (docs Postgres 17/18, MySQL 8.4, MongoDB 8, AWS DynamoDB Developer Guide); `db-engine-knowledge.md` là danh mục nguồn; lab thật thắng chữ khi lệch |
| R6 | Thanh dưới 375 đã đầy | trung bình | D-E1 (gộp "Học") |
| R7 | Một bản build cũ đọc save mới bỏ id Engine | thấp | ghi vào dòng L; site chỉ có một bản |
| R8 | Editor JS cho Mongo kéo thêm KB và người học gõ JS tự do (biến, hàm) không chạy | trung bình | bộ phân tích báo lỗi rõ "chỉ nhận `db.<collection>.find/aggregate…`" có ví dụ; lang-javascript chỉ để tô màu |
| R9 | Mất trọng tâm "Data Analyst": internals là kiến thức kỹ sư dữ liệu/DBA | thấp–trung bình | Engine là khu riêng, không ép; mỗi mô-đun mở bằng "Vì sao người phân tích cần biết" (ví dụ MVCC giải thích vì sao báo cáo dài thấy số liệu nhất quán) |

---

## 8. Quyết định cần user

| # | Câu hỏi | Khuyến nghị | Nếu không trả lời |
|---|---|---|---|
| **D-E1** | Thanh dưới điện thoại đã 5 mục. Engine đặt ở đâu trên 375? | Gộp "Lộ trình" + "Engine" thành mục **"Học"** với công tắc SQL / Database Engine; desktop giữ hai mục | Gộp |
| **D-E2** | Lộ trình truy vấn MongoDB/DynamoDB nằm ở đâu? (a) trong Engine (`#/engine/mg/path`), (b) track thứ ba trên `#/learn` cạnh "SQL" và "Nâng cao" | **(a) trong Engine**: Lộ trình giữ "SQL chung"; NoSQL cần runtime riêng của engine, và người học tìm Mongo ở trang Mongo | (a) |
| **D-E3** | Mức "gần như tương đương" | **MongoDB soi gương 11 Phần + Phần 12 mô hình** (đủ drill/bài học/ôn/đầu vào/phỏng vấn); **DynamoDB có lộ trình riêng 8 Phần theo mẫu truy cập**, có bảng "không có tương đương" | như khuyến nghị |
| **D-E4** | Ôn Leitner Engine có gộp vào nút "Ôn: N" chung không | **Gộp**, một hàng ôn trộn | Gộp |
| **D-E5** | Lily có lớn theo kỹ năng Engine không | **Không đổi giai đoạn**; thêm dòng kỷ niệm trong album + reo khi xong mô-đun | Không đổi |
| **D-E6** | Thêm dependency: `mingo` (Mongo), `@codemirror/lang-javascript`; tùy E-S2 thêm gói PostGIS/pgvector | Đồng ý `mingo` + lang-javascript nếu E-S3 đạt; PostGIS/pgvector **chỉ** nếu E-S2 cho thấy gói tương thích và ≤ ~3 MB tải lười | Chỉ hai cái đầu |
| **D-E7** | Thứ tự engine | **Postgres → MongoDB → DynamoDB → MySQL** (MySQL cuối vì không chạy thật được, giá trị so sánh cao nhất khi đã có Postgres). MariaDB = một mô-đun trong MySQL; SQL Server, Redis… sau v26 | như khuyến nghị |
| **D-E8** | MySQL không có runtime thật: chấp nhận "`EXPLAIN` ghi sẵn + sơ đồ + lab so sánh trên Postgres"? | **Chấp nhận**, ghi phiên bản trên mỗi output | Chấp nhận |
| **D-E9** | Mở vòng v23–v26 cho Engine sau tag v22 | Mở; E0 (spike) chạy được ngay sau tag v22, song song E1 | Không chạy |
| **D-E10** | XP Engine có cộng vào XP top bar (chức danh, `#/me`) không | **Cộng** (câu hỏi +5, lab/drill +10, capstone +20 mỗi bước); chức danh nghề nghiệp vẫn chỉ theo đánh giá thăng tiến domain | Cộng |

---

## 9. Dải số L

Trên `main` lúc viết: cao nhất **L188**. `roadmap-v22.md` §5 giữ L189–L199 cho v21 và L200–L214 cho v22. Engine giữ **L215–L239**. Nếu v21/v22 dùng vượt dải, người điều phối Engine dời cả dải lên ngay sau số cao nhất lúc mở v23 (giữ thứ tự) và ghi vào dòng đầu.

| Số | Dùng cho |
|---|---|
| **L215** | User duyệt tài liệu này (D-E1…D-E10), mở vòng Engine, dải số |
| L216 | E0: kết quả E-S1/E-S2/E-S3, runtime chốt cho từng engine (thay §4 bằng số đo) |
| L217–L219 | E1: route + nav + công tắc "Học"; `ENGINE_ID`/`ENGINE_SKILL` trong Save (không bump) + XP; `diagram.ts` + luật chuyển động sơ đồ bước |
| L220–L222 | E2: schema `engine`, request `engineLab` + máy lab engine (hoặc fallback), Postgres I |
| L223–L224 | E3: Postgres II, capstone, đoán kế hoạch |
| L225–L228 | E4: `mongoWorker` + bộ phân tích shell (không `eval`), `docGrade` (luật §3.5), `mongo-lab`, Phần 1–6 |
| L229–L230 | E5: Phần 7–12, bên trong Mongo, ôn trộn + kiểm tra đầu vào Mongo |
| L231–L233 | E6: `dynamoSim` (phạm vi trung thực), 8 Phần, capstone thiết kế |
| L234 | E7: MySQL, nguồn `EXPLAIN` ghi sẵn |
| L235–L236 | E8: phỏng vấn NoSQL, chip "Đào sâu", album Lily |
| L237 | Thoát vòng Engine: số đo, luồng bỏ (nếu có), tag |
| L238–L239 | Dự phòng |
