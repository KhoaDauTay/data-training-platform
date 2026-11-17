# Nhật ký review

Quy tắc (user đặt):
1. Mỗi phần tối đa **3 vòng** review (skill `code-review` + advisor).
2. Sau 3 vòng: **chỉ review diff mới**.
3. **Gom bug theo loại** (correctness, security, perf, a11y, i18n, content, test-gap…).
4. **Không báo lại** bug đã ghi ở đây (kể cả đã sửa hoặc đã bỏ qua có lý do).

## Plan 1 — Task 1–3 (engine)

Vòng 1 (2026-11-16, reviewer workflow vòng 1): duyệt kèm sửa.

| Loại | Bug | Trạng thái |
|---|---|---|
| verification | Chưa chạy smoke trình duyệt cho cơ chế dừng query 5s | Đã đạt (decision-log L1) |
| correctness | `client.ts`: timer 5s tính cả thời gian query trước khi chạy song song | Đã sửa 68b5520 (hàng đợi trong client) |
| correctness | `client.ts`: `restart()` lúc đang boot làm treo `run()` đang chờ; worker lỗi sau ready vẫn nhận query | Đã sửa 68b5520 |

## Plan 1 — Task 4–11 (base d3d3a04)

Vòng 1/3 (2026-11-16): `code-review` (Standards + Spec) + cổng trình duyệt Edge. Spec: 46 file khớp plan, 228/228 test, mọi Solution boss đã chạy thật. Không có vi phạm cứng (innerHTML, storage, pin version, ngày cố định đều đạt).

| Loại | Bug | Nguồn | Trạng thái |
|---|---|---|---|
| correctness | Phím `Ctrl+Shift+Enter` không nộp bài trên Edge (nút Nộp chạy đúng) | trình duyệt | Mở |
| correctness | `work.ts:123` `record(app.lastRun)` + thông báo của `submit` gắn vào ticket đang mở lúc xong, không phải ticket lúc bấm (đổi ticket khi query đang chạy) | Standards | Mở |
| correctness | `history.ts:20` `loadHistory` không kiểm phần tử là mảng → dữ liệu hỏng làm `mountWork` throw, app không khởi động | Standards | Mở |
| correctness | `splitter.ts:17` `col`/`row` đọc từ storage không kiểm là số → `NaN%` | Standards | Mở |
| correctness | starter không nạp khi draft là chuỗi rỗng (`?? tk.starter`) | Spec | Mở |
| correctness | Recap "SQL của bạn" lấy draft hiện tại, không phải SQL đã chấm (`brief.ts:98`) | Standards | Mở |
| a11y | Nút coach "Hiểu rồi/Bỏ qua" xóa chính nó → focus rơi về `<body>` (`coach.ts:24`) | Standards | Mở |
| a11y | Radio câu kết luận không có `fieldset/legend` (`brief.ts:59`) | Standards | Mở |
| i18n | Nhãn phím ghi cứng "Ctrl" — macOS phải là ⌘ (`work.run`, `work.submit`, `res.stale`, `coach.brief`) | Spec | Mở |
| ux | Màn cao ~700px: panel kết quả nằm dưới màn, phải cuộn; popup autocomplete vẫn mở sau khi Chạy | trình duyệt | Mở |
| docs | CLAUDE.md ghi lịch sử theo `ticketId#step`, code theo ticket id (code đúng theo spec) | cả hai | Mở |
| test-gap | Luật twist→boss chỉ kiểm `requires`, không kiểm Solution boss thật dùng kỹ năng; không kiểm boss `grants: []`; chưa test "biến thể khác nhau từng đôi" | Spec | Mở |
| test-gap | Thiếu test `loadHistory` dữ liệu hỏng, race đổi ticket khi đang chạy, parse storage của splitter/coach | Standards | Mở |
| smells | `"ticketId#step"` dựng ở 2 chỗ + parse ở 1 chỗ; `setSchema+refresh` lặp 3 lần trong main.ts (import dựng editor 2 lần); `readJson` 2 nghĩa; `KV` nằm sai chỗ (`save.ts`); `Known.skills` chưa dùng; `brief.ts:85` đổi state khi render | Standards | Mở (judgement) |
| i18n (dev) | Chuỗi tiếng Việt cứng trong lỗi/`contentProblems` của `progress.ts` (chỉ dev thấy) | Standards | Bỏ qua — chỉ dev |
| scope | CSS tooltip/caret/selection dark mode ngoài L13 | Spec | Chấp nhận — cần cho tương phản AA |

