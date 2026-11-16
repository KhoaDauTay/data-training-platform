# Cargo Query — Tổng hợp review đội (amendments)

Ngày: 2026-11-16 · Người viết: Product lead (tổng hợp) · Trạng thái: **chờ user quyết 6 mục ở §2**

Nguồn: `docs/team/product-design.md` (PD), `docs/team/ui-ux.md` (UX), `docs/team/frontend.md` (FE), `docs/team/devops.md` (DO), trạng thái BE vòng này. Đối chiếu với spec `docs/superpowers/specs/2026-11-16-cargo-query-design.md`, Plan 1 (`…-plan-1-engine.md`), Plan 1b (`…-plan-1b-visualization.md`).

---

## 0. Tiền đề: code đang ở đâu

Kiểm trên repo (`ls src tests`, `git log`):

- **Đã có code:** Plan 1 Task 1–3 (`src/db/*`, `src/grader.ts`, `tests/seed.test.ts`, `tests/grader.test.ts`), commit `5939473`, `f364f43`, `bb33ec0`. Kết quả: 21/21 test, `tsc` sạch, build OK.
- **Chưa có code:** Plan 1 Task 4–11 (`tickets.ts`, `progress.ts`, `save.ts`, `content/`, toàn bộ UI Task 10) và **toàn bộ Plan 1b**. Thư mục `content/` chưa tồn tại.

Hệ quả: các "lỗi trong code đã viết" mà UX tìm thấy (`complete()`, `renderTicket()`, `panel.show()`, tương phản…) nằm trong **code mẫu của Plan 1 Task 10 / Plan 1b**, chưa nằm trong `src/`. Vì vậy cách rẻ nhất là **sửa văn bản plan trước khi chạy**, không cần một task refactor sau. Áp dụng cho cả đề xuất tách `main.ts` của FE: viết luôn cấu trúc mới vào Task 10, không viết `main.ts` 550 dòng rồi tách lại.

**Cổng chặn từ review BE (phải xong trước Task 4):**
1. Chạy tay smoke trình duyệt Plan 1 Task 2 Step 5 (`npm run dev` và `vite preview`). Nếu không đạt, dừng lại và báo user (theo plan).
2. Sửa 2 lỗi nhỏ ở `src/db/client.ts`. Khi có import CSV (timeout 30s) và tự nạp lại sau `restart()`, hai lỗi này thành **lỗi thật**, không còn "minor":
   - Timer 5s đang bắt đầu lúc `postMessage`, trong khi worker xếp hàng tuần tự. Sửa: client cũng xếp hàng (chỉ gửi query kế khi query trước xong) để timer chỉ đo đúng query đang chạy.
   - `restart()` trong lúc boot làm `run()` đang chờ `this.ready` cũ treo mãi. Sửa: reject promise `ready` cũ khi restart. Sau `onerror` thì `run()` reject ngay, không đợi 5s.

---

## 1. Đồng thuận — làm luôn, không cần user quyết

Mỗi mục: thay đổi · vai đề xuất · sửa ở đâu. Mục nào vai gốc đánh dấu "cần quyết"/"mâu thuẫn quyết định cũ" thì có thêm một dòng **Vì sao không cần quyết**.

### 1.1 Mục tiêu học, tiến độ, save

