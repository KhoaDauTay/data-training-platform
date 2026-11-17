---
id: sg-3
lane: SGSIN
chapter: 4
title: Đi Singapore thực tế mất mấy ngày
title_en: How long Singapore really takes
from: { name: Võ Thu, dept: CS }
difficulty: 2
beat: rest
requires: [date_math, aggregate, group_by, order_by]
grants: []
tables: [shipments]
ordered: true
columns:
  - { vi: "Cảng xếp hàng", en: "Port of loading" }
  - { vi: "Số lô", en: "Shipments" }
  - { vi: "Số ngày đi biển trung bình", en: "Average days at sea" }
---
Bảng giá ghi tuyến Singapore khoảng 3 ngày, nhưng khách cứ phàn nàn là lâu hơn. Mình muốn biết thực tế từng cảng xếp hàng mất bao nhiêu ngày.

## Task
Với các lô đến cảng Singapore có ngày cập cảng thực tế từ 01/01/2026 đến hết 31/10/2026, mỗi cảng xếp hàng cho mình: số lô và số ngày đi biển trung bình (từ ngày tàu chạy thực tế tới ngày cập cảng thực tế, không làm tròn). Xếp theo mã cảng xếp hàng từ A đến Z.

## Hints
1. Số ngày đi biển của một lô là hiệu hai ngày thực tế của lô đó; tính cho từng lô rồi lấy trung bình theo cảng xếp hàng.
2. Bảng `shipments`: cảng xếp hàng `pol`, cảng đến `pod` (Singapore là `SGSIN`), ngày tàu chạy thực tế `atd`, ngày cập cảng thực tế `ata`. Trừ hai cột ngày cho ra số ngày: `ata - atd`.
3. `SELECT pol, COUNT(*), AVG(ata - atd) FROM shipments WHERE pod = 'SGSIN' AND ... GROUP BY pol ORDER BY pol`

## Solution
```sql
SELECT pol, COUNT(*), AVG(ata - atd)
FROM shipments
WHERE pod = 'SGSIN' AND ata >= '2026-01-01' AND ata < '2026-11-01'
GROUP BY pol
ORDER BY pol
```

# EN
The rate sheet says Singapore takes about 3 days, but customers keep complaining it is longer. I want to know how many days it really takes from each port of loading.

## Task
For shipments to the port of Singapore whose actual arrival is between 1 January 2026 and 31 October 2026, give me for each port of loading: the number of shipments and the average days at sea (from the actual departure to the actual arrival, not rounded). Sort by the port of loading's code from A to Z.

## Hints
1. A shipment's days at sea are the difference between its two actual dates; work it out per shipment, then average it per port of loading.
2. Table `shipments`: port of loading `pol`, destination `pod` (Singapore is `SGSIN`), actual departure `atd`, actual arrival `ata`. Subtracting two date columns gives days: `ata - atd`.
3. `SELECT pol, COUNT(*), AVG(ata - atd) FROM shipments WHERE pod = 'SGSIN' AND ... GROUP BY pol ORDER BY pol`
