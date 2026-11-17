---
id: ecom-ch5-05
chapter: 5
title: "Đánh giá thăng tiến: chia ngân sách marketing"
title_en: "Promotion review: splitting the marketing budget"
from: { name: Võ Thanh Hà, dept: Management }
difficulty: 4
beat: boss
requires: [cte, case_when, conditional_agg, join, aggregate, group_by, order_by]
grants: []
tables: [ad_spend, customers, web_sessions, payments, orders]
ordered: true
columns:
  - [{ vi: "Kênh khách đến", en: "Acquisition channel" }, { vi: "Số khách mới", en: "New customers" }, { vi: "Chi phí kênh (đồng)", en: "Channel spend (VND)" }, { vi: "Chi phí cho mỗi khách mới (đồng)", en: "Cost per new customer (VND)" }]
  - [{ vi: "Thiết bị", en: "Device" }, { vi: "Số phiên", en: "Sessions" }, { vi: "Phiên có thêm vào giỏ", en: "Sessions that added to cart" }, { vi: "Phiên ra đơn", en: "Sessions that ordered" }, { vi: "Tỷ lệ ra đơn (%)", en: "Conversion rate (%)" }]
  - [{ vi: "Nền tảng đặt đơn", en: "Ordering platform" }, { vi: "Khoản nhỏ", en: "Small payments" }, { vi: "Khoản vừa", en: "Medium payments" }, { vi: "Khoản lớn", en: "Large payments" }]
conclusion:
  question: "Theo bước 1, kênh nào tốn ít tiền nhất cho mỗi khách mới?"
  options:
    - "Bạn bè giới thiệu: chỉ tốn tiền thưởng giới thiệu cho mỗi khách"
    - "Quảng cáo trả tiền"
    - "Mạng xã hội"
  answer: 0
conclusion_en:
  question: "According to step 1, which channel costs the least per new customer?"
  options:
    - "Friend referrals: they only cost the referral bonus per customer"
    - "Paid ads"
    - "Social media"
---
Đây là buổi đánh giá thăng tiến của bạn. Tuần sau ban giám đốc chia ngân sách marketing năm 2027. Mình cần ba bảng số để biết tiền nên đổ vào đâu. Làm đúng cả ba là bạn bước thêm một bước trong sự nghiệp.

## Step 1: Mỗi khách mới tốn bao nhiêu tiền
Quý 3/2026 (từ 01/07 đến hết 30/09): với mỗi kênh có chi phí marketing, gửi tên kênh, số khách mới đăng ký qua kênh đó, tổng chi phí của kênh trong quý, và chi phí cho mỗi khách mới (chi phí chia số khách, làm tròn tới đồng). Kênh không tốn tiền thì bỏ. Xếp theo tên kênh.
```sql
WITH spend AS (
  SELECT channel, sum(amount) AS amount
  FROM ad_spend
  WHERE month >= '2026-07-01' AND month < '2026-10-01'
  GROUP BY channel
), signups AS (
  SELECT channel, count(*) AS n
  FROM customers
  WHERE signup_date >= '2026-07-01' AND signup_date < '2026-10-01'
  GROUP BY channel
)
SELECT s.channel, g.n, s.amount, ROUND(s.amount / g.n, 0)
FROM spend s
JOIN signups g ON g.channel = s.channel
ORDER BY s.channel
```

## Step 2: Phễu theo thiết bị tháng 10
Tháng 10/2026, theo từng loại thiết bị: số phiên truy cập, số phiên có thêm vào giỏ, số phiên ra đơn, và tỷ lệ ra đơn (phiên ra đơn chia tổng số phiên, tính phần trăm, làm tròn 2 chữ số thập phân). Xếp theo tên thiết bị.
```sql
SELECT device, count(*), count(*) FILTER (WHERE added_to_cart), count(*) FILTER (WHERE order_id IS NOT NULL),
       ROUND(100.0 * count(*) FILTER (WHERE order_id IS NOT NULL) / count(*), 2)
FROM web_sessions
WHERE started_at >= '2026-10-01' AND started_at < '2026-11-01'
GROUP BY device
ORDER BY device
```

