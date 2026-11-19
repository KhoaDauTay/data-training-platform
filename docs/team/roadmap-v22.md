# Roadmap v22: mỗi màn hình đều dạy, người học quay lại có lý do (BoonData)

Người viết: Product + UI/UX · 2026-11-20. User: *"Trong lúc đó sinh ra Agent chạy Product UI/UX cho V22 đi tạo plan"* và phản hồi sau đó: *"Theo review tôi thấy tab Bản đồ khá vô nghĩa chưa mang lại giá trị gì cho việc học cần cải thiện, research thêm đi"*. **Chỉ là kế hoạch**, chưa có code. v22 mở khi `v21` đã tag (L183: vòng hiện tại dừng ở v21), nên tài liệu này cần user duyệt (§4) trước khi chạy.

Đọc trước: `CLAUDE.md`, `roadmap-v18-v20.md` (giao thức §5 dùng lại nguyên, không chép), `product-design-v10.md`, `ui-ux-v7.md`, `lily-growth.md`, `interview-room.md`, `spike-pyodide.md` (§2.5 NO-GO), `decision-log.md` L124–L188.

**Chưa có lúc viết:** `docs/team/v21-e2e-findings.md`, `docs/team/v21-ux-review.md` (v21 đang chạy) và `docs/team/map-research.md` (agent nghiên cứu Bản đồ đang viết). Luồng V22-A vì thế ghi "chờ map-research.md". Khi hai tài liệu v21 có, người điều phối v22 gạch khỏi §3 mọi việc v21 đã nhận (§1.4 liệt kê chỗ có thể trùng).

**Mọi cỡ việc và KB là ước lượng**, trừ số ghi "đo". Cỡ: S ≤ 1 ngày, M 2–4 ngày, L 1–2 tuần, XL > 2 tuần (ngày làm của agent, gồm test và review).

---

## 1. Sản phẩm đang ở đâu (sau v20, v21 đang làm)

### 1.1 Số liệu (đo trên `main` ed6bb8e, 2026-11-20)

| Mục | Số |
|---|---|
| Domain | 3: Logistics 12 chương / 69 việc (57 việc thường + 12 đánh giá thăng tiến), E-com 7 chương / 35 việc, Finance 7 chương / 35 việc |
| Làn phụ Logistics | 9 việc |
| General | 38 kỹ năng, 38 bài học nhanh, 152 drill (4 mỗi kỹ năng), 28 nút nâng cao, phòng phỏng vấn 5 bộ đề + 5 take-home, 1 bộ dữ liệu công khai (Palmer penguins, CC0) |
| Biến thể | 26/57 việc thường Logistics còn < 3 biến thể (Practice lặp lại cùng con số) |
| Test | ~4120 vitest (L186), smoke + axe 23 trang × 2 chế độ, 0 lỗi trang ở site thật |

Ngân sách (gzip, `check-budget.mjs` trên `dist` của `main`, đo):

| Nhóm | Dùng / trần | Ghi chú |
|---|---|---|
| main | **325 / 500** | trần mềm v19–v20 là 325–335; còn ~25 KB gz là thư viện `yaml` (L178, ước lượng) |
| tickets | **105 / 110** | Logistics hết chỗ: không thêm việc/biến thể nào được nếu không tách chunk |
| ecom | **48 / 50** | hết chỗ |
| interview | **24 / 25** | hết chỗ |
| generalAdv | 46 / 50 | |
| css | 19 / 20 | trần cứng |
| en | 18 / 20 | luồng mới đặt chữ VI/EN trong chunk lười của mình |
| me | 11 / 12 | |
| html | 10 / 12 | sprite linh vật |
| fin / finlate | 30 / 50, 24 / 30 | tách ở L185 |
| art / ecomart / finart | 17 / 20, 6 / 10, 7 / 10 | |
| parser | 392 / 410 | |

Hiệu năng (L178, máy bận, trung vị 3 lượt): lần đầu "DB sẵn sàng" 5,9–8,3 s; lần hai (snapshot) 1,07–1,41 s; CPU main thread lần hai 445–472 ms, trong đó **parse YAML nội dung 150–187 ms** là chi phí lớn nhất còn lại.

### 1.2 Chơi thử (2026-11-20, site thật, Edge headless qua CDP, hồ sơ mới)

