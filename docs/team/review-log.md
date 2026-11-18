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

## Plan 2 — chương 4–6 (base d9ee368)

Vòng 1/3 (2026-11-17): review code + nội dung (đọc đủ 18 ticket VI/EN, chạy câu thay thế trên DB) + cổng Edge trên :5174 với save riêng (ch4 mở, thẻ warm-up, bài mẫu ch4-01, `wrong:` + lời người gửi, nộp đúng → hoạt cảnh chat + câu ngẫm lại, không lỗi console; khởi động bản build 6,0 → 6,8 s).

| Loại | Bug | Trạng thái |
|---|---|---|
| correctness | `submit()` thả `busy` trước `await wrongTip()` → kết quả cũ đè Run/Nộp mới hơn (kể cả câu "Đúng") | Đã sửa 54a80b6 |
| correctness | `wrongTip` chạy lại tối đa 2 query `wrong:` mỗi lần nộp sai (cả khi sai số cột); query quá 5 s làm Run người chơi nhận `DbRestartError` | Đã sửa 54a80b6 |
| correctness | ch4-04 `wrong[0]` (`= NULL`) trả rỗng → mọi kết quả rỗng đều hiện giải thích "= NULL" | Đã sửa 54a80b6, 66f0ec7 |
| correctness | Thẻ warm-up vẫn hiện sau khi ôn xong, làm lại trong ngày được, mỗi lần đúng +1 hộp → cày hộp | Đã sửa d3e11a1 |
| content | ch4-01 EN "Latest first" (nghĩa là ngày đến muộn nhất) khác VI "trễ nhiều ngày nhất" | Đã sửa 75112e0 |
| content | ch5-05 VI "chưa được thông quan" đọc thành "chưa có tờ khai" (LEFT JOIN ra thêm 5.846 dòng) | Đã sửa 75112e0 |
| content | ch5-03: làm tròn từng tờ khai trượt 7/18 dòng; đề không nói thuế suất là % | Đã sửa 75112e0 |
| content | ch6-01, ch6-06 EN chỉ nói "từ tiếng Việt cho…", không nêu tiền tố cụ thể | Đã sửa 75112e0 (code span ở ví dụ mẫu ch6-01 và gợi ý 1 ch6-06, vì đề không được có backtick) |
| pedagogy | ch5-05 (rest) độ khó 3 bằng twist; câu kết luận ch4-06/ch6-06 lặp câu ngẫm lại của twist; gợi ý ch6-04 dạy `extract(year…) =` thay vì khoảng nửa mở | Đã sửa 75112e0 |
| a11y | `reflectCard`: đáp án đúng chỉ bằng viền xanh; focus mất sau khi chọn; `role=status` tạo mới mỗi lần vẽ | Đã sửa e976724 |
| ux | Nút "Chép ví dụ vào editor" thay draft không báo có thể Ctrl+Z | Đã sửa e976724 |
| test-gap | Nhánh ô trống trong `submit`; `wrongTip` (khớp, trap, kết quả cũ); undo `setDoc`; điều kiện `warmupToday`; `reflectCard`; bảng trong SQL `wrong:`/Example đã mở theo chương | Đã sửa 54a80b6, d3e11a1, 66f0ec7 (`reflectCard` và undo `setDoc` cần DOM: kiểm trên trình duyệt) |

Sửa vòng 1: commits 54a80b6 (submit/wrongTip), d3e11a1 (warm-up), e976724 (reflect, ví dụ mẫu), 66f0ec7 (test nội dung, ch4-04), 75112e0 (nội dung). `tsc` + 789 test + build + budget qua. Chưa kiểm trên trình duyệt.

Vòng 2/3 (2026-11-17, chỉ diff af017fa..f5339be): các bản sửa vòng 1 đạt. Bug mới:

| Loại | Bug | Trạng thái |
|---|---|---|
| correctness | `wrongTipper` lưu cả lần lỗi (restart/DB lỗi) → ticket mất câu giải thích tới khi tải lại trang | Đã sửa (lỗi không lưu, lần sau thử lại) |
| correctness | Cày hộp vẫn được qua "Luyện lại việc này" (chỉ warm-up có lọc `movedToday`) | Đã sửa (mọi lần luyện đúng: mỗi kỹ năng lên hộp tối đa 1 lần/ngày) |
| judgement | Query `wrong:` quá 5 s bật banner "db-timeout" cho SQL người chơi không viết; thẻ warm-up hiện lại sau reload (không cày được); dòng "đã chép ví dụ" không tự tắt; test biến thể miễn theo giá trị, không theo key | Mở (judgement) |

**Plan 2 đóng sau 2 vòng** (kiểm Edge các mục DOM: ✓/✗ câu ngẫm lại, Ctrl+Z sau khi chép ví dụ, thẻ warm-up — làm khi user không dùng tab :5174).

## Phản hồi user khi chơi thử (2026-11-17)

| Loại | Bug | Trạng thái |
|---|---|---|
| ux/teaching | ch4-02: `date_trunc(booking_date)` → "function date_trunc(date) does not exist" bị hiểu là "date_trunc không tồn tại"; giải thích cũ của 42883 nói sai ("so sánh hai kiểu khác nhau"); `date_trunc(MONTH, …)` → "column month does not exist" không có gợi ý; đề không nói đơn vị viết trong nháy đơn | Đã sửa: giải thích riêng `sqlerr.dateTrunc`, `sqlerr.unitQuote`, `sqlerr.fnArgs` (hàm có nhưng sai tham số) + test PGlite; đề ch4-02 VI/EN nói rõ chỗ trống đầu là đơn vị trong nháy đơn |

## L42 — giao diện theo phản hồi user (base 75d27aa)

Vòng 1/3 (2026-11-17): review code + spec `docs/team/ui-ux-v3.md`. Chưa kiểm Edge (extension mất kết nối). Đạt: SVG qua `s()`, theme lưu trong prefs có kiểm tra, script đầu trang tối giản, mọi chỗ đọc theme hệ điều hành đã chuyển sang theme app, nút nhập vẫn mở được file.

| Loại | Bug | Trạng thái |
|---|---|---|
| spec | Bản đồ tuyến còn emoji 🔒 trên nhãn tuyến khóa | Đã sửa (bỏ emoji; khóa đã thể hiện bằng nét đứt + màu) |
| correctness | `kpiNumber` quyết định gọn/đủ trên số chưa làm tròn: 999.999,95 hiện "1.000.000" thay vì "1 triệu"; -0,04 hiện "-0"; NaN hiện "NaN" | Đã sửa + test |
| a11y | Hộp thư/Sổ tay chỉ còn icon ở md–lg, xl–2xl mà không có tooltip | Đã sửa (`data-i18n-title`) |
| compat | Không có Popover API (Safari < 17, Firefox < 125): menu ⋯ hiện thành khối cuối trang | Đã sửa một phần (ẩn menu; trình duyệt cũ không mở được Xuất/Nhập — chấp nhận, mục tiêu Edge/Chromium) |
| judgement | Thanh KPI dạng cột chỉ đọc số làm tròn cho trình đọc màn hình; huy hiệu đếm không tự thông báo khi đổi; Esc trên menu ⋯ cũng bỏ qua hoạt cảnh; `CARD_ACTION` lặp chuỗi `CARD`; `rounded-xl` chồng `rounded-2xl`; 1280–1535 px ẩn tên chương/nhãn nút (khác spec, cần ghi bổ sung); menu ghim `top: 3.5rem` đè header nhiều dòng; `q3margin` thiếu `unit: %` | Mở (judgement) |

## Plan 3 — chương 7–9 (base 1ccbdfc)

Vòng 1/3 (2026-11-17): review code + nội dung (đọc đủ 18 ticket VI/EN, 12 câu thay thế qua `grade()` đều đạt) + cổng Edge :5174 (save ch1–6 xong: ch7 mở, Senior DA, thẻ ôn đầu chương, icon JOIN/GROUP BY đã khác nhau, không lỗi console). Khởi động bản build: 8,4–11,3 s (trước Plan 3 ~6,8 s).

| Loại | Bug | Trạng thái |
|---|---|---|
| perf | `main.ts`: `new DbClient()` chỉ chạy sau `await loadContent()` → tải + seed DB (phần chậm nhất) chờ chunk ticket thay vì chạy song song — khớp với thời gian khởi động tăng | Đã sửa a96e884 (test thứ tự nguồn: tests/startup.test.ts) |
| correctness | `sqlErrors` map mã `42P10` → giải thích DISTINCT ON, nhưng PGlite cũng trả 42P10 cho `SELECT DISTINCT x … ORDER BY y` và `ORDER BY 2`/`GROUP BY 3` ngoài danh sách cột | Đã sửa f932d9e (khớp theo message, 3 giải thích riêng, test âm trên PGlite) |
| content | ch8-06 nói "không làm tròn từng hóa đơn" trái với ch8-04 (twist) dạy làm tròn từng hóa đơn → lệch 8 đồng | Đã sửa d5bed6d (làm tròn từng hóa đơn; `wrong:` không làm tròn đặt ở ch8-04 vì boss không có `wrong:`) |
| pedagogy | ch9-04 thiếu `wrong:` cho bẫy chính của FULL JOIN (lọc tháng ở WHERE sau khi nối) | Đã sửa 3a43da5 |
| pedagogy | NOT IN với NULL chỉ có trong câu ngẫm lại/trap, không ticket nào gặp được (các cột liên quan NOT NULL) dù mục tiêu chương 7 hứa tránh bẫy này | Đã sửa 126bfdb (ch7-05 thêm cột TEU không qua báo giá, `quotations.shipment_id` có NULL; `wrong:` NOT IN ra cột toàn 0) |
| content | ch7-02 "không cần ghi" nghe như tùy chọn (LEFT JOIN liệt kê khách 0 báo giá sẽ trượt) → "đừng ghi"; câu kết luận ch7-06 đã bị lộ ở `why` của ch7-04; câu kết luận ch8-06 hỏi giả định dữ liệu không trả lời được (dữ liệu: 49/54 lô lỗ thuộc tuyến châu Âu) | Đã sửa 126bfdb, d5bed6d |
| test-gap | `correlated_value` khớp mọi truy vấn con (`IN (SELECT`, `EXISTS`, `FROM (SELECT`) → luật twist→boss không bắt được boss thiếu truy vấn con tương quan; chưa test thông báo lỗi tải nội dung; a11y: thông báo đang tải hiện và điền cùng lúc, có thể không được đọc | Đã sửa 711710e (correlated_value + test âm), a96e884 (điền chữ trước khi hiện); bỏ qua test thông báo lỗi tải nội dung: môi trường test không có DOM |

Sửa vòng 1: commits f932d9e, a96e884, 711710e, d5bed6d, 126bfdb, 3a43da5, 65bf058, 589597a. Cần kiểm trên trình duyệt: thứ tự tải (worker PGlite bắt đầu trước/song song chunk ticket) và thời gian khởi động bản build; thanh trạng thái DB khi DB sẵn sàng trước khi nội dung tải xong; trình đọc màn hình đọc thông báo đang tải.

