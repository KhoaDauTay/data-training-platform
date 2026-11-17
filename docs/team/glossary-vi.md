# Bảng thuật ngữ VI/EN: SQL, phân tích dữ liệu, giao nhận

Ngày: 2026-11-17 · Soát trên HEAD `fd43525` · Phạm vi: `content/*.yml`, `content/tickets/**`, `src/i18n/vi.ts`, `src/i18n/en.ts`.
Tài liệu này chỉ **đề xuất**. Nó không sửa file nào khác. Số dòng ở mục 3 lấy ở HEAD trên; một agent khác đang sửa nội dung, nên dò lại dòng trước khi sửa.

---

## 1. Quy tắc

1. **Giữ tiếng Anh** khi:
   - đó là từ khóa SQL, tên hàm hoặc tên node của Postgres: `JOIN`, `GROUP BY`, `COALESCE`, `Seq Scan`;
   - đó là viết tắt nghề nghiệp: CTE, KPI, TEU, FCL, ETD, B/L, HBL;
   - người làm nghề ở Việt Nam thường nói tiếng Anh và chưa có từ Việt ổn định: booking, container, claim, forwarder, alias, Sandbox, anti-join, self-join, node.
2. **Dịch** khi có từ Việt chuẩn và đã quen dùng: truy vấn, truy vấn con, bảng, dòng, cột, khóa chính, khóa ngoại, kết quả, kế hoạch thực thi, chỉ mục, hàm cửa sổ, làm sạch dữ liệu, vận đơn, tờ khai hải quan, luồng xanh/vàng/đỏ.
3. **Chú thích lần đầu** viết `từ Việt (English)`, ví dụ "kế hoạch thực thi (execution plan)", "chỉ mục (index)", "phí lưu container quá hạn (D&D)". Mỗi ticket hoặc thẻ kỹ năng chú thích một lần, sau đó chỉ dùng từ Việt. Bản EN không bao giờ chú thích ngược sang tiếng Việt.
4. **Viết hoa:**
   - Từ khóa SQL viết HOA khi nói về cú pháp (`LEFT JOIN`, `HAVING`).
   - Khi nói về khái niệm, VI dùng từ Việt ("nối bảng", "lọc nhóm"); EN viết thường (inner join, left join, window function, running total).
   - Viết tắt giữ nguyên hoa (CTE, TEU, D&D). booking, container, claim viết thường giữa câu.
5. **Không bao giờ dịch** những gì nằm trong code span, SQL, tên bảng/cột, giá trị dữ liệu (`'EXPORT'`), thông báo lỗi gốc của Postgres, tên người và tên phòng ban (CLAUDE.md). Code span phải giống hệt nhau giữa VI và EN (`tests/content.test.ts`).
6. **EN không có dấu tiếng Việt**, ngoài code span. Áp cho ticket, `columns:` và `term`/`en` của `glossary.yml` (`tests/content.test.ts`, `tests/glossary.test.ts`).
7. **Hai giọng văn:**
   - Thân đề, `## Task` và đề bước boss là lời đồng nghiệp nói chuyện nghiệp vụ. Ở đây không có backtick, không có từ khóa SQL viết hoa, mã trạng thái hay tên cột snake_case (regex `SQLISH`). Vì vậy dùng từ thường như "ghép", "gom", "đối soát"; "join" viết thường thì qua được test nhưng nên tránh.
   - Gợi ý, Example, thẻ kỹ năng, `reflect`/`wrong` và UI là giọng dạy SQL: dùng đúng bảng thuật ngữ ở mục 2.
8. **Không dùng giọng game** "boss", "sự cố" (L22, `tests/i18n.test.ts`).
9. Nếu sửa VI thành **giống hệt EN** (ví dụ chỉ còn "EXPLAIN" hay "Sandbox"), phải thêm khóa vào `SAME_OK` trong `tests/i18n.test.ts`. Không đề xuất nào ở mục 3 gây ra trường hợp này.
10. Với "dòng" và "hàng": **dòng** là row; **hàng** chỉ dùng cho hàng hóa (hàng xuất, hàng lẻ). Viblo dùng cả "hàng" lẫn "record" cho row [S3], nhưng game chọn "dòng" để không lẫn với hàng hóa.

---

## 2. Bảng thuật ngữ

Cột "Nguồn" trỏ tới danh sách ở mục 4.
- **✓**: đã mở trang và thấy đúng chữ đó.
- **slug**: chữ đó nằm trong tiêu đề hoặc URL của trang.
- **tìm**: chỉ thấy trong kết quả tìm kiếm, chưa mở được trang.
- **—**: không tìm được nguồn tiếng Việt; đây là lựa chọn diễn đạt của nhóm.

### 2.1 Thẻ kỹ năng (`content/skills.yml`, nhãn người chơi thấy)

Mẫu nhãn VI: **cụm từ Việt + (từ khóa hoặc thuật ngữ EN)**, như các nhãn đang đúng mẫu: "CTE (WITH)", "Gộp danh sách (UNION)". Nhãn EN giữ nguyên.

