# Product route v24: lộ trình học theo tutorial (General/SQL + Database Engine)

Người viết: Product Designer. Ngày 2026-11-23. Nhánh `design-v24` (từ `main` @ `74e339f`). **Chỉ tài liệu**, không đổi code hay nội dung.

Phạm vi: Lộ trình học (General: `content/skills.yml`, `content/lessons.yml`, `content/general/sql.yml`, `adv.yml`) và khu Database Engine (`content/engine/**`). Ba domain (Logistics, E-com, Finance) **ngoài phạm vi**, trừ chỗ chúng bị ràng buộc kỹ thuật với General (§3.1).

Đầu vào: `docs/knowledge/database/` (README, `tutorial-routes.md`, `boondata-gap-map.md`, các file kiến thức), `roadmap-v23-v30-revised.md`, `handoff-2026-11-20.md`, `review-v23.md`, `product-design-db-engine.md`, `engine-pedagogy.md`, `best-practice-catalogue.md`, và kiểm kê nội dung trên `main`.

Người đọc song song: UI/UX designer (`docs/team/ux-route-v24.md`) cần §2 (giải phẫu bài, độ sâu điều hướng). §2 được viết và commit trước.

**Lưu ý đóng băng.** User đã dừng ở v23 (2026-11-20). Tài liệu này là đề xuất; số version ở §4 là "lát R1, R2…" (route slice), không chiếm số v24–v30 đã gán trong roadmap. Ghép lát vào version nào là câu hỏi Q1 (§5).

---

## 2. "Đủ chi tiết như tutorial": giải phẫu một bài và độ sâu điều hướng

(Viết trước để UI/UX dùng. §1 lộ trình đích ở dưới.)

### 2.1 Hiện trạng đo được

| Loại bài hiện có | Số | Độ dài phần chữ (VI) | Có gì |
|---|---|---|---|
| Bài nhanh General (`lessons.yml`, 1 thẻ / kỹ năng) | 38 | 102–152 từ, TB 127 (concept + explain + mistake) | 1 ví dụ, 1 lỗi hay gặp, "Thử ngay"; + 4 drill trong `sql.yml` |
| Nút nâng cao (`adv.yml`, `in`/`partial`) | 20 | ~600–700 từ | bài + 4 drill (+ challenge) |
| Bài Engine (`content/engine/**`) | 200 (PG 80, Mongo 65, Dynamo 55) | ~500–1,100 từ kể cả frontmatter (PG L1: 660–1,590) | Ý chính, Ví dụ, lab nhiều bước, predict/quiz, "Đọc thêm" |

Tutorial (tutorialspoint và tương tự) mỗi chương có: giới thiệu, cú pháp, nhiều ví dụ có kết quả, biến thể, lưu ý. Khoảng cách lớn nhất là **bài nhanh General** (≈ 1/6 độ dài một chương tutorial, 1 ví dụ). Bài Engine đã gần đủ, thiếu đều đặn hai phần: "Cú pháp" và "Lỗi hay gặp" thành mục riêng.

### 2.2 Giải phẫu chuẩn (một bài = 9 mục, theo thứ tự này)

Áp cho mọi bài **kỹ năng General** và mọi bài Engine `concept`/`lab`. Bài `quiz`/`predict`/`capstone` dùng tập con ghi ở cột cuối.

| # | Mục (tiêu đề hiện trên trang) | Nội dung | Bắt buộc | Kiểm được bằng test |
|---|---|---|---|---|
| 1 | **Mở bài** | 1 tình huống/câu hỏi (≤ 3 câu, không mở bằng định nghĩa: pedagogy §1.2) + "Học xong bạn làm được" 2–4 dòng (`objectives`) | có | `objectives` 2–4 |
| 2 | **Ý chính** | ≤ 150 từ một khối (giữ luật pedagogy); chủ đề có hiểu lầm thì nói thẳng "Nhiều người nghĩ X. Thật ra Y" | có | ≤ 150 từ |
| 3 | **Cú pháp** | khung lệnh, phần tùy chọn trong `[ ]`, bảng "tùy chọn → ý nghĩa" ≤ 8 dòng | có (trừ bài lý thuyết thuần) | có khối `sql` đầu mục |
| 4 | **Ví dụ chạy được** | 3–6 ví dụ, đơn giản → thật; mỗi ví dụ: SQL + nút Chạy (PGlite, schema `lab` hoặc setup của bài) + kết quả + 1–2 câu đọc kết quả | có | ≥ 3 ví dụ, mỗi ví dụ chạy ra dòng (như `tests/lessons.test.ts`) |
| 5 | **Lỗi hay gặp** | 2–4 bẫy; mỗi bẫy = câu SQL sai **chạy thật** (báo lỗi có SQLSTATE, hoặc ra kết quả sai lặng lẽ) + vì sao + cách sửa | có | ≥ 2, mỗi câu chạy và khác ví dụ (như `mistake` hôm nay) |
| 6 | **Ở hệ khác** | MySQL 8.4 / SQLite / SQL Server khác gì, 1 bảng ngắn; nhãn "Không chạy trong trình duyệt · theo tài liệu <hệ>" | chỉ khi có khác biệt | nguồn trong `sources` |
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

