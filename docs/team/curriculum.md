# Cargo Query: Chương trình học (Curriculum)

Ngày: 2026-11-17 · Vai trò: Product Designer (thiết kế học tập) · Theo **L27** (≥ 10 chương, thiết kế theo hiệu quả học tập), L19/L22 (thăng tiến theo cột mốc), L24/L25 (đề là câu hỏi nghiệp vụ), L29.
Đầu vào: `docs/team/problem-design.md` (nguyên tắc §1 + ngân hàng câu hỏi §4 viết cho bản 7 chương), spec §4–§6, `content/chapters.yml`, `content/skills.yml`, 15 ticket ch1–3, bản nháp 12 chương trong mockup v4, `src/db/seed.sql`.
Tài liệu này **không sửa** `src/`, `content/`, plan hay spec. Quyết định được ghi ở **L30** trong `decision-log.md`.

---

## 0. Chốt nhanh

**12 chương.** Ch1–3 giữ nguyên ticket và kỹ năng. Ch4–12 mỗi chương 6 ticket. Tổng cộng 15 + 9 × 6 = **69 ticket** và **38 kỹ năng** (11 đang có + 27 mới).

| # | Tiếng Việt | English | Kỹ năng chính | Bậc nghề sau cột mốc |
|---|---|---|---|---|
| 1 | Tuần thử việc | Probation week | SELECT, WHERE, ORDER BY, LIMIT | ★ Junior DA |
| 2 | Báo cáo sản lượng | Volume reports | COUNT/SUM/AVG, GROUP BY, HAVING | Junior DA · phụ trách báo cáo sản lượng |
| 3 | Nối dữ liệu | Joining data | JOIN, nối nhiều bảng, LEFT JOIN, anti-join | ★ Data Analyst |
| 4 | Lịch tàu & thời gian | Schedules and time | phép tính ngày, gom theo kỳ, NULL | DA · phụ trách số liệu Ops |
| 5 | Hải quan & phân loại | Customs and classification | CASE, đếm có điều kiện, COALESCE, tự nối bảng | DA · phụ trách số liệu Hải quan |
| 6 | Làm sạch dữ liệu | Cleaning the data | hàm chuỗi, LIKE/ILIKE, ép kiểu, DISTINCT | ★ Senior DA |
| 7 | Báo giá & so sánh | Quotes and comparisons | truy vấn con: vô hướng, IN, EXISTS, tương quan | Senior DA · phụ trách phân tích giá |
| 8 | Công nợ & tỷ giá | Receivables and exchange rates | CTE, nhiều CTE nối tiếp, DISTINCT ON | Senior DA · phụ trách báo cáo tài chính |
| 9 | Đối soát chứng từ | Document reconciliation | UNION, EXCEPT/INTERSECT, FULL JOIN | ★ Lead DA |
| 10 | Xu hướng & xếp hạng | Trends and rankings | RANK/ROW_NUMBER, LAG/LEAD, SUM OVER | Lead DA · báo cáo điều hành |
| 11 | Truy vấn nhanh hơn | Faster queries | đọc EXPLAIN, viết điều kiện dùng được index, thiết kế index | Lead DA · phụ trách hiệu năng dữ liệu |
| 12 | Điều tra cuối năm | Year-end investigation | tổng hợp, không dạy kỹ năng mới | ★ Trưởng nhóm Phân tích / Head of Analytics |

**Thay đổi so với bản nháp v4:**

1. **NULL chuyển lên ch4.** Bản nháp xếp NULL vào ch5. Câu hỏi đầu tiên về lịch tàu đã đụng ngay "lô chưa có ngày đến thực tế", và người chơi đã gặp `IS NULL` ở anti-join ch3. Nếu dạy NULL sau thì ch4 phải né chính cái bẫy của nó.
2. **Đối soát (UNION/EXCEPT) chuyển từ ch10 lên ch9.** Đổi chỗ với Xu hướng. Phép tập hợp dễ hơn hàm cửa sổ và nối tiếp tự nhiên với anti-join, CTE. Hàm cửa sổ (khó nhất) nằm ở ch10, sát ch12 vốn cần LAG cho câu "giá mua tăng bao nhiêu". Như vậy độ khó tăng dần, và kỹ năng ch12 cần nhiều nhất vẫn còn mới.
3. **Ch8 thêm `DISTINCT ON` (bản ghi mới nhất mỗi nhóm).** Seed sẽ có tỷ giá chỉ vào ngày làm việc (§4, Plan 3), nên "tỷ giá gần nhất trước ngày hóa đơn" là bẫy thật của kế toán. Đây cũng là idiom Postgres dùng hằng ngày.
4. **Ch12 không dạy kỹ năng mới.** Luật cũ "boss không dạy hàm mới" nay áp cho cả chương: chương cuối là ôn xen kẽ có cấu trúc, đúng tinh thần một cuộc điều tra.

---

## 1. Thang nghề (đóng câu hỏi để ngỏ ở `problem-design.md` §5.1)

L19 nói "qua cột mốc chương n → bậc n", nhưng thang v2 chỉ có 5 bậc, và mockup v4 lại đặt Junior DA ở ch2. Chốt như sau:

- **Mỗi cột mốc là một bước nghề.** 12 chương cho 12 bước, khớp L19 và L22.
- **Chức danh (tier) chỉ đổi ở 5 cột mốc ★: ch1, 3, 6, 9, 12.** Các chương còn lại cho một **phạm vi phụ trách mới** (vd "phụ trách số liệu Hải quan"). Ngoài đời, mở rộng trách nhiệm cũng là bước nghề thật, nên không cần bịa 12 chức danh.
- **Chức danh theo tier:** Thực tập sinh DA / DA Intern (lúc bắt đầu) → Junior DA → Data Analyst → Senior DA → Lead DA → Trưởng nhóm Phân tích / Head of Analytics.
- **Khớp với đề đã kiểm của ch1–3:**
  - ch1 "qua thử việc" là lên Junior DA.
  - ch2 "dự án lớn đầu tiên ở vị trí mới" nghĩa là vẫn Junior DA, thêm phạm vi.
  - ch3 "lên một nấc" là lên Data Analyst.
  - Mockup v4 ("ch2 · lên Junior DA") sửa theo bảng này.
- **Dữ liệu:** thêm `career: { vi, en }` (bước nghề) và `tier: true|false` cho mỗi chương trong `chapters.yml`. `rankOf` (Plan 1c Task 4) lấy tier từ cột mốc ★ gần nhất đã qua. Màn Tổng kết chương đọc `career`. Đề ticket vẫn không ghi tên bậc (problem-design §1.6).

---

## 2. Dàn nhân vật theo chương

- Sáu trưởng phòng đã có trong seed (problem-design §1.7) giữ nguyên.
- Từ ch4 thêm **nhân viên cấp Staff**, chọn tên thật từ bảng `employees` khi viết `content/people.yml`. Phân phòng:
  - chứng từ / booking và điều độ vận tải / CFS thuộc Ops,
  - pricing thuộc Sales,
  - kế toán AR và AP thuộc Finance,
  - khai báo viên thuộc Customs.
- **IT** chưa có trong seed. Plan 4 **thêm một nhân viên** (id 41, phòng `IT`, "Trưởng nhóm IT") vào một khối seed mới ở cuối file. Hàng này nằm ngoài mọi Solution ch1–3:
  - ch1-04 chỉ lọc phòng Hải quan,
  - ch3-04 nối khách theo kiểu inner join, nên nhân viên không quản lý khách nào tự rơi khỏi kết quả.

  Plan 4 vẫn phải chạy lại toàn bộ Solution sau khi thêm hàng này. Nếu không muốn đụng seed, phương án thay thế là một persona chỉ có trong `people.yml` (phòng Management, chức danh "IT phụ trách hệ thống").