| id | EN (giữ) | VI hiện tại | VI đề xuất | Ghi chú |
|---|---|---|---|---|
| select | Select columns | Chọn cột | giữ | |
| where | Filter rows | Lọc dòng | giữ | |
| order_by | Sort with a tie-breaker | Sắp xếp theo nhiều tiêu chí | giữ | xem dòng "tie-breaker" ở 2.2 |
| limit | Top N | Lấy top N | giữ | "top N" quen dùng |
| aggregate | COUNT/SUM/AVG/MIN/MAX, ROUND | (giống EN) | giữ | |
| group_by | Group by | **Nhóm theo chiều** | **Gom nhóm (GROUP BY)** | "chiều" (dimension) dịch sát, khó hiểu; nội dung đã dùng "gom nhóm" |
| having | Filter groups | Lọc nhóm | Lọc nhóm (HAVING) | |
| join | Inner join | Nối 2 bảng | Nối 2 bảng (JOIN) | [S3] giữ JOIN, [S4] "phép nối" |
| multi_join | Multi-table join | Nối nhiều bảng | giữ | |
| left_join | Left join | Giữ dòng không khớp | Giữ dòng không khớp (LEFT JOIN) | |
| anti_join | Anti-join | Tìm cái "không có" | Tìm dòng không có cặp (anti-join) | anti-join không có từ Việt |
| date_math | Date arithmetic | Tính trên ngày | giữ | |
| date_bucket | Group by day, week or month | Gom theo ngày, tuần, tháng | giữ | |
| null_logic | Missing values (NULL) | Giá trị trống (NULL) | giữ | |
| case_when | Classify with CASE | Phân loại bằng CASE | giữ | |
| conditional_agg | Conditional aggregates | Đếm có điều kiện | giữ | |
| coalesce | Fill in missing values | Thay giá trị trống | Thay giá trị trống (COALESCE) | |
| self_join | Self-join | Nối bảng với chính nó | Nối bảng với chính nó (self-join) | [S3] giữ SELF JOIN |
| string_fn | String functions | Hàm chuỗi | giữ | |
| pattern_match | Pattern matching | Tìm theo mẫu chữ | Tìm theo mẫu chữ (LIKE, ILIKE) | |
| distinct | Distinct values | Đếm giá trị khác nhau | Giá trị khác nhau (DISTINCT) | thẻ dạy cả `SELECT DISTINCT`, không chỉ đếm |
| cast | Casts and decimal division | Ép kiểu, chia lấy số lẻ | Ép kiểu, chia ra số thập phân | "số lẻ" mơ hồ (lẻ = odd) |
| scalar_subquery | Scalar subquery | Truy vấn con trả một giá trị | giữ | [S4] "truy vấn con" |
| in_subquery | IN with a subquery | IN với truy vấn con | giữ | |
| exists | EXISTS and NOT EXISTS | EXISTS và NOT EXISTS | giữ | |
| correlated_value | Correlated lookup | Tra giá trị theo từng dòng | Tra giá trị theo từng dòng (truy vấn con tương quan) | |
| cte | CTE (WITH) | CTE (WITH) | giữ | [S4] |
| multi_cte | Chained CTEs | Nhiều CTE nối tiếp | giữ | |
| distinct_on | Latest row per group (DISTINCT ON) | Dòng mới nhất mỗi nhóm (DISTINCT ON) | giữ | |
| union | Combine lists (UNION) | Gộp danh sách (UNION) | giữ | |
| except | Difference and intersection (EXCEPT, INTERSECT) | Hiệu và giao (EXCEPT, INTERSECT) | giữ | |
| full_join | Two-sided reconciliation (FULL JOIN) | **Đối chiếu** hai phía (FULL JOIN) | **Đối soát** hai phía (FULL JOIN) | EN là reconciliation, nên VI dùng "đối soát", khớp tên chương 9 |
| window_rank | Ranking within groups (RANK, ROW_NUMBER) | Xếp hạng trong nhóm (RANK, ROW_NUMBER) | giữ | |
| window_lag | Compare with the previous row (LAG, LEAD) | So với dòng trước (LAG, LEAD) | giữ | |
| window_agg | Running totals (SUM OVER) | Cộng dồn trong nhóm (SUM OVER) | giữ | [S1] "tổng lũy kế (running total)" |
| explain_read | Reading an execution plan (EXPLAIN) | Đọc kế hoạch thực thi (EXPLAIN) | giữ | [S2] |
| sargable | Index-friendly conditions | Điều kiện dùng được chỉ mục | giữ; ghi "(sargable)" một lần trong `when`/`trap` | [S12] |
| index_design | Designing an index | Thiết kế chỉ mục | giữ | |

### 2.2 SQL và cơ sở dữ liệu

