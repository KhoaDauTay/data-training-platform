# Review v22 RC (bản local, 2026-11-20, nhánh `v22-engine`, gốc `eccb924`)

Theo L215.2: chạy e2e đầu-cuối (có phần Database Engine), rồi review UI/UX theo `ux-deploy-checklist.md`, rồi review Product; sửa lỗi kỹ thuật nhỏ.

**Bản đang xét.** Đây là `dist/` build từ worktree `v22-engine`, phục vụ bằng `vite preview` ở máy (5233 cho ảnh và đo). **Không phải site live**: v22 chưa deploy. `scripts/e2e.mjs` tự mở `vite preview` riêng (cổng 5243) và từ chối chạy trên server không do nó mở, nên e2e không chạy "trên" 5233; cùng `dist/`, cùng commit.

Ảnh và số đo: `…\scratchpad\rv22rc\` (thư mục scratchpad của phiên; không đưa vào repo). `shots/` = trước khi sửa (`eccb924`), `shots-after/` = sau khi sửa; `shots/measure.json`, `topbar-after.txt`, `e2e/e2e-report.json`, `e2e-engine/`.

---

## 1. E2E và cổng

| Lượt | Kết quả |
|---|---|
| `npm run e2e` trên `eccb924` (đủ 10 phần) | **661/661 check**, 1163 s. Engine: **195/195 bài** (339 bước lab chấm được), **168/168 drill** lộ trình NoSQL. general 24, logistics 72, ecommerce 38, finance 38, tools 10, engine 365, screens 102, reload 4, history 5, offline 3 |
| Sau khi sửa (bản có top bar + chip) | `E2E_ONLY=engine,screens`: **467/467** (195/195 bài, 168/168 drill, 102 màn hình 1280 sáng/tối + 375, reduced motion, axe trên mọi màn hình), 960 s. Sửa cuối (chữ đậm) đi sau lượt này: `tsc` + `engineAxe`/`engineIntegration`/`engineCore` 167/167; lượt `E2E_ONLY=engine` trên bản đó dừng giữa chừng theo yêu cầu kết thúc sớm (19/19 check đầu đạt) |
| `npm run smoke` sau khi sửa | OK (151 s, axe 23 trang ở 1280 sáng / 375 tối, không cuộn ngang ở 320) |
| `npx tsc --noEmit` | 0 lỗi |
| `npm test` sau khi sửa | 5104 pass, 3 fail **do tải máy** (2 `pglab.test.ts` hết 60 s, 1 `mongoClient.test.ts` đo đồng hồ thật) khi chạy cùng lúc với Edge; chạy riêng: `pglab` + 4 file engine 590/590, `mongoClient` 9/9. `axe.test.ts` một lần "incomplete heading-order" khi chạy song song 8 file, chạy riêng 37/37 |
| `check-budget` | đạt cả bản trước lẫn sau (main 299/500 KB gz, `engine` 23/40, `engineLesson` 6/8 mỗi file) |

axe (axe-core của `node_modules`, tiêm qua CDP, có `color-contrast` và `target-size`): phần `screens` của e2e **không đi qua `#/engine…`**, nên đã chạy riêng 12 trang Engine (tổng quan, 3 engine, 6 loại bài, lộ trình NoSQL, một kỹ năng) ở 1280 sáng và 375 tối: **0 serious/critical**.

---

## 2. UI/UX (ux-deploy-checklist.md)

Matrix: 1280 sáng VI, 1024 sáng VI, 375 tối VI, 320 sáng VI, 1280 sáng EN (5 trang); top bar 1024/1280/1366/1440 × VI/EN (trang chủ, workspace Logistics, Bản đồ E-com), save `tests/fixtures/save-v5.json` (người quay lại: 1 440 XP, Ôn tập 5, Hộp thư 1). Hồ sơ Edge mới mỗi lượt, bỏ qua service worker. 19 route × 4 cỡ + EN.

### Đã sửa trong bản này