| # | Thay đổi | Vai | Sửa ở đâu |
|---|---|---|---|
| A1 | `content/skills.yml`: 20 kỹ năng (giữ id ch1–3: `select`, `where`, `order_by`, `limit`, `aggregate`, `group_by`, `having`, `join`, `multi_join`, `left_join`, `anti_join`), nhãn `{vi, en}`. **Gộp thẻ kỹ năng của UX vào cùng file**: mỗi kỹ năng có thêm `syntax`, `when`, `trap` (≤ 6 dòng). Không tạo file thẻ riêng. | PD + UX | spec §5; Plan 1 Task 5 |
| A2 | `content/chapters.yml`: tiêu đề chương `{vi, en}` + `outcomes[].skills` (tự tick). **Xóa `CHAPTER_TITLES`** khỏi `progress.ts`. *Vì sao không cần quyết:* chỉ đổi chỗ chứa dữ liệu, `progress.ts` chưa được viết. | PD, FE | Plan 1 Task 5 (`progress.ts`), Task 10 |
| A3 | Luật test (PD §1.2): mọi `requires/grants` có trong `skills.yml`; mỗi kỹ năng được grant đúng 1 lần, đúng chương; outcome chương N chỉ dùng kỹ năng của chương ≤ N; mỗi kỹ năng có `syntax/when/trap`. | PD, UX | Plan 1 Task 5 (`contentProblems`), Task 7 (`tests/content.test.ts`) |
| A4 | Thanh trên `Ch 2/7 · 7/35 ticket · 1.250 XP` (thêm `· Ôn: N` nếu chọn D2-A). Dải bản đồ thu gọn hiện chấm theo beat `● ● ◐ ○ ◆` + `Tuyến đã mở n/N`. Thẻ "Mục tiêu chương" ở ticket teach, màn **Tổng kết chương** sau boss. Mọi trạng thái **tính lại từ save**, không lưu thêm. | PD, UX | spec §6b; Plan 1 Task 10; Plan 1b Task 7 (`mapView.ts`) |
| A5 | Skill map `<dialog>` (khóa / đã học / đang vững / thuộc). Chip "Dạy: X · Cần: Y" trên ticket. | PD | spec §6b; Plan 1c |
| A6 | **Một lần nâng save duy nhất lên v2** bằng `MIGRATIONS[1]`. Task 6 vẫn viết v1 đúng như plan, giữ fixture `tests/fixtures/save-v1.json`, thêm `save-v2.json`. Trường v2: `bossStep: Record<ticketId, number>` (UX 0.5), `sandboxDraft: string` (≤ 20.000 ký tự), và các trường luyện tập **theo D2**. *Vì sao không cần quyết:* mọi vai đồng ý, chưa có người chơi giữ save v1. | PD, UX | spec §8, §9; Plan 1 Task 6; Plan 1c |
| A7 | `parseSave(raw, known: { ticketIds, skills })` và `loadSave(storage, known)`. Lý do: `pickRecord` hiện xóa key không phải ticket id. Lỗi dạng typed, không kèm chữ: `warning?: { kind: 'corrupt' \| 'newer'; version? }`, `NewerSaveError(version)`, `InvalidSaveError`. | PD, FE | Plan 1 Task 6 (`save.ts`) |
| A8 | Trước khi migrate thì giữ bản cũ ở key `cargo-query-save.v<old>` (1 bản). Quy tắc phát hành: release nâng save version **đi riêng**, không gộp với thay đổi rủi ro khác. | DO | spec §8; Plan 1 Task 6 |
| A9 | Ngôn ngữ **không** nằm trong Save: key `cargo-query/prefs` = `{ lang }`, đọc đồng bộ trước khi render, bọc try/catch. Mặc định theo `navigator.language` (`vi*` → VI, còn lại EN). *Vì sao không cần quyết:* PD, UX, FE cùng đề xuất mặc định này, và user vẫn đổi được bằng một cú bấm. | PD, FE, UX | spec §8; Plan 1c |

### 1.2 EN/VI (phần không tranh chấp)

User đã yêu cầu EN/VI ở vòng này, nên yêu cầu này **thay** quyết định cũ "đa ngôn ngữ ngoài phạm vi" (spec §10) và constraint "Nội dung hiển thị tiếng Việt" (Plan 1). Đây là cập nhật theo lời user, không phải mâu thuẫn cần quyết lại.

| # | Thay đổi | Vai | Sửa ở đâu |
|---|---|---|---|
| B1 | Từ điển `src/i18n/{index,vi,en}.ts`: `en: Record<Key, Msg>` (tsc bắt khóa thiếu), `Msg` cho phép hàm để xử lý số nhiều EN. `t()`, `applyStatic()` với `data-i18n`, `<html lang>` đổi theo ngôn ngữ. Không thêm thư viện. | FE (PD gợi ý 1 file) | Plan 1 Task 10 (`index.html`, `panel.ts`: `Tab.label: Key`); Plan 1c |
| B2 | Công tắc `VI \| EN` là nhóm 2 nút `aria-pressed` trên topbar (theo UX). Đổi ngôn ngữ chỉ gọi `rerender()`: topbar + inbox + brief + `panel.refresh()` + `work.relabel()`, **không bao giờ** remount editor. | UX, FE | Plan 1 Task 10 |
| B3 | Đưa chuỗi tiếng Việt ngoài `src/ui` vào từ điển: `QueryTimeoutError`/`DbRestartError` không kèm chữ; `NODE_HELP` và `STEP_LABELS/STEP_HELP` thành `Record<Lang, …>`; `fmt()` dùng `toLocaleString(locale())`; chữ trong `mapView`. | FE | Plan 1 Task 2 (sửa `client.ts` đã commit), Task 6, Task 10; Plan 1b Task 1, 2, 3, 7 |
| B4 | Không dịch: tên bảng/cột, SQL, dữ liệu seed, giá trị bảng kết quả, lỗi gốc Postgres, tên người và phòng ban. | PD, UX, FE | spec §3, §10 |
| B5 | `tests/i18n.test.ts`: placeholder `{x}` ở VI và EN phải khớp nhau; `NODE_HELP`/`STEP_*` cùng tập khóa. | FE | Plan 1c |
| B6 | Content lint: code span VI = EN; EN không còn dấu tiếng Việt; bảng dùng trong Solution phải nằm trong `tables` (dùng `tablesInQuery`, **sau Plan 1b Task 6**); `content/TEMPLATE.md` đặt ngoài `content/tickets/`. | FE | Plan 1 Task 7 (`tests/content.test.ts`); Plan 1b Task 6 |
| B7 | `content/glossary.yml` (~30 thuật ngữ freight, `{term, vi, en, columns}`). Hiện trong **Sổ tay**: `<dialog>` mở bằng `show()` (không modal, để vừa đọc vừa gõ), 2 mục Thẻ kỹ năng / Thuật ngữ, có ô lọc. **Hoãn** tự gắn link thuật ngữ trong đề và badge ở tab Cột (theo PD, bản sau). | PD + UX | spec §6b; Plan 1c |

