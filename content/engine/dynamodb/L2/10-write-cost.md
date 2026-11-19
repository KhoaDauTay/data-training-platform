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
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/read-write-operations.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html
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
  why:
    vi: UpdateItem tính theo bản **lớn hơn** giữa trước (3,5 KB) và sau (4,2 KB), làm tròn lên bội số 1 KB - 5 KB = 5 WCU, dù chỉ sửa một thuộc tính.
    en: UpdateItem is charged on the **larger** of the before (3.5 KB) and after (4.2 KB) images, rounded up to a multiple of 1 KB - 5 KB = 5 WCU, even though only one attribute changed.
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
      vi: Mỗi item làm tròn riêng rồi cộng - 1 KB + 4 KB = 5 WCU, không phải 4 KB.
      en: Each item is rounded on its own, then added - 1 KB + 4 KB = 5 WCU, not 4 KB.
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
      vi: Khi PutItem thay item có sẵn, cỡ dùng để tính là bản lớn hơn của hai item - 2,5 KB thành 3 KB = 3 WCU.
      en: When PutItem replaces an existing item, the size that counts is the larger of the two - 2.5 KB becomes 3 KB = 3 WCU.
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
      vi: Transaction ghi hai lần ngầm (prepare và commit), nên item tới 1 KB tốn 2 WCU, kể cả khi transaction bị hủy.
      en: A transaction performs two underlying writes (prepare and commit), so an item up to 1 KB costs 2 WCU, even when the transaction is cancelled.
---

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

# EN

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
