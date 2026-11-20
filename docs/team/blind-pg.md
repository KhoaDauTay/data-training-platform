# Giải mù PostgreSQL L1–L5 (v23 track BLIND)

Người làm: agent BLIND · 2026-11-20 · nhánh `v22-engine`, bản build `dist/` trong worktree, `vite preview` cổng 5239, Edge headless với profile tạm mới.

## Cách làm

- Chỉ đọc trang người học thấy: Ý chính, Ví dụ, Thực hành, đề từng bước, lựa chọn của Đoán trước và Câu hỏi, chữ "Điều vừa thấy" sau khi chấm, và Gợi ý khi cần. Không mở `content/engine/**`, `src/` hay script e2e để tìm đáp án.
- SQL tự viết từ chữ trên trang, gõ vào ô của từng bước rồi bấm Nộp. Khi đề không nêu tên bảng hay tên cột, tôi dùng Chạy thử (`SELECT *`, `information_schema`, `pg_views`) như một người học sẽ làm.
- Khi làm, tôi không mở Gợi ý nào. Sau đó tôi đọc Gợi ý của mọi bước đã phải dùng kiến thức ngoài trang, để xét trang **cộng Gợi ý** có đủ cho người học không.
- Thời gian là thời gian của agent (đọc trang, viết câu, nộp), không phải thời gian của người học: câu hỏi khoảng 1 phút, lab 2–4 phút, bài phải thử lại khoảng 6 phút. Người học thật sẽ chậm hơn nhiều ở L3–L5.
- Kết quả cuối: trang `#/engine/postgres` ghi **75/75 bài xong**.

Ký hiệu cột "Kết quả":

- **Đạt lần đầu**: mọi phần chấm đạt ngay lần nộp đầu.
- **Đạt sau thử lại**: có bước sai rồi mới đạt.
- **Cần ngoài trang**: đạt lần đầu, nhưng tôi phải dùng hiểu biết riêng (tên hàm, tên cột) mà Ý chính/Ví dụ/đề không có. Cột "Gợi ý đủ?" nói Gợi ý có lấp chỗ thiếu đó không.

## L1 · Người mới (12/12)

| Bài | Loại | Kết quả | Gợi ý đủ? | Chỗ mơ hồ / ghi chú |
|---|---|---|---|---|
| l1-01 Chọn kiểu dữ liệu | Câu hỏi 3 | Đạt lần đầu | — | |
| l1-02 Tạo bảng đầu tiên | Lab 3 | Đạt lần đầu | — | |
| l1-03 Khóa tự sinh, UUID, cột sinh | Lab 3 | Đạt lần đầu | — | Đề không nói cột sinh là STORED hay VIRTUAL. Viết mặc định (VIRTUAL, như Ý chính nói) thì đạt; bước 3 đọc `attgenerated` = `v`. |
| l1-04 Ràng buộc và khóa | Lab 4 | Đạt lần đầu | — | |
| l1-05 NULL | Câu hỏi 5 | Đạt lần đầu | — | |
| l1-06 Schema và search_path | Lab 3 | Đạt lần đầu | — | |
| l1-07 Transaction và savepoint | Câu hỏi 3 | Đạt lần đầu | — | Câu 3 (Read Committed thấy dòng mới commit giữa hai câu): Ý chính chưa giải thích snapshot theo từng câu, chỉ đoán được. |
| l1-08 View và materialized view | Lab 4 | Đạt lần đầu | — | |
| l1-09 Index B-tree đầu tiên | Lab 3 | Đạt lần đầu | — | |
| l1-10 Có index, sao vẫn Seq Scan? | Đoán + Lab 1 | Đạt lần đầu | — | |
| l1-11 Index cho ORDER BY … LIMIT | Đoán + Lab 1 | Đạt lần đầu | — | "3 đơn cũ nhất" không nêu luật hòa; dữ liệu không có hòa nên không sao. |
| l1-12 Kiểm tra cấp L1 | Tổng hợp 6 | Đạt lần đầu | — | Ví dụ in nguyên câu đáp án của bước 1 (`registrations_seats_check`). |

## L2 · Thực hành (17/17)