Sửa vòng 1: commits a98207e…16d38b1 (base 44c892b). 262/262 test, tsc + build sạch. Mọi dòng "Mở" ở trên đã sửa, trừ: panel dưới màn (chuyển Plan 1d), smells `Known.skills` / `setSchema+refresh` lặp (để lại). **Ctrl+Shift+Enter: đã kiểm lại trên Edge — nộp được** (focus trong editor).

Vòng 2/3 (2026-11-16, chỉ diff a98207e…16d38b1): xác nhận các bản sửa. Bug mới:

| Loại | Bug | Trạng thái |
|---|---|---|
| test-gap | Listener phím toàn trang (`work.ts:65`) chưa có test (bộ lọc defaultPrevented/isComposing/dialog/input) | Mở |
| test-gap | Chưa test di chuyển focus của coach (`FOCUS_NEXT`) và focus `.recap h3` | Mở |
| correctness | Lúc boss đang ở câu kết luận, focus trên nút rồi bấm Mod+Shift+Enter → nộp lại bước cuối, dựng lại form kết luận (mất focus) | Mở (nhẹ) |
| correctness | Kiểm biến thể khác nhau từng đôi so sánh dạng chuỗi → `1` và `'1'` bị coi là trùng | Mở (edge case) |

## Plan 1d (base 5313baa)

Vòng 1/3 (2026-11-17): `code-review` (Standards + Spec) + cổng trình duyệt Edge (Trang chủ, khu làm bài, nộp ch1-03 → hoạt cảnh bãi, không lỗi console). Không vi phạm cứng về innerHTML/storage/pin/L22. 15 ticket khớp problem-design §3.

| Loại | Bug | Nguồn | Trạng thái |
|---|---|---|---|
| correctness | `stage.ts:409` Esc không bỏ qua `defaultPrevented` → Esc đóng autocomplete cũng bỏ qua/ẩn hoạt cảnh | Standards | Đã sửa 0ebf933 |
| correctness | `homeView.ts:240` `kpiResult` dùng `tk.steps[step]` không kiểm → kpis.yml sai làm `rerender()` throw | Standards | Đã sửa 0ebf933 (`kpiTiles` bỏ ô trỏ tới bước không có) |
| ux | Sau khi Nộp, panel dưới không chuyển sang tab Kết quả (vẫn ở "Cột") | trình duyệt | Đã sửa 0ebf933 |
| ux | Card chương "Sắp có" ghi "qua đánh giá chương n-1" dù đã qua / chương chưa có ticket (L21) | Spec | Đã sửa 0ebf933 |
| ux | Chữ trong SVG cảnh Tiên Sa/bản đồ tuyến co còn ~4–5px ở 375px (L23) | Spec | Đã sửa 0ebf933 (ẩn mọi chữ SVG dưới `sm`; Trang chủ hiện tiêu đề cảng, 2 dòng trạng thái và danh sách tuyến bằng HTML; chưa kiểm trên trình duyệt) |
| a11y | `stage.ts:398` `hide()` ẩn nút Bỏ qua khi nó đang có focus → focus rơi về body | Standards | Đã sửa 0ebf933 |
| a11y | Card chương khóa `<article tabindex="0">` không tương tác → thêm ~9 điểm Tab | Standards | Đã sửa 0ebf933 (gợi ý luôn hiện) |
| i18n | `#stage-skip`/`#stage-text` không relabel khi đổi ngôn ngữ (dock reduced-motion còn mở) | Standards | Đã sửa 0ebf933 |
| content | `people.yml` thiếu trường bảng dữ liệu phụ trách (L18, spec §5) | Spec | Đã sửa 0ebf933 (chỉ hiện bảng đã mở) |
| test-gap | Chưa test `stage.ts` (thay run, bỏ qua, reduced-motion, Esc), `router.ts`, `registerNav` | Standards | Đã sửa ba01594 (`stageEsc`, `upsert`; `route.ts` đã có test, `startRouter`/hoạt cảnh cần DOM nên không test) |
| test-gap | Test L22 chỉ quét vi/en dạng chuỗi, không quét content YAML; CLAUDE.md nói test chặn tên bảng/SQL trong đề nhưng test chỉ chặn backtick | Spec | Đã sửa ba01594 + 6770add |
| docs | CLAUDE.md chưa áp Task 19 Step 1 (stage/scene/harbor/routeMap/svg/people/kpis, `scene:`, chapters.yml career/tier/story); "celebrate là hoạt cảnh duy nhất", "CSS thuần chỉ cho splitter…" sai | cả hai | Đã sửa 6770add |
| smells | `registerNav` lặp `upsert`; `bilingual` + `Label` lặp `Bilingual`; 4 map theo chuỗi phòng ban; `personOf(...)?.role[lang]` lặp 3 chỗ; `c.harbor!` vs guard; `sentence()` tính tổng chương | Standards | Sửa một phần 0ebf933 (`upsert`, `Bilingual`, bảng `DEPT`, `roleLine`; bỏ qua `c.harbor!` và `sentence()`: không lỗi, diff thêm không đáng) |
| scope | Test import `src/ui/coach`, refactor `pageShortcutOf` (đóng bug vòng 2) | Spec | Chấp nhận — đóng bug đã ghi |
| product | Đánh giá chương 2 không mở tuyến mới (Rotterdam đã mở bởi ch1-05) | Spec | Chấp nhận — L34 |

