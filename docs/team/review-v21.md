# Review v21 (L217)

Hai phần độc lập: **UI/UX** (agent UI/UX, theo `ux-deploy-checklist.md`) và **Product** (giữ/sửa/bỏ, hướng đi). Phần nào viết sau thì nối thêm, không sửa phần kia.

## Product

Người viết: Product · 2026-11-20. Chỉ đánh giá, không code. Đọc: `CLAUDE.md`, L183–L219, `roadmap-v18-v20.md`, `roadmap-v22.md`, `roadmap-v22-v30.md`, `product-design-db-engine.md` (bản 2), `map-research.md` §5, `v21-e2e-findings.md`, `v21-ux-review.md`, `review-log.md` (v19–v20).

### 0. Bản đang xét là gì (quan trọng)

- **v21 chưa phát hành.**
  - Tag mới nhất là `v20`.
  - `origin/main` = `0a9e8e6`: code v20 cộng bản sửa sidebar L188 (đã kiểm `git diff v20 origin/main -- src`).
  - `main` local đi trước 29 commit. Trong đó có các bản sửa v21 UX-B/UX-C (L195–L197), chưa push.
- **Site live vì thế vẫn là v20.** Mọi nhận xét "live" dưới đây là về v20; nhận xét về v21 dựa trên tài liệu và `main` local.
- **Phát hiện P1 còn mở trên `main`:**
  - U1 (chức danh bị cắt ở 1280), U2 (chip XP đè chương ở 1024), U3 (bottom nav 5 mục trong `grid-cols-4`; `index.html:179` vẫn vậy, ảnh live 375 thấy mục "Logistics" rớt hàng).
  - E1 (axe serious `label-content-name-mismatch` trên `#review-btn`, 69 màn hình) cũng còn mở.
  - Theo L183, v21 chỉ tag khi "không còn lỗi mở". Hiện chưa đạt điều kiện đó.
- **Không có analytics** (D-N14), nên "không ai dùng" không đo được. Mọi đánh giá "ít dùng / gây rối" dưới đây là **phán đoán từ lượt chơi thử**, không phải số liệu.

### 1. Lượt chơi thử (site live, Edge headless, hồ sơ mới, 2026-11-20)

| Bước | Thấy gì |
|---|---|
| Mở trang → màn chào | Hộp thoại hiện sau 1,7 s. |
| Chọn Logistics → nút "Mới bắt đầu" bật | **16,1 s** (tổng 19,9 s từ lúc mở). Đây là lần đầu: tải PGlite + seed. Màn chào có ghi "đang chuẩn bị", nhưng 16 s là lâu với người mới. |
| Việc 1 | Tour Boon, editor, Chạy → Nộp. "Đúng rồi! +100 XP", 24 dòng, Recap "SQL của bạn / Cách tham khảo", câu tour 8/8 trỏ sang kỹ năng kế tiếp, dock. Vòng học chính **chắc và rõ**. 0 lỗi trang. |
| Trang chủ (người mới vừa chọn Logistics) | Ba thẻ cùng mức: "Tiếp tục: Danh mục cảng…" (Logistics), "Ôn tập hôm nay → **Bắt đầu Phần 1**", "Bài luyện trên dữ liệu cửa hàng → **Bắt đầu từ Phần 1**". Hai trong ba lời gọi kéo sang General dù người học vừa chọn Logistics. |
| Tổng quan Logistics, 0 việc | "Mở việc này" đứng ngay cạnh "**Làm đánh giá thăng tiến ngay**". Sau khi xong việc 1 thì link này không còn. Người mới ngày đầu được mời thi vượt trước khi làm việc nào. |
| Phòng phỏng vấn, 0 kỹ năng | Vào được bộ `junior-1` ngay. Mỗi bộ có ghi "Bạn đã học 0/14 kỹ năng…" nhưng không có gợi ý "nên học trước". |
| Bản đồ Logistics | Tuyến + "mở sau đánh giá ch. N". Không có câu SQL hay số liệu nào (G1 của roadmap-v22 vẫn đúng). Bản đồ Finance: danh sách tên chi nhánh. |
| 375 | Bottom nav 2 hàng (U3). |
| `#/engine` | Chưa có (đúng như kế hoạch). |

### 2. Giữ / Sửa / Bỏ (v18–v21)

