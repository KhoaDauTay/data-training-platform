# Product route v24: lộ trình học theo tutorial (General/SQL + Database Engine)

Người viết: Product Designer. Ngày 2026-11-23. Nhánh `design-v24` (từ `main` @ `74e339f`). **Chỉ tài liệu**, không đổi code hay nội dung.

Phạm vi: Lộ trình học (General: `content/skills.yml`, `content/lessons.yml`, `content/general/sql.yml`, `adv.yml`) và khu Database Engine (`content/engine/**`). Ba domain (Logistics, E-com, Finance) **ngoài phạm vi**, trừ chỗ chúng bị ràng buộc kỹ thuật với General (§3.1).

Đầu vào: `docs/knowledge/database/` (README, `tutorial-routes.md`, `boondata-gap-map.md`, các file kiến thức), `roadmap-v23-v30-revised.md`, `handoff-2026-11-20.md`, `review-v23.md`, `product-design-db-engine.md`, `engine-pedagogy.md`, `best-practice-catalogue.md`, và kiểm kê nội dung trên `main`.

Người đọc song song: UI/UX designer (`docs/team/ux-route-v24.md`) cần §2 (giải phẫu bài, độ sâu điều hướng). §2 được viết và commit trước.

**Lưu ý đóng băng.** User đã dừng ở v23 (2026-11-20). Tài liệu này là đề xuất; số version ở §4 là "lát R1, R2…" (route slice), không chiếm số v24–v30 đã gán trong roadmap. Ghép lát vào version nào là câu hỏi Q1 (§6).

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
| 2 Track | track trên `#/learn` (SQL · Nâng cao · SQL ở hệ khác) | engine `#/engine/<engine>` (+ thẻ thứ tư nếu Q3 chọn) | |
| 3 Mô-đun / cấp | `#/learn/sql/<n>` (Phần n) | `#/engine/<engine>/<L>` (các mô-đun là nhóm trên trang cấp) | General: Phần n **không còn** = chương Logistics (§3.1) |
| 4 Bài | `#/learn/skill/<id>`, `#/learn/adv/<node>` | `#/engine/<engine>/<L>/<id>` | |
| 5 Mục trong bài | 9 mục §2.2 | 9 mục §2.2 | **không** dùng `#anchor`: router giữ hash. Mục lục trong trang = nút cuộn (`scrollIntoView`), mục hiện tại đánh dấu bằng `aria-current`; nếu cần link sâu, thêm query cuối route (vd. `…/<id>?s=examples`), router bỏ qua tham số lạ |

Một bài dài trên điện thoại: mục 4–5–6 có thể thu gọn (`<details>`), mục 7 (thực hành) luôn mở. Tiến độ đọc **không lưu** (không cần Save); "xong bài" vẫn là luật hiện tại (drill/lab/quiz đạt).

Nhãn trung thực trên mỗi ví dụ/mục: "Chạy thật · PostgreSQL 18.6 (PGlite)", "Chạy bằng mingo", "Chạy bằng dynoxide", "Không chạy trong trình duyệt · theo tài liệu MySQL 8.4 / SQLite" (mục 6 và bài so sánh hệ). Không dùng "sắp có".

Bài có thanh hiệu năng (§1.6) cần chỗ hiện **hai con số chi phí** (bài của bạn / lời giải) và nút kế hoạch gây chậm; dùng lại cây kế hoạch của predict "Xem thật" (`enginePredict`).

---

## 1. Lộ trình đích

(đang viết)

## 3. Kế hoạch chuyển đổi

(đang viết)

## 4. Lát phát hành và tiêu chí thoát

(đang viết)

## 6. Câu hỏi cho user

(đang viết)
