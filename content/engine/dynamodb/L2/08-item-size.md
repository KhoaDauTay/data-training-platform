---
id: e-dy-l2-08
engine: dynamodb
level: L2
module: partiql-cost
title: "Tính cỡ item bằng tay"
title_en: "Work out an item's size by hand"
kind: quiz
runtime: docs
minutes: 10
objectives:
  - vi: Tính cỡ chuỗi, số, boolean, danh sách theo luật của AWS.
    en: Compute the size of strings, numbers, booleans and lists with the AWS rules.
  - vi: Phân biệt cỡ item (dùng cho capacity và giới hạn 400 KB) với 100 byte phụ phí lưu trữ.
    en: Tell item size (used for capacity and the 400 KB limit) from the 100 bytes of storage overhead.
requires: [e-dy-l1-03]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/CapacityUnitCalculations.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Constraints.html
quiz:
  - q:
      vi: 'Item `{"isbn": "978-0-04", "price": 88000}` (isbn là chuỗi, price là số) nặng bao nhiêu byte?'
      en: 'How many bytes is the item `{"isbn": "978-0-04", "price": 88000}` (isbn a string, price a number)?'
    options:
      - vi: 17 byte
        en: 17 bytes
      - vi: 19 byte
        en: 19 bytes
      - vi: 21 byte
        en: 21 bytes
      - vi: 119 byte
        en: 119 bytes
    answer: 1
    why:
      vi: 'isbn = 4 (tên) + 8 (giá trị) = 12. price = 5 (tên) + 1 byte cho 2 chữ số có nghĩa "88" (số 0 ở cuối bị bỏ) + 1 = 7. Tổng 19 byte.'
      en: 'isbn = 4 (name) + 8 (value) = 12. price = 5 (name) + 1 byte for the 2 significant digits "88" (trailing zeros are trimmed) + 1 = 7. Total 19 bytes.'
  - q:
      vi: 'Thuộc tính danh sách `"tags": ["nosql", "perf"]` nặng bao nhiêu byte?'
      en: 'How many bytes is the list attribute `"tags": ["nosql", "perf"]`?'
    options:
      - vi: 13 byte
        en: 13 bytes
      - vi: 15 byte
        en: 15 bytes
      - vi: 18 byte
        en: 18 bytes
    answer: 2
    why:
      vi: 'Tên 4 + 3 byte phụ phí của List + mỗi phần tử 1 byte phụ phí cộng cỡ của nó - (1 + 5) + (1 + 4) = 11. Tổng 4 + 3 + 11 = 18.'
      en: 'Name 4 + 3 bytes of List overhead + each element 1 byte of overhead plus its size - (1 + 5) + (1 + 4) = 11. Total 4 + 3 + 11 = 18.'
  - q:
      vi: Thuộc tính chuỗi `city` có giá trị `"Đà Nẵng"`. Cỡ là bao nhiêu?
      en: The string attribute `city` holds `"Đà Nẵng"`. What is its size?
    options:
      - vi: 11 byte (4 + 7 ký tự)
        en: 11 bytes (4 + 7 characters)
      - vi: 15 byte
        en: 15 bytes
      - vi: 18 byte
        en: 18 bytes
    answer: 1
    why:
      vi: 'Chuỗi tính theo byte UTF-8, không theo số ký tự. "Đ" và "à" mỗi chữ 2 byte, "ẵ" 3 byte, bốn ký tự còn lại 1 byte - tổng 11. Cộng tên 4 byte là 15.'
      en: 'Strings count UTF-8 bytes, not characters. The two accented capitals and small letters take 2 bytes each, the letter with two marks takes 3, the other four take 1 - 11 in all. Plus the 4-byte name gives 15.'
  - q:
      vi: 'Thuộc tính `"inStock": true` nặng bao nhiêu?'
      en: 'How many bytes is the attribute `"inStock": true`?'
    options:
      - vi: 8 byte
        en: 8 bytes
      - vi: 11 byte
        en: 11 bytes
      - vi: 4 byte
        en: 4 bytes
    answer: 0
    why:
      vi: Boolean và null là tên + 1 byte - 7 + 1 = 8.
      en: A Boolean or null is the name + 1 byte - 7 + 1 = 8.
  - q:
      vi: Một item 23 byte được tính bao nhiêu khi so với giới hạn 400 KB, và bao nhiêu khi tính tiền lưu trữ?
      en: A 23-byte item counts as how much against the 400 KB limit, and how much for storage billing?
    options:
      - vi: 23 byte và 23 byte
        en: 23 bytes and 23 bytes
      - vi: 123 byte và 123 byte
        en: 123 bytes and 123 bytes
      - vi: 23 byte và 123 byte
        en: 23 bytes and 123 bytes
    answer: 2
    why:
      vi: Mỗi item có 100 byte phụ phí, nhưng chỉ để tính tiền lưu trữ. Giới hạn 400 KB và capacity đọc ghi dùng cỡ item.
      en: Every item carries 100 bytes of overhead, but only for storage billing. The 400 KB limit and read/write capacity use the item size.
---

## Ý chính

Cỡ item = tổng cỡ các thuộc tính. Luật của AWS:

- **Chuỗi**: byte UTF-8 của tên + byte UTF-8 của giá trị.
- **Số**: tên + 1 byte cho mỗi 2 chữ số có nghĩa + 1 byte (gần đúng). Số 0 ở đầu và cuối bị bỏ.
- **Nhị phân**: tên + số byte thô (không phải độ dài base64).
- **Boolean, null**: tên + 1 byte.
- **List, Map**: tên + 3 byte + tổng cỡ phần tử, mỗi phần tử thêm 1 byte. Rỗng là tên + 3 byte.
- **Set**: tên + tổng cỡ phần tử, không có phụ phí.

Ngoài ra mỗi item có **100 byte phụ phí lưu trữ**, chỉ dùng để tính tiền lưu trữ.

## Ví dụ

```text
"shirt-color": "R"   -> 11 + 1 = 12
"shirt-size":  "M"   -> 10 + 1 = 11
item                 -> 23 bytes
```

## Thực hành

Bài sau dùng cỡ item để tính RCU và WCU. Bộ mô phỏng trong trình duyệt chỉ ước lượng cỡ item, nên sát ranh giới 1 KB hay 4 KB con số `ConsumedCapacity` của nó có thể lệch với DynamoDB thật. Các câu ở đây làm theo luật của AWS.

# EN

## Key idea

Item size = the sum of its attribute sizes. The AWS rules:

- **String**: UTF-8 bytes of the name + UTF-8 bytes of the value.
- **Number**: name + 1 byte per 2 significant digits + 1 byte (approximate). Leading and trailing zeros are trimmed.
- **Binary**: name + raw bytes (not the base64 length).
- **Boolean, null**: name + 1 byte.
- **List, Map**: name + 3 bytes + the size of the elements, each element adding 1 byte. An empty one is name + 3 bytes.
- **Set**: name + the size of the elements, no overhead.

On top of that every item has **100 bytes of storage overhead**, used only for storage billing.

## Example

```text
"shirt-color": "R"   -> 11 + 1 = 12
"shirt-size":  "M"   -> 10 + 1 = 11
item                 -> 23 bytes
```

## Practice

The next lesson uses item size to work out RCU and WCU. The in-browser emulator only estimates item size, so near a 1 KB or 4 KB boundary its `ConsumedCapacity` can differ from real DynamoDB. The questions here follow the AWS rules.