| Thứ đã phát hành | Quyết định | Vì sao (giá trị cho junior DA) | Việc cho v22 |
|---|---|---|---|
| **Domain story** (Logistics 12 ch., E-com 7, Finance 7, đánh giá thăng tiến, KPI, Recap) | **Giữ** | Lõi giá trị: câu hỏi nghiệp vụ → SQL → kiểm → kết luận. Chính là việc của DA. e2e đi đủ 139 việc + 9 bài tuyến, không lỗi. | Không thêm chương (D-V22-5). Chỉ làm biến thể (V22-D). |
| **General SQL path** (38 kỹ năng, bài học nhanh, drill, kiểm tra đầu vào, nút nâng cao) | **Giữ, sửa lối vào** | Luyện kỹ năng tách khỏi cốt truyện là cần. Nhưng Trang chủ người mới đẩy hai lối cùng lúc (domain + Phần 1) mà không nói nên đi lối nào. | Hành động 3: một lời gọi chính trên Trang chủ. |
| **Phòng phỏng vấn** (5 bộ đề + 5 take-home) | **Giữ, sửa nhẹ** | Gần nhất với mục tiêu "đi làm": bộ đề không khung, take-home có kết luận tự viết. Rủi ro: người 0 kỹ năng vào ngay rồi thất bại. | Gợi ý "nên học trước" khi < 50 % kỹ năng; nút chính chỉ cho bộ đề vừa sức (U24 đã làm phần nút). |
| **Đánh giá thăng tiến sớm** (thi vượt) | **Sửa** | Hữu ích cho người đã biết SQL. Nhưng hiện ở ngày 0, cạnh việc 1, cho mọi người, kể cả người vừa bấm "Mới bắt đầu, hướng dẫn mình". | Chỉ hiện cho người chọn "Đã biết SQL", hoặc sau khi xong ≥ 1 việc của chương. Không bỏ. |
| **`#/me`** (độ vững, lỗi hay gặp, ngày học, chứng nhận, portfolio zip) | **Giữ** | Portfolio .zip đưa lên GitHub là giá trị thật nhất cho người đi xin việc. Phần "Độ vững", "Lỗi hay gặp" ở người mới toàn chữ "chưa có". | Sửa U16 (cấp bậc tiêu đề). Ở người mới: thu các khối trống thành một dòng. |
| **Lily** (6 giai đoạn, album, phụ kiện) | **Giữ, đóng băng** | Lý do quay lại nhẹ nhàng, không phạt. Đã đủ (roadmap-v22 §3.6). Thêm cơ chế nữa dễ thành chăm sóc bắt buộc. | Không đầu tư thêm, ngoài phần nối mục tiêu tuần của V22-C. |
| **Offline / PWA + snapshot** | **Giữ** | e2e: domain chưa mở vẫn chạy offline; lần hai DB sẵn sàng ~1,1–1,4 s. Rẻ để giữ. | Engine phải theo luật này: runtime lớn (dynoxide 1,3 MB) ngoài precache, ghi rõ khi offline. |
| **Lần mở đầu** (16 s tới "Bắt đầu") | **Sửa** | Người mới chờ lâu nhất đúng lúc dễ bỏ đi nhất. | Hành động 4: đo + cho làm việc 1 sớm hơn (đọc đề trong lúc seed). |
| **Bản đồ** | **Sửa** (đã duyệt: Bản đồ A, L200) | Hiện không dạy gì. Phương án A biến mọi câu SQL thành bản đồ, giá trị thật. | V22-A, giữ ở v25 như roadmap. Không bỏ. |
| **Bảng điều hành + thẻ mẫu** | **Giữ** | Ghim truy vấn thành thẻ mô phỏng việc làm dashboard của DA. | Không việc mới. |
| **Lanes Logistics** | **Giữ, không mở rộng** | 9 bài phụ, ít chi phí. Giá trị nằm ở dữ liệu tuyến, Bản đồ A sẽ dùng lại. | Không. |
| **SQL bằng lời, Thứ tự thực thi, EXPLAIN** | **Giữ** | Giải thích câu. Khoảng trống còn lại là "vì sao ra *dòng này*" (V22-B). | V22-B (đề xuất kéo lên v23, xem §4). |
| **Bộ dữ liệu công khai (penguins)** | **Giữ** | Một bộ, CC0, rẻ. | Không thêm bộ nào trước v30. |
| **Nội dung NoSQL "path" trên `main`** (`content/engine/mongodb/path`, 19 kỹ năng, 76 drill Phần 7–12; nhánh `v22-engine` có đủ Phần 1–12, 217 kiểm) | **Cần quyết** | Thiết kế bản 2 §9 đã **bỏ** lộ trình drill soi gương này. Nó vẫn được viết và gộp, nhưng không có UI, route hay runtime nào trên `main` dùng tới. | Hành động 2: hoặc nhận lại vào thiết kế (ghi L), hoặc gỡ khỏi `main` và giữ ở nhánh. |

### 3. Năm hành động đầu của v22 (thành luồng đầu, theo L217)

