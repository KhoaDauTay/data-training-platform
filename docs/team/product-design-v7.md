# Product Design v7: đề xuất v12 (BoonData)

Ngày: 2026-11-18 · Vai trò: Product Designer + UI/UX · Theo **L58** ("v12 là đề xuất, không build").
Đầu vào: `CLAUDE.md` (bản trên đĩa sau c39c38a/69012a2), `decision-log.md` L42–L73, `product-design-v5.md` (§B domain, Save), `product-design-v6.md` (§3 nav trái, §4 schema theo domain, §5 cảnh, §10 quyết định), `review-log.md` mục "Plan 7 + v10 reviews", Plan 8a (General + `lab`), Plan 8b (animation/art/polish), Plan 9 (E-commerce), `src/save.ts`, `src/history.ts`, `src/practice.ts`, `src/domains.ts`, `src/route.ts`, `src/style.css`.
Mockup: `.superpowers/brainstorm/11840-1794844744/content/v12-proposal.html` (6 màn, sáng/tối, VI, một file; chỉ tải Tailwind CDN và font Nunito; linh vật lấy đúng sprite `#mascot-sprite` trong `index.html`).

Tài liệu này **chỉ đề xuất**. Không sửa `src/`, `content/`, test hay `decision-log.md`. User duyệt **§10 (Quyết định)** trước khi viết plan build. Lúc viết, v11 (Plan 8a/8b/9) đang được build và **chưa có mục review v11 trong `review-log.md`**: mục nào v11 đã làm xong thì gạch khỏi danh sách khi viết plan.

---

## 0. Tóm tắt một trang

| Chủ đề | Đề xuất v12 | Cỡ |
|---|---|---|
| Mục để lại (L65 + v10 mở + backlog 8a/8b/9) | 17 mục mở (cộng 4 mục giữ nguyên ở §1.3), gom thành 5 cụm: **khung mobile một dòng**, **mỗi icon một đích**, **Home ≠ Tổng quan**, **Bản đồ có hồ sơ tuyến ngay trên trang**, **Data chọn bảng khi rail**; cộng các mục nội dung/grader nhỏ (§1). | M |
| Hiệu năng khởi động | **Chỉ seed domain người chơi đang mở**. Logistics thành lười như `ecom` (`ensure('logistics')`); bài học nhanh/sổ tay chờ Logistics chỉ khi người chơi mở ví dụ. Màn chọn domain lần đầu **trước** khi seed. Spike riêng: lưu data dir đã seed vào IndexedDB (lần 2 gần như tức thì) và DB dựng sẵn (đảo L55, cần user) (§2). | M + spike S |
| Domain Finance | "Hải Đăng Tài Chính" / *Lighthouse Finance*, công ty cho vay tiêu dùng + trả góp hư cấu ở Đà Nẵng; schema `finance`, id `fin-chN-0M`, 6 chương × 5 việc theo khuôn Plan 9; trọng tâm **sổ vay, quá hạn (DPD), cohort giải ngân, ngân sách vs thực tế, dòng tiền** (khác Logistics ch7–9 là công nợ của một công ty giao nhận) (§3). | L–XL |
| Animation + minh họa | Cảnh **hoàng hôn/đêm** khi theme tối; hoạt cảnh hoàn thành cho E-com (D9-14) và Finance; Lily chào ở Home; bộ minh họa trạng thái rỗng thống nhất; mọi thứ vẫn CSS/WAAPI, ≤ 3 s, tắt dưới reduced motion (§4). | M |
| Cộng đồng / chia sẻ | Không backend: **xuất Bảng điều hành ra file** (`.boondash.json` + ảnh PNG từng thẻ), **chứng nhận theo domain** (SVG/PNG tự tạo, ghi rõ "không xác minh"), **link chia sẻ câu SQL** (mở Sandbox, không tự chạy). Không bảng xếp hạng (cần backend) (§5). | M |
| Accessibility | Vòng kiểm WCAG 2.2 AA có checklist: bảng thay thế cho mọi biểu đồ/bản đồ, `aria-live` cho kết quả chạy, cỡ chữ 100/112/125 %, vùng chạm ≥ 24 px (mục tiêu 44 px trên mobile), `lang` đổi theo ngôn ngữ, reflow 320 px (§6). | M |
| Insights cho người học | Trang **"Tiến bộ của tôi"** tính tại máy từ Save + lịch sử: độ vững từng kỹ năng (hộp Leitner), tỉ lệ đúng lần đầu, số lần thử trước khi đạt, gợi ý đã dùng, lịch ngày học. Không gửi gì ra ngoài. Dữ liệu mới (ngày học, mã lỗi) để ở localStorage, **không tăng Save** (§7). | S–M |
| Lộ trình | **v12.0 Gọn & nhanh** → **v12.1 Sống động** → **v12.2 Của tôi** → **v12.3 Finance**; spike DB lưu sẵn chạy song song v12.0 (§8). | ~6–7 tuần agent |

---

## 1. Mục để lại từ v10/v11