- **General:** thẻ nhanh trong `lessons.yml` **giữ nguyên** (nó là bản tóm tắt hiện trong ticket domain qua `lessonSlot`, và trong hộp thoại bài học). Bài đầy đủ là file mới `content/general/lessons/<skill>.md` (frontmatter + 9 mục), mỗi file một chunk lazy như bài Engine (`?fm`, ngân sách mỗi file 8 KB kiểu `'each'`). Ánh xạ: `concept` → nguồn của mục 2; `example` + `explain` → ví dụ 1 của mục 4; `mistake` → bẫy 1 của mục 5; `try` → mục 7; `docs` → mục 9; `skills.yml` `syntax/when/trap` → mục 3 và 9. Viết thêm: cú pháp, 2–5 ví dụ, 1–3 bẫy, ở hệ khác, 2–4 câu hỏi.
- **Engine:** đã có mục 1, 2, 4 (phần lớn), 7, 8, 9. Thêm cho đều: mục 3 "Cú pháp" và mục 5 "Lỗi hay gặp" thành tiêu đề riêng (nhiều bài đã có lỗi trong `## Ví dụ` dạng `-- ERROR:`: tách ra), mục 6 khi có khác biệt. Nâng theo thứ tự lát (§4), không viết lại cả loạt.
- **Nút `adv`:** đã đủ dài; chỉ thêm mục 3, 5, 8 khi thiếu. `adv.yml` đang 46/50 KB: tách mỗi nút ra file riêng cùng lúc với General (cùng cơ chế chunk mỗi bài).

### 2.4 Độ sâu điều hướng (cho UI/UX)

Tối đa **4 tầng trang + 1 tầng mục trong trang**:

| Tầng | General (SQL) | Engine | Ghi chú |
|---|---|---|---|
| 1 Khu | `#/learn` | `#/engine` | có sẵn |
| 2 Track | track trên `#/learn` (SQL Phần 1–12 · Nâng cao) | engine `#/engine/<engine>` (+ thẻ thứ tư nếu Q3 chọn) | |
| 3 Mô-đun / cấp | `#/learn/sql/<n>` (Phần n) | `#/engine/<engine>/<L>` (các mô-đun là nhóm trên trang cấp) | General: Phần n **không còn** = chương Logistics (§3.1) |
| 4 Bài | `#/learn/skill/<id>`, `#/learn/adv/<node>` | `#/engine/<engine>/<L>/<id>` | |
| 5 Mục trong bài | 9 mục §2.2 | 9 mục §2.2 | **không** dùng `#anchor`: router giữ hash. Mục lục trong trang = nút cuộn (`scrollIntoView`), mục hiện tại đánh dấu bằng `aria-current`; nếu cần link sâu tới một mục, phải thêm cú pháp vào `src/route.ts` (vd. `…/<id>/examples`); chưa cần ở lát đầu |

Một bài dài trên điện thoại: mục 4–5–6 có thể thu gọn (`<details>`), mục 7 (thực hành) luôn mở. Tiến độ đọc **không lưu** (không cần Save); "xong bài" vẫn là luật hiện tại (drill/lab/quiz đạt).

Nhãn trung thực trên mỗi ví dụ/mục: "Chạy thật · PostgreSQL 18.6 (PGlite)", "Chạy bằng mingo", "Chạy bằng dynoxide", "Không chạy trong trình duyệt · theo tài liệu MySQL 8.4 / SQLite" (mục 6 và bài so sánh hệ). Không dùng "sắp có".

Bài có thanh hiệu năng (§1.6) cần chỗ hiện **hai con số chi phí** (bài của bạn / lời giải) và nút kế hoạch gây chậm; dùng lại cây kế hoạch của predict "Xem thật" (`enginePredict`).

---


## 1. Lộ trình đích

### 1.0 Hình dạng (đếm)

| Khu / track | Hôm nay | Đích | Ghi chú |
|---|---|---|---|
| General · SQL | 11 Phần (= chương Logistics), 38 kỹ năng, 152 drill | **12 Phần**, **43 kỹ năng** (+5), 172 drill kỹ năng (+20), 1 Phần đọc so sánh hệ (4 nút, 16 drill) | thứ tự theo tutorial SQL (§1.1) |
| General · Nâng cao | 28 nút (20 có bài) | 29 nút (+`a11` lấy mẫu ngẫu nhiên) | giữ nguyên thứ tự a → d |
| Engine · PostgreSQL | 80 bài (L1 12, L2 17, L3 18, L4 16, L5 17) | **92** (L1 +5, L2 +7) | thứ tự mô-đun L1–L2 theo tutorial PostgreSQL; L3–L5 giữ thang tầng hệ thống (pedagogy P6) |
| Engine · MongoDB | 65 (+ Lộ trình NoSQL 12 phần, 168 drill) | **67** (+2) | thứ tự đã khớp tutorial |
| Engine · DynamoDB | 55 | **57** (+2) | thứ tự đã khớp tutorial |
| Thiết kế và lý thuyết CSDL | 0 | **25** (5 cấp) | theo tutorial DBMS; nơi đặt là Q3 |
| **Tổng bài** | 38 kỹ năng + 20 nút có bài + 200 bài Engine | 43 + 25 nút có bài + 241 bài Engine | |

