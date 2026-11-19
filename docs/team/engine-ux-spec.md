# Database Engine: đặc tả UI/UX và mockup

Người viết: UI/UX · 2026-11-20 · Chỉ là thiết kế, không có code (L218).

**Căn cứ:**

- `product-design-db-engine.md` v2: §3 năm loại bài, §3.6 nhãn trung thực, §5 sơ đồ, §7 kiến trúc thông tin.
- `ui-ux-v7.md`: T1 token, W1/M1 workspace, C1.
- `ux-deploy-checklist.md` (mục A–L) và `v21-ux-review.md` (U1–U39, những lỗi user không thích).
- `db-engine-knowledge.md` §1.3 (số đo thật của `pageinspect`).
- Decision log L215–L219 (D-E1: mục "Học" trên điện thoại).
- Hợp đồng ENG-CORE ở commit `a33ae40` (nhánh worktree): `src/engine/content.ts`, `labs.ts`, `vizRegistry.ts`.
- Wireframe bản 1 (`6253716`, §2.2, §2.5, §5.3). Các mockup ở đây vẽ tiếp những wireframe đó, không thay chúng.

**Mockup:** `docs/team/engine-ux/NN-<tên>-light.svg` và `-dark.svg`, 19 cặp. Mỗi file vẽ khung thiết bị theo đúng cỡ của checklist: 1280×800, 1024×700, 375×740. Khung nào dài hơn màn hình có thêm đường "nếp gấp".

Màu trong file là hex thật của token (`:root` cho bản sáng, `:root[data-theme=dark]` cho bản tối). Nét **tím đứt** và số khoanh tím là chú thích của spec, không phải UI.

Mockup được dựng từ một bộ hàm vẽ chung, rồi kiểm từng file: XML phải đúng cú pháp, chữ phải nằm vừa khung (ước lượng). Một số ảnh đã được mở bằng Edge headless để xem tận mắt. Số trong mockup là số minh họa, trừ những chỗ ghi "đo".

| File | Nội dung |
|---|---|
| `01-overview-1280` | `#/engine` đủ ba engine: thẻ Tiếp tục, thang L1–L5 của mỗi engine, dòng Best Practice |
| `02-overview-1024-375` | 1024 ở **trạng thái v22** (một engine, một cấp); 375 có công tắc Học và thanh dưới |
| `03-engine-1280` | `#/engine/postgres`: thang 5 cấp dọc |
| `04-level-1280` | `#/engine/postgres/l2`: mô-đun, câu "làm được", hàng bài, capstone (cuộn) |
| `05-engine-level-375` | Trang engine và trang cấp ở 375 |
| `06-concept-1280` | Bài khái niệm: sơ đồ HOT ở bước 4/5, chú giải, ví dụ, câu kiểm, nguồn |
| `07-concept-1024-375` | 1024: hộp "Đoán trước". 375: sơ đồ không chữ, danh sách bước HTML, thanh điều khiển dính |
| `08-lab-1280` | Lab trong workspace: danh sách bước, editor ghi runtime, phản hồi, tab "Bên trong" vẽ từ kết quả thật + bảng `pageinspect` |
| `09-lab-1024-375` | 1024: tab Kết quả. 375: pane SQL với hàng nút dính; pane Kết quả với tab Bên trong |
| `10-predict-1280`, `11-predict-1024-375` | Bài đoán kế hoạch, trước và sau "Xem thật" |
| `12-quiz-1280`, `13-quiz-1024-375` | Câu hỏi một đáp án và câu xếp thứ tự (ADD-5) |
| `14-capstone-1280`, `15-capstone-1024-375` | Kiểm tra cấp: thanh bước, "Chấm bằng", kế hoạch trước/sau |
| `16-facts-beside` | Số liệu catalog đặt cạnh sơ đồ: Postgres, DynamoDB, MongoDB, kèm 7 quy tắc |
| `17-states` | 10 trạng thái rỗng / tải / lỗi |
| `18-diagram-language` | Ngôn ngữ hình: token, tuple, line pointer, lưới trang, LSN, B-tree, mũi tên, điều khiển bước, khung tĩnh |
| `19-diagram-nosql` | Cùng ngữ pháp hình cho pipeline / ESR (MongoDB) và partition / GSI (DynamoDB) |

---

## 1. Token

### 1.1 Chỉ dùng token v7

Khu Engine không thêm màu hex mới. Những token được dùng:

- Bề mặt: `--bg` (= surface-0), `--panel` (= surface-1), `--surface-2`, `--code`.
- Chữ: `--text`, `--muted`.
- Nhấn: `--accent`, `--accent-soft`, `--on-accent`.
- Ngữ nghĩa: `--good`, `--bad`, `--warn` và bản `-soft` của từng màu, `--info-soft`, `--sun`/`--sun-ink`.
- Bo góc: `--r-card` 20, `--r-ctl` 14, `--r-inset` 10, `--r-chip` 999.
- Bóng: `--shadow-1`, `--shadow-2`.
- Độ rộng: `--w-read` 880, `--w-wide` 1120.

`--eng-*` (product §5) chỉ là **bí danh**, khai báo một lần trong `:root` và tự theo theme vì trỏ vào token gốc:

| Bí danh | = | Dùng cho |
|---|---|---|
| `--eng-ink` | `--text` | chữ, giá trị trong sơ đồ |
| `--eng-sub` | `--muted` | nét cấu trúc 1,5 px, nhãn phụ, mũi tên con trỏ |
| `--eng-cell` | `--panel` | ô, nút, hộp |
| `--eng-head` | `--surface-2` | đầu trang / đầu nút (chữ mono 10 px) |
| `--eng-free` | `--surface-2` + sọc `--border` | chỗ trống trong trang |
| `--eng-active` / `-soft` | `--accent` / `--accent-soft` | phần bước này đi qua, khóa mới, hàng đang chọn |
| `--eng-live` | `--good` | tuple sống |
| `--eng-dead` / `-soft` | `--bad` / `--bad-soft` | tuple chết, mất |
| `--eng-hot` / `-soft` | `--warn` / `--warn-soft` | HOT, checkpoint, partition nóng, SORT trong bộ nhớ |
| `--eng-frozen` / `-soft` | `--syn-type` / `--info-soft` | tuple đóng băng, nhãn "Kết quả ghi từ…" |

