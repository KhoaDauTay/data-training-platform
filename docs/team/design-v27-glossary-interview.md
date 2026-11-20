# v27: Thuật ngữ Engine và phòng phỏng vấn Engine (Product + UX, vòng 12)

Track nghiên cứu/thiết kế (L215.6). Chỉ là tài liệu: không code app, không build. Tài liệu đầu vào:

- Roadmap v27: `git show v22-engine:docs/team/roadmap-v23-v30-revised.md`, mục "v27".
- Phòng phỏng vấn General: `docs/team/interview-room.md`, L144, L147.
- Thiết kế lại khu Engine: `v22-rc:docs/team/engine-redesign-v22.md`, L280–L282.
- Sư phạm Engine: `docs/team/engine-pedagogy.md` P1–P6.

Bản kiểm dữ liệu chạy bằng script nháp `scratchpad/r12/audit.mjs`. Script chỉ đọc. Nó đọc:

- `content/engine/glossary.yml` và `content/engine/interview-bank.yml` trên `main`;
- 195 bài Engine trên `v22-rc`;
- 130 thẻ Best Practice trên `main`.

Mockup: `docs/team/v27-mockups/` (ba SVG, giao diện sáng, token của `src/style.css`).

---

## 0. Quyết định đề xuất (tóm tắt)

| # | Quyết định | So với roadmap v27 |
|---|---|---|
| Q1 | Trang thuật ngữ ở `#/engine/terms`, link sâu `#/engine/terms/<slug>`. Không thêm tab vào sổ tay (notebook). | **Giữ** route của roadmap; thêm link sâu |
| Q2 | Trong bài: lần đầu một thuật ngữ xuất hiện thì có `<button>` mở popover (Popover API `popover="auto"`). Mở bằng bấm, chạm hoặc Enter; **không mở khi hover**, không dùng `title`. Chỉ thuật ngữ có cấp ≥ cấp của bài mới thành nút. Mọi thuật ngữ của bài vào một danh sách "Thuật ngữ trong bài" ở cuối bài. | **Giữ** nút + popover; thêm luật lọc theo cấp |
| Q3 | Glossary cần thêm trường `match:` (các cách viết để nhận ra từ trong bài) cho mục ghép. `id` = slug của `term`, sinh lúc build và có test không trùng. | **Mới**: roadmap chưa nói cách nhận ra từ |
| Q4 | Số thuật ngữ: **270** (bản `main`), không phải 231 (bản `v22-rc`, con số roadmap đếm). Thoát v27 = 270 có trang. | **Đổi** "231+" thành 270 |
| Q5 | Phòng phỏng vấn Engine là **trang đọc**, không phải workspace: hầu hết câu là câu trả lời viết, tự chấm. Route `#/engine/interview[/<set>]`. 0 XP. Pref `cargo-query/engine-interview`, không vào Save. `parseSave` bỏ mọi id `e-iv-`. | **Giữ** route, pref và 0 XP. Không dùng `takeHomeTicket` |
| Q6 | 180 câu chia thành **36 bộ × 5 câu** (3 engine × 4 band × 3 bộ). Bộ ghi bằng trường `set:` trong YAML, **không** cắt theo số thứ tự: các câu `diagnose` đứng liền nhau trong mỗi ô, nên cắt 1–5 / 6–10 / 11–15 sẽ cho một bộ toàn `concept`. | **Mới** |
| Q7 | Chạy được chỉ có ở Postgres: 16 câu với 23 exhibit `pglite-0.5.16`, nút "Chạy lại trên PGlite" chạy qua pglab. MongoDB (4 trích docs, 10 minh họa) chỉ để đọc, có nhãn nguồn rõ. DynamoDB (12 `aws-rules`) hiện bảng "Cách tính" từ `calc`. App **không** `eval` chuỗi `expr`; test Node mới chạy chúng. Không hứa chạy trên mingo hay dynoxide. | **Giữ** exhibit pglite chạy lại; nói rõ hai engine còn lại |
| Q8 | Trước khi xem đáp án mẫu, người học viết câu trả lời của mình (hoặc bấm "Bỏ qua, xem đáp án", được ghi là bỏ qua). Sau đó đáp án mẫu hiện **cạnh** câu của người học, kèm rubric để tự tích. | **Mới**, theo §3 |
| Q9 | Ôn giãn cách: câu tự chấm < 60% vào danh sách "Xem lại", hiện lại sớm nhất **sau 1 ngày** (ngày thật trên máy, `localDay`). Dữ liệu ở pref, không có thẻ Leitner trong Save. | **Mới** |
| Q10 | Đo việc dùng nút thuật ngữ (cho `review-v27.md`) bằng pref `cargo-query/engine-terms` `{ opened: { [id]: n }, page: n }`. Chỉ đếm, không SQL, không Save. | **Giữ**, nêu tên pref |

---

## 1. Thuật ngữ Engine

### 1.1 Ở đâu

**Trang `#/engine/terms` (Q1).** Không làm tab trong sổ tay, vì:

- sổ tay là glossary theo domain (`content/glossary.yml`, có `columns`). Nó lọc theo domain đang mở và không hiện trên trang General (v15 Q5);
- 270 mục với bộ lọc và tìm kiếm không vừa một `<dialog>` không modal;
- trộn hai glossary làm hỏng luật "một icon = một đích".