- **Người mới:** chạy kịch bản `scripts/smoke.mjs` (bản sao trong scratchpad, ảnh không ghi vào repo) trên `https://khoadautay.github.io/data-training-platform/`: màn chào → Logistics → "Thử ngay" → nộp việc 1 cả ba domain → drill → 23 trang × 1280 sáng / 375 tối / 320. Kết quả: **xanh, 0 lỗi trang**, 71 s.
- **Người quay lại:** hồ sơ mới, nạp sẵn save (Logistics chương 1–5 xong, 5 200 XP, 3 thẻ ôn quá hạn, ngày học cuối 2026-11-05, tức nghỉ 15 ngày) trước lần tải đầu, rồi mở Trang chủ, Tổng quan, Bản đồ, Bảng điều hành, Luyện SQL, `#/me`, Lộ trình, workspace ở 1280 và 375. 0 lỗi trang.
- Ảnh: scratchpad của phiên, `…\scratchpad\v22\live\` và `…\scratchpad\v22\ret\` (tạm, có thể bị xóa).

### 1.3 Điểm mạnh (giữ)

- Vòng học chính chắc: đề nghiệp vụ → editor → phản hồi theo cột/dòng → Recap "SQL của bạn / Cách tham khảo" → đồng nghiệp cảm ơn → dock. Tour 8 bước tự rút ngắn với người làm nhanh.
- Ôn tập Leitner, ôn đầu chương, drill 4 loại, phòng phỏng vấn, thi vượt: người học có đường luyện ngoài cốt truyện.
- Lily đã thành vòng "nuôi pet" đủ (L132, L134): 6 giai đoạn, thanh lớn lên, bóng giai đoạn sau, album có ngày, 6 màu phụ kiện, vuốt ve; không đói, không buồn, không teo. Người quay lại thấy "Dày dạn · Ngày thứ 5 cùng Lily · 18/25 kỹ năng tới giai đoạn sau".
- Riêng tư: `#/me` ghi "Tính tại máy này… không gửi đi đâu"; CSV không rời trình duyệt.
- Chất lượng kiểm được liên tục: smoke + axe + ngân sách chặn mỗi lần gộp.

### 1.4 Khoảng trống

| # | Thấy gì | Bằng chứng | Ai xử lý |
|---|---|---|---|
| G1 | **Bản đồ không dạy gì.** Logistics: tuyến tô màu, "Rotterdam · 2 chuyến", danh sách "0/3 bài tuyến"; không câu SQL nào, không số liệu nào người học tự tính ra. Finance: một khung bản đồ chi nhánh tĩnh, nửa màn hình trống, không bấm được gì. User đã nói "vô nghĩa". | `live\17`, `live\33`, `ret\1280_d_logistics_map` | **V22-A** |
| G2 | **Kết quả sai/đúng nhưng không biết "vì sao ra số này".** "SQL bằng lời" (L162) mô tả câu, tab Thứ tự thực thi đếm dòng mỗi mệnh đề; chưa chỗ nào trả lời "dòng kết quả này gom từ những dòng nào" (GROUP BY) hay "ghép với dòng nào" (JOIN): hai khái niệm khó nhất. | đọc code `src/viz/steps.ts`, `ui/resultTable.ts` | **V22-B** |
| G3 | **Người quay lại sau 15 ngày gặp ba thẻ luyện chồng nhau** (Ôn đầu chương, Ôn tập hôm nay (5), Bài luyện trên dữ liệu cửa hàng) trước khi thấy domain; không có câu "lần trước bạn dừng ở…", không mục tiêu nào người học tự đặt. Không có cách nhắc nào ngoài việc tự nhớ mở lại trang. | `ret\1280_`, `ret\375_` | **V22-C** |
| G4 | **Nội dung kẹt ngân sách:** tickets 105/110, ecom 48/50, interview 24/25. 26 việc Logistics < 3 biến thể. | §1.1 | **V22-D** (sau V22-E) |
| G5 | **Boot còn nặng:** YAML parse 150–187 ms mỗi lần mở, `yaml` ~25 KB gz trong main (ước lượng L178). Chưa đo với CPU chậm. | L178 | **V22-E** |
| G6 | T8 (vẽ lại cảnh E-com/Finance, ui-ux-v7) dừng ở T7 từ L148. Cảnh hiện tại (khung T7) đọc được, không xấu (`live\24`, `live\29`). | ảnh | §4 D-V22-4 (đề xuất để sau) |