| Khái niệm | EN dùng | VI dùng | Chú thích lần đầu | Nguồn | Ghi chú |
|---|---|---|---|---|---|
| query | query | **truy vấn**; một câu lệnh cụ thể: "câu SQL", "câu lệnh" | | [S4] ✓ "truy vấn" | UI đang trộn "query" và "truy vấn". Thống nhất "truy vấn" (mục 3, nhóm C). Đồng nghiệp nói "query" trong lời thoại thì vẫn được |
| outer / main query | outer query, main query | câu ngoài, câu chính | | — | đã nhất quán |
| result set | result | kết quả; khi cần nhấn: tập kết quả | | [S4] ✓ "tập kết quả" | |
| row | row | dòng | | [S3] ✓ dùng "hàng"/"record" | quy tắc 10 |
| column | column | cột | | [S3] ✓ | |
| table | table | bảng | | [S3] ✓ | |
| schema | schema | trên UI: "cấu trúc dữ liệu"; khi nói schema của Postgres: giữ "schema" | | — | trang Dữ liệu đã dùng "Cấu trúc dữ liệu" |
| database | database | database (đang nhất quán trên UI) | cơ sở dữ liệu (database) nếu ở văn bản trang trọng | — | Có thể đổi thành "cơ sở dữ liệu", nhưng UI dùng "database" ở cả 14 chỗ và người làm nghề cũng nói vậy; không đổi |
| primary key | primary key | khóa chính | | [S14] slug | |
| foreign key | foreign key | khóa ngoại | | [S14] slug | |
| alias | alias | alias | | — | "bí danh" hầu như không ai dùng |
| join (khái niệm) | join | nối bảng, phép nối; **không dùng "ghép"** ở giọng dạy SQL | | [S4] ✓ "phép nối"; [S3] ✓ giữ JOIN | "ghép" chỉ dùng ở giọng nghiệp vụ (quy tắc 7) |
| inner join | inner join | JOIN thường / inner join | | [S3] ✓ | |
| left join | left join | LEFT JOIN | | [S3] ✓ | |
| full join | full join | FULL JOIN | | [S3] ✓ | |
| anti-join | anti-join | anti-join | "tìm dòng không có cặp" | — | |
| self-join | self-join | nối bảng với chính nó | (self-join) | [S3] ✓ | |
| aggregate function | aggregate (function) | **hàm gộp** | hàm gộp (COUNT, SUM…) | [S1] ✓ "hàm thống kê" | Sách và blog Việt cũng hay dùng "hàm tổng hợp", nhưng chưa xác minh được ở nguồn đã mở. Game đã dùng "hàm gộp" nhất quán, nên giữ |
| GROUP BY | group, grouping | gom nhóm, nhóm | | [S1] ✓ "gộp nhiều dòng lại thành một" | |
| HAVING | filter groups | lọc nhóm | | — | |
| subquery | subquery | truy vấn con | | [S4] ✓ | |
| scalar subquery | scalar subquery | truy vấn con trả một giá trị | | — | "vô hướng" chỉ dùng trong tài liệu nội bộ |
| correlated subquery | correlated subquery | truy vấn con tương quan | (correlated subquery) | tìm | Dịch sát, chưa có nguồn tiếng Việt đã mở |
| CTE | CTE | CTE | CTE (bước tính có tên, viết bằng WITH) | [S4] ✓ "tập kết quả tạm thời, có tên" | **Không gọi là "bảng tạm"**: [S4] dùng "bảng tạm" cho temporary table |
| window function | window function | **hàm cửa sổ** | hàm cửa sổ (window function) | [S1] ✓ "Window Functions (Hàm cửa sổ)" | |
| partition | partition | nhóm (của PARTITION BY) | | [S1] ✓ "Chia nhóm cửa sổ" | "phân vùng" dành cho bảng phân vùng (table partitioning), như ở `node.append` |
| window frame | window frame | khung cửa sổ | (window frame) | [S1] ✓ "khung tính toán (Frame)"; [S22] slug | |
| running total | running total | tổng lũy kế; động từ "cộng dồn" | | [S1] ✓ "Tổng Lũy kế (Running Total)" | **không dùng "tổng chạy"** |
| moving average | moving average | trung bình trượt | | [S17] ✓ (bản EN) | |
| rank | rank | hạng, xếp hạng | | [S1] ✓ "Hàm Xếp hạng (Ranking)" | |
| RANK / DENSE_RANK | rank (skips) / dense rank | RANK: nhảy hạng (1, 1, 3); DENSE_RANK: không nhảy hạng (1, 1, 2) | | [S1] ✓ "không bỏ qua thứ hạng (1, 1, 2, 3)" | |
| ties | ties, equal values | dòng bằng nhau, trùng giá trị; **không dùng "hòa"** ("cắt hòa", "phá hòa") | | [S1] ✓ "bằng điểm nhau", "giá trị trùng nhau" | |
| tie-breaker | tie-breaker | **tiêu chí sắp xếp phụ** | | — | Không tìm được nguồn Việt nào cho tie-breaker; [S1] chỉ tả "giá trị trùng nhau". "Tiêu chí sắp xếp phụ" là cách diễn đạt mô tả, dễ hiểu, không phải dịch sát, nên **giữ lựa chọn hiện tại**. Viết đủ cả cụm, không rút thành "tiêu chí phụ" |
| NULL | NULL / missing value | NULL; giải thích: giá trị trống, ô trống | giá trị trống (NULL) | [S5] ✓ "dữ liệu bị thiếu" | "ô trống" là ô trong kết quả, "giá trị trống" là khái niệm |
| CASE | CASE | CASE, "phân loại bằng CASE" | | — | |
| COALESCE | COALESCE | COALESCE, "thay giá trị trống" | | — | |
| cast | cast | ép kiểu | | — | "ép kiểu" là từ quen của giới lập trình Việt |
| DISTINCT | distinct values | giá trị khác nhau | | — | |
| DISTINCT ON | DISTINCT ON | dòng mới nhất mỗi nhóm (DISTINCT ON) | | — | idiom riêng của Postgres |
| UNION / EXCEPT / INTERSECT | union, difference, intersection | gộp danh sách / hiệu / giao; gọi chung: phép tập hợp | | — | |
| reconciliation | reconcile, reconciliation | **đối soát** | | [S15] tìm | "đối chiếu" dùng cho so sánh chung (đối chiếu với thẻ Kết quả); "kiểm tra chéo" dùng cho cross-check (chương 12) |
| execution plan | execution plan, plan | kế hoạch thực thi; viết tắt "kế hoạch" | kế hoạch thực thi (execution plan) | [S2] ✓ "kế hoạch thực thi (Execution Plan)" | |
| EXPLAIN | EXPLAIN | EXPLAIN | | [S2] ✓ | |
| index | index | **chỉ mục** | chỉ mục (index) | [S12] slug, [S2] ✓ giữ "Index" | Người làm nghề hay nói "index", nhưng nội dung (75 chỗ) và thẻ kỹ năng đã dùng "chỉ mục". Chọn "chỉ mục" và chú thích (index) lần đầu. Nhóm D của mục 3 sửa các chỗ UI còn ghi "index". **Cần user chốt** (mục 5) |
| sargable | sargable | điều kiện dùng được chỉ mục | (sargable) | [S12] tìm | |
| sequential scan | Seq Scan | đọc cả bảng (Seq Scan) | | [S2] ✓ "Quét tuần tự… (Seq Scan)" | Tên node giữ tiếng Anh. "đọc cả bảng" và "đọc toàn bộ bảng" đều được |
| index scan | Index Scan | đọc qua chỉ mục (Index Scan) | | [S2] ✓ | |
| node | node | node | | [S2] ✓ "Node" | |
| cost | cost | chi phí (cost), chi phí ước tính | | [S2] ✓ "điểm chi phí trừu tượng (Cost Units)" | |
| estimated / actual rows | estimated / actual | ước tính / thực tế | | [S2] ✓ "ước lượng", "thực tế" | |
| hash table | hash table | bảng băm | | — | |
| sandbox | Sandbox | Sandbox | | — | tên chế độ; đã có trong SAME_OK |
| ticket (đơn vị bài) | task (UI), ticket (code/docs) | **việc** (UI); "ticket" chỉ trong code và docs | | — | UI đang dùng cả "việc", "bài" và "ticket" (mục 3, nhóm F). "bài" dùng cho luyện tập/ôn |

### 2.3 Phân tích dữ liệu (DA)

