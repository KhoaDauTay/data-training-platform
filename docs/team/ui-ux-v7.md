# BoonData — UI/UX v7: từ "đẹp từng hình" sang "một hệ thống" (bàn làm việc, biểu đồ, ba domain cùng một chất)

**Trạng thái: ĐỀ XUẤT, chờ user duyệt §9.**

Người viết: UI/UX · 2026-11-19. User: *"Product Agent, UI/UX suy nghĩ thêm về việc phát triển tiếp theo"*. Trước đó user nói hình tự chế trông xấu và muốn animation, icon, SVG trông chuyên nghiệp. Song song có `product-roadmap-v15.md` (Product): tài liệu đó chọn **làm việc gì, theo thứ tự nào**; tài liệu này nói **trông và cảm thế nào**. Hai mục Product giao cho v7 là Q6 (nhãn "dữ liệu luyện" trong bài học của domain) và Q8 (chân hộp thoại màn chào), cả hai nằm ở §P1/§P2.

v7 **xây trên v6** (GSAP lười, Phosphor duotone, rig Lily/Boon, Tiên Sa, bản đồ Natural Earth), không bỏ v6. Các luật sau giữ nguyên:
- Kiểu gốc là trạng thái cuối; animation một lần chỉ gắn lúc có sự kiện.
- Transform chỉ đặt trên SVG lá, không đặt lên link, nút hay card (L88/L93).
- Một chuyển động ≤ 3 s, bỏ qua được, không che editor hay bảng kết quả.
- `prefers-reduced-motion` thì hiện khung tĩnh.
- Tương phản ≥ 4,5:1 ở hai theme; chạy được ở 320/375 px; class Tailwind là chuỗi literal.
- Tài sản ngoài chỉ khi giấy phép cho dùng, sửa và phát hành lại trong repo công khai; ghi vào `assets/THIRD_PARTY.md`.
- Vai trò linh vật (L87): Boon dạy, Lily chỉ phản ứng; mỗi vùng tối đa một linh vật.

**Sửa quyết định cũ:**
- v5 §7 "Không làm: âm thanh" và v6 (không có âm): v7 đề xuất **âm thanh tùy chọn, mặc định tắt** ở P3 (§P3 X2, D-U6). Đây là đề xuất của product-design-v2 §"âm thanh", chưa từng build.
- v6 S5 "chân dung bỏ" (L122, Open Peeps không hợp ở 28–48 px): v7 đề xuất **vẽ lại theo ngữ pháp của linh vật** (không dùng bộ ngoài), có cổng mắt và phương án lùi (§P3 X1).
- v4 §5 (trang Dữ liệu dùng Mermaid mặc định) và CLAUDE.md "ER tab renders a Mermaid erDiagram": vẫn dùng Mermaid, nhưng **màu lấy từ token** (§P2 D2).
- `BTN_SUBMIT` (`src/theme.ts`, emerald cứng) nhập vào hệ nút chung (§P1 T1, W1).
- L11 (bỏ menu, chỉ L42 giữ popover `⋯` ở top bar): W1/M1 thêm một menu "⋯ Công cụ" nhỏ trong hàng nút workspace (Định dạng, EXPLAIN) khi pane hẹp. Phím tắt không đổi.
- Biểu đồ dùng màu chương (L36 cho viền ER; `chartView`/`kindColor`): dữ liệu biểu đồ dùng **một màu `--accent`** (C1, D-U2); màu chương giữ ở viền ER, chip, chấm.
- Dock hoàn thành (L107 bảng `DOCK`, `completion-animations.md`): ở ≥ 1024 hẹp lại 480 px và **tự thu thành một dòng** khi xong chuyển động (W2, D-U3); thăng tiến giữ nguyên.
- Màn chào (v12.0 P2, v4 §B.2): domain thành bước riêng, bỏ lần vẽ lại bước 1 sau khi chọn (O1, D-U11). `bootPick` và luật "không seed trước khi chọn" giữ.

---

## 0. Nhìn lại bản hiện tại (v14, 2026-11-19)

### 0.1 Cách chụp

- Build vào scratchpad (`npx vite build --outDir …\uiux-v7\dist`), vì `npm run build` trong repo lỗi ở `prepareOutDir` (lúc đó cổng 5199 đang có tiến trình nghe; chưa kiểm tiến trình nào, nên nguyên nhân chưa xác nhận). **`dist` của repo không hỏng**: 145 file asset, mọi file `index.html` tham chiếu đều có.
- `vite preview --port 5230 --strictPort`, Edge headless, mỗi lượt một hồ sơ mới, điều khiển bằng CDP. Không dùng 5173/5174. Đã tắt preview và mọi Edge sau khi chụp.
- Hai trạng thái: người mới (màn chào), và save `tests/fixtures/save-v5.json` (7 việc Logistics, 2 E-com, 1 Finance, 1 thẻ dashboard).
- Cỡ 1280×800 và 375×812, sáng + tối. Có thêm 1280×1600 cho trang dài.
- 0 ngoại lệ ở cả ba lượt. Lượt đầu (`shoot.mjs`) ghi cả `console.error`: 0. Hai lượt sau chỉ ghi ngoại lệ.