Vòng 2/3 (2026-11-17): review lại các sửa vòng 1.

| Loại | Bug | Trạng thái |
|---|---|---|
| content (hard) | ch7-05: cột TEU không qua báo giá toàn-có-hoặc-không theo chiều hàng trong 5 tuyến đầu (báo giá chỉ gắn lô xuất khẩu đường biển: 3 tuyến xuất = 0, 2 tuyến nhập = đủ TEU), nên `CASE WHEN s.direction = 'IMPORT'` qua mà không cần NOT EXISTS; `wrong:` NOT IN chỉ lệch 2 dòng | Đã sửa 2891dc5: ch7-05 về bản trước 126bfdb (độ khó 2, bảng/requires cũ). Không ticket chương 7 nào có câu ngoài là `shipments` với danh sách `quotations.shipment_id` (ch7-01/02/03/04 hỏi theo báo giá hoặc `customer_id` NOT NULL; ch7-06 là boss, không có `wrong:`), nên bẫy NOT IN với NULL chỉ còn ở thẻ kỹ năng `in_subquery` và câu ngẫm lại ch7-02; mục tiêu chương 7 bỏ vế "tránh bẫy NOT IN với ô trống" (VI + EN) |
| judgement | `correlatedSubquery` có thể bắt sai/bỏ sót: tham chiếu câu ngoài không alias cùng bảng, nối bằng dấu phẩy, bảng dẫn xuất, LATERAL | Mở (judgement, chỉ ảnh hưởng kiểm nội dung) |
| judgement | `startup.test.ts` chỉ kiểm thứ tự chữ trong nguồn; worker vẫn seed khi tải nội dung lỗi | Mở (judgement) |
| pedagogy | ch9-04: `wrong:` lọc tháng ở WHERE sau FULL JOIN hiếm khi khớp câu người chơi hay viết | Mở: dạng hay gặp (CTE không lọc tháng, `WHERE (b.atd trong tháng OR i.issue_date trong tháng) AND (b.id IS NULL OR i.shipment_id IS NULL)`, cũng như dạng `(… OR b.id IS NULL) AND (… OR i.shipment_id IS NULL)`) ra 0 dòng ở biến thể 08/2026 và 06/2026, còn ở 10/2026 trùng hệt `wrong[0]` (12 dòng), nên không thêm được (content.test đòi có dòng và khác Solution ở mọi biến thể); dạng AND cả hai tháng thì rỗng theo cấu trúc. Giữ `wrong:` hiện có |

**Plan 3 đóng sau 2 vòng.**

## Plan 4 — chương 10–12 (base c741c6e)

Vòng 1/3 (2026-11-17): review code + bảo mật + nội dung (đọc đủ 18 ticket, ~25 câu thay thế/tấn công trên PGlite) + cổng Edge :5174 (save ch1–10 xong: ch11 mở, Lead DA; ch11-01 câu đúng kết quả nhưng Seq Scan bị chấm chưa đạt + mở tab EXPLAIN có chấm "mới"; câu dùng index thì đạt; ch11-04 index sai cột → giải thích trước/sau, index đúng → đạt; sau lab `pg_indexes` chỉ còn khóa chính; không lỗi console). Không có gì tồn tại sau lab (DROP/COMMIT/set_config đều rollback); plan ổn định giữa các lần boot; kết luận ch10/ch12 khớp dữ liệu.

| Loại | Bug | Trạng thái |
|---|---|---|
| security | `isCreateIndex` bỏ comment bằng regex, nhưng comment Postgres lồng nhau: `/* /* */ CREATE INDEX */ DROP TABLE claims` qua kiểm tra và `runLab` chạy DROP (vẫn rollback); `--` trong chuỗi bị cắt nhầm | Đã sửa f52508c, fb08192 (tokenizer: comment lồng, chuỗi/dollar-quote, `--` hết ở CR hoặc LF, cấm dấu gạch ngược; worker kiểm pg_class: đúng 1 chỉ mục mới trên bảng lab, bảng khác → LAB02) |
| correctness | `sqlerr.42P20` map theo mã: PGlite cũng trả 42P20 cho lỗi khung (RANGE offset cần đúng 1 cột ORDER BY, frame bắt đầu từ current row, window trong HAVING) → giải thích "WHERE không lọc được" sai | Đã sửa 8bbbe08 |
| correctness | EXPLAIN chấm theo plan dùng chung `try` với chấm điểm: timeout/restart lúc EXPLAIN báo "Lỗi nội dung ticket" | Đã sửa 7a46cd2 |
| correctness | `window_agg` không bắt `SUM(SUM(x)) OVER`, `SUM(COALESCE(x,0)) OVER` (đối số lồng) | Đã sửa 4a51fbe |
| ux | Lab không ghi lịch sử, không đặt `lastRun` (các tab vẫn hiện lần chạy cũ) — chưa ghi trong tài liệu | Đã sửa f52508c, fb08192 (lab ghi lịch sử câu DDL, xóa `lastRun`, vẽ lại tab; ghi trong CLAUDE.md) |
| content | ch11-03 hứa "chỉ mục biểu thức là việc của bài thiết kế chỉ mục" nhưng ch11-04 không nhắc | Đã sửa dad3b71 (bỏ lời hứa, gọi tên chỉ mục biểu thức) |
| pedagogy | RANK vs DENSE_RANK chỉ khác ở biến thể 1 của ch10-01 (biến thể 0, 2 và bước 1 của bài thăng tiến hòa chỉ ở hạng cuối) | Đã sửa dad3b71 (ch10-01 cả 3 biến thể, thêm `wrong:` DENSE_RANK); bước 1 ch10-06 không tách được với dữ liệu cố định (quý 1–3/2026 RANK = DENSE_RANK với mọi n 2–6) |
| pedagogy | ch11-04: gợi ý dạy `(container_id, event_time)` nhưng chỉ `container_id` cũng đạt ngưỡng 10% → bài học "cột thứ hai trả dòng đã sắp" không được kiểm; ch12-06 có thể nhắc phí D&D được chuyển cho khách | Đã sửa ae839dc (hai chỉ mục cùng tỉ lệ 0,0163 ở mọi biến thể nên không tách được; sửa gợi ý/giải thích: cột thứ hai không bắt buộc); ch12-06 không đổi |
| perf | Reviewer đo seed 2,85 s (Node) — vượt ngưỡng S2 2,0 s nếu đúng; build agent đo 1,84–1,94 s | Đã đo lại (máy không rảnh, CPU 13–29%): 5 tiến trình riêng 2,01 / 2,03 / 1,97 / 1,93 / 2,38 s; vòng 5 lần trong 1 tiến trình 2,14–3,79 s và 3,10–5,04 s. Không đổi dữ liệu; cần đo lại trên máy rảnh |

Sửa vòng 1: commits 8bbbe08, f52508c, 7a46cd2, 4a51fbe, dad3b71, ae839dc, fb08192. Thay đổi hành vi: chỉ mục trên bảng khác bảng lab giờ là lỗi LAB02 (không tính nộp sai). Chưa kiểm trên trình duyệt.

Vòng 2/3 (2026-11-17): review lại các sửa vòng 1 (tokenizer lab, map lỗi, `window_agg`, lỗi EXPLAIN lúc chấm). Không có trình duyệt.

| Loại | Bug | Trạng thái |
|---|---|---|
| security | `codeOnly()` coi `$tag$` là dollar-quote khi ký tự trước không thuộc `[\w$]`, nhưng Postgres coi chữ không phải ASCII là ký tự định danh: `CREATE INDEX é$a$ ON container_events (container_id); DROP TABLE claims --$a$` qua `isCreateIndex` (chỉ PGlite từ chối nhiều câu lệnh mới chặn được) | Đã sửa c062f00 (`$` ngay sau ký tự định danh/số hoặc ký tự không ASCII thì từ chối, vì `1$a$`/`0x1F$a$` Postgres lại đọc là số rồi dollar-quote; tag nhận ký tự không ASCII như `dolqdelim`) |
| correctness | `SUM(ROW_NUMBER() OVER ())` → 42803 "aggregate function calls cannot contain window function calls" nhận ghi chú GROUP BY (`sqlerr.42803`) | Đã sửa c062f00 (`sqlerr.aggWindow`: tính hàm cửa sổ trong truy vấn con/CTE rồi gộp; test PGlite thật) |
| correctness | `aggregateOver` quét văn bản thô và quét lại tới cuối với mỗi `SUM(` chưa đóng (bậc hai) | Đã sửa c062f00 (quét `codeOnly(sql)`, ghép ngoặc một lượt; 200 KB `SUM(` chạy nhanh) |
| ux | `CREATE INDEX IF NOT EXISTS` với tên đã có không tạo gì nhưng báo LAB01 "chỉ chạy đúng một câu CREATE INDEX" | Đã sửa c062f00 (LAB03 / `sqlerr.labNone`: không có chỉ mục mới, tên đã có hoặc không có gì thay đổi) |
| test | Nhánh `planError` khi EXPLAIN trả `SqlError` chưa có test | Đã sửa c062f00 (hiện thông báo Postgres + ghi chú, không "lỗi nội dung ticket", không chấm) |
| ux | Chỉ EXPLAIN lỗi lúc chấm thì không có dấu hiệu "chưa ghi điểm" | Mở (judgement) |
| ux | Chạy câu không phải chỉ mục trong editor lab không ghi lịch sử, giữ `lastRun` cũ | Mở (judgement) |
| correctness | `SUM(x) /*c*/ OVER` hoặc `)` trong chuỗi bị `window_agg` bỏ sót | Đã sửa c062f00 (cùng sửa `aggregateOver` ở trên) |

**Plan 4 đóng sau 2 vòng.**

## Cổng cuối Mốc 2 (2026-11-17)

Kiểm Edge trên code cuối (sau mọi bản sửa Plan 4): ch11-01 câu đúng kết quả nhưng Seq Scan → chưa đạt, câu dùng index → đạt; ch11-04 index bảng khác → LAB02, index đúng → đạt, lịch sử 2 dòng, các tab không hiện kết quả cũ; ch12-06 bước 4 + kết luận → hoạt cảnh thăng tiến "Lead DA → Trưởng nhóm Phân tích", 69/69 việc; tải lại Trang chủ: "Bạn đã xong mọi ticket hiện có", KPI biên lợi nhuận Q3 = 16,6; build `/cargo-query/` + `check-deploy.sh` (thêm kiểm chunk ticket) đạt; không lỗi console. Còn nhỏ:

| Loại | Bug | Trạng thái |
|---|---|---|
| i18n | Dòng lỗi LAB02/LAB01 ("the index must be on the container_events table") là tiếng Anh do app viết, hiện cho người chơi VI (giải thích VI ở dưới vẫn đúng) | Mở |
| ux | Khi đã xong 69/69, khung cảng vẫn ghi "đang làm chương 12" | Mở |
| verification | Chưa xem lại trên trình duyệt: ✓/✗ câu ngẫm lại, Ctrl+Z sau khi chép bài mẫu, thẻ ôn đầu chương ẩn sau khi xong (Plan 2); giao diện L42 ở 375/820 px, theme giữ sau khi tải lại, khu làm việc + ERD ở theme tối, menu ⋯ | Mở — chưa kiểm |
| docs | Spec và curriculum còn ghi số bảng cũ và vài tính năng đã bỏ/dời ở L41–L45 | Mở |

## Plan 5 — dashboard + bài tuyến đợt 1 (base 2f1c032)

Vòng 1/3 (2026-11-17): review code + nội dung (9 lời giải bài tuyến, 14 câu thay thế, 12 đạt) + cổng Edge :5174 (save v2 ch1–7 → v3 có backup; Bảng điều hành trống + 12/16 ô công ty; bản đồ → hồ sơ Rotterdam (Tiên Sa, "+40%" hiện vì đã qua ch7); R-2 nộp đúng +50 XP, `completed` không đổi; Ghim lên → card cột trên bảng; không lỗi console).

| Loại | Bug | Trạng thái |
|---|---|---|
| data-loss | Card dùng bảng CSV import lỗi 42P01 khi mở thẳng `#/dashboard` (router chạy trước `myData.restore()`), lỗi được giữ cả phiên; xóa import thì card vẫn hiện kết quả cũ | Đã sửa 08dc0df |
| correctness | `setLang`: bấm EN (chunk đang tải) rồi VI → khi EN tải xong lại đặt EN | Đã sửa 27e88d8 |
| content | r-1 không nói cách làm tròn trung bình (`ROUND(AVG, 1)` bị chấm sai) | Đã sửa 0941d3f |
| ux | Nav 6 mục làm thanh trên cùng xuống dòng (chấm DB + ⋯) ở 1451 px | Đã sửa 569ca99, 8bab878 (chưa kiểm bằng trình duyệt) |
| ux | Biểu đồ trong card cột quá nhỏ, nhãn không đọc được | Đã sửa b6c3e1d, fb3c276 (chưa kiểm bằng trình duyệt) |
| test-gap | `tests/setup.ts` gọi `loadLang()` không đối số → máy locale vi không tải EN | Đã sửa 27e88d8 |
| security | Save nhập từ người khác tự chạy SQL card khi mở bảng (vẫn ROLLBACK + 5 s) — query nặng bộ nhớ có thể làm sập worker lặp lại | Đã sửa 08dc0df |
| validation | `save.lanes` nhận cả id việc chính; `col` vượt số cột → card số hiện NaN | Đã sửa e0addb1, fb3c276 |
| content | R-3 khóa vẫn hiện tiêu đề "Đợt tăng giá tháng 7" trước ch7 (L49 chỉ ẩn "+40%") | Đã sửa 46ef9f5 |
| content | sg-1: chuyện "đầu kéo lớn cho lô nặng" lệch (đầu kéo chở một container) | Đã sửa 0941d3f, cbb9808 |

Sửa vòng 1: commits 27e88d8, 0941d3f, e0addb1, 46ef9f5, 08dc0df, b6c3e1d, 569ca99, cbb9808, fb3c276, 8bab878.
- data-loss + save nhập: thay đổi "Dữ liệu của tôi" (restore, thêm, xóa) xóa mọi kết quả card (`resetCards`) rồi vẽ lại; card chỉ tự chạy khi (id + SQL) đã chạy không lỗi trên máy này (`cargo-query/cards-ran`, kiểm khi đọc; Ghim lên tự ghi). Card cũ của người chơi hiện "Chưa chạy trên máy này" một lần sau bản này.
- Topbar: 1280–1919 px ẩn nhãn thương hiệu/hành động, rank và icon bản đồ; nav `px-1.5 gap-0.5`, nút hành động `px-2`, status `px-2`, header `xl:px-3 xl:gap-x-2` (ước ~1.200 px với chữ đo theo lần wrap 1451 px, ≤ 1.248 px). Từ 1920 px hiện lại nhãn và rank; tên chương không hiện ở ≥ 1280 nữa (thay dòng "1280: tên chương 16rem" của ui-ux-v3 §a; tên đầy đủ ở `title`, dải bản đồ và Trang chủ). 820/375 không đổi. Chưa đo bằng trình duyệt.
- Card biểu đồ: viewBox 260 đơn vị, `min-w-[260px] max-w-[400px]` (không thu nhỏ dưới 1:1: chữ 12 px, cột 18 px; xem trước trong hộp Ghim không phóng quá 1,5×), số trên cột dạng gọn ("1,2 Tr"), số đủ ở tooltip. `colGone` chỉ khi biểu đồ vẫn hợp mà cột không còn (không có dòng → "chart.empty").
- R-3: L49 ghi "R-3 hiện tiêu đề"; vòng này ẩn tiêu đề khi còn khóa (`titleHidden`, chỉ r-3), dòng vẫn hiện "Bài tuyến 3 · mở sau chương 7". Cần user xác nhận có thay L49 không.
- sg-1: `pod = 'SGSIN'` là cảng đích (không đổi tàu), nên chuyện mới là tàu gom nhỏ đi Singapore có trọng tải hạn chế, chuyến gần đủ tải thì lô nặng bị dời sang chuyến sau (theo lô, không theo container; 10 lô đầu đều SEA FCL ~48 t); Solution giữ nguyên.

## Thuật ngữ (L51)

Áp bảng `docs/team/glossary-vi.md` (L51, mặc định của user) trong commits 57cf36c, 46784eb, dee3c19. Dò lại dòng trên HEAD sau Plan 5 và vòng sửa 1; code span, Solution và `answer` không đổi; SAME_OK không cần sửa.

**Đã áp:**
- A1–A10: nhãn kỹ năng kèm từ khóa/thuật ngữ EN; "Đối soát hai phía"; trap ROW_NUMBER bỏ "cắt hòa". Thêm "(index)" và "(sargable)" một lần ở thẻ `sargable`.
- B1. B3 một phần: thêm D&D, Reefer, Claim, Customs clearance vào `glossary.yml`. B4: điền `columns` cho HBL, MBL, Free time (bảng đã có), sửa ghi chú đầu file.
- C1–C11, và cùng loại ở chuỗi Plan 5: `dash.intro`, `dash.emptyTitle`, `dash.empty`, `dash.slow`, `card.colGone`, `pin.fast`, `pin.slow`, `pin.slowHelp` ("query" → "truy vấn").
- D1–D5 ("chỉ mục"); thêm "kế hoạch thực thi (execution plan)" và "chỉ mục (index)" lần đầu ở thân đề ch11-01.
- E1–E17, I5 ("ghép" → "nối" ở giọng dạy SQL), thêm ch3-03 "phép ghép thông thường" và lane `ausyd/s-2` gợi ý 1 (cùng loại). Task ch9-04 "Ghép theo lô" giữ (giọng nghiệp vụ).
- F1–F9 và câu trong ticket (ch2-02, ch3-05; EN "ticket" → "task" ở ch2-02 gợi ý 2, ch3-05 conclusion và gợi ý 1). Tên test `coach.test.ts:52` đổi theo.
- G1–G2, I3, I4 ("biên lợi nhuận gộp"). H1, H2/I2 (cả Task, `columns` ch3-01), H3 (cả ví dụ ch8-01 "bảng tạm" cùng loại), H4/I1, H6, H7, H8 (chỉ VI; EN "lab" giữ).

**Bỏ qua theo L51:**
- B2, H5 và mục Storage của B3: storage/DEM/DET giữ nguyên, ghi "chưa kiểm chứng" ở `glossary.yml` (chú thích trên Demurrage) và ở mục 5 của bảng thuật ngữ.
- "vận đơn nhà (HBL)", "hàm gộp", tên Incoterms: giữ, không cần sửa.

Lane mới (`content/lanes/**`) đã soát cùng các mẫu: chỉ `ausyd/s-2` cần sửa. tsc, 1472 test, build, budget đều qua. Chưa kiểm bằng trình duyệt.

## Plan 6 — bài học nhanh ch1–3, nội dung ch1–3, gợi ý miễn phí ch1 (base 1128b37)

Vòng 1/3 (2026-11-17): review code + nội dung (11 bài học: ví dụ và Thử ngay so với mọi Solution ch1–4 ở mọi biến thể, không trùng; câu "Lỗi hay gặp" chạy ra đúng lỗi/kết quả như lời giải thích; tên bài học trong gợi ý 1 đều là nhãn kỹ năng thật; `reflect`/`wrong:` của ch1-03, ch2-03 đi qua `applyVariant`) + cổng Chrome :5174 (save mới).

| Loại | Bug | Trạng thái |
|---|---|---|
| perf | `textValues` dùng `memoByKey` mặc định (`MEMO_MAX` 20, bỏ mục cũ nhất, lần trúng không làm mới): từ chương 12 có 22 bảng + 2 bảng tuyến, nên tab Cột "Tất cả bảng đã mở" chạy lại mọi câu giá trị ở mỗi lần vẽ, xếp hàng trước Chạy của người chơi | Đã sửa ab8c355 (max 100; test đếm câu qua hai lượt 24 bảng) |
| correctness | Thẻ bài học: kết quả "Chạy ví dụ" / "Chạy & kiểm" về sau khi brief đã vẽ lại (vd. DB còn đang khởi động, người chơi bấm Gợi ý) chỉ vẽ vào thẻ đã tách khỏi trang, thẻ mới không hiện kết quả | Đã sửa 8fdd7a4 (vẽ lại khi thẻ đã tách) |
| docs | `src/lessons.ts` ghi bài học "parsed from the lazy ticket chunk" (là chunk riêng); CLAUDE.md còn ghi luật reflect/faded/`wrong:` "From chapter 4" | Đã sửa 3f90e60 |
| docs | Bước Task 7 bị bỏ: đoạn sửa đổi `problem-design.md` §1.5 | Đã sửa f54da74 |
| spec | §C.2 vẽ bảng kết quả ví dụ "≤ 8 dòng"; ví dụ trả 9–36 dòng và thẻ hiện cả bảng (dài trong brief) | Mở (judgement; plan đã ghi số dòng) |
| ux | "Đã hiểu ✓" / Thử ngay đạt trong hộp thoại không vẽ lại brief: thẻ cùng kỹ năng trong brief vẫn mở tới lần vẽ lại sau | Mở (judgement, như U8) |
| a11y | Chip có bài học dùng `title` (khóa `chip.lessonAria`) chứ không `aria-label` | Mở (judgement: tên truy cập là nhãn chip, `aria-haspopup` báo hộp thoại) |
| spec | U2 (file `lessons.yml` riêng), U3 (main 268,5/270), U5 (miễn phí mọi bậc ch1), U8 (Thử ngay đạt không thu gọn ngay): lệch thiết kế đã khai trong plan | Mở — chờ user |