| Bài | Loại | Kết quả | Gợi ý đủ? | Chỗ mơ hồ / ghi chú |
|---|---|---|---|---|
| l2-01 Index nhiều cột, skip scan | Đoán + Lab 1 | Đạt lần đầu | — | Sắp "theo day", nhưng 144 dòng có hòa trong cùng ngày. Grader vẫn nhận; đề nên nêu luật hòa. |
| l2-02 INCLUDE, index-only | Lab 4 | Đạt lần đầu | — | |
| l2-03 Index partial | Lab 4 | Cần ngoài trang | Có | Bước 3 cần `pg_relation_size`, Ý chính không nhắc. |
| l2-04 Index trên biểu thức | Lab 3 | Đạt lần đầu | — | Bước 3 viết "Thay index thường bằng luật": không rõ có phải DROP index cũ không. Không DROP vẫn đạt. |
| l2-05 Hash | Đoán + Lab 1 | Đạt lần đầu | — | |
| l2-06 Mảng và GIN | Lab 3 | Đạt lần đầu | — | |
| l2-07 SP-GiST | Đoán + Lab 1 | Đạt lần đầu | — | |
| l2-08 BRIN | Đoán + Lab 1 | Đạt lần đầu | — | "Trả về số trang … sắp theo tên": không rõ có cần cột `relname` không. Tôi thêm vào và đạt. |
| l2-09 Bloom | Lab 2 | Đạt lần đầu | — | |
| l2-10 Range, GiST, EXCLUDE | Lab 3 | Cần ngoài trang | Có | Bước 3 cần đổi độ dài khoảng ra giờ (`extract(epoch …)/3600`). Ý chính không có, Gợi ý chỉ có `upper - lower`. |
| l2-11 jsonb | Lab 3 | Cần ngoài trang | Có | Đề nói "tên, giá" nhưng không nêu khóa jsonb (`name`, `price`). Tôi phải Chạy thử `SELECT doc`; Gợi ý nêu `name`. |
| l2-12 Toàn văn | Lab 4 | Đạt lần đầu | — | |
| l2-13 pg_trgm | Đoán + Lab 1 | Đạt lần đầu | — | Không nói xếp theo similarity gốc hay đã làm tròn. Theo giá trị gốc thì đạt. |
| l2-14 EXPLAIN ANALYZE, CONCURRENTLY | Câu hỏi 3 | Đạt lần đầu | — | |
| l2-15 pg_stats | Đoán + Lab 2 | Đạt lần đầu | — | |
| l2-16 GiST, KNN, earthdistance | Lab 4 | Cần ngoài trang | Một phần | Bước 4: trang không nêu bảng `cities` hay các cột `name`, `lat`, `lon`. Tôi tìm qua `information_schema`. Gợi ý có thứ tự tham số `ll_to_earth`, nhưng không có tên bảng. |
| l2-17 Kiểm tra cấp L2 | Tổng hợp 6 | Cần ngoài trang | Có | Bước 3 cần `WITH (pages_per_range = 8)`; không bài nào viết cú pháp này, chỉ Gợi ý có. |

## L3 · Hiệu năng và mô hình (15/15)

