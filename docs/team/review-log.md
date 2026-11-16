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
| test-gap | Test L22 quét content YAML + chữ ticket chưa được viết (`tests/i18n.test.ts` chỉ có import thừa) — dòng vòng 1 ghi "đã sửa" là sai | Đã sửa d29d21a (regex cũ chứa ký tự backspace thật thay vì `` nên không bắt được gì; đã kiểm test đỏ khi thêm "boss" vào people.yml) |
| ux | Chữ SVG chỉ ẩn dưới `sm`: ở 640–870px nhãn còn ~5,5–9px (L23) | Đã sửa 78fda81 (chữ SVG ẩn dưới `lg`, cỡ nhỏ nhất 12 đơn vị, dock `lg:w-[640px]` → ≥ ~10,7px Trang chủ / ~11,6px dock; HTML thay thế `lg:hidden`; chưa kiểm trên trình duyệt) |
| content | Test SQLISH cấm cả `FCL`/`LCL` (thuật ngữ nghiệp vụ thường dùng) | Đã sửa d29d21a |

Sửa vòng 2: commits 78fda81 (fix), d29d21a (test).