### 1.3 Editor, panel, bố cục (sửa code mẫu Task 10 / Plan 1b trước khi chạy)

| # | Thay đổi | Vai | Sửa ở đâu |
|---|---|---|---|
| C1 | Viết Task 10 theo cấu trúc tách sẵn: `src/state.ts` + `src/ui/{topbar,inbox,brief,work,tabs}.ts`, `main.ts` khoảng 120 dòng. Editor chỉ được tạo lại khi `ticketId#step` đổi (giải quyết UX 0.2). Các bước "Gắn vào main.ts" của Plan 1b đổi thành "gắn vào `src/ui/tabs.ts`". *Vì sao không cần quyết:* Task 10 chưa có code nên làm vậy không tốn thêm việc, và đây là điều kiện để đổi ngôn ngữ mà không mất editor. | FE, UX | Plan 1 Task 10; Plan 1b Task 2, 4, 5, 6, 7 |
| C2 | Nộp đúng thì **ở lại ticket và hiện thẻ Recap** (kỹ năng vừa mở, SQL của bạn cạnh Solution, +XP), có nút "Ticket tiếp theo →". Bỏ việc tự nhảy sang ticket mới. | UX | Plan 1 Task 10 (`complete()`) |
| C3 | Tablist theo ARIA: nút chỉ tạo một lần, roving tabindex, phím ←/→/Home/End, `aria-controls`. | UX | Plan 1 Task 10 (`panel.ts`) |
| C4 | Mọi tab đọc `lastRun.sql`. Khi editor khác `lastRun.sql` thì hiện dải "SQL đã thay đổi — Ctrl+Enter để cập nhật". Thêm cache `stepsFor(sql)` giống `planFor`. | UX, FE | Plan 1b Task 2, 4, 6 |
| C5 | Sửa tương phản: `button.primary` ở dark mode dùng chữ `#0d1b29` (7.09:1); bỏ `opacity` ở `.mail.done`, `.st.skip`, `pre.sql .dim` và thay bằng màu; hub trên map tô `--accent` thay vì `--bad`. | UX | Plan 1 Task 10 (`style.css`); Plan 1b Task 4, 7 |
| C6 | Shape card "Kết quả mong đợi", tính từ kết quả chạy Solution: số cột, **loại** cột (chữ/số/ngày/đúng-sai, gộp int với numeric), số dòng, có thứ tự hay không. **Không bao giờ** hiện tên cột của Solution. Sau mỗi lần Chạy thì so với kết quả của người chơi. | UX | Plan 1 Task 10 |
| C7 | Tab mặc định: **Cột** khi chưa chạy lần nào; sau khi Nộp thì mở tab theo loại sai (bảng UX §1.6). Nhóm tab bằng vạch ngăn: [Kết quả · Biểu đồ] \| [Thứ tự · EXPLAIN · Luồng] \| [ER · Cột]. **Không ẩn tab nào**, chỉ thêm chấm "mới" lên Biểu đồ ở `ch2-01` và EXPLAIN ở `ch3-01`. *Vì sao không cần quyết:* đây là mặc định của chính UX và giữ nguyên bố cục đã chốt ở §6b. | UX | Plan 1 Task 10; spec §6b |
| C8 | App shell `100dvh` khi màn ≥ 1024×700; map 28px (thu gọn) / 120px (mở); `src/ui/splitter.ts` (~40 dòng, `role=separator`, phím ±5%), lưu vào `cargo-query/layout`. Màn < 600px: thanh Chạy/Nộp sticky. | UX | Plan 1 Task 10; Plan 1b Task 7 |
| C9 | Phím tắt: `Mod-Enter` Chạy, `Mod-Shift-Enter` Nộp, `Ctrl+S` lưu draft, phím đơn `? i g 1–7 e` (bỏ qua khi focus đang trong editor hoặc ô nhập). Xung đột với phím của trình duyệt phải kiểm tay. | UX, FE | Plan 1 Task 10 (`editor.ts`) |
| C10 | Onboarding: 4 coach mark đặt trong vùng (ch1-01 → ch1-02), lưu `cargo-query/coach-done`. Bấm Chạy khi DB chưa sẵn sàng thì xếp hàng. Bảng empty state theo UX §4. | UX | Plan 1 Task 10 |
| C11 | Sửa gợi ý 1 của `ch1-01`: "Mở tab **Cột** ở panel dưới để xem bảng." | UX | Plan 1 Task 7 |
| C12 | Worker gửi kèm `position` (1-based, tính theo ký tự), `code`, `hint`. Thêm `SqlError`, và `GradeResult.error?: SqlErrorInfo` để khi Nộp vẫn gạch được lỗi. Spike của FE đã xác nhận PGlite có đủ 3 trường này. | FE (→ BE) | Plan 1 Task 2 (đã commit, cần sửa), Task 3 |
| C13 | **Lỗi biết dạy**: giữ nguyên dòng lỗi gốc của Postgres, **thêm** khối giải thích VI/EN bên dưới. Map theo SQLSTATE trước (`sqlstate.42703`, `42P01`, `42803`, `42601`…); regex trên message chỉ dùng cho vài ca SQLSTATE không phân biệt được (nháy kép quanh giá trị, aggregate trong WHERE, ambiguous column, timeout do JOIN thiếu `ON`). Viết trong `src/ui/sqlErrors.ts`; `tests/sqlErrors.test.ts` chạy SQL sai thật trên PGlite. *Vì sao không cần quyết:* spec §7 yêu cầu "hiển thị nguyên thông báo lỗi", và cách này vẫn hiển thị nguyên, chỉ thêm phần giải thích. | UX + FE | spec §7; Plan 1 Task 10 |
| C14 | Nâng cấp editor không thêm dependency: `Compartment` cho schema với `SQLNamespace` (có kiểu cột, chỉ gồm bảng đã mở), chạy vùng chọn có `offset`, gạch lỗi bằng `@codemirror/lint` (đưa thành dependency trực tiếp, vốn đã nằm trong cây). | FE | Plan 1 Task 10 (`editor.ts`, `package.json`) |
| C15 | Lịch sử query `src/history.ts`, key `cargo-query/history`, tối đa 15 mục mỗi ticket, UI dạng `<details>`. Không nằm trong Save. | FE | Plan 1c |