Nguồn: L65 (UI/UX để lại), các dòng **Mở** trong "Plan 7 + v10 reviews", backlog trong Plan 8a (dòng 366), D8b-9, D9-10/14/17, L62/L63. Plan 8b **không** nhận mục L65 nào (D8b-9: mục đổi bố cục → v12), nên mọi mục dưới đây vẫn mở trừ khi review v11 nói khác.

### 1.1 Khung và điều hướng

| # | Mục | Nguồn | Đề xuất | Cỡ |
|---|---|---|---|---|
| U1 | Thanh trên mobile 3 dòng | L65, v10 UX | **Một dòng 56 px** ở < 640 px: nút ngăn kéo · logo mark BoonData (không chữ) · chip domain chỉ icon + chương ("Ch.4") · pill XP · nút ⋯. Trạng thái DB là **chấm màu** trong chip domain (đã có `title`/sr-only từ f459bc8). Ngôn ngữ, theme, Xuất/Nhập vào menu ⋯. Nav cấp 1 đã ở thanh dưới 4 mục (v6 §3.2), không lặp ở trên. Mockup màn 1. | S |
| U2 | Icon lặp ở rail/drawer | L65 | Luật **"một icon = một đích"**: mỗi mục nav một icon riêng trong `icons.ts`; test mới duyệt danh sách mục sidebar của mọi route và fail nếu hai mục khác `href` dùng cùng icon. Cần 4–5 icon mới (Bản đồ = la bàn, Dữ liệu = trụ DB, Bảng điều hành = ô lưới, Tổng quan = nhà kho/ngân hàng theo domain). | S |
| U3 | Module Lộ trình đặt tên theo chương Logistics | L65 | Đặt theo **nhóm kỹ năng** ("Chọn và lọc dòng", "Gộp và tóm tắt", "Nối bảng"…), dòng phụ "Dùng ở Logistics ch.2 · E-com ch.1". Plan 8a có 12 module SQL: đổi nhãn, không đổi id. | S |
| U4 | Trang Bản đồ mở lại bản đồ trong hộp thoại | L65 | Trang `#/d/<id>/map` = **bản đồ trái + hồ sơ tuyến phải** (≥ 1024 px), bottom sheet trên mobile; bấm pin đổi hồ sơ tại chỗ, `aria-live=polite` đọc tên tuyến. Hộp thoại `#map-dialog` chỉ còn ở thanh việc (đang làm bài thì không rời trang). Hồ sơ = brief tuyến (lanePanel), việc phụ, bảng tuyến mở thêm. Mockup màn 2. | M |
| U5 | Home lặp header / Tổng quan lặp thẻ tin nhắn của Home | L65, v10 UX | Phân vai cứng: **Home = liên domain** (một dòng "Tiếp tục: <việc> · <domain>", Ôn tập hôm nay, đường General, thẻ các domain, insights tóm tắt). **Tổng quan = một domain** (cảnh, chương hiện tại, hộp thư, KPI). Home **không** hiện tin nhắn đồng nghiệp; Tổng quan **không** hiện thẻ domain hay ôn tập. Mockup màn 3. | S–M |
| U6 | Data không có chọn bảng khi sidebar là rail | L65 | Khi rail (1024–1279 px, hoặc workspace): đầu trang Data có **`<select>` gốc** (nhóm `<optgroup>` theo chương, số dòng trong nhãn) + ô tìm; khi sidebar mở thì danh sách như hiện nay. Native select: bàn phím, mobile picker, screen reader miễn phí. Mockup màn 1 (điện thoại thứ hai). | S |
| U7 | Sidebar: cuộn về cuối, nhãn bị cắt, danh sách bảng có viền | L65 | Mục hiện tại `scrollIntoView({ block: 'nearest' })` một lần khi vẽ lại (không mỗi lần); nhãn `line-clamp-2` + `title`; danh sách bảng không viền (v6 §3.4 "danh sách thở"). | S |
| U8 | Nút Nộp xuống dòng khi nhãn Chạy dài | v10 mở | Nhãn trạng thái DB ra khỏi nút ("Chạy" luôn ngắn, trạng thái là dòng phụ dưới nút); hàng nút `flex-wrap` với Lịch sử ở cuối. | S |

### 1.2 Học và phản hồi