Ảnh ở `C:\Users\KHOA~1.HUY\AppData\Local\Temp\claude\be8c95d1f89f2452\e927c5e6-22a4-40fa-bff6-3a9e8af9fcbc\scratchpad\uiux-v7\`:
- `shots\{light,dark}-{1280,375}-*.png`: màn chào, Trang chủ, Lộ trình, Phần, Luyện SQL, kỹ năng, Tổng quan ×3 domain, Bản đồ, Dữ liệu, Bảng điều hành ×2, workspace (trước và sau Chạy, tab Biểu đồ). Script `shoot.mjs`.
- `shots2\`: nộp sai, Sandbox (bảng, biểu đồ cột, thứ tự thực thi, ER), pane SQL/Kết quả ở 375, trang dài 1280×1600. Script `extra.mjs`.
- `shots3\`: lỗi SQL, nộp đúng + dock (1,1 s và cuối) + Recap, Hộp thư, Sổ tay, ngăn kéo 375, biểu đồ đường, dashboard đã chạy, phút đầu người mới. Script `states.mjs`.

**Không phải lỗi** (nhiễu của cách chụp, đã loại):
- Thanh điều hướng dưới nằm giữa trang trong ảnh 375 cả trang: đó là phần tử `fixed` bị vẽ lại khi chụp quá màn hình.
- Thẻ dashboard "Chưa chạy trên máy này": do save nhập từ fixture.
- Ảnh pane SQL 375 trong `shots2` không có Nộp, vì đó là Sandbox (phiên còn ở chế độ Sandbox). Ảnh story là `shots3\*-375-story-sql`.
- Trang Dữ liệu ở 1280×800 tưởng như "dừng ở 650 px": ảnh 1280×1600 cho thấy trang đủ, đó là ảnh cả trang của vùng cuộn trong.

**Chưa xem** (không nhận xét các chỗ này; task liên quan phải chụp "trước" rồi mới sửa):
- Bước 2–3 của màn chào (chỉ thấy bước 1 trước và sau khi chọn domain; luồng bước 2–3 đọc từ `src/ui/welcome.ts`).
- Việc 1 với dấu tour của Boon và thẻ bài học nhanh mở sẵn.
- Dock E-com, dock Finance, dock thăng tiến (chỉ chụp dock Logistics việc thường).
- Workspace của drill General và bài tuyến (lane).
- Giảm chuyển động; cỡ 320 và 1024.

### 0.2 Cái đã tốt (giữ)

- Top bar một hàng; icon Phosphor đều nét.
- Cảnh Tiên Sa ngày/hoàng hôn có chiều sâu và ánh sáng; bản đồ tuyến trên bờ biển thật đọc rõ ở cả hai theme.
- Dock hoàn thành Logistics có nhịp, dừng ở khung cuối, có "Bỏ qua (Esc)".
- Màu nền kem + teal, chữ Nunito, bo góc lớn: ấm, hợp với linh vật.
- Ở 375, workspace chia ba tab Đề bài / SQL / Kết quả là hướng đúng.
- Trang "Thứ tự thực thi": thẻ bước, thanh Trước/Sau và câu lệnh tô mệnh đề là phần trông "sản phẩm" nhất của workspace.

### 0.3 Nhận xét thẳng: chỗ còn trông nghiệp dư hoặc lệch nhau

v6 làm đẹp **hình** (cảnh, icon, linh vật). Chỗ làm app còn trông "tự chế" bây giờ là **giao diện làm việc**: bảng, tab, biểu đồ, trạng thái rỗng và lỗi. Thêm vào đó là việc không có **hệ thống** chung (cỡ chữ, bo góc, bóng, độ rộng trang, cấp bậc nút) và **ba domain không cùng một chất hình**.

| # | Chỗ | Thấy gì | Ảnh | Mục v7 |
|---|---|---|---|---|
| 1 | Bảng kết quả | Bảng luôn rộng 100 %, cột số căn phải. Hai cột số (`customer_id`, `count`) nằm cách nhau ~600 px, cột đầu là khoảng trống lớn. Một dòng `count` = một con số nhỏ ở mép phải panel. Dòng "không khớp" tô `bg-accent-soft` (teal), **cùng màu với "đúng/đang chọn"**. Có hai thanh cuộn chồng nhau (panel và bảng `max-h-[420px]`), cả hai là thanh cuộn hệ điều hành có mũi tên. Dòng "chạy 1 ms" và caption "Kết quả: 1 dòng" là hai dòng rời. | `light-1280-log-play-run`, `shots2\light-1280-play-wrong-result` | **P1 · W1** |
| 2 | Thanh tab dưới | Khoảng trống không giải thích giữa "Biểu đồ" và "Thứ tự thực thi", giữa "Luồng dữ liệu" và "Sơ đồ ER" (`ml-4` giữa nhóm, `src/ui/tabs.ts:54`, không có vạch ngăn), nên nhìn như lỗi canh. Ở 375, trong pane Kết quả, nhãn tab xuống dòng ("Kết / quả", "Biểu / đồ"), các tab sau bị đẩy khỏi màn hình, gạch chân lệch. Thấy ở cả story và Sandbox. | `light-1280-fin-play`, `shots3\light-375-sql-error-result` (story), `shots2\light-375-play-result` (Sandbox) | **P1 · W1, M1** |
| 3 | Biểu đồ (tab và dashboard) | Cột không có trục, không lưới, không tiêu đề; biểu đồ nằm góc trên trái của panel cao 250 px, phần còn lại trống. Đường: chỉ một nhãn trục y ("891"), không nhãn trục x thấy được, không lưới, chỉ dùng ~70 % bề ngang. Ba cách vẽ cột cho cùng một việc: tab Biểu đồ dùng `bars()` SVG màu chương của việc đang mở (tím ở chương 2); thẻ của người chơi dùng `bars()` màu chương của kỹ năng mở dạng thẻ (`kindColor`); ô công ty dùng thanh HTML xám slate riêng (`kpiView`, `dashboard.ts:69`). | `shots2\light-1280-sandbox-chart`, `shots3\light-1280-line-chart`, `shots2\light-1280tall-dashboard` | **P1 · C1** |
| 4 | Trạng thái rỗng và lỗi trong panel | Tab Biểu đồ khi không vẽ được: một dòng chữ xám 13 px giữa panel trống 250 px. Tab Kết quả khi lỗi: một dòng monospace đỏ `column "cnt" does not exist`, không khung, không chỉ vị trí lỗi trong câu. (Lời giải thích của Boon dưới nút thì tốt.) | `light-1280-log-play-chart`, `shots3\light-1280-sql-error` | **P1 · W1** |
| 5 | Nút trong workspace | Nộp là `bg-emerald-700` cứng (`BTN_SUBMIT`, `theme.ts:86`), không phải `--accent`. Theme sáng gần giống nhau; **theme tối** thì nút chính ở trang đọc là bạc hà sáng chữ tối, còn Nộp là xanh lục tối chữ trắng: hai "nút chính". Phím tắt hiện ba kiểu: chip nhỏ cạnh "Chạy", chip trong nút "Nộp", và "(Shift+Alt+F)" trong ngoặc ở "Định dạng". Ở 375 vẫn hiện "(Shift+Alt+F)" trên điện thoại. | `dark-1280-log-play-run`, `shots3\light-375-sql-error` | **P1 · T1, W1** |
| 6 | Dock hoàn thành ở 1280 | Dock 640 px góc phải dưới che nửa phải bảng kết quả ngay lúc người học muốn xem kết quả đúng của mình (đã ghi ở L112 T1, chưa sửa). Ở 375 dock che Recap; chấp nhận được vì ngắn và có nút. | `shots3\light-1280-dock-mid`, `-dock-end` | **P1 · W2** |
| 7 | Hệ thống | Cỡ chữ: `text-sm` 169 lần, `text-lg` 29, `text-xl` 6, `text-2xl` 4, cộng 6 cỡ px trong CSS; tiêu đề trang khi `font-bold` khi `font-extrabold`. Bo góc: token `--r-card`/`--r-ctl` dùng 15 lần, `rounded-lg/xl/2xl/md` ~95 lần. Không có token bóng (48 chỗ `shadow` tự chọn). Lớp màu thô (emerald/rose/amber/slate) trong `work.ts`, `brief.ts`, `dashboard.ts` ngoài bảng màu của `theme.ts`. Độ rộng trang: Trang chủ/Lộ trình ~850 px giữa, Tổng quan ~1090, Dữ liệu ~1090 căn trái, Bảng điều hành ~1120. | grep trong `src/`, mọi ảnh 1280 | **P1 · T1** |
| 8 | Cấp bậc nút ở trang đọc | Trang chủ 1280 có 5 nút chính teal cùng lúc (Mở việc này, Ôn hôm nay, Vào làm ×3). Mắt không biết bấm đâu trước. | `light-1280-home` | **P1 · T1** |
| 9 | Ba domain không cùng chất hình | Logistics: hero tràn khung, ba lớp núi, ánh sáng, nhãn pill trên hình. E-com và Finance: khung có thanh tiêu đề trên + chú thích dưới, **cùng một mẫu** (dải nhà xám phẳng, cùng đường, cùng cột đèn). Cảnh Finance thưa: một tòa nhà, một hũ, một cây dừa, một ghế trên đường trống; hũ thủy tinh gần như chìm vào trời sáng. Ở 375 hai cảnh này thành dải cao ~90 px. Trang chủ và màn chào nhận diện domain chỉ bằng một icon đơn sắc 20 px. | `light-1280-{log,ecom,fin}-overview`, `light-375-ecom-overview`, `light-1280-home` | **P2 · I1** |
| 10 | Sơ đồ ER (Mermaid) | Theme mặc định của Mermaid: viền xanh dương đậm, nền tím nhạt, chữ đen; lệch hẳn bảng màu kem/teal. | `light-375-log-data`, `shots2\light-1280tall-data` | **P2 · D2** |
| 11 | Bảng điều hành | 12–13 / 16 ô công ty là cùng một thẻ "Đang khóa" (ô khóa xám + 3 dòng chữ), thành bức tường khóa: 1280 cao ~1450 px, 375 cao ~3900 px. Chân thẻ của người chơi: nút gỡ ghim rớt xuống hàng hai ở 1280 và 375. | `shots2\light-1280tall-dashboard`, `light-375-log-dashboard`, `shots3\light-1280-dashboard-ran` | **P2 · D1** |
| 12 | Phút đầu | Màn chào ở 1280×800: hộp thoại cuộn bên trong, "Bước 1/3" và "Tiếp" bị cắt ở mép dưới (Product F7/Q8). Ở 375 danh sách domain nằm dưới nếp gấp. Bốn thẻ domain chỉ là chữ + icon nhỏ. Chọn domain xong vẫn còn bước 1/3 rồi 2, 3 trước khi thấy SQL. | `light-1280-00-welcome`, `light-375-00-welcome`, `shots3\light-1280-first-minute` | **P2 · O1** |
| 13 | Trang dài trên điện thoại | Lộ trình 375 cao ~5200 px (28 nút nâng cao, mỗi nút 3–4 dòng chữ nhỏ). Hàng chương ở Tổng quan 375: chip trạng thái bên phải ép tiêu đề thành cột hẹp, xuống 2–3 dòng. | `light-375-learn`, `light-375-log-overview` | **P2 · M2** |
| 14 | Theme tối | Bề mặt (`--panel` #25201c trên `--bg` #1a1714) gần như cùng độ sáng, thẻ chỉ còn viền mờ. Chip phòng ban (SALES) đỏ sẫm trên nền tối trông mờ (test tương phản vẫn đạt; đây là cảm giác, không phải lỗi 4,5:1). Bảng kết quả: đầu cột gần đen. | `dark-1280-*` | **P2 · K1** |
| 15 | Chân dung đồng nghiệp | Mặt tròn phẳng, màu da/tóc mã hex cứng (`avatar.ts`, không theo theme); mọi người gần giống nhau, chỉ khác áo. Cạnh linh vật có gradient và điểm sáng ở mắt, chân dung trông thuộc app khác. (S5 của v6 bỏ, L122.) | mọi ảnh brief/Hộp thư | P3 · X1 |
| 16 | Linh vật cỡ nhỏ | Lily 32–48 px (Trang chủ, dòng phản hồi, dock) đọc được. Boon 24–28 px (logo top bar, dòng lỗi) chỉ còn kính + mỏ; thân trắng chìm vào nền kem. | `light-1280-home`, `shots3\light-1280-sql-error` | P3 · X3 |

**Kết luận:** v7 dồn công vào (a) **hệ token và cấp bậc** (một lần, mọi trang hưởng), (b) **workspace + biểu đồ** (nơi người học ở lâu nhất), (c) **một quy cách cảnh chung cho ba domain**. Hình mới chỉ là phần nhỏ.

---

## P1

### T1. Hệ token: chữ, bề mặt, bóng, bo góc, nút, độ rộng trang

**Ở đâu:** mọi trang. **Vì sao:** mục 5, 7, 8 ở §0.3. Không có hệ thì mỗi tính năng mới lại tự chọn `text-sm rounded-xl shadow`, và app trông "ghép".

**Mức chất lượng tham chiếu:** Linear, Stripe Dashboard, GitHub Primer: 5–6 cỡ chữ có tên, 2–3 mức bề mặt, một nút chính mỗi vùng.

| Nhóm | Đề xuất |
|---|---|
| Cỡ chữ | 6 bậc có tên trong `@theme` (style.css), dùng thay `text-*` rời: `text-caption` 12/16, `text-body-sm` 14/20, `text-body` 16/24, `text-title` 18/26 semibold, `text-heading` 22/28 bold, `text-display` 28/34 extrabold. Tiêu đề trang (`h1`) luôn `text-heading`, tiêu đề thẻ `text-title`. Số KPI dùng `text-display tabular-nums`. |
| Bề mặt | `--surface-0` (= `--bg`), `--surface-1` (= `--panel`, thẻ), `--surface-2` (thẻ trong thẻ, khung code, đầu bảng). Tối: ba bậc cách nhau rõ (vd. #1a1714 / #24201c / #2f2925), thay vì chỉ dựa vào viền. |
| Bóng | `--shadow-1` (thẻ nổi nhẹ, chỉ theme sáng), `--shadow-2` (popover, dialog, dock). Theme tối: bóng thay bằng viền sáng 1 px `--border-strong`. |
| Bo góc | Giữ `--r-card` 20, `--r-ctl` 14, thêm `--r-chip` 999 và `--r-inset` 10 (khung code, ô trong thẻ). Thay `rounded-lg/xl/2xl/md` trong `src/ui/*` bằng 4 token này. |
| Màu ngữ nghĩa | Thêm `--good-soft`, `--bad-soft`, `--warn-soft`, `--info-soft` (+ chữ đi kèm, đã kiểm 4,5:1). `work.ts` (feedback đúng/sai), `brief.ts` (Recap), `dashboard.ts` (cảnh báo) bỏ lớp `emerald-*`/`rose-*`/`amber-*`. Dòng "không khớp" trong bảng dùng `--bad-soft`. |
| Nút | Ba cấp trong `theme.ts`: `BTN_GO` (chính, **một** mỗi vùng/thẻ), `BTN_SECONDARY` (viền), `BTN_GHOST` (chữ). `BTN_SUBMIT` = `BTN_GO` + `ml-auto`, nên Nộp theo `--accent` ở cả hai theme. Trang chủ: chỉ "Mở việc này" là `BTN_GO`; "Ôn hôm nay", "Vào làm" thành `BTN_SECONDARY`. |
| Phím tắt | Một hàm `kbd(keys)` (chip `text-caption` nền `--surface-2`), dùng cho Chạy, Nộp, Định dạng, Esc. Ẩn khi `@media (hover: none)` (điện thoại không có bàn phím vật lý). |
| Độ rộng trang | Hai bậc: `--w-read` 880 px (Trang chủ, Lộ trình, Luyện SQL, kỹ năng, Bản đồ) và `--w-wide` 1120 px (Tổng quan, Dữ liệu, Bảng điều hành). Cùng lề trái theo sidebar. |
| Thanh cuộn | `scrollbar-width: thin; scrollbar-color: var(--border-strong) transparent` cho mọi vùng cuộn trong (brief, panel, bảng, dialog). |

- **File:** `src/style.css` (`:root`, `[data-theme=dark]`, `@theme inline`), `src/theme.ts` (hằng nút, `BTN_SUBMIT`), các `src/ui/*.ts` theo từng trang (thay lớp), `tests/theme.test.ts`.
- **Test mới (`tests/theme.test.ts`):** (1) không còn lớp màu thô `(bg|text|ring|border)-(emerald|rose|amber|slate|sky)-\d+` trong `src/ui/*.ts` trừ danh sách cho phép (art, `avatar.ts` tới X1); (2) mọi cặp chữ/nền mới ≥ 4,5:1 ở hai theme; (3) `BTN_SUBMIT` chứa `bg-accent`.
- **Chunk/ngân sách:** css +0,6–1 KB (16,2 → ≤ 17,5 / 20). main ≈ +0,3 KB (hằng + `kbd()`).
- **A11y/giảm chuyển động:** không thêm chuyển động. Ẩn phím tắt chỉ bằng CSS, `aria-keyshortcuts` trên nút vẫn giữ.
- **Kiểm:** ảnh trước/sau cùng tên (`shoot.mjs`) Trang chủ, Tổng quan, workspace, Bảng điều hành ở 375/1280 × sáng/tối. Cổng mắt: Trang chủ có đúng một nút chính trên màn đầu; Nộp cùng màu nút chính ở hai theme; không trang nào đổi bố cục ngoài ý muốn (so cạnh nhau).

### W1. Workspace: bảng kết quả, thanh tab, rỗng/lỗi, hàng nút

**Ở đâu:** `…/play` (story, lane, drill, Sandbox). **Vì sao:** mục 1, 2, 4, 5. Đây là màn người học nhìn nhiều nhất.

**Mức chất lượng tham chiếu:** bảng kết quả của Supabase SQL editor, DBeaver, Mode Analytics; thanh tab của VS Code panel.

| Phần | Đề xuất |
|---|---|
| Bảng kết quả (`ui/resultTable.ts`) | `table` rộng theo nội dung (`w-auto min-w-[50%]`), không kéo dãn hết panel; cột số vẫn căn phải nhưng nằm sát cột trước. Đầu cột hai dòng: tên cột (`font-semibold`) + kiểu (`text-caption text-muted`, `int`, `numeric`, `date`, `text`). Hàng sọc rất nhạt (`--surface-2` ở hàng chẵn). Cột số thứ tự dòng mờ bên trái. `NULL` thành chip nhỏ nghiêng. Dòng không khớp: nền `--bad-soft` + viền trái `--bad` 3 px + chip "không khớp" ở **cột số thứ tự**, không chen vào ô dữ liệu đầu. |
| Một giá trị | Kết quả 1 dòng × 1 cột: hiện thêm một "thẻ số" lớn (`text-display`) trên bảng. Bảng vẫn có (đáp án so theo bảng). |
| Một vùng cuộn | Panel không cuộn; chỉ bảng cuộn (đầu cột dính). Bỏ `max-h-[420px]` cứng, bảng cao bằng panel. |
| Dòng trạng thái | Gộp "chạy 1 ms" và caption thành một thanh nhỏ trên bảng: "7 dòng · 2 cột · 4 ms", bên phải là nút ghim (đã có, `ui/pin.ts`). |
| Thanh tab (`ui/tabs.ts`) | Giữa hai nhóm là vạch dọc 1 px cao 16 px thay `ml-4`. Tab không bao giờ xuống dòng (`whitespace-nowrap`); thiếu chỗ thì thanh cuộn ngang, có bóng mờ ở mép báo còn tab. Ghi chú "Thêm 3 tab mở dần…" thành icon khóa + số ("+3") có `title`/`aria-label` khi hẹp hơn `md`. |
| Rỗng (mọi tab) | Một khối giữa panel: icon Phosphor 32 px `text-muted`, một câu, một hành động nếu có (vd. Biểu đồ: "Biểu đồ cần một cột chữ hoặc ngày và một cột số" + nút "Chèn ví dụ GROUP BY" chỉ ở Sandbox). Không linh vật (luật một linh vật mỗi vùng; Boon đã ở dòng phản hồi). |
| Lỗi (tab Kết quả) | Thẻ `--bad-soft`: dòng 1 mã SQLSTATE (chip) + thông báo gốc Postgres (monospace, giữ nguyên); dòng 2 trích **dòng SQL có lỗi** với dấu `^` ở `position` (đã có trong `SqlError.position`); HINT nếu có. Lời giải thích vẫn ở dòng của Boon dưới nút (L87, `errorView(e, false)` giữ). |
| Hàng nút (`ui/work.ts`) | Trái: Chạy (`BTN_SECONDARY` + `kbd`), Định dạng và EXPLAIN gom vào một nút "⋯ Công cụ" khi hẹp hơn 640 px của pane. Phải: Nộp (`BTN_GO` + `kbd`). Phím tắt dùng `kbd()` (T1), ẩn trên màn cảm ứng. |
| Q6 (Product) | Trong việc của domain, thẻ bài học nhanh có một nhãn trên đầu: chip `--info-soft` "Dữ liệu luyện: chuỗi cửa hàng" + icon `storefront`, `title` nói "không phải bảng của công ty". Cùng chip ở đầu khung "Thử ngay" và ví dụ của bài học. |

- **`renderResult` dùng chung**, nên đổi bảng cũng đổi ở: thẻ dashboard dạng bảng (`dashboard.ts`), 5 dòng mẫu trang Dữ liệu (`dataView.ts`), ví dụ và "Thử ngay" của bài học (`lessonCard.ts`, `limit` 8), dòng mẫu ở tab Thứ tự thực thi (`stepsView.ts`), "Bảng dùng"/"Kết quả mong đợi" (`tryPreview.ts`, đầu cột "Cột 1…" theo vị trí, không được lộ tên cột Solution). Cột số thứ tự và kiểu trong `th` phải đúng ở mọi chỗ; "Kết quả mong đợi" không hiện kiểu nếu kiểu gợi đáp án (giữ L25: chỉ hiện như hôm nay).
- **File:** `src/ui/resultTable.ts`, `src/ui/tabs.ts`, `src/ui/work.ts`, `src/ui/feedback.ts` (`errorView`), `src/ui/chartView.ts` (rỗng), `src/ui/lessonCard.ts` (Q6), `src/i18n/vi.ts`/`en.ts`, `src/style.css`.
- **Không đổi:** grader so theo vị trí cột; tab mô tả `app.lastRun`; editor không bao giờ tạo lại khi `rerender()`.
- **Chunk/ngân sách:** main +1–1,5 KB. Không chunk mới.
- **A11y:** bảng giữ `caption`, `th scope=col`; kiểu cột trong `th` là chữ thật (đọc được); chip "không khớp" có chữ, không chỉ màu; thanh tab cuộn ngang vẫn đi bằng phím mũi tên (roving tabindex hiện có); dấu `^` có `aria-hidden` và câu "lỗi ở ký tự N" cho trình đọc màn hình.
- **Kiểm:** ảnh trước/sau: sau Chạy `count(*)`, sau nộp sai (`shots2` play-wrong), lỗi `cnt`, tab Biểu đồ rỗng, 1280 và 375 × sáng/tối. Test Node: `renderResult` có cột số thứ tự, `th` có kiểu; `errorView` với `position` cho ra dòng có `^` đúng cột. Cổng mắt: không còn hai thanh cuộn chồng; hai cột số đứng cạnh nhau.

### W2. Dock hoàn thành không che kết quả (≥ 1024 px)

**Ở đâu:** `ui/stage.ts`, dock `#stage`. **Vì sao:** mục 6; L112 đã ghi, chưa sửa. Lúc vừa nộp đúng là lúc người học muốn nhìn bảng kết quả.

- **Không dời sang pane đề bài:** lúc nộp đúng, cuối pane đề bài là Recap, câu hỏi `reflect` (có nút chọn), dấu tour "recap" ở việc 1 (`coach.ts`) và, ở đánh giá thăng tiến, phần tổng kết chương với nút "Bắt đầu chương N" (`chapterView.ts`, lối đi duy nhất). Che chỗ đó tệ hơn che bảng.
- Ở layout `shell` (≥ 1024×700): dock **giữ góc phải dưới, rộng 480 px** (từ 640), cảnh SVG giữ tỉ lệ.
- Khi chuyển động xong (≤ 3 s), dock việc thường **tự thu thành một dòng** cao ~56 px: icon cảnh nhỏ + câu + nút "Xem lại" (phát lại cảnh) + "Đóng". Dòng này chỉ che mép dưới của panel. Thăng tiến giữ cả cảnh tới khi đóng (đó là lễ mừng, L32), như hôm nay.
- Dưới 1024: giữ như hôm nay (thanh dưới, trên bottom nav), cũng thu gọn sau khi xong.
- Câu `aria-live` không đổi.
- **File:** `src/ui/stage.ts`, `src/style.css`. main +0,2 KB.
- **Giảm chuyển động:** thu gọn không có chuyển tiếp.
- **Kiểm:** ảnh dock 1,1 s và cuối ở 1280/1024/375 × sáng/tối, cho cả ba domain và thăng tiến. Cổng: ở 1280, sau khi thu gọn, phần dock giao với bảng kết quả ≤ 56 px chiều cao (đo `getBoundingClientRect()` bằng CDP, ghi số vào review-log); Recap, `reflect` và nút "Bắt đầu chương N" không bao giờ bị che.

### C1. Biểu đồ: một phong cách cho tab Biểu đồ và thẻ dashboard

**Ở đâu:** `src/ui/chartView.ts` (`bars()`, `line()`: tab Biểu đồ và thẻ của người chơi), `src/ui/dashboard.ts` (`kindColor` cho thẻ; `kpiView` vẽ thanh HTML riêng cho ô công ty, đổi sang cùng token màu và cùng kiểu thanh). **Vì sao:** mục 3. Dashboard là "sản phẩm" của người học; biểu đồ trần làm nó trông như bài tập.

**Mức chất lượng tham chiếu:** Observable Plot mặc định, Metabase, Datawrapper (trục nhẹ, lưới mảnh, nhãn trực tiếp).

Quy cách (skill `dataviz` của agent build phải đọc trước khi vẽ):
- **Một màu chuỗi:** `--chart-1` = `--accent` (teal) ở cả tab và thẻ, hai theme. Màu chương không còn dùng cho dữ liệu (màu chương vẫn ở viền ER, chấm, chip). Lý do: màu dữ liệu không nên đổi nghĩa theo chương đang mở, và tím chương 2 nặng hơn mọi thứ khác trên màn.
- **Cột ngang:** trục 0 rõ (1 px `--border-strong`), 3–5 vạch lưới dọc mảnh (`--border` 1 px, nét đứt 2 3) ở các mốc "đẹp" (1–2–5 × 10ⁿ), nhãn mốc dưới; nhãn giá trị ở cuối cột như hôm nay; cột bo 3 px phía đầu.
- **Đường:** 4 vạch lưới ngang + nhãn trục y ở các mốc đẹp; trục x 4–6 nhãn ngày đã thưa; vùng dưới đường tô `--chart-1` opacity .12; điểm chỉ hiện khi ≤ 24 điểm; điểm cuối có nhãn giá trị.
- **Kích thước:** biểu đồ lấp bề ngang panel (viewBox theo bề rộng đo được, như `SIZES` hôm nay nhưng tính lại khi panel đổi cỡ qua `ResizeObserver`), chiều cao tối thiểu 220 px trong tab.
- **Tiêu đề nhỏ** trên biểu đồ trong tab: "{cột số} theo {cột nhãn}" (tên cột giữ nguyên, không dịch).
- **Tương tác:** mỗi cột/điểm có `<title>` (giá trị đầy đủ); điểm là phần tử focus được bằng Tab ở tab Biểu đồ (không ở thẻ nhỏ); không tooltip tự viết.
- **Số:** trục và nhãn dùng `kpiNumber`/`toLocaleString` theo ngôn ngữ (như hôm nay); bảng kết quả vẫn hiện giá trị thô (luật "không định dạng dữ liệu").
- **File:** `src/ui/chartView.ts`, `src/ui/dashboard.ts`, `src/style.css` (`--chart-1`, `--chart-grid`), `tests/` (test hàm thuần "mốc đẹp" `niceTicks(min, max, n)`).
- **Chunk:** main +1 KB. Không thêm thư viện biểu đồ (d3-scale ~10 KB không đáng cho 2 loại biểu đồ).
- **A11y:** `role=img` + `aria-label` giữ; thêm bảng ẩn `sr-only`? **Không**: bảng kết quả ngay tab bên cạnh đã là bản dữ liệu.
- **Kiểm:** ảnh cột (GROUP BY `mode`), đường (`date_trunc('month')`), thẻ dashboard cột/đường ở 1280/375 × sáng/tối. Test `niceTicks` (0..17034 → 0, 5000, 10000, 15000, 20000). Cổng mắt: đọc được giá trị gần đúng của một cột chỉ từ lưới.

### M1. Workspace trên điện thoại

**Ở đâu:** `…/play` dưới `md`. **Vì sao:** mục 2, 5.

- Pane Kết quả: thanh tab cuộn ngang (W1), nhãn không xuống dòng.
- Pane SQL: hàng nút **dính đáy** ngay trên bottom nav (`sticky bottom-0`, nền `--surface-1`, bóng trên): Chạy · Nộp · "⋯" (Định dạng, EXPLAIN). Editor cao tối thiểu 160 px, tự cao theo nội dung tới 50 vh.
- Sau Chạy hoặc Nộp ở 375: hiện một **chip kết quả nhỏ** trên hàng nút ("7 dòng · Xem kết quả →", hoặc "Lỗi · Xem"), bấm thì sang pane Kết quả. Không tự chuyển pane (người học có thể đang sửa).
- Không hiện phím tắt (T1).
- **File:** `src/ui/paneTabs.ts`, `src/ui/work.ts`, `src/style.css`. main +0,4 KB.
- **A11y:** chip là `button` có nhãn đầy đủ; `announce()` giữ câu tóm tắt như hôm nay. Mục tiêu chạm ≥ 44 px.
- **Kiểm:** ảnh 375 và 320 × sáng/tối: pane SQL trước/sau Chạy, pane Kết quả có ≥ 4 tab. Cổng: không tab nào bị cắt nhãn; hàng nút luôn thấy khi bàn phím ảo đóng.

---

## P2

### I1. Một quy cách cảnh cho ba domain (và nhận diện domain)

**Ở đâu:** Tổng quan E-com và Finance (`src/art/ecommerce.ts`, `src/art/finance.ts`), Trang chủ (dòng domain), màn chào (thẻ chọn domain), pill domain ở top bar. **Vì sao:** mục 9. User sẽ so ba domain cạnh nhau; hôm nay Logistics là tranh, hai domain kia là bản nháp.

**Quy cách cảnh chung** (ghi vào `docs/team/completion-animations.md` như một mục mới; agent vẽ theo):

| Luật | Nội dung |
|---|---|
| Khung | Hero tràn khung như Logistics: không thanh tiêu đề trên, không chú thích dưới; tên nơi là pill trên hình (góc trên trái), câu "mỗi việc xong là…" là pill trạng thái góc dưới trái (như "Đã xong 7 việc…" của Tiên Sa). viewBox 1090×400; ở < 640 px cắt theo **điểm nhìn** (`preserveAspectRatio="xMidYMid slice"` + vùng an toàn giữa 560 px) để cảnh cao ≥ 180 px thay vì thu nhỏ còn 90. |
| Chiều sâu | Ba lớp: xa (nhạt nhất, độ tương phản thấp), giữa, gần; sương chân trời giữa lớp xa và giữa. |
| Ánh sáng | Nắng từ trên trái; mỗi khối có mặt sáng/mặt tối (alpha đen/trắng trên màu nền, như container v6). Bóng đổ elip mờ dưới vật đứng. |
| Bảng màu | Mỗi domain một bộ token `--xx-*` riêng (đã có `--hs-*`, `--es-*`; Finance hôm nay mượn `--es-*`, tách thành `--fs-*` đầy đủ). Một màu nhận diện mỗi domain: Logistics teal biển, E-com đỏ đèn lồng, Finance vàng đồng. |
| Ngày/đêm | Theme tối = hoàng hôn/đêm của chính cảnh, như Tiên Sa (đèn sáng, cửa sổ sáng). |
| Nhân vật | Không người vẽ trong cảnh (tránh lệch phong cách với chân dung); Lily chỉ xuất hiện ở dock như hôm nay. |

**Nội dung cảnh (đề xuất, có cổng mắt):**
- **E-com · Chợ Lồng Đèn:** phố Hội An–Đà Nẵng về đêm hoặc chiều muộn: dãy nhà ống mái ngói có chiều sâu (ba lớp, không còn dải nhà xám phẳng), dây lồng đèn giăng ngang phố, kho ở cuối phố có cửa cuốn mở nhìn thấy kệ (giữ cơ chế kiện hàng lên kệ), xe máy giao hàng. Bỏ dải "skyline" chung với Finance.
- **Finance · Hũ Bạc:** bờ sông Hàn: lớp xa là bờ bên kia + cầu (hình khối chung chung, không vẽ cầu thật có thương hiệu), lớp giữa là dãy phố chi nhánh, lớp gần là quầy Hũ Bạc. Hũ là **vật chính**: to hơn (≈ 1/3 chiều cao cảnh), kính có viền đậm + phản chiếu + nền tối phía sau để không chìm vào trời sáng; mực đồng xu trong hũ thấy rõ từ xa. Đường trống hôm nay thay bằng vỉa hè có cây và ghế (hai lớp).
- **Nhận diện domain (mới, nhỏ):** mỗi domain một **huy hiệu 64×64** (SVG, cùng ngữ pháp Phosphor duotone của icon S4: nét 4 tròn, lớp tô .2, nền tròn màu nhận diện nhạt): neo + container, lồng đèn + hộp, hũ + xu. Dùng ở thẻ chọn domain (màn chào), dòng domain ở Trang chủ, đầu ngăn kéo. Pill top bar giữ icon 16 px nhưng thêm chấm màu nhận diện.
- **File:** `src/art/ecommerce.ts`, `src/art/finance.ts`, `src/style.css` (`--es-*`, `--fs-*`, màu nhận diện), `src/ui/domainArt.ts`, `src/ui/welcome.ts`, `src/ui/homeView.ts`, `src/art/illustrations.ts` (huy hiệu, chunk `illustrations` đã lười) và test `tests/ecomArt.test.ts`/test Finance art (khung cuối của dock không đổi).
- **Chunk/ngân sách:** `ecomart` 5,6 → ≤ 9 / 10; `finart` ~7 → ≤ 9,5 / 10 (**chật**, xem D-U4); `illustrations` 2,5 → ≤ 5 / 15 (3 huy hiệu). main ≈ 0.
- **Giảm chuyển động:** nền tĩnh; vòng lặp nền (đèn lồng đung đưa, sóng sông) chỉ bằng CSS như `cq-sway`, tắt theo luật chung; dừng khi khuất (đã có cơ chế `ambient()`).
- **A11y:** cảnh `aria-hidden`, câu trạng thái là HTML thật (như Tiên Sa); huy hiệu trang trí `aria-hidden`, tên domain là chữ bên cạnh.
- **Kiểm:** bảng ảnh "ba domain cạnh nhau" (Tổng quan 1280 và 375 × sáng/tối) trước/sau, cộng dock việc thường + thăng tiến ở 25 %/55 %/cuối. **Cổng mắt user** (đây là việc thẩm mỹ): không đạt sau 3 vòng thì giữ cảnh v6 và chỉ áp phần "khung" (bỏ thanh tiêu đề, cắt theo điểm nhìn ở 375, hũ tương phản).

### D1. Bảng điều hành: tường khóa và chân thẻ

- Ô công ty đang khóa **không vẽ từng ô**: gom thành một hàng cuối "Còn 12 ô sẽ mở" với các huy hiệu icon mờ thành dãy và "ô kế tiếp: chương 2 · việc '…' của Hoàng Khánh". Bấm "Xem tất cả" mở danh sách gọn (một dòng mỗi ô). Ô đã mở giữ như hôm nay. Thẻ của người chơi đứng đầu như cũ.
- Chân thẻ: một hàng cố định "nguồn · thời gian chạy" bên trái, nhóm 4 nút icon bên phải trong một khung `--surface-2` bo `--r-chip`; không rớt hàng ở ≥ 320 px (khi hẹp, Lên/Xuống vào menu "⋯").
- Thẻ số: thêm dòng phụ `text-caption` đơn vị/ngữ cảnh khi `kpis.yml` có `unit` (đã có trường).
- **File:** `src/ui/dashboard.ts`, `src/i18n/*`. main +0,5 KB. A11y: hàng gom là `details`/`button` có số ô trong nhãn. **Kiểm:** ảnh dashboard 1280×1600 và 375 cả trang: chiều cao trang giảm (số đo trước/sau ghi review-log), không nút nào rớt hàng.

### D2. Sơ đồ ER theo token

- `mermaid.initialize({ theme: 'base', themeVariables })` với biến lấy từ CSS token lúc vẽ (`getComputedStyle`): nền thẻ `--surface-1`, đầu bảng `--surface-2`, viền `--border-strong`, chữ `--text`, đường quan hệ `--muted`; bảng "đang dùng" vẫn viền đậm màu chương (L36). Vẽ lại khi `cq-theme` đổi (đã có).
- Chữ Nunito cho tên bảng, monospace cho cột.
- **File:** `src/ui/erdView.ts`. Không đổi chunk `mermaid`. **Kiểm:** ảnh ER trang Dữ liệu và tab ER, 1280/375 × sáng/tối.

### O1. Phút đầu (màn chào) — gồm Q8 của Product

Luồng hôm nay (`src/ui/welcome.ts`): bước 1 = chào + ngôn ngữ + danh sách domain; chọn domain thì **bước 1 vẽ lại không có danh sách** (thêm dòng "Dữ liệu sẵn sàng!") và người chơi phải bấm "Tiếp"; bước 2 = vòng chơi (danh sách `LOOP`); bước 3 = "Bạn mới học hay đã biết SQL?" (Bắt đầu / Tôi biết SQL). Đề xuất giữ đủ ba quyết định (ngôn ngữ, domain, mới/đã biết), bỏ lần vẽ lại thừa:
- Hộp thoại có **chân dính** (`sticky bottom-0`: Quay lại · "Bước n/3" · nút chính), thân cuộn. Ở 1280×800 và 375×667 nút chính luôn thấy (Q8).
- Bước 1: cảnh dạy + một câu chào + chọn ngôn ngữ (chip). "Tiếp".
- Bước 2: **chọn domain**, thẻ lớn: huy hiệu I1 + tên + một dòng + "12 chương" (bỏ đoạn mô tả 2–3 dòng). Bấm thẻ thì chọn và **tự sang bước 3** (không vẽ lại bước cũ). Tiến độ tải dữ liệu là một dòng nhỏ ở chân hộp thoại.
- Bước 3: vòng chơi rút còn 3 dòng + hai nút "Bắt đầu" / "Tôi biết SQL" như hôm nay (nút "Bắt đầu" vẫn chờ dữ liệu sẵn sàng).
- Esc giữ hành vi hôm nay (bỏ tour; ở bước chọn domain = Logistics, D10-6).
- **Phối hợp Product:** roadmap v15 F7/F8/Q8 và kịch bản chơi thử §5.1 dùng màn này; v7 không đổi `bootPick`, `actions.startWith` hay pref `cargo-query/tour`, chỉ đổi thứ tự và bố cục.
- **File:** `src/ui/welcome.ts`, `src/i18n/*`. main +0,3 KB. **A11y:** focus vào tiêu đề mỗi bước; nút chính có `aria-describedby` tới "Bước n/3". **Kiểm:** ảnh 1280×800, 1280×720, 375×667, 320×568 × sáng/tối cho mỗi bước; cổng: nút chính trong khung nhìn ở mọi cỡ (đo `getBoundingClientRect`).

### M2. Trang dài trên điện thoại

- Lộ trình 375: nhóm "DA nâng cao" mỗi nút một dòng (tên + chip trạng thái), mô tả "Nên học trước…" chỉ hiện khi mở nút (`details`). Mục tiêu: trang ≤ 2500 px.
- Hàng chương ở Tổng quan 375: chip trạng thái xuống dưới tiêu đề (không ép cột), tiêu đề một dòng `truncate` + `title`.
- **File:** `src/ui/learnView.ts` (chunk `learnui` 12,6 / 25), `src/ui/homeView.ts`. **Kiểm:** chiều cao trang trước/sau ở 375 (ghi số), ảnh.

### K1. Theme tối

- Ba bậc bề mặt (T1); thẻ có viền `--border` + nền `--surface-1` sáng hơn nền rõ.
- Chip phòng ban (`DEPT`, `theme.ts`): ở tối dùng nền -900/40 % + chữ -200, kiểm 4,5:1 bằng `tests/theme.test.ts`.
- Đầu bảng kết quả `--surface-2`, không đen.
- Nút chính một màu (T1).
- **Kiểm:** ảnh tối mọi trang chính (bộ `shoot.mjs`), so cạnh bản sáng.

---

## P3

| # | Mục | Cách | Ở đâu / ngân sách / kiểm |
|---|---|---|---|
| X1 | Chân dung đồng nghiệp vẽ lại | Không bộ ngoài (v6 đã thử Open Peeps, L122). Vẽ lại `avatar.ts` theo **ngữ pháp của linh vật**: đầu hơi to, viền ngoài 2 px `--*-line` mới, gradient trên trái, mắt elip có điểm sáng, má hồng .4, 6 kiểu tóc thay 4, áo theo màu phòng ban, phụ kiện `look` to hơn để đọc ở 28 px. Màu da/tóc thành token (đổi theo theme). Nguyên mẫu 6 người ở 28/40/48/96 px trước, cổng mắt. | `src/ui/avatar.ts`, `src/style.css`; main +1–1,5 KB; không đạt thì chỉ thêm gradient + viền (D-U7) |
| X2 | Âm thanh tùy chọn | Công tắc trong menu `⋯`, **mặc định tắt**, pref `cargo-query/prefs.sound`. Ba âm tổng hợp bằng WebAudio (không file, không giấy phép): nộp đúng (hai nốt đi lên, 180 ms), sai (một nốt trầm mềm, 140 ms), thăng tiến (ba nốt, 500 ms). Âm lượng thấp (gain .08). Không âm khi Chạy, không âm nền. `AudioContext` tạo ở cú bấm đầu (luật tự phát của trình duyệt). | `src/ui/sound.ts` (main, ~0,6 KB), `stage.ts`/`work.ts` gọi; test: tắt thì không tạo `AudioContext` (D-U6) |
| X3 | Boon cỡ nhỏ | Biến thể "đầu" của Boon cho ≤ 32 px (logo, dòng lỗi): chỉ đầu + kính + mỏ, viền ngoài 2,4, nền tròn `--surface-2` để thân trắng không chìm vào kem. Lily cỡ nhỏ giữ. | `index.html` sprite (+0,3 KB, `html` 9,1 / 12) |
| X4 | Vi chuyển động | Gạch chân tab trượt sang tab mới (CSS `transition` trên một phần tử gạch, 160 ms); dòng mới của bảng kết quả hiện bằng `opacity` 120 ms (không stagger theo dòng); nút "Chép" có dấu tích 1 s; vòng focus thống nhất 2 px `--accent` offset 2 (một luật `:focus-visible` chung). Không transform trên nút/card (L88). | `src/style.css`, `tabs.ts`; main ≈ 0 |

---

## 3. Không làm (YAGNI)

- Đổi font chữ UI hoặc thêm font mono riêng (Nunito + monospace hệ thống đủ; một woff2 mono ≈ 20–30 KB cho lợi ích nhỏ).
- Thư viện biểu đồ (d3, Chart.js, Recharts): hai loại biểu đồ tự vẽ đủ, C1 chỉ cần mốc đẹp.
- Rive, Lottie, PixiJS, Three.js (giữ v6 §8).
- Chế độ tương phản cao riêng, công tắc giảm chuyển động trong app (giữ v5 D-M9).
- Đổi bố cục ba pane của workspace desktop (đã ổn; chỉ đánh bóng).
- Vẽ người trong cảnh domain.
- Bảng màu tùy biến cho người chơi.

---

## 4. Bảng ngân sách (gzip -9, KB; ước lượng, đo thật ở cổng mỗi task)

Số "hôm nay" lấy từ review-log (v6 final, v14 T7).

| Nhóm | Hôm nay | Ước sau v7 | Trần |
|---|---|---|---|
| main | ~302 | +5–7 (T1 0,3, W1 1,5, W2 0,2, C1 1, M1 0,4, D1 0,5, O1 0,3, X1 1,5, X2 0,6) | 500 (cổng mềm v7: ≤ +8) |
| css | 16,2 | +1–1,5 | 20 |
| `html` | 9,1 | +0,3 (X3) | 12 |
| `ecomart` | 5,6 | +2–3 | 10 |
| `finart` | ~7 | +2–2,5 | 10 (**chật**, D-U4) |
| `illustrations` | 2,5 | +2 (3 huy hiệu) | 15 |
| `learnui` | 12,6 | +0,3 | 25 |
| `art` (Logistics) | 17,2 | 0 (v7 không đụng Tiên Sa) | 20 |
| `gsap` | 44,3 | 0 | 50 |

---

## 5. i18n

Mọi chữ mới qua `t()` (`vi.ts` là nguồn, `en.ts` là `Record<Key, Msg>`); chữ của `learnui` qua `src/i18n/learn.ts`. Khóa mới dự kiến: `res.meta` ("{rows} dòng · {cols} cột · {ms} ms"), `res.single`, `err.at` ("lỗi ở ký tự {n}"), `chart.title`, `chart.emptyHint`, `tabs.more`, `work.tools`, `work.resultChip`, `lesson.labData`, `dash.lockedRow`, `dash.seeAll`, `welcome.pickTitle`, `sound.toggle`. Tên bảng, cột, SQL, mã SQLSTATE và thông báo gốc Postgres không dịch (luật cũ).

---

## 6. Build tasks

**Thứ tự:** T1 trước (mọi task sau dùng token và hằng nút). T2–T5 song song được sau T1 (khác file, trừ `work.ts` của T2 và T5: làm T2 trước). I1 (T7/T8) độc lập với workspace.

**Cổng chung mỗi task:** `npx tsc --noEmit` · `npm test` · `npm run build` · `node scripts/check-budget.mjs` · kiểm trình duyệt bằng `npx vite preview --port <≥ 5199 còn trống> --strictPort` (**không bao giờ 5173/5174**), Edge headless hồ sơ mới, **375 và 1280, sáng + tối, một lần `--force-prefers-reduced-motion`**, 0 lỗi console, không cuộn ngang. Ảnh "sau" cùng tên ảnh "trước" (script `shoot.mjs`/`extra.mjs`/`states.mjs` ở scratchpad `uiux-v7\`, sửa cổng) vào `…\scratchpad\uiux-v7\after\T<n>\`; ghi kết quả vào `docs/team/review-log.md` mục "v7" và một dòng L trong `decision-log.md`. Tắt preview và Edge sau khi kiểm.

| Task | Việc | File chính | Phụ thuộc | Cổng riêng |
|---|---|---|---|---|
| T1 | Token chữ/bề mặt/bóng/bo góc/màu ngữ nghĩa, hằng nút 3 cấp, `kbd()`, độ rộng trang, thanh cuộn; thay lớp ở các trang đọc; test cấm màu thô | `style.css`, `theme.ts`, `ui/homeView.ts`, `ui/dataView.ts`, `ui/dashboard.ts`, `tests/theme.test.ts` | — | Trang chủ 1 nút chính trên màn đầu; Nộp `bg-accent`; tương phản mọi cặp mới ≥ 4,5:1; css ≤ 17,5 |
| T2 | W1 bảng kết quả + một vùng cuộn + dòng trạng thái + lỗi có `^` + rỗng mọi tab + hàng nút + Q6 | `ui/resultTable.ts`, `ui/tabs.ts`, `ui/work.ts`, `ui/feedback.ts`, `ui/chartView.ts`, `ui/lessonCard.ts` | T1 | Test `renderResult`/`errorView`; ảnh 5 trạng thái §W1; không hai thanh cuộn chồng |
| T3 | W2 dock 480 px ở `shell` + tự thu thành một dòng khi xong (trừ thăng tiến) | `ui/stage.ts`, `style.css` | T1 | Sau thu gọn dock che bảng ≤ 56 px ở 1280 và 1024 (số đo); Recap/`reflect`/"Bắt đầu chương N" không bị che; ba domain + thăng tiến |
| T4 | C1 biểu đồ (`niceTicks`, lưới, `--chart-1`, `ResizeObserver`), dùng chung cho thẻ dashboard | `ui/chartView.ts`, `ui/dashboard.ts`, `style.css`, test mới | T1 | Test `niceTicks`; ảnh cột/đường tab + thẻ; cùng màu ở tab và thẻ |
| T5 | M1 workspace điện thoại: tab cuộn ngang, hàng nút dính, chip kết quả | `ui/paneTabs.ts`, `ui/work.ts`, `style.css` | T2 | 375 và 320: không nhãn tab bị cắt; mục tiêu chạm ≥ 44 px |
| T6 | O1 màn chào chân dính + bước domain riêng (Q8) | `ui/welcome.ts`, i18n | T1 (T8 cho huy hiệu; trước T8 dùng icon hiện có) | Nút chính trong khung nhìn ở 1280×720, 375×667, 320×568 |
| T7 | I1a: quy cách cảnh chung (khung tràn, cắt theo điểm nhìn ở 375) cho E-com/Finance **không vẽ lại**: bỏ thanh tiêu đề/chú thích, pill trên hình, hũ tương phản | `art/ecommerce.ts`, `art/finance.ts`, `ui/domainArt.ts`, `completion-animations.md` | T1 | Cảnh ≥ 180 px cao ở 375; khung cuối dock không đổi (test) |
| T8 | I1b: vẽ lại cảnh E-com và Finance theo quy cách + 3 huy hiệu domain | `art/ecommerce.ts`, `art/finance.ts`, `art/illustrations.ts`, `ui/homeView.ts`, `ui/welcome.ts` | T7 | **Cổng mắt user** (bảng ảnh ba domain, ≤ 3 vòng; không đạt thì dừng ở T7); `ecomart`/`finart` ≤ 10 |
| T9 | D1 dashboard gom ô khóa + chân thẻ; D2 ER theo token | `ui/dashboard.ts`, `ui/erdView.ts` | T1, T4 | Chiều cao dashboard 375 giảm ≥ 50 % (số đo); ER hai theme |
| T10 | M2 trang dài điện thoại + K1 theme tối | `ui/learnView.ts`, `ui/homeView.ts`, `theme.ts` (`DEPT`), `style.css` | T1 | Lộ trình 375 ≤ 2500 px; ảnh tối mọi trang |
| T11 | P3: X1 nguyên mẫu chân dung (cổng mắt trước khi thay), X2 âm thanh, X3 Boon nhỏ, X4 vi chuyển động | `ui/avatar.ts`, `ui/sound.ts`, `index.html`, `style.css`, `tabs.ts` | T1 | X1: bảng ảnh 6 người × 4 cỡ × 2 theme; X2: tắt thì không có `AudioContext` |
| T12 | Giấy tờ + đo lại §4 | `CLAUDE.md` (token, nút, biểu đồ, dock, âm thanh, quy cách cảnh), `decision-log.md`, `review-log.md` | T1–T11 | Bảng §4 có số đo thật |

---

## 7. Rủi ro

| Rủi ro | Giảm |
|---|---|
| T1 đổi lớp ở nhiều file, dễ vỡ bố cục chỗ không chụp | Làm theo từng trang, mỗi trang một commit, ảnh trước/sau cả bộ `shoot.mjs`; test cấm màu thô bắt chỗ sót. |
| Vẽ lại cảnh E-com/Finance "không đẹp hơn" (việc thẩm mỹ, agent vẽ) | Tách T7 (khung, chắc chắn có lợi) khỏi T8 (vẽ lại, có cổng mắt user và phương án dừng). |
| `finart` chật trần 10 KB | D-U4: nâng trần lên 12 hoặc tách huy hiệu sang `illustrations`; đo sau T7. |
| Dock thu gọn quá sớm, người chơi không kịp xem cảnh | Chỉ thu sau khi chuyển động xong (≤ 3 s); nút "Xem lại" phát lại; thăng tiến không thu. |
| Biểu đồ đổi màu (tím chương → teal) làm người chơi cũ lạ mắt | Màu chương vẫn ở chip/viền ER; ghi trong ghi chú phát hành. |
| Mermaid `themeVariables` không phủ hết phần tử ER | Phần còn lại sửa bằng CSS trong vùng ER (đã có chỗ `innerHTML` duy nhất); không đổi `mermaidName()`. |
| Âm thanh làm phiền hoặc tự phát | Mặc định tắt; chỉ ba sự kiện; không âm ở Luyện tập/Ôn (cùng luật hoạt cảnh). |
| Chồng việc với Product v15 (Q1 đổi tuyến drill, sidebar/topbar) | v7 không đổi tuyến hay cấu trúc nav; T5/T6 chỉ đổi bố cục bên trong. Làm Q1 trước T5 nếu cả hai cùng sprint. |

---

## 8. Test cần thêm

- `tests/theme.test.ts`: cấm lớp màu thô trong `src/ui/*.ts` (trừ danh sách cho phép); cặp chữ/nền mới; `BTN_SUBMIT` dùng `bg-accent`.
- Test thuần `niceTicks(min, max, n)` (âm, 0, khoảng rất nhỏ, NaN).
- `renderResult`: cột số thứ tự, kiểu trong `th`, chip "không khớp" ở cột số thứ tự, thẻ số khi 1×1.
- `errorView` với `position`: dòng SQL đúng, `^` đúng cột (tính cả tab và ký tự Việt).
- `stage.ts`: dock việc thường chuyển sang dạng một dòng khi timeline xong, thăng tiến thì không; "Xem lại" phát lại; giảm chuyển động vào thẳng dạng một dòng, không transition.
- Art: khung cuối dock E-com/Finance giữ nguyên số kiện/xu (test hiện có, cập nhật id phần).
- `sound.ts`: tắt thì không gọi `AudioContext`.

---

## 9. Quyết định cần duyệt (mặc định in đậm)

| # | Câu hỏi | Mặc định | Phương án khác |
|---|---|---|---|
| D-U1 | Thang chữ | **6 bậc có tên (caption 12 → display 28) trong `@theme`, thay `text-*` rời** | Giữ `text-*` của Tailwind, chỉ ghi luật dùng |
| D-U2 | Màu dữ liệu biểu đồ | **Một màu `--accent` cho tab và thẻ dashboard; màu chương không dùng cho dữ liệu** | Màu chương ở cả hai nơi (sửa thẻ dashboard theo tab) |
| D-U3 | Dock khi ≥ 1024 px | **Giữ góc phải dưới, 480 px, tự thu thành một dòng khi xong chuyển động (thăng tiến giữ cả cảnh)** | Neo trên pane đề bài (không che bảng, nhưng che Recap, `reflect` và nút "Bắt đầu chương N") |
| D-U4 | Cảnh E-com/Finance | **T7 (khung chung) chắc chắn làm; T8 (vẽ lại) có cổng mắt user, trần `finart` nâng 10 → 12 nếu đo vượt** | Chỉ T7; hoặc giữ trần 10 và tách hũ/huy hiệu sang `illustrations` |
| D-U5 | Sơ đồ ER | **Giữ Mermaid, màu từ token (`theme: 'base'` + `themeVariables`)** | Tự vẽ ER bằng SVG (bỏ chunk mermaid 1,5 MB nhưng là việc L) |
| D-U6 | Âm thanh | **Có, P3: tùy chọn, mặc định tắt, 3 âm WebAudio tổng hợp, không file** | Không âm thanh (giữ v5 §7) |
| D-U7 | Chân dung đồng nghiệp | **Agent vẽ lại theo ngữ pháp linh vật, nguyên mẫu 6 người, cổng mắt; không đạt thì chỉ thêm gradient + viền** | Chữ cái đầu (monogram) trên nền màu phòng ban; hoặc giữ nguyên |
| D-U8 | Cấm màu thô trong `src/ui` | **Có, test với danh sách cho phép** | Chỉ ghi trong CLAUDE.md, kiểm khi review |
| D-U9 | Ô công ty đang khóa | **Gom thành một hàng "Còn N ô sẽ mở" + danh sách khi bấm** | Giữ từng ô nhưng thu nhỏ còn một dòng |
| D-U10 | Bảng kết quả 1×1 | **Thêm thẻ số lớn trên bảng (bảng vẫn có)** | Chỉ bảng như hôm nay |
| D-U11 | Màn chào | **Chân dính; ba bước = ngôn ngữ → domain (thẻ lớn có huy hiệu, chọn là sang bước sau) → vòng chơi + mới học / đã biết SQL** | Chỉ làm chân dính (Q8 tối thiểu) |
| D-U12 | Cổng mềm main cho v7 | **≤ +8 KB** (302 → ≤ 310 / 500) | ≤ +5 KB, bỏ X1/X2 khỏi main (chunk lười) |
