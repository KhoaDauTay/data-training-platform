# v21: kết quả kiểm thử end-to-end (L183)

Ngày 2026-11-20, trên `main` @ `85d7ff4` (bản build `npm run build`, phục vụ bằng `vite preview` cổng 5241). Trình duyệt: Edge headless qua CDP, hồ sơ mới cho mỗi nhóm. Script: `scripts/e2e.mjs` (`npm run build && npm run e2e`; `E2E_ONLY=general,logistics,…` để chạy từng phần; `E2E_PORT`, `E2E_OUT`). Không đổi mã ứng dụng.

## Phạm vi đã chạy (lần chạy cuối, 562 s, 296 bước kiểm, 295 đạt)

- **Ba domain, chơi trọn theo thứ tự bằng Solution (biến thể 0):**
  - Logistics: 69 việc, 12 chương.
  - E-commerce: 35 việc, 7 chương.
  - Finance: 35 việc, 7 chương.
  - Mỗi việc kiểm `save.completed` có id và XP tăng.
  - Đánh giá thăng tiến: đi qua từng bước (`bossStep` tăng). Index lab ch11 gõ `CREATE INDEX`. Kết luận chọn đáp án đúng; kiểm chương có phần tổng kết và chức danh ở top bar khớp `career` của chương ★.
  - Đi tiếp bằng nút chính ("Việc tiếp theo →" / "Bắt đầu chương N →").
  - Cuối mỗi domain: đủ mọi id, chức danh cuối đúng. Mọi ô KPI trên Bảng điều hành đều mở và có số.
  - Kết quả: không lỗi.
- **General:**
  - Kiểm tra đầu vào: 11 bài, đạt 11/11; sau đó `save.review` có thẻ cho đủ 38 kỹ năng, và thẻ kiểm tra không còn hiện.
  - 11 module, mỗi kỹ năng một drill (38 drill). Drill đầu của mỗi module đi bằng đường người chơi: trang module → trang kỹ năng → nút drill.
  - Nút "Thoát bài luyện".
  - Một lượt ôn: các thẻ được đặt đến hạn, bắt đầu từ `#review-btn`, làm hết rồi tới dòng kết thúc.
  - Phòng phỏng vấn: bộ `junior-1` có đồng hồ, đúng 5/5, có ghi pref. Take-home `g-iv-th-1`: 3 bước, viết đoạn kết luận, rubric tự chấm đủ.
  - "Thử ngay" của cả 38 bài học nhanh: đều đạt, có trong `lessons.tried`.
- **Công cụ** (cùng save đã chơi xong):
  - Lanes: 9/9 bài tuyến, mở từ trang Bản đồ.
  - Trang Dữ liệu: chọn bảng, "Xem 5 dòng mẫu".
  - Sandbox: chạy truy vấn; nhập CSV rồi truy vấn bảng vừa nhập; nạp bộ mẫu penguins và làm một câu hỏi dẫn dắt.
  - Bảng điều hành: ghim 2 thẻ, dời thẻ, tải PNG thẻ, "Xuất thẻ" rồi "Nhập thẻ" lại (4 thẻ).
  - Sổ tay: mở, lọc, đóng bằng Esc.
  - ⋯: xuất tiến độ rồi nhập lại.
  - #/me: 8 chứng nhận (PNG + SVG × 4), 3 portfolio .zip, portfolio take-home .md.
  - Tổng cộng 15 file tải về có thật (sự kiện tải qua CDP).
- **Màn hình:**
  - 25 trang × 4 cấu hình, dùng save đã chơi xong: 1280 sáng; 375 tối + giảm chuyển động; 1280 tối; 375 sáng.
  - Kiểm theme `<html data-theme>`, không cuộn ngang ở 375.
  - axe trên mỗi màn hình (71 lần chạy axe tính cả các màn hình giữa luồng: Recap, form kết luận, tổng kết chương, lượt ôn, phòng phỏng vấn, dialog bài học/ghim, sổ tay…).
- **Tải lại giữa chừng:** drill (giữ drill và bản nháp), Sandbox (giữ bản nháp), phỏng vấn ở câu 2 (câu 1 vẫn ✓, câu 2 là câu hiện tại).
- **Back/Forward:**
  - Qua 9 trang của ba khu (Home, Lộ trình, module, Overview, Dữ liệu, Làm việc, domain khác, Luyện SQL, Tiến bộ).
  - Drill → Back → Forward mở lại đúng drill.
