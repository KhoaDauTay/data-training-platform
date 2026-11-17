---
id: ecom-ch4-03
chapter: 4
title: Kiện đi mất bao lâu, kể cả kiện chưa tới
title_en: How long parcels take, unfinished ones included
from: { name: Nguyễn Thu Uyên, dept: Ops }
difficulty: 3
beat: twist
requires: [aggregate, group_by, order_by, date_math]
grants: [null_logic, coalesce]
tables: [deliveries]
ordered: true
columns:
  - { vi: "Đơn vị vận chuyển", en: "Courier" }
  - { vi: "Số ngày đi trung bình", en: "Average days on the road" }
variants:
  - { from: "2026-10-20", d1: "20/10/2026", d1_en: "20 October 2026" }
  - { from: "2026-10-15", d1: "15/10/2026", d1_en: "15 October 2026" }
  - { from: "2026-10-25", d1: "25/10/2026", d1_en: "25 October 2026" }
reflect:
  q: { vi: "Nếu tính trung bình thẳng trên ngày giao, kiện chưa giao bị xử lý thế nào?", en: "If you average straight over the delivery date, what happens to parcels not delivered yet?" }
  options:
    - { vi: "Bị bỏ qua, vì phép trừ với ô trống ra ô trống và hàm trung bình bỏ ô trống", en: "They are skipped, because subtracting from an empty cell gives an empty cell and the average ignores empty cells" }
    - { vi: "Được tính là 0 ngày", en: "They count as 0 days" }
    - { vi: "Truy vấn báo lỗi", en: "The query fails" }
  answer: 0
  why: { vi: "Kiện chưa tới thường là kiện chậm nhất. Bỏ qua chúng làm con số đẹp hơn sự thật; thay ô trống bằng hôm nay thì tính được kiện đó đã đi bao lâu.", en: "Parcels still on the way are usually the slowest. Skipping them makes the figure look better than the truth; replacing the empty cell with today measures how long they have travelled so far." }
wrong:
  - sql: "SELECT courier, ROUND(AVG(delivered_on - shipped_on), 2) FROM deliveries WHERE shipped_on >= '{{from}}' GROUP BY courier ORDER BY courier"
    vi: "Kiện chưa giao đang bị bỏ qua: ngày giao trống nên phép trừ ra ô trống, và hàm trung bình bỏ ô trống. Đề cần tính kiện chưa giao đến hôm nay."
    en: "Parcels not delivered yet are being skipped: their delivery date is empty, so the subtraction is empty and the average ignores it. The request counts them up to today."
---
Bài trước chỉ nhìn kiện đã giao. Nhưng kiện đang trên đường thường lại là kiện chậm nhất, và trong danh mục giao hàng chúng có ngày giao để trống. Mình muốn con số thật, tính cả những kiện đó.

## Task
Các kiện gửi đi từ ngày {{d1}} đến hôm nay 31/10/2026: theo từng đơn vị vận chuyển, trung bình một kiện đã đi bao nhiêu ngày? Kiện đã giao tính từ ngày gửi đến ngày giao; kiện chưa giao tính từ ngày gửi đến hôm nay 31/10/2026. Làm tròn 2 chữ số thập phân; xếp theo tên đơn vị vận chuyển.

## Hints
1. Kiện chưa giao có ngày giao trống. Thay ô trống đó bằng ngày hôm nay rồi mới trừ, thì mọi kiện đều có số ngày.
2. `COALESCE(delivered_on, DATE '2026-10-31')` lấy ngày giao nếu có, không có thì lấy 31/10/2026. Kiểm một ô có trống không thì viết `delivered_on IS NULL`.
3. `SELECT courier, ROUND(AVG(COALESCE(delivered_on, DATE '2026-10-31') - shipped_on), 2) FROM deliveries WHERE ... GROUP BY courier ORDER BY courier`

## Solution
```sql
SELECT courier, ROUND(AVG(COALESCE(delivered_on, DATE '2026-10-31') - shipped_on), 2)
FROM deliveries
WHERE shipped_on >= '{{from}}'
GROUP BY courier
ORDER BY courier
```

# EN
The last task only looked at delivered parcels. But parcels still on the road are often the slowest ones, and in the delivery list their delivery date is empty. I want the real figure, with those parcels included.

## Task
For the parcels shipped from {{d1_en}} up to today, 31 October 2026: per courier, how many days on average has a parcel been on the road? Delivered parcels count from shipping to delivery; parcels not delivered yet count from shipping to today, 31 October 2026. Round to 2 decimals; sort by courier name.

## Hints
1. A parcel not delivered yet has an empty delivery date. Replace that empty cell with today before subtracting, and every parcel gets a number of days.
2. `COALESCE(delivered_on, DATE '2026-10-31')` takes the delivery date when there is one, otherwise 31 October 2026. To test whether a cell is empty, write `delivered_on IS NULL`.
3. `SELECT courier, ROUND(AVG(COALESCE(delivered_on, DATE '2026-10-31') - shipped_on), 2) FROM deliveries WHERE ... GROUP BY courier ORDER BY courier`