Thấy thêm, **có thể v21 đã nhận** (kiểm khi có `v21-*.md`, không lập luồng v22):

- 375: thanh dưới 5 mục, mục thứ năm ("Logistics") rớt xuống hàng hai (`live\38`), F7 của v10 tưởng đã xong ở P2.
- Người quay lại đang ở Logistics chương 6 nhưng dòng "Tiếp tục" chỉ tới drill "Lọc dòng (WHERE) · Lộ trình" (save có drill `g-where-*`), không tới việc chương 6.
- 1280: chức danh trên top bar bị cắt "Data …" khi có nút Ôn tập (L171 chấp nhận khi đo; nay thêm nút).

---

## 2. Chủ đề v22 và mục tiêu

**Chủ đề: "Mỗi màn hình đều dạy, người học quay lại có lý do."** v18–v20 làm app nhanh, đủ rộng và kiểm được. v22 không thêm domain hay công nghệ mới. Nó sửa hai chỗ user và lượt chơi thử chỉ ra: một trang không dạy gì (Bản đồ) và một kết quả không tự giải thích được. Nó cũng làm lần quay lại nhẹ nhàng hơn, và dọn đường cho nội dung bằng cách hạ chi phí boot và tách chunk.

Tiêu chí thành công (đo được bằng smoke, `SMOKE_PERF`, axe, budget, vitest; không cần analytics, D-N14, hay máy thật):

| # | Tiêu chí | Cách đo |
|---|---|---|
| S1 | Bản đồ ở cả ba domain có ≥ 1 hành động dẫn tới một câu SQL chạy được trên schema của domain; smoke đi một hành động như vậy tới kết quả | `tests/map*.test.ts` (mọi điểm/tuyến có SQL chạy được), bước smoke mới |
| S2 | "Vì sao ra dòng này" có trên mọi kết quả có GROUP BY hoặc JOIN (story, làn, drill, Sandbox); với mọi Solution có GROUP BY, tổng số dòng nguồn của các nhóm = số dòng sau WHERE (câu không HAVING; có HAVING thì ≤) | `tests/why.test.ts` trên mọi Solution ba domain + drill |
| S3 | Người quay lại (save mẫu, nghỉ ≥ 7 ngày): Trang chủ có đúng **1** thẻ "Buổi học hôm nay" thay cho 3 thẻ luyện; chiều cao Trang chủ 375 giảm ≥ 30 % so với đo ở đầu luồng | smoke + `scrollHeight` |
| S4 | Main ≤ 305 KB gz (từ 325, ước lượng), `yaml` không còn trong main; CPU main thread lần hai ≤ 320 ms (từ 445–472); không domain nào chậm hơn số v20 quá 10 % | `check-budget`, `SMOKE_PERF=3` |
| S5 | tickets ≤ 90 / 110 sau tách; 0/57 việc thường Logistics < 3 biến thể; phòng phỏng vấn 7 bộ đề + 7 take-home | budget, `tests/content.test.ts`, `tests/interview.test.ts` |
| S6 | axe 0 serious/critical trên mọi trang mới/đổi (1280 sáng, 375 tối); 320 px không cuộn ngang | smoke |

---

## 3. Luồng

Một việc tuần tự mở đường (V22-E) rồi bốn luồng song song. File không giao nhau, trừ chỗ ghi rõ thứ tự. Giao thức worktree, cổng, merge, deploy, i18n, dependency, luật dừng: **`roadmap-v18-v20.md` §5 giữ nguyên**. Chủ `scripts/check-budget.mjs` ở v22: **V22-E** (luồng khác gửi tên nhóm + trần). Chủ `scripts/smoke.mjs`: mỗi luồng thêm bước của mình **ở cuối** danh sách bước, trong một khối có chú thích tên luồng (như i18n). Không luồng nào đổi Save (§4 D-V22-3).

### V22-E · Nhẹ hơn (mở đường, chạy trước)