### 1.4 Chế độ & Sandbox

| # | Thay đổi | Vai | Sửa ở đâu |
|---|---|---|---|
| E1 | 3 chế độ dùng chung một engine: **Học chính / Luyện tập / Sandbox**. Inbox có thêm mục Luyện tập và Sandbox. | PD, UX | spec §1, §6b |
| E2 | Sandbox = `mountWork` với `ticket: undefined`: không có nút Nộp, vẫn chạy qua `runSandboxed` (BEGIN…ROLLBACK, 5s), hiện đủ các tab, sidebar chỉ có bảng đã mở, draft lưu ở `save.sandboxDraft`, không có lịch sử query (L16). Vào bằng nav Sandbox và card chế độ trên Trang chủ (P6), không qua Inbox. | PD, FE | spec §6b; Plan 1c |

### 1.5 Hiệu năng, deploy, RPS

| # | Thay đổi | Vai | Sửa ở đâu |
|---|---|---|---|
| F1 | **Kết luận review RPS** (đưa vào spec): bản DA không có origin server, nên RPS lên server của mình ≈ 0, và khi chơi không phát sinh request nào. Lần vào đầu: ~9–17 request, ~5.7 MB gzip (~10 MB nếu `.data` không được nén). Lượt quay lại: 1 request nếu asset được đánh `immutable`. 1.000 người/giờ ≈ 5 RPS ở edge (đỉnh ~50). **Giới hạn chạm tới trước là bandwidth, không phải RPS.** Không cần load test cho bản DA. | DO | spec §3 (Tải trang), mục mới "Vận hành" |
| F2 | **Nghiệm thu nén bắt buộc** sau deploy: chạy script `curl` của DO §1.3, kết quả đạt là `.wasm` có `application/wasm` + `content-encoding`, và `.data` có `content-encoding`. Nếu không đạt: dùng Compression Rule; nếu vẫn không được thì build ra `pglite.data.gz`, worker giải nén bằng `DecompressionStream` rồi truyền `fsBundle` (cần spike nhỏ, BE làm). | DO | Plan Deploy (mới) |
| F3 | CI GitHub Actions: `npm ci` → `npm test` → `npm run build` → `node scripts/check-budget.mjs` (ngân sách gzip: `index-` 250 KB, `worker-` 160 KB, `pglite-` 5.300 KB, `initdb-` 140 KB, `libpg-query` 380 KB, `mermaid` 900 KB) → deploy. Chưa chạy test trình duyệt trong CI. | DO | Plan Deploy (mới) |
| F4 | Ngân sách: FCP ≤ 1s (laptop) / ≤ 3s (Slow 4G); DB-ready lần đầu ≤ 5s / ≤ 40s; lượt quay lại ≤ 3.5s; bộ nhớ tab ≤ 400 MB. Thanh trạng thái hiện tiến độ tải theo byte, ví dụ `2.1/5.4 MB`. | DO | spec §3; Plan 1 Task 10 |
| F5 | `performance.mark` (`db:spawn`, `db:ready`, `db:restart`) và `timings: { bootMs, seedMs }` trong message `ready`. | DO | Plan 1 Task 2 (đã commit, cần sửa) |
| F6 | Trần `MAX_ROWS_WORKER = 50.000` trước khi `postMessage`, vượt thì báo "Kết quả quá lớn". Mức này khác với `MAX_ROWS = 500` dùng để hiển thị. | DO | Plan 1 Task 2; spec §7 |
| F7 | Spike (BE): snapshot `dumpDataDir` → `loadDataDir` khi restart để bỏ được bước seed ~2s. Nếu đạt thì snapshot cũng giữ được dữ liệu import. | DO | Plan 1 Task 2 (sau) |
| F8 | Bắt sự kiện `vite:preloadError` → hiện "Có phiên bản mới, tải lại trang". | DO | Plan 1 Task 10 |
| F9 | Telemetry giai đoạn 1: chỉ có nút "Sao chép thông tin chẩn đoán" (payload theo allowlist: `build`, `kind`, `sqlstate`, `errorName`, `timings`, `ua`) và Cloudflare Web Analytics (không cookie). Tuyệt đối không gửi SQL, message lỗi, draft hay dữ liệu import. | DO | Plan Deploy (mới) |
| F10 | Không bật COOP/COEP (đã grep: PGlite không dùng SAB). Khi cài `libpg-query`, `pgsql-deparser`, `mermaid` thì grep lại. | DO | Plan 1b Task 1 (bước kiểm) |