| Mục | Mức | Thấy gì | Sửa |
|---|---|---|---|
| E2 / I2 top bar | **P1** | Thêm mục nav "Database Engine" làm top bar **tràn ngang** (thanh vẫn 53 px một hàng, nhưng "Sổ tay"/⋯ ra ngoài màn hình, trang cuộn ngang; checklist E2 chỉ đo chiều cao nên gate không bắt). Đo `scrollWidth` với save-v5, cỡ xấu nhất (XP 5 chữ số, badge 2 chữ số): Trang chủ EN 1024 +39 px, EN 1280 +27, EN 1440 +70, VI 1440 +23; trang domain (có `#domain-status` "Ch. 2/12" từ 1280): EN 1024 Bản đồ E-com +41, EN 1280 +57/+73, EN 1440 +84/+100, VI 1280 +26, VI 1440 +36/+53 (ảnh trước: `light-1280-map-ecom.png`, `en-light-1280-play.png`). Bỏ link Engine khỏi nav thì Trang chủ hết tràn ở mọi cỡ: hồi quy của v22 | Bốn thay đổi chỉ về điểm gãy và nhãn: (1) nhãn top bar = **"Engine"** (`nav.engineShort`, VI = EN, `SAME_OK`), đúng §7.2 của `product-design-db-engine.md`; tiêu đề trang, công tắc SQL/Database Engine, sidebar, `#/me` vẫn "Database Engine"; (2) EN "Practise SQL" → **"Practise"** chỉ ở top bar (`nav.practiceShort`; VI giữ "Luyện SQL"; tiêu đề trang không đổi); (3) VI\|EN + theme gộp vào ⋯ tới **1600** px (trước 1440; `.top-prefs` `lg:max-[1600px]:hidden`, `[data-menu-prefs]` `min-[1600px]:hidden`, cặp "trong thanh hoặc trong ⋯" giữ nguyên; `tests/topbar.test.ts` sửa theo); (4) chữ của Hộp thư / Ôn tập / Sổ tay chỉ cho trình đọc màn hình tới **1800** px (trước 1280; icon + badge, tên truy cập không đổi). Đo lại cỡ xấu nhất (`topbar-after3.txt` + lượt 1600/1800/1920): Trang chủ, workspace Logistics, Bản đồ E-com/Finance × VI/EN × 1024/1280/1440/1600/1800/1920: **không tràn** (khoảng trống phải ≥ 8 px, thường = lề 16 px); lúc đang tải database (EN 1280) khoảng trống tối thiểu 0, không tràn |
| L1 nhãn trung thực | **P1** | Chỉ bài `runtime: docs` có một dòng "Chưa chạy trong trình duyệt…"; bài lab/predict (PGlite, mingo, dynoxide) **không có nhãn nào** cạnh tiêu đề (§3.6, engine-ux-spec §5.1 "đúng một chip") | `honestOf(lesson)` thuần trong `src/engine/labs.ts` (suy từ cái thật sự chạy: lab hoặc predict Postgres có kế hoạch thật → tên runner; không chạy → "Sơ đồ" nếu có `viz`, không thì "Theo tài liệu chính thức") + chip cạnh `h2` (`data-honest`). Test trên cả 195 bài (`tests/engineContent.test.ts`): chip "chạy" chỉ khi có lab/predict Postgres và có bước chấm được; chip khác chỉ ở bài `runtime: docs`. PG version trong chip đã đo: `PostgreSQL 18.6 (PGlite 0.5.16)` |
| Lỗi cú pháp trong lab Postgres | P2 | `CREATE TABLE x (id int` → ghi chú dạy "Lỗi cú pháp gần chỗ gạch đỏ. Thứ tự viết: SELECT → FROM → WHERE…": sai ngữ cảnh (DDL) và lab là `<textarea>`, không có gạch đỏ (ảnh `light-1280-lesson-pg-lab-error.png`) | Lab Engine chỉ hiện SQLSTATE + thông báo Postgres (`errorView(e, false)`), bỏ ghi chú dạy của SQL track |
| Chữ đậm trong bài Engine | P2 | `**…**` hiện nguyên dấu sao trong "Ý chính", danh sách, bước lab (558 chỗ trong 75 file, ví dụ `e-dy-l1-08`: "**một item collection**", "**bắt buộc**") vì `inline()` chỉ hiểu `code` | `inline()` hiểu thêm `**đậm**` ngoài code span (`<strong>`); `` `$**` `` trong code vẫn là chữ |
| Thang cấp ở 375/320 | P2 | Tổng quan `#/engine`: cột mô tả mỗi cấp bị ép thành một từ mỗi dòng (ảnh `dark-375-engine.png`) | Mô tả `grow basis-48`: xuống dòng dưới tên cấp khi không đủ 12 rem |