`--syn-type` là token đã có, nhưng đặt cho tô màu cú pháp. Dùng nó làm "chữ thông tin" là mượn: xem câu hỏi mở Q-V5.

### 1.2 Tương phản (tính, công thức WCAG, hai theme)

Chữ phải ≥ 4,5:1. Nét và hình mang nghĩa phải ≥ 3:1.

| Cặp | Sáng | Tối |
|---|---|---|
| `--text` / `--panel`, `--surface-2`, `--bg` | 15,4 / 13,6 / 14,5 | 15,3 / 13,6 / 17,1 |
| `--text` trên mọi nền `-soft` (accent, good, bad, warn, info) | ≥ 13,2 | ≥ 11,3 |
| `--muted` / `--panel`, `--surface-2` | 6,2 / 5,5 | 10,0 / 8,8 |
| `--muted` trên mọi nền `-soft` | ≥ 5,3 | ≥ 7,3 |
| `--good` / `--good-soft` | 5,3 | 8,2 |
| `--bad` / `--bad-soft` | 5,8 | 7,1 |
| `--warn` / `--warn-soft` | 5,3 | 8,9 |
| `--syn-type` / `--info-soft` | 5,7 | 8,4 |
| `--accent` / `--accent-soft`, `--panel`, `--surface-2` | 4,7 / 5,5 / 4,8 | 7,5 / 10,2 / 9,0 |
| `--on-accent` / `--accent` (nút chính) | 5,5 | 9,9 |
| **Nét** `--border-strong` / `--panel` | **1,75** | 3,56 |
| **Nét** `--border` / `--panel` | **1,32** | 1,78 |

Kết luận cho mọi sơ đồ:

- Nét mang nghĩa (khung trang, nút, mũi tên) dùng `--eng-sub` (`--muted`) hoặc màu ngữ nghĩa, không bao giờ dùng `--border`/`--border-strong`.
- Hai token viền ở trên chỉ dùng cho vạch trang trí (vạch chia ô khóa, sọc chỗ trống).
- `tests/theme.test.ts` thêm mọi cặp ở bảng này.

---

## 2. Lưới, khoảng cách, chữ

| Thứ | Giá trị |
|---|---|
| Cỡ khung | 1280×800, 1024×700, 375×740 (và 320, ở chế độ reflow) |
| Top bar | 53 px, một hàng. Mục "Engine" order 25, nhãn ngắn "Engine" |
| Thanh dưới (< 1024) | ≤ 64 px + safe area, 5 mục |
| Sidebar | Trang đọc: 256 px ở ≥ 1280; rail 64 ở 1024–1279; ngăn kéo `#side-drawer` dưới 1024. **Workspace (lab, capstone): rail 64 ở mọi cỡ ≥ 1024** (route play) |
| Lề trang | 32 px sau sidebar/rail ở ≥ 1024; 16 px ở điện thoại |
| Độ rộng nội dung | Trang bài: `--w-read` 880. Tổng quan: `--w-wide`, bị chặn bởi chỗ trống (960 ở 1280 có sidebar) |
| Thang khoảng cách | 4 · 8 · 12 · 16 · 24 · 32 · 48. Giữa các khối trên trang 32; trong thẻ 16; đệm thẻ 24 (desktop) / 16 (điện thoại) |
| `h1` | `text-heading` 22/28 bold. Đi kèm một chip nhãn trung thực cùng dòng (xuống dòng riêng ở 375) |
| Breadcrumb | `text-caption` 12/16 `--muted`, trên `h1`. Ở 375 thu thành một link "‹ <mô-đun>" |
| Tiêu đề khối, thẻ | `text-title` 18/26 600. Mô-đun: `text-title`. Tên engine: `text-title` |
| Thân | `text-body` 16/24. Danh sách mục tiêu, câu bước, phụ đề: `text-body-sm` 14/20 |
| Meta, nhãn, chip | `text-caption` 12/16; chip chữ 700 |
| Code | mono 13/20 trong khung `--code`, `--r-inset`, đệm 14 |
| Chữ SVG | ≥ 12 px ở tỉ lệ 1:1 (nhãn đầu hộp được 10 px mono). **Ẩn dưới `lg`** |
| Số trong ô thống kê | 20/26 800, `tabular-nums`; tên trường mono 12 `--muted` |
| Vùng chạm | ≥ 24 px; hàng danh sách và nút trên điện thoại ≥ 44 px |

**Một nút chính mỗi vùng** (H3):

| Trang | Nút chính |
|---|---|
| Tổng quan | Tiếp tục bài |
| Trang engine | Tiếp tục cấp đang học |
| Trang cấp | Không có. Hàng bài kế tiếp được tô nền, capstone là nút phụ |
| Sơ đồ | Tiếp › |
| Câu hỏi | Kiểm tra |
| Lab | Nộp bước. Sau khi đạt: Bước kế › |

---

## 3. Điều hướng

### 3.1 Sidebar (ảnh 01, 03, 04, 06)

**Rộng 256:**

- Nhãn nhóm "DATABASE ENGINE" (`text-caption` 800, chữ hoa).
- Mỗi engine một dòng: icon 20 + tên 14/800 + "bài xong / tổng" bên phải.
- Engine đang mở liệt kê các cấp. Mỗi cấp là **badge `L1` + tên ngắn** ("Dùng đúng cách") + ✓ hoặc `9/14`. **Số cấp chỉ nằm trong badge**: tên không lặp "L1", và `h1` của trang cấp cũng không lặp.
- Cấp đang mở liệt kê mô-đun, tên ngắn lấy từ `modules.yml`, **không đánh số**.
- Cuối sidebar: dòng Best Practice.