---

## 2. Quyết định cần user (6 mục)

### D1. Ticket song ngữ: định dạng file và cổng phát hành
Gộp đề xuất của PD (`content/en/tickets/`), FE (khối `# EN`) và UX (`ch1-01.en.md`).

| Lựa chọn | Nội dung |
|---|---|
| **A** | Khối `# EN` ở cuối **cùng file** ticket, kèm `title_en` và `conclusion_en`. Frontmatter và SQL chỉ có 1 bản. Cổng phát hành: **0 ticket thiếu EN**; ở dev thì fallback về VI có nhãn. |
| B | File riêng `content/en/tickets/chN/<id>.md` (ngoài glob), ghép theo `id`, cùng cổng 0 thiếu EN. |
| C | Chỉ dịch UI, chương, kỹ năng, glossary sang EN. Ticket để VI kèm nhãn "VI" (tiết kiệm ~6k từ dịch). |

**Đề xuất: A.** Mọi thay đổi VI/EN của một ticket nằm trong cùng một diff, nên đổi số gợi ý/bước ở VI thì test bắt được ngay. Parser chỉ cần thêm `split(/^# EN$/m)`, 4 test parser hiện có vẫn qua, và không cần glob thứ hai. C quá tay, vì user muốn EN/VI thật nên người đọc EN phải đọc được đề. Chi phí: ~6k từ, dịch ngay trong từng task viết nội dung (không dồn cuối), cộng một task dịch bù 15 ticket ch1–3.

### D2. Luyện tập: mức độ
User yêu cầu "có luyện tập". Phần đồng thuận: 0 XP (chống farm), dùng nguyên grader, draft luyện tập không lưu.

| Lựa chọn | Nội dung | Trường save v2 kéo theo |
|---|---|---|
| **A** | Đầy đủ theo PD: khóa `variants` (template `{{x}}`, 2–4 biến thể, `variants[0]` là bản Học chính), Leitner 5 hộp `[1,2,4,8,16]` ngày trong `src/practice.ts`, 3 lối vào (Ôn hôm nay / Luyện kỹ năng / Làm lại ticket), "Ôn: N" trên topbar | `review: Record<skill,{box,due}>`, `practice: {solved, failed}` |
| B | Có `variants` + Làm lại ticket / Luyện kỹ năng, **không có** lịch Leitner | `practice: {solved, failed}` |
| C | Chỉ Làm lại ticket đã xong, không có biến thể (người chơi có thể dán lại câu cũ) | không có |

**Đề xuất: A.** "Học dễ nhớ" cần lặp lại cách quãng, và Leitner chỉ ~30 dòng hàm thuần có test. Phần tốn là nội dung: khoảng 20 ticket × 2 biến thể, viết luôn trong Plan 2/3 (ch1–3 bổ sung trong Plan 1c). C không đạt yêu cầu "luyện tập" vì không buộc người chơi phải nhớ lại. Boss không có biến thể.

### D3. Nạp dữ liệu ngoài
PD và DO khác nhau về giới hạn, tên schema và việc lưu bền. Cả hai đồng ý: chỉ CSV, `COPY … FROM '/dev/blob'`, chạy ngoài `runSandboxed`, timeout riêng 30s, phải spike trước.

| Lựa chọn | Nội dung |
|---|---|
| **A** | Theo PD: ≤ 10 MB / 100k dòng / 50 cột / 5 bảng, schema `sandbox`, **không lưu bền** (tải lại trang thì chọn lại file), tự nạp lại từ Blob trong bộ nhớ sau `restart()`. SQL dump hoãn. |
| B | Theo DO: ≤ 20 MB / 200k dòng, lưu file gốc vào IndexedDB để replay qua lần tải trang. SQL dump hoãn. |
| C | A + nạp SQL dump ngay (cần spike `CREATE ROLE`/`SET ROLE` trước, lọc câu lệnh bằng libpg-query). |

**Đề xuất: A.** Đủ cho "import data ngoài để test các tính năng đã có", và ít code nhất. Giới hạn chốt lại sau spike bộ nhớ (5 × 10 MB). Nếu spike đạt thì nâng lên mức của DO mà không phải đổi thiết kế. IndexedDB và SQL dump để bản sau. Tên schema: `sandbox`, vì trùng tên chế độ Sandbox nên người dùng dễ hiểu.

