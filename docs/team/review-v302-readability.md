# Review v30.2: độ dễ đọc (chữ, màu, chồng lấn, tách vùng)

Ngày 2026-11-24 · nhánh `v302-ui` (từ `main` = v30.1, f6843a0) · người làm: UI/UX designer (agent).

User (chủ sản phẩm) xem site live và nói: chữ, font, màu khó đọc ở nhiều chỗ, có chỗ chồng nhau, các vùng không tách bạch. Tài liệu này ghi mọi phát hiện, nguyên nhân trong code, cách sửa, và số đo trước/sau.

## 1. Cách đo

- Script chụp và đo (throwaway, không nằm trong repo): `C:\Users\khoa.huynh\Documents\study\bd-wt\review-v302\cap.mjs` + `audit.js` + `scroll.js`. Một Edge headless qua CDP, khởi động lại sau ≤ 12 trang, đóng ở cuối. Trạng thái: `tests/fixtures/save-v5.json` (người chơi quay lại), tour xong, guide tắt; thêm một lượt người mới (Home + hộp chào).
- Ma trận: 1280 sáng, 1280 tối, 1024 sáng, 375 tối, 375 sáng, 320 sáng × 21 trang: Home (cũ + mới + hộp chào), `#/learn`, `#/learn/skill/select` (Phần 1), `#/learn/skill/upsert` (Phần 9), `#/practice`, `#/me`, `#/engine`, bài PG `e-pg-l1-02`, Mongo `e-mg-l3-12`, Dynamo `e-dy-l1-09`, Thiết kế `e-ds-l1-02` (mỗi bài: chạy một ví dụ rồi nộp bước lab 1), `#/engine/compare`, `#/engine/terms`, popover thuật ngữ (`e-pg-l2-01`), `#/engine/interview`, `#/engine/best` + thẻ `e-bp-i04`, bảng Ctrl+K mở, workspace Logistics có bảng kết quả. 126 lượt mỗi lần chạy.
- Đo trong trang (logic lấy từ `scripts/ux-audit.mjs`, mở rộng):
  - **contrast**: mọi nút chữ thấy được, nền tìm qua tổ tiên (alpha cộng dồn, opacity của tổ tiên nhân vào màu chữ); < 4,5:1 (chữ lớn < 3:1). Nút bị tắt (WCAG miễn) đếm riêng.
  - **soft** (ngưỡng dễ đọc, không phải WCAG): chữ ≤ 13 px mà < 7:1.
  - **tiny**: chữ ≤ 12 px; **small**: < 12 px; **lineHeight**: chữ thân ≤ 18 px, xuống dòng, line-height < 1,3.
  - **svg**: chữ trong sơ đồ SVG < 11 px sau khi co giãn, hoặc tương phản thấp.
  - **textOverlap**: hộp chữ (Range) của hai phần tử không lồng nhau giao nhau, đã cắt theo mọi tổ tiên `overflow` (pane cuộn che phần bị ẩn); **controlHit**: tâm một nút bị phần tử khác che; **clipped**: chữ bị cắt (ellipsis/overflow) mà không có `title`/`aria-label`.
  - **scroll pass**: cuộn vùng cuộn chính từng 70 % màn hình, kiểm controlHit ở mỗi bước, hai thanh dính chồng nhau, và ở cuối trang chữ còn nằm dưới thanh dưới cùng.
  - **edge**: hộp bo góc có padding (thẻ, inset): độ tách với nền cha = max(tương phản nền, viền, ring); cờ khi < 1,3 và không có bóng. **track**: thanh tiến độ < 1,3 với nền. **spaceLost**: cha `space-y-*` mà hai con liền nhau dính sát (< 2 px).
  - **topbar**: port `TOPBAR` của ux-audit, 320–1920 px × VI/EN × 3 trang (48 tổ hợp).
