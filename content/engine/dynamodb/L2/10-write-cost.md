---
id: e-dy-l2-10
engine: dynamodb
level: L2
module: partiql-cost
title: "Tính WCU trước khi ghi"
title_en: "Work out WCU before you write"
kind: predict
runtime: docs
minutes: 10
objectives:
  - vi: Tính WCU của PutItem, UpdateItem, DeleteItem và BatchWriteItem theo luật làm tròn 1 KB.
    en: Compute the WCU of PutItem, UpdateItem, DeleteItem and BatchWriteItem with the 1 KB rounding rule.
  - vi: Biết UpdateItem tính theo bản lớn hơn giữa trước và sau, và ghi trong transaction tốn gấp đôi.
    en: Know that UpdateItem is charged on the larger of the before and after images, and that transactional writes cost double.
requires: [e-dy-l2-09]
sources:
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/read-write-operations.html, title_vi: "Thao tác đọc và ghi" }
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html, title_vi: "Làm việc với item" }
predict:
  sql: |
    {"op": "UpdateItem", "input": {"TableName": "Books",
      "Key": {"isbn": {"S": "978-1-01"}},
      "UpdateExpression": "SET summary = :s",
      "ExpressionAttributeValues": {":s": {"S": "..."}},
      "ReturnConsumedCapacity": "TOTAL"}}
  q:
    vi: Trước khi sửa item nặng 3,5 KB. Thuộc tính `summary` mới làm item thành 4,2 KB. Request tốn bao nhiêu WCU?
    en: Before the change the item weighs 3.5 KB. The new `summary` attribute makes it 4.2 KB. How many WCU does the request consume?
  options:
    - vi: "1 - chỉ sửa một thuộc tính"
      en: "1 - only one attribute changes"
    - vi: "4"
      en: "4"
    - vi: "5"
      en: "5"
    - vi: "8"
      en: "8"
  answer: 2
  trap: 0
  why:
    vi: 'Request chỉ gửi một thuộc tính, nhưng DynamoDB ghi lại cả item, và UpdateItem tính theo bản **lớn hơn** giữa trước (3,5 KB) và sau (4,2 KB). Mỗi WCU (write capacity unit, đơn vị ghi) ghi được 1 KB, nên 4,2 KB làm tròn lên 5 KB = 5 WCU. Chọn 4 là lấy bản trước (3,5 KB → 4 KB); 8 là tính gấp đôi như transaction, mà request này không phải transaction.'
    en: 'The request sends one attribute, but DynamoDB rewrites the whole item, and UpdateItem is charged on the **larger** of the before (3.5 KB) and after (4.2 KB) images. Each WCU (write capacity unit) writes 1 KB, so 4.2 KB rounds up to 5 KB = 5 WCU. Picking 4 uses the before image (3.5 KB → 4 KB); 8 doubles the price like a transaction, and this request is not one.'
quiz:
  - q:
      vi: BatchWriteItem ghi hai item 500 byte và 3,5 KB. Tốn bao nhiêu WCU?
      en: BatchWriteItem writes two items of 500 bytes and 3.5 KB. How many WCU?
    options:
      - vi: "4"
        en: "4"
      - vi: "5"
        en: "5"
      - vi: "2"
        en: "2"
    answer: 1
    why:
      vi: 'BatchWriteItem tính như từng PutItem riêng: mỗi item làm tròn lên bội số 1 KB rồi mới cộng. 500 byte → 1 KB = 1 WCU (write capacity unit); 3,5 KB → 4 KB = 4 WCU; tổng 5. Chọn 4 là cộng trước (0,5 + 3,5 = 4 KB) rồi mới làm tròn; chọn 2 là tính mỗi item 1 WCU bất kể cỡ.'
      en: 'BatchWriteItem is billed like separate PutItems: each item is rounded up to a multiple of 1 KB before adding. 500 bytes → 1 KB = 1 WCU (write capacity unit); 3.5 KB → 4 KB = 4 WCU; 5 in all. Picking 4 adds first (0.5 + 3.5 = 4 KB) and rounds after; picking 2 charges 1 WCU per item whatever its size.'
  - q:
      vi: PutItem ghi item mới 0,5 KB lên khóa đang có item 2,5 KB. Tốn bao nhiêu WCU?
      en: PutItem writes a new 0.5 KB item over a key that holds a 2.5 KB item. How many WCU?
    options:
      - vi: "1"
        en: "1"
      - vi: "3"
        en: "3"
      - vi: "4"
        en: "4"
    answer: 1
    why:
      vi: 'Item mới chỉ 0,5 KB, nhưng khi PutItem thay một item có sẵn, DynamoDB tính theo bản lớn hơn của hai item: bản cũ 2,5 KB, làm tròn lên 3 KB = 3 WCU (write capacity unit). Chọn 1 là chỉ nhìn item mới; chọn 4 là làm tròn lên bội số 4 KB như khi đọc, trong khi ghi làm tròn theo 1 KB.'
      en: 'The new item is only 0.5 KB, but when PutItem replaces an existing item, DynamoDB charges the larger of the two: the old 2.5 KB one, rounded up to 3 KB = 3 WCU (write capacity unit). Picking 1 looks only at the new item; picking 4 rounds up to a multiple of 4 KB as reads do, while writes round to 1 KB.'
  - q:
      vi: Ghi một item 1 KB trong transaction (`ExecuteTransaction` hoặc `TransactWriteItems`) tốn bao nhiêu WCU?
      en: How many WCU does writing one 1 KB item in a transaction (`ExecuteTransaction` or `TransactWriteItems`) cost?
    options:
      - vi: "1"
        en: "1"
      - vi: "2"
        en: "2"
      - vi: "0,5"
        en: "0.5"
    answer: 1
    why:
      vi: 'Ghi thường một item tới 1 KB tốn 1 WCU (write capacity unit), nên 1 là giá ngoài transaction. Trong transaction, DynamoDB ghi ngầm hai lần cho mỗi item, một lần chuẩn bị (prepare) và một lần xác nhận (commit), nên giá gấp đôi: 2 WCU, kể cả khi transaction bị hủy. 0,5 là nhầm với giá đọc nhất quán cuối; ghi không có mức nửa giá.'
      en: 'A plain write of an item up to 1 KB costs 1 WCU (write capacity unit), so 1 is the price outside a transaction. Inside a transaction DynamoDB performs two underlying writes per item, a prepare and a commit, so the price doubles: 2 WCU, even when the transaction is cancelled. 0.5 confuses it with an eventually consistent read; writes have no half price.'