Luồng R trong `roadmap-v22-v30.md` chỉ ghi "việc còn mở của v21". Năm luồng dưới đây làm rõ R và **xếp lại thứ tự ưu tiên**.

| # | Luồng | Phạm vi | Cỡ | Điều kiện thoát (kiểm được) |
|---|---|---|---|---|
| **1** | **R0 · Đóng v21 trước khi mở Engine** | U1, U2, U3, E1, cùng P2 còn mở (U16, U18, U19, U20). Push, deploy, tag `v21`, sau đó mới mở v22 (L183, L216). | S–M | `#bottom-nav` < 72 px ở 320. `#status` không phần tử nào `scrollWidth > clientWidth` ở 1024/1280 (VI + EN). axe 0 serious trên site live. Tag `v21` có trên `origin`. |
| **2** | **INT · Cổng tích hợp nội dung Engine** | Dừng viết bài mới của MongoDB/DynamoDB cho tới khi Postgres L1 chạy trên site. Gộp `content/engine/postgres/L1` + `L2` (đang **chưa commit**, worktree `agent-a91fc…`) lên nhánh tích hợp. Quyết số phận `mongodb/path` (xem §2). Nhánh `v22-engine` (33 commit trước `main`, ~1,8 MB nội dung thô) không gộp vào `main` khi chưa có route, loader và test. | M | Postgres L1 + capstone chơi được trên bản build (e2e phần `engine`). Mọi file `content/engine/**` trên `main` đều có route dùng tới, hoặc đã gỡ. Một dòng L ghi quyết định về `path`. |
| **3** | **ONB · Một lời gọi chính cho người mới** | Trang chủ của người vừa chọn domain chỉ có một nút chính ("Tiếp tục việc 1"). Thẻ Ôn tập/Bài luyện (đang trống) thu thành một dòng. Thi vượt chỉ hiện với "Đã biết SQL" hoặc sau ≥ 1 việc. Phòng phỏng vấn ghi "nên học trước" khi < 50 % kỹ năng. Nên gộp với V22-C (cùng `homeView` sections), V22-C đi trước. | M | Smoke người mới: Trang chủ có đúng 1 nút chính. Không có link `early` khi `completed` rỗng và `knows` false. |
| **4** | **BOOT · Rút 16 s lần đầu** | Đo lại (`SMOKE_PERF`, hồ sơ mới, site live). Cho đọc đề việc 1 và bài học nhanh trong lúc seed (màn chào bước 3 dẫn thẳng vào đề). Gộp với V22-E (YAML → JSON). Engine thêm PGlite thứ hai (`pglabWorker`, trần 150) nên phải giữ luật: không boot gì của Engine trước khi người học mở `#/engine`. | M | "Bắt đầu" bật ≤ 10 s ở hồ sơ mới (trung vị 3 lượt), hoặc người học vào được đề việc 1 ≤ 5 s. Main không chứa chuỗi `pglab`/`dynoxide`/`mingo`. |
| **5** | **AUD · Giá trị cho đúng người học** | Gắn nhãn đối tượng cho cấp Engine: L1–L2 = "DA cần", L3–L5 = "đào sâu / kỹ sư dữ liệu". Trang `#/engine` nói rõ điều này. Mỗi cấp có "Học xong bạn làm được…" (ADD-1) và vượt được giải mù trước khi phát hành. | S | Trang Engine có nhãn đối tượng cho từng cấp. Cổng §8 của thiết kế được kiểm cho L1 trong `review-v22.md`. |

### 4. Đề xuất chỉnh roadmap v22–v30

**Có thể áp ngay (người điều phối, trong quyền L215/L219):**

1. **Mở v22 bằng R0, không chạy song song với E-FND.** v21 phải được tag trên `origin` trước.
2. **Đổi luật "≥ 10 agent luôn có việc" thành "nội dung viết trước tối đa một cấp"** (§0 mục 3 của roadmap đã nói N+1 hoặc N+2; thực tế đã viết tới Mongo L5 và Dynamo L5 khi Postgres L1 còn chưa commit). Nội dung đã viết giữ ở nhánh. Agent rảnh làm R, QA, giải mù và V22-B/C, không viết cấp mới.
3. **Kéo V22-B ("Vì sao ra dòng này") lên v23, V22-C lên v22** (cùng ONB). Cả hai dạy trực tiếp junior DA trên phần đã phát hành. Theo §4 của roadmap, chúng đang là mục bị cắt đầu tiên. Đề xuất đảo luật cắt: khi thiếu sức, cắt **E-VIZ của cấp L3–L5** trước, không cắt B/C.
4. **Dải số L:** commit trên các nhánh Engine đã dùng L230, L235–L238, L245–L246 (dải của v23–v25), trong khi v22 được giữ L220–L227. Người điều phối cần đặt lại một bảng ánh xạ ở dòng L đầu tiên của v22, trước khi gộp.
5. **Ngân sách nội dung Engine:** ~1,8 MB thô. Chia chunk theo engine × cấp (`engpgL1`…), nạp lười, có trần riêng. Chốt trước khi gộp, không để tới luồng R của version sau.