Độ lệch có chủ ý (ghi lại): bài `runtime: docs` có chip ngắn **và** giữ câu giải thích dài cũ dưới tiêu đề (như dòng caption của bài BE trong §3.6). Nhãn "Theo tài liệu chính thức" không có trong bảng §3.6 (bảng không có trường hợp docs không sơ đồ: 50 bài); `recorded` (ADD-3, "Kết quả ghi từ…") chưa có trong nội dung, nên chưa có chip đó.

### Đạt (không cần sửa)

- E2 cao top bar 53 px ở 1024/1280/1366/1440/1600/1800/1920, VI + EN (sau khi sửa: cũng không tràn ngang); không phần tử chữ nào trong header bị cắt (chỉ nhãn `sr-only` và badge tuyệt đối có `scrollWidth > clientWidth`, đúng thiết kế).
- I1 `#bottom-nav` 57 px ở 375 và 320; I2 không cuộn ngang ở 320 trên cả 19 route.
- L3 công tắc **SQL nền tảng | Database Engine** ở 375/320, mục "Học" sáng trên cả `#/learn` và `#/engine…`. L5 không có thẻ "sắp có".
- A5 sơ đồ (`pg-btree`): ‹ Trước / Chạy hết / Tiếp › cùng trục ở bước 1 và bước 5 (top 468 px cả hai), có "Mô tả từng bước" HTML.
- H2 nav: "Database Engine" `aria-current` ở top bar, sidebar tô engine/cấp đang mở (PG/MG/DY, L1–L5); khu Learn không sáng khi ở Engine trên desktop.
- V22-C: thẻ "Buổi học hôm nay" (2 mục, ~18 phút, một nút chính "Bắt đầu", "Mục tiêu và nhắc lịch") hiện với save-v5. V22-A trang Bản đồ ba domain: câu mẫu + Chạy. Lab Postgres/Dynamo/Mongo chạy và chấm; quiz trả lời có phản hồi.
- Không lỗi console nào trong cả lượt ảnh.

### Còn mở