## Step 3: Cỡ khoản thanh toán theo nền tảng
Các khoản thanh toán đã thu thành công trong tháng 10/2026, theo nền tảng khách đặt đơn: bao nhiêu khoản nhỏ (dưới 200 nghìn đồng), bao nhiêu khoản vừa (từ 200 nghìn đến dưới 500 nghìn), bao nhiêu khoản lớn (từ 500 nghìn trở lên). Xếp theo tên nền tảng.
```sql
WITH paid AS (
  SELECT o.platform,
         CASE WHEN p.amount < 200000 THEN 1 WHEN p.amount < 500000 THEN 2 ELSE 3 END AS band
  FROM payments p
  JOIN orders o ON o.id = p.order_id
  WHERE p.status = 'paid' AND p.paid_at >= '2026-10-01' AND p.paid_at < '2026-11-01'
)
SELECT platform, count(*) FILTER (WHERE band = 1), count(*) FILTER (WHERE band = 2), count(*) FILTER (WHERE band = 3)
FROM paid
GROUP BY platform
ORDER BY platform
```

## Hints
1. Bước 1 gộp hai bảng riêng (chi phí theo kênh, khách mới theo kênh) rồi ghép chúng theo kênh. Bước 2 là phễu như bài phễu tháng, nhưng nhóm theo thiết bị. Bước 3 gắn nhóm giá trị cho từng khoản rồi đếm có điều kiện.
2. Bước 1: hai khối `WITH` (`spend`, `signups`), ghép `g.channel = s.channel`, chia `ROUND(s.amount / g.n, 0)`. Bước 2: `ROUND(100.0 * count(*) FILTER (WHERE order_id IS NOT NULL) / count(*), 2)`. Bước 3: nền tảng là `o.platform`, `count(*) FILTER (WHERE band = 1)`.
3. `WITH spend AS (...), signups AS (...) SELECT s.channel, g.n, s.amount, ROUND(s.amount / g.n, 0) FROM spend s JOIN signups g ON ... ORDER BY s.channel`

# EN
This is your promotion review. Next week the board splits the 2027 marketing budget. I need three tables to know where the money should go. Get all three right and you take another step in your career.

## Step 1: What each new customer costs
For Q3 2026 (1 July to 30 September): for each channel with marketing spend, send the channel name, the number of new customers who signed up through it, the channel's total spend in the quarter, and the cost per new customer (spend divided by customers, rounded to the whole VND). Channels that cost nothing are left out. Sort by channel name.

## Step 2: The funnel by device in October
For October 2026, per device type: the number of sessions, sessions that added something to the cart, sessions that ended in an order, and the conversion rate (sessions that ordered divided by all sessions, as a percentage, rounded to 2 decimals). Sort by device name.

## Step 3: Payment sizes by platform
For the payments collected successfully in October 2026, by the platform the customer ordered on: how many small payments (under 200 thousand VND), how many medium ones (from 200 thousand to under 500 thousand), how many large ones (500 thousand or more). Sort by platform name.

## Hints
1. Step 1 aggregates two separate tables (spend per channel, new customers per channel), then joins them on the channel. Step 2 is the funnel of the monthly funnel task, grouped by device instead. Step 3 gives each payment a value band, then counts with conditions.
2. Step 1: two `WITH` blocks (`spend`, `signups`), joined on `g.channel = s.channel`, divided with `ROUND(s.amount / g.n, 0)`. Step 2: `ROUND(100.0 * count(*) FILTER (WHERE order_id IS NOT NULL) / count(*), 2)`. Step 3: the platform is `o.platform`, `count(*) FILTER (WHERE band = 1)`.
3. `WITH spend AS (...), signups AS (...) SELECT s.channel, g.n, s.amount, ROUND(s.amount / g.n, 0) FROM spend s JOIN signups g ON ... ORDER BY s.channel`