- Ảnh: trước (live v30.1) `C:\Users\khoa.huynh\Documents\study\bd-wt\review-v302\before\`, sau (build `v302-ui`, `vite preview` cổng 5361) `C:\Users\khoa.huynh\Documents\study\bd-wt\review-v302\after\`. Tên `<trang>-<rộng>-<theme>[-pN].png`; `-vp-mid`/`-vp-end` là ảnh khung nhìn giữa/cuối trang (bài học, workspace) để thấy thanh dính. Số đo: `before-m\report.json`, `after-m\report.json` (lượt không chụp, cùng `audit.js` đã đóng băng), `before\topbar.json`, `after\topbar-after.json`.
- Đã xem tận mắt: mọi trang ở 1280 sáng; 1280 tối (Home, Lộ trình, bài Phần 1, Luyện, Tiến bộ, bài PG, popover, workspace); 375 tối (Home, Lộ trình, bài Phần 1 và 9, so sánh, bài PG/Mongo có thanh dính, workspace); 320 sáng (bài Phần 9); sau sửa: các trang đã đổi ở 1280 sáng/tối, 1024 sáng, 375 tối/sáng.

## 2. Tổng hợp trước → sau

Đếm "duy nhất" = một phần tử (class + chữ) tính một lần dù gặp ở nhiều trang/khổ; "lượt" = số lần gặp trên 126 lượt.

| Nhóm | Phép đo | Trước (duy nhất / lượt) | Sau (duy nhất / lượt) |
|---|---|---|---|
| Tương phản / màu | chữ < 4,5:1 (WCAG), trừ nút tắt | 0 / 0 | 0 / 0 |
| | soft: chữ ≤ 13 px dưới 7:1 | 252 / 1.257 | 42 / 231 |
| | thanh tiến độ < 1,3:1 | 1 / 12 (+ 3 loại thanh `aria-hidden`, xem bằng mắt) | 0 / 0 |
| | chữ SVG < 11 px (sơ đồ, ở 375/320) | 16 / 48 | 16 / 48 (chưa sửa, F5) |
| Font / cỡ / line-height | chữ < 12 px | 0 / 0 | 0 / 0 |
| | chữ ≤ 12 px | 234 / 1.769 | 5 / 285 (chỉ 5 nhãn thanh dưới cùng ở điện thoại, cố ý) |
| | line-height < 1,3 khi xuống dòng | 24 / 130 | 0 / 0 |
| Chồng lấn / cắt | chữ chồng chữ / nút bị che (mọi bước cuộn) | 0 / 0 (53 báo nhầm ở lượt đầu, đã sửa cách đo) | 0 / 0 |
| | chữ bị cắt không có tên đầy đủ | 1 / 1 | 1 / 1 (O4) |
| | hàng cuối bảng dưới thanh/mép (báo nhầm, O3) | 6 / 10 | 8 / 12 (kiểm riêng: hàng cuối luôn thấy) |
| | thanh trên cùng 320–1920 × VI/EN (48 tổ hợp) | 0 lỗi | 0 lỗi, số đo giống hệt |
| Tách vùng | hộp có cạnh < 1,3:1 (thẻ, inset) | 89 / 411 | 38 / 154 (chỉ còn nền màu và khối code; 0 thẻ `ring-line`) |
| | chồng `space-y` mất khoảng cách | 12 / 63 | 2 / 9 (hai báo thừa, xem S3) |

Theo khổ (số mục trên 21 trang, trước → sau): 1280 sáng: chữ ≤ 12 px 302 → 0, soft 324 → 53, cạnh yếu 91 → 28, dính khoảng cách 12 → 2; 1280 tối: 302 → 0, cạnh yếu 25 → 20; 1024 sáng: 280 → 0, soft 301 → 48, cạnh 90 → 27; 375 tối: 295 → 95 (nhãn thanh dưới), cạnh 26 → 20; 375 sáng: soft 316 → 65, cạnh 89 → 29; 320 sáng: soft 316 → 65, cạnh 90 → 30, line-height 19 → 0. Viền thẻ `ring-line` ở 1280 sáng (70 thẻ): 1,23–1,32:1 → 1,51–1,61:1.

Ghi chú đọc bảng:
- Không có chữ nào dưới 4,5:1 (WCAG) ở cả trước và sau, trừ hai nút đang tắt (`‹ Trước` của sơ đồ từng bước 3,43:1, `›` của thanh việc) mà WCAG miễn. Vấn đề user thấy nằm ở mức "đạt chuẩn nhưng mệt mắt": chữ 12 px màu phụ 5,8:1, thẻ trắng trên nền kem chỉ có viền 1,23:1, và các khối dính nhau.
- Overlap: không có chồng lấn thật nào. 53 chồng chữ ở lượt chụp đầu là do đo (chữ bị pane cuộn che vẫn được tính), đã sửa cách đo; controlHit 0 ở mọi bước cuộn; thanh trên cùng giống hệt trước/sau ở cả 48 tổ hợp.

## 3. Phát hiện

### 3.1 Tương phản / màu

| ID | Trang | Khổ/theme | Đo được (trước) | Ảnh | Nguyên nhân trong code | Sửa | Sau |
|---|---|---|---|---|---|---|---|
| C1 | Mọi trang (chữ phụ: dòng meta, nhãn nhóm VIẾT HOA, số đếm, "Lịch ôn", "tự đo, không xác minh") | sáng | `--muted` #6b5f57 = 5,78:1 trên `--bg`, 6,6:1 trên `--panel`; 252 chữ ≤ 13 px dưới 7:1 (1.257 lượt) | `before/skill-select-1280-light-p1.png`, `before/me-1280-light-p1.png` | token `--muted` (`src/style.css :root`) | `--muted` #5c5149: 7,21:1 trên `--bg`, 7,94:1 trên `--panel`, 6,3–6,6:1 trên inset; vẫn khác rõ `--text` (15:1) | xem bảng §2 (còn lại là chữ phụ trên inset/nền màu, 6,2–6,7:1) |
| C2 | Home (thanh "Lily của bạn"), `#/learn` (thanh mỗi Phần), `#/engine` (thanh mỗi engine), Best Practice | sáng + tối | rãnh thanh tiến độ 1,13–1,15:1 với thẻ: rãnh gần như không thấy, chỉ thấy phần đã đầy | `before/home-1280-light.png`, `before/learn-1280-light-p1.png`, `before/engine-1280-light.png` | rãnh dùng `--code`/`bg-code` (`.lily-bar` trong style.css; `bar()` ở `learnView.ts`, `engineView.ts`, `engineBest.ts`) | rãnh dùng `--border` (`bg-line`): 1,61:1 sáng, 1,78:1 tối | track < 1,3: 1 → 0 (thanh `aria-hidden` không được máy đo đếm, đã xem bằng mắt: `after/learn-1280-light-p1.png`) |
| C3 | Sơ đồ từng bước (Mongo, PG), thanh việc workspace | mọi khổ | `‹ Trước` 3,43:1, `›` 3,4:1 | `before/mg-l3-12-1280-light-p2.png` | nút đang tắt (`aria-disabled`, `--disabled`) | không đổi: WCAG 1.4.3 miễn cho điều khiển không hoạt động, và màu xám là tín hiệu "chưa bấm được" | — |
| C4 | Hộp "Mỗi lần chạy là một cơ sở dữ liệu mới…" (lab), "Sau thẻ này bạn tránh được", hộp Bẫy | sáng | nền màu `bg-info-soft`/`bg-warn-soft` trên `--bg`: độ sáng chỉ 1,06–1,09:1 | `before/pg-l1-02-1280-light-p2.png`, `before/skill-select-1280-light-p2.png` | token nền mềm | không đổi: các hộp này tách bằng sắc (xanh/cam) chứ không bằng độ sáng; thêm viền sẽ cạnh tranh với thẻ thật. Ghi ở §5 | — |