**Cần user (đảo một phần L215; chỉ đề xuất, chưa áp):**

6. **"Postgres đầy đủ" = L1–L3 có giá trị DA + L4–L5 đào sâu**, đúng như v26. Nhưng giữa v26 và v27 nên chèn **một version "DA + Engine nối nhau"**: chip "Đào sâu" từ việc story/General sang bài Engine (E-LINK, đang ở v26), Bản đồ A (V22-A), biến thể + bộ đề mới (V22-D). Sau đó Mongo và Dynamo dời một version, nên DynamoDB L4–L5 sẽ vượt v30. Lý do: MongoDB L3/L5 là 0 % chạy thật (thiết kế §1.2), DynamoDB L5 là 100 % D. Giá trị cho junior DA thấp hơn nhiều so với V22-A…D. Nếu user giữ v30 là trần cứng, đề xuất **cắt DynamoDB L4–L5 xuống bài đọc gọn**, không cắt các mục V22.
7. **MongoDB "path" drill soi gương:** hoặc user nhận lại (thì cần UI, budget, test `noDeadEnds`), hoặc gỡ khỏi `main`. Thiết kế bản 2 đã bỏ nó, nhưng công đã bỏ ra. Khuyến nghị: giữ ở nhánh, xét lại sau v30 trên ADD-6 (như §9 thiết kế).

### 5. Rủi ro

| Rủi ro | Mức | Bằng chứng | Giảm |
|---|---|---|---|
| Nội dung đi trước runtime | Cao | Mongo L1–L5, Dynamo L1–L5, Postgres L3 trên `v22-engine`; Postgres L1/L2 chưa commit; L4/L5 ở worktree riêng; `src/engine` chưa có trên `main` | Hành động 2; luật "viết trước tối đa một cấp" (§4.2) |
| Lệch thiết kế | Trung bình | `mongodb/path` gộp vào `main` trái §9 thiết kế bản 2 | Một dòng L chốt, trước v22 |
| Năng lực review | Cao | L217 bắt review mỗi version. Review v21 vẫn có P1 mở trong khi 20+ worktree đang chạy; giải mù (§8.4) mỗi cấp là việc nặng | Mỗi version một cấp Engine (đã có); review là cổng chặn tag, không phải việc "khi rảnh" |
| Ngân sách / máy yếu | Trung bình | Hai PGlite (game + `pglab`), dynoxide 1,3 MB, lần đầu đã 16 s | Hành động 4; Engine không boot trước khi mở; đo 375 ở mỗi version Engine |
| Lệch đối tượng | Trung bình | L3–L5 (trang heap, WAL, sharding, single-table) là việc của kỹ sư dữ liệu, không phải junior DA | Hành động 5; đề xuất §4.6 |
| Trôi số L | Thấp | L230–L246 đã dùng ngoài dải | §4.4 |

### 6. Đưa vào v22 (luồng R)

- **P1:** U1, U2, U3, E1 (đóng v21 trước, hành động 1).
- **P2:** U16, U18, U19, U20; lối vào người mới (hành động 3).
- **Product cần user:** §4.6 (version nối DA ↔ Engine, có thể vượt v30 hoặc cắt Dynamo L4–L5), §4.7 (MongoDB path). Ghi vào dòng L khi user trả lời. Không có trả lời thì giữ `roadmap-v22-v30.md` và áp §4.1–§4.5.


## UI/UX

Người viết: UI/UX · 2026-11-20. Chỉ rà soát, không sửa code.

### 0. Bản kiểm và cách chạy

- **Bản kiểm:** bản RC build ở máy từ `main` @ `321e98d` (UX-B L196/L197 và UX-C L195 đã gộp; UX-A chưa có). Không phải site live, vì v21 chưa push (xem phần Product §0). Sau `321e98d`, `main` chỉ thêm commit tài liệu.
- **Cách chạy:**
  - `vite build --outDir scratchpad\v21rc-dist`, rồi `vite preview --port 5291 --strictPort`.
  - Edge headless qua CDP (cổng 9391, hồ sơ riêng), có `Network.setBypassServiceWorker`. Giữa các lượt xóa `localStorage`, `sessionStorage` và IndexedDB.
  - Save: `tests/fixtures/save-v5.json`. Cho dock thăng tiến dùng thêm save "xong việc 1–4 chương 1".
  - Đã tắt preview và Edge sau khi chạy.
