# Product design: khu Best Practice (SQL, PostgreSQL, MongoDB, DynamoDB)

Người viết: Product Design + UI/UX · 2026-11-20 · **Chỉ là thiết kế** (L218): không code, không build, không sửa `decision-log.md`.

**Căn cứ:**

- `best-practice-catalogue.md`:
  - 95 mục: Q 22, A 11, S 12, I 9, P 9, X 5, M 14, D 13;
  - 69 mục đã chạy thật trên PGlite hoặc mingo;
  - §9 là đề xuất ban đầu.
- `product-design-db-engine.md` v2:
  - §2 ENGINE-CONTENT-V1;
  - §3.6 nhãn trung thực;
  - §7.5 Best Practice (còn mở);
  - §7.6 ngân sách.
- `engine-ux-spec.md`:
  - token, lưới, sidebar;
  - "dòng Best Practice cao 52" ở `#/engine`;
  - link "Best Practice cho <engine>".
- `roadmap-v22-v30.md`:
  - v25 có luồng E-BP với `src/ui/engineBest.ts` và `content/engine/best/{sql,postgres}/**`;
  - Mongo ở v27, Dynamo ở v29;
  - dải L240–L245 cho v25.
- `ux-deploy-checklist.md` (A–L).
- `engine-competitive-research.md` P1/P3/P4: không sân chơi thiếu bài, không sách đọc dài, không giả lập mà không nói.
- Decision log L215 (mục 6 Best Practice), L216–L219, L82, L87, L162 (request chỉ-parse `WORDS_ONLY`).

**Thay thế:**

- Tài liệu này thay `best-practice-catalogue.md` §9.1–§9.2 ở hai điểm:
  - vị trí: `#/engine/best`, không phải `#/learn/bp`;
  - định dạng: file markdown theo ENGINE-CONTENT-V1, không phải một `bestpractice.yml`.
- §9.3 (lint) và §9.4 (quiz) được giữ và làm chi tiết ở §5 và §6 bên dưới.
- Tài liệu này cũng đóng câu hỏi mở của `product-design-db-engine.md` §7.5 (ADD-8).

**Mockup** (`docs/team/best-practice-ux/`, sáng + tối, hex là token thật của `src/style.css`, nét tím đứt là chú thích):

| File | Nội dung |
|---|---|
| `01-card-{light,dark}.svg` | Trang một mục (`#/engine/lesson/e-bp-q02`) ở 1280 và 375, sau khi bấm "Chạy cả hai" |
| `02-boon-nhac-{light,dark}.svg` | "Boon nhắc" trong workspace việc story ở 1280 và 375, cùng 4 trạng thái |

Số trong mockup là minh họa, trừ "Sai = 0" của Q02 (đo trong catalogue).

---

## 0. Tóm tắt một trang

| Chủ đề | Quyết định |
|---|---|
| Vị trí | Trong **Database Engine**: `#/engine/best` với tab theo track **SQL · PostgreSQL · MongoDB · DynamoDB**. Không thêm mục top bar, không thêm mục thanh dưới |
| Track | SQL = Q + A (33), PostgreSQL = S + I + P + X (35), MongoDB = M (14), DynamoDB = D (13). **Chỉ track đã phát hành mới có tab**: v25 có SQL + PostgreSQL, v27 thêm MongoDB, v29 thêm DynamoDB. Không tab xám |
| Một mục | Luật, Vì sao, cặp **Không nên / Nên** cạnh nhau, nút **"Chạy cả hai"** với số đo thật (dòng, giá trị, nút kế hoạch, planner cost; không bao giờ ms), một câu kiểm, "Sau thẻ này bạn tránh được…", nguồn chính thức, cấp L1–L5 |
| Nội dung | ENGINE-CONTENT-V1 + **ADD-8**: `engine: best`, id `e-bp-<mã>` (vd. `e-bp-q02`), file `content/engine/best/<track>/<mã>-<slug>.md`, khối `pair` mới |
| Boon nhắc | Lint nhẹ trên SQL người chơi sau khi chạy xong. 10 luật: Q01, Q02, Q06, Q10, Q11, Q12, Q13, Q15, Q22, A05 (Q22 có sẵn nhưng tắt ở v25, §5.5). Chỉ sau khi việc đã đạt, ở Sandbox, hoặc khi chạy lại việc đã xong. Tối đa một gợi ý mỗi lần, không chặn, không trừ điểm, không đổi chấm điểm. Đọc chung một lần parse với dòng "SQL bằng lời" (L162) |
| Báo nhầm | Một luật **không bao giờ nhắc** ở việc mà chính Solution của việc đó vi phạm luật ấy. Test chạy lint trên mọi Solution, drill, bài học, lab Engine. Nộp sai thì lời giải thích `wrong:` thắng và lint im |
| Tiến độ | Xong thẻ = đúng câu kiểm. Id vào `completed`, XP +5 lần đầu. **Không bump Save**, không Leitner |
| Ngân sách | main ≤ +0,3 KB. Chữ và logic nằm trong chunk lười: `engineui` (trang), `bptip` (thẻ Boon nhắc), `bpindex`, `bpsql`/`bppg`/`bpmg`/`bpdy` (nội dung), nhóm `steps` (lint) |
| v25 | 4 luồng, file tách nhau: **BP-C** nội dung, **BP-T** parser + test, **BP-UI** trang + quiz, **BP-LINT** Boon nhắc. Dùng L240–L242 |

---

## 1. Vì sao Best Practice nằm trong Database Engine

Có ba phương án:

| Phương án | Được | Mất | Chọn |
|---|---|---|---|
| A. Trang General `#/learn/bp` (đề xuất của catalogue §9.2) | Gần kỹ năng SQL | General chỉ có SQL; Mongo/Dynamo không có chỗ. L82: General không nói engine, nhưng mục S/I/P/X nói về PostgreSQL | Không |
| B. Mục nav riêng | Dễ thấy | Top bar đã chật (U1/U2, L114); thanh dưới giữ 5 mục (D-E1) | Không |
| C. **Tab trong Database Engine** `#/engine/best` | Phủ cả SQL lẫn NoSQL; không tốn chỗ nav; khớp thiết kế §7.5, UX spec §4.1 và roadmap E-BP | Người chỉ học SQL phải biết vào Engine | **Có** |

Phần "mất" của C được bù bằng các đường vào ở §2.4 (chip trên trang kỹ năng, "Vì sao?" từ Boon nhắc). Hai đường này đi theo chiều General → Engine và Domain → Engine, đều đã được §7.2 cho phép.

---

## 2. Kiến trúc thông tin

### 2.1 Route (thuần, `src/route.ts`; E-FND v22 nên nhận luôn)

| Hash | Trang | Vẽ ở |
|---|---|---|
| `#/engine/best` | Chuyển thẳng tới track nhớ trong pref `cargo-query/bp-track`, mặc định `sql` | section `best` trong `<main id="home">` |
| `#/engine/best/<track>` | Lưới thẻ của track: `sql`, `postgres`, `mongodb`, `dynamodb` | như trên |
| `#/engine/lesson/e-bp-<mã>` | Trang một mục. **Dùng lại route bài đọc của Engine**, không thêm route mới | như trên |