Sổ tay chỉ thêm một dòng "Thuật ngữ Database Engine →" khi trang đang mở là `#/engine…`.

- **Breadcrumb:** Database Engine › Thuật ngữ. `h1` "Thuật ngữ" (mẫu `learnSub`, engine-redesign v22).
- **Sidebar Engine:** thêm một dòng "Thuật ngữ" (icon sách, `NAV_ICON` không trùng), dưới ba engine.
- **Route:** `engineRouteOf` chỉ nhận `postgres|mongodb|dynamodb` sau `#/engine/`, nên `#/engine/terms` hiện rơi về trang tổng quan. Cần parser riêng `engineTermsOf(hash)` theo mẫu `enginePathOf`, chạy **trước** `engineRouteOf`. Test route trong `tests/boundary.test.ts`.

### 1.2 Trang thuật ngữ (mockup `v27-mockups/terms-page.svg`)

- **Thanh lọc** (dính dưới breadcrumb trên màn rộng; một `<details>` "Lọc" trên điện thoại):
  - ô tìm kiếm `<input type="search">`. Tìm theo `term`, `vi_term` và `match`. Không phân biệt hoa thường và dấu (`normalize('NFD')` bỏ dấu, `đ → d`);
  - ba chip engine dạng `<input type="checkbox">`, có icon engine của v22. Mặc định là engine của trang trước; vào thẳng thì cả ba;
  - năm chip cấp L1–L5, cũng là checkbox;
  - dòng kết quả "42 thuật ngữ" là `role="status"`.
- **Danh sách:** nhóm theo cấp (L1 trước), trong nhóm xếp theo `term`. Mỗi mục là một `<article id="<slug>">` gồm:
  - `term` (EN) đậm; `vi_term` khi khác `term`;
  - chip engine, chip cấp;
  - giải thích `vi`/`en` theo ngôn ngữ đang chọn;
  - dòng "Tránh dịch: …" (`avoid`), chỉ ở VI;
  - hàng link: **"Dạy ở: <tên bài>"** (bài đầu tiên nhắc tới từ này, §1.4), "Gặp trong N bài" (`<details>` liệt kê), **thẻ Best Practice** (tối đa 3), "Docs chính thức ↗".
- **Link sâu** `#/engine/terms/<slug>`: cuộn tới mục đó và đặt focus lên tiêu đề (`tabindex="-1"`). Bộ lọc đang ẩn mục đó thì được nới ra.
- **Tự kiểm (tùy chọn, rẻ):** công tắc "Che giải thích" chuyển mỗi giải thích thành `<details>`, mở ra mới thấy. Lý do ở §3.2: tra cứu không phải luyện nhớ. Không lưu điểm.
- **Trống:** `emptyState(icon, "Không có thuật ngữ nào khớp", "Bỏ lọc")`.

### 1.3 Nút thuật ngữ trong bài (mockup `v27-mockups/term-popover.svg`)

- **Điểm móc duy nhất:** `inline()` trong `src/ui/engineView.ts` (dòng 96 trên `v22-rc`). Mọi đoạn văn, mục tiêu, câu hỏi, bước lab và gợi ý đều đi qua hàm này. Lần đầu một thuật ngữ khớp trong bài (cả trong code span, ví dụ `work_mem`, `$lookup`), đoạn chữ đó thành:
  `<button type="button" class="term" popovertarget="tp-<slug>" aria-expanded="false">chữ gốc</button>`.
  Nút trông như chữ thường có gạch chân chấm (`text-decoration: underline dotted`, màu `--accent`). Vùng chạm ≥ 24 px nhờ `padding-block`.
- **Lọc theo cấp (Q2):** trung vị là 10 thuật ngữ khác nhau mỗi bài (p90 15, tối đa 22; script đo trên 195 bài). Biến cả 10 thành nút thì đoạn văn rối. Nên chỉ thuật ngữ có `level` ≥ cấp của bài mới thành nút: trung vị 3, p90 7, tối đa 13 nếu chỉ tính cùng cấp. Thuật ngữ cấp thấp hơn coi như đã học. Mọi thuật ngữ của bài vẫn có trong `<details>` "Thuật ngữ trong bài (10)" trước "Đọc thêm".
- **Popover** `<div popover="auto" id="tp-<slug>" role="dialog" aria-labelledby=…>` đặt **ngay sau nút** trong DOM, nên thứ tự đọc của trình đọc màn hình đúng mà không cần dời focus. Popover có:
  - `term` và `vi_term`;
  - chip cấp;
  - 1–2 câu giải thích;
  - "Xem trang thuật ngữ →", "Docs chính thức ↗".
- **Hành vi:**
  - `popover="auto"` tự đóng khi bấm ra ngoài hoặc nhấn Esc, mỗi lần chỉ mở một popover;
  - đồng bộ `aria-expanded` qua sự kiện `toggle`;
  - khi popover đóng, focus về nút nếu trước đó nằm trong popover;
  - Esc: trang Engine không có tour hay dock, nhưng `escOwned()` vẫn phải coi popover đang mở là chủ Esc, để không đóng thứ khác cùng lúc.
