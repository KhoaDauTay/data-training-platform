---
id: fin-ch2-04
chapter: 2
title: Hồ sơ được duyệt theo kênh nộp
title_en: Approved applications by channel
from: { name: Phùng Đức Lâm, dept: Sales }
difficulty: 1
beat: rest
requires: [select, where, aggregate, group_by]
grants: []
tables: [applications]
columns:
  - { vi: "Kênh nộp hồ sơ", en: "Application channel" }
  - { vi: "Số hồ sơ được duyệt", en: "Approved applications" }
  - { vi: "Tổng tiền xin vay", en: "Total amount requested" }
variants:
  - { from: "2026-10-01", to: "2026-11-01", month: "10/2026", month_en: "October 2026" }
  - { from: "2026-09-01", to: "2026-10-01", month: "9/2026", month_en: "September 2026" }
  - { from: "2026-08-01", to: "2026-09-01", month: "8/2026", month_en: "August 2026" }
reflect:
  q: { vi: "Nếu bỏ điều kiện \"được duyệt\", con số sai thế nào?", en: "If you drop the \"approved\" condition, how does the figure go wrong?" }
  options:
    - { vi: "Đếm cả hồ sơ bị từ chối và hồ sơ khách tự hủy, nên số hồ sơ và tổng tiền đều lớn hơn thật", en: "It also counts rejected and cancelled applications, so both the count and the total are too high" }
    - { vi: "Không đổi gì, vì kênh nộp đã đủ để lọc", en: "Nothing changes, the channel is enough of a filter" }
    - { vi: "Chỉ tổng tiền sai, số hồ sơ vẫn đúng", en: "Only the total is wrong, the count stays right" }
  answer: 0
  why: { vi: "Mỗi hồ sơ có một quyết định. Câu hỏi về kênh mang lại khoản vay thật, nên chỉ hồ sơ được duyệt mới tính.", en: "Every application has one decision. The question is about which channel brings real loans, so only approved applications count." }
wrong:
  - sql: "SELECT channel, count(*), sum(amount) FROM applications WHERE applied_on >= '{{from}}' AND applied_on < '{{to}}' GROUP BY channel"
    vi: "Bạn đếm mọi hồ sơ, kể cả hồ sơ bị từ chối hay đã hủy. Đề chỉ cần hồ sơ được duyệt."
    en: "You counted every application, rejected and cancelled ones included. The request is only for approved applications."
---
Mình đang so ba kênh nhận hồ sơ: quầy chi nhánh, ứng dụng và đối tác bán hàng. Kênh nào mang lại nhiều khoản vay thật nhất trong tháng vừa rồi?

## Task
Hồ sơ nộp trong tháng {{month}} và được duyệt, theo kênh nộp: kênh, số hồ sơ và tổng số tiền xin vay. Thứ tự dòng không quan trọng.

## Hints
1. Lọc hồ sơ được duyệt trong tháng, rồi gom theo kênh: đếm hồ sơ và cộng số tiền xin vay.
2. Bảng `applications`: `decision = 'approved'`, `applied_on >= '{{from}}' AND applied_on < '{{to}}'`, `GROUP BY channel`.
3. `SELECT channel, count(*), sum(amount) FROM applications WHERE ... GROUP BY channel`

## Solution
```sql
SELECT channel, count(*), sum(amount)
FROM applications
WHERE decision = 'approved' AND applied_on >= '{{from}}' AND applied_on < '{{to}}'
GROUP BY channel
```

# EN
I am comparing our three channels for applications: the branch counter, the app and our retail partners. Which one brought in the most real loans last month?

## Task
The applications made in {{month_en}} and approved, per channel: channel, number of applications and total amount requested. Row order does not matter.

## Hints
1. Filter the approved applications of the month, then group by channel: count the applications and add up the amount requested.
2. Table `applications`: `decision = 'approved'`, `applied_on >= '{{from}}' AND applied_on < '{{to}}'`, `GROUP BY channel`.
3. `SELECT channel, count(*), sum(amount) FROM applications WHERE ... GROUP BY channel`
