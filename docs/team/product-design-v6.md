# Product Design v6: linh vật Bin & Mây, UI cute, nav trái, schema theo domain, cảnh theo domain, animation

Ngày: 2026-11-17 · Vai trò: Product Designer + UI/UX + minh họa · Theo **L56** (`decision-log.md`).
Đầu vào: `CLAUDE.md`, `product-design-v5.md` (mockup v8), `product-design-v4.md` (onboarding, bài học nhanh, lộ trình), `ui-ux-v4.md`, L47–L56, `src/ui/harbor.ts`, `src/ui/routeMap.ts`, `src/ui/icons.ts`, `src/ui/stage.ts`, `src/style.css`, `src/db/{schema.sql,seed.sql,init.ts,run.ts,import.ts}`, `src/import/myData.ts`, `src/viz/erd.ts`, `scripts/check-budget.mjs`, `tests/{seed,erd,glossary,import}.test.ts`.
Mockup: `.superpowers/brainstorm/11840-1794844744/content/mascots-layout-v9.html` (7 màn, sáng/tối, nút giảm chuyển động, 375 px).

Tài liệu này **chỉ đề xuất**. Nó không sửa `src/`, `content/` hay test. User duyệt phần **§10 (Quyết định)** trước khi build.

---

## 0. Tóm tắt một trang

| Yêu cầu L56 | Đề xuất |
|---|---|
| (1) Linh vật + brand | Hai nhân vật **gốc**: **Bin** (chó cỏ Việt màu caramel, một tai vểnh gập + một tai cụp, khăn xanh ngọc có huy hiệu sao; thực tập sinh DA, bạn đồng hành của người học) và **cô Mây** (vịt trời lông xanh ngọc, kính tròn, chỏm ba sợi lông, dây đeo thẻ "Mentor" + máy tính bảng; senior DA, người dẫn tour, gợi ý, bài học). 6 tư thế mỗi nhân vật, SVG bằng hình cơ bản, màu là biến CSS. Brand: **giữ "Truy" (v5) làm tên sản phẩm, cặp "Bin & Mây" làm gương mặt** (lockup `truy_` · *cùng Bin & Mây*). |
| (2) UI cute | Bảng màu ấm (nền kem, accent xanh ngọc, nhấn caramel/vàng nắng), bo góc 20/14/999 px, bóng mềm; linh vật xuất hiện ở 7 khoảnh khắc (tour, chờ tải, rỗng, gợi ý, lỗi, đúng, lên chương). Mọi cặp chữ/nền ≥ 4,5:1 cả hai theme (đã tính bằng script, §2.3). Animation chỉ `transform`/`opacity`, tắt hết dưới `prefers-reduced-motion`. |
| (3) Layout + nav trái | Thanh trên chỉ còn nav cấp 1 (`Trang chủ · Lộ trình · Luyện SQL` + nút domain). **Sidebar trái** chứa nav cấp 2 theo route (thay "hàng 2" của v5). ≥ 1280 px mở sẵn 256 px; 1024–1279 px và trang Làm việc: **rail 64 px**; < 1024 px: **ngăn kéo** (drawer) + thanh dưới 4 mục. Danh sách "thở": một dòng = một thứ, tối đa 1 trạng thái + 1 hành động, không chồng chip. |
| (4) Schema theo domain | **Một DB PGlite, nhiều schema** (`logistics`, `lab`, sau là `finance`, `ecom`; `sandbox` cho import giữ nguyên), seed **lười theo domain**, `search_path` đặt **theo từng request** trong `BEGIN … ROLLBACK`. Đã chạy thử trên PGlite 0.5.16: seed vào `logistics` cho **md5 của cả 26 bảng trùng** với bản `public`. **Không** dùng một PGlite cho mỗi domain: mỗi instance thêm ~**+370 MB** RSS (đo trong Node). |
| (5) Cảnh theo domain | Hợp đồng `DomainArt` (cảnh hero + mô hình bản đồ + màu), mỗi domain một chunk lười. Logistics bọc `harborScene`/`routeMap` hiện có (không vẽ lại). Finance: phố ngân hàng + **bản đồ dòng tiền**. E-commerce: kho + cửa hàng + **bản đồ giao hàng**. Chung: "bàn học" với Bin & Mây + **bản đồ module**. Bản đồ mới dùng **một bộ vẽ đồ thị chung** (nút + cạnh + mở theo chương). |
| (6) Animation | **CSS keyframes + WAAPI (`el.animate`) + `tween()` có sẵn trong `stage.ts`**: 0 KB, MIT-free, đã tôn trọng `reducedMotion()`. Thêm **Motion "mini" (`motion`, MIT, ~2,6 KB)** chỉ khi cần chuỗi phức tạp. Không dùng GSAP (giấy phép riêng của Webflow, không phải mã nguồn mở, có thể bị thu hồi), không dùng Rive/dotLottie (wasm 260–500 KB). Tài nguyên: **SVG tự vẽ** (mặc định), Kenney (CC0) nếu cần; **không** dùng unDraw (cấm phân phối lại) trong repo public. |
| Làm gì **trước** | **F1** schema `logistics` (1 ngày, thuần nội bộ) → **F2** token màu + linh vật `mascots.ts` (2–3 ngày) → **F3** khung sidebar/drawer (3–4 ngày, đi cùng v5 N1) → **F4** khoảnh khắc linh vật + onboarding v4 P2 (2–3 ngày) → **F5** `DomainArt` + cảnh Chung (2–3 ngày) → seed lười khi có `lab` (2 ngày) → cảnh Finance/E-com khi domain đó thật sự làm. |

---

## 1. Linh vật và brand

### 1.1 Ràng buộc bản quyền (đọc trước)

- Snoopy (Peanuts Worldwide) và vịt Donald (Disney) là nhân vật có bản quyền **và** nhãn hiệu. Repo public (L50), nên **không** dùng tên, hình, tư thế đặc trưng, câu cửa miệng hay bảng màu nhận diện của họ.
- Kiểm theo **hình dáng**, không chỉ theo tên. Danh sách "không được giống":