- Track chưa phát hành, hoặc hash lạ, rơi về `#/engine/best/sql` (luật không ngõ cụt).
- `tests/noDeadEnds.test.ts` thêm:
  - mọi route Best Practice parse được;
  - mọi track đã phát hành có ≥ 1 mục;
  - không có chữ "sắp có"/"later".

### 2.2 Tab track

- Đầu trang là một `role=tablist` gồm các link (như công tắc "Học", UX spec §3.2).
- Tab ghi tên track + "đã xong / tổng", ví dụ "SQL 9/33".
- Ở 375 tab cuộn ngang trong khung riêng (`overflow-x: auto`, `tabindex=0`, L179), trang không cuộn ngang.

### 2.3 Lưới thẻ của một track

- **Bộ lọc** (chip bật/tắt, không phải select):
  - theo khu: Q / A trong SQL; S / I / P / X trong PostgreSQL;
  - theo cấp L1–L5;
  - "Chưa xong".
- Bộ lọc là trạng thái trong bộ nhớ, không lưu.
- **Thẻ trong lưới** (`CARD_ACTION`, link phủ L88, không hover transform):
  - dòng 1: badge cấp `L2`, mã `Q02`, ✓ khi xong;
  - tiêu đề (`text-title`);
  - một dòng "Tránh được: …" lấy từ `avoid`;
  - dòng meta: nhãn trung thực ngắn (§3.4) và chip "Boon nhắc" khi mục có `lint`.
- **Thứ tự:** theo cấp, rồi theo mã. Đầu lưới có dòng giá trị của track (§7.1).

### 2.4 Đường vào

| Từ | Đến | Ghi chú |
|---|---|---|
| `#/engine` | `#/engine/best` | Dòng cao 52 cuối trang tổng quan (UX spec §4.1) |
| Trang engine `#/engine/postgres` | `#/engine/best/postgres` | Link ghost "Best Practice cho PostgreSQL ›" (UX spec §4.2). MongoDB và DynamoDB tương tự, từ v27 và v29 |
| Sidebar Engine | Nhóm "BEST PRACTICE" | Một dòng mỗi track đã phát hành; tô "đang ở" đúng một dòng (H2). Rail: một icon `seal-check` (Phosphor) sau vạch |
| Trang kỹ năng General `#/learn/skill/<id>` | Mục có `skills` chứa id đó | Chip "Best practice: Q02 ›". General → Engine là chiều đã được cho phép (§7.2 thiết kế Engine). Chip nằm trong chunk `learnui`, đọc chỉ mục index nhỏ (§10) |
| Boon nhắc (workspace) | Trang mục | "Vì sao?" mở mục trong `<dialog>` không modal ở workspace, để người chơi **không rời việc**. "Mở trang đầy đủ ›" trong dialog thì điều hướng |
| Recap ticket | Không | Recap đã dày; Boon nhắc đã đủ làm cầu nối. Bỏ đề xuất "Recap gợi ý mục" của catalogue §9.2 |

Best Practice **không nhắc domain nào** (như Engine, L82). Tên bảng trong ví dụ là của `lab`/`engine`.

### 2.5 Điện thoại

- Vào bằng mục "Học" → công tắc "Database Engine" → dòng Best Practice, hoặc bằng ngăn kéo `#side-drawer`.
- Không thêm mục thứ sáu ở thanh dưới.
- Trang mục: Không nên/Nên **xếp chồng**, "Không nên" trước. "Chạy cả hai" là thanh dính trên thanh dưới (mockup 01, bên phải).

---

## 3. Định dạng một mục (trang `#/engine/lesson/e-bp-…`)

### 3.1 Thứ tự khối (mockup 01)

1. Breadcrumb "Database Engine › Best Practice › SQL". Ở 375 thu thành "‹ Best Practice · SQL".
2. `h1` = tiêu đề, kèm các chip:
   - cấp `L2`;
   - khu ("Viết truy vấn");
   - **một** nhãn trung thực (§3.4);
   - "Boon nhắc luật này" (chỉ khi có `lint`; bấm để bật/tắt luật này, `aria-pressed`).
3. **Luật**: hộp `--panel` có vạch trái `--accent`, một hoặc hai câu, `text-body` 16.
4. **Vì sao**: 2–4 gạch đầu dòng ngắn.
5. **Cặp Không nên / Nên**: hai pane cạnh nhau từ `md`, xếp chồng dưới `md`.
   - Mỗi pane có tiêu đề bằng **icon + chữ** (✗ "Không nên" / ✓ "Nên"), viền `--bad`/`--good` 1,5 px. Màu không bao giờ là tín hiệu duy nhất.
   - Mã tô màu tĩnh trong khung `--code`, có nút "Chép" có sẵn (`ui/brief.ts`).
6. **"Chạy cả hai"** (nút phụ, pill) + dòng `text-caption`: "Chạy trên dữ liệu cửa hàng (lab) · BEGIN … ROLLBACK". Sau khi chạy:
   - dưới mỗi pane là khối **"ĐO LÚC CHẠY"** (§3.3);
   - giữa hai pane là **một câu kết luận** (`role=status`), đặt trên nền `--warn-soft` khi khác kết quả, `--good-soft` khi cùng.
7. **Câu kiểm** (§6). Đúng thì thẻ xong.
8. **"Sau thẻ này bạn tránh được…"**: câu `avoid`, kèm ✓ khi đã xong.
9. **Nối với**:
   - chip kỹ năng → `#/learn/skill/<id>`;
   - node nâng cao → `#/learn/adv/<node>`;
   - "Nên biết trước" → bài Engine (`requires`).
10. **Nguồn**: link ngoài, `rel=noopener noreferrer`, mở thẻ mới. Kèm dòng "Kiểm với PostgreSQL 18.6, ngày …" (`verified`, ADD-2).

### 3.2 "Chạy cả hai": chạy gì, ở đâu

`pair.check` là đúng loại "Kiểm" của catalogue §0. `pair.runtime` nói chạy ở đâu:

| `runtime` | Dùng cho | Chạy bằng | Có từ |
|---|---|---|---|
| `lab` | Q, A (33 mục), một câu đọc mỗi bên | `runOn()` (`src/ui/tryPreview.ts`): `ensure('lab')` → request `run` trong `runSandboxed` | v25 |
| `engine` | S, I, P, X có DDL hoặc `setup` | request `engineLab`: `setup` của tác giả → câu Sai/Đúng → câu dò, trong transaction rollback | v22 (bản tối thiểu) |
| `engine-hb` | mục cần lệnh không chạy được trong transaction. Chắc chắn: I04 (`VACUUM ANALYZE` cho visibility map, catalogue §0). Các mục S/I/P/X khác do BP-C xếp loại theo dòng "Kiểm:" của từng mục (`ANALYZE`, `CREATE ROLE`, `SET LOCAL ROLE` chạy được trong transaction) | `engineLab` phần ngoài transaction (H-B) | v24 |
| `mingo` | M có "Kiểm: mingo" (4 mục) | `mongoWorker` | v27 |
| `dynoxide` | D chạy được trên dynoxide (do luồng nội dung v29 chọn) | `dynamoWorker` | v29 |
| `none` | `check: syntax` (25 mục: index Mongo, shard, cấu hình, phần lớn D, X05, P04) | Không chạy. Không có nút; chỉ có mã + nguồn + nhãn "Chỉ cú pháp" | v25 |

