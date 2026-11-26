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
variants:
  - { from: "2026-07-01", to: "2026-10-01", q: "3/2026", q_en: "Q3 2026", d1: "01/07", d2: "30/09", d1_en: "1 July", d2_en: "30 September" }
  - { from: "2026-04-01", to: "2026-07-01", q: "2/2026", q_en: "Q2 2026", d1: "01/04", d2: "30/06", d1_en: "1 April", d2_en: "30 June" }
  - { from: "2026-01-01", to: "2026-04-01", q: "1/2026", q_en: "Q1 2026", d1: "01/01", d2: "31/03", d1_en: "1 January", d2_en: "31 March" }
reflect:
  q: { vi: "Vì sao tổng tiền hoàn không cần điều kiện được duyệt?", en: "Why does the refund total need no approved condition?" }
  options:
    - { vi: "Yêu cầu bị từ chối có tiền hoàn bằng 0, nên cộng tất cả vẫn ra đúng số đã hoàn", en: "Rejected requests have a refund of 0, so adding them all still gives the amount refunded" }
    - { vi: "Vì yêu cầu bị từ chối không có trong danh sách", en: "Because rejected requests are not in the list" }
    - { vi: "Thật ra có cần, kết quả đang sai", en: "It actually does; the result is wrong" }
  answer: 0
  why: { vi: "Yêu cầu bị từ chối ghi tiền hoàn bằng 0, nên cộng mọi yêu cầu ra đúng bằng cộng riêng yêu cầu được duyệt. Đọc dữ liệu trước khi thêm một điều kiện thừa.", en: "A rejected request records a refund of 0, so adding up every request gives exactly the approved total. Read the data before adding a condition you do not need." }
wrong:
  - sql: "SELECT reason, count(*), count(status), sum(refund) FROM returns WHERE requested_on >= '{{from}}' AND requested_on < '{{to}}' GROUP BY reason ORDER BY 2 DESC, reason"
    vi: "Cột thứ ba đang đếm mọi yêu cầu có trạng thái, kể cả yêu cầu bị từ chối. Đề chỉ đếm yêu cầu được duyệt hoàn tiền."
    en: "The third column counts every request with a status, rejected ones included. The task only counts requests approved for refund."
---
Mỗi quý nhóm chăm sóc khách hàng báo cáo hàng trả về: vì sao khách trả, bao nhiêu yêu cầu được duyệt, và sàn đã hoàn bao nhiêu tiền.

## Task
Các yêu cầu trả hàng gửi trong quý {{q}} (từ {{d1}} đến hết {{d2}}), theo từng lý do: số yêu cầu trả hàng, số yêu cầu được duyệt hoàn tiền, và tổng tiền đã hoàn. Nhiều yêu cầu nhất lên đầu; bằng nhau thì xếp theo lý do.

## Hints
1. Gom theo lý do; trong mỗi nhóm cần một số đếm mọi yêu cầu, một số đếm có điều kiện, và một tổng.
2. Ngày yêu cầu là `requested_on`; yêu cầu được duyệt là `status = 'approved'`, đếm bằng `count(*) FILTER (WHERE status = 'approved')`; tiền hoàn là `refund`.
3. `SELECT reason, count(*), count(*) FILTER (WHERE status = 'approved'), sum(refund) FROM returns WHERE ... GROUP BY reason ORDER BY 2 DESC, reason`

## Solution
```sql
SELECT reason, count(*), count(*) FILTER (WHERE status = 'approved'), sum(refund)
FROM returns
WHERE requested_on >= '{{from}}' AND requested_on < '{{to}}'
GROUP BY reason
ORDER BY 2 DESC, reason
```

# EN
Every quarter the customer care team reports on returns: why customers send items back, how many are approved, and how much the marketplace refunded.

## Task
For the return requests sent in {{q_en}} ({{d1_en}} to {{d2_en}}), per reason: the number of return requests, the number approved for refund, and the total refunded. Most requests first; on equal numbers, by reason.

## Hints
1. Group by reason; each group needs a count of every request, a conditional count, and a total.
2. The request date is `requested_on`; an approved request is `status = 'approved'`, counted with `count(*) FILTER (WHERE status = 'approved')`; the refund is `refund`.
3. `SELECT reason, count(*), count(*) FILTER (WHERE status = 'approved'), sum(refund) FROM returns WHERE ... GROUP BY reason ORDER BY 2 DESC, reason`
