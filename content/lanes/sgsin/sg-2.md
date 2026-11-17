---
id: sg-2
lane: SGSIN
chapter: 3
title: Tuyến nào đổi tàu ở Singapore
title_en: Which lanes change ship in Singapore
from: { name: Hoàng Khánh, dept: Ops }
difficulty: 2
beat: rest
requires: [join, where, order_by]
grants: []
tables: [lane_profiles, ports]
ordered: true
columns:
  - { vi: "Cảng đến", en: "Destination port" }
  - { vi: "Quãng đường (hải lý)", en: "Distance (nautical miles)" }
  - { vi: "Số ngày đi biển", en: "Days at sea" }
---
Khách mới hỏi vì sao hàng đi châu Âu phải đổi tàu ở Singapore. Mình muốn có danh sách tuyến đi qua đó để giải thích cho gọn.

## Task
Từ cảng Tiên Sa, những tuyến nào phải đổi tàu ở Singapore? Mỗi tuyến cho mình tên cảng đến, quãng đường (hải lý) và số ngày đi biển. Tuyến nhiều ngày đi biển nhất xếp đầu; bằng nhau thì theo tên cảng từ A đến Z.

## Hints
1. Hồ sơ tuyến chỉ ghi mã cảng; tên cảng nằm ở danh mục cảng, nên cần nối hai bảng qua mã cảng đến.
2. Bảng `lane_profiles` (mở cùng tuyến Singapore): cảng đi `pol` (Tiên Sa là `VNDAD`), cảng đến `pod`, cảng đổi tàu `via_port` (Singapore là `SGSIN`), quãng đường `distance_nm`, số ngày `sea_days`. Tên cảng ở `ports.name`, khóa là `ports.code`.
3. `SELECT p.name, l.distance_nm, l.sea_days FROM lane_profiles l JOIN ports p ON p.code = l.pod WHERE ... ORDER BY l.sea_days DESC, p.name`

## Solution
```sql
SELECT p.name, l.distance_nm, l.sea_days
FROM lane_profiles l
JOIN ports p ON p.code = l.pod
WHERE l.pol = 'VNDAD' AND l.via_port = 'SGSIN'
ORDER BY l.sea_days DESC, p.name
```

# EN
A new customer asked why cargo to Europe has to change ship in Singapore. I want the list of lanes that go through it, to explain it in one go.

## Task
From the port of Tien Sa, which lanes change ship in Singapore? For each lane give me the destination port's name, the distance (nautical miles) and the days at sea. The lane with the most days at sea first; on a tie, port name from A to Z.

## Hints
1. The lane profile only has port codes; the port names are in the port list, so join the two tables on the destination code.
2. Table `lane_profiles` (it opens with the Singapore lane): port of loading `pol` (Tien Sa is `VNDAD`), destination `pod`, transshipment port `via_port` (Singapore is `SGSIN`), distance `distance_nm`, days `sea_days`. The port name is `ports.name`, its key `ports.code`.
3. `SELECT p.name, l.distance_nm, l.sea_days FROM lane_profiles l JOIN ports p ON p.code = l.pod WHERE ... ORDER BY l.sea_days DESC, p.name`