Sửa vòng 1: commits 0ebf933 (fix), ba01594 (test), 6770add (docs).

Vòng 2/3 (2026-11-17, chỉ diff 60c5257..6770add): các bản sửa vòng 1 đạt, trừ dòng test L22. Bug mới:

| Loại | Bug | Trạng thái |
|---|---|---|
| correctness | `stage.ts` `returnFocus` không bị xóa khi vào dock từ body → `hide()` trả focus về phần tử của lần hoạt cảnh trước | Đã sửa 78fda81 (mỗi lần focus vào dock đặt lại `returnFocus`, null nếu không có nguồn) |
| i18n | `relabelStage()` chỉ dựng lại `#stage-text`; SVG trong `#stage-art` (nhãn, `aria-label`) giữ ngôn ngữ cũ khi dock reduced-motion còn mở | Đã sửa 78fda81 (đổi ngôn ngữ → vẽ lại khung cuối, không phát lại; chờ hoạt cảnh đang chạy xong) |
| test-gap | Test L22 quét content YAML + chữ ticket chưa được viết (`tests/i18n.test.ts` chỉ có import thừa) — dòng vòng 1 ghi "đã sửa" là sai | Đã sửa d29d21a (regex cũ chứa ký tự backspace thật thay vì `\b` nên không bắt được gì; đã kiểm test đỏ khi thêm "boss" vào people.yml) |
| ux | Chữ SVG chỉ ẩn dưới `sm`: ở 640–870px nhãn còn ~5,5–9px (L23) | Đã sửa 78fda81 (chữ SVG ẩn dưới `lg`, cỡ nhỏ nhất 12 đơn vị, dock `lg:w-[640px]` → ≥ ~10,7px Trang chủ / ~11,6px dock; HTML thay thế `lg:hidden`; chưa kiểm trên trình duyệt) |
| content | Test SQLISH cấm cả `FCL`/`LCL` (thuật ngữ nghiệp vụ thường dùng) | Đã sửa d29d21a |

Sửa vòng 2: commits 78fda81 (fix), d29d21a (test).

Kiểm trên Edge sau vòng 2 (2026-11-17): xong ch1-04 (bãi, tab Kết quả mở, đổi EN khi dock mở → chữ đổi), ch1-05 3 bước + kết luận → lên Junior DA, mở chương 2, tuyến Rotterdam (tàu) + Singapore (thăng tiến) trên Trang chủ; không lỗi console. Chưa nhìn thấy trực tiếp hoạt cảnh tàu/thăng tiến (đã chạy xong trước khi chụp). Sửa thêm: nhãn HẢI QUAN tràn chốt (2235772), câu "chốt kết luận" còn sau khi đã nộp + câu "rê chuột" cũ ở Trang chủ (a381066). **Plan 1d đóng sau 2 vòng** (vòng 3 không cần).