- **Người chơi thấy:** mở app nhanh hơn, nhất là trên điện thoại; không có gì mới trên màn hình.
- **Việc:**
  1. YAML nội dung thành JSON **lúc build** (đề xuất L178): plugin Vite nhỏ trong `vite.config.ts` đọc `content/**/*.yml` và frontmatter vé, xuất JSON; `src/content.ts`/`src/tickets.ts` đọc JSON; `yaml` chỉ còn trong test và script. Vitest vẫn đọc YAML qua cùng hàm chuyển, nên test nội dung không đổi.
  2. Tách chunk `tickets` theo mẫu L185: `ticketSources` (ch1–6) + `ticketLateSources` (ch7–12, trần 40), tải song song, `loadContent()` chỉ xong khi đủ. Tương tự `ecomSources` → `ecom` (ch1–4 + YAML) + `ecomLate`, và `interviewSources` tách nội dung khỏi parser nếu đo thấy lợi. Mục đích: để V22-D có chỗ.
  3. Đo "máy yếu" bằng `Emulation.setCPUThrottlingRate` 4× **trên trang** (L187: không áp cho worker, nên chỉ đo render và main thread, ghi rõ giới hạn) thêm vào `SMOKE_PERF`.
  4. Dời `laneSources` khỏi boot (chỉ cần khi mở Bản đồ/làn ở Logistics), nếu đo thấy lợi.
- **File:** `vite.config.ts`, `src/content.ts`, `src/tickets.ts` (chỉ loader), `src/ticketSources.ts` + mới `src/ticketLateSources.ts`, `src/ecomSources.ts` + mới `src/ecomLateSources.ts`, `src/interview*Sources.ts`, `package.json` (không dependency mới), `scripts/check-budget.mjs`, `scripts/smoke.mjs` (chỉ phần `SMOKE_PERF`), tests loader.
- **Ngân sách (ước lượng):** main −20 đến −25; tickets 105 → ~60 + late ~45; ecom 48 → ~30 + late ~18; mọi trần cũ giữ.
- **Test:** nội dung parse từ JSON = parse từ YAML (so sâu từng vé ba domain + General); `check-budget` fail nếu `index-*.js` chứa chuỗi nhận diện của thư viện `yaml`; `SMOKE_PERF` ghi số 1× và 4×.
- **Cỡ:** M. **Chặn bởi:** tag `v21`. **Chặn:** V22-D. Không chặn A/B/C (họ không đụng loader).

### V22-A · Bản đồ biết dạy (chờ `map-research.md`)

User chê trực tiếp, nên đây là luồng ưu tiên. **Phương án cụ thể lấy theo khuyến nghị của `docs/team/map-research.md`** (đang viết). Khi tài liệu đó có, người điều phối thay mục này bằng phương án được chọn, giữ khung file/ngân sách/test dưới đây. Lúc viết chỉ chốt các ràng buộc:

- **Người chơi thấy (khung):** Bản đồ thành một cách **xem dữ liệu bằng SQL**, không chỉ là phần thưởng trang trí. Mỗi cảng/chi nhánh/thành phố trên bản đồ mở ra một câu hỏi số liệu có thật trong schema của domain (`ports`/`shipments`, `branches`/`loans`, thành phố giao hàng của E-com), người học tự viết hoặc sửa SQL để trả lời, và kết quả được vẽ lại lên bản đồ (độ dày tuyến, cỡ điểm). Phần thưởng hiện có (tuyến mở sau đánh giá, làn phụ) giữ nguyên.
- **Luật:** không lộ đáp án việc story (L25); không cột/bảng bị khóa (`unlockedTables()`); chạy qua `runSandboxed` như Sandbox, 0 XP nếu không phải việc; chữ VI/EN trong chunk lười của luồng; một linh vật mỗi vùng; giảm chuyển động = khung cuối; SVG bản đồ giữ `coast.ts`/`seaLanes.ts` (không vẽ lại bờ biển).
- **File (dự kiến):** mới `src/ui/mapPage.ts` (chuyển `routesSection` ra khỏi `ui/homeView.ts`: commit đầu tiên của luồng, gộp sớm để V22-C không đụng), `src/ui/lanePanel.ts`, `src/art/logistics.ts` (chỉ `routeMap`), `src/art/mapMotion.ts`, `map()` trong `src/art/ecommerce.ts` và `src/art/finance.ts`, mới `src/mapQueries.ts` (thuần) hoặc `content/*/map.yml`, tests mới.
- **Ngân sách (ước lượng):** main +1; chunk lười mới `mapteach` ≤ 8; `art`/`ecomart`/`finart` không vượt trần.
- **Test:** mọi điểm bản đồ có SQL chạy được trên schema của nó và chỉ dùng bảng đã mở ở chương tương ứng; SQL đó không trùng kết quả với Solution của việc nào (như `starterCards.test.ts`); smoke: mở Bản đồ ba domain, chạy một câu, kết quả vẽ lên bản đồ.
- **Cỡ:** L (ước lượng, chờ phương án). **Chặn bởi:** `map-research.md` + user chọn phương án (§4 D-V22-1). **Chặn:** không. **Giao file với T8:** nếu user chọn làm T8 ở v22 (§4 D-V22-4), T8 gộp vào luồng này (cùng `art/ecommerce.ts`/`finance.ts`), không thành luồng riêng.