### D4. Định dạng ticket mở rộng và chỉnh nội dung ch1–3
Gom các đề xuất UX về khóa frontmatter mới và pacing boss. Plan 1 Task 7–9 chưa có code, nên sửa lúc này gần như không tốn gì.

| Lựa chọn | Nội dung |
|---|---|
| A | Làm hết: `columns:` (nhãn cột), `starter:` (SQL mẫu cho teach ch1), mục `## Task`, bước 3 cho boss `ch2-05` (HAVING) và `ch3-05` (anti-join), đưa AVG/ROUND vào `ch2-01` + thẻ `aggregate`, check "kỹ năng twist ⊂ requires của boss". |
| **B** | Chỉ phần pacing và `starter:`: bước 3 cho 2 boss, AVG/ROUND vào `ch2-01`, check twist→boss, `starter:` cho `ch1-01`. **Bỏ** `columns:` (shape card chỉ hiện loại cột là đủ) và `## Task` (không đổi parser). |
| C | Giữ nội dung đã chốt, chỉ sửa gợi ý `ch1-01` (C11). |

**Đề xuất: B.** Theo skill level-design, boss phải kiểm tra kỹ năng twist và không được dạy hàm mới, vì vậy sửa `ch2-05`/`ch3-05` là đúng nguyên tắc user đã chọn. `starter:` là 1 khóa tùy chọn và mang lại chiến thắng đầu tiên trong 30 giây. `columns:` và `## Task` thêm định dạng mà chưa giải được vấn đề nào chưa được giải.

### D5. Editor: tính năng ngoài yêu cầu kéo theo dependency mới
Phần không thêm dependency (C14, C15) đã nằm ở §1. Ở đây chỉ còn **Format SQL**.

| Lựa chọn | Nội dung |
|---|---|
| A | Thêm `sql-formatter` (pin exact, tải lười, ≤ 60 KB gzip, `Shift-Alt-F`). |
| **B** | Không làm Format SQL trong bản đầu. |

**Đề xuất: B.** User không yêu cầu, và nó thêm một dependency. Người học tự định dạng SQL cũng là một phần của việc học. Thêm sau khi có người dùng hỏi.

### D6. Deploy, telemetry, backend DE

| Lựa chọn | Nội dung |
|---|---|
| **A** | Cloudflare Pages (`*.pages.dev`, `public/_headers`: `/assets/*` immutable, `index.html` no-cache), deploy từ GitHub Actions bằng `wrangler`, có preview theo PR. Chỉ có telemetry giai đoạn 1 (F9). **Không** mở plan backend DE. |
| B | GitHub Pages: phải đặt `base: '/<repo>/'` trong `vite.config.ts`, không có `Cache-Control` nên lượt quay lại tốn ~9–14 request revalidate, không có preview. Telemetry như A. |
| C | A + telemetry tự động (Cloudflare Worker + Analytics Engine, payload theo allowlist). |
| D | A + mở plan backend Python cho DE ngay (FastAPI + PgBouncer + schema lab, k6). |

**Đề xuất: A.** User cần thao tác 2 việc: tạo project Cloudflare và thêm 2 secret `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`. D đi ngược quyết định "DA trước, DE sau". Bản phác backend + k6 của DO được giữ làm tài liệu tham khảo cho lúc mở plan DE. Chỉ làm C khi có sự cố mà người chơi không tự báo được.

---

## 3. Xung đột giữa các vai và cách xử lý

| Xung đột | Chốt | Ở đâu |
|---|---|---|
| Định dạng ticket EN: PD `content/en/`, FE `# EN`, UX `.en.md` | user chọn | D1 |
| Giới hạn import: PD 10 MB/100k, DO 20 MB/200k; lưu bền: PD không, DO IndexedDB; schema: `sandbox` hay `lab` | user chọn; tên schema `sandbox` | D3 |
| Key ngôn ngữ: PD/FE `cargo-query/prefs`, UX `cargo-query/lang` | `cargo-query/prefs` | A9 |
| Nút ngôn ngữ: UX nhóm `VI \| EN`, FE 1 nút ghi ngôn ngữ đích | nhóm `VI \| EN` `aria-pressed` (thấy ngay ngôn ngữ đang dùng) | B2 |
| File i18n: PD `src/i18n.ts`, FE `src/i18n/{index,vi,en}.ts` | theo FE (cần `Msg` dạng hàm cho số nhiều) | B1 |
| Thẻ kỹ năng: UX file riêng mỗi kỹ năng, PD `skills.yml` | gộp vào `skills.yml` | A1 |
| Glossary: UX dialog không modal + tự gắn link + badge cột, PD list trong dialog, link để sau | dialog không modal + lọc; link/badge để sau | B7 |
| Lỗi SQL: UX regex trên message, FE theo SQLSTATE | SQLSTATE trước, regex cho ca đặc biệt (spike FE đã trả lời câu hỏi mở của UX) | C13 |
| Tách `main.ts`: FE coi là task refactor Plan 1c T1 sau Plan 1b T7, UX chỉ cần tách editor | viết sẵn cấu trúc tách trong Task 10 (chưa có code) | C1 |
| Thứ tự Plan 1c: PD muốn "sau Task 4–7, trước Plan 2", FE muốn "T1 sau Plan 1b T7" | các thay đổi nền gộp thẳng vào Plan 1/1b; Plan 1c chỉ chứa tính năng mới, chạy sau Plan 1b và trước Plan 2 | §5 |
| Save v2: PD (`review`, `practice`, `sandboxDraft`), UX (`bossStep`), DO (giữ bản cũ) | gộp thành **một** lần nâng v2; trường luyện tập theo D2 | A6, A8, D2 |
| Bước boss: UX muốn lưu; PD không nhắc | lưu `bossStep` trong v2; câu kết luận đang chọn dở không lưu | A6 |
| Tab trực quan: UX nêu khả năng ẩn tab theo chương, §6b đã chốt hiện đủ | không ẩn, chỉ chấm "mới" | C7 |
| Backend DE: DO phác sẵn, spec §10 ngoài phạm vi | không mở | D6 |

