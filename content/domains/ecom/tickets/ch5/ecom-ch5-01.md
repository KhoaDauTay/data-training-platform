---
id: ecom-ch5-01
chapter: 5
title: Đơn nhỏ, đơn vừa, đơn lớn
title_en: Small, medium and large orders
from: { name: Trịnh Mai Anh, dept: Marketing }
difficulty: 2
beat: teach
format: worked
requires: [aggregate, group_by, order_by]
grants: [case_when]
tables: [payments]
ordered: true
columns:
  - { vi: "Nhóm giá trị (1 nhỏ, 2 vừa, 3 lớn)", en: "Value band (1 small, 2 medium, 3 large)" }
  - { vi: "Số khoản đã thu", en: "Payments collected" }
  - { vi: "Tổng tiền (đồng)", en: "Total (VND)" }
variants:
  - { month: "10/2026", month_en: "October 2026", from: "2026-10-01", to: "2026-11-01" }
  - { month: "7/2026", month_en: "July 2026", from: "2026-07-01", to: "2026-08-01" }
  - { month: "3/2026", month_en: "March 2026", from: "2026-03-01", to: "2026-04-01" }
reflect:
  q: { vi: "Các nhánh WHEN được xét theo thứ tự nào?", en: "In what order are the WHEN branches checked?" }
  options:
    - { vi: "Từ trên xuống; nhánh đúng đầu tiên thắng, các nhánh sau bị bỏ qua", en: "Top to bottom; the first true branch wins and later branches are skipped" }
    - { vi: "Nhánh có số lớn nhất thắng", en: "The branch with the largest number wins" }
    - { vi: "Mọi nhánh đúng đều được tính", en: "Every true branch counts" }
  answer: 0
  why: { vi: "Vì nhánh đầu tiên đúng thắng, mốc nhỏ phải đứng trước mốc lớn; viết ngược thì nhóm nhỏ không bao giờ có ai.", en: "Because the first true branch wins, the small threshold must come before the large one; written the other way round, the small band never gets anyone." }
wrong:
  - sql: "SELECT CASE WHEN amount < 500000 THEN 2 WHEN amount < 200000 THEN 1 ELSE 3 END AS band, count(*), sum(amount) FROM payments WHERE status = 'paid' AND paid_at >= '{{from}}' AND paid_at < '{{to}}' GROUP BY band ORDER BY band"
    vi: "Nhóm 1 đang trống: khoản dưới 200 nghìn cũng dưới 500 nghìn nên rơi vào nhánh đầu tiên. Đặt mốc nhỏ lên trước."
    en: "Band 1 is empty: a payment under 200 thousand is also under 500 thousand, so it falls into the first branch. Put the small threshold first."
---
Marketing đang nghĩ mức miễn phí giao hàng mới. Muốn đặt mức cho đúng, mình cần biết khách hay trả những đơn cỡ nào: đơn nhỏ, vừa hay lớn.

Lần này bạn tự đặt nhãn cho từng dòng theo luật, nên mình gửi kèm một ví dụ mẫu.

## Task
Tháng {{month}}, chia các khoản thanh toán đã thu thành công theo số tiền: nhóm 1 dưới 200 nghìn đồng, nhóm 2 từ 200 nghìn đến dưới 500 nghìn, nhóm 3 từ 500 nghìn trở lên (mỗi đơn trả một khoản, nên đây cũng là cỡ đơn). Mỗi nhóm một dòng: số nhóm, số khoản và tổng tiền; xếp theo số nhóm.

## Example
```sql
SELECT sku, price,
       CASE WHEN price < 100000 THEN 1      -- ①
            WHEN price < 1000000 THEN 2     -- ②
            ELSE 3                          -- ③
       END AS price_band
FROM products
WHERE category_id = 3
ORDER BY sku
```
Ví dụ: gắn mỗi sản phẩm nhóm hàng số 3 vào một hạng giá: 1 rẻ, 2 vừa, 3 cao cấp.

① Nhánh đầu tiên đúng thắng: món dưới 100 nghìn dừng ở đây.

② Tới nhánh này thì món chắc chắn không dưới 100 nghìn, nên chỉ cần ghi mốc trên.

③ Mọi món còn lại vào nhánh cuối.

## Hints
1. Gắn cho mỗi khoản một số nhóm theo luật của đề, rồi gom nhóm theo số đó và đếm, cộng.
2. `CASE WHEN amount < 200000 THEN 1 WHEN amount < 500000 THEN 2 ELSE 3 END AS band`, rồi `GROUP BY band ORDER BY band`.
3. `SELECT CASE ... END AS band, count(*), sum(amount) FROM payments WHERE status = 'paid' AND ... GROUP BY band ORDER BY band`

## Solution
```sql
SELECT CASE WHEN amount < 200000 THEN 1 WHEN amount < 500000 THEN 2 ELSE 3 END AS band,
       count(*), sum(amount)
FROM payments
WHERE status = 'paid' AND paid_at >= '{{from}}' AND paid_at < '{{to}}'
GROUP BY band
ORDER BY band
```

# EN
Marketing is thinking about a new free-shipping threshold. To set it right, I need to know what sizes of orders customers pay for: small, medium or large.

This time you label each row by a rule yourself, so I am sending a worked example along.

## Task
For {{month_en}}, split the payments collected successfully by amount: band 1 under 200 thousand VND, band 2 from 200 thousand to under 500 thousand, band 3 from 500 thousand up (each order is paid in one payment, so this is also the order size). One row per band: the band number, the number of payments and the total; sorted by band number.

## Example
Example: put each product of category number 3 into a price tier: 1 cheap, 2 medium, 3 premium.

① The first true branch wins: an item under 100 thousand stops here.

② By this branch the item is certainly not under 100 thousand, so only the upper limit is needed.

③ Everything else lands in the last branch.

## Hints
1. Give each payment a band number by the request's rule, then group by that number and count and add up.
2. `CASE WHEN amount < 200000 THEN 1 WHEN amount < 500000 THEN 2 ELSE 3 END AS band`, then `GROUP BY band ORDER BY band`.
3. `SELECT CASE ... END AS band, count(*), sum(amount) FROM payments WHERE status = 'paid' AND ... GROUP BY band ORDER BY band`