### V22-B · "Vì sao ra dòng này" (giải thích kết quả)

- **Người chơi thấy:** trong bảng kết quả, mỗi dòng có nút nhỏ "Vì sao?" (chỉ khi câu có GROUP BY, JOIN hoặc aggregate). Bấm vào thì ô ngay dưới dòng mở ra:
  - **GROUP BY:** "Dòng này gom **14** dòng của `shipments` có `pod = 'NLRTM'`", kèm 5 dòng nguồn đầu tiên và các cột đã gộp (`sum(weight)` = 12 + 9 + …).
  - **JOIN:** "Dòng này ghép dòng `shipments` id 812 với `customers` id 33 qua `customer_id`", hai dòng cạnh nhau. LEFT JOIN không có cặp thì ghi "không có dòng khớp, nên các cột bên phải là trống".
  - **WITH/UNION/window/subquery:** "Chưa giải thích được câu này", không lỗi.
- **Ở đâu:** story, làn, drill, Sandbox, "Thử ngay". **Mô tả kết quả của chính người chơi** (`app.lastRun`), không bao giờ Solution, nên không lộ đáp án (L25). Không có ở index lab và đánh giá thăng tiến khi chưa đạt (giữ độ khó của bài kiểm tra).
- **Code:** dựng từ cây `libpg-query` mà request `steps` đã parse (như L162): `src/viz/why.ts` (thuần, trả mã + tham số, không chữ dịch) sinh câu phụ "dòng nguồn" bằng `pgsql-deparser`: mệnh đề FROM/JOIN/WHERE của người chơi + điều kiện bằng khóa nhóm của dòng được chọn (giá trị đi qua tham số, không nối chuỗi). Chạy qua `runSandboxed` hiện có, request `run` có `schema`; không request mới, không sửa `db/worker.ts`. View `src/ui/whyView.ts` trong chunk lười `why`; một chỗ gắn trong `ui/resultTable.ts`. Chữ VI/EN trong chunk.
- **File:** mới `src/viz/why.ts`, `src/ui/whyView.ts`, `ui/resultTable.ts` (một hook), `scripts/check-budget.mjs` qua V22-E (nhóm `why` ≤ 6), tests mới.
- **Ngân sách (ước lượng):** main +0,4; `why` ≤ 6; `parser` không đổi.
- **Test:** `tests/why.test.ts` chạy trên **mọi Solution** ba domain + drill có GROUP BY: với mỗi dòng kết quả, `count(*)` của câu dòng nguồn = giá trị `count(*)` (nếu Solution có) và tổng số dòng nguồn mọi nhóm = số dòng sau WHERE (không HAVING; có HAVING thì ≤); câu JOIN: mỗi dòng kết quả tìm được đúng cặp; giá trị NULL trong khóa nhóm dùng `IS NOT DISTINCT FROM`; khóa là ngày/numeric dạng chuỗi của PGlite vẫn khớp. Smoke: chạy Solution việc GROUP BY đầu tiên, bấm "Vì sao?" dòng 1, thấy số dòng nguồn.
- **Cỡ:** M–L. **Chặn bởi:** không. **Chặn:** không.

