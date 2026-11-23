# Product route v24: lộ trình học theo tutorial (General/SQL + Database Engine)

Người viết: Product Designer. Ngày 2026-11-23. Nhánh `design-v24` (từ `main` @ `74e339f`). **Chỉ tài liệu**, không đổi code hay nội dung.

Phạm vi: Lộ trình học (General: `content/skills.yml`, `content/lessons.yml`, `content/general/sql.yml`, `adv.yml`) và khu Database Engine (`content/engine/**`). Ba domain (Logistics, E-com, Finance) **ngoài phạm vi**, trừ chỗ chúng bị ràng buộc kỹ thuật với General (§3.1).

Đầu vào: `docs/knowledge/database/` (README, `tutorial-routes.md`, `boondata-gap-map.md`, các file kiến thức), `roadmap-v23-v30-revised.md`, `handoff-2026-11-20.md`, `review-v23.md`, `product-design-db-engine.md`, `engine-pedagogy.md`, `best-practice-catalogue.md`, và kiểm kê nội dung trên `main`.

Người đọc song song: UI/UX designer (`docs/team/ux-route-v24.md`) cần §2 (giải phẫu bài, độ sâu điều hướng). §2 được viết và commit trước.

**Quyết định của user (2026-11-23, qua người điều phối):** Q1 xen kẽ với roadmap v24–v30; Q2 đọc trước, ghi sau; Q3 thiết kế/DBMS là thẻ engine thứ tư; Q4 **bỏ chứng nhận**, thay bằng đo kỹ năng + huy hiệu (Product quyết, §1.7); Q5 chỉ chặn ở Phần 11 và Engine, nơi khác là ghi chú; Q7 **bỏ MySQL/SQLite** (không Phần 12, không bài đọc; khác biệt phương ngữ chỉ nêu khi một bài Postgres cần nó làm bẫy); Q6 không trả lời: giữ `timestamp` (mặc định, xác nhận ở review). Các dòng L320–L327 trong `decision-log.md`.

**Lưu ý đóng băng.** User đã dừng ở v23 (2026-11-20). Tài liệu này là đề xuất; số version ở §4 là "lát R1, R2…" (route slice), không chiếm số v24–v30 đã gán trong roadmap. Ghép lát vào version nào là câu hỏi Q1 (§5).

---

## 2. "Đủ chi tiết như tutorial": giải phẫu một bài và độ sâu điều hướng

(Viết trước để UI/UX dùng. §1 lộ trình đích ở dưới.)

### 2.1 Hiện trạng đo được

| Loại bài hiện có | Số | Độ dài phần chữ (VI) | Có gì |
|---|---|---|---|
| Bài nhanh General (`lessons.yml`, 1 thẻ / kỹ năng) | 38 | 102–152 từ, TB 127 (concept + explain + mistake) | 1 ví dụ, 1 lỗi hay gặp, "Thử ngay"; + 4 drill trong `sql.yml` |
| Nút nâng cao (`adv.yml`, `in`/`partial`) | 20 | ~600–700 từ | bài + 4 drill (+ challenge) |
| Bài Engine (`content/engine/**`) | 200 (PG 80, Mongo 65, Dynamo 55) | phần chữ VI ngoài frontmatter và code: 27–377 từ, trung vị 168 (bước lab, câu hỏi, VI + EN nằm trong frontmatter); file gzip 2.6 KB trung vị, 5.7 KB lớn nhất | Ý chính, Ví dụ, lab nhiều bước, predict/quiz, "Đọc thêm" |

Tutorial (tutorialspoint và tương tự) mỗi chương có: giới thiệu, cú pháp, nhiều ví dụ có kết quả, biến thể, lưu ý. Khoảng cách lớn nhất là **bài nhanh General** (≈ 1/6 độ dài một chương tutorial, 1 ví dụ). Bài Engine mạnh ở phần làm (lab nhiều bước, predict, quiz) nhưng phần chữ cũng ngắn (trung vị 168 từ so với đích 500–900), và thiếu đều đặn hai mục "Cú pháp" và "Lỗi hay gặp".

### 2.2 Giải phẫu chuẩn (một bài = 8 mục, theo thứ tự này)

Áp cho mọi bài **kỹ năng General** và mọi bài Engine `concept`/`lab`. Bài `quiz`/`predict`/`capstone` dùng tập con ghi ở cột cuối.

| # | Mục (tiêu đề hiện trên trang) | Nội dung | Bắt buộc | Kiểm được bằng test |
|---|---|---|---|---|
| 1 | **Mở bài** | 1 tình huống/câu hỏi (≤ 3 câu, không mở bằng định nghĩa: pedagogy §1.2) + "Học xong bạn làm được" 2–4 dòng (`objectives`) | có | `objectives` 2–4 |
| 2 | **Ý chính** | ≤ 150 từ một khối (giữ luật pedagogy); chủ đề có hiểu lầm thì nói thẳng "Nhiều người nghĩ X. Thật ra Y" | có | ≤ 150 từ |
| 3 | **Cú pháp** | khung lệnh, phần tùy chọn trong `[ ]`, bảng "tùy chọn → ý nghĩa" ≤ 8 dòng | có (trừ bài lý thuyết thuần) | có khối `sql` đầu mục |
| 4 | **Ví dụ chạy được** | 3–6 ví dụ, đơn giản → thật; mỗi ví dụ: SQL + nút Chạy (PGlite, schema `lab` hoặc setup của bài) + kết quả + 1–2 câu đọc kết quả | có | ≥ 3 ví dụ, mỗi ví dụ chạy ra dòng (như `tests/lessons.test.ts`) |
| 5 | **Lỗi hay gặp** | 2–4 bẫy; mỗi bẫy = câu SQL sai **chạy thật** (báo lỗi có SQLSTATE, hoặc ra kết quả sai lặng lẽ) + vì sao + cách sửa | có | ≥ 2, mỗi câu chạy và khác ví dụ (như `mistake` hôm nay) |
| — | (bỏ: "Ở hệ khác") | Q7: không dạy MySQL/SQLite. Khác biệt phương ngữ chỉ xuất hiện **trong mục 5** khi nó là một bẫy thật của người viết Postgres (vd. `IFNULL`, backtick, `TOP`), một dòng, nhãn "theo tài liệu <hệ>, không chạy" | — | — |
| 7 | **Thực hành** | General: "Thử ngay" + 4 drill (faded → open → trap → review). Engine lab: các bước mẫu → khuyết `___` → tự viết (pedagogy P3). Bước có **thanh hiệu năng** (§1.6) mang nhãn | có | như hiện nay |
| 8 | **Câu hỏi kiểm tra** | 2–4 câu; ≥ 1 lựa chọn sai là hiểu lầm nói bằng giọng người tin nó; `why` | có | ≥ 2 câu, ≥ 1 có `misconception` |
| 9 | **Tóm tắt và đọc thêm** | 3–5 dòng "nhớ mang về" (dùng lại `syntax/when/trap` của `skills.yml` cho General), link thẻ Best Practice, nguồn chính thức, bài tiếp | có | ≥ 1 nguồn chính thức |

Thứ tự Lab trước Câu hỏi giữ như sửa ở `review-v23.md` (`4191767`). Predict vẫn đứng trước lab (đoán trước khi chạy).

Tập con cho loại bài khác: `predict` = 1, 2, (dự đoán), 4 (Xem thật), 8, 9. `quiz` lý thuyết = 1, 2, 3 (ký hiệu nếu có), 4 (ví dụ dạng bảng/sơ đồ, có thể không chạy), 8, 9. `capstone` = 1, 7, 8 (câu kết luận), 9.

**Độ dài đích** (đo bằng từ VI trong phần chữ, không tính SQL):

| Loại | Chữ | Ví dụ chạy | Thời gian đọc + làm |
|---|---|---|---|
| Kỹ năng General | 600–1,000 | 3–6 | 8–10 phút đọc + 15–25 phút drill |
| Engine `concept` | 500–900 | 2–4 | 10–15 phút |
| Engine `lab` | 350–700 | 2–3 + 3–6 bước | 15–25 phút |
| Lý thuyết (thiết kế, DBMS) | 700–1,200 | ≥ 2 (lab nhỏ trên PGlite khi được) | 15–20 phút |

"Dài như tutorial" = **nhiều mục ngắn**, không phải một khối chữ dài: mỗi mục ≤ 150 từ chữ liền nhau, phần còn lại là code, bảng, kết quả.

### 2.3 Bài ngắn hiện có lớn lên thế nào

- **General:** thẻ nhanh trong `lessons.yml` **giữ nguyên** (nó là bản tóm tắt hiện trong ticket domain qua `lessonSlot`, và trong hộp thoại bài học). Bài đầy đủ là file mới `content/general/lessons/<skill>.md` (frontmatter + 9 mục), mỗi file một chunk lazy như bài Engine (`?fm`, ngân sách mỗi file 8 KB kiểu `'each'`). Ánh xạ: `concept` → nguồn của mục 2; `example` + `explain` → ví dụ 1 của mục 4; `mistake` → bẫy 1 của mục 5; `try` → mục 7; `docs` → mục 9; `skills.yml` `syntax/when/trap` → mục 3 và 9. Viết thêm: cú pháp, 2–5 ví dụ, 1–3 bẫy, 2–4 câu hỏi.
- **Engine:** đã có mục 1, 2, 7, 8, 9; mục 4 thường chỉ 1–2 khối. Phần chữ cần lớn gấp ~3 lần. Thêm cho đều: mục 3 "Cú pháp" và mục 5 "Lỗi hay gặp" thành tiêu đề riêng (nhiều bài đã có lỗi trong `## Ví dụ` dạng `-- ERROR:`: tách ra). Nâng theo thứ tự lát (§4), không viết lại cả loạt.
- **Nút `adv`:** đã đủ dài; chỉ thêm mục 3, 5, 8 khi thiếu. `adv.yml` đang 46/50 KB: tách mỗi nút ra file riêng cùng lúc với General (cùng cơ chế chunk mỗi bài).

### 2.4 Độ sâu điều hướng (cho UI/UX)

Tối đa **4 tầng trang + 1 tầng mục trong trang**:

| Tầng | General (SQL) | Engine | Ghi chú |
|---|---|---|---|
| 1 Khu | `#/learn` | `#/engine` | có sẵn |
| 2 Track | track trên `#/learn` (SQL Phần 1–11 · Nâng cao) | engine `#/engine/<engine>` (PostgreSQL · MongoDB · DynamoDB · Thiết kế CSDL) | |
| 3 Mô-đun / cấp | `#/learn/sql/<n>` (Phần n) | `#/engine/<engine>/<L>` (các mô-đun là nhóm trên trang cấp) | General: Phần n **không còn** = chương Logistics (§3.1) |
| 4 Bài | `#/learn/skill/<id>`, `#/learn/adv/<node>` | `#/engine/<engine>/<L>/<id>` | |
| 5 Mục trong bài | 8 mục §2.2 | 8 mục §2.2 | **không** dùng `#anchor`: router giữ hash. Mục lục trong trang = nút cuộn (`scrollIntoView`), mục hiện tại đánh dấu bằng `aria-current`; nếu cần link sâu tới một mục, phải thêm cú pháp vào `src/route.ts` (vd. `…/<id>/examples`); chưa cần ở lát đầu |

Một bài dài trên điện thoại: mục 4–5–6 có thể thu gọn (`<details>`), mục 7 (thực hành) luôn mở. Tiến độ đọc **không lưu** (không cần Save); "xong bài" vẫn là luật hiện tại (drill/lab/quiz đạt).

Nhãn trung thực trên mỗi ví dụ/mục: "Chạy thật · PostgreSQL 18.6 (PGlite)", "Chạy bằng mingo", "Chạy bằng dynoxide", và cho dòng phương ngữ hiếm hoi trong mục 5: "Theo tài liệu <hệ>, không chạy trong trình duyệt". Không dùng "sắp có".