| Chương | Người hỏi chính |
|---|---|
| 1 | Trưởng phòng Ops (người kèm), Sales, Hải quan, Giám đốc |
| 2 | Kế toán trưởng, Sales, Ops, Giám đốc |
| 3 | CSKH, Sales, Giám đốc |
| 4 | Điều độ vận tải / kho CFS, CSKH, Trưởng phòng Ops, Giám đốc |
| 5 | Khai báo viên hải quan, Trưởng phòng Hải quan, CSKH, Giám đốc |
| 6 | CSKH, Sales, Chứng từ & booking, Kế toán trưởng |
| 7 | Pricing, Sales, Giám đốc |
| 8 | Kế toán AR, Kế toán AP, Kế toán trưởng |
| 9 | Chứng từ & booking (B/L, HBL/MBL), Kế toán AR, Giám đốc |
| 10 | Giám đốc, Sales, Điều độ vận tải, Chứng từ, Kế toán |
| 11 | IT, Trưởng phòng Ops, CSKH, Kế toán |
| 12 | Giám đốc / Hội đồng quản trị, Pricing, Kế toán trưởng, CSKH, Trưởng phòng Ops |

---

## 3. Bảng → chương mở khóa (đủ 25 bảng của spec §4)

Spec ghi "~26"; danh sách thật trong spec §4 là 25 bảng.

| Chương | Bảng mở mới | Ticket đầu tiên cần |
|---|---|---|
| 1 | `ports`, `carriers`, `employees`, `customers`, `shipments` | ch1-01 … ch1-05 (như `CHAPTER_TABLES` hiện tại) |
| 2 | `containers` | ch2-05 |
| 3 | (không có) | |
| 4 | `shipment_events`, `trucking_orders`, `cfs_receipts` | ch4-03, ch4-05, ch4-06 |
| 5 | `customs_declarations`, `hs_codes`, `duties_taxes` | ch5-01, ch5-03 |
| 6 | `incoterms` | ch6-05 |
| 7 | `rate_contracts`, `quotations` | ch7-02, ch7-04 |
| 8 | `charges`, `invoices`, `payments`, `vendor_bills`, `exchange_rates` | ch8-01, ch8-04, ch8-06 |
| 9 | `master_bills`, `house_bills` | ch9-01 |
| 10 | `free_time_terms`, `container_events` | ch10-03, ch10-04 |
| 11 | (không có; dùng lại bảng lớn, thêm index dựng sẵn §6) | |
| 12 | `claims` | ch12-04 |

So với `CHAPTER_TABLES` hiện tại (bản 7 chương), các bảng sau đổi chỗ:

- `customs_declarations`, `hs_codes`, `duties_taxes`: 4 → 5.
- `incoterms`: 6 → 6, giữ nguyên.
- `rate_contracts`, `quotations`: 5 → 7.
- `charges`, `invoices`, `payments`, `vendor_bills`, `exchange_rates`: 5 → 8.
- `master_bills`, `house_bills`: 6 → 9.
- `free_time_terms`, `container_events`: 6 → 10.
- `claims`: 7 → 12.

---

## 4. Từng chương

**Quy ước:**

- **Nhịp ch4–12:** `teach` (ví dụ mẫu) → `develop` (làm cùng, điền chỗ trống) → `develop` (tự làm) → `twist` → `rest` (ôn xen kẽ) → `boss` (cột mốc). `format` là trường mới, xem §5.1.
- Câu hỏi viết theo problem-design §1: không tên cột, không từ khóa SQL, không giá trị mã hóa; ngày tuyệt đối; "hôm nay" là 31/10/2026. Đây mới là **câu một dòng**. Khi viết thành ticket phải bổ sung đủ ràng buộc (lô hủy, phá hòa, làm tròn).
- **Dạy** = `grants`. **Ôn** = kỹ năng chương trước được dùng lại (`requires`).
- Ký hiệu cột Dạng: W = `format: worked` (ví dụ mẫu), F = `faded` (làm cùng), O = `open` (tự làm), Lab = phòng thí nghiệm index (§6).
- Mỗi kỹ năng mới được đúng **một** ticket dạy, trong đúng chương của nó; cột mốc không dạy gì. Kỹ năng của ticket twist nằm trong `requires` của cột mốc cùng chương.

### Ch1–3 (giữ nguyên, đã kiểm)

| Ch | Ticket (`beat` · người hỏi · tiêu đề) | Dạy |
|---|---|---|
| 1 | 01 teach · Ops · Danh mục cảng công ty khai thác · 02 develop · Ops · Cảng biển châu Âu cho buổi họp tuyến · 03 twist · Sales · Năng lực hàng nặng tháng 10 · 04 rest · Hải quan · Xếp ca khai báo mùa cao điểm · 05 boss · GĐ · Đánh giá cuối thử việc: lô đi Rotterdam | `select`, `where`, `order_by`+`limit` |
| 2 | 01 teach · Kế toán trưởng · Số liệu cho báo cáo năm 2025 · 02 develop · Sales · Cơ cấu sản lượng 2025 · 03 twist · Sales · Khách hàng chủ lực 2025 · 04 rest · Ops · Số lô đang trên đường · 05 boss · GĐ · Hồ sơ họp hãng tàu | `aggregate`, `group_by`, `having` |
| 3 | 01 teach · CSKH · Booking mới nhất cần gọi xác nhận · 02 develop · Sales · TEU theo hãng tàu quý 3 · 03 twist · CSKH · Khách lâu không gửi hàng · 04 rest · Sales · Chia lại khách cho team Sales · 05 boss · GĐ · Chuẩn bị gặp khách lớn cuối năm | `join`, `multi_join`, `left_join`+`anti_join` |

- **Không gắn lại `format`** cho ch1–3 (mặc định `open`). Nếu đổi `teach` thành ví dụ mẫu thì nó phải thôi dạy kỹ năng, và như thế làm xê dịch các `grants` đã kiểm.
- Ch1–3 vẫn được hưởng các phần còn lại của §5: suy ngẫm (`reflect:`), sai lầm điển hình (`wrong:`), thẻ nhớ, ôn ngắt quãng. Thêm các trường đó **không đổi** Solution, `grants` hay `requires`.
- `ch1-01` đã có `starter:`, đóng vai một ví dụ mẫu nhẹ.

### Ch4 · Lịch tàu & thời gian / Schedules and time

- **Bậc sau cột mốc:** DA · phụ trách số liệu Ops & lịch tàu.
- **Người hỏi:** điều độ vận tải / kho CFS, CSKH, Trưởng phòng Ops, Giám đốc.
- **Kỹ năng mới:**
  - `date_math`: trừ ngày, cộng `interval`.
  - `date_bucket`: `date_trunc`, `extract`, gom theo ngày, tuần, tháng.
  - `null_logic`: `IS NULL` / `IS NOT NULL`; NULL trong phép so sánh và hàm gộp.
- **Bảng mở:** `shipment_events`, `trucking_orders`, `cfs_receipts`.
- **Ôn xen kẽ:** `anti_join`, `group_by`, `aggregate`, `join`, `order_by`.

| # | Beat · Dạng | Người hỏi | Câu hỏi nghiệp vụ (một dòng) | Dạy / Ôn |
|---|---|---|---|---|
| 01 | teach · W | CSKH | Các lô cập cảng trong tháng 10/2026 đến trễ bao nhiêu ngày so với lịch, để gửi thư xin lỗi đúng khách? | dạy `date_math` |
| 02 | develop · F | Trưởng phòng Ops | Mỗi tháng từ 11/2024 đến 10/2026 có bao nhiêu lô booking, để thấy mùa cao điểm mà tuyển thời vụ? | dạy `date_bucket` |
| 03 | develop · O | Điều độ vận tải | Lô nhập đường biển nào đã cập cảng hơn 3 ngày mà chưa có lệnh xe kéo về kho, để kéo gấp trước khi phát sinh phí lưu bãi? | ôn `anti_join` + `date_math` |
| 04 | twist · O | CSKH | Tính đến 31/10/2026, lô nào đã quá ngày đến dự kiến mà vẫn chưa ghi nhận ngày đến thực tế, để gọi báo khách trước khi khách hỏi? | dạy `null_logic` (bẫy: ngày đến thực tế để trống) |
| 05 | rest · O | Kho CFS | Từ 26 đến 31/10/2026, mỗi ngày kho CFS nhận bao nhiêu lô hàng lẻ và tổng bao nhiêu CBM, để xếp ca bốc xếp? | ôn ch2 (`group_by`, `aggregate`) |
| 06 | boss | Giám đốc | Đánh giá giao ban tháng 10: (1) lô đang trễ chưa đến, kèm tên khách; (2) từ lúc tàu cập đến lúc giao hàng mất trung bình bao nhiêu ngày, theo cảng đến; (3) số lô cập cảng theo từng tuần của tháng 10. | kiểm `null_logic`, `date_math`, `date_bucket`, `join` |