**Tô "đang ở" (H2, U19):** chỉ tô **một** dòng, đó là đơn vị nhỏ nhất chứa trang đang mở.

- Bài: tô mô-đun của bài. Nền `--accent-soft`, vạch trái 3 px `--accent`, chữ `--accent` 800, `aria-current="page"`.
- Trang cấp: tô dòng cấp.
- Trang engine: tô dòng engine.
- Trang tổng quan: không tô gì.
- Bài lab trong workspace: tô theo `id` của bài.

**Rail 64:** nút mở rộng », icon engine đang mở trên nền `--accent-soft`, rồi 5 chấm cấp (đã phát hành):

| Chấm | Hình |
|---|---|
| Xong | nền `--good` |
| Đang ở | lớn hơn, nền `--accent`, có số |
| Chưa | viền `--muted` |

Dưới các chấm, sau một vạch: icon của hai engine còn lại và Best Practice. Mỗi icon có `title` và `aria-label`.

**Mở rộng rail thì đẩy trang**, không đè, không có lớp mờ (L188, C1).

### 3.2 Công tắc "Học" trên điện thoại (D-E1, ảnh 02)

- **Chỉ ở đầu `#/learn` và `#/engine`.** Trang bài và trang cấp không có công tắc.
- Gồm hai nút cùng cỡ, mỗi nút cao 44, trên nền `--surface-2` bo 22: "SQL" | "Database Engine".
- Nút đang chọn: nền `--panel`, viền `--accent` 2 px, chữ `--accent` 800. Nút kia: chữ `--muted` 700.
- **Đánh dấu:** dùng `<nav aria-label="Học">` với hai link `aria-current="page"`, **không** dùng `role=tablist`. Lý do: tablist chứa link là mẫu ARIA sai (tab không điều hướng). Product §7.2 ghi tablist. Đây là sửa nhỏ, cần Product đồng ý (Q-C4).
- Pref `cargo-query/learn-tab` vẫn như product.
- Mục "Học" ở thanh dưới sáng trên cả `#/learn…` lẫn `#/engine…`.

### 3.3 Thanh dính (sticky)

Ngoài top bar và thanh dưới có sẵn, khu Engine chỉ có đúng ba thanh dính. Mọi thanh dính có **nền đặc** `--panel` và vạch 1 px (B3, U36).

| Thanh | Ở đâu | Khi nào dính |
|---|---|---|
| Thanh điều khiển sơ đồ | Bài concept ở **< lg** | Chỉ khi khung sơ đồ đang trên màn (`position: sticky; bottom: thanh dưới`). Cao 76: "Bước 4/5" + ‹ ▶ Tiếp › (ảnh 07) |
| Thanh bước capstone | Đầu pane đề (≥ 1024: 64 px; 375: 52 px, dưới công tắc pane) | Luôn, trong pane |
| Hàng nút lab / capstone | Pane SQL ở 375 | Như M1 của v7 |

Desktop không có thanh dính trong trang đọc. Sơ đồ cao ≤ 420 px nên điều khiển luôn thấy cùng hình.

---

## 4. Trang tổng quan, engine, cấp

### 4.1 `#/engine` (ảnh 01, 02)

1. `h1` "Database Engine", rồi một câu phụ (`text-body-sm` `--muted`).
2. **Thẻ Tiếp tục**, cao 88: nhãn `TIẾP TỤC` (caption 800), tiêu đề bài (18/700, dạng "Engine · Mô-đun · Bài"), meta "Lab · 12 phút · bước 2/3", nút chính "Tiếp tục bài". Người chưa học bài Engine nào thì thẻ này là "Bắt đầu: PostgreSQL L1".
3. **Thẻ engine**, mỗi thẻ cao 144, cách nhau 16:
   - Dòng đầu: icon 32, tên 18/700, chip nhãn runtime, "x/y bài" bên phải.
   - Thang: 5 ô cấp cao 58, cách nhau 8. Mỗi ô có badge, tên ngắn, thanh tiến độ 6 px, số.
   - Ô cấp đang học: viền `--accent` 2 px, nền `--accent-soft`. Ô xong: thanh `--good`, ✓.
   - Cả thẻ là link phủ tới trang engine (L88). Mỗi ô cấp là link riêng nằm trên lớp phủ. Không có hover transform.
4. **Best Practice:** một dòng cao 52, không phải thẻ engine thứ tư. Có từ v25.

**Trạng thái phát hành** (ảnh 02, trái):

- Cấp hay engine chưa phát hành thì **không có ô**: không ô xám, không chữ "sắp có" (L5).
- **Chỉ một engine, một cấp** (v22): thẻ engine mở rộng thành **danh sách mô-đun của cấp đó**. Mỗi mô-đun một hàng có câu "Học xong bạn làm được…" và tiến độ, capstone ở cuối. Nhờ vậy trang không trông như thiếu.
- Từ khi có cấp thứ hai, thẻ quay về dạng thang. Thang chỉ có các ô đã phát hành, và các ô giãn đều chiều ngang.

### 4.2 `#/engine/<engine>` (ảnh 03, 05)

- Breadcrumb, rồi `h1` tên engine + chip runtime, rồi dòng meta: "66 bài + 5 kiểm tra cấp · 77 % chạy thật · 19 xong".
- Link "Best Practice cho <engine> ›" (ghost) đặt bên phải dòng meta.
- **Thang dọc:** vòng 40 px nối bằng đường 2 px `--border-strong` (trang trí). Vòng xong: `--good` + ✓. Vòng đang học: `--accent` + số. Vòng chưa: viền `--muted`.
- Mỗi cấp một thẻ cao 100:
  - tiêu đề "L2 · Index và kế hoạch". Đây là chỗ duy nhất badge và tên đứng chung trong một chuỗi chữ, vì vòng bên trái đã đổi thành ✓;
  - câu "Học xong cấp này bạn làm được…";
  - meta (số bài, phút, % chạy thật);
  - thanh tiến độ.
