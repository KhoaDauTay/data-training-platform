# Product Design v5: tên nền tảng, kiến trúc domain, lộ trình DA nâng cao

Ngày: 2026-11-17 · Vai trò: Product Designer + UX · Theo **L54** và lời làm rõ **L55** của user (`decision-log.md`).
Đầu vào: `CLAUDE.md`, `product-design-v4.md` (đã duyệt là v7, L54), `product-design-v3.md`, `ui-ux-v4.md`, `curriculum.md`, `glossary-vi.md`, `content/skills.yml`, `content/chapters.yml`, `src/route.ts`, `src/ui/topbar.ts`, `src/save.ts`, `src/db/run.ts`, `src/db/schema.sql`, `index.html`, ticket ch11.
Mockup: `.superpowers/brainstorm/11840-1794844744/content/domains-brand-v8.html` (5 màn, sáng/tối, 375 px).

Tài liệu này **chỉ đề xuất**. Nó không sửa `src/`, `content/` hay test. User duyệt phần **G (Quyết định)** trước khi build.

---

## 0. Tóm tắt một trang

| Yêu cầu | Đề xuất |
|---|---|
| (1) Tên nền tảng | **Truy** (từ "truy vấn"; người nói tiếng Anh đọc gần "try"). Tagline: *"Truy vấn như đi làm thật."* / *"Try it on real data."* Phương án 2: **Rowmap**. Chỉ đổi tên hiển thị; repo, URL và mọi khóa `cargo-query*` trong localStorage giữ nguyên (đổi khóa = mất tiến độ). Công ty hư cấu vẫn là "Cargo Query Logistics". |
| (2) Chia domain | Hai tầng: **Chung (General)** = học kỹ năng SQL bằng **bài luyện nhỏ (drill)** trên bộ dữ liệu trung tính `lab`, cộng lộ trình và ôn tập. **Domain** = thực hành DA theo cốt truyện (Logistics hôm nay; Finance, E-commerce "Sắp có"). Nav: `Trang chủ · Lộ trình · Luyện SQL` + **nút chọn domain** + thanh phụ của domain `Tổng quan · Làm việc · Sandbox · Dữ liệu · Bảng điều hành`. Route `#/learn/…`, `#/practice`, `#/d/<domain>/…`; hash cũ được chuyển tiếp mãi mãi. **Không tăng `SAVE_VERSION` bây giờ.** |
| (3) Lộ trình DA nâng cao | Track thứ hai trong Lộ trình: **20 nút dạy được bằng SQL trên PGlite** (16 trọn vẹn, 4 một phần) (đã chạy thử từng tính năng trên PGlite 0.5.16), mỗi nút có bài học nhanh + drill + một bài thử thách trong phần Chung. **8 nút ngoài nền tảng** (Excel, BI, Python/pandas, lý thuyết thống kê…) chỉ có link tài nguyên. Mỗi chương domain khai báo (suy ra) kỹ năng nó dựa vào, nên lộ trình hiện được "học ở Chung → áp dụng ở Domain". |
| Làm gì **ngay** | N0 đổi tên hiển thị (0,5 ngày) → N1 khung IA + route + nav (2–3 ngày, mở khóa onboarding P2 của v4) → N2 bộ máy drill + `lab` (3–4 ngày + nội dung). Finance là việc lớn, để sau và khi đó mới tăng Save v4. |

---

## A. Tên nền tảng (brand)

### A.1 Tiêu chí

1. Đứng **trên** mọi domain (không gợi riêng cảng biển: loại "Harbor", "Dock", "Cargo").
2. Đọc được bằng cả tiếng Việt và tiếng Anh, viết **không dấu** vẫn đúng nghĩa (URL, logo, bàn phím).
3. Ngắn (≤ 7 ký tự), gợi học / dữ liệu / nghề.
4. Không va chạm với thương hiệu lớn hoặc sản phẩm cùng ngành (đã tra web, xem cột Rủi ro).

### A.2 Danh sách (7 tên, 3 khả thi + 4 bị gắn cờ)

Tên miền `.com/.dev/.vn`: **CHƯA kiểm** cho tên nào. Tra trùng tên chỉ là tìm web (nguồn ở §H), **không phải** tra cứu nhãn hiệu tại USPTO/Cục SHTT.

| # | Tên | Ý nghĩa / lý do | VI | EN | Độ dài | Giọng | Tagline VI / EN | Rủi ro (đã tìm web) |
|---|---|---|---|---|---|---|---|---|
| 1 | **Truy** ★ | "truy vấn" (query), "truy tìm" (lần ra nguyên nhân), "truy đến cùng". EN đọc gần **"try"**: thử, làm thật. Một từ nói đúng việc của DA. | Rất tự nhiên | "troo-ee" / "try"; dễ | 4 | Học + dữ liệu, gọn | *Truy vấn như đi làm thật.* / *Try it on real data.* | Tìm "Truy" và "truyvan" (app học dữ liệu): **không thấy** sản phẩm trùng. Là động từ thường, nên phần chữ khó bảo hộ riêng; cần logo riêng (con trỏ `truy_`). |
| 2 | **Rowmap** | **row** (dòng dữ liệu) + **roadmap** (lộ trình). Nói đúng hai thứ sản phẩm có: SQL và lộ trình nghề. | "râu-máp", đọc được | Rõ | 6 | Học, lộ trình | *Từng dòng dữ liệu, từng bước lên nghề.* / *Every row a step forward.* | Tìm chính xác "Rowmap": **không thấy** công ty/app trùng (gần nhất: Rowm, RowStream, ngành khác). Không có nghĩa tiếng Việt. |
| 3 | **Sang** | Ba nghĩa: "sàng" (sàng lọc = WHERE), "sang" (chuyển **sang** nghề Data), "sang" (chỉn chu). | Thân, nhưng không dấu thì mơ hồ (sáng/sàng/sang) | "sahng"; với người Anh trùng "sang" (quá khứ của sing) | 4 | Nghề, đổi nghề | *Sang nghề Data, từng câu truy vấn.* / *Switch into data, one query at a time.* | Không thấy app học trùng tên. Là tên người Việt phổ biến; nghĩa lệch khi viết không dấu. |
| 4 | Mạch (Mach) | "mạch dữ liệu", "mạch truyện"; EN "Mach" = tốc độ | Mất dấu thành "mach/mách" | Rõ | 4 | Nhanh, kỹ thuật | *Nắm mạch dữ liệu.* / *Learn at Mach speed.* | **Trung bình**: MachEye (BI), Mach5data (analytics), MACH Alliance. Mất dấu đổi nghĩa. |
| 5 | Quarry | "mỏ đá" ↔ "query": đào ra câu trả lời | "quơ-ri", khó | Rõ | 6 | Đào dữ liệu | *Đào ra câu trả lời.* / *Dig answers out of data.* | **Cao**: đã có app iOS **"Quarry: SQL & Python Prep"**, cùng ngành học SQL. Thêm The Quarry (thequarry.io, tư vấn data). **Loại.** |
| 6 | Datara | coined: data + "ra" (dữ liệu **ra** insight) | Dễ | Dễ | 6 | Dữ liệu | *Dữ liệu ra quyết định.* / *Data, out loud.* | **Cao**: datara.ai là nền tảng dữ liệu khách hàng/AI (2025). **Loại.** |
| 7 | Casebook | mỗi domain là một "case" | "kây-búc", tạm | Rõ | 8 | Nghiệp vụ | *Mỗi ngành một hồ sơ.* / *Every industry, a case.* | **Cao**: nhãn CASEBOOK còn hiệu lực cho phần mềm SaaS (Casebook PBC, class 42). **Loại.** |