| Bài | Loại | Kết quả | Gợi ý đủ? | Chỗ mơ hồ / ghi chú |
|---|---|---|---|---|
| l3-01 Trang heap | Câu hỏi 2 | Đạt lần đầu | — | |
| l3-02 Mở trang heap | Lab 4 | Đạt lần đầu | — | |
| l3-03 TOAST | Lab 4 | Cần ngoài trang | Có | Cột của `doc_toast` (`len`) không được nêu, và `pg_column_compression` không có trong bài. Ý chính lộ dấu `**nén**` dạng thô. |
| l3-04 MVCC | Câu hỏi 3 | Đạt lần đầu | — | Lộ `**snapshot**` dạng thô. |
| l3-05 Dấu vết UPDATE/DELETE/ROLLBACK | Lab 5 | Cần ngoài trang | Có | Bước 3 cần ép `t_xmin::text::bigint` cho `txid_status`. Bước 4 cần `heap_tuple_infomask_flags`. Ý chính không có cả hai; Gợi ý có. |
| l3-06 HOT, prune, VACUUM | Câu hỏi 2 | Đạt lần đầu | — | `**` dạng thô ở Ý chính và trong cả lựa chọn câu hỏi (`**không bao giờ**`, `**không**`). |
| l3-07 UPDATE HOT và không HOT | Lab 4 | Cần ngoài trang | Có | Bước 2 cần `bt_page_items`, bài chưa nhắc. Phần "Điều vừa thấy" lộ `**mọi**`. |
| l3-08 fillfactor cứu HOT? | Đoán 1 | Đạt lần đầu | — | Trang hứa bấm "Xem thật" để chạy câu đọc bộ đếm. Nút thật lại tên "Xem kế hoạch thật" và in cây EXPLAIN của view catalog (`pg_index`, `pg_class`…), không in `n_tup_hot_upd`. Dễ gây hiểu sai. |
| l3-09 VACUUM, FSM, visibility map | Lab 6 | Cần ngoài trang | Có | Bài chỉ cho `pg_visibility_map_summary`; bước 3 cần `pg_visibility_map(rel, blk)`. |
| l3-10 Freeze | Lab 4 | Cần ngoài trang | Có | `combined_flags` chưa được giải thích. |
| l3-11 XID wraparound | Câu hỏi 3 | Cần ngoài trang | Không (câu hỏi không có Gợi ý) | Câu 1 (2 tỉ transaction) và câu 2 (dưới 3 triệu thì từ chối) **không có trên trang**. Con số duy nhất trang cho là 200 triệu, lại đúng là một lựa chọn sai. Người học chỉ đọc trang dễ chọn sai câu 1. |
| l3-12 WAL | Câu hỏi 2 | Đạt lần đầu | — | `**` dạng thô. |
| l3-13 Đọc bản ghi WAL | Lab 4 | Đạt lần đầu | — | |
| l3-14 Shared buffers, sort tràn đĩa | Lab 4 | Đạt lần đầu | — | Không nêu tên cột kết quả của `sort_plan`; đặt bí danh thì đạt. |
| l3-15 Kiểm tra cấp L3 | Tổng hợp 5 | Đạt lần đầu | — | |

## L4 · Đồng thời và quy mô (16/16)

