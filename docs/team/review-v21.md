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