| Khái niệm | EN dùng | VI dùng | Chú thích lần đầu | Nguồn | Ghi chú |
|---|---|---|---|---|---|
| data analyst | data analyst, DA | Data Analyst, DA | | — | chức danh giữ tiếng Anh (`chapters.yml` `career`) |
| dataset | dataset | tập dữ liệu | | [S5] ✓ "các tập dữ liệu" | |
| dashboard | dashboard | trên UI: **Bảng điều hành** (L48); trong lời thoại DA: dashboard | | — | L48 đã chốt nhãn UI |
| KPI | KPI | KPI | KPI (chỉ số hiệu quả chính) | — | |
| chart | chart | biểu đồ | | [S18] | |
| bar / column chart | bar chart | biểu đồ cột | | [S18] tìm | |
| line chart | line chart | biểu đồ đường | | [S18] tìm | |
| pie chart | pie chart | biểu đồ tròn | | [S18] tìm | |
| scatter plot | scatter plot | biểu đồ phân tán | | [S18] tìm "biểu đồ xy (phân tán)" | |
| data cleaning | data cleaning | làm sạch dữ liệu | | [S5] ✓ "Làm sạch dữ liệu" | tên chương 6 đã đúng |
| outlier | outlier | giá trị ngoại lai | | [S5] ✓ "Dữ liệu ngoại lai" | "tăng đột biến" (ch12-03) là lời nghiệp vụ, không phải thuật ngữ |
| duplicate / deduplication | duplicate, dedupe | bản trùng, dữ liệu trùng lặp; loại bỏ trùng lặp | | [S5] ✓ "Dữ liệu trùng lặp", "Loại bỏ thông tin trùng lặp" | |
| missing data | missing value | dữ liệu thiếu, giá trị trống | | [S5] ✓ "Dữ liệu bị thiếu" | |
| granularity / grain | grain | độ chi tiết (mỗi dòng là gì) | độ chi tiết (grain) | [S20] (EN) | Không tìm được nguồn Việt; DA Việt thường nói "grain" |
| normalise (text) | normalise | chuẩn hóa | | — | |
| cross-check | cross-check | kiểm tra chéo | | — | `chapters.yml` ch12 đã đúng |
| hypothesis | hypothesis | giả thuyết | | — | |
| period-over-period | month over month | so với kỳ trước, tháng này so với tháng trước | | — | |
| gross margin | gross margin | **biên lợi nhuận gộp** | | — | ch12 đang dùng "biên lãi gộp" bên cạnh "biên lợi nhuận" (mục 3, nhóm G) |
| receivables / payables | receivables, payables (AR/AP) | công nợ phải thu / phải trả | | [S15] tìm | |
| exchange rate | exchange rate | tỷ giá | | — | |

### 2.4 Giao nhận vận tải (freight)

| Khái niệm | EN dùng | VI dùng | Chú thích lần đầu | Nguồn | Ghi chú |
|---|---|---|---|---|---|
| freight forwarder | forwarder | công ty giao nhận; trong lời thoại: forwarder | công ty giao nhận (forwarder) | [S7] ✓ "công ty giao nhận vận tải (Forwarder)" | `vi.ts` `mode.notebookDesc` đang ghi "thuật ngữ freight" (mục 3) |
| carrier | carrier | hãng tàu (SEA), hãng bay (AIR); gọi chung: hãng vận chuyển | | [S7] ✓ "hãng tàu (Carrier)" | |
| shipper / consignee | shipper / consignee | người gửi hàng / người nhận hàng | (shipper) / (consignee) | [S7] ✓ | |
| booking | booking | **booking** (danh từ); hành động và ngày: **đặt chỗ**, "ngày đặt chỗ" | | — | "ngày booking" còn ở vài gợi ý (mục 3, nhóm H) |
| shipment | shipment | lô hàng, lô | | — | |
| bill of lading | bill of lading, B/L | vận đơn (B/L) | | [S7] ✓ | |
| MBL | master bill (MBL) | vận đơn chủ (MBL) | | [S7] ✓ "vận đơn chủ"; [S10] slug | |
| HBL | house bill (HBL) | vận đơn nhà (HBL) | | [S7] ✓ gọi là "vận đơn thứ cấp" | Văn bản pháp lý dùng "vận đơn thứ cấp"; trong nghề "vận đơn nhà" quen hơn. Giữ "vận đơn nhà", có thể ghi "(vận đơn thứ cấp)" trong `glossary.yml` |
| air waybill | air waybill (AWB) | vận đơn hàng không (AWB) | | — | ch6-05 có dùng |
| ETD / ETA | ETD / ETA | giữ; ngày dự kiến khởi hành / dự kiến đến | | — | `glossary.yml` đúng |
| ATD / ATA | ATD / ATA | giữ; ngày khởi hành / đến thực tế | | — | |
| POL / POD | POL / POD | cảng xếp hàng / cảng dỡ hàng | | — | |
| FCL / LCL | FCL / LCL | hàng nguyên container (FCL) / hàng lẻ (LCL) | | [S7] ✓ "FCL - Full Container Load" | prompt được phép dùng FCL/LCL (`SQLISH`) |
| CFS | CFS | kho CFS (gom và chia hàng lẻ) | | [S8] ✓ "phí CFS" | |
| TEU / FEU | TEU / FEU | giữ | | — | |
| container types | 20GP, 40HC, reefer | giữ mã; reefer: container lạnh | | — | |
| gross weight | gross weight | trọng lượng cả bì; nhãn cột: "Trọng lượng cả bì (kg)" | | — | ch1-03 ghi "Tổng trọng lượng (kg)": vẫn đúng nghĩa, chỉ khác chữ (tùy chọn) |
| CBM | CBM | CBM (mét khối) | | — | |
| transit time | transit time | thời gian vận chuyển | | — | |
| Incoterms | Incoterms | Incoterms (điều kiện giao hàng); mã giữ nguyên | | [S16] tìm | EXW "Giao tại xưởng", FCA "Giao cho người chuyên chở", FOB "Giao lên tàu", CFR "Tiền hàng và cước", CIF "Tiền hàng, bảo hiểm và cước", CPT/CIP "Cước trả tới / Cước và bảo hiểm trả tới", DAP "Giao tại nơi đến". `glossary.yml` đã theo đúng tên này. Chưa mở được bản dịch chính thức của ICC/VCCI (403) |
| D&D | D&D (demurrage and detention) | phí lưu container quá hạn (D&D); trong nghề: "phí DEM/DET" | phí lưu container quá hạn (D&D) | [S6] ✓ | |
| demurrage | demurrage (DEM) | DEM: phí lưu container tại bãi cảng | | [S6] ✓ "phí lưu container tại bãi cảng" | |
| detention | detention (DET) | DET: phí lưu container ngoài cảng (vỏ container giữ tại kho chủ hàng) | | [S6] ✓ "giữ vỏ container rỗng tại kho riêng" | |
| storage | storage | phí lưu bãi (cảng thu) | | [S6] ✓ "Phí Storage"; [S19b] slug DHL "phí lưu bãi, lưu container và lưu kho" | Khác D&D: cảng thu, không phải hãng tàu. "phí lưu bãi, lưu container" = storage + D&D |
| free time | free time | thời gian miễn phí | (free time) | [S6] ✓ "'thời gian miễn phí' (Free Time)" | |
| empty return | empty return | trả rỗng (trả vỏ container) | | — | |
| BAF | BAF | phụ phí nhiên liệu (BAF) | | [S8] ✓ "Phụ phí nhiên liệu" | **không có trong nội dung**; chỉ ghi để dùng sau |
| GRI | GRI | tăng cước chung (GRI) | | [S11] slug "tăng theo định kỳ (General Rate Increase)" | không có trong nội dung |
| THC | THC | phí xếp dỡ tại cảng (THC) | | [S8] ✓ "Phí bốc xếp container tại cảng" | không có trong nội dung |
| surcharge | surcharge | phụ phí | | [S8] ✓ | |
| customs declaration | customs declaration | tờ khai hải quan, tờ khai | | [S9] ✓ "Tờ khai hải quan" | |
| amended declaration | amendment | tờ khai sửa | | — | Thuật ngữ thủ tục là "khai sửa đổi, bổ sung". Chưa xác minh nguồn, nên giữ "tờ khai sửa" |
| customs lanes | green / yellow / red lane | luồng xanh / vàng / đỏ; việc chia: phân luồng | | [S9] ✓ | vàng = kiểm tra hồ sơ, đỏ = kiểm tra thực tế hàng hóa |
| physical inspection | physical inspection | kiểm hóa | | [S9] ✓ "thủ tục kiểm hóa" | |
| customs clearance | clearance | thông quan | | [S9] ✓ | |
| HS code | HS code | mã HS | | — | |
| claim | claim | claim (khiếu nại hàng hư, thiếu, trễ) | | — | ch12-04 đã chú thích |
| quote / buy / sell rate | quote, buy rate, sell rate | báo giá, giá mua, giá bán | | — | |