| # | Mục | Nguồn | Đề xuất | Cỡ |
|---|---|---|---|---|
| L1 | Lời cảm ơn theo phòng ban lặp lại | L65 (L18 là thiết kế) | 4 câu mỗi phòng, chọn **tất định theo id ticket** (cùng việc luôn cùng câu, việc liền nhau khác câu). Giữ L18: phòng ban quyết định giọng. | S |
| L2 | "Bảng liên quan" có bảng cha FK ở chương 1 | L65 | Chỉ thêm bảng cha khi chương ≥ chương dạy `join` (ch3 Logistics, C3 E-com); trước đó chỉ bảng của việc. Đổi `relatedTables()` (ui-ux-v4 §4) một điều kiện. | S |
| L3 | Phản hồi khi chỉ một cột sai vẫn nói "kiểm lại cách tính" | v10 mở (SG-3) | Grader đã so theo vị trí cột: trả thêm **chỉ số cột lệch đầu tiên** khi số dòng bằng nhau. Boon nói "Cột 2 chưa khớp, các cột khác đúng" (không lộ giá trị đáp án). | S |
| L4 | Làm tròn trong đề không được chấm | L63 | `precision?: number` theo bước (mặc định 2, giữ nguyên mọi đề cũ); chỉ đề nói rõ "làm tròn tới đồng" dùng `0`. | S |
| L5 | Sandbox: câu mẫu quay lại khi xóa hết | L62 | Cờ "đã vào Sandbox" ở localStorage `cargo-query/sandbox-seen` (thiết bị), **không** cần Save. Ladder: pref đủ dùng. | S |
| L6 | "Correct!" cao mà một chữ; bài học nhanh chưa có Boon; ví dụ không có ① | v10 mở | Ô đúng thu thành một dòng có Lily `cheer` 32 px; bài học nhanh mở bằng Boon `point` 40 px; ví dụ nhiều dòng mới có ① (ví dụ một dòng giữ nguyên). | S |
| L7 | Bài học/sổ tay chỉ có ví dụ Logistics | D9-17 | Mỗi bài học thêm **ví dụ theo domain đang mở** khi domain có bảng phù hợp (`example_ecom`, `example_fin` tùy chọn); thiếu thì dùng `lab` (không cần seed Logistics, xem §2). | M (nội dung) |
| L8 | `lab`: mỗi khách đúng 4 đơn (RFM thô) | Plan 8a dòng 366 | Sửa phân bố (tham chiếu cột ngoài trong `LATERAL`), đổi md5 ghim, chạy lại kiểm nội dung drill/nút nâng cao Task 4/5. Làm cùng L7 vì cùng đụng `lab`. | S–M |
| L9 | E-com không có hoạt cảnh hoàn thành | D9-14 | §4.2. | M |

### 1.3 Không làm (giữ nguyên quyết định)

- Brief đặt bài học trước Yêu cầu (v4 §C.3) — giữ.
- "Kiểm câu trả lời" báo lỗi ở lần bấm đầu trong tour — câu mẫu sai là bài tập, giữ.
- Nút "Về việc đang làm" sau khi giải việc cũ — đúng thiết kế.
- ch5-05 dùng JOIN (L64) — giữ đến khi seed Logistics đổi.

---

## 2. Hiệu năng và thời gian khởi động

### 2.1 Số đo đã có (chỉ số thật)

| Đo | Số | Nguồn |
|---|---|---|
| Seed Logistics trong trình duyệt tới "Database sẵn sàng" | **10,3–11,2 s** (Edge, máy rảnh, bản build) | L46 |
| Lần tải lạnh trên GitHub Pages | **13,2 s**, tải ~5,4 MB | L50 |
| Seed Logistics trong Node | 1,9–2,4 s | L46 |
| Seed `ecom` trong Node | 1,55–1,86 s (máy rảnh) | D9-8 |
| Seed `ecom` trong trình duyệt | **chưa đo** (ước ~6–8 s theo tỷ lệ L46; Plan 9 Task 8 đo) | D9-8 |

Hiện nay (D9-10) người vào thẳng E-com phải chờ **Logistics + `ecom`**, ước 16–19 s lần đầu. Đây là vấn đề lớn nhất của v11 với người mới.

### 2.2 Vì sao Logistics đang bắt buộc

Hai thứ cần bảng Logistics ở mọi domain: **bài học nhanh** (ví dụ và "Thử ngay" chạy trên `logistics`, D9-17) và **sổ tay** (`glossary.yml` `columns` phải có trong DB). Worker chỉ có một nhánh `initDb` (Logistics) trước khi nhận query.

### 2.3 Đề xuất P1: seed theo domain, Logistics lười

1. **Worker khởi động rỗng** (chỉ engine + `sandbox`), rồi `ensure(<domain đã nhớ>)` ngay. Domain đã nhớ = pref `cargo-query/domain` (D9-12); chưa có pref = **màn chọn domain lần đầu** (P2) trước khi seed gì.
2. `ensure('logistics')` thành giống `ensure('ecom')`: cùng request kind, cùng hạn 30 s, cùng thanh tiến độ, gửi lại sau `restart()`.
3. **Bài học nhanh / sổ tay**: nút "Chạy ví dụ" gọi `ensure(schema của ví dụ)` trước khi chạy; nếu ví dụ là Logistics mà người chơi ở E-com, dòng chờ "Đang chuẩn bị dữ liệu ví dụ…" (Lily ngủ, như D9-8). Dài hạn L7 cho ví dụ theo domain / `lab` để gần như không ai phải chờ Logistics.
4. `DbClient` thêm `ready(schema)` để UI chỉ khóa nút Chạy của **domain đang mở**, không khóa cả app.
5. Test: `tests/startup.test.ts` mở rộng — boot với pref `ecommerce` không seed `logistics` (đếm bảng `information_schema`), lần `ensure('logistics')` đầu tiên seed đủ và md5 26 bảng vẫn khớp.