### 3.2 Font / cỡ chữ / line-height

| ID | Trang | Khổ/theme | Đo được (trước) | Ảnh | Nguyên nhân | Sửa | Sau |
|---|---|---|---|---|---|---|---|
| F1 | Mọi trang: số dòng bảng, nhãn nhóm VIẾT HOA (`TRONG BÀI NÀY`, `MỤC TIÊU`, `BƯỚC 1/3`), chip, số đếm, chú thích "Kiểm với PostgreSQL…", "Mỗi bản chạy trên một database mới…" | mọi khổ | 234 chữ 12 px (1.769 lượt); top: số thứ tự bảng (42), mô tả huy hiệu (37), nhãn nhóm (30+22+22) | `before/best-card-1280-light.png`, `before/me-1280-light-p1.png` | `--text-caption: 0.75rem` (121 chỗ dùng `text-caption`) | `--text-caption: 0.8125rem` (13 px), line-height 1.125rem (1,38) | tiny ≤ 12: chỉ còn 5 nhãn thanh dưới cùng (cố ý, F4) |
| F2 | Khối code (Cú pháp, Ví dụ, Bẫy, Nên/Không nên), chữ `.muted` | mọi khổ | `pre.sql` 13 px monospace (nhìn nhỏ hơn chữ thân 15 px), `.muted` 13 px | `before/ds-l1-02-1280-light-p2.png` | `pre.sql { font-size: 13px }`, `.muted { font-size: 13px }` (`@layer components`) | 14 px cả hai; dòng dài vẫn cuộn ngang như trước | đã xem: `after/mg-l3-12-1280-light-p2.png` |
| F3 | `#/me` → Huy hiệu (điều kiện dưới mỗi huy hiệu) | ≥ 640 px | 12 px, line-height 1,25, 2–3 dòng (37 mục) | `before/me-1280-light-p2.png` | `leading-tight` (`meView.ts` dòng mô tả huy hiệu) | bỏ `leading-tight` (dùng line-height của caption, 1,38) | lineHeight < 1,3: 24 → 0 |
| F4 | Thanh dưới cùng (điện thoại) | 320–375 | 12 px, line-height 1,25; "Luyện SQL" xuống 2 dòng ở 320 | `before/home-375-dark.png` | `BOTTOM_LINK` (`topbar.ts`): `text-caption leading-tight` | giữ 12 px (`text-[0.75rem]`: năm cột ở 320 px không đủ chỗ cho 13 px), `leading-snug` (1,375); thanh vẫn 57 px, không nhãn nào bị cắt (topbar check) | 5 nhãn 12 px còn lại, có chủ ý |
| F5 | Sơ đồ từng bước (Mongo "Pipeline tổng hợp", B-tree PG) | 375, 320 | chữ trong SVG 9,1–10,6 px (16 nhãn) | `before/mg-l3-12-375-dark-p3.png` | sơ đồ `viewBox` rộng 340 đơn vị, nhãn 9,5–11 đơn vị, co theo bề rộng hộp (`engineVizCore.ts`) | đã thử `min-width` 1,15 × viewBox + cuộn ngang: nhãn nhỏ nhất chỉ lên 10,9 px mà cột phải ("1000 tài liệu") bị đẩy khỏi khung, phải cuộn mới thấy. Hoàn lại (commit a6c6a84). Ghi ở §5 | không đổi |