---

## 3. Danh sách chỗ lệch (audit)

Tổng **67 mục** trong 8 nhóm A–H; một mục có thể gồm nhiều dòng cùng loại. Ký hiệu cột "Ảnh hưởng":
- **CS**: đụng code span (phải giống hệt VI/EN). **Không đề xuất nào đổi code span**; các câu có code span chỉ đổi phần chữ ngoài backtick.
- **SQLISH**: nằm trong thân đề, Task hoặc đề bước, nên phải tránh từ khóa viết hoa, mã trạng thái và tên snake_case. Mọi đề xuất ở các chỗ này đều đã qua quy tắc đó.
- **i18n**: chuỗi trong `vi.ts`/`en.ts`. Placeholder `{x}` phải giữ nguyên. Không đề xuất nào làm VI giống hệt EN, nên không cần sửa `SAME_OK`.
- **test-title**: chuỗi chỉ xuất hiện trong tên test, không nằm trong phép kiểm.

Đã grep `tests/` và `src/` (ngoài `src/i18n/`) cho mọi chuỗi đề xuất đổi. Chỉ "Ticket tiếp theo" có trong tên test `tests/coach.test.ts:52`, và test đó kiểm selector, không kiểm chữ.

### A. `content/skills.yml` (10 mục)

| # | File:dòng | Hiện tại | Đề xuất | Ảnh hưởng |
|---|---|---|---|---|
| A1 | skills.yml:44 | `label.vi` "Nhóm theo chiều" | "Gom nhóm (GROUP BY)" | — |
| A2 | skills.yml:51 | "Lọc nhóm" | "Lọc nhóm (HAVING)" | — |
| A3 | skills.yml:58 | "Nối 2 bảng" | "Nối 2 bảng (JOIN)" | — |
| A4 | skills.yml:72 | "Giữ dòng không khớp" | "Giữ dòng không khớp (LEFT JOIN)" | — |
| A5 | skills.yml:79 | "Tìm cái “không có”" | "Tìm dòng không có cặp (anti-join)" | — |
| A6 | skills.yml:121, 128, 142, 149 | "Thay giá trị trống" · "Nối bảng với chính nó" · "Tìm theo mẫu chữ" · "Đếm giá trị khác nhau" | thêm "(COALESCE)" · "(self-join)" · "(LIKE, ILIKE)" · đổi thành "Giá trị khác nhau (DISTINCT)" | — |
| A7 | skills.yml:156 | "Ép kiểu, chia lấy số lẻ" | "Ép kiểu, chia ra số thập phân" | — |
| A8 | skills.yml:184 | "Tra giá trị theo từng dòng" | "Tra giá trị theo từng dòng (truy vấn con tương quan)" | — |
| A9 | skills.yml:226, 228 | label "Đối chiếu hai phía (FULL JOIN)"; when "Đối chiếu hai sổ mà…" | "Đối soát hai phía (FULL JOIN)"; "Đối soát hai sổ mà…" | — |
| A10 | skills.yml:236 | trap "ROW_NUMBER cắt hòa tùy ý" | "ROW_NUMBER xếp các dòng bằng nhau theo thứ tự tùy ý" | — |

### B. `content/chapters.yml`, `content/glossary.yml` (4 mục)

| # | File:dòng | Hiện tại | Đề xuất | Ảnh hưởng |
|---|---|---|---|---|
| B1 | chapters.yml:116 | "Đối chiếu hai sổ, thấy cả dòng chỉ có ở một bên" | "Đối soát hai sổ, thấy cả dòng chỉ có ở một bên" | — |
| B2 | glossary.yml:131–138 | term "Demurrage" / "Detention"; vi "Phí lưu container trong cảng…" / "Phí giữ container bên ngoài cảng…" | term "DEM (Demurrage)" / "DET (Detention)"; vi "Phí lưu container tại bãi cảng quá số ngày miễn phí." / "Phí lưu container ngoài cảng (vỏ giữ tại kho chủ hàng) quá số ngày miễn phí." | `term` phải duy nhất và không dấu (`tests/glossary.test.ts`) |
| B3 | glossary.yml (thêm) | thiếu các mục nội dung đang dùng | thêm `D&D`, `Storage` ("phí lưu bãi, do cảng thu"), `Claim`, `Reefer`, `Customs clearance` (thông quan / kiểm hóa) | như B2. Nếu cột tương ứng đã có trong DB thì điền `columns` |
| B4 | glossary.yml:1–2 (ghi chú) | "Thuật ngữ của chương sau để [] cho tới khi có bảng" | Ghi chú này đã lỗi thời: HBL/MBL/D&D đã có bảng (`house_bills`, `master_bills`, `free_time_terms`), nên điền `columns` | ngoài phạm vi thuật ngữ, chỉ ghi lại |

### C. "query" → "truy vấn" trong `src/i18n/vi.ts` (11 mục, i18n)