### Ch5 · Hải quan & phân loại / Customs and classification

- **Bậc sau cột mốc:** DA · phụ trách số liệu Hải quan.
- **Người hỏi:** khai báo viên hải quan, Trưởng phòng Hải quan, CSKH, Giám đốc.
- **Kỹ năng mới:**
  - `case_when`: `CASE` phân loại.
  - `conditional_agg`: `COUNT(*) FILTER (WHERE …)` hoặc `SUM(CASE …)`, mỗi nhóm một cột.
  - `coalesce`: `COALESCE`, `NULLIF`.
  - `self_join`: nối một bảng với chính nó.
- **Bảng mở:** `customs_declarations`, `hs_codes`, `duties_taxes`.
- **Ôn xen kẽ:** `date_math`, `null_logic`, `multi_join`, `anti_join`, `date_bucket`.

| # | Beat · Dạng | Người hỏi | Câu hỏi nghiệp vụ | Dạy / Ôn |
|---|---|---|---|---|
| 01 | teach · W | Khai báo viên | Mỗi tờ khai tháng 10/2026 được thông quan nhanh (trong 1 ngày), bình thường (2–3 ngày) hay chậm (hơn 3 ngày)? | dạy `case_when`; ôn `date_math` |
| 02 | develop · F | Trưởng phòng Hải quan | Tháng 9 và tháng 10/2026, mỗi tháng có bao nhiêu tờ khai luồng xanh, vàng, đỏ (mỗi luồng một cột), để dự trù người đi kiểm hóa? | dạy `conditional_agg`; ôn `date_bucket` |
| 03 | develop · O | Khai báo viên | Thuế nhập khẩu tạm tính tháng 10/2026 theo từng chương mã HS (2 số đầu); mã HS chưa có thuế suất thì tạm tính 0 và đánh dấu "cần kiểm tra". | dạy `coalesce` |
| 04 | twist · O | Trưởng phòng Hải quan | Tờ khai nào đã bị thay bằng tờ khai sửa, và tờ khai cuối cùng đang có hiệu lực là tờ nào? | dạy `self_join` (bẫy: tờ khai hủy rồi khai lại) |
| 05 | rest · O | CSKH | Lô nhập nào đã cập cảng hơn 5 ngày mà tờ khai vẫn chưa được thông quan? Gửi mã lô, tên khách, số ngày chờ. | ôn ch3–4 (`multi_join`, `null_logic`, `date_math`) |
| 06 | boss | Giám đốc | Báo cáo chất lượng dịch vụ quý 3/2026: (1) tỷ lệ lô đến đúng hẹn theo phương thức; (2) thời gian thông quan trung bình theo luồng; (3) số tờ khai theo luồng, chỉ tính bản cuối cùng. | kiểm `self_join`, `case_when`, `conditional_agg` |

### Ch6 · Làm sạch dữ liệu / Cleaning the data

- **Bậc sau cột mốc:** ★ **Senior DA** (chủ quản chất lượng dữ liệu).
- **Người hỏi:** CSKH, Sales, Chứng từ & booking, Kế toán trưởng.
- **Kỹ năng mới:**
  - `string_fn`: `lower`/`upper`, `trim`, `replace`, `regexp_replace`, `||`, `split_part`.
  - `pattern_match`: `LIKE`, `ILIKE`.
  - `distinct`: `SELECT DISTINCT`, `COUNT(DISTINCT …)`.
  - `cast`: `::numeric`, `to_char`; bẫy chia số nguyên.
- **Bảng mở:** `incoterms`.
- **Ôn xen kẽ:** `join`, `where`, `group_by`, `self_join`, `case_when`.

| # | Beat · Dạng | Người hỏi | Câu hỏi nghiệp vụ | Dạy / Ôn |
|---|---|---|---|---|
| 01 | teach · W | CSKH | In nhãn thư cảm ơn cuối năm: tên khách viết hoa, bỏ phần loại hình công ty ("Công ty TNHH", "Công ty CP"…) cho vừa ô nhãn. | dạy `string_fn` |
| 02 | develop · F | Sales | Khách nào làm hàng thủy sản theo tên công ty (viết hoa hay thường đều được), để mời dự hội chợ thủy sản? | dạy `pattern_match` |
| 03 | develop · O | Sales | Năm 2025 mỗi khách gửi hàng tới bao nhiêu cảng đích khác nhau? Khách đi nhiều cảng là ứng viên cho gói đa tuyến. | dạy `distinct` |
| 04 | twist · O | Kế toán trưởng | Tỷ lệ lô bị hủy của từng khách năm 2025 (phần trăm, 2 số lẻ), để xem xét thu phí hủy booking. | dạy `cast` (bẫy: chia số nguyên ra 0) |
| 05 | rest · O | Chứng từ | Lô hàng air nào đang khai điều kiện giao hàng chỉ dành cho đường biển (FOB…)? Gửi mã lô và sales làm lô để sửa trước khi phát hành vận đơn hàng không. | ôn ch1+ch3 (`join`, `where`) |
| 06 | boss | Kế toán trưởng | Dọn dữ liệu trước báo cáo năm: (1) cặp khách bị nhập hai lần với hai cách viết tên; (2) sản lượng 2025 sau khi gộp bản trùng; (3) tỷ lệ hủy (%) của các khách đã gộp. | kiểm `cast`, `string_fn`, `self_join` (bẫy: khách 191–200 trùng 1–10) |

### Ch7 · Báo giá & so sánh / Quotes and comparisons

- **Bậc sau cột mốc:** Senior DA · phụ trách phân tích giá.
- **Người hỏi:** Pricing, Sales, Giám đốc.
- **Kỹ năng mới:**
  - `scalar_subquery`: truy vấn con trả một giá trị.
  - `in_subquery`: `IN` / `NOT IN` với danh sách; bẫy NULL.
  - `exists`: `EXISTS` / `NOT EXISTS`.
  - `correlated_value`: truy vấn con tương quan trả giá trị theo từng dòng, kèm điều kiện "còn hiệu lực vào ngày".
- **Bảng mở:** `rate_contracts`, `quotations`.
- **Ôn xen kẽ:** `having`, `anti_join`, `multi_join`, `limit`, `date_bucket`.

| # | Beat · Dạng | Người hỏi | Câu hỏi nghiệp vụ | Dạy / Ôn |
|---|---|---|---|---|
| 01 | teach · W | Sales | Khách nào gửi nhiều lô trong năm 2025 hơn mức trung bình mỗi khách, để đưa vào nhóm chăm sóc ưu tiên? | dạy `scalar_subquery` |
| 02 | develop · F | Pricing | Báo giá quý 3/2026 nào đã gửi cho khách chủ lực (hơn 150 lô năm 2025)? | dạy `in_subquery`; ôn `having` |
| 03 | develop · O | Sales | Khách nào nhận báo giá trong quý 3/2026 nhưng chưa có booking nào kể từ ngày báo giá, để sales gọi chốt? | dạy `exists` (so với anti-join ch3) |
| 04 | twist · O | Pricing | Báo giá nào trong quý 3/2026 có giá bán thấp hơn giá mua của hợp đồng cước còn hiệu lực vào ngày báo giá, cùng tuyến và cùng loại container? | dạy `correlated_value` (mầm nguyên nhân 1 của ch12) |
| 05 | rest · O | Trưởng phòng Sales | Năm tuyến (cảng đi → cảng đến, gọi bằng tên cảng) có nhiều TEU nhất quý 3/2026. | ôn ch1–3 (`multi_join`, `group_by`, `limit`), nối bảng cảng hai lần |
| 06 | boss | Giám đốc | Rà báo giá bán lỗ quý 3: (1) số báo giá dưới giá mua theo tuyến; (2) sales nào đã gửi chúng; (3) khách nào trong số đó đã booking theo giá lỗ. | kiểm `correlated_value`, `exists` |