### 3.3 Chồng lấn / cắt chữ

| ID | Trang | Khổ/theme | Đo được | Ảnh | Kết luận |
|---|---|---|---|---|---|
| O1 | Mọi trang | mọi khổ | textOverlap 0, controlHit 0 ở mọi bước cuộn, thanh dính chồng nhau 0 (trừ máy đo thấy gutter CodeMirror dính đi dưới thanh dưới cùng khi cuộn: đúng thiết kế) | `before/pg-l1-02-375-dark-vp-mid.png`, `before/skill-select-375-dark-vp-end.png` | Không có chồng lấn thật. Lượt chụp đầu báo 53 chồng chữ: chữ nằm trong pane đã cuộn (bị pane che) vẫn bị tính; đã sửa cách đo (cắt hộp chữ theo tổ tiên `overflow`) và tất cả biến mất. |
| O2 | Thanh trên cùng | 320–1920, VI + EN, 3 trang | 48 tổ hợp: không chữ nào bị cắt hay chồng ở 1024–1920, một hàng; header 61 px và thanh dưới 57 px ở điện thoại | `before/topbar.json`, `after/topbar-after.json` | Trước = sau ở cả 48 tổ hợp (caption 13 px không chạm thanh trên cùng). |
| O3 | Workspace Logistics, bảng kết quả | 1280, 1024, 375, 320 | máy đo báo hàng cuối bảng nằm dưới mép màn/thanh dưới | `before/logi-play-375-dark-vp-end.png`, `before/logi-lastrow-*.png` | Không phải lỗi: kiểm riêng (cuộn mọi vùng cuộn tới cuối) thấy hàng 24/24 nằm trọn trong khung ở cả bốn khổ; lỗi đo do hai vùng cuộn lồng nhau. |
| O4 | Bài `upsert`, thanh "1/8 · Mở bài" dính trên đầu | 320 | chữ bị cắt 75/72 px, không có `title` | `before/skill-upsert-320-light-p1.png` | Còn mở (§5), nhỏ: nút mở mục lục, chữ đầy đủ có trong danh sách khi mở. |
| O5 | `#/me`, kỹ năng "Tra giá trị theo từng dòng (truy vấn con tương quan)" | ≥ 1024 | cắt bằng ellipsis | `before/me-1280-light-p1.png` | Có `title`, đúng thiết kế. |