- Chỉ cấp đang học có nút chính.
- 375: thẻ cấp 80 px, vòng 28 px. Nút chính "Tiếp tục L2" đặt cuối luồng, không dính.

### 4.3 `#/engine/<engine>/l<n>` (ảnh 04, 05)

- `h1` = badge `L2` + tên đầy đủ của cấp. Meta: "14 bài · ~3 giờ · 93 % chạy thật · 9/14 xong".
- **Mô-đun không phải thẻ trong thẻ** (D3). Mỗi mô-đun gồm:
  - tiêu đề `text-title` + "2/4" bên phải;
  - khối câu "Học xong bạn làm được: …" (nền `--good-soft`, `--r-inset`, chữ `--text` 600);
  - các hàng bài.
- **Hàng bài** cao 48 (375: 64, hai dòng). Các cột:
  - `NN` mono `--muted` (con số duy nhất của bài);
  - icon + chữ loại (Khái niệm / Lab / Đoán / Câu hỏi);
  - tiêu đề;
  - phút;
  - chip nhãn trung thực ngắn (Chạy thật / Sơ đồ / Ghi sẵn);
  - ✓ hoặc "Tiếp ›".
- Bài kế tiếp: nền `--accent-soft` + vạch trái 3 px.
- Các hàng cách nhau bằng vạch 1 px `--border`.
- `requires` **không khóa** (L121). Bài "nên học trước" chỉ hiện chip trong trang bài.
- Capstone ở cuối: thẻ có icon 40, tiêu đề "Kiểm tra cấp L2 · 4 bước", một câu, nút phụ "Làm bài".

---

## 5. Trang bài

### 5.1 Chung cho mọi loại

**Đầu trang:**

1. Breadcrumb.
2. `h1` + **đúng một chip nhãn trung thực** (L1 của checklist). Chip có chấm tròn và chữ:

   | Chip | Màu |
   |---|---|
   | "Chạy thật · PostgreSQL 18.6 (PGlite)" | `--good-soft` / `--good` |
   | "Chạy bằng mingo…" / "Chạy bằng dynoxide…" | như trên |
   | "Kết quả ghi từ MongoDB 8.0, ngày …" | `--info-soft` / `--syn-type` |
   | "Sơ đồ" | `--surface-2` / `--muted` |

3. Meta: loại · phút · "Nên học trước: <chip link>".

Bài BE có thêm một dòng caption dưới meta (ảnh 17, ô cuối).

**Cuối trang:**

- "Nguồn" (link docs chính thức) + "Đúng với PostgreSQL 18" (ADD-2) căn phải.
- Hai nút phụ "‹ Bài trước" / "Bài tiếp ›".

**Route:**

- Bài đọc (concept, predict, quiz): `#/engine/lesson/<id>`, trang đọc 880 px.
- Lab và capstone: `#/engine/play/<id>` trong workspace (`<main id="shell">`, mode `engine`).

`labs.ts` của ENG-CORE lại nói trang bài là nơi chứa lab (Q-C1).

### 5.2 `concept` (ảnh 06, 07)

**Thứ tự khối:** mục tiêu ("HỌC XONG BÀI NÀY", 2 gạch đầu dòng), Ý chính (≤ 150 từ), **khung sơ đồ**, chú giải, Ví dụ, Kiểm tra nhanh, Nguồn.

**Khung sơ đồ** là một thẻ 880 px (đệm 24):

| Phần | Kích thước |
|---|---|
| Tiêu đề | 16/700, mã `viz` mono `--muted` bên phải |
| Vùng vẽ | **cao cố định 232 px**, rộng 832 |
| Hộp câu bước | 52 px (2 dòng), nền `--surface-2`, "Bước 4/5" 12/800 `--accent` |
| Hàng điều khiển | 40 px, cách hộp câu 12 |

**Hàng điều khiển:**

- ‹ Trước (96) · ▶ Phát (92) · Tiếp › (88, nút chính) · chấm bước · bên phải "Xem trang thật ›" (ghost, mở lab của mô-đun).
- Vị trí các nút **không đổi giữa các bước** (A5).
- Tổng chiều cao thẻ ≤ 420, nên ở 1280×800 điều khiển nằm trên nếp gấp khi người học cuộn tới đầu thẻ.

**Đoán trước** (ảnh 07):

- Một hộp `--sun`/`--sun-ink` (giọng Boon, nhưng không có linh vật trong sơ đồ), nằm ngay trên hộp câu, trước bước kết quả.
- Có 2–3 nút phụ nhỏ. Chọn xong thì Tiếp mới sang bước kết quả.
- Không lưu, không chấm.

**Chú giải:** HTML dưới thẻ, nên vẫn thấy dưới `lg`.

**Câu kiểm:**

- `fieldset` có `legend` là câu hỏi. Mỗi lựa chọn là radio thật, thẻ cao 44, `--r-ctl`.
- Lựa chọn đang chọn: `--accent-soft` + viền 2. Đúng: `--good-soft`. Sai: `--bad-soft`. Kèm chữ "Đúng" / "Chưa đúng".
- `why` hiện sau khi đúng, hoặc sau lần sai thứ 2.

**375:**

- Sơ đồ chỉ có hình (không chữ SVG), cao ~140.
- Dưới hình là chú giải HTML 2 hàng, rồi **danh sách bước** `ol`: mỗi bước có số trong vòng và câu đầy đủ; bước đang ở có nền `--accent-soft` + `aria-current="step"`; bấm một bước để nhảy tới bước đó.
- Thanh điều khiển dính (§3.3).

### 5.3 `lab` (ảnh 08, 09)

**Pane đề (400 px ở 1280, 300–340 ở 1024):**