- **Matrix:** 165 màn hình. 20 trang ở 1280 sáng/tối, 1024 sáng, 375 sáng, 320 sáng, EN 1280; 11 trang ở 1024 tối, 375 tối, 375 tối + giảm chuyển động, EN 375. Thêm các lượt workspace (chạy, biểu đồ, thứ tự thực thi, ER, Cột, lỗi, nộp sai), dock việc thường và dock thăng tiến (1280/1024/375 + giảm chuyển động), màn chào → phút đầu, Sandbox.
- **Ảnh và số đo:** `C:\Users\KHOA~1.HUY\AppData\Local\Temp\claude\be8c95d1f89f2452\e927c5e6-22a4-40fa-bff6-3a9e8af9fcbc\scratchpad\v21rc\`. Tên file giữ như `v21ux/` và `v21fixB/` để so trước/sau. Số đo: `audit.jsonl` (tương phản, chữ cắt, vùng chạm, tràn ngang) và `measure.jsonl` (top bar, `#status`, bottom nav, h1/h2). Script: `scratchpad\v21rctool\`.
- **Chưa chạy axe.** E1 được đo trực tiếp bằng `aria-label`, không qua axe.

**Kết quả chung (tự động):**

- **F1 (tương phản):** 0 cặp chữ dưới 4,5:1 trên cả 165 màn hình, sáng lẫn tối. Màu `--good` đổi toàn cục (U15) không làm hỏng chỗ nào.
- **I2 (cuộn ngang):** không có ở cỡ nào, kể cả 320.
- **E2 (top bar):** cao 53 px ở 1024/1280 (VI + EN), 61 px ở 375/320.
- **A1 (popover neo nút):**
  - Menu lĩnh vực mở dưới chip: lệch trái 0 px, cách đáy nút 6 px, ở cả 4 cỡ. Riêng 320 lệch −6 px vì bị giữ trong màn.
  - Menu ⋯: mép phải trùng nút ±4 px, cách đáy nút 8–12 px.
- **C1 (sidebar đẩy):** mở rộng rail thì `<main>` dời phải 192 px, không có scrim, không cuộn ngang. Đúng ở workspace 1280, workspace 1100, Tổng quan 1100 và `#/learn` 1280.
- **C2 (hộp thoại):** Hộp thư (modal) đóng khi bấm nền, focus về `#inbox-btn`. Sổ tay (không modal) đóng bằng Esc, focus về nút mở.
- **Lỗi trang:** 0 `console.error` / exception.

### 1. Đã kiểm: thật sự đã sửa (28/29)

Các mục mà `v21-ux-review.md` (✅ L196, "Đã sửa (L195)") và `v21-e2e-findings.md` (✅ L197, "Đã sửa") ghi là đã sửa. Mỗi mục được kiểm lại bằng phép đo của chính nó, ở cỡ và theme nơi lỗi được tìm ra.