| Nhân vật tham chiếu | Dấu hiệu nhận diện cần tránh | Bin / Mây khác ở đâu |
|---|---|---|
| Snoopy | chó beagle trắng, tai đen dài rủ, nằm ngửa trên mái nhà chó đỏ, bạn chim vàng | Bin màu caramel, **một tai vểnh gập + một tai cụp màu nâu**, ngồi thẳng, khăn xanh ngọc; không nhà chó, không chim vàng |
| Donald Duck | vịt trắng, mỏ + chân cam to, áo thủy thủ + mũ thủy thủ xanh, nơ đỏ, giọng nói "quack" khó nghe, nóng tính | Mây **xanh ngọc**, mỏ nhỏ vàng đất, **kính tròn + dây thẻ**, chỏm ba lông; không mũ, không áo, không nơ; điềm tĩnh |
| Logo DuckDB (vịt vàng tròn) | đầu vịt tròn vàng tối giản; DuckDB cấm logo vịt na ná và tên phái sinh từ "Duck" cho phần mềm liên quan/cạnh tranh | Mây là nhân vật cả thân, xanh ngọc, có kính; **không** dùng "Duck" trong brand (§1.5) |
| Psyduck (Pokémon), vịt cao su vàng | vịt vàng ôm đầu | Mây không vàng, tư thế "ối" là kính lệch + giọt mồ hôi |
| Doge (Shiba Kabosu), Pluto, Bluey, Gromit | Shiba: tai tam giác dựng, má trắng; Pluto: vàng cam tai đen dài; Bluey: xanh; Gromit: be, không miệng | Bin tai bất đối xứng, mõm kem, khăn + sao |
| Cú Duolingo | chim xanh lá tròn mắt to | Mây xanh ngọc (không xanh lá), có mỏ vịt, kính |

- Tên và câu nói đều tự đặt; không dùng "quack/quạc" làm câu cửa miệng của Mây (tránh liên tưởng Donald).

### 1.2 Bin: nhân vật chính, bạn đồng hành

- **Là ai:** chó cỏ Việt, thực tập sinh DA mới vào Cargo Query Logistics cùng ngày với người học. Tò mò, hay hỏi "sao lại thế?", vấp lỗi rồi đứng dậy. **Không giảng bài**: Bin phản ánh trạng thái của người học (đang nghĩ, đúng, sai, chờ).
- **Tên:** "Bin". VI: tên thú cưng/tên ở nhà rất quen; EN đọc được ngay. Nháy nghề: *bin* trong histogram (chia khoảng). Rủi ro nhỏ: EN "bin" còn nghĩa thùng rác (không sao cho tên nhân vật; là lý do không dùng làm brand, §1.5). Không thấy trùng nhân vật nổi tiếng (Mr. Bean ở VN vẫn gọi "Mr. Bean").
- **Hình:** đầu ellipse lớn (tỷ lệ chibi 1:1 đầu/thân), mõm kem, mũi nâu đậm, má hồng mờ; một tai cụp trái (nâu), một tai gập vểnh phải; khăn tam giác xanh ngọc + huy hiệu sao vàng; đuôi cong (vẫy được).
- **Bảng màu (trang trí, không dùng cho chữ):** caramel `#D98E4A`, kem `#F7E6CB`, tai `#8A4B22`, mực `#3A2618`, khăn `#1F9E8F`, sao `#FFD166`. Bản tối hơi dịu (`#D4914F`, `#2BB3A3`…), định nghĩa trong `:root[data-theme=dark]`.

### 1.3 Cô Mây: người dẫn đường (mentor)

- **Là ai:** vịt trời, senior DA. Dẫn tour onboarding, đưa gợi ý theo bậc, trình bày bài học nhanh, giải thích lỗi SQL, giới thiệu tab mới. Nói ngắn, ấm, **không bao giờ chê**, không nói thay đáp án.
- **Tên:** "Mây" (đám mây: nhẹ, nhìn bao quát, gần "cloud" của nghề dữ liệu). EN viết "May" khi cần phiên âm (/meɪ/); trong UI EN vẫn hiển thị "Mây" như tên người (theo luật i18n: không dịch tên người). Xưng hô VI: "cô Mây"; EN: "May".
- **Hình:** đầu tròn + thân quả lê, ngực sáng, cánh đậm; kính tròn hai mắt; chỏm ba sợi lông; mỏ dẹt nhỏ; dây đeo màu caramel (nối với Bin) + thẻ "Mentor"; cầm máy tính bảng (tư thế chờ) hoặc que chỉ (tư thế chỉ).
- **Bảng màu:** lông `#7CC3CF`, cánh `#3F8F9E`, ngực `#E3F4F6`, mỏ/chân `#F2B544`, mực `#2A2320`, dây thẻ `#D98E4A`.

### 1.4 Sáu tư thế và quy tắc dùng

Mỗi tư thế là một `<symbol viewBox="0 0 120 120">` dựng từ các phần dùng chung (`<use>`): thân, đầu, mắt, tay/cánh riêng theo tư thế. Toàn bộ 12 tư thế trong mockup là **~12 KB SVG chưa nén, ~2,5 KB gzip** (đo trên khối `<defs>` của mockup), không cần ảnh.

| Tư thế | Bin dùng khi | Mây dùng khi |
|---|---|---|
| Chờ (idle) | trên logo, thẻ Tiếp tục, đuôi vẫy | bài học nhanh, thẻ Ôn tập |
| Chỉ (pointing) | "việc tiếp theo ở đây" | **tour**, chỉ vào nút/vùng |
| Reo (cheering) | nộp đúng, xong chương | lên chương (cùng Bin) |
| Nghĩ (thinking) | đang chạy query > 400 ms | **gợi ý** bậc 1–3 |
| Ối (oops) | lỗi SQL, sai kết quả | lỗi do tải DB/timeout (giải thích) |
| Ngủ (sleeping) | màn chào lúc DB tải, trạng thái rỗng | Chế độ nghỉ ở cảnh Chung (ban đêm, trang trí) |

Quy tắc:
1. **Tối đa một linh vật mỗi vùng**, không bao giờ che đề, editor, kết quả hay nút.
2. Linh vật là **trang trí**: `aria-hidden="true"`; thông tin luôn nằm trong chữ bên cạnh (bong bóng có `role="status"` khi là thông báo). Riêng hình lớn đứng một mình (màn chào) có `role="img"` + `aria-label`.
3. Bậc gợi ý cuối (đáp án) **không** có linh vật (giữ cảm giác nghiêm túc khi xem đáp án, v4).
4. Kích thước: 48 px (dòng), 64 px (thẻ), 96–112 px (bong bóng tour/màn chào). Nét tối thiểu 2 px ở 48 px.
5. Thêm tư thế mới = thêm một `<symbol>` trong `src/ui/mascots.ts` (dùng `s()` của `svg.ts`), không thêm file ảnh.

### 1.5 Phương án tên brand (dẫn từ cặp đôi)