Lợi ước tính (chưa đo, phải đo ở v12.0): người E-com chờ ~6–8 s thay vì ~16–19 s; người Logistics không đổi.

### 2.4 Đề xuất P2: màn chọn domain lần đầu

Người mới (không Save, không pref) thấy **một màn chọn**: Logistics / E-commerce / Finance (khi có) / "Chỉ học SQL" (General, chỉ seed `lab` ~15k dòng). Engine wasm tải **song song** ngay khi trang mở (không chờ chọn), seed bắt đầu khi bấm. Đổi domain sau này vẫn qua nút domain như nay. Mockup màn 4.

### 2.5 Spike S (2 ngày, song song v12.0): không seed lại ở lần sau

| Phương án | Ý | Đảo quyết định? | Rủi ro |
|---|---|---|---|
| **S-a. Lưu data dir đã seed vào IndexedDB** | Sau seed lần đầu: `dumpDataDir()` → IndexedDB, khóa = md5 của file seed + phiên bản PGlite; lần sau `new PGlite({ loadDataDir })`. Lần đầu vẫn seed tại máy. | Không (L55 nói "giữ seed lúc chạy", không cấm bộ nhớ đệm tại máy) — vẫn ghi để user biết. | Dung lượng IndexedDB (ước 30–60 MB chưa nén), quota trình duyệt, `sandbox` (bảng `UNLOGGED`) phải bỏ khỏi dump; cần kiểm API trên 0.5.16 bản pin. |
| **S-b. DB dựng sẵn tải từ server** | Spike S3 cũ: tarball ~14,7 MB gzip cho cả DB; theo domain nhỏ hơn. | **Có, đảo L55** — cần user. | Tải nặng hơn seed ở mạng chậm; hai nguồn sự thật (seed.sql + tarball) phải khớp md5 trong CI. |

Thước đo cho spike (một bảng trong `review-log.md`): thời gian tới "nút Chạy bật" lần 1 và lần 2, ở Edge + Chrome, máy rảnh, 3 lần mỗi ô, bằng `performance.mark` quanh `ensure`. Ngưỡng nhận S-a: lần 2 ≤ 3 s (mục tiêu, chưa có số).

### 2.6 Hiệu năng khác (nhỏ)

- `requestIdleCallback` prefetch chunk nội dung domain **chỉ** domain đã nhớ, không cả hai.
- Ngân sách: Finance thêm nhóm `fin`, `finseed`, `finart` theo mẫu D9-16; `main` **không** tăng (luật L59: phần mới lazy).

---

## 3. Domain Finance (phác thảo)

### 3.1 Cốt truyện và khác biệt

- Công ty hư cấu **"Hải Đăng Tài Chính" / *Lighthouse Finance*** (Đà Nẵng, mở 2024): cho vay tiêu dùng, trả góp mua hàng (đối tác là các shop, có thể là Chợ Lồng Đèn — móc nối nhẹ giữa domain, không chung bảng), thẻ tín dụng nội bộ. Tên cần kiểm trùng thương hiệu thật trước khi chốt (D-F1). Không ngân hàng, ví hay mạng thẻ có thật; kênh thanh toán là mã chung.
- **Khác Logistics ch7–9:** Logistics dạy **công nợ của một công ty giao nhận** (hóa đơn, thu, chi nhà cung cấp, tỷ giá) để tính biên lãi. Finance dạy **phân tích danh mục cho vay**: kỳ trả nợ, quá hạn theo nhóm ngày (DPD 0/1–30/31–90/90+), cohort theo tháng giải ngân (vintage), tỷ lệ chuyển nhóm (roll rate), ngân sách vs thực tế, dòng tiền tháng. Không lặp bài FX (Finance chỉ VND).
- **Không dạy lại** kỹ năng nền như việc mới; chương 1 Finance `requires` kỹ năng General/Logistics và mở bằng ví dụ mẫu (như D9-5).

### 3.2 Schema `finance` (ước ~70–90k dòng, cùng khung seed tất định)

`branches` (8), `customers` (6.000), `products` (6: vay tiêu dùng, trả góp, thẻ…), `loans` (~9.000, giải ngân 2024-07..2026-10), `schedules` (kỳ phải trả, ~55k), `repayments` (~45k), `collections_calls` (gọi nhắc nợ), `budgets` (theo chi nhánh × tháng × khoản mục), `gl_entries` (bút toán đơn giản, chỉ các khoản mục cần cho P&L tháng), `credit_scores` (điểm nội bộ theo tháng). Móc cốt truyện ở đầu file như Logistics: một chi nhánh có tỷ lệ quá hạn tăng từ 2026-07 (đánh giá thăng tiến chương cuối); một cohort tháng Tết vay nhiều trả chậm.

### 3.3 6 chương × 5 việc (khuôn Plan 9: teach worked → develop faded → twist → rest → đánh giá thăng tiến)