Bảy tutorial trong phạm vi (gap map): SQL 122 chương, PostgreSQL 90, MySQL 186, SQLite 54, MongoDB 61, DynamoDB 38, DBMS 91. Mỗi dòng bên dưới ghi các điểm route (số chương trong gap map, dạng `sql#27`) mà bài phủ.

Luật đọc cột "Id": id có sẵn = **giữ** (nội dung lớn lên theo §2); `mới` = id mới, cộng thêm; không id nào bị đổi tên hay xóa (§3.2).

### 1.1 General · SQL (theo tutorial SQL, đọc trước, ghi sau)

Tutorial SQL đi: Cơ bản → Database → Table (DDL) → Queries (CRUD) → Views → Toán tử và mệnh đề → Joins → Keys → Indexes → Nâng cao → Hàm. BoonData dạy người phân tích dữ liệu nên **giữ "đọc trước"** (quyết định của gap map, A1): DDL/CRUD về General ở Phần 9 (ghi dữ liệu), còn Database/Table/Keys/Views thuộc Engine PostgreSQL L1 (§1.3). Bên trong phần đọc, thứ tự theo đúng mục "Operators and Clauses" của tutorial: WHERE/TOP/DISTINCT/ORDER → GROUP BY/HAVING → LIKE/IN/CASE/NULL → (Joins) → ANY/ALL/EXISTS → UNION/INTERSECT/EXCEPT. Chỗ lệch: tập hợp (UNION…) đặt **sau** Joins và CTE vì 4 drill `full_join` dùng CTE (đã kiểm bằng script trên `sql.yml`). Có nên theo tutorial tuyệt đối (DDL/CRUD trước SELECT) là Q2.

| Phần | Tên | Kỹ năng (id; "từ n" = Phần cũ) | Điểm route chính | Ghi chú |
|---|---|---|---|---|
| 1 | Đọc bảng | `select`, `where`, `order_by`, `limit` | sql#3–10 (tổng quan, cú pháp, kiểu, toán tử, biểu thức, chú thích), sql#28, 38, 39, 41, 44, 51, 52, 56, 61; pg#4, 6, 7, 15, 21, 22, 26, 29 | bài `select` mở bằng "bảng, dòng, cột, khóa" (sql#4–5 RDBMS concepts) |
| 2 | Gộp và nhóm | `aggregate`, `group_by`, `having`, `distinct` (từ 6) | sql#40, 42, 43, 89, 103, 108, 111; pg#23–25, 45–48 | |
| 3 | Chữ, ngày và kiểu | `pattern_match` (từ 6), `string_fn` (từ 6), `cast` (từ 6), `date_math` (từ 4), `date_bucket` (từ 4) | sql#7, 45, 46, 85, 86, 100, 106, 107, 109, 110, 112, 115, 116; pg#5, 27, 50–53, 84 | `cast` dạy cả "chọn kiểu đúng" (§1.6) |
| 4 | Điều kiện và NULL | `null_logic` (từ 4), `coalesce` (từ 5), `case_when` (từ 5), `conditional_agg` (từ 5) | sql#50, 53–55, 90, 94; pg#77 | |
| 5 | Nối bảng | `join`, `multi_join`, `left_join` (+ RIGHT JOIN), `cross_join` **mới**, `self_join` (từ 5), `anti_join` | sql#62–68, 71, 72; pg#34; mysql#91–93 | `cross_join` = A3 gap map (lưới lịch × cửa hàng) |
| 6 | Truy vấn con | `scalar_subquery`, `in_subquery`, `any_all` **mới**, `exists`, `correlated_value` (từ 7) | sql#47–49, 96, 104; pg#62–64, 67–69, 81; mysql#77 | `any_all` = A2 |
| 7 | CTE và dòng mới nhất | `cte`, `multi_cte`, `distinct_on` (từ 8) | sql#97, 102; pg#28 | |
| 8 | Gộp tập hợp | `union`, `except` (+ INTERSECT), `full_join` (từ 9) | sql#57–60, 67; pg#60, 61, 65, 66 | nhãn `except` đổi thành "EXCEPT / INTERSECT" |
| 9 | Ghi dữ liệu | `insert_select` **mới** (INSERT … SELECT, RETURNING, CREATE TABLE AS), `update_join` **mới** (UPDATE … FROM, DELETE … USING, xóa trùng), `upsert` **mới** (ON CONFLICT, MERGE) | sql#27, 29–32, 69, 70; pg#17–19, 31; mysql#48–55, 96, 97, 157, 176; sqlite#12, 18, 19; dbms#53 | = A1 gap map; cần bộ chấm "ghi rồi đọc" (§3.4) |
| 10 | Hàm cửa sổ | `window_rank`, `window_lag`, `window_agg` (từ 10) | (không có trong tutorial SQL; sql-core §9) | giữ vì là kỹ năng DA |
| 11 | Index và hiệu năng | `explain_read`, `sargable`, `index_design` (từ 11) | sql#78–84, 105; pg#79 | Phần có thanh hiệu năng dày nhất (§1.6) |
| 12 | SQL ở hệ khác | nút `p1` Cú pháp và lệnh catalog (TOP/LIMIT, backtick, SHOW/DESCRIBE/PRAGMA ↔ `information_schema`), `p2` Kiểu, NULL và so sánh (IFNULL, GROUP BY trống cột, collation, GLOB), `p3` DDL, tự tăng, upsert khác nhau (AUTO_INCREMENT, INSERT IGNORE, REPLACE, ON DUPLICATE KEY), `p4` Giao dịch và isolation khác nhau | các chương cú pháp MySQL/SQLite, sql#39, 83–84 (clustered); mysql 186 → phần "covered" qua `mysql-sqlite-differences.md` | = A5; bài đọc **không chạy** (nhãn), 4 drill/nút **chạy trên PGlite**: sửa thói quen MySQL/T-SQL thành Postgres |