1. Breadcrumb, `h1`, chip, "Lab · 12 phút · bước 2/3".
2. Khối `--info-soft` "Dữ liệu lab: bảng notes (83 dòng), dựng lại mỗi lần mở bài".
3. **Danh sách bước** `ol`:

   | Bước | Hình |
   |---|---|
   | Xong | vòng `--good` ✓ |
   | Đang làm | thẻ viền `--accent` 2, mở rộng: đề, "Chấm bằng: kết quả (rows), có thứ tự" (kiểu `check` nói bằng lời), nút ghost "Gợi ý (miễn phí)" |
   | Sau | chữ `--muted` |

   Bước sau **không có ổ khóa**, vì nó không phải tính năng bị khóa: nó chỉ chưa tới lượt (bossStep). Bấm vào thì đọc được đề.

**Pane làm:**

- Dải đầu editor 36 px `--surface-2`: "SQL · PostgreSQL 18.6 (PGlite)" (L4 của checklist), "Bước 2/3" `--accent` bên phải.
- Editor cao theo nội dung (tối thiểu 4 dòng).
- Hàng nút: Chạy (phụ + `kbd`), Định dạng (ghost), Nộp bước (chính + `kbd`).
- Sau khi đạt: khối `--good-soft` "✓ Bước 2 đạt: …" với nút chính "Bước 3 ›", còn Nộp lùi về nút phụ (ảnh 08).

**Panel dưới** có các tab Kết quả | **Bên trong** | Kế hoạch | Cột.

- Thân tab ≥ 400 px ở 1280×800 (U5/I4).
- Dòng trạng thái "5 dòng · 5 cột · 3 ms" ở bên phải thanh tab.
- "Bên trong" vẽ **một khung** từ chính kết quả của người học. Khung không có bước và không có ‹ ›. Khi kết quả không đủ cột để vẽ, tab nói thiếu cột nào: "Thêm `lp` và `t_ctid` để vẽ trang".

**375:**

- Pane "Đề bài / SQL / Kết quả" như M1.
- Hàng nút dính có Chạy (110) · Nộp bước (170) · ⋯ (47). Mỗi nút cao 44.
- Chip "5 dòng · Xem kết quả →". Không tự chuyển pane.
- Tab Bên trong xếp dọc: hình không chữ, chú giải, rồi bảng (hàng 40, cuộn ngang trong khung).

### 5.4 `predict` (ảnh 10, 11)

**Khối:**

1. "Đang có" (code của `setup` có liên quan: `CREATE INDEX …`).
2. "Câu được hỏi" (code).
3. Câu hỏi 16/700.
4. 4 lựa chọn ở lưới 2×2 (cách 12; ở 375 một cột, cao 52).
5. "Xem thật ▸" (nút chính) + caption "Chạy EXPLAIN thật trên PGlite. Không tính sai nếu đoán lệch".

**Sau "Xem thật":**

- Nút Xem thật thành nút tắt, kèm caption "Đã chạy · đoán lại được".
- Thẻ kết quả có:
  - chip ✓ Đúng / ✗ Chưa đúng;
  - "Kế hoạch thật · chi phí planner, không phải thời gian";
  - **nút kế hoạch** dùng cùng hộp với sơ đồ, nút trả lời câu hỏi viền `--accent`;
  - `cost …`, `rows …` mono;
  - một câu điều quan sát được ("Không có nút Sort…");
  - khối `why` `--surface-2`.
- Nút chính chuyển sang "Bài tiếp ›".
- MongoDB và DynamoDB hiện output `recorded` với chip "Kết quả ghi từ …".

### 5.5 `quiz` (ảnh 12, 13)

- Các câu xếp dọc, mỗi câu có nhãn "Câu n" (caption 800). Giữa các câu là một vạch 1 px, không đóng khung từng câu.
- **Câu xếp thứ tự (ADD-5):**
  - mỗi mục là thẻ cao 48: số mono, chữ, nút ↑ và ↓ (40×36);
  - mục vừa dời có `--accent-soft`;
  - ở 375: nút "↑ Lên" / "↓ Xuống" (32 cao, ≥ 96 rộng) nằm dưới chữ;
  - **không kéo thả**.
- "Kiểm tra" (nút chính) + "Câu 2/2 · được thử lại không giới hạn".

### 5.6 `capstone` (ảnh 14, 15)

- Workspace như lab. Đầu pane đề có **thanh bước dính**: 5 đoạn vạch 6 px (xong `--good`, đang làm `--accent`, chưa `--surface-2`) với tên bước "1. Đọc pg_stats" bên dưới. Ở 1024 và 375 chỉ còn vạch + một dòng "Bước 3/5 · Tạo index".
- **"Chấm bằng"** là một thẻ liệt kê từng điều kiện (✓ / ○ + chữ), cập nhật sau mỗi lần Nộp. Ví dụ: "Đúng một index mới trên events", "Câu đích đọc events qua index", "Kết quả câu đích không đổi". Khối này ánh xạ thẳng `LAB01`/`LAB02`/plan check.
- **Tab Kế hoạch:** nút kế hoạch "Trước" và "Sau" đặt cạnh nhau, nối bằng mũi tên `--accent`, kèm chi phí (không ms). Dưới là khối `--info-soft` "Index chỉ tồn tại trong lần chạy này: mọi thứ được ROLLBACK".
- **Bước kết luận:** là `quiz` trong cùng pane đề.
- **Xong capstone:** Lily reo ở dock hoàn thành, kèm `doneBadge()` của cấp. Không có linh vật trong pane hay sơ đồ.

---

## 6. Ngôn ngữ hình cho sơ đồ bên trong (ảnh 18, 19)

**Một ngữ pháp cho cả ba engine.** Nhận diện engine bằng tên + icon ở đầu trang, **không** bằng màu sơ đồ. Mỗi màu chỉ mang một nghĩa ở mọi engine.