| Chương | Bậc nghề | Trọng tâm nghiệp vụ | Kỹ năng (id có sẵn trừ khi ghi "mới") |
|---|---|---|---|
| F1 | Thực tập sinh | Sổ vay hôm nay: khoản đang mở, dư nợ theo sản phẩm | `select`, `where`, `aggregate`, `group_by` |
| F2 | Chuyên viên | Lịch trả nợ vs tiền về: kỳ đã đến hạn, đã trả | `join`, `left_join`, `anti_join`, `date_math` |
| F3 | Chuyên viên | Quá hạn: nhóm DPD, tỷ lệ nợ xấu theo chi nhánh | `case_when`, `conditional_agg`, `coalesce` |
| F4 ★ | Chuyên viên chính | Cohort giải ngân (vintage), tỷ lệ chuyển nhóm | `cte`, `date_bucket`, `window_lag`; áp dụng nút nâng cao **A3 Trục ngày** và **B2 Cohort và retention** |
| F5 | Chuyên viên chính | Ngân sách vs thực tế, lũy kế từ đầu năm | `window_agg`; áp dụng nút **A4 Tổng phụ (ROLLUP)** |
| F6 ★ | Trưởng nhóm | Báo cáo rủi ro quý cho ban điều hành | đánh giá tổng hợp; áp dụng nút **A2 Phân vị** (trung vị khoản vay) |

**Không thêm kỹ năng mới**: trục ngày, cohort, ROLLUP và phân vị đã là nút nâng cao A2/A3/A4/B2 của Plan 8a (bài học + 4 bài trên `lab`). Finance là nơi **áp dụng** chúng: ticket thêm trường tùy chọn `adv: [a3, b2]` để chương hiện "Dựa vào: Trục ngày, Cohort" (link sang `#/learn/adv/<node>`) và trang nút hiện "Áp dụng ở Finance, chương F4" (cùng cơ chế "Domain ↔ Chung" của Plan 8a Task 11). Ôn Leitner vẫn chỉ theo `skills.yml`.

### 3.4 Cảnh và bản đồ

Theo v6 §5.1: **phố tài chính** (tòa nhà có cột, ngọn hải đăng nhỏ là logo công ty, chồng xu) và **bản đồ dòng tiền**: Giải ngân → Khách hàng → Thu nợ → Quỹ, nhánh "Quá hạn" màu cảnh báo; độ dày cạnh = số tiền; nhánh mở theo đánh giá thăng tiến. Hoạt cảnh hoàn thành: một đồng xu lăn vào quỹ (việc thường), hải đăng bật đèn (thăng tiến). Mockup màn 5.

### 3.5 Save

Save **v5**: `byDomain.finance = { dashboard, sandboxDraft }` (slot như D9-11), id theo mẫu `FIN_ID = /^fin-ch\d{1,2}-\d{2}$/`; migration 4 → 5, fixture `save-v5.json`, v1–v4 giữ mãi; ra ở release riêng (luật CLAUDE.md). Lý do bump như D9-11: bản v11 gặp id `fin-` sẽ lọc mất.

### 3.6 Cỡ

Plan 10 viết theo đúng khuôn Plan 9 (phụ lục schema, seed, 30 ticket, art): **viết plan 1–2 ngày**, build **6–9 ngày agent** + review end-user 1 ngày. Mốc cắt như D9-20: M1 chơi được (khung giữ chỗ cho cảnh), M2 có cảnh.

---

## 4. Animation và minh họa

### 4.1 Nguyên tắc (giữ)

CSS keyframes + WAAPI + `tween()` (D8b-1), không thêm thư viện; hoạt cảnh ≤ 3 s (L29); ambient chỉ ở trang đọc, dừng khi khuất/ẩn (D8b-3); reduced motion = trạng thái cuối; SVG tự vẽ, màu theo token, không chữ trong SVG.

### 4.2 Mới ở v12