Cổng Chrome (:5174, localStorage xóa trước, coach bỏ qua): ch1-01 thẻ "Bài học nhanh · Chọn cột (SELECT)" mở sẵn trước "Yêu cầu"; Chạy ví dụ 9 dòng, editor và tab Kết quả không đổi; Thử ngay sai "9 dòng có giá trị chưa đúng…", đúng "Đúng rồi!…", XP vẫn 0, pref `{"seen":["select"],"tried":["select"]}`; chip là nút mở `#lesson-dialog` (modal), Esc đóng, focus về chip; "Đã hiểu ✓" thu gọn, focus ở "Mở lại". ch1-02: editor `WHERE ___ AND ___`, Nộp → "Còn 2 chỗ trống…; lần này không tính là nộp sai"; nộp OR → lời `wrong:` về OR; nút "Gợi ý 1/3" không ghi giá; chip "Kỹ năng mới:" / "Cần dùng:". Tab Cột: `country`, `region`, `kind` có dòng giá trị, `code`/`name` không có dòng trống. Theme tối đọc được; cửa sổ không thu nhỏ được (máy giữ 1267 px) nên kiểm 375 px bằng iframe 372 px cùng origin: brief và thẻ không tràn ngang (scrollWidth 357), hộp thoại thành tấm đáy. Sổ tay: 11 nút "Bài học nhanh". Không lỗi console sau khi tải lại. Chưa kiểm: EN, hai bài học xếp chồng ch3-03, gợi ý có giá ch2, Tổng kết ch1 với save cũ.

Sau vòng 1: tsc sạch, 1594 test, build sạch, main 268,5/270 KB gz (budget mọi nhóm ok).

## Plan 7 + v10 reviews (base d312e83, 2026-11-18)

Ba review của bản v10 (BoonData): code review (d312e83..6a6f1ec), UI/UX (designer, Chrome 1267 px + 375 px, sáng/tối), người chơi thử end-to-end (ch1–3 đủ, ch4–12 mỗi chương một việc + đánh giá thăng tiến, tuyến SG). Sửa trong 04f610e, 040da9e, d964cb9, 9e0c6a8, f459bc8, 5cf2d6a, c39c38a. Kiểm lại trong Chrome (:5174, localStorage xóa trước): tour 1 cuộn vào tầm nhìn, bước 3 nằm giữa thanh tab và bảng kết quả, bước 4 ngay dưới "Run the example", bước 8 sau thẻ Recap; Esc trên Home khi đóng menu ⋯ không bỏ tour (coach-done vẫn null); click vùng trống dưới dòng 1 gõ được; lỗi SQL: Boon nói ghi chú, tab Kết quả chỉ còn thông báo Postgres + HINT; dock hoàn thành đóng khi đổi trang; cảnh chat (ch3-01) kết thúc với thẻ còn hiện (opacity 1); tổng kết chương 1 có Lily + Boon, một nút "Start chapter 2 →", Recap của bài thăng tiến không còn nút; lớp phủ sidebar có nền tối, click ngoài thì đóng.

| Loại | Bug | Trạng thái |
|---|---|---|
| correctness | Esc bỏ tour khi người chơi chỉ đóng menu ⋯/sổ tay, hoặc đang ở trang khác (dấu nằm trong workspace ẩn) | Đã sửa 04f610e (`tourEscSkips` thuần + test: chỉ khi dấu hiện và không ai nhận Esc) |
| spec | Hai linh vật trong một vùng (dấu tour + Boon/Lily ở phản hồi, Boon ở gợi ý) | Đã sửa 04f610e (`tourRegion()`) |
| spec | Dấu tour lồng trong thẻ (bước 8 trong Recap, bước 3/5 trong tab Kết quả) — mâu thuẫn luật "không ở tab Kết quả" | Đã sửa 04f610e (slot panel giữa thanh tab và thân tab, slot recap sau thẻ) |
| ux | Tour bắt đầu ngoài màn hình; bước 4 nói "Chạy ví dụ" nhưng nằm dưới nút "Chạy & kiểm" | Đã sửa 04f610e (cuộn vào tầm nhìn một lần mỗi bước; bước 4 dưới nút ví dụ; nút thử đổi tên "Kiểm câu trả lời") |
| correctness | Nộp editor trống được chấm và ghi ✓ 0 dòng; click dưới dòng 1 không vào editor | Đã sửa 040da9e (Chạy/Nộp trống bị từ chối, không tính nộp sai; `.cm-content` cao 160 px) + test d964cb9 |
| ux | Mỗi bước đánh giá thăng tiến bắt đầu trống, dải "SQL đã thay đổi" | Đã sửa 040da9e (bước sau bắt đầu từ SQL vừa đạt; không áp cho bước lab) + test |
| content | Đáp án kết luận/reflect gần như luôn là lựa chọn đầu (68/69) | Đã sửa 040da9e (`optionOrder`: thứ tự xáo cố định theo ticket, giá trị lưu vẫn là chỉ số gốc) + test |
| correctness | Cảnh hoàn thành chat/quote/ledger kết thúc bằng khung trống (thẻ mờ dần, không có tranh phía sau) | Đã sửa 040da9e (thẻ giữ ở trạng thái cuối) |
| ux | Dock hoàn thành vẫn che trang sau khi đổi trang | Đã sửa 040da9e (`hashchange` đóng dock) |
| ux | Editor không xuống dòng | Đã sửa 040da9e (`EditorView.lineWrapping`) |
| content | ch11-06 kết luận bảo chạy lại câu bước 2 trong editor chỉ nhận CREATE INDEX | Đã sửa 9e0c6a8 (chỉ sang Sandbox, lấy câu từ Lịch sử) |
| content | ch3-01 thiếu tie-break bị báo bẫy JOIN; SG-3 không nói mã hay tên cảng | Đã sửa 9e0c6a8 (`wrong:` cho `s.ref` tăng dần; SG-3 "mã cảng xếp hàng", nhãn cột) |
| content | Luật làm tròn nêu bằng tham chiếu (ch8-06, ch12-01) | Đã sửa 9e0c6a8 (nói thẳng: làm tròn tới đồng ở từng hóa đơn, trước khi cộng) |
| content | ch5-06 bước 3 thiếu luật bản thay nộp sau quý; kết luận ch5-06/ch2-05 giả định cách làm; ch7-06 cần bảng bước 2 đã khuất; ch5-02 "tháng 9-10/2026"; tie không nói chiều (ch10-03, ch11-01, ch11-02) | Đã sửa 9e0c6a8 |
| ux | Thẻ "Kết quả mong đợi" ghi "có thứ tự" cho kết quả một dòng | Đã sửa 9e0c6a8 |
| ux | Lỗi SQL: Boon chỉ nói "xem tab Kết quả", câu giải thích nằm ở tab | Đã sửa f459bc8 (`errorNote` trong lời Boon; tab Kết quả `errorView(e, false)`) |
| ux | Luyện tập hiện câu chuyện chương và nhãn "Kỹ năng mới" | Đã sửa f459bc8 |
| ux | Tổng kết chương: chữ đều nhau, không linh vật, hai nút chính | Đã sửa f459bc8 (Lily + Boon, bước nghề nổi bật, một nút "Bắt đầu chương N →"; Recap bài thăng tiến bỏ nút) |
| copy | "Chủ đề kỹ năng" không tồn tại; "Ôn tập · 0 XP"; "Dựa vào" cho kỹ năng chương dạy; nhãn "Luyện" trùng Luyện SQL; "Xem tuyến" ở tuyến khóa; lời chào không nhắc Boon | Đã sửa f459bc8 (các khóa i18n VI + EN) |
| a11y/visual | Viền focus trên h1/h2 được focus bằng script | Đã sửa f459bc8 (chỉ heading `tabindex=-1`; tab vẫn có viền) |
| visual | Thẻ "Chế độ khác" màu bão hòa; huy hiệu Ôn tập đỏ như hộp thư; Dashboard nút trùng, hàng chip, nút ẩn trên ô khóa; nút "Áp dụng" sát thẻ; "Head of Analytics" xuống dòng; ô tìm Data không placeholder | Đã sửa f459bc8 |
| ux | Trạng thái tải DB là câu dài làm thanh trên xuống 2 dòng, còn "15,6/15,6 MB" khi đã tải xong | Đã sửa f459bc8 (chấm + %; câu đầy đủ ở title/sr-only; tải xong thì "Đang khởi động") |
| content | Thẻ kỹ năng WHERE có IN trước khi dạy IN | Đã sửa f459bc8 |
| ux | Lớp phủ sidebar không nền tối, click ngoài không đóng; thẻ mục tiêu chương đẩy yêu cầu xuống | Đã sửa 5cf2d6a |
| docs | CLAUDE.md: `search_path`, `'public'`, mục Home theo `pages`, nút Ôn tập trống, khóa route, luật linh vật/tour | Đã sửa c39c38a |
| spec | Sandbox: câu mẫu quay lại khi người chơi xóa hết bản nháp | Mở (judgement L62: Save không có cờ "đã vào Sandbox"; thêm cờ cần đổi Save) |
| content | ch2-01/ch2-05 "làm tròn 2 chữ số" không được chấm (grader làm tròn mọi số) | Mở (judgement L63: grader so ở 2 chữ số là thiết kế) |
| content | ch5-05 JOIN có thể nhân dòng nếu một lô có hai tờ khai chưa thông quan | Mở (judgement L64: seed cố định cho 0 dòng trùng; EXISTS dạy ở chương 7) |
| ux | Thanh trên mobile 3 dòng; icon lặp ở rail/drawer; module Learning path đặt tên theo chương Logistics; trang Map mở lại bản đồ trong hộp thoại; cảnh tối vẫn ban ngày; Home lặp header; Data ở rail không có chọn bảng; sidebar: cuộn về cuối, nhãn bị cắt, danh sách bảng có viền | Mở (judgement L65: mỗi mục > 30 phút hoặc là thiết kế lại; Plan 8a/8b làm lại Learning path, Map, minh họa) |
| ux | Lời cảm ơn theo phòng ban lặp lại; "Bảng liên quan" có cả bảng cha FK ở chương 1; nút "Về việc đang làm" sau khi giải một việc cũ | Mở (judgement L65: lời cảm ơn là thiết kế L18; bảng cha là ui-ux-v4 §4; nút đúng khi việc vừa giải không phải việc liền trước, do save thử của người review) |
| ux | Phản hồi SG-3 khi chỉ cột nhãn sai vẫn nói "kiểm lại cách tính" | Mở (đề đã nói rõ mã cảng; chẩn đoán theo cột cần đổi grader) |
| ux | "Thử ngay" báo lỗi đỏ ngay lần bấm đầu khi đang tour | Mở (judgement: nút đã đổi tên "Kiểm câu trả lời" và bước 4 nay chỉ đúng nút "Chạy ví dụ"; câu mẫu sai cố ý là bài tập) |
| ux | Sắp lại brief (tin nhắn → Yêu cầu → Kết quả mong đợi) | Một phần (5cf2d6a thu gọn mục tiêu chương; giữ bài học trước Yêu cầu theo v4 §C.3; bài học đã "Đã hiểu" vốn đã thu gọn) |
| ux | Luyện SQL: hàng kỹ năng chưa học không có hành động, chưa có drill; 11 module so với 12 | Mở (Plan 8a làm drill và Learning path, L60) |
| ux | Ví dụ SQL của bài học không có dấu ①; hộp "Correct!" cao mà một chữ; bài học nhanh chưa có Boon | Mở (ví dụ một dòng nên câu giải thích trích code span; còn lại là hoàn thiện ở Plan 8b) — riêng "gợi ý không có linh vật" là nhận định sai: gợi ý đã có Boon (think) |
| ux | Overview lặp thẻ tin nhắn của Home | Mở (L65) |
| ux | Nút Nộp xuống dòng riêng khi nhãn Chạy dài ("Đang chờ database…") hoặc khung hẹp, đẩy Lịch sử xuống | Mở (chỉ khi DB đang tải hoặc khung hẹp; chỉnh bố cục ở Plan 8b) |