| # | Khóa (vi.ts:dòng) | Hiện tại | Đề xuất |
|---|---|---|---|
| C1 | `coach.brief` (245) | "…để thử query có sẵn." | "…để thử câu SQL có sẵn." |
| C2 | `work.queued` (257) | "…Query sẽ chạy ngay khi sẵn sàng." | "…Truy vấn sẽ chạy ngay khi sẵn sàng." |
| C3 | `work.runFailed` (258) | "Query lỗi, xem chi tiết…" | "Truy vấn lỗi, xem chi tiết…" |
| C4 | `res.runFirst` (270) | "Chạy query ({mod}+Enter)…" | "Chạy truy vấn ({mod}+Enter)…" |
| C5 | `res.empty` (273) | "Query chạy được nhưng ra 0 dòng…" | "Truy vấn chạy được nhưng ra 0 dòng…" |
| C6 | `grade.columns` (278) | "…query của bạn trả về {actual} cột." | "…truy vấn của bạn trả về {actual} cột." |
| C7 | `err.timeout` (284) | "Query chạy quá {s} giây…" | "Truy vấn chạy quá {s} giây…" |
| C8 | `err.restart` (285) | "…nên query bị hủy." | "…nên truy vấn bị hủy." |
| C9 | `steps.withUnion` (369) | "Query có WITH hoặc UNION…" | "Truy vấn có WITH hoặc UNION…" |
| C10 | `steps.window` (370) | "Query có window function — xem tab EXPLAIN." | "Truy vấn có hàm cửa sổ — xem tab EXPLAIN." |
| C11 | `erd.bold` (431) | "…đang được dùng trong query." | "…đang được dùng trong truy vấn." |

### D. "index" → "chỉ mục" trong `vi.ts` (5 mục, i18n; chỉ làm nếu user chốt "chỉ mục", xem mục 5)

| # | Khóa (dòng) | Hiện tại | Đề xuất |
|---|---|---|---|
| D1 | `plan.index` (354) | "Dùng index: {v}" | "Dùng chỉ mục: {v}" |
| D2 | `plan.indexCond` (355) | "Điều kiện index: {v}" | "Điều kiện chỉ mục: {v}" |
| D3 | `node.indexScan` (396) | "Dùng index để nhảy thẳng…" | "Dùng chỉ mục để nhảy thẳng…" |
| D4 | `node.indexOnlyScan` (397) | "…ngay trong index…" | "…ngay trong chỉ mục…" |
| D5 | `node.bitmapIndexScan` (398) | "Dùng index để đánh dấu…" | "Dùng chỉ mục để đánh dấu…" |

### E. "ghép" / "join" → "nối" ở giọng dạy SQL (17 mục)

Thân đề và Task được giữ "ghép" (quy tắc 7), nên không có trong danh sách dưới. "Ghép cặp" ở ch12-05 nghĩa là bắt cặp bản trùng, không phải join, nên cũng giữ.

| # | File:dòng | Hiện tại | Đề xuất | Ảnh hưởng |
|---|---|---|---|---|
| E1 | vi.ts:356 `plan.hashCond` | "Điều kiện ghép: {v}" | "Điều kiện nối: {v}" | i18n |
| E2 | vi.ts:357 `plan.joinFilter` | "Lọc khi ghép: {v}" | "Lọc khi nối: {v}" | i18n |
| E3 | vi.ts:387 `steps.help.from` | "…ghép chúng theo điều kiện JOIN." | "…nối chúng theo điều kiện JOIN." | i18n |
| E4 | vi.ts:403 `node.mergeJoin` | "Ghép hai đầu vào… theo khóa join" | "Nối hai đầu vào… theo khóa nối" | i18n |
| E5 | ch3-01:24, 25 (Hints) | "cần ghép mỗi lô…"; "Ghép bằng `JOIN …`" | "cần nối mỗi lô…"; "Nối bằng `JOIN …`" | CS: giữ nguyên span |
| E6 | ch3-03:22, 23 (Hints) | "không ghép được với lô nào"; "`customers` ghép với `shipments`" | "không nối được…"; "`customers` nối với `shipments`" | CS: giữ nguyên span |
| E7 | ch3-04:22 (Hints) | "Ghép từng khách với nhân viên đó" | "Nối từng khách với nhân viên đó" | — |
| E8 | ch5-04:39 (Hints) | "bạn ghép sổ tờ khai với chính nó" | "bạn nối sổ tờ khai với chính nó" | — |
| E9 | ch5-06:67 (Hints) | "ghép sổ tờ khai với chính nó" | "nối sổ tờ khai với chính nó" | — |
| E10 | ch6-05:32 (Hints) | "Ghép lô hàng với danh mục đó…" | "Nối lô hàng với danh mục đó…" | — |
| E11 | ch6-06:22 (reflect) và :68 (Hints) | "ghép danh mục khách với chính nó" | "nối danh mục khách với chính nó" | — |
| E12 | ch7-03:25 (reflect) | "Điều kiện ghép là so ngày…" | "Điều kiện nối là so ngày…" | — |
| E13 | ch8-01:28 (reflect why) | "Mỗi dòng thanh toán ghép với hóa đơn…" | "Mỗi dòng thanh toán nối với hóa đơn…" | — |
| E14 | ch8-04:34 (wrong), :49, :50 (Hints) | "Bạn chỉ ghép tỷ giá…"; "Mỗi hóa đơn ghép với…"; "Ghép `r.currency = …`" | "nối" ở cả ba chỗ | CS: giữ nguyên span |
| E15 | ch9-04:44, 45 (Hints) | "rồi ghép theo lô…"; "Ghép `…`" | "rồi nối theo lô…"; "Nối `…`" | CS: giữ nguyên span |
| E16 | ch12-04:40 (Hints) | "rồi ghép vào danh mục hãng" | "rồi nối vào danh mục hãng" | — |
| E17 | ch11-05:22 (reflect) | "rồi ghép bằng bảng băm" | "rồi nối bằng bảng băm (Hash Join)" | — |

### F. "ticket" → "việc" / "task" trên UI (9 khóa i18n + 1 mục câu trong ticket)