| Mục | Mô tả | Cỡ |
|---|---|---|
| **Hoàng hôn/đêm theo theme** (L65) | Theme tối: cảnh Tiên Sa đổi sang đêm — trời `--sky` đậm, trăng, 6–8 sao nhấp nháy (CSS, chu kỳ 3–5 s lệch pha), đèn cẩu/cửa sổ vàng ấm, phản chiếu đèn trên nước. Chỉ đổi biến màu + một nhóm `<g class="night">` ẩn ở theme sáng; không vẽ cảnh thứ hai. Áp cả bản đồ tuyến (mockup màn 2 ở theme tối). | S–M |
| **Hoạt cảnh E-com** (D9-14) | Việc thường: kiện hàng trượt lên kệ màu chương (1,2 s); thăng tiến: xe máy giao hàng chạy tới thành phố mới mở trên bản đồ giao hàng (2,5 s) + Lily/Boon `cheer` (D8b-6). | M |
| **Hoạt cảnh Finance** | §3.4. | S (cùng Plan 10) |
| **Lily chào ở Home** (L65) | Lily `idle` 72 px cạnh dòng "Tiếp tục" (Home không có linh vật nào khác ở vùng này: giữ luật "tối đa một linh vật mỗi vùng" của CLAUDE.md; idle chỉ chạy khi sprite có lớp `live`, nên cần mở luật đó cho Home hoặc để Lily đứng yên), câu chào theo giờ máy (sáng/chiều/tối) + một trong 6 câu theo trạng thái (có ôn tập, vừa lên bậc, lâu chưa học ≥ 7 ngày). Bấm Lily → `cheer` 600 ms (vui, không thưởng). | S |
| **Bộ minh họa thống nhất** | 8 cảnh nhỏ cùng khung 240×160, cùng nét 2 px: trạng thái rỗng (Lịch sử, Bảng điều hành, Dữ liệu của tôi, Ôn tập xong), lỗi tải, offline, chứng nhận (§5.2), insights rỗng. Chunk `illustrations` (D8b-8) thêm, mỗi hình ≤ 6 KB. | M |
| **Chuyển trang** | View Transitions API (`document.startViewTransition`) khi đổi route, fade 150 ms; trình duyệt không có API thì đổi ngay. 0 KB thư viện. | S |

---

## 5. Cộng đồng và chia sẻ (không backend)

Mọi thứ chạy ở trình duyệt (CLAUDE.md: không backend; nếu có thì Python). Mọi file xuất **không** chứa dữ liệu CSV người chơi nhập (`sandbox`).

### 5.1 Xuất / nhập Bảng điều hành

- **Xuất**: file `boondata-<domain>.boondash.json` = `{ format: 1, domain, cards: [{ title, kind, sql }] }`. Không có kết quả, không có SQL chạm bảng `sandbox` (thẻ đó bị loại, dialog nói "2 thẻ dùng dữ liệu của bạn nên không xuất").
- **Ảnh**: mỗi thẻ có "Tải ảnh PNG" (SVG → canvas → `toBlob`), có chú thích nguồn "BoonData · dữ liệu hư cấu" ở góc.
- **Nhập**: kiểm như `readDashboard` (max 24 thẻ, SQL ≤ 4.000 ký tự), thêm vào cuối, thẻ nhập **không tự chạy** (đã có luật `cargo-query/cards-ran`).

### 5.2 Chứng nhận theo domain

- Mở khi qua đánh giá thăng tiến chương cuối của domain (Logistics ch12, E-com C6, Finance F6) và cho General khi xong mọi module SQL.
- Người học gõ tên hiển thị (pref thiết bị, không vào Save); SVG/PNG A4 ngang: linh vật, domain, bậc nghề cuối, số việc, kỹ năng, ngày (ngày máy).
- **Ghi rõ** ở cuối: "Tự tạo tại máy của bạn, không xác minh bởi bên thứ ba". Không mã xác minh (không có backend nên mã nào cũng giả mạo được; một mã giả vờ xác minh là sai sự thật).

### 5.3 Link chia sẻ câu SQL

- "Sao chép link" ở Sandbox/Lịch sử: `#/share?sql=<base64url>&d=<domain>` (giới hạn 4.000 ký tự như thẻ). Mở link = Sandbox của domain đó với câu SQL **trong editor, chưa chạy**, dải "Câu này được chia sẻ cho bạn, đọc trước khi chạy". Dùng để hỏi bạn bè/nhóm học. Không chia sẻ lời giải ticket qua link (link chỉ mở Sandbox).
- Chạy vẫn trong `BEGIN … ROLLBACK`, nên câu lạ không phá được dữ liệu.

### 5.4 Không làm ở v12

Bảng xếp hạng, hồ sơ công khai, bình luận: cần backend + kiểm duyệt. Thay vào đó: link "Góp ý / thảo luận" tới GitHub Discussions của repo (public, L50) trong menu ⋯ (cần user bật Discussions, D-C3).

---

## 6. Accessibility (WCAG 2.2 AA)

Đã có: tương phản ≥ 4,5:1 cả hai theme (test), reduced motion, `#announce`, focus về nút mở dialog, không emoji, Home lặp chữ SVG bằng HTML.

| # | Việc | Cỡ |
|---|---|---|
| A1 | **Kết quả chạy có `aria-live`**: "Chạy xong, 12 dòng, 3 cột" / "Lỗi ở dòng 2" (một câu, polite), không đọc cả bảng. | S |
| A2 | **Bảng thay thế cho mọi hình dữ liệu**: tab Biểu đồ có "Xem dạng bảng"; bản đồ tuyến/giao hàng/dòng tiền có danh sách HTML cùng thông tin (trang Bản đồ màn 2 đã có danh sách tuyến). | S–M |
| A3 | **Cỡ chữ** 100 / 112 / 125 % trong menu ⋯ (pref, đổi `font-size` gốc; mọi kích thước Tailwind theo rem nên đi theo). | S |
| A4 | **Vùng chạm**: tối thiểu 24×24 px (WCAG 2.5.8) mọi nơi, mục tiêu 44 px trên mobile (thanh dưới, nút trong danh sách). | S |
| A5 | **`<html lang>`** đổi theo ngôn ngữ chọn (VI/EN), tên bảng/SQL bọc `lang="en"` khi giao diện VI để screen reader đọc đúng. | S |
| A6 | **Reflow 320 px / zoom 400 %**: không cuộn ngang trừ bảng kết quả và editor (ngoại lệ hợp lệ của 1.4.10). | S |
| A7 | **Skip link** "Tới editor" và "Tới kết quả" ở workspace; landmark có tên (`aria-label`) cho 3 vùng. | S |
| A8 | **Kiểm tự động**: `axe-core` (dev dependency, MIT) chạy trên vài trang trong Vitest/jsdom; kiểm tay bằng NVDA + Chrome mỗi release. Thêm dependency → D-A1. | S |