| Bài | Loại | Kết quả | Gợi ý đủ? | Chỗ mơ hồ / ghi chú |
|---|---|---|---|---|
| l4-01 Mô hình chi phí | Đoán + Lab 3 | Đạt lần đầu | — | Bước 3 vẫn đạt, nhưng dưới kết quả hiện "Kết quả quá lớn: chỉ nhận 1.000 dòng đầu. Thêm điều kiện lọc hoặc LIMIT." Đề lại bắt lấy mọi dòng, nên người học sẽ tưởng mình làm sai. l4-04 bước 3 cũng vậy. |
| l4-02 MCV, histogram, correlation | Đoán + Lab 3 | Đạt lần đầu | — | "Liệt kê các giá trị phổ biến … ép sang text": không rõ là một dòng mảng hay `unnest`. Một dòng mảng thì đạt. |
| l4-03 Thống kê mở rộng | Câu hỏi 2 + Lab 2 | Cần ngoài trang | Có | Trang chưa giải thích cách gọi `est(text)`; Gợi ý nói nó nhận nguyên câu SQL. |
| l4-04 Thuật toán nối | Câu hỏi 1 + Lab 3 | Cần ngoài trang | Không | Cột `note` của `order_notes` không được nêu; tôi phải Chạy thử. Có cùng thông báo "quá lớn" như l4-01. |
| l4-05 Thứ tự nối, GEQO | Đoán + Câu hỏi 1 + Lab 1 | Đạt lần đầu | — | Kế hoạch ở Ví dụ cho luôn đáp án của câu Đoán trước. |
| l4-06 Kế hoạch chung và riêng | Câu hỏi 2 + Lab 2 | Đạt lần đầu | — | Tham số của `plan_lines(..., true)` chỉ ghi tắt; Gợi ý bổ sung. |
| l4-07 Phân vùng, pruning | Đoán + Lab 3 | Cần ngoài trang | Có | Bài không nhắc `pg_partition_tree`; tên cột `tenant_id` phải đoán. |
| l4-08 Thiết kế phân vùng | Câu hỏi 4 | Đạt lần đầu | — | |
| l4-09 Lock mode, pg_locks | Câu hỏi 2 + Lab 2 | **Đạt sau thử lại** | Không | Bước 1: đề nói "số dư", nhưng cột tên `bal`. Trang không nêu, Gợi ý cũng không. Tôi phải Chạy thử `SELECT *` sau lỗi 42703. Bước 2: CTE `SELECT … FOR UPDATE` mà câu chính không đọc tới thì không chạy, nên chỉ ra 1 dòng (`acct RowShareLock`) thay vì 2. Phải thêm `EXISTS (SELECT 1 FROM l)`. Trang và Gợi ý không nói điều này. |
| l4-10 Row lock | Câu hỏi 2 | Đạt lần đầu | — | Chữ bảo "bấm từng cặp trong ma trận row lock", nhưng sơ đồ là ma trận lock **bảng**. Câu mẫu "nhiều phiên / replica set / AWS" lạc chỗ trong bài Postgres. |
| l4-11 Deadlock | Câu hỏi 2 | Đạt lần đầu | — | Chữ bảo "sơ đồ hai làn thời gian", nhưng sơ đồ là ma trận lock bảng. Cùng câu mẫu AWS. |
| l4-12 Mức cô lập | Câu hỏi 3 | Đạt lần đầu | — | Cùng câu mẫu AWS. |
| l4-13 Serializable, SSI | Câu hỏi 3 | Cần ngoài trang | Không (câu hỏi) | Đáp án câu 3 là `DEFERRABLE`, nhưng bài không nhắc từ này; bài chỉ nói READ ONLY. |
| l4-14 Advisory lock | Câu hỏi 1 + Lab 2 | Đạt lần đầu | — | |
| l4-15 Song song và JIT | Đoán + Câu hỏi 2 + Lab 2 | Đạt lần đầu | — | Ví dụ cho luôn đáp án Đoán trước. |
| l4-16 Bài tổng kết L4 | Tổng hợp 8 | Đạt lần đầu | — | Tên cột `region`, `country`, `amount` đoán đúng. |

## L5 · Bên trong và vận hành (15/15)

| Bài | Loại | Kết quả | Gợi ý đủ? | Chỗ mơ hồ / ghi chú |
|---|---|---|---|---|
| l5-01 Bên trong B-tree | Câu hỏi 1 + Lab 3 | Đạt lần đầu | — | |
| l5-02 Dedup, posting list | Câu hỏi 1 + Lab 3 | Đạt lần đầu | — | Ví dụ có sẵn số của bước 1 và bước 2. |
| l5-03 Bottom-up deletion | Câu hỏi 2 | Đạt lần đầu | — | |
| l5-04 GIN, pending list | Câu hỏi 3 + Lab 3 | Cần ngoài trang | Có | Bài không nhắc `gin_metapage_info`. |
| l5-05 BRIN bên trong | Câu hỏi 1 + Lab 3 | Cần ngoài trang | Có | Bài không nhắc `brin_page_items`. |
| l5-06 GiST, SP-GiST | Câu hỏi 2 + Lab 3 | Đạt lần đầu | Có | Cách gọi `gist_page_items` hai tham số chỉ có ở Gợi ý. |
| l5-07 Chọn loại index | Câu hỏi 6 | Đạt lần đầu | — | Ví dụ ghi `readings_brin` "20 ranges", nhưng ở l5-05 `readings_brin` chưa tóm tắt: 16 ranges. Bảng có 20 ranges là `readings2_brin`. |
| l5-08 amcheck | Câu hỏi 2 + Lab 3 | Cần ngoài trang | Có | Đề chỉ nói "hàm kiểm GIN của amcheck"; tên `gin_index_check` chỉ có ở Gợi ý. |
| l5-09 WAL, full-page write | Câu hỏi 2 + Lab 2 | Đạt lần đầu, **nội dung mâu thuẫn** | — | Ví dụ, gọi là "kết quả thật trên PGlite", ghi HOT_UPDATE thứ nhất `full_page = true` và thứ hai `false`. Lab chạy thật ra `false`, `false` (`pg_get_wal_records_info` cũng cho `fpi_length` 0), và grader nhận `false`, `false`. Câu Đoán trước "cái nào mang ảnh cả trang?" vì vậy không có đáp án trong lab. Cột mốc tên `step`, không được nêu. |
| l5-10 RLS | Câu hỏi 3 + Lab 3 | Cần ngoài trang | Không | Trang và Gợi ý không nêu tên ba view (`tickets_as_tenant_1`, `tickets_as_tenant_2`, `tickets_as_support`). Tôi tìm qua `pg_views`. |
| l5-11 pg_stat_statements | Câu hỏi 2 + Lab 2 | Đạt lần đầu | — | |
| l5-12 work_mem | Câu hỏi 2 + Lab 2 | Đạt lần đầu | — | "10 giá trị v nhỏ nhất" không nêu luật hòa. |
| l5-13 Nhân bản, slot | Câu hỏi 3 + Lab 2 | Đạt lần đầu | — | |
| l5-14 Backup, PITR, failover | Câu hỏi 4 | Đạt lần đầu | — | Cùng câu mẫu AWS. |
| l5-15 Bài tổng kết L5 | Tổng hợp 9 | Đạt lần đầu | — | Ví dụ có sẵn mọi con số mong đợi. |