### V22-C · Quay lại có lý do (giữ chân không chuỗi, không áy náy)

Luật cứng (như Lily, `lily-growth.md` §3): **không chuỗi ngày, không đếm ngược, không câu trách, không thông báo đẩy** (không backend nên không có push; Notification API chỉ chạy khi tab mở, không dùng). Nghỉ bao lâu thì mọi thứ vẫn y nguyên.

- **Người chơi thấy:**
  1. **Thẻ "Buổi học hôm nay"** trên Trang chủ thay cho ba thẻ luyện (Ôn đầu chương, Ôn tập hôm nay, Bài luyện trên dữ liệu cửa hàng): một danh sách có thứ tự 2–4 mục, ước lượng phút mỗi mục (ôn 3 bài ~5 phút → việc tiếp theo ~10 phút), nút "Bắt đầu" chạy mục đầu. Mục lấy từ những gì đã có (`warmupQueue`, `reviewQueue`, việc tiếp theo, drill yếu nhất). Không mục mới, không XP mới.
  2. **Câu chào lại** khi lần học cuối (từ `cargo-query/days`) cách hôm nay ≥ 7 ngày: "Lần trước bạn làm tới *Nhãn thư cảm ơn cuối năm* (Logistics, chương 6). Có 3 kỹ năng tới hạn ôn." Một dòng trong section `hello`, Boon nói (L87); Lily chỉ vẫy đuôi.
  3. **Mục tiêu tuần tự chọn**, mặc định **tắt**: "Mỗi tuần tôi muốn làm 3 / 5 / 10 việc hoặc bài ôn". Thẻ Lily hiện "2/5 tuần này". Đủ mục tiêu thì Lily reo một lần (`react`, không thưởng XP). Thiếu thì không có gì: tuần mới bắt đầu lại từ 0, không ghi "trượt".
  4. **Nhắc bằng lịch của chính người học:** nút "Thêm nhắc vào lịch" tải file `.ics` dựng tại máy (sự kiện lặp hằng tuần, giờ người học chọn, link về site). Không mạng, không dữ liệu tiến độ trong file.
  5. Thẻ tóm tắt tuần trong `#/me` ("tuần này: 4 việc, 2 kỹ năng lên mức nhớ") dựng từ `cargo-query/days` + save. **Chỉ nếu `me` còn chỗ** (11/12): không đủ thì bỏ mục này.
- **Lưu:** device pref `cargo-query/goal` = `{ perWeek?: 3|5|10, remindAt?: "HH:MM", weekday?: 0–6 }`, đọc bằng `parseGoal` (sai thì bỏ, không ném), như `cargo-query/lily` (P-L3). Đếm "tuần này" **suy ra** từ save + `cargo-query/days` (`localDay`), không lưu. Không đổi Save.
- **File:** mới `src/goal.ts` (thuần: tuần, đếm, câu chào lại, kế hoạch buổi học), mới `src/ics.ts` (thuần, RFC 5545 tối thiểu), `ui/homeView.ts` (sections `hello`, `continue`, `warmup`, `review`; **không** đụng `routesSection`, đã chuyển cho V22-A), `src/ui/modes.ts` (chỉ chỗ đăng ký thẻ luyện trên Trang chủ), `src/storage.ts` (khóa mới), i18n khối V22-C, tests mới.
- **Ngân sách (ước lượng):** main +2 (chuyển phần chữ sang chunk lười nếu main > 307 sau V22-E); css 0 (lớp Tailwind có sẵn).
- **Test:** `tests/goal.test.ts` (ranh giới tuần theo giờ máy, đổi năm, pref hỏng, mục tiêu tắt thì không có dòng nào); `tests/ics.test.ts` (`BEGIN:VCALENDAR`/`RRULE:FREQ=WEEKLY`/`DTSTART`, dòng ≤ 75 octet, không chứa `cargo-query`, id việc hay XP); `tests/onboarding.test.ts`: người mới chưa thấy thẻ buổi học trước khi xong tour; smoke: save mẫu nghỉ 15 ngày → câu chào lại + đúng 1 thẻ buổi học, đo `scrollHeight` 375.
- **Cỡ:** M–L. **Chặn bởi:** commit "chuyển `routesSection`" của V22-A. **Chặn:** không.

