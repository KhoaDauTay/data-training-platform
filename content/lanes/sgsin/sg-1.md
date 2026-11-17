---
id: sg-1
lane: SGSIN
chapter: 1
title: Mười lô nặng nhất đi Singapore
title_en: The ten heaviest shipments to Singapore
from: { name: Bùi Long, dept: Ops }
difficulty: 1
beat: rest
requires: [where, order_by, limit]
grants: []
tables: [shipments]
ordered: true
columns:
  - { vi: "Mã lô", en: "Shipment reference" }
  - { vi: "Ngày đặt chỗ", en: "Booking date" }
  - { vi: "Trọng lượng (kg)", en: "Weight (kg)" }
---
Hàng đi Singapore thường chạy tàu gom nhỏ, trọng tải có hạn: chuyến nào gần đủ tải thì lô nặng hay bị dời sang chuyến sau. Năm sau mình muốn báo trước cho hãng tàu những lô nặng để họ giữ chỗ. Mình cần xem những lô nặng nhất năm vừa rồi để biết hàng nặng tới mức nào.

## Task
Trong các lô xuất khẩu đặt chỗ năm 2025 đi cảng Singapore, không tính lô đã hủy, cho mình 10 lô nặng nhất: mã lô, ngày đặt chỗ, trọng lượng (kg). Nặng nhất xếp đầu; bằng trọng lượng thì theo mã lô từ A đến Z.

## Hints
1. Lọc đúng các lô cần xem trước, rồi xếp từ nặng tới nhẹ và chỉ giữ 10 dòng đầu.
2. Bảng `shipments`: cảng đến ở `pod` (Singapore là `SGSIN`), mã lô ở `ref`, ngày đặt chỗ ở `booking_date`, trọng lượng ở `gross_weight_kg`. Lô hủy có `status = 'CANCELLED'`.
3. `SELECT ref, booking_date, gross_weight_kg FROM shipments WHERE ... ORDER BY gross_weight_kg DESC, ref LIMIT 10`

## Solution
```sql
SELECT ref, booking_date, gross_weight_kg
FROM shipments
WHERE pod = 'SGSIN' AND direction = 'EXPORT' AND status <> 'CANCELLED'
  AND booking_date >= '2025-01-01' AND booking_date < '2026-01-01'
ORDER BY gross_weight_kg DESC, ref
LIMIT 10
```

# EN
Cargo to Singapore usually goes on small feeder ships with a limited weight capacity: when a sailing is nearly full, heavy shipments are the first to be moved to the next one. Next year I want to warn the carriers about heavy shipments early so they keep the space. I need to see last year's heaviest shipments to know how heavy they get.

## Task
Among export shipments booked in 2025 for the port of Singapore, leaving out cancelled ones, give me the 10 heaviest: shipment reference, booking date, weight (kg). Heaviest first; on equal weight, by reference from A to Z.

## Hints
1. Filter the shipments you need first, then sort from heaviest to lightest and keep only the first 10 rows.
2. Table `shipments`: the destination port is in `pod` (Singapore is `SGSIN`), the reference in `ref`, the booking date in `booking_date`, the weight in `gross_weight_kg`. A cancelled shipment has `status = 'CANCELLED'`.
3. `SELECT ref, booking_date, gross_weight_kg FROM shipments WHERE ... ORDER BY gross_weight_kg DESC, ref LIMIT 10`