### Ch8 · Công nợ & tỷ giá / Receivables and exchange rates

- **Bậc sau cột mốc:** Senior DA · phụ trách báo cáo tài chính.
- **Người hỏi:** Kế toán AR, Kế toán AP, Kế toán trưởng.
- **Kỹ năng mới:**
  - `cte`: `WITH` một bước, để cộng riêng từng bảng trước khi nối, tránh nhân dòng.
  - `multi_cte`: nhiều CTE nối tiếp nhau.
  - `distinct_on`: `DISTINCT ON`, bản ghi mới nhất mỗi nhóm.
- **Bảng mở:** `charges`, `invoices`, `payments`, `vendor_bills`, `exchange_rates`.
- **Ôn xen kẽ:** `scalar_subquery`, `case_when`, `in_subquery`, `date_math`, `coalesce`.

| # | Beat · Dạng | Người hỏi | Câu hỏi nghiệp vụ | Dạy / Ôn |
|---|---|---|---|---|
| 01 | teach · W | Kế toán AR | Tính đến 31/10/2026, mỗi khách còn nợ bao nhiêu (tổng hóa đơn trừ tổng đã thanh toán)? | dạy `cte` (bẫy: nối thẳng hóa đơn với thanh toán làm nhân đôi tiền) |
| 02 | develop · F | Kế toán AR | Khách nào có nợ quá hạn cao hơn mức nợ quá hạn trung bình của các khách đang nợ, để ưu tiên nhắc nợ tuần này? | dạy `multi_cte`; ôn `scalar_subquery` |
| 03 | develop · O | Kế toán AR | Phân tuổi nợ: mỗi khách nợ bao nhiêu ở các nhóm 0–30, 31–60, 61–90 và trên 90 ngày quá hạn? | ôn `case_when` + `cte` |
| 04 | twist · O | Kế toán AP | Quy đổi từng hóa đơn nhà cung cấp tháng 10/2026 sang VND; ngày hóa đơn không có tỷ giá (cuối tuần, lễ) thì dùng tỷ giá gần nhất trước đó. | dạy `distinct_on` (bẫy: tỷ giá chỉ có vào ngày làm việc) |
| 05 | rest · O | Kế toán AP | Hóa đơn nhà cung cấp nhận trong tháng 10/2026 nào thuộc lô đã hủy, để đòi hoàn hoặc dừng thanh toán? | ôn ch7 `in_subquery` (bẫy: lô hủy vẫn còn dòng phí) |
| 06 | boss | Kế toán trưởng | Chốt sổ quý 3: (1) lãi gộp từng lô booking tháng 9/2026 quy về VND; (2) những lô bị lỗ; (3) tổng lỗ theo tuyến. | kiểm `distinct_on`, `multi_cte` (bẫy: phí nhiều loại tiền) |

### Ch9 · Đối soát chứng từ / Document reconciliation

- **Bậc sau cột mốc:** ★ **Lead DA**.
- **Người hỏi:** Chứng từ & booking (B/L, HBL/MBL), Kế toán AR, Giám đốc.
- **Kỹ năng mới:**
  - `union`: `UNION` / `UNION ALL`.
  - `except`: `EXCEPT` / `INTERSECT`.
  - `full_join`: `FULL OUTER JOIN` để đối chiếu cả hai phía.
- **Bảng mở:** `master_bills`, `house_bills`.
- **Ôn xen kẽ:** `cte`, `anti_join`, `date_math`, `join`, `coalesce`.

| # | Beat · Dạng | Người hỏi | Câu hỏi nghiệp vụ | Dạy / Ôn |
|---|---|---|---|---|
| 01 | teach · W | Chứng từ | Gom mọi số vận đơn phát hành trong tháng 10/2026, cả vận đơn chủ (MBL) lẫn vận đơn nhà (HBL), vào một danh sách có ghi loại vận đơn. | dạy `union` |
| 02 | develop · F | Kế toán AR | Lô nào đã giao cho khách nhưng chưa xuất hóa đơn, để xuất trong kỳ? | dạy `except` (so với anti-join; bẫy: đã giao chưa hóa đơn) |
| 03 | develop · O | Chứng từ | Vận đơn chủ nào có tổng trọng lượng các vận đơn nhà lệch quá 1% so với trọng lượng ghi trên vận đơn chủ? | ôn `cte` + `join` (bẫy: trọng lượng house ≠ master) |
| 04 | twist · O | Chứng từ + Kế toán AR | So từng tháng năm 2026: số lô trong sổ booking và số vận đơn nhà đã phát hành. Tháng nào lệch, kể cả tháng chỉ có ở một bên? | dạy `full_join`; ôn `coalesce` |
| 05 | rest · O | Chứng từ | Vận đơn nhà nào phát hành muộn hơn 2 ngày sau ngày tàu chạy thực tế? Gửi kèm sales làm lô. | ôn ch3–4 (`join`, `date_math`) |
| 06 | boss | Giám đốc | Đóng sổ đối soát tháng 10: (1) lô đã giao còn thiếu hóa đơn; (2) vận đơn chủ lệch trọng lượng; (3) bảng đối chiếu sổ booking với sổ chứng từ theo tháng. | kiểm `full_join`, `except` |

### Ch10 · Xu hướng & xếp hạng / Trends and rankings

- **Bậc sau cột mốc:** Lead DA · phụ trách báo cáo điều hành cho Ban giám đốc.
- **Người hỏi:** Giám đốc, Sales, Điều độ vận tải, Kế toán.
- **Kỹ năng mới:**
  - `window_rank`: `ROW_NUMBER`, `RANK`, `DENSE_RANK` … `OVER (PARTITION BY … ORDER BY …)`.
  - `window_lag`: `LAG`, `LEAD`.
  - `window_agg`: `SUM`/`AVG` `OVER`, cả lũy kế lẫn tổng theo nhóm.
- **Bảng mở:** `free_time_terms`, `container_events`.
- **Ôn xen kẽ:** `cte`, `date_bucket`, `date_math`, `exists`, `multi_cte`.

| # | Beat · Dạng | Người hỏi | Câu hỏi nghiệp vụ | Dạy / Ôn |
|---|---|---|---|---|
| 01 | teach · W | Giám đốc | Mỗi tháng từ 01 đến 10/2026, ba khách có nhiều TEU nhất là ai, để xem khách lớn có giữ phong độ không? | dạy `window_rank`; ôn `date_bucket` |
| 02 | develop · F | Sales | TEU từng tháng từ 11/2024 đến 10/2026 tăng hay giảm bao nhiêu so với tháng trước, cả số tuyệt đối lẫn phần trăm? | dạy `window_lag`; ôn `cte` |
| 03 | develop · O | Điều độ vận tải | Tính đến 31/10/2026, mỗi container đang chạy dừng ở bước nào, và đã ở bước đó bao nhiêu ngày? Container ở một bước quá 5 ngày là container bị kẹt. | ôn `window_rank` (sự kiện mới nhất) + `date_math` |
| 04 | twist · O | Kế toán + CSKH | Mỗi khách đã vượt thời gian miễn phí lưu container/lưu bãi (D&D) bao nhiêu ngày, cộng dồn theo từng tháng năm 2026? | dạy `window_agg` (mầm nguyên nhân 2: khách 1) |
| 05 | rest · O | Kế toán AR | Khách nào vừa có nợ quá hạn vừa có lô đang trên đường, để tạm giữ lệnh giao hàng? | ôn ch7–8 (`exists`, `cte`) |
| 06 | boss | Giám đốc | Báo cáo xu hướng năm cho Ban giám đốc: (1) ba khách lớn nhất mỗi quý; (2) TEU mỗi quý tăng giảm bao nhiêu % so với quý trước; (3) số ngày vượt D&D cộng dồn của năm khách lớn nhất. | kiểm `window_agg`, `window_rank`, `window_lag` |