Sau khi sửa: tsc sạch, 1623 test (50 file), build sạch, budget mọi nhóm ok (main 277/290, css 13/20, fonts 51/60).

## Plan 8a — phần Chung (lab, drill, lộ trình, nút nâng cao) (base 69012a2, 2026-11-18)

Task 0–13 build xong, chưa push. Cổng cuối: `tsc` xanh, 2682/2682 test (54 file), build xanh, 14 nhóm ngân sách ok.

| Nhóm | KB gz | Trần | Ghi chú |
|---|---|---|---|
| main | 278.41 | 290 | M0 276.77: +1.64 (luật plan +0.5; cần user duyệt) |
| lessons | 28 | 35 | 38 bài học |
| general | 62 | 70 | 114 drill + 28 nút |
| learnui | 6 | 25 | drillBrief + learnView + i18n/learn |
| worker | 149 | 160 | + lab.sql |
| tickets / lanes / en / css | 105 / 10 / 13 / 13 | 110 / 20 / 20 / 20 | không đổi |
| pglite / initdb / parser / fonts / rest | 5287 / 128 / 390 / 51 / 1484 | 5560 / 140 / 410 / 60 / 1560 | không đổi |

Kiểm tay (Chrome, :5174, localStorage mới): ôn tập mở drill trên lab, đạt → hộp Leitner +1, XP và `completed` không đổi; `#/learn` hai cột, module → kỹ năng → drill; nút a1 (bài học chạy trên lab), b5 (◐ có link), d2 (↗ chỉ link), b2 → thử thách mở; reload giữa chừng giữ nháp `g-b2-4#0` và `completed`; Tổng quan chương 1–2 có link kỹ năng ✓. Chưa kiểm: Edge, 1100/375 px, theme sáng cho trang Chung.

## Plan 9 — domain E-commerce (Lantern Market) (2026-11-18)

Ngân sách sau Task 7 (`node scripts/check-budget.mjs`, KB gz): main 280 / 290, ecom 40 / 50, ecomseed 8 / 10, ecomart 2 / 10, worker 149 / 160. Test: 2893/2893 (59 file).

Đo D9-8 (bản build `vite preview`, Chrome trên máy dev, không phải Edge, Logistics đã sẵn sàng): từ đổi hash sang `#/d/ecommerce` tới lúc dòng "Đang chuẩn bị dữ liệu Chợ Lồng Đèn…" tắt (nội dung + seed `ecom` xong): 5,5 s và 5,9 s (2 lần). Mở thẳng `#/d/ecommerce` ở save mới (dev server): ~15–20 s gồm cả seed Logistics (D9-10). Chưa đo trên Edge.

| Loại | Việc | Trạng thái |
|---|---|---|
| test | Đi trọn 30 việc E-com bằng tay (Task 8 Step 4) | Chưa làm: chỉ ecom-ch1-01 nộp đúng trên trình duyệt; mọi Solution/biến thể/wrong đã chạy tự động trong `tests/ecomContent.test.ts` |
| ux | Thẻ chương trên Tổng quan E-com dẫn tới module Lộ trình cùng số (theo Logistics) | Mở |
| ux | Kiểm 375 px/1100 px chưa làm (cửa sổ trình duyệt không đổi được cỡ) | Mở |


## Plan 8b — chuyển động, hình minh họa, đánh bóng (base 69012a2, 2026-11-18, nhánh v11-art)

Đo trên build (`gzip -9`, `scripts/check-budget.mjs`), không ước lượng:

| Nhóm | Trước (M0) | Sau Plan 8b | Trần |
|---|---|---|---|
| `main` | 276,85 KB | 271,60 KB (−5,25) | 290 |
| `art` (`logistics-*`: cảnh, bản đồ, hoạt cảnh, ambient, mapMotion) | – | 9,05 KB | 20 |
| `illustrations` | – | 2,17 KB | 15 |
| `css` | 13 KB | 13,62 KB | 20 |

- `modulepreload` trong `dist/index.html`: chỉ `preload-helper` (= P0). Lần build đầu với import thường, Rolldown tách chunk dùng chung `routeText-*.js` 216 KB preload (Plan 6 U3); chuyển sang tiêm phụ thuộc (`ArtDeps`, `init()`), `tests/artChunk.test.ts` chặn import runtime từ `src/art/*` ra ngoài.
- tsc sạch, 1639 test (54 file) xanh.
- Kiểm tay (Chrome qua claude-in-chrome, cổng 5177, save thử từ `save-v3.json`): Tổng quan vẽ cảnh có mây + parallax (lớp far/mid dịch, về 0); trang Bản đồ: 4 tàu chạy trên 4 tuyến mở, cảng gốc + Busan (tuyến kế tiếp) nhịp; bỏ SGSIN khỏi `routes-seen` → SGSIN được vẽ lại một lần, style xóa sau đó, tuyến khóa giữ `6 6`; màn thăng tiến ch3 có Boon trong thẻ, Lily ở góc dock, Busan thành nét liền màu chương, không vòng nhịp trong dock; Lộ trình/Finance có hình; nút Chạy hiện spinner + "Running…" + `aria-busy`; cột số canh phải.
- **Không đo được (ghi rõ, không coi là đạt):** chi phí khung hình ≤ 2 ms và long task (Performance panel), tab ẩn 10 s, giả lập reduced motion, Slow 3G. Tab tự động bị bóp rAF (1–8 khung/s) nên cả thời lượng hoạt cảnh cũng không đo được trong trình duyệt. Thay vào đó: `tests/ambient.test.ts` (không đăng ký khi reduced motion, không frame khi khuất/ẩn, stop ngắt observer, một vòng cho nhiều đăng ký), `tests/scene.test.ts` (tổng mỗi `STEPS` không đổi), mọi keyframe mới nằm trong khối `no-preference`, mây `display:none` dưới reduced motion. Cần người kiểm tay trên Edge trước khi phát hành.
- Ghi chú môi trường: dev server trong worktree không tải được `pglite.wasm` (node_modules là junction ra ngoài allow list của Vite), nên kiểm có DB chạy trên `vite preview`.

## v11 reviews (code review v10...HEAD + end-user QA trên :5174, 2026-11-18)

Kiểm lại: tsc sạch; `npm test` 64 file, 2913 test xanh, không còn unhandled error; build + `check-budget.mjs` đạt mọi nhóm (main 276/290, tickets 105/110, ecom 40/50, general 62/70, learnui 7/25, worker 149/160). Trình duyệt (claude-in-chrome, dev server riêng :5179, localStorage mới, tour `{"step":8}`): E-com ch1-01 không hiện tour; tab Thứ tự thực thi/EXPLAIN/Luồng dữ liệu hiện cho người mới trong E-com; Recap E-com không còn cú pháp Logistics; "Luyện lại việc này" chạy trong E-com; drill g-aggregate-3 sai hiện `count(*)` thành `<code>`; bài học nâng cao A1 có sẵn starter (8 dòng); trang A1 có thẻ; trang Bản đồ: 5 tuyến khóa không còn nút "Đọc hồ sơ tuyến"; ảnh cảnh E-com thấp hơn ~240 px; không lỗi console. B2 (câu Boon) chỉ kiểm bằng test đơn vị (`tests/voice.test.ts`).