Tra cứu là **tìm web**, không phải tra nhãn hiệu tại USPTO/Cục SHTT; tên miền **chưa kiểm**.

| # | Tên | Ý nghĩa | VI / EN | Tagline VI / EN | Rủi ro (tìm web) |
|---|---|---|---|---|---|
| A ★ | **Truy** · *cùng Bin & Mây* | Giữ tên v5 ("truy vấn", EN gần "try"); cặp linh vật là gương mặt, không phải tên | Tự nhiên / dễ | *Truy vấn như đi làm thật.* / *Try it on real data.* · phụ: *Bin học, Mây dẫn.* / *Bin learns, May guides.* | v5 §A.2: không thấy app trùng "Truy"/"truyvan". Từ thường, khó bảo hộ riêng chữ → lockup có linh vật giúp nhận diện. |
| B | **Bin & Mây** | Tên cặp đôi làm brand | Rất thân / đọc được | *Cùng Bin và Mây học dữ liệu.* / *Learn data with Bin & May.* | Không thấy app "Bin & Mây"/"BinMay". EN "bin" = thùng rác; "&" khó trong URL/tên miền. |
| C | **Ao Data** | "Ao" là nhà của Mây; nháy "data lake" cỡ nhỏ | Dễ / "ow" lạ | *Ao nhỏ, dữ liệu thật.* / *A small pond of real data.* | Không thấy app trùng. Nửa Việt nửa Anh; "ao" không gợi SQL. |
| D | **Gâu Quạc** | Tiếng kêu hai bạn | Rất vui / người Anh khó đọc | *Gâu gâu, quạc quạc, SQL chạy ngon.* | Không thấy trùng; mất dấu thành "Gau Quac"; "quạc" gợi Donald → nghiêng về loại. |
| E | ~~Puddle / Vũng~~ | chó + vịt đều mê vũng nước; "data puddle" | — | — | **Loại**: đã có app **Puddle** (theo dõi đi vệ sinh của chó con), trùng đúng chủ đề chó; nhãn PUDDLE cũ ở nhóm 9 (đã hủy) và PUDDLE PADS mới nộp 2026. |
| F | ~~DuckDog / Pawquery~~ | ghép tên loài | — | — | **Loại**: hướng dẫn nhãn hiệu DuckDB cấm tên phái sinh từ "Duck" cho phần mềm liên quan/cạnh tranh DuckDB (ta là học SQL, cùng ngành dữ liệu). "Paw-" quá chung. |

**Khuyến nghị: A.** Lý do: (1) "Truy" đã được đề xuất ở v5 và vẫn chưa ra mắt (`index.html` còn `<title>Cargo Query</title>`), nên không phải đổi lần hai; (2) tên sản phẩm ngắn, nói đúng việc; cặp linh vật mang phần "cute" và có thể thay/thêm nhân vật sau mà không đổi brand; (3) B/C/D yếu ở tiếng Anh hoặc URL. Nếu user muốn brand **là** cặp đôi thì chọn B, giữ wordmark `Bin & Mây`.
Phạm vi đổi tên giữ như v5 §A.4 (chỉ hiển thị; khóa `cargo-query*`, repo, URL, "Cargo Query Logistics" giữ nguyên).

---

## 2. UI cute hơn mà vẫn đạt WCAG AA

### 2.1 Nguyên tắc

- **Tròn**: thẻ 20 px, nút/ô nhập 14 px, nút chính dạng viên thuốc (999 px) có "bậc" 3 px (đè xuống 2 px khi bấm). Ảnh/cảnh 20–28 px.
- **Ấm và nhẹ**: nền kem thay xám, bóng mềm 1 lớp thay viền xám ở theme sáng; theme tối dùng viền 1 px thay bóng.
- **Ít hộp**: một thẻ chỉ có **một** tiêu đề, **một** dòng phụ, **một** hành động chính. Không lồng thẻ trong thẻ; danh sách dùng đường kẻ mảnh giữa dòng thay vì mỗi dòng một hộp.
- **Font**: Nunito (Google Fonts, OFL 1.1, có đủ dấu tiếng Việt) cho chữ UI; editor giữ font mono hiện tại. Tự host qua `@fontsource/nunito` (OFL) khi build để khỏi gọi Google lúc chạy (v6 mockup dùng link Google cho nhanh). Nếu không muốn thêm font: giữ `system-ui`, chỉ đổi màu/bo góc (quyết định **D-U2**).

### 2.2 Token (thay `:root` trong `src/style.css`, giữ tên biến hiện có)

| Token | Sáng | Tối | Ghi chú |
|---|---|---|---|
| `--bg` | `#FBF7F0` | `#1A1714` | kem / nâu đen ấm |
| `--panel` | `#FFFFFF` | `#25201C` | |
| `--text` | `#2A2320` | `#F3ECE4` | |
| `--muted` | `#6B5F57` | `#B9AB9C` | |
| `--border` | `#E8DFD3` | `#3E362F` | chỉ trang trí, không mang thông tin |
| `--accent` | `#0F766E` | `#5ED3C3` | xanh ngọc (màu Mây/khăn Bin) |
| `--accent-soft` | `#DCF2EE` | `#16332F` | nền mục đang chọn |
| `--on-accent` | `#FFFFFF` | `#0B2522` | |
| `--good` / `--bad` / `--warn` | `#1A7F37` / `#B42318` / `#9A4F00` | `#6BD58A` / `#FF8A7A` / `#FFC067` | |
| `--code` | `#F4EEE5` | `#2E2823` | |
| mới `--sun` / `--sun-ink` | `#FFE9BD` / `#5C3D00` | `#4A3A17` / `#FFE2A3` | bong bóng lời của Mây, XP |
| mới `--bin-*`, `--may-*`, `--cheek`, `--sky`, `--ground` | §1.2–1.3 | bản dịu | chỉ cho SVG |
| mới `--r-card` / `--r-ctl` | 20 px / 14 px | | |

`--syn-*` (màu cú pháp L13) **giữ nguyên**; chỉ kiểm lại trên `--panel`/`--code` mới (`--code` sáng hơi ấm hơn, cần chạy lại phép đo L13 khi build).
Màu chương (`chapterColor`) giữ nguyên.

### 2.3 Độ tương phản (tính bằng script, công thức WCAG 2.x)