Kiểm thứ tự tiên quyết (script trên `sql.yml` + `lessons.yml`, 2026-11-23): với bảng trên, chỉ **5 drill** dùng cấu trúc của Phần sau: `g-date-math-4` (JOIN), `g-coalesce-1` (JOIN), `g-string-fn-2` (IS NULL), `g-distinct-3` (JOIN), `g-cast-2` (JOIN). Viết lại lời giải/đề, **giữ id** (người đã qua drill vẫn được tính). Không bài nhanh nào vi phạm.

Nâng cao: giữ `a1`–`a10`, `b1`–`b7`, `c1`–`c3`, `d1`–`d8`; thêm `a11` "Lấy mẫu ngẫu nhiên" (`ORDER BY random() LIMIT`, `TABLESAMPLE`; chấm hình dạng, không chấm dòng; mysql#177) = A4. Nút `a10` (hiệu năng sâu) link sang Engine PG L2/L4.

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
| `capstone-l1` | `e-pg-l1-12` (thêm một bước ALTER + upsert) | |

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
| **`e-dy-l2-13` mới** (lab) | "Đếm và cộng mà không Scan": bộ đếm, tổng duy trì bằng Streams, giá của `Select: COUNT` (C4) | dynamodb#23 |
| **`e-dy-l5-08` mới** (concept, `runtime: docs`) | "IAM, lỗi, giám sát, xóa bảng": LeadingKeys, thử lại có backoff, throttle CloudWatch, Contributor Insights, deletion protection (C5) | dynamodb#10, 24, 25, 30, 33, 34 |

Năm lab gỡ lầm tưởng trên `wip/v25-nosql-content` (DY2, DY4, DY6, MG1, MG2) chưa tính vào số trên; gộp theo roadmap v25/v26. Lộ trình NoSQL (`#/engine/mongodb/path`) giữ nguyên, là track luyện tập kiểu General cho Mongo.

### 1.5 Thiết kế và lý thuyết CSDL (25 bài, theo tutorial DBMS)

Không có chỗ cho nội dung này hôm nay (dbms: 31 missing, 32 partial). Đề xuất là **thẻ engine thứ tư "Thiết kế CSDL"** (id `e-ds-l<n>-NN`, labs chạy trên `pgScriptRunner` như Postgres có `setup`) vì dùng lại nguyên khuôn bài Engine. Roadmap §4.1 luật 4 cấm "engine mới", nên đây là Q3; phương án thay thế ở §3.3.

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

Kiểm kê chi tiết bảng/kiểu/khóa/index của mọi schema là việc của `docs/team/schema-perf-v24.md` (agent khác, cùng worktree; **chưa có** lúc viết bản này). Mục này chỉ chốt phần Product: người học gặp dữ liệu gì, bài nào dựa vào lựa chọn kiểu/index, và chấm "chậm" thế nào.

#### a. Mô hình dữ liệu luyện tập theo track

| Track | Dữ liệu người học gặp | Hôm nay (đọc từ nguồn) | Đích (Product) |
|---|---|---|---|
| General SQL (Phần 1–11, Nâng cao) | schema `lab` (`src/db/lab.sql`): chuỗi cửa hàng, ~15k dòng, 16 bảng | khóa `id int PRIMARY KEY` **gán tay** (không identity), thời điểm `timestamp` (không múi giờ), trạng thái/kênh là `text` không CHECK, tiền `int`/`bigint` VND, `props jsonb`; 3 index phụ (`orders(customer_id)`, `orders(order_date)`, `app_events(user_id, ts)`); `payments.order_id` không FK là **cố ý** (bài chất lượng dữ liệu) | mọi bảng có khóa chính đúng nghĩa (`bigint`/`int GENERATED BY DEFAULT AS IDENTITY`, giữ giá trị literal nên kết quả không đổi), cột trạng thái có CHECK, khóa ngoại hay join có index; chỗ "sai cố ý" ghi trong đầu file như hook hiện nay. Đổi `timestamp` → `timestamptz` đổi cách hiện giá trị: chỉ làm nếu schema-perf chứng minh mọi drill vẫn ra kết quả cũ (Q6) |
| General Phần 9 (ghi) và Phần 11 (hiệu năng) | như trên, **cộng** một bảng lớn hơn cho bài hiệu năng | bảng lớn nhất ~vài nghìn dòng; 12 drill `plan:` đã chấm đọc qua index trên `orders`/`app_events` | thêm một bảng sự kiện ≥ 50k dòng ở cuối `lab.sql` (khối mới, `setseed` riêng, rồi `ANALYZE`) để thanh chi phí có ý nghĩa; ghi dữ liệu chỉ trên các bảng **không** có thanh hiệu năng (§3.4) |
| Engine PostgreSQL | `setup` riêng mỗi bài, DB mới mỗi lần chạy (`pgScriptRunner`); bài không `setup` chạy trên `lab` | kiểu do từng bài chọn; L1 01–03 dạy chọn kiểu | luật nội dung: mọi bảng trong `setup` có khóa chính và kiểu đúng, trừ khi bài **dạy** cái sai (khi đó bài ghi rõ "bảng này sai cố ý"); `setup` của bài có thanh hiệu năng kết thúc bằng `ANALYZE` |
| Engine MongoDB | dataset `shop`, `path`, collections inline | `_id` ObjectId/sinh lại mỗi lần chạy | giữ; kiểu ngày `{"$date"}` đúng kiểu, không chuỗi (bài `e-mg-l1-01` nói vì sao) |
| Engine DynamoDB | `setup { tables, items }` | khóa thiết kế theo mẫu truy cập | giữ; đây là chỗ "khóa sai = Scan" (§b) |
| Thiết kế CSDL | `setup` mỗi bài | — | chính track này dạy chọn khóa/kiểu (L1–L4) |
| Domain (ngoài phạm vi) | Logistics/E-com/Finance | ch11 Logistics đã chấm kế hoạch | theo `schema-perf-v24.md`; route này chỉ link chip "Đào sâu" tới các bài dưới |

Bài dựa vào lựa chọn kiểu/index (phải giữ đúng khi schema đổi; danh sách cho schema-perf kiểm):

- General: `cast` (so `int` với chữ, ép kiểu làm mất index), `date_math`/`date_bucket` (so khoảng ngày thay vì hàm trên cột), `sargable`, `index_design`, `explain_read` (12 drill `plan:`), `anti_join`/`exists` (NOT IN gặp NULL), `distinct` (DISTINCT che join nhân dòng), `correlated_value` và `distinct_on` (dòng mới nhất), Phần 9 (ON CONFLICT cần UNIQUE), nút `a10`, `c1`.
- Engine PG: L1 01–03, 09–11, mới 13, 16, 17; L2 01–17 (index), L3 03 (TOAST), 08 (fillfactor), L4 01–08, L5 01–07, 16, 17; mọi capstone.
- Engine Dynamo: L1 02, 08–10; L2 02, 09, 10; L3 toàn cấp; L4 01–05. Mongo: L3 01–17 (index, ESR, covered).

#### b. Chấm "đúng mà chậm"

Nguyên tắc: **không bao giờ dùng mili giây** (thời gian WASM dao động; luật ch11, `src/planCheck.ts`). Chậm được đo bằng thứ tất định:

| Engine | Đo bằng | Có sẵn | Thêm |
|---|---|---|---|
| PostgreSQL (General drill, Engine lab) | `EXPLAIN (FORMAT JSON)` không ANALYZE: loại nút và `Total Cost` gốc, chạy **cùng DB, cùng request** với lời giải | drill `plan: { index: t }` (12 drill); ch11 `lab: { table, ddl, max_cost_ratio }`; Engine `check: plan` (cùng dạng kế hoạch + cùng dòng) | trường `perf: { max_ratio: 1.5, no_seq_scan?: t }` cho drill và bước lab: kết quả đúng **và** cost(bài) ≤ max_ratio × cost(lời giải). Một kiểm, một luật cho cả hai khu |
| DynamoDB | `ScannedCount`, `ConsumedCapacity` thật của dynoxide | `noScan`, `maxScanned`, `maxRcu` (hôm nay chỉ làm câu trả lời "yếu") | bước có `perf` thì vượt ngưỡng = **chưa đạt** (đổi từ yếu sang chặn) |
| MongoDB | mingo **không** có index hay explain | luật: `grade: esr`, `covered`, `match-first`; explain ghi sẵn có nhãn | thanh = luật (thứ tự khóa ESR, `$match` trước `$lookup/$unwind`, chỉ chiếu cột trong index), nhãn "Chấm theo quy tắc, không đo trên MongoDB thật"; không hứa con số |

Người học thấy (chặn, nhưng dạy):

- "Đúng kết quả, nhưng chậm: chi phí 1,240 so với lời giải 38 (gấp 33 lần). Nút tốn nhất: Seq Scan trên `events`." + cây kế hoạch (dùng lại `enginePredict`), + gợi ý trỏ về mục "Lỗi hay gặp" của bài.
- Không vào `completed`, không XP, không tính lượt nộp sai cho drill (người học đã đúng logic); bước capstone không qua.
- Drill đã qua trước khi có thanh: **giữ** trong `completed` (không chấm lại quá khứ).

Ai có thanh (mỗi chỗ phải có ≥ 1 câu "đúng nhưng chậm" trong nội dung, trường `slow:`, mà test chứng minh **trượt**, và lời giải **qua**: như `tests/planCheck.test.ts`):

| Chỗ | Bài / drill | Câu chậm điển hình |
|---|---|---|
| General Phần 3 | `cast` drill trap/review | `WHERE id::text = '42'`, so cột `int` với chuỗi |
| General Phần 3 | `date_math`, `date_bucket` 1 drill mỗi kỹ năng | `WHERE date_trunc('month', order_date) = …` thay cho khoảng ngày |
| General Phần 2, 5, 6, 7 | `distinct`, `correlated_value`, `distinct_on`, `exists` 1 drill mỗi kỹ năng | DISTINCT sau join nhân dòng; subquery tương quan theo từng dòng; NOT IN thay NOT EXISTS |
| General Phần 11 | 12 drill `plan:` có sẵn + `perf` | hàm trên cột, OR thay IN, index sai thứ tự cột |
| Engine PG | L1 09–11, **13** (đổi kiểu), **17** (kiểu sai); L2 index labs; L4 01–08; capstone L1–L5 mỗi bài ≥ 1 bước | |
| Engine Dynamo | L1 08–10, L2 02, L3 03–06, capstone L1–L4 | Scan + filter thay Query; GSI sai khóa |
| Engine Mongo | L3 05, 08, 09, 12, capstone L2 | thứ tự khóa sai ESR; `$lookup` trước `$match` |

Bảng nhỏ: planner có thể chọn Seq Scan bất kể index. Thanh chỉ đặt trên bảng mà test chứng minh lời giải đọc qua index và câu chậm trượt; nếu không chứng minh được thì bài không có thanh.

---

## 3. Kế hoạch chuyển đổi

### 3.1 Ràng buộc kỹ thuật quyết định cách chuyển

1. **Phần của General = chương Logistics.** `skills.yml` `chapter:` vừa là chương ticket grant kỹ năng (mỗi kỹ năng đúng một ticket), vừa là "Phần n" (`moduleTitle` đọc `chapters.yml` `module:`), vừa là đơn vị của `placementItems` và `#/learn/sql/<n>`. Đổi `chapter:` sẽ đổi domain (ngoài phạm vi). → Thêm **một file thứ tự riêng cho General**: `content/general/route.yml` (`- { n, title {vi,en}, skills: [...], nodes: [...] }`), là nguồn duy nhất cho Phần trên `#/learn`, kiểm tra đầu vào và danh sách Luyện SQL. `skills.yml` `chapter:` giữ nghĩa domain. Link "Phần n" từ dòng chương Logistics (`ui/homeView.ts`) đổi thành link tới trang kỹ năng đầu tiên của chương.
2. **Kỹ năng mới không có ticket domain.** `tests/noDeadEnds.test.ts` đòi mỗi kỹ năng có "một chương dùng nó"; Lily lớn theo `knownSkills` của Logistics (`STAGE_AT`, giai đoạn 5 = "25+ hoặc mọi kỹ năng"); chứng chỉ General = "mọi kỹ năng trong `skills.yml`". → 5 kỹ năng mới vào **file riêng** `content/general/skills-general.yml` (cùng khuôn), không vào `skills.yml`: Lily, chứng chỉ, domain không đổi; luật noDeadEnds thêm nhánh "kỹ năng chỉ General: có bài + 4 drill + một Phần". Người đã có chứng chỉ General **giữ** nó (chứng chỉ vẫn tính 38 kỹ năng nền); 5 kỹ năng mới hiện thành dòng "Mở rộng" trên `#/me` (Q4).
3. **Id đóng.** `DRILL_ID = /^g-[a-z0-9-]+$/` nhận mọi drill mới (`g-cross-join-1`, `g-p1-1`, `g-a11-1`). `ENGINE_ID = /^e-(pg|mg|dy)-…/` không nhận `e-ds-`: track thiết kế cần sửa regex + `EngineId` + route + thẻ (nếu Q3 = có).
4. **Ngân sách.** `lessons` 35 KB (thẻ nhanh, giữ), `generalAdv` 46/50, `engineLesson` 8 KB mỗi file. Bài đầy đủ General và nút `adv` chuyển sang **một chunk mỗi bài** (cùng cơ chế `?fm` + check-budget `'each'`), nên độ dài §2.2 không đẩy chunk nào quá 8 KB gz; bài Engine dài hơn 8 KB thì tách phần "Ở hệ khác"/ví dụ phụ ra file kèm.
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
| 28 nút `a1`…`d8` | giữ, thêm `a11`, `p1`–`p4` | |
| 200 bài Engine | giữ id; `module:` đổi ở PG L1 (`ddl`, `write`, `schemas`), bài `e-pg-l1-06`, `e-mg-l1-01` mở rộng | |
| `#/learn/sql/<n>` đã đánh dấu | trỏ Phần n **mới** (nội dung khác) | chấp nhận; route nhớ chỉ lưu id trang, không lưu n |
| Chứng chỉ General | giữ (38 kỹ năng) | |

### 3.3 Gộp và bỏ

- **Gộp:** B6 vào `e-pg-l1-06`; C1 vào `e-mg-l1-01`; INTERSECT vào `except`; RIGHT JOIN vào `left_join`; DELETE … USING và xóa trùng vào `update_join`; CREATE TABLE AS / SELECT INTO vào `insert_select` (General) và `e-pg-l1-14` (Engine); "Delete table" Dynamo vào C5.
- **Không làm thành bài riêng:** A4 (lấy mẫu) thành nút `a11` thay vì kỹ năng; MySQL/SQLite thành Phần 12 đọc + mục 6 trong từng bài, **không** có runtime MySQL/SQLite.
- **Bỏ khỏi route (n/a, giữ như gap map):** cài đặt, môi trường, GUI, driver (Java/PHP/Perl/Python/C), hosting RDS, 29 sản phẩm khác, tính năng đã bỏ (map-reduce, Data Pipeline).
- **Phương án nếu Q3 = không có engine thứ tư:** track thiết kế thành nhóm nút `e1`–`e5` trong Nâng cao (drill `g-e1-…`), bài lý thuyết là `quiz`; lab chuẩn hóa cần DDL nên phải chạy trên runner DB mới (`pgScriptRunner`) → cần cầu nối drill ↔ runner, tốn hơn sửa `ENGINE_ID`.
- **Không có ngõ cụt:** `tests/noDeadEnds.test.ts` mở rộng: mọi Phần trong `route.yml` có ≥ 1 kỹ năng/nút; mọi kỹ năng chỉ-General có bài đầy đủ + 4 drill; mọi bài `runtime: docs` có quiz để xong; không chữ "sắp có"/"later".

### 3.4 Hạ tầng cần (code, ghi để ước lượng; tài liệu này không làm)

| Việc | Ở đâu | Cho lát |
|---|---|---|
| `content/general/route.yml` + đọc Phần từ đó (`learnView`, `placementItems`, `#/learn/sql/<n>`) | `src/learn.ts`, `ui/learnView.ts`, `progress.ts` | R0 |
| `skills-general.yml` + luật noDeadEnds/i18n/icons cho kỹ năng chỉ-General | `src/general.ts`, tests | R0 |
| Bài đầy đủ General/nút: file `.md` mỗi bài, chunk mỗi bài, test giải phẫu (đủ 9 mục, ≥ 3 ví dụ chạy, ≥ 2 bẫy chạy, ≥ 2 câu hỏi) | `src/generalLessonSources.ts`, `tests/` | R0 |
| `perf:` cho drill và bước lab Postgres (một hàm trong `planCheck.ts`), trường `slow:` + test | `src/planCheck.ts`, `work.ts`, `engine/pglab` | R0 |
| Dynamo `noScan`/`maxScanned`/`maxRcu` chặn khi bước có `perf` | `src/engine/dynamo/grade.ts` | R5 |
| Drill ghi: chạy câu của người học rồi câu `after:` (đọc bảng) trong cùng `BEGIN … ROLLBACK`, so với lời giải theo cùng cách; chỉ ghi lên bảng không có thanh hiệu năng | `src/db/run.ts`, `src/grader.ts`, `src/general.ts` | R2 |
| `ENGINE_ID`/`EngineId` thêm `ds` (nếu Q3) | `src/save.ts`, `src/engine/*`, `src/route.ts` | R4 |
| Kiểu/khóa/index của `lab` + bảng lớn | `src/db/lab.sql` (theo `schema-perf-v24.md`) | R0b |

---

## 4. Lát phát hành và tiêu chí thoát

Đánh số R0…R6 (route slice). Mỗi lát phát hành được một mình; thứ tự theo giá trị cho người học và phụ thuộc. Ghép vào version nào (thay roadmap v24–v30, xen kẽ, hay sau v30) là Q1.

| Lát | Nội dung | Phụ thuộc |
|---|---|---|
| **R0** Hạ tầng route | `route.yml` (thứ tự Phần mới, 5 drill viết lại), `skills-general.yml` (rỗng), chunk bài đầy đủ + test giải phẫu, `perf:` + `slow:` cho Postgres | — |
| **R0b** Dữ liệu `lab` | khóa/kiểu/CHECK/index theo `schema-perf-v24.md`, bảng sự kiện ≥ 50k, `ANALYZE` | R0 (test `perf`) |
| **R1** SQL Phần 1–8 đầy đủ | 34 bài đầy đủ (gồm `cross_join`, `any_all` mới + 8 drill), thanh hiệu năng Phần 2–7 | R0, R0b |
| **R2** Ghi dữ liệu + Phần 10–11 | Phần 9 (3 kỹ năng, 12 drill, bộ chấm ghi-rồi-đọc), 6 bài đầy đủ Phần 10–11 (9 bài đầy đủ trong lát), thanh Phần 11 | R1 |
| **R3** PostgreSQL L1–L2 theo tutorial | 12 bài mới (L1 13–17, L2 18–24), mở rộng `e-pg-l1-06`, giải phẫu §2.2 cho 41 bài L1–L2, thanh hiệu năng L1–L2 | R0 |
| **R4** SQL ở hệ khác + thiết kế CSDL | Phần 12 (`p1`–`p4`, 16 drill), `a11`, mục "Ở hệ khác" trong các bài đã đầy đủ; track thiết kế 25 bài (hoặc nhóm nút, theo Q3) | R1, R3 |
| **R5** MongoDB/DynamoDB lấp lỗ | 4 bài mới + `e-mg-l1-01` mở rộng, Dynamo `perf` chặn, thanh luật Mongo; nên đi cùng roadmap v25/v26 | R0 |
| **R6** Giải phẫu L3–L5 | 51 bài PG + Mongo/Dynamo L3–L5 tách "Cú pháp"/"Lỗi hay gặp"; thanh hiệu năng mọi capstone | R3, R5 |

Tiêu chí thoát (mỗi dòng là một lệnh hoặc một con số; cộng thêm cổng chung của mọi version: `tsc` 0 lỗi, `npm test`, build, `check-budget`, smoke, `ux-audit` 0 serious, e2e phần liên quan, `review-<lát>.md`):

| Lát | Thoát khi |
|---|---|
| R0 | `route.yml` có 11 Phần kỹ năng; test thứ tự tiên quyết: 0 drill/bài dùng cấu trúc của Phần sau (script §1.1 thành test); mọi id trong Save fixture v1–v5 vẫn đọc được, `knownSkills` của `save-v5.json` không đổi; ≥ 1 drill có `perf` + `slow:` trượt/qua trong test |
| R0b | md5 `lab` ghim lại; **0** thay đổi kết quả của 172 lời giải drill + 38 bài nhanh + 20 nút (so trước/sau); 12 drill `plan:` vẫn qua; seed `lab` trong Node ≤ 1.5× hiện tại |
| R1 | 34/34 bài Phần 1–8 qua test giải phẫu; ≥ 102 ví dụ chạy ra dòng; mỗi thanh hiệu năng có câu `slow:` trượt; gap map chạy lại: sql "partial/missing" của Phần 1–8 (sql#48, 64–66, 71) = 0 |
| R2 | 12 drill ghi qua trên lời giải, trượt trên `wrong:`; sau 50 drill ghi liên tiếp, mọi drill `perf` vẫn qua (thử bằng test một phiên); gap map: sql#27, 29–32, 69, 70 và pg#17–19, 31 = covered |
| R3 | e2e `E2E_ONLY=engine` giải mọi bài L1–L2 bằng lời giải; gap map pg missing = 0 (pg#32, 75, 76, 78, 85, 86) và pg partial "Role & Permission"/"Functions" = 0; mysql triggers/procedures (mysql#104–113, 160–163, 171) = covered |
| R4 | gap map dbms missing 31 → 0, partial 32 → ≤ 8 (chỉ link sang PG L3–L5); mysql missing ≤ 1; mỗi mục "Ở hệ khác" có nguồn chính thức và nhãn không chạy |
| R5 | gap map mongodb missing 2 → 0, dynamodb partial 7 → ≤ 2; mỗi bước Dynamo có `perf` trượt với câu Scan tương ứng |
| R6 | 100% bài Engine qua test giải phẫu (tập con theo `kind`); mỗi capstone có ≥ 1 bước thanh hiệu năng với câu `slow:` trượt |

Chỉ số theo dõi sau phát hành (pref `cargo-query/attempts`, chỉ mã và số đếm): tỉ lệ người mở một Phần mới đi tới drill đầu tiên; số lần "đúng mà chậm" trước khi qua (nếu > 3 ở cùng drill thì bài chưa dạy đủ mục 5); không thêm telemetry gửi đi.

---

## 5. Câu hỏi cho user

| # | Câu hỏi | Khuyến nghị | Nếu không trả lời |
|---|---|---|---|
| Q1 | Lộ trình này **thay** kế hoạch v24–v30 (Best Practice, Mongo/Dynamo đủ, thuật ngữ, so sánh), **xen kẽ** (mỗi version một lát R), hay làm **sau v30**? `wip/v24-best` đang chờ gộp | Xen kẽ: v24 = Best Practice (gần xong) + R0; v25 = R1 + R5 phần Mongo; … | Xen kẽ |
| Q2 | Thứ tự General theo tutorial **tuyệt đối** (tạo bảng, INSERT/UPDATE/DELETE trước SELECT) hay **đọc trước, ghi sau** như §1.1? | Đọc trước: người học DA cần SELECT ngay, và drill ghi cần bộ chấm mới | Đọc trước |
| Q3 | Thiết kế và lý thuyết CSDL là **thẻ engine thứ tư** (`e-ds-`, phá luật "không engine mới" của roadmap) hay **nhóm nút Nâng cao**? | Thẻ thứ tư | Nhóm nút Nâng cao (giữ luật roadmap) |
| Q4 | 5 kỹ năng SQL mới có tính vào chứng chỉ General không? (Tính = người đã có chứng chỉ thấy nó "chưa đủ" tới khi học thêm) | Không: chứng chỉ giữ 38 kỹ năng nền, thêm dòng "Mở rộng" | Không |
| Q5 | "Đúng mà chậm" chặn **mọi** drill có thanh, hay chỉ ở Phần 11 / Engine, còn Phần 2–7 chỉ nhắc (không chặn)? | Chặn mọi chỗ có thanh (đúng lời user), nhưng chỉ đặt thanh nơi test chứng minh được | Chặn mọi chỗ có thanh |
| Q6 | Đổi `timestamp` → `timestamptz` trong `lab` (đúng kiểu hơn, nhưng đổi cách hiện giá trị và có thể đổi kết quả drill)? | Chờ `schema-perf-v24.md` đo; chỉ đổi nếu 0 kết quả drill đổi | Không đổi |
| Q7 | MySQL/SQLite chỉ ở dạng đọc (không runtime) có đủ, hay muốn chạy thật SQLite (sql.js/wasm, ~1 MB, ngân sách mới)? | Chỉ đọc + drill sửa thói quen trên PGlite | Chỉ đọc |
