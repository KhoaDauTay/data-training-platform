# Database Engine: thiết kế lại cho v22 (L280–L282)

User (review v22 RC): "UI/UX của Engine quá xấu, làm lại đi. Thêm icon cho các engine, thêm card, design lại. Giống với cấu trúc UI/UX hiện tại." Tài liệu này ghi lý do Product và các quyết định UI. Ảnh trước/sau: thư mục scratchpad `engine-redesign/` (`before-*` / `after-*`, 1280 sáng, 1024 sáng, 375 tối, 320 sáng; 11 trang mỗi cỡ). Ảnh `before-*-level.png` là trang engine: trước bản này chưa có trang cấp.

## Product: vì sao

| Vấn đề (review RC, blind-pg) | Hậu quả cho người học | Cách sửa |
|---|---|---|
| `h1` luôn là "Database Engine" | Không biết đang ở bài nào, trình đọc màn hình nghe sai cấp tiêu đề | h1 = tên engine / "L1 · Người mới" / tên bài, trên đó là đường dẫn Database Engine › PostgreSQL › L1 (cùng mẫu `learnSub` của Lộ trình) |
| Tổng quan chỉ có chữ, không nút chính | Người mới không biết bắt đầu ở đâu | Thẻ "Bắt đầu từ đây / Học tiếp" với một nút chính; mỗi engine một thẻ có icon, mô tả một dòng, 5 ô cấp bấm được, tiến độ, nút "Tiếp tục bài · Ln" |
| Hàng bài là chữ thường | Không thấy bài kế tiếp, loại bài, bài nào chạy thật | Trang cấp mới: mỗi mô-đun một danh sách hàng như hàng chương ở Tổng quan domain: icon loại bài (✓ khi xong), "Lab · 8 phút · Chạy được", bài kế tiếp nền accent + vạch trái, nút Học tiếp / Mở / Xem lại |
| Lộ trình NoSQL chỉ có lối vào trong trang MongoDB | Người học SQL không tìm ra | Một dòng riêng trên `#/engine` (và trang MongoDB, sidebar MongoDB) |
| Ô lab là `<textarea>` | Không tô màu, không số dòng, phím tắt khác workspace | Editor CodeMirror của app (L281) |
| 4/6 bài Postgres không giải được chỉ vì không thấy tên bảng/cột (blind-pg) | Đoán tên, bỏ cuộc | "Bảng dùng" trong khối dữ liệu lab (L282) |
| `#/engine/play/<id>` rơi về trang chủ Engine | Link hỏng | Mở bài (`enginePlayOf`) |
| "Kết quả quá lớn… thêm LIMIT" hiện cạnh bước đã đạt | Tưởng mình sai | Bước đạt không hiện chú thích đó |

Không thêm: thanh bước dính của capstone, workspace riêng cho lab (`#/engine/play` trong `<main id="shell">`), Best Practice, kéo thả câu xếp thứ tự (spec §5.3–5.6): không chặn phát hành, để v23 (roadmap "Postgres đủ").

## UI: quyết định

- **Dùng lại, không thêm phong cách mới.** Hàng danh sách là `listRow`/`LIST` của `ui/homeView.ts` (qua `EngineDeps.ui`, không tốn ngân sách chunk), nhãn nhóm `GROUP_TITLE`, thẻ `CARD`, nút `BTN_GO` (một mỗi vùng) / `BTN_SECONDARY` / `BTN_GHOST`, chip `PILL`/`DONE_PILL`, thang chữ `text-heading/title/body/caption`, bo `--r-card/--r-ctl/--r-inset`, nền `bg-info-soft`/`bg-good-soft`/`bg-surface-2`.
- **Thẻ engine** giống thẻ module của Lộ trình: cả thẻ là một link phủ (L88), hover chỉ đổi viền (L93: không transform trên thẻ), các ô L1–L5 và nút phụ nằm trên lớp phủ (`ABOVE`). Ô cấp chứa bài kế tiếp viền accent 2 px; ô xong có ✓; thanh 4 px dưới mỗi ô, số k/n cạnh đó (không chỉ dùng màu, L23).
- **Icon** (pipeline `scripts/icon-*.json` → `node scripts/icons.mjs`): PostgreSQL = lưới bảng (quan hệ), MongoDB = trang có ngoặc nhọn (tài liệu JSON), DynamoDB = chìa khóa nối hai ô (khóa-giá trị). Ẩn dụ chung, không logo, không màu thương hiệu; nét 16, lớp tô 0.2 như Phosphor duotone. Loại bài: bóng đèn (khái niệm), ống nghiệm (lab), tâm ngắm (đoán), dấu hỏi (câu hỏi), cờ đích (tổng hợp), trang giấy (chỉ theo tài liệu); cấp = bậc thang; Lộ trình NoSQL = biển chỉ đường. Không trùng path với icon có sẵn (test).
- **Huy hiệu engine** là vòng `bg-accent-soft` + icon `text-accent` (cùng hình với `domainBadge`, nhưng màu accent: màu nhận diện domain dành cho domain).
- **Trang bài:** hàng chip đầu (một chip nhãn trung thực, chip loại có icon, phút, link mô-đun, "Đã xong"); bài `docs` một dòng chữ mờ thay khung dài (review RC mục 5). Mục tiêu là thẻ nhãn chữ hoa; Đoán và Câu hỏi là thẻ có icon ở tiêu đề `h2`, các câu cách nhau vạch 1 px, lựa chọn là hàng 44 px có viền, chọn = nền accent-soft + viền 2 px, đúng = good-soft. Lab: khối info-soft (dữ liệu lab + Bảng dùng), mỗi bước một thẻ với vòng số (✓ khi đạt), nhãn "BƯỚC 1/3", editor, Chạy thử (phụ) + Nộp (chính), Gợi ý, dòng trạng thái, kết quả. Cuối bài: Bài trước (ghost) / Bài tiếp (chính khi đã xong).
- **Khoảng cách:** `space-y-*` của Tailwind v4 dùng `:where`, nên con có `m-0` mất khoảng cách (đoạn văn trong bài dính nhau trước đây). Khu Engine dùng `flex flex-col gap-*`.
- **Điện thoại:** công tắc SQL | Database Engine chỉ ở đầu `#/learn` và `#/engine` (spec §3.2); hàng danh sách không dùng `stack` (nút bị đẩy tràn mép ở 320); không cuộn ngang ở 320/375/1024/1280 (đo trên 11 trang).
- **Sidebar:** dòng engine có icon engine; dòng cấp chỉ có số trong huy hiệu (L189), trỏ tới trang cấp và là dòng `aria-current` khi trang cấp hoặc bài thuộc cấp đó. Rail 64 px ở 1280 là mặc định toàn site (L85), không phải lỗi riêng Engine.
- **Ngân sách:** trang Lộ trình NoSQL tách sang chunk `enginePathView` (3/6 KB); `engineui` 18/20 KB; main +3 KB gz (icon) trong trần 500.

## Câu hỏi còn mở

- Bộ tô màu mongosh (`src/engine/mongo/editor.ts`) chưa nối vào editor của lab MongoDB (cần kiểm chunk trước).
- Spec §5.3 đặt lab trong workspace (`#/engine/play/<id>`). Bản này giữ lab trong trang đọc; route chỉ chuyển hướng.