| Cặp | Sáng | Tối |
|---|---|---|
| text / panel · bg | 15,44 · 14,46 | 13,77 · 15,24 |
| muted / panel · bg · code · accent-soft | 6,18 · 5,78 · 5,36 · 5,29 | 7,19 · 7,96 · 6,49 · 6,05 |
| accent / panel · bg | 5,47 · 5,13 | 8,90 · 9,84 |
| on-accent / accent (nút chính) | 5,47 | 8,90 |
| good · bad · warn / panel | 5,08 · 6,57 · 6,01 | 8,84 · 7,04 · 9,97 |
| sun-ink / sun (bong bóng) | 8,31 | 8,73 |

Tất cả ≥ 4,5:1 (chữ thường). Màu linh vật không bao giờ làm màu chữ. Trạng thái không chỉ dựa vào màu (✓, số, khóa 🔒 + chữ; giữ L23).

### 2.4 Khoảnh khắc linh vật

| Chỗ | Ai, tư thế | Chữ (VI, EN cùng ý) | Ghi chú |
|---|---|---|---|
| Màn chào lúc tải DB (v4 lớp 1) | Bin **ngủ** → **chờ** khi DB sẵn sàng | "Chào bạn! Mình là Bin…" | Thanh tải giữ nguyên `countingFetch` |
| Tour 8 bước (v4 lớp 2) | Mây **chỉ** | đúng 8 câu v4 §B.2 | Bong bóng đặt **trong vùng** (giữ quy tắc v4 + `coach.ts`), Esc bỏ qua |
| Trạng thái rỗng (Bảng điều hành, Dữ liệu của tôi, Lịch sử) | Bin **ngủ** | một câu + một nút | Thay hình rỗng v4 §B.3 |
| Gợi ý bậc 1–3 | Mây **nghĩ** | chữ gợi ý hiện có | Bậc đáp án: không linh vật |
| Lỗi SQL | Bin **ối** + chữ giải thích của `sqlErrors.ts` | không đổi chữ | Lỗi Postgres giữ nguyên tiếng Anh |
| Timeout / DB khởi động lại | Mây **ối** | `errorText()` hiện có | |
| Nộp đúng | Bin **reo** + "+XP" (`pop`) | hiện có | Không thêm âm thanh |
| Lên chương | Bin + Mây **reo** | thay màn thăng tiến 3 s (L32) | Một lần mỗi chương |
| Domain "Sắp có" | Mây **chờ** trong cảnh của domain | v5 §B.6 | |

### 2.5 Micro-animation

- Đuôi Bin vẫy 0,9 s, thân nhấp nhô 2,4 s, chớp mắt mỗi 4 s (chỉ ở linh vật lớn, không ở 48 px trong danh sách), bong bóng `pop` 450 ms (đã có `--animate-pop`), "z" bay khi ngủ, sóng nước trong cảnh cảng (đã có ambient).
- Chỉ `transform` và `opacity`; không animation vô hạn trong vùng làm bài (editor, kết quả).
- `prefers-reduced-motion: reduce` → tắt **mọi** keyframe và transition (một khối CSS toàn cục, như mockup), `stage.ts` đã nhảy thẳng tới trạng thái cuối qua `reducedMotion()`. L35: không có công tắc riêng trong app (theo hệ điều hành); mockup có nút giả lập chỉ để duyệt.

---

## 3. Layout: nav trái và lưới từng route

### 3.1 Khung chung

```
┌──────────────── Thanh trên 56 px ───────────────────────────────────────────────┐
│ [Bin] truy_  Trang chủ · Lộ trình · Luyện SQL  [⚓ Logistics ▾]   ★XP Ôn tập VI|EN ☀ ⋯ │
├──────────┬──────────────────────────────────────────────────────────────────────┤
│ Sidebar  │  Nội dung                                                            │
│ 256 / 64 │  (trang đọc: max 880–1120 px, căn giữa; Làm việc: full, 3 khung)       │
└──────────┴──────────────────────────────────────────────────────────────────────┘
```

- **Thay v5 "hàng 2"**: các mục domain (`Tổng quan · Làm việc · Sandbox · Dữ liệu · Bảng điều hành`) chuyển vào sidebar; trạng thái "Ch. n/12 · bậc nghề" lên thanh trên (chỉ trong domain) và đầu sidebar. Thanh trên chỉ còn nav cấp 1 → hết cảnh "chữ và nút liền nhau" của L42.
- Sidebar = `<nav aria-label="…">` với danh sách `<a>`; mục đang ở có `aria-current="page"` + vạch trái 4 px + nền `--accent-soft` (không chỉ màu).

### 3.2 Hành vi theo bề rộng

| Bề rộng | Trang đọc (Trang chủ, Lộ trình, Luyện SQL, Tổng quan, Dữ liệu, Bảng điều hành) | Làm việc / Sandbox / drill |
|---|---|---|
| ≥ 1280 px | Sidebar **mở** 256 px | Sidebar **rail** 64 px (icon + tooltip + `aria-label`); » mở **đè** (overlay), không đẩy khung splitter |
| 1024–1279 px | Rail 64 px; » mở đè | Rail 64 px |
| < 1024 px | **Ngăn kéo** từ trái (290 px, `role="dialog"`, `aria-modal`, bẫy focus, Esc/chạm nền mờ đóng, trả focus về nút ☰) + **thanh dưới 4 mục** (Trang chủ · Lộ trình · Luyện SQL · domain hiện tại) | như cột trái |

- Trạng thái thu/mở là pref thiết bị mới `cargo-query/sidebar` (`'open' | 'rail'`), đọc bằng `readJson` + validate (như `parseLayout`), không vào Save.
- Splitter (`initLayout`) đo lại khi rail ↔ mở; overlay không đổi kích thước khung nên không cần đo.
- **Mobile thay v5 §B.2**: v5 có thanh dưới 3 nút + nút "Domain"; v6 giữ thanh dưới 4 mục (mục 4 = domain đang chọn) **và** thêm ngăn kéo cho nav cấp 2. Nút đổi domain nằm đầu ngăn kéo. Vùng chạm ≥ 44 px.

### 3.3 Nội dung sidebar theo route