## Plan 1b (base bdfa998)

Vòng 1/3 (2026-11-17): `code-review` (Standards + Spec) + cổng trình duyệt Edge (6 tab với query GROUP BY, không lỗi console; ERD dựng dọc 2134px → sửa `direction LR` ở 7f33842). Sandbox EXPLAIN ANALYZE giữ được (BEGIN/ROLLBACK, qua hàng đợi + timeout).

| Loại | Bug | Nguồn | Trạng thái |
|---|---|---|---|
| correctness | `parser.ts` `ready ??=` giữ promise lỗi → một lần tải wasm hỏng làm tab Thứ tự thực thi hỏng tới khi restart worker | Standards | Đã sửa eb3b733 (`once()`) |
| correctness | Lỗi worker không phải Postgres (fetch wasm, import chunk) thành `SqlError` → hiện "Failed to fetch" như lỗi SQL | Standards | Đã sửa eb3b733, 777ed49 (`WorkerTaskError`, `err.task`) |
| correctness | Tải wasm parser lần đầu (1,7 MB) tính vào timeout 15s của `steps` → mạng chậm làm kill + seed lại worker | Spec | Đã sửa eb3b733, 777ed49 (kind `parser`, 60s, lỗi → thử lại lần mở tab sau; quá hạn vẫn khởi động lại worker) |
| correctness | Nút EXPLAIN không bị khóa khi đang chạy; `run().then(show('explain'))` vẫn chuyển tab khi đổi ticket/đang bận | cả hai | Đã sửa 890f3c7 |
| correctness | Biểu đồ: `Math.max(1, …)` ép giá trị 0–1 (tỉ lệ) xuống đáy | cả hai | Đã sửa 890f3c7 (`valueRange`, trục luôn chứa 0, cột âm vẽ sang trái) |
| correctness | `steps.ts` phát hiện window bằng `includes('"over"')` → `SELECT 'over'` bị coi là window | Standards | Đã sửa 890f3c7 (duyệt AST `FuncCall.over`, cả ORDER BY) |
| security | `erDefinition` chèn tên bảng/cột thô vào Mermaid; an toàn với `public`, sẽ vỡ với schema `sandbox` (header CSV) | Standards | Đã sửa 890f3c7, 777ed49 (`mermaidName`, giữ chữ Việt có dấu, từ khóa Mermaid thêm `_`; tên trùng sau khi thay ký tự là giới hạn đã ghi `ponytail:`) |
| ux | Tab ER trống khi DB đang boot (chưa có dòng "Đang vẽ…"); lỗi ER không qua `errorView()` | cả hai | Đã sửa 890f3c7 |
| ux | Theme Mermaid cố định lúc mở tab đầu, không theo đổi theme OS | cả hai | Đã sửa 890f3c7 (nghe `prefers-color-scheme`, vẽ lại khi tab ER đang mở) |
| ux | Dải tiến độ dùng `currentChapter`, mở lại ticket chương cũ không có chấm "đang làm" | Spec | Đã sửa 890f3c7 (chương của ticket đang mở, chấm đang mở gạch chân kể cả khi đã xong) |
| ux | Bảng dùng trong query chỉ viền đậm, spec ghi "tô màu" | Spec | Đã sửa 890f3c7 (viền đậm + màu chương `ChapterColor.hex`) |
| i18n | Nhãn nút EXPLAIN không đổi khi đổi ngôn ngữ | Standards | Đã sửa 890f3c7 |
| i18n | `STEP_HELP`/`NODE_HELP` là chữ UI không qua `t()`; CLAUDE.md tự mâu thuẫn ("viz không có chữ dịch") | Standards | Đã sửa 890f3c7, 1b200dd |
| i18n | `viz.rows`, `explain.estimate`, `unit()` hiện số thô, cạnh đó dùng `fmt()` | Standards | Đã sửa 890f3c7 (một phần: `explain.estimate` dùng `fmt()`; `viz.rows`/`unit()` vốn đã định dạng theo locale qua `t()`/`count()`, truyền chuỗi `fmt()` sẽ làm hỏng số nhiều EN → giữ số) |
| a11y | SVG Mermaid không có tên truy cập; chấm bước hiện tại chỉ bằng màu (thiếu `aria-current`); `#map` vẫn gắn nhãn "Bản đồ tuyến", `role=img` nuốt "Chương n" | cả hai | Đã sửa 890f3c7 |
| test-gap | `DbClient.request` (kind gửi worker, timeout theo job, steps ×3); `ensureParser` thử lại; `erDefinition` với tên cần escape; `"over"`; relabel nút EXPLAIN; biểu đồ giá trị âm/<1 | cả hai | Đã sửa eb3b733, 890f3c7 |
| smells | `reducedMotion()` lặp `stage.ts`; `lastRunSql` lặp dải stale; `vizTabs` tự viết lại `selected()`; `STEP_LABELS` vi=en; `kind='run'` mặc định thừa; `syncMap` data clump; `db/client.ts` import type từ `viz`; chỉ số ma `i === 2/3` trong `stepsView` | Standards | Đã sửa eb3b733, 890f3c7 (một phần: `reducedMotion`, `selected()`, `STEP_LABELS` một bản, `kind` mặc định, type của `db/client.ts`, hằng `OPTIMIZE`/`EXECUTE`; bỏ qua `lastRunSql`, `syncMap`) |
| docs | Spec §6b còn chấm "mới" EXPLAIN ở ch3-01 và công tắc "Giảm chuyển động" (trái L35); `er.layoutDirection` thừa sau 7f33842; chú thích `fmt` sai với số lẻ | cả hai | Đã sửa 1b200dd (spec, CLAUDE.md), 890f3c7 (`er.layoutDirection`, chú thích `fmt`) |