| Loại | Việc | Trạng thái |
|---|---|---|
| bug (code #1) | `ensure()` bị restart từ chối thì E-com mất dữ liệu cả phiên | Sửa: `ensure` gửi lại khi `DbRestartError` (+ test client) |
| bug (code #2) | Bản đồ template Practice nhớ domain dùng đầu tiên | Sửa: dựng lại mỗi lần gọi |
| ux (code #3) | Người mới không thấy tab Steps/Flow/EXPLAIN ở E-com | Sửa: chỉ khóa dần ở Logistics (L76) |
| bug (code #4) | Card dashboard xếp hàng chạy nhầm domain, đánh dấu slow nhầm | Sửa: `cardRunner` đọc domain lúc xếp (`at`) (+ test) |
| content (code #5) | "boss" trong E-com/General | Sửa chữ; test L22 quét thêm E-com + General |
| bug (B1) | Tour đã xong hiện lại ở E-com | Sửa: `tourStep` dừng khi `step >= TOUR_STEPS` (+ test) |
| bug (B2) | "Thiếu 9 dòng. Thừa 22 dòng" + "Số dòng thì đủ" | Sửa: khóa mới `voice.rowsAndValues` (+ test) |
| bug (B3) | Recap E-com in SQL Logistics | Sửa: ẩn `syntax` ngoài Logistics (L74) |
| bug (B4) | Backtick thô trong lời giải thích drill/bài học | Sửa: `richText` cho mẹo sai, trap, concept, task bài học, why của nút nâng cao |
| content (B5) | Câu chuyện "mở đầu 2025" trái seed | Sửa chữ (ch1 story + ecom-ch1-01), seed giữ (L78) |
| bug (B6) | Luyện SQL ghi "Chương 2" cho kỹ năng đã qua drill | Sửa: nhãn "Đã luyện drill" theo cùng luật `knownSkills` của Lộ trình (L75) |
| text (B7) | Trạng thái trống chỉ về chính trang | Sửa: "…chọn một kỹ năng bên dưới." |
| content (đề 1–7) | "món" hai nghĩa, phễu, "đến nay", hủy, cỡ đơn, thứ tự mã chữ, đáp án kết luận dễ đoán | Sửa cả 7 (VI + EN, hint/reflect/wrong cùng chữ) (L79) |
| ux #1 | Ô "Thử ngay" bài nâng cao trống | Sửa: bài nâng cao điền sẵn starter (L77) |
| ux #2 | Ảnh hero quá cao | Sửa: cảnh E-com ≤ 240 px, ảnh Lộ trình `max-w-xs` |
| ux #3 | Hết 3 drill là ngõ cụt | Sửa: nút chính "Kỹ năng tiếp: …" |
| ux #4 | Trang nút nâng cao không có thẻ | Sửa: thân trang trong thẻ; rail vẫn liệt kê module (để lại) |
| ux #5 | Nhãn "▣ Trong nền tảng" khó hiểu | Sửa chữ: "Làm được ngay trong app" / "Một phần làm trong app" / "Đọc tài liệu bên ngoài" |
| ux #8 | Tuyến khóa vẫn có nút "Đọc hồ sơ tuyến" | Sửa: bỏ nút, dòng phụ đã ghi "mở sau đánh giá ch. N" |
| ux #12 | Hai nút "tiếp" sau tổng kết chương | Sửa: thanh việc ẩn nút tiếp trên đánh giá đã qua |
| test | Unhandled rejection `showPane` trong `workRace.test.ts` (có từ v10) | Sửa: `showPane` bỏ qua khi không có `#shell` |
| ux #6, #7, #9, #10, #11 | Ổ khóa rail Lộ trình, bản đồ E-com bắc–nam, chữ phím tắt trên mobile, cuộn tour/brief, tab Cột của drill | Để lại (L80) |
| ux | `navLock` ở E-com khóa Sandbox/Dữ liệu tới khi xong việc 1 của E-com | Để lại: nhất quán theo domain, không phải lỗi |
| content | Reflect E-com: đáp án đúng đôi khi dài nhất | Để lại: review chỉ nêu kết luận đánh giá thăng tiến |

## v11 live (2026-11-18)

- **Đã sửa (L87):** màn chào giờ là Boon, chữ chung cho nền tảng BoonData. Ghi chú cũ: màn chào (Lily) khi người chơi vào thẳng `#/d/ecommerce` vẫn kể câu chuyện Cargo Query Logistics / 12 chương; nên theo domain đang mở (Chợ Lồng Đèn, 6 chương). Thấy trên site live, chưa sửa.
- **Backlog v12:** màn chào (Lily) khi người chơi vào thẳng `#/d/ecommerce` vẫn kể câu chuyện Cargo Query Logistics / 12 chương; nên theo domain đang mở (Chợ Lồng Đèn, 6 chương). Thấy trên site live, chưa sửa.

## v12 dashboard + locked-state audit (2026-11-18, L86)

Người chơi thử: save mới chỉ xong `ch1-01` (người mới từ màn chào, `cargo-query/tour` = `{ step: 8, knows: false }`), VI, 1267 và 1477 px, preview build trên :5187. Ảnh trước/sau trong scratchpad của phiên (không commit).

| Điều khiển | Trước | Sau |
|---|---|---|
| Bảng điều hành, "Card của bạn" | Khung trống "Ghim truy vấn đầu tiên" + nút Sandbox; người chỉ biết `select` ghim được bảng thô | Người mới: khung khóa (ổ khóa, "Bạn sẽ tự tạo card khi học xong … (chương N)"), "Tạo card" dạng khóa có lý do (không phải nút chết), nút thật "Tiếp tục việc đang làm"; 4 card mẫu chạy dữ liệu thật (D-DB1) |
| Card mẫu khi đã mở tự tạo nhưng chưa có card | — | Hiện dưới khung trống, ghi "tự ẩn khi bạn ghim card đầu tiên" |
| Ô KPI công ty chưa mở | Số "—" hoặc "???" to (trông như dữ liệu lỗi), chỉ dòng chân có ổ khóa | Nhãn "Đang khóa" có ổ khóa ở góc, thanh trống nét đứt thay số, dòng chân giữ việc mở ô |
| Ghim lên (tab Kết quả, Sandbox / việc đã xong) | Nút bấm được với `select` | Người mới chưa học `aggregate`: nhãn khóa "Ghim lên: mở khi học xong … (ch. N)", không có nút |
| Nav trái Bảng điều hành (người mới) | Khóa tới việc 2, nhưng gõ URL vẫn mở trang | Mở sau việc 1 cùng Sandbox/Dữ liệu (card mẫu dùng được ngay) |
| Nav trái ở dạng rail (mục khóa) | Ổ khóa và lý do nằm trong `side-label` (ẩn ở rail): mục khóa trông như bình thường, bấm không làm gì | Huy hiệu ổ khóa trên icon, icon màu muted; lý do trong tip `data-tip` (L85) |
| Rail Lộ trình (module chưa học) | Ổ khóa + "Chưa mở" nhưng trang module và drill đều mở (L80 #6) | Đã sửa trên main (L82): mọi module mở, dấu là số kỹ năng đã học; nhánh này không đổi thêm |
| Thẻ chế độ Sandbox / Dữ liệu của tôi (Tổng quan) | Mở Sandbox kể cả khi nav khóa Sandbox | Theo cùng `navLock('sandbox')`: thẻ khóa (ổ khóa, lý do, `aria-disabled`), không phải nút |
| Tab bảng dưới (người mới, Logistics) | Tab chưa tới bị ẩn, không có gì báo còn tab | Giữ ẩn (D-O4), thêm dòng muted có ổ khóa "Thêm N tab mở dần khi bạn làm tiếp" |
| Thanh việc: việc chưa tới | Nút `disabled` + ổ khóa + `aria-label` "khóa" | Giữ (đã hiện khóa rõ) |
| Chọn chương trong thanh việc | `<option disabled>` | Giữ (native) |
| Hàng chương trên Tổng quan | Ổ khóa + "mở sau chương N", pill không phải link | Giữ (đã đúng) |
| Bản đồ: tuyến khóa | Mở hồ sơ tuyến, hồ sơ ghi mở sau chương nào | Giữ (bấm có kết quả đúng: đọc lý do) |
| Kỹ năng trên Luyện SQL | Main đã đổi: mọi kỹ năng mở luyện | Không đổi |
| Nút top bar Ôn tập / Hộp thư / Sổ tay | Ẩn khi 0 / luôn chạy | Không đổi |
| Gõ thẳng URL trang đang khóa (Sandbox/Dữ liệu trước việc 1) | Trang vẫn mở và chạy | Để lại: trang chạy đúng, không phải nút chết; chỉ link trên nav khóa |

## v12.0 (Plan 10)

Baseline (Plan 10 Task 0, HEAD 237e70f, 2026-11-18). Build: `main` 282, `worker` 149, `initdb` 128 KB gz. "Data ready" = D10-25 (green dot in the top bar and `#notice` hidden), `performance.now()` from navigation start. Measured with a scripted headless Edge (CDP) on `vite preview --port 5178` (5174/5175 were in use by other sessions), fresh profile (no L72 test save, so the welcome dialog was open), warm HTTP cache after one warm-up load, machine not idle (other agents running). Row (b) is followed by one `#/d/logistics` load so the domain pref goes back. Headless numbers are lower than the headed Edge numbers of L46 (10–11 s); compare "after" with the same script.

| Row | before: data ready (ms, 3 runs) | before: db:time-to-ready | after: data ready | after: db:ensure:&lt;schema&gt; |
|---|---|---|---|---|
| (a) `#/d/logistics` | 3282 / 3090 / 3060 | 3166 / 3005 / 2993 | 3015 / 3166 / 3116 | game 2865 / 2991 / 2987 |
| (b) `#/d/ecommerce` | 4814 / 4764 / 5048 | 2958 / 2959 / 3244 | 2613 / 2608 / 2570 | ecom 2467 / 2472 / 2437 |
| (c) SQL only (`#/learn`; before: HEAD seeds Logistics anyway; after: pref `"general"`, seeds `lab` only) | 5012 / 5379 / 5125 | 3232 / 3188 / 3314 | 1413 / 1462 / 1461 | lab 1252 / 1272 / 1321 |

After (Plan 10 Task 13, HEAD b58287e + docs, 2026-11-18): same script and conditions as the baseline (headless Edge via CDP, `vite preview --port 5178`, fresh profile, one warm-up load, machine not idle). Build: `main` 285, `worker` 135 (was 149), `initdb` 128, `gameseed` 13 KB gz. `db:time-to-ready` now means only the engine (≈ 1.0 s every row), so the "after" seed column is `db:ensure:<schema>` (measured from the ensure() call, which runs in parallel with the engine download).
- (a) Logistics: 3144 → 3099 ms mean, −45 ms (−1 %): unchanged, as planned (it still seeds Logistics; the gain is in the other rows).
- (b) E-commerce: 4875 → 2597 ms mean, −2278 ms (−47 %): Logistics is no longer seeded first.
- (c) SQL only: 5172 → 1445 ms mean, −3727 ms (−72 %): only `lab` is seeded.
- Design estimate for (b) (§2.3: ~6–8 s instead of ~16–19 s headed, a ratio of about 0.32–0.50): met in direction, slightly short in ratio (0.53 headless). The fixed cost now is the engine boot (~1 s) plus the E-com seed (~2.5 s), which this plan does not touch.

Smoke (Plan 10 Task 13 Step 4), scripted headless Edge on `:5178` with fresh profiles (5174/5175 were in use by other sessions; the L72 test data stays on `:5174`/`:5175` and was not touched): Home, Learning path, module 1, Practise, Overview, Workspace, Data, Dashboard, Map, E-com Overview and Workspace in light and dark at 375 and 1267 px: 0 console errors or exceptions, no horizontal scroll, top bar one line at 375 px (all items overlap one row, 61 px high), rail icons unique on every page. Workspace ticket 1: Run announces "Chạy xong: 24 dòng, 1 cột.", a wrong Submit gives the column-count feedback, the right one "Đúng rồi! +100 XP". E-com session (Overview, Workspace, Data, Dashboard, Home, Learning path, Practise): measures `db:ensure:ecom` and `db:ensure:lab` only, `gameSeed` never fetched, so 0 `logistics` tables (the Task 2 Step 10 check, read from the seeds instead of `information_schema`). First visit on cleared storage: three choices, Next disabled, no seed chunk fetched before the pick; "Chỉ học SQL" closes the dialog, opens `#/learn`, seeds `lab` only, pref `"general"`; reload: no picker, `lab` again; `#/d/logistics` sets the pref to `"logistics"`.

## v13 (product-design-v8, T6 kiểm cuối, 2026-11-18, L99)

Build HEAD f98c36b. Ngân sách (`node scripts/check-budget.mjs`): `main` 287,7 / 290 KB (ước v8 ~286,5–287), `frame` 2,9 / 3 KB, `learnui` 12 / 25, `en` 16 / 20, mọi nhóm khác ok. `npm test` 3059 qua, 1 bỏ qua; `npx tsc --noEmit`, `npm run build` sạch.

Kiểm tay §3.9: Edge headless (CDP), `vite preview` :5199, hồ sơ mới, đã tắt sau khi kiểm. 0 lỗi console/ngoại lệ.

| Kiểm | Kết quả |
|---|---|
| General 1280 px (sáng) và 375 px (tối), "Chỉ học SQL" (pref `general`) | G1 3 bước → Xong ghi `{"seen":["path"]}`; G2 (`#/learn/sql/1`), G3 (trang `where`) → Esc bỏ, "Boon chỉ mình" chạy lại; G5 ở bàn luyện bẫy, G7 (`#/practice`, chưa học gì: 1 bước), G8 (`A1`). Không cuộn ngang ở cả hai cỡ; 375 px: dấu G5 nằm trong pane Đề bài, không đè editor |
| Story ch2-03 (save thử) | Gợi ý 1 không có nút; gợi ý 2 → "Điền khung vào editor" + "Mở luôn gợi ý 3 (−50 XP)" → hỏi → Giữ (hintsUsed 2) → Thay (hintsUsed 3, khung 5 dòng, `___` đầu được chọn) → Nộp còn 6 `___` bị chặn → Ctrl+Z hai lần về câu cũ → nút Hoàn tác |
| E-com `ecom-ch1-01` | Gợi ý 2 → điền (editor = starter: không hỏi, miễn phí ở bài chương 1) → `SELECT ___, ___, ___ FROM sellers`; Nộp bị chặn; Chạy → lời Boon `sqlerr.blank`; không dấu hướng dẫn nào |
| Drill `g-where-3` (bẫy) / `g-where-1` (faded) | Bẫy: khung `SELECT ___, ___ FROM orders WHERE ___`, dòng giá "Lần đạt này không lên mức nhớ"; faded: "Đặt lại khung ban đầu" → starter, chọn `___` |
| Thử ngay `group_by` (từ trang kỹ năng) | G4 hiện trong hộp thoại → Bỏ qua; "Boon chỉ" → điền `SELECT ___, COUNT(*) FROM orders GROUP BY ___`, focus vào ô; "Kiểm câu trả lời" còn 2 `___` bị chặn; Hoàn tác về ô trống |

| Loại | Thấy | Quyết định |
|---|---|---|
| ux | Ngay sau khi điền, `___` đầu đang được chọn nên nút là "Chạy vùng chọn": Chạy/{mod}+Enter lúc đó chỉ chạy `___` (lỗi cú pháp), không chạy cả câu | Để lại (L99): lời Boon `sqlerr.blank` vẫn đúng; gõ đè chỗ chọn (mục đích của việc chọn) bỏ vùng chọn |
| ux | Nút Hoàn tác dưới editor biến mất khi Chạy/Nộp viết dòng phản hồi mới | Để lại: đúng L96 (8), {mod}+Z vẫn lấy lại câu cũ |
| chưa chạy trên trình duyệt | Bước lab chỉ mục (không nút điền), điền trong Luyện tập, lượt ôn bằng drill (G7 `review`), reduced motion | Đã có unit test (L96, L98); để lại |

## v5 (ui-ux-v5, 2026-11-18, L101)

### T1 nền §1

Đo (gzip -9): main 287,78 / 290 KB (trước 287,7), CSS 15,02 / 20, `html` 7,69 / 9 (nhóm mới). Test mới đỏ khi thử `cq-shake 3.2s`, một tên `cq-*` không keyframe và `cq-nod` định nghĩa hai lần; xanh sau khi gỡ.

Trình duyệt (`vite preview --port 5199`, Edge headless hồ sơ mới, 1280 + 375, sáng + tối, một lần `--force-prefers-reduced-motion`): màn chào không đổi; Lily người chơi mới vẫn giai đoạn 0 (`--lily-size` 0,8, không khăn, không sao) sau khi đăng ký `@property`, logo top bar vẫn dáng trưởng thành. Lily `cheer` hiện thấy + `react` → `getAnimations()` = `cq-jump`; Lily trong khối `display: none` → không animation nào (nên `react()` gỡ class ngay); giảm chuyển động → không animation.

### T2 A2 phản ứng + A3 XP (L102)

Đo (gzip -9): main 288,21 / 290 KB (≤ 289,0; T1 287,78, tức T2 +0,43 so với ước +0,25: T3–T7 còn ~0,8 KB tới mốc 289,0), CSS 15,03 / 20, `html` 8 / 9. `npm test` 3066 xanh (1 bỏ qua), `tsc` sạch, build xanh. Test mới: `xpGain` (lần đầu 0, tăng N, không tăng 0, save mới 0) trong `tests/mascots.test.ts`; `tests/workRace.test.ts` thêm `querySelector` cho phần tử giả.

Trình duyệt (`vite preview --port 5199`, Edge headless hồ sơ mới qua CDP, ticket ch1-01, rồi drill `g-select-1`; 1280 sáng, 1280 tối, 375 sáng, 375 tối, một lần giảm chuyển động):
- Gợi ý: Boon `point` có `react` và chạy `cq-lean`, bong bóng chạy `cq-bubble`. Đổi ngôn ngữ 150 ms sau: không animation một lần nào chạy. Gợi ý 2 không có vẽ lại: `cq-bubble` gỡ ở `animationend`.
- 375: đổi pane SQL rồi về pane Đề bài ngay sau gợi ý. Lần đầu `cq-lean` **phát lại** (class nằm lại vì animation bị hủy khi pane ẩn). Đã sửa (L102 #4), chạy lại: không còn gì.
- Điền khung: dòng "Mình điền khung…" có Boon `point` + `react`, `cq-lean` chạy (thứ tự microtask sau `actions.rerender()` của brief đúng).
- Chạy câu sai cột (`nme`): Boon `think` nhận `react`, `cq-tilt` chạy (MutationObserver ghi lại).
- Nộp đúng: "Đúng rồi! +100 XP", Lily `cheer` + `cq-jump`, `#xp` pop + chip "+100" `aria-hidden`. Ở 1280, chip bắt đầu dưới pill (y 41–56, trong top bar). Bản đầu đặt chip trên pill thì chip ra ngoài mép trên (y −4), đã dời. Đổi ngôn ngữ 150 ms sau: chip mất (đúng A3), không gì phát lại, pop không chạy lại. Class pop gỡ sau 450 ms.
- Ở 375, Lily không nảy vì story chuyển sang pane Đề bài. Chip có chạy, nhưng lúc đó trang đang cuộn (pill y −1141, do script cuộn tới editor), nên người chơi chỉ thấy chip khi trang ở đầu (L102 #5). Top bar 61 px như trước, không xuống dòng.
- Drill: chip "+10", XP 100 → 110, Lily `cheer` + `react`.
- Giảm chuyển động: không `react`, không chip, không animation; số XP đổi ngay.
- Chưa kiểm trên trình duyệt: nhập save (đã có test `xpGain`) và Boon `oops` (hết giờ, đi cùng đường `say()` + `mascotOf`).

### T3 A1 Lily lớn (L103)

Đo (gzip -9): main 288,47 / 290 KB (≤ 289,0; T2 288,21, tức T3 +0,26 so với ước +0,25), CSS 15,16 / 20, `html` 8 / 9. `tsc` sạch, build xanh. Test mới trong `tests/mascots.test.ts`: mốc `gainSince` (lần đầu không, tăng có, save mới cao hay thấp hơn không) và cửa sổ `grewLately()` 4 s (giả đồng hồ).

Trình duyệt (`vite preview --port 5199`, Edge headless hồ sơ mới qua CDP, save đã xong ch1-01 + ch1-02 = 2 kỹ năng):
- Story 1280: nộp đúng ch1-03 (giai đoạn 0 → 1). Lily ở dòng phản hồi có `react grow`, chạy `cq-grow` + `cq-jump`, `<use>` chạy `cq-grow1` (khăn mờ dần, cỡ 0,8 → 0,9). Lily trong dock nhận `grow` (`cq-grow` + `cq-grow1`), class gỡ sau khi xong. `#announce`: câu hoàn thành + "Việc tiếp theo" + "Lily đã lớn: Cún nhỏ." Đổi ngôn ngữ ngay sau: không `svg.grow` nào. Trang chủ: pill "Vừa lớn"/"Just grew" cạnh tên giai đoạn; rời sang `#/learn` rồi về: hết pill; tải lại: không pill, không câu báo, `data-lily` 1.
- Drill 1280 (`g-order-by-1` đã đạt, đạt `g-order-by-2`): `order_by` thành đã học, Lily ở dòng phản hồi `react grow`, câu "Đạt bài luyện, +10 XP. Lily đã lớn: Cún nhỏ." (câu nối không bị câu của drill xóa), pill ở Trang chủ.
- Story 375: story chuyển sang pane Đề bài nên Lily ở dòng phản hồi không chạy (như A2); Lily trong dock ẩn (`max-sm:hidden`): bản đầu để class `grow` nằm lại, đã sửa (gỡ ngay khi không animation nào chạy). Pill ở Trang chủ có.
- Giảm chuyển động 375: không `react`/`grow`, Lily đứng ở giai đoạn mới; câu báo và pill vẫn có.
- Thăng tiến ≤ 3,0 s: theo cấu trúc (Lily lớn bắt đầu `durationOf − 900`, kết thúc cùng cảnh), chưa chạy thăng tiến trên trình duyệt. Nhập save: chỉ test đơn vị.

### T5 B1 lộ trình (L105)

Đo (`check-budget.mjs`, gzip -9 qua zlib, KiB): main 288,66 / 290 (≤ 289,0; T4 288,64, tức +0,02), illustrations 1,87 / 15 (−0,3), learnui 12,35 / 25 (+0,35), CSS 15,43 / 20 (+0,19). `npm test` 3073 xanh (1 bỏ qua), `tsc` sạch, build xanh, `check-budget` ok. Test mới: `stamper` (mốc lần đầu, đóng dấu đúng một lần, vẽ lại không phát lại, chưa vẽ thì chưa tiêu, save mới đặt lại mốc) trong `tests/learn.test.ts`; `moduleGlyph(1..12)` có `data-acc` 0..k (≤ 4) trong `tests/illustrations.test.ts`.

Trình duyệt (`vite preview --port 5199`, Edge headless hồ sơ mới qua CDP; 1280 sáng, 375 tối, 320 sáng, một lần 375 giảm chuyển động):
- `#/learn`: 11 dòng Phần có glyph (ch12 không dạy kỹ năng), 4 glyph nhóm nâng cao; `scrollWidth` = bề rộng ở 1280/375/320.
- `#/learn/sql/1` từ tổng quan: một lần vẽ, `.cq-glyph-in` + `cq-pop-in` chạy; bấm EN 150 ms sau: lần vẽ lại không có class (không phát lại).
- Luồng thật (save chỉ `g-select-1`): trang Phần 1 không ✓ → "Tự làm" `g-select-2`, nộp đúng → về `#/learn/sql/1`: một lần vẽ có `.cq-stamp` và 1 ✓, chạy `cq-stamp` + `cq-draw`; bấm EN 150 ms sau: vẽ lại không dấu (không phát lại).
- Giảm chuyển động: không animation nào, glyph và ✓ ở trạng thái cuối.

### T6 B2 `zz` + B4 dấu Boon (L106)

Đo (gzip -9): main 288,73 / 290 (≤ 289,0; T5 288,66, tức +0,07), CSS 15,50 / 20 (+0,07), learnui 12 / 25. `npm test` xanh, `tsc` sạch, build xanh, `check-budget` ok. Test mới trong `tests/mascots.test.ts` (selector `zz` chỉ Lily ngủ; `cq-fade` chỉ opacity; `cq-hop` trên `svg[data-mascot]`), đỏ trước khi thêm CSS.

Trình duyệt (`vite preview --port 5199`, Edge headless hồ sơ mới qua CDP, ghi `animationstart`; 1280, 375, một lần giảm chuyển động):
- `zz`: Luyện SQL chưa học gì và bảng điều hành chưa có card (người "biết SQL", không khóa): `cq-floatz` chạy trên `#lily-sleep`; sang `#/d/logistics/play`: không animation nào chạy. Người mới: bảng điều hành là thẻ khóa, không Lily ngủ (đúng L86).
- Tour ticket 1: bước 1, 2, 3 mỗi bước một lần `cq-fade` + `cq-hop`; đổi ngôn ngữ trong lúc dấu hiện: không gì chạy lại; class gỡ sau khi xong; Esc (focus ngoài editor) bỏ tour.
- G1 `#/learn`: `path#0` chạy `cq-fade` (bước đầu không có Boon, `mascot: false`), `path#1` chạy `cq-fade` + `cq-hop`; đổi ngôn ngữ: không chạy lại.
- Giảm chuyển động: không animation nào, dấu hiện ngay.

### T7 B3 E-com nền + dock + bảng `DOCK` (L107)

Đo (gzip -9): main 288,76 / 290 (≤ 289,0; T6 288,73, tức +0,03), ecomart 2,91 / 10 (+1,24), CSS 15,58 / 20 (+0,08). `npm test` 3079 xanh (1 bỏ qua), `tsc` sạch, build xanh, `check-budget` ok. Test mới trong `tests/ecomArt.test.ts` (đỏ trước khi có code): nền có 3 `cq-sway` + 1 `cq-scoot` chỉ khi ambient; vòng `cq-pulse` ở thành phố mở gần nhất, không có trong dock; dock việc thường chạy nhanh = 13 gói, gói mới ở ô 12, không vòng lặp, 2,2 s; thăng tiến chạy nhanh = Ha Noi mở, lồng đèn sáng, thẻ hiện, 3,0 s.

Trình duyệt (`vite --port 5199` (dev, để trang gọi `playCompletion` của chính app qua URL module đã tải), Edge headless hồ sơ mới qua CDP; 1280 sáng/tối, 375 sáng/tối, giảm chuyển động):
- Logistics không đổi: `ch1-01` và thăng tiến ch1 dưới giảm chuyển động, `#stage` outerHTML và ảnh chụp cuối **giống từng byte** trước (HEAD, `git stash`) và sau; bản chạy có chuyển động: cùng các mốc (chữ, nút, Lily, kích thước dock).
- E-com `ecom-ch1-01`: gói rơi + nảy (0,6 s), cửa cuốn hạ, xe máy chạy ra, Lily vào ở ~1,9 s, nút thành "Đóng" ở 2,2 s; câu `ecom.done` trong `#announce` ngay lúc đạt. Thăng tiến ch1: gói, lồng đèn sáng, Ha Noi hiện + một vòng, thẻ "Chương 1 · Đánh giá thăng tiến · Đạt / Junior DA", Lily ở cuối, 3,0 s; câu `ecom.promoted`.
- Esc (1280) và Bỏ qua (375) lúc 0,3 s: lần 1 nhảy tới trạng thái cuối (nút "Đóng", gói ở chỗ, thẻ hiện, lồng đèn sáng), lần 2 đóng dock. Dock không chồng editor ở 1280; ở 375 pane Đề bài đang mở (editor ẩn).
- Giảm chuyển động: dock vẽ trạng thái cuối ngay, nút "Đóng", ở lại tới khi đóng; Tổng quan và trang Bản đồ không animation nào. Tổng quan có chuyển động: `cq-sway` (3 lồng đèn) + `cq-scoot` chạy; dock không vòng lặp nào.
- Đường thật (`vite preview --port 5199`, `dist` đã build, hồ sơ mới, 1280): nộp đúng `ecom-ch1-01` bằng Ctrl+Shift+Enter: dock hiện ngay, gói mới ở ô 0 (640, 256), Lily vào ~1,9 s, "Đóng" ở 2,2 s, không chồng editor; feedback chạy `cq-jump` + `cq-rise` (T2). Giảm chuyển động: trạng thái cuối ngay, "Đóng". Thăng tiến E-com chỉ chạy qua `playCompletion` trực tiếp (dev), chưa qua nộp thật.
- Ảnh cuối Logistics có chuyển động `log-1280-light-end.png` lệch 10 byte trước/sau: nhìn tận mắt giống nhau; phần lệch là khung của vòng lặp linh vật ở hộp thoại chào (`.live`) phía sau, không phải dock (bản giảm chuyển động giống từng byte).
- Hộp thoại bản đồ E-com giữ vòng `cq-pulse` như hộp thoại Logistics (vòng `routeMap` + `liveMap` vẫn chạy trong hộp thoại); câu "hộp thoại và dock không lặp" của B3 nói về cảnh cửa hàng (`storeScene`), vốn không có trong hộp thoại.

### T8 C1 mờ dần trang đọc + C2 lật số ngày (L108)

Đo (gzip -9): main 288,88 / 290 (≤ 289,0; T7 288,76, tức +0,12), CSS 15,67 / 20 (+0,09), `html` 8 / 9. `npm test` 3080 xanh (1 bỏ qua), `tsc` sạch, build xanh, `check-budget` ok. Test mới trong `tests/lily.test.ts` (đỏ trước khi có code): `markDay` ngày mới `true`, cùng ngày `false`, ngày đã có trong kho (tab khác) `false`.

Trình duyệt (`vite preview --port 5199`, Edge headless hồ sơ mới qua CDP; 1280, 375 tối, một lần giảm chuyển động):
- Tải lại thật ở `#/`, `#/learn`, `#/d/logistics`: `#home` không bao giờ có `data-enter`, không `cq-fade` trên khối, không lật.
- Trang chủ → Lộ trình → Tổng quan: `data-enter` có ở 60 ms, hết ở 560 ms; Lộ trình 2 khối mờ (cảnh dạy + phần), Tổng quan 6.
- Bấm chuột thật vào góc một card stretched link (`::after`, không phải chữ link) 30 ms sau khi vào Lộ trình: cú bấm ăn (`#/learn/sql/1`), giống hệt khi bấm sau 600 ms.
- Vào workspace (`…/play`): không `data-enter`, không `cq-fade`.
- C2: xóa `cargo-query/days`, nộp đúng ch1-01 thật (Ctrl+Shift+Enter), mở Trang chủ: span `.cq-flip` một lần, câu "Lily (là bạn) · Cún con · Ngày thứ 1 cùng Lily" không đổi; đổi ngôn ngữ ngay sau: span không còn class, không chạy lại; rời rồi về Trang chủ: không lật; tải lại cùng ngày: không lật.
- Giảm chuyển động: vào Lộ trình không animation nào chạy (`getAnimations()` không có `cq-fade`).

### T9 kiểm cuối (L109)

Đo lại bảng §2 (`check-budget.mjs` ok mọi nhóm; số gzip -9 qua zlib, KiB), so với trước v5 (L99 / T1):

| Nhóm | Trước v5 | Sau v5 | Ước §2 | Trần |
|---|---|---|---|---|
| main | 287,70 | 288,88 (+1,18) | +1,2 | 500 (user; D-M1 mốc mềm 289,0 vẫn giữ) |
| CSS | 15,02 (sau T1) | 15,67 | +1,25 | 20 |
| `html` | 7,69 (sau T1) | 7,83 | ~8,2 | 9 |
| ecomart | 1,67 | 2,91 (+1,24) | +1,5 | 10 |
| illustrations | 2,17 | 1,87 (−0,3) | −0,3 | 15 |
| learnui | 12,00 | 12,36 | +0,37 | 25 |

`npx tsc --noEmit` sạch, `npm test` 3080 xanh (1 bỏ qua), `npm run build` xanh. T4 không có mục riêng ở đây: kết quả trình duyệt của T4 nằm trong L104.

Trình duyệt (`vite preview --port 5199`, `dist` mới build, Edge headless hồ sơ mới qua CDP, đã tắt sau khi kiểm): 9 trang (`#/`, `#/learn`, `#/learn/sql/1`, `#/practice`, `#/d/logistics`, `…/play`, `…/data`, `…/map`, `#/d/ecommerce`) × 1280/375 × sáng/tối, rồi lại cả bộ với `--force-prefers-reduced-motion` (72 lần mở trang):
- 0 lỗi console, 0 ngoại lệ; không trang nào cuộn ngang (`scrollWidth − innerWidth` = 0 mọi lần); theme đúng pref ở mọi trang.
- Có chuyển động: chỉ còn vòng nền đã có cơ chế (Tiên Sa `cq-*` ở Tổng quan Logistics, `cq-pulse`/`cq-float` ở Bản đồ, `cq-sway`/`cq-scoot` ở Tổng quan E-com, cảnh dạy học `cq-wag/nod/tap` ở `#/learn`, `cq-floatz` khi Lily ngủ ở Trang chủ/Luyện SQL); workspace, Dữ liệu và trang Phần không animation nào chạy khi đứng yên (một lần đã xong).
- Giảm chuyển động: `document.getAnimations()` rỗng ở cả 36 lần mở.
- Tìm thấy và sửa (L109 #2): thẻ "Ôn tập hôm nay" ở 375 px ép chữ một từ mỗi dòng; sau sửa nút xuống dòng dưới chữ (ảnh chụp lại, cả bộ chạy lại: vẫn 0 lỗi, 0 cuộn ngang).
- Để lại (L109 #3): top bar 1280 px xuống hai dòng, có từ trước v5.

## v6 T7 (S1 Tiên Sa vẽ lại + nền GSAP), 2026-11-19

`npx tsc --noEmit` sạch, `npm test` 3106 xanh (1 bỏ qua), `npm run build` xanh, `check-budget` xanh (main 301/500, art 13/20, css 16/20, gsap 44/50; main không có GSAP). Trình duyệt (`vite preview` 5221 cho bản trước, 5222/5224 cho bản sau; dev 5223 cho dock; Edge headless hồ sơ mới; đã tắt hết): Tổng quan Logistics 375/1280 × sáng/tối + giảm chuyển động, dock ship/yard/truck/customs/promotion 1280 sáng/tối và truck/yard 375 tối: 0 lỗi console. Đo chuyển động: thuộc tính `transform` của sóng/mây đổi giữa hai lần đọc khi cảnh trên màn hình; đứng yên khi cuộn khuất và ở `…/play`; giảm chuyển động: không đổi.