---

## 4. Bản đồ thay đổi → spec / plan

### Spec `2026-11-16-cargo-query-design.md`

| Mục | Thay đổi | Từ |
|---|---|---|
| §1 | 3 chế độ Học chính / Luyện tập / Sandbox (+ Dữ liệu của tôi) | E1, D2, D3 |
| §3 Tải trang | bảng ngân sách, nghiệm thu nén, kết luận RPS | F1, F2, F4 |
| §3 Định dạng ticket | `# EN` hoặc file EN (D1), `variants` (D2), `starter` (D4) | D1, D2, D4 |
| §5 | `skills.yml`, `chapters.yml` (outcomes), boss kiểm tra kỹ năng twist | A1–A3, D4 |
| §6b | thanh tiến độ, skill map, Recap, shape card, Sổ tay, nút VI\|EN, app shell/splitter, tab mặc định, mục Luyện tập/Sandbox, bảng tính năng trên dữ liệu nạp | A4, A5, B2, B7, C2, C6–C10, E2, D3 |
| §7 | lỗi gốc + giải thích; `MAX_ROWS_WORKER`; lỗi import; restart thì nạp lại `sandbox` | C13, F6, D3 |
| §8 | Save v2 + migration 1→2, giữ bản cũ, prefs tách khỏi save | A6–A9 |
| §9 | test: skills/outcomes, biến thể, khớp EN, i18n, Leitner, migration v1→v2, sqlErrors | A3, B5, B6, C13, D2 |
| §10 | **bỏ** "đa ngôn ngữ"; thêm "SQL dump, lưu bền dữ liệu nạp, telemetry tự động, Format SQL" vào ngoài phạm vi bản đầu | §1.2, D3, D5, D6 |

### Plan 1 (engine)

| Task | Trạng thái | Thay đổi |
|---|---|---|
| Global Constraints | — | "Nội dung hiển thị tiếng Việt" → "UI và nội dung VI + EN, VI là bản gốc; tên bảng/cột, SQL, lỗi Postgres giữ tiếng Anh" |
| Task 2 (`client.ts`, `worker.ts`) | **đã commit** → cần commit sửa | smoke trình duyệt; client xếp hàng query; reject `ready` cũ khi restart; `position/code/hint`; `SqlError`; `QueryTimeoutError` không kèm chữ; `timings`; `MAX_ROWS_WORKER` (§0, C12, B3, F5, F6) |
| Task 3 (`grader.ts`) | **đã commit** → cần commit sửa | `GradeResult.error?: SqlErrorInfo` (C12) |
| Task 4 (`tickets.ts`) | chưa chạy | parser `# EN`/`title_en`/`conclusion_en` (D1), `variants` (D2), `starter` (D4), `TicketText`/`textOf` |
| Task 5 (`progress.ts`) | chưa chạy | bỏ `CHAPTER_TITLES`; đọc `skills.yml`/`chapters.yml`; luật A3; check twist→boss (D4) |
| Task 6 (`save.ts`) | chưa chạy | v1 như plan + typed errors + `parseSave(known)` + giữ bản cũ (A7, A8). v2 làm ở Plan 1c |
| Task 7–9 (nội dung ch1–3) | chưa chạy | sửa gợi ý `ch1-01`; `skills.yml`/`chapters.yml` ch1–3; AVG/ROUND ở `ch2-01`; bước 3 cho boss `ch2-05`/`ch3-05`; `starter` cho `ch1-01`; content lint B6 (D4, C11) |
| Task 10 (UI) | chưa chạy | viết theo C1 (tách file) + C2–C10, C13, C14, B1–B3, F4, F8 |
| Task 11 (CLAUDE.md) | chưa chạy | ghi luật i18n, cấu trúc `src/ui/*`, key localStorage (`cargo-query/prefs`, `/layout`, `/coach-done`, `/history`) |