Sửa vòng 1: commits eb3b733 (db/parser), 890f3c7 (viz/ui), 1b200dd (docs), 777ed49 (lỗi worker, từ khóa Mermaid).

Vòng 2/3 (2026-11-17, chỉ diff 98532fa..2e85fd3): các bản sửa vòng 1 đạt (Spec: không phát hiện mới). Kiểm Edge: biểu đồ giá trị âm, Thứ tự thực thi, ERD viền màu chương, không lỗi console. Bug mới:

| Loại | Bug | Trạng thái |
|---|---|---|
| correctness | Yêu cầu `parser` đi chung hàng đợi query với hạn 60s → Run/Nộp chờ tới 60s rồi bị hủy (`DbRestartError`) khi tải quá hạn, DB bị seed lại vì lỗi mạng | Đã sửa (tải parser chạy bên cạnh hàng đợi ở client + worker, quá hạn không restart) |
| correctness | `valueRange()` không chặn NaN/Infinity (`'NaN'::numeric`) → SVG biểu đồ vỡ | Đã sửa (bỏ giá trị không hữu hạn khỏi trục) |

**Plan 1b đóng sau 2 vòng.**

## Plan 1c (base b2e7a10)

Vòng 1/3 (2026-11-17): `code-review` (Standards + Spec) + cổng Edge (save v1→v2 có backup, Practice biến thể tháng 8 không đổi XP, `limit` lên hộp 2, Sandbox, Sổ tay, không lỗi console). Không vi phạm cứng; migration đúng; Practice không rò sang story. Task 11 (chẩn đoán) chờ Plan Deploy.