| Route | Sidebar | Lưới nội dung |
|---|---|---|
| Trang chủ `#/` | **Không có** sidebar (trang ngắn, một cột 880 px) | Tiếp tục → Hôm nay → Domain → Kỹ năng (v5 §B.5) |
| Lộ trình `#/learn…` | **SQL nền tảng**: 12 module (chấm trạng thái + "đang học · 2/4"); **DA nâng cao**: nhóm A–D (khóa + lý do) | 880 px: bong bóng Mây "bài tiếp theo" → danh sách kỹ năng của module (mỗi dòng: số/✓ · tên · một dòng phụ · một hành động) → "Áp dụng ở Logistics ch n" |
| Luyện SQL `#/practice` | **Hôm nay** (ôn đến hạn, n) · **Kỹ năng theo module** (38, nhóm thu gọn) · ô tìm | 880 px: thẻ ôn hôm nay → drill gợi ý → danh sách drill của kỹ năng đang chọn |
| Domain `#/d/logistics/*` | **Tổng quan · Làm việc · Sandbox · Dữ liệu · Bảng điều hành · Bản đồ** (mục mới `#/d/logistics/map`, tách bản đồ khỏi Tổng quan); phần dưới đổi theo trang: Làm việc → các việc của chương hiện tại; Dữ liệu → danh sách bảng | Tổng quan 1120 px: cảnh hero → Tiếp tục → chương; Làm việc: 3 khung như hiện tại |
| Dữ liệu `#/d/<d>/data` | Như domain, phần dưới = **bảng** nhóm theo chương mở, ô tìm cột | Khung phải: ER + cột của bảng chọn (ui-ux-v4 §5, bỏ danh sách bảng khỏi nội dung) |
| Domain "Sắp có" | Chỉ Tổng quan | Cảnh của domain + v5 §B.6 |

- Khóa mềm theo tiến độ (v4 D-O3) áp vào mục sidebar: hiện, có 🔒 + tooltip, không ẩn.
- Thanh điều hướng việc của ui-ux-v4 §2 (‹ Việc 3/5 ›, chọn chương) **giữ** ở đầu khung đề; danh sách việc trong sidebar là lối thứ hai, không thay.

### 3.4 Danh sách "thở" (thay chồng div/chip)

- Mỗi dòng: icon/trạng thái 40 px · tên (đậm) · **một** dòng phụ màu `--muted` · **một** hành động bên phải. Không quá 1 chip mỗi dòng.
- Khoảng cách dòng 16 px dọc, 20 px ngang; nhóm cách nhau 40 px; tiêu đề nhóm là chữ hoa nhỏ `--muted`.
- Thẻ chương ở Tổng quan (L47 mục 6): giữ bố cục cố định, bỏ hàng chip kỹ năng → thay bằng một dòng "Dựa vào: Lọc dòng, Sắp xếp +2" (chữ thường, có link).

---

## 4. Kiến trúc dữ liệu: mỗi domain một schema

### 4.1 Hiện trạng (đã đọc code)

- 26 bảng Logistics tạo trong `public` (`schema.sql` + `seed.sql`, seed trong chunk worker qua `?raw`).
- `SANDBOX_SETUP_SQL` đặt `search_path = public, sandbox` **ở mức phiên**; bảng import nằm ở `sandbox`.
- Truy vấn người chơi chạy trong `runSandboxed` (`BEGIN → query → ROLLBACK`); `runExplain`, `runLab` cũng vậy.
- `'public'` viết cứng ở: `erMeta('public')` (`brief.ts`, `dataView.ts`, `vizTabs.ts`), `main.ts:100` (autocomplete), `myData.ts` (`GAME_TABLES_SQL`, kiểm trùng tên I7), test `erd.test.ts`, `glossary.test.ts`, `import.test.ts` (kỳ vọng `public, sandbox`).
- Ticket/Solution, `content/` và `seed.sql`: **không** có chữ `public.` hay `search_path` (đã grep) → dùng tên bảng trần.

### 4.2 Hai phương án

| Tiêu chí | **A. Một PGlite, nhiều schema** | B. Một PGlite cho mỗi domain |
|---|---|---|
| Bộ nhớ (đo Node, PGlite 0.5.16) | +0 instance; schema thêm chỉ tốn dữ liệu của nó | Instance rỗng **+282 MB** RSS; instance thứ hai đã seed **+373 MB**. Edge đã ~520 MB với một DB (L39) |
| Khởi động | Một lần tải wasm/initdb; domain thêm = chỉ seed | Mỗi domain một lần khởi động (~1 s rỗng trong Node, trình duyệt chậm hơn nhiều, L46) |
| Trùng tên bảng | Không (schema tách) | Không |
| Timeout 5 s (kill worker) | Worker mới seed lại các schema đã dùng | Chỉ worker của domain đó |
| Code | `search_path` theo request; `DbClient` giữ nguyên | Nhiều `DbClient`, hàng đợi, nhiều worker; import sandbox nhân đôi |
| Truy vấn chéo domain | Có thể (không cần) | Không |

**Khuyến nghị: A.** B tốn bộ nhớ gấp đôi trên máy học viên (thường laptop yếu) và nhân đôi phần worker mà không có lợi gì người chơi thấy được.

### 4.3 Đã chạy thử (Node, `@electric-sql/pglite` 0.5.16 bản pin)

```
CREATE SCHEMA logistics; SET search_path = logistics;   -- rồi exec schema.sql + seed.sql không sửa
```
- 26/26 bảng nằm trong `logistics`, `public` rỗng.
- **md5 của cả 26 bảng trùng** với bản seed vào `public` (`row::text` không chứa tên schema) → `tests/seed.test.ts` không đổi giá trị pin.
- Thời gian seed như cũ (2,6 s vs 2,8 s trong lần đo đó; nhiễu).
- Schema thứ hai cùng tên bảng (`finance.customers`): `BEGIN; SET LOCAL search_path = finance, pg_catalog` trả bảng finance; sau `ROLLBACK` quay về `logistics` (200 khách).
- Bẫy: `indrelid::regclass::text` trả `logistics.shipments` khi `search_path` **không** chứa `logistics`, trả `shipments` khi có. `runLab` so `added[0].tbl !== table` → phải đặt `search_path` trong transaction của lab trước khi so.

### 4.4 Thiết kế