---

## 7. Insights cho người học (không analytics)

Tính **tại máy**, không gửi đi đâu, không cookie, không ID. Trang `#/me` "Tiến bộ của tôi" (mockup màn 6) + tóm tắt một dòng ở Home.

| Insight | Dữ liệu | Có sẵn? |
|---|---|---|
| Độ vững từng kỹ năng (5 mức) | `save.review[skill].box` | **Có** |
| Việc xong theo chương / domain, bậc nghề | `save.completed`, `rankOf()` | **Có** |
| Gợi ý đã dùng, việc dùng nhiều gợi ý nhất | `save.hintsUsed` | **Có** |
| Ôn tập: đạt / đúng chưa đạt | `save.practice` | **Có** |
| Số lần chạy trước khi đạt, tỉ lệ đạt lần nộp đầu | `cargo-query/history` **không đủ**: `ok` nghĩa là "chạy không lỗi" (không phải "qua grader"), Chạy và Nộp ghi giống nhau, câu trùng liền nhau bị bỏ (`work.ts` `record`, `pushHistory`) | **Cần mới**: pref `cargo-query/attempts` (`Record<ticketId, { runs, submits, passedOn? }>`, đếm ở `work.ts`) |
| Giờ học trong ngày (sáng/chiều/tối) | `history[].at` (15 câu cuối mỗi việc) | **Có, xấp xỉ** |
| Lịch ngày học + chuỗi ngày | danh sách ngày local có chạy/nộp | **Cần mới**: pref `cargo-query/activity` (≤ 366 ngày, `localDay`) |
| Lỗi hay gặp (theo SQLSTATE) | đếm `SqlError.code` | **Cần mới**: pref `cargo-query/errors` (`Record<code, number>`, ≤ 50 khóa) |
| "Nên làm gì tiếp" | kỹ năng hộp 1–2 + lỗi hay gặp → 1 drill + 1 bài học | **Có** sau các mục mới ở trên |

Ba mục mới (`activity`, `errors`, `attempts`) để **localStorage, không vào Save** (ladder: không cần bump; mất thì chỉ mất thống kê). Đổi lại: Xuất tiến độ không mang theo lịch ngày học (ghi ở trang). Chuỗi ngày **không** có phạt, không thông báo đẩy, không "mất chuỗi" (tránh tạo áp lực; nhất quán với ôn Leitner theo ngày máy).

---

## 8. Lộ trình theo pha

Cỡ = ngày làm của agent build (gồm test) + review; S ≤ 1 ngày, M 2–4 ngày, L 1–2 tuần, XL > 2 tuần.

| Pha | Nội dung | Cỡ | Phụ thuộc | Mốc kiểm |
|---|---|---|---|---|
| **v12.0 Gọn & nhanh** | §2 P1 + P2 (seed theo domain, màn chọn domain, đo); §1.1 U1–U8; A1, A4–A7; L1–L6 | **L** (~8–10 ngày) | v11 xong + review v11 | Boot E-com không seed Logistics (test); số đo trước/sau trong review-log; review UI/UX 375/1267 px × 2 theme |
| Spike S | §2.5 S-a (+ S-b nếu user cho) | **S** (2 ngày, song song) | — | Bảng số đo; user chọn D-P2 |
| **v12.1 Sống động** | §4.2 (đêm, E-com hoạt cảnh, Lily chào, minh họa, View Transitions); A2, A3 | **M–L** (~5–6 ngày) | v12.0 (Home mới) | Performance ≤ 2 ms/khung (D8b Task 9); reduced motion |
| **v12.2 Của tôi** | §7 insights; §5.1–5.3 xuất/chứng nhận/link; A8 | **M** (~4–5 ngày) | v12.0 | Xuất/nhập vòng tròn (test); chứng nhận ở 2 theme; không file nào chứa `sandbox` (test) |
| **v12.3 Finance** | §3 (Plan 10), Save v5, L7 + L8 (ví dụ theo domain, sửa `lab`) | **L–XL** (~8–11 ngày) | v12.0 (seed theo domain) | Khuôn Plan 9 Task 8: e2e 6 chương, đo seed `finance` trên trình duyệt |