- **Không mở khi hover** (WCAG 1.4.13: nội dung hiện khi hover phải tắt được, rê chuột vào được và không tự mất). Điện thoại không có hover, nên một hành vi cho mọi máy là đơn giản nhất.
- **Vị trí:**
  - từ 640 px: dưới nút, `position: fixed`, tính bằng `getBoundingClientRect` một lần lúc mở (CSS anchor positioning chưa có ở mọi trình duyệt mục tiêu; kiểm lại ở v29);
  - dưới 640 px: tấm dính đáy màn hình, rộng hết trừ lề 16 px.
- **Dữ liệu chưa tải:** chunk thuật ngữ được tải song song với chunk bài, nên nút có sẵn khi bài vẽ xong (không giật). Chunk lỗi thì bài vẽ không có nút; không vòng thử lại.
- **Đếm:** mở popover thì `opened[slug]++`; mở trang thì `page++` (pref Q10, `parse…` kiểm khi đọc, tối đa 270 khóa).
- **Không có ở:** trang General, domain, workspace, phòng phỏng vấn (một câu phỏng vấn có nút giải thích từ thì lộ đáp án).

### 1.4 Link tới bài và thẻ Best Practice

Cả hai YAML **không có** trường nào trỏ tới bài (`e-pg-l…`) hay thẻ Best Practice (`e-bp-…`), nên **không có id treo**: grep cả hai file không ra kết quả. Link phải suy ra. Script đã đo hai cách:

| Cách suy ra | Thuật ngữ → bài | Thuật ngữ → thẻ BP | Câu phỏng vấn → bài | Câu phỏng vấn → thẻ BP |
|---|---|---|---|---|
| Ghép URL `doc` với `sources` của bài/thẻ | 199/270 | 136/270 | 155/180 | 111/180 |
| Nhận ra từ trong toàn văn bài/thẻ (alias, cùng engine) | 218/270 | 176/270 | — | — |

Đề xuất:

- **thuật ngữ → bài:** nhận ra từ bằng `match`. "Dạy ở" là bài cấp thấp nhất nhắc tới từ, và nếu cùng cấp thì bài có số thứ tự nhỏ nhất;
- **thuật ngữ → thẻ BP:** nhận ra từ (tối đa 3, ưu tiên thẻ cùng track engine);
- **câu phỏng vấn → bài:** ghép URL `doc`. Cách này ổn định hơn vì câu phỏng vấn dài, nhận ra từ thì quá nhiều kết quả.

Mọi link được tính **lúc build** hoặc lúc nạp chunk, không bao giờ ghi tay vào YAML. Test (§4.4) giữ ngưỡng phủ tối thiểu, để nội dung mới không làm tụt độ phủ mà không ai biết.

---

## 2. Phòng phỏng vấn Engine

### 2.1 Dùng lại gì của phòng General (L144, L147)

| Phần của General | Engine dùng lại? |
|---|---|
| Bộ đề 5 câu, đồng hồ tùy chọn (mặc định tắt), hết giờ chỉ là ghi chú và làm tiếp | **Có** |
| Đồng hồ chỉ tính lúc ở trong phòng (`presence`, `away`) | **Có**: dùng `elapsed`/`setPresence` (`src/interviewPrefs.ts`, thuần, import type) |
| 0 XP, không phạt, không ghi Save, id bị `parseSave` bỏ | **Có**: thêm regex `e-iv-` cạnh `INTERVIEW_ID` |
| Kết quả ở pref, `parse…` kiểm khi đọc | **Có**: `cargo-query/engine-interview` |
| Take-home có kết luận tự viết, rubric tự tích, không chấm máy | **Có** |
| Mỗi câu là drill SQL chấm bằng grader trong workspace `#/learn/play` | **Không**: 112 `concept` + 28 `design` là câu trả lời viết; 40 `diagnose` là đọc exhibit. Không có Solution để chấm |
| `takeHomeTicket` (các bước SQL có `ordered`) | **Không**: take-home Engine có `deliverables` + `model`; chỉ `e-iv-pg-th-1` có `fixture` + `queries` |

Vì vậy phòng Engine là **trang đọc** trong `<main id="home">` (mẫu `module` của `#/learn`), chunk riêng. Nó không đi qua `work.ts` và không có session mode mới.

### 2.2 Chia 180 câu thành bộ (Q6)

Mỗi ô engine × band có đúng 15 câu. Thứ tự loại câu trong từng ô (c = concept, x = diagnose, s = design, * = có exhibit pglite):

```
postgres/junior  ccccccccccx*x*x*x*s     mongodb/junior  ccccccccccxxxcs   dynamodb/junior  ccccccccxxxcccs
postgres/mid     cccccccccx*x*x*x*cs     mongodb/mid     ccccccccxxxcccs   dynamodb/mid     ccccccccxxxcccs
postgres/senior  cccccccx*x*x*x*cssc     mongodb/senior  cccccccxxxssccs   dynamodb/senior  cccccccxxxssccc
postgres/staff   ccscsccx*x*x*x*sscs     mongodb/staff   cccscccxxxssccs   dynamodb/staff   sscccscxxxssccs
```