Bài có thanh hiệu năng (§1.6) cần chỗ hiện **hai con số chi phí** (bài của bạn / lời giải) và nút kế hoạch gây chậm; dùng lại cây kế hoạch của predict "Xem thật" (`enginePredict`).

---


## 1. Lộ trình đích

### 1.0 Hình dạng (đếm)

| Khu / track | Hôm nay | Đích | Ghi chú |
|---|---|---|---|
| General · SQL | 11 Phần (= chương Logistics), 38 kỹ năng, 152 drill | **11 Phần** (thứ tự mới, không còn = chương), **43 kỹ năng** (+5), **172 drill** kỹ năng (+20) | thứ tự theo tutorial SQL (§1.1) |
| General · Nâng cao | 28 nút (20 có bài) | 29 nút (+`a11` lấy mẫu ngẫu nhiên) | giữ nguyên thứ tự a → d |
| Engine · PostgreSQL | 80 bài (L1 12, L2 17, L3 18, L4 16, L5 17) | **92** (L1 +5, L2 +7) | thứ tự mô-đun L1–L2 theo tutorial PostgreSQL; L3–L5 giữ thang tầng hệ thống (pedagogy P6) |
| Engine · MongoDB | 65 (+ Lộ trình NoSQL 12 phần, 168 drill) | **67** (+2) | thứ tự đã khớp tutorial |
| Engine · DynamoDB | 55 | **57** (+2) | thứ tự đã khớp tutorial |
| Thiết kế và lý thuyết CSDL | 0 | **25** (5 cấp) | theo tutorial DBMS; thẻ engine thứ tư (Q3, L322) |
| **Tổng bài** | 38 kỹ năng + 20 nút có bài + 200 bài Engine | 43 kỹ năng + 21 nút có bài + 241 bài Engine (305 bài) | |

Năm tutorial trong phạm vi sau Q7: SQL 122 chương, PostgreSQL 90, MongoDB 61, DynamoDB 38, DBMS 91. MySQL (186) và SQLite (54) **ra khỏi phạm vi**; các mã `mysql#`/`sqlite#`/`my#`/`lite#` còn trong bảng và phụ lục chỉ ghi chương mà một bài Postgres phủ kèm, không phải mục tiêu. Mỗi dòng bên dưới ghi các điểm route (số chương trong gap map, dạng `sql#27`) mà bài phủ.

Luật đọc cột "Id": id có sẵn = **giữ** (nội dung lớn lên theo §2); `mới` = id mới, cộng thêm; không id nào bị đổi tên hay xóa (§3.2).

### 1.1 General · SQL (theo tutorial SQL, đọc trước, ghi sau)

Tutorial SQL đi: Cơ bản → Database → Table (DDL) → Queries (CRUD) → Views → Toán tử và mệnh đề → Joins → Keys → Indexes → Nâng cao → Hàm. BoonData dạy người phân tích dữ liệu nên **giữ "đọc trước"** (quyết định của gap map, A1): DDL/CRUD về General ở Phần 9 (ghi dữ liệu), còn Database/Table/Keys/Views thuộc Engine PostgreSQL L1 (§1.3). Bên trong phần đọc, thứ tự theo đúng mục "Operators and Clauses" của tutorial: WHERE/TOP/DISTINCT/ORDER → GROUP BY/HAVING → LIKE/IN/CASE/NULL → (Joins) → ANY/ALL/EXISTS → UNION/INTERSECT/EXCEPT. Chỗ lệch: tập hợp (UNION…) đặt **sau** Joins và CTE vì 4 drill `full_join` dùng CTE (đã kiểm bằng script trên `sql.yml`). User chọn đọc trước (Q2, L321).

| Phần | Tên | Kỹ năng (id; "cũ n" = Phần/chương cũ) | Điểm route chính | Ghi chú |
|---|---|---|---|---|
| 1 | Đọc bảng | `select` (cũ 1), `where` (cũ 1), `order_by` (cũ 1), `limit` (cũ 1) | sql#3–10 (tổng quan, cú pháp, kiểu, toán tử, biểu thức, chú thích), sql#28, 38, 39, 41, 44, 51, 52, 56, 61; pg#4, 6, 7, 15, 21, 22, 26, 29 | bài `select` mở bằng "bảng, dòng, cột, khóa" (sql#4–5 RDBMS concepts) |
| 2 | Gộp và nhóm | `aggregate` (cũ 2), `group_by` (cũ 2), `having` (cũ 2), `distinct` (cũ 6) | sql#40, 42, 43, 89, 103, 108, 111; pg#23–25, 45–48 | |
| 3 | Chữ, ngày và kiểu | `pattern_match` (cũ 6), `string_fn` (cũ 6), `cast` (cũ 6), `date_math` (cũ 4), `date_bucket` (cũ 4) | sql#7, 45, 46, 85, 86, 100, 106, 107, 109, 110, 112, 115, 116; pg#5, 27, 50–53, 84 | `cast` dạy cả "chọn kiểu đúng" (§1.6) |
| 4 | Điều kiện và NULL | `null_logic` (cũ 4), `coalesce` (cũ 5), `case_when` (cũ 5), `conditional_agg` (cũ 5) | sql#50, 53–55, 90, 94; pg#77 | |
| 5 | Nối bảng | `join` (cũ 3), `multi_join` (cũ 3), `left_join` (cũ 3) (+ RIGHT JOIN), `cross_join` **mới**, `self_join` (cũ 5), `anti_join` (cũ 3) | sql#62–68, 71, 72; pg#34; mysql#91–93 | `cross_join` = A3 gap map (lưới lịch × cửa hàng) |
| 6 | Truy vấn con | `scalar_subquery` (cũ 7), `in_subquery` (cũ 7), `any_all` **mới**, `exists` (cũ 7), `correlated_value` (cũ 7) | sql#47–49, 96, 104; pg#62–64, 67–69, 81; mysql#77 | `any_all` = A2 |
| 7 | CTE và dòng mới nhất | `cte` (cũ 8), `multi_cte` (cũ 8), `distinct_on` (cũ 8) | sql#97, 102; pg#28 | |
| 8 | Gộp tập hợp | `union` (cũ 9), `except` (cũ 9) (+ INTERSECT), `full_join` (cũ 9) | sql#57–60, 67; pg#60, 61, 65, 66 | nhãn `except` đổi thành "EXCEPT / INTERSECT" |
| 9 | Ghi dữ liệu | `insert_select` **mới** (INSERT … SELECT, RETURNING, CREATE TABLE AS), `update_join` **mới** (UPDATE … FROM, DELETE … USING, xóa trùng), `upsert` **mới** (ON CONFLICT, MERGE) | sql#27, 29–32, 69, 70; pg#17–19, 31; mysql#48–55, 96, 97, 157, 176; sqlite#12, 18, 19; dbms#53 | = A1 gap map; cần bộ chấm "ghi rồi đọc" (§3.4) |
| 10 | Hàm cửa sổ | `window_rank` (cũ 10), `window_lag` (cũ 10), `window_agg` (cũ 10) | (không có trong tutorial SQL; sql-core §9) | giữ vì là kỹ năng DA |
| 11 | Index và hiệu năng | `explain_read` (cũ 11), `sargable` (cũ 11), `index_design` (cũ 11) | sql#78–84, 105; pg#79 | Phần có thanh hiệu năng dày nhất (§1.6) |

Kiểm thứ tự tiên quyết (script trên `sql.yml` + `lessons.yml`, 2026-11-23): với bảng trên, chỉ **5 drill** dùng cấu trúc của Phần sau: `g-date-math-4` (JOIN), `g-coalesce-1` (JOIN), `g-string-fn-2` (IS NULL), `g-distinct-3` (JOIN), `g-cast-2` (JOIN). Viết lại lời giải/đề, **giữ id** (người đã qua drill vẫn được tính). Không bài nhanh nào vi phạm.

Nâng cao: giữ `a1`–`a10`, `b1`–`b7`, `c1`–`c3`, `d1`–`d8`; thêm `a11` "Lấy mẫu ngẫu nhiên" (`ORDER BY random() LIMIT`, `TABLESAMPLE`; chấm hình dạng, không chấm dòng) = A4. Nút `a10` (hiệu năng sâu) link sang Engine PG L2/L4.

### 1.2 Thứ tự Engine: nguyên tắc