---

## Mở bài

Bạn chỉ thêm một đoạn tóm tắt ngắn vào một cuốn sách. Lần ghi đó tính tiền theo đoạn vừa thêm hay theo cả item?

## Ý chính

Đơn vị ghi:

- 1 WCU (write capacity unit, đơn vị năng lực ghi) = một lần ghi item tới **1 KB**. Cỡ làm tròn lên bội số 1 KB.
- Ghi trong transaction (nhóm thao tác cùng thành công hoặc cùng không) tốn **gấp đôi**.
- Ghi chỉ tốn WCU, không bao giờ tốn RCU.

Cỡ được tính:

- `PutItem`: bản lớn hơn giữa item mới và item bị thay.
- `UpdateItem`: bản lớn hơn giữa trước và sau, dù chỉ sửa một thuộc tính.
- `DeleteItem`: cỡ item bị xóa.
- `BatchWriteItem`: làm tròn từng item rồi cộng.
- Ghi có điều kiện bị từ chối: theo cỡ item đang có (tối thiểu 1).

Mỗi GSI (global secondary index, index phụ của bảng) có thuộc tính bị đổi cũng tốn thêm WCU ghi vào index đó (bài L3).

## Ví dụ

```text
PutItem 500 B           -> 1 WCU
PutItem 1.6 KB          -> 2 WCU
DeleteItem 1.6 KB       -> 2 WCU
UpdateItem 3.5 -> 4.2 KB -> 5 WCU
```

## Thực hành

Item lớn mà hay bị sửa một phần nhỏ là dấu hiệu nên tách: phần hay đổi (tồn kho, trạng thái) để ở một item nhỏ riêng.

## Tóm tắt

- 1 WCU = một lần ghi item tới 1 KB, làm tròn lên bội số 1 KB.
- `UpdateItem` và `PutItem` thay item tính theo bản lớn hơn giữa trước và sau.
- `BatchWriteItem` làm tròn từng item rồi cộng.
- Ghi trong transaction tốn gấp đôi; ghi không bao giờ tốn RCU.

# EN

## Opening

You only add a short summary to a book. Is that write charged for the part you added or for the whole item?

## Key idea

The write unit:

- 1 WCU (write capacity unit) = one write of an item up to **1 KB**. Size is rounded up to a multiple of 1 KB.
- Transactional writes cost **double**.
- Writes consume only WCU, never RCU.

The size that counts:

- `PutItem`: the larger of the new item and the item it replaces.
- `UpdateItem`: the larger of the before and after images, even if only one attribute changes.
- `DeleteItem`: the size of the deleted item.
- `BatchWriteItem`: each item rounded, then added.
- A rejected conditional write: the size of the existing item (at least 1).

Every GSI (global secondary index) whose attributes change also costs extra WCU to write that index (level L3).

## Example

```text
PutItem 500 B           -> 1 WCU
PutItem 1.6 KB          -> 2 WCU
DeleteItem 1.6 KB       -> 2 WCU
UpdateItem 3.5 -> 4.2 KB -> 5 WCU
```

## Practice

A large item that keeps getting a small part changed is a sign to split it: keep the fast-changing part (stock, status) in its own small item.

## Recap

- 1 WCU = one write of an item up to 1 KB, rounded up to a multiple of 1 KB.
- `UpdateItem` and a replacing `PutItem` are charged on the larger of the before and after images.
- `BatchWriteItem` rounds each item, then adds.
- Transactional writes cost double; writes never consume RCU.