- **Luật bộ** (test giữ):
  - mỗi bộ đúng 5 câu cùng engine và band;
  - ≥ 1 `diagnose`, ≤ 3 `concept`;
  - nếu ô có `design` thì ≥ 1 bộ có nó.

  Mọi ô có 3–4 `diagnose`, nên làm được. Ở Postgres, mỗi bộ có ≥ 1 câu chạy được.
- **Ghi rõ** `set: <engine>-<band>-<n>` (ví dụ `pg-mid-2`) trên từng câu. Sau này thêm hay đổi thứ tự câu không làm bộ bị xáo.
- **Tên bộ** sinh ra, không cần trường `title`: "PostgreSQL · Mid · Bộ 2".
- **Giờ gợi ý** theo band (một hằng số, không phải trường YAML): junior 15, mid 20, senior 25, staff 30 phút. Câu viết tay tốn 3–6 phút.
- **Thứ tự band trên trang:** junior → mid → senior → staff. Không khóa band nào, vì General không khóa gì (L82).

### 2.3 Luồng một câu (mockup `v27-mockups/interview-reveal.svg`)

1. **Đề:** chip loại câu ("Khái niệm" / "Chẩn đoán" / "Thiết kế"), đề `q`. Câu `diagnose` có các exhibit, mỗi cái một khối `pre` có nhãn và **chip nguồn**:
   - `pglite-0.5.16` → "Chạy thật trên PGlite 0.5.16". Có nút phụ "Chạy lại". Nút này tải pglab (như lab Postgres), chạy `fixtures.<fixture>` + `setup` (tách theo `;`) + `sql` trong một DB mới, rồi hiện kết quả cạnh `shown`. Khớp thì ✓ "Khớp với bản ghi". Lệch thì hiện cả hai, không báo lỗi người học.
   - `mongodb-docs` → "Trích từ docs MongoDB ↗" (link `url`). Không có nút chạy.
   - `illustrative` → "Minh họa, không phải bản ghi mongod". Không có nút chạy.
   - `aws-rules` → "Tính theo luật dung lượng của AWS". Thêm bảng "Cách tính": mỗi dòng là `expr` (in nguyên dạng chữ, code) → `expect`. App **không** chạy `expr`; test Node chạy và so với `expect`.
2. **Câu trả lời của bạn:** `<textarea>` (≤ 4.000 ký tự, nháp trong `live`). Nút chính "Xem đáp án mẫu" bật khi có ít nhất một chữ. Nút ghost "Bỏ qua, xem đáp án" ghi `skipped`.
3. **Xem đáp án:** hai cột từ 1024 px (một cột trên điện thoại): trái là câu của bạn (chỉ đọc), phải là `answer` trên `bg-surface-2`. Câu `design` có thêm danh sách `tradeoffs`. Có link "Docs chính thức ↗" và chip "Học lại: <bài>" (ghép `doc`, §1.4).
4. **Rubric:** danh sách checkbox thật (`<fieldset>` + `<legend>` "Câu trả lời của bạn có…"), tự tích. Điểm k/n hiện ngay.
5. **Chuyển câu:** "Câu tiếp" ở cuối, nút chính. Thanh tiến độ 5 chấm phía trên (có chữ "Câu 2/5", không chỉ màu).

**Kết thúc bộ:**

- tổng điểm tự chấm, thời gian ở trong phòng;
- danh sách câu < 60% với nút "Xem lại sau" (Q9);
- `results[set] = { at, score, total, ms, skipped }`.

**Khi đồng hồ chạy:**

- ẩn nút "Chạy lại" (tính giờ thì không cần);
- ẩn chip "Học lại" tới khi xem đáp án;
- không có nút thuật ngữ (§1.3).

### 2.4 Take-home (6 bài: 3 mid, 3 senior; không có junior/staff)

- **Trang:** `brief`; mỗi `deliverable` một `<textarea>` (≤ 8.000 ký tự, lưu nháp trong pref). `e-iv-pg-th-1` có thêm khối "Dữ liệu và truy vấn": `fixture` + ba `queries`, với nút "Mở trong lab Postgres". Nút này mở pglab trên `pg-shop` với editor của app, để người học tự chạy `EXPLAIN (ANALYZE, BUFFERS)` trước và sau. Không chấm.
- **"Nộp và xem bài mẫu":** hiện `model`, rồi rubric tự tích, rồi lưu `th[id] = { at, ticks, words }`.
- **Portfolio:** take-home đạt đi vào `#/me` theo mẫu `passedTakeHomes()` (v19 L170–L171). Chỉ chữ của người học và rubric đã tích, không bao giờ có `model`.

### 2.5 Pref `cargo-query/engine-interview`

```ts
{ results: { [setId]: { at: string; score: number; total: number; ms: number; skipped: number } },
  live:    { [setId]: { i: number; answers: string[]; ticks: number[][]; skipped: boolean[]; start: number; away?: number; timer: boolean } },
  th:      { [thId]: { drafts: string[]; ticks?: number[]; at?: string } },
  again:   { [questionId]: string /* localDay first eligible */ },
  noted:   string[] /* run ids whose time-up note showed */ }
```