## Tổng hợp

| Cấp | Số bài | Đạt lần đầu | Đạt sau thử lại | Cần ngoài trang (Gợi ý đủ) | Cần ngoài trang (Gợi ý không đủ) | Không giải được |
|---|---|---|---|---|---|---|
| L1 | 12 | 12 | 0 | 0 | 0 | 0 |
| L2 | 17 | 12 | 0 | 4 (l2-03, l2-10 một phần, l2-11, l2-17) | 1 (l2-16) | 0 |
| L3 | 15 | 9 | 0 | 5 (l3-03, l3-05, l3-07, l3-09, l3-10) | 1 (l3-11, câu hỏi không có Gợi ý) | 0 |
| L4 | 16 | 11 | 1 (l4-09) | 2 (l4-03, l4-07) | 2 (l4-04, l4-13) | 0 |
| L5 | 15 | 11 | 0 | 3 (l5-04, l5-05, l5-08) | 1 (l5-10) | 0 |
| **Tổng** | **75** | **55** | **1** | **14** | **5** | **0** |

Mọi bài đều qua grader ở lần nộp cuối (75/75). "Đạt lần đầu" ở đây là đạt mà chỉ cần chữ trên trang; bài ở cột đó vẫn có thể có ghi chú nhỏ. Không bài nào có grader sai hay lỗi lúc chạy. Tôi là người biết Postgres sâu, nên con số "đạt" ở đây là trần trên. Một người học chỉ đọc trang sẽ kẹt ở các bài thuộc cột "Gợi ý không đủ" và ở l4-09.

## Bài không giải được chỉ từ trang (việc cho PG-C)

Không bài nào hoàn toàn không giải được: cả 75 bài đều qua grader. Các bài dưới đây người học **chỉ đọc trang và Gợi ý thì không giải chắc được**, vì thiếu thông tin hoặc vì trang tự mâu thuẫn. Mỗi bài kèm một dòng cách sửa.