- **Offline:**
  - Mở Logistics một lần (có seed), rồi mở lại với CDP offline: trang, DB và một truy vấn đều chạy.
  - Trang General và Finance (chưa mở lần nào) cũng mở được offline.
- **Lỗi trang:** 0 `Runtime.exceptionThrown` / `console.error` trong cả lần chạy.

Ảnh chụp, `e2e-report.json` và `axe-report.json` của lần chạy cuối nằm trong thư mục scratchpad `v21e2e/` của phiên (không commit). Chạy lại script để có bản mới trong `e2e-out/`.

## Phát hiện

Mức độ: **Cao** = chặn người chơi hoặc mất dữ liệu; **Trung bình** = sai hành vi hoặc a11y nghiêm trọng (axe serious) có người gặp thường xuyên; **Thấp** = a11y mức moderate, hoặc chi tiết.

| id | Mức | Khu | Tái hiện | Mong đợi / Thực tế | File nghi ngờ |
|---|---|---|---|---|---|
| E1 ✅ L189 | Trung bình | a11y, top bar | Có thẻ ôn đến hạn (nút "Ôn tập" hiện kèm số). Chạy axe trên bất kỳ trang nào; gặp trên 69 màn hình. | **Mong đợi:** tên truy cập chứa chữ hiển thị. **Thực tế:** axe `label-content-name-mismatch` (serious) trên `#review-btn`. Nút hiện "Ôn tập" + badge "5", nhưng `aria-label` = "Ôn tập, 5 mục đến hạn": dấu phẩy chen giữa nhãn và số, nên chữ hiển thị "Ôn tập 5" không nằm trong tên (WCAG 2.5.3). Có thể `#inbox-btn` cũng vậy, vì dùng chung `setActionButton`. | `src/ui/topbar.ts` (`setActionButton`); khóa `top.reviewDue` trong `src/i18n/vi.ts`/`en.ts`; `src/ui/modes.ts` (`renderReviewButton`) |
| E2 ✅ L197 | Trung bình | Workspace, tab Kết quả / Ghim | Sandbox: chạy một truy vấn, sửa SQL trong editor mà không chạy lại. | **Mong đợi:** nút "Ghim lên" tắt kèm "Chạy lại trước khi ghim", và tab có dải "SQL đã thay đổi" (CLAUDE.md: mọi tab mô tả `app.lastRun` và báo khi editor khác). **Thực tế:** sau 1,5 s nút "Ghim lên" vẫn bật và không có dải nào, vì panel chỉ vẽ lại khi chạy hoặc rerender, không vẽ lại khi gõ. Bấm Ghim lúc này mở dialog với kết quả cũ (ở lần chạy trước, dialog xem trước biểu đồ của truy vấn trước và chỉ báo "Chạy lại trước khi ghim" ở trong dialog). | `src/ui/work.ts` (`onChange` không gọi `deps.panel.refresh()`); `src/ui/pin.ts` (`pinBar`); `src/ui/tabs.ts` (dải stale) |
| E3 | Trung bình | a11y, Overview Finance ở 375 px | `#/d/finance` ở 375 px (cả sáng và tối), hàng chương có chip "Dựa vào". | **Mong đợi:** vùng chạm ≥ 24 px. **Thực tế:** axe `target-size` (serious) trên 3 link `#/learn/adv/a2`, `a3`, `b2`: cao 20 px, cách nhau dưới 24 px. | `src/ui/brief.ts` (`advLine`); `src/ui/homeView.ts:210` (truyền class `ABOVE`, không có padding) **Đã sửa (L195):** mỗi link `inline-flex min-h-6 items-center` (24 px). |
| E4 ✅ L197 | Thấp | a11y, dock hoàn thành | Xong một việc (Recap) hoặc một đánh giá (tổng kết chương), rồi chạy axe trong lúc dock còn mở; gặp trên 6 màn hình. | **Mong đợi:** nội dung nằm trong landmark. **Thực tế:** axe `region` (moderate): `#stage-text` nằm ngoài mọi landmark. | `index.html` (`#stage`); `src/ui/stage.ts` |
| E5 ✅ L197 | Thấp (cần xác nhận) | General, mở drill từ trang domain | Đang ở `#/d/logistics/play` (story), đổi hash sang `#/learn/play/<drill>` và gõ ngay. | **Mong đợi:** editor cũ khóa, hoặc drill mở trước khi nhận phím. **Thực tế (quan sát qua harness):** trong lúc chunk drill đang tải, editor story vẫn nhận phím. Chữ gõ vào đó thành nháp của việc story, còn drill mở ra với editor trống. Người thật hiếm khi gõ nhanh đến thế, nên cần thử tay trước khi sửa. | `src/main.ts` (hashchange → `generalNav` → mở drill); `src/ui/modes.ts` (`loadDrillUi`) |