- `parseEngineInterview` bỏ mọi khóa không phải id `e-iv-` đã biết và mọi chuỗi quá giới hạn. Không bao giờ ném lỗi.
- Trần: 36 `results`, 36 `live`, 6 `th`, ≤ 180 `again`.
- Pref này **không** có trong Export progress (giống `cargo-query/interview`); trang `#/me` nói rõ điều đó.

### 2.6 Trang `#/engine/interview`

- **Breadcrumb** Database Engine › Phỏng vấn.
- **Đầu trang:** ba thẻ engine (mẫu thẻ engine v22, icon engine). Mỗi thẻ có bốn ô band (k/3 bộ đã làm, thanh 4 px + số, L23) và nút "Take-home (2)".
- Chọn band thì danh sách 3 bộ hiện bên dưới, là hàng `listRow`. Mỗi hàng có số câu theo loại, "Chạy được: 1", điểm lần trước và nút "Bắt đầu" / "Làm tiếp" / "Làm lại".
- **Thẻ "Xem lại hôm nay (n)"** chỉ hiện khi có câu tới hạn. Mở thẻ thì được một bộ tạm, tối đa 5 câu tới hạn. Làm xong thì xóa câu ≥ 60%; câu chưa đạt hẹn lại sau 3 ngày.
- **Lối vào:**
  - trang tổng quan `#/engine` có một dòng "Luyện phỏng vấn";
  - `#/learn/interview` (General) có một dòng "Phỏng vấn Database Engine →";
  - `#/me` có khối "Phỏng vấn Engine: k/36 bộ, m/6 take-home".

---

## 3. Kiểm theo khoa học học tập

**Nguồn.** Các nguồn dưới đây chưa kiểm được nguyên văn ở vòng này: PubMed, SAGE, Elsevier và APA đều chặn tải tự động (cookie wall, 403). Tài liệu ghi theo cách `engine-pedagogy.md` đã làm, và cần đọc lại trước khi trích nguyên văn.

| Nguồn | Kết quả nguồn nêu | Hệ quả cho v27 |
|---|---|---|
| Roediger & Karpicke 2006, *Psychological Science* 17(3), DOI 10.1111/j.1467-9280.2006.01693.x *(chưa kiểm nguyên văn; đã dẫn ở engine-pedagogy P2)* | Làm bài kiểm nhớ lâu hơn đọc lại, dù người đọc lại tự tin hơn | Phòng phỏng vấn bắt **viết trước rồi mới xem** (Q8). Đáp án mẫu không bao giờ hiện cùng đề |
| Dunlosky, Rawson, Marsh, Nathan, Willingham 2013, *Psychological Science in the Public Interest* 14(1), DOI 10.1177/1529100612453266 *(chưa kiểm nguyên văn)* | Trong mười kỹ thuật, tự kiểm tra (practice testing) và học giãn cách (distributed practice) được xếp hữu ích cao. Đọc lại và tô đậm được xếp thấp | Ôn giãn cách cho câu chưa đạt (Q9). Công tắc "Che giải thích" (§1.2) biến trang thuật ngữ từ đọc lại thành tự kiểm |
| Cepeda, Pashler, Vul, Wixted, Rohrer 2006, *Psychological Bulletin* 132(3), DOI 10.1037/0033-2909.132.3.354 *(chưa kiểm nguyên văn)* | Học giãn cách nhớ tốt hơn học dồn; khoảng giãn tốt nhất tăng theo thời gian cần nhớ | Hẹn 1 ngày rồi 3 ngày. Không làm lịch phức tạp: app đã có Leitner cho kỹ năng; phòng phỏng vấn là luyện tập bổ sung |
| Dunlosky & Rawson 2012, *Learning and Instruction* 22(4), DOI 10.1016/j.learninstruc.2011.08.003 *(chưa kiểm nguyên văn)* | Người học tự chấm câu nhớ lại của mình thường **chấm quá tay**, và tự tin quá mức làm họ dừng học sớm. Có đáp án chuẩn đặt cạnh thì chấm chính xác hơn | Tự chấm là điểm yếu của phòng phỏng vấn. Cách giảm: (1) đáp án mẫu đặt **cạnh** câu của người học; (2) rubric tách 3–5 tiêu chí cụ thể, không có một ô "đúng/sai" chung; (3) "Xem lại sau" bật mặc định cho câu < 60%; (4) không XP, nên không có lý do để chấm lên |

**Ba điều thiết kế không giả vờ làm được:**

- **Popover thuật ngữ là tra cứu, không phải luyện nhớ.** Nó giảm tải nhận thức lúc đọc (P4, Sweller 1988), nhưng không làm người học nhớ từ. Phần nhớ do quiz của bài (ADD-7) và công tắc "Che giải thích" lo. `review-v27.md` chỉ đo **việc dùng** nút (Q10), không suy ra việc học.
- **Điểm tự chấm không phải điểm năng lực.** Trang không bao giờ hiện "Bạn đạt chuẩn senior". Chữ dùng là "tự chấm k/n".
- **Exhibit minh họa (Mongo) không phải bằng chứng chạy thật.** Chip nguồn nói đúng điều đó (P5 dạy bác hiểu lầm cần bằng chứng thật; ở đây không có, nên phải nói thẳng).

---

## 4. Luồng build v27 (file tách nhau)

### 4.1 Luồng và chủ file

