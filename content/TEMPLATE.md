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