### Ch11 · Truy vấn nhanh hơn / Faster queries

- **Bậc sau cột mốc:** Lead DA · phụ trách hiệu năng dữ liệu, cầu nối với IT / Data Engineering.
- **Người hỏi:** IT, Trưởng phòng Ops, CSKH, Kế toán.
- **Kỹ năng mới:**
  - `explain_read`: đọc kế hoạch thực thi (Seq Scan / Index Scan / Bitmap, chi phí, số dòng ước tính).
  - `sargable`: viết điều kiện để dùng được index; không bọc cột trong hàm.
  - `index_design`: chọn cột và thứ tự cột cho index, index nhiều cột.
- **Bảng mở:** không có. Seed thêm index dựng sẵn (§6).
- **Ôn xen kẽ:** `window_rank`, `cte`, `join`, `aggregate`, `date_math`.
- Cách chấm: §6.

| # | Beat · Dạng | Người hỏi | Câu hỏi nghiệp vụ | Dạy / Ôn |
|---|---|---|---|---|
| 01 | teach · W | IT | Màn hình tra lô theo khách mở rất chậm: lấy các lô của một khách, rồi chỉ ra bước nào trong kế hoạch thực thi phải đọc nhiều dòng nhất. | dạy `explain_read` (chấm: kết quả + câu hỏi trắc nghiệm) |
| 02 | develop · F | Trưởng phòng Ops | Bảng giao ban "lô booking ngày 15/10/2026" chạy chậm vì cách lọc ngày. Viết lại sao cho kết quả giữ nguyên mà hệ thống dùng được chỉ mục ngày booking có sẵn. | dạy `sargable` (chấm: kết quả + plan dùng index) |
| 03 | develop · O | CSKH | Khách đọc mã lô qua điện thoại, nhân viên hay gõ chữ thường: tra đúng lô mà vẫn dùng được chỉ mục mã lô. | ôn `sargable` |
| 04 | twist · Lab | IT | Báo cáo trạng thái mới nhất của từng container chạy chậm: đề xuất một chỉ mục để nó không phải đọc hết lịch sử sự kiện, và chứng minh bằng kế hoạch trước/sau. | dạy `index_design`; ôn `window_rank` |
| 05 | rest · O | Kế toán | Tổng phí theo loại tiền của các lô giao trong tháng 10/2026, chạy nhanh: không quét toàn bộ bảng phí. | ôn ch2–8 (`cte`, `join`, `aggregate`) + `sargable` |
| 06 | boss | IT + Giám đốc | Trước mùa cao điểm, tăng tốc ba báo cáo chậm nhất. Mỗi bước: kết quả đúng, và kế hoạch mới dùng index hoặc chi phí giảm đủ ngưỡng. | kiểm `index_design` (bước Lab), `sargable`, `explain_read` |

### Ch12 · Điều tra cuối năm / Year-end investigation

- **Bậc sau cột mốc:** ★ **Trưởng nhóm Phân tích / Head of Analytics**.
- **Người hỏi:** Giám đốc / Hội đồng quản trị, Pricing, Kế toán trưởng, CSKH, Trưởng phòng Ops.
- **Kỹ năng mới:** không có. Mọi ticket `grants: []`, nên luật "kỹ năng twist ⊂ cột mốc" đúng một cách hiển nhiên.
- **Bảng mở:** `claims`.
- **Ôn xen kẽ:** cả game. Mỗi ticket bắt buộc dùng kỹ năng của ít nhất 3 chương khác nhau.

| # | Beat · Dạng | Người hỏi | Câu hỏi nghiệp vụ | Ôn |
|---|---|---|---|---|
| 01 | teach · W | Giám đốc | Biên lợi nhuận gộp quý 3/2026 giảm bao nhiêu điểm phần trăm so với quý 2/2026, và giảm nhiều nhất ở tuyến nào? (Ví dụ mẫu dạy **cách điều tra**: giả thuyết → con số → kiểm tra chéo.) | `multi_cte`, `distinct_on`, `date_bucket` |
| 02 | develop · O | Pricing | Trên tuyến châu Âu, giá mua theo hợp đồng cước tăng bao nhiêu từ quý 2 sang quý 3/2026, và giá bán trên báo giá cùng tuyến có tăng theo không? | `window_lag`, `correlated_value` |
| 03 | develop · O | Kế toán AR + CSKH | Phí D&D theo từng khách, từng quý 2025–2026: khách nào tăng đột biến trong quý 3/2026, và vì ngày vượt nhiều hơn hay vì đơn giá cao hơn? | `window_agg`, `date_math` |
| 04 | twist · O | Trưởng phòng Ops | Bảng điểm claim theo hãng tàu năm 2026: số claim trên 100 lô và tổng giá trị claim. Hãng nào cao bất thường so với trung bình các hãng? | `cast`, `scalar_subquery`, `left_join` |
| 05 | rest · O | Kế toán trưởng | Trước khi trình: doanh thu quý 3/2026 có bị tính trùng vì khách nhập hai lần với cách viết khác nhau không, và chênh bao nhiêu? | `string_fn`, `self_join`, `cte` |
| 06 | boss | Hội đồng quản trị | Ba nguyên nhân làm biên lợi nhuận quý 3/2026 giảm, mỗi nguyên nhân kèm một con số chứng minh; câu kết luận hỏi nguyên nhân chính. | tổng hợp (đáp án: giá bán chưa theo kịp giá mua tuyến châu Âu) |

**Kiểm chéo bẫy dữ liệu (chỉ xuất hiện sau khi đã dạy cách xử lý):**

| Bẫy | Chương xuất hiện | Kỹ năng xử lý |
|---|---|---|
| `ata` để trống | ch4-04 | `null_logic` (ch4) |
| tờ khai hủy rồi khai lại | ch5-04 | `self_join` (ch5) |
| chia số nguyên | ch6-04 | `cast` (ch6) |
| FOB khai cho lô air | ch6-05 | `join`, `where` (ch1/3) |
| khách trùng tên khác cách viết | ch6-06, ch12-05 | `string_fn` (ch6) |
| nhân dòng khi nối hai bảng tiền | ch8-01 | `cte` (ch8) |
| tỷ giá chỉ có vào ngày làm việc | ch8-04 | `distinct_on` (ch8) |
| phí nhiều loại tiền | ch8-06 | `distinct_on` + `multi_cte` (ch8) |
| lô hủy vẫn còn dòng phí | ch8-05 | `in_subquery` (ch7) |
| lô đã giao nhưng chưa xuất hóa đơn | ch9-02 | `except` (ch9) |
| trọng lượng house ≠ master | ch9-03 | `cte` (ch8) |

---

## 5. Phương pháp học, cụ thể cho app

Ký hiệu effort: **S** ≤ nửa ngày, **M** 1–2 ngày, **L** 3+ ngày.

### 5.1 Nhịp mỗi chương (ch4–12)