### 3.4 Tách vùng / thứ bậc

| ID | Trang | Khổ/theme | Đo được (trước) | Ảnh | Nguyên nhân | Sửa | Sau |
|---|---|---|---|---|---|---|---|
| S1 | Mọi thẻ (Home, Lộ trình, Luyện, Tiến bộ, Engine, mọi bài học, câu hỏi kiểm tra, đáp án trong câu hỏi) | sáng | thẻ trắng trên nền kem: nền 1,07:1, viền `ring-line` 1,23:1; thẻ trong thẻ (đáp án quiz, ví dụ) chỉ có viền 1,32:1 với thẻ ngoài. 89 hộp có cạnh < 1,3 (411 lượt) | `before/skill-select-1280-light-p2.png`, `before/engine-1280-light.png` | token `--border` #e8dfd3 (mọi `ring-line`, `border-line`, `th/td`, `button`) | `--border` #d8cab8: 1,51:1 trên `--bg`, 1,61:1 trên `--panel`; giữ tông ấm v6 | edge < 1,3 còn lại chỉ là nền màu (C4) và khối code (S2), không còn thẻ nào |
| S2 | Hộp lồng: "Học xong bạn làm được", ô số liệu `#/me`, khối code, đầu bảng, chip | sáng + tối | sáng: `--surface-2` 1,13:1 và `--code` 1,13:1 trong thẻ, 1,05:1 trên nền trang; tối: 1,13:1 | `before/skill-select-1280-light-p1.png`, `before/me-1280-light-p1.png` | token `--surface-2`, `--code` | sáng `--surface-2` #f2ebe0 (1,18:1 trong thẻ), `--code` #f0e8dc (1,22:1 trong thẻ, 1,14:1 trên nền trang); tối cả hai #302a25 (1,19:1). Chữ trên inset vẫn ≥ 6,3:1 (sáng), ≥ 8,3:1 (tối) | đã xem `after/me-1280-light-p1.png`, `after/pg-l1-02-1280-dark-p1.png` |
| S3 | `#/learn` (dòng "Đã học 6/43…" dính thẻ "Học tiếp", nút "Boon chỉ mình" chạm thẻ ở 375), `#/me` ("Nên làm tiếp": tiêu đề, câu, nút dính nhau; "Lỗi Postgres hay gặp"), `#/practice` (thẻ "Bài luyện trên dữ liệu cửa hàng"), hộp chào người mới (2 đoạn dính), đầu đề người gửi trong workspace, ô "Đang có CREATE INDEX…" trong bài PG L2 | mọi khổ | 12 chồng `space-y-*` mất khoảng cách (63 lượt) | `before/learn-375-dark-p1.png`, `before/me-1280-light-p1.png` | Tailwind v4 sinh `space-y-*` trong `:where()` (độ ưu tiên 0), nên `m-0`/`my-0`/`mb-0` của con thắng và xóa khoảng cách; code viết theo thói quen Tailwind v3 | một luật trong `@layer utilities` (`style.css`): con có `m-0`/`my-0`/`mb-0` của cha `space-y-N` nhận lại `margin-block-end` = bước N (`--sy` theo bước, 0 ở breakpoint đặt `space-y-0`) | spaceLost 12 → 2 (hai cái còn lại là con inline, máy đo đếm thừa: tiêu đề nút A1… và khối `space-y-10` của Luyện có con đầu là `h2` một dòng; xem ảnh `after/learn-1280-light-p2.png`, `after/practice-1024-light-p1.png`) |
| S4 | Thanh cuộn, `ring-line-strong`, viền điều khiển | sáng | `--border-strong` 1,64:1 | — | token | `--border-strong` #b8a893: 2,17:1 trên `--bg`, 2,32:1 trên `--panel` | — |
| S5 | Bài Mongo L3-12, "Pipeline tổng hợp" bước 1/6 | mọi khổ | khung sơ đồ cao ~430 px mà bước 1 chỉ vẽ một hàng: một khoảng trắng lớn trước nút Trước/Tiếp | `before/mg-l3-12-1280-light-p2.png` | chiều cao `viewBox` tính cho cả 6 stage (`engineVizNosql.ts`) | không đổi (giữ khung để các bước sau không làm trang nhảy); ghi ở §5 | — |

