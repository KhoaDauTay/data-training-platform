---
id: ecom-ch6-04
chapter: 6
title: Hàng trả về theo lý do
title_en: Returns by reason
from: { name: Hồ Ngọc Diệp, dept: CS }
difficulty: 2
beat: rest
requires: [conditional_agg, aggregate, group_by, order_by, where]
grants: []
tables: [returns]
ordered: true
columns:
  - { vi: "Lý do trả hàng", en: "Return reason" }
  - { vi: "Số yêu cầu trả hàng", en: "Return requests" }
  - { vi: "Số yêu cầu được duyệt hoàn tiền", en: "Requests approved for refund" }
  - { vi: "Tổng tiền đã hoàn (đồng)", en: "Total refunded (VND)" }
reflect:
  q: { vi: "Vì sao tổng tiền hoàn không cần điều kiện được duyệt?", en: "Why does the refund total need no approved condition?" }
  options:
    - { vi: "Món bị từ chối có tiền hoàn bằng 0, nên cộng tất cả vẫn ra đúng số đã hoàn", en: "Rejected items have a refund of 0, so adding them all still gives the amount refunded" }
    - { vi: "Vì món bị từ chối không có trong danh mục", en: "Because rejected items are not in the list" }
    - { vi: "Thật ra có cần, kết quả đang sai", en: "It actually does; the result is wrong" }
  answer: 0
  why: { vi: "Đọc kỹ dữ liệu trước khi thêm điều kiện: ở đây món bị từ chối ghi tiền hoàn bằng 0.", en: "Read the data before adding conditions: here a rejected item records a refund of 0." }
wrong:
  - sql: "SELECT reason, count(*), count(status), sum(refund) FROM returns WHERE requested_on >= '2026-07-01' AND requested_on < '2026-10-01' GROUP BY reason ORDER BY 2 DESC, reason"
    vi: "Cột thứ ba đang đếm mọi món có trạng thái, kể cả món bị từ chối. Đề chỉ đếm món được duyệt hoàn tiền."
    en: "The third column counts every item with a status, rejected ones included. The request only counts items approved for refund."
---
Mỗi quý nhóm chăm sóc khách hàng báo cáo hàng trả về: vì sao khách trả, bao nhiêu món được duyệt, và sàn đã hoàn bao nhiêu tiền.

## Task
Các yêu cầu trả hàng gửi trong quý 3/2026 (từ 01/07 đến hết 30/09), theo từng lý do: số yêu cầu trả hàng, số yêu cầu được duyệt hoàn tiền, và tổng tiền đã hoàn. Nhiều yêu cầu nhất lên đầu; bằng nhau thì xếp theo lý do.

## Hints
1. Gom theo lý do; trong mỗi nhóm cần một số đếm mọi món, một số đếm có điều kiện, và một tổng.
2. Ngày yêu cầu là `requested_on`; món được duyệt là `status = 'approved'`, đếm bằng `count(*) FILTER (WHERE status = 'approved')`; tiền hoàn là `refund`.
3. `SELECT reason, count(*), count(*) FILTER (WHERE status = 'approved'), sum(refund) FROM returns WHERE ... GROUP BY reason ORDER BY 2 DESC, reason`

## Solution
```sql
SELECT reason, count(*), count(*) FILTER (WHERE status = 'approved'), sum(refund)
FROM returns
WHERE requested_on >= '2026-07-01' AND requested_on < '2026-10-01'
GROUP BY reason
ORDER BY 2 DESC, reason
```

# EN
Every quarter the customer care team reports on returns: why customers send items back, how many are approved, and how much the marketplace refunded.

## Task
For the return requests sent in Q3 2026 (1 July to 30 September), per reason: the number of return requests, the number approved for refund, and the total refunded. Most requests first; on equal numbers, by reason.

## Hints
1. Group by reason; each group needs a count of every item, a conditional count, and a total.
2. The request date is `requested_on`; an approved item is `status = 'approved'`, counted with `count(*) FILTER (WHERE status = 'approved')`; the refund is `refund`.
3. `SELECT reason, count(*), count(*) FILTER (WHERE status = 'approved'), sum(refund) FROM returns WHERE ... GROUP BY reason ORDER BY 2 DESC, reason`