| Luồng | Việc | File (chủ duy nhất) | Cỡ |
|---|---|---|---|
| **C** (nội dung, làm trước) | Glossary: thêm `match:` cho mục ghép (`TID / ctid`, `RCU / WCU (capacity unit)`, `COLLSCAN / IXSCAN / FETCH`…) và mục có chú thích engine trong ngoặc. Bank: thêm `set:` cho 180 câu theo §2.2; sửa chữ theo luật của glossary (§5, D7–D8); thêm 4 thuật ngữ thiếu (D9) | `content/engine/glossary.yml`, `content/engine/interview-bank.yml` | M |
| **GLO** | Parser thuần: slug, alias, `firstMentions(text, engine, level)`, link suy ra §1.4. Chunk thuật ngữ; trang `#/engine/terms`; popover; móc trong `inline()`; dòng sidebar; dòng sổ tay; pref đếm. Chủ `route.ts`: thêm cả `engineTermsOf` và `engineInterviewOf`, để IV không phải sửa. Chủ `engineView.ts`: móc thuật ngữ, hook `deps.interviewLine?.()` trong `meBlock()`, lối vào phỏng vấn trên tổng quan. Chủ `check-budget.mjs`: thêm cả dòng ngân sách của IV | mới `src/engine/glossary.ts`, `src/engineTermsSources.ts`, `src/ui/engineTerms.ts`, `src/i18n/engineTerms.ts`, `tests/engineGlossary.test.ts`; sửa `src/ui/engineView.ts`, `src/route.ts`, `src/ui/notebook.ts` (một dòng), `scripts/check-budget.mjs`, `tests/boundary.test.ts` | M |
| **IV** | Parser bank (bộ, kiểm loại câu), pref, trang và luồng câu, take-home, chạy lại exhibit qua pglab (dùng `src/engine/pglab/client.ts` có sẵn, không sửa), khối `#/me` (hàm `interviewLine` đưa qua deps), regex `e-iv-` | mới `src/engine/interviewBank.ts`, `src/engine/engineInterviewPrefs.ts`, `src/engineInterviewSources.ts`, `src/ui/engineInterview.ts`, `src/i18n/engineInterview.ts`, `tests/engineInterview.test.ts`; sửa `src/save.ts` (một regex) | L |
| **QA** | e2e: một bộ mỗi engine + một take-home + mở một popover bằng bàn phím; axe cho hai trang mới và popover đang mở (1280 sáng, 375 tối); thêm hai trang vào smoke | `scripts/e2e.mjs`, `scripts/smoke.mjs` (danh sách trang), `tests/engineAxe.test.ts` | S |

**Chủ file dùng chung.** Hai luồng không bao giờ sửa cùng một file:

- `engineView.ts`, `route.ts`, `check-budget.mjs`: GLO.
- `save.ts`: IV.
- `smoke.mjs`: QA.
- `vite.config.ts`, `scripts/offline.mjs`, `scripts/contentJson.mjs`: **không ai sửa**. Chunk mới tự vào `FILES` của service worker. YAML → JSON đi qua `?fm` có sẵn (L201), nên không cần `yaml` trong trình duyệt.

**Hợp đồng giữa GLO và IV** (chốt trước khi làm song song):

- `engineInterviewOf(hash): { set?: string; th?: string } | undefined`;
- `EngineDeps.interviewLine?: () => HTMLElement | null`;
- `EngineDeps.openInterview?: () => Promise<void>` (import lười chunk IV).

### 4.2 Ngân sách (chunk lười mới, số đo từ JSON gzip bằng script)

| Nhóm | Regex chunk | Đo | Trần đề xuất | Nạp khi |
|---|---|---|---|---|
| `engineTerms` | `^engineTermsSources-` | 39,2 KB (270 mục đủ trường; bỏ `avoid`/`doc`/`keep_en` còn 33,0) | **45 KB** | mở bài Engine (song song chunk bài) hoặc `#/engine/terms` |
| `engineTermsUi` | `^engineTerms-` | ước 4–6 KB | **8 KB** | cùng lúc trên |
| `engineIvBank` | `^engineIvBank-(pg\|mg\|dy)-`, mỗi file | pg 40,4 · mg 37,0 · dy 36,7 KB | **45 KB mỗi file** | chọn một engine trên trang phỏng vấn |
| `engineInterviewUi` | `^engineInterview-` | ước 8–10 KB | **12 KB** | mở `#/engine/interview` |

- **Bank tách theo engine:** cả file là 116 KB gzip, vượt mọi nhóm hiện có. Một bộ đề chỉ cần một engine.
- **Danh sách bộ trên trang** không cần chunk bank: số bộ và loại câu mỗi bộ là bảng hằng nhỏ trong UI, có test so với YAML.
- **Không chunk nào vào main.** `engineTerms` không import giá trị từ main (luật U3 của `learnui`).

### 4.3 Thoát v27