- Id Engine gắn với đường dẫn (`lessonIdFor(engine, level, NN)`, `src/engine/content.ts`): **một bài không đổi cấp được** mà giữ id. Đổi thứ tự = đổi `module:` trong frontmatter + thứ tự trong `modules.yml`; bài mới lấy NN trống kế tiếp của cấp.
- L1–L2 của PostgreSQL theo thứ tự tutorial PostgreSQL (Database → thao tác bảng → schema → toàn vẹn và giao dịch → view → hàm → quyền → lỗi → trigger → index). L3–L5 giữ thang "từ dưới lên" (trang → MVCC → WAL → planner → khóa → nội tạng index → vận hành; pedagogy P6, CMU 15-445). Thang này đồng thời là phần "Storage, Indexing, Query processing, Transactions, Recovery" của tutorial DBMS (dbms#58–88 đã "covered/partial" ở đó).

### 1.3 Engine · PostgreSQL (92 bài)

**L1 "Bảng và dữ liệu" (12 → 17).** Mô-đun theo thứ tự hiển thị:

| Mô-đun (mới/cũ) | Bài | Điểm route |
|---|---|---|
| `ddl` (mới, gộp `types`) | `e-pg-l1-01` Kiểu dữ liệu · `e-pg-l1-02` Tạo bảng · `e-pg-l1-03` identity/uuid/generated · **`e-pg-l1-13` mới** lab "Sửa bảng an toàn": ALTER TABLE thêm/xóa/đổi tên cột, đổi kiểu (viết lại bảng hay không), RENAME TABLE (B1) · **`e-pg-l1-14` mới** lab "Xóa, làm rỗng, sao chép": DROP … CASCADE, TRUNCATE vs DELETE, CREATE TABLE … AS / LIKE, TEMP (B1) · **`e-pg-l1-17` mới** lab "Kiểu sai: đúng mà chậm" (§1.6) | sql#17–25, 29, 86, 98, 99; pg#5, 16, 20, 30, 32, 82; mysql#31–44, 179; sqlite#10, 11, 36, 37 |
| `write` (mới) | **`e-pg-l1-15` mới** lab "Ghi dữ liệu và RETURNING": INSERT nhiều dòng, UPDATE/DELETE có điều kiện, RETURNING · **`e-pg-l1-16` mới** lab "Upsert và MERGE": ON CONFLICT (đích, `EXCLUDED`, DO NOTHING), MERGE … RETURNING (B2) | pg#17–19, 31; sql#27, 30–32; mysql#52–54 |
| `schemas` (tách từ `transactions`) | `e-pg-l1-06` Schema, **mở rộng** thành "Database, schema, search_path" (gộp B6: cluster có nhiều database, PGlite có một, `CREATE DATABASE` ngoài transaction) | pg#8–14 (PostgreSQL Database), 33; sql#11–16 |
| `constraints` | `e-pg-l1-04`, `e-pg-l1-05` | sql#26, 73–77, 91, 92; pg#35 |
| `transactions` | `e-pg-l1-07` | sql#95; pg#36–38 |
| `views` | `e-pg-l1-08` | sql#34–37; pg#39 |
| `first-index` | `e-pg-l1-09`, `-10`, `-11` | sql#78–82 |
| `capstone-l1` | `e-pg-l1-12` (thêm một bước ALTER + upsert **ở cuối**: `bossStep` lưu chỉ số bước, chèn giữa làm lệch bước người đang làm dở) | |

**L2 "Lập trình, quyền và index" (17 → 24).** Ba mô-đun mới đứng **trước** các mô-đun index có sẵn (tutorial: Functions → Role & Permission → Error → Advanced: Triggers, Indexes):

| Mô-đun | Bài | Điểm route |
|---|---|---|
| `functions` (mới) | **`e-pg-l2-18`** lab "Hàm SQL và PL/pgSQL": volatility, overloading, DROP FUNCTION · **`e-pg-l2-19`** lab "Procedure, CALL, vòng lặp và cursor" · **`e-pg-l2-20`** lab "RAISE, ASSERT, EXCEPTION và SQLSTATE" (B4) | pg#41, 42, 44, 75, 76, 85, 86; sql#93, 101, 113; mysql#160–163, 171 |
| `roles` (mới) | **`e-pg-l2-21`** lab "Vai trò, GRANT, REVOKE" · **`e-pg-l2-22`** lab "Thành viên vai trò, quyền mặc định, USAGE trên schema" (B3; RLS vẫn ở `e-pg-l5-10`) | pg#54–59, 83; mysql#22–28 |
| `triggers` (mới) | **`e-pg-l2-23`** lab "Trigger: BEFORE/AFTER, ROW/STATEMENT, NEW/OLD, bảng audit" · **`e-pg-l2-24`** quiz "Trigger, ràng buộc hay cột generated?" (B5) | pg#78; mysql#104–113; sqlite#33; dbms#57 |
| `btree-multi` … `capstone-l2` | `e-pg-l2-01` … `e-pg-l2-17` (giữ thứ tự hiện tại) | pg#49, 79; sql#114 |

**L3–L5:** giữ 51 bài, giữ thứ tự. Việc ở đây là nâng giải phẫu (§2.2: tách "Cú pháp", "Lỗi hay gặp") và gắn thanh hiệu năng cho capstone (§1.6).

### 1.4 Engine · MongoDB (67) và DynamoDB (57)

Thứ tự hiện có đã theo tutorial (dữ liệu → CRUD → projection/limit/sort → index → aggregation → replication/sharding → nâng cao). Chỉ lấp lỗ:

| Bài | Nội dung | Điểm route |
|---|---|---|
| `e-mg-l1-01` **mở rộng** (không id mới) | thêm mục "Database và collection": tạo ngầm, drop, collection capped và time-series là các loại (C1) | mongodb#6–9, 55 |
| **`e-mg-l4-13` mới** (lab) | "Bộ đếm và số thứ tự": `findOneAndUpdate` + `$inc` + upsert, tài liệu nóng (C2) | mongodb#56 |
| **`e-mg-l5-11` mới** (concept, `runtime: docs`) | "Sao lưu và GridFS" (C3) | mongodb#22, 54 |
| **`e-dy-l2-14` mới** (lab; 13 đã dùng trên `wip/v25-nosql-content`) | "Đếm và cộng mà không Scan": bộ đếm, tổng duy trì bằng Streams, giá của `Select: COUNT` (C4) | dynamodb#23 |
| **`e-dy-l5-08` mới** (concept, `runtime: docs`) | "IAM, lỗi, giám sát, xóa bảng": LeadingKeys, thử lại có backoff, throttle CloudWatch, Contributor Insights, deletion protection (C5) | dynamodb#10, 24, 25, 30, 33, 34 |

Năm lab gỡ lầm tưởng trên `wip/v25-nosql-content` (`e-dy-l2-13`, `e-dy-l3-12`, `e-dy-l3-13`, `e-mg-l2-16`, `e-mg-l2-17`) chưa tính vào số trên; gộp theo roadmap v25/v26. Mọi NN mới trong tài liệu này là "số trống lúc build": kiểm lại với các nhánh `wip/*` trước khi tạo file. C4 trùng bài "Dynamo tổng tính sẵn" mà roadmap v28 (`research-pg-plan-gaps.md`) đã lên khung: chỉ viết một bài. Lộ trình NoSQL (12 phần, theo thứ tự General **cũ**) giữ nguyên thứ tự: nó là bản Mongo của các kỹ năng DA, không phải bài tutorial MongoDB; đổi theo thì chỉ là nhãn phần, quyết khi làm R5. Lộ trình NoSQL (`#/engine/mongodb/path`) giữ nguyên, là track luyện tập kiểu General cho Mongo.

### 1.5 Thiết kế và lý thuyết CSDL (25 bài, theo tutorial DBMS)

Không có chỗ cho nội dung này hôm nay (dbms: 31 missing, 32 partial). **Thẻ engine thứ tư "Thiết kế CSDL"** (id `e-ds-l<n>-NN`, labs chạy trên `pgScriptRunner` như Postgres có `setup`) vì dùng lại nguyên khuôn bài Engine. Điều này **phá** luật 4 của roadmap §4.1 ("không engine mới"); user chấp nhận (Q3), lý do ở L322: lý thuyết thiết kế không thuộc engine nào, và đặt nó vào Nâng cao cần cầu nối drill ↔ runner DB mới, tốn hơn nới `ENGINE_ID`.

| Cấp | Tên | Bài (kind) | Điểm route dbms# |
|---|---|---|---|
| L1 | Hệ CSDL và mô hình quan hệ | 01 DBMS làm gì, kiến trúc ba tầng, độc lập dữ liệu (concept) · 02 Mô hình quan hệ, quy tắc Codd, ràng buộc và vi phạm (lab: mỗi vi phạm ra SQLSTATE nào) · 03 Kiểm tra cấp (quiz) | 2–14 |
| L2 | Mô hình ER | 01 Thực thể, thuộc tính, quan hệ, bậc (concept, sơ đồ Mermaid dùng lại `erdView`) · 02 Thực thể yếu, tổng quát hóa, EER (concept) · 03 ER → bảng: bảng nối n–n, khóa ngoại, thừa kế (lab) · 04 Vẽ ERD cho một bài toán thật (lab: tạo schema, kiểm bằng `catalog`) · 05 Kiểm tra cấp (quiz) | 15–25, 31 |
| L3 | Phụ thuộc hàm và khóa | 01 Phụ thuộc hàm, luật Armstrong (concept) · 02 Thử một phụ thuộc hàm trên dữ liệu bằng GROUP BY/HAVING (lab) · 03 Bao đóng, phủ tối thiểu, khóa ứng viên, siêu khóa (concept + bài tập trên giấy dạng chọn) · 04 Kiểm tra cấp (quiz) | 35–44 |
| L4 | Chuẩn hóa | 01 Dị thường và 1NF (concept) · 02 2NF và 3NF: tách bảng, dị thường biến mất (lab) · 03 BCNF (lab) · 04 4NF và 5NF (concept, đọc) · 05 Khi nào phi chuẩn hóa: grain, star schema, JSONB (concept, link adv `c2`) · 06 Capstone thiết kế (capstone: ER → bảng → 3NF → truy vấn kiểm) | 45–50 |
| L5 | Lý thuyết truy vấn và giao dịch | 01 Đại số quan hệ ↔ SQL (concept) · 02 Phép chia = hai lớp NOT EXISTS (lab) · 03 Phép tính quan hệ bộ/miền (concept) · 04 Lịch, khả tuần tự xung đột/view, đồ thị tiền nhiệm (quiz) · 05 Khóa 2PL, nhãn thời gian, Thomas write rule so với MVCC + SSI của Postgres (concept, link `e-pg-l4-12/13`) · 06 Thuật toán xử lý truy vấn: sort ngoài, chọn, join (concept, link `e-pg-l4-04`, `e-pg-l3-14`) · 07 Phục hồi: ARIES so với WAL chỉ-redo của Postgres (concept, link `e-pg-l3-12`) | 26–34, 51, 70–79, 82, 85, 87, 88 |

Phần lưu trữ và index của tutorial DBMS (dbms#58–69) **không** viết lại: bài L5 và trang cấp hiện chip "Đào sâu ở PostgreSQL L3/L5".

### 1.6 Dữ liệu luyện tập và "đúng mà chậm" (yêu cầu mới của user, 2026-11-23)

User: "Kiểu dữ liệu đang yếu: bảng phải có id đúng nghĩa và kiểu chọn kỹ, ở Engine và Lộ trình SQL. Domain thì id ít quan trọng hơn, nhưng dữ liệu domain cũng là chỗ bài sau dạy rằng kiểu chọn sai làm truy vấn chậm, thiếu index thì chậm. Thêm kiểm tra hiệu năng có chặn: đúng mà chậm là chưa đạt."

Kiểm kê chi tiết bảng/kiểu/khóa/index của mọi schema ở `docs/team/schema-perf-v24.md` (commit `2a13982`, đo chi phí 756 lời giải). Mục này chỉ chốt phần Product: người học gặp dữ liệu gì, bài nào dựa vào lựa chọn kiểu/index, và chấm "chậm" thế nào.

#### a. Mô hình dữ liệu luyện tập theo track

| Track | Dữ liệu người học gặp | Hôm nay (đọc từ nguồn) | Đích (Product) |
|---|---|---|---|
| General SQL (Phần 1–11, Nâng cao) | schema `lab` (`src/db/lab.sql`): chuỗi cửa hàng, ~15k dòng, 16 bảng | khóa `id int PRIMARY KEY` **gán tay** (không identity), thời điểm `timestamp` (không múi giờ), trạng thái/kênh là `text` không CHECK, tiền `int`/`bigint` VND, `props jsonb`; 3 index phụ (`orders(customer_id)`, `orders(order_date)`, `app_events(user_id, ts)`); `payments.order_id` không FK là **cố ý** (bài chất lượng dữ liệu) | mọi bảng có khóa chính đúng nghĩa (`bigint`/`int GENERATED BY DEFAULT AS IDENTITY`, giữ giá trị literal nên kết quả không đổi), cột trạng thái có CHECK, khóa ngoại hay join có index; chỗ "sai cố ý" ghi trong đầu file như hook hiện nay. Thời điểm **giữ `timestamp`** (chuỗi cửa hàng một thành phố, giờ địa phương; `timestamptz` thêm `+00` khắp nơi): mặc định theo `schema-perf-v24.md` S10, xác nhận ở review (Q6); Engine L1-01 vẫn dạy `timestamptz` |
| General Phần 9 (ghi) và Phần 11 (hiệu năng) | như trên, **cộng** một bảng lớn hơn cho bài hiệu năng | bảng lớn nhất ~vài nghìn dòng; 16 drill có `plan:` (12 trong `sql.yml` trên `orders`/`app_events`, 4 trong `adv.yml`) đã chấm đọc qua index | thêm `lab.events_big` (~25k dòng, identity, CHECK, index `(customer_id, ts)`, không index trên `kind`; khối mới cuối `lab.sql`, `setseed` riêng, rồi `ANALYZE`; chi tiết `schema-perf-v24.md` §2.1): bảng lớn nhất hôm nay chỉ 4,284 dòng / 28 trang, câu không sargable chỉ đắt ×1.9–2.3; ghi dữ liệu chỉ trên các bảng **không** có thanh hiệu năng (§3.4) |
| Engine PostgreSQL | `setup` riêng mỗi bài, DB mới mỗi lần chạy (`pgScriptRunner`); bài không `setup` chạy trên `lab` | kiểu do từng bài chọn; L1 01–03 dạy chọn kiểu | luật nội dung: mọi bảng trong `setup` có khóa chính và kiểu đúng, trừ khi bài **dạy** cái sai (khi đó bài ghi rõ "bảng này sai cố ý"); `setup` của bài có thanh hiệu năng kết thúc bằng `ANALYZE` |
| Engine MongoDB | dataset `shop`, `path`, collections inline | `_id` ObjectId/sinh lại mỗi lần chạy | giữ; kiểu ngày `{"$date"}` đúng kiểu, không chuỗi (bài `e-mg-l1-01` nói vì sao) |
| Engine DynamoDB | `setup { tables, items }` | khóa thiết kế theo mẫu truy cập | giữ; đây là chỗ "khóa sai = Scan" (§b) |
| Thiết kế CSDL | `setup` mỗi bài | — | chính track này dạy chọn khóa/kiểu (L1–L4) |
| Domain (ngoài phạm vi) | Logistics/E-com/Finance | ch11 Logistics đã chấm kế hoạch | theo `schema-perf-v24.md`; route này chỉ link chip "Đào sâu" tới các bài dưới |

Bài dựa vào lựa chọn kiểu/index (phải giữ đúng khi schema đổi; danh sách cho schema-perf kiểm):

- General: `cast` (so `int` với chữ, ép kiểu làm mất index), `date_math`/`date_bucket` (so khoảng ngày thay vì hàm trên cột), `sargable`, `index_design`, `explain_read` (12 drill `plan:` + 4 drill nút), `anti_join`/`exists` (NOT IN gặp NULL), `distinct` (DISTINCT che join nhân dòng), `correlated_value` và `distinct_on` (dòng mới nhất), Phần 9 (ON CONFLICT cần UNIQUE), nút `a10`, `c1`.
- Engine PG: L1 01–03, 09–11, mới 13, 16, 17; L2 01–17 (index), L3 03 (TOAST), 08 (fillfactor), L4 01–08, L5 01–07, 16, 17; mọi capstone.
- Engine Dynamo: L1 02, 08–10; L2 02, 09, 10; L3 toàn cấp; L4 01–05. Mongo: L3 01–17 (index, ESR, covered).

#### b. Chấm "đúng mà chậm"

Nguyên tắc: **không bao giờ dùng mili giây** (thời gian WASM dao động; luật ch11, `src/planCheck.ts`). Chậm được đo bằng thứ tất định:

| Engine | Đo bằng | Có sẵn | Thêm |
|---|---|---|---|
| PostgreSQL (General drill, Engine lab) | `EXPLAIN (FORMAT JSON)` không ANALYZE: loại nút và `Total Cost` gốc, chạy **cùng DB, cùng request** với lời giải | drill `plan: { index: t }` (12 drill); ch11 `lab: { table, ddl, max_cost_ratio }`; Engine `check: plan` (cùng dạng kế hoạch + cùng dòng) | `slowVerdict` (`schema-perf-v24.md` §5.2): **indexLost** (lời giải đọc bảng T qua index, bài Seq Scan T, T đủ lớn) **hoặc** cost(bài) > `perf.max_ratio` (mặc định 1.5) × cost(lời giải). Tỉ lệ một mình không đủ: planner đánh giá thấp `date_trunc`/`to_char`, câu không sargable có khi ra ×0.93 |
| DynamoDB | `ScannedCount`, `ConsumedCapacity` thật của dynoxide | `noScan`, `maxScanned`, `maxRcu` (hôm nay chỉ làm câu trả lời "yếu") | bước có `perf` thì vượt ngưỡng = **chưa đạt** (đổi từ yếu sang chặn) |
| MongoDB | mingo **không** có index hay explain | luật: `grade: esr`, `covered`, `match-first`; explain ghi sẵn có nhãn | thanh = luật (thứ tự khóa ESR, `$match` trước `$lookup/$unwind`, chỉ chiếu cột trong index), nhãn "Chấm theo quy tắc, không đo trên MongoDB thật"; không hứa con số |

Chặn ở đâu (Q5, L324): **chỉ** bước có `perf:` = General Phần 11 (và 4 drill nút `a10`) + bài Engine có thanh. Mọi drill/bước khác: ratio > 3 → **đạt yếu kèm ghi chú** của Boon (hai dòng kế hoạch, bẫy của kỹ năng), không chặn. Người học thấy ở bước chặn:

- "Đúng kết quả, nhưng chậm: chi phí 1,240 so với lời giải 38 (gấp 33 lần). Nút tốn nhất: Seq Scan trên `events`." + cây kế hoạch (dùng lại `enginePredict`), + gợi ý trỏ về mục "Lỗi hay gặp" của bài.
- Không vào `completed`, không XP, không tính lượt nộp sai cho drill (người học đã đúng logic); bước capstone không qua.
- Drill đã qua trước khi có thanh: **giữ** trong `completed` (không chấm lại quá khứ).

Ai có thanh hoặc ghi chú (mỗi chỗ phải có ≥ 1 câu "đúng nhưng chậm" trong nội dung, trường `slow:`, mà test chứng minh **trượt**, và lời giải **qua**: như `tests/planCheck.test.ts`):

| Chỗ | Bài / drill | Câu chậm điển hình |
|---|---|---|
| General Phần 3 (ghi chú) | `cast` drill trap/review | `WHERE id::text = '42'`, so cột `int` với chuỗi |
| General Phần 3 (ghi chú) | `date_math`, `date_bucket` 1 drill mỗi kỹ năng | `WHERE date_trunc('month', order_date) = …` thay cho khoảng ngày |
| General Phần 2, 5, 6, 7 (ghi chú) | `distinct`, `correlated_value`, `distinct_on`, `exists` 1 drill mỗi kỹ năng | DISTINCT sau join nhân dòng; subquery tương quan theo từng dòng; NOT IN thay NOT EXISTS |
| General Phần 11 (**chặn**) | 12 drill `plan:` có sẵn (+ 4 drill nút `a10`) + `perf` | hàm trên cột, OR thay IN, index sai thứ tự cột |
| Engine PG (**chặn**) | L1 09–11, **13** (đổi kiểu), **17** (kiểu sai); L2 index labs; L4 01–08; capstone L1–L5 mỗi bài ≥ 1 bước | |
| Engine Dynamo (**chặn**) | L1 08–10, L2 02, L3 03–06, capstone L1–L4 | Scan + filter thay Query; GSI sai khóa |
| Engine Mongo (**chặn**, theo luật) | L3 05, 08, 09, 12, capstone L2 | thứ tự khóa sai ESR; `$lookup` trước `$match` |

Bảng nhỏ: planner có thể chọn Seq Scan bất kể index. Thanh chỉ đặt trên bảng mà test chứng minh lời giải đọc qua index và câu chậm trượt; nếu không chứng minh được thì bài không có thanh.

### 1.7 Đo kỹ năng và huy hiệu thay chứng nhận (Q4, quyết định Product, L323)

User: "Không cần chứng nhận, có thể bỏ hẳn. Làm huy hiệu hoặc thứ đo kỹ năng hiện tại của người học, vì chứng nhận vô giá trị. Product quyết."

**Quyết định.** Bỏ hẳn chứng nhận (`certificateSvg`, `PAPER`, `inlineSprite`, khóa `cert.*` trong `src/i18n/me.ts`, thẻ "Chứng nhận" trên `#/me`). Thay bằng hai thứ, cả hai **suy ra** từ Save + pref sẵn có, **không** trường Save mới, không bump:

1. **Bản đồ kỹ năng** (đo mức *hiện tại*, có thể tụt khi lâu không ôn);
2. **Huy hiệu** (mốc rõ ràng, tính lại mỗi lần vẽ từ mức hiện tại).

Lý do: chứng nhận là ảnh tự in, không chứng minh gì và chỉ nói "đã từng xong". Mức đo từ lần ôn gần nhất nói đúng điều người học cần biết: hôm nay mình làm được gì, cái gì sắp quên.

#### Mô hình mức (thuần, `src/mastery.ts`, chạy trong bundle chính, không cần chunk General)

Mỗi **kỹ năng SQL** (43) có mức 0–4. Bằng chứng, chỉ từ dữ liệu đã có:

| Bằng chứng | Nguồn |
|---|---|
| drill đã qua và loại của nó (`faded`, `open`, `trap`, `review`, nhận từ hậu tố `-1..4` theo luật 4 drill/kỹ năng) | `save.completed` (`g-<skill>-n`) |
| việc domain dạy kỹ năng đó, đánh giá thăng tiến đã qua | `save.completed`, `learnedSkills` |
| thẻ ôn Leitner: hộp 1–5 và ngày đến hạn | `save.review[skill]` |
| drill có thanh hiệu năng đã qua (chỉ Phần 11 chặn, nên qua = đã nhanh) | `save.completed` + danh sách id `perf` (tĩnh, sinh lúc build) |

| Mức | Tên (VI / EN) | Điều kiện |
|---|---|---|
| 0 | Chưa học / Not started | không có bằng chứng |
| 1 | Đã gặp / Met | 1 drill qua, hoặc một việc domain *dùng* kỹ năng đã xong |
| 2 | Làm được / Can do | `knownSkills` hôm nay (≥ 2 drill, hoặc việc dạy nó, hoặc có thẻ ôn) |
| 3 | Vững / Solid | mức 2 + drill `trap` đã qua + thẻ ôn hộp ≥ 3 (đã nhớ lại đúng qua ≥ 2 khoảng ôn) |
| 4 | Thành thạo / Fluent | mức 3 + đủ 4 drill + hộp ≥ 4 + (kỹ năng Phần 11) drill có thanh đã qua |

**Tụt mức (decay):** thẻ ôn quá hạn hơn một khoảng của hộp nó (`today − due > INTERVALS[box−1]`, ngày thật của máy như Leitner hiện nay) thì mức hiển thị trừ 1 và kèm nhãn "Cần ôn", link vào hàng ôn hôm nay. Ôn đúng là lên lại; ôn sai thì hộp tụt theo luật Leitner có sẵn, mức tụt theo. Không lưu gì thêm.

**Engine** không có thẻ ôn, nên đo theo **mô-đun**: "Chưa mở / Đang học k/n / Xong" (xong = mọi bài chấm được của mô-đun trong `completed`; bước không chấm được không tính, như L298). Cấp "Xong" = mọi mô-đun xong + capstone. Không tụt (không có ôn); ghi rõ trên trang.

**Domain** (ngoài phạm vi route, nhưng mất chứng nhận domain): bậc nghề `rankOf()` đã là thước đo, giữ như hôm nay.

#### Hiện ở đâu

- **`#/me` thẻ "Bản đồ kỹ năng"** (thay thẻ Chứng nhận): 11 Phần theo `route.yml`, mỗi kỹ năng một hàng = icon kỹ năng + tên + 4 chấm mức (chữ mức đọc được cho trình đọc màn hình, không chỉ màu) + "Cần ôn" nếu có; dưới là Engine: mỗi engine một dòng L1–L5 với k/n mô-đun. Một nút "Ôn những kỹ năng cần ôn" (= `startToday`). Câu đầu thẻ: "Đo trên máy này từ bài bạn đã làm và lần ôn gần nhất. Không xác minh, không phải chứng chỉ."
- **Trang kỹ năng `#/learn/skill/<id>`:** dòng "Mức của bạn: Vững · ôn tiếp ngày …" và **một** việc để lên mức kế ("Qua drill bẫy để lên Vững").
- **Trang Phần `#/learn/sql/<n>`:** mỗi hàng kỹ năng có chấm mức (thay ✓ hiện nay; ✓ = mức ≥ 2 vẫn giữ nghĩa cũ).
- Không thêm gì lên Trang chủ hay top bar (đã có nút Ôn).

#### Huy hiệu

Mỗi huy hiệu = một câu điều kiện đọc được, tính lại mỗi lần vẽ; mất được (khi mức tụt), lấy lại được. Không ngày đạt (Save không có), không điểm, không xếp hạng.

| Huy hiệu | Điều kiện | Số |
|---|---|---|
| "Phần n vững" | mọi kỹ năng của Phần n ở mức ≥ 3, không kỹ năng nào "Cần ôn" | 11 |
| "Đúng và nhanh" | mọi drill có thanh của Phần 11 đã qua | 1 |
| "SQL nền tảng" | 38 kỹ năng nền ở mức ≥ 2 (= điều kiện chứng nhận General cũ) | 1 |
| "<Engine> Lk" | cấp k của engine "Xong" (PostgreSQL, MongoDB, DynamoDB, Thiết kế CSDL × L1–L5) | 20 |
| "Lộ trình NoSQL" | mọi phần của `#/engine/mongodb/path` qua | 1 |
| "<Domain>: <bậc cuối>" | đánh giá thăng tiến cuối của domain đã qua (= điều kiện chứng nhận domain cũ), ghi "công ty hư cấu" | 3 |

Tổng 37. Vẽ bằng icon pipeline sẵn có (`icons.ts`, một glyph mỗi nhóm, màu accent; chưa đạt = viền xám + câu điều kiện), không ảnh tải về. Portfolio Markdown thêm mục "Mức kỹ năng hiện tại (tự đo, không xác minh)": bảng kỹ năng ≥ 2 và huy hiệu đang có.

#### Portfolio và tên

Portfolio (I6) hôm nay "mở cùng chứng nhận". Đổi: mở khi domain có ≥ 1 việc đã chấm (`save.graded`), không cần qua đánh giá cuối; nội dung giữ nguyên luật cũ (chỉ SQL đã chấm, chữ "hư cấu/not verified"). Pref `cargo-query/me-name` giữ (portfolio dùng).

#### Người đã có chứng nhận

Chứng nhận chưa bao giờ nằm trong Save (vẽ lúc bấm), nên không có gì để chuyển. Ai đạt điều kiện cũ thấy ngay huy hiệu tương ứng ("SQL nền tảng", "<Domain>: <bậc cuối>"): cùng điều kiện, không ai mất sự ghi nhận. File PNG/SVG đã tải về vẫn là của họ. Một dòng `text-caption` trong thẻ Huy hiệu (không pref, không popup): "Chứng nhận đã được thay bằng huy hiệu đo mức hiện tại." Tests: bỏ test chứng nhận, thêm `tests/mastery.test.ts` (thuần) và cập nhật `axeProgress` cho `#/me`.

Lát: **R0** (v24), vì cần `route.yml` cho Phần; mức 4 của Phần 11 và huy hiệu "Đúng và nhanh" tự đúng khi drill có thanh ra ở R2. Ngân sách: chunk `me` nhỏ đi (bỏ SVG chứng nhận), `mastery.ts` trong main < 2 KB gz.

---

## 3. Kế hoạch chuyển đổi

### 3.1 Ràng buộc kỹ thuật quyết định cách chuyển

1. **Phần của General = chương Logistics.** `skills.yml` `chapter:` vừa là chương ticket grant kỹ năng (mỗi kỹ năng đúng một ticket), vừa là "Phần n" (`moduleTitle` đọc `chapters.yml` `module:`), vừa là đơn vị của `placementItems` và `#/learn/sql/<n>`. Đổi `chapter:` sẽ đổi domain (ngoài phạm vi). → Thêm **một file thứ tự riêng cho General**: `content/general/route.yml` (`- { n, title {vi,en}, skills: [...], nodes: [...] }`), là nguồn duy nhất cho Phần trên `#/learn`, kiểm tra đầu vào và danh sách Luyện SQL. `skills.yml` `chapter:` giữ nghĩa domain. Link "Phần n" từ dòng chương Logistics (`ui/homeView.ts`) đổi thành link tới trang kỹ năng đầu tiên của chương.
2. **Kỹ năng mới không có ticket domain.** `tests/noDeadEnds.test.ts` đòi mỗi kỹ năng có "một chương dùng nó"; Lily lớn theo `knownSkills` của Logistics (`STAGE_AT`, giai đoạn 5 = "25+ hoặc mọi kỹ năng"); chứng chỉ General = "mọi kỹ năng trong `skills.yml`". → 5 kỹ năng mới vào **file riêng** `content/general/skills-general.yml` (cùng khuôn), không vào `skills.yml`: Lily, chứng chỉ, domain không đổi. Bẫy: `parseSave` chỉ giữ thẻ ôn (`review`) có khóa trong `Known.skills`, mà `main.ts` dựng `Known.skills` từ `SKILLS` (`skills.yml`) lúc boot; nếu file mới chỉ nằm trong chunk lazy thì thẻ ôn của 5 kỹ năng mới **mất khi tải lại**. Cách: danh sách id kỹ năng chỉ-General (5 chuỗi) đi vào bundle chính và vào `Known.skills` (test: fixture có thẻ ôn `upsert` đọc lại còn nguyên); luật noDeadEnds thêm nhánh "kỹ năng chỉ General: có bài + 4 drill + một Phần". Chứng nhận bị bỏ (Q4, §1.7), nên kỹ năng mới không làm ai mất gì.
3. **Id đóng.** `DRILL_ID = /^g-[a-z0-9-]+$/` nhận mọi drill mới (`g-cross-join-1`, `g-a11-1`). `ENGINE_ID = /^e-(pg|mg|dy)-…/` không nhận `e-ds-`: track thiết kế sửa thành `/^e-(pg|mg|dy|ds)-…/` + `EngineId` + route + thẻ (Q3, L322).
4. **Ngân sách.** `lessons` 35 KB (thẻ nhanh, giữ), `generalAdv` 46/50, `engineLesson` 8 KB mỗi file. Bài đầy đủ General và nút `adv` chuyển sang **một chunk mỗi bài** (cùng cơ chế `?fm` + check-budget `'each'`), nên độ dài §2.2 không đẩy chunk nào quá 8 KB gz; bài Engine ở độ dài đích (VI + EN, gấp ~3 lần chữ hôm nay) ước 6–9 KB gzip so với ngân sách 8 KB mỗi file: nâng `engineLesson` lên 12 KB mỗi file (chỉ tải khi mở bài, không ảnh hưởng boot) hoặc tách mục 6 + ví dụ phụ ra chunk kèm; đo ở lát R3 trên 5 bài mẫu trước khi viết hàng loạt.
5. **Seed bị ghim.** `lab.sql` có md5 trong `tests/lab.test.ts`, snapshot có `__SEED_HASH__`. Mọi đổi kiểu/khóa/index của `lab` là **một lát riêng** (R0b), chạy lại toàn bộ test General và chụp lại chi phí kế hoạch.

### 3.2 Giữ tiến độ người học

- **Không đổi tên, không xóa id nào** (kỹ năng, drill, nút, bài Engine). Save chỉ chứa id (`completed`, `review` theo kỹ năng, `bossStep`); id lạ bị lọc khi đọc (`isWorkId`, `Known`), nên đổi tên = mất tiến độ. "Thay" một bài = viết lại nội dung **dưới cùng id**.
- Không bump `SAVE_VERSION`: không trường Save mới. Thứ tự Phần, trạng thái "đã học", huy hiệu Phần đều suy ra từ id ⇒ tự đúng theo thứ tự mới.
- Bảng cũ → mới:

| Cũ | Mới | Người học thấy gì |
|---|---|---|
| 38 kỹ năng, Phần = chương | cùng 38 id, Phần theo `route.yml` (§1.1) | cùng dấu ✓; huy hiệu Phần tính lại theo nhóm mới |
| 152 drill `g-<skill>-1..4` | giữ; 5 drill viết lại nội dung (§1.1) | drill đã qua vẫn ✓ |
| `lessons.yml` thẻ nhanh | giữ, là "tóm tắt" | bài đầy đủ mới ở trang kỹ năng |
| 28 nút `a1`…`d8` | giữ, thêm `a11` | |
| 200 bài Engine | giữ id; `module:` đổi ở PG L1 (`ddl`, `write`, `schemas`), bài `e-pg-l1-06`, `e-mg-l1-01` mở rộng | |
| `#/learn/sql/<n>` đã đánh dấu | trỏ Phần n **mới** (nội dung khác) | chấp nhận; route nhớ chỉ lưu id trang, không lưu n |
| Chứng nhận (domain, General) | bỏ; thay bằng bản đồ kỹ năng + huy hiệu đo mức hiện tại (§1.7) | §1.7 "người đã có chứng nhận" |

### 3.3 Gộp và bỏ

- **Gộp:** B6 vào `e-pg-l1-06`; C1 vào `e-mg-l1-01`; INTERSECT vào `except`; RIGHT JOIN vào `left_join`; DELETE … USING và xóa trùng vào `update_join`; CREATE TABLE AS / SELECT INTO vào `insert_select` (General) và `e-pg-l1-14` (Engine); "Delete table" Dynamo vào C5.
- **Không làm thành bài riêng:** A4 (lấy mẫu) thành nút `a11` thay vì kỹ năng; MySQL/SQLite (Q7): không Phần, không bài đọc, không runtime; chỉ một dòng bẫy trong mục 5 khi cần.
- **Bỏ khỏi route (n/a, giữ như gap map):** cài đặt, môi trường, GUI, driver (Java/PHP/Perl/Python/C), hosting RDS, 29 sản phẩm khác, tính năng đã bỏ (map-reduce, Data Pipeline).
- **Bỏ (quyết định user):** Phần 12 "SQL ở hệ khác" và nút `p1`–`p4` (Q7); mục 6 "Ở hệ khác" của giải phẫu; chứng nhận và ảnh chứng nhận (Q4).
- **Không có ngõ cụt:** `tests/noDeadEnds.test.ts` mở rộng: mọi Phần trong `route.yml` có ≥ 1 kỹ năng/nút; mọi kỹ năng chỉ-General có bài đầy đủ + 4 drill; mọi bài `runtime: docs` có quiz để xong; không chữ "sắp có"/"later".

### 3.4 Hạ tầng cần (code, ghi để ước lượng; tài liệu này không làm)

| Việc | Ở đâu | Cho lát |
|---|---|---|
| `content/general/route.yml` + đọc Phần từ đó (`learnView`, `placementItems`, `#/learn/sql/<n>`) | `src/learn.ts`, `ui/learnView.ts`, `progress.ts` | R0 |
| `skills-general.yml` + luật noDeadEnds/i18n/icons cho kỹ năng chỉ-General; id của chúng vào `Known.skills` lúc boot | `src/general.ts`, `src/main.ts`, `src/save.ts`, tests | R0 |
| Bài đầy đủ General/nút: file `.md` mỗi bài, chunk mỗi bài, test giải phẫu (đủ 8 mục, ≥ 3 ví dụ chạy, ≥ 2 bẫy chạy, ≥ 2 câu hỏi) | `src/generalLessonSources.ts`, `tests/` | R0 |
| `perf:` cho drill và bước lab Postgres (một hàm trong `planCheck.ts`), trường `slow:` + test | `src/planCheck.ts`, `work.ts`, `engine/pglab` | R0 |
| Dynamo `noScan`/`maxScanned`/`maxRcu` chặn khi bước có `perf` | `src/engine/dynamo/grade.ts` | R5 |
| Bỏ chứng nhận; bản đồ kỹ năng + huy hiệu (§1.7) | `src/me.ts`, `src/ui/meView.ts`, `src/i18n/me.ts`, mới `src/mastery.ts` (thuần) | R0 |
| Drill ghi: chạy câu của người học rồi câu `after:` (đọc bảng) trong cùng `BEGIN … ROLLBACK`, so với lời giải theo cùng cách; chỉ ghi lên bảng không có thanh hiệu năng | `src/db/run.ts`, `src/grader.ts`, `src/general.ts` | R2 |
| `ENGINE_ID`/`EngineId` thêm `ds` | `src/save.ts`, `src/engine/*`, `src/route.ts` | R4 |
| Kiểu/khóa/index của `lab` + bảng lớn | `src/db/lab.sql` (theo `schema-perf-v24.md`) | R0b |

---

## 4. Lát phát hành và tiêu chí thoát

Đánh số R0…R6 (route slice). Mỗi lát phát hành được một mình; thứ tự theo giá trị cho người học và phụ thuộc. User chọn **xen kẽ** (Q1, L320): mỗi version của roadmap mang thêm một lát (cột "Version"); luồng R (sửa review) vẫn đi trước mọi việc mới.

| Lát | Nội dung | Phụ thuộc | Version |
|---|---|---|---|
| **R0** Hạ tầng route | `route.yml` (thứ tự Phần mới, 5 drill viết lại), `skills-general.yml` (rỗng), chunk bài đầy đủ + test giải phẫu, `perf:` + `slow:` + `slowVerdict` cho Postgres; **bỏ chứng nhận, thêm bản đồ kỹ năng + huy hiệu** (§1.7) | — | v24 |
| **R0b** Dữ liệu `lab` | khóa/kiểu/CHECK/index theo `schema-perf-v24.md`, `events_big` ~25k, `ANALYZE`; giữ `timestamp` | R0 (test `perf`) | v24 |
| **R1** SQL Phần 1–8 đầy đủ | 34 bài đầy đủ (gồm `cross_join`, `any_all` mới + 8 drill), thanh hiệu năng Phần 2–7 | R0, R0b | v25 |
| **R2** Ghi dữ liệu + Phần 10–11 | Phần 9 (3 kỹ năng, 12 drill, bộ chấm ghi-rồi-đọc), 6 bài đầy đủ Phần 10–11 (9 bài đầy đủ trong lát), thanh Phần 11 | R1 | v26 |
| **R3** PostgreSQL L1–L2 theo tutorial | 12 bài mới (L1 13–17, L2 18–24), mở rộng `e-pg-l1-06`, giải phẫu §2.2 cho 41 bài L1–L2, thanh hiệu năng L1–L2 | R0 | v27 |
| **R4** Thiết kế CSDL | thẻ thứ tư, 25 bài, `ENGINE_ID` thêm `ds`; nút `a11` | R1, R3 | v28 |
| **R5** MongoDB/DynamoDB lấp lỗ | 4 bài mới + `e-mg-l1-01` mở rộng, Dynamo `perf` chặn, thanh luật Mongo; nên đi cùng roadmap v25/v26 | R0 | v25 (Mongo) + v26 (Dynamo) |
| **R6** Giải phẫu L3–L5 | 51 bài PG + Mongo/Dynamo L3–L5 tách "Cú pháp"/"Lỗi hay gặp"; thanh hiệu năng mọi capstone | R3, R5 | v29 |

Tiêu chí thoát (mỗi dòng là một lệnh hoặc một con số; cộng thêm cổng chung của mọi version: `tsc` 0 lỗi, `npm test`, build, `check-budget`, smoke, `ux-audit` 0 serious, e2e phần liên quan, `review-<lát>.md`):

| Lát | Thoát khi |
|---|---|
| R0 | `route.yml` có 11 Phần kỹ năng; test thứ tự tiên quyết: 0 drill/bài dùng cấu trúc của Phần sau (script §1.1 thành test); mọi id trong Save fixture v1–v5 vẫn đọc được, `knownSkills` của `save-v5.json` không đổi; ≥ 1 drill có `perf` + `slow:` trượt/qua trong test; `#/me` không còn chứng nhận; test thuần `mastery`: `save-v5.json` cho đúng mức từng kỹ năng, thẻ quá hạn hạ mức, cùng Save → cùng huy hiệu |
| R0b | md5 `lab` ghim lại; **0** thay đổi kết quả (so trước/sau) của mọi thứ chạy trên `lab`: 152 drill kỹ năng + drill và challenge của 20 nút, 38 bài nhanh (ví dụ, lỗi, Thử ngay), `interview.yml` (25 câu + 5 take-home), mọi bài Engine PostgreSQL **không** `setup`, starter của Thử ngay; 16 drill `plan:` vẫn qua; seed `lab` trong Node ≤ 1.5× hiện tại |
| R1 | 34/34 bài Phần 1–8 qua test giải phẫu; ≥ 102 ví dụ chạy ra dòng; mỗi thanh hiệu năng có câu `slow:` trượt; gap map chạy lại: sql "partial/missing" của Phần 1–8 (sql#48, 64–66, 71) = 0 |
| R2 | 12 drill ghi qua trên lời giải, trượt trên `wrong:`; sau 50 drill ghi liên tiếp, mọi drill `perf` vẫn qua (thử bằng test một phiên); gap map: sql#27, 29–32, 69, 70 và pg#17–19, 31 = covered |
| R3 | e2e `E2E_ONLY=engine` giải mọi bài L1–L2 bằng lời giải; gap map pg missing = 0 (pg#32, 75, 76, 78, 85, 86) và pg partial "Role & Permission"/"Functions" = 0; (MySQL không còn là mục tiêu, Q7) |
| R4 | gap map dbms missing 31 → 0, partial 32 → ≤ 8 (chỉ link sang PG L3–L5); 25/25 bài `e-ds-` qua test giải phẫu; Save fixture có id `e-ds-…` đọc lại còn nguyên |
| R5 | gap map mongodb missing 2 → 0, dynamodb partial 7 → ≤ 2; mỗi bước Dynamo có `perf` trượt với câu Scan tương ứng |
| R6 | 100% bài Engine qua test giải phẫu (tập con theo `kind`); mỗi capstone có ≥ 1 bước thanh hiệu năng với câu `slow:` trượt |

Chỉ số theo dõi sau phát hành (pref `cargo-query/attempts`, chỉ mã và số đếm): tỉ lệ người mở một Phần mới đi tới drill đầu tiên; số lần "đúng mà chậm" trước khi qua (nếu > 3 ở cùng drill thì bài chưa dạy đủ mục 5); không thêm telemetry gửi đi.

---

## 5. Câu hỏi cho user: đã trả lời (2026-11-23)

| # | Câu hỏi | Trả lời | Hệ quả trong tài liệu | Dòng log |
|---|---|---|---|---|
| Q1 | Thay, xen kẽ hay sau roadmap v24–v30? | Xen kẽ | cột "Version" ở §4 | L320 |
| Q2 | Theo tutorial tuyệt đối hay đọc trước, ghi sau? | Đọc trước, ghi sau | §1.1 giữ thứ tự | L321 |
| Q3 | Thiết kế/DBMS: thẻ engine thứ tư hay nút Nâng cao? | Thẻ thứ tư, nới `ENGINE_ID`, ghi lý do phá luật "không engine mới" | §1.5, §3.1 | L322 |
| Q4 | Kỹ năng mới có tính vào chứng chỉ? | Bỏ hẳn chứng nhận; Product thiết kế thứ đo kỹ năng hiện tại | §1.7 | L323 |
| Q5 | Chặn "đúng mà chậm" ở đâu? | Chỉ Phần 11 và Engine; nơi khác là ghi chú | §1.6b | L324 |
| Q6 | `timestamp` → `timestamptz` trong `lab`? | Không trả lời → mặc định giữ `timestamp` (theo `schema-perf-v24.md` S10), **xác nhận ở review** | §1.6a | L325 |
| Q7 | MySQL/SQLite đọc hay chạy? | Bỏ: "Postgres, SQL, DynamoDB, MongoDB là đủ" | bỏ Phần 12, mục 6 | L326 |

Còn mở (hỏi ở review R0): ngưỡng mức 3/4 (hộp ≥ 3 / ≥ 4) có quá khắt không, đo lại sau một tháng dữ liệu `cargo-query/attempts` trên máy thử.

---

## Phụ lục A. Từng bài hiện có → điểm route (sinh bằng script từ `boondata-gap-map.md`, 2026-11-23)

Đảo ngược gap map: mỗi bài/kỹ năng/nút hiện có được liệt kê với các chương tutorial (gap map `#` số dòng; tiền tố sql, pg, my = MySQL, lite = SQLite, mg, dy, dbms; `~` = partial) mà nó phủ. **Hành động cho mọi dòng: giữ id, nội dung lớn lên theo §2.2** ở lát: General → R1/R2/R4 theo Phần; PG L1–L2 → R3; Mongo/Dynamo L1–L2 → R5; L3–L5 mọi engine → R6. Ngoại lệ: `e-pg-l1-06`, `e-mg-l1-01` mở rộng (§1.3, §1.4); `e-pg-l1-01..03` đổi `module:` sang `ddl`, `e-pg-l1-06` sang `schemas`; `e-pg-l1-12` thêm bước cuối. "—" = chiều sâu engine ngoài tutorial (101/200 bài Engine): giữ, đó là phần BoonData vượt tutorial. Bài **mới** và điểm route của chúng ở §1.1–§1.5.

| Id | Bài | Loại | Điểm route (gap map; `~` = partial) |
|---|---|---|---|
| `e-dy-l1-01` | Bảng, item, thuộc tính: DynamoDB nghĩ khác SQL | concept | dy#3,6 |
| `e-dy-l1-02` | Khóa chính: partition key và sort key | concept | dy#3 |
| `e-dy-l1-03` | Không JOIN, và những giới hạn cứng | concept | — |
| `e-dy-l1-04` | Tạo bảng cho mẫu truy cập \"mọi đơn của một khách\ | lab | dy#7 |
| `e-dy-l1-05` | GetItem: đọc một item theo khóa | lab | dy#13 |
| `e-dy-l1-06` | PutItem: thêm hoặc thay cả item | lab | dy#12 |
| `e-dy-l1-07` | UpdateItem và DeleteItem | lab | dy#14,15 |
| `e-dy-l1-08` | Query: đọc một item collection | lab | dy#9,18 |
| `e-dy-l1-09` | Query và Scan: cùng kết quả, khác giá | lab | dy#19 |
| `e-dy-l1-10` | Phân trang: Limit, LastEvaluatedKey, ExclusiveStartKey | lab | dy#9,18 |
| `e-dy-l1-11` | Kiểm tra cấp L1: một ngày ở bàn đơn hàng | capstone | — |
| `e-dy-l2-01` | Năm loại biểu thức và chỗ giữ chỗ | concept | — |
| `e-dy-l2-02` | Điều kiện trên khóa hay trên bộ lọc | lab | dy#9,18 |
| `e-dy-l2-03` | UpdateExpression: SET, REMOVE, list_append, if_not_exists | lab | dy#14 |
| `e-dy-l2-04` | Ghi có điều kiện: chống ghi đè và lost update | lab | dy#26 |
| `e-dy-l2-05` | Atomic counter và tập hợp với ADD | lab | dy#14 |
| `e-dy-l2-06` | BatchGetItem và BatchWriteItem | lab | dy#8,16,17 |
| `e-dy-l2-07` | PartiQL: cú pháp giống SQL, luật vẫn của DynamoDB | lab | — |
| `e-dy-l2-08` | Tính cỡ item bằng tay | quiz | dy#6 |
| `e-dy-l2-09` | Tính RCU trước khi đọc | predict | — |
| `e-dy-l2-10` | Tính WCU trước khi ghi | predict | — |
| `e-dy-l2-11` | Nhất quán cuối hay nhất quán mạnh | concept | — |
| `e-dy-l2-12` | Kiểm tra cấp L2: ca trực tiệm sách | capstone | — |
| `e-dy-l3-01` | Mẫu truy cập trước, khóa sau | concept | dy#35 |
| `e-dy-l3-02` | LSI và GSI: hai loại index phụ | concept | dy#20,21 |
| `e-dy-l3-03` | Tạo bảng có GSI cho mẫu truy cập mới | lab | dy#21 |
| `e-dy-l3-04` | Query trên GSI | lab | dy#21 |
| `e-dy-l3-05` | LSI: sắp lại một item collection theo thuộc tính khác | lab | dy#22 |
| `e-dy-l3-06` | Sparse index: index chỉ chứa item đáng quan tâm | lab | dy#20 |
| `e-dy-l3-07` | Thiết kế một bảng: nhiều loại item, một item collection | concept | dy#35 |
| `e-dy-l3-08` | Một Query thay cho JOIN | lab | — |
| `e-dy-l3-09` | Sort key phân cấp: quốc gia, tỉnh, quận, cửa hàng | lab | — |
| `e-dy-l3-10` | Adjacency list: quan hệ nhiều-nhiều và GSI đảo ngược | lab | — |
| `e-dy-l3-11` | Kiểm tra cấp L3: thiết kế bảng cho tiệm trà | capstone | — |
| `e-dy-l4-01` | Partition: nơi một item thật sự nằm | concept | — |
| `e-dy-l4-02` | Burst, adaptive capacity và giới hạn của chúng | concept | — |
| `e-dy-l4-03` | Tính xem partition nào sẽ nóng | quiz | — |
| `e-dy-l4-04` | Write sharding: rải một khóa nóng bằng hậu tố ngẫu nhiên | lab | — |
| `e-dy-l4-05` | Hậu tố tính được: shard mà vẫn GetItem được | lab | — |
| `e-dy-l4-06` | On-demand hay provisioned, và ước lượng chi phí | concept | — |
| `e-dy-l4-07` | Adjacency list: quan hệ nhiều-nhiều trong một bảng | lab | — |
| `e-dy-l4-08` | Sparse GSI: index chỉ chứa thứ bạn cần tìm | lab | — |
| `e-dy-l4-09` | GSI dùng chung: một index, nhiều kiểu tra cứu | lab | — |
| `e-dy-l4-10` | Sort key phân cấp và item phiên bản | lab | — |
| `e-dy-l4-11` | TransactWriteItems: tất cả hoặc không gì cả | concept | — |
| `e-dy-l4-12` | TransactGetItems: đọc nhiều item cùng một thời điểm | lab | — |
| `e-dy-l4-13` | Transaction PartiQL bị hủy: không ghi nửa chừng | predict | — |
| `e-dy-l4-14` | Kiểm tra cấp L4: thiết kế bảng cho ứng dụng thi đấu trực tuyến | capstone | — |
| `e-dy-l5-01` | DynamoDB Streams: nhật ký thay đổi theo từng item | concept | dy#30~,33~ |
| `e-dy-l5-02` | TTL: hết hạn chưa có nghĩa là đã biến mất | lab | — |
| `e-dy-l5-03` | Global tables: MREC hay MRSC | concept | — |
| `e-dy-l5-04` | PITR và backup theo yêu cầu | concept | dy#29 |
| `e-dy-l5-05` | Bộ máy trong trình duyệt khác DynamoDB thật ở đâu | quiz | — |
| `e-dy-l5-06` | DAX: bộ đệm trong bộ nhớ trước DynamoDB | concept | — |
| `e-dy-l5-07` | Kiểm tra cấp L5: vận hành ứng dụng giao đồ ăn | capstone | — |
| `e-mg-l1-01` | Tài liệu, collection và kiểu BSON | concept | mg#6~,7~,8~,9~,10,49 |
| `e-mg-l1-02` | Tìm tài liệu với find | lab | mg#12 |
| `e-mg-l1-03` | Chỉ lấy trường cần dùng (projection) | lab | mg#15 |
| `e-mg-l1-04` | Thêm và xóa tài liệu | lab | mg#11,14 |
| `e-mg-l1-05` | Sửa tài liệu và upsert | lab | mg#13 |
| `e-mg-l1-06` | Sửa mảng với $push, $addToSet, $pull | lab | mg#13 |
| `e-mg-l1-07` | So sánh và kết hợp điều kiện | lab | mg#12 |
| `e-mg-l1-08` | Truy vấn trong mảng và $elemMatch | lab | mg#12 |
| `e-mg-l1-09` | Trường thiếu, null, kiểu và regex | lab | mg#52 |
| `e-mg-l1-10` | Sắp xếp, phân trang và đếm | lab | mg#16,17 |
| `e-mg-l1-11` | Bài cuối L1: Một ngày ở cửa hàng | capstone | — |
| `e-mg-l2-01` | Sửa phần tử trong mảng ($, $[], arrayFilters) | lab | mg#13 |
| `e-mg-l2-02` | Update bằng aggregation pipeline | lab | — |
| `e-mg-l2-03` | Bẫy chuỗi bắt đầu bằng $ và $literal | predict | — |
| `e-mg-l2-04` | Aggregation pipeline là gì | concept | mg#19 |
| `e-mg-l2-05` | $match, $project và $set trong pipeline | lab | mg#19 |
| `e-mg-l2-06` | Gom nhóm với $group | lab | mg#19 |
| `e-mg-l2-07` | Tách mảng với $unwind | lab | mg#19 |
| `e-mg-l2-08` | Ghép collection với $lookup | lab | mg#19 |
| `e-mg-l2-09` | Chia khoảng với $bucket, nhiều báo cáo với $facet | lab | mg#19 |
| `e-mg-l2-10` | Hàm cửa sổ với $setWindowFields | lab | mg#19 |
| `e-mg-l2-11` | Nhúng hay tham chiếu | concept | mg#5,42,43 |
| `e-mg-l2-12` | Đổi mô hình bằng pipeline | lab | — |
| `e-mg-l2-13` | Luật kiểm tra với $jsonSchema | concept | — |
| `e-mg-l2-14` | Lưu kết quả pipeline với $out và $merge | quiz | — |
| `e-mg-l2-15` | Bài cuối L2: Báo cáo tuần cho cửa hàng | capstone | — |
| `e-mg-l3-01` | Multikey, partial và TTL: index nào cho dữ liệu nào | concept | mg#18,47,48 |
| `e-mg-l3-02` | Đoán kế hoạch: index partial có được dùng? | predict | — |
| `e-mg-l3-03` | Đoán kế hoạch: index multikey có phủ được truy vấn? | predict | — |
| `e-mg-l3-04` | Kiểm tra: các loại index | quiz | — |
| `e-mg-l3-05` | Index kép và luật ESR | concept | mg#18,47,48 |
| `e-mg-l3-06` | Đoán kế hoạch: chưa có index thì sao? | predict | mg#45 |
| `e-mg-l3-07` | Đoán kế hoạch: index kép nào đọc ít khóa hơn? | predict | — |
| `e-mg-l3-08` | Đoán kế hoạch: có stage SORT không? | predict | — |
| `e-mg-l3-09` | Đoán kế hoạch: truy vấn có được phủ? | predict | mg#44 |
| `e-mg-l3-10` | Query planner và plan cache | concept | mg#45 |
| `e-mg-l3-11` | Lab: tìm truy vấn cần index từ nhật ký chậm | lab | mg#45 |
| `e-mg-l3-12` | Lab: đưa $match lên đầu pipeline | lab | — |
| `e-mg-l3-13` | Wildcard, text, 2dsphere và hashed: index cho dữ liệu đặc biệt | concept | mg#18,47,48,51 |
| `e-mg-l3-14` | Sparse, hidden và collation: index bỏ qua gì, ẩn khỏi ai, so chữ thế nào | concept | — |
| `e-mg-l3-15` | Đoán kế hoạch: collation khác thì index có được dùng? | predict | — |
| `e-mg-l3-16` | Đoán kết quả: ép đếm bằng index sparse | predict | — |
| `e-mg-l3-17` | Kiểm tra: index đặc biệt | quiz | — |
| `e-mg-l4-01` | Mẫu thiết kế schema của MongoDB | concept | mg#5,42,43 |
| `e-mg-l4-02` | Lab: mẫu Computed Values cho tổng đơn hàng | lab | — |
| `e-mg-l4-03` | Lab: mẫu Bucket cho số đo cảm biến | lab | — |
| `e-mg-l4-04` | Lab: Schema Versioning, đọc hai phiên bản cùng lúc | lab | — |
| `e-mg-l4-05` | Lab: mẫu Outlier cho sản phẩm có quá nhiều đánh giá | lab | — |
| `e-mg-l4-06` | Lab: dữ liệu đa hình trong một collection | lab | — |
| `e-mg-l4-07` | Write concern và read concern | concept | — |
| `e-mg-l4-08` | Nhất quán nhân quả và session | concept | — |
| `e-mg-l4-09` | Transaction nhiều tài liệu | concept | mg#46 |
| `e-mg-l4-10` | Change streams | concept | — |
| `e-mg-l4-11` | Đoán kết quả: luồng ghi thanh toán đọc từ secondary | predict | — |
| `e-mg-l4-12` | Kiểm tra: nhất quán, transaction, change stream | quiz | — |
| `e-mg-l5-01` | WiredTiger: snapshot, checkpoint, journal, cache | concept | — |
| `e-mg-l5-02` | Đoán kết quả: hai lần ghi cùng một tài liệu | predict | mg#46 |
| `e-mg-l5-03` | Replica set: oplog và bầu primary | concept | mg#20 |
| `e-mg-l5-04` | Đoán kết quả: lần ghi nào sống sót sau failover? | predict | mg#20 |
| `e-mg-l5-05` | Sharding: shard key, chunk và balancer | concept | mg#21 |
| `e-mg-l5-06` | Đoán định tuyến: truy vấn tới một shard hay mọi shard? | predict | — |
| `e-mg-l5-07` | Lab: đo ứng viên shard key bằng aggregation | lab | mg#21 |
| `e-mg-l5-08` | Collection time series | concept | — |
| `e-mg-l5-09` | Kiểm tra: vận hành replica set và cluster | quiz | — |
| `e-mg-l5-10` | Capstone: báo cáo vận hành cho chuỗi cửa hàng | capstone | — |
| `e-pg-l1-01` | Chọn kiểu dữ liệu | concept | sql#7,45,86; pg#5; my#114,115,116,117,118,119,120,121,122,123,124; lite#6 |
| `e-pg-l1-02` | Tạo bảng đầu tiên | lab | sql#4~,5~,17~,18~,19~,23~,24~,25~; pg#16~,20~,30~,55~; my#31~,32~,33~,34~,39~,40~,41~,42~,44~,179~; lite#10~,11~,36~; dbms#57~ |
| `e-pg-l1-03` | Khóa tự sinh, UUID và cột sinh | lab | sql#98,99; pg#82; my#145,154; lite#41 |
| `e-pg-l1-04` | Ràng buộc và khóa | lab | sql#26,55,73,74,75,76,77,82,91,92; pg#35; my#47,64,99,100,101,102,103,150,156; lite#28; dbms#10~,11~,12~,14~,41~,42~,43~,44~ |
| `e-pg-l1-05` | NULL không phải là một giá trị | quiz | sql#53,54,90,94; pg#77; my#81,82,143,181; lite#31 |
| `e-pg-l1-06` | Schema và search_path | lab | pg#33 |
| `e-pg-l1-07` | Transaction và savepoint | concept | sql#27~,30~,31~,32~,95; pg#17~,18~,19~,36,37,38; my#46~,48~,50~,51~,55~,144; lite#12~,18~,19~,39; dbms#53~ |
| `e-pg-l1-08` | View và materialized view | lab | sql#34,35,36,37; pg#39; my#56,57,58,59; lite#38; dbms#56 |
| `e-pg-l1-09` | Index B-tree đầu tiên | lab | sql#78,79,80,81; pg#79; my#60,61,62,63; lite#34; dbms#64,65,66,67,68 |
| `e-pg-l1-10` | Có index, sao vẫn Seq Scan? | predict | my#172; lite#43 |
| `e-pg-l1-11` | Index giúp cả ORDER BY ... LIMIT | predict | — |
| `e-pg-l1-12` | Kiểm tra cấp L1: bảng đăng ký sự kiện | capstone | — |
| `e-pg-l2-01` | Index nhiều cột: luật cột đầu và skip scan | predict | — |
| `e-pg-l2-02` | INCLUDE, index-only scan và index cho lọc + sắp xếp | lab | — |
| `e-pg-l2-03` | Index partial chỉ phủ dòng cần thiết | lab | — |
| `e-pg-l2-04` | Index trên biểu thức | lab | — |
| `e-pg-l2-05` | Index Hash chỉ biết dấu bằng | predict | dbms#69 |
| `e-pg-l2-06` | Mảng và index GIN | lab | pg#49 |
| `e-pg-l2-07` | SP-GiST chia không gian | predict | — |
| `e-pg-l2-08` | BRIN cho dữ liệu ghi theo thời gian | predict | — |
| `e-pg-l2-09` | Bloom cho lọc tổ hợp cột bất kỳ | lab | — |
| `e-pg-l2-10` | Khoảng thời gian, GiST và ràng buộc không chồng lịch | lab | — |
| `e-pg-l2-11` | jsonb và jsonb_path_ops | lab | sql#114; my#173 |
| `e-pg-l2-12` | Tìm kiếm toàn văn với tsvector và GIN | lab | my#133,134,135,136,137 |
| `e-pg-l2-13` | pg_trgm: index cho LIKE '%...%' | predict | my#133,134,135,136,137 |
| `e-pg-l2-14` | Đọc EXPLAIN ANALYZE, và tạo index trên bảng đang chạy | concept | my#172; lite#43 |
| `e-pg-l2-15` | pg_stats: planner đoán số dòng từ đâu | predict | — |
| `e-pg-l2-16` | 5 điểm gần nhất: GiST, KNN và earthdistance | lab | — |
| `e-pg-l2-17` | Kiểm tra cấp L2: trang tìm sản phẩm chậm | capstone | — |
| `e-pg-l3-01` | Một trang heap trông thế nào | concept | dbms#58,59,60,61,62,63 |
| `e-pg-l3-02` | Lab: mở một trang heap | lab | dbms#58,59,60,61,62,63 |
| `e-pg-l3-03` | Lab: giá trị lớn thật ra nằm ở đâu (TOAST) | lab | my#159~ |
| `e-pg-l3-04` | MVCC: mỗi UPDATE là một phiên bản mới | concept | dbms#82~,85~ |
| `e-pg-l3-05` | Lab: đọc dấu vết của UPDATE, DELETE, ROLLBACK | lab | — |
| `e-pg-l3-06` | HOT, prune và VACUUM | concept | lite#44 |
| `e-pg-l3-07` | Lab: một UPDATE HOT và một UPDATE không HOT | lab | — |
| `e-pg-l3-08` | Đoán trước: fillfactor có cứu được HOT không? | predict | — |
| `e-pg-l3-09` | Lab: VACUUM đổi gì trên trang, FSM và visibility map | lab | lite#44 |
| `e-pg-l3-10` | Lab: freeze một trang | lab | — |
| `e-pg-l3-11` | Rủi ro XID wraparound | quiz | — |
| `e-pg-l3-12` | WAL: ghi nhật ký trước, ghi trang sau | concept | dbms#87,88 |
| `e-pg-l3-13` | Lab: đọc bản ghi WAL thật | lab | — |
| `e-pg-l3-14` | Lab: shared buffers, trang bẩn và sort tràn đĩa | lab | pg#41~,42~,44~; my#161~; dbms#58,59,60,61,62,63,70~,71~,72~,73~ |
| `e-pg-l3-15` | Kiểm tra cấp L3: bảng giỏ hàng phình to | capstone | — |
| `e-pg-l3-16` | Lab: VACUUM có làm file bảng nhỏ lại không? | lab | lite#44 |
| `e-pg-l3-17` | Đoán trước: count(*) có đọc khóa chính cho nhanh không? | predict | — |
| `e-pg-l3-18` | Lab: đọc dòng Buffers trong kế hoạch | lab | — |
| `e-pg-l4-01` | Mô hình chi phí: chi phí của kế hoạch từ đâu ra | lab | dbms#74 |
| `e-pg-l4-02` | Thống kê cột: MCV, histogram, correlation | lab | — |
| `e-pg-l4-03` | Thống kê mở rộng cho các cột tương quan | lab | — |
| `e-pg-l4-04` | Thuật toán nối: Nested Loop, Hash Join, Merge Join | lab | dbms#70~,71~,72~,73~ |
| `e-pg-l4-05` | Thứ tự nối, giới hạn gộp và GEQO | predict | dbms#74 |
| `e-pg-l4-06` | Câu đã chuẩn bị: kế hoạch chung và kế hoạch riêng | lab | pg#41~,42~,44~; my#161~ |
| `e-pg-l4-07` | Phân vùng khai báo và partition pruning | lab | my#158 |
| `e-pg-l4-08` | Thiết kế phân vùng: khóa, ràng buộc và giới hạn | quiz | my#158 |
| `e-pg-l4-09` | Lock mode trên bảng và pg_locks | lab | pg#80; dbms#80,81,83,84,86 |
| `e-pg-l4-10` | Row lock: bốn mức, ghi trong tuple | concept | pg#80; dbms#80,81,83,84,86 |
| `e-pg-l4-11` | Deadlock: Postgres phát hiện thế nào và cách phòng | concept | pg#80; dbms#80,81,83,84,86 |
| `e-pg-l4-12` | Mức cô lập và các hiện tượng chúng cho phép | concept | sql#95; pg#36,37,38; my#144; lite#39; dbms#75~,76~,77~,78~,79~,80,81,83,84,86 |
| `e-pg-l4-13` | Serializable: SSI, write skew và SIReadLock | concept | sql#95; pg#36,37,38; my#144; lite#39; dbms#75~,76~,77~,78~,79~,80,81,82~,83,84,85~,86 |
| `e-pg-l4-14` | Advisory lock: lock do ứng dụng định nghĩa | lab | dbms#80,81,83,84,86 |
| `e-pg-l4-15` | Truy vấn song song và JIT (và vì sao PGlite không có) | predict | — |
| `e-pg-l4-16` | Bài tổng kết L4: báo cáo chậm và migration làm treo | capstone | — |
| `e-pg-l5-01` | Bên trong B-tree: tầng, trang và tách trang | lab | dbms#64,65,66,67,68 |
| `e-pg-l5-02` | B-tree: dedup và posting list | lab | — |
| `e-pg-l5-03` | B-tree tự dọn: simple và bottom-up deletion | concept | — |
| `e-pg-l5-04` | Bên trong GIN: posting tree và pending list | lab | — |
| `e-pg-l5-05` | Bên trong BRIN: khoảng khối và tóm tắt | lab | — |
| `e-pg-l5-06` | GiST và SP-GiST: hộp bao và chia không gian | lab | — |
| `e-pg-l5-07` | Chọn loại index (access method) | quiz | — |
| `e-pg-l5-08` | Kiểm index và heap bằng amcheck | lab | — |
| `e-pg-l5-09` | WAL đào sâu: full-page write sau checkpoint | lab | dbms#87,88 |
| `e-pg-l5-10` | Bảo mật theo dòng (RLS) cho hệ thống nhiều khách hàng | lab | pg#54~,56~,57~,58~,59~,83~; my#22~,23~,24~,25~,26~,27~,28~ |
| `e-pg-l5-11` | Tìm câu tốn nhất: pg_stat_statements và pg_stat_* | lab | — |
| `e-pg-l5-12` | Tinh chỉnh bộ nhớ: work_mem, sort và hash | lab | sql#105~ |
| `e-pg-l5-13` | Nhân bản: streaming, slot và logical decoding | lab | — |
| `e-pg-l5-14` | Vận hành: backup, PITR, failover và autovacuum sản xuất | quiz | dbms#87,88 |
| `e-pg-l5-15` | Bài tổng kết L5: bảng sự kiện chậm | capstone | — |
| `e-pg-l5-16` | Index không ai dùng: idx_scan = 0 và cái giá của mỗi index | lab | — |
| `e-pg-l5-17` | REINDEX có cứu được câu chậm không? | lab | — |

| Kỹ năng / nút General | Điểm route |
|---|---|
| `select` | sql#6,10,28,61; pg#4,15,40; my#49,149,167,170; lite#5,13,32; dbms#52,54,55 |
| `where` | sql#8,9,38,44,51,52,56; pg#6,7,21,29; my#67,73,74,79,80,83,139; lite#14,15,16,17 |
| `order_by` | sql#33,41,103; pg#22; my#70; lite#23 |
| `limit` | sql#39; pg#26; my#68; lite#22 |
| `aggregate` | sql#89,108,109,111,112,115,116,120; pg#43,45,46,47,48,51; my#140,142,174,182; lite#46; dbms#52,54,55 |
| `group_by` | sql#42; pg#23; my#71; lite#24 |
| `having` | sql#43; pg#24; my#72; lite#25 |
| `join` | sql#62,63,72; pg#34; my#89,90,98; lite#29; dbms#52,54,55 |
| `multi_join` | sql#62,63; pg#34; my#89,90; lite#29 |
| `left_join` | sql#64~,65~,71~; my#91~,92~ |
| `anti_join` | sql#49; pg#64,69; my#78 |
| `date_math` | sql#56,100,106,120; pg#43,52,84; my#83,88,138,169,182; lite#45,46 |
| `date_bucket` | sql#100,106; pg#52,84; my#88,138,169; lite#45 |
| `null_logic` | sql#53,54,90,94; pg#77; my#81,82,143,181; lite#31 |
| `case_when` | sql#50 |
| `conditional_agg` | sql#50 |
| `coalesce` | sql#53,54,90,94; pg#77; my#81,82,143,181; lite#31 |
| `self_join` | sql#68; my#95 |
| `string_fn` | sql#107,110,120; pg#43,50,53; my#141,182; lite#46 |
| `pattern_match` | sql#46,85; pg#27; my#75,125,126,127,128,129,130,131,132,166; lite#20,21 |
| `distinct` | sql#40; pg#25; my#69; lite#26 |
| `cast` | sql#7,45,86,109,112,115,116; pg#5,51; my#114,115,116,117,118,119,120,121,122,123,124,140; lite#6 |
| `scalar_subquery` | sql#96; pg#81; my#148; lite#40; dbms#52,54,55 |
| `in_subquery` | sql#47,96,104; pg#81; my#45,76,148; lite#40 |
| `exists` | sql#47,49,104; pg#64,69; my#76,78 |
| `correlated_value` | sql#96; pg#81; my#148; lite#40 |
| `cte` | sql#102; pg#28; my#45,155 |
| `multi_cte` | sql#102; pg#28; my#155 |
| `distinct_on` | sql#40,97; pg#25; my#69,146,175; lite#26 |
| `union` | sql#57,58,72; pg#60; my#84,85,98; lite#30 |
| `except` | sql#59,60; pg#61,65,66; my#86,87 |
| `full_join` | sql#67; my#94 |
| `window_rank` | sql#97; my#146,175 |
| `window_lag` | — |
| `window_agg` | — |
| `explain_read` | sql#78,79,80,81; pg#79; my#60,61,62,63,172; lite#34,43 |
| `sargable` | sql#78,79,80,81; pg#79; my#60,61,62,63; lite#34 |
| `index_design` | sql#78,79,80,81; pg#79; my#60,61,62,63; lite#34 |
| nút `a10` | sql#105~ |
| nút `a2` | sql#89,108,111; pg#45,46,47,48; my#142,174 |
| nút `a3` | sql#66~,100,106; pg#52,84; my#88,93~,138,169; lite#45 |
| nút `a4` | my#168 |
| nút `a6` | sql#102; pg#28; my#155 |
| nút `a7` | sql#114; my#173 |
| nút `a8` | sql#46,85,107,110; pg#27,50,53; my#75,125,126,127,128,129,130,131,132,141,166; lite#20,21 |
| nút `b7` | sql#89,108,111; pg#45,46,47,48; my#142,174 |