| Loại | Bug | Nguồn | Trạng thái |
|---|---|---|---|
| correctness | Phiên ôn lặp cùng một bài: sau ch1 cả 4 kỹ năng đến hạn đều ra `ch1-03` (chỉ 2 biến thể) → trái D2 "buộc nhớ lại" | Spec | Đã sửa 9dacae2 |
| correctness | Số trên nút "Ôn: N" (`dueToday`) khác độ dài hàng ôn (`todayQueue`, tối đa 5, bỏ kỹ năng không có bài); hàng rỗng thì bấm không phản hồi (P6) | cả hai | Đã sửa 9dacae2 |
| correctness | Sổ tay mở (non-modal `dialog[open]`) làm `stageEsc` chặn Esc bỏ qua hoạt cảnh | Standards | Đã sửa 579fc8d |
| correctness | Sổ tay vẽ một lần lúc mở: đổi ngôn ngữ / học kỹ năng mới khi đang mở → nội dung cũ | Standards | Đã sửa 579fc8d |
| correctness | Hết phiên Practice: editor sống không ticket cạnh khung "Xong", draft ghi vào `run.draft` | Standards | Đã sửa 9dacae2 |
| ux | Dải tiến độ vẫn hiện trong Sandbox/Practice (spec §6b: không áp dụng) | Spec | Đã sửa 9dacae2 |
| ux | `save.practice {solved, failed}` ghi nhưng không hiện ở đâu | Spec | Đã sửa 9dacae2 (đổi tên `failed` → `weak`) |
| a11y | Đóng Sổ tay không trả focus về nút mở; `#notebook-btn` thiếu `aria-expanded` | cả hai | Đã sửa 579fc8d |
| data | `DAY_RE` nhận ngày không tồn tại (`2026-13-45`) | Standards | Đã sửa 9dacae2 |
| test-gap | Practice không đụng hintsUsed/graded/history/completed; `onSolved` định tuyến Practice vs `complete()`; round-trip export→import v2; `bossStep` lưu + resume; số ôn = độ dài hàng; hàng ôn không trùng (ticket, biến thể) | cả hai | Đã sửa 9dacae2 |
| smells | `complete()` dùng `localDay(new Date())` thay `session.today()`; `c.box <= 5` thay `MAX_BOX`; kiểu Save lặp kiểu `practice.ts`; `loadTicketTemplates()` parse 2 lần; `practice.failed` tên sai nghĩa; switch `mode.kind` lặp 6 chỗ; `modes.ts` gắn hook khi import; `mapStrings` thay cả `id/path` | Standards | Đã sửa 9dacae2, trừ switch `mode.kind` và hook lúc import (để lại, không rẻ) |
| docs | Spec §6b còn mô tả Inbox có Luyện tập/Sandbox, topbar `n/69`, màn Tổng kết chương, vị trí Sổ tay (P2/P3/P6 đã thay); E2 key `'sandbox'` (L16); CLAUDE.md chưa nói `#notebook-btn`, `session.mode` chỉ trong bộ nhớ, draft Practice không lưu; P1–P11 chưa có số L | cả hai | Đã sửa d27b011 (P1–P11 đã vào L37) |
| verification | Chưa chạy round-trip Xuất→Nhập trên trình duyệt; chưa quét "boss/sự cố" màn mới | Spec | Mở — orchestrator |

Sửa vòng 1: commits 9dacae2 (hàng ôn, thống kê, dải tiến độ, hết phiên, ngày, smells, test), 579fc8d (Sổ tay), d27b011 (spec §6b/E2, CLAUDE.md), cb484b8 (bài ôn hòa điểm xoay theo ngày; nav Luyện tập khi hết lượt), 8b99b95 (spec: bỏ màn Tổng kết chương, dialog skill map). `tsc` + 451 test + build qua.

Vòng 2/3 (2026-11-17, chỉ diff cbe3d0b..b8af619): các bản sửa vòng 1 đạt L37. Kiểm Edge: "Ôn: 1" gom 4 kỹ năng ch1 vào một mục ch1-03, banner "1 of 1", dải tiến độ ẩn trong Practice. Bug mới, sửa ngay:

| Loại | Bug | Trạng thái |
|---|---|---|
| ux | Hết phiên Practice: `#work` ẩn nhưng `#split-col` vẫn kéo được cạnh cột trống | Đã sửa (ẩn cùng `#work`) |
| data-loss | `startToday` ghi đè banner `save.writeFailed`/`save.corrupt` bằng `prac.nothingDue` | Đã sửa (không đè thông báo `save.*`) |
| correctness | Xoay vòng theo `Number('YYYYMMDD')`: qua tháng/năm hai ngày liền có thể ra cùng bài | Đã sửa (số ngày từ epoch) |
| data | Đổi `failed`→`weak` trong v2 không có fallback | Đã sửa (đọc `weak ?? failed`) |

Round-trip Xuất→Nhập: không chạy trên trình duyệt (tải file), test tự động bao phủ. **Plan 1c đóng sau 2 vòng** (Task 11 chẩn đoán làm cùng Plan Deploy).

## Plan Import (base 7ae0731)

