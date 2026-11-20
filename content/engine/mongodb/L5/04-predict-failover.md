---
id: e-mg-l5-04
engine: mongodb
level: L5
module: replication
title: "Đoán kết quả: lần ghi nào sống sót sau failover?"
title_en: "Predict the outcome: which write survives a failover?"
kind: predict
minutes: 7
runtime: docs
objectives:
  - vi: "Đọc một kịch bản failover và đoán dữ liệu nào bị rollback"
    en: "Read a failover scenario and predict which data is rolled back"
requires: [e-mg-l5-03, e-mg-l4-07]
sources:
  - https://www.mongodb.com/docs/manual/reference/write-concern/
  - https://www.mongodb.com/docs/manual/core/replica-set-elections/
predict:
  sql: |
    db.orders.insertOne({ _id: 1 }, { writeConcern: { w: 1 } })
    db.orders.insertOne({ _id: 2 }, { writeConcern: { w: "majority" } })
    db.orders.insertOne({ _id: 3 }, { writeConcern: { w: 1 } })
  q:
    vi: "Replica set P-S-S. Cả ba lệnh đều được xác nhận. Ngay sau lệnh 3, primary sập trước khi secondary nào chép được lệnh 3; một secondary thành primary mới. Tài liệu nào chắc chắn còn?"
    en: "A P-S-S replica set. All three commands were acknowledged. Right after command 3, the primary fails before any secondary copies command 3; a secondary becomes the new primary. Which documents are certain to remain?"
  options:
    - vi: "Cả ba, vì cả ba đã được xác nhận"
      en: "All three, because all three were acknowledged"
    - vi: "`_id` 1 và 2; `_id` 3 bị rollback khi primary cũ quay lại"
      en: "`_id` 1 and 2; `_id` 3 is rolled back when the old primary returns"
    - vi: "Chỉ `_id` 2"
      en: "Only `_id` 2"
  answer: 1
  why:
    vi: "Lệnh 2 dùng `w: \"majority\"` nên đã nằm trong oplog của một secondary trước khi được xác nhận. Oplog áp theo thứ tự, nên secondary có lệnh 2 cũng đã có lệnh 1 đứng trước; secondary được bầu phải có optime cao nhất nên có cả 1 và 2. Lệnh 3 chỉ ở primary cũ, nên bị rollback."
    en: "Command 2 used `w: \"majority\"`, so it was in a secondary's oplog before being acknowledged. The oplog is applied in order, so a secondary holding command 2 also holds command 1 before it; the elected secondary must have the highest optime, so it has both 1 and 2. Command 3 was only on the old primary, so it is rolled back."
---

## Ý chính

Đây là bài đoán theo docs chính thức của MongoDB (trang "Write Concern" và "Replica Set Elections"); trình duyệt không có replica set. Các sự thật dùng:

- `w: 1` chỉ chờ primary; dữ liệu có thể bị rollback nếu primary bước xuống trước khi chép sang secondary nào.
- `w: "majority"` chờ đa số thành viên bỏ phiếu mang dữ liệu ghi bền mục oplog.
- Secondary áp oplog theo đúng thứ tự của primary.
- Một thành viên chỉ thành primary nếu có optime cao nhất trong các thành viên nó thấy.

Lệnh 1 ở đây sống sót nhờ thứ tự oplog, không nhờ write concern của chính nó: đừng dựa vào điều này. Luồng ghi quan trọng nên tự đòi `w: "majority"`.

## Ví dụ

```javascript
db.orders.insertOne({ _id: 3 }, { writeConcern: { w: "majority", wtimeout: 5000 } })
```

Đúng với docs chính thức của MongoDB hiện hành, kiểm ngày 2026-11-20. Phần chạy thật cần máy chủ thật (nhiều phiên / replica set / AWS). Bài này dùng sơ đồ và kết quả ghi sẵn.

# EN

## Key idea

This is a prediction based on the MongoDB docs (pages "Write Concern" and "Replica Set Elections"); the browser has no replica set. The facts used:

- `w: 1` waits only for the primary; data can be rolled back if the primary steps down before the write reaches any secondary.
- `w: "majority"` waits for a majority of data-bearing voting members to durably write the oplog entry.
- Secondaries apply the oplog in the primary's order.
- A member becomes primary only if it has the highest optime of the members it can see.

Command 1 survives here because of oplog order, not because of its own write concern: do not rely on that. Important writes should ask for `w: "majority"` themselves.

## Example

```javascript
db.orders.insertOne({ _id: 3 }, { writeConcern: { w: "majority", wtimeout: 5000 } })
```

Matches the current MongoDB manual, checked 2026-11-20. The real run needs a real server (several sessions / replica set / AWS). This lesson uses diagrams and recorded results.