**Luật chạy:**

- Hai câu chạy **lần lượt** trong hàng đợi có sẵn: Sai trước, rồi Đúng. Mỗi câu một request, timeout 5 s như mọi truy vấn.
- Câu "Không nên" có thể chậm (Q21 OFFSET sâu, P08). Nội dung phải giữ **mỗi câu < 300 ms trong Node**; test kiểm điều này.
- Nếu một câu vẫn hết giờ trong trình duyệt, pane đó hiện "Quá 5 giây: bản này chậm thật trên máy bạn". Đây là kết quả, không phải lỗi. Worker khởi động lại như luật cũ, không có vòng lặp.
- **Lần chạy đầu**: lab chưa seed thì hiện loader `preview.loading` có sẵn. Không tải gì khi chỉ mở trang.
- Không ghi `app.lastRun`, nháp, lịch sử hay Save.

### 3.3 Số đo hiện gì (theo `check`)

| `check` | Mỗi pane | Câu kết luận (ví dụ) |
|---|---|---|
| `diff` | Số dòng, 3 dòng đầu (bảng nhỏ, tiêu đề cột theo **tên thật**: đây không phải bài chấm, không có gì để lộ), giá trị đơn nếu 1×1 | "Khác kết quả: bản Không nên trả 0, bản Nên trả 312." Dùng `compareResults` có sẵn (`extraRows`/`missingRows`) |
| `same` | Số dòng | "Cùng kết quả. Khác ở cách đọc và giữ code." |
| `plan` | Nút quét chính của bảng đích (Seq / Index / Index Only / Bitmap) + **planner cost** tổng, từ `EXPLAIN (FORMAT JSON)` không ANALYZE (luật ch11) | "Cùng kết quả. Kế hoạch: Seq Scan cost 1 204 → Index Scan cost 8,4." |
| `runs` | Số dòng, 3 dòng đầu của mỗi bản | "Cả hai chạy được. Khác ở …" (một câu `why` ngắn của mục). Mục I02/I03 so cost hoặc kích thước: `expect.compare: cost | size`; DynamoDB so capacity: `rcu` (hai request đọc) hoặc `wcu` (hai request ghi), catalogue §17.2 |
| `error` | Bản Sai: SQLSTATE + câu dạy của `sqlErrors.ts`. Bản Đúng: kết quả | "Bản Không nên báo lỗi 22012 (chia cho 0)." |
| `syntax` | Không chạy | Không có câu |

Không bao giờ hiện mili giây: số ms thay đổi theo máy, cost thì không (L-ch11).

### 3.4 Nhãn trung thực (một nhãn, suy ra, không phải trường mới)

| Nhãn | Khi |
|---|---|
| "Chạy thật · PostgreSQL 18.6 (PGlite)" | `runtime: lab | engine | engine-hb` |
| "Chạy bằng mingo (ngôn ngữ truy vấn MongoDB)" | `mingo` |
| "Chạy bằng dynoxide (giả lập DynamoDB)" | `dynoxide` |
| "Chỉ cú pháp · kiểm với tài liệu ngày …" | `none` |
| "Kết quả ghi từ <server> <version>, ngày …" | có `recorded` (ADD-3) |

---

## 4. Định dạng nội dung (ENGINE-CONTENT-V1 + ADD-8)

### 4.1 ADD-8 (đóng câu hỏi §7.5 của thiết kế Engine)

| Thay đổi | Ở đâu | Ai |
|---|---|---|
| `engine` nhận thêm giá trị `best`; thư mục `content/engine/best/<track>/` | `src/engine/content.ts` (parser ENG-CORE) | BP-T (v25), một nhánh |
| Mẫu id Save `ENGINE_ID = /^e-(pg\|mg\|dy\|bp)-[a-z0-9-]+$/` | `src/save.ts` | **Xin E-FND đưa `bp` vào ngay ở v22** (cùng commit tạo `ENGINE_ID`), để không phải mở lại `save.ts` ở v25. Nếu v22 đã gộp mà thiếu thì BP-T sửa một dòng + fixture |
| Id chặt cho mục Best Practice: `e-bp-<mã>`, `<mã>` = mã catalogue chữ thường (`q02`, `s10`, `m07`, `d02`) | test nội dung | BP-T |

**Vì sao id theo mã catalogue mà không theo `l<n>-<NN>`:**

- Mã đã ổn định, và catalogue cùng mọi tài liệu đều gọi theo mã.
- Cấp của một mục có thể đổi khi review mà id không đổi, nên tiến độ không mất.

### 4.2 File

```
content/engine/best/
  tracks.yml                 # 4 track: id, title {vi,en}, after {vi,en}, areas
  sql/q02-not-exists.md
  sql/a05-as-of-date.md
  postgres/s10-tenant-rls.md
  mongodb/m07-esr.md         # v27
  dynamodb/d02-partition-key.md  # v29
```

`tracks.yml` (giống `modules.yml` của ADD-1):

```yaml
- id: sql
  areas: [q, a]
  title: { vi: "SQL", en: "SQL" }
  after:
    vi: "Bạn tránh được những câu SQL sai âm thầm: NULL nuốt kết quả, join nhân đôi tổng, ngày cắt mất dòng."
    en: "You avoid SQL that is silently wrong: NULLs that swallow rows, joins that double totals, date ranges that drop rows."
```

### 4.3 Frontmatter của một mục

Trường V1 giữ nguyên nghĩa. Trường mới đều nằm dưới ADD-8 và chỉ dành cho `engine: best`.