| # | Khóa | VI hiện tại → đề xuất | EN hiện tại → đề xuất |
|---|---|---|---|
| F1 | `area.ticket` (en.ts:96) | "Đề bài" → giữ | "Ticket brief" → "Task brief" |
| F2 | `content.loading` (vi 204 / en 207) | "Đang tải nội dung các ticket…" → "Đang tải nội dung các việc…" | "Loading the tickets…" → "Loading the tasks…" |
| F3 | `content.failed` (205 / 208) | "nội dung ticket" → "nội dung các việc" | "the tickets" → "the tasks" |
| F4 | `inbox.empty` (210 / 213) | "mọi ticket hiện có" → "mọi việc hiện có" | "every ticket available" → "every task available" |
| F5 | `recap.next` (243 / 246) | "Ticket tiếp theo →" → "Việc tiếp theo →" (giống `nav.continueNext`) | "Next ticket →" → "Next task →" (test-title `coach.test.ts:52`) |
| F6 | `recap.allDone` (244 / 247) | "mọi ticket" → "mọi việc" | "every ticket" → "every task" |
| F7 | `coach.recap` (247 / 250) | "Mỗi ticket xong…"; "Bấm \"Ticket tiếp theo\"" → "Mỗi việc xong…"; "Bấm \"Việc tiếp theo\"" | "Each solved ticket…"; "\"Next ticket\"" → "Each solved task…"; "\"Next task\"" |
| F8 | `coach.hints` (248 / 251) | "XP của ticket" → "XP của việc" | "the ticket XP" → "the task's XP" |
| F9 | `work.contentBug` (263 / 266) | "Lỗi nội dung ticket" → "Lỗi nội dung của việc" | "Ticket content error" → "Task content error" |

Ba câu trong ticket còn nói "ticket" với người chơi: ch2-02:24 "giống ticket trước", ch3-05:18 "Ở ticket …", ch3-05:74 "như ticket về khách…". Đổi thành "việc trước", "Ở việc …", "như việc về khách…". EN tương ứng ở ch3-05 ("ticket") đổi thành "task". Không đụng code span.

### G. Biên lợi nhuận gộp (2 mục, 9 dòng)

| # | File:dòng | Hiện tại | Đề xuất | Ảnh hưởng |
|---|---|---|---|---|
| G1 | ch12-01:17, 18 (`columns`), :21 (reflect), :33 (thân đề) | "Biên lãi gộp quý 2/3 (%)", "biên lãi gộp" | "Biên lợi nhuận gộp quý 2/3 (%)", "biên lợi nhuận gộp" (khớp title ch12-01:4 và `kpis.yml:22`) | :33 là thân đề, nên áp SQLISH: an toàn |
| G2 | ch12-06:14 (`columns`), :34, :36, :37, :64 | "Biên lãi gộp…", "biên lãi gộp" | "Biên lợi nhuận gộp…", "biên lợi nhuận gộp" | đề bước, nên áp SQLISH: an toàn |

### H. Lẻ (8 mục)

| # | File:dòng | Hiện tại | Đề xuất | Ảnh hưởng |
|---|---|---|---|---|
| H1 | ch1-03:27 (Hints) | "(tiêu chí phụ)" | "(tiêu chí sắp xếp phụ)" — khớp `skills.yml:26` | — |
| H2 | ch1-03:27, 28 (Hints); ch3-01:21; ch6-03:35 | "ngày booking" | "ngày đặt chỗ" (đa số nội dung đã dùng) | :28 có code span `booking_date`: giữ nguyên |
| H3 | ch8-02:43 (reflect) | vi "Mỗi CTE là một bảng tạm có tên"; en "Each CTE is a named temporary table" | vi "Mỗi CTE là một kết quả tạm có tên"; en "Each CTE is a named temporary result" | Đổi ở cả VI và EN. Đây là đáp án đúng của reflect, nên giữ nguyên `answer` |
| H4 | ch10-04:45 (Hints) | "Cột cộng dồn là một tổng chạy trong từng khách" | "Cột cộng dồn là một tổng lũy kế trong từng khách" | — |
| H5 | ch10-03:62 (EN) | "storage and detention fees" (VI :35 "phí lưu bãi, lưu container") | "storage and container charges", giống ch4-03:53 | — |
| H6 | vi.ts:46 `mode.notebookDesc` | "Thẻ kỹ năng SQL và thuật ngữ freight…" | "Thẻ kỹ năng SQL và thuật ngữ giao nhận…" | i18n |
| H7 | vi.ts:351 `explain.intro` | "Giai đoạn Optimize chọn kế hoạch…; Execute chạy hết…" | "Giai đoạn Tối ưu chọn kế hoạch…; Thực thi chạy hết…" (khớp `steps.stage3/4`) | i18n, giữ `{ms}` |
| H8 | vi.ts:318 `sqlerr.labOnly` | "Phòng thí nghiệm chỉ chạy…" | "Bài thử chỉ mục chỉ chạy…" (dịch sát "lab" khó hiểu) | i18n. Tùy chọn |

Đếm: A 10 + B 4 + C 11 + D 5 + E 17 + F 10 + G 2 + H 8 = **67 mục**. Nhóm D phụ thuộc quyết định ở mục 5.

**Đã soát, không lệch:**
- "kế hoạch thực thi", "truy vấn con", "hàm cửa sổ" (trừ C10), "cộng dồn"/"tổng lũy kế" (trừ H4), "luồng xanh/vàng/đỏ", "vận đơn chủ/nhà", "hàng lẻ", "kho CFS", "Bảng điều hành", tên Incoterms trong `glossary.yml`.
- Phía EN ổn: "execution plan", "running total", "tie-breaker", "D&D", "gross margin" và "master/house bill" đều nhất quán.

**Chưa soát:**
- `conclusion` / `conclusion_en` của ticket boss, vì script soát lọc vùng ngôn ngữ chưa tách được phần frontmatter này.
- `content/people.yml`.
- Nên soát tay trước khi áp.

---

## 4. Nguồn

**Đã mở trang (✓):**
- [S1] Viblo, "PostgreSQL bài 45: Window Functions (hàm cửa sổ) và ứng dụng thực chiến": https://viblo.asia/p/postgresql-bai-45-window-functions-ham-cua-so-va-ung-dung-thuc-chien-over-partition-by-row-number-G24B8WvRLz3
- [S2] Viblo, "PostgreSQL bài 25: Đọc và phân tích execution plan bằng EXPLAIN ANALYZE": https://viblo.asia/p/postgresql-bai-25-doc-va-phan-tich-execution-plan-bang-explain-analyze-buffers-verbose-AY4qQOpQ4Pw
- [S3] Viblo, "Bài 2: Tất tần tật những gì về JOIN trong SQL": https://viblo.asia/p/bai-2-basic-tat-tan-tat-nhung-gi-ve-join-trong-sql-obA466q94Kv
- [S4] DataCamp (VI), CTE trong SQL: https://www.datacamp.com/vi/tutorial/cte-sql
- [S5] AWS (VI), Làm sạch dữ liệu là gì: https://aws.amazon.com/vi/what-is/data-cleansing/
- [S6] GHN, DEM DET là gì: https://ghn.vn/blogs/thong-tin-giao-hang/dem-det-la-gi
- [S7] GHN, HBL là gì: https://ghn.vn/blogs/thong-tin-giao-hang/hbl-la-gi
- [S8] SINO Shipping (VI), BAF, CAF, THC: https://www.sino-shipping.com/vi/chi-phi-van-chuyen-tu-trung-quoc/chi-phi-duong-bien/baf-caf-thc-surcharges-explained/
- [S9] ACC Group, Phân luồng hải quan là gì: https://accgroup.vn/phan-luong-hai-quan
- [S17] Microsoft Learn, OVER clause (bản EN; dùng cho "running totals, moving averages"): https://learn.microsoft.com/sql/t-sql/queries/select-over-clause-transact-sql