## 4. Đã sửa (commit trên `v302-ui`, chưa push)

- `9a25a5d` màu: `--muted`, `--border`, `--border-strong`, `--surface-2`, `--code` (sáng), `--surface-2`/`--code` (tối); rãnh thanh tiến độ dùng `--border`; `tests/theme.test.ts` thêm test "v30.2 (L500)" khóa các cặp mới (chữ phụ ≥ 7:1 trên nền và thẻ, ≥ 6:1 trên inset; viền ≥ 1,45/1,55; inset ≥ 1,15/1,18; tối inset ≥ 1,18).
- `d3e09f6` chữ: caption 13 px, `pre.sql` và `.muted` 14 px, thanh dưới cùng 12 px `leading-snug`, mô tả huy hiệu bỏ `leading-tight`; test khóa caption 0.8125rem và `pre.sql` 14 px.
- `cde3e1c` tách vùng: luật `space-y-*` cho con có `m-0`.
- `a6c6a84` hoàn lại thử nghiệm `min-width` cho sơ đồ (F5).

Ngân sách: css 20,46 KB gz / 22 (trước ~20,0); các nhóm khác không đổi (`node scripts/check-budget.mjs` ok).

## 5. Còn yếu (chưa sửa)

- **F5 Sơ đồ từng bước trên điện thoại**: nhãn 9,5–11 đơn vị co còn 9–10,6 px ở 375. Cần thiết kế lại sơ đồ cho khổ hẹp (nhãn ≥ 12 đơn vị hoặc bố cục dọc), không phải một dòng CSS. Đã thử cuộn ngang và bỏ vì che mất cột phải.
- **C4 Hộp nền màu** (info/warn/good soft) trên nền trang: tách bằng sắc, độ sáng chỉ 1,06–1,09:1. Nếu user vẫn thấy "không tách", bước tiếp theo là cho các hộp này `ring-1` cùng sắc (ví dụ viền `--info`/`--warn` ở 30 %), cần một token mới cho mỗi sắc.
- **Chữ phụ trên inset**: `--muted` trên `--surface-2`/`--code` 6,3–6,6:1 (≥ 4,5 WCAG, dưới ngưỡng thoải mái 7). Tối hơn nữa sẽ làm `--muted` gần `--text`.
- **S5** khoảng trắng của sơ đồ pipeline ở bước đầu.
- **O4** chữ "1/8 · Mở bài" bị cắt ở 320 px không có `title`.
- Thanh dưới cùng giữ 12 px (F4).

## 6. Kiểm tra

- `npx tsc --noEmit` ok; `npm run build` ok; `node scripts/check-budget.mjs` ok.
- Vitest, từng file, `--no-file-parallelism`: theme 24, axe 44, axeProgress 16, engineAxe 14, engineFull 9, engineV27Axe 7, engineDesignAxe 9, engineCompareAxe 4, palette 3, i18n 20: tất cả qua.
- Không chạy e2e hay cả bộ vitest (luật user).
- Quyết định: `docs/team/decision-log.md` L500 (màu), L501 (chữ), L502 (khoảng cách `space-y`).