### V22-D · Nội dung sâu hơn (sau V22-E)

- **Người chơi thấy:**
  1. **Biến thể:** 26 việc thường Logistics đang < 3 biến thể được nâng lên ≥ 3 (Practice đổi số thật mỗi lần). Không đổi biến thể 0 (story giữ nguyên, save và Recap cũ đúng).
  2. **Phòng phỏng vấn +2 bộ đề, +2 take-home:** `junior-2` (Phần 1–6, cho người vừa xong chương 6) và `senior-2` (window + CTE + đọc kế hoạch), take-home `g-iv-th-6/7` trên `lab` có rubric VI/EN.
  3. **E-com:** ≥ 3 biến thể cho mọi việc thường còn thiếu, nếu `ecom` sau tách còn chỗ.
- **Không làm:** chương mới, domain thứ tư (§4 D-V22-5), drill Python (NO-GO L187).
- **File:** `content/tickets/**`, `content/domains/ecom/**`, `content/general/interview.yml`, tests nội dung. Không seed mới (mọi biến thể dựa trên dữ liệu có sẵn; cần dữ liệu mới thì khối mới **cuối** seed, `setseed()` riêng, md5 cũ không đổi).
- **Ngân sách (ước lượng):** tickets + ticketLate ≤ 100 tổng; interview ≤ 25 (sau tách của V22-E); ecom + ecomLate ≤ 60 tổng.
- **Test:** toàn bộ luật nội dung (`tests/variants.test.ts`: mọi biến thể chạy, khác nhau, không sót giá trị biến thể 0; `wrong:` khác Solution trong mọi biến thể; EN không dấu; code span VI = EN); bộ đề mới chỉ dùng kỹ năng của Phần đã khai (`tests/interview.test.ts`).
- **Cỡ:** L (phần lớn là viết và kiểm nội dung). **Chặn bởi:** V22-E (chỗ trong chunk). **Chặn:** không.

### 3.6 Không chọn (và vì sao)

| Ứng viên | Quyết định |
|---|---|
| Vòng pet Lily sâu hơn | Đã đủ (L132, L134: 6 giai đoạn, album, màu, vuốt ve). v22 chỉ nối Lily vào mục tiêu tuần (V22-C). Thêm cơ chế nữa dễ thành "chăm sóc bắt buộc". |
| Hoạt hình SQL phong phú hơn | `sqlmotion` (L154) + "SQL bằng lời" (L162) đã có; khoảng trống thật là "vì sao ra dòng này" (V22-B), giá trị học cao hơn một phim nữa. |
| a11y riêng | axe trong smoke chặn mỗi gộp từ v20 (L179), v21 review toàn app; v22 giữ cổng S6 cho DOM mới. |
| T8 vẽ lại cảnh E-com/Finance | Cảnh khung T7 đọc được; giá trị học 0. Để sau, hoặc gộp vào V22-A (§4 D-V22-4). |
| Python trong app | NO-GO (L187) tới khi có số đo trên Android thật. |
| Domain thứ tư, tài khoản/đồng bộ, analytics | Ngoài phạm vi (D-N8, D-N14, roadmap-v18-v20 §4). |

### 3.7 Thứ tự và phụ thuộc

```
tag v21 ─┬─ V22-E (M) ───────────────► V22-D (L)
         ├─ V22-A commit "chuyển routesSection" ─► V22-C (M–L)
         ├─ V22-A (L, chờ map-research.md + D-V22-1)
         └─ V22-B (M–L)
```

Thứ tự gộp: V22-E → commit đầu của V22-A → V22-B, V22-C → phần còn lại của V22-A → V22-D. Chỗ giao file phải kiểm khi có commit: V22-B và V22-A nếu phương án bản đồ vẽ kết quả lên bản đồ (cả hai đọc `app.lastRun`, không sửa chung file); V22-C và V22-E ở `src/storage.ts` (E không cần sửa, ghi để chắc).

### 3.8 Tiêu chí thoát v22

