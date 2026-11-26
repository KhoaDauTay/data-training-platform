---
id: e-bp-m27
engine: best
track: mongodb
level: L3
module: m
title: "Bật xác thực và phân quyền theo vai trò ngay từ đầu"
title_en: "Enable access control from day one"
kind: quiz
minutes: 3
objectives:
  - vi: "Bật access control trước khi mở cổng ra mạng, và cấp cho mỗi người dùng vai trò có sẵn ít quyền nhất (`read`, `readWrite` trên đúng database)."
    en: "Turn on access control before opening any network port, and give each user the least powerful built-in role that works (`read`, `readWrite` on the right database)."
avoid:
  vi: "Tài khoản báo cáo dùng vai trò `root`, nên một mật khẩu lộ là mất cả cụm."
  en: "A reporting account with the `root` role, so one leaked password gives away the whole cluster."
requires: []
skills: []
adv: []
sources:
  - https://www.mongodb.com/docs/manual/administration/security-checklist/
verified: { version: "MongoDB manual 9.0", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    db.createUser({ user: 'report', pwd: passwordPrompt(), roles: ['root'] })
  good: |
    db.createUser({ user: 'report', pwd: passwordPrompt(), roles: [{ role: 'read', db: 'shop' }] })
  expect: null
quiz:
  - q:
      vi: "Một người phân tích chỉ cần đọc database `shop` để làm báo cáo. Vai trò nào hợp?"
      en: "An analyst only needs to read the `shop` database for reports. Which role fits?"
    options:
      - { vi: "`root`", en: "`root`" }
      - { vi: "`readWrite` trên `shop`", en: "`readWrite` on `shop`" }
      - { vi: "`read` trên `shop`", en: "`read` on `shop`" }
    answer: 2
    why:
      vi: "Người phân tích chỉ đọc `shop`, nên cấp đúng `read` trên `shop` (quyền tối thiểu). `readWrite` cho thêm quyền ghi họ không cần; `root` cho toàn quyền trên mọi database. Tài khoản bị lộ thì kẻ gian chỉ đọc được `shop`, không sửa hay xóa được gì."
      en: "The analyst only reads `shop`, so grant exactly `read` on `shop` (least privilege). `readWrite` adds write access they do not need; `root` gives full power over every database. If the account leaks, the attacker can only read `shop`, not change or delete anything."
---

## Ý chính

Bật access control (bắt buộc xác thực) trước khi mở cổng ra mạng. Tạo người dùng theo vai trò có sẵn ít quyền nhất, như `read` hay `readWrite` trên đúng database; không dùng `root` cho ứng dụng hay người phân tích. Chỉ nghe trên mạng tin cậy và bật TLS.

## Vì sao

- "Bật access control và bắt buộc xác thực" là mục đầu tiên của security checklist trong docs.
- Một mật khẩu bị lộ chỉ gây hại trong phạm vi quyền của tài khoản đó.
- Thẻ này chỉ cú pháp: mingo không có người dùng hay quyền.

# EN

## Key idea

Turn on access control (mandatory authentication) before opening any network port. Create users with the least powerful built-in role that works, such as `read` or `readWrite` on the right database; never `root` for an application or an analyst. Listen only on trusted networks and enable TLS.

## Why

- "Enable access control and enforce authentication" is the first item of the security checklist in the docs.
- A leaked password can only do harm within that account's privileges.
- This card is syntax only: mingo has no users or privileges.