| Bước | Ticket | Người chơi làm gì | App cần gì | Effort |
|---|---|---|---|---|
| 1 Ví dụ mẫu | `teach`, `format: worked` | Đọc lời giải có chú thích từng mệnh đề, chạy thử, rồi giải **bài cặp đôi** gần giống (ví dụ–bài tập ghép cặp). Grader chấm bài cặp đôi như thường. | Trường `format` trong parser (`worked`, `faded`, `open`; mặc định `open`). Thêm mục `## Example` trong thân ticket: một khối ```sql, mỗi mệnh đề có chú thích `-- ① …` (VI và EN, khối SQL dùng chung). Thẻ "Ví dụ mẫu" ở brief có nút "Chép vào editor", và tô sáng mệnh đề khi rê chuột qua chú thích. | M |
| 2 Làm cùng | `develop`, `format: faded` | Editor mở sẵn câu SQL còn chỗ trống `___`; người chơi điền vào. | Dùng lại `starter:`. Parser bắt buộc ticket `faded` có ít nhất một `___` trong `starter`. Nộp khi còn `___` thì báo "còn N chỗ trống", không tính là lần nộp sai. Tab / Shift-Tab nhảy giữa các chỗ trống bằng search cursor của CodeMirror. Widget điền chữ thật thì để sau. | S (M nếu làm widget) |
| 3 Tự làm | `develop`, `format: open` | Câu hỏi nghiệp vụ mới; gợi ý 3 bậc như cũ. | Không cần gì mới. | — |
| 4 Twist | `twist` | Kỹ năng mới gặp bẫy dữ liệu thật. | Không cần gì mới. | — |
| 5 Ôn xen kẽ | `rest` | Ticket cần kỹ năng của chương trước. | Thêm luật vào `contentProblems`: từ ch4 trở đi, ticket `rest` phải `requires` ít nhất 2 kỹ năng của chương trước, trong đó ít nhất 1 kỹ năng từ chương N−2 trở về trước (để có khoảng cách ôn). | S |
| 6 Cột mốc | `boss` | Nhiều bước, câu kết luận, thăng tiến. | Giữ nguyên. | — |

Luật nhịp hiện có (`teach` đứng đầu, `rest` ngay trước `boss`, đúng một `boss`) **giữ nguyên**: `format` là trường riêng, không thêm beat mới. Lý do không thêm beat `example`/`faded`:

- Ba luật nhịp và `BEATS` trong `src/tickets.ts` không phải sửa.
- 15 ticket cũ mặc định là `open`, nên không phải động vào.
- Dạng bài (ví dụ mẫu, làm cùng, tự làm) và vị trí kể chuyện (teach, develop…) là hai trục khác nhau.

### 5.2 Ôn ngắt quãng giữa các chương

- **Leitner 5 hộp `[1,2,4,8,16]` ngày của Plan 1c** giữ nguyên. Nó tính theo **lịch thật**, nên người chơi cày 3 chương trong một buổi sẽ không có thẻ nào đến hạn.
- Vì vậy thêm **trigger theo chương:** khi mở chương N ≥ 2, card "Ôn đầu chương" trên Trang chủ và Hộp thư đề xuất **3 bài luyện** (biến thể `{{x}}` của Plan 1c).
  - Bài luyện lấy từ kỹ năng của chương ≤ N−1, ưu tiên hộp thấp nhất, rồi đến hạn sớm nhất.
  - Card **không chặn** ticket `teach`. Làm xong được +1 hộp như luyện thường; vẫn 0 XP (spec §6).
  - Effort S: thêm một hàm chọn trong `src/practice.ts` và một card ở Plan 1d.
- **Ticket `rest`** (§5.1) là lớp ôn thứ hai, nằm ngay trong mạch truyện.

### 5.3 Thẻ nhớ truy hồi (skill cards)

- **Đã có:** thẻ `syntax / when / trap` trong `skills.yml`, Sổ tay (Plan 1c) và skill map.
- **Thêm chế độ "Thẻ úp"** trong Ôn hôm nay:
  1. Mặt trước hiện tình huống `when` và một câu nghiệp vụ ngắn.
  2. Người chơi gõ cú pháp từ trí nhớ vào ô nhỏ. Ô này không chấm.
  3. Lật thẻ: hiện `syntax` và `trap`.
  4. Người chơi tự đánh giá "Nhớ" (+1 hộp) hoặc "Chưa nhớ" (về hộp 1).
- Effort S/M: dùng lại `review` trong save v2, không đổi `SAVE_VERSION`.
- Thẻ mới cần `when` viết như tình huống, không như định nghĩa. Ví dụ cho `distinct_on`: "Cần một dòng mới nhất cho mỗi khách".

### 5.4 Giải thích lỗi

| Lớp | Đã có / mới | Nội dung | Effort |
|---|---|---|---|
| Lỗi Postgres | **Đã có** (`src/ui/sqlErrors.ts`, theo SQLSTATE) | Thêm mã cho kỹ năng mới: `42P19`/`42P20` (window), `22012` (chia cho 0, gợi ý `NULLIF`), `42804` (sai kiểu trong `CASE`/`UNION`), `42601` khi `UNION` lệch số cột… | S |
| Sai kết quả → bẫy của kỹ năng | Mới | Khi Nộp sai, thẻ phản hồi kèm dòng `trap` của kỹ năng mà ticket dạy, hoặc của kỹ năng twist ở `requires`. | S |
| Sai lầm điển hình theo ticket | Mới | Frontmatter `wrong: [{ sql, vi, en }]`: tác giả viết sẵn câu SQL sai hay gặp (`= NULL`, `WHERE` thay `HAVING`, nối hai bảng tiền không gom trước…). Grader so kết quả của người chơi với kết quả của từng câu sai; trùng thì hiện lời giải thích riêng. Test nội dung kiểm mỗi câu `wrong` **khác** kết quả Solution. | M |
| Soi SQL trước khi chạy (lint) | Mới | Cảnh báo không chặn: `= NULL`; `NOT IN (truy vấn con)`; chia hai số đếm; `LIMIT` không có `ORDER BY`; điều kiện trên bảng bên phải đặt ở `WHERE` sau `LEFT JOIN`; hàm bọc cột trong `WHERE` (ch11). Dùng `libpg-query` đã tải cho tab Thứ tự thực thi; không có AST thì dùng regex. | M |

### 5.5 Câu hỏi suy ngẫm sau mỗi việc

- Frontmatter `reflect: { q: {vi, en}, options: [{vi, en}…], answer, why: {vi, en} }`: một câu trắc nghiệm hiện trong thẻ **Recap** (đã có) ngay sau khi nộp đúng.
- Ví dụ: "Vì sao điều kiện hơn 150 lô phải đặt sau bước gom nhóm?" Chọn xong thì hiện `why`.
- Không chấm, không XP, không lưu. Cột mốc tiếp tục dùng `conclusion`.
- Effort S. Viết cho mọi ticket, kể cả 15 ticket ch1–3 (chỉ thêm trường, không đổi gì khác).

### 5.6 Giới hạn của tab "Thứ tự thực thi"

- Tab này chưa hỗ trợ `WITH`, `UNION` và hàm cửa sổ (spec §6b), tức là các chương 8, 9, 10.
- Ví dụ mẫu của ba chương đó **không dựa vào tab này**. Chú thích nằm ngay trong khối `## Example`, còn tab EXPLAIN và Luồng dữ liệu dùng được cho mọi câu.
- Mở rộng tab này (chạy từng CTE như một query con) là việc **L**, đưa vào Plan 3 như mục tùy chọn.

### 5.7 Tổng hợp việc cho sản phẩm

| Việc | Plan | Effort |
|---|---|---|
| Khung 12 chương (chapters.yml, CHAPTER_TABLES, i18n, màu, test) | Plan 2 Task 0 | S |
| `format: worked` + thẻ Ví dụ mẫu | Plan 2 | M |
| `format: faded` (chỗ trống trong starter) | Plan 2 | S |
| Luật `rest` ôn xen kẽ trong `contentProblems` | Plan 2 | S |
| `reflect:` trong Recap | Plan 2 | S |
| Bẫy của kỹ năng khi nộp sai + mã SQLSTATE mới | Plan 2 (bổ sung dần ở Plan 3–4) | S |
| `wrong:` sai lầm điển hình | Plan 2 | M |
| Lint SQL | Plan 3 | M |
| Ôn đầu chương + Thẻ úp | Plan 2 (sau khi Plan 1c xong) | S + S/M |
| `conclusion`/quiz cho ticket không phải cột mốc | Plan 4 | S |
| Kiểm theo plan (`plan:`) + index dựng sẵn | Plan 4 | M |
| Phòng thí nghiệm index (`kind: 'lab'`) | Plan 4 | L |
| Thứ tự thực thi cho WITH/UNION/window | Plan 3 (tùy chọn) | L |