Vòng 1/3 (2026-11-17): review Standards + bảo mật + Spec + cổng Edge (CSV 1.000 dòng: trạng thái, kiểu cột, query + Biểu đồ + ERD có `don_hang`; nạp lại sau reload; 200k × 10 cột 12 MB < 20 s, Edge ~520 MB — L39). Bảo mật: không phát hiện cứng (tên qua `ident()`, kiểu qua `COLUMN_TYPES` kiểm 2 lần, COPY từ blob, Run vẫn BEGIN/ROLLBACK).

| Loại | Bug | Trạng thái |
|---|---|---|
| data-loss | Worker mới boot lỗi sau restart: `replayImports` chỉ bỏ qua `DbRestartError` → `DbFailedError` xóa mọi file đã lưu trong IndexedDB (trái mục 12 của plan) | Đã sửa (giữ cả khi `DbFailedError`) + test |
| correctness | Header `xmin/xmax/cmin/cmax/ctid/tableoid` lọt qua `sanitizeIdent` → CREATE TABLE lỗi 42701, báo sai "kiểm số cột/UTF-8" | Đã sửa (thêm hậu tố `_`) + test |
| ux | "Xóa toàn bộ" dùng `window.confirm` gốc: chặn trang (kẹt tự động hóa), khác kiểu hộp thoại của app | Đã sửa (xác nhận 2 bước tại chỗ, focus vào nút xác nhận, VI+EN) |
| judgement | `isStoredImport` không kiểm lại giới hạn D3 khi đọc; nhập file trùng tên bảng thay thế lặng lẽ; `search_path` cả phiên nên SQL ở Làm việc/Luyện tập vẫn đọc được bảng `sandbox` (chấm điểm không ảnh hưởng); bảng tên `pg_*` bị che | Mở (judgement, để sau) |
| verification | Chưa đo trường hợp xấu nhất D3 (20 MB × 50 cột × 5 bảng), cảnh báo I3 chưa thấy trên Edge, timeout 30 s chưa thử | Mở — cần user (L39) |

**Plan Import đóng sau 1 vòng** (bản sửa nhỏ, có test; vòng sau chỉ diff nếu cần).

## Plan Deploy local (base c5af0a1, gồm bản sửa 4496e4c, dfa1856)

Vòng 1/3 (2026-11-17): review gộp + cổng Edge. Kiểm Edge: build `--base=/cargo-query/` chạy trên preview :4173 (mọi asset dưới `/cargo-query/assets/`, DB ready, tab Thứ tự thực thi + ERD tải chunk/wasm đúng, query quá 5 s → nút "Sao chép thông tin chẩn đoán" → "không chứa SQL hay dữ liệu"); trên :5173 sau restart worker bảng import nạp lại (`count(*)` = 200000). Allowlist chẩn đoán đạt (chỉ SQLSTATE, tên lỗi, thời gian, UA, build). Ngân sách: mọi nhóm ok, main 253/270 KB.

| Loại | Bug | Trạng thái |
|---|---|---|
| correctness | Lỗi `window` vô hại (`e.error === null`: ResizeObserver loop, "Script error." của extension) bật nút chẩn đoán ngay khi mở trang — thấy thật trên Edge | Đã sửa (bỏ qua `error == null`) |
| correctness | Bấm "Sao chép chẩn đoán" đè banner khác (bản mới + Tải lại, cảnh báo lưu) | Đã sửa (chỉ ghi thông báo khi không có banner khác) |
| a11y | Xác nhận "Xóa toàn bộ" mất khi rerender (nạp lại import, đổi ngôn ngữ, Run); sau "Xóa hết" focus rơi về body; bấm đúp chạy clear 2 lần | Đã sửa (cờ cấp module, focus về ô chọn file, khóa nút) — thử bằng bàn phím trên Edge |
| judgement | `app.problem` không bao giờ xóa (nút ở lại cả phiên; `js-error` sau đè `db-init-failed`); `renderTopbar` dựng lại nút làm mất focus; query chậm của người chơi hiện nút (đúng plan, trái chú thích `fault`); nhóm ngân sách theo tiền tố tên; `check-deploy.sh` không `--max-time`; CI pin theo tag chính | Mở (judgement) |

**Plan Deploy (local) đóng.** Task 8–9 CHỜ USER.