| ID | Kết quả kiểm | Ảnh (`v21rc\`) |
|---|---|---|
| U4 | Dòng giá trị xuống dòng, cột Kiểu luôn thấy (E-com `categories` 1280, Logistics `ports` 375). | `p-light-1280-d_ecommerce_data`, `p-light-375-d_logistics_data` |
| U5 | (a) Biểu đồ cao theo thân tab (thân 299 px, SVG 182 px), trục đủ, nhãn "10 nghìn/15 nghìn" thấy hết. (b) Tab hình đầu tiên nâng panel lên 55 %. (c) Nút "Mở rộng" cho ER/Thứ tự thực thi không làm (L196 không nhận), nên ER vẫn chỉ thấy ~4 dòng của một bảng. | `w-light-1280-chart-bar`, `w-light-1280-er`, `w-light-1280-steps` |
| U6 | Nhãn "SEA · EXPORT", "AIR · IMPORT"… không trùng. | `w-light-1280-chart-bar` |
| U7 | Tab Cột một bảng: lưới 2 cột, chip FK cùng dòng với cột. | `w-light-1280-columns`, `w-light-1024-columns` |
| U8 | Việc 1: chỉ một vạch ngăn giữa "Kết quả" và "Cột". | `firstmin-light-1280` |
| U9 | Khung bảng ôm bảng (`w-fit`). `SELECT *` 22 cột cuộn trong khung: bảng 1568 px trong khung 1160 px, trang không tràn. | `w-light-1280-run-result`, `w-light-1280-select-star`, `w-light-1024-long-sql` |
| U10 | Nộp sai lần 2 ở 1280×800: khối đỏ + dòng của Lily nằm trọn trong pane (274–398 trong 114–405). SQL 22 dòng ở 1024×700: nút Chạy và phản hồi đều thấy. | `w-light-1280-wrong-2-sqlpane`, `w-light-1024-long-sql` |
| U12 | Dải huy hiệu nằm giữa cảnh và bản đồ, nhãn "Đạt đánh giá chương 1", Lily cuối dải, không đè cảnh. | `dock-promo-light-1280-mid/end` |
| U13 | Pill trạng thái 2 dòng ở góc trời trên phải, câu giải thích thành chú thích dưới cảnh (E-com, Finance, sáng + tối). Khung sau hũ Finance giữ theo L148. | `p-light-1280-d_ecommerce`, `p-dark-1280-d_finance` |
| U14 | Thang sự nghiệp: hàng 2 dòng (chức danh / "sau đánh giá chương N"), không lệch cột. | `p-light-1280-d_finance` |
| U15 | 0 cặp dưới 4,5:1 (xem §0). | `audit.jsonl` |
| U17 | `#/me` 375: 0 `li` rỗng. | — |
| U21 | Danh sách tuyến một cột, tên cảng không gãy, gợi ý thành câu dưới bản đồ. | `p-light-1280-d_logistics_map` |
| U22 | Màu chương chỉ ở khung ngoài, ô trong 1 px. Nhãn tự tham chiếu `parent_id` vẫn nằm trên đầu bảng, nhưng L195 đã ghi là chưa làm. | `w-light-1280-er`, `p-light-1280-d_ecommerce_data` |
| U23 | Khối chào là một thẻ rộng bằng các thẻ dưới. | `p-light-1280-home` |
| U24 | Phòng phỏng vấn: hàng gọn, một nút chính ("Bắt đầu" của bộ đầu). | `p-light-1280-learn_interview` |
| U25 | 375 E-com: tiêu đề việc trải hết thẻ. Chương khóa chỉ còn một dòng. | `p-light-375-d_ecommerce` |
| U27 | Hết dòng "Khi nào dùng" lặp. Phần tô màu code chưa làm (đã ghi ở L195). | `p-light-1280-learn_skill_group_by` |
| U28 | Còn một dấu ✓ (huy hiệu), nhãn thống nhất. | `p-light-1280-learn` |
| U29 | Khoảng cách meta và nhịp trong thẻ đều. | `p-light-1280-learn_adv_a2` |
| U31 | Nguồn thẻ là dòng meta dưới tiêu đề; chân thẻ chỉ còn nhóm nút. | `p-light-1280-d_logistics_dashboard` |
| U32 | Dock việc thường ở 1280 mở ≥ 3 s, rồi thu thành "Xong: Khách hàng chủ lực 2025", câu đủ ở `title`. | `dock-task-light-1280-mid/end` |
| U33 | Kỹ năng chưa ôn chỉ còn rãnh, không có mẩu teal. Nhãn dài bị cắt nhưng có `title`. | `p-light-1280-me` |
| U38 | Lỗi 42703 với `cnt`: không còn câu "nháy đơn". | `w-light-1280-sql-error-sqlpane` |
| E2 | Sandbox: thêm ` LIMIT 2` sau khi chạy thì hiện dải "SQL đã thay đổi" và Ghim tắt. Xóa đi thì cả hai hết. | `s-light-1280-stale-edit` |
| E3 | `advLine` có `inline-flex min-h-6` (24 px). Audit vùng chạm ở Finance 375: 0 mục nhỏ. | — |
| E4 | `#stage` có `role=region`, `aria-label` "Việc vừa xong". | — |
| E5 | Mở drill từ story rồi Back: `#work` không còn `inert`, gõ vào editor story được. Không bắt được khoảnh khắc đang tải: chunk đã có sẵn trong cache. | `w-light-1280-drill-back` |

### 2. Ghi là đã sửa nhưng còn lỗi (1)

| ID | Mức | Trang/cỡ | Thấy gì | Sửa đề xuất | File nghi |
|---|---|---|---|---|---|
| U11 (phần 1024) | P2 | Dock thăng tiến, 1024×700 | 375 đã đạt (dock thu thành dòng, không giao "Bắt đầu chương 2"). Ở 1024, L196 nói "dưới 1280 thu thành dòng", nhưng dock vẫn hiện cả cảnh (480×447) trong ≥ 3 s (`SHOW_MS`). Trong lúc đó nó che nút Chạy, dòng "Đúng rồi!" và nửa phải panel. Cuối cùng mới thu (`mini=true`). Ảnh: `dock-promo-light-1024-mid.png` (so với `v21ux\dock-promo-light-1024-end.png`). | Dưới 1280 mở dock ở dạng thu gọn ngay từ đầu (cảnh xem lại bằng "Xem lại"), như 375. Hoặc kiểm `[data-start-chapter]`, Chạy và `#work [role=status]` trước khi mở cả cảnh. | `src/ui/stage.ts` (`fold`, `SHOW_MS`, chỗ quyết định `mini` theo bề rộng) |

### 3. Còn mở, chưa nhận sửa (chờ UX-A), đo lại trên bản này

Các mục này chưa được ghi là đã sửa, nên không tính là "còn lỗi". Ghi lại để UX-A có số đo mới.

- **U1 (P1):** `#rank` bị cắt ở 1280.
  - VI: "Junior DA" (nội dung 62 px trong 45 px), "Thực tập sinh DA" (111 px trong 28 hoặc 61 px).
  - EN: "DA intern".
  - Gặp trên 11–12 trang mỗi domain. Ảnh: `p-light-1280-d_*`, `en-1280-d_finance`.
- **U2 (P1):** ở 1024, `#domain-status` "Ch. 2/12 Junior DA" có nội dung 76 px trong 46 px, chip XP đè lên. E-com: 68 px trong 21 px. Ảnh: `p-light-1024-d_logistics*`, `dock-promo-light-1024-mid`.
- **U3 (P1):** `#bottom-nav` cao 113 px ở 375 và 320 (lưới 4 cột, 5 mục). Mục lĩnh vực rớt xuống hàng 2.
- **E1 (P1 theo checklist K1):**
  - `#review-btn`: chữ hiện "Ôn tập 5", `aria-label` "Ôn tập, 5 mục đến hạn".
  - `#inbox-btn` cũng vậy: "Hộp thư 1" so với "Hộp thư, 1 tin mới".
- **U16, U18, U19, U36 (P2/P3):** vẫn như cũ.
  - `#/me`: `h1` 22 px bằng `h2`.
  - `h1` "Lộ trình" trên mọi trang con.
  - Rail tô "2" trên `#/learn`, `adv/a2`, `adv/d5`, phòng phỏng vấn.
  - Phút đầu: dòng đầu tin nhắn bị cắt ở mép trên pane.
- **U20, U26, U30, U34, U35, U37, U39:** không kiểm lại.

### 4. Lỗi mới

| ID | Mức | Trang / trạng thái | Ảnh (`v21rc\`) | Thấy gì | Sửa đề xuất | File nghi |
|---|---|---|---|---|---|---|
| R21-U1 | P2 | Dock việc thường, 1024×700, ngay sau khi nộp đạt | `dock-task-light-1024-mid.png` | Không có chỗ trống ở đáy, nên `clearPin()` đẩy dock (480×246) lên sát top bar (y = 71). Dock che thanh việc, gồm cả nút chính **"Việc tiếp theo →"** (việc kế tiếp, checklist H4), che editor và nút Chạy (đo: `covers: Chạy`). Từ U32 dock mở ≥ 3 s (trước ~1,1 s), nên lần che kéo dài gấp ba. Ở 1280 và 375 không bị. | Khi `clearPin()` không tìm được chỗ trống, hoặc chỗ tìm được giao `#map`/nút Chạy, thì mở dock ở dạng thu gọn ngay. Thêm nút tiếp tục của `#map` và nút Chạy vào danh sách `keep`. Kiểm CDP: dock không giao nút tiếp tục ở 1024×700. | `src/ui/stage.ts` (`clearPin`, `SHOW_MS`) |
| R21-U2 | P2 | Splitter workspace, 1280×800 | `w-light-1280-split-drag-then-chart.png` | L196 hứa `growPanel` "không ghi đè chiều cao người chơi đặt". Thử: kéo panel xuống 30 % (3× ↓ trên `#split-row`, đã lưu `{row:30}`), rồi mở tab Biểu đồ lần đầu. Panel nhảy lên 55 %, trong khi bản lưu vẫn là 30 %, nên lần tải sau lại là 30. Nguyên nhân: `own` chỉ tính một lần trong `initLayout`. Lỗi phụ (P3): kéo **cột** cũng ghi `row` vào bản lưu, nên từ phiên sau `growPanel` không bao giờ chạy nữa, dù người chơi chưa hề chỉnh chiều cao. | Trong `set(part, v, save)`: khi `part === 'row' && save` thì đặt `own = true`. Chỉ coi `row` là "của người chơi" khi chính nó được kéo, ví dụ lưu thêm cờ `rowSet` hoặc chỉ ghi phần vừa đổi. Thêm test trong `tests/` cho `growPanel` sau khi kéo trong phiên. | `src/ui/splitter.ts` (`initLayout`, `grow`, `set`) |
| R21-U3 ✅ L189 | P2 (checklist D1 xếp P1; ít gặp vì phải đổi cỡ khi menu đang mở) | Menu lĩnh vực, mở ở 1280 rồi thu cửa sổ về 375 | `m-light-375-domain-menu-after-resize.png` | Menu chỉ đặt vị trí lúc mở (`toggle`). Sau khi đổi cỡ, nó nằm ở x = 517–773, ngoài màn 375 (`inView: false`), còn chip đã ở x = 104. Menu ⋯ dùng `inset` cố định bên phải nên không bị. | Nghe `resize`: khi menu đang mở thì tính lại vị trí, hoặc `hidePopover()`. | `src/ui/topbar.ts` (`initTopbar`, khối `domainMenu`) |
| R21-U4 | P2 (tự hết khi sửa U3) | Dock thu gọn, < 1024 (375/320), sau việc hoặc thăng tiến | `wrapup-dark-375.png`, `dock-task-light-375-end.png` | Dòng dock thu gọn đặt ở `bottom-18` (72 px). Bottom nav hiện cao 113 px (U3), nên dòng dock phủ lên hàng nhãn đầu ("Trang chủ", "Lộ trình", "Luyện SQL", "Tiến bộ") cho tới khi bấm Đóng. Ảnh `v21fixB\wrapup-dark-375.png` cũng có lỗi này, nên lỗi đến từ bản sửa U11. | Sửa U3 (nav ≤ 64 px + safe-area) là đủ. Nếu không, đặt `bottom` của `#stage` theo chiều cao thật của `#bottom-nav` (biến CSS do `topbar.ts` ghi). Kiểm: rect `#stage` không giao `#bottom-nav` ở 320/375. | `index.html` (`#stage` `max-lg:bottom-18`), `src/style.css` |
| R21-U5 | P3 | Workspace 375, nộp sai lần 2 | `w-light-375-wrong-2-sqlpane.png` | Khối phản hồi đỏ bắt đầu ở y = 584. Bottom nav 2 hàng (từ y = 627) che gần hết khối. Đây là hệ quả của U3; U10 chỉ kiểm ở 1280/1024. | Sửa U3. Thêm `scroll-margin-bottom` bằng chiều cao nav cho `#work [role=status]` khi tự cuộn. | `src/ui/work.ts`, `src/style.css` |
| R21-U6 ✅ L189 | P2 (lỗi cũ, chưa có trong `v21-ux-review.md`; checklist G1) | Số trên nút "Ôn tập" theo domain | `p-light-1280-d_ecommerce.png`, `p-light-1280-home.png` | Cùng một save: Trang chủ và Logistics ghi "Ôn tập 5" / "Ôn hôm nay (5)", E-com và Finance ghi "Ôn tập 2". `reviewSkills()` lấy kỹ năng từ `app.tickets` (domain đang mở), trong khi hàng ôn là General (`lab`), không thuộc domain. Có cả ở `v21ux\`, nên không do bản sửa gây ra. | Đếm theo mọi kỹ năng đã học: `knownSkills` của General cộng thẻ ôn, không phụ thuộc domain đang mở. Hoặc ghi rõ phạm vi. | `src/session.ts` (`reviewSkills`, `reviewCount`) |

**Đếm lỗi mới:** P1 = 0 · P2 = 5 (R21-U1, U2, U3, U4, U6) · P3 = 1 (R21-U5).

### 5. Đưa vào v22 (luồng R)

- **Trước khi tag v21:** UX-A (U1, U2, U3, E1).
  - U3 cũng xóa R21-U4 và R21-U5.
- **P2, nên gộp vào UX-A** (nhỏ, cùng file với việc đang làm):
  - R21-U1 + U11 phần 1024: một quy tắc trong `stage.ts`, dưới 1280 dock mở ở dạng thu gọn.
  - R21-U2 (`splitter.ts`, kèm test).
  - R21-U3 (`topbar.ts`). ✅ L189: menu đặt lại theo chip khi đổi cỡ.
- **Cho v22:**
  - R21-U6 (số ôn theo domain). ✅ L189: `reviewSkills()` = thẻ ôn + kỹ năng học qua Logistics, không theo domain đang mở (`tests/reviewCount.test.ts`).
  - U5(c): nút "Mở rộng" cho ER/Thứ tự thực thi.
  - Nhãn tự tham chiếu của ER.
  - Các P2/P3 còn mở của `v21-ux-review.md`.
- **Đưa vào `scripts/ux-audit.mjs`** (v22, rẻ, bắt được đúng các lỗi trên):
  - dock không giao nút tiếp tục / Chạy / `[data-start-chapter]` / `#bottom-nav` ở 1024 và 375;
  - popover vẫn nằm trong viewport sau `resize`;
  - `--row` không đổi khi mở tab hình sau khi kéo panel;
  - số trên `#review-btn` bằng nhau giữa các domain.