### Plan 1b (visualization), chưa chạy

| Task | Thay đổi |
|---|---|
| Task 1 | `NODE_HELP: Record<Lang,…>`; grep COOP/COEP sau khi cài; (D3) init tạo schema `sandbox` + `search_path`, `kind: 'import'` |
| Task 2 | gắn vào `tabs.ts`; `fmt()` theo locale; đọc `lastRun.sql` |
| Task 3 | `STEP_LABELS/STEP_HELP: Record<Lang,…>` |
| Task 4 | cache `stepsFor`; `.st.skip`/`.dim` đổi sang màu thay vì opacity; `lastRun.sql` |
| Task 6 | tham số hóa `table_schema` trong `ER_COLUMNS_SQL`/`ER_CONSTRAINTS_SQL` (dòng ~1284, 1293) |
| Task 7 | dải bản đồ thu gọn kiêm thanh tiến độ, tô cảng của ticket, `<details>` danh sách tuyến, hub dùng `--accent`, chữ qua `t()` |

### Plan mới

| Plan | Nội dung |
|---|---|
| **Plan 1c "Product layer"** (sau Plan 1b, trước Plan 2) | T1 `src/i18n/*` + nút VI\|EN + `tests/i18n.test.ts`; T2 Save v2 (`bossStep`, `sandboxDraft`, trường D2) + `save-v2.json`; T3 thanh tiến độ, skill map, thẻ mục tiêu, tổng kết chương, Sổ tay + `glossary.yml`; T4 Luyện tập (`src/practice.ts`, biến thể ch1–3) theo D2; T5 Sandbox; T6 lịch sử query; T7 dịch EN 15 ticket ch1–3 theo D1 |
| **Plan Import** (sau Plan 1c, sau 4 spike PD §4.6) | worker `kind: 'import'`, giới hạn theo D3, sanitize tên, nạp lại sau restart, ERD theo schema, mục "Dữ liệu của tôi" |
| **Plan Deploy** (song song, DevOps) | `.github/workflows/ci.yml`, `scripts/check-budget.mjs`, `public/_headers`, nghiệm thu `curl` nén, Web Analytics, nút chẩn đoán (F1–F3, F9; host theo D6) |
| Plan 2/3 (ch4–7) | mỗi task nội dung viết VI + EN (D1) + `variants` (D2) + cập nhật `skills.yml`/`chapters.yml` trước |

---

## 5. Thứ tự làm

1. Cổng §0: smoke trình duyệt Task 2 + 2 sửa ở `client.ts` + C12/F5/F6 (BE, sửa trên code đã commit).
2. Sửa văn bản Plan 1 Task 4–11 và Plan 1b theo §4 (sau khi user chốt D1, D2, D4).
3. Chạy Plan 1 Task 4–11 → Plan 1b.
4. Plan 1c. Song song: Plan Deploy (sau D6) và 4 spike import.
5. Plan Import → Plan 2/3.

---

## Quyết định của user (2026-11-16) — nguồn sự thật cho vòng 2

| # | Quyết định |
|---|---|
| D1 | Ticket song ngữ: **khối `# EN` ở cuối cùng file** + `title_en` / `conclusion_en`; frontmatter và SQL chỉ một bản. Release yêu cầu 0 ticket thiếu EN. |
| D2 | Luyện tập **đầy đủ**: `variants` với template `{{x}}` + Leitner 5 hộp [1,2,4,8,16] ngày (`src/practice.ts`) + 3 lối vào (Ôn hôm nay / Luyện kỹ năng / Làm lại ticket) + "Ôn: N". 0 XP. Save v2 thêm `review` + `practice`. |
| D3 | Import CSV **≤20MB / 200k dòng** (giữ 50 cột / 5 bảng), schema `sandbox`, **file gốc lưu IndexedDB và tự nạp lại khi mở trang**. Chưa hỗ trợ SQL dump. Mọi truy cập IndexedDB bọc try/catch, có nút xóa dữ liệu đã nhập. |
| D4 | Ticket **đầy đủ**: thêm `columns:` (khai báo cột kết quả) + mục `## Task` riêng + `starter:`; boss ch2-05/ch3-05 có bước 3 kiểm tra kỹ năng twist; dạy AVG/ROUND ở ch2-01; kiểm tra twist→boss trong `contentProblems`. |
| D5 | **Thêm** format SQL: `sql-formatter` (pin version, tải lười, phím Shift+Alt+F). |
| D6 | Deploy **miễn phí, không backend**: mặc định **GitHub Pages** qua GitHub Actions (user ưu tiên). Build phải chạy được dưới đường dẫn con (`base` tương đối / `/<repo>/`). Cloudflare Pages là phương án thay thế miễn phí (header cache + nén tốt hơn) — giữ `public/_headers` để chuyển được. Không dùng Railway/Vercel/Supabase lúc này. Telemetry: chỉ nút "copy chẩn đoán". Nhánh DE sau này: backend **Python chạy trên Kubernetes** (user muốn học K8s) — chưa mở plan. |