| Phần tử | Quy cách |
|---|---|
| **Hộp đơn vị lưu trữ** (trang heap, nút B-tree, stage Mongo, partition hay GSI Dynamo) | Nền `--eng-cell`, viền 1,5 `--eng-sub`, bo 10. Dải đầu 16 px `--eng-head` có nhãn mono 10 px `--muted` ("trang 3 · lá", "P3", "stage 3") |
| **Trang 8 KB** (chi tiết) | Thanh ngang rộng hết vùng vẽ, cao 92. Từ trái: header cố định 64 px ("header 24 B"), các line pointer (ô 34×30, mono 11) với mũi tên "→" chỉ hướng lớn lên, chỗ trống (sọc `--eng-free`, chữ nghiêng "chỗ trống" khi rộng > 120), các tuple từ phải sang trái với mũi tên "←". Thước "0" và "8192 B" mono 11 dưới hai đầu |
| **Lưới trang** (relation) | Ô vuông 38, cách 6, số trang mono 10 góc trái trên. Các trạng thái: all-visible = `--good-soft` + ✓; có tuple chết = sọc `--bad`; còn chỗ (FSM) = vạch `--warn` đáy ô dài theo % trống; trang mới = sọc nhạt. Focus một ô thì mở chi tiết trang bên dưới |
| **Tuple: sống** | Viền liền `--eng-live`, nền ô, huy hiệu "sống" |
| **Tuple: chết** | Sọc 45° `--bad` trên `--bad-soft`, viền đứt 4 3, chữ `--muted`, huy hiệu "chết" |
| **Tuple: HOT** | Nền `--warn-soft`, viền `--warn`, huy hiệu "HOT" |
| **Tuple: đóng băng** | Chấm `--syn-type` trên `--info-soft`, **viền kép**, huy hiệu "băng" |
| Huy hiệu tuple | Viên thuốc 16 px, góc trái trên của ô, chữ 11/800. Ô < 60 px thì đặt huy hiệu ngoài ô, có đường dẫn |
| **Line pointer** | normal: viền `--eng-sub`. redirect: `--warn-soft`, chữ "1→" + mũi tên tới lp đích. dead: sọc đỏ. unused: viền chấm 2 3 |
| **LSN** | Trục ngang `--eng-sub` với mũi tên "LSN tăng →". Mỗi bản ghi là một ô 10×12, có tên (INSERT/COMMIT/FPI, 11/700) và LSN mono 10 bên dưới. FPI có nền `--warn-soft`. Checkpoint: vạch đứt `--warn` "checkpoint (redo)". Vùng đã flush: dải `--accent-soft`. Sập: vạch liền `--bad` 2,5 px "sập". Insert LSN hiện tại: tam giác `--accent` |
| **B-tree** | Nút = hộp. Khóa ngăn bằng vạch trang trí. Khóa mới: nền `--accent-soft` + viền `--accent` 1,5. Trang mới hoặc vừa tách: viền hộp `--accent` 2,5 + chữ "(mới)" ở đầu. Downlink là mũi tên con trỏ; đường bước này đi qua là `--accent` 2 |
| **Posting list** (B-tree dedup, GIN) | Viên thuốc `--accent-soft`: khóa (mono 12/700), danh sách TID (mono 11 `--muted`, cắt "…") và số đếm trong ô tròn |
| **Mongo** | Băng chuyền stage nối bằng mũi tên con trỏ; chip số tài liệu sau stage. Dãy khóa ESR: ô khóa; vùng quét = `--accent-soft` + khung đứt `--accent` "vùng quét liên tục"; "SORT trong bộ nhớ" = hộp `--warn-soft` |
| **Dynamo** | Partition là hộp có item bên trong. Thanh tiêu thụ / trần cao 8 px. Partition nóng: `--warn` + chữ "nóng". GSI là hộp riêng, nối bằng mũi tên đứt `--warn` "chiếu bất đồng bộ" |

**Mũi tên** (đầu tam giác đặc 8 px, cùng màu nét):

| Kiểu | Nét | Nghĩa |
|---|---|---|
| Con trỏ | `--eng-sub` 1,5 liền | ctid, downlink, item → partition |
| Đường bước này đi qua | `--eng-active` 2 liền | |
| Dời / chuỗi | `--eng-hot` 1,8, đứt 5 3 | chuỗi HOT, chiếu GSI |
| Mất / không tới | `--eng-dead` 2, chấm 2 3 | |

Nghĩa không bao giờ chỉ nằm ở màu: kiểu nét, hoa văn và chữ luôn đi kèm.

**Nhãn và chú giải:**

- Nhãn ≥ 12 px. Hình < 40 px thì nhãn đặt ngoài hình, nối bằng đường dẫn 1 px `--eng-sub`.
- Chú giải là HTML dưới khung sơ đồ: mẫu 22×14 + chữ 12, cách nhau 20. Chỉ liệt kê những gì sơ đồ đang dùng.

**Đánh dấu thay đổi:** phần thay đổi của bước có viền `--accent` 2–2,5 (cách 4 px). Không làm mờ chữ. Muốn lùi phần không liên quan thì giảm opacity của **hình** (0,45), chữ giữ ≥ 4,5:1.

**Điều khiển bước** (ảnh 18 G):

- ‹ Trước · ▶ Phát / ❚❚ Dừng · Tiếp › · chấm.
- Bước đầu: ‹ có `aria-disabled` nhưng vẫn focus được.
- Phát tự sang bước sau khi chuyển động của bước xong, nghỉ 1,5 s; dừng ở bước cuối. Dừng luôn có.

**Giảm chuyển động** (ảnh 18 H):

- Mỗi bước có **khung gốc = trạng thái cuối** (luật v5). Đổi bước là thay khung ngay, không tween.
- Phát vẫn dùng được: 4 s mỗi khung, Dừng luôn hiện (WCAG 2.2.2).
- Không nhấp nháy, không vòng lặp. Khi có chuyển động thì mỗi bước ≤ 3 s, chỉ biến đổi SVG lá, vẽ lại không phát lại.

