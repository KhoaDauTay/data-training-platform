---
id: fin-ch3-04
chapter: 3
title: Khách đang vay nhiều khoản
title_en: Customers with several loans running
from: { name: Tôn Nữ Hạnh, dept: CS }
difficulty: 2
beat: rest
requires: [select, where, aggregate, group_by, having, order_by]
grants: []
tables: [loans]
ordered: true
columns:
  - { vi: "Mã khách", en: "Customer number" }
  - { vi: "Số khoản đang trả", en: "Loans being repaid" }
reflect:
  q: { vi: "Vì sao phải lọc khoản đang trả trước khi đếm?", en: "Why filter the loans being repaid before counting?" }
  options:
    - { vi: "Khách từng vay hai khoản rồi trả xong một khoản thì hôm nay chỉ còn một khoản; không lọc thì đếm cả khoản đã đóng", en: "A customer who took two loans and repaid one has only one left today; without the filter the closed loan is counted too" }
    - { vi: "Không lọc thì truy vấn báo lỗi", en: "Without the filter the query fails" }
    - { vi: "Khoản đã đóng không có mã khách", en: "Closed loans have no customer number" }
  answer: 0
  why: { vi: "Đề hỏi về hôm nay. Lọc dòng chạy trước khi gom, nên đếm chỉ thấy các khoản còn đang trả.", en: "The request is about today. The row filter runs before grouping, so the count only sees loans still being repaid." }
wrong:
  - sql: "SELECT customer_id, count(*) FROM loans GROUP BY customer_id HAVING count(*) >= 2 ORDER BY 2 DESC, 1"
    vi: "Bạn đếm mọi khoản từng vay, kể cả khoản đã trả xong hay đã xóa nợ. Đề chỉ hỏi khoản chưa tất toán."
    en: "You counted every loan ever taken, repaid and written-off ones included. The request is only about loans not yet settled."
---
Khách đang trả nhiều khoản cùng lúc dễ bị quá tải. Đội chăm sóc muốn gọi tư vấn gộp lịch trả cho họ trước khi họ trễ hạn.

## Task
Những khách đang có từ hai khoản vay chưa tất toán trở lên (khoản vẫn đang trả hôm nay): mã khách và số khoản đang trả. Nhiều khoản nhất lên đầu; bằng nhau thì mã khách nhỏ hơn lên trước.

## Hints
1. Lọc khoản đang trả, gom theo khách, rồi chỉ giữ nhóm có từ hai khoản trở lên.
2. Bảng `loans`: `status = 'active'`, `GROUP BY customer_id`, `HAVING count(*) >= 2`, sắp `ORDER BY 2 DESC, 1`.
3. `SELECT customer_id, count(*) FROM loans WHERE ... GROUP BY customer_id HAVING ... ORDER BY 2 DESC, 1`

## Solution
```sql
SELECT customer_id, count(*)
FROM loans
WHERE status = 'active'
GROUP BY customer_id
HAVING count(*) >= 2
ORDER BY 2 DESC, 1
```

# EN
Customers repaying several loans at once can get overwhelmed. The care team wants to call them about combining their schedules before they fall behind.

## Task
The customers who have two or more loans not yet settled (still being repaid today): customer number and the number of loans being repaid. Most loans first; on a tie, the smaller customer number first.

## Hints
1. Filter the loans being repaid, group by customer, then keep only the groups with two loans or more.
2. Table `loans`: `status = 'active'`, `GROUP BY customer_id`, `HAVING count(*) >= 2`, sorted with `ORDER BY 2 DESC, 1`.
3. `SELECT customer_id, count(*) FROM loans WHERE ... GROUP BY customer_id HAVING ... ORDER BY 2 DESC, 1`
