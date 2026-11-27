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
  - vi: "Chọn write concern cho lần ghi phải sống sót khi primary đổi"
    en: "Choose the write concern for a write that must survive a primary change"
requires: [e-mg-l5-03, e-mg-l4-07]
sources:
  - { url: https://www.mongodb.com/docs/manual/reference/write-concern/, title_vi: "Write concern" }
  - { url: https://www.mongodb.com/docs/manual/core/replica-set-elections/, title_vi: "Bầu primary trong replica set" }
  - { url: https://www.mongodb.com/docs/manual/core/replica-set-rollbacks/, title_vi: "Rollback trong replica set" }
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
  trap: 0
  why:
    vi: "\"Đã xác nhận là an toàn\" nghe hợp lý, nhưng `w: 1` chỉ xác nhận rằng primary đã nhận. Lệnh 2 dùng `w: \"majority\"` nên đã nằm trong oplog của một secondary trước khi được xác nhận. Oplog áp theo thứ tự, nên secondary có lệnh 2 cũng đã có lệnh 1: vì vậy \"chỉ `_id` 2\" sai. Secondary được bầu phải có optime (thời điểm của mục oplog mới nhất nó đã áp) cao nhất, nên có cả 1 và 2. Lệnh 3 chỉ ở primary cũ, nên bị rollback."
    en: "\"Acknowledged means safe\" sounds right, but `w: 1` only confirms the primary received it. Command 2 used `w: \"majority\"`, so it was in a secondary's oplog before being acknowledged. The oplog is applied in order, so a secondary holding command 2 also holds command 1: that is why \"only `_id` 2\" is wrong. The elected secondary must have the highest optime (the time of the newest oplog entry it has applied), so it has both 1 and 2. Command 3 was only on the old primary, so it is rolled back."
  recorded:
    tier: docs
    server: MongoDB
    version: "9.0"
    date: "2026-11-20"
    url: https://www.mongodb.com/docs/manual/reference/write-concern/
quiz:
  - q:
      vi: "Lệnh 3 bị rollback. Dữ liệu của nó đi đâu?"
      en: "Command 3 is rolled back. Where does its data go?"
    options:
      - { vi: "Mất hẳn, không còn dấu vết", en: "Gone for good, with no trace" }
      - { vi: "Primary cũ ghi nó ra tệp rollback để người vận hành xem và áp lại nếu cần", en: "The old primary writes it to rollback files for an operator to review and reapply if needed" }
      - { vi: "Primary mới tự áp lại nó", en: "The new primary reapplies it automatically" }
    answer: 1
    trap: 2
    why:
      vi: "Nghe hợp lý rằng cluster tự sửa, nhưng primary mới không biết gì về lệnh 3. Khi primary cũ quay lại làm secondary, nó hoàn tác các lần ghi chưa được chép và ghi chúng ra tệp rollback; áp lại là việc của người vận hành. Vì có tệp đó nên dữ liệu không mất hẳn, chỉ không còn trong collection."
      en: "It sounds right that the cluster heals itself, but the new primary knows nothing of command 3. When the old primary returns as a secondary, it reverts the writes that were never replicated and saves them to rollback files; reapplying them is an operator's job. Because of those files the data is not gone for good, only out of the collection."
---
## Mở bài

Ứng dụng nhận "OK" cho ba đơn hàng, rồi primary sập ngay sau đó. Một phút sau cluster chạy lại với primary mới, nhưng có một đơn biến mất. Đơn nào, và vì sao "OK" chưa đủ?

## Ý chính

Đây là bài đoán theo docs chính thức của MongoDB (trang "Write Concern", "Replica Set Elections" và "Rollbacks During Replica Set Failover"); trình duyệt không có replica set. Các sự thật dùng: `w: 1` chỉ chờ primary, nên dữ liệu có thể bị rollback nếu primary bước xuống trước khi chép sang secondary nào; `w: "majority"` chờ đa số thành viên bỏ phiếu mang dữ liệu ghi bền mục oplog; secondary áp oplog theo đúng thứ tự của primary; một thành viên chỉ thành primary nếu có optime cao nhất trong các thành viên nó thấy.

Nhiều người nghĩ một lần ghi đã được xác nhận thì không thể mất. Thật ra mức an toàn do write concern quyết định. Lệnh 1 ở đây sống sót nhờ thứ tự oplog, không nhờ write concern của chính nó: đừng dựa vào điều này. Luồng ghi quan trọng nên tự đòi `w: "majority"`, kèm `wtimeout` để không chờ mãi khi thiếu đa số.

## Tóm tắt

- `w: 1` = primary đã nhận; vẫn có thể bị rollback khi primary đổi.
- `w: "majority"` = đa số đã ghi bền vào oplog; primary mới chắc chắn có nó.
- Oplog áp theo thứ tự, và primary mới có optime cao nhất.
- Lần ghi bị rollback nằm trong tệp rollback của primary cũ, không tự quay lại.

# EN

## Opening

The application gets "OK" for three orders, then the primary fails right after. A minute later the cluster runs again with a new primary, but one order has vanished. Which one, and why was "OK" not enough?

## Key idea

This is a prediction based on the MongoDB docs (pages "Write Concern", "Replica Set Elections" and "Rollbacks During Replica Set Failover"); the browser has no replica set. The facts used: `w: 1` waits only for the primary, so data can be rolled back if the primary steps down before the write reaches any secondary; `w: "majority"` waits for a majority of data-bearing voting members to durably write the oplog entry; secondaries apply the oplog in the primary's order; a member becomes primary only if it has the highest optime of the members it can see.

Many people think an acknowledged write can never be lost. In fact the write concern decides how safe it is. Command 1 survives here because of oplog order, not because of its own write concern: do not rely on that. Important writes should ask for `w: "majority"` themselves, with a `wtimeout` so they do not wait forever without a majority.

## Recap

- `w: 1` = the primary received it; it can still be rolled back when the primary changes.
- `w: "majority"` = a majority wrote it durably to the oplog; the new primary is sure to have it.
- The oplog is applied in order, and the new primary has the highest optime.
- A rolled-back write sits in the old primary's rollback files; it does not come back by itself.