```yaml
---
id: e-bp-q02
engine: best
track: sql                 # ADD-8: sql | postgres | mongodb | dynamodb (= thư mục)
level: L2                  # thang L1–L5 của catalogue
module: q                  # khu: q a s i p x m d (V1: "module" = slug nhóm)
title: "Dùng NOT EXISTS thay NOT IN (subquery)"
title_en: "Use NOT EXISTS, not NOT IN"
kind: quiz                 # V1: luôn là quiz; câu kiểm bắt buộc (ADD-7 trở thành luật test ở đây)
minutes: 3
objectives:
  - { vi: "Viết anti join bằng NOT EXISTS", en: "Write an anti join with NOT EXISTS" }
avoid:                     # ADD-8: một câu "Sau thẻ này bạn tránh được…"
  vi: "Kết quả rỗng âm thầm khi danh sách so sánh có một NULL."
  en: "Silently empty results when the compared list holds a NULL."
requires: []               # id bài Engine nên học trước (chip, không khóa)
skills: [anti_join, in_subquery, exists]   # ADD-8: id trong content/skills.yml
adv: []                    # ADD-8: node trong content/general/adv.yml
sources:
  - https://wiki.postgresql.org/wiki/Don%27t_Do_This#Don.27t_use_NOT_IN
  - https://www.postgresql.org/docs/18/functions-subquery.html
verified: { version: "PostgreSQL 18.6", date: 2026-11-20 }   # ADD-2
pair:                      # ADD-8
  runtime: lab             # lab | engine | engine-hb | mingo | dynoxide | none
  check: diff              # diff | same | plan | error | runs | syntax ("runs" = catalogue "chạy được")
  setup: null              # chỉ runtime engine/engine-hb/mingo/dynoxide; kịch bản của tác giả
  bad: |
    SELECT count(*) FROM customers c
    WHERE c.id NOT IN (SELECT o.customer_id FROM orders o WHERE o.order_date >= DATE '2026-10-01')
  good: |
    SELECT count(*) FROM customers c
    WHERE NOT EXISTS (
      SELECT 1 FROM orders o
      WHERE o.customer_id = c.id AND o.order_date >= DATE '2026-10-01'
    )
  expect: null             # plan: { table, bad: <node>, good: <node> }; error: { code: "22012" }
lint:                      # ADD-8, tùy chọn: chỉ 10 mục ở §5.4
  rule: q02
  tip:
    vi: "Nếu subquery trả một NULL, NOT IN trả 0 dòng mà không báo lỗi. NOT EXISTS an toàn hơn."
    en: "If the subquery returns a NULL, NOT IN returns no rows and no error. NOT EXISTS is safe."
quiz:
  - q: { vi: "Câu nào trả đúng số khách chưa đặt từ tháng 10?", en: "Which query counts customers with no order since October?" }
    options:
      - { vi: "Bản dùng NOT IN", en: "The NOT IN version" }
      - { vi: "Bản dùng NOT EXISTS", en: "The NOT EXISTS version" }
      - { vi: "Cả hai như nhau", en: "Both are the same" }
    answer: 1
    why: { vi: "orders có customer_id NULL nên NOT IN không bao giờ đúng.", en: "orders has a NULL customer_id, so NOT IN is never true." }
---
```

**Thân bài** (V1, VI trước, rồi `# EN`):

- `## Ý chính`: **luật**, một hoặc hai câu.
- `## Vì sao`: gạch đầu dòng ngắn.
- `## Ví dụ`: chỉ khi cần thêm một đoạn giải thích mã. Mã Sai/Đúng chỉ nằm ở `pair`, viết một lần như SQL của ticket.

Phần EN dùng `## Key idea`, `## Why`, `## Example`. Mỗi khối ≤ 120 từ (P3: không sách đọc dài).

**Luật nội dung (test):**

| Luật | Vì sao |
|---|---|
| id = `e-bp-` + tiền tố tên file; thư mục = `track`; `module` thuộc `areas` của track | Id khớp đường dẫn như V1 |
| ≥ 1 `quiz`, `answer` hợp lệ | Không thẻ chỉ đọc (P1, ADD-7) |
| `check: syntax` ⇔ `runtime: none` | Nhãn trung thực không nói dối |
| `bad` ≠ `good`; với `diff`, kết quả phải khác trên runtime thật; với `same`, phải bằng; với `plan`, nút quét của `expect.table` phải đúng như khai; với `error`, Sai phải báo đúng `expect.code` và Đúng chạy được | Đúng như cột "Kiểm" của catalogue |
| Mỗi câu chạy < 300 ms trong Node | Trang không treo |
| `skills` có trong `skills.yml`, `adv` có trong `adv.yml`, `requires` là id Engine có thật | Không link chết |
| `sources` ≥ 1, `https://`, thuộc postgresql.org, wiki.postgresql.org, mongodb.com/docs, docs.aws.amazon.com hoặc sqlstyle.guide (chỉ link, CC BY-SA) | Nguồn chính thức |
| Code span VI = EN, EN không dấu, `lint.tip` có cả VI/EN | Luật V1 |
| Không chữ "boss", "sắp có", "later" | `tests/i18n.test.ts`, `noDeadEnds` |

---

## 5. "Boon nhắc": lint nhẹ trên SQL của người chơi

### 5.1 Nguyên tắc

| Luật | Cụ thể |
|---|---|
| Không chặn | Không chặn Run/Submit, không trừ XP, không đổi chấm điểm, không đếm là nộp sai |
| Một gợi ý | Tối đa **một** thẻ Boon nhắc mỗi lần chạy, theo thứ tự ưu tiên ở §5.4 |
| Sau khi chạy xong | Chỉ sau một lần chạy **thành công** (có kết quả). Lần chạy lỗi đã có ghi chú SQLSTATE |
| Boon là người dạy | Thẻ nằm trong vùng lời Boon (L87), nền `--sun`. Lily không bao giờ nhắc |
| Không gạch chân | Editor chỉ gạch chân lỗi SQL thật (`setDiagnostics`). Lint không vẽ gì trong editor |
| Không tải thêm | Đọc chung kết quả parse của dòng "SQL bằng lời" (L162: mọi lần chạy thành công đã gửi request `steps` với tiền tố `WORDS_ONLY`). Không request mới, không tải wasm chỉ để lint |

### 5.2 Ở đâu có, ở đâu không

| Nơi | Lint | Lý do |
|---|---|---|
| Việc story, lane (cả ba domain) | Có | Chỗ người học viết SQL nhiều nhất |
| Sandbox | Có | Viết tự do, dễ mắc nhất |
| Drill General, drill ôn, Practice | Có, trừ khi đang mở gợi ý khung (`frameOf`) | Drill có `trap` riêng; lint chỉ bổ sung khi đã đạt |
| Lab Postgres trong Engine (`check: rows | plan`) | Có | "Engine labs" là các lab SQL |
| Lab `catalog` (DDL), index lab ch11, bước index lab | Không | Không phải SELECT; Q-rule không áp dụng |
| Đánh giá thăng tiến, phòng phỏng vấn | **Không** | Như thi: không ai nhắc giữa bài thi |
| "Thử ngay" trong bài học nhanh | Không | Bài 1 phút, thêm một thẻ là quá tải |
| Lab MongoDB/DynamoDB | Không | 10 luật đều là SQL. Không đặt ra luật NoSQL ở bản này |
| Người chơi đang ở bước tour của Boon | Không | Một linh vật mỗi vùng (`boonRegion()`) |
| Câu còn `___` | Không | Đã có `sqlerr.blank` |

### 5.3 Khi nào hiện, theo kết quả chấm

Boon nhắc không bao giờ được thành gợi ý đáp án miễn phí. Thứ tự lời trong vùng Boon:

1. Ghi chú lỗi SQLSTATE (lần chạy lỗi): **không lint**.
2. **Nộp sai** và khớp một `wrong:` → lời giải thích `wrong:`, **không lint**.
3. Nộp sai, không khớp `wrong:` → bẫy của kỹ năng (có sẵn), **không lint**.
4. **Run trên một việc chưa đạt**: **không lint**. Một Run trả rỗng kèm lời nhắc Q02 chính là gợi ý miễn phí.
5. **Nộp đúng**, Run/nộp lại một việc **đã đạt**, Sandbox, drill đã đạt, lab Engine đã đạt bước → được lint.

Vì sao bước 3 và 4 cũng im lặng: một luật "sai âm thầm" như Q02 có thể chính là lý do người chơi sai. Khi đó lint sẽ là gợi ý miễn phí, và Practice/story đã có giá gợi ý (25 %). Sau khi đạt, Boon nhắc vẫn dạy được: "câu này đúng vì hôm nay dữ liệu không có NULL".

### 5.4 Mười luật

Mọi luật đọc **cây parse thô** của `libpg-query`, không đọc `WordPart[]` của "SQL bằng lời": cây đó chỉ đọc được khoảng 73 % Solution, không có CTE, UNION hay window. Lint đi hết cây, kể cả CTE và subquery.

| Ưu tiên | Luật | Dấu hiệu trong cây | Lọc thêm (ít báo nhầm) | Loại |
|---|---|---|---|---|
| 1 | **Q02** NOT IN (subquery) | `BoolExpr NOT` bọc `SubLink` kiểu `ANY` | Không có `WHERE … IS NOT NULL` trên cột đó trong subquery | sai âm thầm |
| 2 | **Q01** `= NULL` | `A_Expr` `=`/`<>`/`!=` có một vế là `A_Const` null | Không | sai âm thầm |
| 3 | **Q06** lọc bảng phải sau LEFT JOIN | `JoinExpr` LEFT, `WHERE` có điều kiện trên alias bên phải không phải `IS NULL` | Bỏ qua khi điều kiện nằm trong `OR … IS NULL` | sai âm thầm |
| 4 | **Q12** `BETWEEN` với timestamp | `A_Expr` `BETWEEN` trên `ColumnRef` | Main lọc lại: cột có kiểu `timestamp`/`timestamptz` theo `erMeta(schema)` (worker trả ứng viên `{ rule, column }`) | sai âm thầm |
| 5 | **Q13** chia số nguyên | `A_Expr` `/` mà hai vế đều là `count(…)`/`sum` trên cột nguyên, không `::numeric`/`* 1.0`/`100.0 *` | Chỉ khi cả hai vế là hàm gộp đếm | sai âm thầm |
| 6 | **Q15** HAVING không có aggregate | `havingClause` không chứa `FuncCall` gộp | Không | hiệu năng/đọc |
| 7 | **Q10** LIMIT không ORDER BY | `limitCount` có, `sortClause` rỗng, ở câu ngoài cùng | Bỏ qua `LIMIT 0`, và bỏ qua khi câu là `SELECT … LIMIT n` không FROM | kết quả không ổn định |
| 8 | **Q11** hàm bọc cột trong WHERE | `FuncCall` (`date_trunc`, `extract`, `lower`, `upper`, `trim`, `::date`) bọc `ColumnRef` ở vế so sánh của `WHERE` | Main lọc lại: cột đó là **cột đầu của một index có thật** trong schema (`pg_indexes`, một lần mỗi schema, `memoByKey`). Không có index thì sargable không đổi gì, nên không nhắc | hiệu năng |
| 9 | **Q22** `GROUP BY 1` / `ORDER BY 2` | Mục là `A_Const` số nguyên | **Không có trong `LINT_ON` ở v25** (xem §5.5): nội dung đang dạy và dùng số thứ tự. Thẻ Q22 vẫn có | phong cách |
| 10 | **A05** `CURRENT_DATE`/`now()` | `SQLValueFunction` hoặc `FuncCall now` | Không. Lời nhắc nói "dữ liệu dừng ở 31/10/2026; viết ngày cụ thể" | sai âm thầm (theo ngày) |

### 5.5 Chính sách báo nhầm

1. **Solution sạch.** Một luật không bao giờ nhắc ở một việc mà Solution (mọi biến thể, mọi bước) của việc đó vi phạm luật ấy.
   - `EXEMPT` (danh sách `(ticketId, rule)`) được sinh bởi script test và nằm trong chunk `bpindex` (§10), nơi `bpTip` đọc nó. Test so bản trong chunk với tập vi phạm đo lại.
   - Đo thô hôm nay (grep, 2026-11-20): `GROUP BY <số>`/`ORDER BY <số>` có trong khoảng 57 file nội dung (47 file có `ORDER BY <số>`, 29 file có `GROUP BY <số>`), trong khi chỉ có 148 file việc + 114 drill + 28 node. Q22 chắc chắn vượt trần 5 % ở mục 2, nên **Q22 tắt ở v25**. Nó chỉ được bật khi luồng nội dung bỏ số thứ tự khỏi Solution, việc này không thuộc v25.
   - Q11: Solution `lower(trim(email))` của `adv.yml` không bị nhắc, vì cột đó không có index (bộ lọc của luật).
   - Q10, Q12, Q13, Q15: chưa đo. Trần 5 % quyết định ở v25.
   - Luồng nội dung **không** phải sửa các Solution này.
2. **Trần miễn.** Một luật bị miễn ở > 5 % Solution thì không được bật: nó quá ồn. Test fail cho tới khi luật được thu hẹp.
3. **Cặp của chính mục.** `pair.bad` của mục có `lint` phải kích luật, `pair.good` thì không. Thêm ≥ 3 câu dương và ≥ 3 câu âm mỗi luật trong `tests/bpLint.test.ts`.
4. **Công tắc một chỗ.** `LINT_ON` (mảng id trong `bpLint.ts`): bỏ một id là tắt luật cho mọi người, không đụng nội dung. Review sau version (L217) thấy luật nào bị người chơi tắt nhiều (đọc từ pref của máy test, không có telemetry) hoặc báo nhầm thì bỏ khỏi `LINT_ON` ở luồng R.
5. **Không nhắc lại.** Một luật đã hiện ở một việc thì không hiện lại ở việc đó (`seen` = `rule@ticketId`). Ở Sandbox thì một lần mỗi luật mỗi phiên.
6. **Câu nhắc nói "có thể".** Với Q10, Q11: "Câu này chạy đúng. Nếu…, nên…". Không bao giờ nói "sai" khi kết quả đúng.

### 5.6 Hiển thị và đóng (mockup 02)

- **Vị trí:** ngay dưới dòng phản hồi Run/Submit, trên thanh tab. Không che bảng kết quả. Ở 375 nằm dưới hàng nút dính.
- **Nội dung:**
  - nhãn "BOON NHẮC" (`text-caption` 800);
  - một hoặc hai câu `lint.tip`;
  - link "Vì sao? (thẻ Q02)" → dialog mục (§2.4). Dialog do BP-UI xuất (`openBestDialog(id)` trong `engineBest.ts`); BP-LINT chỉ gọi;
  - link "Đừng nhắc luật này";
  - nút × "Ẩn".