- [ ] 270 thuật ngữ có trang; mọi `#/engine/terms/<slug>` mở đúng mục (test duyệt cả 270 slug).
- [ ] Popover: có trong mọi bài có thuật ngữ cấp ≥ cấp bài; mở/đóng được bằng bàn phím; axe sạch khi đang mở; mỗi bài ≤ 15 nút (test).
- [ ] 36 bộ + 6 take-home mở được; mọi bộ theo luật §2.2.
- [ ] `tests/engineInterview.test.ts` xanh, kể cả 23 exhibit pglite chạy lại đúng `shown`.
- [ ] Không gì ghi vào Save (test: chạy hết một bộ rồi so `localStorage['cargo-query-save']` trước/sau).
- [ ] Ngân sách §4.2 đạt; `npx tsc --noEmit`, `npm test`, `npm run build`, `check-budget`, smoke + axe xanh.
- [ ] `review-v27.md` đọc pref đếm Q10 trên máy review và ghi số.

### 4.4 Kế hoạch test

| Test | Kiểm |
|---|---|
| `tests/engineGlossary.test.ts` | Đủ 9 trường mỗi mục; slug không trùng (hiện không trùng, slug dài nhất `join-strategy-nested-loop-hash-join-merge-join`); `level` L1–L5; engine hợp lệ; EN không dấu; code span VI = EN; `doc` thuộc ba domain docs; `vi_term` không trùng giữa hai mục (hoặc `match` phân biệt được, xem D3); mọi `match` khớp ít nhất một bài hoặc thẻ BP (không có alias chết); ngưỡng phủ: ≥ 210/270 mục có "Dạy ở", ≥ 170/270 có thẻ BP; mỗi bài ≤ 15 nút |
| `tests/engineInterview.test.ts` | 180 câu + 6 take-home; id theo mẫu và khớp `engine`/`band`; trường đúng theo `kind`; rubric 3–5; `design` ≥ 2 `tradeoffs`; luật bộ §2.2; mọi exhibit `pglite-0.5.16` chạy lại ra đúng `shown` (PGlite trong Node, mỗi exhibit một DB mới, `setup` tách theo `;`); mọi `calc.expr` chạy bằng `new Function` **trong test** ra đúng `expect`; `mongodb-docs` có `url`; câu không `diagnose` thì không có `exhibits`; parse pref với dữ liệu hỏng không ném lỗi; `parseSave` bỏ `e-iv-…` |
| `tests/boundary.test.ts` (thêm ca) | `#/engine/terms`, `#/engine/terms/<slug>`, `#/engine/interview/<set>` không rơi về trang tổng quan; slug lạ thì về trang danh sách |
| `tests/i18n.test.ts` (thêm file) | `src/i18n/engineTerms.ts` và `engineInterview.ts`: placeholder khớp, EN khác VI; quét bank để bắt "boss" / "sự cố" |
| `tests/engineAxe.test.ts` | Hai trang mới, popover đang mở, bước "xem đáp án" có rubric |
| `scripts/e2e.mjs` | Một bộ mỗi engine, một take-home, một popover mở bằng Tab + Enter rồi đóng bằng Esc (focus về nút) |

---

## 5. Kiểm dữ liệu: vấn đề UI sẽ gặp

Bằng chứng: `scratchpad/r12/audit.mjs` và `audit-out.txt`. "Chắc chắn" = đọc thẳng cấu trúc. "Ước lượng" = nhận ra từ trong văn bản, nên có thể khớp nhầm hoặc sót.

**Chắc chắn**

| # | Vấn đề | Hệ quả cho UI | Sửa (luồng) |
|---|---|---|---|
| D1 | Glossary trên `main` có **270** mục; `v22-rc` có **231** (`git diff` khác 745 dòng) | Roadmap đếm theo bản cũ. Build v27 phải dựa trên `main` sau khi gộp | Q4 (C) |
| D2 | Không có trường id; `term` là chuỗi ghép như `join strategy (nested loop, hash join, merge join)`, `TID / ctid`, `RCU / WCU (capacity unit)` | Không có link sâu ổn định; không nhận ra từ trong bài nếu không có alias | `id` = slug lúc build (không trùng); `match:` (C) |
| D3 | `vi_term` "projection" dùng chung cho `projection (MongoDB)` và `projection (DynamoDB index)` | Tìm kiếm ra hai mục. Popover phải chọn theo engine của bài | Popover lọc theo `engines` (GLO); test |
| D4 | 20 `vi_term` chứa dấu backtick Markdown (`` `search_path` ``, `` `$lookup` ``…) | Không in thẳng làm chữ được | Parser đổi backtick thành `<code>` (GLO) |
| D5 | Không YAML nào có id bài hay thẻ BP: không id treo, nhưng cũng không có link | §1.4 phải suy ra link | GLO |
| D6 | Không có bộ đề: không `set`, `minutes`, `title`. Câu `diagnose` đứng liền nhau trong mỗi ô | Cắt theo số thứ tự cho bộ toàn `concept` | `set:` (C), luật §2.2 |
| D7 | Bank viết "chỉ mục" **206 lần**. Glossary luật 4: khu Engine giữ chữ "index" | Bài nói "index", câu phỏng vấn nói "chỉ mục": hai chữ cho một thứ | Đổi thành "index" (lần đầu "index (chỉ mục)") (C) |
| D8 | Bank dùng "khóa" cho lock ở ~7 chỗ ("khóa ACCESS EXCLUSIVE", "khóa dòng", "khóa hàng", "khóa bảng", "khóa mạnh"). Glossary luật 1: "khóa" chỉ là KEY | Đọc nhầm thành khóa chính | Đổi thành "lock ACCESS EXCLUSIVE", "row lock"… (C) |
| D9 | Theo một danh sách 66 từ chọn tay (không phải quét hết), có 4 từ dùng trong câu phỏng vấn mà không có mục glossary: bloat, serializable, Streams (DynamoDB Streams), PgBouncer | Không link được từ đáp án mẫu tới trang thuật ngữ | Thêm 4 mục (C) |
| D10 | Chỉ 1/6 take-home (`e-iv-pg-th-1`) có `fixture` + `queries`; take-home dùng `deliverables` + `model`, không có bước SQL | Không dùng được `takeHomeTicket` | §2.4 (IV) |
| D11 | `calc.expr` là mã JS dạng chuỗi (`"Math.ceil(6 / 4) * 0.5"`) | `eval` trong app là rủi ro, và không cần | Chỉ test chạy; UI in chữ (IV) |
| D12 | Exhibit MongoDB: 10 `illustrative`, 4 `mongodb-docs`, **0** chạy thật. DynamoDB: 12 `aws-rules`, 0 chạy trên dynoxide | Không được hứa "chạy thật" cho hai engine này | Chip nguồn (IV) |
| D13 | Take-home chỉ có band mid (3) và senior (3) | Ô junior/staff không có nút take-home | UI ẩn, không ghi "sắp có" (luật noDeadEnds) |

