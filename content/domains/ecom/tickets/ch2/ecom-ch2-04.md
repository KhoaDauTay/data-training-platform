---
id: ecom-ch2-04
chapter: 2
title: Khách có chịu viết nhận xét không
title_en: Do customers write comments
from: { name: Hồ Ngọc Diệp, dept: CS }
difficulty: 1
beat: rest
requires: [aggregate, group_by]
grants: []
tables: [reviews]
columns:
  - { vi: "Số sao", en: "Stars" }
  - { vi: "Số đánh giá", en: "Reviews" }
  - { vi: "Số đánh giá có lời nhận xét", en: "Reviews with a comment" }
reflect:
  q: { vi: "Đếm theo một cột (thay vì đếm mọi dòng) thì bỏ qua những dòng nào?", en: "Counting a column (instead of every row) skips which rows?" }
  options:
    - { vi: "Những dòng mà cột đó trống (không có giá trị)", en: "The rows where that column is empty (has no value)" }
    - { vi: "Những dòng trùng nhau", en: "Duplicate rows" }
    - { vi: "Không bỏ dòng nào", en: "No rows at all" }
  answer: 0
  why: { vi: "Đếm mọi dòng thì tính cả dòng trống; đếm theo cột thì chỉ tính dòng có giá trị ở cột đó.", en: "Counting rows includes empty ones; counting a column only includes rows with a value in that column." }
wrong:
  - sql: "SELECT rating, count(*), count(*) FROM reviews GROUP BY rating"
    vi: "Cột thứ ba đang đếm mọi đánh giá, kể cả đánh giá chỉ chấm sao. Đề cần số đánh giá có viết lời nhận xét."
    en: "The third column counts every review, including stars-only ones. The request wants the reviews that have a written comment."
---
Nhóm chăm sóc khách hàng muốn biết khách có hay viết nhận xét không, và khách không hài lòng có viết nhiều hơn khách hài lòng không. Nếu khách chấm thấp mà ít viết, mình sẽ thêm một câu hỏi ngắn sau khi chấm sao.

## Task
Với mỗi mức sao từ 1 đến 5: có bao nhiêu đánh giá, và bao nhiêu đánh giá trong số đó có viết lời nhận xét? Mỗi mức sao một dòng. Thứ tự dòng không quan trọng.

## Hints
1. Gom nhóm theo số sao. Trong mỗi nhóm cần hai số đếm: mọi đánh giá, và chỉ đánh giá có lời nhận xét.
2. Đếm mọi dòng dùng `count(*)`; đếm theo cột `count(comment)` bỏ qua những dòng không có lời nhận xét.
3. `SELECT rating, count(*), count(comment) FROM reviews GROUP BY ...`

## Solution
```sql
SELECT rating, count(*), count(comment)
FROM reviews
GROUP BY rating
```

# EN
The customer care team wants to know whether customers write comments, and whether unhappy customers write more than happy ones. If low scores come with few comments, we will add a short question after the stars.

## Task
For each star level from 1 to 5: how many reviews are there, and how many of them have a written comment? One row per star level. Row order does not matter.

## Hints
1. Group by the number of stars. Each group needs two counts: every review, and only the reviews with a comment.
2. Counting every row uses `count(*)`; counting a column, `count(comment)`, skips the rows without a comment.
3. `SELECT rating, count(*), count(comment) FROM reviews GROUP BY ...`