1. **l4-09 bước 1**: thiếu tên cột ("số dư" là `bal`). Sửa: ghi `bal` trong đề, hoặc in cấu trúc bảng `acct` trong Thực hành.
2. **l4-09 bước 2**: CTE `FOR UPDATE` mà câu chính không đọc tới thì không chạy. Sửa: viết vào đề "câu chính phải đọc CTE (ví dụ `WHERE EXISTS (SELECT 1 FROM l)`)" hoặc đưa ý này vào Gợi ý.
3. **l5-10 bước 1**: thiếu tên ba view. Sửa: nêu `tickets_as_tenant_1`, `tickets_as_tenant_2`, `tickets_as_support` trong đề.
4. **l2-16 bước 4**: thiếu bảng `cities(name, lat, lon)`. Sửa: nêu bảng và cột trong Thực hành hoặc Gợi ý.
5. **l4-04 bước 3**: thiếu cột `order_notes.note`. Sửa: nêu tên cột trong đề.
6. **l5-09**: Ví dụ "kết quả thật" (FPI true/false) mâu thuẫn với lab (false/false). Sửa: dựng lại lab cho có `CHECKPOINT` ngay trước mốc `start`, để UPDATE đầu mang FPI, rồi kiểm cả hai giá trị trong e2e. Nếu không được thì sửa Ví dụ và câu Đoán trước theo số thật. Nêu luôn cột `step` của `wal_marks`.
7. **l3-11 câu 1–2**: đáp án (2 tỉ transaction; còn dưới 3 triệu thì ngừng cấp XID) không có trên trang, mà con số 200 triệu trên trang lại là lựa chọn sai. Sửa: thêm hai con số này vào Ý chính.
8. **l4-13 câu 3**: đáp án `DEFERRABLE` không có trên trang. Sửa: thêm một câu về `SERIALIZABLE READ ONLY DEFERRABLE` vào Ý chính.

Sửa nhỏ nên làm cùng đợt (không chặn người học):

- **`**…**` dạng thô** ở l3-03, l3-04, l3-06 (Ý chính và lựa chọn câu hỏi), l3-07 (Điều vừa thấy), l3-12: renderer chưa đổi markdown đậm, hoặc nội dung không được dùng `**`. Sửa: render được `**` hoặc bỏ nó khỏi nội dung, rồi thêm test cấm `**` trong chữ hiện ra.
- **Thông báo "Kết quả quá lớn … Thêm điều kiện lọc hoặc LIMIT"** hiện ngay cạnh "Đạt bước này" ở l4-01 bước 3 và l4-04 bước 3. Sửa: khi bước đã đạt thì nói "chỉ hiện 1.000 dòng đầu", không kèm lời khuyên thêm LIMIT.
- **l3-08**: nút "Xem kế hoạch thật" in EXPLAIN của view catalog thay vì bộ đếm mà trang hứa. Sửa: với câu đọc thống kê, chạy câu và in bảng kết quả, đặt tên nút "Xem thật".
- **l4-10, l4-11**: chữ mô tả sơ đồ (ma trận row lock, hai làn thời gian) không khớp sơ đồ đang hiện (ma trận lock bảng). Sửa: đổi sơ đồ, hoặc sửa chữ cho khớp.
- **Câu mẫu "nhiều phiên / replica set / AWS"** ở l4-10, l4-11, l4-12, l4-13, l5-14. Sửa: với Postgres chỉ viết "nhiều phiên hoặc server thật".
- **l5-07**: Ví dụ ghi `readings_brin` 20 ranges. Sửa: đổi thành `readings2_brin`, hoặc ghi 16.
- **Tên hàm chỉ có ở Gợi ý** (`pg_relation_size`, `heap_tuple_infomask_flags`, `bt_page_items`, `pg_visibility_map`, `gin_metapage_info`, `brin_page_items`, `gist_page_items`, `gin_index_check`, `pg_partition_tree`, cú pháp `WITH (pages_per_range = …)`, cách gọi `est(text)`): người học vẫn qua được nhờ Gợi ý. Sửa: thêm tên hàm vào Ý chính hoặc Ví dụ của chính bài đó.
- **Luật hòa** (l2-01, l5-12) và **cột trả về mơ hồ** (l2-08 `relname`, l4-02 mảng hay `unnest`, l2-13 làm tròn trước hay sau khi xếp): grader đang dễ dãi nên không ai trượt. Sửa: viết rõ trong đề.
- **Ví dụ lộ đáp án** (l1-12 bước 1, l4-05 và l4-15 Đoán trước, l5-02 và l5-15 các con số): Sửa: ở Ví dụ dùng bảng hoặc giá trị khác với bài lab.
- **Trang lab không có danh sách bảng/cột** (`schema`/catalog). Người học phải tự chạy `SELECT *` hay `information_schema`. Sửa: thêm khối "Bảng trong lab" (tên bảng, cột, kiểu) như tab Columns của phần DA.