| Mục | Mức | Thấy gì | Đề xuất |
|---|---|---|---|
| H1 | P2 | Mọi trang con Engine có `h1` "Database Engine" (tiêu đề trang chung), tên engine/bài là `h2`. Checklist H1 và spec §5.1 muốn `h1` = tên bài + breadcrumb | Theo mẫu `learnSub` của `#/learn`: `h1` = tên trang con, "Database Engine" thành breadcrumb. **Đã sửa (L280: `pageSubs.engine`)** |
| L4 | P2 | Editor lab là `<textarea>`: không gạch chân vị trí lỗi, không tô màu cú pháp, không ghi engine + runtime trong ô (spec §3.2) | CodeMirror nhẹ cho lab hoặc `errorView(e, false, sql)` với dòng `^` khi `position` khớp câu của người chơi (với `setup` thì vị trí là của cả script, cần dịch). **Một phần (L280): editor lab là CodeMirror có tô màu; gạch chân vị trí lỗi vẫn mở** |
| Spec trang engine | P2 | Hàng bài thiếu "bài kế tiếp" (nền accent + vạch 3 px), chip nhãn ngắn mỗi hàng, khối "Học xong bạn làm được…" của mỗi mô-đun (engine-ux-spec §4); link tiêu đề bài trông như chữ thường (màu chữ, không gạch) | Làm ở v23 cùng H1 |
| `gradable()` | P3 | `e-dy-l1-04`, `e-dy-l3-03` (bước `check: catalog`, không `setup`): runner chấm được ("Đạt bước này", bài thành xong), nhưng `gradable()` nói không, nên e2e bỏ qua 2 bước này và trang không đếm "k/n bước" | Cho `gradable` nhận `catalog` trên DynamoDB, hoặc đổi nội dung sang `doc`. Test chip đang liệt kê 2 bài này. **Đã sửa ở v23 (L299)** |
| Checklist E2 | P2 | E2 chỉ đo chiều cao 53 px; lỗi tràn ngang của top bar lọt qua gate v22 (và `axe`/smoke). Thanh hiện đã đầy: từ 1280 tới 1799 px ba nút hành động chỉ còn icon + badge (đổi có chủ ý của review này, UX cần xác nhận) | Thêm vào E2: `document.documentElement.scrollWidth <= innerWidth` và khoảng trống phải ≥ 0 với XP 5 chữ số + badge 2 chữ số, trang chủ + một trang domain, 1024–1920; mục nav top mới nào cũng phải đo lại |
| Banner domain trên trang Engine | P3 | `#/engine` (và Trang chủ) hiện "Đang chuẩn bị dữ liệu Logistics…" khi domain nhớ là Logistics: trang Engine không dùng dữ liệu đó | Không seed domain khi route là `engine`, hoặc ẩn banner ngoài trang domain. **Đã đóng (L271: banner chỉ trên trang domain)** |
| J1 giảm chuyển động trên sơ đồ, F4 đổi theme khi đang mở sơ đồ, focus sau khi chấm quiz | — | Chưa kiểm trong lượt này | Thêm vào `scripts/ux-audit.mjs` (checklist §3 vẫn chưa có script này) |

### Cho agent thiết kế lại khu Engine (thị giác và bố cục, chưa sửa)

Theo quyết định của user (thiết kế lại UI khu Engine: icon mỗi engine, thẻ, cùng phong cách toàn site), review này **không** sửa thêm gì về giao diện trang Engine. Danh sách để agent đó dùng (ảnh trong `rv22rc/shots/` và `shots-after/`):

1. **Cấp bậc tiêu đề (H1):** `h1` luôn là "Database Engine"; tên engine, tên bài là `h2`. Cần `h1` = trang con + breadcrumb (mẫu `learnSub`).
2. **Tổng quan `#/engine`:** ba thẻ chỉ có chữ, không icon engine, không nút chính "Bắt đầu" cho người chưa học bài nào; thẻ cả khối là link nhưng không có dấu hiệu bấm. Thang L1–L5 ở 375 trước đây ép mô tả thành một từ mỗi dòng (đã vá `basis-48`, nên làm lại trong thiết kế mới).
3. **Trang engine (`#/engine/postgres` …):** hàng bài là chữ thường + pill loại + phút; thiếu "bài kế tiếp" (nền accent + vạch 3 px), chip nhãn ngắn mỗi hàng, khối "Học xong bạn làm được…" mỗi mô-đun, ✓/"Tiếp ›" (engine-ux-spec §4). Link tiêu đề bài trông như chữ thường.
4. **Lộ trình NoSQL:** chỉ vào được qua một thẻ trên trang MongoDB; hàng kỹ năng là chữ thường + "0/4 bài tập", cùng vấn đề link như trên.
5. **Trang bài:** chip nhãn trung thực mới (`honestChip`, `data-honest`) đang nằm cạnh `h2`; giữ đúng một chip khi thiết kế lại (test `honestOf` kiểm cả 195 bài). Bài `runtime: docs` vừa có chip vừa có khung câu dài: nên gộp. Ô lab là `<textarea>` (không tô màu, không gạch chân lỗi, không ghi engine/runtime trong ô: spec §3.2/L4). Các thẻ bước lab lồng trong khu "Lab" khá dày (D3).
6. **Sơ đồ:** nút ‹ Trước / Chạy hết / Tiếp › đứng yên giữa các bước (A5 đạt); chữ SVG < `lg` và reduced motion chưa kiểm.
7. **Sidebar rail ở 1280:** trang Engine hiện rail 64 px (PG/MG/DY, L1–L5) chứ không phải sidebar rộng 256 px như các trang đọc khác ở ≥ 1280 (có thể do thanh cuộn làm viewport < 1280); kiểm lại khi thiết kế cây engine → cấp → mô-đun.

