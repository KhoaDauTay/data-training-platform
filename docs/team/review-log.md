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