---

## 7. Số liệu catalog cạnh sơ đồ (ảnh 08, 16)

1. **Hình suy ra từ bảng, không bao giờ ngược lại.**
   - Bảng và ô số là output thật: mono, không làm tròn, giữ tên cột gốc, đầu cột có kiểu (`int2`, `xid`, `tid`), như `renderResult`.
   - Hình chỉ là cách đọc bảng.
2. **Một mã chung nối hai bên:** `lp1`, `P3`, `IXSCAN`.
   - Hover hoặc focus một hàng (hay một ô) thì hình tương ứng có viền `--accent` 2, và ngược lại.
   - Hàng dùng `aria-describedby` trỏ tới câu mô tả hình đó.
3. **Bố cục:**
   - Thân tab hoặc thẻ **≥ 960 px**: hình bên trái (~60 %), số liệu bên phải (≥ 320 px).
   - Hẹp hơn, kể cả workspace 1280 có pane đề 400: **hình trên, số liệu dưới**, cùng thứ tự đọc.
   - Không có tab con, không có popover.
4. **Ô thống kê:** tối đa 3, cao 54, `--surface-2`. Tên trường mono 12 `--muted` ở trên, số 20/800 ở dưới. Cần nhiều hơn 3 thì dùng bảng.
   - Postgres: hàng `heap_page_items`, ví dụ số đo `t_xmin 752, t_xmax 753, t_ctid (0,84)`; sau VACUUM thì `lp_flags 2, lp_off 84`.
   - DynamoDB: `Count`, `ScannedCount`, `ConsumedCapacity`.
   - MongoDB: `nReturned`, `totalKeysExamined`, `totalDocsExamined`.
5. **Nguồn của số luôn ghi rõ:** chạy thật (PGlite / dynoxide / mingo), hay chip "Kết quả ghi từ … ngày …" (ADD-3). Không trộn hai loại trong một ô.
6. **Tốt / xấu:** nền `--good-soft` / `--bad-soft`, **cộng** một câu chữ ("tỉ lệ examined / returned 33 : 1"). Không chỉ dùng màu.
7. **Ở 375:** hình không chữ, bảng cuộn ngang trong khung, hàng 40 px; ô số xếp một cột.

---

## 8. Trạng thái rỗng, tải, lỗi (ảnh 17)

| Trạng thái | Hiện gì | Hành động |
|---|---|---|
| Tải chunk `engineui` / nội dung cấp | Loader + "Đang tải bài…" ở chỗ của khung trang (một dòng cố định, không skeleton nhấp nháy) | — |
| Chunk lỗi | Khối `--bad-soft`: "Không tải được phần Database Engine. Kiểm tra mạng rồi thử lại." | "Thử lại". Không tự thử vòng lặp |
| `prepare` đang chạy | Trong pane Kết quả: loader + "Đang dựng dữ liệu cho bài (bảng notes, 83 dòng)…". Nút Chạy tắt, có ổ khóa + "Chờ dữ liệu xong" (H6) | — |
| `prepare` ném lỗi | Khối `--bad-soft`: chip SQLSTATE nếu có, "Không dựng được dữ liệu cho bài này.", thông báo gốc mono | "Dựng lại" (gọi lại `prepare`) |
| Verdict `unsupported` | Khối `--info-soft`: "Bước này kiểm bằng kế hoạch (plan), bộ chạy hiện có không chấm được. Bạn vẫn chạy và xem kết quả; bước không tính đạt." | — (test nội dung phải chặn trước khi phát hành, nên đây chỉ là lưới an toàn) |
| Thiếu `viz` | **Khe biến mất**, không để khung rỗng. Ý chính nối thẳng với Ví dụ | Test: mọi `viz` có trong danh mục |
| Bên trong, trước lần chạy đầu | Icon 32 + "Chạy câu để vẽ trang heap từ chính kết quả của bạn." (W1 rỗng) | — |
| Lần đầu mở lab DynamoDB | "Tải bộ máy DynamoDB", thanh tiến độ + "0,4 / 1,2 MB" (`countingFetch`), "Chỉ tải khi mở bài DynamoDB đầu tiên" (D-E12) | — |
| Quá 5 s | Khối `--warn-soft`: "Câu chạy quá 5 giây nên đã dừng. Dữ liệu lab được dựng lại; nháp của bạn còn nguyên." + dòng Boon oops dưới nút | — |
| Bài BE | Chip "Sơ đồ" + caption "Phần chạy thật cần máy chủ thật (nhiều phiên / replica set / AWS). Bài này dùng sơ đồ và kết quả ghi sẵn." | Không chữ "sắp có" |

---

## 9. Trợ năng

### 9.1 Văn bản thay thế cho mỗi bước

- Mỗi sơ đồ có danh sách bước `ol` bằng HTML. Ở ≥ `lg` danh sách nằm ngay dưới chú giải, gập lại thành `<details>` "Các bước bằng chữ". Dưới `lg` danh sách luôn mở (ảnh 07).
- `<svg role="img" aria-labelledby="<id câu bước hiện tại>">`. Câu bước là câu đầy đủ, nói **thay đổi gì và vì sao**, không phải "hình 4". Ví dụ: "Đọc dòng id = 1: index dẫn tới lp1, rồi đi theo t_ctid tới (0,84), phiên bản còn sống."
- Đổi bước thì đọc một câu `aria-live="polite"`: "Bước 4 trên 5. <câu bước>". Chỉ một câu, không đọc lặp (K3).
- "Bên trong" của lab: `figure` + `figcaption` một câu tóm tắt ("Trang 0: 84 line pointer; lp1 chết, trỏ tới (0,84) HOT"). Bảng bên cạnh là bản dữ liệu đầy đủ.

### 9.2 Thứ tự focus