Đã cân nhắc và bỏ trước khi vào bảng: **OnShift** (nhãn ONSHIFT của ShiftKey, phần mềm nhân sự y tế), **DataCamp**/**Analyticamp** (quá gần DataCamp), **Selectra** (công ty Pháp lớn), tên chỉ có tiếng Việt như "Nghề Số", "Thực Chiến Data" (người nói tiếng Anh không đọc được; giữ "thực chiến" làm chữ quảng bá).

Hai ghi chú định vị:

- Tên repo/URL `data-training-platform` gần trùng app **"Data Training"** (datatraining.io, học data analytics). Giữ repo được (không ai thấy tên repo trên giao diện), **không** dùng "Data Training" làm brand.
- Đối thủ cùng ý tưởng: **Datalyze** (MachineHack), nền tảng học DA mô phỏng, game hóa. Khác biệt của ta: tiếng Việt, SQL thật chạy trong trình duyệt, lộ trình nghề, miễn phí.

### A.3 Khuyến nghị: **Truy**

- Ngắn nhất, có nghĩa thật trong tiếng Việt và gần nghĩa ("try") trong tiếng Anh. Dùng được trên mọi domain: "Truy · Logistics", "Truy · Finance".
- Wordmark: chữ thường **`truy_`** có con trỏ nhấp nháy (CSS, tắt khi `prefers-reduced-motion`), icon vuông chữ `t_` thay icon mỏ neo (mỏ neo chuyển thành icon của domain Logistics).
- Câu giới thiệu dưới logo ở Trang chủ: *"Học SQL và phân tích dữ liệu bằng việc thật."* / *"Learn SQL and data analysis through real work."*

### A.4 Phạm vi đổi tên (chỉ hiển thị)

| Đổi | Giữ nguyên |
|---|---|
| `<title>`, wordmark trong `index.html`, chuỗi i18n tên app, màn chào onboarding, file xuất tiến độ (tên file mới `truy-progress-….json`; Nhập vẫn đọc file cũ) | Repo `data-training-platform`, URL GitHub Pages, khóa `cargo-query-save`, `cargo-query/*` (đổi khóa = người chơi mất tiến độ; ghi chú trong `CLAUDE.md`), tên công ty hư cấu **Cargo Query Logistics**, tên chương, ticket |

---

## B. Kiến trúc thông tin: Chung và Domain

### B.1 Quy tắc chia (L55)

> **Chung** = học kỹ năng (bài nhỏ, ngắn, nhiều, không cốt truyện). **Domain** = làm việc DA (việc theo chương, có người gửi, có bối cảnh ngành).

Một thứ thuộc **Domain** khi nó cần **cơ sở dữ liệu hoặc cốt truyện của ngành đó**. Còn lại thuộc **Chung**.

| Thành phần hiện có | Thuộc | Vì sao |
|---|---|---|
| Bài học nhanh (v4 §C), thẻ kỹ năng, Sổ tay | **Chung** | Nói về kỹ năng SQL, không về ngành |
| **Drill** (bài luyện nhỏ theo kỹ năng, mới, §C) | **Chung** | Chạy trên bộ dữ liệu trung tính `lab` |
| Lộ trình (v4 §D) | **Chung** (`#/learn`), kèm view chương của từng domain | Track kỹ năng dùng chung; chương là của domain |
| Ôn tập (Leitner, `review` theo skill id) | **Chung** | `review` đã khóa theo kỹ năng, vốn đã toàn cục |
| Luyện tập (Practice mode hiện tại) | **Chung**, đổi thành hub "Luyện SQL" | Bài ôn lấy từ drill; chưa có drill thì dùng biến thể ticket domain như hiện nay |
| Việc (ticket), cột mốc, Hộp thư, cảnh cảng, bản đồ tuyến, bài tuyến | **Domain** | Cốt truyện và dữ liệu Logistics |
| Sandbox | **Domain** | Truy vấn tự do trên DB của domain (drill của Chung đã có editor riêng) |
| Dữ liệu (ER + cột) | **Domain** | Mô tả DB của domain. Bảng `lab` hiện trong tab Cột/ER của chính trang drill |
| Bảng điều hành (KPI, card) | **Domain** | KPI của công ty hư cấu |
| XP | **Chung** (một số) | Đã là một số trong Save |
| Chương, bậc nghề (Junior DA → Trưởng nhóm) | **Domain** | Chức danh nằm trong `chapters.yml` của câu chuyện Logistics |

**Chỗ vướng phải giải quyết:** bài học nhanh v4 (đang build, P1) chạy ví dụ trên bảng Logistics. Cách xử lý: phần chữ của bài học (khái niệm, cú pháp, bẫy) là Chung; **ví dụ chạy được** có thêm trường `dataset` (mặc định `logistics`, bài mới dùng `lab`). P1 build tiếp như đã duyệt, không chặn. Chuyển ví dụ sang `lab` là việc tùy chọn ở N4 (quyết định **D-G4**).

### B.2 Nav mới (thay nav 6 mục của L49)

```
Hàng 1 (mọi trang):
[truy_] [Trang chủ · Lộ trình · Luyện SQL] [⚓ Logistics ▾]  ···  [★ 80 XP] [Ôn tập 3] [Sổ tay] [VI|EN] [☀|◐|☾] [●] [⋯]

Hàng 2 (chỉ trên trang domain):
[Tổng quan · Làm việc · Sandbox · Dữ liệu · Bảng điều hành]   ···   [Ch. 1/12 · Thực tập sinh DA] [Hộp thư 1]
```

- **Nút chọn domain** (menu `popover`, như menu ⋯ hiện có): Logistics (đang chọn, "Ch. 1/12"), Finance "Sắp có", E-commerce "Sắp có", mỗi mục một dòng mô tả. Mục "Sắp có" bấm được, mở trang giới thiệu (§B.6), không khóa im lặng.
- Ở trang Chung, nút domain hiện domain gần nhất (pref `cargo-query/domain`) để quay lại một chạm, không có viền "đang ở".
- **Thanh trạng thái**: chương và bậc nghề là của domain, nên chuyển xuống hàng 2. Hàng 1 chỉ giữ XP (toàn cục) và Ôn tập (toàn cục).
- **Hộp thư** chỉ hiện trong domain (thư là của cốt truyện).
- Nav khóa theo tiến độ (v4 D-O3, khóa + tooltip) áp cho mục mới như cũ: Sandbox, Dữ liệu, Bảng điều hành khóa ngày đầu; Lộ trình và Luyện SQL **luôn mở**.
- Desktop ≥ 1280 px: hàng 1 một dòng (3 mục nav thay vì 6, nên dư chỗ cho nút domain). Hàng 2 cao 40 px, nền `--panel`, thay vị trí của dải bản đồ khi không ở Làm việc.
- **Mobile 375 px**: hàng 1 = logo + nút domain (chỉ icon + tên ngắn) + XP + ⋯. Nav Chung thành **thanh dưới cố định 3 nút** (Trang chủ, Lộ trình, Luyện SQL) + nút thứ 4 "Domain" mở danh sách mục của domain. Bỏ lưới 3×2 trong header (nó chiếm 2 hàng ở mọi trang).

### B.3 Route

`parseRoute` hiện chỉ đọc đoạn đầu và mọi đường lạ về Trang chủ. Đề xuất (mọi đoạn là chữ thường, an toàn để chia sẻ link):

| Route | Trang | Ghi chú |
|---|---|---|
| `#/` | Trang chủ nền tảng | §B.5 |
| `#/learn` | Lộ trình: 2 track (SQL nền tảng, DA nâng cao) | Thay "Toàn cảnh trong Trang chủ" của v4 D-P1 |
| `#/learn/sql/<n>` | Module SQL n (1–12): kỹ năng + drill + "áp dụng ở Logistics ch n" | |
| `#/learn/adv/<node>` | Nút nâng cao (vd `#/learn/adv/cohort`) | |
| `#/learn/skill/<id>[/<drillId>]` | Trang kỹ năng: bài học nhanh + danh sách drill; có drillId thì mở workspace | Workspace dùng lại `#shell` |
| `#/practice` | Luyện SQL: Ôn tập đến hạn, kỹ năng yếu, drill gợi ý | Thay Practice mode trong `play` |
| `#/d/<domain>` | Tổng quan domain (Trang chủ cũ của Logistics) | |
| `#/d/<domain>/play[/<ticketId>]` | Làm việc | |
| `#/d/<domain>/ch/<n>` | Lộ trình chương của domain (v4 §D.2) | Thay `#/path/<n>` (đã duyệt, chưa build) |
| `#/d/<domain>/sandbox`, `/data[/<table>]`, `/dashboard` | như hiện tại | |

**Chuyển tiếp** (giữ mãi, một bảng alias trong `route.ts`, có test):

| Hash cũ / `ROUTE_KEY` cũ | Mới |
|---|---|
| `#/play`, `play` | `#/d/logistics/play` |
| `#/data`, `#/data/<t>`, `data` | `#/d/logistics/data[/<t>]` |
| `#/dashboard`, `dashboard` | `#/d/logistics/dashboard` |
| `#/path/<n>` | `#/d/logistics/ch/<n>` |
| `#/` lần đầu của người chơi đã có `completed` | giữ `#/` (Trang chủ nền tảng có thẻ "Tiếp tục" về đúng việc) |
| `#/d/finance/*`, `#/d/ecommerce/*` | trang "Sắp có" của domain đó |
| domain lạ, trang lạ | `#/` (như hiện nay) |

### B.4 Ánh xạ nav 6 mục hiện tại

| Hôm nay (L49) | v5 |
|---|---|
| Trang chủ | tách: **Trang chủ** nền tảng (`#/`) + **Tổng quan** Logistics (`#/d/logistics`, giữ nội dung Trang chủ cũ: cảnh cảng, tiếp tục, chương, tuyến) |
| Làm việc | Logistics › **Làm việc** |
| Luyện tập | **Luyện SQL** (Chung) |
| Sandbox | Logistics › **Sandbox** |
| Dữ liệu | Logistics › **Dữ liệu** |
| Bảng điều hành | Logistics › **Bảng điều hành** |
| (mới) | **Lộ trình** (Chung) |

### B.5 Trang chủ nền tảng và Tổng quan domain

**Trang chủ nền tảng (`#/`)**, từ trên xuống:

1. **Tiếp tục**: một thẻ lớn, việc gần nhất (drill hoặc ticket), một nút.
2. **Hôm nay**: Ôn tập đến hạn (N kỹ năng), 1 drill gợi ý cho kỹ năng yếu nhất.
3. **Domain** (thẻ ngang): Logistics (Ch. 1/12, Thực tập sinh DA, thanh tiến độ, "Vào làm"), Finance "Sắp có", E-commerce "Sắp có".
4. **Kỹ năng**: 4/38 đã học, 1 thành thạo; dải 12 module SQL (chấm màu), link "Xem lộ trình".
5. Lần đầu (chưa có `completed`, chưa có drill): thay (1) bằng hai lối: **"Vào làm ở Logistics"** (khuyến nghị, có cốt truyện, dạy từ đầu) và **"Luyện SQL trước"** (drill module 1). Màn chào và tour onboarding v4 P2 chạy trên lối thứ nhất.

**Tổng quan Logistics (`#/d/logistics`)** = Trang chủ hiện tại (cảnh cảng, Cargo Query Logistics, tiếp tục ticket, toàn cảnh 12 chương của domain, bản đồ tuyến, KPI tóm tắt). Thêm: mỗi chương có chip **"Dựa vào: Lọc dòng · Sắp xếp · Top N"**, chip xanh khi đã học ở Chung.

### B.6 Trạng thái "Sắp có" (Finance, E-commerce)

Trang `#/d/finance`:
- Tiêu đề, một đoạn: *"Phân tích công nợ, dòng tiền, ngân sách cho một công ty hư cấu. Đang thiết kế."*
- **"Kỹ năng bạn đã có sẽ dùng được ở đây"**: chip các kỹ năng Chung đã học (cho thấy học ở Chung không phí).
- Hai nút: "Luyện SQL trong lúc chờ" (`#/practice`), "Về Logistics".
- Không form đăng ký, không đếm ngược, không hứa ngày (không có backend; D6).

### B.7 Save và tiến độ

Nguyên tắc: **không tăng `SAVE_VERSION` cho tới khi có domain thứ hai thật**. Lý do và cách làm:

| Trường Save v3 | v5 (bây giờ) | Khi Finance ra (Save v4) |
|---|---|---|
| `completed` | Giữ id trần của Logistics (`ch1-01`). Drill Chung dùng tiền tố **`g-`**, domain mới **`fin-`**, **`ecom-`**. Domain của một id lấy từ **nội dung** (thư mục), không đọc từ chuỗi. Test nội dung: id duy nhất toàn cục. | Không đổi |
| `xp` | Một số toàn cục. Drill: +10 XP lần đầu đạt, 0 lần sau (**D-G2**) | Không đổi |
| `drafts`, `graded`, `hintsUsed`, `bossStep` | Khóa theo id ticket/drill, đã duy nhất | Không đổi |
| `review` | Đã theo skill id, toàn cục. Drill đạt cũng tạo/nâng thẻ Leitner | Không đổi |
| `practice` | Giữ (tổng số bài Luyện SQL) | Không đổi |
| `sandboxDraft` | Của Logistics | → `sandboxDrafts: { logistics, finance }` |
| `dashboard` | Của Logistics | → `dashboards: { logistics, finance }` |
| `lanes` | Id bài tuyến, đã duy nhất | Không đổi |

- **Đổi tên id Logistics sang `logistics/ch1-01`** đã cân nhắc và bỏ: `Known` bỏ mọi id lạ khi đọc, nên phải tăng version + migration + fixture chỉ để đổi chuỗi, không lợi gì vì domain đã suy ra từ nội dung.
- **Việc phải làm ngay** để không mất dữ liệu: `Known.ticketIds` phải chứa id drill `g-…` (nếu không, drill đã xong bị xóa khi tải lại).
- **Bậc nghề theo domain** (`rankOf` trên ticket của domain, đã là hàm suy ra). Trang Chung không hiện bậc nghề, chỉ XP + số kỹ năng thành thạo.
- Pref thiết bị mới: `cargo-query/domain` (domain gần nhất, validate khi đọc như `parseLayout`).

### B.8 Kỹ năng học ở nơi này có tính ở nơi khác không

- **Có.** Một kỹ năng được coi là **đã học** khi: một ticket domain `grants` nó đã xong, **hoặc** đạt 2 drill của nó, **hoặc** có thẻ `review`. Thành thạo = hộp Leitner ≥ 4 (v4 D-P2), bất kể học ở đâu.
- Chương domain **không bị khóa** bởi Chung (**D-G3**). Ticket `teach` của domain vẫn dạy; nếu kỹ năng đã học ở Chung, thẻ bài học nhanh tự thu gọn với dòng "Bạn đã luyện ở Luyện SQL" và gợi ý bậc 1 vẫn như cũ. Như vậy người đi thẳng vào Logistics không thiếu gì, người luyện trước thì đi nhanh hơn.
- Domain mới (Finance) có thể bắt đầu ở mức cao hơn: chương 1 của Finance `requires` kỹ năng mà người chơi có thể đã học ở Chung hoặc Logistics; nếu chưa, lộ trình chương hiện "Học trước ở Luyện SQL: …" (link, không khóa).

### B.9 Mỗi chương domain khai báo kỹ năng nó dựa vào

Không thêm trường bắt buộc: **"Dựa vào" của chương = hợp `requires` ∪ `grants` của các ticket trong chương** (dữ liệu có sẵn). `chapters.yml` có thể thêm `uses:` tùy chọn cho kỹ năng nâng cao mà ticket không khai báo. Lộ trình hiện mũi tên **Chung (module/nút) → Domain (chương)**:

```
Luyện SQL › Module 1: Chọn cột · Lọc dòng · Sắp xếp · Top N ──► Logistics › Ch. 1 Tuần thử việc
Lộ trình › Nâng cao › Cohort & retention ───────────────────► (Logistics: chuyên đề, sau) · (E-commerce: ch. …)
```

---

## C. Phần Chung: drill và bộ dữ liệu `lab`

### C.1 Bộ dữ liệu trung tính `lab` (D-G1)

- **Một Postgres schema `lab` trong cùng DB PGlite**, không phải DB thứ hai (DB thứ hai = worker thứ hai + 10–13 s tải lạnh nữa). Bảng Logistics vẫn ở `public`.
- Khi chạy drill: `runSandboxed` chạy `SET LOCAL search_path TO lab, pg_catalog` sau `BEGIN` (câu do app chạy, người chơi vẫn chỉ được một câu). **Đã thử trên PGlite 0.5.16**: cùng tên bảng `orders` ở `public` và `lab`, `SET LOCAL` trả bảng `lab`, sau `ROLLBACK` trở lại `public`.
- Chủ đề: **một chuỗi cửa hàng nhỏ** (bán lẻ chung, không cốt truyện, không nhân vật), đủ để dạy mọi mẫu nâng cao. Khác E-commerce sau này (domain đó có câu chuyện và dữ liệu riêng).

| Bảng `lab` | Dùng cho |
|---|---|
| `stores`, `products`, `customers` (signup_date, city), `orders`, `order_items` | cơ bản, join, gom nhóm, RFM, cohort, KPI |
| `staff` (manager_id) | self-join, **recursive CTE** |
| `app_events` (user_id, event, ts, `props jsonb`) | **funnel**, **JSONB**, chuỗi thời gian |
| `experiments`, `assignments` | **A/B test** cơ bản |
| `raw_signups` (cố tình bẩn: trùng, email sai, NULL, ngày tương lai) | **data quality**, regex |
| `fact_sales`, `dim_date`, `dim_product`, `dim_customer` (SCD2: valid_from/valid_to/is_current) | **star schema**, **SCD** |
| chỉ mục có sẵn trên `orders(customer_id)`, `app_events(user_id, ts)` | hiệu năng (EXPLAIN) |

- Kích thước mục tiêu ~15k dòng, một khối `setseed()` riêng, **nối cuối `seed.sql`** (đúng luật seed), `CREATE SCHEMA lab` ở cuối `schema.sql`. Bảng `public` và md5 trong `tests/seed.test.ts` không đổi. Thời gian seed thêm: cần đo ở N2 (ước < 0,5 s, chưa đo).

### C.2 Định dạng drill (dùng lại parser ticket)

Drill là file markdown cùng định dạng ticket, chấm bằng **cùng `grader.ts`**:

```yaml
---
id: g-where-02
track: general          # mới; không có = ticket domain
dataset: lab            # mới; mặc định logistics
skill: where            # kỹ năng chính được luyện (một)
requires: [select]
kind: drill             # drill | challenge (thử thách cuối nút nâng cao)
difficulty: 1
ordered: false
columns:
  - { vi: "Tên sản phẩm", en: "Product name" }
---
## Task
Liệt kê tên các sản phẩm giá trên 100.000 đồng.
## Solution
SELECT name FROM products WHERE price_vnd > 100000;
# EN
## Task
List the names of products priced above 100,000 VND.
```

- Thư mục: `content/general/sql/<skill>/` và `content/general/adv/<node>/`. Không có `from`, `beat`, `scene`, cốt truyện; đề 1–2 câu.
- 3 drill/kỹ năng: **làm theo** (khung điền, `faded`), **tự làm**, **biến thể** (bẫy hay gặp). Nút nâng cao thêm 1 **thử thách** (bài nhiều bước ngắn).
- Bài học nhanh vẫn ở `skills.yml` (`lesson`, v4 §C.5); thêm `module: 1–12` hoặc `track: advanced` + `node:`.
- Test nội dung mở rộng: drill chỉ dùng bảng `lab`; VI + EN; `columns` khớp; id `g-` duy nhất; mỗi kỹ năng có ≥ 3 drill trước khi hiện trong Luyện SQL.
- Chấm hiệu năng: dùng lại cơ chế `plan:` + câu hỏi `reflect` của ch11 (so kế hoạch/số dòng, không so mili giây; thời gian PGlite trong trình duyệt không đại diện cho server).

### C.3 Luyện SQL (`#/practice`) và Ôn tập

- Ôn tập đến hạn lấy **drill** của kỹ năng (độc lập domain). Kỹ năng chưa có drill: dùng biến thể ticket domain như Practice hiện nay (không vỡ gì trong lúc viết dần drill).
- Không có boss trong Luyện SQL (giữ L10).
- Sandbox của Chung: **không làm** (YAGNI). Ai muốn truy vấn tự do trên `lab` dùng editor của trang drill; thêm "Sandbox lab" khi có người hỏi.

---

## D. Lộ trình DA nâng cao (track thứ hai)

### D.1 Nguồn và cách đọc roadmap.sh

- https://roadmap.sh/data-analyst: trang render bằng JS; fetch chỉ ra phần bài viết, **không ra nút**. Danh sách nút lấy từ thư mục nội dung của repo nguồn (https://github.com/kamranahmedse/developer-roadmap, nay chuyển hướng sang `nilbuild/developer-roadmap`, đường dẫn `roadmaps/data-analyst/content/`, ~100 file). **Nhóm và thứ tự nút trên sơ đồ chưa kiểm** (thư mục không giữ thứ tự).
- Các nhóm đọc được từ tên file: Giới thiệu và các loại phân tích (descriptive, diagnostic, predictive, prescriptive); **Excel** (IF, DATEDIF, VLOOKUP/HLOOKUP, TRIM, CONCAT, pivot tables, charting); **ngôn ngữ lập trình** (Python, R; pandas, dplyr; matplotlib, seaborn, ggplot2); **thu thập dữ liệu** (databases, CSV, APIs, web scraping); **làm sạch** (missing data, duplicates, outliers, transformation); **thống kê** (central tendency, dispersion, distribution shape, correlation, hypothesis testing, regression); **trực quan hóa** (bar, line, scatter, histogram, pie, stacked, heatmap, funnel chart; Tableau, Power BI); **machine learning** (tùy chọn, có deep learning); **big data** (Hadoop, Spark, MapReduce).
- **roadmap.sh DA chỉ có một nút "Databases" cho SQL**, không có cohort, retention, RFM, funnel SQL, mô hình hóa dữ liệu hay SQL nâng cao. Các nút đó trong bảng dưới là **đề xuất của nhóm**, nguồn kỹ thuật là PostgreSQL docs và Kimball (§H). Đây cũng là khoảng trống mà nền tảng lấp được: roadmap.sh nói "học SQL", ta dạy **SQL phân tích** trên dữ liệu có thật.

### D.2 Kiểm trên PGlite 0.5.16 (chạy thật, Node, `@electric-sql/pglite` bản pin)

Chạy được: `WITH RECURSIVE`, `generate_series` (ngày/tháng), JSONB (`#>>`, `jsonb_array_length`), `ROLLUP`, `GROUPING SETS`, `CUBE`, `GROUPING()`, khung cửa sổ `ROWS BETWEEN` và `RANGE BETWEEN interval`, `percentile_cont/percentile_disc/mode() WITHIN GROUP`, `stddev_samp`, `corr`, `regr_slope`, `FILTER`, `NTILE/percent_rank/cume_dist`, `LATERAL`, `date_bin`, `regexp_replace` và `~`, `WINDOW w AS`. **`crosstab`** chạy được **chỉ khi** nạp extension `tablefunc` lúc khởi tạo PGlite (`extensions: { tablefunc }`; hiện worker không nạp extension nào), nên đề xuất dạy pivot bằng `FILTER`, `crosstab` chỉ là đọc thêm (**D-R2**).

### D.3 Bảng nút

Ký hiệu: **▣ Trong nền tảng** (bài học + 3 drill + 1 thử thách trên `lab`, chấm tự động) · **◐ Một phần** (phần SQL trong nền tảng, lý thuyết ngoài) · **↗ Bên ngoài** (chỉ link). Effort = viết nội dung VI+EN + drill + kiểm (S ≤ 0,5 ngày, M ~1 ngày, L ≥ 2 ngày). Mã kỹ năng tiên quyết theo `skills.yml` (rút gọn).

**Nhóm A · SQL nâng cao** (bắt đầu **sau** 38 kỹ năng hiện có: RANK/LAG/SUM OVER, EXPLAIN, chỉ mục đã có ở ch10–11)

| Nút | | Vì sao DA cần | Cần trước | Một bài trông như thế nào | Effort |
|---|---|---|---|---|---|
| A1 Khung cửa sổ (window frames) | ▣ | Trung bình trượt, cộng dồn có giới hạn: báo cáo xu hướng nào cũng cần | running total, LAG | Doanh thu trung bình trượt 7 ngày mỗi cửa hàng (`ROWS` vs `RANGE interval '6 days'`, khác nhau khi thiếu ngày) | S |
| A2 Phân vị & phân phối | ▣ | Trung vị đúng hơn trung bình khi lệch; chia nhóm khách | aggregate, ranking | Trung vị giá trị đơn mỗi thành phố; chia khách 4 nhóm chi tiêu bằng `NTILE(4)` | S |
| A3 Trục ngày (date spine) | ▣ | Ngày không bán vẫn phải là 0, không được mất dòng | date group, LEFT JOIN | Doanh thu từng ngày tháng 3, ngày trống = 0 (`generate_series` + `LEFT JOIN` + `COALESCE`) | S |
| A4 Tổng phụ: ROLLUP / GROUPING SETS / CUBE | ▣ | Báo cáo có tổng phụ, tổng chung trong một câu | group by | Doanh thu cửa hàng × danh mục, có tổng phụ, nhãn "Tổng" bằng `GROUPING()` | S |
| A5 Pivot | ▣ | Bảng ngang tháng × nhóm là dạng sếp đọc | conditional agg | Ma trận cửa hàng × 3 tháng bằng `SUM(...) FILTER (WHERE ...)` | S |
| A6 CTE đệ quy | ▣ | Cây tổ chức, cây danh mục, chuỗi phụ thuộc | chained CTE, self-join | Tổng nhân viên dưới quyền mỗi quản lý (`lab.staff`; cũng làm được trên `employees.manager_id` của Logistics) | M |
| A7 JSON/JSONB | ▣ | Dữ liệu sự kiện, API thường là JSON | where, group by | Đếm sự kiện theo `props->>'screen'`; tách mảng bằng `jsonb_array_elements` | M |
| A8 Regex & làm sạch chữ | ▣ | Chuẩn hóa mã, số điện thoại, email | string fn, LIKE | Tìm email sai định dạng, chuẩn hóa số điện thoại trong `raw_signups` | S |
| A9 LATERAL & top-N mỗi nhóm | ▣ | Cách thứ hai cho "3 cái lớn nhất mỗi nhóm" | ranking, DISTINCT ON | 3 sản phẩm bán chạy mỗi cửa hàng bằng `CROSS JOIN LATERAL` | S |
| A10 Hiệu năng sâu hơn | ◐ | Truy vấn chậm làm dashboard chết | index design (ch11) | Đọc `EXPLAIN` với chỉ mục có sẵn trên `lab`: điều kiện nào dùng được chỉ mục, CTE có bị gộp không (câu `reflect`). Mili giây: không chấm | M |

**Nhóm B · Mẫu phân tích (analytics patterns)** (trong nền tảng, trừ phần lý thuyết)

| Nút | | Vì sao | Cần trước | Bài | Effort |
|---|---|---|---|---|---|
| B1 KPI & so sánh kỳ (MoM/YoY, tỷ lệ) | ▣ | Thiết kế KPI đúng định nghĩa là việc hằng ngày | LAG, casts | Tăng trưởng doanh thu MoM, AOV mỗi tháng; câu hỏi `reflect` "tử số/mẫu số là gì" | M |
| B2 Cohort & retention | ▣ | Câu hỏi số 1 ở sản phẩm và bán lẻ | date group, chained CTE, cond agg | Bảng cohort tháng đăng ký × tháng mua lại, % giữ chân | M |
| B3 Funnel | ▣ | Đo tỷ lệ chuyển đổi từng bước | cond agg, CTE | `view → add_to_cart → checkout → paid` từ `app_events`, đúng thứ tự thời gian | M |
| B4 RFM | ▣ | Phân khúc khách cho marketing | A2, CTE | Điểm R/F/M 1–5 bằng `NTILE`, đặt tên phân khúc bằng `CASE` | M |
| B5 A/B test cơ bản | ◐ | Đọc kết quả thí nghiệm, tránh kết luận sai | cond agg, A2 | Tỷ lệ chuyển đổi mỗi nhóm, chênh lệch, z-score bằng công thức (`sqrt`). Kiểm định, p-value, cỡ mẫu: **↗** | M |
| B6 Phát hiện bất thường | ▣ | Báo động trước khi sếp hỏi | A1, A2 | Ngày doanh thu lệch > 3σ so với 28 ngày trước (window frame) | M |
| B7 Thống kê mô tả trong SQL | ◐ | Trung bình, độ lệch chuẩn, tương quan là ngôn ngữ chung | aggregate | `stddev_samp`, `corr`, `regr_slope` trên giá × số lượng. Suy luận thống kê: **↗** | S |

**Nhóm C · Mô hình dữ liệu và chất lượng dữ liệu**

| Nút | | Vì sao | Cần trước | Bài | Effort |
|---|---|---|---|---|---|
| C1 Kiểm chất lượng dữ liệu | ▣ | Số sai do dữ liệu bẩn là lỗi phổ biến nhất | anti-join, NULL, DISTINCT | Một câu trả về danh sách vi phạm: trùng, mồ côi (orphan), ngoài khoảng, NULL, ngày tương lai | M |
| C2 Star schema & grain | ◐ | Hầu hết kho dữ liệu BI là fact/dim | multi-join | Truy vấn `fact_sales` × `dim_date` × `dim_product`; `reflect` "một dòng fact là gì". **Thiết kế** schema (DDL) không làm được trong sandbox một câu: **↗** Kimball | M |
| C3 SCD type 2 | ▣ | Báo cáo đúng thuộc tính tại thời điểm giao dịch | C2, date | Thành phố của khách **tại ngày đặt hàng** (join theo `valid_from/valid_to`) | M |

**Nhóm D · Ngoài nền tảng (↗, chỉ link, không chấm)**

| Nút | Vì sao | Tài nguyên (miễn phí trước) |
|---|---|---|
| D1 Bảng tính (Excel/Google Sheets: pivot, XLOOKUP) | Công cụ chung với sếp và các phòng | Microsoft Excel support; roadmap.sh nhóm Excel |
| D2 BI tools (Power BI, Tableau, Looker Studio) | Hầu hết tin tuyển DA ở VN đòi một công cụ BI | Microsoft Learn Power BI; Looker Studio |
| D3 Trực quan hóa & kể chuyện (storytelling) | Số đúng mà trình bày sai thì không ai dùng | Storytelling with Data (sách). Trong nền tảng: chọn loại chart khi ghim card ở Bảng điều hành (đã có) |
| D4 Thống kê suy luận (kiểm định, hồi quy) | Đi sau B5/B7 | Khan Academy Statistics & Probability |
| D5 Python/pandas | Phân tích ngoài SQL, tự động hóa | Kaggle Learn: Pandas |
| D6 Mô hình hóa nâng cao (Kimball) | Đi sau C2 | Kimball Group: Dimensional Modeling Techniques |
| D7 Giao tiếp & lấy yêu cầu | Biến câu hỏi mơ hồ thành truy vấn | (Trong nền tảng: thư của đồng nghiệp đã luyện kỹ năng này) |
| D8 ML / big data | Tùy chọn cho DA (roadmap.sh cũng ghi tùy chọn) | roadmap.sh nhóm ML, Big Data |

Tổng: **20 nút có phần SQL trong nền tảng** (16 ▣ + 4 ◐: A10, B5, B7, C2) và **8 nút ↗**. Ước khoảng **20 bài học + ~60 drill + 20 thử thách**.

### D.4 Hiển thị trong Lộ trình (`#/learn`)

- Hai cột trên desktop (một cột trên mobile, track nâng cao ở dưới): **SQL nền tảng** (12 module, mỗi module ghi "Áp dụng: Logistics ch n") và **DA nâng cao** (nhóm A–D, nút ▣/◐/↗ phân biệt bằng **icon + chữ**, không chỉ màu, L23).
- Track nâng cao mở khi **xong module 9** (đã có subquery, CTE, UNION) hoặc chọn "Tôi đã biết SQL" ở màn chào (v4 §B.2); từng nút còn khóa mềm theo "cần trước" (đọc được, drill mở khi đủ kỹ năng).
- Nút ↗ mở ngăn chi tiết như v4 §D.4, chỉ có tài nguyên; trạng thái của nút ↗ **không** tự đánh dấu Xong (tránh tick tay không đáng tin; giữ ý v4 §D.1).
- Domain dùng nút nâng cao: ghi "Áp dụng ở" (vd B2 → "E-commerce: sắp có"; A6 → "Logistics: chuyên đề, sau"). Ticket Logistics dùng nút nâng cao = **chuyên đề** (side task như bài tuyến, lưu kiểu `lanes`, không chặn cốt truyện), ngoài phạm vi v5.

---

## E. Kế hoạch theo pha

| Pha | Nội dung | Effort | Phụ thuộc |
|---|---|---|---|
| **N0 · Đổi tên hiển thị** | title, wordmark, i18n, tên file xuất; ghi chú "không đổi khóa storage" trong `CLAUDE.md` | **S** (0,5 ngày) | D-B1 |
| **N1 · Khung IA** | `route.ts` (route lồng + bảng alias + test), `src/domains.ts` (1 domain thật + 2 "soon", một mảng hằng), nav hai tầng, nút chọn domain, Trang chủ nền tảng, Tổng quan Logistics (= Trang chủ cũ), trang "Sắp có", pref `cargo-query/domain`, mobile thanh dưới | **M** (2–3 ngày) | D-N1, D-N2 |
| v4 **P2 · Onboarding** | Như v4, nhắm vào nav mới (tour bước chỉ vào "Làm việc" trong hàng 2) | M (2 ngày) | N1 (**được mở khóa ở đây**) |
| **N2 · Bộ máy Chung** | schema `lab` + seed (nối cuối), `dataset` trong `runSandboxed` (`SET LOCAL search_path`), parser `track/dataset/skill/kind`, `Known` gồm id `g-`, trang kỹ năng, Luyện SQL hub, Ôn tập lấy drill, test nội dung drill. **Nội dung:** 33 drill cho 11 kỹ năng ch1–3 | **M–L** (3–4 ngày + 1–2 ngày nội dung) | N1, v4 P1 |
| — | Buổi thử 5 người (v4 §B.6), thêm câu hỏi "Luyện SQL trước hay vào Logistics?" | S | P2, N2 |
| **N3 · Lộ trình** | `#/learn` hai track + ngăn chi tiết; `#/d/logistics/ch/<n>` (thay v4 P3) với chip "Dựa vào" | **M–L** (3 ngày) | N2 |
| **N4 · Drill cho 27 kỹ năng còn lại** | ~81 drill; tùy chọn chuyển ví dụ bài học sang `lab` (D-G4) | **M–L** (4–5 ngày nội dung) | N2 |
| **N5 · Nâng cao đợt 1** | A1–A6, B1–B3, C1 (10 nút): thêm bảng `lab` cần thiết, bài học, drill, thử thách | **L** (6–8 ngày) | N3 |
| **N5b · Nâng cao đợt 2** | A7–A10, B4–B7, C2–C3 + link ↗ | **L** (6–8 ngày) | N5 |
| **N6 · Domain Finance** | seed + cốt truyện + chương + ticket VI/EN; nạp DB theo domain (một worker, đổi domain = nạp seed khác, cần đo thời gian); **Save v4** (`dashboards`, `sandboxDrafts` theo domain) + migration + fixture v3 | **XL** (≥ 3 tuần) | N3 |

**Bây giờ phải làm** để thêm Finance sau rẻ: N1 (route lồng + alias + `domains.ts`), quy tắc id duy nhất có tiền tố, `Known` gồm id drill. **Để sau:** Save v4, nạp DB theo domain, thư mục `content/domains/<d>/` (chuyển thư mục bây giờ đụng agent đang sửa `content/`, không có lợi khi mới có một domain), chuyên đề nâng cao trong Logistics.

### E.1 Rủi ro

| Rủi ro | Giảm thiểu |
|---|---|
| Hai tầng nav làm người mới rối | Ngày đầu chỉ mở Trang chủ + Logistics › Làm việc (v4 D-O3); tour chỉ đúng một đường |
| Seed `lab` làm chậm lần tải đầu (13 s lạnh, L50) | Giữ ~15k dòng; đo ở N2; nếu > 0,5 s thì tạo `lab` lười (lần đầu mở drill) |
| Bài học v4 (Logistics) và drill (`lab`) dạy cùng kỹ năng trên hai bộ dữ liệu | Đó là có chủ ý (chuyển giao kiến thức); trang kỹ năng ghi rõ "ví dụ: Logistics · luyện: lab" |
| Drill farm XP | 10 XP lần đầu, 0 sau (D-G2) |
| Đổi khóa storage theo brand làm mất tiến độ | Không đổi khóa; ghi trong `CLAUDE.md` |
| Bundle (main ~254/270 KB, L43) | Trang Chung, Lộ trình lazy như Bảng điều hành; drill vào chunk nội dung lazy |
| Lộ trình nâng cao nhiều chữ, ít làm | Mỗi nút ▣ phải có drill chấm được trước khi hiện "Mở"; nút chưa có nội dung ghi "đợt sau" (như tuyến, L49) |

### E.2 Quyết định cũ bị v5 thay

| Cũ | v5 |
|---|---|
| L49 nav 6 mục, mobile lưới 3×2 | Nav hai tầng (§B.2), mobile thanh dưới |
| v4 D-P1 "Lộ trình trong Trang chủ, không thêm mục nav" | Lộ trình là mục nav Chung (`#/learn`); Tổng quan domain giữ toàn cảnh chương của domain |
| v4 route `#/path/<n>` | `#/d/logistics/ch/<n>` (alias giữ `#/path/<n>`) |
| v4 D-P3 "chỉ link PostgreSQL docs" | Giữ cho kỹ năng SQL; nút ↗ của track nâng cao có link ngoài (danh sách §D.3 D) |
| Practice/Sandbox là mode trong `play` | Luyện SQL là route Chung `#/practice`; Sandbox là route domain |
| v4 D-O3 (khóa + tooltip) | **Giữ**, áp cho mục nav mới |

---

## G. Quyết định cho user (mặc định in đậm)

**Brand**
- **D-B1.** Tên: **Truy** / Rowmap / Sang / giữ "Cargo Query"?
- **D-B2.** Chỉ đổi hiển thị; repo, URL, khóa `cargo-query*`, "Cargo Query Logistics" giữ nguyên? **(có)**

**Nav và domain**
- **D-N1.** Nav hai tầng: Chung `Trang chủ · Lộ trình · Luyện SQL` + nút domain + hàng phụ `Tổng quan · Làm việc · Sandbox · Dữ liệu · Bảng điều hành` (thay L49)? **(có)**
- **D-N2.** Route `#/learn/…`, `#/practice`, `#/d/<domain>/…`, hash cũ chuyển tiếp mãi mãi? **(có)**
- **D-N3.** Finance, E-commerce hiện "Sắp có" trong nút domain (trang giới thiệu, không hứa ngày) thay vì ẩn? **(hiện)**

**Phần Chung**
- **D-G1.** Drill chạy trên schema trung tính **`lab`** (chuỗi cửa hàng) trong cùng DB **(đề xuất)**, hay dùng luôn dữ liệu Logistics?
- **D-G2.** Drill: **10 XP lần đầu, 0 lần sau**; Ôn tập 0 XP như hiện tại?
- **D-G3.** Chung **không khóa** Domain (chỉ gợi ý "nên học trước"); ticket `teach` vẫn dạy, thẻ bài học thu gọn nếu đã học? **(có)**
- **D-G4.** Bài học nhanh v4 (P1, đang build) giữ ví dụ Logistics; bài mới dùng `lab`; chuyển bài cũ sang `lab` là tùy chọn ở N4? **(có)**

**Save**
- **D-S1.** **Không tăng `SAVE_VERSION` bây giờ**; id `g-`/`fin-`/`ecom-`; Save v4 (`dashboards`, `sandboxDrafts` theo domain) chỉ khi Finance ra?
- **D-S2.** **XP toàn cục, bậc nghề theo domain**?

**Lộ trình nâng cao**
- **D-R1.** Track nâng cao: 20 nút có bài học + drill trong nền tảng, 8 nút chỉ link ngoài; mở sau module 9 hoặc "Đã biết SQL"? **(có)**
- **D-R2.** Pivot dạy bằng **`FILTER`**; không nạp extension `tablefunc` (`crosstab` chạy được nếu nạp, nhưng thêm tải) **(đề xuất)**?

**Thứ tự**
- **D-E1.** **N0 → N1 → v4 P2 → N2 → buổi thử → N3 → N4/N5**; Finance (N6) sau khi xong N3 và có phản hồi?

---

## H. Nghiên cứu và nguồn

| Nguồn | Đã kiểm gì | Dùng ở |
|---|---|---|
| roadmap.sh DA: https://roadmap.sh/data-analyst | Fetch được phần bài viết (What is Data Analysis, kỹ năng, FAQ); **không** ra nút sơ đồ (render JS) | §D.1 |
| Repo roadmap.sh: https://github.com/kamranahmedse/developer-roadmap → `nilbuild/developer-roadmap`, `roadmaps/data-analyst/content/` | Liệt kê ~100 file nút qua GitHub API; đọc `databases`, `learn-a-programming-lang`, `introduction`. Nhóm/thứ tự **chưa kiểm** | §D.1 |
| PGlite 0.5.16 (`node_modules/@electric-sql/pglite`, chạy bằng Node) | Chạy 18 truy vấn mẫu ở §D.2 (tất cả đạt; `crosstab` đạt khi nạp `tablefunc`); `SET LOCAL search_path` với schema `lab` | §C.1, §D.2 |
| PostgreSQL docs (đều trả 200): [queries-with](https://www.postgresql.org/docs/current/queries-with.html), [functions-srf](https://www.postgresql.org/docs/current/functions-srf.html), [queries-table-expressions](https://www.postgresql.org/docs/current/queries-table-expressions.html) (GROUPING SETS, LATERAL), [tablefunc](https://www.postgresql.org/docs/current/tablefunc.html), [functions-json](https://www.postgresql.org/docs/current/functions-json.html), [sql-expressions](https://www.postgresql.org/docs/current/sql-expressions.html) (window frame), [functions-aggregate](https://www.postgresql.org/docs/current/functions-aggregate.html), [functions-window](https://www.postgresql.org/docs/current/functions-window.html), [using-explain](https://www.postgresql.org/docs/current/using-explain.html), [functions-matching](https://www.postgresql.org/docs/current/functions-matching.html), [ddl-schemas](https://www.postgresql.org/docs/current/ddl-schemas.html) | Link trả 200; nội dung là tài liệu chuẩn | §D.3 (link "Đọc thêm") |
| Link ↗ (đều trả 200): [Kimball techniques](https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/), [Kaggle Learn Pandas](https://www.kaggle.com/learn/pandas), [MS Learn Power BI](https://learn.microsoft.com/en-us/training/powerplatform/power-bi), [Storytelling with Data](https://www.storytellingwithdata.com/books), [Khan Academy Statistics](https://www.khanacademy.org/math/statistics-probability), [Looker Studio](https://lookerstudio.google.com/), [Excel support](https://support.microsoft.com/en-us/excel) | Chỉ kiểm mã HTTP | §D.3 nhóm D |
| Tra tên (tìm web, không phải tra nhãn hiệu chính thức) | "Truy"/"truyvan": không thấy trùng. "Rowmap": không thấy trùng. "Sang": không thấy app học trùng. Quarry: app iOS "Quarry: SQL & Python Prep" (https://apps.apple.com/us/app/quarry-sql-python-prep/id6785931623), The Quarry (thequarry.io). Datara: datara.ai (thông cáo 2025). Casebook: nhãn CASEBOOK (https://trademarks.justia.com/owners/casebook-pbc-5767614). OnShift: nhãn ONSHIFT (https://trademarks.justia.com/866/09/onshift-86609077.html). Mach: MachEye (https://en.wikipedia.org/wiki/MachEye). Data Training (https://apps.apple.com/in/app/data-training/id6444720197). Datalyze/MachineHack (https://analyticsindiamag.com/ai-highlights/machinehack-launches-datalyze-a-simulation-based-gamified-learning-platform-for-data-analytics/) | §A.2 |
| Tên miền `.com/.dev/.vn` | **Chưa kiểm** cho tên nào | §A.2 |
