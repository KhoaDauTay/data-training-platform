---
id: ecom-ch4-05
chapter: 4
title: "Đánh giá thăng tiến: sau đợt sale 10.10"
title_en: "Promotion review: after the 10.10 sale"
from: { name: Võ Thanh Hà, dept: Management }
difficulty: 3
beat: boss
requires: [null_logic, coalesce, date_math, date_bucket, join, aggregate, group_by, order_by]
grants: []
tables: [orders, deliveries]
ordered: true
columns:
  - [{ vi: "Ngày", en: "Day" }, { vi: "Số đơn", en: "Orders" }]
  - [{ vi: "Mã đơn", en: "Order code" }, { vi: "Đơn vị vận chuyển", en: "Courier" }, { vi: "Thành phố nhận", en: "Delivery city" }, { vi: "Số ngày quá hẹn", en: "Days past the promise" }]
  - [{ vi: "Tuần gửi (thứ Hai đầu tuần)", en: "Shipping week (its Monday)" }, { vi: "Số ngày trễ trung bình", en: "Average days late" }]
conclusion:
  question: "Theo bước 3, Kite Logistics bắt đầu giao trễ ở miền Trung từ tuần nào?"
  options:
    - "Từ tuần bắt đầu thứ Hai 31/8/2026, ngay trước đợt sale 9.9"
    - "Từ tuần của đợt sale 10.10"
    - "Kite Logistics trễ đều từ đầu tháng 8"
  answer: 0
conclusion_en:
  question: "According to step 3, from which week did Kite Logistics start running late in central Vietnam?"
  options:
    - "From the week starting Monday 31 August 2026, right before the 9.9 sale"
    - "From the week of the 10.10 sale"
    - "Kite Logistics was equally late from early August"
---
Đây là buổi đánh giá thăng tiến của bạn. Đợt sale 10.10 vừa qua bán rất tốt, nhưng khách miền Trung than giao chậm. Mình cần ba bảng số cho buổi họp với Kite Logistics. Làm đúng cả ba là bạn bước thêm một bước trong sự nghiệp.

## Step 1: Đơn từng ngày quanh 10.10
Từ ngày 07/10 đến hết 13/10/2026, mỗi ngày có bao nhiêu đơn (tính mọi đơn, kể cả đơn đã hủy)? Ngày ghi bằng mốc đầu ngày; ngày sớm nhất lên đầu.
```sql
SELECT date_trunc('day', ordered_at), count(*)
FROM orders
WHERE ordered_at >= '2026-10-07' AND ordered_at < '2026-10-14'
GROUP BY 1
ORDER BY 1
```

## Step 2: Kiện quá hẹn mà chưa giao
Tính đến hôm nay 31/10/2026: các kiện chưa giao mà ngày hẹn giao đã qua (trước hôm nay). Gửi mã đơn, đơn vị vận chuyển, thành phố nhận và số ngày đã quá hẹn (31/10/2026 trừ ngày hẹn). Quá hẹn lâu nhất lên đầu; bằng nhau thì mã đơn nhỏ hơn đứng trước.
```sql
SELECT o.code, d.courier, d.city, DATE '2026-10-31' - d.promised_on
FROM deliveries d
JOIN orders o ON o.id = d.order_id
WHERE d.delivered_on IS NULL AND d.promised_on < '2026-10-31'
ORDER BY 4 DESC, o.code
```

## Step 3: Kite Logistics ở miền Trung, theo tuần
Các kiện Kite Logistics chở tới Da Nang, Hue và Nha Trang, gửi đi từ thứ Hai 03/08 đến hết Chủ nhật 25/10/2026: theo tuần gửi (tuần bắt đầu từ thứ Hai, ghi bằng ngày thứ Hai đó), trung bình giao trễ bao nhiêu ngày so với ngày hẹn? Kiện chưa giao tính đến hôm nay 31/10/2026. Làm tròn 2 chữ số thập phân; tuần sớm nhất lên đầu.
```sql
SELECT date_trunc('week', shipped_on), ROUND(AVG(COALESCE(delivered_on, DATE '2026-10-31') - promised_on), 2)
FROM deliveries
WHERE courier = 'Kite Logistics' AND city IN ('Da Nang', 'Hue', 'Nha Trang')
  AND shipped_on >= '2026-08-03' AND shipped_on < '2026-10-26'
GROUP BY 1
ORDER BY 1
```

## Hints
1. Bước 1 gom theo ngày như gom theo tháng. Bước 2 tìm kiện có ngày giao trống. Bước 3 gom theo tuần, và thay ngày giao trống bằng hôm nay như bài kiện đi mất bao lâu.
2. Bước 1: `date_trunc('day', ordered_at)`. Bước 2: `d.delivered_on IS NULL`, `DATE '2026-10-31' - d.promised_on`. Bước 3: `date_trunc('week', shipped_on)`, `COALESCE(delivered_on, DATE '2026-10-31') - promised_on`, `city IN ('Da Nang', 'Hue', 'Nha Trang')`.
3. `SELECT date_trunc('week', shipped_on), ROUND(AVG(COALESCE(delivered_on, DATE '2026-10-31') - promised_on), 2) FROM deliveries WHERE ... GROUP BY 1 ORDER BY 1`

# EN
This is your promotion review. The 10.10 sale sold very well, but customers in central Vietnam complain about slow deliveries. I need three tables for the meeting with Kite Logistics. Get all three right and you take another step in your career.

## Step 1: Orders per day around 10.10
From 7 to 13 October 2026, how many orders were placed each day (every order, cancelled ones included)? Each day shown as its start; earliest day first.

## Step 2: Parcels past their promise and not delivered
As of today, 31 October 2026: the parcels not delivered yet whose promised date has already passed (before today). Send the order code, courier, delivery city and how many days past the promise (31 October 2026 minus the promised date). Longest overdue first; on equal days, the smaller order code first.

## Step 3: Kite Logistics in central Vietnam, by week
The parcels Kite Logistics carried to Da Nang, Hue and Nha Trang, shipped from Monday 3 August to Sunday 25 October 2026: per shipping week (weeks start on Monday and are shown as that Monday), how many days late on average compared with the promised date? Parcels not delivered yet count up to today, 31 October 2026. Round to 2 decimals; earliest week first.

## Hints
1. Step 1 groups by day the way you grouped by month. Step 2 looks for parcels with an empty delivery date. Step 3 groups by week and replaces an empty delivery date with today, like the how-long-parcels-take task.
2. Step 1: `date_trunc('day', ordered_at)`. Step 2: `d.delivered_on IS NULL`, `DATE '2026-10-31' - d.promised_on`. Step 3: `date_trunc('week', shipped_on)`, `COALESCE(delivered_on, DATE '2026-10-31') - promised_on`, `city IN ('Da Nang', 'Hue', 'Nha Trang')`.
3. `SELECT date_trunc('week', shipped_on), ROUND(AVG(COALESCE(delivered_on, DATE '2026-10-31') - promised_on), 2) FROM deliveries WHERE ... GROUP BY 1 ORDER BY 1`