---

## 6. Chương 11: thiết kế phần hiệu năng (EXPLAIN / index)

### 6.1 Ràng buộc

- Mỗi lần chạy là `BEGIN` → một câu lệnh → `ROLLBACK` (`runSandboxed`, `src/db/run.ts`), và người chơi chỉ được một câu lệnh mỗi lần. Vì vậy `CREATE INDEX` của người chơi không thể tồn tại sang lần chạy sau.
- DB hiện **chỉ có index của PRIMARY KEY và UNIQUE**; các cột khóa ngoại (`shipments.customer_id`, `containers.shipment_id`…) chưa có index. Đó chính là nguyên liệu cho chương này.

### 6.2 Đã kiểm thực tế (PGlite trong Node, schema + seed hiện tại, 20.000 lô, 25.677 container)

Chạy `CREATE INDEX` rồi `EXPLAIN` **trong cùng một transaction** thì planner dùng index mới ngay, không cần `ANALYZE` lại. `ROLLBACK` xong thì plan quay về như cũ.

| Query | Trước | Sau `CREATE INDEX` (cùng transaction) |
|---|---|---|
| lô theo `customer_id = 42` | Seq Scan, cost 585 | Bitmap Index Scan, cost 226 |
| lô theo `booking_date = '2026-10-15'` | Seq Scan, cost 585 | Bitmap Index Scan, cost 87 |
| `to_char(booking_date, …) = '2026-10-15'` | Seq Scan, cost 685 | **vẫn Seq Scan** (không dùng được index, bài học `sargable`) |
| container theo `shipment_id = 1234` | Seq Scan, cost 548 | Index Scan, cost 8,3 |
| `upper(ref) = …` | Seq Scan, cost 635 | vẫn Seq Scan (index UNIQUE trên `ref` không dùng được) |

Kết luận cho thiết kế:

- Plan **đổi được** và đổi **ổn định**.
- Bài học và cách chấm dựa trên **loại node và cost**, không dựa trên mili-giây. Thời gian chạy trong WASM dao động nhiều, mà dữ liệu thì nhỏ.

### 6.3 Thiết kế: hai tầng

**Tầng A: index dựng sẵn + chấm theo plan** (ch11-01, 02, 03, 05; effort **M**)

- **Seed (Plan 4)** thêm một khối ở cuối file: `CREATE INDEX` trên `shipments(booking_date)`, `shipments(customer_id)`, `charges(shipment_id)`, rồi `ANALYZE` để cost tất định. Thêm index không đổi kết quả của Solution nào, chỉ đổi plan.
- **Cố ý không có index** trên `container_events(container_id, event_time)`: đó là đề của phòng thí nghiệm (tầng B).
- **Frontmatter `plan:`**, ví dụ: `plan: { uses_index: shipments }`, `{ no_seq_scan: [charges] }`, `{ max_cost_ratio: 0.5, baseline: "<SQL chậm>" }`.
- **Grader:** sau khi so kết quả như thường, chạy `EXPLAIN (FORMAT JSON)` (không ANALYZE) trên SQL của người chơi trong cùng sandbox, duyệt cây node:
  - có `Index Scan`, `Index Only Scan` hoặc `Bitmap Index Scan` trên đúng bảng không;
  - có `Seq Scan` trên bảng bị cấm không;
  - tỷ lệ cost so với `baseline`.
- **Phản hồi khi sai plan** nói rõ nút nào đang quét toàn bộ bảng nào.
- **Test nội dung:** Solution đạt `plan:`, và `baseline` (nếu có) **không** đạt.
- **Câu trắc nghiệm** (ch11-01): mở rộng `conclusion` cho ticket không phải cột mốc (S).
- **Tab Cột** hiện danh sách index của bảng khi đang ở ch11 (S, đọc `pg_indexes`).

**Tầng B: phòng thí nghiệm index trong worker** (ch11-04 và một bước của ch11-06; effort **L**)

- **Message mới cho worker:** `{ id, kind: 'lab', ddl, sql }`. Worker chạy tuần tự trong **một** transaction:
  1. `BEGIN`
  2. `EXPLAIN (FORMAT JSON) sql`, lưu thành plan trước
  3. `ddl`
  4. `EXPLAIN (FORMAT JSON) sql`, lưu thành plan sau
  5. chạy `sql` lấy kết quả (giới hạn số dòng như cũ)
  6. `ROLLBACK`, luôn chạy trong `finally`

  Worker trả về `{ before, after, result }`. Cách này làm được vì worker có thể gọi nhiều `db.query` giữa `BEGIN` và `ROLLBACK`. Luật "một câu lệnh mỗi lần" vẫn áp cho **từng ô** của người chơi.
- **Danh sách cho phép (kiểm trong worker, không chỉ ở UI):**
  - `ddl` phải là **đúng một câu `CREATE [UNIQUE] INDEX`** trên một bảng `public` đã mở khóa. Kiểm bằng regex neo đầu chuỗi, cộng với việc PGlite từ chối nhiều câu lệnh trong một lần `query()`.
  - Mọi thứ khác bị từ chối kèm thông báo VI/EN.
  - `CONCURRENTLY` tự lỗi vì không chạy được trong transaction; bắt lỗi đó và giải thích bằng lời.
  - `sql` chạy qua cùng đường như hiện tại.
  - Vì luôn `ROLLBACK`, không có gì tồn tại sau lần chạy.
- **UI:** ticket có `lab: true` hiện **hai ô editor** ("Chỉ mục đề xuất" và "Câu truy vấn") và tab EXPLAIN dạng **so sánh trước/sau**, dùng lại component render plan hiện có, đặt hai cái cạnh nhau.
- **Chấm:**
  - kết quả `sql` khớp Solution, và
  - plan sau dùng index do chính `ddl` tạo, và
  - cost sau ≤ `max_cost_ratio` × cost trước.

  Luật twist → cột mốc: thêm regex `index_design: /\bCREATE\s+(UNIQUE\s+)?INDEX\b/i` vào `SKILL_SQL`, áp lên `ddl` của bước Lab.
- **Dữ liệu:** `container_events` phải đủ lớn để index nhiều cột thắng rõ (khoảng ≥ 100.000 dòng). Kích thước DB phải nằm trong ngân sách tải (L6), nên đo khi viết seed ở Plan 4.
- **Task 0 của Plan 4:** chạy lại kịch bản như §6.2 trên `container_events` thật, xác nhận plan đổi sang Index Scan với index `(container_id, event_time)` trước khi viết ticket.

### 6.4 Đánh đổi

| | Tầng A (dựng sẵn) | Tầng B (lab) |
|---|---|---|
| Người chơi học | đọc plan, viết điều kiện dùng được index | **tự thiết kế** index và thấy plan đổi |
| Rủi ro an toàn | không có (vẫn chỉ SELECT) | mở thêm một đường DDL. Giảm rủi ro bằng danh sách cho phép trong worker + ROLLBACK luôn chạy. |
| Effort | M | L (worker, client, editor thứ hai, so sánh plan) |
| Thực tế | index có sẵn, giống DB công ty | giống quy trình "đề xuất index cho DBA" thật |
| Hạn chế | không tự tạo index | phí dựng index mỗi lần chạy (vài chục đến vài trăm ms trong WASM); index không tồn tại sang câu sau (đúng chủ đích) |

**Khuyến nghị:** làm cả hai. Tầng A là nền và **là phương án dự phòng**: nếu tầng B trễ, ch11-04 đổi thành "chọn index đúng trong ba index dựng sẵn có tên khác nhau, rồi viết truy vấn dùng nó" (`plan: { uses_index_named: … }`). Chương vẫn đủ 6 ticket, chỉ mất phần tự tạo index.

---

## 7. Plan nào làm gì

| Plan | Chương | Ticket | Kỹ năng mới |
|---|---|---|---|
| **Plan 2** | 4–6 (+ khung 12 chương, phương pháp học) | 18 | 11 |
| **Plan 3** | 7–9 | 18 | 10 |
| **Plan 4** | 10–12 (+ hiệu năng) | 18 | 6 |

