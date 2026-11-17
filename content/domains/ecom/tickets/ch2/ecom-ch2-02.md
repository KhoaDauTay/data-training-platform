---
id: ecom-ch2-02
chapter: 2
title: Kiện hàng theo đơn vị vận chuyển
title_en: Parcels per courier
from: { name: Nguyễn Thu Uyên, dept: Ops }
difficulty: 2
beat: develop
format: faded
requires: [aggregate]
grants: [group_by]
tables: [deliveries]
columns:
  - { vi: "Đơn vị vận chuyển", en: "Courier" }
  - { vi: "Số kiện gửi đi", en: "Parcels shipped" }
starter: |
  SELECT courier, count(*)
  FROM deliveries
  WHERE shipped_on >= '{{from}}' AND shipped_on < '{{to}}'
  GROUP BY ___
variants:
  - { month: "10/2026", month_en: "October 2026", from: "2026-10-01", to: "2026-11-01" }
  - { month: "8/2026", month_en: "August 2026", from: "2026-08-01", to: "2026-09-01" }
  - { month: "3/2026", month_en: "March 2026", from: "2026-03-01", to: "2026-04-01" }
reflect:
  q: { vi: "Cột nào được phép đứng cạnh hàm đếm trong danh sách cột?", en: "Which columns may stand next to the count in the column list?" }
  options:
    - { vi: "Chỉ những cột dùng để gom nhóm", en: "Only the columns you group by" }
    - { vi: "Mọi cột của bảng", en: "Every column of the table" }
    - { vi: "Không cột nào", en: "No column at all" }
  answer: 0
  why: { vi: "Mỗi nhóm ra một dòng, nên một cột chỉ có một giá trị cho cả nhóm khi nó là cột gom nhóm (hoặc nằm trong hàm gộp).", en: "Each group gives one row, so a column has one value for the whole group only when it is a grouping column (or sits inside an aggregate)." }
wrong:
  - sql: "SELECT courier, count(*) FROM deliveries GROUP BY courier"
    vi: "Bạn đang đếm mọi kiện từ ngày mở sàn. Đề chỉ cần kiện gửi đi trong tháng đó."
    en: "You are counting every parcel since the marketplace opened. The request is only for parcels shipped in that month."
---
Mỗi tháng mình họp với ba đơn vị vận chuyển để thương lượng giá. Đơn vị nào nhận nhiều kiện thì mình có thể đòi giá tốt hơn, nên mình cần biết mỗi bên đã chở bao nhiêu kiện.

Câu truy vấn trong editor gần xong, chỉ thiếu thứ cần gom nhóm ở chỗ trống ___.

## Task
Mỗi đơn vị vận chuyển đã nhận bao nhiêu kiện gửi đi trong tháng {{month}} (tính theo ngày gửi)? Mỗi đơn vị một dòng: tên đơn vị và số kiện. Thứ tự dòng không quan trọng.

## Hints
1. Đếm như bài trước, nhưng đếm riêng cho từng đơn vị vận chuyển: mỗi đơn vị là một nhóm.
2. Gom nhóm theo cột tên đơn vị: `GROUP BY courier`.
3. `SELECT courier, count(*) FROM deliveries WHERE ... GROUP BY courier`

## Solution
```sql
SELECT courier, count(*)
FROM deliveries
WHERE shipped_on >= '{{from}}' AND shipped_on < '{{to}}'
GROUP BY courier
```

# EN
Every month I meet our three couriers to negotiate rates. The more parcels a courier gets from us, the better the rate I can ask for, so I need to know how many parcels each one carried.

The query in the editor is almost done; only the thing to group by is missing at the ___ blank.

## Task
How many parcels did each courier take in {{month_en}} (by shipping date)? One row per courier: its name and the number of parcels. Row order does not matter.

## Hints
1. Count like the last task, but count separately for each courier: each courier is one group.
2. Group by the courier name column: `GROUP BY courier`.
3. `SELECT courier, count(*) FROM deliveries WHERE ... GROUP BY courier`