**Chỉ thấy tiêu đề/URL (slug) hoặc kết quả tìm kiếm (tìm):**
- [S10] Luật Minh Khuê, "So sánh vận đơn chủ và vận đơn thứ cấp": https://luatminhkhue.vn/so-sanh-van-don-chu-va-van-don-thu-cap.aspx
- [S11] Luật Minh Khuê, "Tăng theo định kỳ (General Rate Increase) là gì" (trang trả 403): https://luatminhkhue.vn/tang-theo-dinh-ky-general-rate-increase-la-gi.aspx
- [S12] Viblo, "Sử dụng index trong SQL query": https://viblo.asia/p/su-dung-index-trong-sql-query-1ZnbRlPQR2Xo ; Viblo, "Hiểu index trong SQL Server qua hình ảnh tòa nhà hồ sơ": https://viblo.asia/p/hieu-index-trong-sql-server-qua-hinh-anh-toa-nha-ho-so-lZL9XgjMJQK
- [S13] Viblo, "PostgreSQL bài 15: Subqueries và CTEs": https://viblo.asia/p/postgresql-bai-15-subqueries-va-ctes-with-query-phan-biet-materialized-vs-non-materialized-cte-kY4gDNYxJAe
- [S14] Viblo, "Khác biệt giữa khóa chính và khóa ngoại trong SQL": https://viblo.asia/p/khac-biet-giua-khoa-chinh-va-khoa-ngoai-trong-sql-924lJMdWZPM
- [S15] AZTAX, "Đối soát là gì": https://aztax.com.vn/doi-soat-la-gi/ ; CareerLink, "Reconcile trong kế toán": https://www.careerlink.vn/cam-nang-viec-lam/goc-ky-nang/reconcile-trong-ke-toan-la-gi-va-co-tam-quan-trong-ra-sao
- [S16] DHL (VI), Giải thích về Incoterms: https://www.dhl.com/vn-vi/home/global-forwarding/trung-tam-giang-day-ve-van-chuyen-hang-hoa/giai-thich-ve-incoterms.html ; Thư viện pháp luật, Điều kiện EXW (trang trả 403): https://thuvienphapluat.vn/phap-luat-doanh-nghiep/cau-hoi-thuong-gap/dieu-kien-exw-tai-incoterms-2020-la-gi-4076.html
- [S18] Microsoft Support (VI), Tổng quan về PivotTable và PivotChart: https://support.microsoft.com/vi-VN/Excel/overview-of-pivottables-and-pivotcharts ; FPT Shop, các loại biểu đồ Excel: https://fptshop.com.vn/tin-tuc/danh-gia/cac-loai-bieu-do-excel-184407
- [S19b] DHL (VI), Phí lưu bãi, lưu container và lưu kho (trang hết thời gian chờ khi mở): https://www.dhl.com/vn-vi/home/global-forwarding/trung-tam-giang-day-ve-van-chuyen-hang-hoa/phi-luu-bai-luu-container-va-luu-kho.html
- [S20] Kimball Group, "Declaring the grain" (EN): https://www.kimballgroup.com/2003/03/declaring-the-grain/
- [S22] Viblo, "Trino SQL bài 29: định nghĩa khung tính toán (window frames)": https://viblo.asia/p/trino-sql-bai-hoc-29-window-functions-dinh-nghia-khung-tinh-toan-window-frames-rows-range-k74a9WZA4eO

**Phát hiện khi tìm nguồn:**
- **Microsoft Learn không có bản tiếng Việt cho tài liệu SQL Server.** Các URL `learn.microsoft.com/vi-vn/sql/...` đều trả về bản EN (`locale: en-us`), nên không dùng làm bằng chứng cho cách gọi tiếng Việt.
- **PostgreSQL không có tài liệu tiếng Việt.** Chỉ có bản dịch thông báo lỗi, làm từ 2018 rồi bỏ dở (https://postgresql.org/message-id/90cdfebb-7f95-9166-55ae-a57ad6bac8e1%40postgresql.vn).
- **Nguồn tiếng Việt về SQL chủ yếu là cộng đồng** (Viblo, DataCamp VI).
  - Xu hướng chung: giữ tên tiếng Anh cho từ khóa và cho tên node của kế hoạch thực thi, dịch các khái niệm, và ghi tiếng Anh trong ngoặc ở lần đầu. Bảng ở mục 2 theo đúng xu hướng này.
  - Các trang `guru99.com/vi/…` dịch máy (ví dụ "MySQL Mục lục" cho index), nên không dùng.

---

## 5. Cần user chốt

1. **index hay chỉ mục.**
   - Người làm nghề ở Việt Nam nói "index" ([S2], [S12]).
   - Nội dung game đã dùng "chỉ mục" ở 75 chỗ, thẻ kỹ năng và chương 11 cũng vậy.
   - Đề xuất: giữ "chỉ mục (index)" và làm nhóm D.
   - Nếu chọn "index", phải sửa ngược khoảng 75 chỗ trong nội dung thay vì 5 chỗ trên UI.
2. **hàm gộp hay hàm tổng hợp.** Đề xuất giữ "hàm gộp" vì đang nhất quán. "Hàm tổng hợp" cũng phổ biến nhưng chưa xác minh được ở nguồn đã mở.
3. **Từ cho đơn vị bài trên UI: "việc" (nhóm F).** Nav đã dùng "Việc trước/sau", "Việc tiếp theo", nên đề xuất thống nhất theo.
4. **"tiêu chí sắp xếp phụ".** Không có thuật ngữ Việt chuẩn cho tie-breaker. Cụm này mô tả đúng việc nó làm và rõ hơn "phá hòa", nên giữ.