- **Không tự cướp focus.** Câu nhắc được nối vào câu `announce()` của lần chạy: "… Boon nhắc: …". Không có `aria-live` thứ hai.
- **Đóng:**
  - × → ẩn; lần chạy sau ở việc này không hiện lại luật đó.
  - "Đừng nhắc luật này" → luật vào `mute`, kèm dòng "Đã tắt nhắc Q02 · Hoàn tác" 5 s (`role=status`).
  - Sửa editor rồi chạy lại mà không còn vi phạm → thẻ tự mất, đếm `fixed` (§7.3).
- **Tắt hẳn:**
  - công tắc "Boon nhắc khi viết SQL" ở đầu `#/engine/best`;
  - "Bật lại Boon nhắc" ở cùng chỗ (xóa `mute`).
  - Không thêm vào menu `⋯` (`topbar.ts` không phải file của luồng này).
- **Pref thiết bị** `cargo-query/bp-tips` = `{ off: boolean, mute: string[], seen: string[], fixed: number }`, parse bằng `parseBpTips` (bỏ dữ liệu hỏng, `seen` ≤ 500 mục, mới nhất giữ lại). Không vào Save, như `cargo-query/guides`.
- **Người mới:** chương 1 Logistics chỉ bật Q01 và A05. Đủ 7 luật còn lại (8 trừ Q22 đang tắt) từ khi có `knownSkills` ≥ 3. Mục đích là không dội lời nhắc vào người đang học SELECT.

### 5.7 Luồng kỹ thuật (để luồng code chia file)

1. `src/viz/bpLint.ts` (thuần, cùng nhóm `steps`/parser): `bpLint(tree) → { rule, column? }[]`.
2. `src/viz/steps.ts` gọi nó trong nhánh `WORDS_ONLY`, và trả thêm trường tùy chọn `bp?` cạnh `words` (fixture cũ không phải sửa).
3. `src/ui/sqlWordsView.ts` đã nhận phản hồi đó. Nó chuyển `bp` qua một hook `onBp(list, sql)`.
4. Main chỉ giữ **chỗ gắn + hook** (`bpSlot`, vài dòng). Lần đầu `bp` khác rỗng, main `import()` `src/ui/bpTip.ts` (chunk lười `bptip`). Chunk này lo các việc sau:
   - lọc theo vị trí, kết quả chấm, pref, `EXEMPT` (từ `bpindex`), `erMeta`/index;
   - chọn một luật theo ưu tiên;
   - `import()` chunk nội dung track SQL để lấy `tip`, rồi vẽ thẻ.

   Thẻ hiện chậm hơn kết quả vài chục ms ở lần đầu, chấp nhận được vì nó không chặn gì.
5. `src/ui/work.ts` chỉ thêm một chỗ gắn `bpTip.slot()` trong vùng Boon, và truyền trạng thái chấm. Một dòng, do BP-LINT sở hữu trong v25.

---

## 6. Quiz

- **Mỗi mục ≥ 1 câu** (V1 `quiz`, `answer` từ 0, lựa chọn theo `optionOrder(id + '#q<i>')`). Dùng trình chấm `quiz` của `engineui` (E-UI v22), không viết lại.
- **Dạng câu** (theo `check`):

  | `check` | Câu |
  |---|---|
  | `diff` | "Câu nào trả đúng …?": lựa chọn là bản Không nên / bản Nên / "như nhau" |
  | `plan` | "Kế hoạch nào đọc bảng qua index?" hoặc "Index nào giúp câu này?" |
  | `error` | "Câu này báo lỗi gì?" |
  | `same`, `syntax` | Câu tình huống: "Bảng nhận 10 000 lượt ghi/giây vào một khóa; nên làm gì?" (D03) |

- **Xong khi** đúng mọi câu, thử lại không giới hạn. Sau lần sai thứ 2 thì hiện `why` của lựa chọn đúng (như `concept`).
- **"Chạy cả hai" không bắt buộc** trước câu kiểm, nhưng câu `diff` đặt **sau** nút. Như vậy người học tự thấy kết quả trước khi trả lời. Câu không lộ số đo.
- **Kiểm nhanh track:** cuối lưới track có nút "Kiểm nhanh 5 câu". Nút này lấy ngẫu nhiên 5 câu từ các mục **đã xong** của track, 0 XP, không lưu. Đây là ôn tập; Leitner để sau v30 (ADD-6 của thiết kế Engine).

---

## 7. Tiến độ và giá trị

### 7.1 Câu giá trị

- **Mỗi track** có `after` (`tracks.yml`), hiện ở đầu lưới: "Sau khu này bạn tránh được …".
- **Mỗi mục** có `avoid`, hiện trên thẻ lưới và cuối trang mục.
- Câu phải kiểm được bằng chính câu kiểm hoặc cặp "Chạy cả hai" của mục (cổng Product, §11.3).

### 7.2 Lưu gì

| Thứ | Quyết định |
|---|---|
| `completed` | `e-bp-<mã>` khi đúng câu kiểm. Mẫu id `ENGINE_ID` có `bp` (§4.1). **Không bump Save** |
| XP | +5 lần đầu, như `concept`/`quiz` của Engine. Kiểm nhanh: 0 |
| Nháp, lịch sử, `graded` | Không có (trang đọc) |
| Leitner | Không có ở bản này |
| Lily | Không đổi giai đoạn (đo kỹ năng SQL). Không reo ở Best Practice: track xong chỉ có `doneBadge()` |
| `#/me` | Khối Engine (hook có sẵn của §7.4 thiết kế Engine) thêm một dòng: "Best Practice: 9/33 SQL, 2/35 PostgreSQL · Boon nhắc: bạn đã sửa 5 lần" |

### 7.3 Đo giá trị không cần backend

- `fixed` trong pref đếm số lần người chơi sửa một câu sau khi được nhắc. Điều kiện: câu chạy lại thành công ở cùng việc và không còn luật đó.
- Đây là con số duy nhất nói "Boon nhắc có ích", và chỉ nằm trên máy người chơi.
- Product dùng nó ở review sau version (L217): chạy e2e với một save mẫu và kiểm tra luồng nhắc → sửa → mất thẻ có chạy không.

---

## 8. Trợ năng

