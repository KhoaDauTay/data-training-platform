---
# Mẫu ticket. Copy vào content/tickets/chN/chN-0M.md rồi sửa. File này nằm ngoài content/tickets/ nên game không nạp.
# Kỹ năng trong requires/grants lấy id từ content/skills.yml. Bảng trong tables phải mở ở chương này (CHAPTER_TABLES).
# Có thứ tự/top-N: đặt ordered: true và nêu tiêu chí phá hòa đầy đủ trong đề.
# Ngày "hôm nay" là 2026-10-31; Solution chỉ dùng ngày cố định.
# Boss: thay "## Solution" bằng "## Step N: <tiêu đề>" (mỗi bước một khối sql), columns là một danh sách cho mỗi bước,
# thêm conclusion { question, options, answer } và conclusion_en { question, options }.
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
columns: [code, name]
---
Bối cảnh: lời nhắn của phòng ban, 1–2 câu.

## Task
Yêu cầu cụ thể: nêu tên cột cần trả về, ví dụ `code`, `name`, và tiêu chí phá hòa nếu có thứ tự.

## Hints
1. Hướng đi.
2. Bảng và cột cần dùng.
3. Khung query, ví dụ `SELECT code, name FROM ports WHERE ...`

## Solution
```sql
SELECT code, name FROM ports WHERE region = 'Europe'
```

# EN
Context: the department's message, 1-2 sentences. Keep every code span exactly as in the VI part.

## Task
The concrete request: name the columns to return, for example `code`, `name`, plus the tie-break if order matters.

## Hints
1. The direction to take.
2. The tables and columns to use.
3. The query skeleton, for example `SELECT code, name FROM ports WHERE ...`