1. **Schema**: `logistics` (26 bảng hiện có), `lab` (drill Chung, v5 §C.1 — **thay** "Logistics giữ ở `public`" của v5 D-G1), sau này `finance`, `ecom`; `sandbox` giữ cho import. `public` để trống.
2. **Seed**: `initDb(db, domains)` chạy `CREATE SCHEMA <d>; SET search_path = <d>;` rồi `schema.sql` + `seed.sql` của domain; không sửa file SQL nào (luật seed nối cuối và `setseed()` giữ nguyên; mỗi domain một file seed riêng có `setseed()` riêng).
3. **search_path theo request**: `runSandboxed(db, sql, { schema })` → `BEGIN; SET LOCAL search_path TO <schema>[, sandbox]; …; ROLLBACK`. `sandbox` chỉ thêm ở trang Sandbox (I4). Tên schema lấy từ danh sách hằng `DOMAINS` (không bao giờ từ input người chơi). `runExplain`, `runLab` nhận cùng tham số. Người chơi tự `set_config('search_path', …)` vẫn bị rollback (đã có test).
4. **Seed lười**: worker giữ `Set` schema đã seed; message mới `ensure(schema)` seed nếu chưa có. Lúc mở trang: seed domain gần nhất (`cargo-query/domain`, mặc định `logistics`) + `lab` khi `lab` có thật. Seed mỗi domain thành **chunk lười** (`import('./seeds/logistics.sql?raw')`) → thêm nhóm ngân sách `seed-*` trong `check-budget.mjs`, nhóm `worker` nhỏ lại tương ứng.
5. **Timeout/khởi động lại**: `DbClient` nhớ danh sách schema đã `ensure` và gửi lại cho worker mới trước query kế tiếp.
6. **Metadata**: `erMeta(schema)` nhận schema của domain hiện tại; `main.ts` autocomplete và `myData.ts` đọc `table_schema = <domain>`.
7. **SQL đã lưu có `public.`** (card dashboard, nháp): hiếm, nhưng sẽ báo 42P01. Thêm một mẫu trong `sqlErrors.ts`: thông điệp chứa `"public.` → "Bảng giờ nằm trong schema `logistics`; bỏ tiền tố `public.`". Không migrate Save.

### 4.5 Kế hoạch chuyển (2 bước, mỗi bước xanh test)

| Bước | Việc | Rủi ro |
|---|---|---|
| **S1** (1 ngày) | `initDb`: tạo `logistics` + `SET search_path` trước khi seed; đổi `SANDBOX_SETUP_SQL` thành `logistics, sandbox`; đổi 6 chỗ `'public'` (code) + 3 test; `seed.test.ts` không đổi pin; thêm test "public rỗng, 26 bảng ở logistics". Hành vi người chơi không đổi. | Thấp: tên bảng trần vẫn chạy nhờ `search_path` phiên |
| **S2** (2 ngày, khi `lab` có thật — v5 N2) | `search_path` theo request + seed lười + chunk seed + `ensure` khi restart + ngân sách | Trung bình: đường timeout/restart cần test |

Tác động thời gian seed: **người vào thẳng Logistics không nhanh hơn** (vẫn seed 26 bảng); lợi ích đến khi (a) người chọn "Luyện SQL trước" chỉ cần seed `lab` (~15k dòng, nhỏ), (b) có domain thứ hai: không bao giờ seed domain người chơi chưa mở.

---

## 5. Cảnh và bản đồ theo domain

### 5.1 Hợp đồng `DomainArt`

```ts
// src/domains.ts (v5 N1) thêm một trường lười cho mỗi domain
interface DomainArt {
  /** Cảnh hero của Tổng quan (và cảnh nhỏ trong dock hoạt cảnh nếu domain có). */
  scene(state: DomainState, opts: { ambient: boolean; crop?: boolean }): { svg: SVGSVGElement; label: string };
  /** Mô hình bản đồ: nút + cạnh + chương mở; vẽ bằng bộ vẽ chung flowMap(). */
  map(state: DomainState): MapModel;
  /** Màu nền cảnh, dùng biến CSS (--sky, --ground) để theo theme. */
}
interface MapModel {
  nodes: { id: string; x: number; y: number; label: string; kind: 'hub' | 'stop' }[];
  edges: { from: string; to: string; d: string; open: boolean; weight?: number; color: string }[];
  backdrop?: (g: SVGGElement) => void;   // đất liền / lưới phố / không có
  describe: string;                      // mô tả cho trình đọc màn hình (như routeItems)
}
const DOMAINS = [{ id: 'logistics', art: () => import('./art/logistics') }, …];
```

- **Logistics**: `art/logistics.ts` bọc `harborScene` và chuyển `ROUTES` của `routeMap.ts` sang `MapModel`. Hoạt cảnh cẩu/tàu (`stage.ts`) vẫn dùng `HarborParts` trực tiếp: phần **animate riêng của domain không vào hợp đồng chung** (YAGNI; domain khác chưa có hoạt cảnh).
- **Chung**: "bàn học" (đồi cỏ, laptop có biểu đồ cột, Bin chỉ, Mây đứng); bản đồ = đường cong qua 12 module, đoạn đã đi tô `--accent`.
- **Finance**: phố tài chính (tòa ngân hàng có cột, nhà cao tầng, đường tăng trưởng nét đứt trên trời, chồng xu); bản đồ **dòng tiền**: Doanh thu → Quỹ → Lương / Nhà cung cấp / Đầu tư; độ dày cạnh = số tiền (`weight`), cạnh khóa nét đứt + 🔒.
- **E-commerce**: kho cửa cuốn, thùng hàng, cửa hàng mái hiên sọc, Bin reo; bản đồ **giao hàng**: Kho → các quận theo lưới phố.
- Mỗi cảnh ≤ ~6 KB SVG, chỉ hình cơ bản, màu qua biến CSS, chữ trong SVG ẩn dưới `lg` như L35 (danh sách HTML thay thế).
- Domain "Sắp có" chỉ cần `scene` (bản đồ khóa toàn bộ).

---

## 6. Thư viện animation 2D và tài nguyên

### 6.1 So sánh

| Lựa chọn | Giấy phép | Kích thước (gzip) | Vite | Reduced-motion | Công vẽ | Kết luận |
|---|---|---|---|---|---|---|
| **CSS keyframes + WAAPI + `tween()` có sẵn** | — | **0 KB** | sẵn | `@media` + `reducedMotion()` đã có trong `dom.ts`/`stage.ts` | Thấp: animate từng phần SVG tự vẽ | **Chọn** |
| Motion (`motion`, bản "mini" `animate`) | MIT | ~2,6 KB mini; ~18 KB bản đầy đủ (theo motion.dev) | ESM, tree-shake | tự kiểm `matchMedia` | Thấp | **Dự phòng** khi cần chuỗi/spring phức tạp; lazy |
| lottie-web (`lottie_light`) | MIT | ~50 KB (số bên thứ ba, chưa đo) + JSON mỗi hoạt cảnh | được | phải tự dừng | Cao: cần After Effects/Lottie editor | Chỉ nếu dùng hoạt cảnh LottieFiles có sẵn; hiện không cần |
| @lottiefiles/dotlottie-web | MIT | ~35 KB JS + **~500 KB wasm** tải từ CDN | được | tự xử lý | Cao | Loại (wasm lớn, tải từ CDN ngoài) |
| Rive (`@rive-app/canvas-lite`) | Runtime MIT; **editor là dịch vụ trả phí/freemium** | ~44 KB JS + **~261 KB wasm** (brotli) | được | tự xử lý | Cao, khóa vào editor Rive | Loại cho giờ; xem lại nếu cần linh vật có xương/state machine |
| GSAP 3 | **"Standard No Charge License" của Webflow**: miễn phí cả thương mại nhưng **không phải giấy phép mã nguồn mở (OSI)**, Webflow có quyền chấm dứt, cấm dùng cho công cụ dựng animation không cần code cạnh tranh Webflow | ~25 KB core | được | `gsap.matchMedia` | Thấp | **Không dùng**: repo public muốn phụ thuộc giấy phép mở rõ ràng |