---

## 3. Product

| Thứ phát hành | Giữ / Sửa / Bỏ | Vì sao (giá trị cho người học) | Việc cho v23 |
|---|---|---|---|
| Khu Database Engine (195 bài, 3 engine × L1–L5) | **Giữ** | Bài nào cũng mở và xong được (e2e 195/195). Lab Postgres chạy PostgreSQL 18.6 thật trong trình duyệt, kế hoạch EXPLAIN thật cho bài đoán: điều hiếm có trong khóa học miễn phí. Người mới có L1 (DDL, kiểu, ràng buộc, transaction, EXPLAIN đầu), người giỏi có L3–L5 (heap, MVCC, WAL, sharding) | H1 + "bài kế tiếp" + "Học xong bạn làm được" để người học biết đi đâu sau mỗi bài |
| Nhãn trung thực | **Sửa (đã sửa)** | 73/195 bài (37 %, phần lớn Mongo/Dynamo L3–L5 và bài khái niệm) không chạy gì; không có nhãn thì người học tưởng số liệu là đo tại chỗ | Thêm `recorded` khi có output ghi từ server thật |
| Lộ trình NoSQL (MongoDB, 12 phần, 168 drill) | **Giữ** | Soi gương lộ trình SQL, mọi drill chấm được (168/168). Lối vào chỉ qua thẻ trên trang MongoDB: người học SQL khó tìm ra | Một thẻ "Lộ trình NoSQL" trên `#/engine` và ở `#/learn` |
| Dễ tìm | Sửa nhẹ | Desktop: mục top bar "Engine"; điện thoại: "Học" → công tắc. Trang chủ không nhắc gì tới Engine | Một dòng trong "Buổi học hôm nay" hoặc mục Lĩnh vực khi người học đã xong chương 3 SQL |
| Ngõ cụt | Không thấy | Mỗi bài có "Bài tiếp", breadcrumb về cấp/engine, không thẻ "sắp có" | — |
| Beginner → expert | Đạt với điều kiện | Bài ghi "Nên học trước" nhưng không khóa (L121); tổng quan nói rõ "không cần học hết SQL mới vào". Thiếu một câu "bắt đầu ở đây" cho người chưa biết engine nào | Nút chính "Bắt đầu Postgres L1" trên `#/engine` cho người chưa xong bài nào |
| V22-A/B/C/E, BOOT | **Giữ** | e2e toàn bộ đạt; thẻ buổi học gọn Trang chủ; main 299 KB gz | — |

Câu "Học xong bạn làm được…" của Postgres L1: capstone `e-pg-l1-12` (catalog ×3 + plan) chấm bằng runner thật và e2e giải được: **đạt** (giải theo Solution, không phải giải mù).

---

## 4. Khuyến nghị

**GO cho phát hành v22**, với điều kiện commit sửa của review này (top bar, nhãn trung thực) đi cùng: hai P1 đều đã sửa và đo lại; không còn P0/P1 mở. Các P2 (H1, editor lab, hàng bài theo spec) đưa vào v23 luồng R. Trước khi deploy: chạy lại `npm test` khi máy rảnh (3 lỗi hết giờ ở trên là do tải) và review bản live theo L217 ngay sau deploy.

Commit: `cb21b39` (sửa: top bar, chip nhãn trung thực, lỗi lab, chữ đậm, thang cấp ở điện thoại); tài liệu này ở commit kế tiếp trên `v22-engine`.