Mốc 2 của L4 ("cả 7 chương") nay là **cả 12 chương = xong Plan 4**.

### 7.1 Seed: bảng và móc câu chuyện mỗi plan phải thêm

Luật seed giữ nguyên:

- Mỗi khối có `setseed()` riêng và chỉ thêm vào **cuối** file.
- Không sửa dữ liệu bảng cũ. Cột mới nằm ở bảng mới, không `ALTER` bảng `shipments`.
- Sau mỗi plan, chạy lại toàn bộ Solution cũ; kết quả không được đổi.

**Plan 2:**

- `shipment_events`: các mốc của lô, khớp `etd`/`atd`/`ata`, có mốc giao hàng để tính "cập cảng → giao hàng".
- `trucking_orders`: có lô nhập đường biển cập cảng tháng 10/2026 mà sau hơn 3 ngày vẫn chưa có lệnh xe.
- `cfs_receipts`: hàng lẻ (LCL); ngày nào từ 26 đến 31/10/2026 cũng có phiếu.
- `customs_declarations`:
  - luồng xanh, vàng, đỏ; ngày nộp, ngày thông quan (NULL khi chưa thông quan);
  - `amended_from_id`, có chuỗi sửa **2 cấp**;
  - có tờ khai nhập chờ hơn 5 ngày tính đến 31/10.
- `hs_codes`, `duties_taxes`: vài mã HS **không có thuế suất**.
- `incoterms`: có cờ "chỉ dùng cho đường biển"; móc FOB cho lô air đã có sẵn.
- Móc khách trùng 191–200 đã có sẵn.

**Plan 3:**

- `rate_contracts`: tuyến, loại container, ngày hiệu lực từ/đến, giá mua. **Móc 1:** giá mua tuyến châu Âu (NLRTM/DEHAM/BEANR) tăng từ quý 3/2026.
- `quotations`:
  - liên kết khách, sales, tuyến, loại container, ngày báo giá;
  - có `shipment_id` NULL được, để biết báo giá đã thành booking hay chưa;
  - một phần báo giá quý 3 tuyến châu Âu có **giá bán dưới giá mua**.
- `charges`, `invoices`, `payments`, `vendor_bills`:
  - **nhiều loại tiền**; lô hủy vẫn còn dòng phí;
  - có lô **đã giao nhưng chưa xuất hóa đơn**;
  - có nợ quá hạn ở đủ các nhóm tuổi nợ;
  - margin quý 3 tuyến châu Âu giảm, phục vụ ch12.
- `exchange_rates`: **chỉ có ngày làm việc** (móc mới cho ch8-04).
- `master_bills`, `house_bills`:
  - có trường hợp **tổng trọng lượng các HBL lệch quá 1%** so với MBL;
  - có HBL phát hành muộn hơn 2 ngày sau ngày tàu chạy;
  - lô tháng 10 chưa phát hành đủ HBL, để bảng đối chiếu ch9-04 có tháng lệch.

**Plan 4:**

- `free_time_terms`: thời gian miễn phí theo từng khách.
- `container_events`: **≥ 100k dòng**.
  - **Móc 2:** khách 1 vượt D&D tăng vọt trong quý 3/2026.
  - Có container kẹt hơn 5 ngày ở một bước.
- `claims`: **Móc 3:** hãng tàu 3 (Blue Anchor Lines) có tỷ lệ claim cao.
- Nhân viên IT (id 41).
- Khối index dựng sẵn + `ANALYZE` (§6.3).

### 7.2 Ảnh hưởng tới code hiện có (Plan 2 Task 0 làm phần khung chung)

| Chỗ | Hiện tại | Đổi |
|---|---|---|
| `content/chapters.yml` | 7 chương; tiêu đề ch4–7 là "Thời gian & phân loại", "Câu hỏi nhiều bước", "Xu hướng", "Điều tra" | 12 chương theo §0, thêm `career` và `tier` (§1). Outcomes ch4+ điền cùng plan của chương đó. |
| Tiêu đề chương | **Không có `CHAPTER_TITLES` trong `src/`**: tiêu đề lấy từ `chapters.yml` qua `chapterTitle()` | Không cần sửa code; chỉ `chapters.yml`. Spec, `amendments.md`, `frontend.md`, `product-design.md` còn nhắc `CHAPTER_TITLES`; sửa ở lần sửa tài liệu tới. |
| `CHAPTER_TABLES` (`src/progress.ts`) | khóa 1–7 | khóa 1–12 theo §3 |
| `SKILL_SQL` (`src/progress.ts`) | 5 regex | thêm regex cho kỹ năng twist mới: `null_logic` `/\bIS\s+(NOT\s+)?NULL\b/i`, `cast` `/::\s*\w+\|\bCAST\s*\(/i`, `correlated_value`/`exists` `/\bEXISTS\b\|\(\s*SELECT\b/i`, `distinct_on` `/\bDISTINCT\s+ON\b/i`, `full_join` `/\bFULL\s+(OUTER\s+)?JOIN\b/i`, `window_agg` `/\bOVER\s*\(/i`, `index_design` (§6.3). `self_join` không viết được regex: để `undefined` (không kiểm) như luật hiện tại. |
| `src/tickets.ts` | `Beat` 5 loại | giữ; thêm `format`, `reflect`, `wrong`, `plan`, `lab`; mở `conclusion` cho mọi beat |
| i18n `top.chapter` (`vi.ts:16`, `en.ts:19`) | `Chương {n}/7: {title}` | `Chương {n}/{total}: {title}`, `total = CHAPTERS.length` (L12 vẫn đúng) |
| `tests/progress.test.ts:73` | `[1, 2, 3, 4, 5, 6, 7]` | `[1 … 12]` |
| Plan 1c | `Ch x/7 · n/35 ticket` (dòng 61, 1766, 2093–2097) | số chương và tổng ticket tính từ nội dung (69), không gắn cứng |
| Plan 1d `CHAPTER_COLOR` (`src/theme.ts`) | 7 màu: sky, violet, amber, rose, emerald, indigo, fuchsia | thêm **8 teal, 9 orange, 10 cyan, 11 lime, 12 pink**. Viết class đầy đủ dạng chữ để Tailwind quét được. Kiểm tương phản AA cho `text` ở cả hai chế độ (lime và cyan cần sắc độ 800/300 như các màu khác). |
| Plan 1d Trang chủ | "lưới 7 chương", L18 "cảnh cảng 7 trạm" | lưới 12 card (4 × 3 trên desktop, 2 cột trên mobile); hành trình 12 trạm |
| Plan 1d `LEVELS = 5` | mức nhớ Leitner | giữ (đây là hộp Leitner, không phải bậc nghề) |
| Thang nghề (Plan 1c Task 4 `rankOf`, `product-design-v2.md` ★3) | 5 bậc, ch1/3/5/7 | 6 tier + 12 bước theo §1 |
| Plan 1b `SEA_REGION_CHAPTER` (bản đồ d3-geo) | tuyến biển mở ch1–5 theo vùng, air ch6 | **bỏ** (L35): dùng bản đồ Tiên Sa của Plan 1d, tuyến theo `derive().open` (L32: `ROUTES[].opens` ch0–5 hoặc chuyến tàu `scene: ship` tới cảng đó); không đường hàng không, không số lô khi rê chuột; ch6–12 thêm hoạt cảnh theo L29, không thêm tuyến |
| Spec §4 cột "Mở ở chương", §5 bảng lộ trình 7 chương; `problem-design.md` §4 (đánh số ch4–7) | bản 7 chương | sửa theo tài liệu này ở lần sửa spec tới. Ngân hàng câu hỏi §4 dùng lại: 4.x → ch4/5, 5.x → ch7/8, 6.x → ch9/10, 7.x → ch12. |
| `content/skills.yml` | chú thích "chương 4–6" | 27 kỹ năng mới theo §4, thêm trước khi viết ticket của chương đó |