Lý do chọn CSS/WAAPI: linh vật vẽ bằng SVG nhiều phần, animation cần (vẫy đuôi, nhấp nhô, chớp mắt, pop, z bay) đều là `transform` lặp đơn giản; `stage.ts` đã có `tween()` + `reducedMotion()` cho hoạt cảnh dài. Main bundle đang sát ngân sách (≈254/270 KB, L43/L55), không nên thêm thư viện cho thứ CSS làm được.

### 6.2 Tài nguyên có giấy phép

| Nguồn | Giấy phép | Điều kiện | Dùng? |
|---|---|---|---|
| **SVG tự vẽ** (linh vật, cảnh) | của dự án | Repo **chưa có file LICENSE** → cần chọn giấy phép cho code và cho hình linh vật (**D-A3**) | **Mặc định** |
| Kenney (kenney.nl) | CC0 1.0 | Không cần ghi công | Có, nếu cần icon/đồ vật |
| OpenMoji | CC BY-SA 4.0 | **Phải ghi công**; tác phẩm phái sinh (sửa emoji) phải cùng CC BY-SA | Tránh trong UI chính; nếu dùng: file `ATTRIBUTION.md` + chú thích trong "Giới thiệu" |
| LottieFiles (free) | Lottie Simple License | Dùng thương mại được, ghi công khuyến khích; cấm gom để dựng dịch vụ tương tự; **kiểm từng hoạt cảnh** (một số theo CC riêng) | Chưa cần (không dùng Lottie) |
| unDraw | unDraw License | Miễn phí, không cần ghi công, nhưng **cấm phân phối lại "theo gói hoặc cách khác"** và cấm dùng để huấn luyện AI | **Không** commit vào repo public |
| Ảnh web bất kỳ, Snoopy/Donald, fan art | không rõ / có bản quyền | — | **Không bao giờ** |

Nunito (font): SIL Open Font License 1.1.

---

## 7. Kế hoạch theo pha

| Pha | Nội dung | Effort | Phụ thuộc |
|---|---|---|---|
| **F1 · Schema `logistics` (S1)** | §4.5 S1; không đổi hành vi | **S** (1 ngày) | không; làm được ngay khi agent `content/` xong |
| **F2 · Token + linh vật + brand** | token §2.2 trong `style.css` (giữ tên biến), đo lại `--syn-*`; `src/ui/mascots.ts` (12 `<symbol>`, hàm `mascot(name, pose, cls)`), wordmark `truy_` + Bin, favicon Bin; i18n tên | **M** (2–3 ngày) | D-M1, D-B1 |
| **F3 · Khung sidebar** | `ui/sidebar.ts` (cấu hình mục theo route), rail/mở/drawer, pref `cargo-query/sidebar`, thanh dưới mobile, bỏ "hàng 2" v5; route `#/d/logistics/map` | **M–L** (3–4 ngày) | v5 N1 (route lồng); làm **chung** với N1 |
| **F4 · Khoảnh khắc linh vật** | §2.4: màn chào, tour (v4 P2 với Mây), rỗng, gợi ý, lỗi, đúng, lên chương; CSS animation + reduced-motion | **M** (2–3 ngày) | F2, F3, v4 P2 |
| **F5 · Danh sách thở + bo tròn** | duyệt từng trang theo §3.4; review UX độc lập theo L55 | **M** (2 ngày) | F3 |
| **F6 · `DomainArt` + cảnh Chung** | hợp đồng §5.1, `flowMap()` chung, Logistics bọc code cũ, cảnh + bản đồ Chung | **M** (2–3 ngày) | F3, v5 N3 (Lộ trình) |
| **F7 · Seed lười (S2)** | §4.5 S2 | **M** (2 ngày) | `lab` (v5 N2) |
| **F8 · Cảnh Finance / E-com** | khi domain đó vào làm (v5 N6); trước đó chỉ cảnh "Sắp có" (0,5 ngày mỗi cảnh) | S–M | F6 |

Thứ tự đề xuất: **F1 → F2 → (v5 N1 + F3) → v4 P2 + F4 → F5 → v5 N2 + F7 → v5 N3 + F6 → F8**. Nền móng = F1, F2, F3 (đúng như L56 nói: linh vật + brand + layout + tách schema).

## 8. Rủi ro

| Rủi ro | Giảm thiểu |
|---|---|
| Linh vật vẫn bị thấy "giống" nhân vật nổi tiếng | Bảng §1.1 làm checklist review; cho 3–5 người xem mockup hỏi "giống ai?" trước khi build |
| "Cute" làm nhiễu, người học thấy trẻ con | Quy tắc §1.4 (một linh vật mỗi vùng, không trong editor/kết quả); tắt linh vật ở bậc đáp án; trang Làm việc giữ tông nghề |
| Thanh trên + sidebar + thanh việc = 3 tầng điều hướng | Sidebar rail mặc định ở Làm việc; tour chỉ một đường; buổi thử 5 người (v4 §B.6) có câu hỏi về sidebar |
| Font web làm chậm lần tải đầu | Tự host 2 độ đậm, `font-display: swap`; hoặc D-U2 = system-ui |
| Đổi token làm lệch màu cú pháp/biểu đồ | Đo lại L13 trên nền mới; màu chương không đổi |
| `search_path` sai làm query chạy nhầm schema | Tên schema chỉ từ hằng `DOMAINS`; test: cùng tên bảng ở 2 schema trả đúng bảng; `runLab` đặt path trước khi so `regclass` |
| Restart sau timeout quên seed schema đã mở | `DbClient` gửi lại `ensure`; test đường restart |
| Repo chưa có LICENSE | Quyết định D-A3 trước khi công bố linh vật |