Tổng ~6–7 tuần agent nếu tuần tự; v12.1 và v12.2 chạy song song được (khác file chính: `art/*` vs `ui/insights`, `ui/dashboard`).

---

## 9. Rủi ro

| Rủi ro | Giảm thiểu |
|---|---|
| Seed theo domain làm vỡ chỗ ngầm giả định Logistics có sẵn (KPI Home, sổ tay, ER `'logistics'`) | Test boot E-com không Logistics duyệt mọi trang; `ensure` trước mọi query ghi `schema: 'game'` |
| Ví dụ bài học chờ seed Logistics ở domain khác | Dòng chờ có Lily; L7 chuyển dần sang `lab`/domain |
| IndexedDB đầy hoặc bị xóa (S-a) | Luôn quay về seed tại máy; đệm chỉ là tăng tốc |
| Tên công ty Finance trùng thương hiệu thật | D-F1: kiểm trước khi viết Plan 10 |
| Chứng nhận bị hiểu là có giá trị pháp lý/tuyển dụng | Câu "không xác minh" trên chính hình, không mã giả |
| Link SQL dùng để gửi câu độc | Không tự chạy; chạy vẫn rollback; giới hạn 4.000 ký tự |
| Insights làm người học áp lực | Không chuỗi phạt, không so người khác, có nút ẩn thẻ insight ở Home |

---

## 10. Quyết định cho user (mặc định in đậm)

- **D-P1.** Seed theo domain đã chọn, Logistics lười (§2.3)? **(có)**
- **D-P2.** Spike không seed lại: **S-a lưu data dir vào IndexedDB** (không đảo L55) / S-b DB dựng sẵn (đảo L55) / không làm? **(S-a)**
- **D-P3.** Màn chọn domain lần đầu, có lựa chọn "Chỉ học SQL" (§2.4)? **(có)**
- **D-U1.** Thanh trên mobile một dòng, ngôn ngữ/theme vào menu ⋯ (U1)? **(có)**
- **D-U2.** Home = liên domain, Tổng quan = một domain, Home không hiện tin nhắn (U5)? **(có)**
- **D-U3.** Trang Bản đồ hồ sơ tuyến tại chỗ, hộp thoại chỉ ở thanh việc (U4)? **(có)**
- **D-F1.** Finance = "Hải Đăng Tài Chính / Lighthouse Finance", cho vay tiêu dùng + trả góp, sau khi kiểm trùng tên? **(có; đổi tên nếu trùng)**
- **D-F2.** Finance dùng nút nâng cao A2/A3/A4/B2 qua trường `adv:` thay vì thêm kỹ năng mới vào `skills.yml`? **(có)**
- **D-F3.** Finance ở v12.3, sau v12.0 (cần seed theo domain)? **(có)**
- **D-C1.** Xuất Bảng điều hành (JSON + PNG) và link chia sẻ SQL không tự chạy? **(có)**
- **D-C2.** Chứng nhận tự tạo, ghi "không xác minh", không mã xác minh? **(có)**
- **D-C3.** Link GitHub Discussions trong menu ⋯ (user bật Discussions)? **(không, chờ user)**
- **D-I1.** Insights dùng localStorage cho ngày học và mã lỗi, không tăng Save? **(có)**
- **D-A1.** Thêm `axe-core` (dev, MIT, bản pin ≥ 2 tuần tuổi) để kiểm a11y tự động? **(có)**
- **D-R1.** Thứ tự v12.0 → (v12.1 ∥ v12.2) → v12.3, spike song song v12.0? **(có)**

---

## 11. Mockup và cách kiểm

`v12-proposal.html`, 6 màn:

1. **Mobile 375 px**: thanh trên một dòng + thanh dưới; điện thoại thứ hai là Data với `<select>` chọn bảng (U1, U6, A4).
2. **Bản đồ + hồ sơ tuyến tại chỗ**, theme tối hiện cảnh đêm (U4, §4.2).
3. **Home (liên domain) cạnh Tổng quan (một domain)**, Lily chào (U5).
4. **Lần đầu: chọn domain → chỉ seed domain đó** (P1, P2).
5. **Finance**: phố tài chính, bản đồ dòng tiền, 6 chương (§3).
6. **Tiến bộ của tôi + chứng nhận + xuất Bảng điều hành** (§5, §7).

Đã mở trong Chrome qua companion server (`http://localhost:53388/`) ở 1267 px, kiểm cả 6 màn ở theme sáng và tối, console không lỗi; sửa sau khi xem: tàu và viền nhà tối màu ở theme tối, trăng đè đèn hải đăng, cẩu và tàu ở cảnh Tổng quan, chữ "không xác minh" bị linh vật che trên chứng nhận; kiểm lại cả 6 màn ở hai theme sau khi sửa. Bề rộng 375 px chỉ kiểm bằng hai khung điện thoại trong màn 1 (cửa sổ Chrome không thu nhỏ được trong lần kiểm này). Icon trong mockup là SVG nội tuyến cùng kiểu `icons.ts` (24 px, nét 2 px), không emoji; chữ "boss" không xuất hiện.