1. Năm việc (E, A, B, C, D) gộp, hoặc bỏ theo luật §5.4 của roadmap-v18-v20, có dòng "v22 · bỏ" trong `review-log.md`.
2. tsc, toàn bộ vitest (`--no-file-parallelism --testTimeout=60000`), build, `check-budget` xanh. Trần mềm v22: **main ≤ 310** (sau V22-E), css ≤ 20, en ≤ 20, `why` ≤ 6, `mapteach` ≤ 8, interview ≤ 25, me ≤ 12.
3. Smoke xanh ở preview và site thật, gồm bước mới: Bản đồ ba domain (S1), "Vì sao?" (S2), người quay lại (S3), axe trên trang mới (S6).
4. `SMOKE_PERF=3` (1× và 4× CPU trang) ghi vào `review-log.md` "v22", so với số v20 (L178): S4.
5. Giấy tờ: một dòng L mỗi luồng (§5), `CLAUDE.md` (JSON lúc build, chunk late, `cargo-query/goal`, `why`, bản đồ mới).
6. Deploy, `check-deploy.sh`, smoke live, tag `v22`.

---

## 4. Quyết định cần user

| # | Câu hỏi | Khuyến nghị | Nếu không trả lời |
|---|---|---|---|
| **D-V22-1** | Bản đồ: chọn phương án nào trong `map-research.md` | Theo khuyến nghị của tài liệu đó, với điều kiện: Bản đồ phải có SQL người học tự chạy, không chỉ là hình thưởng | V22-A chạy theo khuyến nghị của `map-research.md` |
| **D-V22-2** | Mở vòng v22 sau tag v21 (L183 cho vòng dừng ở v21) | Mở, với 5 việc ở §3; vòng dừng ở tag v22 | Không chạy v22 |
| **D-V22-3** | Mục tiêu tuần lưu ở đâu | **Device pref `cargo-query/goal`** (như P-L3), không bump Save; mất khi Xuất/Nhập sang máy khác là chấp nhận được vì mục tiêu đặt lại trong 2 giây | Device pref |
| **D-V22-4** | T8 (vẽ lại cảnh E-com/Finance) | **Để sau v22**; nếu user muốn, gộp vào V22-A (cùng file) với cổng mắt agent chấm như L146 | Để sau |
| **D-V22-5** | Domain thứ tư / chương mới | **Không** trong v22: chiều sâu (biến thể, phỏng vấn) và "vì sao" giúp junior DA hơn bối cảnh mới; ngân sách nội dung vừa mới có chỗ | Không |
| **D-V22-6** | Nút "Vì sao?" ở đánh giá thăng tiến | **Chỉ sau khi bước đó đạt** (giữ độ khó của bài kiểm tra) | Chỉ sau khi đạt |
| **D-V22-7** | File `.ics` nhắc lịch | **Làm** (không mạng, người học tự thêm vào lịch); không làm thông báo trình duyệt | Làm |
| **D-V22-8** | Đo trên điện thoại Android thật (Pyodide, máy yếu) | User đo nếu có máy; vòng không chờ | Giữ NO-GO Python; V22-E dùng CPU 4× trên trang |

---

## 5. Dải số L

Trên `main` lúc viết: cao nhất **L188** (v21, commit 9e0e3ab), v21 còn đang chạy và sẽ lấy tiếp từ L189. Để các luồng song song không trùng số, v22 **giữ dải L200–L214**, chừa L189–L199 cho v21. Nếu v21 dùng quá L199, người điều phối v22 dời cả dải lên ngay sau số cao nhất lúc mở v22 (giữ thứ tự và khoảng cách) và ghi điều đó vào dòng L200.

| Dải | Dùng cho |
|---|---|
| **L200** | User duyệt tài liệu này (D-V22-1…8), mở vòng v22, dải số |
| L201–L202 | V22-E: YAML → JSON lúc build, tách chunk late, đo CPU 4× |
| L203–L205 | V22-A: phương án Bản đồ đã chọn, chunk `mapteach`, (T8 nếu gộp) |
| L206–L207 | V22-B: "Vì sao ra dòng này", chunk `why` |
| L208–L210 | V22-C: buổi học hôm nay, câu chào lại, mục tiêu tuần + `cargo-query/goal`, `.ics` |
| L211–L212 | V22-D: biến thể Logistics/E-com, bộ đề + take-home mới |
| **L213** | Thoát v22: số đo, luồng bị bỏ (nếu có), tag `v22` |
| L214 | Dự phòng |