**Ước lượng** (nhận ra từ qua alias; các từ chung như view, session, hint, owner, range đã bị loại khỏi alias)

| # | Vấn đề | Hệ quả | Sửa |
|---|---|---|---|
| D14 | 36 mục không có trong bài nào của engine đó, kể cả khi khớp lỏng. Ví dụ: ACID, durability, operator class, KNN search, partition pruning, sargable, anti join, date spine, SQL injection, tiebreaker, read preference, wildcard index, rolling index build, TransientTransactionError, Contributor Insights, ISO 8601 | "Dạy ở" trống. Một số mục đến từ Best Practice (vòng 8) | Trang hiện "Chỉ có trong Best Practice" hoặc chỉ link docs; C xem có cần mục đó không |
| D15 | 53 mục ghi `level` cao hơn bài đầu tiên dùng nó. Ví dụ: MVCC L3 có trong `e-pg-l1-07`; VACUUM L3 có trong `e-pg-l1-09`; RCU/WCU L2 có trong `e-dy-l1-04`; `KeyConditionExpression` L2 có trong `e-dy-l1-08`; GSI L3 có trong `e-dy-l2-10`; shard key L5 có trong `e-mg-l3-01` | Luật lọc Q2 vẫn biến chúng thành nút (cấp mục > cấp bài). Bộ lọc cấp trên trang thuật ngữ thì sai: người học L1 lọc L1 không thấy MVCC | C hạ `level` về cấp dạy đầu tiên, sau khi người đọc xác nhận từng mục (một số là nhắc trước có chủ ý) |
| D16 | 14 mục ghi `level` thấp hơn bài đầu tiên dùng nó. Ví dụ: execution plan L1 nhưng bài đầu `e-pg-l3-14`; CTE L2 nhưng `e-pg-l4-09`; epoch time L2 nhưng `e-dy-l5-02` | "Dạy ở" trỏ tới cấp cao hơn cấp mục ghi | Như D15 |
| D17 | 94/270 mục không có thẻ BP nào nhắc tới (nhiều nhất ở MongoDB/DynamoDB L4–L5) | Hàng link BP trống ở các mục đó | Bình thường; UI ẩn hàng đó |

**Không thấy vấn đề:**

- glossary: thiếu trường, `term` trùng, `level`/engine sai, EN có dấu, code span VI ≠ EN, `doc` ngoài ba domain docs;
- bank: id trùng, id không khớp `engine`/`band`, thiếu trường theo `kind`, rubric ngoài 3–5, `design` < 2 `tradeoffs`, fixture không tồn tại, `mongodb-docs` thiếu `url`, `aws-rules` thiếu `calc`, đề EN trùng nhau.

**Chưa chạy vòng này:** chạy lại 23 exhibit pglite và so với `shown`. Việc này dành cho test IV-T: cần PGlite trong Node, mà vòng này không build.

---

## 6. Mockup

| File | Nội dung |
|---|---|
| `v27-mockups/terms-page.svg` | `#/engine/terms` 1280: breadcrumb, h1, thanh lọc (tìm, engine, cấp), nhóm L3, hai thẻ mục có link "Dạy ở", BP, docs |
| `v27-mockups/term-popover.svg` | Bài Postgres L1 trên điện thoại 375: đoạn văn có nút "MVCC" gạch chấm và tấm popover dính đáy |
| `v27-mockups/interview-reveal.svg` | Câu `diagnose` Postgres đã xem đáp án: chip nguồn PGlite + "Chạy lại", hai cột (câu của bạn / đáp án mẫu), rubric 3 checkbox, "Câu tiếp" |

Mockup chỉ vẽ giao diện sáng. Giao diện tối dùng cùng token (`:root[data-theme=dark]`), không có màu riêng.