| Chỗ | Luật |
|---|---|
| Tab track | `role=tablist`, mỗi tab là link, `aria-selected`, phím ←/→ chuyển, Enter mở |
| Chip lọc | `<button aria-pressed>`, ≥ 24 px (44 px ở điện thoại) |
| Cặp Không nên / Nên | Tiêu đề pane là `<h3>` có icon `aria-hidden` + chữ. Không dựa vào màu |
| Kết quả "Chạy cả hai" | Câu kết luận `role=status`, đọc **một lần** sau khi cả hai bản xong. Không đọc từng pane |
| Bảng 3 dòng | `<table>` có `<caption>` ẩn ("3 dòng đầu, bản Nên"). Khung cuộn có `tabindex=0` (L179) |
| Boon nhắc | Nối vào `announce()` của lần chạy; nút × có `aria-label="Ẩn lời nhắc"`. Hai link ≥ 24 px; ở 375 thành nút cao 36 trong vùng chạm 44. Không bẫy focus |
| Dialog "Vì sao?" | `<dialog>` không modal như notebook: focus vào tiêu đề, Esc đóng (chỉ khi nó sở hữu Esc theo `escOwned()`), focus trả về link |
| Mã | `lang="en"` trên `pre`/`code` |
| Ngôn ngữ | Mọi chữ khung qua `et()` (`src/i18n/engine.ts`); nội dung qua `textOf` kiểu V1 |
| Chuyển động | Không có chuyển động mới. Trang đọc fade như mọi trang (`#home[data-enter]`); thẻ Boon nhắc không trượt vào |

---

## 9. Hai theme

- **Chỉ dùng token v7** (UX spec §1.1). Không hex mới:
  - "Không nên": `--bad` / `--bad-soft`;
  - "Nên": `--good` / `--good-soft`;
  - kết luận khác kết quả: `--warn-soft` + `--text`;
  - Boon nhắc: `--sun` / `--sun-ink`.
- **Tương phản đã có trong bảng UX spec §1.2.** Các cặp `--sun-ink`/`--sun` và `--bad`/`--panel` (viền pane, nét mang nghĩa ≥ 3:1) thêm vào `tests/theme.test.ts` nếu chưa có.
- **Mã tô màu tĩnh** dùng `--syn-*` sẵn có cho cả hai theme. Thẻ trang đọc **không** tạo CodeMirror.
- Mockup có đủ hai bản sáng/tối.

---

## 10. Ngân sách (gzip -9)

| Nhóm | Nội dung | Trần đề xuất | Ước lượng |
|---|---|---|---|
| main | Route `best` (nếu E-FND chưa có), chỗ gắn + hook `bpSlot` | **+0,3 KB** | 0,2 |
| `bptip` (mới, lười) | `bpTip.ts`: lọc, chọn luật, vẽ thẻ, pref `cargo-query/bp-tips`, hoàn tác | 4 | ~2,5 |
| `engineui` | `src/ui/engineBest.ts` (lưới, trang mục, Chạy cả hai, Kiểm nhanh) + khóa `et()` | trần 20 giữ nguyên; luồng ghi số đo | +4 |
| `steps` (nhóm parser) | `bpLint.ts` | trong 410 hiện có | +1,2 |
| `bpsql` (mới) | 33 mục Q + A + `tracks.yml` | 20 | ~16 |
| `bppg` (mới, v25) | 35 mục S I P X | 20 | ~17 |
| `bpmg` (v27), `bpdy` (v29) | 14 / 13 mục | 10 / 10 | ~7 / ~6 |
| `bpindex` (mới) | Chỉ mục nhỏ `{ id, track, skills, title }` + `EXEMPT` + `lint.tip` của 10 mục, để chip trang kỹ năng, lưới và Boon nhắc không phải tải cả track | 4 | ~3 |

- `learnui` chỉ thêm chip kỹ năng (≈ 0,2 KB). Nó đọc `bpindex` qua `DrillDeps`, không import giá trị từ main (luật Plan 6 U3).
- Mỗi luồng **nối một dòng** nhóm vào `scripts/check-budget.mjs` trong commit gộp của luồng đó.

---

## 11. Test

### 11.1 Mới

| File | Kiểm |
|---|---|
| `tests/bestPractice.test.ts` | Mọi luật nội dung §4.3. Cụ thể: chạy `bad`/`good` trên PGlite (schema `lab` hoặc `engine` + `setup`; mục `plan` sau `VACUUM ANALYZE` một lần như script của catalogue, vì I04 cần visibility map) hoặc mingo, rồi khẳng định `check` + `expect`. Đây chính là script kiểm của catalogue, thành test thật |
| `tests/bpLint.test.ts` | Mỗi luật ≥ 3 câu dương, ≥ 3 câu âm. `pair.bad` kích và `pair.good` không kích. Chạy lint trên **mọi** Solution (3 domain, mọi biến thể, mọi bước), 114 drill + 28 node nâng cao, ví dụ/đáp án bài học, `solution` lab Engine: tập vi phạm phải bằng `EXEMPT`, mỗi luật miễn ≤ 5 %. Không ném trên câu lạ (WITH, UNION, window, DDL) |
| `tests/bpTip.test.ts` | Thứ tự ưu tiên §5.3: nộp sai + `wrong:` → không lint; nộp sai không `wrong:` → không lint; Run trên việc chưa đạt → không lint; Run lại việc đã đạt → lint; đánh giá, phỏng vấn, index lab, Thử ngay → không lint; chỉ một thẻ; `seen`/`mute`/`off` có tác dụng; gate người mới; `parseBpTips` bỏ dữ liệu hỏng; `fixed` chỉ tăng khi chạy lại thành công mà hết vi phạm |
| `tests/save*.test.ts` | Fixture có `e-bp-q02` trong `completed`: đọc → ghi → đọc giữ nguyên (cùng fixture `save-v5-engine.json` của E-FND nếu `bp` vào từ v22) |

### 11.2 Mở rộng

- `tests/noDeadEnds.test.ts`: route `#/engine/best…`; track phát hành có mục; không "sắp có".
- `tests/i18n.test.ts`: quét `content/engine/best/**`, cấm "boss".
- `tests/theme.test.ts`: cặp ở §9.
- `tests/axe.test.ts` + `scripts/smoke.mjs`: thêm `#/engine/best/sql`, `#/engine/lesson/e-bp-q02`, `#/engine/lesson/e-bp-i04` (mục `plan`).

### 11.3 Cổng Product (thêm vào §8 thiết kế Engine)

Một track chỉ phát hành khi:

1. Mọi mục có `avoid` và câu kiểm, và test `bestPractice` xanh trên runtime thật.
2. Mọi mục có thể chạy thì có `runtime ≠ none`. Mục `none` có lý do trong catalogue (cột "Kiểm: cú pháp").
3. **"Giải mù" thu nhỏ:** một agent mới chỉ thấy trang mục, chưa bấm "Chạy cả hai", trả lời câu kiểm. Nếu agent trả lời đúng mà không cần hiểu luật (câu hỏi lộ đáp án) thì sửa câu.
4. Boon nhắc: e2e chạy một câu vi phạm Q02 ở Sandbox, thấy thẻ, bấm "Vì sao?", đóng, sửa, chạy lại thì thẻ mất.

---

## 12. Kế hoạch v25 (file tách nhau)

Đặt trong v25 của `roadmap-v22-v30.md`, thay cho dòng **E-BP** (một dòng thành bốn luồng). Luồng R, C-PG4, E-VIZ, MG-RT, V22-A giữ nguyên.

