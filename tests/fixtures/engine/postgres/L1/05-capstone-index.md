---
id: e-pg-l1-05
engine: postgres
level: L1
module: types
title: Tổng hợp L1, tăng tốc một trang
title_en: L1 capstone, speed up one page
kind: capstone
minutes: 15
objectives:
  - vi: Tạo index cho một câu chậm và thấy kế hoạch đổi
    en: Create an index for a slow query and see the plan change
requires: [e-pg-l1-01]
sources:
  - https://www.postgresql.org/docs/current/indexes.html
lab:
  setup: |
    CREATE TABLE visits (id int PRIMARY KEY, page int);
    INSERT INTO visits SELECT g, g % 500 FROM generate_series(1, 5000) g;
    ANALYZE visits;
  steps:
    - name:
        vi: Đếm lượt xem
        en: Count the visits
      task:
        vi: Đếm số lượt xem của trang 7.
        en: Count the visits of page 7.
      solution: SELECT count(*) FROM visits WHERE page = 7
      check: rows
      hint:
        vi: Lọc theo `page`, rồi đếm.
        en: Filter on `page`, then count.
    - task:
        vi: Trang 7 được mở nhiều. Tạo index tên `visits_page_idx` trên cột trang.
        en: Page 7 is opened a lot. Create an index named `visits_page_idx` on the page column.
      solution: CREATE INDEX visits_page_idx ON visits (page)
      check: catalog
      target: SELECT count(*) FROM visits WHERE page = 7
      hint:
        vi: Một index B-tree trên một cột.
        en: One B-tree index on one column.
quiz:
  - q:
      vi: Sau khi có index, câu đếm trang 7 đọc bảng thế nào?
      en: Once the index exists, how does the page 7 count read the table?
    options:
      - { vi: Qua index, en: Through the index }
      - { vi: Đọc cả bảng, en: The whole table }
    answer: 0
    why:
      vi: Trang 7 chỉ có 10 trên 5000 dòng.
      en: Page 7 has only 10 of 5000 rows.
---

## Ý chính

Một bài tổng hợp ngắn: đọc, tạo index, so kế hoạch.

# EN

## Key idea

A short capstone: read, create an index, compare the plans.