| Trang | Thứ tự |
|---|---|
| Trang đọc | Link "Bỏ qua tới nội dung" (U37) → top bar → sidebar → breadcrumb → `h1` (`tabindex=-1`, nhận focus khi đổi route) → mục tiêu → khung sơ đồ: vùng vẽ (`tabindex=0`) → ‹ → ▶ → Tiếp › → các chấm (bỏ qua, chỉ là trang trí `aria-hidden`; danh sách bước là bản focus được) → Xem trang thật → câu kiểm (nhóm radio, mũi tên đi trong nhóm) → Kiểm tra → nguồn → trước / sau |
| Lab / capstone | Như workspace hiện có (skip button tới editor / kết quả) → pane đề: thanh bước (capstone) → danh sách bước → Gợi ý → editor → Chạy → Nộp → phản hồi (focus vào khối phản hồi sau Nộp) → thanh tab (roving tabindex) → thân tab: hình (`tabindex=0`) → bảng |
| Predict sau Xem thật | Focus chuyển vào tiêu đề thẻ kết quả (`tabindex=-1`); trang cuộn `block: nearest` |
| Quiz xếp thứ tự | Sau ↑/↓ focus **đi theo mục** tới vị trí mới; `aria-live` "Đã dời "Sửa trang…" lên vị trí 2" |

### 9.3 Bàn phím

| Phím | Ở đâu | Làm gì |
|---|---|---|
| ← / → | Vùng sơ đồ có focus | Bước trước / sau |
| Home / End | Vùng sơ đồ có focus | Bước đầu / cuối |
| Space | Vùng sơ đồ có focus | Phát / Dừng |
| Mod-Enter / Mod-Shift-Enter | Lab | Chạy / Nộp (như `pageShortcutOf`) |
| Esc | — | Không dùng trong sơ đồ (dock và hộp thoại đã có luật Esc) |

- Phím sơ đồ chỉ chạy khi vùng vẽ có focus, không bắt toàn trang.
- Mọi điều khiển là `button` thật, cao ≥ 40 px.
- Ổ khóa luôn có lý do bằng chữ (H6).
- Không có bẫy bàn phím: rời vùng vẽ bằng Tab.

---

## 10. Bổ sung cho `ux-deploy-checklist.md` mục L

Đề xuất thêm các mục sau vào checklist (agent QA thêm, người viết spec này không sửa file đó):

- **L6:** Ở 1280×800, khi đầu khung sơ đồ chạm đầu màn, cả hàng điều khiển vẫn trên nếp gấp. Đo bằng tay.
- **L7:** Mọi thanh dính của Engine có nền đặc, và không che dòng đầu của nội dung (B3).
- **L8:** Hover hoặc focus một hàng số liệu thì hình tương ứng sáng, và ngược lại.
- **L9:** Sidebar chỉ có một dòng `aria-current`, và đó là đơn vị nhỏ nhất chứa trang đang mở.
- **L10:** Ảnh tối của mọi sơ đồ mới. Không có nét mang nghĩa nào dùng `--border*`.

---

## 11. Câu hỏi mở

### ENG-CORE

- **Q-C1:** Lab chạy ở đâu? `labs.ts` nói "the lesson page (`src/ui/engineView.ts`) calls `prepare`…", còn product §7.1 nói lab và capstone chạy ở `#/engine/play/<id>` trong workspace. Spec này vẽ theo product (workspace). Xin ENG-CORE xác nhận, hoặc đổi chú thích trong `labs.ts`.
- **Q-C2:** `LabOutput` = `QueryResult` chỉ là một bảng. Mấy thứ sau lấy từ đâu?
  - `ScannedCount`, `ConsumedCapacity` (DynamoDB);
  - `nReturned`, `totalKeysExamined`, stage explain (MongoDB, `recorded`);
  - kế hoạch "trước / sau" của capstone.

  Đề xuất thêm `meta?: Record<string, number | string>` và `plan?` vào `LabOutput`, hoặc một hàm `inspect()` riêng của runner.
- **Q-C3:** "Bên trong" cần biết những cột nào để vẽ trang heap (`lp`, `t_ctid`…). Cấu hình này nằm ở đâu: trong `viz` của bài, hay suy ra từ tên cột? Tab báo thiếu cột (§5.3) phụ thuộc câu trả lời.
- **Q-C4 (Product):** Công tắc Học dùng `nav` + `aria-current` thay cho `role=tablist` (§3.2). Đồng ý không?
- **Q-C5:** Bước lab sau bước đang làm: được đọc trước (spec này cho đọc, chỉ không cho Nộp) hay ẩn?

### ENG-VIZ

- **Q-V1:** `VizMount(host, ctx)` không nhận dữ liệu, không trả danh sách bước, không có bước khởi đầu. Trang lấy ở đâu:
  - câu bước HTML (`ol`, `aria-live`, `aria-labelledby`);
  - tổng số bước;
  - và cách giữ bước hiện tại khi remount vì đổi theme hay ngôn ngữ?

  Đề xuất `mount(host, ctx) → { steps: Bi[], go(i), destroy() }` và `ctx.step`.
- **Q-V2:** Sơ đồ "Bên trong" của lab vẽ từ kết quả thật. Nó dùng cùng `VIZ` (cần nhận `rows`), hay là một bộ vẽ riêng?
- **Q-V3:** Tên trong registry (`'btree-split'` trong chú thích code) khác danh mục product (`pg-btree-split`). Chốt một mẫu tên, ví dụ `pg-…`/`mg-…`/`dy-…`.
- **Q-V4:** "Đoán trước" và nút Phát: thuộc trang (khung chung) hay từng sơ đồ? Spec này đặt ở khung chung để vị trí nút cố định (A5).
- **Q-V5:** Có cần một token chữ thông tin riêng (`--info`) thay vì mượn `--syn-type` cho trạng thái đóng băng và nhãn "ghi sẵn"? Hex hiện tại đạt tương phản (5,7 / 8,4). Nếu tách thì giữ đúng giá trị này.