| Luồng | Nội dung | File (chỉ luồng này sửa trong v25) | Cỡ | Phụ thuộc |
|---|---|---|---|---|
| **BP-C** (agent Research/nội dung, không build) | Chuyển 33 mục Q + A và 35 mục S I P X của catalogue thành file theo §4. Viết `avoid`, `quiz`, `lint.tip` cho 10 mục. Bắt đầu viết trước từ v23 trong worktree riêng, gộp ở v25 | `content/engine/best/tracks.yml`, `content/engine/best/sql/**`, `content/engine/best/postgres/**` | L | Không. Kiểm bằng `tests/bestPractice.test.ts` của BP-T khi gộp |
| **BP-T** (test + parser) | ADD-8 trong parser (`engine: best`, `track`, `pair`, `avoid`, `lint`, `skills`, `adv`, id `e-bp-<mã>`); bộ nạp lười `bpsql`/`bppg`/`bpindex`; test nội dung chạy cặp trên PGlite; `ENGINE_ID` có `bp` nếu v22 chưa làm | `src/engine/content.ts` (nhánh `best`), mới `src/engine/best.ts`, `src/bestSources.ts`, `tests/bestPractice.test.ts`, `tests/fixtures/` (chỉ thêm), `src/save.ts` (một dòng, chỉ khi cần) | M | Làm đầu v25. BP-UI và BP-LINT dùng kiểu của nó |
| **BP-UI** (trang + quiz) | Route `best` (nếu E-FND chưa có), lưới track, trang mục, "Chạy cả hai" (`lab` + `engine`; `engine-hb` chỉ khi v24 đã có H-B), Kiểm nhanh, dòng `#/engine`, nhóm sidebar, link trang engine, chip trang kỹ năng, khối `#/me` | mới `src/ui/engineBest.ts`; `src/i18n/engine.ts` (khối khóa `best.*`); file sidebar và trang tổng quan của E-UI (tên do E-UI v22 đặt; một nhánh mỗi file); export `openBestDialog`; `src/ui/learnView.ts` (một chỗ chip); `src/route.ts` (chỉ khi thiếu) | M | BP-T |
| **BP-LINT** (Boon nhắc) | `bpLint.ts`, trường `bp` trong phản hồi `WORDS_ONLY`, `bpTip.ts`, một chỗ gắn trong `work.ts`, pref `cargo-query/bp-tips`, công tắc trên `#/engine/best` (qua hook xuất từ `bpTip.ts`, để BP-UI chỉ gọi) | mới `src/viz/bpLint.ts`, `src/ui/bpTip.ts` (chunk `bptip`), chỗ gắn `bpSlot` trong main, `tests/bpLint.test.ts`, `tests/bpTip.test.ts`; `src/viz/steps.ts` (nhánh `WORDS_ONLY`), `src/ui/sqlWordsView.ts` (hook), `src/ui/work.ts` (một dòng) | M | BP-T cho `lint.tip`. Có thể bắt đầu song song, dùng fixture chữ tạm |

**Xung đột file:**

- `work.ts` thuộc E-WS ở v22. Ở v25 chỉ BP-LINT sửa (một dòng); không luồng v25 nào khác chạm vào.
- `steps.ts` và `sqlWordsView.ts` không có chủ khác ở v25.
- `src/i18n/engine.ts`: BP-UI thêm một khối khóa riêng; C-PG4 không sửa file này.
- `scripts/check-budget.mjs`: mỗi luồng nối một dòng (BP-T: `bpsql`, `bppg`, `bpindex`).

**Sau v25:**

| Version | Luồng | File |
|---|---|---|
| v27 | **BP-MG**: track MongoDB (`runtime: mingo` cho 4 mục, `none` cho 10), chunk `bpmg` | `content/engine/best/mongodb/**`, một dòng trong `src/bestSources.ts` |
| v29 | **BP-DY**: track DynamoDB; luồng nội dung chọn mục chạy được trên dynoxide, còn lại `none` | `content/engine/best/dynamodb/**`, một dòng trong `src/bestSources.ts` |
| v26 trở đi | Luồng R của từng version: bỏ luật lint ồn khỏi `LINT_ON` theo review | `src/viz/bpLint.ts` |

**Thoát v25 (phần Best Practice):**

- Cổng chung.
- Mọi luật §4.3 và §5.5 xanh.
- 68 mục SQL + PostgreSQL phát hành; mục `engine-hb` phát hành ở `none` nếu H-B v24 chưa đạt, và ghi lý do vào L.
- e2e Boon nhắc (§11.3 mục 4).
- Ảnh 1280/1024/375/320 sáng/tối của `#/engine/best/sql` và một trang mục đi qua `ux-deploy-checklist.md`.

---

## 13. Số L

- Số cao nhất đã dùng trong `decision-log.md` là **L219**.
- L220–L239 đã giữ cho v22–v24 (`roadmap-v22-v30.md` §3).
- Best Practice nằm trong dải v25 (**L240–L245**, dùng chung với Postgres L4 và runtime Mongo).

| L | Nội dung | Luồng |
|---|---|---|
| L240 | ADD-8: `engine: best`, id `e-bp-<mã>`, `track`, `pair`, `avoid`, `lint`; `ENGINE_ID` có `bp` (hoặc ghi rằng đã vào từ v22) | BP-T |
| L241 | Vị trí `#/engine/best` + tab track; phát hành SQL + PostgreSQL; số đo nhóm `bpsql`/`bppg`/`bpindex`/`engineui`; mục `engine-hb` nào phát hành ở `none` | BP-UI + BP-C |
| L242 | Boon nhắc: 10 luật định nghĩa, 9 bật (Q22 tắt tới khi nội dung bỏ số thứ tự), `LINT_ON`, `EXEMPT` thật đo được, ưu tiên §5.3, gate người mới, pref `cargo-query/bp-tips` | BP-LINT |
| L243–L245 | Còn lại cho Postgres L4 và runtime Mongo | (không thuộc tài liệu này) |

- Mongo: một L trong dải v27 (L252–L257). Dynamo: một L trong dải v29 (L263–L267).
- Nếu v25 cần nhiều hơn 6 số, người điều phối dời theo luật §3 của roadmap. Tài liệu này chỉ cần 3.

---

## 14. Câu hỏi mở (người điều phối chốt theo L215 nếu user không trả lời)

| # | Câu hỏi | Khuyến nghị |
|---|---|---|
| BP-1 | `bp` vào `ENGINE_ID` ngay ở v22 (E-FND)? | Có: tránh mở lại `save.ts` ở v25 |
| BP-2 | Boon nhắc ở E-com/Finance story? | Có (cùng luật, không nhắc domain trong chữ nhắc) |
| BP-3 | Gate người mới (chỉ Q01 + A05 tới khi `knownSkills` ≥ 3) | Giữ. Đổi được bằng một hằng |
| BP-4 | Kiểm nhanh có thẻ Leitner? | Không ở v25 (ADD-6 sau v30) |
| BP-5 | Lint cho MongoDB (vd. `$match` sau `$group` khi lọc được trước, M09) | Không trong vòng v30: chưa có cây parse ổn định (mongoShell chỉ đọc lệnh), và rủi ro nhắc sai |
