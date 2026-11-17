---
# Mẫu ticket. Copy vào content/tickets/chN/chN-0M.md rồi sửa. File này nằm ngoài content/tickets/ nên game không nạp.
# Đề là câu hỏi nghiệp vụ (docs/team/problem-design.md §1): ai hỏi, cần gì, để làm gì, ràng buộc đủ để chấm đúng,
# thông tin trả về theo thứ tự. Thân đề, Task và đề bước: không tên bảng/cột, không từ khóa SQL, không mã trạng thái, không backtick.
# Kỹ năng trong requires/grants lấy id từ content/skills.yml. Bảng trong tables phải mở ở chương này (CHAPTER_TABLES).
# Có thứ tự/top-N: đặt ordered: true và nêu quy tắc phá hòa bằng lời nghiệp vụ.
# Ngày "hôm nay" là 2026-10-31; Solution chỉ dùng ngày cố định.
# columns: mỗi cột kết quả một nhãn { vi, en } theo nghĩa nghiệp vụ (L25), không phải tên cột của Solution.
# Cột mốc (beat: boss): thay "## Solution" bằng "## Step N: <tiêu đề>" (mỗi bước một khối sql), columns là một danh sách cho mỗi bước,
# thêm conclusion { question, options, answer } và conclusion_en { question, options }.
# Hoạt cảnh khi xong (tùy chọn, completion-animations.md §3): scene: { kind: ship|yard|customs|truck|quote|ledger|chat, to?: CNSHA|THLCH|SGSIN|NLRTM|KRPUS|USLAX|AUSYD, lane?: green|yellow|red }. Không khai thì dùng sceneOf().
# Dạng bài (curriculum §5.1, từ ch4): format: worked | faded | open (mặc định open).
#   worked (ticket teach): thêm "## Example" ngay sau "## Task": một khối ```sql đánh dấu -- ①, -- ②… rồi mỗi dấu một đoạn giải thích
#   (các đoạn cách nhau một dòng trống). Khối # EN có "## Example" chỉ gồm lời giải thích, code span giống hệt bản VI.
#   faded: starter có ít nhất một chỗ trống ___ (Nộp khi còn ___ thì báo, không tính là nộp sai).
# reflect (mọi ticket thường từ ch4): { q: {vi, en}, options: [{vi, en}, …] (2–4), answer: số thứ tự đáp án đúng từ 0, why: {vi, en} } — câu ngẫm lại trong Recap.
# wrong (tùy chọn): [{ sql, vi, en }] — câu SQL sai hay gặp; kết quả người chơi trùng kết quả câu này thì phản hồi hiện lời giải thích.
#   Mỗi câu phải chạy được và khác kết quả Solution ở mọi biến thể (tests/content.test.ts).
# variants: từ ch4, mỗi kỹ năng mới cần một ticket thường có ≥ 3 biến thể (biến thể 0 + 2) để hàng ôn có bài khác (L37).
# Chương 11 (src/planCheck.ts): plan: { index: <bảng> } — kết quả đúng rồi, kế hoạch (EXPLAIN, không ANALYZE) còn phải đọc bảng đó qua chỉ mục.
#   lab: { table: <bảng>, ddl: "CREATE INDEX …", max_cost_ratio: 0.1 } — phòng thí nghiệm: editor chứa một CREATE INDEX, Solution là câu chậm
#   (giữ nguyên, hiện ở thẻ bên trái); đạt khi bảng được đọc qua chỉ mục và chi phí sau ≤ tỷ lệ × trước. Không có wrong: ở bước lab.
#   Ticket thường: một bảng; cột mốc: một danh sách mỗi bước, null = không có. tests/planCheck.test.ts kiểm Solution đạt và cách viết chậm không đạt.
id: ch0-01
chapter: 0
title: Tiêu đề tiếng Việt
title_en: English title
from: { name: Hoàng Khánh, dept: Ops }
difficulty: 1
beat: develop
requires: [select]
grants: [where]
tables: [ports]
columns:
  - { vi: "Mã cảng", en: "Port code" }
  - { vi: "Tên cảng", en: "Port name" }
---
Bối cảnh: ai hỏi, cần gì, để làm gì (1–3 câu), bằng lời nghiệp vụ.

## Task
Câu hỏi nghiệp vụ, ràng buộc (thời gian, lô hủy, tập bao gồm, làm tròn, phá hòa) và thông tin cần trả về theo đúng thứ tự.

## Hints
1. Nghiệp vụ → dữ liệu: thông tin nằm ở danh mục nào, câu hỏi thuộc dạng gì.
2. Bảng, cột, giá trị và mệnh đề cụ thể, ví dụ `region = 'Europe'`.
3. Khung query, ví dụ `SELECT code, name FROM ports WHERE ...`

## Solution
```sql
SELECT code, name FROM ports WHERE region = 'Europe'
```

# EN
Context: who asks, what they need and what for (1-3 sentences), in business words.

## Task
The business question, the constraints (dates, cancelled shipments, what is included, rounding, tie-breaks) and the information to return, in order.

## Hints
1. Business to data: which list holds the information, what kind of question this is.
2. The tables, columns, values and clauses, for example `region = 'Europe'`.
3. The query skeleton, for example `SELECT code, name FROM ports WHERE ...`