| E6 ✅ L222 | Trung bình | a11y, top bar | Lần chạy trên `main` @ `97425ab` (sau U11/R21-U1/U2/U4): có thẻ ôn đến hạn, axe trên 70+ màn hình. | **Mong đợi:** tên truy cập chứa chữ hiển thị. **Thực tế:** E1 (L189) đặt tên "Ôn tập 5", nhưng trong `index.html` nhãn và huy hiệu dính liền (`</span><span data-badge`), nên axe đọc chữ hiển thị là "Ôn tập5", không nằm trong "Ôn tập 5" (`label-content-name-mismatch`, serious). Đo bằng axe trong Edge headless: thêm một khoảng trắng giữa hai span là đạt (khoảng trắng trong flex không đổi bố cục). | `index.html` (`#inbox-btn`, `#review-btn`); test `tests/topbarName.test.ts` |

Không tìm thấy lỗi chức năng nào trong các luồng chính:

- Đủ 139 việc story và 9 bài tuyến.
- Mọi bước đánh giá, index lab và kết luận.
- KPI, chức danh, tổng kết chương.
- Drill, ôn, kiểm tra đầu vào, phỏng vấn, take-home, bài học.
- Mọi file xuất và nhập.
- Tải lại, Back/Forward, offline.

## Ghi chú về harness

- Hai lần đỏ ở bản nháp script là lỗi của harness, đã sửa:
  - Gõ trước khi drill kịp mở. Nay script chờ tiêu đề "Bài luyện".
  - Bấm "Ghim lên" trước khi kết quả mới về (dẫn tới E2). Nay script chờ kết quả mới, đóng dialog còn mở trước mỗi bước công cụ, và axe không còn làm dừng luồng: lỗi axe gom theo luật + phần tử, báo một dòng ở cuối.
- `Emulation.setEmulatedMedia` chỉ giả lập `prefers-reduced-motion`/`prefers-color-scheme`. CPU và mạng chậm không được giả lập, trừ phần offline.

## Lần chạy lại trên `main` @ `97425ab` (L222)

7/293 bước đỏ cộng một phát hiện axe. Đã xem từng cái bằng ảnh chụp và DOM trong Edge headless:

- **Phỏng vấn (bộ `junior-1`, tải lại giữa chừng): script lệch.** UX-A (L189/L190) đổi tiêu đề mỗi hàng từ `h4` sang `h3`, nên `li.querySelector('h4')` trả `undefined` và gây TypeError. U24 (L195) chỉ để một nút chính trên trang, nên hàng take-home không còn `button.primary`, và script chờ 60 s rồi hết giờ. Script nay tìm theo `h3` và bấm nút theo chữ ("Bắt đầu…"/"Làm tiếp").
- **ch12-06 bước 2 "could not type into a stable editor": script lệch, không phải lỗi app.** Script dump DOM cho thấy chỉ có một editor, editor sửa được và đang có focus. Chữ đọc lại bắt đầu từ dòng 7. Lý do là CodeMirror chỉ vẽ các dòng gần vùng nhìn: SQL bước 2 dài 24 dòng, editor cuộn xuống cuối, nên `.cm-line` thiếu phần đầu. `editorText` nay đọc cả tài liệu từ state của CodeMirror (`.cm-content`.cmTile.root.view). Ba lỗi đi theo (save thiếu ch12-06, 15/16 ô KPI, #/me chỉ có 2 nút portfolio) hết khi ch12-06 và take-home qua.
- **E6 (axe trên `#review-btn`): lỗi app thật.** Đã sửa, xem bảng trên.

Kết quả: 296/296 bước đạt, 0 phát hiện.