## 9. Quyết định cũ bị v6 thay

| Cũ | v6 |
|---|---|
| v5 §B.2 "hàng 2" của domain | Sidebar trái (§3) |
| v5 §B.2 mobile thanh dưới 3 nút + "Domain" | Thanh dưới 4 mục + ngăn kéo |
| v5 §C.1 / D-G1 "Logistics vẫn ở `public`, `lab` là schema thêm" | Mỗi domain một schema: `logistics`, `lab`, …; `public` trống |
| v5 §E.1 "DB thứ hai = worker thứ hai + 10–13 s" (chưa đo) | Đo: instance thứ hai +~370 MB RSS, khởi động rỗng ~1 s trong Node; vẫn kết luận không dùng |
| v5 §A.3 icon vuông `t_` | Logo = Bin (tư thế chờ) cạnh chữ `truy_` |
| L32 màn thăng tiến 3 s | Giữ thời lượng, thêm Bin + Mây reo |
| `style.css` token xám-xanh | Token ấm §2.2 (giữ tên biến) |

---

## 10. Quyết định cho user (mặc định in đậm)

**Linh vật và brand**
- **D-M1.** Cặp linh vật gốc **Bin** (chó cỏ caramel) + **cô Mây** (vịt trời xanh ngọc, kính tròn) theo mockup v9? **(có)**
- **D-M2.** Vai: **Mây = dẫn tour, gợi ý, bài học, giải thích lỗi; Bin = phản ánh trạng thái người học**? **(có)**
- **D-B1 (thay v5).** Brand: **A · "Truy" + lockup "cùng Bin & Mây"** / B · "Bin & Mây" / C · "Ao Data" / D · "Gâu Quạc"?

**UI**
- **D-U1.** Token màu ấm §2.2 (nền kem, accent xanh ngọc), bo 20/14/999? **(có)**
- **D-U2.** Font **Nunito tự host** (OFL) / giữ system-ui?
- **D-U3.** Khoảnh khắc linh vật §2.4, **không** có ở bậc gợi ý đáp án và trong editor/kết quả? **(có)**

**Layout**
- **D-L1.** Sidebar trái thay "hàng 2" v5; Trang chủ **không** có sidebar; Làm việc mặc định **rail**? **(có)**
- **D-L2.** Mobile: **thanh dưới 4 mục + ngăn kéo**? **(có)**
- **D-L3.** Thêm mục **Bản đồ** riêng trong domain (`#/d/logistics/map`)? **(có)**

**Dữ liệu**
- **D-DB1.** **Một PGlite, mỗi domain một schema** (`logistics`, `lab`, …), `public` trống? **(có)**
- **D-DB2.** **S1 làm ngay** (đổi schema, không đổi hành vi); **S2** (search_path theo request + seed lười) làm cùng `lab`? **(có)**

**Cảnh**
- **D-S1.** Hợp đồng `DomainArt` + bộ vẽ bản đồ chung; Finance = **dòng tiền**, E-com = **giao hàng**? **(có)**

**Animation và tài nguyên**
- **D-A1.** **CSS/WAAPI + `tween()` có sẵn**; Motion mini chỉ khi cần; không GSAP/Rive/Lottie? **(có)**
- **D-A2.** Chỉ **SVG tự vẽ + CC0 (Kenney)**; không unDraw trong repo; OpenMoji chỉ khi có file ghi công? **(có)**
- **D-A3.** Giấy phép repo: đề xuất **MIT cho code + CC BY 4.0 cho hình linh vật/cảnh** (người khác dùng lại được, phải ghi công) / giữ "mọi quyền" cho linh vật?

**Thứ tự**
- **D-E1.** **F1 → F2 → (N1 + F3) → (P2 + F4) → F5 → (N2 + F7) → (N3 + F6) → F8**?

---

## 11. Nguồn và cách kiểm

| Nguồn | Kiểm gì | Dùng ở |
|---|---|---|
| Spike Node (script trong scratchpad, PGlite 0.5.16 của `node_modules`) | seed vào `logistics`, md5 26 bảng, RSS 1 vs 2 instance, `SET LOCAL search_path`, `regclass` ngoài path | §4.2–4.3 |
| Grep repo | `'public'`, `search_path`, `information_schema` trong `src/`, `tests/`, `content/` | §4.1 |
| Script độ tương phản (công thức WCAG 2.x) | 15 cặp × 2 theme | §2.3 |
| Chrome (mockup qua http://localhost:53388/) | 7 màn, sáng/tối, đổi domain, 375 px | mockup |
| GSAP Standard License: https://gsap.com/community/standard-license/ ; Webflow: https://webflow.com/blog/gsap-becomes-free | Restrictions (Prohibited Uses, Competitive Products), có quyền chấm dứt, không phải OSI | §6.1 |
| Rive: https://rive.app/docs/runtimes/web/canvas-vs-webgl ; https://depscope.dev/pkg/npm/%40rive-app/canvas-lite | runtime MIT, wasm ~261 KB brotli, canvas-lite ~44 KB gzip (số bên thứ ba) | §6.1 |
| dotLottie: https://www.npmjs.com/package/@lottiefiles/dotlottie-web ; https://unpkg.com/@lottiefiles/dotlottie-web@0.81.0/README.md | MIT, wasm ~500 KB tải từ CDN | §6.1 |
| Motion: https://motion.dev/docs/feature-comparison | MIT, mini ~2,6 KB, hybrid ~18 KB | §6.1 |
| LottieFiles: https://help.lottiefiles.com/animation-licensing-basics- | Lottie Simple License, ghi công khuyến khích | §6.2 |
| unDraw: https://undraw.co/license | cấm phân phối lại theo gói, cấm huấn luyện AI | §6.2 |
| DuckDB trademark: https://duckdb.org/trademark_guidelines | cấm tên phái sinh "Duck", logo vịt na ná | §1.1, §1.5 |
| Puddle: app theo dõi chó con (App Store), nhãn PUDDLE https://trademarks.justia.com/853/00/puddle-85300778.html , PUDDLE PADS https://trademarks.justia.com/998/16/puddle-99816486.html | trùng chủ đề | §1.5 |
| Tìm "Bin & Mây"/"BinMay", "Ao Data", "Gâu Quạc" | không thấy sản phẩm trùng (chỉ tìm web) | §1.5 |
| Kenney CC0, OpenMoji CC BY-SA 4.0, Nunito OFL 1.1 | theo trang giấy phép của từng dự án (kiểm lại khi lấy tài nguyên) | §6.2 |
